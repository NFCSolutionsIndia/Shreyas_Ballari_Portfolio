import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { B, Blob, Slab, useMats } from './kit';
import { MUSIC_X, PAVILION } from './layout';
import { Model } from './Model';
import { Amp, ElectricGuitar, GuitarOnStand, Rug, Speaker } from './props';

/**
 * The music corner at the east end of the pavilion, behind a slatted walnut screen: acoustic
 * panels and a wooden diffuser, an electric guitar on the wall, the acoustic on its stand, an
 * amp, studio monitors, a lounge chair and a warm floor lamp. A slider opens to the garden.
 */

const { x1: X1, z0: Z0, z1: Z1 } = PAVILION;

export function Music() {
  const m = useMats();
  const panels = useMemo(() => [new MeshStandardMaterial({ color: '#3a3836', roughness: 1 }), new MeshStandardMaterial({ color: '#a7583a', roughness: 1 }), new MeshStandardMaterial({ color: '#6f7a68', roughness: 1 })], []);
  const blocks = useMemo(() => {
    const out: { y: number; z: number; d: number }[] = [];
    let s = 7;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        s = (s * 9301 + 49297) % 233280;
        out.push({ y: 1.45 + i * 0.075, z: -11.85 + j * 0.075, d: 0.03 + (s / 233280) * 0.12 });
      }
    return out;
  }, []);
  const xi = X1; // inside face of the east wall
  return (
    <group>
      <Slab p={[(MUSIC_X + X1) / 2, -0.04, (Z0 + Z1) / 2]} s={[X1 - MUSIC_X, 0.1, Z1 - Z0 + 0.1]} m={m.oak} tile={2.4} cast={false} />
      {/* Slatted walnut screen between dining and music */}
      {Array.from({ length: 28 }, (_, i) => (
        <B key={i} p={[MUSIC_X, 1.6, Z0 + 0.05 + i * 0.095]} s={[0.05, 3.2, 0.04]} m={m.walnut} />
      ))}
      <B p={[MUSIC_X, 0.02, Z0 + 1.35]} s={[0.12, 0.04, 2.7]} m={m.black} cast={false} />
      {/* East wall: acoustic panels around a wooden skyline diffuser */}
      {[
        [-13.2, 0],
        [-12.45, 1],
        [-10.6, 2],
        [-9.85, 0],
      ].map(([z, k]) =>
        [1.0, 2.15].map((y, r) => <B key={`${z}${y}`} p={[xi - 0.03, y, z!]} s={[0.06, 1.05, 0.7]} m={panels[(k! + r) % 3]!} />),
      )}
      {blocks.map((b, i) => (
        <B key={i} p={[xi - b.d / 2, b.y + 0.3, b.z + 0.65]} s={[b.d, 0.07, 0.07]} m={m.walnut} cast={false} />
      ))}
      {/* North wall: the electric guitar on a hanger, the amp beneath */}
      <group position={[4.35, 1.05, Z0 + 0.08]} rotation={[0, 0, 0.08]}>
        <ElectricGuitar />
      </group>
      <B p={[4.35, 2.08, Z0 + 0.03]} s={[0.06, 0.04, 0.06]} m={m.black} cast={false} />
      <Amp position={[4.35, 0, Z0 + 0.32]} />
      <Blob p={[4.35, Z0 + 0.32]} s={[0.9, 0.6]} />
      {/* The acoustic on its stand, studio monitors, a lounge chair */}
      <GuitarOnStand position={[5.55, 0, -12.6]} rotation={-0.75} />
      {[-13.45, -9.95].map((z) => (
        <group key={z}>
          <B p={[5.75, 0.5, z]} s={[0.05, 1.0, 0.05]} m={m.black} />
          <B p={[5.75, 0.01, z]} s={[0.3, 0.02, 0.3]} m={m.black} cast={false} />
          <Speaker position={[5.75, 1.0, z]} rotation={-Math.PI / 2 + (z < -11 ? 0.35 : -0.35)} />
        </group>
      ))}
      <Model id="mid_century_lounge_chair" position={[5.35, 0, -10.6]} rotation={-2.4} />
      <Blob p={[5.35, -10.6]} s={[1.1, 1.1]} />
      {/* Record shelf */}
      <Slab p={[5.3, 1.25, Z0 + 0.15]} s={[1.0, 0.03, 0.3]} m={m.walnut} tile={1} />
      {Array.from({ length: 22 }, (_, i) => (
        <B key={i} p={[4.88 + i * 0.03, 1.42, Z0 + 0.15]} s={[0.008, 0.31, 0.31]} r={[0, 0, (i % 5 === 0 ? 0.12 : 0)]} m={i % 3 ? m.felt : panels[(i >> 1) % 3]!} cast={false} />
      ))}
      <Rug position={[4.7, -11.5]} w={2.4} d={2.2} color="#b9a48a" stripe="#7a4a32" />
      {/* Arc floor lamp */}
      <group position={[3.45, 0, -13.5]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 32]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
        </mesh>
        <B p={[0, 0.85, 0]} s={[0.02, 1.7, 0.02]} m={m.brass} />
        <mesh position={[0, 1.72, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 0.26, 32, 1, true]} />
          <primitive object={m.shade} attach="material" />
        </mesh>
      </group>
      <pointLight position={[4.7, 2.2, -11.6]} color="#ffbf7a" intensity={4.5} distance={5} decay={2} />
      <Model id="calathea_orbifolia_01" pick={0} position={[5.8, 0, -9.5]} />
    </group>
  );
}
