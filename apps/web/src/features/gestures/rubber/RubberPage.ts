import { FOLLOW, RELEASE, RELEASE_CALM, softLimit, Spring, type Vec } from './elastic';

/**
 * Bends the whole live page like a rubber sheet.
 *
 * How: an SVG filter on the root element (so the real, interactive DOM is what bends: nav,
 * text, images, cards and background together, and nothing is replaced by a screenshot). A
 * filter on the root element does not change how fixed elements are positioned, and removing it
 * restores the page exactly, because the DOM itself never moves.
 *
 * The filter:
 *  1. A displacement field: every point is pulled along the drag vector by a weight that is 1 at
 *     the hand and falls off with distance (a Gaussian), plus a small share for the whole sheet.
 *     So the grabbed point follows the hand, nearby content stretches, far content barely moves.
 *  2. Shading from the same field (a bump raised where the sheet is pinched, lit from the upper
 *     left), stronger the further it is pulled: light on one flank, shadow on the other.
 *  3. A soft shadow under the sheet's edges where it pulls away from the frame.
 *
 * Runs its own requestAnimationFrame loop only while the sheet is grabbed or springing back.
 */

const NS = 'http://www.w3.org/2000/svg';
const FILTER_ID = 'rubber-sheet';
/** Share of the pull that moves the whole sheet (the far edge follows a little). */
const GLOBAL = 0.12;
/** Hand movement is amplified so a comfortable arm movement gives a strong stretch. */
const GAIN = 1.4;
/** Maximum stretch, as a share of the screen diagonal. */
const LIMIT = 0.27;
/** Width of the bend (Gaussian sigma), as a share of the larger screen side. */
const SPREAD = 0.24;
/** Colour of the frame behind the sheet. */
const FRAME = '#57534d';

function falloffImages(size = 256) {
  // Gaussian weight in alpha (white), and its gradient (for shading) in red/green.
  const fall = document.createElement('canvas');
  const grad = document.createElement('canvas');
  fall.width = fall.height = grad.width = grad.height = size;
  const fctx = fall.getContext('2d')!;
  const gctx = grad.getContext('2d')!;
  const f = fctx.createImageData(size, size);
  const g = gctx.createImageData(size, size);
  const half = size / 2;
  const sigma = size / 6; // the image spans ±3σ
  const peak = Math.exp(-0.5) / sigma; // max |dw/dr|
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = i + 0.5 - half;
      const y = j + 0.5 - half;
      const w = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      // Fade the last stretch to exactly 0 so the image edge is invisible.
      const r = Math.hypot(x, y) / half;
      const edge = r >= 1 ? 0 : r < 0.85 ? 1 : (1 - r) / 0.15;
      const k = (j * size + i) * 4;
      f.data[k] = f.data[k + 1] = f.data[k + 2] = 255;
      f.data[k + 3] = Math.round(w * edge * 255);
      const gx = ((-x / (sigma * sigma)) * w) / peak;
      const gy = ((-y / (sigma * sigma)) * w) / peak;
      g.data[k] = Math.round((0.5 + 0.5 * gx * edge) * 255);
      g.data[k + 1] = Math.round((0.5 + 0.5 * gy * edge) * 255);
      g.data[k + 2] = 128;
      g.data[k + 3] = 255;
    }
  }
  fctx.putImageData(f, 0, 0);
  gctx.putImageData(g, 0, 0);
  return { fall: fall.toDataURL(), grad: grad.toDataURL() };
}

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

export interface RubberOptions {
  /** Called when the sheet comes to rest after a release. */
  onRest?: () => void;
}

export class RubberPage {
  private svg: SVGSVGElement;
  private filter: SVGFilterElement;
  private images: SVGFEImageElement[];
  private regionPrims: SVGElement[];
  private map: SVGFEColorMatrixElement;
  private shadeMatrix: SVGFEColorMatrixElement;
  private disp: SVGFEDisplacementMapElement;
  private shade: SVGFECompositeElement;
  private drop: SVGFEDropShadowElement;

  private pull = new Spring();
  private centre = new Spring();
  private origin: Vec = { x: 0, y: 0 };
  private hand: Vec = { x: 0, y: 0 };
  private grabbed = false;
  private raf = 0;
  private last = 0;
  private applied = false;
  private reduce = false;

  constructor(private opts: RubberOptions = {}) {
    const { fall, grad } = falloffImages();
    this.svg = el('svg', {
      width: 0,
      height: 0,
      'aria-hidden': 'true',
      style: 'position:absolute;width:0;height:0;overflow:hidden',
    });
    const defs = el('defs', {}, this.svg);
    this.filter = el(
      'filter',
      {
        id: FILTER_ID,
        filterUnits: 'userSpaceOnUse',
        primitiveUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
      },
      defs,
    );
    const f = this.filter;
    const fallImg = el('feImage', { href: fall, preserveAspectRatio: 'none', result: 'fall' }, f);
    const gradImg = el('feImage', { href: grad, preserveAspectRatio: 'none', result: 'grad' }, f);
    this.images = [fallImg, gradImg];
    // Weight → displacement map (R = x, G = y). Updated every frame with the pull vector.
    this.map = el('feColorMatrix', { in: 'fall', type: 'matrix', result: 'map' }, f);
    this.disp = el(
      'feDisplacementMap',
      { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: 'warped' },
      f,
    );
    // Gradient → grey shading around 0.5 (alpha keeps it neutral outside the image).
    this.shadeMatrix = el('feColorMatrix', { in: 'grad', type: 'matrix', result: 'shadeRaw' }, f);
    // Keep the shading inside the image (its border blends with transparency and would leave a
    // seam), over neutral grey everywhere else.
    const shadeIn = el('feComposite', { in: 'shadeRaw', in2: 'grad', operator: 'in', result: 'shadeIn' }, f);
    const neutral = el('feFlood', { 'flood-color': 'rgb(128,128,128)', result: 'neutral' }, f);
    const shadeMap = el(
      'feComposite',
      { in: 'shadeIn', in2: 'neutral', operator: 'over', result: 'shadeMap' },
      f,
    );
    // warped + strength × (shade − 0.5)
    this.shade = el(
      'feComposite',
      { in: 'warped', in2: 'shadeMap', operator: 'arithmetic', k1: 0, k2: 1, result: 'lit' },
      f,
    );
    const clip = el('feComposite', { in: 'lit', in2: 'warped', operator: 'in', result: 'sheet' }, f);
    this.drop = el(
      'feDropShadow',
      {
        in: 'sheet',
        dx: 0,
        dy: 0,
        stdDeviation: 18,
        'flood-color': '#000',
        'flood-opacity': 0.35,
        result: 'lifted',
      },
      f,
    );
    // The frame the sheet pulls away from (a filtered root element also carries the page
    // background, so the frame has to be painted here).
    const frame = el('feFlood', { 'flood-color': FRAME, result: 'frame' }, f);
    const over = el('feComposite', { in: 'lifted', in2: 'frame', operator: 'over' }, f);
    this.regionPrims = [
      this.map,
      this.disp,
      this.shadeMatrix,
      shadeIn,
      neutral,
      shadeMap,
      this.shade,
      clip,
      this.drop,
      frame,
      over,
    ];
    document.body.appendChild(this.svg);
  }

  /** Where the page was grabbed (page coordinates before bending). */
  get anchor(): Vec {
    return this.origin;
  }

  get active() {
    return this.grabbed || this.applied;
  }

  grab(p: Vec) {
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Re-grabbing mid spring-back: keep the current stretch, re-anchor so nothing jumps.
    this.origin = { x: p.x - this.pull.pos.x, y: p.y - this.pull.pos.y };
    if (!this.applied) this.centre.pos = { ...p };
    this.hand = { ...p };
    this.grabbed = true;
    this.start();
  }

  move(p: Vec) {
    this.hand = { ...p };
  }

  release() {
    if (!this.grabbed) return;
    this.grabbed = false;
    this.start();
  }

  /** Remove instantly (camera turned off, page leaving). */
  reset() {
    this.grabbed = false;
    this.pull.reset();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unapply();
  }

  destroy() {
    this.reset();
    this.svg.remove();
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const limit = LIMIT * Math.hypot(vw, vh);

    const target = this.grabbed
      ? softLimit(
          { x: (this.hand.x - this.origin.x) * GAIN, y: (this.hand.y - this.origin.y) * GAIN },
          limit,
        )
      : { x: 0, y: 0 };
    this.pull.step(target, dt, this.grabbed ? FOLLOW : this.reduce ? RELEASE_CALM : RELEASE);
    // The bend is centred where the grabbed point is now (origin + pull), following the hand.
    const at = { x: this.origin.x + this.pull.pos.x, y: this.origin.y + this.pull.pos.y };
    if (this.grabbed) this.centre.step(at, dt, FOLLOW);

    const resting = !this.grabbed && this.pull.settle({ x: 0, y: 0 });
    if (resting) {
      this.unapply();
      this.opts.onRest?.();
      return;
    }
    this.render(vw, vh, limit);
    this.raf = requestAnimationFrame(this.tick);
  };

  private render(vw: number, vh: number, limit: number) {
    const sy = window.scrollY;
    const S = 2 * limit * 1.02;
    const { x: px, y: py } = this.pull.pos;
    const sigma = SPREAD * Math.max(vw, vh);
    const box = 6 * sigma;
    const c = this.centre.pos;

    for (const a of [this.filter, ...this.regionPrims]) {
      a.setAttribute('x', '0');
      a.setAttribute('y', String(sy));
      a.setAttribute('width', String(vw));
      a.setAttribute('height', String(vh));
    }
    for (const img of this.images) {
      img.setAttribute('x', String(c.x - box / 2));
      img.setAttribute('y', String(c.y + sy - box / 2));
      img.setAttribute('width', String(box));
      img.setAttribute('height', String(box));
    }

    // Sample from p − pull·w, w = GLOBAL + (1 − GLOBAL)·gaussian (the image's alpha).
    const kx = px / S;
    const ky = py / S;
    const g = GLOBAL;
    this.map.setAttribute(
      'values',
      [
        [0, 0, 0, -(1 - g) * kx, 0.5 - g * kx],
        [0, 0, 0, -(1 - g) * ky, 0.5 - g * ky],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1],
      ]
        .flat()
        .join(' '),
    );
    this.disp.setAttribute('scale', String(S));

    // Shading: a bump raised at the pinch, lit from the upper left. Its height grows with the pull.
    const tension = Math.min(1, Math.hypot(px, py) / limit);
    const lx = -0.7;
    const ly = -0.7;
    // shade = 0.5 + amount·(normal · light): R and G hold −dw/dx and −dw/dy.
    const amt = this.reduce ? 0 : 0.9 * tension;
    const ax = -lx * amt * 0.5;
    const ay = -ly * amt * 0.5;
    this.shadeMatrix.setAttribute(
      'values',
      [
        [ax, ay, 0, 0, 0.5 - 0.5 * (ax + ay)],
        [ax, ay, 0, 0, 0.5 - 0.5 * (ax + ay)],
        [ax, ay, 0, 0, 0.5 - 0.5 * (ax + ay)],
        [0, 0, 0, 1, 0],
      ]
        .flat()
        .join(' '),
    );
    const strength = 0.55;
    this.shade.setAttribute('k3', String(strength));
    this.shade.setAttribute('k4', String(-0.5 * strength));
    this.drop.setAttribute('dx', String(-px * 0.04));
    this.drop.setAttribute('dy', String(6 - py * 0.04));
    this.drop.setAttribute('flood-opacity', String(0.12 + 0.3 * tension));

    if (!this.applied) {
      const root = document.documentElement;
      root.setAttribute('data-rubber', '');
      root.style.filter = `url(#${FILTER_ID})`;
      this.applied = true;
    }
  }

  private unapply() {
    if (!this.applied) return;
    const root = document.documentElement;
    root.style.filter = '';
    root.removeAttribute('data-rubber');
    this.applied = false;
  }
}
