import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowsOut,
  Brain,
  ChatsCircle,
  Dna,
  Flag,
  Lightning,
  Pause,
  Play,
  ShieldCheck,
  SpeakerHigh,
  SpeakerSlash,
  Target,
  Warning,
} from '@phosphor-icons/react';
import { oncure, profile } from '@/content/portfolio';
import { speak } from '../story/narrator';
import { useSpatial } from '../store';
import { askAI } from './Dashboard';

/**
 * Oncure: his research video in a cinema window (custom glass controls, and the colours of the
 * film spilling softly around it), with a panel beside it that explains the concept in his own
 * words: overview, the five steps, the problem, the challenges and the road ahead.
 * Oncure is a conceptual research proposal, and the page says so.
 */

const st = (i: number, extra?: CSSProperties) => ({ '--i': i, ...extra }) as CSSProperties;
const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

type Tab = 'overview' | 'steps' | 'problem' | 'challenges' | 'roadmap';
const TABS: { id: Tab; k: string; icon: typeof Dna }[] = [
  { id: 'overview', k: 'Overview', icon: Dna },
  { id: 'steps', k: 'How it works', icon: Lightning },
  { id: 'problem', k: 'The problem', icon: Warning },
  { id: 'challenges', k: 'Challenges', icon: Target },
  { id: 'roadmap', k: 'Roadmap', icon: Flag },
];


function Cinema() {
  const video = useRef<HTMLVideoElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [started, setStarted] = useState(false);
  const narrate = useSpatial((s) => s.narrate);

  // Ambient light: a tiny copy of the current frame, blurred, behind the window.
  useEffect(() => {
    const v = video.current;
    const c = glow.current?.getContext('2d');
    if (!v || !c) return;
    let id = 0;
    const draw = () => {
      if (v.readyState >= 2) c.drawImage(v, 0, 0, 32, 18);
    };
    const loop = () => {
      draw();
      id = window.setTimeout(loop, playing ? 160 : 600);
    };
    loop();
    return () => window.clearTimeout(id);
  }, [playing]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      setStarted(true);
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => setStarted(false));
      });
    } else v.pause();
  };
  const seek = (e: ReactPointerEvent<HTMLDivElement>) => {
    const v = video.current;
    if (!v || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur;
  };

  return (
    <section className="onc-cinema">
      <canvas ref={glow} className="onc-glow" width={32} height={18} aria-hidden="true" />
      <div className={`onc-screen ${playing ? 'is-playing' : ''} ${started ? 'is-started' : ''}`}>
        <video
          ref={video}
          src={oncure.video}
          preload="metadata"
          playsInline
          muted={muted}
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          aria-label="Oncure, a video by Shreyas Ballari"
        />
        {!started && (
          <div className="onc-poster">
            <span className="onc-badge">
              <Dna weight="fill" aria-hidden="true" /> Research concept
            </span>
            <h2>Oncure</h2>
            <p>{oncure.tagline.split(' · ')[0]}</p>
            <small>A video by {profile.name}</small>
          </div>
        )}
        <button type="button" className="onc-big" aria-label={playing ? 'Pause the video' : 'Play the Oncure video'} data-voice={playing ? 'pause video' : 'play video'} onClick={toggle}>
          {playing ? <Pause weight="fill" /> : <Play weight="fill" />}
        </button>
        <div className="onc-bar">
          <button type="button" className="onc-ctl" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
            {playing ? <Pause weight="fill" /> : <Play weight="fill" />}
          </button>
          <div className="onc-track" role="slider" aria-label="Video position" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} tabIndex={0} onPointerDown={seek}>
            <i style={{ transform: `scaleX(${dur ? t / dur : 0})` }} />
          </div>
          <small>
            {fmt(t)} / {fmt(dur)}
          </small>
          <button type="button" className="onc-ctl" aria-label={muted ? 'Sound on' : 'Mute'} onClick={() => setMuted((m) => !m)}>
            {muted ? <SpeakerSlash weight="fill" /> : <SpeakerHigh weight="fill" />}
          </button>
          <button type="button" className="onc-ctl" aria-label="Full screen" onClick={() => void video.current?.requestFullscreen?.()}>
            <ArrowsOut weight="bold" />
          </button>
        </div>
      </div>
      <footer className="onc-under">
        <div>
          <b>Oncure · AI-powered nanobot cancer treatment</b>
          <small>{oncure.disclaimer}</small>
        </div>
        <div className="onc-actions">
          <button type="button" className="os-chip" data-voice="listen" onClick={() => speak(`${oncure.summary} ${oncure.disclaimer}`)}>
            <SpeakerHigh weight="bold" aria-hidden="true" /> {narrate ? 'Listen' : 'Read aloud'}
          </button>
          <button type="button" className="os-chip" data-voice="ask ai" onClick={() => askAI('Tell me about Oncure')}>
            <ChatsCircle weight="bold" aria-hidden="true" /> Ask AI
          </button>
        </div>
      </footer>
    </section>
  );
}

function List({ items, numbered = false }: { items: { title: string; line: string }[]; numbered?: boolean }) {
  return (
    <ol className={`onc-list ${numbered ? 'is-numbered' : ''}`}>
      {items.map((x, i) => (
        <li key={x.title} style={st(i)}>
          {numbered && <span className="onc-n">{i + 1}</span>}
          <span>
            <b>{x.title}</b>
            <small>{x.line}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OncureApp() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div className="os-scene onc">
      <Cinema />
      <aside className="os-pane onc-panel">
        <nav className="onc-tabs" role="tablist" aria-label="About Oncure">
          {TABS.map((x) => {
            const I = x.icon;
            return (
              <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'is-on' : ''} data-voice={x.k} onClick={() => setTab(x.id)}>
                <I weight={tab === x.id ? 'fill' : 'bold'} aria-hidden="true" />
                <span>{x.k}</span>
              </button>
            );
          })}
        </nav>
        <div className="onc-body" key={tab}>
          {tab === 'overview' && (
            <>
              <p className="onc-pitch">{oncure.pitch}</p>
              <p className="onc-text">{oncure.summary}</p>
              <p className="onc-label">What it values</p>
              <div className="onc-values">
                {oncure.values.map((v, i) => (
                  <span key={v.title} style={st(i)}>
                    <b>{v.title}</b>
                    <small>{v.line}</small>
                  </span>
                ))}
              </div>
              <p className="onc-label">Key features</p>
              <List items={oncure.features} />
            </>
          )}
          {tab === 'steps' && (
            <>
              <p className="onc-text">How Oncure is intended to work. A conceptual workflow: the full process has not been demonstrated.</p>
              <List items={oncure.steps} numbered />
              <p className="onc-note">
                <ShieldCheck weight="fill" aria-hidden="true" /> A person verifies what the AI finds before any treatment, so no unnecessary cell death takes place.
              </p>
            </>
          )}
          {tab === 'problem' && (
            <>
              <p className="onc-text">From his research essay: the problems Oncure sets out to solve.</p>
              <List items={oncure.problems} />
            </>
          )}
          {tab === 'challenges' && (
            <>
              <p className="onc-text">What would have to be solved first. The technology does not exist yet, but it is getting smaller every year:</p>
              <ul className="onc-evidence">
                {oncure.evidence.map((e) => (
                  <li key={e}>
                    <Brain weight="duotone" aria-hidden="true" /> {e}
                  </li>
                ))}
              </ul>
              <List items={oncure.challenges} />
            </>
          )}
          {tab === 'roadmap' && (
            <>
              <p className="onc-text">{oncure.vision} The next steps, in order:</p>
              <List items={oncure.roadmap} numbered />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
