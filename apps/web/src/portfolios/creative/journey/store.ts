import { useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { CHAPTERS } from '@/content/journeyChapters';

/**
 * One store for the whole scene: `progress` runs continuously from 0 (chapter 1) to 8
 * (chapter 9). Every part reads it, so nothing keeps its own copy of the state. In Phase 1 a
 * short eased tween drives it; Phase 2 hands it to the scroll timeline.
 */

export const LAST = CHAPTERS.length - 1;

let progress = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const journey = {
  get: () => progress,
  set(p: number) {
    const next = Math.max(0, Math.min(LAST, p));
    if (next === progress) return;
    progress = next;
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const proxy = { p: 0 };
let tween: gsap.core.Tween | null = null;

/** Glide to a chapter (Phase 1 stand-in for scrolling to its label). */
export function goToChapter(i: number, opts: { instant?: boolean } = {}) {
  const to = Math.max(0, Math.min(LAST, Math.round(i)));
  tween?.kill();
  proxy.p = journey.get();
  if (opts.instant) {
    journey.set(to);
    return;
  }
  const steps = Math.abs(to - proxy.p);
  tween = gsap.to(proxy, {
    p: to,
    duration: Math.min(0.9 + (steps - 1) * 0.18, 1.8),
    ease: 'power3.inOut',
    onUpdate: () => journey.set(proxy.p),
  });
}

export const useProgress = () => useSyncExternalStore(journey.subscribe, journey.get, () => 0);
/** Active chapter index; components using only this re-render once per chapter. */
export const useActive = () =>
  useSyncExternalStore(
    journey.subscribe,
    () => Math.round(journey.get()),
    () => 0,
  );
