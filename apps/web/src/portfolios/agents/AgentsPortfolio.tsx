import { useContext, useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { profile, schools, stats } from '@/content/portfolio';
import { cn } from '@/lib/cn';
import { PHOTOS, type Photo } from '../room/photos';
import { AGENTS, AgentBuilder, type LogLine } from './engine';
import './agents.css';

/** Sky behind the hero cards: StockSnap, CC0 (stocksnap.io/photo/5XXUTFRCDF). */
const SKY: Photo = { src: 'https://cdn.stocksnap.io/img-thumbs/960w/5XXUTFRCDF.jpg', alt: '' };

/** Hero portrait (supplied by the family). */
const PORTRAIT = `${import.meta.env.BASE_URL}assets/shreyas/portrait-studio.jpg`;

const RED = '#e5484d';
const BLUE = '#3a5bff';
const YELLOW = '#f5c518';
const INK = '#141414';

/** One buildable block: real HTML with a single `.fill` child that holds all its visuals. */
function Block({ as: Tag = 'div', className, fill, agent, log, code, paint, type, children }: {
  as?: ElementType;
  className?: string;
  fill?: string;
  agent?: string;
  log: string;
  code: string;
  paint?: string;
  type?: boolean;
  children: ReactNode;
}) {
  return (
    <Tag
      data-block=""
      data-agent={agent}
      data-log={log}
      data-code={code}
      data-paint={paint}
      data-type={type ? '' : undefined}
      className={className}
    >
      <span className={cn('fill', fill)}>{children}</span>
    </Tag>
  );
}

const HERO_CARDS: { photo: Photo; title: string; note: string }[] = [
  { photo: PHOTOS.cancerCell, title: 'Oncure', note: 'Research concept' },
  { photo: PHOTOS.stockExchange, title: 'AI stock trading app', note: 'In progress' },
  { photo: { ...PHOTOS.handsBook, src: profile.portrait }, title: profile.name, note: `${profile.grade} · ${profile.schoolShort}` },
  { photo: PHOTOS.classroom, title: 'Peer tutoring', note: 'One to one and in groups' },
  { photo: PHOTOS.chalkboardRoom, title: profile.school, note: 'Junior, now' },
];

const WORK = [
  { agent: 'Oncure', color: INK, title: 'Oncure', text: 'A research concept: AI-guided nanobots that deliver cancer therapy to tumour cells and spare healthy tissue.', href: '/research/oncure' },
  { agent: 'Markets', color: RED, title: 'AI stock trading app', text: 'A beginner-friendly trading site where an AI model suggests how much to buy, when to buy and when to sell, beside the chart.', href: '/projects/stock-trading-app' },
  { agent: 'Tutor', color: BLUE, title: 'Peer tutoring', text: 'Tutored 7th and 8th grade students in Math and Science, with visual aids and step-by-step explanations.', href: '/tutoring' },
  { agent: 'Author', color: YELLOW, title: 'Writing', text: 'Young Authors Contest winner, 2023, in Indian Prairie School District 204.', href: '/achievements' },
];

const NUMBERS = stats.map((s) => ({
  value: s.value,
  suffix: s.suffix,
  label: s.label,
  from: Math.round(Number(s.value) * 0.5),
  log: `counted the ${s.label}`,
}));

const SCHOOL_PHOTOS = [PHOTOS.classroom, PHOTOS.classroomRows, PHOTOS.computerRoom];

export function AgentsPortfolio() {
  const root = useRef<HTMLDivElement>(null);
  const builder = useRef<AgentBuilder | null>(null);
  const smooth = useContext(SmoothScrollContext);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState({ built: 0, total: 0 });
  const [doneIn, setDoneIn] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.scrollTo(0, 0);
    const b = new AgentBuilder(el, {
      scrollToY: (y, o) => (smooth ? smooth.scrollToY(y, o) : window.scrollTo({ top: y, behavior: 'smooth' })),
      onLog: (line) => setLines((l) => [...l.slice(-30), line]),
      onProgress: (built, total) => setProgress({ built, total }),
      onFinish: (ms) => setDoneIn(ms),
      play: new URLSearchParams(window.location.search).has('play'),
    });
    builder.current = b;
    setLive(true);
    b.start();
    return () => {
      b.destroy();
      builder.current = null;
    };
  }, [smooth]);

  const rebuild = () => {
    setDoneIn(null);
    setLines([]);
    void builder.current?.rebuild();
  };

  return (
    <div ref={root} className="agents">
      <header data-section="" className="agents-header">
        <Block className="agents-brand" log="set the masthead" code="<Masthead />" agent="Layout">
          <span className="serif">{profile.firstName}.</span>
          <span className="agents-crumb">/ Portfolio</span>
          <span className="agents-crumb is-soft">/ Agents at work</span>
        </Block>
        <Block className="agents-count" log="counted the agents" code="<AgentCount />">
          {AGENTS.length} agents on this page
        </Block>
      </header>

      {/* Hero: his portrait, full bleed, with his name set large across it. */}
      <section data-section="" className="agents-stage" aria-labelledby="agents-name">
        <Block className="agents-photo" agent="Pixel" log="hung the portrait" code='<Portrait src="shreyas.jpg" />'>
          <img src={PORTRAIT} alt={`${profile.name}, in a dark suit and blue tie`} className="agents-photo-img" fetchPriority="high" />
        </Block>
        <Block className="agents-stage-note" agent="Scout" log="captioned the portrait" code="<Caption />">
          {profile.grade} · {profile.school} · {profile.schoolTown}
        </Block>
        <Block as="h1" type agent="Type" className="agents-name" log="set his name" code={`<h1>${profile.name}</h1>`}>
          <span id="agents-name">{profile.name}</span>
        </Block>
      </section>

      <section data-section="" className="agents-hero" aria-labelledby="agents-title">
        <Block className="agents-eyebrow" log="wrote the eyebrow" code='<Eyebrow>Student researcher</Eyebrow>'>
          00 · Hello
        </Block>
        <Block as="h2" type agent="Claude" className="agents-h1" log="wrote the headline" code="<h2>Curiosity has no limits.</h2>">
          <span id="agents-title">Curiosity has no limits.</span>
        </Block>
        <Block as="p" className="agents-lead" agent="Copy" log="wrote the introduction" code="<Lead />">
          I’m {profile.name}: a junior who loves computer science, AI and FinTech, researching AI in oncology and building an
          AI trading app. Twelve named agents build this page in front of you. They mark out every block, rough it in, write it and hand it over.
        </Block>
        <Block className="agents-sky" agent="Pixel" log="hung the sky" code='<Sky src="sunset.jpg" />'>
          <img src={SKY.src} alt="" className="agents-sky-img" />
        </Block>
        <div className="agents-cards">
          {HERO_CARDS.map((c, i) => (
            <Block
              key={c.title}
              className={cn('agents-card', i === 2 && 'is-centre')}
              log={`pinned “${c.title}”`}
              code={`<Card title="${c.title}" />`}
            >
              <img src={c.photo.src} alt={c.photo.alt} loading="lazy" />
              <span className="agents-card-shade" />
              <span className="agents-card-title serif">{c.title}</span>
              <span className="agents-card-note">{c.note}</span>
            </Block>
          ))}
        </div>
        <Block as="p" className="agents-small" log="noted the photos" code="<Caption />">
          Photos are illustrative and do not show Shreyas.
        </Block>
      </section>

      <section data-section="" className="agents-section" aria-labelledby="agents-work">
        <Block className="agents-eyebrow" log="numbered the section" code="<Eyebrow>01</Eyebrow>">
          01 · What I work on
        </Block>
        <Block as="h2" type agent="Claude" className="agents-h2" log="wrote the work heading" code="<h2>Four things I work on.</h2>">
          <span id="agents-work">Four things I work on.</span>
        </Block>
        <div className="agents-grid4">
          {WORK.map((w) => (
            <Block
              key={w.title}
              agent={w.agent}
              paint={w.color}
              className="agents-work"
              log={`built the ${w.title} card`}
              code={`<Work name="${w.title}" />`}
            >
              <Link to={w.href} className="agents-work-link">
                <span className="agents-bar" style={{ background: w.color }} />
                <span className="agents-work-title serif">{w.title}</span>
                <span className="agents-work-text">{w.text}</span>
                <span className="agents-work-more">Read more →</span>
              </Link>
            </Block>
          ))}
        </div>
        <Block as="p" className="agents-small mono" log="added the fine print" code="<FinePrint />">
          Oncure is a concept, not a tested treatment. The stock app is still being built.
        </Block>
      </section>

      <section data-section="" className="agents-section" aria-labelledby="agents-proof">
        <Block className="agents-eyebrow" log="numbered the section" code="<Eyebrow>02</Eyebrow>">
          02 · The proof
        </Block>
        <Block as="h2" type agent="Claude" className="agents-h2" log="wrote the numbers heading" code="<h2>The proof, in four numbers.</h2>">
          <span id="agents-proof">The proof, in four numbers.</span>
        </Block>
        <div className="agents-stats">
          {NUMBERS.map((n) => (
            <Block key={n.label} className="agents-stat" log={n.log} code={`<Stat label="${n.label}" />`}>
              <span className="agents-stat-value serif">
                <span data-count="" data-count-from={n.from}>
                  {n.value}
                </span>
                {n.suffix && <span className="agents-stat-suffix">{n.suffix}</span>}
              </span>
              <span className="agents-stat-label mono">{n.label}</span>
            </Block>
          ))}
        </div>
      </section>

      <section data-section="" className="agents-section" aria-labelledby="agents-journey">
        <Block className="agents-eyebrow" log="numbered the section" code="<Eyebrow>03</Eyebrow>">
          03 · The journey
        </Block>
        <Block as="h2" type agent="Claude" className="agents-h2" log="wrote the journey heading" code="<h2>Three schools, one direction.</h2>">
          <span id="agents-journey">Three schools, one direction.</span>
        </Block>
        <div className="agents-grid3">
          {schools.map((s, i) => (
            <Block key={s.name} className="agents-school" log={`added ${s.name}`} code={`<School name="${s.name}" />`}>
              <img src={SCHOOL_PHOTOS[i]!.src} alt={SCHOOL_PHOTOS[i]!.alt} loading="lazy" />
              <span className="agents-card-shade" />
              <span className="agents-school-step mono">0{i + 1} · {s.level}</span>
              <span className="agents-school-name serif">{s.name}</span>
            </Block>
          ))}
        </div>
      </section>

      <section data-section="" className="agents-end" aria-labelledby="agents-end">
        <Block as="h2" type agent="Claude" className="agents-h1 is-end" log="wrote the sign-off" code="<h2>Built by agents. Checked by Shreyas.</h2>">
          <span id="agents-end">Built by agents. Checked by Shreyas.</span>
        </Block>
        <Block className="agents-actions" agent="Pixel" log="wired the buttons" code="<Actions />">
          <button type="button" className="agents-button" onClick={rebuild} disabled={!live}>
            Watch it build again
          </button>
          <Link to="/contact" className="agents-link mono">
            Say hello through the contact form →
          </Link>
        </Block>
      </section>

      <footer className="agents-footer mono">
        <Link to="/about">About</Link>
        <Link to="/research">Research</Link>
        <Link to="/tutoring">Tutoring</Link>
        <Link to="/achievements">Achievements</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy">Privacy</Link>
      </footer>

      {live && (
        <aside className="agents-log mono" aria-label="Agent log">
          <div className="agents-log-head">
            <span>Agent log</span>
            <span>
              {doneIn !== null ? `Built in ${(doneIn / 1000).toFixed(1)}s` : `Built ${progress.built} / ${progress.total}`}
            </span>
          </div>
          <ol className="agents-log-lines" aria-live="polite">
            {lines.slice(-4).map((l) => (
              <li key={l.id}>
                <span className="agents-log-time">{l.time}</span>
                <span className="agents-log-tag" style={{ background: l.agent.color, color: l.agent.ink }}>
                  {l.agent.name}
                </span>
                <span className="agents-log-text">{l.text}</span>
              </li>
            ))}
          </ol>
          {doneIn === null ? (
            <button type="button" className="agents-log-button" onClick={() => builder.current?.skip()}>
              Skip
            </button>
          ) : (
            <button type="button" className="agents-log-button" onClick={rebuild}>
              Rebuild
            </button>
          )}
        </aside>
      )}
    </div>
  );
}
