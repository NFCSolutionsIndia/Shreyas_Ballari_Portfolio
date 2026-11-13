import { useMemo } from 'react';
import { B, Slab, WallX, WallZ, WindowFill, useMats } from './kit';
import { BEDROOM, DOORS, GALLERY, HALL, LAB, MUSIC_DOOR, PAVILION, STUDY, WING } from './layout';
import { Framed, abstractTexture } from './props';
import { Model } from './Model';

/**
 * The building around the living room: the hallway (glass along the courtyard), the west wing
 * (bedroom, study, lab, gallery), the kitchen/music pavilion, the living room's outer shell and
 * the roofs. Rooms fill in their own furniture.
 */

const H = 3.2;
const ROOF = 0.25;

function Floor({ x0, x1, z0, z1, m, tile = 2.4 }: { x0: number; x1: number; z0: number; z1: number; m: Parameters<typeof Slab>[0]['m']; tile?: number }) {
  return <Slab p={[(x0 + x1) / 2, -0.05, (z0 + z1) / 2]} s={[x1 - x0, 0.1, z1 - z0]} m={m} tile={tile} cast={false} />;
}

function Ceiling({ x0, x1, z0, z1, y = H }: { x0: number; x1: number; z0: number; z1: number; y?: number }) {
  const m = useMats();
  return <Slab p={[(x0 + x1) / 2, y + ROOF / 2, (z0 + z1) / 2]} s={[x1 - x0, ROOF, z1 - z0]} m={m.plaster} tile={3} cast={false} />;
}

export function Shell() {
  const m = useMats();
  const art = useMemo(() => [abstractTexture(11, ['#e9e1d4', '#c86f4a', '#2f4b5a', '#d9b26a']), abstractTexture(5, ['#ece7df', '#7d8f74', '#d8c3a5', '#3a3a3a']), abstractTexture(21, ['#efe8dc', '#a3b4c4', '#e0b48c'])], []);
  const wallX0 = WING.x0 - 0.1; // west face of the wing (exterior wall centre line)
  return (
    <group>
      {/* ───── Hallway ───── */}
      <Floor x0={HALL.x0} x1={-5.02} z0={HALL.z0} z1={HALL.z1} m={m.oak} />
      <Ceiling x0={HALL.x0 - 0.2} x1={-5.02} z0={HALL.z0 - 0.2} z1={HALL.z1 + 0.2} />
      {/* Linear light strip along the hallway ceiling */}
      <B p={[-6.22, H - 0.01, -4.7]} s={[0.06, 0.02, 17.6]} m={m.warmGlow} cast={false} />
      {/* East wall: behind the living room (with its door), glass on the courtyard, then the kitchen opening */}
      <WallX x={-5.135} t={0.23} z0={-3.6} z1={4.8} h={3.85} m={m.plaster} holes={[{ a: 2.6, b: 4.0, y1: 2.6 }]} />
      <WindowFill c={[-5.135, H / 2, -6.35]} w={5.5} h={H} t={0.23} axis="x" mullion={1.4} />
      <WallX x={-5.135} t={0.23} z0={PAVILION.z0 - 0.2} z1={-9.1} h={H} m={m.plaster} holes={[{ a: DOORS.kitchen[0], b: DOORS.kitchen[1], y1: 2.7 }]} />
      {/* West wall with the room doors */}
      <WallX
        x={-7.3}
        z0={HALL.z0 - 0.2}
        z1={HALL.z1 + 0.2}
        h={H}
        m={m.plaster}
        holes={[
          { a: DOORS.bedroom[0], b: DOORS.bedroom[1], y1: 2.4 },
          { a: DOORS.study[0], b: DOORS.study[1], y1: 2.4 },
          { a: DOORS.lab[0], b: DOORS.lab[1], y1: 2.4 },
          { a: DOORS.gallery[0], b: DOORS.gallery[1], y1: 2.7 },
        ]}
      />
      {/* Hall art between the doors, a bench, a runner */}
      <Framed position={[-7.19, 1.55, 1.0]} rotation={Math.PI / 2} w={0.7} h={0.9} tex={art[0]!} frame="#c8a46a" />
      <Framed position={[-7.19, 1.55, -4.3]} rotation={Math.PI / 2} w={0.8} h={1.0} tex={art[1]!} />
      <Framed position={[-7.19, 1.55, -9.3]} rotation={Math.PI / 2} w={0.7} h={0.9} tex={art[2]!} frame="#c8a46a" />
      <Slab p={[-6.95, 0.22, -4.3]} s={[0.4, 0.06, 1.6]} m={m.walnut} tile={1} />
      {[-4.9, -3.7].map((z) => (
        <B key={z} p={[-6.95, 0.1, z]} s={[0.36, 0.2, 0.05]} m={m.black} />
      ))}
      <B p={[-6.18, 0.004, -4.7]} s={[1.0, 0.008, 16.5]} m={m.linen} cast={false} />
      <Model id="pachira_aquatica_01" pick={0} position={[-6.6, 0, -13.5]} />
      <Model id="calathea_orbifolia_01" pick={0} position={[-5.7, 0, 4.15]} />

      {/* ───── West wing: outer walls and partitions ───── */}
      <WallZ z={4.7} x0={wallX0 - 0.1} x1={-5.02} h={H} m={m.plaster} holes={[{ a: -11.9, b: -9.5, y0: 0.55, y1: 2.65, glass: true }]} />
      <WallZ z={HALL.z0 - 0.1} x0={wallX0 - 0.1} x1={PAVILION.x1 + 0.2} h={H} m={m.plaster} holes={[{ a: -6.6, b: -5.7, y0: 0.3, y1: 2.9, glass: true }, { a: -4.5, b: -1.1, y0: 1.55, y1: 2.35, glass: true }]} />
      <WallX x={wallX0} z0={HALL.z0 - 0.2} z1={4.8} h={H} m={m.plaster} holes={[{ a: LAB.z0 + 0.7, b: LAB.z1 - 0.7, y0: 1.35, y1: 2.6, glass: true }]} />
      <WallZ z={(BEDROOM.z0 + STUDY.z1) / 2} x0={WING.x0} x1={WING.x1} h={H} m={m.plaster} />
      <WallZ z={(STUDY.z0 + LAB.z1) / 2} x0={WING.x0} x1={WING.x1} h={H} m={m.plaster} />
      <WallZ z={(LAB.z0 + GALLERY.z1) / 2} x0={WING.x0} x1={WING.x1} h={H} m={m.plaster} />
      <Ceiling x0={wallX0 - 0.1} x1={WING.x1} z0={HALL.z0 - 0.2} z1={4.8} />

      {/* ───── Pavilion (kitchen, dining, music): glass to the garden ───── */}
      <WindowFill c={[(PAVILION.x0 + MUSIC_DOOR[0]) / 2 + 0.11, H / 2, -9.0]} w={MUSIC_DOOR[0] - PAVILION.x0 - 0.23} h={H} axis="z" mullion={1.55} />
      <WindowFill c={[(MUSIC_DOOR[1] + PAVILION.x1) / 2, H / 2, -9.0]} w={PAVILION.x1 - MUSIC_DOOR[1]} h={H} axis="z" mullion={1.6} />
      {/* The open slider (parked in front of the fixed pane) and its head */}
      <B p={[(MUSIC_DOOR[0] + MUSIC_DOOR[1]) / 2, H - 0.04, -9.0]} s={[MUSIC_DOOR[1] - MUSIC_DOOR[0], 0.08, 0.1]} m={m.black} cast={false} />
      <WindowFill c={[PAVILION.x1 - 0.42, H / 2 - 0.02, -8.9]} w={0.85} h={H - 0.1} t={0.06} axis="z" mullion={2} />
      <WallX x={PAVILION.x1 + 0.1} z0={PAVILION.z0 - 0.2} z1={-8.9} h={H} m={m.plaster} />
      <Ceiling x0={PAVILION.x0} x1={PAVILION.x1 + 0.2} z0={PAVILION.z0 - 0.2} z1={-8.92} />
      {/* A slim black fascia along the pavilion roof */}
      <B p={[(PAVILION.x0 + PAVILION.x1) / 2 + 0.1, H + ROOF / 2, -8.9]} s={[PAVILION.x1 - PAVILION.x0 + 0.2, ROOF + 0.02, 0.04]} m={m.black} cast={false} />

      {/* ───── Living room outer shell (outside faces; the inside is LivingRoom) ───── */}
      <WallZ z={5.635} t={0.23} x0={-5.25} x1={5.25} h={3.85} m={m.plaster} holes={[{ a: -0.95, b: 1.35, y1: 2.7 }]} />
      <WallX x={5.135} t={0.23} z0={-3.75} z1={5.75} h={3.85} m={m.plaster} />
      <Slab p={[0, 3.62 + 0.115, 1.0]} s={[10.5, 0.23, 9.5]} m={m.plaster} tile={3} cast={false} />
      <B p={[0, 3.735, -3.74]} s={[10.5, 0.25, 0.04]} m={m.black} cast={false} />
      {/* Entrance canopy */}
      <B p={[0.2, 2.95, 6.55]} s={[3.6, 0.12, 1.6]} m={m.white} />
      <B p={[0.2, 2.885, 6.55]} s={[1.2, 0.01, 0.1]} m={m.warmGlow} cast={false} />
    </group>
  );
}
