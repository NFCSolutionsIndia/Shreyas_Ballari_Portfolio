/**
 * Particle formation builders (CPU, run once per formation and on resize).
 *
 * A formation is N particles, each with a position (x, y, z), a size, and a colour (r, g, b, a),
 * packed as two Float32Arrays of N × 4 that become float textures the GPU morphs between.
 * Parts of a formation are anchored to DOM "slots" (elements with data-slot) so particle visuals
 * line up with the readable HTML around them.
 */

export interface Formation {
  pos: Float32Array;
  col: Float32Array;
}

/** World rectangle (centre and size) on the plane z = 0. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RGB = [number, number, number];

export const WHITE: RGB = [0.94, 0.95, 0.98];
export const SILVER: RGB = [0.7, 0.74, 0.82];
export const BLUE: RGB = [0.38, 0.62, 1.0];
export const GOLD: RGB = [1.0, 0.78, 0.42];

/** A set of particle points produced by one part. */
export interface Points {
  xyz: number[];
  rgba: number[];
  size: number[];
}

let seed = 1;
export function reseed(s: number) {
  seed = s;
}
export function rnd() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function emptyPoints(): Points {
  return { xyz: [], rgba: [], size: [] };
}

function push(p: Points, x: number, y: number, z: number, c: RGB, a: number, s: number) {
  p.xyz.push(x, y, z);
  p.rgba.push(c[0], c[1], c[2], a);
  p.size.push(s);
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// --- Canvas sampling ---------------------------------------------------------------------------

/** Pixels of a canvas where alpha > threshold, with their colour. */
function opaquePixels(cv: HTMLCanvasElement, threshold = 110) {
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  const px: number[] = [];
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      const k = (y * cv.width + x) * 4;
      if (d[k + 3]! > threshold) px.push(x, y, d[k]!, d[k + 1]!, d[k + 2]!);
    }
  }
  return { px, w: cv.width, h: cv.height };
}

/** Text sampled into points that fill `r` (text is fitted to the rect, keeping its proportions). */
export function textPoints(text: string, r: Rect, count: number, opts: { color?: RGB; accent?: RGB; weight?: number; align?: 'left' | 'center'; size?: number; depth?: number } = {}) {
  const lines = text.split('\n');
  const cv = document.createElement('canvas');
  const scale = 1600 / Math.max(r.w, 0.001);
  cv.width = Math.max(64, Math.round(r.w * scale));
  cv.height = Math.max(32, Math.round(r.h * scale));
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  const family = '"Manrope Variable", "Manrope", "Geist Variable", system-ui, sans-serif';
  // Largest font size that fits every line in the box.
  let fs = cv.height / lines.length / 1.05;
  g.font = `${opts.weight ?? 800} ${fs}px ${family}`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > cv.width) fs *= cv.width / widest;
  g.font = `${opts.weight ?? 800} ${fs}px ${family}`;
  g.fillStyle = '#fff';
  g.textBaseline = 'middle';
  g.textAlign = opts.align ?? 'left';
  const lh = fs * 1.02;
  const top = cv.height / 2 - (lh * (lines.length - 1)) / 2;
  const tx = (opts.align ?? 'left') === 'center' ? cv.width / 2 : 0;
  lines.forEach((l, i) => g.fillText(l, tx, top + i * lh));
  const { px, w, h } = opaquePixels(cv, 90);
  const out = emptyPoints();
  const n = px.length / 5;
  if (!n) return out;
  const color = opts.color ?? WHITE;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(rnd() * n) * 5;
    const x = r.x - r.w / 2 + ((px[j]! + rnd()) / w) * r.w;
    const y = r.y + r.h / 2 - ((px[j + 1]! + rnd()) / h) * r.h;
    // A faint accent shimmer across the letters.
    const c = opts.accent && rnd() < 0.12 ? opts.accent : color;
    push(out, x, y, (rnd() - 0.5) * (opts.depth ?? 0.08), c, 0.95, (opts.size ?? 1) * (0.75 + rnd() * 0.5));
  }
  return out;
}

/** An image sampled into coloured points; brightness becomes depth, so it reads as a point cloud. */
export function imagePoints(img: HTMLImageElement, r: Rect, count: number, opts: { tint?: RGB; tintAmount?: number; relief?: number; scan?: boolean; lift?: number } = {}) {
  const cv = document.createElement('canvas');
  const aspect = img.naturalWidth / img.naturalHeight;
  // Contain the image in the slot.
  let w = r.w;
  let h = r.w / aspect;
  if (h > r.h) {
    h = r.h;
    w = r.h * aspect;
  }
  cv.width = 300;
  cv.height = Math.round(300 / aspect);
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const { px } = opaquePixels(cv, 128);
  const out = emptyPoints();
  const n = px.length / 5;
  if (!n) return out;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(rnd() * n) * 5;
    const u = (px[j]! + rnd()) / cv.width;
    const v = (px[j + 1]! + rnd()) / cv.height;
    let c: RGB = [px[j + 2]! / 255, px[j + 3]! / 255, px[j + 4]! / 255];
    const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    // Lift dark tones towards a cool silver so dark clothing still reads on black.
    if (opts.lift) c = mixRGB(c, [0.42 + c[0] * 0.6, 0.46 + c[1] * 0.6, 0.56 + c[2] * 0.6], opts.lift * (1 - lum));
    if (opts.tint) c = mixRGB(c, [opts.tint[0] * (0.35 + lum), opts.tint[1] * (0.35 + lum), opts.tint[2] * (0.35 + lum)], opts.tintAmount ?? 1);
    // Scanner lines: thin bright bands across the portrait.
    const band = opts.scan && Math.abs(((v * 40) % 1) - 0.5) < 0.06;
    const a = band ? 1 : 0.92;
    push(out, r.x - w / 2 + u * w, r.y + h / 2 - v * h, (lum - 0.45) * (opts.relief ?? 0.8), band ? mixRGB(c, BLUE, 0.6) : c, a, 0.9 + rnd() * 0.4);
  }
  return out;
}

// --- Shapes ------------------------------------------------------------------------------------

export function dustPoints(count: number, W: number, H: number, depth = 8) {
  const out = emptyPoints();
  for (let i = 0; i < count; i++) {
    const c = rnd() < 0.08 ? BLUE : rnd() < 0.05 ? GOLD : SILVER;
    push(out, (rnd() - 0.5) * W * 1.3, (rnd() - 0.5) * H * 1.3, -rnd() * depth - 0.5, c, 0.06 + rnd() * 0.16, 0.45 + rnd() * 0.5);
  }
  return out;
}

export function spherePoints(r: Rect, count: number, color: RGB = BLUE, shell = true) {
  const out = emptyPoints();
  const R = Math.min(r.w, r.h) / 2;
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const k = shell ? 1 : Math.cbrt(rnd());
    const s = Math.sqrt(1 - u * u);
    const lat = Math.abs(((Math.asin(u) / Math.PI) * 18) % 1 - 0.5) < 0.08;
    push(out, r.x + Math.cos(t) * s * R * k, r.y + u * R * k, Math.sin(t) * s * R * k, lat ? GOLD : mixRGB(color, WHITE, rnd() * 0.5), 0.85, 0.8 + rnd() * 0.5);
  }
  return out;
}

export function ringPoints(cx: number, cy: number, R: number, count: number, color: RGB = SILVER, a = 0.7) {
  const out = emptyPoints();
  for (let i = 0; i < count; i++) {
    const t = rnd() * Math.PI * 2;
    const j = (rnd() - 0.5) * R * 0.04;
    push(out, cx + Math.cos(t) * (R + j), cy + Math.sin(t) * (R + j), (rnd() - 0.5) * 0.05, color, a, 0.7);
  }
  return out;
}

export function linePoints(x1: number, y1: number, x2: number, y2: number, count: number, color: RGB = SILVER, a = 0.75) {
  const out = emptyPoints();
  for (let i = 0; i < count; i++) {
    const t = rnd();
    push(out, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, (rnd() - 0.5) * 0.04, color, a, 0.7);
  }
  return out;
}

/** Outline of a rounded rectangle (a screen, card or whiteboard frame). */
export function framePoints(r: Rect, count: number, color: RGB = SILVER, a = 0.8) {
  const out = emptyPoints();
  const per = 2 * (r.w + r.h);
  for (let i = 0; i < count; i++) {
    let d = rnd() * per;
    let x: number;
    let y: number;
    if (d < r.w) [x, y] = [r.x - r.w / 2 + d, r.y + r.h / 2];
    else if ((d -= r.w) < r.h) [x, y] = [r.x + r.w / 2, r.y + r.h / 2 - d];
    else if ((d -= r.h) < r.w) [x, y] = [r.x + r.w / 2 - d, r.y - r.h / 2];
    else [x, y] = [r.x - r.w / 2, r.y - r.h / 2 + (d - r.w)];
    push(out, x, y, 0, color, a, 0.75);
  }
  return out;
}

export function merge(...parts: Points[]): Points {
  const out = emptyPoints();
  // Plain loops: spreading 100k-element arrays into push() can overflow the call stack.
  for (const p of parts) {
    for (let i = 0; i < p.xyz.length; i++) out.xyz.push(p.xyz[i]!);
    for (let i = 0; i < p.rgba.length; i++) out.rgba.push(p.rgba[i]!);
    for (let i = 0; i < p.size.length; i++) out.size.push(p.size[i]!);
  }
  return out;
}

/** Pack parts into a formation of exactly N particles: shuffle, trim or pad with dust. */
export function pack(N: number, parts: Points, W: number, H: number): Formation {
  const n = parts.size.length;
  const pos = new Float32Array(N * 4);
  const col = new Float32Array(N * 4);
  // Shuffle the order so particles fly across the screen between formations.
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const dust = n < N ? dustPoints(N - n, W, H) : null;
  for (let i = 0; i < N; i++) {
    const src = i < n ? parts : dust!;
    const k = i < n ? i : i - n;
    const o = order[i]! * 4;
    pos[o] = src.xyz[k * 3]!;
    pos[o + 1] = src.xyz[k * 3 + 1]!;
    pos[o + 2] = src.xyz[k * 3 + 2]!;
    pos[o + 3] = src.size[k]!;
    col[o] = src.rgba[k * 4]!;
    col[o + 1] = src.rgba[k * 4 + 1]!;
    col[o + 2] = src.rgba[k * 4 + 2]!;
    col[o + 3] = src.rgba[k * 4 + 3]!;
  }
  return { pos, col };
}

/**
 * Photo-accurate portrait: one particle per pixel on a grid, in the photo's exact colours, sized so
 * neighbouring points just overlap (the face reads exactly like the photograph). Brightness adds a
 * shallow relief so it is still a 3D point cloud. Returns the points and the point size to use.
 */
export function imageGrid(img: HTMLImageElement, r: Rect, budget: number, pxPerUnit: number, baseSize: number) {
  const aspect = img.naturalWidth / img.naturalHeight;
  let w = r.w;
  let h = r.w / aspect;
  if (h > r.h) {
    h = r.h;
    w = r.h * aspect;
  }
  // Pick a sampling resolution whose opaque pixel count is close to the budget.
  const probe = document.createElement('canvas');
  probe.width = 120;
  probe.height = Math.round(120 / aspect);
  probe.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, probe.width, probe.height);
  const ratio = opaquePixels(probe, 100).px.length / 5 / (probe.width * probe.height);
  // Shrink the grid until every opaque pixel fits the budget: no pixel is skipped, so no holes.
  let cw = Math.max(40, Math.round(Math.sqrt(budget / Math.max(ratio, 0.05) * aspect)));
  let ch = 0;
  let d: Uint8ClampedArray = new Uint8ClampedArray();
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  for (let attempt = 0; attempt < 8; attempt++) {
    ch = Math.round(cw / aspect);
    cv.width = cw;
    cv.height = ch;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, cw, ch);
    d = g.getImageData(0, 0, cw, ch).data;
    let n = 0;
    for (let k = 3; k < d.length; k += 4) if (d[k]! >= 100) n++;
    if (n <= budget) break;
    cw = Math.floor(cw * Math.sqrt(budget / n) * 0.995);
  }
  const out: Points = { xyz: [], rgba: [], size: [] };
  const cell = w / cw;
  const size = (cell * pxPerUnit * 1.6) / baseSize;
  let kept = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const k = (y * cw + x) * 4;
      const a = d[k + 3]!;
      if (a < 100 || kept >= budget) continue;
      kept++;
      const c: RGB = [d[k]! / 255, d[k + 1]! / 255, d[k + 2]! / 255];
      const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      out.xyz.push(r.x - w / 2 + (x + 0.5 + (rnd() - 0.5) * 0.3) * cell, r.y + h / 2 - (y + 0.5 + (rnd() - 0.5) * 0.3) * cell, (lum - 0.4) * 0.35 + (rnd() - 0.5) * 0.02);
      out.rgba.push(c[0], c[1], c[2], Math.min(1, a / 255));
      out.size.push(size * (0.92 + rnd() * 0.16));
    }
  }
  return out;
}
