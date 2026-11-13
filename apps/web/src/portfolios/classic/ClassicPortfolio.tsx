import { lazy, Suspense, useCallback, useContext, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Vector2 } from 'three';
import '@fontsource-variable/manrope';
import '@fontsource-variable/geist-mono';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { activities, goals, languages, profile, schools, stockApp, volunteering } from '@/content/portfolio';
import type { FieldState } from './particles/ParticleField';
import { AboutKeys } from './about/AboutKeys';
import { HoloHero } from './hero/HoloHero';
import { Flow } from './flow/Flow';
import { ArcIntro } from './intro/ArcIntro';
import './classic.css';
import './crt.css';

/**
 * Classic: a portfolio born from particles, laid out like the spartanai.framer.website reference
 * (pill nav, hero with featured card and logo strip, word-reveal statement with bento stats,
 * giant marquee headings, work cards with stat grids, capabilities accordion, vision with a
 * portrait card, carousel, design panel, process accordion, footer wordmark). One persistent
 * GPU particle system draws every visual and morphs between sections as the page scrolls.
 */

/** The sections below the hero are hidden for now (a new design is on the way); the code stays. */
const SHOW_SECTIONS = false;

const ParticleField = lazy(() => import('./particles/ParticleField'));

const LEGACY_NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'process', label: 'Process' },
  { id: 'contact', label: 'Contact' },
];

/** The new page: the hero, then the scroll film (anchors inside it). */
const NEW_NAV = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];

/** Section ids in page order; must match FORMATIONS order. */
const LEGACY_IDS = ['home', 'about', 'works', 'work', 'expertise', 'vision', 'journey', 'lab', 'process', 'contact'];
const NAV = SHOW_SECTIONS ? LEGACY_NAV : NEW_NAV;
const SECTION_IDS = SHOW_SECTIONS ? LEGACY_IDS : NEW_NAV.map((n) => n.id);

const WORK = [
  {
    tag: 'Research · AI in oncology',
    title: 'Oncure',
    to: '/research/oncure',
    stats: [
      ['Concept', 'Stage'],
      ['AI + nanobots', 'Approach'],
      ['Tumour cells', 'Target'],
      ['Researcher', 'Role'],
    ],
  },
  {
    tag: `FinTech · ${stockApp.status}`,
    title: stockApp.name,
    to: '/projects/stock-trading-app',
    stats: [
      ['Web app', 'Type'],
      ['AI model', 'Engine'],
      ['Beginners', 'For'],
      ['Builder', 'Role'],
    ],
  },
  {
    tag: 'Teaching',
    title: 'Peer tutoring',
    to: '/tutoring',
    stats: [
      ['Math · Science', 'Subjects'],
      ['7th–8th grade', 'Students'],
      ['Visual aids', 'Method'],
      ['Tutor', 'Role'],
    ],
  },
];

const CAPS = [
  { title: 'Computer Science', line: 'AP Computer Science Principles and AP Computer Science A, writing JavaScript, Python and Java.' },
  { title: 'Artificial Intelligence', line: 'An Artificial Intelligence course, and AI at the heart of Oncure and the trading app.' },
  { title: 'Business & FinTech', line: 'Entrepreneurship and DECA, and an AI-enabled trading platform in progress.' },
  { title: 'Biomedical research', line: 'AP Biology, AP Chemistry, Mini-Medical School and the TAMA Medical Camp lead to Oncure.' },
  { title: 'Teaching', line: 'Math and Science for 7th and 8th graders, with visual aids and one step at a time.' },
  { title: 'Writing', line: 'Young Authors Contest winner in 2023, and English Literature Honors.' },
];

const STEPS = [
  { title: 'Discover', tag: 'Notice', line: 'Every project starts by noticing a problem worth solving, like how hard cancer treatment is on healthy cells, or how confusing stock charts are for beginners.' },
  { title: 'Research', tag: 'Learn', line: 'Read, ask people who know, and learn the field before deciding anything.' },
  { title: 'Define', tag: 'Focus', line: 'Turn curiosity into one clear question that a project can answer.' },
  { title: 'Design', tag: 'Sketch', line: 'Sketch how an answer could work: the parts, the data, the flow.' },
  { title: 'Prototype', tag: 'Test', line: 'Build the smallest version that tests the idea.' },
  { title: 'Build', tag: 'Make', line: 'Make it real, in code or on paper.' },
  { title: 'Refine', tag: 'Improve', line: 'Test it, learn from it and make it better.' },
];

const JOURNEY = [
  ...schools.map((s) => ({ tag: 'School', title: s.name, line: s.level, who: 'Education' })),
  ...volunteering.map((v) => ({ tag: 'Volunteering', title: v.title, line: v.role, who: 'Giving back' })),
  ...activities.map((a) => ({ tag: 'Activity', title: a.title, line: a.role, who: 'Beyond class' })),
];

const VISION =
  'One day I want to set up a world-class, AI-enabled lab for cancer research, and build an AI trading platform that makes investing make sense.';

function Words({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <span className="pf-reveal" data-reveal style={{ ['--n' as string]: words.length }}>
      {words.map((w, i) => (
        <span key={i} style={{ ['--i' as string]: i }}>
          {w}{' '}
        </span>
      ))}
    </span>
  );
}

const GLYPHS = '!<>-_\/[]{}=+*^?#01ABCDEFX';

/** Decode a heading: random glyphs settle into the real text, left to right. */
function decode(el: HTMLElement) {
  const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue?.trim());
  if (!node) return;
  const final = node.nodeValue!;
  const start = performance.now();
  const dur = Math.min(1100, 300 + final.length * 28);
  const tick = (t: number) => {
    const k = Math.min(1, (t - start) / dur);
    const fixed = Math.floor(final.length * k);
    let out = final.slice(0, fixed);
    for (let i = fixed; i < final.length; i++) out += final[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    node.nodeValue = k >= 1 ? final : out;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Blocks that power on as they scroll in, and headings that decode. */
const REVEAL = '.pf-wcard, .pf-tcard, .pf-acc-tab, .pf-acc-open, .pf-proc-list li, .pf-person, .pf-techband, .pf-lab-panel, .pf-contact-row, .pf-foot-cols, .pf-rule, .pf-caps-left .pf-cta, .pf-journey-head';
const TEXT = '.pf-h2, .pf-sub, .pf-statement';
const DECODE = '.pf-h2, .pf-h3, .pf-wcard-title, .pf-proc-title, .pf-acc-label, .pf-lab-h, .pf-foot-brand';

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export function ClassicPortfolio() {
  const smooth = useContext(SmoothScrollContext);
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [N, setN] = useState(131072);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [cap, setCap] = useState(0);
  const [step, setStep] = useState(0);
  const sections = useRef<HTMLElement[]>([]);
  const choice = useRef({ cap: 0, step: 0 });
  const carousel = useRef<HTMLDivElement>(null);
  const state = useRef<FieldState>({ a: 0, b: 1, mix: 0, offA: 0, offB: 0, mouse: new Vector2(9, 9), ripple: 0, ready: 0 });

  useEffect(() => {
    setMounted(true);
    setWebgl(hasWebGL());
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const w = window.innerWidth;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setN(w < 700 || coarse ? 32768 : w < 1100 ? 65536 : 131072);
    sections.current = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  }, []);

  // A new capability or process step: rebuild that section's formation in place.
  useEffect(() => {
    if (choice.current.cap === cap) return;
    choice.current.cap = cap;
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('pf-rebuild', { detail: 'expertise' })));
  }, [cap]);
  useEffect(() => {
    if (choice.current.step === step) return;
    choice.current.step = step;
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('pf-rebuild', { detail: 'process' })));
  }, [step]);

  // CRT reveals: blocks power on and headings decode the first time they come into view.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.querySelector('.pf main');
    if (!root) return;
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || seen.has(e.target)) continue;
          seen.add(e.target);
          e.target.classList.add('is-in');
          if (!reduced) {
            if (e.target.matches(DECODE)) decode(e.target as HTMLElement);
            e.target.querySelectorAll<HTMLElement>(DECODE).forEach(decode);
          }
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    const mark = () => {
      root.querySelectorAll<HTMLElement>(`${REVEAL}, ${TEXT}`).forEach((el) => {
        if (el.classList.contains('crt-rv') || el.closest('#home')) return;
        el.classList.add('crt-rv');
        if (el.matches(TEXT)) el.classList.add('is-text');
        // Stagger siblings of the same kind.
        const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.className === el.className) : [];
        el.style.setProperty('--rv', String(Math.max(0, sibs.indexOf(el))));
        io.observe(el);
      });
    };
    mark();
    // New elements (accordion and process steps re-render) get the same treatment.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), mark()));
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(queued);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  // Scroll → which two formations, how far between them, and how far each has scrolled.
  useEffect(() => {
    let raf = 0;
    let lastActive = -1;
    let lastP = -1;
    const H = 2 * 14 * Math.tan((20 * Math.PI) / 180);
    const loop = () => {
      const secs = sections.current;
      if (secs.length) {
        const vh = window.innerHeight;
        const y = window.scrollY;
        const tops = secs.map((s) => s.getBoundingClientRect().top + y);
        let i = 0;
        while (i < tops.length - 1 && y >= tops[i + 1]!) i++;
        const next = Math.min(i + 1, secs.length - 1);
        const span = Math.max(1, tops[next]! - tops[i]!);
        const frac = next === i ? 0 : Math.min(1, Math.max(0, (y - tops[i]!) / span));
        const s = state.current;
        s.a = i;
        s.b = next;
        const m = Math.min(1, Math.max(0, (frac - 0.12) / 0.76));
        s.mix = m * m * (3 - 2 * m);
        s.offA = ((y - tops[i]!) / vh) * H;
        s.offB = -((tops[next]! - y) / vh) * H;
        const at = frac > 0.5 ? next : i;
        const nav = NAV.reduce((acc, n, k) => (SECTION_IDS.indexOf(n.id) <= at ? k : acc), 0);
        if (nav !== lastActive) setActive((lastActive = nav));
        const doc = document.documentElement.scrollHeight - vh;
        const p = Math.round((y / Math.max(1, doc)) * 500) / 500;
        if (p !== lastP) setProgress((lastP = p));
        // Tube tilt: cards tip back as they pass, like curved screens.
        document.querySelectorAll<HTMLElement>('.pf-wcard, .pf-lab-panel').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -50 || r.top > vh + 50) return;
          const c = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
          el.style.setProperty('--tilt', `${(-c * 16).toFixed(2)}deg`);
          el.style.setProperty('--tscale', (1 - Math.abs(c) * 0.06).toFixed(3));
        });
        // Word-by-word reveal of the big statements.
        document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
          const r = el.getBoundingClientRect();
          const t = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
          el.style.setProperty('--r', t.toFixed(3));
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onMove = (e: PointerEvent) => state.current.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    const onLeave = () => state.current.mouse.set(9, 9);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const go = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY;
      if (smooth) smooth.scrollToY(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [smooth],
  );
  const ripple = () => {
    state.current.ripple = 1;
  };
  const onNav = (e: MouseEvent, id: string) => {
    e.preventDefault();
    go(id);
  };
  const slide = (dir: number) => carousel.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });

  const live = mounted && webgl;

  return (
    <div className={`pf ${live ? 'is-live' : 'is-static'} ${reduced ? 'is-reduced' : ''}`}>
      {live && SHOW_SECTIONS && (
        <Suspense fallback={null}>
          <ParticleField state={state} N={N} reduced={reduced} sections={sections} choice={choice} onBuilt={() => undefined} />
        </Suspense>
      )}
      {SHOW_SECTIONS && <span className="pf-topline" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />}
      {SHOW_SECTIONS && <span className="crt-overlay" aria-hidden="true" />}
      {SHOW_SECTIONS && <span className="crt-band" aria-hidden="true" />}

      {/* Navigation: pill bar left, action right (as the reference) */}
      {SHOW_SECTIONS && (
      <header className="pf-nav">
        <nav className="pf-pill" aria-label="Sections">
          <a href="#home" className="pf-mark" onClick={(e) => onNav(e, 'home')} aria-label={`${profile.name}, home`}>
            <span />
          </a>
          {NAV.slice(1).map((n, i) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={i + 1 === active ? 'is-on' : ''}
              aria-current={i + 1 === active ? 'true' : undefined}
              onClick={(e) => onNav(e, n.id)}
              onPointerEnter={ripple}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <a href="#contact" className="pf-hire" onClick={(e) => onNav(e, 'contact')} onPointerEnter={ripple}>
          <span className="pf-hire-ico" aria-hidden="true">
            ✳
          </span>
          Let’s connect
        </a>
      </header>
      )}

      <main>
        {/* 01 Hero: a CRT hologram of his portrait (dots, curved grid, scan lines, glitch). */}
        {/* The hologram hero stays in the code (HoloHero) for the earlier design. */}
        {!SHOW_SECTIONS && <ArcIntro />}
        {/* HoloHero (the hologram hero) stays in the code. */}
        {SHOW_SECTIONS && <HoloHero />}
        {!SHOW_SECTIONS && <Flow />}

        {SHOW_SECTIONS && (
          <>
        {/* 02 About me, typed on a 3D keyboard */}
        <AboutKeys />

        {/* 03 Giant marquee heading */}
        <section id="works" className="pf-sec pf-band-sec" aria-label="Selected work">
          <div className="pf-slot pf-band" data-slot="works-band">
            <p className="pf-slot-text">Selected Work</p>
          </div>
        </section>

        {/* 04 Work cards */}
        <section id="work" className="pf-sec pf-work" aria-label="Projects">
          <div className="pf-cards">
            {WORK.map((w, i) => (
              <Link key={w.title} to={w.to} className="pf-wcard" onPointerEnter={ripple}>
                <span className="pf-chip">{w.tag}</span>
                <div className="pf-slot pf-wcard-visual" data-slot={`work-${i}`} />
                <h3 className="pf-wcard-title">{w.title}</h3>
                <dl className="pf-stats">
                  {w.stats.map(([v, k]) => (
                    <div key={k}>
                      <dt className="pf-mono">{v}</dt>
                      <dd>{k}</dd>
                    </div>
                  ))}
                </dl>
              </Link>
            ))}
          </div>
          <p className="pf-note">Particle illustrations of each idea; project screenshots are still to be supplied.</p>
        </section>

        {/* 05 Capabilities (dark panel with accordion) */}
        <section id="expertise" className="pf-sec pf-panel is-dark pf-caps" aria-labelledby="pf-caps-h">
          <div className="pf-caps-left">
            <p className="pf-rule">
              <span className="pf-rule-pill" />
              <span className="pf-rule-line" />
              <span className="pf-mono">Expertise</span>
            </p>
            <p className="pf-sub">From computer science to biomedical research: the fields curiosity has led to so far.</p>
            <h2 id="pf-caps-h" className="pf-h2">
              Where curiosity has taken him.
            </h2>
            <a href="#contact" className="pf-cta" onClick={(e) => onNav(e, 'contact')} onPointerEnter={ripple}>
              <span className="pf-cta-ico" aria-hidden="true">
                ›
              </span>
              Start a conversation
            </a>
          </div>
          <div className="pf-accordion" role="tablist" aria-label="Capabilities">
            {CAPS.map((c, i) =>
              i === cap ? (
                <article key={c.title} className="pf-acc-open" role="tabpanel">
                  <div className="pf-acc-head">
                    <h3 className="pf-h3">{c.title}</h3>
                    <span className="pf-mono pf-acc-n">{String(i + 1).padStart(3, '0')}</span>
                  </div>
                  <p className="pf-card-p">{c.line}</p>
                  <div className="pf-slot pf-acc-visual" data-slot="cap-visual" />
                </article>
              ) : (
                <button key={c.title} type="button" role="tab" aria-selected={false} className="pf-acc-tab" onClick={() => setCap(i)} onPointerEnter={ripple}>
                  <span className="pf-mono">{String(i + 1).padStart(3, '0')}</span>
                  <span className="pf-acc-label pf-mono">{c.title}</span>
                </button>
              ),
            )}
          </div>
        </section>

        {/* 06 Vision */}
        <section id="vision" className="pf-sec pf-panel is-dark pf-vision" aria-labelledby="pf-vision-h">
          <figure className="pf-person">
            <div className="pf-slot pf-person-img" data-slot="vision-photo">
              <img className="pf-slot-img" src={profile.portrait} alt="" />
            </div>
            <figcaption>
              <span className="pf-mono">{profile.name}</span>
              <span>Student researcher · {profile.schoolShort}</span>
            </figcaption>
          </figure>
          <div className="pf-vision-text">
            <p className="pf-rule">
              <span className="pf-mono">My vision</span>
              <span className="pf-rule-line" />
              <span className="pf-rule-pill" />
            </p>
            <h2 id="pf-vision-h" className="pf-statement is-light">
              <Words text={VISION} />
            </h2>
            <p className="pf-sub">
              Curiosity has no limits. Next: {goals.education.charAt(0).toLowerCase() + goals.education.slice(1)}
            </p>
          </div>
          <div className="pf-techband">
            <p className="pf-mono">
              Engineering ideas that scale with curiosity.
              <br />
              Built with {languages.join(', ')}.
            </p>
            <ul className="pf-dots" aria-hidden="true">
              <li>JS</li>
              <li>Py</li>
              <li>Jv</li>
              <li>AI</li>
            </ul>
            <span className="pf-badge">
              <span aria-hidden="true">✳</span> Point cloud v1.0
            </span>
          </div>
        </section>

        {/* 07 Journey: giant marquee + carousel (no testimonials were supplied; none invented) */}
        <section id="journey" className="pf-sec pf-journey" aria-labelledby="pf-journey-h">
          <div className="pf-slot pf-band" data-slot="journey-band">
            <p className="pf-slot-text">Learning Journey</p>
          </div>
          <div className="pf-journey-head">
            <h2 id="pf-journey-h" className="pf-sub">
              Schools, volunteering and everything beyond class that shaped the questions he asks.
            </h2>
            <div className="pf-arrows">
              <button type="button" onClick={() => slide(-1)} aria-label="Previous">
                ‹
              </button>
              <button type="button" onClick={() => slide(1)} aria-label="Next">
                ›
              </button>
            </div>
          </div>
          <div ref={carousel} className="pf-carousel" tabIndex={0} aria-label="Learning journey">
            {JOURNEY.map((j) => (
              <article key={j.title} className="pf-tcard">
                <p className="pf-tcard-top">
                  <span className="pf-avatar">{j.title.slice(0, 1)}</span>
                  <span className="pf-chip">{j.tag}</span>
                </p>
                <p className="pf-quote" aria-hidden="true">
                  ❝
                </p>
                <p className="pf-tcard-q">{j.line}</p>
                <p className="pf-tcard-who">
                  <span className="pf-mono">{j.title}</span>
                  <span>{j.who}</span>
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 08 Design panel (the reference's video panel) */}
        <section id="lab" className="pf-sec pf-lab" aria-labelledby="pf-lab-h">
          <div className="pf-lab-panel">
            <div className="pf-slot pf-lab-sphere" data-slot="lab-sphere" aria-hidden="true" />
            <h2 id="pf-lab-h" className="pf-lab-h">
              Curiosity by
              <br />
              Design.
            </h2>
            <div className="pf-lab-links">
              <a href={`${import.meta.env.BASE_URL}?style=studio`} onPointerEnter={ripple}>
                Studio
              </a>
            </div>
            <span className="pf-lab-pill" aria-hidden="true" />
            <p className="pf-lab-hint pf-mono">Move your pointer through the sphere</p>
          </div>
        </section>

        {/* 09 Process accordion */}
        <section id="process" className="pf-sec pf-process" aria-labelledby="pf-process-h">
          <p className="pf-rule">
            <span className="pf-mono">My process</span>
            <span className="pf-rule-line" />
          </p>
          <h2 id="pf-process-h" className="pf-sub">
            From a question to something real. An iterative cycle.
          </h2>
          <div className="pf-proc">
            <ol className="pf-proc-list">
              {STEPS.map((s, i) => (
                <li key={s.title} className={i === step ? 'is-open' : ''}>
                  <button type="button" onClick={() => setStep(i)} aria-expanded={i === step} onPointerEnter={ripple}>
                    <span className="pf-mono">// {String(i + 1).padStart(2, '0')}</span>
                    <span className="pf-proc-title">{s.title}</span>
                  </button>
                  {i === step && (
                    <div className="pf-proc-body">
                      <span className="pf-chip">{s.tag}</span>
                      <p className="pf-card-p">{s.line}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <div className="pf-slot pf-proc-visual" data-slot="step-visual" aria-hidden="true" />
          </div>
        </section>

        {/* 10 Contact + footer wordmark */}
        <section id="contact" className="pf-sec pf-contact" aria-labelledby="pf-contact-h">
          <div className="pf-slot pf-contact-text" data-slot="contact-text">
            <h2 id="pf-contact-h" className="pf-slot-text">
              Let’s build something meaningful together.
            </h2>
          </div>
          <div className="pf-contact-row">
            <Link to="/contact" className="pf-cta" onPointerEnter={ripple}>
              <span className="pf-cta-ico" aria-hidden="true">
                ›
              </span>
              Open the contact form
            </Link>
            <span className="pf-small">Email and LinkedIn: to be supplied. Messages go to a family-monitored inbox.</span>
          </div>
          <footer className="pf-footer">
            <div className="pf-foot-cols">
              <div>
                <p className="pf-foot-brand">{profile.name}</p>
                <p className="pf-small">
                  {profile.grade} · {profile.school}, {profile.schoolTown}.
                </p>
              </div>
              <nav aria-label="Footer">
                <p className="pf-mono">Sections</p>
                {NAV.map((n) => (
                  <a key={n.id} href={`#${n.id}`} onClick={(e) => onNav(e, n.id)}>
                    {n.label}
                  </a>
                ))}
              </nav>
              <nav aria-label="Pages">
                <p className="pf-mono">Pages</p>
                <Link to="/research/oncure">Oncure</Link>
                <Link to="/projects/stock-trading-app">AI trading app</Link>
                <Link to="/contact">Contact form</Link>
                <Link to="/privacy">Privacy</Link>
              </nav>
            </div>
            <div className="pf-slot pf-wordmark" data-slot="wordmark">
              <p className="pf-slot-text">SHREYAS</p>
            </div>
            <p className="pf-foot-bar pf-mono">
              <span>
                © {new Date().getFullYear()} {profile.name}
              </span>
              <a href="#home" onClick={(e) => onNav(e, 'home')}>
                Back to top ↑
              </a>
            </p>
          </footer>
        </section>
          </>
        )}
      </main>
    </div>
  );
}
