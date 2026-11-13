import { classify, palmCentre, pinchRatio, type HandShape, type Point, LM } from './geometry';
import { OneEuro } from './oneEuro';

/**
 * Turns a stream of hand landmarks into deliberate gestures. Pure and time-driven (no DOM), so it
 * can be unit-tested with synthetic hands.
 *
 * - Open palm (held steady for a few frames) activates gesture navigation.
 * - Swipe: the open palm travels `swipeDistance` of the frame within `swipeWindowMs`, mostly
 *   along one axis (up, down, left or right). One swipe = one event; then a cooldown, a guard
 *   against the return stroke, and the hand must come to rest before the next swipe can fire.
 *   A hand that has just appeared must rest first too, so raising it into view is not a swipe,
 *   and a downward swipe is only confirmed if the hand is still there a moment later, so
 *   lowering it out of view is not one either.
 * - Pinch: thumb and index tips together → one `pinch` event; released only above `pinchOff`.
 * - Closed fist: pauses navigation (no swipes or pinches) until an open palm resumes it.
 * - Open palm held still for `holdMs`: `palm-hold` (shows the gesture hints).
 */

export type Gesture = 'none' | HandShape;

export interface Sensitivity {
  /** Fraction of the frame width the palm must travel for a swipe. */
  swipeDistance: number;
  swipeWindowMs: number;
  /** Max vertical travel, as a fraction of the horizontal travel. */
  swipeMaxSlope: number;
  cooldownMs: number;
  /** Ignore a swipe in the opposite direction for this long (the hand coming back). */
  returnGuardMs: number;
  pinchOn: number;
  pinchOff: number;
  holdMs: number;
  /** Frames a shape must persist before it counts. */
  stableFrames: number;
}

export const SENSITIVITY: Record<'low' | 'medium' | 'high', Sensitivity> = {
  low: {
    swipeDistance: 0.26,
    swipeWindowMs: 420,
    swipeMaxSlope: 0.6,
    cooldownMs: 900,
    returnGuardMs: 1300,
    pinchOn: 0.28,
    pinchOff: 0.5,
    holdMs: 1400,
    stableFrames: 4,
  },
  medium: {
    swipeDistance: 0.2,
    swipeWindowMs: 450,
    swipeMaxSlope: 0.7,
    cooldownMs: 750,
    returnGuardMs: 1100,
    pinchOn: 0.33,
    pinchOff: 0.52,
    holdMs: 1200,
    stableFrames: 3,
  },
  high: {
    swipeDistance: 0.15,
    swipeWindowMs: 480,
    swipeMaxSlope: 0.8,
    cooldownMs: 600,
    returnGuardMs: 950,
    pinchOn: 0.38,
    pinchOff: 0.56,
    holdMs: 1000,
    stableFrames: 2,
  },
};

export type SwipeDir = 'left' | 'right' | 'up' | 'down';

export type GestureEvent =
  | { type: 'activated' }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'swipe'; dir: SwipeDir }
  | { type: 'pinch' }
  | { type: 'palm-hold' };

export interface FrameResult {
  present: boolean;
  gesture: Gesture;
  /** Index fingertip in screen space (0–1, mirrored like a selfie view), smoothed. */
  cursor: { x: number; y: number } | null;
  /** Midpoint of thumb tip and index tip in screen space (0–1), smoothed: the grab point. */
  grip: { x: number; y: number } | null;
  /** Thumb–index gap relative to hand size (smaller = closer), for the panel's pinch meter. */
  pinchRatio: number | null;
  pinching: boolean;
  active: boolean;
  paused: boolean;
  events: GestureEvent[];
}

interface Sample {
  t: number;
  x: number;
  y: number;
}

export class GestureRecognizer {
  private s: Sensitivity;
  private active = false;
  private paused = false;
  private gesture: Gesture = 'none';
  private candidate: HandShape | null = null;
  private candidateCount = 0;
  private trail: Sample[] = [];
  private armed = false;
  private lastSwipe = { t: -Infinity, dir: 'right' as SwipeDir };
  /** A downward swipe waiting to be confirmed (see above). */
  private pending: { t: number } | null = null;
  private pinching = false;
  private holdStart: number | null = null;
  private holdFired = false;
  private lastSeen = -Infinity;
  private fx = new OneEuro(1.4, 0.03);
  private fy = new OneEuro(1.4, 0.03);
  private gx = new OneEuro(1.6, 0.04);
  private gy = new OneEuro(1.6, 0.04);

  constructor(sensitivity: Sensitivity = SENSITIVITY.medium) {
    this.s = sensitivity;
  }

  setSensitivity(s: Sensitivity) {
    this.s = s;
  }

  reset() {
    this.active = false;
    this.paused = false;
    this.gesture = 'none';
    this.candidate = null;
    this.candidateCount = 0;
    this.trail = [];
    this.armed = false;
    this.pending = null;
    this.pinching = false;
    this.holdStart = null;
    this.holdFired = false;
    this.fx.reset();
    this.fy.reset();
    this.gx.reset();
    this.gy.reset();
  }

  /**
   * @param lm landmarks of one hand (or null when no hand), normalised image coordinates
   * @param t  timestamp in ms
   * @param aspect frame width / height
   */
  update(lm: Point[] | null, t: number, aspect = 4 / 3): FrameResult {
    const events: GestureEvent[] = [];
    if (!lm) {
      // The hand left (e.g. lowered out of view): that was not a swipe down.
      this.pending = null;
      // Brief dropouts keep the state; a longer absence resets motion tracking.
      if (t - this.lastSeen > 400) {
        this.trail = [];
        this.armed = false;
        this.gesture = 'none';
        this.candidate = null;
        this.candidateCount = 0;
        this.holdStart = null;
        this.holdFired = false;
        this.pinching = false;
        this.fx.reset();
        this.fy.reset();
        this.gx.reset();
        this.gy.reset();
      }
      return {
        present: false,
        gesture: this.gesture,
        cursor: null,
        grip: null,
        pinchRatio: null,
        pinching: this.pinching,
        active: this.active,
        paused: this.paused,
        events,
      };
    }
    this.lastSeen = t;

    // --- Shape, with pinch hysteresis and a few frames of stability --------------------------
    const ratio = pinchRatio(lm, aspect);
    let raw = classify(lm, aspect, this.pinching ? this.s.pinchOff : this.s.pinchOn);
    if (this.pinching && raw !== 'fist' && ratio < this.s.pinchOff) raw = 'pinch';
    if (raw === this.candidate) this.candidateCount++;
    else {
      this.candidate = raw;
      this.candidateCount = 1;
    }
    const prev = this.gesture;
    if (this.candidateCount >= this.s.stableFrames && raw !== this.gesture) this.gesture = raw;
    const g = this.gesture;

    // --- Activation, pause, resume -----------------------------------------------------------
    if (g === 'open' && prev !== 'open') {
      if (!this.active) {
        this.active = true;
        events.push({ type: 'activated' });
      } else if (this.paused) {
        this.paused = false;
        events.push({ type: 'resumed' });
      }
    }
    if (g === 'fist' && prev !== 'fist' && this.active && !this.paused) {
      this.paused = true;
      this.pinching = false;
      events.push({ type: 'paused' });
    }
    const live = this.active && !this.paused;

    // --- Cursor (index fingertip, mirrored, smoothed, inner 70% of the frame mapped to screen) --
    const tip = lm[LM.indexTip]!;
    const mx = 1 - tip.x;
    const cx = clamp01((this.fx.filter(mx, t) - 0.15) / 0.7);
    const cy = clamp01((this.fy.filter(tip.y, t) - 0.15) / 0.7);
    const thumb = lm[LM.thumbTip]!;
    const gx = clamp01((this.gx.filter(1 - (tip.x + thumb.x) / 2, t) - 0.15) / 0.7);
    const gy = clamp01((this.gy.filter((tip.y + thumb.y) / 2, t) - 0.15) / 0.7);

    // --- Pinch: one event per pinch ----------------------------------------------------------
    // A pinch is deliberate, so it works straight away: it activates gestures if they weren't
    // yet, and resumes them if a fist (often formed on the way into a pinch) paused them.
    if (g === 'pinch' && !this.pinching) {
      if (!this.active) {
        this.active = true;
        events.push({ type: 'activated' });
      } else if (this.paused) {
        this.paused = false;
        events.push({ type: 'resumed' });
      }
      this.pinching = true;
      events.push({ type: 'pinch' });
    } else if (this.pinching && (g !== 'pinch' || ratio > this.s.pinchOff)) {
      this.pinching = false;
    }

    // --- Swipe -----------------------------------------------------------------------------------
    // Only an open palm's movement counts: a fist or pinch moving across starts nothing.
    const palm = palmCentre(lm);
    const px = 1 - palm.x;
    if (g === 'open') this.trail.push({ t, x: px, y: palm.y });
    else this.trail = [];
    while (this.trail.length && t - this.trail[0]!.t > this.s.swipeWindowMs) this.trail.shift();

    // Confirm a pending downward swipe if the hand is still in view.
    if (this.pending && t - this.pending.t >= 130) {
      this.pending = null;
      if (live) events.push({ type: 'swipe', dir: 'down' });
    }

    // Re-arm once the hand has (nearly) stopped and the cooldown has passed.
    if (!this.armed && t - this.lastSwipe.t > this.s.cooldownMs) {
      const recent = this.trail.filter((p) => t - p.t <= 220);
      if (recent.length > 1) {
        const a = recent[0]!;
        const b = recent[recent.length - 1]!;
        if (Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) < this.s.swipeDistance * 0.2)
          this.armed = true;
      }
    }

    if (live && this.armed && g === 'open' && !this.pinching && this.trail.length > 2) {
      const first = this.trail[0]!;
      const dx = px - first.x;
      const dy = palm.y - first.y;
      const slope = this.s.swipeMaxSlope;
      let dir: SwipeDir | null = null;
      if (Math.abs(dx) >= this.s.swipeDistance && Math.abs(dy) <= Math.abs(dx) * slope) {
        if (this.steady('x', dx)) dir = dx > 0 ? 'right' : 'left';
      } else if (
        // The frame is shorter than it is wide, so vertical travel needs a little less.
        Math.abs(dy) >= this.s.swipeDistance * 0.85 &&
        Math.abs(dx) <= Math.abs(dy) * slope
      ) {
        if (this.steady('y', dy)) dir = dy > 0 ? 'down' : 'up';
      }
      if (dir) {
        const isReturn = dir === OPPOSITE[this.lastSwipe.dir] && t - this.lastSwipe.t < this.s.returnGuardMs;
        if (!isReturn) {
          if (dir === 'down') this.pending = { t };
          else events.push({ type: 'swipe', dir });
          this.lastSwipe = { t, dir };
        }
        this.armed = false;
        this.trail = [];
      }
    }

    // --- Open palm held still -------------------------------------------------------------------
    if (g === 'open') {
      const recent = this.trail.filter((p) => t - p.t <= 300);
      const still =
        recent.length > 1 &&
        Math.abs(recent[recent.length - 1]!.x - recent[0]!.x) < 0.03 &&
        Math.abs(recent[recent.length - 1]!.y - recent[0]!.y) < 0.03;
      if (still) {
        this.holdStart ??= t;
        if (!this.holdFired && t - this.holdStart >= this.s.holdMs) {
          this.holdFired = true;
          events.push({ type: 'palm-hold' });
        }
      } else this.holdStart = null;
    } else {
      this.holdStart = null;
      this.holdFired = false;
    }

    return {
      present: true,
      gesture: g,
      cursor: { x: cx, y: cy },
      grip: { x: gx, y: gy },
      pinchRatio: ratio,
      pinching: this.pinching,
      active: this.active,
      paused: this.paused,
      events,
    };
  }

  /**
   * A real swipe is a movement over several frames in one direction. A tracking jump (the hand
   * lost and found elsewhere) is one big step, so it doesn't count.
   */
  private steady(axis: 'x' | 'y', delta: number) {
    const sign = Math.sign(delta);
    const minStep = this.s.swipeDistance / 15;
    let moving = 0;
    let along = 0;
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1]!;
      const b = this.trail[i]!;
      const step = b[axis] - a[axis];
      // A jump is faster than any arm (over 4 frame-widths a second), whatever the frame rate.
      const speed = Math.abs(step) / Math.max(0.001, (b.t - a.t) / 1000);
      if (Math.abs(step) > 0.12 && speed > 4) return false;
      if (Math.abs(step) < minStep) continue;
      moving++;
      if (Math.sign(step) === sign) along++;
    }
    return along >= 3 && along / moving >= 0.75;
  }
}

const OPPOSITE: Record<SwipeDir, SwipeDir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
