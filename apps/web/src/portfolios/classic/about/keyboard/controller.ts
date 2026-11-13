/**
 * Keyboard controller: the one place that presses and releases keys. The 3D keys read `pressed`
 * every frame (a key is down while its id is in the map), so nothing re-renders in React.
 */

/** Keys that are down right now, with the time each went down (ms). */
export const pressed = new Map<string, number>();

/** Typing activity, read by the knob and the lighting (0 to 1) and knob turns (radians). */
export const activity = { v: 0, knob: 0 };

const timers = new Map<string, number>();

export function pressKey(id: string) {
  window.clearTimeout(timers.get(id));
  timers.delete(id);
  pressed.set(id, performance.now());
}

export function releaseKey(id: string) {
  pressed.delete(id);
}

/** Press and release one key, held for `hold` ms. */
export function tapKey(id: string, hold = 90) {
  pressKey(id);
  timers.set(
    id,
    window.setTimeout(() => {
      timers.delete(id);
      releaseKey(id);
    }, hold),
  );
}

/** Hold several keys together (a modifier first), then release them in reverse order. */
export function pressCombination(ids: string[], hold = 110) {
  ids.forEach((id, i) => window.setTimeout(() => pressKey(id), i * 40));
  window.setTimeout(() => [...ids].reverse().forEach((id, i) => window.setTimeout(() => releaseKey(id), i * 30)), hold + ids.length * 40);
}

export function releaseAll() {
  timers.forEach((t) => window.clearTimeout(t));
  timers.clear();
  pressed.clear();
}
