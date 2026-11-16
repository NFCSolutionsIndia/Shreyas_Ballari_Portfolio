import { useEffect, useMemo, useRef } from 'react';
import { MeshStandardMaterial, Object3D, type SpotLight } from 'three';
import { B, Blob, Slab, useMats } from './kit';
import { GALLERY } from './layout';
import { CrystalAward, Framed, GoldCup, Medal, certificateTexture } from './props';

/**
 * The trophy gallery (achievements): charcoal walls, three spot-lit plinths (a gold cup, a crystal
 * award, a medal) and framed certificates, each under a brass picture light. The certificates
 * carry only Shreyas's real recognitions.
 */

const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = GALLERY;
const CERTS = {
  collegeBoard: 'College Board National Recognition Program',
  honors: "Principal's Honors List · FSA · 2025 & 2026",
  psat: 'PSAT · 99th percentile',
  map: 'MAP · 99th percentile',
  arrow: 'Project Arrow · IPSD · since 2nd grade',
} as const;

const PLINTHS: { p: [number, number]; h: number }[] = [
  { p: [-11.75, -11.55], h: 1.05 },
  { p: [-10.0, -10.15], h: 0.95 },
  { p: [-10.0, -12.95], h: 0.95 },
];

function Spot({ at, h }: { at: [number, number]; h: number }) {
  const ref = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useEffect(() => {
    target.position.set(at[0], h + 0.15, at[1]);
    target.updateMatrixWorld();
    if (ref.current) ref.current.target = target;
  }, [target, at, h]);
  return <spotLight ref={ref} position={[at[0] + 0.5, 3.1, at[1]]} angle={0.42} penumbra={0.75} intensity={70} distance={6} decay={2} color="#fff1dc" />;
}

export function Gallery({ low }: { low?: boolean }) {
  const m = useMats();
  const tex = useMemo(() => Object.fromEntries(Object.entries(CERTS).map(([k, v]) => [k, certificateTexture(v)])) as Record<keyof typeof CERTS, ReturnType<typeof certificateTexture>>, []);
  const floor = useMemo(() => new MeshStandardMaterial({ map: m.concrete.map, normalMap: m.concrete.normalMap, roughnessMap: m.concrete.roughnessMap, color: '#77736d', roughness: 0.35 }), [m]);
  const pl = 0.02;
  return (
    <group>
      <Slab p={[(X0 + X1) / 2, -0.05, (Z0 + Z1) / 2]} s={[X1 - X0, 0.1, Z1 - Z0]} m={floor} tile={3} cast={false} />
      {/* Charcoal linings on every wall (the door stays open) */}
      <Slab p={[X0 + pl / 2, 1.6, (Z0 + Z1) / 2]} s={[pl, 3.2, Z1 - Z0]} m={m.charcoal} cast={false} />
      <Slab p={[(X0 + X1) / 2, 1.6, Z0 + pl / 2]} s={[X1 - X0, 3.2, pl]} m={m.charcoal} cast={false} />
      <Slab p={[(X0 + X1) / 2, 1.6, Z1 - pl / 2]} s={[X1 - X0, 3.2, pl]} m={m.charcoal} cast={false} />
      <Slab p={[X1 - pl / 2, 1.6, (Z0 - 12.4) / 2]} s={[pl, 3.2, -12.4 - Z0]} m={m.charcoal} cast={false} />
      <Slab p={[X1 - pl / 2, 1.6, (Z1 - 10.6) / 2]} s={[pl, 3.2, Z1 + 10.6]} m={m.charcoal} cast={false} />
      <Slab p={[X1 - pl / 2, 2.95, -11.5]} s={[pl, 0.5, 1.8]} m={m.charcoal} cast={false} />
      {/* A dark ceiling with a spot track */}
      <B p={[(X0 + X1) / 2, 3.19, (Z0 + Z1) / 2]} s={[X1 - X0, 0.015, Z1 - Z0]} m={m.charcoal} cast={false} />
      <B p={[-10.4, 3.15, -11.55]} s={[0.04, 0.04, 3.6]} m={m.black} cast={false} />
      {PLINTHS.map(({ p, h }, i) => (
        <group key={i}>
          <Slab p={[p[0], h / 2, p[1]]} s={[0.5, h, 0.5]} m={m.white} tile={1} />
          <B p={[p[0], 0.02, p[1]]} s={[0.46, 0.04, 0.46]} m={m.black} cast={false} />
          <Blob p={p} s={[0.9, 0.9]} />
          <mesh position={[p[0] + 0.5, 3.08, p[1]]} rotation={[0, 0, 0.6]} castShadow={false}>
            <cylinderGeometry args={[0.035, 0.045, 0.14, 20]} />
            <meshStandardMaterial color="#141416" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* One spotlight (on the centre plinth) keeps the scene's light count, and so the shader cost, low. */}
          {i === 1 && <Spot at={p} h={h} />}
        </group>
      ))}
      <GoldCup position={[PLINTHS[0]!.p[0], PLINTHS[0]!.h, PLINTHS[0]!.p[1]]} />
      <CrystalAward position={[PLINTHS[1]!.p[0], PLINTHS[1]!.h, PLINTHS[1]!.p[1]]} low={low} />
      {/* Warm cove light along the walls */}
      <B p={[(X0 + X1) / 2, 3.12, Z0 + 0.06]} s={[X1 - X0 - 0.2, 0.02, 0.04]} m={m.warmGlow} cast={false} />
      <B p={[(X0 + X1) / 2, 3.12, Z1 - 0.06]} s={[X1 - X0 - 0.2, 0.02, 0.04]} m={m.warmGlow} cast={false} />
      <B p={[X0 + 0.06, 3.12, (Z0 + Z1) / 2]} s={[0.04, 0.02, Z1 - Z0 - 0.2]} m={m.warmGlow} cast={false} />
      <group position={[PLINTHS[2]!.p[0], PLINTHS[2]!.h, PLINTHS[2]!.p[1]]} rotation={[0, Math.PI / 2, 0]}>
        <Medal position={[0, 0, 0]} />
      </group>
      {/* Certificates with picture lights */}
      <Cert position={[X0 + pl, 2.05, -11.55]} rotation={Math.PI / 2} tex={tex.collegeBoard} big />
      <Cert position={[-11.3, 1.65, Z0 + pl]} rotation={0} tex={tex.psat} />
      <Cert position={[-9.0, 1.65, Z0 + pl]} rotation={0} tex={tex.map} />
      <Cert position={[-11.3, 1.65, Z1 - pl]} rotation={Math.PI} tex={tex.honors} />
      <Cert position={[-9.0, 1.65, Z1 - pl]} rotation={Math.PI} tex={tex.arrow} />
      {/* A low leather bench */}
      <B p={[-8.3, 0.42, -11.55]} s={[0.45, 0.08, 1.4]} m={m.felt} />
      {[-0.6, 0.6].map((d) => (
        <B key={d} p={[-8.3, 0.19, -11.55 + d]} s={[0.4, 0.38, 0.04]} m={m.brass} />
      ))}
      <Blob p={[-8.3, -11.55]} s={[0.8, 1.8]} />
    </group>
  );
}

function Cert({ position, rotation, tex, big }: { position: [number, number, number]; rotation: number; tex: ReturnType<typeof certificateTexture>; big?: boolean }) {
  const m = useMats();
  const w = big ? 1.15 : 0.82;
  const h = w * 0.75;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Framed position={[0, 0, 0]} w={w} h={h} tex={tex} frame="#c8a46a" mat={0.05} glow={0.18} />
      <group position={[0, h / 2 + 0.12, 0.09]}>
        <B p={[0, 0, 0]} s={[w * 0.55, 0.025, 0.04]} m={m.brass} cast={false} />
        <B p={[0, -0.014, 0.0]} s={[w * 0.5, 0.004, 0.03]} m={m.warmGlow} cast={false} />
        <B p={[0, 0.03, -0.05]} s={[0.015, 0.06, 0.1]} m={m.brass} cast={false} />
      </group>
    </group>
  );
}
