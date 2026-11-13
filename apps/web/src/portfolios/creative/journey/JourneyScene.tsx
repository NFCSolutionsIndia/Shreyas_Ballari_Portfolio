import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Play } from '@phosphor-icons/react';
import { CHAPTERS, JOURNEY_ART } from '@/content/journeyChapters';
import { CalendarPage } from './CalendarPage';
import { Dial } from './Dial';
import { H, W } from './geometry';
import { JourneyTimeline } from './JourneyTimeline';
import { KeyChaptersMap } from './KeyChaptersMap';
import { MilestoneCard } from './MilestoneCard';
import { Polaroids } from './Polaroids';
import { goToChapter, journey, LAST, useActive } from './store';
import './journey.css';

/**
 * Journey Through Time (Creative tab), Phase 1: the full 1440×900 composition from the Figma J
 * frames, every part driven by one progress value. Scroll pinning, the paper curl, the opening
 * sequence and the inner pages arrive in later phases (docs/journey-plan.md).
 */

const FONTS =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=DM+Serif+Display&family=Kaushan+Script&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';

/** Fit the composition inside the viewport (the backdrop bleeds to the edges). */
function useFit() {
  const [f, setF] = useState({ s: 1, x: 0, y: 0, vw: W, vh: H });
  useLayoutEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / W, vh / H);
      setF({ s, x: (vw - W * s) / 2, y: (vh - H * s) / 2, vw, vh });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return f;
}

export function JourneyScene() {
  const fit = useFit();
  const active = useActive();
  const root = useRef<HTMLElement>(null);
  const ch = CHAPTERS[active]!;

  // Arriving with #ch-<slug>: go straight there.
  useEffect(() => {
    const slug = location.hash.replace(/^#ch-/, '');
    const i = CHAPTERS.findIndex((c) => c.slug === slug);
    if (i > 0) goToChapter(i, { instant: true });
    return () => journey.set(0);
  }, []);

  // Mirror the settled chapter in the hash (no new history entries).
  useEffect(() => {
    const id = window.setTimeout(() => {
      history.replaceState(null, '', `${location.pathname}${location.search}#ch-${CHAPTERS[active]!.slug}`);
    }, 400);
    return () => window.clearTimeout(id);
  }, [active]);

  // Keyboard, and (until Phase 2's scroll timeline) one wheel step per gesture.
  useEffect(() => {
    let lock = 0;
    const step = (dir: number) => {
      const now = performance.now();
      if (now < lock) return;
      lock = now + 900;
      goToChapter(Math.round(journey.get()) + dir);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      const back = ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
      const fwd = ['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
      if (!back && !fwd) return;
      e.preventDefault();
      step(fwd ? 1 : -1);
    };
    const el = root.current;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      e.stopPropagation();
      step(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    el?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      el?.removeEventListener('wheel', onWheel);
    };
  }, []);

  const world = { transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.s})` } as CSSProperties;

  return (
    <section ref={root} className="jt" aria-label="Journey Through Time">
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <div className="jt-world" style={world}>
        {/* Backdrop inside the world (so the calendar's Lighten blend sees it), bleeding to the
            screen edges. */}
        <div
          className="jt-bleed"
          style={{ left: -fit.x / fit.s, top: -fit.y / fit.s, width: fit.vw / fit.s, height: fit.vh / fit.s }}
          aria-hidden="true"
        >
          <img src={JOURNEY_ART.backdrop} alt="" className="jt-backdrop" />
          <div className="jt-vignette" />
        </div>

        {/* Orbit behind the calendar */}
        <svg className="jt-orbit" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <ellipse cx="668" cy="330" rx="440" ry="150" className="jt-orbit-glow" />
          <ellipse cx="668" cy="330" rx="440" ry="150" className="jt-orbit-line" />
          {[
            [254.5, 278.7, 5],
            [1049, 255, 4],
            [1081.5, 381.3, 6],
            [448, 460, 3.5],
            [591.6, 182.3, 3],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} className="jt-spark" style={{ animationDelay: `${i * -1.3}s` }} />
          ))}
        </svg>

        <Polaroids layer="back" />
        <KeyChaptersMap />
        <Dial />

        {/* The photoreal desk calendar; its dark background drops out with Lighten. */}
        <img src={JOURNEY_ART.calendar} alt="" className="jt-calendar" aria-hidden="true" />
        <CalendarPage />
        <Polaroids layer="front" />

        {/* Nav */}
        <header className="jt-nav">
          <button type="button" className="jt-logo" onClick={() => goToChapter(0)} aria-label="Shreyas, back to chapter 1">
            Shreyas
          </button>
          <nav className="jt-pills" aria-label="Main">
            <button type="button" className="jt-pill is-active" aria-current="page" onClick={() => goToChapter(0)}>
              Journey
            </button>
            <Link to="/projects" className="jt-pill">
              Projects
            </Link>
            <Link to="/about" className="jt-pill">
              About
            </Link>
            <Link to="/contact" className="jt-pill">
              Contact
            </Link>
          </nav>
          <Link to="/contact" className="jt-talk">
            Let’s Talk <ArrowUpRight size={14} weight="bold" />
          </Link>
        </header>

        {/* Left hero */}
        <div className="jt-hero">
          <p className="jt-label">Portfolio</p>
          <h1 className="jt-headline">
            My Journey
            <br />
            Through
          </h1>
          <p className="jt-time">Time.</p>
          <svg className="jt-swoosh" viewBox="0 0 210 30" aria-hidden="true">
            <path d="M 4 22 C 50 8, 120 4, 206 14" />
          </svg>
          <p className="jt-intro">
            An interactive calendar that tells the story of my school years, research and the moments that shaped me.
          </p>
          <button type="button" className="jt-explore" onClick={() => goToChapter(active === LAST ? 0 : active + 1)}>
            <span aria-hidden="true">
              <Play size={12} weight="fill" />
            </span>
            Explore the Journey
          </button>
        </div>

        <MilestoneCard />
        <JourneyTimeline />

        <p className="jt-scroll" aria-hidden="true">
          <span className="jt-mouse" />
          Scroll to Explore
        </p>
      </div>

      {/* The same story as plain HTML for screen readers. */}
      <ol className="jt-sr">
        {CHAPTERS.map((c, i) => (
          <li key={c.slug}>
            <article aria-current={i === active ? 'step' : undefined}>
              <h2>
                Chapter {i + 1}: {c.title}
              </h2>
              <p>
                {c.date} · {c.place}
              </p>
              <p>{c.description}</p>
              <p>{c.tags.join(', ')}</p>
            </article>
          </li>
        ))}
      </ol>
      <p className="jt-sr" aria-live="polite">
        Chapter {active + 1} of {CHAPTERS.length}: {ch.title}. {ch.description}
      </p>
    </section>
  );
}
