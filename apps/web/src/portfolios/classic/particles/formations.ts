import {
  BLUE,
  dustPoints,
  framePoints,
  GOLD,
  imageGrid,
  imagePoints,
  linePoints,
  merge,
  pack,
  reseed,
  ringPoints,
  rnd,
  SILVER,
  spherePoints,
  textPoints,
  WHITE,
  type Formation,
  type Points,
  type Rect,
  type RGB,
} from './sample';

/**
 * One formation per section, in page order. Each is built from the section's DOM slots, so the
 * particle visuals sit exactly where the layout leaves room for them. Some sections hold a
 * choice (the open capability, the current process step) and rebuild when it changes.
 */

export interface Ctx {
  N: number;
  W: number;
  H: number;
  mobile: boolean;
  /** CSS pixels per world unit on the formation plane, and the shader's base point size. */
  pxPerUnit: number;
  baseSize: number;
  portrait: HTMLImageElement | null;
  /** World rect of a slot in this section (as if the section's top were at the top of the screen). */
  slot: (id: string) => Rect | null;
  /** Current interactive choices. */
  choice: { cap: number; step: number };
}

export interface FormationDef {
  id: string;
  /** Marquee: the formation scrolls sideways and wraps over this length (world units). */
  marquee?: { speed: number; length: number };
  /** Particles on the right of this x (world) drift away like smoke. */
  drift?: { x: number };
  build: (c: Ctx) => Formation;
}

const fallback = (c: Ctx, fx: number, fy: number, fw: number, fh: number): Rect => ({ x: fx * c.W, y: fy * c.H, w: fw * c.W, h: fh * c.H });

// --- Illustrations -------------------------------------------------------------------------------

function cellIllustration(r: Rect, n: number): Points {
  const parts: Points[] = [];
  const R = Math.min(r.w, r.h) * 0.26;
  const cell: Points = { xyz: [], rgba: [], size: [] };
  for (let i = 0; i < n * 0.45; i++) {
    const t = rnd() * Math.PI * 2;
    const k = Math.sqrt(rnd());
    const wob = 1 + Math.sin(t * 7) * 0.08;
    const inner = k < 0.35;
    cell.xyz.push(r.x + Math.cos(t) * R * k * wob, r.y + Math.sin(t) * R * k * wob, (rnd() - 0.5) * 0.3);
    const c: RGB = inner ? [0.55, 0.3, 0.85] : [0.72, 0.45, 1.0];
    cell.rgba.push(c[0], c[1], c[2], 0.9);
    cell.size.push(0.8 + rnd() * 0.5);
  }
  parts.push(cell, ringPoints(r.x, r.y, R * 1.12, Math.floor(n * 0.08), GOLD, 0.9));
  for (let b = 0; b < 6; b++) {
    const t = (b / 6) * Math.PI * 2 + 0.3;
    parts.push(spherePoints({ x: r.x + Math.cos(t) * R * 1.65, y: r.y + Math.sin(t) * R * 1.65, w: R * 0.28, h: R * 0.28 }, Math.floor(n * 0.025), GOLD, false));
  }
  for (const [dx, dy] of [[-1.15, 0.85], [1.2, -0.8], [-1.1, -0.9]] as const) {
    parts.push(spherePoints({ x: r.x + dx * R * 1.5, y: r.y + dy * R * 1.2, w: R * 0.7, h: R * 0.7 }, Math.floor(n * 0.06), [1, 0.55, 0.65], false));
  }
  return merge(...parts);
}

function dashboardIllustration(r: Rect, n: number): Points {
  const parts: Points[] = [framePoints(r, Math.floor(n * 0.14), SILVER, 0.8)];
  const left = r.x - r.w / 2 + r.w * 0.08;
  const chartW = r.w * 0.58;
  const base = r.y - r.h * 0.3;
  let v = 0;
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    v += Math.sin(i * 1.3) * 0.08 + 0.05;
    const x = left + (i / 13) * chartW;
    const y = base + v * r.h * 0.55;
    pts.push([x, y]);
    const up = Math.sin(i * 1.3) > -0.2;
    parts.push(linePoints(x, y - r.h * 0.06, x, y + r.h * 0.06, Math.floor(n * 0.012), up ? [0.3, 0.9, 0.6] : [1, 0.45, 0.5], 0.95));
  }
  for (let i = 0; i < pts.length - 1; i++) parts.push(linePoints(pts[i]![0], pts[i]![1] + r.h * 0.12, pts[i + 1]![0], pts[i + 1]![1] + r.h * 0.12, Math.floor(n * 0.02), GOLD, 0.95));
  const card: Rect = { x: r.x + r.w * 0.3, y: r.y + r.h * 0.05, w: r.w * 0.28, h: r.h * 0.5 };
  parts.push(framePoints(card, Math.floor(n * 0.06), [0.3, 0.9, 0.6], 0.9));
  parts.push(textPoints('AI\nBUY', { ...card, w: card.w * 0.7, h: card.h * 0.6 }, Math.floor(n * 0.12), { color: [0.4, 0.95, 0.65], align: 'center' }));
  return merge(...parts);
}

function whiteboardIllustration(r: Rect, n: number): Points {
  const parts: Points[] = [framePoints(r, Math.floor(n * 0.14), SILVER, 0.85)];
  parts.push(textPoints('2x + 3 = 11\n2x = 8\nx = 4', { x: r.x - r.w * 0.16, y: r.y, w: r.w * 0.5, h: r.h * 0.62 }, Math.floor(n * 0.45), { color: WHITE, accent: GOLD }));
  const pc = { x: r.x + r.w * 0.27, y: r.y };
  const R = Math.min(r.w, r.h) * 0.22;
  const pie: Points = { xyz: [], rgba: [], size: [] };
  for (let i = 0; i < n * 0.25; i++) {
    const t = rnd() * Math.PI * 2;
    const k = Math.sqrt(rnd());
    const c: RGB = t < Math.PI * 1.5 ? BLUE : [0.25, 0.28, 0.35];
    pie.xyz.push(pc.x + Math.cos(t) * R * k, pc.y + Math.sin(t) * R * k, 0);
    pie.rgba.push(c[0], c[1], c[2], 0.9);
    pie.size.push(0.8);
  }
  parts.push(pie);
  return merge(...parts);
}

function networkShape(r: Rect, n: number): Points {
  const nodes: [number, number][] = [];
  const layers = [3, 4, 4, 2];
  layers.forEach((count, li) => {
    for (let k = 0; k < count; k++) nodes.push([r.x - r.w * 0.4 + (li / (layers.length - 1)) * r.w * 0.8, r.y + ((k + 0.5) / count - 0.5) * r.h * 0.8]);
  });
  const parts: Points[] = [];
  let start = 0;
  for (let li = 0; li < layers.length - 1; li++) {
    const a = nodes.slice(start, start + layers[li]!);
    const b = nodes.slice(start + layers[li]!, start + layers[li]! + layers[li + 1]!);
    for (const p of a) for (const q of b) parts.push(linePoints(p[0], p[1], q[0], q[1], Math.floor(n * 0.012), SILVER, 0.45));
    start += layers[li]!;
  }
  for (const p of nodes) parts.push(spherePoints({ x: p[0], y: p[1], w: r.h * 0.14, h: r.h * 0.14 }, Math.floor(n * 0.02), BLUE, false));
  return merge(...parts);
}

function helixShape(r: Rect, n: number): Points {
  const out: Points = { xyz: [], rgba: [], size: [] };
  for (let i = 0; i < n; i++) {
    const t = rnd();
    const a = t * Math.PI * 5;
    const strand = rnd() < 0.5 ? 0 : Math.PI;
    const rung = rnd() < 0.25;
    const R = Math.min(r.w, r.h) * 0.3;
    const x = rung ? Math.cos(a) * R * (rnd() * 2 - 1) : Math.cos(a + strand) * R;
    out.xyz.push(r.x + x, r.y - r.h / 2 + t * r.h, Math.sin(a + strand) * R);
    const c: RGB = rung ? GOLD : strand ? BLUE : [0.85, 0.5, 0.95];
    out.rgba.push(c[0], c[1], c[2], 0.9);
    out.size.push(0.8);
  }
  return out;
}

function chartShape(r: Rect, n: number): Points {
  const parts: Points[] = [];
  for (let i = 0; i < 6; i++) {
    const h = r.h * (0.25 + i * 0.12);
    parts.push(framePoints({ x: r.x - r.w * 0.38 + i * r.w * 0.15, y: r.y - r.h / 2 + h / 2, w: r.w * 0.09, h }, Math.floor(n / 9), i === 5 ? GOLD : BLUE, 0.85));
  }
  parts.push(linePoints(r.x - r.w * 0.42, r.y - r.h * 0.2, r.x + r.w * 0.42, r.y + r.h * 0.45, Math.floor(n / 4), [0.3, 0.9, 0.6], 0.95));
  return merge(...parts);
}

function bookShape(r: Rect, n: number): Points {
  const parts: Points[] = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const y = r.y + r.h * 0.3 - k * r.h * 0.14;
      parts.push(linePoints(r.x + s * r.w * 0.06, y, r.x + s * r.w * 0.42, y + r.h * 0.08, Math.floor(n / 14), SILVER, 0.8));
    }
    parts.push(framePoints({ x: r.x + s * r.w * 0.24, y: r.y, w: r.w * 0.42, h: r.h * 0.8 }, Math.floor(n / 6), WHITE, 0.85));
  }
  return merge(...parts);
}

function wavePoints(c: Ctx, n: number, y0: number, amp: number, color: RGB): Points {
  const out: Points = { xyz: [], rgba: [], size: [] };
  for (let i = 0; i < n; i++) {
    const u = rnd() - 0.5;
    const v = rnd();
    const x = u * c.W * 1.4;
    const z = -v * 8;
    const y = y0 + Math.sin(x * 0.6 + v * 6) * amp * (1 - v * 0.5) + Math.cos(x * 0.25 - v * 3) * amp * 0.5;
    out.xyz.push(x, y, z);
    const k = 0.5 + 0.5 * Math.sin(x * 0.3 + v * 4);
    out.rgba.push(color[0] * k + 0.2, color[1] * k + 0.2, color[2] * k + 0.25, 0.55 * (1 - v * 0.6));
    out.size.push(0.6 + rnd() * 0.4);
  }
  return out;
}

/** A capability's shape, by index (Computer Science, AI, FinTech, Biomedical, Teaching, Writing). */
export function capabilityShape(i: number, r: Rect, n: number): Points {
  switch (i) {
    case 0:
      return textPoints('</>', r, n, { color: BLUE, accent: WHITE, align: 'center' });
    case 1:
      return networkShape(r, n);
    case 2:
      return chartShape(r, n);
    case 3:
      return helixShape(r, n);
    case 4:
      return textPoints('x = 4', r, n, { color: GOLD, accent: WHITE, align: 'center' });
    default:
      return bookShape(r, n);
  }
}

function marquee(text: string, c: Ctx, slotId: string, speed: number, id: string) {
  const r = c.slot(slotId) ?? fallback(c, 0, 0, 1, 0.25);
  const L = c.W * 2.6;
  const band: Rect = { x: 0, y: r.y, w: L, h: r.h * 0.9 };
  const def = FORMATIONS.find((f) => f.id === id)!;
  def.marquee = { speed, length: L };
  return pack(c.N, textPoints(`${text}${text}`, band, Math.floor(c.N * 0.7), { color: WHITE, accent: GOLD, weight: 700 }), c.W, c.H);
}

export const FORMATIONS: FormationDef[] = [
  {
    id: 'home',
    build: (c) => {
      const slot = c.slot('hero-portrait');
      // The hero is now a photo stage over the field: the particles wait as faint dust.
      if (!slot) return pack(c.N, { xyz: [], rgba: [], size: [] }, c.W, c.H);
      const r = slot;
      const def = FORMATIONS[0]!;
      def.drift = { x: r.x + r.w * 0.12 };
      const portrait = c.portrait ? imageGrid(c.portrait, r, Math.floor(c.N * 0.86), c.pxPerUnit, c.baseSize) : spherePoints(r, Math.floor(c.N * 0.5));
      return pack(c.N, portrait, c.W, c.H);
    },
  },
  {
    id: 'about',
    build: (c) => {
      const values = ['99th', '3', '5', '7'];
      const parts: Points[] = [];
      values.forEach((t, i) => {
        const r = c.slot(`metric-${i}`);
        if (!r || r.w < 0.05) return;
        parts.push(textPoints(t, r, Math.floor(c.N * 0.1), { color: i === 0 ? WHITE : WHITE, accent: GOLD, align: i === 0 ? 'left' : 'center' }));
      });
      const ring = c.slot('metric-ring');
      if (ring) {
        for (let k = 0; k < 40; k++) {
          const a = (k / 40) * Math.PI * 2;
          const R = Math.min(ring.w, ring.h) * 0.42;
          parts.push(linePoints(ring.x + Math.cos(a) * R * 0.78, ring.y + Math.sin(a) * R * 0.78, ring.x + Math.cos(a) * R, ring.y + Math.sin(a) * R, Math.floor(c.N * 0.003), k % 5 ? SILVER : GOLD, 0.8));
        }
      }
      return pack(c.N, merge(...parts), c.W, c.H);
    },
  },
  { id: 'works', build: (c) => marquee('SELECTED WORK  ✳  ', c, 'works-band', 1.1, 'works') },
  {
    id: 'work',
    build: (c) => {
      const n = Math.floor(c.N * 0.26);
      const r = [0, 1, 2].map((i) => c.slot(`work-${i}`) ?? fallback(c, -0.3 + i * 0.3, 0.05, 0.26, 0.3));
      const parts = [cellIllustration(r[0]!, n), dashboardIllustration({ ...r[1]!, w: r[1]!.w * 0.86, h: r[1]!.h * 0.78 }, n), whiteboardIllustration({ ...r[2]!, w: r[2]!.w * 0.86, h: r[2]!.h * 0.78 }, n)];
      return pack(c.N, merge(...parts), c.W, c.H);
    },
  },
  {
    id: 'expertise',
    build: (c) => {
      const r = c.slot('cap-visual') ?? fallback(c, 0.2, -0.1, 0.3, 0.4);
      const shape = capabilityShape(c.choice.cap, { ...r, w: r.w * 0.8, h: r.h * 0.8 }, Math.floor(c.N * 0.55));
      return pack(c.N, merge(shape, ringPoints(r.x, r.y, Math.min(r.w, r.h) * 0.5, Math.floor(c.N * 0.04), SILVER, 0.25)), c.W, c.H);
    },
  },
  {
    id: 'vision',
    build: (c) => {
      const r = c.slot('vision-photo');
      const parts: Points[] = [wavePoints(c, Math.floor(c.N * 0.4), -c.H * 0.32, c.H * 0.07, GOLD)];
      if (r && c.portrait) parts.push(imagePoints(c.portrait, r, Math.floor(c.N * 0.3), { tint: [0.55, 0.75, 1], tintAmount: 0.85, scan: true, relief: 1.1 }));
      return pack(c.N, merge(...parts), c.W, c.H);
    },
  },
  { id: 'journey', build: (c) => marquee('LEARNING JOURNEY  ✳  ', c, 'journey-band', -1.0, 'journey') },
  {
    id: 'lab',
    build: (c) => {
      const r = c.slot('lab-sphere') ?? fallback(c, 0.2, 0, 0.4, 0.7);
      const parts = [
        spherePoints(r, Math.floor(c.N * 0.5), BLUE),
        ringPoints(r.x, r.y, Math.min(r.w, r.h) * 0.66, Math.floor(c.N * 0.08), GOLD, 0.7),
        ringPoints(r.x, r.y, Math.min(r.w, r.h) * 0.82, Math.floor(c.N * 0.05), SILVER, 0.4),
      ];
      return pack(c.N, merge(...parts), c.W, c.H);
    },
  },
  {
    id: 'process',
    build: (c) => {
      const r = c.slot('step-visual') ?? fallback(c, 0.25, 0, 0.3, 0.5);
      const s = c.choice.step;
      const parts = [
        textPoints(String(s + 1).padStart(2, '0'), { ...r, h: r.h * 0.5, w: r.w * 0.7 }, Math.floor(c.N * 0.4), { color: WHITE, accent: GOLD, align: 'center' }),
        ringPoints(r.x, r.y, Math.min(r.w, r.h) * 0.46, Math.floor(c.N * 0.08), BLUE, 0.6),
      ];
      // Seven beads round the ring; the current step is gold.
      for (let k = 0; k < 7; k++) {
        const a = Math.PI / 2 - (k / 7) * Math.PI * 2;
        const R = Math.min(r.w, r.h) * 0.46;
        parts.push(spherePoints({ x: r.x + Math.cos(a) * R, y: r.y + Math.sin(a) * R, w: r.h * 0.07, h: r.h * 0.07 }, Math.floor(c.N * 0.012), k === s ? GOLD : SILVER, false));
      }
      return pack(c.N, merge(...parts), c.W, c.H);
    },
  },
  {
    id: 'contact',
    build: (c) => {
      const r = c.slot('contact-text') ?? fallback(c, 0, 0.12, 0.8, 0.34);
      const parts = [
        textPoints(c.mobile ? 'LET’S BUILD\nSOMETHING\nMEANINGFUL\nTOGETHER.' : 'LET’S BUILD SOMETHING\nMEANINGFUL TOGETHER.', r, Math.floor(c.N * 0.5), { color: WHITE, accent: BLUE, align: 'center' }),
        dustPoints(Math.floor(c.N * 0.05), c.W * 0.5, c.H * 0.4, 2),
      ];
      const w = c.slot('wordmark');
      if (w) parts.push(textPoints('SHREYAS', w, Math.floor(c.N * 0.3), { color: SILVER, accent: GOLD, align: 'center', weight: 800 }));
      return pack(c.N, merge(...parts), c.W, c.H);
    },
  },
];

export function buildFormation(def: FormationDef, ctx: Ctx, index: number) {
  reseed(1000 + index * 7919 + ctx.choice.cap * 31 + ctx.choice.step * 17);
  return def.build(ctx);
}
