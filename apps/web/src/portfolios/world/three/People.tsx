import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MathUtils, Quaternion, SRGBColorSpace, Vector3, type Group } from 'three';
import { Avatar, emptyPose, LOOK, type Look, type Pose } from './Avatar';
import { RIDER_SCALE } from './Rider';
import { idlePose, strideFor, walkPose } from './gait';
import { diverAt, FINALE_Z, GROUND, LAKE_GUY, STOPS } from './path';

/**
 * The people of the world: Shreyas at the lakeside rail in the opening shot, townspeople
 * walking in the square and in the Get in touch city, cars on the streets, and Shreyas's
 * skydive with the parachute that brings him down into the Get in touch city.
 */

const LOOKS: Look[] = [
  { ...LOOK, hoodie: '#7a3b4f', hoodieDark: '#5f2e3e', pants: '#3a4a63', skin: '#e0b090', hair: '#5a3a22', bag: '#2f6b4f' },
  { ...LOOK, hoodie: '#e9e4dc', hoodieDark: '#cfc8bd', pants: '#2b2e3a', skin: '#8a5a3c', hair: '#141010', bag: '#c9a24a' },
  { ...LOOK, hoodie: '#3f7d6a', hoodieDark: '#2f5f50', pants: '#5a4a3a', skin: '#c48a64', hair: '#2a1d16', bag: '#8c2f2f' },
  { ...LOOK, hoodie: '#c9a24a', hoodieDark: '#a8873c', pants: '#2b2e3a', skin: '#f0c8a8', hair: '#c9a26a', bag: '#2f5d8c' },
  { ...LOOK, hoodie: '#5b4a8c', hoodieDark: '#46396d', pants: '#3a3a3a', skin: '#6e4630', hair: '#0f0c0b', bag: '#e86f8a' },
];

// --- Shreyas at the rail ---------------------------------------------------------------------

export function LakeGuy({ progress }: { progress: RefObject<number> }) {
  const pose = useRef<Pose>(emptyPose());
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    if (g.current) g.current.visible = p < 0.06;
    const t = clock.elapsedTime;
    const P = pose.current;
    const breathe = Math.sin(t * 1.4) * 0.008;
    // Leaning on the rail, looking out over the lake.
    P.hip.set(0.02, 0.92, -0.02);
    P.neck.set(0.0, 1.43 + breathe, 0.16);
    P.footL.set(0.12, 0.06, 0.02);
    P.footR.set(-0.14, 0.06, -0.12);
    P.handL.set(0.26, 1.06, 0.42);
    P.handR.set(-0.2, 1.07, 0.44);
    P.kneeDir.set(0, 0, 1);
    P.elbowDir.set(0, -0.6, -0.4).normalize();
    P.look.yaw = Math.sin(t * 0.3) * 0.25;
    P.look.pitch = -0.05;
  });
  return (
    <group ref={g}>
      {/* Small viewing deck with a rail */}
      <group position={[LAKE_GUY.x, LAKE_GUY.y, LAKE_GUY.z]}>
        <mesh position={[0, -0.15, 1.5]} receiveShadow castShadow>
          <boxGeometry args={[9, 0.3, 7]} />
          <meshStandardMaterial color="#9b7656" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.95, -1.8]} castShadow>
          <boxGeometry args={[9, 0.22, 0.22]} />
          <meshStandardMaterial color="#f2eee6" />
        </mesh>
        {[-4.3, -1.4, 1.4, 4.3].map((x) => (
          <mesh key={x} position={[x, 0.9, -1.8]}>
            <boxGeometry args={[0.2, 2, 0.2]} />
            <meshStandardMaterial color="#f2eee6" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 3, -1, 4.5]}>
            <cylinderGeometry args={[0.2, 0.2, 2.4, 6]} />
            <meshStandardMaterial color="#6e5440" />
          </mesh>
        ))}
        <group position={[0, 0, -0.9]} rotation={[0, Math.PI, 0]} scale={RIDER_SCALE}>
          <Avatar pose={pose} />
        </group>
      </group>
    </group>
  );
}

// --- Walkers ---------------------------------------------------------------------------------

function Walker({ from, to, look, speed, phase }: { from: Vector3; to: Vector3; look: Look; speed: number; phase: number }) {
  const pose = useRef<Pose>(emptyPose());
  const g = useRef<Group>(null);
  const len = useMemo(() => from.distanceTo(to), [from, to]);
  const heading = useMemo(() => Math.atan2(to.x - from.x, to.z - from.z), [from, to]);
  // Walking state: where along the path, which way, current speed and facing, gait phase.
  const st = useRef({ u: phase, dir: 1, v: 0, yaw: heading, ph: phase * 3, pause: 0 });
  useFrame(({ clock, camera }, delta) => {
    const grp = g.current;
    if (!grp) return;
    if (camera.position.distanceTo(from) > 260) {
      grp.visible = false;
      return;
    }
    grp.visible = true;
    const dt = Math.min(delta, 0.05);
    const s = st.current;
    const target = s.dir > 0 ? heading : heading + Math.PI;
    const dYaw = Math.atan2(Math.sin(target - s.yaw), Math.cos(target - s.yaw));
    const toEnd = (s.dir > 0 ? 1 - s.u : s.u) * len;
    // Slow down into the end of the path, stop, turn round, set off again.
    let want = Math.abs(dYaw) > 0.3 || s.pause > 0 ? 0 : speed * MathUtils.clamp(toEnd / 2.5, 0.25, 1);
    if (s.pause > 0) s.pause -= dt;
    if (toEnd < 0.15 && s.v < 0.3 && Math.abs(dYaw) < 0.3) {
      s.dir = -s.dir;
      s.pause = 0.4 + ((phase * 13) % 1) * 1.2;
      want = 0;
    }
    s.v += (want - s.v) * Math.min(1, dt * 2.2);
    s.yaw += dYaw * Math.min(1, dt * 3.2);
    s.u = MathUtils.clamp(s.u + (s.dir * s.v * dt) / len, 0, 1);
    grp.position.lerpVectors(from, to, s.u);
    grp.rotation.y = s.yaw;
    // Gait: body-local speed (the avatar is drawn RIDER_SCALE times larger).
    const local = s.v / RIDER_SCALE;
    const stride = strideFor(local);
    // Turning on the spot takes small steps too.
    const stepping = Math.max(local, Math.abs(dYaw) > 0.3 ? 0.35 : 0);
    s.ph += (dt * stepping) / stride;
    if (stepping > 0.05) walkPose(pose.current, s.ph % 1, stride, local);
    else idlePose(pose.current, clock.elapsedTime + phase * 10);
  });
  return (
    <group ref={g} scale={RIDER_SCALE}>
      <Avatar pose={pose} look={look} bag={phase > 0.5} />
    </group>
  );
}

export function Walkers({ paths }: { paths: [Vector3, Vector3][] }) {
  return (
    <group>
      {paths.map(([a, b], i) => (
        <Walker key={i} from={a} to={b} look={LOOKS[i % LOOKS.length]!} speed={(1.1 + (i % 3) * 0.15) * 1.6} phase={(i * 0.37) % 1} />
      ))}
    </group>
  );
}

const v = (x: number, z: number) => new Vector3(x, GROUND, z);

export const DOWNTOWN_WALKERS: [Vector3, Vector3][] = [
  [v(-38, -232), v(-38, -320)],
  [v(-28, -300), v(-52, -246)],
  [v(30, -236), v(30, -318)],
  [v(22, -330), v(-24, -330)],
  [v(-60, -205), v(60, -205)],
  [v(45, -204), v(-20, -204)],
];

export const TOUCH_WALKERS: [Vector3, Vector3][] = [
  [v(-30, FINALE_Z + 10), v(-30, FINALE_Z - 50)],
  [v(26, FINALE_Z - 46), v(26, FINALE_Z + 6)],
  [v(-18, FINALE_Z - 60), v(18, FINALE_Z - 60)],
  [v(34, FINALE_Z + 4), v(10, FINALE_Z + 4)],
  [v(-40, FINALE_Z - 20), v(-12, FINALE_Z - 34)],
];

// --- Cars ------------------------------------------------------------------------------------

const CAR_COLORS = ['#f2c14e', '#d9dde4', '#8fa6c2', '#c44d3f', '#f2efe8', '#3f4a5e'];

function Car({ color, taxi = false }: { color: string; taxi?: boolean }) {
  return (
    <group>
      {/* Rounded body: a capsule laid along the car, flattened */}
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.95, 1, 0.9]} castShadow>
        <capsuleGeometry args={[0.56, 3.7, 6, 14]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.2, 0.18, 4.9]} />
        <meshStandardMaterial color={taxi ? '#2d2c33' : '#9aa0aa'} metalness={0.5} roughness={0.4} />
      </mesh>
      {taxi && (
        <mesh position={[0, 2.4, -0.3]}>
          <boxGeometry args={[0.9, 0.32, 0.4]} />
          <meshStandardMaterial color="#fff8e6" emissive="#ffe6a8" emissiveIntensity={0.5} />
        </mesh>
      )}
      <mesh position={[0, 1.85, -0.3]} castShadow>
        <boxGeometry args={[1.9, 0.75, 2.6]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.85, -0.3]}>
        <boxGeometry args={[1.95, 0.55, 2.4]} />
        <meshStandardMaterial color="#2b3350" metalness={0.5} roughness={0.15} />
      </mesh>
      {[-1.6, 1.6].map((z) =>
        [-1.05, 1.05].map((x) => (
          <mesh key={`${z}${x}`} position={[x, 0.5, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.32, 14]} />
            <meshStandardMaterial color="#1e1e22" />
          </mesh>
        )),
      )}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.1, 2.41]}>
          <circleGeometry args={[0.2, 12]} />
          <meshBasicMaterial color="#fff6d8" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Cars driving both ways along a straight street (x from −len/2 to +len/2) at depth z. */
export function Traffic({ z, len = 260, count = 6, y = GROUND, road = true }: { z: number; len?: number; count?: number; y?: number; road?: boolean }) {
  const refs = useRef<(Group | null)[]>([]);
  const cars = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ dir: i % 2 ? 1 : -1, offset: (i * 0.37) % 1, speed: 14 + (i % 3) * 4, color: CAR_COLORS[i % CAR_COLORS.length]! })),
    [count],
  );
  useFrame(({ clock, camera }) => {
    if (Math.abs(camera.position.z - z) > 300) return;
    cars.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      const u = ((clock.elapsedTime * c.speed) / len + c.offset) % 1;
      g.position.set(c.dir * (u * len - len / 2), y, z + c.dir * 2.6);
      g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  });
  return (
    <group>
      {road && (
        <group>
          <mesh position={[0, y - 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[len + 60, 11]} />
            <meshStandardMaterial color="#5c5f70" roughness={0.85} />
          </mesh>
          {Array.from({ length: Math.floor(len / 12) }, (_, i) => (
            <mesh key={i} position={[-len / 2 + i * 12, y - 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[5, 0.25]} />
              <meshBasicMaterial color="#f4efe6" />
            </mesh>
          ))}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[0, y + 0.1, z + sd * 5.7]} receiveShadow>
              <boxGeometry args={[len + 60, 0.3, 0.5]} />
              <meshStandardMaterial color="#d9d2c8" roughness={0.8} />
            </mesh>
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={`z${i}`} position={[-6 + i * 2.4, y - 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.2, 10]} />
              <meshBasicMaterial color="#f4efe6" />
            </mesh>
          ))}
        </group>
      )}
      {cars.map((c, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)}>
          <Car color={c.color} taxi={i === 0} />
        </group>
      ))}
    </group>
  );
}

// --- Skydive ---------------------------------------------------------------------------------

function canopyTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  const cols = ['#f08a3c', '#ffffff', '#2f5d8c', '#ffffff'];
  for (let i = 0; i < 16; i++) {
    g.fillStyle = cols[i % cols.length]!;
    g.fillRect(i * 32, 0, 32, 64);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function Diver({ progress }: { progress: RefObject<number> }) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const chute = useRef<Group>(null);
  const pose = useRef<Pose>(emptyPose());
  const tex = useMemo(canopyTexture, []);
  const lines = useMemo(() => {
    const up = new Vector3(0, 1, 0);
    return Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const from = new Vector3(Math.cos(a) * 3.2, 5.2, Math.sin(a) * 1.6);
      const to = new Vector3(Math.sign(Math.cos(a)) * 0.22, 1.5, 0);
      const dir = to.clone().sub(from);
      return { mid: from.clone().add(to).multiplyScalar(0.5), len: dir.length(), q: new Quaternion().setFromUnitVectors(up, dir.normalize()) };
    });
  }, []);
  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const r = root.current;
    if (!r) return;
    const show = p > STOPS.awardsEnd - 0.005 && p < STOPS.land + 0.03;
    r.visible = show;
    if (!show) return;
    const d = diverAt(p);
    r.position.copy(d.pos);
    r.rotation.y = Math.PI + Math.sin(clock.elapsedTime * 0.6) * 0.06 * (1 - d.canopy);
    // Free fall lies face down; under the canopy he hangs upright.
    if (body.current) body.current.rotation.x = (Math.PI / 2) * 0.92 * (1 - d.canopy);
    const k = d.canopy;
    if (chute.current) {
      chute.current.visible = k > 0.01 && !d.landed;
      chute.current.scale.set(0.2 + 0.8 * k, 0.2 + 0.8 * k, 0.2 + 0.8 * k);
    }
    const t = clock.elapsedTime;
    const P = pose.current;
    const wob = Math.sin(t * 3) * 0.03;
    // Arms and legs spread in free fall; hands up on the toggles under the canopy; standing once landed.
    const fallPose = {
      hip: [0, 0.95, 0], neck: [0, 1.48, 0.02],
      footL: [0.32, 0.12, -0.18 + wob], footR: [-0.32, 0.12, -0.18 - wob],
      handL: [0.62, 1.5 + wob, 0.1], handR: [-0.62, 1.5 - wob, 0.1],
    };
    const chutePose = {
      hip: [0, 0.95, 0], neck: [0, 1.48, 0],
      footL: [0.12, 0.12, 0.12 + wob], footR: [-0.12, 0.14, 0.06 - wob],
      handL: [0.26, 1.9, 0.02], handR: [-0.26, 1.9 - wob, 0.02],
    };
    const standPose = {
      hip: [0, 0.93, 0], neck: [0, 1.47, 0.01],
      footL: [0.11, 0.06, 0.02], footR: [-0.11, 0.06, 0.02],
      handL: [0.3, 1.3, 0.1], handR: [-0.36, 1.72 + Math.sin(t * 9) * 0.05, 0.12],
    };
    const land = d.landed ? 1 : 0;
    const set = (key: 'hip' | 'neck' | 'footL' | 'footR' | 'handL' | 'handR') => {
      const a = fallPose[key];
      const b = chutePose[key];
      const c = standPose[key];
      P[key].set(
        MathUtils.lerp(MathUtils.lerp(a[0]!, b[0]!, k), c[0]!, land),
        MathUtils.lerp(MathUtils.lerp(a[1]!, b[1]!, k), c[1]!, land),
        MathUtils.lerp(MathUtils.lerp(a[2]!, b[2]!, k), c[2]!, land),
      );
    };
    (['hip', 'neck', 'footL', 'footR', 'handL', 'handR'] as const).forEach(set);
    P.kneeDir.set(0, 0, 1);
    P.elbowDir.set(0, -0.3, -1).normalize();
    P.look.yaw = 0;
    P.look.pitch = 0.2 * (1 - k);
    // Once landed, turn to wave at the camera.
    if (d.landed) r.rotation.y = 0.2;
  });
  return (
    <group ref={root} scale={RIDER_SCALE}>
      <group ref={body}>
        <Avatar pose={pose} helmet />
      </group>
      <group ref={chute}>
        <mesh position={[0, 5.2, 0]} scale={[1, 0.42, 0.55]}>
          <sphereGeometry args={[3.4, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial map={tex} side={2} roughness={0.7} />
        </mesh>
        {lines.map((l, i) => (
          <mesh key={i} position={l.mid} quaternion={l.q}>
            <cylinderGeometry args={[0.008, 0.008, l.len, 4]} />
            <meshBasicMaterial color="#f4f1ea" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

