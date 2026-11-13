import { useMemo } from 'react';
import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import { B, Blob, Slab, useMats } from './kit';
import { MUSIC_X, PAVILION } from './layout';
import { Model } from './Model';
import { Pendant } from './props';

/**
 * Kitchen and dining (family and community), in the glass pavilion facing the garden: a run of
 * charcoal cabinets with a quartz worktop under a strip window, tall walnut units, a quartz island
 * with three stools and pendants, and a walnut dining table for six.
 */

const { x0: X0, z0: Z0, z1: Z1 } = PAVILION;
const KX0 = X0 + 0.23; // inside face of the hallway wall
const ISLAND = { x: -2.35, z: -11.55, w: 2.6, d: 1.0 };
const TABLE = { x: 0.95, z: -11.45, w: 2.2, d: 1.0 };

function Stool({ position }: { position: [number, number, number] }) {
  const m = useMats();
  return (
    <group position={position}>
      <Slab p={[0, 0.65, 0]} s={[0.4, 0.045, 0.36]} m={m.walnut} tile={1} />
      {[
        [-0.15, -0.13],
        [0.15, -0.13],
        [-0.15, 0.13],
        [0.15, 0.13],
      ].map(([x, z]) => (
        <B key={`${x}${z}`} p={[x!, 0.32, z!]} s={[0.02, 0.64, 0.02]} m={m.black} />
      ))}
      <B p={[0, 0.25, 0.13]} s={[0.3, 0.015, 0.015]} m={m.black} cast={false} />
      <Blob p={[0, 0]} s={[0.6, 0.6]} />
    </group>
  );
}

export function Kitchen() {
  const m = useMats();
  const mats = useMemo(
    () => ({
      cab: new MeshStandardMaterial({ color: '#2d2e30', roughness: 0.6 }),
      hob: new MeshPhysicalMaterial({ color: '#0a0a0b', roughness: 0.08, clearcoat: 1 }),
      sink: new MeshStandardMaterial({ color: '#9ea2a6', metalness: 1, roughness: 0.35 }),
      fruit: new MeshStandardMaterial({ color: '#e0892e', roughness: 0.5 }),
      green: new MeshStandardMaterial({ color: '#7fa64a', roughness: 0.5 }),
    }),
    [],
  );
  const runX0 = KX0;
  const runX1 = -0.95;
  const run = runX1 - runX0;
  return (
    <group>
      <Slab p={[(KX0 + MUSIC_X) / 2, -0.05, (Z0 + Z1) / 2]} s={[MUSIC_X - KX0, 0.1, Z1 - Z0 + 0.1]} m={m.concreteWarm} tile={3} cast={false} />
      {/* Back run: base cabinets, quartz worktop and splashback */}
      <B p={[runX0 + run / 2, 0.05, Z0 + 0.3]} s={[run, 0.1, 0.56]} m={m.black} cast={false} />
      <B p={[runX0 + run / 2, 0.49, Z0 + 0.31]} s={[run, 0.78, 0.6]} m={mats.cab} />
      {Array.from({ length: Math.floor(run / 0.6) - 1 }, (_, i) => (
        <B key={`g${i}`} p={[runX0 + (i + 1) * (run / Math.floor(run / 0.6)), 0.49, Z0 + 0.612]} s={[0.004, 0.76, 0.004]} m={m.black} cast={false} />
      ))}
      <Slab p={[runX0 + run / 2, 0.9, Z0 + 0.32]} s={[run, 0.04, 0.64]} m={m.quartz} tile={1.4} />
      <Slab p={[runX0 + run / 2, 1.22, Z0 + 0.01]} s={[run, 0.6, 0.02]} m={m.quartz} tile={1.4} cast={false} />
      {/* Hob and sink */}
      <B p={[-2.0, 0.922, Z0 + 0.32]} s={[0.78, 0.006, 0.5]} m={mats.hob} cast={false} />
      <B p={[-3.65, 0.921, Z0 + 0.33]} s={[0.6, 0.004, 0.42]} m={mats.sink} cast={false} />
      <group position={[-3.65, 0.92, Z0 + 0.1]}>
        <B p={[0, 0.17, 0]} s={[0.025, 0.34, 0.025]} m={m.black} />
        <B p={[0, 0.34, 0.1]} s={[0.025, 0.025, 0.22]} m={m.black} />
      </group>
      {/* Tall walnut units with an oven */}
      <Slab p={[(runX1 + 0.55) / 2, 1.2, Z0 + 0.32]} s={[0.55 - runX1, 2.4, 0.64]} m={m.walnut} tile={1.2} />
      <B p={[(runX1 + 0.55) / 2, 1.15, Z0 + 0.645]} s={[0.56, 0.5, 0.01]} m={mats.hob} cast={false} />
      <B p={[(runX1 + 0.55) / 2, 1.45, Z0 + 0.66]} s={[0.4, 0.015, 0.02]} m={m.steel} cast={false} />
      <Blob p={[runX0 + run / 2, Z0 + 0.55]} s={[run + 0.4, 0.9]} />
      {/* Open shelf on the hallway wall */}
      <Slab p={[KX0 + 0.13, 1.55, -13.0]} s={[0.26, 0.04, 1.0]} m={m.walnut} tile={1} />
      <Model id="ceramic_vase_01" position={[KX0 + 0.13, 1.57, -13.2]} scale={0.6} />
      {/* Island */}
      <Slab p={[ISLAND.x, 0.45, ISLAND.z]} s={[ISLAND.w - 0.1, 0.86, ISLAND.d - 0.12]} m={m.walnut} tile={1.2} />
      <Slab p={[ISLAND.x, 0.9, ISLAND.z]} s={[ISLAND.w, 0.05, ISLAND.d]} m={m.quartz} tile={1.4} />
      {[-1, 1].map((s) => (
        <Slab key={s} p={[ISLAND.x + s * (ISLAND.w / 2 - 0.025), 0.45, ISLAND.z]} s={[0.05, 0.9, ISLAND.d]} m={m.quartz} tile={1.4} />
      ))}
      <Blob p={[ISLAND.x, ISLAND.z]} s={[ISLAND.w + 0.6, ISLAND.d + 0.6]} />
      {[-0.85, 0, 0.85].map((dx) => (
        <Stool key={dx} position={[ISLAND.x + dx, 0, ISLAND.z + 0.78]} />
      ))}
      {/* A bowl of fruit and a cutting board */}
      <group position={[ISLAND.x - 0.6, 0.925, ISLAND.z - 0.1]}>
        <mesh position={[0, 0.05, 0]} scale={[0.17, 0.1, 0.17]}>
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color="#efeae2" roughness={0.4} side={2} />
        </mesh>
        {[
          [0.03, 0.06, 0.02, 0],
          [-0.05, 0.065, -0.02, 1],
          [0.0, 0.1, -0.05, 0],
          [0.06, 0.07, -0.06, 1],
        ].map(([x, y, z, k], i) => (
          <mesh key={i} position={[x!, y!, z!]} material={k ? mats.green : mats.fruit} castShadow>
            <sphereGeometry args={[0.04, 16, 12]} />
          </mesh>
        ))}
      </group>
      <Slab p={[ISLAND.x + 0.5, 0.94, ISLAND.z - 0.15]} s={[0.45, 0.025, 0.3]} m={m.oak} tile={1} />
      {[-0.8, 0, 0.8].map((dx) => (
        <Pendant key={dx} position={[ISLAND.x + dx, 3.2, ISLAND.z]} drop={0.9} color="#2a2a2c" />
      ))}
      <pointLight position={[ISLAND.x, 2.0, ISLAND.z]} color="#ffd29c" intensity={4} distance={5} decay={2} />
      {/* Dining table for six */}
      <Slab p={[TABLE.x, 0.74, TABLE.z]} s={[TABLE.w, 0.045, TABLE.d]} m={m.walnut} tile={1.2} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <B p={[TABLE.x + s * (TABLE.w / 2 - 0.25), 0.36, TABLE.z]} s={[0.06, 0.72, 0.75]} m={m.black} />
        </group>
      ))}
      <Blob p={[TABLE.x, TABLE.z]} s={[TABLE.w + 0.9, TABLE.d + 1.2]} />
      {[-0.68, 0, 0.68].map((dx) => (
        <group key={dx}>
          <Model id="dining_chair_02" position={[TABLE.x + dx, 0, TABLE.z - 0.62]} />
          <Model id="dining_chair_02" position={[TABLE.x + dx, 0, TABLE.z + 0.62]} rotation={Math.PI} />
        </group>
      ))}
      <Model id="ceramic_vase_01" position={[TABLE.x, 0.765, TABLE.z]} scale={0.8} />
      {/* Linear pendant over the table */}
      <B p={[TABLE.x, 2.2, TABLE.z]} s={[1.6, 0.05, 0.08]} m={m.black} />
      <B p={[TABLE.x, 2.17, TABLE.z]} s={[1.56, 0.01, 0.05]} m={m.warmGlow} cast={false} />
      {[-0.7, 0.7].map((dx) => (
        <B key={dx} p={[TABLE.x + dx, 2.7, TABLE.z]} s={[0.004, 1.0, 0.004]} m={m.black} cast={false} />
      ))}
      <pointLight position={[TABLE.x, 1.9, TABLE.z]} color="#ffd29c" intensity={3} distance={4.5} decay={2} />
      {/* Plants by the glass */}
      <Model id="pachira_aquatica_01" pick={0} position={[KX0 + 0.45, 0, Z1 - 0.45]} />
      <Model id="calathea_orbifolia_01" pick={0} position={[2.6, 0, Z0 + 0.45]} />
    </group>
  );
}
