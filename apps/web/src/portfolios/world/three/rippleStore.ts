/** Shared trigger for the water-ripple transition (no three.js import, so the page can use it). */
export const ripple = {
  t0: -1,
  x: 0.5,
  y: 0.5,
  /** Start a ripple at a screen point (0–1, origin bottom-left). */
  trigger(x = 0.5, y = 0.45) {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.x = x;
    this.y = y;
    this.t0 = performance.now();
  },
};

