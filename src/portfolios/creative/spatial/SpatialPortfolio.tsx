import { useCallback, useEffect, useMemo, useState } from 'react';
import { HouseScene } from './house/HouseScene';
import { IntroScene } from './intro/IntroScene';
import { CHAPTERS } from './story/chapters';
import { TOUR } from './story/tour';
import { playUi, spatial, useSpatial } from './store';
import { SpatialUI } from './ui/SpatialUI';
import './spatial.css';
import './dashboard.css';
import './story/story.css';
import './os/os.css';
import './os/scenes.css';
import './os/games/games.css';
import './os/tour.css';
import './os/vision.css';

/**
 * Creative: Shreyas's spatial home. Every time it opens (a refresh too) the headset splash plays,
 * then his dashboard floats in a realistic house. The house tour is one tap away on the button
 * in the bottom left corner. Mouse, touch, keyboard, voice and hands all work.
 */

export function SpatialPortfolio() {
  const env = useSpatial((s) => s.env);
  const tour = useSpatial((s) => s.tour);
  const phase = useSpatial((s) => s.phase);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const low = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  }, []);

  // The splash every time; people who prefer less motion go straight in.
  useEffect(() => {
    // (A `?station=` link is a development aid for room screenshots: no splash.)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(window.location.search).has('station');
    spatial.set({ phase: reduced ? 'house' : 'intro', room: 'living', chapter: 0, dock: true, tour: false, tourTarget: 0, tourIndex: 0 });
  }, []);

  const enter = useCallback(() => {
    spatial.set({ phase: 'house', room: 'living', chapter: 0 });
    playUi('enter');
  }, []);

  // Never leave anyone waiting: if a 3D file is slow, show the interface anyway.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 9000);
    return () => window.clearTimeout(t);
  }, []);

  const startTour = useCallback(() => spatial.startTour(), []);

  // Keyboard, wheel and touch. In the tour they walk through the house; otherwise arrows change
  // apps, 1–7 jump to an app and Escape steps back.
  useEffect(() => {
    const rooms = TOUR.length;
    let snap = 0;
    const settle = () => {
      window.clearTimeout(snap);
      // Come to rest in the nearest room shortly after the scrolling stops.
      snap = window.setTimeout(() => spatial.set({ tourTarget: Math.round(spatial.get().tourTarget) }), 420);
    };
    const nudge = (d: number) => {
      const s = spatial.get();
      spatial.set({ tourTarget: Math.max(0, Math.min(rooms - 1, s.tourTarget + d)) });
      settle();
    };
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || !!t.closest('[role="slider"]'));

    const onKey = (e: KeyboardEvent) => {
      const s = spatial.get();
      const t = e.target;
      if (typing(t)) return;
      if (s.video) return;
      // Walk mode: the camera handles the movement keys; Esc stops walking.
      if (s.walk) {
        if (e.key === 'Escape') spatial.endWalk();
        return;
      }
      // W anywhere starts walking.
      if (!s.tour && (e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        spatial.startWalk();
        e.preventDefault();
        return;
      }
      if (s.tour) {
        if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) spatial.tourStep(1, rooms);
        else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) spatial.tourStep(-1, rooms);
        else if (e.key === 'Escape') spatial.endTour('home');
        else if (e.key === 'Home') spatial.set({ tourTarget: 0 });
        else if (e.key === 'End') spatial.set({ tourTarget: rooms - 1 });
        else return;
        e.preventDefault();
        return;
      }
      const awards = CHAPTERS[s.chapter]?.id === 'awards';
      if (awards && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) window.dispatchEvent(new CustomEvent('os-awards', { detail: e.key === 'ArrowRight' ? 'next' : 'prev' }));
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') spatial.next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') spatial.prev();
      else if (e.key === 'Escape') {
        if (s.bubble) spatial.set({ bubble: false });
        else if (s.look360) spatial.set({ look360: false });
        else if (s.homeView || s.control) spatial.set({ homeView: false, control: false });
        else if (s.windows.length) spatial.closeWindow(s.windows[s.windows.length - 1]!);
        else spatial.goChapter(0);
      } else if (/^[1-7]$/.test(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const i = Number(e.key) - 1;
        if (CHAPTERS[i]) spatial.goChapter(i);
      } else return;
      e.preventDefault();
    };

    // Lists that scroll keep their own scroll.
    const scrollsItself = (el: EventTarget | null, dy: number) => {
      const box = el instanceof Element ? el.closest('.tour-body, .cb-list, .os-scroll, .ac-side, .w-pins, .ch-list, .ch-side') : null;
      if (box instanceof HTMLElement && box.scrollHeight > box.clientHeight + 2) return dy > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 2 : box.scrollTop > 0;
      return false;
    };
    // The nearest list under the pointer that can scroll this way.
    const scrollBoxAt = (el: EventTarget | null, dy: number) => {
      for (let n = el instanceof Element ? el : null; n && !n.classList.contains('sp'); n = n.parentElement) {
        if (!(n instanceof HTMLElement) || n.scrollHeight <= n.clientHeight + 2) continue;
        if (!/(auto|scroll)/.test(getComputedStyle(n).overflowY)) continue;
        if (dy > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0) return n;
      }
      return null;
    };
    const onWheel = (e: WheelEvent) => {
      const s = spatial.get();
      // Glass layers can stop the browser from scrolling a list under the pointer; if the list
      // did not move by the next frame, scroll it here instead.
      if (!s.tour || scrollsItself(e.target, e.deltaY)) {
        const box = scrollBoxAt(e.target, e.deltaY);
        if (box) {
          const before = box.scrollTop;
          const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
          requestAnimationFrame(() => {
            if (box.scrollTop === before) box.scrollBy({ top: dy, behavior: 'smooth' });
          });
        }
      }
      if (!s.tour || s.walk || scrollsItself(e.target, e.deltaY)) return;
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      nudge(Math.max(-0.6, Math.min(0.6, d / 700)));
    };
    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0]?.clientY ?? null);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY === null || y === undefined || !spatial.get().tour || scrollsItself(e.target, touchY - y)) return;
      nudge((touchY - y) / 380);
      touchY = y;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.clearTimeout(snap);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const onProgress = useCallback((p: number, done: boolean) => {
    setProgress(p);
    if (done) setReady(true);
  }, []);

  return (
    // data-lenis-prevent: the site's smooth scroll would otherwise take every wheel event, so lists
    // inside the house (pinboard, activities, chat, the tour card) could not scroll with a mouse.
    <div className={`sp ${phase === 'house' ? 'is-house' : 'is-intro'} env-${env} ${tour ? 'is-touring' : ''}`} data-lenis-prevent>
      <div className="sp-house" aria-hidden={phase !== 'house'}>
        <HouseScene low={low} live={phase === 'house'} onProgress={onProgress} onReady={() => setReady(true)} />
      </div>
      <div className="sp-visor" aria-hidden="true" />
      {phase === 'intro' && <IntroScene ready={ready} progress={progress} onDone={enter} />}
      {phase === 'house' && ready && <SpatialUI replayIntro={startTour} />}
      {phase === 'house' && !ready && (
        <div className="sp-loader" role="status">
          <b>Shreyas’s home</b>
          <span className="sp-loader-bar">
            <i style={{ transform: `scaleX(${Math.max(0.04, progress / 100)})` }} />
          </span>
          <small>Opening the house · {Math.round(progress)}%</small>
        </div>
      )}
    </div>
  );
}
