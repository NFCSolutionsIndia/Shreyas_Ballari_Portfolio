import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleGeometry, CylinderGeometry, Group, MathUtils, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';

/**
 * Shreyas as a stylised low-poly character, built in code so every joint can be placed exactly:
 * legs and arms are two-bone chains solved to targets (feet on the pedals, hands on the bars),
 * which makes the ride look natural at any speed. Sizes are in metres, local +z is forward,
 * +x is his left. Colours live in LOOK so they are easy to change.
 */

export const LOOK = {
  skin: '#c48a66',
  hair: '#121010',
  hoodie: '#2e4566',
  hoodieDark: '#22354f',
  pants: '#3d5577',
  shoes: '#f6f4ef',
  sole: '#d6d0c6',
  bag: '#26262c',
};

const THIGH = 0.45;
const SHIN = 0.45;
const UPPER = 0.29;
const FORE = 0.27;

export interface Pose {
  /** Pelvis centre. */
  hip: Vector3;
  /** Base of the neck. */
  neck: Vector3;
  footL: Vector3;
  footR: Vector3;
  handL: Vector3;
  handR: Vector3;
  /** Which way knees and elbows bend (unit vectors). */
  kneeDir: Vector3;
  elbowDir: Vector3;
  /** Head turn (yaw, pitch) in radians. */
  look: { yaw: number; pitch: number };
}

export function emptyPose(): Pose {
  return {
    hip: new Vector3(),
    neck: new Vector3(),
    footL: new Vector3(),
    footR: new Vector3(),
    handL: new Vector3(),
    handR: new Vector3(),
    kneeDir: new Vector3(0, 0, 1),
    elbowDir: new Vector3(0, -0.3, -1).normalize(),
    look: { yaw: 0, pitch: 0 },
  };
}

export function lerpPose(out: Pose, a: Pose, b: Pose, t: number) {
  for (const k of ['hip', 'neck', 'footL', 'footR', 'handL', 'handR'] as const) out[k].lerpVectors(a[k], b[k], t);
  out.kneeDir.lerpVectors(a.kneeDir, b.kneeDir, t).normalize();
  out.elbowDir.lerpVectors(a.elbowDir, b.elbowDir, t).normalize();
  out.look.yaw = MathUtils.lerp(a.look.yaw, b.look.yaw, t);
  out.look.pitch = MathUtils.lerp(a.look.pitch, b.look.pitch, t);
  return out;
}

const _d = new Vector3();
const _n = new Vector3();
const _up = new Vector3(0, 1, 0);
const _q = new Quaternion();

/** Two-bone IK: the middle joint for a chain from `a` towards `target`, bending towards `pole`. */
function solve(out: Vector3, a: Vector3, target: Vector3, l1: number, l2: number, pole: Vector3) {
  _d.subVectors(target, a);
  const dist = MathUtils.clamp(_d.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  _d.normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  _n.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  return out.copy(a).addScaledVector(_d, along).addScaledVector(_n, h);
}

/** Place a unit-length (along y) mesh between two points. */
function span(m: Mesh | null | undefined, p: Vector3, q: Vector3) {
  if (!m) return;
  _d.subVectors(q, p);
  const len = _d.length();
  m.position.addVectors(p, q).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, _d.normalize());
  m.scale.set(1, len, 1);
}

/** A 1-unit tapered tube, so `span` can stretch it to any limb length (joints get spheres). */
function limbGeo(r: number) {
  return new CylinderGeometry(r * 0.88, r, 1, 12);
}

export type Look = typeof LOOK;

export function Avatar({ pose, look = LOOK, helmet = false, bag = true }: { pose: MutableRefObject<Pose>; look?: Look; helmet?: boolean; bag?: boolean }) {
  const geo = useMemo(
    () => ({
      thigh: limbGeo(0.075),
      shin: limbGeo(0.06),
      upper: limbGeo(0.058),
      fore: limbGeo(0.05),
      torso: new CapsuleGeometry(0.165, 0.3, 6, 16),
      joint: new SphereGeometry(1, 12, 10),
      head: new SphereGeometry(0.125, 24, 18),
      hand: new SphereGeometry(0.05, 12, 10),
    }),
    [],
  );
  const r = useRef<Record<string, Mesh | Group | null>>({});
  const set = (k: string) => (o: Mesh | Group | null) => void (r.current[k] = o);
  const j = useMemo(
    () => ({
      hipL: new Vector3(),
      hipR: new Vector3(),
      kneeL: new Vector3(),
      kneeR: new Vector3(),
      shL: new Vector3(),
      shR: new Vector3(),
      elL: new Vector3(),
      elR: new Vector3(),
      side: new Vector3(),
      spine: new Vector3(),
      tmp: new Vector3(),
    }),
    [],
  );

  useFrame(() => {
    const p = pose.current;
    const o = r.current as Record<string, Mesh | null>;
    // Pelvis and shoulders sit across the body's side axis (+x), tilted with the spine.
    j.spine.subVectors(p.neck, p.hip).normalize();
    j.side.set(1, 0, 0);
    j.hipL.copy(p.hip).addScaledVector(j.side, 0.1);
    j.hipR.copy(p.hip).addScaledVector(j.side, -0.1);
    j.shL.copy(p.neck).addScaledVector(j.side, 0.19).addScaledVector(j.spine, -0.05);
    j.shR.copy(p.neck).addScaledVector(j.side, -0.19).addScaledVector(j.spine, -0.05);
    // Knees: forward and a touch outward; elbows: back, down and out.
    solve(j.kneeL, j.hipL, p.footL, THIGH, SHIN, j.tmp.copy(p.kneeDir).addScaledVector(j.side, 0.15));
    solve(j.kneeR, j.hipR, p.footR, THIGH, SHIN, j.tmp.copy(p.kneeDir).addScaledVector(j.side, -0.15));
    solve(j.elL, j.shL, p.handL, UPPER, FORE, j.tmp.copy(p.elbowDir).addScaledVector(j.side, 0.4));
    solve(j.elR, j.shR, p.handR, UPPER, FORE, j.tmp.copy(p.elbowDir).addScaledVector(j.side, -0.4));

    span(o.thighL, j.hipL, j.kneeL);
    span(o.thighR, j.hipR, j.kneeR);
    span(o.shinL, j.kneeL, p.footL);
    span(o.shinR, j.kneeR, p.footR);
    span(o.upperL, j.shL, j.elL);
    span(o.upperR, j.shR, j.elR);
    span(o.foreL, j.elL, p.handL);
    span(o.foreR, j.elR, p.handR);
    // Torso from a little above the pelvis to the neck.
    span(o.torso, j.tmp.copy(p.hip).addScaledVector(j.spine, 0.1), j.spine.clone().multiplyScalar(-0.12).add(p.neck));
    if (o.torso) o.torso.scale.set(1, o.torso.scale.y / 0.3, 0.82);
    o.pelvis?.position.copy(p.hip);
    o.kneeL?.position.copy(j.kneeL);
    o.kneeR?.position.copy(j.kneeR);
    o.elL?.position.copy(j.elL);
    o.elR?.position.copy(j.elR);
    o.shL?.position.copy(j.shL);
    o.shR?.position.copy(j.shR);
    o.handL?.position.copy(p.handL);
    o.handR?.position.copy(p.handR);
    // Feet point along the shin's forward direction, flat-ish.
    for (const [k, f] of [['footL', p.footL], ['footR', p.footR]] as const) {
      const m = o[k];
      if (m) m.position.copy(f);
    }
    // Head follows the spine, then turns.
    const head = r.current.head as Group | null;
    if (head) {
      head.position.copy(p.neck).addScaledVector(j.spine, 0.17);
      _q.setFromUnitVectors(_up, j.spine);
      head.quaternion.copy(_q);
      head.rotateY(p.look.yaw);
      head.rotateX(p.look.pitch);
    }
    const bag = r.current.bag as Group | null;
    if (bag) {
      bag.position.copy(p.hip).lerp(p.neck, 0.55).addScaledVector(j.tmp.set(0, 0, -1), 0.17);
      bag.quaternion.setFromUnitVectors(_up, j.spine);
    }
    const chest = r.current.chest as Group | null;
    if (chest) {
      chest.position.copy(p.hip).lerp(p.neck, 0.52);
      chest.quaternion.setFromUnitVectors(_up, j.spine);
    }
    const hood = o.hood;
    if (hood) {
      hood.position.copy(p.neck).addScaledVector(j.tmp.set(0, 0, -1), 0.1);
      hood.quaternion.setFromUnitVectors(_up, j.spine);
    }
  });

  return (
    <group>
      <mesh ref={set('torso')} geometry={geo.torso} castShadow>
        <meshStandardMaterial color={look.hoodie} roughness={0.85} />
      </mesh>
      <mesh ref={set('pelvis')} geometry={geo.joint} scale={[0.16, 0.11, 0.12]} castShadow>
        <meshStandardMaterial color={look.pants} roughness={0.85} />
      </mesh>
      <mesh ref={set('hood')} castShadow>
        <torusGeometry args={[0.12, 0.05, 8, 16]} />
        <meshStandardMaterial color={look.hoodieDark} roughness={0.9} />
      </mesh>
      {(['L', 'R'] as const).map((s) => (
        <group key={s}>
          <mesh ref={set(`thigh${s}`)} geometry={geo.thigh} castShadow>
            <meshStandardMaterial color={look.pants} roughness={0.85} />
          </mesh>
          <mesh ref={set(`shin${s}`)} geometry={geo.shin} castShadow>
            <meshStandardMaterial color={look.pants} roughness={0.85} />
          </mesh>
          <mesh ref={set(`upper${s}`)} geometry={geo.upper} castShadow>
            <meshStandardMaterial color={look.hoodie} roughness={0.85} />
          </mesh>
          <mesh ref={set(`fore${s}`)} geometry={geo.fore} castShadow>
            <meshStandardMaterial color={look.hoodie} roughness={0.85} />
          </mesh>
          <mesh ref={set(`knee${s}`)} geometry={geo.joint} scale={0.068} castShadow>
            <meshStandardMaterial color={look.pants} roughness={0.85} />
          </mesh>
          <mesh ref={set(`el${s}`)} geometry={geo.joint} scale={0.053} castShadow>
            <meshStandardMaterial color={look.hoodie} roughness={0.85} />
          </mesh>
          <mesh ref={set(`sh${s}`)} geometry={geo.joint} scale={0.075} castShadow>
            <meshStandardMaterial color={look.hoodie} roughness={0.85} />
          </mesh>
          <mesh ref={set(`hand${s}`)} geometry={geo.hand} castShadow>
            <meshStandardMaterial color={look.skin} roughness={0.7} />
          </mesh>
          <group ref={set(`foot${s}`)}>
            <mesh position={[0, -0.01, 0.04]} castShadow>
              <boxGeometry args={[0.1, 0.08, 0.2]} />
              <meshStandardMaterial color={look.shoes} roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.015, 0.14]} scale={[1, 0.72, 1.1]} castShadow>
              <sphereGeometry args={[0.05, 12, 8]} />
              <meshStandardMaterial color={look.shoes} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.032, 0.07]} rotation={[-0.3, 0, 0]}>
              <boxGeometry args={[0.05, 0.01, 0.1]} />
              <meshStandardMaterial color="#c9c4bc" />
            </mesh>
            <mesh position={[0, -0.05, 0.05]}>
              <boxGeometry args={[0.11, 0.025, 0.25]} />
              <meshStandardMaterial color={look.sole} roughness={0.8} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Hoodie details that follow the chest: hood, pocket, drawstrings, ribbed hem */}
      <group ref={set('chest')}>
        <mesh position={[0, 0.2, -0.13]} scale={[1.25, 0.8, 0.75]} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color={look.hoodieDark} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.12, 0.128]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.2, 0.1, 0.02]} />
          <meshStandardMaterial color={look.hoodieDark} roughness={0.9} />
        </mesh>
        {[-0.035, 0.035].map((x) => (
          <mesh key={x} position={[x, 0.16, 0.13]} rotation={[0.15, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.11, 6]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
        ))}
        <mesh position={[0, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.82, 1]}>
          <torusGeometry args={[0.158, 0.028, 8, 28]} />
          <meshStandardMaterial color={look.hoodieDark} roughness={0.95} />
        </mesh>
      </group>
      {/* Head: oval face, chin, nose, eyes, brows, ears, styled black hair */}
      <group ref={set('head')}>
        <mesh position={[0, 0.06, 0]} scale={[0.94, 1.06, 1]} castShadow>
          <sphereGeometry args={[0.125, 28, 20]} />
          <meshStandardMaterial color={look.skin} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.0, 0.018]} scale={[0.82, 0.72, 0.86]}>
          <sphereGeometry args={[0.105, 20, 14]} />
          <meshStandardMaterial color={look.skin} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.075, -0.005]}>
          <cylinderGeometry args={[0.048, 0.056, 0.1, 14]} />
          <meshStandardMaterial color={look.skin} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.045, 0.124]} scale={[0.8, 1.3, 1]}>
          <sphereGeometry args={[0.016, 10, 8]} />
          <meshStandardMaterial color={look.skin} roughness={0.55} />
        </mesh>
        {[1, -1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.118, 0.05, -0.005]} scale={[0.45, 1, 0.75]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <meshStandardMaterial color={look.skin} roughness={0.65} />
            </mesh>
            <mesh position={[s * 0.041, 0.074, 0.106]} scale={[1.2, 0.9, 0.6]}>
              <sphereGeometry args={[0.018, 12, 10]} />
              <meshStandardMaterial color="#fbfaf7" roughness={0.3} />
            </mesh>
            <mesh position={[s * 0.041, 0.074, 0.117]}>
              <sphereGeometry args={[0.0095, 10, 8]} />
              <meshStandardMaterial color="#3b2a20" roughness={0.2} />
            </mesh>
            <mesh position={[s * 0.043, 0.104, 0.112]} rotation={[0.2, 0, s * -0.14]}>
              <boxGeometry args={[0.046, 0.011, 0.012]} />
              <meshStandardMaterial color={look.hair} />
            </mesh>
          </group>
        ))}
        {/* Hair: a short cut, fuller on top with a swept fringe */}
        <mesh position={[0, 0.095, -0.016]} scale={[1.02, 0.9, 1.06]} castShadow>
          <sphereGeometry args={[0.13, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial color={look.hair} roughness={0.85} />
        </mesh>
        {[
          [-0.045, 0.172, 0.07, 0.55, -0.4],
          [0.01, 0.182, 0.078, 0.5, -0.1],
          [0.055, 0.17, 0.062, 0.6, 0.35],
          [0.0, 0.195, 0.01, 0.2, 0],
        ].map(([x, y, z, rx, rz], i) => (
          <mesh key={i} position={[x!, y!, z!]} rotation={[rx!, 0, rz!]} scale={[1.3, 0.55, 1]} castShadow>
            <sphereGeometry args={[0.055, 12, 8]} />
            <meshStandardMaterial color={look.hair} roughness={0.85} />
          </mesh>
        ))}
        {helmet && (
          <group>
            <mesh position={[0, 0.125, -0.01]} scale={[1.1, 0.95, 1.2]} castShadow>
              <sphereGeometry args={[0.142, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color="#f08a3c" roughness={0.3} metalness={0.15} />
            </mesh>
            {[-0.05, 0.05].map((x) => (
              <mesh key={x} position={[x, 0.235, -0.02]}>
                <boxGeometry args={[0.022, 0.02, 0.26]} />
                <meshStandardMaterial color="#2d2c33" />
              </mesh>
            ))}
            {[1, -1].map((s) => (
              <mesh key={s} position={[s * 0.1, -0.005, 0.03]} rotation={[0, 0, s * 0.25]}>
                <boxGeometry args={[0.008, 0.11, 0.008]} />
                <meshStandardMaterial color="#2d2c33" />
              </mesh>
            ))}
          </group>
        )}
        <mesh position={[0, 0.012, 0.113]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.022, 0.0045, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#a65a52" />
        </mesh>
      </group>
      {/* Backpack */}
      <group ref={set('bag')} visible={bag}>
        <mesh castShadow>
          <boxGeometry args={[0.27, 0.34, 0.12]} />
          <meshStandardMaterial color={look.bag} roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.1, -0.03]} scale={[1, 0.5, 1]}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={look.bag} roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.07, -0.07]}>
          <boxGeometry args={[0.19, 0.12, 0.04]} />
          <meshStandardMaterial color="#3a3a42" roughness={0.8} />
        </mesh>
        <mesh position={[0.08, 0.02, -0.065]}>
          <boxGeometry args={[0.02, 0.05, 0.01]} />
          <meshStandardMaterial color="#d9d4cc" metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
