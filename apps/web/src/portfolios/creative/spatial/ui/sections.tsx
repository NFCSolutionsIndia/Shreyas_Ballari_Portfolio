import type { ReactNode } from 'react';
import { achievements, activities, courses, goals, languages, percentiles, profile, researchInterests, stockApp, volunteering } from '@/content/portfolio';

/**
 * What each room says, from the family's brief (content/portfolio.ts). `card` is the small
 * preview on the home dashboard; `detail` is the window that opens in the room. Nothing here is
 * invented: future goals are worded as goals, and the trading app as a concept.
 */

const COURSE_GROUPS = [
  { label: 'Computer science & AI', items: ['AP Computer Science Principles', 'AP Computer Science A', 'Artificial Intelligence'] },
  { label: 'Sciences', items: ['AP Biology', 'AP Chemistry', 'AP Physics C'] },
  { label: 'Languages & business', items: ['English Literature Honors', 'Spanish Honors', 'Entrepreneurship'] },
].map((g) => ({ ...g, items: g.items.filter((c) => courses.includes(c)) }));

/** The five achievements the gallery shows (as listed in the brief). */
const GALLERY = ['arrow', 'honors', 'psat', 'map', 'cbnrp'].map((id) => achievements.find((a) => a.id === id)!).filter(Boolean);

function Spark() {
  // An illustrative line, clearly labelled as such (no real prices).
  const pts = [18, 22, 19, 26, 24, 31, 28, 35, 33, 40, 37, 44];
  const d = pts.map((y, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * 100},${48 - y}`).join(' ');
  return (
    <svg className="sp-spark" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L100,48 L0,48 Z`} className="sp-spark-fill" />
      <path d={d} className="sp-spark-line" />
    </svg>
  );
}

function Bars() {
  return (
    <span className="sp-eq" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} style={{ animationDelay: `${i * 0.13}s` }} />
      ))}
    </span>
  );
}

export interface Section {
  id: string;
  title: string;
  card: ReactNode;
  detail: ReactNode;
}

export const SECTIONS: Record<string, Section> = {
  study: {
    id: 'study',
    title: 'Study Room',
    card: (
      <>
        <p className="sp-card-big">{courses.length} courses</p>
        <p className="sp-card-line">AP CS A · AP Bio · AP Chem · AP Physics C…</p>
        <p className="sp-card-tags">{languages.join(' · ')}</p>
      </>
    ),
    detail: (
      <>
        <p className="sp-sub">
          {profile.school} ({profile.schoolShort}), Alpharetta, GA · {profile.grade}
        </p>
        <div className="sp-groups">
          {COURSE_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="sp-group-label">{g.label}</p>
              <ul className="sp-chips">
                {g.items.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="sp-group-label">Programming languages</p>
            <ul className="sp-chips">
              {languages.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </>
    ),
  },
  lab: {
    id: 'lab',
    title: 'Innovation Lab',
    card: (
      <>
        <p className="sp-card-line">AI in oncology</p>
        <p className="sp-card-line">AI-enabled trading</p>
        <p className="sp-card-tags">Research interests</p>
      </>
    ),
    detail: (
      <>
        <p className="sp-sub">Research interests: where his curiosity is headed.</p>
        <ul className="sp-list">
          {researchInterests.map((r) => (
            <li key={r.title}>
              <b>{r.title}</b>
              <span>{r.line}</span>
            </li>
          ))}
          <li>
            <b>Computer Science, AI, Business and FinTech</b>
            <span>The subjects he is most drawn to.</span>
          </li>
        </ul>
        <p className="sp-note">These are interests and ambitions, not completed research.</p>
      </>
    ),
  },
  fintech: {
    id: 'fintech',
    title: 'FinTech Room',
    card: (
      <>
        <Spark />
        <p className="sp-card-line">AI stock trading app</p>
        <p className="sp-card-tags">Concept · illustrative chart</p>
      </>
    ),
    detail: (
      <>
        <p className="sp-badge">Project concept · in progress</p>
        <p className="sp-lead">{stockApp.summary}</p>
        <ul className="sp-list is-grid">
          {stockApp.features.map((f) => (
            <li key={f.title}>
              <b>{f.title}</b>
              <span>{f.line}</span>
            </li>
          ))}
        </ul>
        <p className="sp-note">Hypothetical insights for learning, not financial advice and not real trading results.</p>
      </>
    ),
  },
  oncology: {
    id: 'oncology',
    title: 'Oncology Research',
    card: (
      <>
        <span className="sp-cell" aria-hidden="true" />
        <p className="sp-card-line">AI in cancer research</p>
        <p className="sp-card-tags">An interest and a goal</p>
      </>
    ),
    detail: (
      <>
        <p className="sp-lead">Shreyas is interested in using artificial intelligence in cancer research, and one of his goals is to set up and lead a world-class, AI-enabled oncology research lab.</p>
        <p className="sp-note">An ambition for the future: no lab exists yet and no treatment has been demonstrated.</p>
      </>
    ),
  },
  music: {
    id: 'music',
    title: 'Music Room',
    card: (
      <>
        <Bars />
        <p className="sp-card-line">Guitar since 2021</p>
        <p className="sp-card-tags">Atlanta Piano Fortissimo</p>
      </>
    ),
    detail: (
      <>
        <p className="sp-lead">Guitar has been part of his life since 2021, studied at Atlanta Piano Fortissimo.</p>
      </>
    ),
  },
  recreation: {
    id: 'recreation',
    title: 'Recreation Room',
    card: (
      <ul className="sp-card-rows">
        {activities.filter((a) => a.title !== 'Guitar').map((a) => (
          <li key={a.title}>
            {a.title} <span className="sp-toggle is-on" aria-hidden="true" />
          </li>
        ))}
      </ul>
    ),
    detail: (
      <ul className="sp-list">
        {activities
          .filter((a) => a.title !== 'Guitar')
          .map((a) => (
            <li key={a.title}>
              <b>{a.title}</b>
              <span>{a.role}</span>
            </li>
          ))}
      </ul>
    ),
  },
  gallery: {
    id: 'gallery',
    title: 'Achievement Gallery',
    card: (
      <>
        <p className="sp-card-huge">99th</p>
        <p className="sp-card-tags">PSAT percentile · Principal’s Honors List</p>
      </>
    ),
    detail: (
      <>
        <ul className="sp-list is-grid">
          {GALLERY.map((a) => (
            <li key={a.id}>
              <b>{a.title}</b>
              <span>{a.detail}</span>
            </li>
          ))}
        </ul>
        <div className="sp-pct" aria-label="Percentiles">
          {percentiles.map((p) => (
            <div key={`${p.test}${p.grade}`}>
              <span className="sp-pct-bar" style={{ ['--v' as string]: p.value / 100 }} />
              <b>{p.value}th</b>
              <small>
                {p.test} · {p.grade}
              </small>
            </div>
          ))}
        </div>
      </>
    ),
  },
  community: {
    id: 'community',
    title: 'Community Room',
    card: (
      <ul className="sp-card-rows">
        {volunteering.map((v) => (
          <li key={v.title}>{v.title}</li>
        ))}
      </ul>
    ),
    detail: (
      <ul className="sp-list">
        {volunteering.map((v) => (
          <li key={v.title}>
            <b>{v.title}</b>
            <span>{v.role}</span>
          </li>
        ))}
      </ul>
    ),
  },
  vision: {
    id: 'vision',
    title: 'Future Vision',
    card: (
      <>
        <p className="sp-card-line">Head AI at NFC</p>
        <p className="sp-card-line">AI oncology lab</p>
        <p className="sp-card-tags">Goals and ambitions</p>
      </>
    ),
    detail: (
      <>
        <ol className="sp-road">
          <li>
            <b>Education</b>
            <span>{goals.education}</span>
          </li>
          {goals.career.map((g) => (
            <li key={g}>
              <b>Goal</b>
              <span>{g}</span>
            </li>
          ))}
        </ol>
        <p className="sp-note">Future goals, not current positions.</p>
      </>
    ),
  },
};
