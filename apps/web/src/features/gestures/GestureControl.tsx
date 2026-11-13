import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowsDownUp,
  ArrowsInSimple,
  ArrowsOutSimple,
  CursorClick,
  HandFist,
  HandPalm,
  HandPointing,
  HandTap,
  HandWaving,
  VideoCamera,
  VideoCameraSlash,
  X,
} from '@phosphor-icons/react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { cn } from '@/lib/cn';
import { HandTrackingEngine, INITIAL_STATE, type TrackingState } from './engine';
import { RubberPage } from './rubber/RubberPage';
import { SENSITIVITY, type FrameResult, type GestureEvent, type SwipeDir } from './recognizer';
import './gestures.css';

type Level = keyof typeof SENSITIVITY;

const GESTURE_NAME: Record<TrackingState['gesture'], string> = {
  none: 'None',
  open: 'Open palm',
  fist: 'Closed fist',
  pinch: 'Pinch',
  point: 'Pointing',
  unknown: 'Hand',
};

const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const;

const SELECTABLE = 'a[href], button:not([disabled]), [role="tab"], [data-gesture-target]';

/** Resting the cursor on a button for this long clicks it. */
const DWELL_MS = 1100;
/** The cursor may wobble this far (px) while resting. */
const DWELL_SLACK = 46;
const TRAIL = 5;
const PROMPTED_KEY = 'gesture-prompted';

/** Window event that opens the gesture dialog from anywhere on the page. */
export const OPEN_GESTURES = 'gestures:open';

interface GestureControlProps {
  /** Section labels in order, for the "Next: …" feedback. */
  sections: readonly string[];
  index: number;
  onNext: () => void;
  onPrev: () => void;
  /** How long after the page opens to offer the camera (wait for any intro to finish). */
  promptDelay?: number;
}

/**
 * "Explore with Hand Gestures": real MediaPipe hand tracking, off until the visitor asks for it.
 * Open palm activates, moving the hand up or down (or sideways) moves between sections, resting
 * the cursor on a button (or pinching) clicks it, a fist pauses, and holding an open palm still
 * shows the gesture guide.
 */
export function GestureControl({
  sections,
  index,
  onNext,
  onPrev,
  promptDelay = 1400,
}: GestureControlProps) {
  const [state, setState] = useState<TrackingState>(INITIAL_STATE);
  const [consent, setConsent] = useState(false);
  const [on, setOn] = useState(false);
  const [hint, setHint] = useState(false);
  const [compact, setCompact] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [whoosh, setWhoosh] = useState<{
    id: number;
    dir: SwipeDir;
    label: string;
    n: string;
  } | null>(null);
  const [level, setLevel] = useState<Level>(() => {
    try {
      const v = localStorage.getItem('gesture-sensitivity');
      return v === 'low' || v === 'high' ? v : 'medium';
    } catch {
      return 'medium';
    }
  });
  const [touchOnly, setTouchOnly] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const trail = useRef<(HTMLDivElement | null)[]>([]);
  const engine = useRef<HandTrackingEngine | null>(null);
  /** The page as a rubber sheet: pinch grabs it, moving stretches it, opening the hand lets go. */
  const rubber = useRef<RubberPage | null>(null);
  const grabbing = useRef(false);
  const [held, setHeld] = useState(false);
  const hovered = useRef<Element | null>(null);
  const meter = useRef<HTMLElement>(null);
  const levelRef = useRef<Level>('medium');
  const nav = useRef({ sections, index, onNext, onPrev });
  nav.current = { sections, index, onNext, onPrev };
  const toastTimer = useRef(0);
  const hintTimer = useRef(0);
  const whooshTimer = useRef(0);
  const effects = useRef<HTMLDivElement>(null);
  /** Dwell-to-click: the element being rested on, since when, and where the rest began. */
  const dwell = useRef<{ el: Element | null; start: number; x: number; y: number; done: boolean }>({
    el: null,
    start: 0,
    x: 0,
    y: 0,
    done: false,
  });
  /** After a page move, things slide under a still cursor: no dwell until the hand moves again. */
  const dwellBlock = useRef<{ at: number; x: number | null; y: number }>({ at: -1, x: null, y: 0 });

  useEffect(
    () => setTouchOnly(window.matchMedia('(hover: none) and (pointer: coarse)').matches),
    [],
  );

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  // The rubber sheet exists from the start, so Shift + mouse drag can try it without a camera.
  useEffect(() => {
    const rb = (rubber.current ??= new RubberPage());
    let mouse = false;
    const down = (e: PointerEvent) => {
      if (!e.shiftKey || e.button !== 0 || e.pointerType !== 'mouse' || grabbing.current) return;
      e.preventDefault();
      mouse = true;
      rb.grab({ x: e.clientX, y: e.clientY });
      setHeld(true);
    };
    const move = (e: PointerEvent) => mouse && rb.move({ x: e.clientX, y: e.clientY });
    const up = () => {
      if (!mouse) return;
      mouse = false;
      rb.release();
      setHeld(false);
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
  }, []);

  // Offer the camera once per visit, a moment after the page opens (never on phones; the camera
  // itself still only starts when the visitor says yes).
  useEffect(() => {
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
    try {
      if (sessionStorage.getItem(PROMPTED_KEY)) return;
    } catch {
      // Storage blocked: show it anyway.
    }
    const id = window.setTimeout(() => {
      try {
        sessionStorage.setItem(PROMPTED_KEY, '1');
      } catch {
        // Storage blocked.
      }
      if (!engine.current) setConsent(true);
    }, promptDelay);
    return () => window.clearTimeout(id);
  }, [promptDelay]);

  // Other parts of the page can open the dialog: window.dispatchEvent(new Event(OPEN_GESTURES)).
  useEffect(() => {
    const open = () => setConsent(true);
    window.addEventListener(OPEN_GESTURES, open);
    return () => window.removeEventListener(OPEN_GESTURES, open);
  }, []);

  const say = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  /** Sparks that burst out from the point of a click. */
  const burst = (x: number, y: number) => {
    const host = effects.current;
    if (!host) return;
    const b = document.createElement('div');
    b.className = 'gesture-burst';
    b.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('i');
      spark.style.setProperty('--a', `${i * 45}deg`);
      b.appendChild(spark);
    }
    host.appendChild(b);
    window.setTimeout(() => b.remove(), 750);
  };

  const press = useCallback(
    (el: Element | null) => {
      if (!(el instanceof HTMLElement) || !el.isConnected) return false;
      const rect = el.getBoundingClientRect();
      const c = cursor.current;
      const m = c?.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
      burst(m ? +m[1]! : rect.left + rect.width / 2, m ? +m[2]! : rect.top + rect.height / 2);
      c?.classList.add('is-click');
      window.setTimeout(() => c?.classList.remove('is-click'), 320);
      el.setAttribute('data-gesture-pressed', '');
      window.setTimeout(() => el.removeAttribute('data-gesture-pressed'), 650);
      el.focus({ preventScroll: true });
      el.click();
      say(`Opened: ${(el.getAttribute('aria-label') || el.textContent || 'item').trim().slice(0, 40)}`);
      return true;
    },
    [say],
  );

  const hoverSince = useRef(0);
  const setHover = (el: Element | null) => {
    const now = performance.now();
    if (hovered.current === el) return;
    hovered.current?.removeAttribute('data-gesture-hover');
    el?.setAttribute('data-gesture-hover', '');
    hovered.current = el;
    hoverSince.current = now;
  };

  // --- Per-frame: cursor, hover target, skeleton (no React state) ----------------------------
  const onFrame = useCallback((r: FrameResult, lm: NormalizedLandmark[] | null) => {
    // Rubber page: grab on pinch (at the thumb–index midpoint), follow while pinched, let go when
    // the hand opens or leaves.
    const rb = rubber.current;
    const grip = r.grip ? { x: r.grip.x * window.innerWidth, y: r.grip.y * window.innerHeight } : null;
    if (rb) {
      if (r.present && r.pinching && grip && r.active && !r.paused) {
        if (!grabbing.current) {
          rb.grab(grip);
          grabbing.current = true;
          setHeld(true);
          setHover(null);
          dwell.current.el = null;
        } else rb.move(grip);
      } else if (grabbing.current) {
        rb.release();
        grabbing.current = false;
        setHeld(false);
        // The page springs back under a still cursor: don't let that count as resting on a button.
        dwellBlock.current = { at: performance.now(), x: null, y: 0 };
      }
    }

    const c = cursor.current;
    if (c) {
      const show = r.present && r.cursor;
      c.dataset.visible = show ? 'true' : 'false';
      c.classList.toggle('is-grab', grabbing.current);
      // Pinch meter: full when thumb and index are close enough to grab.
      const m = meter.current;
      if (m) {
        const on = SENSITIVITY[levelRef.current].pinchOn;
        const fill = r.pinchRatio === null ? 0 : (1.1 - r.pinchRatio) / (1.1 - on);
        m.style.transform = `scaleX(${Math.min(1, Math.max(0, fill)).toFixed(3)})`;
        m.classList.toggle('is-on', r.pinching);
      }
      if (show && grabbing.current && rb) {
        // The glow sits on the grabbed spot of the page, so the bend carries it to the hand.
        const a = rb.anchor;
        const transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
        c.style.transform = transform;
        trail.current.forEach((t) => t && (t.style.transform = transform));
        c.style.setProperty('--dwell', '0');
      } else if (show) {
        const x = r.cursor!.x * window.innerWidth;
        const y = r.cursor!.y * window.innerHeight;
        const transform = `translate3d(${x}px, ${y}px, 0)`;
        c.style.transform = transform;
        trail.current.forEach((t) => t && (t.style.transform = transform));
        const now = performance.now();
        c.classList.toggle('is-pinch', r.pinching);
        c.classList.toggle('is-paused', r.paused || !r.active);
        // What would a pinch click? Look under the cursor (ignoring the cursor itself).
        const under = document.elementFromPoint(x, y)?.closest(SELECTABLE) ?? null;
        setHover(r.active && !r.paused ? under : null);
        c.classList.toggle('is-target', !!hovered.current);

        // Dwell to click: rest the cursor on a button, the ring fills, then it clicks.
        const blk = dwellBlock.current;
        if (blk.at >= 0) {
          if (now - blk.at < 1200) blk.x = null;
          else if (blk.x === null) {
            blk.x = x;
            blk.y = y;
          } else if (Math.hypot(x - blk.x, y - blk.y) > 30) blk.at = -1;
        }
        const d = dwell.current;
        const canDwell = r.active && !r.paused && !r.pinching && r.gesture !== 'fist' && blk.at < 0;
        const el = canDwell ? hovered.current : null;
        if (!el) {
          d.el = null;
          d.done = false;
        } else if (el !== d.el || Math.hypot(x - d.x, y - d.y) > DWELL_SLACK) {
          // A new target, or the hand moved on: start resting again from here.
          if (el !== d.el) d.done = false;
          Object.assign(d, { el, start: now, x, y });
        }
        const progress =
          d.el && !d.done ? Math.min(1, Math.max(0, (now - d.start - 150) / DWELL_MS)) : 0;
        c.style.setProperty('--dwell', progress.toFixed(3));
        if (d.el && !d.done && progress >= 1) {
          d.done = true;
          press(d.el);
        }
      } else {
        setHover(null);
        dwell.current.el = null;
        c.style.setProperty('--dwell', '0');
      }
      trail.current.forEach((t) => t && (t.dataset.visible = c.dataset.visible));
    }
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (cv && ctx) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (lm) {
        const P = (i: number) => [(1 - lm[i]!.x) * cv.width, lm[i]!.y * cv.height] as const;
        ctx.strokeStyle = r.paused ? 'rgba(255,255,255,0.5)' : '#8aa2ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [a, b] of CONNECTIONS) {
          ctx.moveTo(...P(a));
          ctx.lineTo(...P(b));
        }
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 21; i++) {
          const [x, y] = P(i);
          ctx.beginPath();
          ctx.arc(x, y, i === 8 || i === 4 ? 3.2 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [press]);

  const onEvent = useCallback(
    (e: GestureEvent) => {
      const n = nav.current;
      switch (e.type) {
        case 'activated':
          say('Gesture navigation on');
          break;
        case 'paused':
          say('Paused. Open your palm to resume');
          break;
        case 'resumed':
          say('Resumed');
          break;
        case 'swipe': {
          const forward = e.dir === 'right' || e.dir === 'down';
          const to = forward ? n.index + 1 : n.index - 1;
          dwellBlock.current = { at: performance.now(), x: null, y: 0 };
          dwell.current.el = null;
          if (to < 0 || to >= n.sections.length) {
            say(forward ? 'This is the last section' : 'This is the first section');
            break;
          }
          if (forward) n.onNext();
          else n.onPrev();
          window.clearTimeout(whooshTimer.current);
          setWhoosh({
            id: Date.now(),
            dir: e.dir,
            label: n.sections[to]!,
            n: `${String(to + 1).padStart(2, '0')} / ${String(n.sections.length).padStart(2, '0')}`,
          });
          whooshTimer.current = window.setTimeout(() => setWhoosh(null), 1150);
          break;
        }
        case 'pinch':
          // The pinch grabs the page; the stretch itself is driven frame by frame in onFrame.
          break;
        case 'palm-hold':
          setHint(true);
          window.clearTimeout(hintTimer.current);
          hintTimer.current = window.setTimeout(() => setHint(false), 4500);
          break;
      }
    },
    [say, press],
  );

  const enable = async () => {
    setConsent(false);
    setOn(true);
    if (!video.current) return;
    engine.current?.stop();
    const eng = new HandTrackingEngine(
      video.current,
      { onState: setState, onFrame, onEvent },
      SENSITIVITY[level],
    );
    engine.current = eng;
    await eng.start();
  };

  const disable = useCallback(() => {
    engine.current?.stop();
    rubber.current?.reset();
    grabbing.current = false;
    setHeld(false);
    engine.current = null;
    setHover(null);
    setOn(false);
    setHint(false);
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => engine.current?.setSensitivity(SENSITIVITY[level]), [level]);
  useEffect(() => {
    try {
      localStorage.setItem('gesture-sensitivity', level);
    } catch {
      // Storage blocked: the setting lasts for this visit.
    }
  }, [level]);

  // Turn the camera off when leaving the page or this portfolio.
  useEffect(
    () => () => {
      engine.current?.stop();
      rubber.current?.destroy();
      rubber.current = null;
      hovered.current?.removeAttribute('data-gesture-hover');
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(hintTimer.current);
      window.clearTimeout(whooshTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!consent) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConsent(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [consent]);

  const s = state;
  const failed =
    s.status === 'denied' ||
    s.status === 'unavailable' ||
    s.status === 'disconnected' ||
    s.status === 'error';
  const title =
    s.status === 'loading'
      ? 'Starting hand tracking'
      : s.status === 'ready'
        ? s.paused
          ? 'Gestures paused'
          : 'Hand tracking active'
        : s.status === 'denied'
          ? 'Camera permission denied'
          : s.status === 'unavailable'
            ? 'Camera unavailable'
            : s.status === 'disconnected'
              ? 'Camera disconnected'
              : 'Hand tracking stopped';
  const instruction = !s.present
    ? 'Raise one hand in front of the camera.'
    : !s.active
      ? 'Show an open palm to start.'
      : s.paused
        ? 'Paused. Open your palm to resume.'
        : 'Move your open hand up or down to scroll. Rest on a button to click it. Pinch and move to stretch the page.';

  return (
    <>
      {/* Launcher */}
      {!on && (
        <button
          type="button"
          className="gesture-launch"
          onClick={() => setConsent(true)}
          aria-haspopup="dialog"
        >
          <HandWaving size={18} weight="duotone" aria-hidden="true" />
          Explore with Hand Gestures
        </button>
      )}

      {/* Consent */}
      {consent && (
        <div className="gesture-scrim" onClick={() => setConsent(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gesture-consent-title"
            className="gesture-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="gesture-x"
              onClick={() => setConsent(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <p className="gesture-eyebrow">Hand gestures</p>
            <h2 id="gesture-consent-title" className="gesture-dialog-title">
              Explore with your hands
            </h2>
            {touchOnly ? (
              <p className="gesture-dialog-text">
                Hand gestures need a laptop or desktop webcam. On a phone, swipe the card ring or
                use the section links; everything works the same.
              </p>
            ) : (
              <>
                <p className="gesture-dialog-text">
                  This uses your camera to follow one hand, so you can move through the portfolio
                  without a mouse. Your browser will ask for camera permission.
                </p>
                <ul className="gesture-dialog-list">
                  <li>
                    Video is processed on this device only. Nothing is recorded, stored or uploaded.
                  </li>
                  <li>
                    The hand-tracking model (about 7.5 MB) downloads once from Google’s MediaPipe
                    servers.
                  </li>
                  <li>Turn the camera off at any time from the panel.</li>
                </ul>
              </>
            )}
            <div className="gesture-dialog-actions">
              {!touchOnly && (
                <button type="button" className="gesture-primary" onClick={enable} autoFocus>
                  <VideoCamera size={16} aria-hidden="true" /> Turn on camera
                </button>
              )}
              <button type="button" className="gesture-secondary" onClick={() => setConsent(false)}>
                {touchOnly ? 'OK' : 'Not now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel (always mounted while on, so the video element exists for the engine) */}
      <aside
        className={cn('gesture-panel', !on && 'is-hidden', compact && 'is-compact')}
        aria-label="Hand gesture controls"
        aria-hidden={!on}
      >
        <div className="gesture-panel-head">
          <span
            className={cn(
              'gesture-dot',
              s.status === 'ready' && !s.paused && 'is-live',
              s.paused && 'is-paused',
              failed && 'is-error',
            )}
          />
          <span className="gesture-panel-title" aria-live="polite">
            {compact && s.status === 'ready' ? `${s.present ? GESTURE_NAME[s.gesture] : 'No hand'} · ${!s.active ? 'Waiting' : s.paused ? 'Paused' : 'Active'}` : title}
          </span>
          <button
            type="button"
            className="gesture-off"
            onClick={() => setCompact((v) => !v)}
            aria-label={compact ? 'Expand gesture panel' : 'Minimise gesture panel'}
            aria-expanded={!compact}
          >
            {compact ? <ArrowsOutSimple size={14} aria-hidden="true" /> : <ArrowsInSimple size={14} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="gesture-off"
            onClick={disable}
            aria-label="Turn camera off"
          >
            <VideoCameraSlash size={15} aria-hidden="true" /> Off
          </button>
        </div>

        <div className={cn('gesture-preview', s.status !== 'ready' && 'is-dim')}>
          <video ref={video} playsInline muted aria-hidden="true" />
          <canvas ref={canvas} width={240} height={180} aria-hidden="true" />
          {s.status === 'loading' && (
            <span className="gesture-preview-note">{s.message ?? 'Loading…'}</span>
          )}
          {s.status === 'ready' && !s.present && (
            <span className="gesture-preview-note">Hand not detected</span>
          )}
        </div>

        {failed ? (
          <div className="gesture-error">
            <p>{s.message}</p>
            {s.status === 'denied' && (
              <p>
                To use gestures, allow the camera for this site (the camera icon in the address
                bar), then try again. The site works fully without it.
              </p>
            )}
            {s.status === 'unavailable' && (
              <p>Connect a webcam or close other apps using it, then try again.</p>
            )}
            <button type="button" className="gesture-primary" onClick={enable}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <dl className="gesture-rows">
              <div>
                <dt>Camera</dt>
                <dd>
                  {s.status === 'ready'
                    ? `On · ${s.fps} fps`
                    : s.status === 'loading'
                      ? 'Starting'
                      : 'Off'}
                </dd>
              </div>
              <div>
                <dt>Hand</dt>
                <dd>{s.present ? 'Detected' : 'Not detected'}</dd>
              </div>
              <div>
                <dt>Gesture</dt>
                <dd>{s.present ? GESTURE_NAME[s.gesture] : '—'}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{!s.active ? 'Waiting for open palm' : s.paused ? 'Paused' : 'Active'}</dd>
              </div>
              <div className="gesture-row-wide">
                <dt>Pinch</dt>
                <dd>
                  <span className="gesture-meter" title="Fills up as thumb and index come together">
                    <i ref={meter} />
                  </span>
                  {held ? 'Holding the page' : 'Pinch to grab'}
                </dd>
              </div>
            </dl>
            <p className="gesture-instruction">
              {s.status === 'ready' ? instruction : 'Camera starting…'}
            </p>
          </>
        )}

        <div className="gesture-level" role="radiogroup" aria-label="Gesture sensitivity">
          <span>Sensitivity</span>
          {(['low', 'medium', 'high'] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={cn(level === l && 'is-on')}
            >
              {l[0]!.toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </aside>

      {/* Cursor and its trail */}
      <div aria-hidden="true">
        {Array.from({ length: TRAIL }, (_, i) => (
          <div
            key={i}
            ref={(el) => void (trail.current[i] = el)}
            className="gesture-trail"
            style={{ '--i': i } as CSSProperties}
            data-visible="false"
          />
        ))}
        <div ref={cursor} className="gesture-cursor" data-visible="false">
          <i className="gesture-dwell" />
          <span />
        </div>
        <div ref={effects} />
      </div>

      {held && (
        <div className="gesture-grab-hint" role="status">
          {grabbing.current ? 'Open your hand to release' : 'Let go to release'}
        </div>
      )}

      {/* Section change */}
      {whoosh && (
        <div key={whoosh.id} className="gesture-whoosh" data-dir={whoosh.dir} aria-hidden="true">
          <div className="gesture-whoosh-card">
            <span className="gesture-whoosh-arrow">
              {whoosh.dir === 'up' ? (
                <ArrowUp size={20} weight="bold" />
              ) : whoosh.dir === 'down' ? (
                <ArrowDown size={20} weight="bold" />
              ) : whoosh.dir === 'left' ? (
                <ArrowLeft size={20} weight="bold" />
              ) : (
                <ArrowRight size={20} weight="bold" />
              )}
            </span>
            <span className="gesture-whoosh-n">{whoosh.n}</span>
            <span className="gesture-whoosh-label">{whoosh.label}</span>
          </div>
        </div>
      )}

      {/* Feedback */}
      {toast && (
        <div key={toast.id} className="gesture-toast" role="status">
          {toast.text}
        </div>
      )}
      {hint && (
        <div className="gesture-hint" role="status">
          <div>
            <HandPalm size={22} aria-hidden="true" />
            Open palm: start
          </div>
          <div>
            <ArrowsDownUp size={22} aria-hidden="true" />
            Move up or down: scroll
          </div>
          <div>
            <CursorClick size={22} aria-hidden="true" />
            Rest on a button: click
          </div>
          <div>
            <HandTap size={22} aria-hidden="true" />
            Pinch and move: stretch
          </div>
          <div>
            <HandFist size={22} aria-hidden="true" />
            Fist: pause
          </div>
          <div>
            <HandPointing size={22} aria-hidden="true" />
            Fingertip: cursor
          </div>
        </div>
      )}
    </>
  );
}
