/**
 * Shared, mutable state between the page and the 3D keyboard (no React re-renders):
 * - `rise`: the empty keyboard settling in below the text (0 → 1, scroll driven)
 * - `want`: whether the keycaps should be in (1) or out (0); set by the scroll position
 * - `keys`: how far the keycap rain has got (0 → 1); the 3D scene eases it towards `want`
 * - `sweepAt`: when the last key landed (scene clock, s), for the light sweep
 * - `top`/`bottom`: free space for the keyboard inside the pinned screen (px from its top / bottom)
 */
export const flight = { rise: 1, want: 1, keys: 1, sweepAt: -10, top: 360, bottom: 20 };
