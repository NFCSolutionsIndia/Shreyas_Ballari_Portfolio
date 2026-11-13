import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { ending, profile } from '@/content/portfolio';
import { cn } from '@/lib/cn';
import { createAmbient } from './ambient';
import { Hud } from './Hud';
import { PlacePage } from './PlacePage';
import { PAGES, PLACES, placeIndex, type PlaceId } from './places';
import './room.css';

// three.js only loads for this portfolio.
const RoomScene = lazy(() => import('./room/RoomScene'));

/** Session key for the place the visitor last stood at. */
const PLACE_KEY = 'room-place';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * The 3D Desk tab, after nexroom.framer.website: a calm room to walk through, guided by Shreyas. Scroll walks from the
 * corridor through the door to each place; drag looks around; labels and the room plan jump
 * between places; clicking a place's objects opens its page.
 */
export function RoomPortfolio() {
  const smooth = useContext(SmoothScrollContext);
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [lightsOn, setLightsOn] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [page, setPage] = useState<PlaceId | null>(null);
  const [gift, setGift] = useState(false);
  const ambient = useMemo(() => (typeof window === 'undefined' ? null : createAmbient()), []);
  const lookRef = useRef<(dir: -1 | 1) => void>(() => {});
  const resumeAt = useRef<number | null>(null);

  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => () => ambient?.dispose(), [ambient]);

  // "Opening the door · NN%" while the room loads.
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setProgress((p) => Math.min(95, p + 3 + Math.random() * 6)), 90);
    return () => window.clearInterval(id);
  }, [ready]);

  // Which place we're standing at (nearest on the walk).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setCurrent(Math.min(PLACES.length - 1, Math.round(window.scrollY / Math.max(1, window.innerHeight))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Freeze walking while a page or the gift is open; start at the door.
  useEffect(() => {
    smooth?.setLocked(!!page || gift || !ready);
    return () => smooth?.setLocked(false);
  }, [page, gift, ready, smooth]);
  useEffect(() => {
    history.scrollRestoration = 'manual';
    try {
      resumeAt.current = Number(sessionStorage.getItem(PLACE_KEY)) || 0;
    } catch {
      resumeAt.current = 0;
    }
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = 'auto';
    };
  }, []);
  // Coming back from an inner page: return to the place the visitor left, not the door.
  useEffect(() => {
    if (!ready || resumeAt.current === null) return;
    const at = Math.min(PLACES.length - 1, resumeAt.current);
    resumeAt.current = null;
    if (at > 0) smooth?.scrollToY(at * window.innerHeight, { immediate: true });
  }, [ready, smooth]);
  useEffect(() => {
    if (!ready || resumeAt.current !== null) return;
    try {
      sessionStorage.setItem(PLACE_KEY, String(current));
    } catch {
      // Storage blocked: the room simply starts at the door next time.
    }
  }, [current, ready]);

  const goTo = useCallback(
    (id: PlaceId) => smooth?.scrollToY(placeIndex(id) * window.innerHeight, { duration: 1.6 }),
    [smooth],
  );
  const step = useCallback(
    (delta: number) => {
      const next = Math.min(PLACES.length - 1, Math.max(0, current + delta));
      smooth?.scrollToY(next * window.innerHeight, { duration: 1.4 });
    },
    [current, smooth],
  );

  // Keyboard: ↑/↓ walk between places, Z zooms (← → are handled by the camera).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (page || gift) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        step(-1);
      } else if (e.key.toLowerCase() === 'z') setZoom((z) => !z);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, page, gift]);

  lookRef.current = (dir) => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir === 1 ? 'ArrowLeft' : 'ArrowRight' }));

  const toggleSound = () => {
    if (soundOn) ambient?.stop();
    else ambient?.start();
    setSoundOn(!soundOn);
  };

  const onReady = useCallback(() => {
    setProgress(100);
    window.setTimeout(() => setReady(true), 400);
  }, []);
  const openPage = useCallback((id: PlaceId) => id !== 'door' && id !== 'room' && setPage(id), []);
  const closePage = useCallback(() => setPage(null), []);
  const openGift = useCallback(() => setGift(true), []);

  const activePage = page && page !== 'door' && page !== 'room' ? PAGES[page] : null;

  if (!webgl) return <RoomTextVersion visible />;

  return (
    <div className="room relative bg-[#d8d3cc]" data-page-open={activePage || gift ? '' : undefined}>
      <RoomTextVersion />
      {/* The walk: one screen of scroll per place. */}
      <div aria-hidden="true" style={{ height: `${PLACES.length * 100}svh` }} />
      <div className="fixed inset-0 z-0 select-none">
        <Suspense fallback={null}>
          <RoomScene
            lightsOn={lightsOn}
            zoom={zoom}
            current={current}
            onGoTo={goTo}
            onOpen={openPage}
            onGift={openGift}
            onReady={onReady}
          />
        </Suspense>
      </div>

      <Hud
        current={current}
        visible={ready && current > 0 && !page}
        lightsOn={lightsOn}
        soundOn={soundOn}
        zoom={zoom}
        onStep={step}
        onGoTo={goTo}
        onLook={(d) => lookRef.current(d)}
        onLights={() => setLightsOn((v) => !v)}
        onSound={toggleSound}
        onZoom={() => setZoom((z) => !z)}
      />

      {/* At the door: loading line, then the invitation to walk in. */}
      <p
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-10 z-30 text-center text-[12px] font-medium text-black/60 transition-opacity duration-700',
          current === 0 && !page ? 'opacity-100' : 'opacity-0',
        )}
      >
        {ready ? 'Scroll to open the door' : `Opening the door · ${String(Math.round(progress)).padStart(2, '0')}%`}
      </p>

      {activePage && <PlacePage page={activePage} onBack={closePage} />}

      {gift && (
        <div className="room-page-in fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm" onClick={() => setGift(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-gift"
            onClick={(e) => e.stopPropagation()}
            className="room-rise w-full max-w-md rounded-sm bg-white p-8"
          >
            <p className="text-[12px] text-black/50">A gift is inside</p>
            <h2 id="room-gift" className="mt-3 text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
              {ending.subtitle}.
            </h2>
            <p className="mt-3 text-[13px] text-black/60">Thanks for walking through {profile.firstName}’s room.</p>
            <button
              type="button"
              autoFocus
              onClick={() => setGift(false)}
              className="mt-6 h-9 rounded-sm bg-black px-3 text-[12px] font-medium text-white"
            >
              Back to the room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Everything in the room as plain HTML: for screen readers, search engines and no WebGL. */
function RoomTextVersion({ visible = false }: { visible?: boolean }) {
  return (
    <article className={visible ? 'room mx-auto max-w-3xl px-6 py-24' : 'sr-only'}>
      <h2 className="text-4xl font-semibold">{profile.name}</h2>
      {Object.values(PAGES).map((p) => (
        <section key={p.id} className="mt-10">
          <h3 className="text-2xl font-semibold">{p.title}</h3>
          <p className="mt-2">{p.intro}</p>
          <ul className="mt-3 list-disc pl-5">
            {p.cards.map((c) => (
              <li key={c.title}>
                {c.title}: {typeof c.text === 'string' ? c.text : c.text.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
