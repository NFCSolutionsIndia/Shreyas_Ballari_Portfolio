import { useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Color, Matrix4, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3, type Bone } from 'three';
import type { Pose } from './Avatar';

/**
 * A rigged Blender character (Mixamo bone names) driven by the same Pose the procedural avatar
 * uses, so every scene keeps its animation code. Each frame the pose's joints are turned into bone
 * rotations: the hips move to the pelvis, the spine leans towards the neck, the head turns, and
 * each leg and arm is solved with the model's own limb lengths (knees forward, elbows back), so
 * the feet land exactly where the pose puts them. Rest orientations come from the bind pose, so
 * any Mixamo-style rig works.
 *
 * The model is shown at the procedural avatar's size (pose units, about 1.7 tall).
 */

const NAMES = ['Hips', 'Spine', 'Neck', 'Head', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'] as const;
type Name = (typeof NAMES)[number];

/** Procedural avatar pelvis height (pose units). */
const POSE_HIP = 0.92;

interface Rig {
  root: Object3D;
  bones: Record<Name, Bone>;
  /** Rest orientation of each bone in the model's space, and its rest position. */
  restQ: Record<Name, Quaternion>;
  restP: Record<Name, Vector3>;
  k: number;
  len: { thigh: number; shin: number; upper: number; fore: number };
}

function findBone(root: Object3D, name: string): Bone | null {
  let found = null as Bone | null;
  root.traverse((o) => {
    // Blender exports "mixamorig:Hips"; three.js strips the colon ("mixamorigHips").
    if (!found && (o as Bone).isBone && o.name.replace(/^mixamorig[:_]?/, '') === name) found = o as Bone;
  });
  return found;
}

function makeRig(root: Object3D): Rig | null {
  root.updateMatrixWorld(true);
  const inv = new Matrix4().copy(root.matrixWorld).invert();
  const bones = {} as Record<Name, Bone>;
  const restQ = {} as Record<Name, Quaternion>;
  const restP = {} as Record<Name, Vector3>;
  const rootQ = new Quaternion();
  root.getWorldQuaternion(rootQ).invert();
  for (const n of NAMES) {
    const b = findBone(root, n);
    if (!b) return null;
    bones[n] = b;
    restQ[n] = b.getWorldQuaternion(new Quaternion()).premultiply(rootQ);
    restP[n] = b.getWorldPosition(new Vector3()).applyMatrix4(inv);
  }
  const d = (a: Name, b: Name) => restP[a].distanceTo(restP[b]);
  return {
    root,
    bones,
    restQ,
    restP,
    k: restP.Hips.y / POSE_HIP,
    len: { thigh: d('LeftUpLeg', 'LeftLeg'), shin: d('LeftLeg', 'LeftFoot'), upper: d('LeftArm', 'LeftForeArm'), fore: d('LeftForeArm', 'LeftHand') },
  };
}

const _d = new Vector3();
const _n = new Vector3();
/** Two-bone IK: the middle joint, bending towards `pole`. */
function solve(out: Vector3, a: Vector3, target: Vector3, l1: number, l2: number, pole: Vector3) {
  _d.subVectors(target, a);
  const dist = Math.min(Math.max(_d.length(), Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4);
  _d.normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  _n.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  return out.copy(a).addScaledVector(_d, along).addScaledVector(_n, h);
}

const tmp = {
  rootQ: new Quaternion(),
  parentQ: new Quaternion(),
  q: new Quaternion(),
  q2: new Quaternion(),
  a: new Vector3(),
  b: new Vector3(),
  c: new Vector3(),
  rest: new Vector3(),
  knee: new Vector3(),
  hipW: new Vector3(),
  pole: new Vector3(),
  m: new Matrix4(),
};

/** Set a bone's world orientation (given in the model's space). */
function setModelQ(rig: Rig, n: Name, qModel: Quaternion) {
  const b = rig.bones[n];
  tmp.q2.copy(tmp.rootQ).multiply(qModel);
  b.parent!.getWorldQuaternion(tmp.parentQ);
  b.quaternion.copy(tmp.parentQ.invert().multiply(tmp.q2));
  b.updateMatrixWorld(true);
}

/** Turn bone `n` (rest pose) so its child joint points along `dirModel`. */
function aim(rig: Rig, n: Name, child: Name, dirModel: Vector3) {
  tmp.rest.subVectors(rig.restP[child], rig.restP[n]).normalize();
  tmp.q.setFromUnitVectors(tmp.rest, tmp.c.copy(dirModel).normalize()).multiply(rig.restQ[n]);
  setModelQ(rig, n, tmp.q);
}

/** A joint's current position in the model's space. */
function jointModel(rig: Rig, n: Name, out: Vector3) {
  rig.bones[n].getWorldPosition(out);
  return rig.root.worldToLocal(out);
}

function drive(rig: Rig, P: Pose) {
  const { k } = rig;
  rig.root.getWorldQuaternion(tmp.rootQ);
  // Hips: to the pelvis, rest orientation.
  const hips = rig.bones.Hips;
  tmp.a.copy(P.hip).multiplyScalar(k);
  hips.parent!.updateMatrixWorld(true);
  rig.root.localToWorld(tmp.a);
  hips.position.copy(hips.parent!.worldToLocal(tmp.a));
  setModelQ(rig, 'Hips', rig.restQ.Hips);
  // Spine leans towards the neck.
  aim(rig, 'Spine', 'Neck', tmp.b.subVectors(P.neck, P.hip));
  // Head: rest orientation turned by look yaw and pitch.
  tmp.q.setFromAxisAngle(tmp.c.set(0, 1, 0), P.look.yaw);
  tmp.q.multiply(tmp.q2.setFromAxisAngle(tmp.c.set(1, 0, 0), P.look.pitch)).multiply(rig.restQ.Head);
  setModelQ(rig, 'Head', tmp.q);
  // Legs and arms.
  const limb = (up: Name, mid: Name, end: Name, target: Vector3, l1: number, l2: number, pole: Vector3) => {
    jointModel(rig, up, tmp.hipW);
    tmp.a.copy(target).multiplyScalar(k);
    solve(tmp.knee, tmp.hipW, tmp.a, l1, l2, pole);
    aim(rig, up, mid, tmp.b.subVectors(tmp.knee, tmp.hipW));
    aim(rig, mid, end, tmp.b.subVectors(tmp.a, tmp.knee));
  };
  const { thigh, shin, upper, fore } = rig.len;
  limb('LeftUpLeg', 'LeftLeg', 'LeftFoot', P.footL, thigh, shin, tmp.pole.copy(P.kneeDir).add(tmp.c.set(0.15, 0, 0)));
  setModelQ(rig, 'LeftFoot', rig.restQ.LeftFoot);
  limb('RightUpLeg', 'RightLeg', 'RightFoot', P.footR, thigh, shin, tmp.pole.copy(P.kneeDir).add(tmp.c.set(-0.15, 0, 0)));
  setModelQ(rig, 'RightFoot', rig.restQ.RightFoot);
  limb('LeftArm', 'LeftForeArm', 'LeftHand', P.handL, upper, fore, tmp.pole.copy(P.elbowDir).add(tmp.c.set(0.4, 0, 0)));
  limb('RightArm', 'RightForeArm', 'RightHand', P.handR, upper, fore, tmp.pole.copy(P.elbowDir).add(tmp.c.set(-0.4, 0, 0)));
}

export interface Tints {
  Skin?: string;
  Hair?: string;
  Top?: string;
  Bottom?: string;
  Shoes?: string;
}

export function SkinnedAvatar({ url, pose, tints }: { url: string; pose: MutableRefObject<Pose>; tints?: Tints }) {
  const gltf = useGLTF(url);
  const { scene, rig } = useMemo(() => {
    const scene = cloneSkinned(gltf.scene);
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      // Per-instance colours for the named materials.
      const mat = m.material as MeshStandardMaterial;
      const tint = tints?.[mat.name as keyof Tints];
      if (tint) {
        m.material = mat.clone();
        (m.material as MeshStandardMaterial).color = new Color(tint);
      }
    });
    return { scene, rig: makeRig(scene) };
  }, [gltf, tints]);
  useFrame(() => {
    if (rig) drive(rig, pose.current);
  });
  // Shown in pose units: the model is k times larger than the pose.
  return <primitive object={scene} scale={rig ? 1 / rig.k : 1} />;
}
