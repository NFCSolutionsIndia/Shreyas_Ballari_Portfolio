import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Shape, Vector3, type Group, type InstancedMesh } from 'three';
import { clearings, GROUND, ROAD } from './path';
import { canopyGeometry, lampHeadGeometry, lampPostGeometry, pineGeometry, useProps } from './Props';
import { pavingTexture, stoneTexture } from './textures';

/**
 * A town inspired by Cumming, Georgia: a lake with docks and sailboats (after Lake Lanier),
 * pine-covered shores with lake houses, a red-brick historic downtown with awnings round the
 * square, a country road through the pines with farmhouses, and a suburban street for the
 * finale. Everything is original, low-poly and built in code.
 */

export const LAKE = { x: 165, zNear: 70, zFar: -190 };
export const BANK_Y = GROUND;

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export interface House {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  ry: number;
  tint: number;
}

/** Houses facing a street that runs along −z at x = cx; `side` −1 is the left side. */
function row(rnd: () => number, cx: number, side: number, from: number, to: number, offset: number, rows = 2, gap = 0.4, hMin = 9, hVar = 9) {
  const out: House[] = [];
  for (let r = 0; r < rows; r++) {
    let z = from;
    while (z > to) {
      const w = 9 + rnd() * 6;
      const d = 9 + rnd() * 4;
      const h = hMin + rnd() * (r === 0 ? hVar : hVar * 1.5);
      out.push({ x: cx + side * (offset + d / 2 + r * 16), z: z - w / 2, w, d, h, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, tint: rnd() });
      z -= w + gap;
    }
  }
  return out;
}

/** Red-brick downtown framing the square (the courthouse stands on the right), the road leaving at the far side. */
export function downtownHouses() {
  const rnd = seeded(23);
  const out: House[] = [
    ...row(rnd, 0, -1, LAKE.zFar - 34, -345, 62, 2, 0.2, 8, 7),
    ...row(rnd, 0, 1, LAKE.zFar - 34, -238, 62, 2, 0.2, 8, 7),
    ...row(rnd, 0, 1, -304, -345, 62, 2, 0.2, 8, 7),
  ];
  for (const side of [-1, 1]) {
    let x = side * 14;
    while (Math.abs(x) < 70) {
      const w = 9 + rnd() * 5;
      out.push({ x: x + side * (w / 2), z: -352, w, d: 10, h: 8 + rnd() * 7, ry: 0, tint: rnd() });
      x += side * (w + 0.2);
    }
  }
  return out;
}

/** Lake houses among the pines on both shores, facing the water. */
export function lakeHouses() {
  const rnd = seeded(11);
  const out: House[] = [];
  for (const side of [-1, 1]) {
    for (let z = 50; z > LAKE.zFar + 20; z -= 24 + rnd() * 10) {
      const off = 14 + rnd() * 18;
      out.push({ x: side * (LAKE.x + off), z, w: 10 + rnd() * 5, d: 9, h: 6 + rnd() * 4, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, tint: rnd() });
    }
  }
  return out;
}

/** A few farmhouses set back from the country road. */
export function farmHouses() {
  const rnd = seeded(37);
  const out: House[] = [];
  const clear = clearings();
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const p = ROAD.getPointAt(t);
    const d = ROAD.getTangentAt(t);
    const side = new Vector3(-d.z, 0, d.x).normalize();
    const s = i % 2 ? 1 : -1;
    const off = 26 + rnd() * 16;
    const x = p.x + side.x * s * off;
    const z = p.z + side.z * s * off;
    if (clear.some((c) => Math.hypot(x - c.at.x, z - c.at.z) < c.r + 10)) continue;
    out.push({ x, z, w: 12 + rnd() * 4, d: 9, h: 6 + rnd() * 3, ry: Math.atan2(d.x, d.z) + (s > 0 ? -Math.PI / 2 : Math.PI / 2), tint: rnd() });
  }
  return out;
}

/** The finale street: suburban homes at dusk, set back behind lawns. */
export function finaleHouses(z: number) {
  const rnd = seeded(51);
  return [...row(rnd, 0, -1, z + 120, z - 10, 20, 1, 9, 6, 4), ...row(rnd, 0, 1, z + 120, z - 10, 20, 1, 9, 6, 4)];
}

export { Houses } from './Buildings';

/** Land round the lake, the shoreline, the downtown paving and the countryside. */
export function Ground() {
  const len = LAKE.zNear - LAKE.zFar;
  const mid = (LAKE.zNear + LAKE.zFar) / 2;
  const stone = useMemo(() => {
    const t = stoneTexture();
    t.repeat.set((LAKE.x * 2) / 8, 1);
    return t;
  }, []);
  const paving = useMemo(() => {
    const t = pavingTexture();
    t.repeat.set(26, 30);
    return t;
  }, []);
  const grass = '#a7a46a';
  const y = GROUND - 0.12;
  const backLen = 1000;
  return (
    <group>
      {/* Countryside behind the lake (downtown, road, statue park). */}
      <mesh position={[0, y, LAKE.zFar - backLen / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1800, backLen]} />
        <meshStandardMaterial color={grass} roughness={1} />
      </mesh>
      {/* Side shores and the near shore. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (LAKE.x + 300), y, mid]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[600, len]} />
          <meshStandardMaterial color={grass} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, y, LAKE.zNear + 150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 300]} />
        <meshStandardMaterial color={grass} roughness={1} />
      </mesh>
      {/* Rocky shoreline and the stone waterfront wall downtown. */}
      {[-1, 1].map((s) => (
        <mesh key={`r${s}`} position={[s * LAKE.x, GROUND / 2 - 0.5, mid]} rotation={[0, 0, s * 0.5]} receiveShadow>
          <boxGeometry args={[6, GROUND + 1.5, len]} />
          <meshStandardMaterial color="#b49a83" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, GROUND / 2 - 0.5, LAKE.zNear]} rotation={[-0.5, 0, 0]} receiveShadow>
        <boxGeometry args={[LAKE.x * 2, GROUND + 1.5, 6]} />
        <meshStandardMaterial color="#c7ab8a" roughness={1} />
      </mesh>
      <mesh position={[0, GROUND / 2 - 0.6, LAKE.zFar]} receiveShadow castShadow>
        <boxGeometry args={[LAKE.x * 2, GROUND + 1.2, 1.2]} />
        <meshStandardMaterial map={stone} roughness={0.9} />
      </mesh>
      {/* Waterfront promenade and the downtown square. */}
      <mesh position={[0, GROUND - 0.06, LAKE.zFar - 12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[LAKE.x * 2, 24]} />
        <meshStandardMaterial map={paving} roughness={0.95} />
      </mesh>
    </group>
  );
}

const SAIL = (() => {
  const s = new Shape();
  s.moveTo(-1.6, -3.6);
  s.lineTo(2.2, -3.6);
  s.lineTo(-1.6, 4.4);
  s.closePath();
  return s;
})();

/** Wooden docks and boats on the lake. */
export function Marina() {
  const boats = useMemo(() => {
    const rnd = seeded(91);
    return Array.from({ length: 16 }, () => ({
      x: -140 + rnd() * 280,
      z: 40 - rnd() * 210,
      ry: rnd() * Math.PI * 2,
      s: 0.8 + rnd() * 0.6,
      sail: rnd() > 0.35,
      hull: ['#f4f1ea', '#e8e2d6', '#c44d3f', '#2f5d8c'][Math.floor(rnd() * 4)]!,
    })).filter((b) => Math.abs(b.x) > 14 || b.z < -60);
  }, []);
  const boatRefs = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    boatRefs.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = 0.9 + Math.sin(t * 1.1 + i) * 0.12;
      g.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.04;
      g.rotation.x = Math.sin(t * 0.7 + i) * 0.03;
    });
  });
  const docks: [number, number, number, number][] = [
    [-15, 46, 46, 0],
    [-90, LAKE.zFar + 22, 40, 0],
    [-60, LAKE.zFar + 22, 40, 0],
    [70, LAKE.zFar + 22, 40, 0],
    [110, LAKE.zFar + 22, 40, 0],
    [-LAKE.x + 18, -60, 30, Math.PI / 2],
    [LAKE.x - 18, -20, 30, Math.PI / 2],
  ];
  return (
    <group>
      {docks.map(([x, z, l, r], i) => (
        <group key={i} position={[x, 1.7, z]} rotation={[0, r, 0]}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[3, 0.35, l]} />
            <meshStandardMaterial color="#9b7656" roughness={0.9} />
          </mesh>
          {Array.from({ length: Math.floor(l / 6) + 1 }, (_, k) =>
            [-1.4, 1.4].map((px) => (
              <mesh key={`${k}${px}`} position={[px, -0.6, -l / 2 + k * 6]}>
                <cylinderGeometry args={[0.18, 0.18, 2.4, 6]} />
                <meshStandardMaterial color="#6e5440" />
              </mesh>
            )),
          )}
        </group>
      ))}
      {boats.map((b, i) => (
        <group key={i} ref={(g) => void (boatRefs.current[i] = g)} position={[b.x, 0.9, b.z]} rotation={[0, b.ry, 0]} scale={b.s}>
          <mesh castShadow>
            <boxGeometry args={[2.4, 1, 7]} />
            <meshStandardMaterial color={b.hull} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 3.6]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[1.7, 1, 1.7]} />
            <meshStandardMaterial color={b.hull} roughness={0.5} />
          </mesh>
          {b.sail ? (
            <>
              <mesh position={[0, 5, 0.5]}>
                <cylinderGeometry args={[0.08, 0.1, 9, 6]} />
                <meshStandardMaterial color="#d9d4cc" />
              </mesh>
              <mesh position={[0, 5, -1.2]} rotation={[0, Math.PI / 2, 0]}>
                <shapeGeometry args={[SAIL]} />
                <meshStandardMaterial color="#fffaf2" side={2} roughness={0.7} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, 0.9, -0.6]}>
              <boxGeometry args={[2, 0.8, 3]} />
              <meshStandardMaterial color="#f4f1ea" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

interface Spot {
  x: number;
  z: number;
  k: number;
}

/** Lamps and leafy trees along the waterfront and square; pine forests on the shores and roadsides. */
export function StreetFurniture() {
  const props = useProps();
  const geo = useMemo(() => ({ post: lampPostGeometry(), head: lampHeadGeometry(), canopy: canopyGeometry(), pine: pineGeometry() }), []);
  const posts = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const pineTrunks = useRef<InstancedMesh>(null);
  const pines = useRef<InstancedMesh>(null);
  const { lamps, trees, pineSpots } = useMemo(() => {
    const rnd = seeded(5);
    const lamps: Spot[] = [];
    const trees: Spot[] = [];
    for (let x = -LAKE.x + 6; x < LAKE.x; x += 14) {
      lamps.push({ x, z: LAKE.zFar - 3, k: 1 });
      if (Math.abs(x) > 60) trees.push({ x: x + 7, z: LAKE.zFar - 18, k: 0.9 + rnd() * 0.4 });
    }
    const pineSpots: Spot[] = [];
    // Shore forests.
    for (let i = 0; i < 520; i++) {
      const s = rnd() > 0.5 ? 1 : -1;
      pineSpots.push({ x: s * (LAKE.x + 6 + rnd() * 160), z: LAKE.zNear + 120 - rnd() * 330, k: 0.8 + rnd() * 0.9 });
    }
    // Beyond the mapped city: woods on the far hills either side.
    for (let i = 0; i < 260; i++) {
      const x = (rnd() > 0.5 ? 1 : -1) * (820 + rnd() * 160);
      pineSpots.push({ x, z: -215 - rnd() * 780, k: 0.9 + rnd() * 0.9 });
    }
    return { lamps, trees, pineSpots };
  }, []);

  useEffect(() => {
    const o = new Object3D();
    lamps.forEach((p, i) => {
      o.position.set(p.x, GROUND + 2.4, p.z);
      o.scale.setScalar(1);
      // Arms reach towards the path or the water.
      o.rotation.set(0, Math.abs(p.z + 196) < 4 ? Math.PI / 2 : p.x < 0 ? 0 : Math.PI, 0);
      o.updateMatrix();
      posts.current?.setMatrixAt(i, o.matrix);
      o.position.set(p.x, GROUND + 5, p.z);
      o.updateMatrix();
      heads.current?.setMatrixAt(i, o.matrix);
    });
    trees.forEach((p, i) => {
      o.position.set(p.x, GROUND + 1.6 * p.k, p.z);
      o.scale.setScalar(p.k);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      trunks.current?.setMatrixAt(i, o.matrix);
      o.position.set(p.x, GROUND + 4.2 * p.k, p.z);
      o.rotation.set(0, i, 0);
      o.updateMatrix();
      crowns.current?.setMatrixAt(i, o.matrix);
    });
    pineSpots.forEach((p, i) => {
      o.rotation.set(0, i * 0.7, 0);
      o.scale.set(p.k, p.k, p.k);
      o.position.set(p.x, GROUND + 1.5 * p.k, p.z);
      o.updateMatrix();
      pineTrunks.current?.setMatrixAt(i, o.matrix);
      o.position.set(p.x, GROUND + 7.5 * p.k, p.z);
      o.updateMatrix();
      pines.current?.setMatrixAt(i, o.matrix);
    });
    [posts, heads, trunks, crowns, pines, pineTrunks].forEach((r) => {
      if (!r.current) return;
      r.current.instanceMatrix.needsUpdate = true;
      r.current.computeBoundingSphere();
    });
  }, [lamps, trees, pineSpots]);

  return (
    <group>
      <instancedMesh ref={posts} args={[geo.post, props.post, lamps.length]} castShadow />
      <instancedMesh ref={heads} args={[geo.head, props.head, lamps.length]} />
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 3.2, 6]} />
        <meshStandardMaterial color="#6a4a3f" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[geo.canopy, props.foliage, trees.length]} castShadow />
      <instancedMesh ref={pineTrunks} args={[undefined, undefined, pineSpots.length]}>
        <cylinderGeometry args={[0.2, 0.32, 3, 5]} />
        <meshStandardMaterial color="#5e4336" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={pines} args={[geo.pine, props.foliage, pineSpots.length]} castShadow />
    </group>
  );
}

/** Wooded ridge on the horizon (after Sawnee Mountain), hazy and out of the fog. */
export function Ridge() {
  const peaks = useMemo(() => {
    const rnd = seeded(17);
    // Peaks either side of the journey's line (x = 0), the tallest on the right.
    return Array.from({ length: 18 }, (_, i) => ({
      x: -1000 + i * 120 + rnd() * 60,
      z: -1000 - rnd() * 260,
      r: 150 + rnd() * 110,
      h: 70 + rnd() * 110 + (i === 11 ? 110 : 0),
    })).filter((p) => Math.abs(p.x) - p.r > 40);
  }, []);
  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, GROUND + p.h / 2 - 4, p.z]} rotation={[0, i, 0]}>
          <coneGeometry args={[p.r, p.h, 8, 1]} />
          <meshBasicMaterial color={i % 2 ? '#b393a6' : '#a88aa2'} fog={false} />
        </mesh>
      ))}
    </group>
  );
}
