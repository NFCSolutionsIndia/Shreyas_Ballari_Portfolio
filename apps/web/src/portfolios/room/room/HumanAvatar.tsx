import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  AnimationMixer,
  DoubleSide,
  MathUtils,
  Quaternion,
  Vector3,
  type AnimationAction,
  type Bone,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type SkinnedMesh,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AvatarControl } from './Avatar';

/**
 * A realistic rigged character (MakeHuman, built and animated in Blender by
 * C:\SHREYAS_BALLARI_PORTFOLIO_assets\avatar). All body movement comes from the animation clips
 * baked into the file (idle, walking, talking ×3, waving, pointing left/right, sitting); the
 * site only layers a gentle head turn towards the visitor and the face (blinks, smiles, lips).
 */

const _q = new Quaternion();
const _pw = new Quaternion();
const _bw = new Quaternion();
const _rq = new Quaternion();
const _v = new Vector3();
const UP = new Vector3(0, 1, 0);

/** Add a world-space rotation on top of a bone's animated pose. */
function turn(bone: Bone | undefined, q: Quaternion) {
  if (!bone?.parent) return;
  bone.updateWorldMatrix(true, false);
  bone.getWorldQuaternion(_bw);
  bone.parent.getWorldQuaternion(_pw);
  bone.quaternion.copy(_pw.invert().multiply(q).multiply(_bw));
}

type Face = Record<string, number>;

/** Rough mouth shapes from the letter being "spoken". */
function mouthFor(ch: string | undefined): Face {
  if (!ch || !/[a-z]/i.test(ch)) return {};
  const c = ch.toLowerCase();
  if ('aei'.includes(c)) return { jawOpen: 0.3, mouthSmileLeft: 0.12, mouthSmileRight: 0.12 };
  if ('ouw'.includes(c)) return { jawOpen: 0.18, mouthFunnel: 0.4, mouthPucker: 0.3 };
  if ('mbp'.includes(c)) return { mouthClose: 0.45 };
  if ('fv'.includes(c)) return { jawOpen: 0.06, mouthClose: 0.18 };
  return { jawOpen: 0.13 };
}

export function HumanAvatar({ url, control, root, hairTint = 0.4, seatHeight }: {
  url: string;
  control: RefObject<AvatarControl>;
  root: RefObject<Group | null>;
  /** Multiplier on the hair colour (MakeHuman hair textures run light). */
  hairTint?: number;
  /** For a seated character: the chair's seat height, so the hips rest on it. */
  seatHeight?: number;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const model = gltf.scene;

  const rig = useMemo(() => {
    const morphMeshes: Mesh[] = [];
    let skinned: SkinnedMesh | null = null;
    model.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mat = m.material as MeshStandardMaterial;
      const name = `${m.name} ${mat.name}`.toLowerCase();
      // MakeHuman exports every material as alpha-blended; only hair, brows and lashes need it.
      if (/short|ponytail|bob|long|braid|afro|hair/.test(name)) {
        mat.color.multiplyScalar(hairTint);
        mat.transparent = false;
        mat.alphaTest = 0.12;
        mat.side = DoubleSide;
      } else if (/eyebrow|eyelash/.test(name)) {
        mat.transparent = true;
        mat.depthWrite = false;
        m.renderOrder = 2;
        m.castShadow = false;
      } else {
        mat.transparent = false;
        mat.opacity = 1;
        mat.alphaTest = 0;
        mat.depthWrite = true;
        if (/high-poly|low-poly/.test(name)) {
          mat.roughness = 0.12;
          m.castShadow = false;
        } else if (/body/.test(name)) mat.roughness = 0.6;
        else mat.roughness = Math.max(mat.roughness, 0.82);
      }
      if (m.morphTargetDictionary && m.morphTargetInfluences) morphMeshes.push(m);
      if ((m as SkinnedMesh).isSkinnedMesh && !skinned) skinned = m as SkinnedMesh;
    });
    const bones = new Map<string, Bone>();
    (skinned as SkinnedMesh | null)?.skeleton.bones.forEach((b) => bones.set(b.name.replace(/^mixamorig[:_]?/, ''), b));

    // Face local +z like the room's other characters: his left shoulder must be on +x.
    model.rotation.set(0, 0, 0);
    model.position.set(0, 0, 0);
    model.updateWorldMatrix(true, true);
    const left = bones.get('LeftArm')?.getWorldPosition(new Vector3());
    const right = bones.get('RightArm')?.getWorldPosition(new Vector3());
    if (left && right && left.x < right.x) model.rotation.y = Math.PI;
    // Seated: lower the model so the hips rest on the seat (thigh thickness ≈ 7 cm).
    const hips = bones.get('Hips')?.getWorldPosition(new Vector3());
    if (seatHeight !== undefined && hips) model.position.y = seatHeight + 0.07 - hips.y;
    // Rest pose of every bone: clips leave out bones that never move (the exporter drops
    // constant channels), so these are restored each frame before the clip and head turn apply.
    const rest = new Map<Bone, Quaternion>();
    bones.forEach((b) => rest.set(b, b.quaternion.clone()));
    return { morphMeshes, bones, rest };
  }, [model, hairTint, seatHeight]);

  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  const actions = useMemo(() => {
    const out = new Map<string, AnimationAction>();
    for (const clip of gltf.animations) out.set(clip.name.toLowerCase(), mixer.clipAction(clip));
    return out;
  }, [gltf.animations, mixer]);
  useEffect(() => () => void mixer.stopAllAction(), [mixer]);

  const state = useRef({ current: null as AnimationAction | null, key: '', talkVariant: 0, talkedLast: false });
  const face = useRef<Face>({});
  const blink = useRef({ next: 2, t: 0 });

  const play = (name: string, fade = 0.45) => {
    const s = state.current;
    if (s.key === name) return s.current;
    const next = actions.get(name) ?? [...actions.entries()].find(([n]) => n.startsWith(name))?.[1] ?? null;
    if (!next) return s.current;
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    // The first clip starts at full strength, so a character never shows its rest (T) pose.
    if (s.current) {
      next.fadeIn(fade);
      s.current.fadeOut(fade);
    }
    next.play();
    s.current = next;
    s.key = name;
    return next;
  };

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const c = control.current;
    const r = root.current;
    if (!c || !r) return;
    const s = state.current;

    // --- Body: pick the clip -----------------------------------------------------------------
    r.updateWorldMatrix(true, false);
    r.getWorldQuaternion(_rq);
    let clip = 'idle';
    if (c.seated) clip = c.gesture === 'listen' ? 'sitting_talk' : 'sitting_idle';
    else if (c.walk > 0.5) clip = 'walking';
    else if (c.gesture === 'wave') clip = 'waving';
    else if (c.gesture === 'point' && c.pointAt) {
      // Point with the arm on the target's side (his left is +x in his own frame).
      r.getWorldPosition(_v);
      const local = c.pointAt.clone().sub(_v).applyQuaternion(_rq.clone().invert());
      clip = local.x > 0 ? 'pointing_left' : 'pointing_right';
    } else if (c.gesture === 'talk') {
      // A different talking gesture for each new line.
      if (c.talking && !s.talkedLast) s.talkVariant = (s.talkVariant + 1) % 3;
      clip = ['talking', 'talking_2', 'talking_3'][s.talkVariant]!;
    }
    s.talkedLast = c.talking;
    const action = play(clip, clip === 'walking' || s.key === 'walking' ? 0.3 : 0.5);
    if (action) action.timeScale = clip === 'walking' ? 1.5 : 1;
    rig.rest.forEach((q, bone) => bone.quaternion.copy(q));
    mixer.update(dt);

    // --- Head: turn gently towards the visitor (on top of the clip) ---------------------------
    const head = rig.bones.get('Head');
    const neck = rig.bones.get('Neck');
    if (head && c.lookAt && !c.seated) {
      head.getWorldPosition(_v);
      const d = c.lookAt.clone().sub(_v).applyQuaternion(_rq.clone().invert());
      const yaw = MathUtils.clamp(Math.atan2(d.x, d.z), -0.6, 0.6);
      const pitch = MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.25, 0.25);
      const right = new Vector3(1, 0, 0).applyQuaternion(_rq);
      const q = new Quaternion().setFromAxisAngle(UP, yaw).multiply(new Quaternion().setFromAxisAngle(right, pitch));
      turn(neck, _q.identity().slerp(q, 0.4));
      turn(head, _q.identity().slerp(q, 0.6));
    }

    // --- Face ----------------------------------------------------------------------------------
    const target: Face = {};
    const smile = c.gesture === 'wave' ? 0.65 : c.gesture === 'listen' ? 0.35 : c.talking ? 0.2 : 0.28;
    target.mouthSmileLeft = smile;
    target.mouthSmileRight = smile;
    target.cheekSquintLeft = smile * 0.35;
    target.cheekSquintRight = smile * 0.35;
    if (c.gesture === 'point') target.browInnerUp = 0.2;
    if (c.gesture === 'wave') {
      target.browOuterUpLeft = 0.28;
      target.browOuterUpRight = 0.28;
    }
    if (c.talking) {
      for (const [key, v] of Object.entries(mouthFor(c.phoneme))) target[key] = Math.max(target[key] ?? 0, v);
      target.browInnerUp = Math.max(target.browInnerUp ?? 0, 0.08 + Math.max(0, Math.sin(t * 1.7)) * 0.12);
    }
    const b = blink.current;
    b.t += dt;
    const blinking = b.t > b.next && b.t < b.next + 0.13;
    if (b.t > b.next + 0.13) {
      b.t = 0;
      b.next = 2.2 + Math.random() * 3.3;
    }
    target.eyeBlinkLeft = blinking ? 1 : 0;
    target.eyeBlinkRight = blinking ? 1 : 0;

    const f = face.current;
    const fk = 1 - Math.exp(-dt * 16);
    for (const key of new Set([...Object.keys(f), ...Object.keys(target)])) {
      f[key] = MathUtils.lerp(f[key] ?? 0, target[key] ?? 0, key.startsWith('eyeBlink') ? 1 : fk);
    }
    for (const m of rig.morphMeshes) {
      const dict = m.morphTargetDictionary!;
      const infl = m.morphTargetInfluences!;
      for (const key in f) {
        const i = dict[key];
        if (i !== undefined) infl[i] = f[key]!;
      }
    }
  });

  return <primitive object={model} />;
}
