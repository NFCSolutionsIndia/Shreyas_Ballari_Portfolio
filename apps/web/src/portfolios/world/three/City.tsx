import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Object3D,
  ShapeUtils,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type InstancedMesh,
} from 'three';
import CITY_DATA from '../data/cumming.json';
import { ARCH_Z, clearings, GROUND, ROAD, SHREYAS_AT, STATUE_AT } from './path';
import { Houses, type House } from './Town';
import { canopyGeometry, lampHeadGeometry, lampPostGeometry, useProps } from './Props';
import { NIGHT } from './timeOfDay';

/**
 * Downtown Cumming, Georgia, from OpenStreetMap (tools/osm/build_cumming.py): every building at
 * its real position, size and orientation, with its real name on the front; the real streets with
 * their lane markings; parking lots and parks; street trees and lamps. Rectangular buildings use
 * the parametric house and shop builder; irregular ones (the courthouse, the jail, churches) are
 * extruded from their exact outline. No homes are named.
 */

export interface CityBuilding {
  k: string;
  h: number;
  p: number[];
  o: number[];
  r: number;
  n?: string;
}
export interface CityRoad {
  c: string;
  w: number;
  p: number[];
  n?: string;
  o?: number;
  d?: number;
}
interface CityArea {
  k: string;
  p: number[];
  n?: string;
}
export const CITY = CITY_DATA as unknown as { meta: { attribution: string }; buildings: CityBuilding[]; roads: CityRoad[]; areas: CityArea[] };

const RIDE_STREETS = ['Tribble Gap Road', 'Veterans Memorial Boulevard'];

// --- Space that must stay open for the story -------------------------------------------------

const ridePts = ROAD.getSpacedPoints(160);
// The ride road continues past the statue in the real city.
const rideDist = (x: number, z: number) => {
  let d = Infinity;
  for (const p of ridePts) d = Math.min(d, Math.hypot(p.x - x, p.z - z));
  return d;
};

interface Zone {
  x: number;
  z: number;
  r: number;
}
let zoneCache: Zone[] | null = null;
function zones(): Zone[] {
  if (zoneCache) return zoneCache;
  zoneCache = [
    { x: 0, z: ARCH_Z, r: 18 },
    { x: -14, z: -272, r: 15 },
    { x: SHREYAS_AT.x, z: SHREYAS_AT.z, r: 14 },
    { x: STATUE_AT.x, z: STATUE_AT.z, r: 46 },
    ...clearings().map((c) => ({ x: c.at.x, z: c.at.z, r: c.r + 4 })),
  ];
  return zoneCache;
}
/** Open ground: the camera's approach corridor, the ride road and the story's clearings. */
export function blocked(x: number, z: number, pad = 0) {
  if (z < -200 && z > -346 && Math.abs(x) < 15 + pad) return true;
  if (z < -330 && z > -880 && rideDist(x, z) < 11 + pad) return true;
  return zones().some((c) => Math.hypot(x - c.x, z - c.z) < c.r + pad);
}

// --- Road lookup grid ------------------------------------------------------------------------

interface RoadSample {
  x: number;
  z: number;
  w: number;
}
const CELL = 40;
function roadGrid() {
  const grid = new Map<string, RoadSample[]>();
  for (const r of CITY.roads) {
    const pts = r.p;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i]!, az = pts[i + 1]!, bx = pts[i + 2]!, bz = pts[i + 3]!;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
        let arr = grid.get(key);
        if (!arr) grid.set(key, (arr = []));
        arr.push({ x, z, w: r.w });
      }
    }
  }
  return {
    nearest(x: number, z: number) {
      let best: RoadSample | null = null;
      let bd = Infinity;
      const cx = Math.floor(x / CELL);
      const cz = Math.floor(z / CELL);
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++)
          for (const s of grid.get(`${cx + i},${cz + j}`) ?? []) {
            const d = Math.hypot(s.x - x, s.z - z);
            if (d < bd) {
              bd = d;
              best = s;
            }
          }
      return best ? { ...best, d: bd } : null;
    },
    /** Is this point on a road surface (with a margin)? */
    onRoad(x: number, z: number, margin = 1) {
      const cx = Math.floor(x / CELL);
      const cz = Math.floor(z / CELL);
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          for (const s of grid.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(s.x - x, s.z - z) < s.w / 2 + margin) return true;
      return false;
    },
  };
}
let roadsCache: ReturnType<typeof roadGrid> | null = null;
export const roads = () => (roadsCache ??= roadGrid());

// --- Buildings: split into parametric boxes and extruded outlines ----------------------------

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

interface Placed {
  b: CityBuilding;
  ring: [number, number][];
  /** Facade the name goes on: centre, outward normal, width. */
  face: { x: number; z: number; nx: number; nz: number; w: number; y: number };
}

function ringOf(b: CityBuilding) {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < b.p.length; i += 2) out.push([b.p[i]!, b.p[i + 1]!]);
  return out;
}

export function layoutCity() {
  const R = roads();
  const houses: Record<'suburb' | 'lake' | 'farm' | 'brick', House[]> = { suburb: [], lake: [], farm: [], brick: [] };
  const blocks: Placed[] = [];
  const named: Placed[] = [];
  for (const b of CITY.buildings) {
    const [cx, cz, w, d, ry] = b.o as [number, number, number, number, number];
    const ring = ringOf(b);
    // Keep the story's open spaces clear (centre and box corners).
    const c = Math.cos(ry), s = Math.sin(ry);
    const corners = [-1, 1].flatMap((i) => [-1, 1].map((j) => [cx + (i * w * c) / 2 + (j * d * s) / 2, cz - (i * w * s) / 2 + (j * d * c) / 2] as const));
    if (blocked(cx, cz, 2) || corners.some(([x, z]) => blocked(x, z))) continue;
    const near = R.nearest(cx, cz);
    const rect = b.r >= 0.84 && w * d < 3200 && ['house', 'commercial', 'apartments'].includes(b.k);
    if (rect) {
      // Choose which side of the box faces the street (house local +z is the front).
      let best = { k: 0, dot: -Infinity };
      for (let k = 0; k < 4; k++) {
        const th = ry + (k * Math.PI) / 2;
        const fx = Math.sin(th), fz = Math.cos(th);
        const dx = near ? near.x - cx : 0, dz = near ? near.z - cz : 1;
        const dot = fx * dx + fz * dz;
        if (dot > best.dot) best = { k, dot };
      }
      const th = ry + (best.k * Math.PI) / 2;
      const swap = best.k % 2 === 1;
      const bw = swap ? d : w;
      const bd = swap ? w : d;
      const tint = hash(cx, cz);
      const house: House = { x: cx, z: cz, w: Math.max(4, bw - 0.3), d: Math.max(4, bd - 0.3), h: b.h, ry: th, tint };
      const style = b.k === 'house' ? (['suburb', 'lake', 'farm'] as const)[Math.floor(tint * 2.999)]! : 'brick';
      houses[style].push(house);
      if (b.n) {
        const fx = Math.sin(th), fz = Math.cos(th);
        named.push({ b, ring, face: { x: cx + fx * (house.d / 2 + 0.24), z: cz + fz * (house.d / 2 + 0.24), nx: fx, nz: fz, w: house.w * 0.56, y: style === 'brick' ? 3.25 : Math.min(b.h - 1, 4) } });
      }
    } else {
      // The facade nearest the street carries the name.
      let face = { x: cx, z: cz, nx: 0, nz: 1, w: 6, y: 4 };
      let bestD = Infinity;
      const area = ring.reduce((a, [x1, z1], i) => {
        const [x2, z2] = ring[(i + 1) % ring.length]!;
        return a + x1 * z2 - x2 * z1;
      }, 0);
      ring.forEach(([x1, z1], i) => {
        const [x2, z2] = ring[(i + 1) % ring.length]!;
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 5) return;
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
        let nx = (z2 - z1) / len, nz = -(x2 - x1) / len;
        if (area < 0) {
          nx = -nx;
          nz = -nz;
        }
        const r = R.nearest(mx + nx * 3, mz + nz * 3);
        const dd = (r?.d ?? 99) - len * 0.15;
        if (dd < bestD) {
          bestD = dd;
          face = { x: mx + nx * 0.2, z: mz + nz * 0.2, nx, nz, w: Math.min(len * 0.7, 18), y: Math.max(3, Math.min(b.h * 0.62, b.h - 1.4)) };
        }
      });
      const p = { b, ring, face };
      blocks.push(p);
      if (b.n) named.push(p);
    }
  }
  return { houses, blocks, named };
}

// --- Extruded outlines with a window shader --------------------------------------------------

/** Wall colours per kind; a leading '*' marks a brick wall (the shader draws the coursing). */
const KIND_LOOK: Record<string, { wall: string[]; trim: string; mode: number }> = {
  civic: { wall: ['*#c98b6c', '#e3d5bd', '*#b87a5e'], trim: '#f7f1e6', mode: 1 },
  church: { wall: ['*#b5634c', '*#a65a46'], trim: '#f4ede2', mode: 1 },
  parking: { wall: ['#cfc6bb', '#c4bbb0'], trim: '#e2ddd6', mode: 2 },
  school: { wall: ['*#b8735a', '*#c58468'], trim: '#efe6d8', mode: 1 },
  industrial: { wall: ['#c9c4bd', '#bdb7b0'], trim: '#e1ddd8', mode: 0 },
  commercial: { wall: ['*#b5654c', '#dcc4a4', '*#a65a46', '#e6d3bb', '*#c27a5c', '#cdb091'], trim: '#fbf6ee', mode: 3 },
  house: { wall: ['#efe7da', '#d8dcec'], trim: '#ffffff', mode: 1 },
  apartments: { wall: ['*#c08a6c', '#e4d3c2'], trim: '#ffffff', mode: 1 },
};

function blockGeometry(list: Placed[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const info: number[] = [];
  const c = new Color();
  for (const { b, ring } of list) {
    const look = KIND_LOOK[b.k] ?? KIND_LOOK.commercial!;
    const seed = hash(ring[0]![0], ring[0]![1]);
    const wallSpec = look.wall[Math.floor(seed * look.wall.length) % look.wall.length]!;
    const brick = wallSpec.startsWith('*') ? 1 : 0;
    c.set(wallSpec.replace('*', ''));
    const top = b.h;
    const par = b.h + 0.9;
    let area = 0;
    ring.forEach(([x1, z1], i) => {
      const [x2, z2] = ring[(i + 1) % ring.length]!;
      area += x1 * z2 - x2 * z1;
    });
    const sgn = area > 0 ? 1 : -1;
    let u = 0;
    const vert = (x: number, y: number, z: number, nx: number, ny: number, nz: number, uu: number, vv: number) => {
      pos.push(x, GROUND + y, z);
      nor.push(nx, ny, nz);
      uv.push(uu, vv);
      col.push(c.r, c.g, c.b);
      info.push(look.mode, top, seed, brick);
    };
    ring.forEach(([x1, z1], i) => {
      const [x2, z2] = ring[(i + 1) % ring.length]!;
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.01) return;
      const nx = (sgn * (z2 - z1)) / len;
      const nz = (sgn * -(x2 - x1)) / len;
      // Outward-facing winding.
      const a0 = [x1, 0, z1, u, 0] as const;
      const b0 = [x2, 0, z2, u + len, 0] as const;
      const b1 = [x2, par, z2, u + len, par] as const;
      const a1 = [x1, par, z1, u, par] as const;
      const quad = sgn > 0 ? [a0, b1, b0, a0, a1, b1] : [a0, b0, b1, a0, b1, a1];
      for (const q of quad) vert(q[0], q[1], q[2], nx, 0, nz, q[3], q[4]);
      u += len;
    });
    // Roof (flat, inside the parapet).
    const contour = ring.map(([x, z]) => new Vector2(x, z));
    const tris = ShapeUtils.triangulateShape(contour, []);
    for (const [i, j, k] of tris) {
      const A = ring[i!]!, B = ring[j!]!, C = ring[k!]!;
      const ny = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]);
      const order = ny > 0 ? [A, B, C] : [A, C, B];
      for (const [x, z] of order) {
        pos.push(x, GROUND + top, z);
        nor.push(0, 1, 0);
        uv.push(x, z);
        col.push(0.5, 0.49, 0.5);
        info.push(-1, top, seed, 0);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('aInfo', new Float32BufferAttribute(info, 4));
  g.computeBoundingSphere();
  return g;
}

function blockMaterial(night: { value: number }) {
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = night;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aInfo;\nvarying vec4 vInfo;\nvarying vec2 vFacade;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvInfo = aInfo;\nvFacade = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying vec4 vInfo;\nvarying vec2 vFacade;\nfloat bHash(vec2 p){return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);}')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float glow = 0.0;
        if (vInfo.x > -0.5) {
          float u = vFacade.x;
          float v = vFacade.y;
          float top = vInfo.y;
          if (vInfo.w > 0.5) {
            // Brick coursing in running bond, with slightly varied bricks.
            float row = floor(v / 0.26);
            float bu = u / 0.62 + mod(row, 2.0) * 0.5;
            float mortar = max(step(fract(v / 0.26), 0.12), step(fract(bu), 0.06));
            float tone = 0.9 + bHash(vec2(floor(bu), row)) * 0.18;
            diffuseColor.rgb = mix(diffuseColor.rgb * tone, vec3(0.86, 0.82, 0.76), mortar * 0.8);
          }
          // Plinth, cornice band and parapet cap.
          if (v < 0.45) diffuseColor.rgb *= 0.72;
          if (v > top - 0.25) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.95, 0.91), 0.75);
          if (v > top + 0.7) diffuseColor.rgb *= 0.85;
          float mode = vInfo.x;
          vec2 cell = vec2(floor(u / 3.3), floor((v - 0.9) / 3.7));
          float cx = fract(u / 3.3);
          float cy = fract((v - 0.9) / 3.7);
          float win = 0.0;
          if (mode > 0.5 && mode < 1.5) win = step(0.24, cx) * step(cx, 0.76) * step(0.22, cy) * step(cy, 0.82) * step(1.0, v) * step(v, top - 0.9);
          if (mode > 1.5 && mode < 2.5) {
            // Parking deck: long open bands between the floor slabs.
            float fy = fract(v / 3.2);
            win = step(0.38, fy) * step(fy, 0.88) * step(1.0, v) * step(v, top - 0.4) * step(0.04, fract(u / 9.0));
          }
          if (mode > 2.5) {
            // Shops: tall storefront glass at street level, windows above.
            float shop = step(0.35, v) * step(v, 3.3) * step(0.08, fract(u / 4.2)) * step(fract(u / 4.2), 0.92);
            float up = step(0.26, cx) * step(cx, 0.74) * step(0.25, cy) * step(cy, 0.8) * step(4.6, v) * step(v, top - 0.9);
            win = max(shop, up);
          }
          if (win > 0.5) {
            float lit = step(0.42, bHash(cell + vInfo.z * 17.0));
            vec3 glass = mix(vec3(0.20, 0.25, 0.34), vec3(0.42, 0.52, 0.62), smoothstep(0.0, 1.0, cy));
            diffuseColor.rgb = glass;
            glow = lit;
          }
        }`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glow * uNight * vec3(1.0, 0.72, 0.42) * 1.25;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (glow > -0.5 && vInfo.x > -0.5 && diffuseColor.b > diffuseColor.r + 0.05) roughnessFactor = 0.2;');
  };
  return m;
}

function Blocks({ list }: { list: Placed[] }) {
  const geo = useMemo(() => blockGeometry(list), [list]);
  const night = useRef({ value: 0 });
  const mat = useMemo(() => blockMaterial(night.current), []);
  useFrame(() => void (night.current.value = NIGHT.value));
  // Church steeples.
  const steeples = useMemo(
    () =>
      list
        .filter((p) => p.b.k === 'church')
        .map((p) => {
          const [cx, cz, w, , ry] = p.b.o as [number, number, number, number, number];
          const ex = Math.cos(ry) * (w / 2 - 3), ez = -Math.sin(ry) * (w / 2 - 3);
          return { x: cx + ex, z: cz + ez, h: p.b.h };
        }),
    [list],
  );
  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {steeples.map((s, i) => (
        <group key={i} position={[s.x, GROUND, s.z]}>
          <mesh position={[0, s.h + 3, 0]} castShadow>
            <boxGeometry args={[3.6, 6, 3.6]} />
            <meshStandardMaterial color="#f4ede2" roughness={0.8} />
          </mesh>
          <mesh position={[0, s.h + 10, 0]} castShadow>
            <coneGeometry args={[2.3, 8.5, 4]} />
            <meshStandardMaterial color="#f4ede2" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Streets ---------------------------------------------------------------------------------

/** One ribbon per street with uv = (distance along, side −1..1) and the street's width/marking info. */
function streetGeometry(list: CityRoad[], extra: number, y: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const info: number[] = [];
  const idx: number[] = [];
  for (const r of list) {
    const pts: [number, number][] = [];
    for (let i = 0; i + 1 < r.p.length; i += 2) pts.push([r.p[i]!, r.p[i + 1]!]);
    if (pts.length < 2) continue;
    const half = r.w / 2 + extra;
    const major = ['primary', 'secondary', 'tertiary', 'trunk', 'motorway'].includes(r.c) ? 1 : 0;
    const total = pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) : 0), 0);
    let u = 0;
    const base = pos.length / 3;
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const L = Math.hypot(dx, dz) || 1;
      const sx = -dz / L, sz = dx / L;
      if (i) u += Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]);
      pos.push(p[0] + sx * half, GROUND + y, p[1] + sz * half, p[0] - sx * half, GROUND + y, p[1] - sz * half);
      uv.push(u, 1, u, -1);
      const two = r.o ? 0 : 1;
      info.push(half, two, major, total, half, two, major, total);
      if (i < pts.length - 1) {
        const k = base + i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    });
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('aRoad', new Float32BufferAttribute(info, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function asphaltMaterial() {
  const m = new MeshStandardMaterial({ color: '#77686f', roughness: 0.93, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRoad;\nvarying vec4 vRoad;\nvarying vec2 vRUv;\nvarying vec3 vRW;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoad = aRoad;\nvRUv = uv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vRoad;\nvarying vec2 vRUv;\nvarying vec3 vRW;\nfloat rHash(vec2 p){return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743);}')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float hw = vRoad.x;
        float x = vRUv.y * hw;
        float u = vRUv.x;
        // Asphalt grain and tyre tracks.
        float n = rHash(floor(vRW.xz * 3.0));
        diffuseColor.rgb *= 0.93 + n * 0.1;
        diffuseColor.rgb *= 1.0 - 0.06 * smoothstep(0.6, 0.0, abs(abs(x) - hw * 0.5));
        // Markings fade out near the ends of each street (they meet at junctions).
        float ends = smoothstep(6.0, 12.0, u) * smoothstep(6.0, 12.0, vRoad.w - u);
        float edge = step(hw - 0.75, abs(x)) * step(abs(x), hw - 0.5) * step(7.0, hw * 2.0);
        float centre = vRoad.y * vRoad.z * step(0.1, abs(x)) * step(abs(x), 0.3);
        float lanes = floor(hw * 2.0 / 4.2);
        float dashOn = step(0.55, fract(u / 10.0));
        float laneLine = 0.0;
        if (lanes >= 3.0) {
          float lw = hw / (lanes * 0.5);
          float k = abs(x) / lw;
          laneLine = step(abs(fract(k + 0.5) - 0.5) * lw, 0.09) * dashOn * step(0.5, abs(x)) * step(abs(x), hw - 1.0);
        } else if (vRoad.y < 0.5 && hw > 4.0) {
          laneLine = step(abs(x), 0.09) * dashOn;
        }
        vec3 white = vec3(0.93, 0.91, 0.88);
        vec3 yellow = vec3(0.95, 0.76, 0.3);
        diffuseColor.rgb = mix(diffuseColor.rgb, white, edge * ends * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, white, laneLine * ends * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, yellow, centre * ends);`,
      );
  };
  return m;
}

function Streets() {
  const list = useMemo(() => {
    // Streets crossing the story's clearings are cut there; the ride street is drawn by <Road>.
    const out: CityRoad[] = [];
    for (const r of CITY.roads) {
      let run: number[] = [];
      const flush = () => {
        if (run.length >= 4) out.push({ ...r, p: run });
        run = [];
      };
      for (let i = 0; i + 1 < r.p.length; i += 2) {
        const x = r.p[i]!, z = r.p[i + 1]!;
        const inZone = zones().some((c) => c.r < 40 && c !== zones()[2] && Math.hypot(x - c.x, z - c.z) < c.r - 6) || Math.hypot(x - STATUE_AT.x, z - STATUE_AT.z) < 30;
        if (inZone) flush();
        else run.push(x, z);
      }
      flush();
    }
    return out;
  }, []);
  const walks = useMemo(() => streetGeometry(list.filter((r) => r.d && r.c !== 'service'), 2.6, 0.03), [list]);
  const asphalt = useMemo(() => streetGeometry(list, 0, 0.055), [list]);
  const mat = useMemo(asphaltMaterial, []);
  return (
    <group>
      <mesh geometry={walks} receiveShadow>
        <meshStandardMaterial color="#d8cbc2" roughness={0.95} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={asphalt} material={mat} receiveShadow />
    </group>
  );
}

// --- Lots, parks ---------------------------------------------------------------------------

function areaGeometry(kind: string) {
  const pos: number[] = [];
  for (const a of CITY.areas) {
    if (a.k !== kind) continue;
    const ring: [number, number][] = [];
    for (let i = 0; i + 1 < a.p.length; i += 2) ring.push([a.p[i]!, a.p[i + 1]!]);
    if (ring.length < 3) continue;
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    if (blocked(cx, cz, -6)) continue;
    const tris = ShapeUtils.triangulateShape(
      ring.map(([x, z]) => new Vector2(x, z)),
      [],
    );
    for (const [i, j, k] of tris) {
      const A = ring[i!]!, B = ring[j!]!, C = ring[k!]!;
      const ny = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]);
      for (const [x, z] of ny > 0 ? [A, B, C] : [A, C, B]) pos.push(x, GROUND + 0.02, z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function Areas() {
  const lots = useMemo(() => areaGeometry('lot'), []);
  const green = useMemo(() => areaGeometry('green'), []);
  const water = useMemo(() => areaGeometry('water'), []);
  return (
    <group>
      <mesh geometry={lots} receiveShadow>
        <meshStandardMaterial color="#8b7d83" roughness={0.95} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={green} receiveShadow>
        <meshStandardMaterial color="#93a464" roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={water}>
        <meshStandardMaterial color="#6f93a8" roughness={0.2} metalness={0.1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    </group>
  );
}

// --- Name signs ------------------------------------------------------------------------------

const SIGN_COLORS = [
  ['#1f3b2f', '#f3e6c4'],
  ['#2f3e5c', '#ffffff'],
  ['#f6efe2', '#3a2e2a'],
  ['#7a2f2f', '#fff3e0'],
  ['#20242c', '#e8c77a'],
];

function signTexture(text: string, bg: string, fg: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 128);
  g.strokeStyle = fg;
  g.globalAlpha = 0.5;
  g.lineWidth = 4;
  g.strokeRect(10, 10, 1004, 108);
  g.globalAlpha = 1;
  g.fillStyle = fg;
  let size = 72;
  g.font = `600 ${size}px Manrope, system-ui, sans-serif`;
  while (g.measureText(text).width > 960 && size > 28) {
    size -= 4;
    g.font = `600 ${size}px Manrope, system-ui, sans-serif`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 68);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return { t };
}

function NameSigns({ list }: { list: Placed[] }) {
  const signs = useMemo(
    () =>
      list.map((p, i) => {
        const [bg, fg] = p.b.k === 'civic' ? ['#22392f', '#f1dfae'] : SIGN_COLORS[i % SIGN_COLORS.length]!;
        const { t } = signTexture(p.b.n!, bg!, fg!);
        const w = Math.min(p.face.w, 8);
        return { ...p.face, w, h: Math.max(w / 8, 0.5), tex: t, ry: Math.atan2(p.face.nx, p.face.nz) };
      }),
    [list],
  );
  return (
    <group>
      {signs.map((s, i) => (
        <mesh key={i} position={[s.x, GROUND + s.y, s.z]} rotation={[0, s.ry, 0]}>
          <planeGeometry args={[s.w, s.h]} />
          <meshStandardMaterial map={s.tex} roughness={0.6} emissive="#ffffff" emissiveMap={s.tex} emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

// --- Street name blades on the corners along the journey -------------------------------------

function bladeTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d6b45';
  g.beginPath();
  g.roundRect(0, 0, 512, 96, 12);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(6, 6, 500, 84, 9);
  g.stroke();
  g.fillStyle = '#ffffff';
  let size = 54;
  const short = text.replace(/ Street$/, ' St').replace(/ Road$/, ' Rd').replace(/ Boulevard$/, ' Blvd').replace(/ Highway$/, ' Hwy').replace(/ Avenue$/, ' Ave').replace(/ Drive$/, ' Dr');
  g.font = `700 ${size}px Manrope, system-ui, sans-serif`;
  while (g.measureText(short).width > 470 && size > 24) {
    size -= 3;
    g.font = `700 ${size}px Manrope, system-ui, sans-serif`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(short, 256, 52);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function StreetBlades() {
  const blades = useMemo(() => {
    const path = [new Vector3(0, 0, -205), new Vector3(0, 0, -340), ...ridePts];
    const seen = new Set<string>();
    const out: { x: number; z: number; ry: number; tex: CanvasTexture }[] = [];
    for (const r of CITY.roads) {
      if (!r.n || seen.has(r.n) || RIDE_STREETS.includes(r.n) || r.c === 'service') continue;
      let best = { d: Infinity, i: 0, qx: 0, qz: 0 };
      for (let i = 0; i + 1 < r.p.length; i += 2) {
        const x = r.p[i]!, z = r.p[i + 1]!;
        for (const q of path) {
          const d = Math.hypot(q.x - x, q.z - z);
          if (d < best.d) best = { d, i, qx: q.x, qz: q.z };
        }
      }
      if (best.d > 26) continue;
      seen.add(r.n);
      const x = r.p[best.i]!, z = r.p[best.i + 1]!;
      const j = best.i + 2 < r.p.length ? best.i + 2 : best.i - 2;
      const dx = r.p[j]! - x, dz = r.p[j + 1]! - z;
      const L = Math.hypot(dx, dz) || 1;
      // On the corner, beside the street, the blade running along it.
      const off = r.w / 2 + 2.2;
      let sx = x + (-dz / L) * off, sz = z + (dx / L) * off;
      if (rideDist(sx, sz) < 9) {
        sx = x - (-dz / L) * off;
        sz = z - (dx / L) * off;
      }
      // Step back along the street, away from the journey's road.
      const away = (dx * (x - best.qx) + dz * (z - best.qz)) >= 0 ? 1 : -1;
      out.push({ x: sx + (dx / L) * 7 * away, z: sz + (dz / L) * 7 * away, ry: Math.atan2(dx, dz) + Math.PI / 2, tex: bladeTexture(r.n) });
    }
    return out;
  }, []);
  return (
    <group>
      {blades.map((b, i) => (
        <group key={i} position={[b.x, GROUND, b.z]} rotation={[0, b.ry, 0]}>
          <mesh position={[0, 2.4, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 4.8, 8]} />
            <meshStandardMaterial color="#8a8f96" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 4.6, 0]}>
            <boxGeometry args={[2.6, 0.5, 0.04]} />
            <meshStandardMaterial color="#1d6b45" roughness={0.5} />
          </mesh>
          {[0.025, -0.025].map((z, k) => (
            <mesh key={k} position={[0, 4.6, z]} rotation={[0, k ? Math.PI : 0, 0]}>
              <planeGeometry args={[2.6, 0.5]} />
              <meshStandardMaterial map={b.tex} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// --- Street trees and lamps ------------------------------------------------------------------

function inBuilding(x: number, z: number, list: CityBuilding[], pad: number) {
  for (const b of list) {
    const [cx, cz, w, d, ry] = b.o as [number, number, number, number, number];
    const dx = x - cx, dz = z - cz;
    if (Math.abs(dx) > w + d || Math.abs(dz) > w + d) continue;
    const c = Math.cos(ry), s = Math.sin(ry);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) < w / 2 + pad && Math.abs(lz) < d / 2 + pad) return true;
  }
  return false;
}

function Greenery() {
  const props = useProps();
  const geo = useMemo(() => ({ canopy: canopyGeometry(), post: lampPostGeometry(), head: lampHeadGeometry() }), []);
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const posts = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const { trees, lamps } = useMemo(() => {
    const R = roads();
    const trees: { x: number; z: number; k: number }[] = [];
    const lamps: { x: number; z: number; ry: number }[] = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const r of CITY.roads) {
      if (r.c === 'service' || r.c === 'pedestrian' || r.c.endsWith('_link')) continue;
      const major = ['primary', 'secondary', 'tertiary'].includes(r.c);
      let acc = 0;
      for (let i = 0; i + 3 < r.p.length; i += 2) {
        const ax = r.p[i]!, az = r.p[i + 1]!, bx = r.p[i + 2]!, bz = r.p[i + 3]!;
        const L = Math.hypot(bx - ax, bz - az);
        const sx = -(bz - az) / L, sz = (bx - ax) / L;
        for (let t = acc; t < L; t += major ? 13 : 17) {
          const px = ax + ((bx - ax) * t) / L, pz = az + ((bz - az) * t) / L;
          for (const side of [-1, 1]) {
            const off = r.w / 2 + (major ? 3.4 : 4.5) + rnd() * 1.5;
            const x = px + sx * side * off, z = pz + sz * side * off;
            if (blocked(x, z, 1) || R.onRoad(x, z, 0.8) || inBuilding(x, z, CITY.buildings, 2)) continue;
            trees.push({ x, z, k: 0.85 + rnd() * 0.45 });
          }
          if (major && Math.round(t / 13) % 2 === 0) {
            const side = Math.round(t / 26) % 2 ? 1 : -1;
            const x = px + sx * side * (r.w / 2 + 1.4), z = pz + sz * side * (r.w / 2 + 1.4);
            if (!blocked(x, z, 0) && !inBuilding(x, z, CITY.buildings, 0.5)) lamps.push({ x, z, ry: Math.atan2(-sx * side, -sz * side) - Math.PI / 2 });
          }
        }
        acc = 0;
      }
    }
    // Park trees.
    for (const a of CITY.areas) {
      if (a.k !== 'green') continue;
      const xs = a.p.filter((_, i) => i % 2 === 0), zs = a.p.filter((_, i) => i % 2 === 1);
      const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
      const n = Math.min(14, Math.floor(((x1 - x0) * (z1 - z0)) / 500));
      for (let i = 0; i < n; i++) {
        const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (!pointInRing(x, z, a.p) || blocked(x, z, 1) || R.onRoad(x, z, 1) || inBuilding(x, z, CITY.buildings, 2)) continue;
        trees.push({ x, z, k: 0.9 + rnd() * 0.6 });
      }
    }
    return { trees: trees.slice(0, 1400), lamps: lamps.slice(0, 260) };
  }, []);

  useEffect(() => {
    const o = new Object3D();
    trees.forEach((p, i) => {
      o.position.set(p.x, GROUND + 1.6 * p.k, p.z);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(p.k);
      o.updateMatrix();
      trunks.current?.setMatrixAt(i, o.matrix);
      o.position.set(p.x, GROUND + 4.2 * p.k, p.z);
      o.rotation.set(0, i * 1.3, 0);
      o.updateMatrix();
      crowns.current?.setMatrixAt(i, o.matrix);
    });
    lamps.forEach((p, i) => {
      o.scale.setScalar(1);
      o.rotation.set(0, p.ry, 0);
      o.position.set(p.x, GROUND + 2.4, p.z);
      o.updateMatrix();
      posts.current?.setMatrixAt(i, o.matrix);
      o.position.set(p.x, GROUND + 5, p.z);
      o.updateMatrix();
      heads.current?.setMatrixAt(i, o.matrix);
    });
    [trunks, crowns, posts, heads].forEach((r) => {
      if (!r.current) return;
      r.current.instanceMatrix.needsUpdate = true;
      r.current.computeBoundingSphere();
    });
  }, [trees, lamps]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 3.2, 6]} />
        <meshStandardMaterial color="#6a4a3f" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[geo.canopy, props.foliage, trees.length]} castShadow />
      <instancedMesh ref={posts} args={[geo.post, props.post, lamps.length]} castShadow />
      <instancedMesh ref={heads} args={[geo.head, props.head, lamps.length]} />
    </group>
  );
}

function pointInRing(x: number, z: number, p: number[]) {
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i]!, zi = p[i + 1]!, xj = p[j]!, zj = p[j + 1]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Sidewalk strolls for townspeople: straight stretches beside the streets near the square. */
export function sidewalkWalkers(max = 14): [Vector3, Vector3][] {
  const out: [Vector3, Vector3][] = [];
  const R = roads();
  const near = (x: number, z: number) => Math.hypot(x - 0, z + 300) < 240 || (z < -330 && z > -700 && rideDist(x, z) < 60);
  for (const r of CITY.roads) {
    if (!r.n || r.c === 'service' || !r.d) continue;
    for (let i = 0; i + 3 < r.p.length && out.length < max; i += 2) {
      const ax = r.p[i]!, az = r.p[i + 1]!, bx = r.p[i + 2]!, bz = r.p[i + 3]!;
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 22 || !near((ax + bx) / 2, (az + bz) / 2)) continue;
      const sx = -(bz - az) / L, sz = (bx - ax) / L;
      const side = out.length % 2 ? 1 : -1;
      const off = r.w / 2 + 1.4;
      const k0 = 0.15, k1 = Math.min(0.85, k0 + 45 / L);
      const a = new Vector3(ax + (bx - ax) * k0 + sx * side * off, GROUND, az + (bz - az) * k0 + sz * side * off);
      const b = new Vector3(ax + (bx - ax) * k1 + sx * side * off, GROUND, az + (bz - az) * k1 + sz * side * off);
      const ok = [0, 0.25, 0.5, 0.75, 1].every((t) => {
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        return !inBuilding(x, z, CITY.buildings, 0.8) && !R.onRoad(x, z, 0.2) && Math.hypot(x - SHREYAS_AT.x, z - SHREYAS_AT.z) > 6;
      });
      if (ok) out.push([a, b]);
    }
  }
  return out;
}

/** The whole city. */
export function City() {
  const { houses, blocks, named } = useMemo(layoutCity, []);
  return (
    <group>
      <Areas />
      <Streets />
      <Houses list={houses.brick} style="brick" />
      <Houses list={houses.suburb} style="suburb" />
      <Houses list={houses.lake} style="lake" />
      <Houses list={houses.farm} style="farm" />
      <Blocks list={blocks} />
      <NameSigns list={named} />
      <StreetBlades />
      <Greenery />
    </group>
  );
}
