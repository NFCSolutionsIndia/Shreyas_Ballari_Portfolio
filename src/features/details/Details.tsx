import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';
import { oncure, stockApp } from '@/content/portfolio';
import './style';

/**
 * Full details for Oncure and the AI trading app, shared by every tab and by the pages
 * /research/oncure and /projects/stock-trading-app.
 *
 * <DetailSheet> opens them like an app on a phone: the sheet grows out of the button or card
 * that was tapped (clip-path from that rectangle to the whole area) and shrinks back into it
 * when closed. `contained` keeps it inside its parent (the Studio phone screen); otherwise it
 * covers the page.
 */

export type DetailId = 'oncure' | 'finance';
export type DetailTheme = 'studio' | 'classic' | 'page';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

// --- Oncure ------------------------------------------------------------------------------------

export function OncureDetails({ withVideo = true }: { withVideo?: boolean }) {
  return (
    <article className="dt-body">
      <header className="dt-head">
        <p className="dt-kicker">Research concept</p>
        <h2 className="dt-title">{oncure.name}</h2>
        <p className="dt-lede">{oncure.tagline}</p>
        <p className="dt-note">{oncure.disclaimer}</p>
      </header>

      {withVideo && (
        <figure className="dt-video">
          <video src={oncure.video} controls playsInline preload="metadata" />
          <figcaption>Shreyas’s Oncure film</figcaption>
        </figure>
      )}

      <section className="dt-sec">
        <p className="dt-big">{oncure.pitch}</p>
        <p>{oncure.summary}</p>
      </section>

      <Section title="The problem">
        <Grid items={oncure.problems} />
      </Section>

      <Section title="How it would work">
        <ol className="dt-steps">
          {oncure.steps.map((s, i) => (
            <li key={s.title}>
              <span className="dt-n">{String(i + 1).padStart(2, '0')}</span>
              <b>{s.title}</b>
              <p>{s.line}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What it is designed to do">
        <Grid items={oncure.features} />
      </Section>

      <Section title="Challenges to solve">
        <Grid items={oncure.challenges} />
      </Section>

      <Section title="Why it could be possible">
        <ul className="dt-list">
          {oncure.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Section>

      <Section title="Roadmap">
        <ol className="dt-road">
          {oncure.roadmap.map((r, i) => (
            <li key={r.title}>
              <span className="dt-n">{i + 1}</span>
              <span>
                <b>{r.title}</b>
                <p>{r.line}</p>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What it stands for">
        <Grid items={oncure.values} />
      </Section>

      <section className="dt-end">
        <p className="dt-big">{oncure.vision}</p>
        <p className="dt-note">{oncure.disclaimer}</p>
      </section>
    </article>
  );
}

// --- The AI trading app -------------------------------------------------------------------------

const SAMPLE = [42, 44, 43, 47, 46, 50, 49, 53, 57, 55, 59, 62, 61, 66];
const ROWS = [
  { t: 'NOVA', stage: 'Holding', v: '+4.2%', up: true },
  { t: 'ORBT', stage: 'Buying · 2 of 3', v: '+1.8%', up: true },
  { t: 'LUMA', stage: 'Sell window soon', v: '−0.9%', up: false },
];

export function FinanceDetails() {
  const max = Math.max(...SAMPLE);
  const min = Math.min(...SAMPLE);
  const pts = SAMPLE.map((v, i) => `${(i / (SAMPLE.length - 1)) * 300},${90 - ((v - min) / (max - min)) * 80}`).join(' ');
  return (
    <article className="dt-body">
      <header className="dt-head">
        <p className="dt-kicker">FinTech · {stockApp.status.toLowerCase()}</p>
        <h2 className="dt-title">AI trading app</h2>
        <p className="dt-lede">A stock trading website that is friendly to beginners and welcoming to experienced traders.</p>
        <p className="dt-note">A concept in progress. Everything shown here is hypothetical sample data, not financial advice.</p>
      </header>

      <figure className="dt-dash" aria-label="Sample dashboard with made-up data">
        <div className="dt-dash-chart">
          <span className="dt-mono">Sample portfolio</span>
          <b>$12,480.36</b>
          <span className="dt-up">▲ 2.4% today</span>
          <svg viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <p className="dt-advice">
            <b>AI suggestion (sample):</b> buy 3 shares of NOVA this week; estimated sell window in 5 to 7 weeks.
          </p>
        </div>
        <ul className="dt-dash-rows">
          {ROWS.map((r) => (
            <li key={r.t}>
              <b>{r.t}</b>
              <span>{r.stage}</span>
              <em className={r.up ? 'is-up' : 'is-down'}>{r.v}</em>
            </li>
          ))}
        </ul>
        <figcaption className="dt-mono">Concept design · sample data · not financial advice</figcaption>
      </figure>

      <section className="dt-sec">
        <p className="dt-big">{stockApp.summary}</p>
      </section>

      <Section title="How the AI helps">
        <ol className="dt-steps">
          {[
            { title: 'Reads real-world data', line: 'An AI model looks at real market data and real-world factors, and works it through with algorithms.' },
            { title: 'Suggests how much and when', line: 'How much of a stock to buy, when to buy it, and an estimated time to sell.' },
            { title: 'Shows it beside the chart', line: 'The advice appears next to the stock graph you are looking at, with no candlesticks or equations needed.' },
            { title: 'Keeps track for you', line: 'A dashboard of what you hold, the buy or sell stage of each, pending orders, and top performers you may like.' },
          ].map((s, i) => (
            <li key={s.title}>
              <span className="dt-n">{String(i + 1).padStart(2, '0')}</span>
              <b>{s.title}</b>
              <p>{s.line}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What it will have">
        <Grid items={stockApp.features} />
      </Section>

      <section className="dt-end">
        <p className="dt-big">{stockApp.forWhom}</p>
        <p className="dt-note">Hypothetical concept. Not financial advice.</p>
      </section>
    </article>
  );
}

// --- Small building blocks ---------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dt-sec">
      <h3 className="dt-h">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ items }: { items: { title: string; line: string }[] }) {
  return (
    <ul className="dt-grid">
      {items.map((x) => (
        <li key={x.title}>
          <b>{x.title}</b>
          <p>{x.line}</p>
        </li>
      ))}
    </ul>
  );
}

// --- The sheet that opens like an app -----------------------------------------------------------

export function DetailSheet({ id, origin, onClose, contained = false, theme }: { id: DetailId | null; origin: DOMRect | null; onClose: () => void; contained?: boolean; theme: DetailTheme }) {
  const smooth = useContext(SmoothScrollContext);
  const sheet = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState<DetailId | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    if (id) setShown(id);
    else setShown(null);
  }, [id]);

  /** The tapped rectangle, as a clip-path inset of the sheet. */
  const insetFrom = () => {
    const el = sheet.current;
    if (!el || !origin) return 'inset(40% 40% 40% 40% round 28px)';
    const h = el.getBoundingClientRect();
    const t = Math.max(0, origin.top - h.top);
    const l = Math.max(0, origin.left - h.left);
    const r = Math.max(0, h.right - origin.right);
    const b = Math.max(0, h.bottom - origin.bottom);
    return `inset(${t}px ${r}px ${b}px ${l}px round 24px)`;
  };
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Open: grow out of the tapped card.
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!shown || !el) return;
    closing.current = false;
    el.scrollTop = 0;
    if (reduced()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    else {
      el.animate([{ clipPath: insetFrom(), opacity: 0.6 }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }], { duration: 620, easing: EASE });
      el.querySelector('.dt-inner')?.animate(
        [
          { opacity: 0, transform: 'scale(0.94) translateY(16px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 520, delay: 120, easing: EASE, fill: 'backwards' },
      );
    }
    closeBtn.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  // While open: the page behind stays still.
  useEffect(() => {
    if (!shown) return;
    smooth?.setLocked(true);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', key);
    return () => {
      smooth?.setLocked(false);
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  // Close: shrink back into the card.
  const close = () => {
    const el = sheet.current;
    if (!el || closing.current) return;
    closing.current = true;
    el.querySelectorAll('video').forEach((v) => v.pause());
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      setShown(null);
      onClose();
    };
    if (reduced()) return done();
    const a = el.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }, { clipPath: insetFrom(), opacity: 0 }], { duration: 420, easing: EASE, fill: 'forwards' });
    a.onfinish = done;
    // On a busy or slow device the animation may start late: close on time anyway.
    window.setTimeout(done, 520);
  };

  if (!shown) return null;
  const node = (
    <div ref={sheet} className={`dt dt--${theme} ${contained ? 'is-contained' : 'is-page'}`} role="dialog" aria-modal="true" aria-label={shown === 'oncure' ? 'Oncure, full details' : 'AI trading app, full details'} data-lenis-prevent>
      <div className="dt-bar">
        <span className="dt-kicker">{shown === 'oncure' ? 'Oncure' : 'AI trading app'}</span>
        <button ref={closeBtn} type="button" className="dt-close" aria-label="Close" data-voice="close" onClick={close}>
          <X weight="bold" />
        </button>
      </div>
      <div className="dt-inner">{shown === 'oncure' ? <OncureDetails /> : <FinanceDetails />}</div>
    </div>
  );
  return contained ? node : createPortal(node, document.body);
}
