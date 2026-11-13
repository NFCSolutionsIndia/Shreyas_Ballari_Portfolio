import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTexture } from '@react-three/drei';
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Material,
  type Texture,
} from 'three';

/**
 * Building kit for the house: shared materials (Poly Haven CC0 PBR sets with UVs in real-world
 * metres, so a texture tiles the same on every wall), boxes, walls with openings, glass, soft
 * contact shadows and small canvas textures. Everything here is created once and reused.
 */

const T = `${import.meta.env.BASE_URL}assets/house/textures`;
const SETS = ['white_plaster_02', 'wood_floor', 'smooth_concrete_floor', 'marble_01', 'stacked_stone_wall', 'leafy_grass'] as const;
type SetName = (typeof SETS)[number];
const urls = SETS.flatMap((n) => [`${T}/${n}/diff.jpg`, `${T}/${n}/nor.jpg`, `${T}/${n}/rough.jpg`]);

interface PbrSet {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

/** Clones (sharing the image, so uploaded once) with repeat 1: our geometry carries metre UVs. */
function useSets(): Record<SetName, PbrSet> {
  const tex = useTexture(urls) as Texture[];
  return useMemo(() => {
    const out = {} as Record<SetName, PbrSet>;
    SETS.forEach((n, i) => {
      const [m, nm, r] = [0, 1, 2].map((k) => {
        const c = tex[i * 3 + k]!.clone();
        c.wrapS = c.wrapT = RepeatWrapping;
        c.repeat.set(1, 1);
        c.offset.set(0, 0);
        c.anisotropy = 8;
        c.needsUpdate = true;
        return c;
      }) as [Texture, Texture, Texture];
      m.colorSpace = SRGBColorSpace;
      out[n] = { map: m, normalMap: nm, roughnessMap: r };
    });
    return out;
  }, [tex]);
}

export interface Mats {
  plaster: MeshStandardMaterial;
  warmPlaster: MeshStandardMaterial;
  charcoal: MeshStandardMaterial;
  sage: MeshStandardMaterial;
  oak: MeshStandardMaterial;
  oakDark: MeshStandardMaterial;
  walnut: MeshStandardMaterial;
  concrete: MeshStandardMaterial;
  concreteWarm: MeshStandardMaterial;
  marble: MeshStandardMaterial;
  quartz: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  grass: MeshStandardMaterial;
  hedge: MeshStandardMaterial;
  pavers: MeshStandardMaterial;
  white: MeshStandardMaterial;
  offWhite: MeshStandardMaterial;
  black: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  brass: MeshStandardMaterial;
  gold: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  fabric: MeshStandardMaterial;
  linen: MeshStandardMaterial;
  felt: MeshStandardMaterial;
  teak: MeshStandardMaterial;
  screenOff: MeshStandardMaterial;
  warmGlow: MeshStandardMaterial;
  coolGlow: MeshStandardMaterial;
  shade: MeshStandardMaterial;
}

const Ctx = createContext<Mats | null>(null);

export function MatsProvider({ children }: { children: ReactNode }) {
  const s = useSets();
  const mats = useMemo<Mats>(() => {
    const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial(p);
    return {
      plaster: std({ normalMap: s.white_plaster_02.normalMap, roughnessMap: s.white_plaster_02.roughnessMap, color: '#efebe5', roughness: 0.95, emissive: new Color('#f6f1ea'), emissiveIntensity: 0.04, normalScale: new Vector2(0.35, 0.35) }),
      warmPlaster: std({ normalMap: s.white_plaster_02.normalMap, color: '#ece2d5', roughness: 0.95, normalScale: new Vector2(0.35, 0.35) }),
      quartz: std({ color: '#f1efeb', roughness: 0.22 }),
      charcoal: std({ normalMap: s.white_plaster_02.normalMap, color: '#4d4a46', roughness: 0.9, normalScale: new Vector2(0.4, 0.4) }),
      sage: std({ ...s.white_plaster_02, color: '#c9cfbf', roughness: 0.95 }),
      oak: std({ ...s.wood_floor, color: '#ffffff', roughness: 0.75 }),
      oakDark: std({ ...s.wood_floor, color: '#8d7766', roughness: 0.6 }),
      walnut: std({ ...s.wood_floor, color: '#7a5238', roughness: 0.55 }),
      concrete: std({ ...s.smooth_concrete_floor, color: '#e4e2de', roughness: 0.55 }),
      concreteWarm: std({ ...s.smooth_concrete_floor, color: '#cbc3b8', roughness: 0.7 }),
      marble: std({ ...s.marble_01, color: '#ffffff', roughness: 0.28 }),
      stone: std({ ...s.stacked_stone_wall, color: '#d8d2c8', roughness: 0.9 }),
      grass: std({ ...s.leafy_grass, color: '#c4cf9e', roughness: 0.95 }),
      hedge: std({ ...s.leafy_grass, color: '#6f8a4a', roughness: 0.95 }),
      pavers: std({ ...s.smooth_concrete_floor, color: '#b9b4ab', roughness: 0.85 }),
      white: std({ color: '#f4f3f0', roughness: 0.35 }),
      offWhite: std({ color: '#e8e4dc', roughness: 0.6 }),
      black: std({ color: '#151517', metalness: 0.6, roughness: 0.42 }),
      steel: std({ color: '#c9ccd0', metalness: 1, roughness: 0.32 }),
      brass: std({ color: '#c49a5a', metalness: 1, roughness: 0.3 }),
      gold: std({ color: '#e0b04f', metalness: 1, roughness: 0.18 }),
      glass: new MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, roughness: 0.04, metalness: 0, envMapIntensity: 1.2, depthWrite: false }),
      fabric: std({ color: '#8c8478', roughness: 1 }),
      linen: std({ color: '#efe9df', roughness: 1 }),
      felt: std({ color: '#3d3c3b', roughness: 1 }),
      teak: std({ ...s.wood_floor, color: '#a07a55', roughness: 0.7 }),
      screenOff: std({ color: '#0b0c0f', metalness: 0.2, roughness: 0.15 }),
      warmGlow: std({ color: '#000000', emissive: new Color('#ffd9a8'), emissiveIntensity: 2.2 }),
      coolGlow: std({ color: '#000000', emissive: new Color('#eef4ff'), emissiveIntensity: 2.4 }),
      shade: std({ color: '#f3e7d3', emissive: new Color('#ffcf94'), emissiveIntensity: 0.9, roughness: 1, side: DoubleSide }),
    };
  }, [s]);
  return <Ctx.Provider value={mats}>{children}</Ctx.Provider>;
}

export function useMats(): Mats {
  const m = useContext(Ctx);
  if (!m) throw new Error('useMats outside MatsProvider');
  return m;
}

/* ───────────────────────── geometry ───────────────────────── */

export const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UNIT_PLANE = new PlaneGeometry(1, 1);

/** A box whose UVs are world metres / tile (so textures keep their real size on every face). */
export function worldBox(w: number, h: number, d: number, tile: number, ox = 0, oy = 0, oz = 0): BoxGeometry {
  const g = new BoxGeometry(w, h, d);
  const p = g.attributes.position!;
  const n = g.attributes.normal!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox;
    const y = p.getY(i) + oy;
    const z = p.getZ(i) + oz;
    if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, (z * Math.sign(n.getX(i))) / tile, y / tile);
    else if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, (-x * Math.sign(n.getZ(i))) / tile, y / tile);
  }
  uv.needsUpdate = true;
  return g;
}

type V3 = [number, number, number];

/** A textured box (walls, floors, counters) with metre UVs. */
export function Slab({ p, s, m, tile = 2, cast = true, receive = true, rot }: { p: V3; s: V3; m: Material | Material[]; tile?: number; cast?: boolean; receive?: boolean; rot?: number }) {
  const geo = useMemo(() => worldBox(s[0], s[1], s[2], tile, p[0], p[1], p[2]), [s[0], s[1], s[2], tile, p[0], p[1], p[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh position={p} rotation={rot ? [0, rot, 0] : undefined} geometry={geo} material={m} castShadow={cast} receiveShadow={receive} />;
}

/** A plain box (shared unit geometry, scaled). */
export function B({ p, s, m, r, cast = true, receive = true }: { p: V3; s: V3; m: Material; r?: V3; cast?: boolean; receive?: boolean }) {
  return <mesh position={p} scale={s} rotation={r} geometry={UNIT_BOX} material={m} castShadow={cast} receiveShadow={receive} />;
}

/** A plane, facing +z unless rotated. */
export function P({ p, s, m, r }: { p: V3; s: [number, number]; m: Material; r?: V3 }) {
  return <mesh position={p} scale={[s[0], s[1], 1]} rotation={r} geometry={UNIT_PLANE} material={m} />;
}

export interface Hole {
  a: number;
  b: number;
  y0?: number;
  y1: number;
  /** Fill the hole with glass (a window). */
  glass?: boolean;
}

interface WallProps {
  h: number;
  t?: number;
  m: Material | Material[];
  holes?: Hole[];
  tile?: number;
  cast?: boolean;
  frame?: boolean;
}

function segments(a0: number, a1: number, h: number, holes: Hole[]) {
  const out: { a: number; b: number; y0: number; y1: number }[] = [];
  const hs = [...holes].sort((p, q) => p.a - q.a);
  let cur = a0;
  for (const o of hs) {
    if (o.a > cur) out.push({ a: cur, b: o.a, y0: 0, y1: h });
    const y0 = o.y0 ?? 0;
    if (y0 > 0) out.push({ a: o.a, b: o.b, y0: 0, y1: y0 });
    if (o.y1 < h) out.push({ a: o.a, b: o.b, y0: o.y1, y1: h });
    cur = o.b;
  }
  if (a1 > cur) out.push({ a: cur, b: a1, y0: 0, y1: h });
  return out;
}

/** A wall running along x at depth z (centre line), with openings (x ranges). */
export function WallZ({ z, x0, x1, h, t = 0.2, m, holes = [], tile = 3.2, cast = true, frame = true }: WallProps & { z: number; x0: number; x1: number }) {
  const mats = useMats();
  return (
    <group>
      {segments(x0, x1, h, holes).map((s, i) => (
        <Slab key={i} p={[(s.a + s.b) / 2, (s.y0 + s.y1) / 2, z]} s={[s.b - s.a, s.y1 - s.y0, t]} m={m} tile={tile} cast={cast} />
      ))}
      {holes.map((o, i) => (o.glass ? <WindowFill key={`g${i}`} c={[(o.a + o.b) / 2, ((o.y0 ?? 0) + o.y1) / 2, z]} w={o.b - o.a} h={o.y1 - (o.y0 ?? 0)} t={t} axis="z" /> : frame ? <Casing key={`c${i}`} c={[(o.a + o.b) / 2, 0, z]} w={o.b - o.a} h={o.y1} y0={o.y0 ?? 0} t={t} axis="z" m={mats.walnut} /> : null))}
    </group>
  );
}

/** A wall running along z at x (centre line), with openings (z ranges). */
export function WallX({ x, z0, z1, h, t = 0.2, m, holes = [], tile = 3.2, cast = true, frame = true }: WallProps & { x: number; z0: number; z1: number }) {
  const mats = useMats();
  return (
    <group>
      {segments(z0, z1, h, holes).map((s, i) => (
        <Slab key={i} p={[x, (s.y0 + s.y1) / 2, (s.a + s.b) / 2]} s={[t, s.y1 - s.y0, s.b - s.a]} m={m} tile={tile} cast={cast} />
      ))}
      {holes.map((o, i) => (o.glass ? <WindowFill key={`g${i}`} c={[x, ((o.y0 ?? 0) + o.y1) / 2, (o.a + o.b) / 2]} w={o.b - o.a} h={o.y1 - (o.y0 ?? 0)} t={t} axis="x" /> : frame ? <Casing key={`c${i}`} c={[x, 0, (o.a + o.b) / 2]} w={o.b - o.a} h={o.y1} y0={o.y0 ?? 0} t={t} axis="x" m={mats.walnut} /> : null))}
    </group>
  );
}

/** A thin wood lining inside a door opening (the reveal), so the wall reads as solid. */
function Casing({ c, w, h, y0, t, axis, m }: { c: V3; w: number; h: number; y0: number; t: number; axis: 'x' | 'z'; m: Material }) {
  const d = t + 0.02;
  const k = 0.03;
  const parts: { p: V3; s: V3 }[] =
    axis === 'z'
      ? [
          { p: [c[0] - w / 2 + k / 2, (y0 + h) / 2, c[2]], s: [k, h - y0, d] },
          { p: [c[0] + w / 2 - k / 2, (y0 + h) / 2, c[2]], s: [k, h - y0, d] },
          { p: [c[0], h - k / 2, c[2]], s: [w, k, d] },
        ]
      : [
          { p: [c[0], (y0 + h) / 2, c[2] - w / 2 + k / 2], s: [d, h - y0, k] },
          { p: [c[0], (y0 + h) / 2, c[2] + w / 2 - k / 2], s: [d, h - y0, k] },
          { p: [c[0], h - k / 2, c[2]], s: [d, k, w] },
        ];
  return (
    <group>
      {parts.map((q, i) => (
        <B key={i} p={q.p} s={q.s} m={m} cast={false} />
      ))}
    </group>
  );
}

/** Glass with a slim black frame and (for wide panes) mullions. */
export function WindowFill({ c, w, h, t = 0.2, axis, mullion = 1.6 }: { c: V3; w: number; h: number; t?: number; axis: 'x' | 'z'; mullion?: number }) {
  const mats = useMats();
  const k = 0.05;
  const n = Math.max(1, Math.round(w / mullion));
  const bars: { p: V3; s: V3 }[] = [];
  const along = (u: number, y: number, sw: number, sh: number): { p: V3; s: V3 } =>
    axis === 'z' ? { p: [c[0] + u, c[1] + y, c[2]], s: [sw, sh, 0.08] } : { p: [c[0], c[1] + y, c[2] + u], s: [0.08, sh, sw] };
  bars.push(along(-w / 2 + k / 2, 0, k, h), along(w / 2 - k / 2, 0, k, h), along(0, h / 2 - k / 2, w, k), along(0, -h / 2 + k / 2, w, k));
  for (let i = 1; i < n; i++) bars.push(along(-w / 2 + (w * i) / n, 0, 0.04, h));
  return (
    <group>
      {bars.map((b, i) => (
        <B key={i} p={b.p} s={b.s} m={mats.black} cast={false} />
      ))}
      <mesh position={c} rotation={axis === 'x' ? [0, Math.PI / 2, 0] : undefined} scale={[w, h, 1]} geometry={UNIT_PLANE} material={mats.glass} />
      {/* A sill */}
      {axis === 'z' ? <B p={[c[0], c[1] - h / 2 - 0.015, c[2]]} s={[w + 0.06, 0.03, t + 0.08]} m={mats.white} cast={false} /> : <B p={[c[0], c[1] - h / 2 - 0.015, c[2]]} s={[t + 0.08, 0.03, w + 0.06]} m={mats.white} cast={false} />}
    </group>
  );
}

/* ───────────────────────── soft contact shadow ───────────────────────── */

let blobMat: MeshBasicMaterial | null = null;
function getBlobMat() {
  if (blobMat) return blobMat;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  blobMat = new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false });
  return blobMat;
}

/** A soft dark ellipse on the floor under furniture (rooms are not reached by the sun's shadows). */
export function Blob({ p, s, y = 0.006 }: { p: [number, number]; s: [number, number]; y?: number }) {
  const m = getBlobMat();
  return <mesh position={[p[0], y, p[1]]} rotation={[-Math.PI / 2, 0, 0]} scale={[s[0], s[1], 1]} geometry={UNIT_PLANE} material={m} renderOrder={1} />;
}

/* ───────────────────────── canvas textures ───────────────────────── */

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Deterministic pseudo-random numbers (the same house every visit). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

