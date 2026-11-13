import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowClockwise, Footprints, CaretLeft, CaretRight, CornersIn, CornersOut, Globe, HandWaving, MapTrifold, Microphone, MicrophoneSlash, SlidersHorizontal, SpeakerHigh, SpeakerSlash, SquaresFour, VirtualReality, X } from '@phosphor-icons/react';
import { useVoice } from '@/features/voice/useVoice';
import { CHAPTERS } from '../story/chapters';
import { playUi, spatial, useSpatial } from '../store';
import { ActivitiesApp, ControlCenter, FinanceApp, GamesApp, HomeView } from '../os/Apps';
import { OncureApp } from '../os/OncureApp';
import { AwardsFlow } from '../os/Awards';
import { Chat } from '../os/Chat';
import { Dashboard } from '../os/Dashboard';
import { ProfileWindow } from '../os/Profile';
import { OSWindow } from '../os/Window';
import { envNow } from '../os/localTime';
import { ChatBubble } from '../os/ChatBubble';
import { Tour } from '../os/Tour';
import { VideoOverlay } from '../os/VideoOverlay';
import { Walk } from '../os/Walk';
import { stopSpeaking } from '../story/narrator';
import { runCommand } from './commands';
import { Hands } from './Hands';

/**
 * The Liquid Glass layer over the 3D home, built like a spatial OS: the app rail (tab bar) on the
 * left, a capsule at the top with the app you are in and the guided tour, Home View and Control
 * Center at the top right, and the app itself in a floating window that swings in as you switch.
 * Mouse, touch, keyboard, voice and hands all drive the same actions.
 */

function AppBody({ id, expanded, setExpanded }: { id: string; expanded: string | null; setExpanded: (v: string | null) => void }) {
  const apps: Record<string, () => ReactNode> = {
    home: () => <Dashboard />,
    oncure: () => <OncureApp />,
    finance: () => <FinanceApp />,
    awards: () => <AwardsFlow expanded={expanded} onExpand={setExpanded} />,
    chat: () => <Chat />,
    games: () => <GamesApp />,
    activities: () => <ActivitiesApp />,
  };
  return <>{apps[id]?.()}</>;
}

/** The app window: deals the new app in, sweeps the previous one out. */
function Stage({ chapter, dir }: { chapter: number; dir: 1 | -1 }) {
  const [shown, setShown] = useState(chapter);
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (chapter === shown) return;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setShown(chapter);
      setLeaving(false);
      setExpanded(null);
    }, 420);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);
  const c = CHAPTERS[shown]!;
  const back = expanded ? () => setExpanded(null) : shown !== 0 ? () => spatial.goChapter('home') : undefined;
  const free = FREE.has(c.id);
  return (
    <div className={`os-stage ${leaving ? 'is-leaving' : ''} dir-${dir > 0 ? 'next' : 'prev'} is-${c.id}`} aria-live="polite">
      {free ? (
        <div key={shown} className={`os-free is-${c.id}`}>
          {back && (
            <button type="button" className="os-round os-back" aria-label="Back to the dashboard" data-voice="back" onClick={back}>
              <CaretLeft weight="bold" />
            </button>
          )}
          <AppBody id={c.id} expanded={expanded} setExpanded={setExpanded} />
        </div>
      ) : (
        <OSWindow key={`${shown}-${expanded ?? ''}`} id={c.id} title={expanded ? 'Award' : c.title} variant={c.id === 'chat' ? 'light' : 'dark'} className={`os-main is-${c.id} ${expanded ? 'is-expanded' : ''}`} onBack={back}>
          <div className="os-main-body">
            <AppBody id={c.id} expanded={expanded} setExpanded={setExpanded} />
          </div>
        </OSWindow>
      )}
    </div>
  );
}

/** Apps laid out as cards and screens floating in the room, rather than in one window. */
const FREE = new Set(['home', 'oncure', 'finance', 'activities', 'games']);

function Captions() {
  const cap = useSpatial((s) => s.caption);
  if (!cap) return null;
  // Show the sentence being spoken, with the current word lit.
  const text = cap.text;
  const start = Math.max(0, text.lastIndexOf('.', Math.max(0, cap.at - 1)) + 1);
  let end = text.indexOf('.', cap.at);
  end = end < 0 ? text.length : end + 1;
  const raw = text.slice(start, end);
  const sentence = raw.trim();
  const offset = cap.at - (start + (raw.length - raw.trimStart().length));
  const words = sentence.split(' ');
  let pos = 0;
  return (
    <p className="st-caption" role="status">
      {words.map((w, i) => {
        const on = offset >= pos && offset < pos + w.length + 1;
        pos += w.length + 1;
        return (
          <span key={i} className={on ? 'is-on' : ''}>
            {w}{' '}
          </span>
        );
      })}
    </p>
  );
}

export function SpatialUI({ replayIntro }: { replayIntro: () => void }) {
  const chapter = useSpatial((s) => s.chapter);
  const dir = useSpatial((s) => s.dir);
  const tour = useSpatial((s) => s.tour);
  const walking = useSpatial((s) => s.walk);
  /** The apps are tucked into the corner button (in the tour or while walking). */
  const apps = tour || walking;
  const toast = useSpatial((s) => s.toast);
  const dock = useSpatial((s) => s.dock);
  const windows = useSpatial((s) => s.windows);
  const homeView = useSpatial((s) => s.homeView);
  const control = useSpatial((s) => s.control);
  const look360 = useSpatial((s) => s.look360);
  const envAuto = useSpatial((s) => s.envAuto);
  const narrate = useSpatial((s) => s.narrate);
  const [hands, setHands] = useState(false);
  const [full, setFull] = useState(false);
  /** The AI voice starts muted; ask once, after the splash. */
  const [asked, setAsked] = useState(false);
  /** The apps being drawn into the tour button, or coming back out of it. */
  const [genie, setGenie] = useState<'idle' | 'swallowing' | 'releasing'>('idle');
  const wasTour = useRef(tour);
  useEffect(() => {
    if (wasTour.current && !tour) {
      setGenie('releasing');
      playUi('open');
      const t = window.setTimeout(() => setGenie('idle'), 950);
      wasTour.current = tour;
      return () => window.clearTimeout(t);
    }
    wasTour.current = tour;
  }, [tour]);
  /** The corner button: swallow the apps and start the tour, or let them back out. */
  const tourButton = () => {
    if (walking) {
      // Walking: the apps are tucked away, so this button lets them out again.
      spatial.endWalk();
      playUi('open');
      return;
    }
    if (tour) {
      spatial.endTour(CHAPTERS[spatial.get().chapter]?.id ?? 'home');
      return;
    }
    if (genie !== 'idle') return;
    setGenie('swallowing');
    playUi('close');
    window.setTimeout(() => {
      replayIntro();
      setGenie('idle');
    }, 760);
  };
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => spatial.toast('Full view is not available in this browser'));
  };
  /** Refresh: a clean start (stops speech, closes everything, reloads the page on the same tab). */
  const refresh = () => {
    stopSpeaking();
    spatial.toast('Refreshing…');
    window.setTimeout(() => window.location.reload(), 150);
  };
  const ccRef = useRef<HTMLDivElement>(null);
  const voice = useVoice((text) => {
    const did = runCommand(text, { replayIntro, sound: (on) => spatial.set({ sound: on }) });
    spatial.toast(did ? `“${text}” · ${did}` : `“${text}” · try “open awards” or “ask who is Shreyas”`);
  });
  // The light follows the real time of day (checked every minute) until the visitor picks one.
  useEffect(() => {
    if (!envAuto) return;
    const tick = () => {
      const e = envNow();
      if (spatial.get().env !== e) spatial.set({ env: e });
    };
    tick();
    const t = window.setInterval(tick, 60000);
    return () => window.clearInterval(t);
  }, [envAuto]);
  // Close the Control Center when clicking elsewhere.
  useEffect(() => {
    if (!control) return;
    const off = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Node && ccRef.current?.contains(t)) return;
      if (t instanceof HTMLElement && t.closest('[data-cc-toggle]')) return;
      spatial.set({ control: false });
    };
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [control]);
  const c = CHAPTERS[chapter]!;
  const I = c.icon;
  return (
    <div className={`sp-ui ${look360 ? 'is-360' : ''} ${tour ? 'is-touring' : ''} is-${genie} ${walking ? 'is-walking' : ''}`}>
      <div className="sp-apps">
      {/* Capsule */}
      <nav className="sp-capsule" aria-label="Apps">
        <button type="button" className="sp-icon-btn" aria-label="Previous app" data-voice="previous" onClick={() => spatial.prev()} disabled={chapter === 0}>
          <CaretLeft weight="bold" />
        </button>
        <span className="sp-capsule-room" aria-live="polite">
          <I weight="duotone" aria-hidden="true" />
          <span>
            <b>{c.title}</b>
            <small>{c.line}</small>
          </span>
        </span>
        <button type="button" className="sp-icon-btn" aria-label="Next app" data-voice="next" onClick={() => spatial.next()} disabled={chapter === CHAPTERS.length - 1}>
          <CaretRight weight="bold" />
        </button>
      </nav>

      {/* App rail */}
      <nav className={`sp-rail ${dock ? '' : 'is-hidden'}`} aria-label="Apps">
        {CHAPTERS.map((x, i) => {
          const Ic = x.icon;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={i === chapter} aria-label={x.title} data-voice={x.title} className={i === chapter ? 'is-on' : ''} onClick={() => spatial.goChapter(i)}>
              <Ic weight={i === chapter ? 'fill' : 'regular'} aria-hidden="true" />
              <span className="sp-rail-tip">{x.title}</span>
            </button>
          );
        })}
      </nav>

      <Stage chapter={chapter} dir={dir} />
      {windows.includes('profile') && (
        <>
          <div className="os-scrim" aria-hidden="true" onClick={() => spatial.closeWindow('profile')} />
          <ProfileWindow />
        </>
      )}
      {homeView && <HomeView />}
      <Captions />
      </div>

      {/* The AI is always one tap away, in the tour too. */}
      <ChatBubble />

      {/* The tour button: draws the apps in and walks you through the house; then lets them out. */}
      <button
        type="button"
        className={`sp-tourbtn ${tour || walking ? 'is-tour' : ''} ${genie === 'swallowing' ? 'is-gulp' : ''}`}
        aria-label={apps ? 'Back to the apps' : 'Take the house tour'}
        data-voice={apps ? 'vision apps' : 'house tour'}
        onClick={tourButton}
      >
        <span className="sp-tourbtn-ico" key={apps ? 'apps' : 'tour'}>
          {apps ? <VirtualReality weight="fill" /> : <MapTrifold weight="fill" />}
        </span>
        <span className="sp-tourbtn-text" key={apps ? 'a' : 't'}>
          <b>{apps ? 'Vision apps' : 'House tour'}</b>
          <small>{apps ? 'Bring the apps back' : 'Walk through his home'}</small>
        </span>
      </button>

      {!asked && !tour && (
        <div className="sp-voiceask" role="dialog" aria-label="AI voice guide">
          <span className="cb-orb is-small" aria-hidden="true" />
          <span>
            <b>Would you like an AI voice to guide you?</b>
            <small>It reads each app aloud. You can change this any time with the speaker button.</small>
          </span>
          <div className="sp-voiceask-actions">
            <button type="button" className="sp-voiceask-btn" data-voice="keep muted" onClick={() => (spatial.setNarrate(false), setAsked(true))}>
              Keep muted
            </button>
            <button type="button" className="sp-voiceask-btn is-primary" data-voice="turn voice on" onClick={() => (spatial.setNarrate(true), setAsked(true))}>
              <SpeakerHigh weight="fill" aria-hidden="true" /> Turn voice on
            </button>
          </div>
        </div>
      )}

      {/* Modes */}
      <div className="sp-modes" role="toolbar" aria-label="Controls">
        <button
          type="button"
          className={`sp-icon-btn ${narrate ? 'is-on' : ''}`}
          aria-pressed={narrate}
          aria-label={narrate ? 'Mute the AI voice' : 'Turn the AI voice on'}
          title={narrate ? 'AI voice on' : 'AI voice muted'}
          data-voice={narrate ? 'mute voice' : 'unmute voice'}
          onClick={() => (spatial.setNarrate(!narrate), setAsked(true), spatial.toast(narrate ? 'AI voice muted' : 'AI voice on'))}
        >
          {narrate ? <SpeakerHigh weight="fill" /> : <SpeakerSlash weight="bold" />}
        </button>
        <button type="button" className={`sp-icon-btn ${homeView ? 'is-on' : ''}`} aria-pressed={homeView} aria-label="Home View" data-voice="home view" onClick={() => spatial.set({ homeView: !homeView, control: false })}>
          <SquaresFour weight={homeView ? 'fill' : 'bold'} />
        </button>
        <button
          type="button"
          className={`sp-icon-btn ${voice.listening ? 'is-on' : ''}`}
          aria-pressed={voice.listening}
          aria-label={voice.supported ? (voice.listening ? 'Stop listening' : 'Voice commands') : 'Voice commands are not supported in this browser'}
          disabled={!voice.supported}
          onClick={() => (voice.listening ? voice.stop() : voice.start())}
        >
          {voice.listening ? <Microphone weight="fill" /> : <MicrophoneSlash weight="bold" />}
        </button>
        <button type="button" className={`sp-icon-btn ${hands ? 'is-on' : ''}`} aria-pressed={hands} aria-label="Hand gestures" onClick={() => setHands(!hands)}>
          <HandWaving weight={hands ? 'fill' : 'bold'} />
        </button>
 <button type="button" className={`sp-icon-btn ${look360 ? 'is-on' : ''}`} aria-pressed={look360} aria-label="360 degree view" data-voice="360 view" onClick={() => spatial.set({ look360: !look360, control: false, homeView: false })}>
          <Globe weight={look360 ? 'fill' : 'bold'} />
        </button>
        <button type="button" className={`sp-icon-btn ${walking ? 'is-on' : ''}`} aria-pressed={walking} aria-label={walking ? 'Stop walking' : 'Walk freely through the house'} title="Walk (W A S D)" data-voice="walk" onClick={() => (walking ? spatial.endWalk() : spatial.startWalk())}>
          <Footprints weight={walking ? 'fill' : 'bold'} />
        </button>
        <button type="button" className={`sp-icon-btn ${full ? 'is-on' : ''}`} aria-pressed={full} aria-label={full ? 'Exit full view' : 'Full view'} title="Full view" data-voice="full view" onClick={toggleFull}>
          {full ? <CornersIn weight="bold" /> : <CornersOut weight="bold" />}
        </button>
        <button type="button" className="sp-icon-btn" aria-label="Refresh" title="Refresh" data-voice="refresh" onClick={refresh}>
          <ArrowClockwise weight="bold" />
        </button>
        <button type="button" data-cc-toggle="" className={`sp-icon-btn ${control ? 'is-on' : ''}`} aria-pressed={control} aria-label="Control Center" data-voice="control center" onClick={() => spatial.set({ control: !control, homeView: false })}>
          <SlidersHorizontal weight="bold" />
          <span className="sp-cc-label">Controls</span>
        </button>
      </div>
      {control && (
        <div ref={ccRef}>
          <ControlCenter voice={voice} hands={hands} setHands={setHands} replayIntro={replayIntro} />
        </div>
      )}

      {voice.listening && (
        <div className="sp-listening" role="status">
          <span className="sp-orb" aria-hidden="true" />
          {voice.heard ? `“${voice.heard}”` : 'Listening… try “open awards” or “next award”'}
        </div>
      )}
      {toast && (
        <p className="sp-toast" role="status">
          {toast}
        </p>
      )}

      {look360 && (
        <div className="sp-360-bar" role="status">
          <Globe weight="fill" aria-hidden="true" />
          <span>
            <b>360° view</b>
            <small>Drag to look all the way round</small>
          </span>
          <button type="button" className="os-round is-sm" aria-label="Exit 360 degree view" data-voice="exit 360" onClick={() => spatial.set({ look360: false })}>
            <X weight="bold" />
          </button>
        </div>
      )}
      {tour && <Tour />}
      {walking && <Walk />}
      <VideoOverlay />

      <Hands on={hands} onOff={() => setHands(false)} />
    </div>
  );
}
