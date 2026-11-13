import { lazy, Suspense, useCallback, useContext, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Vector2 } from 'three';
import '@fontsource-variable/manrope';
import '@fontsource-variable/geist-mono';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { activities, goals, languages, profile, schools, stockApp, volunteering } from '@/content/portfolio';
import type { FieldState } from './particles/ParticleField';
import { AboutKeys } from './about/AboutKeys';
import './classic.css';

/**
 * Classic: a portfolio born from particles, laid out like the spartanai.framer.website reference
 * (pill nav, hero with featured card and logo strip, word-reveal statement with bento stats,
 * giant marquee headings, work cards with stat grids, capabilities accordion, vision with a
 * portrait card, carousel, design panel, process accordion, footer wordmark). One persistent
 * GPU particle system draws every visual and morphs between sections as the page scrolls.
 */

const ParticleField = lazy(() => import('./particles/ParticleField'));

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'process', label: 'Process' },
  { id: 'contact', label: 'Contact' },
];

/** Section ids in page order; must match FORMATIONS order. */
const SECTION_IDS = ['home', 'about', 'works', 'work', 'expertise', 'vision', 'journey', 'lab', 'process', 'contact'];

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
  // Hero: the name fills the screen width; the portrait turns a little towards the cursor.
  const nameRef = useRef<HTMLHeadingElement>(null);
  const nameTextRef = useRef<HTMLSpanElement>(null);
  const personRef = useRef<HTMLDivElement>(null);
  const tilt = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });
  useEffect(() => {
    const h = nameRef.current;
    const t = nameTextRef.current;
    if (!h || !t) return;
    const fit = () => {
      h.style.fontSize = '100px';
      const w = t.getBoundingClientRect().width;
      if (w) h.style.fontSize = `${(100 * h.clientWidth) / w}px`;
    };
    fit();
    void document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);
  const stageTick = useCallback(() => {
    const s = tilt.current;
    s.x += (s.tx - s.x) * 0.08;
    s.y += (s.ty - s.y) * 0.08;
    const el = personRef.current;
    if (el) el.style.transform = `translate3d(${s.x * 16}px, ${s.y * 6}px, 0) rotateY(${s.x * 7}deg) rotateX(${-s.y * 3}deg)`;
    s.raf = Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) > 0.001 ? requestAnimationFrame(stageTick) : 0;
  }, []);
  const onStageMove = (e: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    tilt.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    tilt.current.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!tilt.current.raf) tilt.current.raf = requestAnimationFrame(stageTick);
  };
  const onStageLeave = () => {
    tilt.current.tx = 0;
    tilt.current.ty = 0;
    if (!tilt.current.raf) tilt.current.raf = requestAnimationFrame(stageTick);
  };
  useEffect(() => () => cancelAnimationFrame(tilt.current.raf), []);
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
      {live && (
        <Suspense fallback={null}>
          <ParticleField state={state} N={N} reduced={reduced} sections={sections} choice={choice} onBuilt={() => undefined} />
        </Suspense>
      )}
      <span className="pf-topline" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />

      {/* Navigation: pill bar left, action right (as the reference) */}
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

      <main>
        {/* 01 Hero: his portrait over a still backdrop, turning a little towards the cursor, his
            name set edge to edge across the screen (after hana.framer.media). */}
        <section id="home" className="pf-sec pf-hero pf-stage" aria-labelledby="pf-name" onPointerMove={onStageMove} onPointerLeave={onStageLeave}>
          <img className="pf-stage-bg" src="/assets/shreyas/hero-backdrop.jpg" alt="" aria-hidden="true" />
          <div className="pf-stage-person" ref={personRef}>
            <img src="/assets/shreyas/hero-cutout.png" alt={`${profile.name}, in a dark suit, light blue shirt and blue tie`} fetchPriority="high" />
          </div>
          <p className="pf-stage-note pf-mono">
            {profile.grade} · {profile.school} · {profile.schoolTown}
          </p>
          <h1 id="pf-name" className="pf-stage-name" ref={nameRef}>
            <span ref={nameTextRef}>{profile.name}</span>
          </h1>
        </section>

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
              <a href="/?style=travel" onPointerEnter={ripple}>
                My World · 3D journey
              </a>
              <a href="/?style=studio" onPointerEnter={ripple}>
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
      </main>
    </div>
  );
}
