import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, DoubleSide, MathUtils, Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { Html } from './drei';

/**
 * The five steps the hologram plays. A concept illustration built from the confirmed Oncure
 * summary ("nanobots guided by AI deliver therapy to tumour cells while sparing healthy tissue");
 * the proposal's own five-step workflow is still to be supplied.
 */
const STEPS = [
  { title: 'Released', text: 'Nanobots enter the bloodstream.' },
  { title: 'Travel', text: 'They move with the blood flow.' },
  { title: 'Find', text: 'AI tells tumour cells apart from healthy cells.' },
  { title: 'Treat', text: 'Therapy goes straight to the tumour cells.' },
  { title: 'Spare', text: 'Healthy tissue is left alone.' },
];
const STEP_SECONDS = 3.2;
const W = 1.6;
const HGT = 0.9;

const rand = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

/** Floating hologram above the research desk: a blood vessel, tumour, healthy cells and nanobots. */
export function OncureHologram({ active }: { active: boolean }) {
  const group = useRef<Group>(null);
  const [step, setStep] = useState(0);
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-0.74, -0.05, 0),
        new Vector3(-0.36, 0.06, 0),
        new Vector3(0, -0.06, 0),
        new Vector3(0.36, 0.05, 0),
        new Vector3(0.74, -0.02, 0),
      ]),
    [],
  );
  const blood = useMemo(
    () => Array.from({ length: 16 }, () => ({ u: rand(), off: new Vector3(0, (rand() - 0.5) * 0.09, (rand() - 0.5) * 0.06), spin: rand() * 6 })),
    [],
  );
  const tumourCentre = useMemo(() => curve.getPointAt(0.72).add(new Vector3(0, 0.21, 0)), [curve]);
  const healthyCentre = useMemo(() => curve.getPointAt(0.28).add(new Vector3(0, -0.2, 0)), [curve]);
  const tumour = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        pos: tumourCentre.clone().add(
          i === 0 ? new Vector3() : new Vector3(Math.cos(i) * 0.07, Math.sin(i * 1.7) * 0.05, Math.sin(i) * 0.04),
        ),
        r: 0.038 + rand() * 0.018,
      })),
    [tumourCentre],
  );
  const healthy = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        pos: healthyCentre.clone().add(new Vector3((i - 2) * 0.075, Math.sin(i * 2) * 0.03, 0)),
      })),
    [healthyCentre],
  );
  const bloodRefs = useRef<(Mesh | null)[]>([]);
  const botRefs = useRef<(Mesh | null)[]>([]);
  const tumourRefs = useRef<(Mesh | null)[]>([]);
  const healthyRefs = useRef<(Mesh | null)[]>([]);
  const ring = useRef<Mesh>(null);
  const clockStart = useRef<number | null>(null);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.visible = active;
    if (!active) {
      clockStart.current = null;
      return;
    }
    if (clockStart.current === null) clockStart.current = clock.elapsedTime;
    const t = clock.elapsedTime - clockStart.current;
    const cycle = t % (STEP_SECONDS * STEPS.length);
    const s = Math.floor(cycle / STEP_SECONDS);
    const f = (cycle % STEP_SECONDS) / STEP_SECONDS;
    if (s !== step) setStep(s);

    // Blood cells flow along the vessel.
    blood.forEach((b, i) => {
      const m = bloodRefs.current[i];
      if (!m) return;
      curve.getPointAt((b.u + t * 0.07) % 1, m.position).add(b.off);
      m.rotation.set(b.spin + t, b.spin, 0);
    });

    // Nanobots
    botRefs.current.forEach((m, i) => {
      if (!m) return;
      const lag = i * 0.018;
      const target = tumour[i % tumour.length]!;
      let scale = 1;
      if (s === 0) {
        curve.getPointAt(MathUtils.clamp(0.02 + f * 0.12 - lag, 0, 1), m.position);
        scale = MathUtils.clamp(f * 2 - i * 0.1, 0, 1);
      } else if (s === 1) {
        curve.getPointAt(MathUtils.clamp(0.14 + f * 0.52 - lag, 0, 1), m.position);
      } else if (s === 2) {
        curve.getPointAt(MathUtils.clamp(0.66 - lag + Math.sin(t * 3 + i) * 0.006, 0, 1), m.position);
        m.position.y += f * 0.05;
      } else {
        const from = curve.getPointAt(MathUtils.clamp(0.66 - lag, 0, 1), tmp).add(new Vector3(0, 0.05, 0));
        const to = target.pos.clone().add(target.pos.clone().sub(tumourCentre).normalize().multiplyScalar(target.r + 0.012));
        if (target.pos.equals(tumourCentre)) to.copy(target.pos).add(new Vector3(0, 0, target.r + 0.012));
        m.position.copy(from).lerp(to, s === 3 ? MathUtils.smoothstep(f, 0, 0.6) : 1);
      }
      m.scale.setScalar(scale);
      m.rotation.z = t * 4 + i;
    });

    // Tumour: highlighted when found, shrinking once treated.
    tumourRefs.current.forEach((m) => {
      if (!m) return;
      const mat = m.material as MeshStandardMaterial;
      const found = s >= 2;
      mat.emissiveIntensity = found ? 0.9 + Math.sin(t * 6) * 0.3 : 0.25;
      const shrink = s === 3 ? 1 - MathUtils.smoothstep(f, 0.5, 1) * 0.45 : s === 4 ? 0.55 - f * 0.2 : 1;
      m.scale.setScalar(shrink);
      mat.opacity = s === 4 ? 1 - f * 0.5 : 1;
    });
    if (ring.current) {
      const mat = ring.current.material as MeshStandardMaterial;
      mat.opacity = s === 2 ? 0.35 + Math.sin(f * Math.PI * 6) * 0.3 : 0;
      ring.current.scale.setScalar(1 + (s === 2 ? f * 0.3 : 0));
    }
    // Healthy cells glow green when they're spared.
    healthyRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as MeshStandardMaterial;
      mat.emissiveIntensity = s === 4 ? 0.5 + Math.sin(t * 5 + i) * 0.25 : 0.05;
    });
  });

  return (
    <group ref={group} position={[-3.6, 2.2, -7.45]} visible={false}>
      {/* Panel and frame */}
      <mesh>
        <planeGeometry args={[W, HGT]} />
        <meshBasicMaterial color="#0c2230" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {(
        [
          [[W, 0.008, 0.008], [0, HGT / 2, 0]],
          [[W, 0.008, 0.008], [0, -HGT / 2, 0]],
          [[0.008, HGT, 0.008], [-W / 2, 0, 0]],
          [[0.008, HGT, 0.008], [W / 2, 0, 0]],
        ] as const
      ).map(([args, position], i) => (
        <mesh key={i} position={[...position]}>
          <boxGeometry args={[...args]} />
          <meshBasicMaterial color="#7fe8ff" toneMapped={false} />
        </mesh>
      ))}
      {/* Blood vessel */}
      <mesh position={[0, 0, 0.04]}>
        <tubeGeometry args={[curve, 64, 0.085, 16, false]} />
        <meshStandardMaterial color="#ff8fa3" transparent opacity={0.22} side={DoubleSide} depthWrite={false} />
      </mesh>
      <group position={[0, 0, 0.04]}>
        {blood.map((_, i) => (
          <mesh key={i} ref={(m) => void (bloodRefs.current[i] = m)} scale={[1, 1, 0.45]}>
            <sphereGeometry args={[0.022, 12, 8]} />
            <meshStandardMaterial color="#e0525a" roughness={0.5} />
          </mesh>
        ))}
        {tumour.map((c, i) => (
          <mesh key={i} ref={(m) => void (tumourRefs.current[i] = m)} position={c.pos}>
            <sphereGeometry args={[c.r, 18, 14]} />
            <meshStandardMaterial color="#9a63e0" emissive="#6a2fc0" emissiveIntensity={0.25} roughness={0.5} transparent />
          </mesh>
        ))}
        <mesh ref={ring} position={tumourCentre}>
          <torusGeometry args={[0.15, 0.004, 8, 48]} />
          <meshStandardMaterial color="#7fe8ff" emissive="#7fe8ff" emissiveIntensity={2} transparent opacity={0} toneMapped={false} />
        </mesh>
        {healthy.map((c, i) => (
          <mesh key={i} ref={(m) => void (healthyRefs.current[i] = m)} position={c.pos}>
            <sphereGeometry args={[0.036, 16, 12]} />
            <meshStandardMaterial color="#f4c4cc" emissive="#5fd38a" emissiveIntensity={0.05} roughness={0.5} />
          </mesh>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} ref={(m) => void (botRefs.current[i] = m)}>
            <capsuleGeometry args={[0.011, 0.028, 4, 8]} />
            <meshStandardMaterial color="#dfe9ee" metalness={0.8} roughness={0.2} emissive="#66e0ff" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {active && (
        <Html position={[-W / 2 - 0.06, 0, 0]} zIndexRange={[29, 20]} style={{ pointerEvents: 'none' }}>
          <div className="room-holo-caption">
            <p className="room-holo-title">
              Oncure · step {step + 1} of {STEPS.length}: <b>{STEPS[step]!.title}</b>
            </p>
            <p>{STEPS[step]!.text}</p>
            <p className="room-holo-note">Concept illustration</p>
          </div>
        </Html>
      )}
      {active && (
        <>
          <Html position={[-0.52, 0.31, 0.05]} center zIndexRange={[29, 20]} style={{ pointerEvents: 'none' }}>
            <span className="room-holo-tag">Blood vessel</span>
          </Html>
          <Html position={[tumourCentre.x, tumourCentre.y + 0.14, 0.05]} center zIndexRange={[29, 20]} style={{ pointerEvents: 'none' }}>
            <span className="room-holo-tag is-tumour">Tumour cells</span>
          </Html>
          <Html position={[healthyCentre.x, healthyCentre.y - 0.1, 0.05]} center zIndexRange={[29, 20]} style={{ pointerEvents: 'none' }}>
            <span className="room-holo-tag is-healthy">Healthy cells</span>
          </Html>
        </>
      )}
    </group>
  );
}
