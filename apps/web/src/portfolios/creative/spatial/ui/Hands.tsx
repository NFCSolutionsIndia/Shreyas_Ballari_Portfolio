import { useEffect, useRef, useState } from 'react';
import { HandTrackingEngine, INITIAL_STATE, type TrackingState } from '@/features/gestures/engine';
import type { FrameResult } from '@/features/gestures/recognizer';
import { CHAPTERS } from '../story/chapters';
import { TOUR } from '../story/tour';
import { playUi, spatial } from '../store';

/**
 * Hand mode: real browser hand tracking (MediaPipe Tasks Vision), started only after the visitor
 * reads what it does and agrees. The video never leaves the device and nothing is recorded.
 *
 * - Point: a cursor follows your index finger. Only the middle of the camera's view is used, so
 *   reaching the edges of the screen is comfortable.
 * - Pinch: select what the cursor is on. The cursor freezes where it was the moment you pinch,
 *   so it does not slide off small buttons.
 * - Hold still on a button for a second: it is selected too (a ring fills on the cursor). A
 *   backup for when a pinch is hard to read.
 * - Pinch and move: drag a card, scroll a list, turn the 360° view, or walk the house tour.
 * - Swipe left / right: next / previous (room in the tour, award in Awards, otherwise app).
 * - Hold an open palm: show or hide the app rail.
 * Mouse, touch and keyboard keep working throughout.
 */

const TARGETS = 'button, a, input, textarea, [data-drag], [role="tab"], [role="switch"], [data-card], .sr-lane';
const DWELL_MS = 1100;
const MOVE_PX = 22;

/** Use the middle of the camera's view for the whole screen. */
const comfort = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

function scroller(el: Element | null): HTMLElement | null {
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 2) return n;
  }
  return null;
}

export function Hands({ on, onOff }: { on: boolean; onOff: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const engine = useRef<HandTrackingEngine | null>(null);
  const [consent, setConsent] = useState(false);
  const [st, setSt] = useState<TrackingState>(INITIAL_STATE);

  useEffect(() => {
    if (!on) {
      engine.current?.stop();
      engine.current = null;
      setConsent(false);
      setSt(INITIAL_STATE);
      return;
    }
    if (!consent || !video.current) return;

    const fire = (type: string, el: EventTarget, x: number, y: number) =>
      el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 77, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));

    /** Last pointing position (before any pinch), in pixels. */
    const aim = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let hover: Element | null = null;
    let dwell: { el: Element; t0: number; x: number; y: number; done: boolean } | null = null;
    let pinch: null | {
      el: Element | null;
      x: number;
      y: number;
      /** Grip position when the pinch began (drag deltas are measured from here). */
      gx: number;
      gy: number;
      lx: number;
      ly: number;
      moved: boolean;
      mode: 'tap' | 'drag' | 'scroll' | 'look' | 'tour';
      box: HTMLElement | null;
    } = null;

    const setHover = (el: Element | null) => {
      if (el === hover) return;
      hover?.classList.remove('sp-hand-hover');
      el?.classList.add('sp-hand-hover');
      hover = el;
    };
    const select = (el: Element, x: number, y: number) => {
      playUi('tap');
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.focus();
        return;
      }
      if (el.matches('[data-drag]')) {
        // A pinch-tap on a draggable card opens it (its own tap handler).
        fire('pointerdown', el, x, y);
        fire('pointerup', el, x, y);
        return;
      }
      if (el.matches('.sr-lane')) {
        fire('pointerdown', el, x, y);
        return;
      }
      (el as HTMLElement).click();
    };

    const eng = new HandTrackingEngine(video.current, {
      onState: (s) => setSt(s),
      onFrame: (r: FrameResult) => {
        const c = cursor.current;
        if (!c) return;
        const raw = r.pinching && pinch ? (r.grip ?? r.cursor) : r.cursor;
        c.style.opacity = r.present && raw ? '1' : '0';
        if (!raw) {
          setHover(null);
          dwell = null;
          c.style.setProperty('--dwell', '0');
          return;
        }
        const px = comfort(raw.x, 0.12, 0.88) * window.innerWidth;
        const py = comfort(raw.y, 0.1, 0.82) * window.innerHeight;

        // --- Holding a pinch: drag, scroll, turn or walk ------------------------------------
        if (pinch && r.pinching) {
          if (Number.isNaN(pinch.gx)) {
            pinch.gx = px;
            pinch.gy = py;
          }
          const dx = px - pinch.gx;
          const dy = py - pinch.gy;
          if (!pinch.moved && Math.hypot(dx, dy) > MOVE_PX) {
            pinch.moved = true;
            if (pinch.mode === 'tap' && pinch.box) pinch.mode = 'scroll';
          }
          const x = pinch.x + dx;
          const y = pinch.y + dy;
          c.style.transform = `translate3d(${x}px, ${y}px, 0) scale(0.7)`;
          if (pinch.moved) {
            if (pinch.mode === 'drag' && pinch.el) fire('pointermove', pinch.el, x, y);
            else if (pinch.mode === 'look') fire('pointermove', document, x, y);
            else if (pinch.mode === 'scroll' && pinch.box) pinch.box.scrollTop -= (y - pinch.ly) * 1.6;
            else if (pinch.mode === 'tour') {
              const s = spatial.get();
              spatial.set({ tourTarget: Math.max(0, Math.min(TOUR.length - 1, s.tourTarget - (y - pinch.ly) / 260)) });
            }
          }
          pinch.lx = x;
          pinch.ly = y;
          return;
        }

        // --- Pinch released ------------------------------------------------------------------
        if (pinch && !r.pinching) {
          const p = pinch;
          pinch = null;
          if (p.mode === 'drag' && p.el) fire('pointerup', p.el, p.lx, p.ly);
          else if (p.mode === 'look') fire('pointerup', document, p.lx, p.ly);
          else if (p.mode === 'tour') spatial.set({ tourTarget: Math.round(spatial.get().tourTarget) });
          else if (!p.moved) {
            if (p.el) select(p.el, p.x, p.y);
            else {
              // A pinch over a canvas (Cell Defender): a real tap at the cursor.
              const target = document.elementFromPoint(p.x, p.y);
              if (target instanceof HTMLCanvasElement) {
                fire('pointerdown', target, p.x, p.y);
                fire('pointerup', target, p.x, p.y);
                playUi('tap');
              }
            }
          }
          return;
        }

        // --- Pointing ----------------------------------------------------------------------
        aim.x = px;
        aim.y = py;
        c.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        const under = document.elementFromPoint(px, py)?.closest(TARGETS) ?? null;
        setHover(under);
        // Hold still on something selectable to select it.
        const now = performance.now();
        if (under && !under.matches('[data-drag], canvas')) {
          if (!dwell || dwell.el !== under) dwell = { el: under, t0: now, x: px, y: py, done: false };
          else if (Math.hypot(px - dwell.x, py - dwell.y) > 40) dwell = { el: under, t0: now, x: px, y: py, done: false };
          const f = dwell.done ? 0 : Math.min(1, (now - dwell.t0) / DWELL_MS);
          c.style.setProperty('--dwell', String(f));
          if (f >= 1 && !dwell.done) {
            dwell.done = true;
            c.style.setProperty('--dwell', '0');
            select(under, px, py);
          }
        } else {
          dwell = null;
          c.style.setProperty('--dwell', '0');
        }
        c.classList.toggle('is-pinch', r.pinching);
      },
      onEvent: (e) => {
        const s = spatial.get();
        if (e.type === 'pinch') {
          // Freeze on the point you were aiming at when the pinch began.
          const x = aim.x;
          const y = aim.y;
          const hit = document.elementFromPoint(x, y);
          const el = hit?.closest(TARGETS) ?? null;
          let mode: 'tap' | 'drag' | 'scroll' | 'look' | 'tour' = 'tap';
          if (el?.matches('[data-drag]')) mode = 'drag';
          else if (!el && s.look360) mode = 'look';
          else if (!el && s.tour) mode = 'tour';
          dwell = null;
          pinch = { el, x, y, gx: NaN, gy: NaN, lx: x, ly: y, moved: false, mode, box: el ? null : scroller(hit ?? null) };
          if (mode === 'drag' && el) fire('pointerdown', el, x, y);
          if (mode === 'look') fire('pointerdown', document.body, x, y);
          return;
        }
        if (e.type === 'swipe') {
          if (pinch) return;
          if (s.tour && (e.dir === 'left' || e.dir === 'right' || e.dir === 'up' || e.dir === 'down')) {
            const d = e.dir === 'left' || e.dir === 'up' ? 1 : -1;
            spatial.tourStep(d as 1 | -1, TOUR.length);
            spatial.toast(d > 0 ? 'Swipe: next room' : 'Swipe: previous room');
          } else if (e.dir === 'left' || e.dir === 'right') {
            if (CHAPTERS[s.chapter]?.id === 'awards') {
              window.dispatchEvent(new CustomEvent('os-awards', { detail: e.dir === 'left' ? 'next' : 'prev' }));
              spatial.toast(e.dir === 'left' ? 'Swipe: next award' : 'Swipe: previous award');
            } else {
              spatial.step(e.dir === 'left' ? 1 : -1);
              spatial.toast(e.dir === 'left' ? 'Swipe: next app' : 'Swipe: previous app');
            }
          }
          return;
        }
        if (e.type === 'palm-hold' && !s.tour) spatial.set({ dock: !s.dock });
      },
    });
    engine.current = eng;
    void eng.start();
    return () => {
      eng.stop();
      hover?.classList.remove('sp-hand-hover');
    };
  }, [on, consent]);

  if (!on) return null;
  return (
    <>
      <video ref={video} className="sp-hands-video" playsInline muted aria-hidden="true" />
      <div ref={cursor} className="sp-hand-cursor" aria-hidden="true">
        <span className="sp-hand-dwell" />
      </div>
      {!consent ? (
        <div className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-hands-h">
          <div className="sp-modal-glass">
            <h2 id="sp-hands-h">Use your hands</h2>
            <p>Your camera follows your hand so you can move through the home without touching anything. The video stays on this device: nothing is recorded or sent anywhere. You can turn it off at any time.</p>
            <ul className="sp-gestures">
              <li><b>Point</b> with your index finger to move the cursor</li>
              <li><b>Pinch</b> (thumb to index) to select, or <b>hold still</b> on a button for a second</li>
              <li><b>Pinch and move</b> to drag a card, scroll, turn the 360° view or walk the tour</li>
              <li><b>Swipe</b> left or right for the next or previous room, award or app</li>
              <li><b>Hold an open palm</b> to show or hide the apps</li>
            </ul>
            <p className="sp-modal-tip">Tip: sit about an arm’s length from the camera, in good light, with your hand in the middle of the picture.</p>
            <div className="sp-modal-actions">
              <button type="button" className="sp-btn" onClick={onOff}>
                Not now
              </button>
              <button type="button" className="sp-btn is-primary" onClick={() => setConsent(true)}>
                Turn on the camera
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className={`sp-hands-status is-${st.status}`} role="status">
          {st.status === 'ready' ? (st.present ? (st.pinching ? 'Pinch' : 'Hand found · point, pinch or hold still') : 'Show your hand to the camera') : (st.message ?? 'Starting the camera…')}
        </p>
      )}
    </>
  );
}
