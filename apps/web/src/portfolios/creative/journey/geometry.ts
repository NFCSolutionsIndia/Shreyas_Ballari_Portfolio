/**
 * Layout maths for the 1440×900 Journey composition, from the Figma J frames (J01–J09).
 * Every function takes the continuous progress (0–8) so parts glide between chapter states.
 */

export const W = 1440;
export const H = 900;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

/* ---------- Dial: tiles on an ellipse (centre 668,514; radii 305×96) ---------- */

export const DIAL = { cx: 668, cy: 514, rx: 305, ry: 96 };

export function tile(j: number, p: number) {
  const d = j - p;
  const a = (90 - d * 24) * DEG;
  const x = DIAL.cx + DIAL.rx * Math.cos(a);
  const y = DIAL.cy + DIAL.ry * Math.sin(a);
  const depth = Math.sin(a);
  return {
    x,
    y,
    scale: 0.72 + 0.28 * depth,
    rot: Math.atan2(-DIAL.ry * Math.cos(a), DIAL.rx * Math.sin(a)) / DEG,
    opacity: clamp(4.4 - Math.abs(d), 0, 1),
    z: Math.round(depth * 100),
    active: clamp(1 - Math.abs(d) * 2, 0, 1),
  };
}

/* ---------- Polaroids: three visible slots, the rest wait behind the calendar ---------- */

interface Slot {
  x: number;
  y: number;
  rot: number;
  s: number;
  o: number;
}
const HIDDEN: Slot = { x: 668, y: 300, rot: 0, s: 0.5, o: 0 };
/** Keyed by offset from the active chapter: top-right i+2, top-left i+1, left i−1. */
const SLOTS: Record<number, Slot> = {
  2: { x: 940, y: 150, rot: -9, s: 1, o: 1 },
  1: { x: 470, y: 174, rot: 9, s: 1, o: 1 },
  0: HIDDEN,
  [-1]: { x: 396, y: 436, rot: 14, s: 1, o: 1 },
};
const slotAt = (d: number) => SLOTS[d] ?? HIDDEN;

export function polaroid(j: number, p: number) {
  const d = j - p;
  const lo = Math.floor(d);
  const t = d - lo;
  const a = slotAt(lo);
  const b = slotAt(lo + 1);
  // A little lift mid-move, so cards travel round the calendar rather than in straight lines.
  const arc = Math.sin(t * Math.PI) * (a.o && b.o ? -40 : 0);
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t) + arc,
    rot: lerp(a.rot, b.rot, t),
    scale: lerp(a.s, b.s, t),
    opacity: lerp(a.o, b.o, t),
    // Visible slots sit in front of the calendar, hidden ones behind it.
    front: Math.max(a.o, b.o) > 0 && Math.min(a.o, b.o) > 0 ? true : lerp(a.o, b.o, t) > 0.5,
  };
}

/* ---------- Key Chapters map: six points along a dashed path ---------- */

/** Icon centres for map points 0–5 (from the frames). */
export const MAP_ICONS = [
  { x: 380, y: 712 },
  { x: 548, y: 706 },
  { x: 716, y: 716 },
  { x: 884, y: 704 },
  { x: 1052, y: 712 },
  { x: 1220, y: 702 },
];
/** The dashed path runs just under the labels, through all six points to the flag. */
export const MAP_PATH = (() => {
  const pts = [{ x: 330, y: 768 }, ...MAP_ICONS.map((p) => ({ x: p.x, y: p.y + 50 })), { x: 1318, y: 746 }];
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const mx = (a.x + b.x) / 2;
    d += ` C ${mx} ${a.y + 10}, ${mx} ${b.y + 10}, ${b.x} ${b.y}`;
  }
  return d;
})();

/** Pin tip position for a (fractional) map position. */
export function pinAt(pos: number) {
  const lo = clamp(Math.floor(pos), 0, MAP_ICONS.length - 1);
  const hi = clamp(lo + 1, 0, MAP_ICONS.length - 1);
  const t = clamp(pos - lo, 0, 1);
  const a = MAP_ICONS[lo]!;
  const b = MAP_ICONS[hi]!;
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - 18 };
}

/** Share of the path (0–1) behind the pin, for the solid gold part. */
export function pathShare(pos: number) {
  const x = pinAt(pos).x;
  return clamp((x - 330) / (1318 - 330), 0, 1);
}

/** Map position for the continuous progress (interpolated between chapters). */
export function mapPosition(positions: number[], p: number) {
  const lo = clamp(Math.floor(p), 0, positions.length - 1);
  const hi = clamp(lo + 1, 0, positions.length - 1);
  return lerp(positions[lo]!, positions[hi]!, p - lo);
}

/** Big date size: long labels shrink so they fit the page. */
export function bigSize(text: string) {
  const n = [...text].length;
  return n <= 3 ? 146 : n === 4 ? 128 : 104;
}
