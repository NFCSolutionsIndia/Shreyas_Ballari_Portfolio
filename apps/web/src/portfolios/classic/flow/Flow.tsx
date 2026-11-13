import { Component, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, CornersOut, DownloadSimple, EnvelopeSimple, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import '@fontsource-variable/geist';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { achievements, courses, languages, percentiles, profile, resumeExtra, subjects } from '@/content/portfolio';
import { Dock, Logo, NAV_ITEMS } from './Dock';
import { Film, Finance, Stack3D, TechSkills } from './sequel';
import { StageHero } from '../hero/StageHero';
import { show, useFx, type Fx, type Reg } from './fx';
import { F, RESUME, envelope, out, seg, smooth, within } from './timeline';
import { TOPICS, type Topic } from './topics';
import './flow.css';
import './chapters.css';

const FlowCanvas = lazy(() => import('./FlowCanvas'));

/** If the browser cannot make a WebGL context, the film carries on without the 3D layer. */
class Optional3D extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* The particles and chrome star are decoration; everything else still works. */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function canWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Classic, as one scroll film (pinned to the screen while it plays):
 *  hero panel → it tips and shrinks into a ring of cards (click one, or keep scrolling for Oncure)
 *  → a black star swallows the screen → a particle sphere bursts → the chosen topic in detail
 *  → the problem in numbers → how Oncure would work → challenges and roadmap → projects
 *  → recognition → courses and skills → activities (a fly-through) → goals → the closing panel.
 * Every chapter registers one update function; a single loop feeds them the scroll position.
 */

const BASE = import.meta.env.BASE_URL;

/** Where the menu jumps to (scroll progress). */
const JUMP: Record<string, number> = {
  home: 0,
  work: 0.1,
  oncure: 0.37,
  finance: 0.56,
  awards: 0.74,
  skills: 0.95,
  contact: 1,
};
const activeAt = (t: number) => {
  if (t > 0.95) return 'contact';
  if (t < 0.05) return 'home';
  let id = 'home';
  for (const n of NAV_ITEMS) if (t >= JUMP[n.id]! - 0.03) id = n.id;
  return id;
};

// --- Hero ----------------------------------------------------------------------------------------

/** The violet panel hero (kept for an earlier design; the hologram hero opens the page now). */
export function Hero({ reg, go }: { reg: Reg; go: (id: string) => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    const k = within(t, 'hero');
    const p = panel.current;
    if (!p) return;
    show(p, k < 1);
    const e = smooth(k);
    p.style.transform = `translate(-50%, -50%) perspective(1600px) rotateX(${e * 22}deg) rotateZ(${-e * 16}deg) scale(${1 - e * 0.68})`;
    p.style.borderRadius = `${24 + e * 40}px`;
    p.style.opacity = String(1 - seg(k, 0.72, 1));
    if (inner.current) inner.current.style.opacity = String(1 - seg(k, 0.2, 0.55));
  });
  // The photo card leans towards the pointer.
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const c = card.current;
    if (!c) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    c.style.setProperty('--rx', `${-y * 10}deg`);
    c.style.setProperty('--ry', `${x * 14}deg`);
  };
  return (
    <div ref={panel} className="fh" onPointerMove={onMove}>
      <div ref={inner} className="fh-inner">
        <h1 className="fh-title">
          <span className="fh-line">
            <span>Shreyas Ballari</span>
          </span>
          <span className="fh-line is-dim">
            <span>thinks ahead</span>
          </span>
        </h1>
        <div ref={card} className="fh-card">
          <img src={`${BASE}assets/shreyas/portrait-studio.jpg`} alt={`${profile.name}, in a dark suit and blue tie`} />
          <svg viewBox="-50 -50 100 100" aria-hidden="true">
            <path d="M0 -46 Q6 -6 46 0 Q6 6 0 46 Q-6 6 -46 0 Q-6 -6 0 -46Z" />
          </svg>
        </div>
        <div className="fh-left">
          <p>
            {resumeExtra.headline}. A junior at {profile.school}, researching how AI and nanotechnology could make cancer treatment more precise, and building an AI trading app.
          </p>
          <div className="fh-btns">
            <a className="fh-btn" href={RESUME} download="Shreyas_Ballari_Resume.pdf">
              <DownloadSimple weight="bold" aria-hidden="true" /> Download resume
            </a>
            <button type="button" className="fh-btn is-ghost" onClick={() => go('work')}>
              See his work <ArrowDown weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ul className="fh-chips" aria-label="Highlights">
          <li>
            <b>99th</b> PSAT
          </li>
          <li>
            <b>99th</b> MAP
          </li>
          <li>
            <b>{achievements.length}</b> awards
          </li>
        </ul>
        <p className="fh-right">
          Junior · {profile.school}
          <br />
          {profile.schoolTown}
        </p>
        <p className="fh-scroll" aria-hidden="true">
          Scroll
        </p>
      </div>
    </div>
  );
}

// --- The photo hero, which closes down into the ring's front card ---------------------------------

function HeroLayer({ reg }: { reg: Reg }) {
  const wrap = useRef<HTMLDivElement>(null);
  useFx(reg, (t, vw, vh) => {
    const el = wrap.current;
    if (!el) return;
    const k = within(t, 'hero');
    show(el, k < 1);
    if (k >= 1) return;
    const e = smooth(k);
    // The card in front of the ring: same size and place.
    const w = Math.min(340, Math.max(190, vw * 0.22));
    const h = w * 1.48;
    const cy = vh * 0.52;
    const x = (e * (vw - w)) / 2;
    const top = e * (cy - h / 2);
    const bottom = e * (vh - cy - h / 2);
    el.style.clipPath = `inset(${top}px ${x}px ${bottom}px ${x}px round ${e * 24}px)`;
    const inner = el.firstElementChild as HTMLElement | null;
    if (inner) inner.style.transform = `scale(${1 - e * 0.42})`;
  });
  return (
    <div ref={wrap} className="fl-herolayer">
      <StageHero />
    </div>
  );
}

// --- Ring of cards: the hero card, then his education -----------------------------------------------

const EDU: { tag: string; title: string; lines: string[]; tone: 'violet' | 'night' | 'lime'; image?: string }[] = [
  { tag: 'High school', title: profile.school, lines: [`${profile.grade} · ${profile.schoolTown}`, 'All Honors and AP coursework'], tone: 'violet', image: `${BASE}assets/journey/academy.placeholder.jpg` },
  { tag: 'AP & Honors', title: 'Courses', lines: ['AP Computer Science A', 'AP CS Principles', 'AP Precalculus', 'AP Biology · AP Chemistry', 'AP Physics C'], tone: 'night' },
  { tag: 'Code', title: 'Languages', lines: languages, tone: 'lime' },
  { tag: 'Interests', title: 'Subjects he loves', lines: subjects, tone: 'violet' },
  { tag: 'Middle school', title: 'Francis Granger Middle School', lines: ['Project Arrow advanced program'], tone: 'night' },
  { tag: 'Elementary', title: 'Nancy Young Elementary School', lines: ['Where the curiosity started'], tone: 'lime' },
];

function Ring({ reg }: { reg: Reg }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const marquee = useRef<HTMLParagraphElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  useFx(reg, (t) => {
    // In place (full size, facing you) by the time the hero lands on its card; then it turns.
    const enter = out(seg(t, F.hero[0] + 0.015, F.hero[1]));
    const a = seg(t, F.hero[1], F.carousel[1] + 0.02);
    const cover = seg(t, F.star[0], F.star[1]);
    const on = enter > 0 && cover < 0.9;
    show(wrap.current, on);
    show(marquee.current, on);
    show(hint.current, on);
    if (!on) return;
    wrap.current!.style.transform = `translate(-50%, -50%) scale(${0.7 + enter * 0.3})`;
    ring.current!.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${-a * 330}deg)`;
    marquee.current!.style.opacity = String(enter);
    marquee.current!.style.transform = `translate(${-a * 55}%, -50%)`;
    hint.current!.style.opacity = String(seg(t, F.hero[1], F.hero[1] + 0.02) * (1 - seg(t, F.star[0] - 0.01, F.star[0] + 0.005)));
  });
  return (
    <>
      <p ref={marquee} className="fl-marquee" aria-hidden="true">
        {[0, 1].map((k) => (
          <span key={k}>
            Curiosity without limits <i>○</i> Research, code and teaching <i>○</i> Ideas that grow <i>○</i>{' '}
          </span>
        ))}
      </p>
      <div ref={wrap} className="fl-carousel">
        <div ref={ring} className="fl-ring" style={{ '--n': EDU.length + 1 } as CSSProperties}>
          <div className="fl-card is-hero" style={{ '--i': 0 } as CSSProperties} aria-hidden="true">
            <div className="fl-heromini">
              <StageHero mini />
            </div>
          </div>
          {EDU.map((c, i) => (
            <article key={c.title} className={`fl-card is-${c.tone} is-edu`} style={{ '--i': i + 1 } as CSSProperties}>
              {c.image && <img src={c.image} alt="" loading="lazy" />}
              <span className="fl-card-head">
                <span className="fl-pill">{c.tag}</span>
                <span className="fl-site">{String(i + 1).padStart(2, '0')}</span>
              </span>
              <span className="fl-card-foot">
                <b>{c.title}</b>
                <ul>
                  {c.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </span>
            </article>
          ))}
        </div>
      </div>
      <p ref={hint} className="fl-hint">
        His education · keep scrolling
      </p>
    </>
  );
}

// --- The black star, the spark ---------------------------------------------------------------

function Star({ reg, bg }: { reg: Reg; bg: MutableRefObject<HTMLDivElement | null> }) {
  const star = useRef<SVGSVGElement>(null);
  const spark = useRef<SVGSVGElement>(null);
  useFx(reg, (t) => {
    const cover = seg(t, F.star[0], F.star[1]);
    const s = Math.pow(cover, 2.4);
    const st = star.current;
    if (st) {
      st.style.transform = `translate(-50%, -50%) rotate(${cover * 40}deg) scale(${0.001 + s * 42})`;
      st.style.opacity = cover > 0 && t < F.detail[1] ? '1' : '0';
    }
    if (bg.current) bg.current.style.background = cover >= 0.98 ? '#000' : '#fff';
    const on = seg(t, F.star[0] + 0.02, F.star[1]) * (1 - seg(t, F.detail[0] + 0.004, F.detail[0] + 0.02));
    const sp = spark.current;
    if (sp) {
      sp.style.opacity = String(on);
      const grow = Math.pow(seg(t, F.fill[0], F.fill[1]), 3);
      sp.style.transform = `translate(-50%, -50%) scale(${0.6 + on * 0.4 + grow * 140}) rotate(${t * 900 * (1 - grow)}deg)`;
    }
  });
  return (
    <>
      <svg ref={star} className="fl-star" viewBox="-50 -50 100 100" aria-hidden="true">
        <path d="M0 -50 Q7 -7 50 0 Q7 7 0 50 Q-7 7 -50 0 Q-7 -7 0 -50Z" />
      </svg>
      <svg ref={spark} className="fl-spark" viewBox="-50 -50 100 100" aria-hidden="true">
        <path d="M0 -50 Q6 -6 50 0 Q6 6 0 50 Q-6 6 -50 0 Q-6 -6 0 -50Z" />
      </svg>
    </>
  );
}

// --- The chosen topic ----------------------------------------------------------------------------

function OncureVideo({ src }: { src: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const toggle = () => {
    const el = v.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (el.paused) void el.play().catch(() => undefined);
  };
  return (
    <div className="fd-video">
      <video ref={v} src={src} muted loop playsInline autoPlay preload="metadata" />
      <div className="fd-vbar">
        <span>Oncure · Shreyas Ballari</span>
        <button type="button" onClick={toggle} aria-label={muted ? 'Turn the sound on' : 'Mute'}>
          {muted ? <SpeakerSlash weight="bold" /> : <SpeakerHigh weight="bold" />}
        </button>
        <button type="button" onClick={() => void v.current?.requestFullscreen?.().catch(() => undefined)} aria-label="Watch in full screen">
          <CornersOut weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function Detail({ reg, topic, setTopic }: { reg: Reg; topic: Topic; setTopic: (i: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    const k = within(t, 'detail');
    const el = root.current;
    if (!el) return;
    const on = k > 0 && k < 1;
    show(el, on);
    if (!on) return;
    const enter = out(seg(k, 0.08, 0.24));
    const exit = seg(k, 0.88, 1);
    el.style.opacity = String(1 - exit);
    el.style.transform = `scale(${1 - exit * 0.08})`;
    el.style.filter = exit > 0 ? `blur(${exit * 8}px)` : 'none';
    el.style.setProperty('--in', enter.toFixed(3));
    // The picture opens out of the centre, where the star was.
    if (media.current) media.current.style.clipPath = `circle(${enter * 75}% at 50% 50%)`;
    // The summary lights up word by word, then the points one after another.
    el.querySelectorAll<HTMLElement>('.fw').forEach((w, i, all) => {
      w.classList.toggle('is-on', k > 0.1 + (i / all.length) * 0.3);
    });
    // Points light up one after another as you scroll.
    el.querySelectorAll<HTMLElement>('.fd-point').forEach((p, i, all) => {
      const at = 0.12 + (i / Math.max(1, all.length)) * 0.3;
      const v = out(seg(k, at, at + 0.08));
      p.style.opacity = String(v);
      p.style.transform = `translateY(${(1 - v) * 18}px)`;
    });
  });
  return (
    <div ref={root} className="fd">
      <div className="fd-text" key={topic.id}>
        <p className="fd-kicker">{topic.kicker}</p>
        <h2 className="fd-title">{topic.heading}</h2>
        <p className="fd-summary">
          {topic.summary.split(' ').map((w, i) => (
            <span key={i} className="fw">
              {w}{' '}
            </span>
          ))}
        </p>
        <ol className={`fd-points ${topic.points.length > 4 ? 'is-two' : ''}`}>
          {topic.points.map((p, i) => (
            <li key={p.title} className="fd-point">
              <span className="fd-n">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <b>{p.title}</b>
                {p.line && <small>{p.line}</small>}
              </span>
            </li>
          ))}
        </ol>
        {topic.note && <p className="fd-note">{topic.note}</p>}
        {topic.to && (
          <Link className="fd-link" to={topic.to.href}>
            {topic.to.label} <ArrowRight weight="bold" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div ref={media} className="fd-media" key={`m-${topic.id}`}>
        {topic.video ? <OncureVideo src={topic.video} /> : <img src={topic.image} alt="" />}
        {!topic.video && <span className="fd-tag">Illustration</span>}
      </div>
      <div className="fd-tabs" role="tablist" aria-label="Topics">
        {TOPICS.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === topic.id} className={x.id === topic.id ? 'is-on' : ''} onClick={() => setTopic(i)}>
            {x.title}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Recognition: cards dealt from a stack ------------------------------------------------------

const STATS = [
  { big: 99, suffix: 'th', label: 'PSAT percentile', sub: percentiles.filter((p) => p.test === 'PSAT').map((p) => `${p.grade}: ${p.value}th`).join(' · ') },
  { big: 99, suffix: 'th', label: 'MAP percentile', sub: percentiles.filter((p) => p.test === 'MAP').map((p) => `${p.grade}: ${p.value}th`).join(' · ') },
  { big: 1280, suffix: '', label: 'PSAT 8/9 score, out of 1440', sub: '8th grade, top 1% nationwide' },
  { big: 1, prefix: 'Top ', suffix: '%', label: 'MAP and i-Ready', sub: 'Mathematics and English Language Arts' },
];
const AWARDS = ['College Board National Recognition Program', 'Principal’s Honors List 2025 and 2026', 'Project Arrow since 2nd grade', 'Young Authors Contest winner 2023', 'Mini-Medical School 2021'];

export function Numbers({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    const k = within(t, 'numbers');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.08));
    el.querySelectorAll<HTMLElement>('.fn-card').forEach((c, i) => {
      const at = 0.08 + i * 0.1;
      const v = out(seg(k, at, at + 0.18));
      // From a stack at the bottom centre to its place in the row.
      c.style.transform = `translate(${(1 - v) * (1.5 - i) * 100}%, ${(1 - v) * 60}vh) rotate(${(1 - v) * (i - 1.5) * 12}deg)`;
      c.style.opacity = String(Math.min(1, v * 2));
      const b = c.querySelector<HTMLElement>('b');
      const d = STATS[i]!;
      if (b) b.textContent = `${d.prefix ?? ''}${Math.round(d.big * v)}${d.suffix}`;
    });
  });
  return (
    <div ref={root} className="fn">
      <p className="fd-kicker">Recognition</p>
      <h2 className="fx-h">Top 1% nationwide, and all Honors and AP.</h2>
      <div className="fn-row">
        {STATS.map((s) => (
          <div key={s.label} className="fn-card">
            <b>
              {s.prefix ?? ''}
              {s.big}
              {s.suffix}
            </b>
            <span>{s.label}</span>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>
      <div className="fn-marquee" aria-label="Awards">
        <div>
          {[0, 1].map((r) => (
            <span key={r} aria-hidden={r === 1}>
              {AWARDS.map((a) => (
                <span key={a} className="fn-award">
                  <Logo size={18} /> {a}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Courses and skills: pills fly in and settle ------------------------------------------------

export function Skills({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  const seeds = useRef(courses.map((_, i) => ({ x: Math.sin(i * 12.9) * 60, y: Math.cos(i * 7.3) * 45, r: Math.sin(i * 3.1) * 60, z: -400 - (i % 4) * 200 })));
  useFx(reg, (t) => {
    const k = within(t, 'skills');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.08));
    el.querySelectorAll<HTMLElement>('.fk-pill').forEach((p, i) => {
      const s = seeds.current[i]!;
      const v = smooth(seg(k, 0.04 + i * 0.025, 0.36 + i * 0.025));
      p.style.transform = `translate3d(${(1 - v) * s.x}vw, ${(1 - v) * s.y}vh, ${(1 - v) * s.z}px) rotate(${(1 - v) * s.r}deg)`;
      p.style.opacity = String(Math.min(1, v * 1.5));
      p.style.filter = v < 1 ? `blur(${(1 - v) * 6}px)` : 'none';
    });
    el.querySelectorAll<HTMLElement>('.fk-lang').forEach((l, i) => {
      const v = out(seg(k, 0.5 + i * 0.06, 0.62 + i * 0.06));
      l.style.opacity = String(v);
      l.style.transform = `translateY(${(1 - v) * 40}px)`;
    });
    el.querySelectorAll<HTMLElement>('.fk-group').forEach((g, i) => {
      const v = out(seg(k, 0.62 + i * 0.04, 0.72 + i * 0.04));
      g.style.opacity = String(v);
      g.style.transform = `translateY(${(1 - v) * 30}px)`;
    });
  });
  return (
    <div ref={root} className="fk">
      <p className="fd-kicker">Courses and skills</p>
      <h2 className="fx-h">All Honors and AP, and three languages he codes in.</h2>
      <div className="fk-cloud">
        {courses.map((c) => (
          <span key={c} className="fk-pill">
            {c}
          </span>
        ))}
      </div>
      <div className="fk-langs">
        {languages.map((l) => (
          <span key={l} className="fk-lang">
            {l}
          </span>
        ))}
      </div>
      <div className="fk-groups">
        {resumeExtra.skills.slice(0, 4).map((g) => (
          <div key={g.group} className="fk-group">
            <b>{g.group}</b>
            <small>{g.items.slice(0, 4).join(' · ')}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- The closing panel ----------------------------------------------------------------------------

export function Cta({ reg }: { reg: Reg }) {
  const panel = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    const c1 = out(seg(t, F.goals[1] - 0.012, F.goals[1]));
    const c2 = smooth(seg(t, F.cta[0], F.cta[0] + 0.035));
    const p = panel.current;
    if (p) {
      show(p, c1 > 0);
      p.style.clipPath = `inset(${40 - c1 * 8 - c2 * 29.5}% ${Math.max(1.5, 40 - c1 * 6 - c2 * 32.5)}% round ${24 - c2 * 4}px)`;
      p.style.opacity = String(c1);
    }
    const tin = out(seg(t, F.cta[0] + 0.025, F.cta[0] + 0.06));
    const tx = text.current;
    if (tx) {
      show(tx, tin > 0);
      tx.style.opacity = String(tin);
      tx.style.transform = `translateY(calc(-50% + ${(1 - tin) * 30}px))`;
    }
  });
  return (
    <>
      <div ref={panel} className="fl-cta" />
      <div ref={text} className="fl-cta-text">
        <h2>
          Curious beyond
          <br />
          <span>all limits</span>
        </h2>
        <p>Research, code and teaching. If you have a question worth exploring, let’s build something meaningful together.</p>
        <div className="fl-cta-btns">
          <Link to="/contact" className="fl-btn">
            <EnvelopeSimple weight="bold" aria-hidden="true" /> Get in touch
          </Link>
          <a href={RESUME} download="Shreyas_Ballari_Resume.pdf" className="fl-btn is-ghost">
            <DownloadSimple weight="bold" aria-hidden="true" /> Download resume
          </a>
        </div>
      </div>
    </>
  );
}

// --- The film -------------------------------------------------------------------------------------

export function Flow() {
  const smoothScroll = useContext(SmoothScrollContext);
  const section = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);
  const fxs = useRef(new Set<Fx>());
  const [near, setNear] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [, setTopic] = useState(0);
  const [active, setActive] = useState('home');

  const [gl, setGl] = useState(false);
  useEffect(() => {
    setMounted(true);
    setGl(canWebGL());
  }, []);
  const reg = useCallback<Reg>((fx) => {
    fxs.current.add(fx);
    return () => void fxs.current.delete(fx);
  }, []);

  const scrollToT = useCallback(
    (t: number, duration = 1.8) => {
      const sec = section.current;
      if (!sec) return;
      const y = sec.getBoundingClientRect().top + window.scrollY + t * (sec.offsetHeight - window.innerHeight);
      if (smoothScroll) smoothScroll.scrollToY(y, { duration });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [smoothScroll],
  );
  const go = useCallback(
    (id: string) => {
      if (id === 'oncure') setTopic(0);
      if (id === 'home') {
        // Back to the hologram hero at the very top.
        if (smoothScroll) smoothScroll.scrollToY(0, { duration: 2 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      scrollToT(JUMP[id] ?? 0, 2.2);
    },
    [scrollToT, smoothScroll],
  );

  useEffect(() => {
    const sec = section.current;
    if (!sec) return;
    const io = new IntersectionObserver(([e]) => setNear(!!e?.isIntersecting), { rootMargin: '30% 0px' });
    io.observe(sec);
    let raf = 0;
    let last = '';
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 1.5) return;
      const t = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      progress.current = t;
      const vw = window.innerWidth;
      fxs.current.forEach((fx) => fx(t, vw, vh));
      const a = activeAt(t);
      if (a !== last) setActive((last = a));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <section ref={section} id="story" className="fl" aria-label={`${profile.name}: portfolio`}>
      <Dock go={go} active={active} />
      <div className="fl-stage">
        <div ref={bg} className="fl-bg" />
        <Ring reg={reg} />
        <HeroLayer reg={reg} />
        <Star reg={reg} bg={bg} />
        {mounted && gl && (
          <Optional3D>
            <Suspense fallback={null}>
              <FlowCanvas progress={progress} active={near} />
            </Suspense>
          </Optional3D>
        )}
        <Film reg={reg} />
        <Finance reg={reg} />
        <Stack3D reg={reg} />
        <TechSkills reg={reg} />
        {/* The older chapters after the sparkle (Detail, DeepStats, DeepPath, DeepGrid,
            Volumes, Numbers, Skills, Mosaic, Goals, Cta stay in the code). */}
      </div>
    </section>
  );
}
