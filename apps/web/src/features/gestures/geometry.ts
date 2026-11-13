/**
 * Hand-shape maths on MediaPipe's 21 hand landmarks (normalised image coordinates).
 *   0 wrist · thumb 1–4 · index 5–8 · middle 9–12 · ring 13–16 · pinky 17–20
 * All distances are measured in the image plane with x scaled by the frame's aspect ratio, and
 * divided by the hand's own size, so they work at any distance from the camera.
 */

export interface Point {
  x: number;
  y: number;
  z?: number;
}

export type HandShape = 'open' | 'fist' | 'pinch' | 'point' | 'unknown';

export const LM = {
  wrist: 0,
  thumbIp: 3,
  thumbTip: 4,
  indexMcp: 5,
  indexPip: 6,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringTip: 16,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyTip: 20,
} as const;

const FINGERS = [
  [LM.indexPip, LM.indexTip],
  [LM.middlePip, LM.middleTip],
  [LM.ringPip, LM.ringTip],
  [LM.pinkyPip, LM.pinkyTip],
] as const;

export function dist(a: Point, b: Point, aspect = 1) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

/** Wrist to middle-finger knuckle: a stable measure of how big the hand appears. */
export function handScale(lm: Point[], aspect = 1) {
  return Math.max(1e-6, dist(lm[LM.wrist]!, lm[LM.middleMcp]!, aspect));
}

/** A finger is extended when its tip is clearly further from the wrist than its middle joint. */
export function fingerExtended(lm: Point[], pip: number, tip: number, aspect = 1) {
  const w = lm[LM.wrist]!;
  return dist(w, lm[tip]!, aspect) > dist(w, lm[pip]!, aspect) * 1.12;
}

export function extendedFingers(lm: Point[], aspect = 1) {
  return FINGERS.filter(([pip, tip]) => fingerExtended(lm, pip, tip, aspect)).length;
}

export function thumbExtended(lm: Point[], aspect = 1) {
  return dist(lm[LM.thumbTip]!, lm[LM.indexMcp]!, aspect) / handScale(lm, aspect) > 0.55;
}

/** Thumb tip to index tip, relative to hand size. ~0.1 when touching, >0.6 when apart. */
export function pinchRatio(lm: Point[], aspect = 1) {
  return dist(lm[LM.thumbTip]!, lm[LM.indexTip]!, aspect) / handScale(lm, aspect);
}

/** Average distance of the four fingertips from the palm centre, relative to hand size. */
export function curl(lm: Point[], aspect = 1) {
  const c = palmCentre(lm);
  const tips = [LM.indexTip, LM.middleTip, LM.ringTip, LM.pinkyTip];
  return (
    tips.reduce((s, t) => s + dist(lm[t]!, c, aspect), 0) / tips.length / handScale(lm, aspect)
  );
}

/** Centre of the palm: wrist and the four knuckles. Steadier than any single point. */
export function palmCentre(lm: Point[]): Point {
  const ids: number[] = [LM.wrist, LM.indexMcp, LM.middleMcp, LM.ringMcp, LM.pinkyMcp];
  return {
    x: ids.reduce((s, i) => s + lm[i]!.x, 0) / ids.length,
    y: ids.reduce((s, i) => s + lm[i]!.y, 0) / ids.length,
  };
}

/**
 * The raw shape of one frame. `pinchOn` is the threshold for a pinch (the recogniser adds
 * hysteresis on top so a pinch doesn't flicker).
 */
/** Index fingertip distance from the palm centre, relative to hand size (~0.4 curled in a fist). */
export function indexReach(lm: Point[], aspect = 1) {
  return dist(lm[LM.indexTip]!, palmCentre(lm), aspect) / handScale(lm, aspect);
}

export function classify(lm: Point[], aspect = 1, pinchOn = 0.33): HandShape {
  if (lm.length < 21) return 'unknown';
  const ext = extendedFingers(lm, aspect);
  const pinch = pinchRatio(lm, aspect);
  // Pinch first: thumb tip on index tip, with the index reaching out from the palm. The other
  // fingers may be open or curled (most people curl them), so they are not checked; in a fist
  // the index tip is tucked into the palm instead.
  if (pinch < pinchOn && indexReach(lm, aspect) > 0.62) return 'pinch';
  if (ext === 0 && curl(lm, aspect) < 0.95) return 'fist';
  if (ext >= 4 && pinch > 0.5) return 'open';
  if (ext === 1 && fingerExtended(lm, LM.indexPip, LM.indexTip, aspect)) return 'point';
  return 'unknown';
}
