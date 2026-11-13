import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowsClockwise,
  Brain,
  Briefcase,
  Chalkboard,
  ChartLineUp,
  Code,
  CurrencyCircleDollar,
  Envelope,
  FirstAid,
  Flask,
  Flower,
  GraduationCap,
  HandFist,
  Medal,
  Microscope,
  Rocket,
  SwimmingPool,
  Trophy,
} from '@phosphor-icons/react';
import { achievements, courses, goals, languages, percentiles, profile, volunteering } from '@/content/portfolio';
import { spatial } from '../store';

/**
 * The visual scene for each chapter, shown on the big floating "projector" screen. Scenes are
 * built to be watched, not read: motion, objects and numbers carry the story while the narrator
 * explains. Elements enter in sequence (`--i` staggers them). Content is the family's own.
 */

const st = (i: number, extra?: CSSProperties) => ({ '--i': i, ...extra }) as CSSProperties;

/** Words rise in one by one. */
export function Rise({ text, base = 0 }: { text: string; base?: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className="sc-word" style={st(base + i)}>
          {w}&nbsp;
        </span>
      ))}
    </>
  );
}

// --- Bio -------------------------------------------------------------------------------------

export function BioScene() {
  const orbit = ['Computer Science', 'Artificial Intelligence', 'Business', 'FinTech'];
  return (
    <div className="sc-bio">
      <div className="sc-portrait">
        <span className="sc-ring" aria-hidden="true" />
        <img src={profile.portrait} alt={`${profile.name}, in a suit and tie`} />
        {orbit.map((o, i) => (
          <span key={o} className="sc-orbit" style={st(i, { '--a': `${i * 90}deg` } as CSSProperties)}>
            {o}
          </span>
        ))}
      </div>
      <div className="sc-bio-text">
        <h3 className="sc-huge">
          <Rise text={profile.name} />
        </h3>
        <ul className="sc-pills">
          {[profile.grade, profile.school, profile.schoolTown].map((p, i) => (
            <li key={p} className="sc-pop" style={st(i + 3)}>
              {p}
            </li>
          ))}
        </ul>
        <div className="sc-langs">
          {languages.map((l, i) => (
            <span key={l} className="sc-lang sc-pop" style={st(i + 6)}>
              <Code weight="bold" aria-hidden="true" /> {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- FinTech (concept) ------------------------------------------------------------------------

export function FinTechScene() {
  const pts = [30, 34, 31, 38, 36, 44, 41, 49, 46, 55, 52, 60, 58, 66];
  const d = pts.map((y, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * 300},${90 - y}`).join(' ');
  return (
    <div className="sc-fin">
      <div className="sc-fin-chart sc-pop" style={st(0)}>
        <div className="sc-fin-head">
          <b>Example stock</b>
          <span className="sc-tag">Illustration</span>
        </div>
        <svg viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
          {pts.map((y, i) => (
            <rect key={i} className="sc-candle" style={st(i)} x={(i / (pts.length - 1)) * 300 - 4} y={90 - y - 6} width="8" height={12 + (i % 3) * 4} rx="2" />
          ))}
          <path d={d} className="sc-line" />
        </svg>
      </div>
      <div className="sc-fin-side">
        {[
          { icon: Brain, k: 'AI suggestion', v: 'How much to buy' },
          { icon: ChartLineUp, k: 'Timing', v: 'When to buy, when to sell' },
          { icon: CurrencyCircleDollar, k: 'Your dashboard', v: 'Holdings and pending orders' },
        ].map(({ icon: I, k, v }, i) => (
          <div key={k} className="sc-chip-card sc-fly" style={st(i + 2)}>
            <I weight="duotone" aria-hidden="true" />
            <span>
              <b>{k}</b>
              <small>{v}</small>
            </span>
          </div>
        ))}
        <p className="sc-fine">A project in progress. Hypothetical insights, not financial advice.</p>
      </div>
    </div>
  );
}

// --- Education --------------------------------------------------------------------------------

const GROUPS: { label: string; tone: string; items: string[] }[] = [
  { label: 'Computer science & AI', tone: 'blue', items: ['AP Computer Science Principles', 'AP Computer Science A', 'Artificial Intelligence'] },
  { label: 'Sciences', tone: 'green', items: ['AP Biology', 'AP Chemistry', 'AP Physics C'] },
  { label: 'Languages & business', tone: 'amber', items: ['English Literature Honors', 'Spanish Honors', 'Entrepreneurship'] },
];

export function EducationScene() {
  let n = 0;
  return (
    <div className="sc-edu">
      <div className="sc-school sc-pop" style={st(0)}>
        <GraduationCap weight="duotone" aria-hidden="true" />
        <b>{profile.school}</b>
        <small>
          {profile.schoolShort} · Alpharetta, GA · {profile.grade}
        </small>
      </div>
      <div className="sc-deck">
        {GROUPS.map((g) => (
          <div key={g.label} className="sc-deck-col">
            <p className="sc-deck-label">{g.label}</p>
            {g.items
              .filter((c) => courses.includes(c))
              .map((c) => {
                const i = n++;
                return (
                  <div key={c} className={`sc-course is-${g.tone}`} style={st(i, { '--r': `${(i % 3) * 7 - 7}deg` } as CSSProperties)}>
                    {c}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      <div className="sc-term sc-pop" style={st(10)} aria-label={`Programming languages: ${languages.join(', ')}`}>
        <span className="sc-term-bar" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <code className="sc-type" style={st(11)}>
          console.log(&quot;Hello from Shreyas&quot;) // JavaScript
        </code>
        <code className="sc-type" style={st(15)}>
          print(&quot;Hello from Shreyas&quot;)  # Python
        </code>
        <code className="sc-type" style={st(19)}>
          System.out.println(&quot;Hello from Shreyas&quot;); // Java
        </code>
      </div>
    </div>
  );
}

// --- Oncure (concept) -------------------------------------------------------------------------

export function OncureScene() {
  const cells = Array.from({ length: 14 }, (_, i) => ({ x: 8 + ((i * 53) % 84), y: 10 + ((i * 37) % 78), bad: i % 4 === 1, r: 5 + (i % 3) * 1.5 }));
  return (
    <div className="sc-onc">
      <div className="sc-dish sc-pop" style={st(0)} aria-label="Animation: nanobots seek out tumour cells and leave healthy cells alone">
        {cells.map((c, i) => (
          <span key={i} className={`sc-cell ${c.bad ? 'is-bad' : ''}`} style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.r * 2}%`, ['--d' as string]: `${(i % 5) * 0.6}s` }} />
        ))}
        {cells
          .filter((c) => c.bad)
          .map((c, i) => (
            <span key={`b${i}`} className="sc-bot" style={{ ['--tx' as string]: `${c.x + c.r}%`, ['--ty' as string]: `${c.y + c.r}%`, ['--d' as string]: `${0.8 + i * 0.9}s` }} />
          ))}
        <span className="sc-dish-label">Concept animation</span>
      </div>
      <div className="sc-steps">
        {[
          { icon: FirstAid, k: 'The problem', v: 'Treatment is costly, side effects are hard, and the toll on patients is heavy.' },
          { icon: Microscope, k: 'The idea', v: 'AI-guided nanobots carry therapy straight to tumour cells.' },
          { icon: Flask, k: 'The aim', v: 'Treat cancer cells while sparing healthy tissue.' },
        ].map(({ icon: I, k, v }, i) => (
          <div key={k} className="sc-step sc-fly" style={st(i + 2)}>
            <span className="sc-step-n">{i + 1}</span>
            <I weight="duotone" aria-hidden="true" />
            <b>{k}</b>
            <small>{v}</small>
          </div>
        ))}
        <p className="sc-fine">Oncure is a research concept, not a tested treatment.</p>
      </div>
    </div>
  );
}

// --- Awards -----------------------------------------------------------------------------------

const CERTS: { id: string; issuer: string; title: string; line: string }[] = [
  { id: 'cbnrp', issuer: 'College Board', title: 'National Recognition Program', line: 'Award recipient' },
  { id: 'honors', issuer: 'Fulton Science Academy', title: 'Principal’s Honors List', line: '2025 · 2026' },
  { id: 'psat', issuer: 'PSAT', title: '99th percentile', line: '8th grade 99 · 9th 98 · 10th 99' },
  { id: 'map', issuer: 'MAP', title: '99th percentile', line: '9th grade 98 · 10th 99' },
  { id: 'arrow', issuer: 'Indian Prairie School District 204', title: 'Project Arrow', line: 'Since 2nd grade' },
];

export function AwardsScene() {
  return (
    <div className="sc-awards">
      <div className="sc-certs">
        {CERTS.filter((c) => achievements.some((a) => a.id === c.id)).map((c, i) => (
          <article key={c.id} className="sc-cert" style={st(i, { '--fan': `${(i - 2) * 6}deg` } as CSSProperties)}>
            <span className="sc-cert-issuer">{c.issuer}</span>
            <b className="sc-cert-title">{c.title}</b>
            <span className="sc-cert-line">{c.line}</span>
            <span className="sc-seal" aria-hidden="true">
              <Medal weight="fill" />
            </span>
          </article>
        ))}
      </div>
      <div className="sc-gauges">
        {percentiles.map((p, i) => (
          <div key={`${p.test}${p.grade}`} className="sc-gauge" style={st(i + 5, { '--v': p.value } as CSSProperties)}>
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" className="sc-gauge-bg" />
              <circle cx="22" cy="22" r="18" className="sc-gauge-fg" />
            </svg>
            <b>{p.value}</b>
            <small>
              {p.test} · {p.grade.replace(' grade', '')}
            </small>
          </div>
        ))}
        <span className="sc-trophy" aria-hidden="true">
          <Trophy weight="fill" />
        </span>
      </div>
    </div>
  );
}

// --- Community --------------------------------------------------------------------------------

export function CommunityScene() {
  const icons = [FirstAid, Flower, Chalkboard];
  return (
    <div className="sc-cards3">
      {volunteering.map((v, i) => {
        const I = icons[i] ?? HandFist;
        return (
          <div key={v.title} className="sc-big-card sc-fly" style={st(i)}>
            <span className="sc-big-icon">
              <I weight="duotone" aria-hidden="true" />
            </span>
            <b>{v.title}</b>
            <small>{v.role}</small>
          </div>
        );
      })}
    </div>
  );
}

// --- Activities -------------------------------------------------------------------------------

export function ActivitiesScene() {
  const items = [
    { icon: SwimmingPool, t: 'Swim Atlanta', s: 'Senior Team', m: 'wave' },
    { icon: HandFist, t: 'Muay Thai', s: 'Since 2025', m: 'punch' },
    { icon: Flask, t: 'Science Olympiad', s: 'FSA · 2024 & 2025', m: 'spin' },
    { icon: Briefcase, t: 'DECA', s: 'FSA · 2026', m: 'rise' },
  ];
  return (
    <div className="sc-cards4">
      {items.map(({ icon: I, t, s, m }, i) => (
        <div key={t} className="sc-big-card sc-fly" style={st(i)}>
          <span className={`sc-big-icon m-${m}`}>
            <I weight="duotone" aria-hidden="true" />
          </span>
          <b>{t}</b>
          <small>{s}</small>
        </div>
      ))}
    </div>
  );
}

// --- Vision -----------------------------------------------------------------------------------

export function VisionScene() {
  const steps = [
    { icon: GraduationCap, t: 'University', s: goals.education },
    { icon: Rocket, t: 'Lead AI at NFC', s: goals.career[0] ?? '' },
    { icon: Flask, t: 'AI oncology lab', s: goals.career[1] ?? '' },
    { icon: ChartLineUp, t: 'AI trading platform', s: goals.career[2] ?? '' },
  ];
  return (
    <div className="sc-road">
      <svg className="sc-road-path" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M20,100 C200,100 220,20 400,40 S650,110 780,60 S930,10 990,20" />
      </svg>
      <div className="sc-road-steps">
        {steps.map(({ icon: I, t, s }, i) => (
          <div key={t} className="sc-road-step sc-pop" style={st(i * 2 + 1)}>
            <span className="sc-big-icon">
              <I weight="duotone" aria-hidden="true" />
            </span>
            <b>{t}</b>
            <small>{s}</small>
          </div>
        ))}
      </div>
      <p className="sc-fine">Goals for the future, not current positions.</p>
    </div>
  );
}

// --- Finale -----------------------------------------------------------------------------------

export function FinaleScene() {
  return (
    <div className="sc-finale">
      <img src={profile.portrait} alt="" className="sc-pop" style={st(0)} />
      <h3 className="sc-huge">
        <Rise text="Thank you for visiting" base={1} />
      </h3>
      <div className="sc-actions sc-pop" style={st(5)}>
        <Link to="/contact" className="sc-btn is-primary" data-voice="contact">
          <Envelope weight="bold" aria-hidden="true" /> Contact form
        </Link>
        <button type="button" className="sc-btn" data-voice="replay" onClick={() => spatial.goChapter(0)}>
          <ArrowsClockwise weight="bold" aria-hidden="true" /> Take the tour again
        </button>
      </div>
    </div>
  );
}

/** Slot for scenes provided by other modules (music, games). */
export function SceneSlot({ children }: { children: ReactNode }) {
  return <div className="sc-slot">{children}</div>;
}
