/**
 * Rubber-sheet physics, kept pure so it can be unit-tested.
 *
 * - `softLimit` gives the sheet tension: small pulls follow the hand 1:1, long pulls give less
 *   and less, and the stretch can never exceed `limit` (the page never leaves the screen).
 * - `Spring` is a damped spring for the pull vector. While grabbed it follows the hand quickly
 *   and without wobble; when released it springs back to rest with a small overshoot.
 */

export interface Vec {
  x: number;
  y: number;
}

/** Bounded stretch: ~linear for |v| << limit, approaching `limit` asymptotically. */
export function softLimit(v: Vec, limit: number): Vec {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  const k = (limit * Math.tanh(len / limit)) / len;
  return { x: v.x * k, y: v.y * k };
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
}

/** Grabbed: stiff and critically damped, so the sheet stays attached to the hand. */
export const FOLLOW: SpringConfig = { stiffness: 900, damping: 60 };
/** Released: softer and under-damped (about 10% overshoot), then settles. */
export const RELEASE: SpringConfig = { stiffness: 190, damping: 17 };
/** Reduced motion: no overshoot. */
export const RELEASE_CALM: SpringConfig = { stiffness: 260, damping: 34 };

export class Spring {
  pos: Vec = { x: 0, y: 0 };
  vel: Vec = { x: 0, y: 0 };

  /** Advance by `dt` seconds towards `target`. Sub-steps keep it stable at low frame rates. */
  step(target: Vec, dt: number, c: SpringConfig) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = Math.min(dt, 0.1) / steps;
    for (let i = 0; i < steps; i++) {
      const ax = c.stiffness * (target.x - this.pos.x) - c.damping * this.vel.x;
      const ay = c.stiffness * (target.y - this.pos.y) - c.damping * this.vel.y;
      this.vel.x += ax * h;
      this.vel.y += ay * h;
      this.pos.x += this.vel.x * h;
      this.pos.y += this.vel.y * h;
    }
  }

  /** At rest (within half a pixel, barely moving): snap exactly to the target. */
  settle(target: Vec) {
    const near =
      Math.hypot(this.pos.x - target.x, this.pos.y - target.y) < 0.5 &&
      Math.hypot(this.vel.x, this.vel.y) < 5;
    if (near) {
      this.pos = { ...target };
      this.vel = { x: 0, y: 0 };
    }
    return near;
  }

  reset() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
  }
}
