import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  RingGeometry,
  Shape,
  TorusGeometry,
  Vector2,
  type Material,
} from 'three';
import { B, UNIT_BOX, canvasTexture, rng, useMats } from './kit';

/**
 * Procedural props for the house: guitars, book rows, screens, a chess set, lamps, framed
 * prints and certificates, trophies, speakers. All original geometry (no third-party models).
 */

type V3 = [number, number, number];

/* ───────────────────────── guitars ───────────────────────── */

const ACOUSTIC_PTS: [number, number][] = [
  [0, 0],
  [0.085, 0.02],
  [0.14, 0.075],
  [0.162, 0.16],
  [0.146, 0.235],
  [0.104, 0.3],
  [0.108, 0.345],
  [0.122, 0.405],
  [0.104, 0.47],
  [0.052, 0.51],
  [0, 0.52],
];

function outline(pts: [number, number][]) {
  const right = pts.map(([x, y]) => new Vector2(x, y));
  const left = [...pts].reverse().slice(1).map(([x, y]) => new Vector2(-x, y));
  const s = new Shape();
  s.moveTo(0, 0);
  s.splineThru([...right.slice(1), ...left]);
  return s;
}

let acousticGeo: ExtrudeGeometry | null = null;
const getAcousticGeo = () =>
  (acousticGeo ??= new ExtrudeGeometry(outline(ACOUSTIC_PTS), { depth: 0.095, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 48 }));

const ELECTRIC_PTS: [number, number][] = [
  [0, 0],
  [0.09, 0.012],
  [0.15, 0.07],
  [0.16, 0.15],
  [0.12, 0.22],
  [0.118, 0.27],
  [0.15, 0.33],
  [0.13, 0.39],
  [0.085, 0.375],
  [0.05, 0.34],
  [0.03, 0.4],
  [0, 0.41],
];
let electricGeo: ExtrudeGeometry | null = null;
const getElectricGeo = () =>
  (electricGeo ??= new ExtrudeGeometry(outline(ELECTRIC_PTS), { depth: 0.042, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 40 }));

const RING = new RingGeometry(0.041, 0.052, 48);
const DISC = new CylinderGeometry(1, 1, 1, 40);

function useGuitarMats() {
  return useMemo(
    () => ({
      spruce: new MeshPhysicalMaterial({ color: '#d7aa6c', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
      rosewood: new MeshPhysicalMaterial({ color: '#4a2716', roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      board: new MeshStandardMaterial({ color: '#2a1810', roughness: 0.6 }),
      maple: new MeshStandardMaterial({ color: '#d8b98a', roughness: 0.45 }),
      hole: new MeshStandardMaterial({ color: '#0c0806', roughness: 1 }),
      string: new MeshStandardMaterial({ color: '#d9d6cf', metalness: 1, roughness: 0.25 }),
      bone: new MeshStandardMaterial({ color: '#efe8d6', roughness: 0.5 }),
      lacquer: new MeshPhysicalMaterial({ color: '#8f1d1a', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
      guard: new MeshStandardMaterial({ color: '#f2efe8', roughness: 0.35 }),
    }),
    [],
  );
}

/** A steel-string acoustic guitar, standing up (origin at the bottom of the body, top facing +z). */
export function AcousticGuitar() {
  const g = useGuitarMats();
  const m = useMats();
  const geo = getAcousticGeo();
  const top = 0.099;
  const strings = Array.from({ length: 6 }, (_, i) => i);
  return (
    <group>
      <mesh geometry={geo} material={[g.spruce, g.rosewood]} castShadow receiveShadow />
      <mesh position={[0, 0.33, top + 0.0005]} geometry={DISC} scale={[0.04, 0.001, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={g.hole} />
      <mesh position={[0, 0.33, top + 0.001]} geometry={RING} material={g.board} />
      <B p={[0, 0.12, top + 0.005]} s={[0.15, 0.028, 0.01]} m={g.board} />
      <B p={[0, 0.126, top + 0.011]} s={[0.075, 0.004, 0.003]} m={g.bone} cast={false} />
      {/* Neck, fretboard, headstock */}
      <B p={[0, 0.72, 0.075]} s={[0.05, 0.42, 0.03]} m={g.maple} />
      <B p={[0, 0.66, top + 0.003]} s={[0.052, 0.54, 0.008]} m={g.board} />
      {Array.from({ length: 14 }, (_, i) => (
        <B key={i} p={[0, 0.92 - 0.028 * i * (1 - i * 0.025), top + 0.0075]} s={[0.052, 0.0016, 0.002]} m={m.steel} cast={false} />
      ))}
      <B p={[0, 0.928, top + 0.006]} s={[0.052, 0.004, 0.005]} m={g.bone} cast={false} />
      <group position={[0, 0.93, 0.085]} rotation={[-0.22, 0, 0]}>
        <B p={[0, 0.09, 0]} s={[0.085, 0.18, 0.016]} m={g.board} />
        {[0.035, 0.085, 0.135].map((y) =>
          [-1, 1].map((sx) => <mesh key={`${y}${sx}`} position={[sx * 0.055, y, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.008, 0.03, 0.008]} geometry={DISC} material={m.steel} />),
        )}
      </group>
      {strings.map((i) => {
        const xb = -0.026 + i * 0.0104;
        const xn = -0.021 + i * 0.0084;
        const len = 0.93 - 0.126;
        return <B key={i} p={[(xb + xn) / 2, (0.126 + 0.93) / 2, top + 0.012]} s={[0.0011, len, 0.0011]} r={[0, 0, Math.atan2(xb - xn, len)]} m={g.string} cast={false} />;
      })}
    </group>
  );
}

/** A solid-body electric guitar (origin at the bottom of the body). */
export function ElectricGuitar() {
  const g = useGuitarMats();
  const m = useMats();
  const top = 0.048;
  return (
    <group>
      <mesh geometry={getElectricGeo()} material={[g.lacquer, g.lacquer]} castShadow receiveShadow />
      <B p={[-0.035, 0.17, top + 0.002]} s={[0.15, 0.2, 0.003]} m={g.guard} cast={false} />
      {[0.12, 0.25].map((y) => (
        <B key={y} p={[0, y, top + 0.006]} s={[0.075, 0.022, 0.008]} m={m.black} cast={false} />
      ))}
      <B p={[0, 0.07, top + 0.005]} s={[0.07, 0.02, 0.008]} m={m.steel} cast={false} />
      {[0.08, 0.13].map((y) => (
        <mesh key={y} position={[0.1, y, top + 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.011, 0.014, 0.011]} geometry={DISC} material={m.black} />
      ))}
      <B p={[0, 0.62, 0.028]} s={[0.046, 0.5, 0.024]} m={g.maple} />
      <B p={[0, 0.6, top]} s={[0.048, 0.46, 0.006]} m={g.board} />
      <group position={[0, 0.86, 0.03]}>
        <B p={[0.012, 0.09, 0]} s={[0.07, 0.18, 0.014]} m={g.maple} />
      </group>
      {Array.from({ length: 6 }, (_, i) => (
        <B key={i} p={[-0.02 + i * 0.008, 0.48, top + 0.007]} s={[0.001, 0.8, 0.001]} m={g.string} cast={false} />
      ))}
    </group>
  );
}

/** An A-frame guitar stand with the acoustic leaning back on it. */
export function GuitarOnStand({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const m = useMats();
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Stand */}
      {[-1, 1].map((s) => (
        <B key={s} p={[s * 0.13, 0.03, 0.02]} s={[0.018, 0.018, 0.34]} m={m.black} />
      ))}
      <B p={[0, 0.3, -0.1]} s={[0.016, 0.62, 0.016]} r={[-0.26, 0, 0]} m={m.black} />
      <B p={[0, 0.11, 0.12]} s={[0.3, 0.02, 0.05]} m={m.black} />
      <group position={[0, 0.105, 0.09]} rotation={[-0.26, 0, 0]}>
        <group position={[0, 0, -0.1]}>
          <AcousticGuitar />
        </group>
      </group>
    </group>
  );
}

/* ───────────────────────── books ───────────────────────── */

const BOOK_COLORS = ['#7b2d26', '#1f3a5a', '#2f4a3a', '#c9b48a', '#e6dfd2', '#3b3b3f', '#8a6a3d', '#5b6d7a', '#a65a3a', '#d8cbb3', '#24262b', '#6b4f6e', '#9aa39a', '#b88a4a', '#efe9de'];

let bookTex: CanvasTexture | null = null;
function getBookTex() {
  return (bookTex ??= canvasTexture(32, 128, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 32, 128);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 10, 32, 3);
    g.fillRect(0, 115, 32, 3);
    g.fillStyle = 'rgba(255,240,200,0.55)';
    g.fillRect(6, 30, 20, 2);
    g.fillRect(6, 34, 20, 1);
    const grad = g.createLinearGradient(0, 0, 32, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.25)');
    grad.addColorStop(0.3, 'rgba(0,0,0,0)');
    grad.addColorStop(0.8, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 128);
  }));
}

export interface Shelf {
  /** Start and end along the row (x for rows facing ±z, z for rows facing ±x). */
  a: number;
  b: number;
  /** Shelf top height. */
  y: number;
  /** The fixed coordinate (z for rows along x, x for rows along z): the back of the shelf. */
  c: number;
  /** Shelf depth (books stand at the front). */
  depth: number;
}

/**
 * Rows of books on shelves, instanced (one draw call). `along` = which axis the row runs; `face`
 * = the direction the spines face (+1/−1 on the other axis).
 */
export function BookRows({ shelves, along, face, seed = 1, fill = 0.85 }: { shelves: Shelf[]; along: 'x' | 'z'; face: 1 | -1; seed?: number; fill?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const books = useMemo(() => {
    const r = rng(seed);
    const out: { pos: V3; scl: V3; tilt: number; color: string; shelf: Shelf }[] = [];
    for (const s of shelves) {
      let u = s.a + 0.02;
      while (u < s.b - 0.05) {
        if (r() > fill) {
          u += 0.06 + r() * 0.2;
          continue;
        }
        // A short horizontal stack now and then
        if (r() < 0.08) {
          const n = 2 + Math.floor(r() * 4);
          const w = 0.2 + r() * 0.06;
          let y = s.y;
          for (let k = 0; k < n; k++) {
            const t = 0.025 + r() * 0.02;
            const d = 0.15 + r() * 0.06;
            out.push({ pos: [u + w / 2, y + t / 2, 0], scl: [w, t, d], tilt: 0, color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)]!, shelf: s });
            y += t;
          }
          u += w + 0.03;
          continue;
        }
        const run = 3 + Math.floor(r() * 9);
        const base = 0.2 + r() * 0.1;
        for (let k = 0; k < run && u < s.b - 0.05; k++) {
          const t = 0.018 + r() * 0.03;
          const h = base + (r() - 0.5) * 0.05;
          const d = Math.min(s.depth - 0.03, 0.14 + r() * 0.08);
          out.push({ pos: [u + t / 2, s.y + h / 2, d], scl: [t, h, d], tilt: 0, color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)]!, shelf: s });
          u += t + 0.002;
        }
        // A leaning book closes the run sometimes
        if (r() < 0.3 && u < s.b - 0.3) {
          const h = 0.24;
          const t = 0.03;
          out.push({ pos: [u + 0.08, s.y + h / 2 - 0.02, 0.18], scl: [t, h, 0.18], tilt: -0.35, color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)]!, shelf: s });
          u += 0.2;
        }
        u += 0.03 + r() * 0.12;
      }
    }
    return out;
  }, [shelves, seed, fill]);
  const mat = useMemo(() => new MeshStandardMaterial({ map: getBookTex(), roughness: 0.75 }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    books.forEach((b, i) => {
      const s = b.shelf;
      // depth: books are pushed to the front of the shelf
      const back = s.c;
      const front = back + face * s.depth;
      const off = front - face * (b.scl[2] / 2 + 0.01);
      if (along === 'x') {
        o.position.set(b.pos[0], b.pos[1], off);
        o.rotation.set(0, 0, b.tilt);
        o.scale.set(b.scl[0], b.scl[1], b.scl[2]);
      } else {
        o.position.set(off, b.pos[1], b.pos[0]);
        o.rotation.set(b.tilt, 0, 0);
        o.scale.set(b.scl[2], b.scl[1], b.scl[0]);
      }
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [books, along, face]);
  return <instancedMesh ref={ref} args={[UNIT_BOX, mat, books.length]} castShadow receiveShadow />;
}

/* ───────────────────────── screens ───────────────────────── */

export function codeScreen(seed = 3) {
  return canvasTexture(512, 320, (g) => {
    const r = rng(seed);
    g.fillStyle = '#14161c';
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = '#1c1f27';
    g.fillRect(0, 0, 120, 320);
    g.fillStyle = '#20232c';
    g.fillRect(0, 0, 512, 22);
    const cols = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#7dcfff', '#c0caf5', '#565f89'];
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(192,202,245,0.35)';
      g.fillRect(14, 34 + i * 18, 40 + r() * 50, 6);
    }
    for (let i = 0; i < 16; i++) {
      let x = 136 + (r() < 0.6 ? Math.floor(r() * 3) * 22 : 0);
      const n = 1 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const w = 18 + r() * 70;
        g.fillStyle = cols[Math.floor(r() * cols.length)]!;
        g.fillRect(x, 34 + i * 17, w, 7);
        x += w + 8;
      }
    }
  });
}

/** A monitor on a slim stand, screen facing +z. */
export function Monitor({ position, rotation = 0, tex, w = 0.62, h = 0.36 }: { position: V3; rotation?: number; tex: CanvasTexture; w?: number; h?: number }) {
  const m = useMats();
  const screen = useMemo(() => new MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.1, roughness: 0.2 }), [tex]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <B p={[0, 0.006, 0]} s={[0.22, 0.012, 0.16]} m={m.steel} />
      <B p={[0, 0.16, -0.04]} s={[0.04, 0.3, 0.015]} m={m.steel} />
      <B p={[0, 0.12 + h / 2, 0]} s={[w, h, 0.02]} m={m.black} />
      <mesh position={[0, 0.12 + h / 2, 0.0105]} scale={[w - 0.016, h - 0.016, 1]} material={screen}>
        <planeGeometry />
      </mesh>
    </group>
  );
}

/** An open laptop (hinge at the back), screen facing +z. */
export function Laptop({ position, rotation = 0, tex }: { position: V3; rotation?: number; tex: CanvasTexture }) {
  const m = useMats();
  const screen = useMemo(() => new MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1, roughness: 0.2 }), [tex]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <B p={[0, 0.008, 0]} s={[0.32, 0.016, 0.22]} m={m.steel} />
      <B p={[0, 0.0165, 0.02]} s={[0.27, 0.001, 0.09]} m={m.black} cast={false} />
      <group position={[0, 0.016, -0.11]} rotation={[-0.32, 0, 0]}>
        <B p={[0, 0.105, 0]} s={[0.32, 0.21, 0.008]} m={m.steel} />
        <mesh position={[0, 0.107, 0.0045]} scale={[0.29, 0.18, 1]} material={screen}>
          <planeGeometry />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────────────────── chess ───────────────────────── */

const prof = (pts: [number, number][]) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 20);
let pieceGeos: LatheGeometry[] | null = null;
function getPieces() {
  if (pieceGeos) return pieceGeos;
  const base: [number, number][] = [
    [0, 0],
    [0.014, 0],
    [0.014, 0.004],
    [0.011, 0.006],
  ];
  pieceGeos = [
    // pawn
    prof([...base, [0.006, 0.012], [0.005, 0.02], [0.008, 0.022], [0.0075, 0.027], [0.006, 0.031], [0.003, 0.034], [0, 0.035]]),
    // rook
    prof([...base, [0.008, 0.014], [0.007, 0.03], [0.01, 0.032], [0.01, 0.04], [0, 0.04]]),
    // knight (approximated by a tall cone-ish profile)
    prof([...base, [0.008, 0.014], [0.007, 0.024], [0.01, 0.034], [0.006, 0.042], [0.002, 0.045], [0, 0.045]]),
    // bishop
    prof([...base, [0.007, 0.014], [0.005, 0.03], [0.008, 0.034], [0.006, 0.042], [0.003, 0.046], [0.0015, 0.05], [0, 0.051]]),
    // queen
    prof([...base, [0.008, 0.016], [0.005, 0.036], [0.009, 0.042], [0.0095, 0.048], [0.006, 0.05], [0.003, 0.055], [0, 0.056]]),
    // king
    prof([...base, [0.008, 0.016], [0.005, 0.04], [0.009, 0.046], [0.008, 0.052], [0.003, 0.055], [0.003, 0.062], [0, 0.063]]),
  ];
  return pieceGeos;
}

// A quiet middle game: [type, white?, file, rank]
const POSITION: [number, boolean, number, number][] = [
  [5, true, 6, 0], [1, true, 5, 0], [1, true, 0, 0], [4, true, 3, 1], [3, true, 2, 3], [2, true, 5, 2],
  [0, true, 0, 1], [0, true, 1, 1], [0, true, 2, 1], [0, true, 3, 3], [0, true, 4, 3], [0, true, 5, 1], [0, true, 6, 1], [0, true, 7, 2],
  [5, false, 6, 7], [1, false, 5, 7], [1, false, 0, 7], [4, false, 3, 6], [3, false, 6, 5], [2, false, 2, 5], [2, false, 5, 5],
  [0, false, 0, 6], [0, false, 1, 5], [0, false, 2, 6], [0, false, 3, 4], [0, false, 4, 4], [0, false, 5, 6], [0, false, 6, 6], [0, false, 7, 6],
];

/** A walnut-and-maple chess board with turned pieces mid-game. Centre of the board at the origin. */
export function ChessSet({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const m = useMats();
  const sq = 0.042;
  const board = useMemo(() => {
    const t = canvasTexture(256, 256, (g) => {
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
          g.fillStyle = (i + j) % 2 ? '#4a2e1c' : '#e2c9a0';
          g.fillRect(i * 32, j * 32, 32, 32);
        }
    });
    return new MeshStandardMaterial({ map: t, roughness: 0.35 });
  }, []);
  const pieceMats = useMemo(
    () => [new MeshPhysicalMaterial({ color: '#efe4cf', roughness: 0.3, clearcoat: 0.6 }), new MeshPhysicalMaterial({ color: '#1d1714', roughness: 0.3, clearcoat: 0.6 })],
    [],
  );
  const geos = getPieces();
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <B p={[0, 0.012, 0]} s={[sq * 8 + 0.05, 0.024, sq * 8 + 0.05]} m={m.walnut} />
      <mesh position={[0, 0.0245, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[sq * 8, sq * 8, 1]} material={board}>
        <planeGeometry />
      </mesh>
      {POSITION.map(([t, white, f, rk], i) => (
        <mesh key={i} geometry={geos[t]} material={pieceMats[white ? 0 : 1]} position={[(f - 3.5) * sq, 0.025, (3.5 - rk) * sq]} castShadow>
          {t === 2 && <mesh position={[0, 0.04, 0.004]} rotation={[0.5, 0, 0]} scale={[0.008, 0.018, 0.014]} geometry={UNIT_BOX} material={pieceMats[white ? 0 : 1]} />}
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── lamps ───────────────────────── */

const SHADE = new CylinderGeometry(0.12, 0.16, 0.2, 32, 1, true);

/** A ceramic table lamp with a glowing linen shade. */
export function TableLamp({ position, scale = 1 }: { position: V3; scale?: number }) {
  const m = useMats();
  const base = useMemo(() => new MeshStandardMaterial({ color: '#d9d0c3', roughness: 0.5 }), []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]} scale={[0.075, 0.24, 0.075]} geometry={DISC} material={base} castShadow />
      <B p={[0, 0.3, 0]} s={[0.012, 0.14, 0.012]} m={m.brass} />
      <mesh position={[0, 0.42, 0]} geometry={SHADE} material={m.shade} />
      <mesh position={[0, 0.36, 0]} scale={[0.03, 0.04, 0.03]} geometry={DISC} material={m.warmGlow} />
    </group>
  );
}

const DOME = new LatheGeometry(
  [
    [0.002, 0.2],
    [0.03, 0.2],
    [0.05, 0.18],
    [0.14, 0.06],
    [0.17, 0],
    [0.165, 0],
  ].map(([r, y]) => new Vector2(r, y)),
  40,
);

/** A pendant: a cord from the ceiling, a matte dome and a glowing disc beneath. */
export function Pendant({ position, drop, color = '#1c1c1e' }: { position: V3; drop: number; color?: string }) {
  const m = useMats();
  const mat = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3, side: DoubleSide }), [color]);
  return (
    <group position={position}>
      <B p={[0, -drop / 2, 0]} s={[0.006, drop, 0.006]} m={m.black} cast={false} />
      <mesh position={[0, -drop - 0.2, 0]} geometry={DOME} material={mat} />
      <mesh position={[0, -drop - 0.19, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.warmGlow}>
        <circleGeometry args={[0.14, 32]} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── framed prints & certificates ───────────────────────── */

/** A framed print / certificate on a wall, facing +z (rotate the group for other walls). */
export function Framed({ position, rotation = 0, w, h, tex, frame = '#1a1a1a', mat = 0.06, glow = 0 }: { position: V3; rotation?: number; w: number; h: number; tex: CanvasTexture; frame?: string; mat?: number; glow?: number }) {
  const frameMat = useMemo(() => new MeshStandardMaterial({ color: frame, roughness: 0.4, metalness: frame === '#c8a46a' ? 0.9 : 0.1 }), [frame]);
  const print = useMemo(() => new MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: glow }), [tex, glow]);
  const mats = useMats();
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <B p={[0, 0, 0.015]} s={[w + 0.05, h + 0.05, 0.03]} m={frameMat} />
      <B p={[0, 0, 0.022]} s={[w, h, 0.02]} m={mats.white} cast={false} />
      <mesh position={[0, 0, 0.0325]} scale={[w - mat * 2, h - mat * 2, 1]} material={print}>
        <planeGeometry />
      </mesh>
    </group>
  );
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  lines.push(line);
  const y0 = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => g.fillText(l, x, y0 + i * lh));
}

/** A certificate: cream paper, a fine double border, the title and Shreyas's name. No seals or logos. */
export function certificateTexture(title: string, accent = '#8a6a2f') {
  return canvasTexture(1024, 768, (g) => {
    g.fillStyle = '#f7f2e6';
    g.fillRect(0, 0, 1024, 768);
    const grad = g.createRadialGradient(512, 384, 100, 512, 384, 700);
    grad.addColorStop(0, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(160,130,80,0.12)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 768);
    g.strokeStyle = accent;
    g.lineWidth = 6;
    g.strokeRect(36, 36, 952, 696);
    g.lineWidth = 2;
    g.strokeRect(52, 52, 920, 664);
    g.fillStyle = accent;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '600 26px Georgia, "Times New Roman", serif';
    g.fillText('C E R T I F I C A T E', 512, 150);
    g.fillRect(432, 186, 160, 2);
    g.fillStyle = '#2a2420';
    g.font = '600 58px Georgia, "Times New Roman", serif';
    wrap(g, title, 512, 330, 820, 70);
    g.font = 'italic 30px Georgia, "Times New Roman", serif';
    g.fillStyle = '#5a5048';
    g.fillText('awarded to', 512, 480);
    g.font = '600 46px Georgia, "Times New Roman", serif';
    g.fillStyle = '#2a2420';
    g.fillText('Shreyas Ballari', 512, 545);
    g.fillStyle = accent;
    g.fillRect(392, 585, 240, 2);
  });
}

/** An abstract print (no text): soft colour fields, for bedroom and hallway walls. */
export function abstractTexture(seed: number, palette: string[]) {
  return canvasTexture(512, 640, (g) => {
    const r = rng(seed);
    g.fillStyle = palette[0]!;
    g.fillRect(0, 0, 512, 640);
    for (let i = 1; i < palette.length; i++) {
      g.fillStyle = palette[i]!;
      g.globalAlpha = 0.85;
      g.beginPath();
      const x = 80 + r() * 350;
      const y = 80 + r() * 480;
      g.ellipse(x, y, 90 + r() * 160, 60 + r() * 150, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      g.fillRect(r() * 512, r() * 640, 2, 2);
    }
  });
}

/* ───────────────────────── trophies ───────────────────────── */

const CUP = new LatheGeometry(
  [
    [0, 0],
    [0.075, 0],
    [0.075, 0.03],
    [0.055, 0.036],
    [0.05, 0.05],
    [0.02, 0.075],
    [0.014, 0.13],
    [0.022, 0.15],
    [0.035, 0.158],
    [0.07, 0.19],
    [0.092, 0.25],
    [0.1, 0.31],
    [0.104, 0.335],
    [0.096, 0.335],
    [0.088, 0.27],
    [0.06, 0.205],
    [0.0, 0.19],
  ].map(([r, y]) => new Vector2(r, y)),
  48,
);
const HANDLE = new TorusGeometry(0.055, 0.008, 10, 28, Math.PI);

export function GoldCup({ position }: { position: V3 }) {
  const m = useMats();
  return (
    <group position={position}>
      <B p={[0, 0.04, 0]} s={[0.2, 0.08, 0.2]} m={m.black} />
      <group position={[0, 0.08, 0]}>
        <mesh geometry={CUP} material={m.gold} castShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={HANDLE} material={m.gold} position={[s * 0.09, 0.25, 0]} rotation={[0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]} castShadow />
        ))}
      </group>
    </group>
  );
}

const CRYSTAL = (() => {
  const s = new Shape();
  s.moveTo(-0.06, 0);
  s.lineTo(0.06, 0);
  s.lineTo(0.075, 0.2);
  s.lineTo(0.035, 0.34);
  s.lineTo(-0.065, 0.28);
  s.lineTo(-0.075, 0.12);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
})();

export function CrystalAward({ position, low }: { position: V3; low?: boolean }) {
  const m = useMats();
  const glass = useMemo(
    () =>
      new MeshPhysicalMaterial({ color: '#e4f1ff', transparent: true, opacity: low ? 0.4 : 0.5, roughness: 0.02, metalness: 0.1, envMapIntensity: 3, clearcoat: 1, iridescence: low ? 0 : 0.35, emissive: '#9fc4ff', emissiveIntensity: 0.12 }),
    [low],
  );
  return (
    <group position={position}>
      <B p={[0, 0.03, 0]} s={[0.17, 0.06, 0.1]} m={m.black} />
      <mesh geometry={CRYSTAL} material={glass} position={[0, 0.068, -0.0225]} castShadow />
    </group>
  );
}

const MEDAL = new CylinderGeometry(0.05, 0.05, 0.006, 48);
const MEDAL_RIM = new TorusGeometry(0.05, 0.004, 8, 48);

export function Medal({ position }: { position: V3 }) {
  const m = useMats();
  const ribbon = useMemo(() => {
    const t = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#1d3557';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#c9a24a';
      g.fillRect(26, 0, 12, 64);
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    return new MeshStandardMaterial({ map: t, roughness: 0.7, side: DoubleSide });
  }, []);
  return (
    <group position={position}>
      {/* A black display stand: base, post, arm */}
      <B p={[0, 0.01, 0]} s={[0.18, 0.02, 0.12]} m={m.black} />
      <B p={[-0.07, 0.2, 0]} s={[0.012, 0.38, 0.012]} m={m.black} />
      <B p={[-0.02, 0.385, 0]} s={[0.11, 0.012, 0.012]} m={m.black} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.0 + s * 0.016, 0.31, 0.003]} rotation={[0, 0, s * 0.22]} scale={[0.034, 0.16, 1]} material={ribbon}>
          <planeGeometry />
        </mesh>
      ))}
      <group position={[0, 0.2, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={MEDAL} material={m.gold} castShadow />
      </group>
      <mesh geometry={MEDAL_RIM} material={m.gold} position={[0, 0.2, 0.008]} />
    </group>
  );
}

/* ───────────────────────── audio ───────────────────────── */

const CONE = new CylinderGeometry(1, 0.6, 1, 32, 1, true);

/** A studio monitor speaker, facing +z. */
export function Speaker({ position, rotation = 0, s = 1 }: { position: V3; rotation?: number; s?: number }) {
  const m = useMats();
  const body = useMemo(() => new MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.55 }), []);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={s}>
      <B p={[0, 0.18, 0]} s={[0.2, 0.32, 0.24]} m={body} />
      <mesh position={[0, 0.12, 0.121]} rotation={[Math.PI / 2, 0, 0]} scale={[0.07, 0.02, 0.07]} geometry={CONE} material={m.black} />
      <mesh position={[0, 0.12, 0.121]} geometry={RING} scale={[1.7, 1.7, 1]} material={m.steel} />
      <mesh position={[0, 0.27, 0.121]} rotation={[Math.PI / 2, 0, 0]} scale={[0.02, 0.01, 0.02]} geometry={DISC} material={m.steel} />
    </group>
  );
}

/** A small valve-style guitar amp, facing +z. */
export function Amp({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  const m = useMats();
  const tolex = useMemo(() => new MeshStandardMaterial({ color: '#1e1c1a', roughness: 0.85 }), []);
  const grille = useMemo(() => {
    const t = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#b8a582';
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(80,60,30,0.5)';
      for (let i = -64; i < 64; i += 4) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + 64, 64);
        g.stroke();
      }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(6, 4);
    return new MeshStandardMaterial({ map: t, roughness: 1 });
  }, []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <B p={[0, 0.22, 0]} s={[0.56, 0.44, 0.26]} m={tolex} />
      <mesh position={[0, 0.19, 0.131]} scale={[0.5, 0.3, 1]} material={grille}>
        <planeGeometry />
      </mesh>
      <B p={[0, 0.395, 0.125]} s={[0.52, 0.05, 0.015]} m={m.brass} cast={false} />
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.2 + i * 0.07, 0.395, 0.137]} rotation={[Math.PI / 2, 0, 0]} scale={[0.011, 0.012, 0.011]} geometry={DISC} material={m.black} />
      ))}
      <B p={[0, 0.455, 0]} s={[0.16, 0.02, 0.03]} m={m.black} />
    </group>
  );
}

/** A soft rug (flat box with a woven canvas texture). */
export function Rug({ position, w, d, color = '#cfc6b8', rotation = 0, stripe }: { position: [number, number]; w: number; d: number; color?: string; rotation?: number; stripe?: string }) {
  const mat = useMemo(() => {
    const t = canvasTexture(256, 256, (g) => {
      g.fillStyle = color;
      g.fillRect(0, 0, 256, 256);
      const r = rng(7);
      for (let i = 0; i < 9000; i++) {
        const v = r();
        g.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
        g.fillRect(r() * 256, r() * 256, 1.5, 1.5);
      }
      if (stripe) {
        g.strokeStyle = stripe;
        g.lineWidth = 5;
        g.strokeRect(14, 14, 228, 228);
      }
    });
    return new MeshStandardMaterial({ map: t, roughness: 1 });
  }, [color, stripe]);
  return <B p={[position[0], 0.006, position[1]]} s={[w, 0.012, d]} r={[0, rotation, 0]} m={mat as Material} cast={false} />;
}
