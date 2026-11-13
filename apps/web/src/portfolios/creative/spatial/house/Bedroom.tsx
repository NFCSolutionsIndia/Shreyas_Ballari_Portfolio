import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import { B, Blob, Slab, useMats } from './kit';
import { BEDROOM } from './layout';
import { Model } from './Model';
import { BookRows, ChessSet, GuitarOnStand, Laptop, Monitor, Rug, TableLamp, codeScreen, type Shelf } from './props';

/**
 * Shreyas's bedroom (west wing, by the hallway door): a low walnut bed against a slatted walnut
 * wall, nightstands with warm lamps, a desk with a monitor and laptop, a chess set on the bench at
 * the foot of the bed, his acoustic guitar on a stand, and a window with sheer curtains.
 */

const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = BEDROOM;
const BED_Z = 2.55;

export function Bedroom() {
  const m = useMats();
  const bed = useMemo(
    () => ({
      duvet: new MeshStandardMaterial({ color: '#e9e3d8', roughness: 1 }),
      sheet: new MeshStandardMaterial({ color: '#f5f2ec', roughness: 1 }),
      throw: new MeshStandardMaterial({ color: '#b5643f', roughness: 1 }),
      pillowA: new MeshStandardMaterial({ color: '#d9d2c5', roughness: 1 }),
      pillowB: new MeshStandardMaterial({ color: '#7f8a78', roughness: 1 }),
      head: new MeshStandardMaterial({ color: '#8b8173', roughness: 1 }),
      sheer: new MeshStandardMaterial({ color: '#f4efe6', roughness: 1, transparent: true, opacity: 0.82 }),
    }),
    [],
  );
  const scr = useMemo(() => [codeScreen(3), codeScreen(9)], []);
  const shelves = useMemo<Shelf[]>(() => [{ a: -9.55, b: -8.25, y: 1.52, c: Z0, depth: 0.24 }], []);
  const slats = Array.from({ length: 21 }, (_, i) => Z0 + 0.95 + i * 0.12);
  return (
    <group>
      <Slab p={[(X0 + X1) / 2, -0.05, (Z0 + Z1) / 2]} s={[X1 - X0, 0.1, Z1 - Z0]} m={m.oak} tile={2.4} cast={false} />
      {/* Slatted walnut wall behind the bed, with a warm wash from above */}
      <Slab p={[X0 + 0.02, 1.6, BED_Z]} s={[0.04, 3.2, 2.7]} m={m.walnut} tile={1.2} cast={false} />
      {slats.map((z) => (
        <B key={z} p={[X0 + 0.065, 1.6, z]} s={[0.05, 3.18, 0.06]} m={m.walnut} cast={false} />
      ))}
      <B p={[X0 + 0.1, 3.17, BED_Z]} s={[0.02, 0.02, 2.6]} m={m.warmGlow} cast={false} />
      {/* Bed: floating walnut platform, mattress, duvet, pillows, a throw */}
      <B p={[X0 + 1.1, 0.07, BED_Z]} s={[2.0, 0.14, 1.6]} m={m.black} />
      <Slab p={[X0 + 1.12, 0.22, BED_Z]} s={[2.15, 0.16, 1.82]} m={m.walnut} tile={1.2} />
      <RoundedBox args={[0.12, 1.0, 1.9]} radius={0.04} position={[X0 + 0.16, 0.8, BED_Z]} material={bed.head} castShadow />
      <RoundedBox args={[1.98, 0.24, 1.6]} radius={0.06} position={[X0 + 1.15, 0.42, BED_Z]} material={bed.sheet} castShadow receiveShadow />
      <RoundedBox args={[1.45, 0.08, 1.7]} radius={0.035} position={[X0 + 1.42, 0.55, BED_Z]} material={bed.duvet} castShadow receiveShadow />
      <RoundedBox args={[0.5, 0.09, 1.72]} radius={0.035} position={[X0 + 1.82, 0.585, BED_Z]} material={bed.throw} castShadow />
      {[-0.42, 0.42].map((dz) => (
        <RoundedBox key={dz} args={[0.32, 0.16, 0.66]} radius={0.07} position={[X0 + 0.42, 0.62, BED_Z + dz]} rotation={[0, 0, 0.35]} material={bed.pillowA} castShadow />
      ))}
      <RoundedBox args={[0.22, 0.32, 0.42]} radius={0.08} position={[X0 + 0.62, 0.66, BED_Z + 0.12]} rotation={[0, 0, 0.25]} material={bed.pillowB} castShadow />
      <Blob p={[X0 + 1.15, BED_Z]} s={[2.6, 2.2]} />
      {/* Nightstands and lamps */}
      {[BED_Z - 1.22, BED_Z + 1.22].map((z) => (
        <group key={z}>
          <Slab p={[X0 + 0.32, 0.25, z]} s={[0.46, 0.38, 0.5]} m={m.walnut} tile={1} />
          <B p={[X0 + 0.55, 0.25, z]} s={[0.005, 0.02, 0.36]} m={m.brass} cast={false} />
          <TableLamp position={[X0 + 0.3, 0.44, z]} scale={0.9} />
          <Blob p={[X0 + 0.32, z]} s={[0.8, 0.8]} />
        </group>
      ))}
      <Rug position={[X0 + 1.55, BED_Z]} w={2.7} d={2.9} color="#c9bfae" />
      {/* Bench at the foot of the bed, with the chess set */}
      <Slab p={[X0 + 2.55, 0.42, BED_Z]} s={[0.42, 0.06, 1.3]} m={m.walnut} tile={1} />
      {[-0.55, 0.55].map((dz) => (
        <B key={dz} p={[X0 + 2.55, 0.2, BED_Z + dz]} s={[0.38, 0.4, 0.04]} m={m.black} />
      ))}
      <ChessSet position={[X0 + 2.55, 0.45, BED_Z - 0.2]} rotation={0.2} />
      {/* Desk on the north wall: monitor, laptop, lamp, a floating shelf of books */}
      <Slab p={[-8.9, 0.74, Z0 + 0.33]} s={[1.5, 0.035, 0.62]} m={m.walnut} tile={1.2} />
      {[-9.6, -8.2].map((x) => (
        <B key={x} p={[x, 0.37, Z0 + 0.33]} s={[0.03, 0.74, 0.56]} m={m.black} />
      ))}
      <Monitor position={[-8.95, 0.758, Z0 + 0.2]} tex={scr[0]!} />
      <Laptop position={[-9.3, 0.758, Z0 + 0.42]} rotation={0.25} tex={scr[1]!} />
      <Model id="desk_lamp_arm_01" position={[-8.35, 0.758, Z0 + 0.22]} rotation={-0.6} scale={0.8} />
      <Model id="dining_chair_02" position={[-8.95, 0, Z0 + 0.95]} rotation={Math.PI} />
      <Blob p={[-8.9, Z0 + 0.5]} s={[1.8, 1.2]} />
      <Slab p={[-8.9, 1.5, Z0 + 0.13]} s={[1.4, 0.035, 0.26]} m={m.walnut} tile={1} />
      <BookRows shelves={shelves} along="x" face={1} seed={4} fill={0.7} />
      {/* The guitar */}
      <GuitarOnStand position={[-10.15, 0, Z0 + 0.45]} rotation={0.55} />
      <Model id="calathea_orbifolia_01" pick={0} position={[-7.75, 0, Z0 + 0.3]} />
      {/* Sheer curtains at the window */}
      {[-12.05, -9.35].map((x) => (
        <B key={x} p={[x, 1.55, Z1 - 0.08]} s={[0.36, 3.0, 0.05]} m={bed.sheer} cast={false} />
      ))}
      <B p={[-10.7, 3.1, Z1 - 0.08]} s={[3.2, 0.03, 0.03]} m={m.black} cast={false} />
      <pointLight position={[-10.6, 2.5, 2.4]} color="#ffc98f" intensity={5} distance={6} decay={2} />
    </group>
  );
}
