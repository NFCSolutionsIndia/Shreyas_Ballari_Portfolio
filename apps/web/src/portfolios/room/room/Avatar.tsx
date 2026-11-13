import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, MathUtils, Quaternion, Vector3, type Group } from 'three';
import { RoundedBox } from './drei';

/** How a character looks. Everything is flat colour, so changing a value here is all it takes. */
export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'bun';
  eyes: string;
  lips: string;
  /** Hoodie, or an open zip jacket over a T-shirt in `inner`. */
  outfit: 'hoodie' | 'jacket';
  top: string;
  topDark: string;
  inner?: string;
  bottoms: string;
  shoes: string;
}

/** Shreyas's guide avatar, as the family described him: fair skin, black hair, a smart outfit. */
export const SHREYAS_LOOK: Look = {
  skin: '#f0c9a8',
  hair: '#141110',
  hairStyle: 'short',
  eyes: '#2b1a12',
  lips: '#c07868',
  outfit: 'jacket',
  top: '#22314d',
  topDark: '#1a2740',
  inner: '#f7f5f0',
  bottoms: '#3d424c',
  shoes: '#f4f2ee',
};

/** The student Shreyas tutors: an anonymous illustrative classmate, not a real person. */
export const STUDENT_LOOK: Look = {
  skin: '#d9a77f',
  hair: '#4a2c1d',
  hairStyle: 'bun',
  eyes: '#3a2617',
  lips: '#a35a4c',
  outfit: 'hoodie',
  top: '#e3b44f',
  topDark: '#c99a3a',
  bottoms: '#5b5f6b',
  shoes: '#2b2b2e',
};

export type Gesture = 'idle' | 'wave' | 'point' | 'talk' | 'listen';

/** Mutable instructions the parent updates every frame; the avatar eases towards them. */
export interface AvatarControl {
  /** 0 standing still … 1 walking. */
  walk: number;
  gesture: Gesture;
  talking: boolean;
  seated: boolean;
  pointAt: Vector3 | null;
  lookAt: Vector3 | null;
  /** The letter being "spoken" right now, for lip movement. */
  phoneme?: string;
}

export const createControl = (over: Partial<AvatarControl> = {}): AvatarControl => ({
  walk: 0,
  gesture: 'idle',
  talking: false,
  seated: false,
  pointAt: null,
  lookAt: null,
  ...over,
});

const DOWN = new Vector3(0, -1, 0);
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpV = new Vector3();

function aim(group: Group | null, euler: [number, number, number], k: number) {
  if (!group) return;
  tmpQ.setFromEuler(tmpE.set(...euler));
  group.quaternion.slerp(tmpQ, k);
}

/**
 * A stylised teenager built from soft shapes, facing local +z with feet at y = 0. Walks, waves,
 * points, talks (mouth and hands), listens (nods), blinks, breathes and can sit.
 */
export function Avatar({ look, control, root }: { look: Look; control: RefObject<AvatarControl>; root: RefObject<Group | null> }) {
  const body = useRef<Group>(null);
  const chest = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const mouth = useRef<Group>(null);
  const hipL = useRef<Group>(null);
  const hipR = useRef<Group>(null);
  const kneeL = useRef<Group>(null);
  const kneeR = useRef<Group>(null);
  const shL = useRef<Group>(null);
  const shR = useRef<Group>(null);
  const elL = useRef<Group>(null);
  const elR = useRef<Group>(null);
  const phase = useRef(0);
  const blink = useRef({ next: 2 + Math.random() * 3, t: 0 });
  const skin = useMemo(() => ({ color: look.skin, roughness: 0.55, sheen: 0.35, sheenColor: '#ffd6bf' }), [look.skin]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const c = control.current;
    if (!c) return;
    const k = 1 - Math.exp(-dt * 10);
    const w = c.walk;
    phase.current += dt * (3 + w * 5.5) * (w > 0.02 ? 1 : 0);
    const p = phase.current;

    // Body bob and breathing
    if (body.current) body.current.position.y = c.seated ? 0 : Math.abs(Math.sin(p)) * 0.025 * w;
    if (chest.current) {
      const breathe = 1 + Math.sin(t * 1.6) * 0.012;
      chest.current.scale.set(breathe, 1, breathe);
      chest.current.rotation.z = c.seated || w > 0.1 ? 0 : Math.sin(t * 0.5) * 0.015;
    }

    // Legs
    if (c.seated) {
      aim(hipL.current, [-1.5, 0, 0.04], k);
      aim(hipR.current, [-1.5, 0, -0.04], k);
      aim(kneeL.current, [1.5, 0, 0], k);
      aim(kneeR.current, [1.5, 0, 0], k);
    } else {
      aim(hipL.current, [Math.sin(p) * 0.55 * w, 0, 0], k);
      aim(hipR.current, [-Math.sin(p) * 0.55 * w, 0, 0], k);
      aim(kneeL.current, [(0.05 + Math.max(0, Math.sin(p + 1.7)) * 0.9) * w, 0, 0], k);
      aim(kneeR.current, [(0.05 + Math.max(0, Math.sin(p + 1.7 + Math.PI)) * 0.9) * w, 0, 0], k);
    }

    // Arms
    const g = w > 0.3 ? 'walk' : c.seated && c.gesture === 'idle' ? 'lap' : c.gesture;
    const swing = Math.sin(p) * 0.45 * w;
    switch (g) {
      case 'walk':
        aim(shL.current, [-swing, 0, 0.07], k);
        aim(shR.current, [swing, 0, -0.07], k);
        aim(elL.current, [-0.3, 0, 0], k);
        aim(elR.current, [-0.3, 0, 0], k);
        break;
      case 'wave':
        aim(shL.current, [0.02, 0, 0.08], k);
        aim(elL.current, [-0.15, 0, 0], k);
        aim(shR.current, [0, 0, -2.55], k);
        aim(elR.current, [0, 0, -0.35 + Math.sin(t * 9) * 0.4], k);
        break;
      case 'point': {
        aim(shL.current, [0.02, 0, 0.08], k);
        aim(elL.current, [-0.15, 0, 0], k);
        const sh = shR.current;
        if (sh && c.pointAt && sh.parent) {
          // Turn the arm to the target, in the shoulder's parent space.
          sh.parent.updateWorldMatrix(true, false);
          tmpV.copy(c.pointAt);
          sh.parent.worldToLocal(tmpV).sub(sh.position).normalize();
          tmpQ.setFromUnitVectors(DOWN, tmpV);
          sh.quaternion.slerp(tmpQ, k);
        }
        aim(elR.current, [0, 0, 0], k);
        break;
      }
      case 'talk':
        aim(shL.current, [-0.3 + Math.sin(t * 2.1) * 0.08, 0, 0.12], k);
        aim(elL.current, [-1.05 + Math.sin(t * 2.6) * 0.15, 0, 0], k);
        aim(shR.current, [-0.35 + Math.sin(t * 1.7 + 1) * 0.1, 0, -0.12], k);
        aim(elR.current, [-1.1 + Math.sin(t * 2.2 + 2) * 0.18, 0, 0], k);
        break;
      case 'lap':
        aim(shL.current, [-0.55, 0, 0.1], k);
        aim(shR.current, [-0.55, 0, -0.1], k);
        aim(elL.current, [-0.85, 0, 0], k);
        aim(elR.current, [-0.85, 0, 0], k);
        break;
      default:
        aim(shL.current, [0.02, 0, 0.07], k);
        aim(shR.current, [0.02, 0, -0.07], k);
        aim(elL.current, [-0.12, 0, 0], k);
        aim(elR.current, [-0.12, 0, 0], k);
    }

    // Head: look at the target (usually the visitor), nod while talking or listening.
    const h = head.current;
    if (h) {
      let yaw = 0;
      let pitch = 0;
      if (c.lookAt && root.current) {
        tmpV.copy(c.lookAt);
        root.current.worldToLocal(tmpV);
        tmpV.y -= 1.6;
        yaw = MathUtils.clamp(Math.atan2(tmpV.x, tmpV.z), -0.8, 0.8);
        pitch = MathUtils.clamp(-Math.atan2(tmpV.y, Math.hypot(tmpV.x, tmpV.z)), -0.35, 0.35);
      }
      if (c.talking) pitch += Math.sin(t * 5) * 0.03;
      if (c.gesture === 'listen') pitch += Math.max(0, Math.sin(t * 2.2)) * 0.12;
      aim(h, [pitch, yaw, c.gesture === 'listen' ? 0.06 : 0], 1 - Math.exp(-dt * 6));
    }

    // Blink
    const b = blink.current;
    b.t += dt;
    if (eyes.current) {
      const closing = b.t > b.next && b.t < b.next + 0.13;
      eyes.current.scale.y = closing ? 0.12 : 1;
      if (b.t > b.next + 0.13) {
        b.t = 0;
        b.next = 2 + Math.random() * 3.5;
      }
    }
    // Mouth
    if (mouth.current) mouth.current.scale.y = c.talking ? 0.7 + Math.abs(Math.sin(t * 13)) * 1.6 : 1;
  });

  const cloth = (color: string) => <meshStandardMaterial color={color} roughness={0.92} />;

  return (
    <group ref={body}>
      {/* Legs */}
      {([[1, hipL, kneeL], [-1, hipR, kneeR]] as const).map(([side, hip, knee]) => (
        <group key={side} ref={hip} position={[0.095 * side, 0.9, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.078, 0.28, 6, 14]} />
            {cloth(look.bottoms)}
          </mesh>
          <group ref={knee} position={[0, -0.42, 0]}>
            <mesh>
              <sphereGeometry args={[0.068, 14, 10]} />
              {cloth(look.bottoms)}
            </mesh>
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.063, 0.29, 6, 14]} />
              {cloth(look.bottoms)}
            </mesh>
            <RoundedBox args={[0.1, 0.075, 0.25]} radius={0.032} position={[0, -0.42, 0.045]} castShadow>
              <meshStandardMaterial color={look.shoes} roughness={0.6} />
            </RoundedBox>
            <mesh position={[0, -0.455, 0.045]}>
              <boxGeometry args={[0.102, 0.012, 0.25]} />
              <meshStandardMaterial color="#d9cfc0" roughness={0.9} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Hips */}
      <mesh position={[0, 0.93, 0]} scale={[1.08, 0.62, 0.76]} castShadow>
        <sphereGeometry args={[0.17, 20, 14]} />
        {cloth(look.bottoms)}
      </mesh>

      <group ref={chest} position={[0, 0.95, 0]}>
        {/* Top: hoodie or open jacket */}
        <mesh position={[0, 0.22, 0]} scale={[1.12, 1, 0.76]} castShadow>
          <capsuleGeometry args={[0.17, 0.26, 8, 20]} />
          {cloth(look.top)}
        </mesh>
        <mesh position={[0, 0.03, 0]} scale={[1.12, 0.35, 0.78]}>
          <cylinderGeometry args={[0.172, 0.165, 0.12, 24]} />
          {cloth(look.topDark)}
        </mesh>
        {look.outfit === 'hoodie' ? (
          <>
            <mesh position={[0, 0.47, -0.07]} rotation={[1.25, 0, 0]}>
              <torusGeometry args={[0.1, 0.045, 10, 24]} />
              {cloth(look.topDark)}
            </mesh>
            <RoundedBox args={[0.24, 0.11, 0.03]} radius={0.012} position={[0, 0.13, 0.125]}>
              {cloth(look.topDark)}
            </RoundedBox>
            {[-0.035, 0.035].map((x) => (
              <mesh key={x} position={[x, 0.37, 0.128]} rotation={[0.15, 0, 0]}>
                <cylinderGeometry args={[0.005, 0.005, 0.13, 6]} />
                <meshStandardMaterial color="#f4f1ea" />
              </mesh>
            ))}
          </>
        ) : (
          <>
            {/* T-shirt showing through the open front, a crew neck, jacket edges and stand collar */}
            <RoundedBox args={[0.12, 0.36, 0.03]} radius={0.012} position={[0, 0.27, 0.119]}>
              <meshStandardMaterial color={look.inner} roughness={0.95} />
            </RoundedBox>
            <mesh position={[0, 0.455, 0.035]} rotation={[Math.PI / 2 + 0.25, 0, 0]}>
              <torusGeometry args={[0.058, 0.012, 8, 24]} />
              <meshStandardMaterial color={look.inner} roughness={0.95} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.066 * s, 0.26, 0.128]} rotation={[0, 0, 0.05 * s]}>
                <boxGeometry args={[0.018, 0.4, 0.02]} />
                {cloth(look.topDark)}
              </mesh>
            ))}
            {/* Open ring turned so its gap faces the front */}
            <mesh position={[0, 0.455, -0.01]} rotation={[Math.PI / 2 - 0.15, 0, 2.435]}>
              <torusGeometry args={[0.078, 0.022, 8, 28, Math.PI * 1.45]} />
              {cloth(look.topDark)}
            </mesh>
            <mesh position={[0.074, 0.38, 0.135]}>
              <boxGeometry args={[0.008, 0.03, 0.006]} />
              <meshStandardMaterial color="#c9c3b6" metalness={0.8} roughness={0.3} />
            </mesh>
          </>
        )}
        {/* Neck and head */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.12, 14]} />
          <meshPhysicalMaterial {...skin} />
        </mesh>
        <group ref={head} position={[0, 0.665, 0]} scale={1.12}>
          <mesh scale={[0.93, 1.08, 1]} castShadow>
            <sphereGeometry args={[0.115, 32, 24]} />
            <meshPhysicalMaterial {...skin} />
          </mesh>
          {/* Ears */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.106 * s, 0, -0.005]} scale={[0.45, 1, 0.75]}>
              <sphereGeometry args={[0.026, 12, 10]} />
              <meshPhysicalMaterial {...skin} />
            </mesh>
          ))}
          {/* Nose */}
          <mesh position={[0, -0.012, 0.112]} scale={[0.75, 1.15, 0.9]}>
            <sphereGeometry args={[0.018, 12, 10]} />
            <meshPhysicalMaterial {...skin} />
          </mesh>
          {/* Eyes */}
          <group ref={eyes} position={[0, 0.022, 0]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[0.04 * s, 0, 0.097]}>
                <mesh scale={[1, 0.85, 0.45]}>
                  <sphereGeometry args={[0.023, 14, 10]} />
                  <meshStandardMaterial color="#fbf8f4" roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.001, 0.008]} scale={[1, 1, 0.5]}>
                  <sphereGeometry args={[0.0145, 14, 10]} />
                  <meshStandardMaterial color={look.eyes} roughness={0.2} />
                </mesh>
                <mesh position={[0.005, 0.006, 0.0165]}>
                  <sphereGeometry args={[0.0032, 8, 6]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          {/* Brows */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.042 * s, 0.058, 0.101]} rotation={[0, 0, Math.PI / 2 - 0.12 * s]}>
              <capsuleGeometry args={[0.0055, 0.032, 4, 8]} />
              <meshStandardMaterial color={look.hair} />
            </mesh>
          ))}
          {/* Smile */}
          <group ref={mouth} position={[0, -0.05, 0.103]}>
            <mesh rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.022, 0.0055, 6, 16, Math.PI]} />
              <meshStandardMaterial color={look.lips} roughness={0.5} />
            </mesh>
          </group>
          {/* Hair */}
          <mesh position={[0, 0.012, -0.012]} rotation={[-0.55, 0, 0]}>
            <sphereGeometry args={[0.124, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={look.hair} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.07, 0.01]} scale={[1.05, 0.55, 1.05]}>
            <sphereGeometry args={[0.11, 24, 16]} />
            <meshStandardMaterial color={look.hair} roughness={0.75} />
          </mesh>
          {look.hairStyle === 'short' ? (
            [-0.065, -0.03, 0.005, 0.04, 0.072].map((x, i) => (
              <mesh key={x} position={[x, 0.083 - Math.abs(x) * 0.25, 0.078]} rotation={[0.5, 0, (i - 2) * 0.18]} scale={[1.25, 0.55, 0.75]}>
                <sphereGeometry args={[0.034, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.75} />
              </mesh>
            ))
          ) : (
            <mesh position={[0, 0.09, -0.09]}>
              <sphereGeometry args={[0.05, 16, 12]} />
              <meshStandardMaterial color={look.hair} roughness={0.75} />
            </mesh>
          )}
        </group>
        {/* Arms */}
        {([[1, shL, elL], [-1, shR, elR]] as const).map(([side, sh, el]) => (
          <group key={side} ref={sh} position={[0.205 * side, 0.4, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <capsuleGeometry args={[0.056, 0.2, 6, 12]} />
              {cloth(look.top)}
            </mesh>
            <group ref={el} position={[0, -0.27, 0]}>
              <mesh>
                <sphereGeometry args={[0.051, 12, 10]} />
                {cloth(look.top)}
              </mesh>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.049, 0.17, 6, 12]} />
                {cloth(look.top)}
              </mesh>
              <mesh position={[0, -0.235, 0]}>
                <cylinderGeometry args={[0.046, 0.046, 0.04, 14]} />
                {cloth(look.topDark)}
              </mesh>
              <mesh position={[0, -0.285, 0.005]} scale={[0.7, 1, 0.5]} castShadow>
                <sphereGeometry args={[0.044, 14, 10]} />
                <meshPhysicalMaterial {...skin} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
