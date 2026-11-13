import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { createAmbient } from '../room/ambient';
import { awardImage, AWARDS } from './awards';
import { WORLD } from './data/worldData';
import { answer, PLACES, type PlaceKey } from './guide';
import { ripple } from './three/rippleStore';
import { FilmPlayer } from './FilmPlayer';
import { FILMS } from './films';
import { RIDE, rideT, STOPS, whiteAt } from './three/path';
import { timeFromClock, type TimeName } from './three/timeOfDay';
import type { Tier } from './three/Post';
import { speak, useVoice } from './useVoice';
import './world.css';

/**
 * "My World": a continuous, scroll-driven 3D journey through a town inspired by Cumming,
 * Georgia, after the principles of sebastien-lempens.com with original places and Shreyas's own
 * story. Everything opens on this screen (no inner pages). Voice control and the guide are
 * optional and run in the browser.
 */

const Experience = lazy(() => import('./three/Experience'));
const FONTS = 'https://fonts.googleapis.com/css2?family=Michroma&family=Manrope:wght@300;400;500;600&display=swap';

type Stage =
  | 'home' | 'welcome' | 'aboutMe' | 'about' | 'journey' | 'schools' | 'entering' | 'work' | 'oncure' | 'stocks' | 'tutoring'
  | 'statue' | 'awards' | 'fall' | 'contact' | 'room' | 'travel';

function stageAt(p: number): Stage {
  const r = rideT(p);
  if (p < 0.025) return 'home';
  if (p > 0.04 && p < 0.105) return 'welcome';
  if (p > 0.14 && p < 0.175) return 'aboutMe';
  if (p > 0.2 && p < 0.252) return 'about';
  if (p >= 0.252 && p < 0.3) return 'journey';
  if (p > STOPS.ride && p < STOPS.rideEnd) {
    if (r < RIDE.gate - 0.04) return 'schools';
    if (r < RIDE.gate + 0.03) return 'entering';
    if (r > RIDE.oncure - 0.07 && r < RIDE.oncure + 0.05) return 'oncure';
    if (r > RIDE.stocks - 0.07 && r < RIDE.stocks + 0.05) return 'stocks';
    if (r > RIDE.tutoring - 0.07 && r < RIDE.tutoring + 0.05) return 'tutoring';
    return 'work';
  }
  if (p > STOPS.statue - 0.015 && p < 0.728) return 'statue';
  if (p >= 0.728 && p < STOPS.awardsEnd + 0.008) return 'awards';
  if (p > STOPS.awardsEnd + 0.012 && p < STOPS.land) return 'fall';
  if (p >= STOPS.land + 0.004 && p < 0.962) return 'contact';
  if (p > STOPS.room - 0.002) return 'room';
  return 'travel';
}

/** Big sections, for the liquid glass wave between them. */
const SECTION: Record<Stage, number> = {
  home: 0, welcome: 0, travel: -1, aboutMe: 1, about: 1, journey: 1, schools: 2, entering: 2, work: 2, oncure: 2, stocks: 2, tutoring: 2,
  statue: 3, awards: 3, fall: 4, contact: 5, room: 6,
};

type Place = keyof typeof WORLD.places;
function placeAt(p: number): Place {
  const r = rideT(p);
  if (p < 0.11) return 'lake';
  if (p < STOPS.ride) return 'downtown';
  if (p < STOPS.rideEnd) return r < RIDE.gate - 0.04 ? 'schools' : r < RIDE.oncure - 0.08 ? 'work' : 'projects';
  if (p < 0.728) return 'statue';
  if (p < STOPS.awardsEnd + 0.01) return 'sky';
  if (p < STOPS.land) return 'dive';
  if (p < 0.968) return 'touch';
  return 'room';
}

const MENU: { label: string; to: PlaceKey }[] = [
  { label: 'Home', to: 'home' },
  { label: 'About', to: 'about' },
  { label: 'Schools', to: 'schools' },
  { label: 'Projects', to: 'oncure' },
  { label: 'Awards', to: 'awards' },
  { label: 'Contact', to: 'contact' },
];

const TIMES: (TimeName | 'auto')[] = ['auto', 'dawn', 'day', 'sunset', 'night'];
const TIME_LABEL: Record<TimeName | 'auto', string> = { auto: 'Live time', dawn: 'Dawn', day: 'Day', sunset: 'Sunset', night: 'Night' };

type Sheet = { kind: 'project'; id: 'oncure' | 'finance' | 'tutoring' } | { kind: 'award'; id: string } | { kind: 'contact'; id: 'phone' | 'email' | 'message' };

interface Msg {
  who: 'you' | 'guide';
  text: string;
}

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export function WorldPortfolio() {
  const smooth = useContext(SmoothScrollContext);
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [reduced, setReduced] = useState(false);
  const [steps, setSteps] = useState({ code: false, fonts: false, scene: false });
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(false);
  const [stage, setStage] = useState<Stage>('home');
  const [place, setPlace] = useState<Place>('lake');
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [timeChoice, setTimeChoice] = useState<TimeName | 'auto'>('auto');
  const [guideOpen, setGuideOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'guide', text: `Hi! I’m the guide to ${WORLD.firstName}’s world. Ask me anything, or say “take me to the awards”.` }]);
  const [ask, setAsk] = useState('');
  const [full, setFull] = useState(false);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const time = useRef<TimeName>('sunset');
  const [tierChoice, setTierChoice] = useState<Tier>('high');
  const tier = useRef<Tier>('high');
  tier.current = tierChoice;
  const section = useRef<HTMLElement>(null);
  const white = useRef<HTMLDivElement>(null);
  const ambient = useMemo(() => (typeof window === 'undefined' ? null : createAmbient()), []);

  // Real loading steps: the 3D code chunk, the fonts, the first rendered scene.
  const target = (steps.code ? 30 : 6) + (steps.fonts ? 15 : 0) + (steps.scene ? 55 : 0);
  const done = target >= 100;

  useEffect(() => {
    setMounted(true);
    setWebgl(hasWebGL());
    const mobile = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    setQuality(mobile ? 'low' : 'high');
    const asked = new URLSearchParams(location.search).get('quality');
    setTierChoice(asked === 'high' || asked === 'medium' || asked === 'low' ? asked : mobile ? 'low' : 'high');
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    void import('./three/Experience').then(() => setSteps((s) => ({ ...s, code: true })));
    void document.fonts?.load('400 40px "Michroma"').finally(() => setSteps((s) => ({ ...s, fonts: true })));
    return () => ambient?.dispose();
  }, [ambient]);

  // Time of day: the visitor's clock, or their choice; re-checked every minute.
  useEffect(() => {
    const apply = () => (time.current = timeChoice === 'auto' ? timeFromClock() : timeChoice);
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, [timeChoice]);

  useEffect(() => {
    if (shown >= target) return;
    const id = window.setTimeout(() => setShown((n) => Math.min(target, n + 2)), 16);
    return () => window.clearTimeout(id);
  }, [shown, target]);

  // No scrolling until the visitor enters, or while a sheet or the menu is open.
  useEffect(() => {
    if (!webgl) return;
    smooth?.setLocked(!started || !!sheet || menu);
    return () => smooth?.setLocked(false);
  }, [started, sheet, menu, smooth, webgl]);


  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Scroll → journey progress and the overlays that follow it.
  useEffect(() => {
    let raf = 0;
    let last: Stage | '' = '';
    let lastPlace = '';
    let lastSection = 0;
    const read = () => {
      const el = section.current;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const span = Math.max(1, el.offsetHeight - window.innerHeight);
        const p = Math.min(1, Math.max(0, (window.scrollY - top) / span));
        const dir = p >= progress.current ? 1 : -1;
        progress.current = p;
        const s = stageAt(p);
        if (s !== last) {
          setStage((last = s));
          const sec = SECTION[s];
          if (sec >= 0 && sec !== lastSection) {
            ripple.trigger(0.5 + dir * 0.12, 0.42);
            lastSection = sec;
          }
        }
        const pl = placeAt(p);
        if (pl !== lastPlace) setPlace((lastPlace = pl) as Place);
        if (white.current) white.current.style.opacity = String(whiteAt(p));
      }
      raf = requestAnimationFrame(read);
    };
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 };
    };
    raf = requestAnimationFrame(read);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const jumpTo = useCallback(
    (stop: number) => {
      const el = section.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = Math.max(1, el.offsetHeight - window.innerHeight);
      const y = top + span * stop;
      const far = Math.abs(stop - progress.current);
      setMenu(false);
      smooth?.setLocked(false);
      requestAnimationFrame(() => {
        if (smooth) smooth.scrollToY(y, { duration: reduced ? 0 : 1.4 + far * 3, immediate: reduced });
        else window.scrollTo({ top: y });
      });
    },
    [smooth, reduced],
  );
  const go = useCallback((key: PlaceKey) => jumpTo(PLACES[key].stop), [jumpTo]);

  const stopsInOrder = useMemo(() => Object.values(PLACES).map((p) => p.stop).sort((a, b) => a - b), []);
  const step = useCallback(
    (dir: 1 | -1) => {
      const p = progress.current;
      const next = dir > 0 ? stopsInOrder.find((s) => s > p + 0.004) : [...stopsInOrder].reverse().find((s) => s < p - 0.004);
      if (next !== undefined) jumpTo(next);
    },
    [jumpTo, stopsInOrder],
  );

  useEffect(() => {
    if (!sheet && !menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheet(null);
        setMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, menu]);

  const start = (withSound: boolean) => {
    setStarted(true);
    ripple.trigger(0.5, 0.5);
    if (withSound) {
      ambient?.start();
      setSound(true);
    }
    const wanted = new URLSearchParams(location.search).get('project');
    if (wanted === 'oncure' || wanted === 'finance' || wanted === 'tutoring') setSheet({ kind: 'project', id: wanted });
  };
  const setSoundOn = (on: boolean) => {
    if (on) ambient?.start();
    else ambient?.stop();
    setSound(on);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const cycleTime = () => setTimeChoice((t) => TIMES[(TIMES.indexOf(t) + 1) % TIMES.length]!);

  // --- The guide and voice ---------------------------------------------------------------------
  const voiceOn = useRef(false);
  const respond = useCallback(
    (text: string, fromVoice = false) => {
      const q = text.toLowerCase();
      let reply: string | null = null;
      if (/\b(next|forward|continue)\b/.test(q)) {
        step(1);
        reply = 'Next stop.';
      } else if (/\b(back|previous)\b/.test(q)) {
        step(-1);
        reply = 'Going back.';
      } else if (/\bsound (on|off)\b|\b(mute|unmute)\b/.test(q)) {
        const on = /\bon\b|unmute/.test(q);
        setSoundOn(on);
        reply = on ? 'Sound on.' : 'Sound off.';
      } else if (/\b(dawn|daytime|day mode|sunset|night|live time)\b/.test(q)) {
        const t = /dawn/.test(q) ? 'dawn' : /sunset/.test(q) ? 'sunset' : /night/.test(q) ? 'night' : /live/.test(q) ? 'auto' : 'day';
        setTimeChoice(t);
        reply = `${TIME_LABEL[t]} it is.`;
      } else if (/\bfull ?screen\b/.test(q)) {
        toggleFull();
        reply = 'Full screen.';
      } else if (/\bclose\b/.test(q)) {
        setSheet(null);
        reply = 'Closed.';
      }
      if (!reply) {
        const r = answer(text);
        reply = r.text;
        if (r.go) go(r.go);
        if (r.open === 'oncure') window.setTimeout(() => setSheet({ kind: 'project', id: 'oncure' }), 2600);
      }
      setMsgs((m) => [...m.slice(-12), { who: 'you', text }, { who: 'guide', text: reply! }]);
      if (fromVoice || voiceOn.current) speak(reply);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [go, step],
  );
  const voice = useVoice((t) => respond(t, true));
  voiceOn.current = voice.listening;
  const toggleVoice = () => {
    if (voice.listening) voice.stop();
    else {
      voice.start();
      setGuideOpen(true);
    }
  };
  const submitAsk = (e: FormEvent) => {
    e.preventDefault();
    if (!ask.trim()) return;
    respond(ask.trim());
    setAsk('');
  };

  if (mounted && !webgl) return <Fallback />;

  const awardSheet = sheet?.kind === 'award' ? AWARDS.find((a) => a.id === sheet.id) : null;
  const project = sheet?.kind === 'project' ? WORLD.projects.find((p) => p.id === sheet.id) : null;

  return (
    <section ref={section} className="mw" aria-label={`${WORLD.name}: my world`}>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <div className="mw-stage">
        {mounted && webgl && (
          <Suspense fallback={null}>
            <Experience
              progress={progress}
              pointer={pointer}
              time={time}
              tier={tier}
              quality={quality}
              reduced={reduced}
              awards={AWARDS}
              onAward={(id) => setSheet({ kind: 'award', id })}
              onContact={(id) => setSheet({ kind: 'contact', id })}
              onReady={() => setSteps((s) => ({ ...s, scene: true }))}
            />
          </Suspense>
        )}
        <div ref={white} className="mw-white" aria-hidden="true" />

        {started && (
          <div className="mw-chrome">
            <button type="button" className="mw-menu-btn" onClick={() => setMenu(true)} aria-haspopup="dialog">
              <span aria-hidden="true" className="mw-burger">
                <i />
                <i />
              </span>
              menu
            </button>
            <div className="mw-tools">
              <button type="button" className="mw-tool" onClick={() => setSoundOn(!sound)} aria-pressed={sound} aria-label={sound ? 'Sound off' : 'Sound on'}>
                <span className={`mw-eq ${sound ? 'is-on' : ''}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                sound
              </button>
              {voice.supported && (
                <button type="button" className={`mw-tool ${voice.listening ? 'is-live' : ''}`} onClick={toggleVoice} aria-pressed={voice.listening} aria-label={voice.listening ? 'Stop voice control' : 'Start voice control'}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                  voice
                </button>
              )}
              <button type="button" className={`mw-tool ${guideOpen ? 'is-live' : ''}`} onClick={() => setGuideOpen(!guideOpen)} aria-pressed={guideOpen} aria-label="Ask the guide">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16v11H9l-5 4z" />
                  <path d="M8 10h.01M12 10h.01M16 10h.01" />
                </svg>
                guide
              </button>
              <button type="button" className="mw-tool" onClick={cycleTime} aria-label={`Light: ${TIME_LABEL[timeChoice]}. Change`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {timeChoice === 'night' ? (
                    <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
                    </>
                  )}
                </svg>
                {TIME_LABEL[timeChoice].toLowerCase()}
              </button>
              <button
                type="button"
                className="mw-tool"
                onClick={() => setTierChoice((t) => (t === 'high' ? 'medium' : t === 'medium' ? 'low' : 'high'))}
                aria-label={`Quality: ${tierChoice}. Change`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 18h3V12H4zM10.5 18h3V8h-3zM17 18h3V4h-3z" />
                </svg>
                {tierChoice}
              </button>
              <button type="button" className="mw-tool" onClick={toggleFull} aria-pressed={full} aria-label={full ? 'Exit full screen' : 'Full screen'}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
                </svg>
                screen
              </button>
            </div>

            {stage === 'home' && (
              <p className="mw-scroll" aria-hidden="true">
                SCR<span className="mw-mouse" />LL
              </p>
            )}
            <p key={place} className="mw-place" aria-live="polite">
              <span aria-hidden="true">◉</span> {WORLD.places[place]}
            </p>
            <p className="mw-osm">
              Map data ©{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                OpenStreetMap contributors
              </a>
            </p>

            {/* Words that float into the scene */}
            <p className={`mw-float mw-welcome ${stage === 'welcome' ? 'is-in' : ''}`} aria-hidden={stage !== 'welcome'}>
              <span>Welcome</span>
              <span>to</span>
              <span>my</span>
              <span>world</span>
            </p>
            <p className={`mw-float mw-entering ${stage === 'schools' ? 'is-in' : ''}`} aria-hidden={stage !== 'schools'}>
              <small>The road through</small>
              My schools
            </p>
            <p className={`mw-float mw-entering ${stage === 'entering' ? 'is-in' : ''}`} aria-hidden={stage !== 'entering'}>
              <small>Entering</small>
              My work
            </p>
            <p className={`mw-float mw-entering ${stage === 'fall' ? 'is-in' : ''}`} aria-hidden={stage !== 'fall'}>
              <small>Jumping into</small>
              The next chapter
            </p>

            {/* About: a glass panel in the scene */}
            <article className={`mw-card mw-about ${stage === 'about' ? 'is-in' : ''}`} aria-hidden={stage !== 'about'}>
              <img className="mw-portrait" src={WORLD.portrait} alt={`${WORLD.name}`} />
              <p className="mw-kicker">About me</p>
              <h2 className="mw-h">Hi, I’m {WORLD.firstName}</h2>
              <ul className="mw-facts">
                <li>
                  <span>Lives in</span>
                  {WORLD.location}
                </li>
                <li>
                  <span>Studies at</span>
                  {WORLD.school} · {WORLD.grade}
                </li>
                <li>
                  <span>Loves</span>
                  {WORLD.subjects.join(' · ')}
                </li>
              </ul>
              {WORLD.about.filter(Boolean).slice(1).map((t) => (
                <p key={t} className="mw-p">
                  {t}
                </p>
              ))}
              <ul className="mw-chips">
                {WORLD.roles.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </article>
            <article className={`mw-card mw-about ${stage === 'journey' ? 'is-in' : ''}`} aria-hidden={stage !== 'journey'}>
              <p className="mw-kicker">My journey</p>
              <ol className="mw-path">
                {WORLD.schools.map((sc, i) => (
                  <li key={sc} className={i === WORLD.schools.length - 1 ? 'is-now' : ''}>
                    {sc}
                    {i === WORLD.schools.length - 1 && <em> now</em>}
                  </li>
                ))}
              </ol>
              <p className="mw-sub">Curious about</p>
              <ul className="mw-chips">
                {WORLD.interests.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </article>

            {/* Roadside cinema prompts */}
            {(stage === 'oncure' || stage === 'stocks' || stage === 'tutoring') && (
              <div className="mw-cta">
                <p>
                  {stage === 'oncure'
                    ? 'Now showing · Oncure, his research concept'
                    : stage === 'stocks'
                      ? 'Now showing · his stock trading app'
                      : 'Now showing · peer tutoring'}
                </p>
                <button
                  type="button"
                  className="mw-btn"
                  onClick={() => setSheet({ kind: 'project', id: stage === 'oncure' ? 'oncure' : stage === 'stocks' ? 'finance' : 'tutoring' })}
                >
                  Watch it full screen
                </button>
              </div>
            )}
            <p className={`mw-hint-pill ${stage === 'statue' ? 'is-in' : ''}`} aria-hidden={stage !== 'statue'}>
              Recognition · look up
            </p>
            <p className={`mw-hint-pill ${stage === 'awards' ? 'is-in' : ''}`} aria-hidden={stage !== 'awards'}>
              Awards and certificates · click one to view it
            </p>
            <p className={`mw-hint-pill ${stage === 'contact' ? 'is-in' : ''}`} aria-hidden={stage !== 'contact'}>
              Get in touch · choose phone, email or message
            </p>

            {/* The room: the walls carry his details; a slim bar for actions */}
            {stage === 'room' && (
              <div className="mw-cta mw-room-bar">
                <p>Scroll to look around his room</p>
                <button type="button" className="mw-btn" onClick={() => setSheet({ kind: 'contact', id: 'message' })}>
                  Send a message
                </button>
                <a className="mw-btn is-ghost" href={`tel:+1${WORLD.contact.phone.replace(/\D/g, '')}`}>
                  Call {WORLD.contact.phone}
                </a>
                <button type="button" className="mw-btn is-ghost" onClick={() => jumpTo(0)}>
                  Travel again
                </button>
              </div>
            )}

            {/* Voice: what was heard */}
            {voice.listening && (
              <p className="mw-heard" aria-live="polite">
                <i aria-hidden="true" /> {voice.heard || 'Listening… try “show his awards”'}
              </p>
            )}
            {voice.error && <p className="mw-heard is-error">{voice.error}</p>}

            {/* The guide */}
            {guideOpen && (
              <aside className="mw-guide" aria-label="Guide">
                <header>
                  <strong>Guide</strong>
                  <span>Answers from this site only</span>
                  <button type="button" onClick={() => setGuideOpen(false)} aria-label="Close guide">
                    ×
                  </button>
                </header>
                <ol className="mw-log" aria-live="polite">
                  {msgs.map((m, i) => (
                    <li key={i} className={m.who === 'you' ? 'is-you' : ''}>
                      {m.text}
                    </li>
                  ))}
                </ol>
                <div className="mw-suggest">
                  {['Who is Shreyas?', 'What is Oncure?', 'Show his awards', 'Take me to contact'].map((s) => (
                    <button key={s} type="button" onClick={() => respond(s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <form onSubmit={submitAsk}>
                  <label className="sr-only" htmlFor="mw-ask">
                    Ask the guide
                  </label>
                  <input id="mw-ask" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask about Shreyas…" autoComplete="off" />
                  <button type="submit">Ask</button>
                </form>
              </aside>
            )}
          </div>
        )}

        {/* Menu */}
        {menu && (
          <div className="mw-menu" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="mw-close" onClick={() => setMenu(false)} aria-label="Close menu">
              ×
            </button>
            <nav>
              {MENU.map((m, i) => (
                <button key={m.label} type="button" onClick={() => go(m.to)} autoFocus={i === 0}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {m.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* On-screen sheets: projects, awards, contact */}
        {sheet && (
          <div className="mw-sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="mw-sheet-title" onClick={() => setSheet(null)}>
            <article className={`mw-sheet ${awardSheet ? 'is-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
              <button type="button" className="mw-close" onClick={() => setSheet(null)} aria-label="Close" autoFocus>
                ×
              </button>
              {project && (
                <>
                  <p className="mw-kicker">{project.category}</p>
                  <h2 id="mw-sheet-title" className="mw-h">
                    {project.title}
                  </h2>
                  <p className="mw-lead">{project.intro}</p>
                  <FilmPlayer film={FILMS[project.id as keyof typeof FILMS]} />
                  {project.details.filter(Boolean).map((t) => (
                    <p key={t} className="mw-p">
                      {t}
                    </p>
                  ))}
                  {project.missing && (
                    <p className="mw-missing">
                      <strong>To be supplied:</strong> {project.missing}
                    </p>
                  )}
                </>
              )}
              {awardSheet && (
                <div className="mw-award">
                  <img src={awardSheet.scan ?? awardImage(awardSheet)} alt={`${awardSheet.title}: ${awardSheet.line}`} />
                  <div>
                    <p className="mw-kicker">Recognition</p>
                    <h2 id="mw-sheet-title" className="mw-h">
                      {awardSheet.title}
                    </h2>
                    <p className="mw-lead">{awardSheet.line}</p>
                    <p className="mw-p">{awardSheet.detail}</p>
                    {awardSheet.confirm && (
                      <p className="mw-missing">
                        <strong>To confirm:</strong> {awardSheet.confirm}
                      </p>
                    )}
                    {!awardSheet.scan && (
                      <p className="mw-missing">
                        <strong>To be supplied:</strong> a photo or scan of the original. This is a display version.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {sheet.kind === 'contact' && <ContactSheet kind={sheet.id} />}
            </article>
          </div>
        )}

        {/* Loader, then the start screen. */}
        <div className={`mw-intro ${started ? 'is-gone' : ''}`}>
          {!done ? (
            <div className="mw-loader" role="status" aria-live="polite">
              <div className="mw-load-scene" aria-hidden="true">
                <svg className="mw-skyline" viewBox="0 0 600 120">
                  <path d="M0 120 V86 h40 V62 h30 V80 h26 V40 h12 V24 h8 V40 h12 V74 h44 V54 h38 V90 h30 V30 l20 -22 l20 22 V88 h36 V58 h46 V78 h40 V48 h24 V70 h52 V84 h40 V66 h34 V120 Z" />
                </svg>
                <LoaderRider />
              </div>
              <p className="mw-count" aria-label={`Loading ${shown} percent`}>
                {String(shown).padStart(3, '0')}
              </p>
            </div>
          ) : (
            <div className="mw-start">
              <p className="mw-tag">{WORLD.tagline}</p>
              <button type="button" className="mw-start-btn" onClick={() => start(true)}>
                Enter the journey
              </button>
              <p className="mw-hint">For the best experience</p>
              <p className="mw-hint">Turn your sound on · Use a desktop</p>
              <button type="button" className="mw-silent" onClick={() => start(false)}>
                Enter without sound
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Shreyas on his bicycle, pedalling on the spot while the world loads. */
function LoaderRider() {
  return (
    <svg className="mw-load-rider" viewBox="0 0 200 160">
      {[48, 152].map((cx) => (
        <g key={cx} className="mw-wheel" style={{ transformOrigin: `${cx}px 122px` }}>
          <circle cx={cx} cy="122" r="28" fill="none" stroke="#3a3a44" strokeWidth="5" />
          {[0, 45, 90, 135].map((a) => (
            <line key={a} x1={cx} y1="94" x2={cx} y2="150" stroke="#9a9aa2" strokeWidth="1.5" transform={`rotate(${a} ${cx} 122)`} />
          ))}
        </g>
      ))}
      <path d="M48 122 L86 122 L110 82 L72 82 Z M86 122 L64 78 M110 82 L146 76 L152 122 M140 70 L150 64" fill="none" stroke="#3f7d86" strokeWidth="5" strokeLinejoin="round" />
      <rect x="56" y="72" width="22" height="6" rx="3" fill="#3a2a26" />
      <g className="mw-legs">
        <path d="M70 70 L92 100 L84 122" fill="none" stroke="#2b2e3a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M68 70 L92 34" stroke="#2f5d8c" strokeWidth="18" strokeLinecap="round" />
      <path d="M90 40 L130 62 L146 66" fill="none" stroke="#2f5d8c" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="52" y="30" width="22" height="30" rx="6" fill="#c44d3f" transform="rotate(-30 63 45)" />
      <circle cx="100" cy="22" r="12" fill="#b07a5a" />
      <path d="M88 20 a12 12 0 0 1 24 -2 Z" fill="#f08a3c" />
    </svg>
  );
}

function ContactSheet({ kind }: { kind: 'phone' | 'email' | 'message' }) {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') ?? '').trim();
    const reply = String(f.get('reply') ?? '').trim();
    const msg = String(f.get('msg') ?? '').trim();
    const errs: Record<string, string> = {};
    if (!name) errs.name = 'Please add your name.';
    if (!reply) errs.reply = 'Add an email or phone number so Shreyas can reply.';
    else if (reply.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) errs.reply = 'That email address doesn’t look complete.';
    if (msg.length < 10) errs.msg = 'Please write a little more (at least 10 characters).';
    setErrors(errs);
    if (!Object.keys(errs).length) setSent(true);
  };
  if (kind === 'phone')
    return (
      <>
        <p className="mw-kicker">Phone</p>
        <h2 id="mw-sheet-title" className="mw-h">
          Call or text {WORLD.firstName}
        </h2>
        <p className="mw-big-link">
          <a href={`tel:+1${WORLD.contact.phone.replace(/\D/g, '')}`}>{WORLD.contact.phone}</a>
        </p>
        <p className="mw-p">{WORLD.contact.line}</p>
      </>
    );
  if (kind === 'email')
    return (
      <>
        <p className="mw-kicker">Email</p>
        <h2 id="mw-sheet-title" className="mw-h">
          Email
        </h2>
        {WORLD.contact.email ? (
          <p className="mw-big-link">
            <a href={`mailto:${WORLD.contact.email}`}>{WORLD.contact.email}</a>
          </p>
        ) : (
          <p className="mw-missing">
            <strong>To be supplied:</strong> the email address to show here. Meanwhile, call {WORLD.contact.phone} or leave a message.
          </p>
        )}
      </>
    );
  return (
    <>
      <p className="mw-kicker">Message</p>
      <h2 id="mw-sheet-title" className="mw-h">
        Leave a message
      </h2>
      {sent ? (
        <p className="mw-missing">
          Thank you. The message service isn’t connected yet, so this message wasn’t sent. Please call {WORLD.contact.phone} for now.
        </p>
      ) : (
        <form className="mw-form" onSubmit={onSubmit} noValidate>
          <label>
            Your name
            <input name="name" autoComplete="name" aria-invalid={!!errors.name} />
            {errors.name && <span className="mw-err">{errors.name}</span>}
          </label>
          <label>
            Email or phone for the reply
            <input name="reply" autoComplete="email" aria-invalid={!!errors.reply} />
            {errors.reply && <span className="mw-err">{errors.reply}</span>}
          </label>
          <label>
            Message
            <textarea name="msg" rows={4} aria-invalid={!!errors.msg} />
            {errors.msg && <span className="mw-err">{errors.msg}</span>}
          </label>
          <button type="submit" className="mw-btn">
            Send message
          </button>
          <p className="mw-small">The message service is still to be connected.</p>
        </form>
      )}
    </>
  );
}

/** Same content without 3D, for browsers that can't run WebGL. */
function Fallback() {
  return (
    <section className="mw-flat">
      <p className="mw-kicker">{WORLD.tagline}</p>
      <h1 className="mw-h">{WORLD.name}</h1>
      <p className="mw-lead">
        {WORLD.title} · {WORLD.location}
      </p>
      {WORLD.about.filter(Boolean).map((t) => (
        <p key={t} className="mw-p">
          {t}
        </p>
      ))}
      <h2 className="mw-h2">Schools</h2>
      <p className="mw-p">{WORLD.schools.join(' → ')}</p>
      <h2 className="mw-h2">Projects</h2>
      {WORLD.projects.map((d) => (
        <article key={d.id} className="mw-flat-card">
          <p className="mw-kicker">{d.category}</p>
          <h3>{d.title}</h3>
          <p className="mw-p">{d.intro}</p>
        </article>
      ))}
      <h2 className="mw-h2">Recognition</h2>
      {AWARDS.map((a) => (
        <p key={a.id} className="mw-p">
          {a.title}: {a.line}
        </p>
      ))}
      <h2 className="mw-h2">Contact</h2>
      <p className="mw-p">
        {WORLD.contact.name} · <a href={`tel:+1${WORLD.contact.phone.replace(/\D/g, '')}`}>{WORLD.contact.phone}</a>
      </p>
    </section>
  );
}
