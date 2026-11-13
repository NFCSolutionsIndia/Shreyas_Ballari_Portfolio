import { FOLLOW, RELEASE, RELEASE_CALM, softLimit, Spring } from '@/features/gestures/rubber/elastic';

/** Run a spring at 60 fps; returns the x positions. */
function simulate(s: Spring, target: { x: number; y: number }, seconds: number, c = RELEASE) {
  const xs: number[] = [];
  for (let i = 0; i < seconds * 60; i++) {
    s.step(target, 1 / 60, c);
    xs.push(s.pos.x);
  }
  return xs;
}

describe('rubber sheet physics', () => {
  it('follows small pulls almost 1:1 and never stretches past the limit', () => {
    expect(softLimit({ x: 20, y: 0 }, 300).x).toBeCloseTo(20, 0);
    const far = softLimit({ x: 5000, y: 5000 }, 300);
    expect(Math.hypot(far.x, far.y)).toBeLessThanOrEqual(300);
    expect(Math.hypot(far.x, far.y)).toBeGreaterThan(290);
    // Direction is kept.
    expect(far.x).toBeCloseTo(far.y, 6);
    // More pull always means more stretch (tension, not a hard stop).
    expect(softLimit({ x: 400, y: 0 }, 300).x).toBeGreaterThan(softLimit({ x: 300, y: 0 }, 300).x);
  });

  it('springs back with a small overshoot, then settles exactly at rest', () => {
    const s = new Spring();
    s.pos = { x: 300, y: 0 };
    const xs = simulate(s, { x: 0, y: 0 }, 2.5);
    const overshoot = -Math.min(...xs) / 300;
    expect(overshoot).toBeGreaterThan(0.02); // it does overshoot a little…
    expect(overshoot).toBeLessThan(0.2); // …but doesn't bounce wildly
    expect(s.settle({ x: 0, y: 0 })).toBe(true);
    expect(s.pos).toEqual({ x: 0, y: 0 });
    expect(s.vel).toEqual({ x: 0, y: 0 });
  });

  it('follows the hand without wobble while grabbed, and calmly under reduced motion', () => {
    const s = new Spring();
    const follow = simulate(s, { x: 200, y: 0 }, 0.5, FOLLOW);
    expect(Math.max(...follow)).toBeLessThanOrEqual(200.5);
    expect(follow[follow.length - 1]).toBeCloseTo(200, 0);
    const calm = new Spring();
    calm.pos = { x: 300, y: 0 };
    expect(Math.min(...simulate(calm, { x: 0, y: 0 }, 2, RELEASE_CALM))).toBeGreaterThan(-1);
  });

  it('stays stable at a low frame rate', () => {
    const s = new Spring();
    s.pos = { x: 300, y: 0 };
    for (let i = 0; i < 30; i++) s.step({ x: 0, y: 0 }, 1 / 8, RELEASE);
    expect(Math.abs(s.pos.x)).toBeLessThan(1);
  });
});
