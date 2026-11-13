import { classify, pinchRatio, type Point } from '@/features/gestures/geometry';
import { GestureRecognizer, SENSITIVITY, type GestureEvent } from '@/features/gestures/recognizer';

/**
 * Synthetic hands: 21 landmarks laid out like MediaPipe's, in "hand units" (wrist to middle
 * knuckle = 1, y up is negative as in image space), then placed in the frame.
 */
/** `grip` is a natural pinch: thumb on index, the other three fingers curled. */
type Shape = 'open' | 'fist' | 'pinch' | 'grip' | 'point';
const ASPECT = 4 / 3;

function hand(shape: Shape, cx = 0.5, cy = 0.6, size = 0.18): Point[] {
  const knuckles = {
    index: [-0.35, -0.95],
    middle: [0, -1],
    ring: [0.3, -0.95],
    pinky: [0.55, -0.85],
  } as const;
  const pts: [number, number][] = new Array(21).fill([0, 0]);
  pts[0] = [0, 0];
  // Thumb: cmc, mcp, ip, tip
  const thumbOut: [number, number][] = [
    [-0.35, -0.25],
    [-0.6, -0.45],
    [-0.8, -0.6],
    [-0.98, -0.72],
  ];
  const thumbIn: [number, number][] = [
    [-0.3, -0.25],
    [-0.4, -0.45],
    [-0.35, -0.62],
    [-0.25, -0.7],
  ];
  const thumbPinch: [number, number][] = [
    [-0.35, -0.25],
    [-0.55, -0.55],
    [-0.62, -0.85],
    [-0.62, -1.18],
  ];
  const thumb =
    shape === 'fist' || shape === 'point'
      ? thumbIn
      : shape === 'pinch' || shape === 'grip'
        ? thumbPinch
        : thumbOut;
  thumb.forEach((p, i) => (pts[1 + i] = p));
  const fingers = ['index', 'middle', 'ring', 'pinky'] as const;
  fingers.forEach((f, fi) => {
    const [kx, ky] = knuckles[f];
    const base = 5 + fi * 4;
    pts[base] = [kx, ky];
    const extended =
      shape === 'open' ||
      (shape === 'point' && f === 'index') ||
      (shape === 'pinch' && f !== 'index');
    if ((shape === 'pinch' || shape === 'grip') && f === 'index') {
      pts[base + 1] = [kx - 0.1, ky - 0.35];
      pts[base + 2] = [kx - 0.2, ky - 0.5];
      pts[base + 3] = [-0.64, -1.22];
    } else if (extended) {
      pts[base + 1] = [kx * 1.05, ky - 0.45];
      pts[base + 2] = [kx * 1.08, ky - 0.75];
      pts[base + 3] = [kx * 1.1, ky - 1.0];
    } else {
      pts[base + 1] = [kx, ky - 0.28];
      pts[base + 2] = [kx, ky - 0.12];
      pts[base + 3] = [kx * 0.9, ky + 0.25];
    }
  });
  return pts.map(([hx, hy]) => ({ x: cx + (hx * size) / ASPECT, y: cy + hy * size, z: 0 }));
}

/** Feed `frames` frames at 30 fps; `at(i)` gives the hand (or null) for frame i. */
function run(
  r: GestureRecognizer,
  start: number,
  frames: number,
  at: (i: number) => Point[] | null,
) {
  const events: GestureEvent[] = [];
  let t = start;
  for (let i = 0; i < frames; i++) {
    t = start + i * 33;
    events.push(...r.update(at(i), t, ASPECT).events);
  }
  return { events, t: t + 33 };
}
const types = (e: GestureEvent[]) => e.map((x) => (x.type === 'swipe' ? `swipe-${x.dir}` : x.type));

describe('hand shapes', () => {
  it('classifies open palm, fist, pinch and point', () => {
    expect(classify(hand('open'), ASPECT)).toBe('open');
    expect(classify(hand('fist'), ASPECT)).toBe('fist');
    expect(classify(hand('pinch'), ASPECT)).toBe('pinch');
    expect(classify(hand('point'), ASPECT)).toBe('point');
  });

  it('recognises a natural pinch (other fingers curled) as a pinch, not a fist', () => {
    expect(classify(hand('grip'), ASPECT)).toBe('pinch');
    expect(classify(hand('grip', 0.3, 0.4, 0.1), ASPECT)).toBe('pinch');
  });

  it('measures pinch relative to hand size, so distance from the camera does not matter', () => {
    expect(pinchRatio(hand('pinch', 0.5, 0.6, 0.1), ASPECT)).toBeCloseTo(
      pinchRatio(hand('pinch', 0.5, 0.6, 0.3), ASPECT),
      5,
    );
    expect(pinchRatio(hand('open'), ASPECT)).toBeGreaterThan(0.6);
  });

  it('does not mistake a fist (thumb near index) for a pinch', () => {
    expect(classify(hand('fist', 0.5, 0.6, 0.25), ASPECT)).toBe('fist');
  });
});

describe('gesture recogniser', () => {
  it('activates on a steady open palm', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const { events } = run(r, 0, 6, () => hand('open'));
    expect(types(events)).toEqual(['activated']);
  });

  it('fires one swipe per movement, in the mirrored (screen) direction', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.7));
    // Hand moves to the user's right = towards smaller image x = right on a mirrored screen.
    const move = run(r, t, 10, (i) => hand('open', 0.7 - i * 0.04));
    expect(types(move.events)).toEqual(['swipe-right']);
    t = move.t;
    // Holding still where it stopped does not keep navigating.
    const hold = run(r, t, 40, () => hand('open', 0.34));
    expect(types(hold.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
  });

  it('ignores the return stroke, then accepts a new swipe after a rest', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.7));
    ({ t } = run(r, t, 10, (i) => hand('open', 0.7 - i * 0.04)));
    // Immediately bring the hand back: no left swipe.
    const back = run(r, t, 10, (i) => hand('open', 0.34 + i * 0.04));
    expect(types(back.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
    // Rest, then a real second swipe right.
    ({ t } = run(r, back.t, 40, () => hand('open', 0.7)));
    const again = run(r, t, 10, (i) => hand('open', 0.7 - i * 0.04));
    expect(types(again.events)).toEqual(['swipe-right']);
  });

  it('allows a deliberate swipe the other way after the guard time', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.7));
    ({ t } = run(r, t, 10, (i) => hand('open', 0.7 - i * 0.04)));
    ({ t } = run(r, t, 45, () => hand('open', 0.34)));
    const left = run(r, t, 10, (i) => hand('open', 0.34 + i * 0.04));
    expect(types(left.events).filter((e) => e.startsWith('swipe'))).toEqual(['swipe-left']);
  });

  it('scrolls with an upward or downward movement', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.5, 0.3));
    const down = run(r, t, 14, (i) => hand('open', 0.5, 0.3 + Math.min(i, 9) * 0.04));
    expect(types(down.events)).toEqual(['swipe-down']);
    ({ t } = run(r, down.t, 45, () => hand('open', 0.5, 0.66)));
    const up = run(r, t, 10, (i) => hand('open', 0.5, 0.66 - i * 0.04));
    expect(types(up.events)).toEqual(['swipe-up']);
  });

  it('does not treat raising the hand into view, or lowering it out, as a swipe', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    // Rising into view: it is still moving when first seen.
    const rise = run(r, 0, 10, (i) => hand('open', 0.5, 0.9 - i * 0.05));
    expect(types(rise.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
    let { t } = run(r, rise.t, 20, () => hand('open', 0.5, 0.45));
    // Dropping out of view: moving down, then gone.
    ({ t } = run(r, t, 9, (i) => hand('open', 0.5, 0.45 + i * 0.05)));
    const gone = run(r, t, 10, () => null);
    expect(types(gone.events)).toEqual([]);
  });

  it('does not treat diagonal or slow drifting movement as a swipe', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.3, 0.3));
    const diagonal = run(r, t, 10, (i) => hand('open', 0.3 + i * 0.035, 0.3 + i * 0.035));
    expect(types(diagonal.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
    ({ t } = run(r, diagonal.t, 30, () => hand('open', 0.75, 0.6)));
    const slow = run(r, t, 90, (i) => hand('open', 0.75 - i * 0.004));
    expect(types(slow.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
  });

  it('recognises a fast swipe on a slow laptop camera (12 fps)', () => {
    const r = new GestureRecognizer(SENSITIVITY.high);
    const events: GestureEvent[] = [];
    let t = 0;
    for (let i = 0; i < 12; i++, t += 83) events.push(...r.update(hand('open', 0.25), t, ASPECT).events);
    for (let i = 1; i <= 6; i++, t += 83) events.push(...r.update(hand('open', 0.25 + i * 0.08), t, ASPECT).events);
    expect(types(events).filter((e) => e.startsWith('swipe'))).toEqual(['swipe-left']);
  });

  it('does not treat a tracking jump (hand lost and found elsewhere) as a swipe', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const { t } = run(r, 0, 8, () => hand('open', 0.75));
    const jump = run(r, t, 12, () => hand('open', 0.3));
    expect(types(jump.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
  });

  it('pauses on a closed fist and resumes on an open palm', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const { t } = run(r, 0, 6, () => hand('open'));
    const fist = run(r, t, 6, () => hand('fist'));
    expect(types(fist.events)).toEqual(['paused']);
    // Moving a fist across the frame never navigates.
    const moving = run(r, fist.t, 10, (i) => hand('fist', 0.7 - i * 0.04));
    expect(types(moving.events)).toEqual([]);
    const open = run(r, moving.t, 6, () => hand('open', 0.34));
    expect(types(open.events)).toEqual(['resumed']);
    expect(r.update(hand('open', 0.34), open.t, ASPECT).paused).toBe(false);
  });

  it('fires one pinch per pinch, however long the fingers stay together', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const { t } = run(r, 0, 6, () => hand('open'));
    const pinch = run(r, t, 30, () => hand('pinch'));
    expect(types(pinch.events)).toEqual(['pinch']);
    const release = run(r, pinch.t, 6, () => hand('open'));
    const again = run(r, release.t, 10, () => hand('pinch'));
    expect(types(again.events)).toEqual(['pinch']);
  });

  it('lets a pinch grab straight away, and resume after a fist', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const cold = run(r, 0, 10, () => hand('grip'));
    expect(types(cold.events)).toEqual(['activated', 'pinch']);
    let { t } = run(r, cold.t, 6, () => hand('open'));
    ({ t } = run(r, t, 6, () => hand('fist')));
    const after = run(r, t, 10, () => hand('grip'));
    expect(types(after.events)).toEqual(['resumed', 'pinch']);
  });

  it('does not swipe while paused', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.7));
    ({ t } = run(r, t, 6, () => hand('fist', 0.7)));
    const moving = run(r, t, 10, (i) => hand('fist', 0.7 - i * 0.04));
    expect(types(moving.events)).toEqual([]);
  });

  it('reports the grab point between thumb and index while pinched', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let res = r.update(hand('grip', 0.5), 0, ASPECT);
    for (let i = 1; i < 30; i++) res = r.update(hand('grip', 0.5), i * 33, ASPECT);
    expect(res.pinching).toBe(true);
    const a = hand('grip', 0.5);
    const mid = 1 - (a[4]!.x + a[8]!.x) / 2;
    expect(res.grip!.x).toBeCloseTo((mid - 0.15) / 0.7, 2);
  });

  it('shows the hint after an open palm is held still', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const { events } = run(r, 0, 60, () => hand('open'));
    expect(types(events)).toEqual(['activated', 'palm-hold']);
  });

  it('forgets motion when the hand leaves the frame', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    let { t } = run(r, 0, 6, () => hand('open', 0.7));
    ({ t } = run(r, t, 4, (i) => hand('open', 0.7 - i * 0.03)));
    ({ t } = run(r, t, 20, () => null));
    // Coming back on the far side is not a swipe.
    const back = run(r, t, 6, () => hand('open', 0.3));
    expect(types(back.events).filter((e) => e.startsWith('swipe'))).toEqual([]);
    expect(r.update(null, back.t + 1000, ASPECT).present).toBe(false);
  });

  it('keeps the cursor steady when the hand is still (smoothing)', () => {
    const r = new GestureRecognizer(SENSITIVITY.medium);
    const xs: number[] = [];
    for (let i = 0; i < 30; i++) {
      const jitter = (i % 2 ? 1 : -1) * 0.004;
      xs.push(r.update(hand('open', 0.5 + jitter), i * 33, ASPECT).cursor!.x);
    }
    const tail = xs.slice(10);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(0.008);
  });
});
