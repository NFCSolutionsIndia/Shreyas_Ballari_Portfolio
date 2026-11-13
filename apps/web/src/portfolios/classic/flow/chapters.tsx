import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { achievements, activities, goals, oncure, volunteering } from '@/content/portfolio';
import { DEEP } from './deep';
import { useFx, show, type Reg } from './fx';
import { F, envelope, out, seg, smooth, within } from './timeline';
import type { Topic } from './topics';

/**
 * The chapters after the details. Each has its own background and its own motion:
 *  stats  – light bento (headline words sharpen in, cards rise, numbers count)
 *  path   – a light burst on deep blue; a glowing dot travels a drawn path, lighting each step
 *  grid   – light; cards flip down like dominoes, then a roadmap line fills
 *  stack  – projects slide up through the centre as a tilted vertical stack
 *  mosaic – activities revealed tile by tile in a diagonal wave
 *  goals  – split blue and white; the headline rises letter by letter, a timeline fills
 */

const BASE = import.meta.env.BASE_URL;
const J = (n: string) => `${BASE}assets/journey/${n}.placeholder.jpg`;

// --- Backgrounds, one per chapter, cross-fading -----------------------------------------------

const BACKDROPS: { cls: string; range: readonly [number, number] }[] = [
  { cls: 'bd-detail', range: [F.star[1], F.detail[1]] },
  { cls: 'bd-stats', range: F.problem },
  { cls: 'bd-path', range: F.steps },
  { cls: 'bd-grid', range: F.challenges },
  { cls: 'bd-stack', range: F.gallery },
  { cls: 'bd-numbers', range: F.numbers },
  { cls: 'bd-skills', range: F.skills },
  { cls: 'bd-mosaic', range: F.tiles },
  { cls: 'bd-goals', range: F.goals },
];

export function Backdrops({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    root.current?.querySelectorAll<HTMLElement>('.bd').forEach((el, i) => {
      const [a, b] = BACKDROPS[i]!.range;
      const v = Math.min(seg(t, a - 0.012, a + 0.004), 1 - seg(t, b - 0.004, b + 0.012));
      el.style.opacity = String(v);
      show(el, v > 0);
      // Each background drifts a little with the scroll.
      el.style.setProperty('--k', seg(t, a, b).toFixed(3));
    });
  });
  return (
    <div ref={root} className="bds" aria-hidden="true">
      {BACKDROPS.map((b) => (
        <div key={b.cls} className={`bd ${b.cls}`}>
          {b.cls === 'bd-path' && <i className="bd-burst" />}
          {b.cls === 'bd-skills' && <span className="bd-word">Skills · Courses · Code ·</span>}
          {b.cls === 'bd-goals' && <i className="bd-band" />}
        </div>
      ))}
    </div>
  );
}

// --- Stats: a light bento --------------------------------------------------------------------

export function DeepStats({ reg, topic }: { reg: Reg; topic: Topic }) {
  const d = DEEP[topic.id]!.stats;
  const root = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    const k = within(t, 'problem');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.08));
    el.querySelectorAll<HTMLElement>('.sw').forEach((w, i, all) => {
      const v = out(seg(k, 0.04 + (i / all.length) * 0.2, 0.12 + (i / all.length) * 0.2));
      w.style.opacity = String(0.15 + v * 0.85);
      w.style.filter = v < 1 ? `blur(${(1 - v) * 6}px)` : 'none';
    });
    el.querySelectorAll<HTMLElement>('.ds-card').forEach((c, i) => {
      const at = 0.18 + i * 0.08;
      const v = out(seg(k, at, at + 0.16));
      c.style.opacity = String(v);
      c.style.transform = `translateY(${(1 - v) * 90}px) scale(${0.92 + v * 0.08})`;
      const s = d.items[i];
      const b = c.querySelector<HTMLElement>('b');
      if (s?.count && b) b.textContent = s.big.replace(String(s.count), String(Math.round(s.count * v)));
    });
  });
  return (
    <div ref={root} className="ds is-light" key={topic.id}>
      <p className="fd-kicker">{d.kicker}</p>
      <h2 className="ds-h">
        {d.head.split(' ').map((w, i) => (
          <span key={i} className="sw">
            {w}{' '}
          </span>
        ))}
      </h2>
      <div className={`ds-bento n-${Math.min(5, d.items.length)}`}>
        <div className="ds-card is-photo">
          <img src={topic.image} alt="" />
          <span className="ds-tag">Illustration</span>
          <span className="ds-photo-text">
            <b>{d.items[0]!.big}</b>
            <small>{d.items[0]!.label}</small>
          </span>
        </div>
        {d.items.slice(1).map((s, i) => (
          <div key={s.label} className={`ds-card ${i === 1 ? 'is-violet' : ''}`}>
            <b>{s.big}</b>
            <span>{s.label}</span>
            {s.source && <small>{s.source}</small>}
          </div>
        ))}
      </div>
      {d.note && <p className="fx-note">{d.note}</p>}
    </div>
  );
}

// --- Path: a dot travels the line, lighting each step --------------------------------------------

const PATH = 'M 20 200 C 140 40, 220 40, 300 150 S 460 300, 540 160 S 700 20, 780 140 S 900 260, 980 120';

export function DeepPath({ reg, topic }: { reg: Reg; topic: Topic }) {
  const d = DEEP[topic.id]!.path;
  const nodes = d.steps.map((_, i) => 0.06 + (i / Math.max(1, d.steps.length - 1)) * 0.88);
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const bot = useRef<SVGGElement>(null);
  const len = useRef(0);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const p = path.current;
    if (!p) return;
    const L = p.getTotalLength();
    len.current = L;
    p.style.strokeDasharray = String(L);
    setPts(nodes.map((n) => p.getPointAtLength(L * n)).map((q) => ({ x: q.x, y: q.y })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);
  useFx(reg, (t) => {
    const k = within(t, 'steps');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.08));
    const p = path.current;
    const L = len.current;
    if (!p || !L) return;
    const f = smooth(seg(k, 0.08, 0.9));
    p.style.strokeDashoffset = String(L * (1 - f));
    const pt = p.getPointAtLength(L * f);
    bot.current?.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    // Every reached step lights up; the latest one is also "current" (phones show only that one).
    let cur = 0;
    nodes.forEach((n, i) => f >= n - 0.02 && (cur = i));
    el.querySelectorAll<HTMLElement>('.fs-step').forEach((s, i) => {
      s.classList.toggle('is-on', f >= nodes[i]! - 0.02);
      s.classList.toggle('is-current', i === cur);
    });
    el.querySelectorAll<SVGCircleElement>('.fs-node').forEach((c, i) => c.classList.toggle('is-on', f >= nodes[i]! - 0.02));
  });
  return (
    <div ref={root} className="fs">
      <p className="fd-kicker">{d.kicker}</p>
      <h2 className="fx-h">{d.head}</h2>
      <div className="fs-stage">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="fs-svg" aria-hidden="true">
          <path d={PATH} className="fs-track" />
          <path ref={path} d={PATH} className="fs-path" />
          {pts.map((q, i) => (
            <circle key={i} className="fs-node" cx={q.x} cy={q.y} r="9" />
          ))}
          <g ref={bot}>
            <circle r="18" className="fs-glow" />
            <circle r="7" className="fs-bot" />
          </g>
        </svg>
        {d.steps.map((s, i) => (
          <div key={`${s.title}${i}`} className={`fs-step ${i % 2 ? 'is-low' : 'is-high'}`} style={{ left: `${pts[i] ? pts[i]!.x / 10 : nodes[i]! * 100}%` }}>
            <span className="fs-n">Step {i + 1}</span>
            <b>{s.title}</b>
            <small>{s.line}</small>
          </div>
        ))}
      </div>
      {d.note && <p className="fx-note">{d.note}</p>}
    </div>
  );
}

// --- Grid: dominoes, then the roadmap ---------------------------------------------------------

export function DeepGrid({ reg, topic }: { reg: Reg; topic: Topic }) {
  const d = DEEP[topic.id]!.grid;
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const road = useRef<HTMLDivElement>(null);
  const hasRoad = !!d.roadmap;
  useFx(reg, (t) => {
    const k = within(t, 'challenges');
    const el = root.current;
    if (!el) return;
    const on = k > 0 && k < 1;
    show(el, on);
    if (!on) {
      // A child set to visible shows through a hidden parent, so hide both halves too.
      show(grid.current, false);
      show(road.current, false);
      return;
    }
    el.style.opacity = String(envelope(k, 0.08));
    const g = grid.current!;
    // The grid leaves completely before the roadmap arrives, so the two never overlap.
    const leave = hasRoad ? smooth(seg(k, 0.46, 0.52)) : 0;
    const swap = hasRoad ? smooth(seg(k, 0.54, 0.6)) : 0;
    show(g, leave < 1);
    g.style.opacity = String(1 - leave);
    g.style.transform = `translateY(${-leave * 60}px)`;
    const span = hasRoad ? 0.4 : 0.7;
    g.querySelectorAll<HTMLElement>('.fc-card').forEach((c, i, all) => {
      const at = 0.06 + (i / all.length) * span;
      const v = out(seg(k, at, at + 0.12));
      c.style.opacity = String(v);
      c.style.transform = `perspective(900px) rotateX(${(1 - v) * -95}deg)`;
    });
    const r = road.current;
    if (r) {
      show(r, swap > 0);
      r.style.opacity = String(swap);
      r.style.transform = `translateY(${(1 - swap) * 60}px)`;
      const fill = smooth(seg(k, 0.6, 0.94));
      r.style.setProperty('--fill', fill.toFixed(3));
      r.querySelectorAll<HTMLElement>('.fr-item').forEach((it, i, all) => it.classList.toggle('is-on', fill >= i / (all.length - 1) - 0.02));
    }
  });
  return (
    <div ref={root} className="fc is-light" key={topic.id}>
      <div ref={grid} className="fc-wrap">
        <p className="fd-kicker">{d.kicker}</p>
        <h2 className="fx-h">{d.head}</h2>
        <div className={`fc-grid ${d.items.length <= 4 ? 'is-two' : ''}`}>
          {d.items.map((c, i) => (
            <div key={c.title + i} className="fc-card">
              <span>{String(i + 1).padStart(2, '0')}</span>
              <b>{c.title}</b>
              <small>{c.line}</small>
            </div>
          ))}
        </div>
        {!hasRoad && d.note && <p className="fx-note">{d.note}</p>}
      </div>
      {d.roadmap && (
        <div ref={road} className="fr">
          <p className="fd-kicker">Oncure · what comes next</p>
          <h2 className="fx-h">The research roadmap.</h2>
          <div className="fr-line">
            <i />
          </div>
          <ol className="fr-items">
            {d.roadmap.map((r, i) => (
              <li key={r.title} className="fr-item">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <b>{r.title}</b>
                <small>{r.line}</small>
              </li>
            ))}
          </ol>
          {d.note && <p className="fx-note">{d.note}</p>}
        </div>
      )}
    </div>
  );
}

// --- Projects: a vertical stack sliding through the centre --------------------------------------

const PROJECTS = [
  { title: 'Oncure', meta: 'Research proposal · 2026', video: oncure.video, to: '/research/oncure' },
  { title: 'AI Trading', meta: 'Personal project · 2026', image: J('trading'), to: '/projects/stock-trading-app' },
  { title: 'Tutoring', meta: '7th and 8th grade · Math + Science', image: J('tutor'), to: '/tutoring' },
  { title: 'Awards', meta: `${achievements.length} achievements · Top 1%`, image: J('trophy'), to: '/achievements' },
];

export function Stack({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const last = useRef(0);
  useFx(reg, (t) => {
    const k = within(t, 'gallery');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.06));
    const f = smooth(seg(k, 0.06, 0.94)) * (PROJECTS.length - 1);
    el.querySelectorAll<HTMLElement>('.pj-card').forEach((c, i) => {
      const y = i - f;
      const a = Math.abs(y);
      c.style.transform = `translate(-50%, -50%) translateY(${y * 46}vh) perspective(1400px) rotateX(${-y * 24}deg) scale(${1 - Math.min(a, 1.5) * 0.16})`;
      c.style.opacity = String(Math.max(0, 1 - a * 0.45));
      c.style.zIndex = String(10 - Math.round(a * 4));
      c.style.filter = a > 0.4 ? `brightness(${1 - Math.min(0.5, a * 0.35)})` : 'none';
    });
    const i = Math.round(f);
    if (i !== last.current) setActive((last.current = i));
    if (count.current) count.current.textContent = `${String(i + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`;
  });
  return (
    <div ref={root} className="pj">
      <h2 className="pj-h">Selected projects</h2>
      {PROJECTS.map((p) => (
        <Link key={p.title} to={p.to} className="pj-card">
          {p.video ? <video src={p.video} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" /> : <img src={p.image} alt="" loading="lazy" />}
          <span className="pj-title">{p.title}</span>
          <span className="pj-meta">{p.meta}</span>
          {!p.video && <span className="fl-gnote">Illustration</span>}
        </Link>
      ))}
      <span ref={count} className="pj-count">
        01 / 04
      </span>
      <Link to={PROJECTS[active]!.to} className="pj-view">
        View project <ArrowRight weight="bold" aria-hidden="true" />
      </Link>
    </div>
  );
}

// --- Activities: a mosaic revealed in a diagonal wave -------------------------------------------

const TILES = [
  { title: 'Swim Atlanta', line: activities[0]!.role, tone: '#2f6bff' },
  { title: 'Guitar', line: activities[2]!.role, image: `${BASE}assets/house/stills/music.jpg` },
  { title: 'Muay Thai', line: activities[1]!.role, tone: '#ff4d6d' },
  { title: 'Science Olympiad', line: activities[3]!.role, tone: '#18b26b' },
  { title: 'TAMA Medical Camp', line: volunteering[0]!.role, image: J('medical') },
  { title: 'DECA', line: activities[4]!.role, tone: '#ffb020' },
  { title: 'Sri Shirdi Sai Temple', line: volunteering[1]!.role, tone: '#b06bff' },
  { title: 'Peer tutoring', line: 'Math and Science, 7th and 8th grade', image: J('tutor') },
];
const FROM = ['inset(0 100% 0 0)', 'inset(100% 0 0 0)', 'inset(0 0 0 100%)', 'inset(0 0 100% 0)'];

export function Mosaic({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  useFx(reg, (t) => {
    const k = within(t, 'tiles');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.07));
    el.querySelectorAll<HTMLElement>('.mo-tile').forEach((tile, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const at = 0.08 + (col + row) * 0.07;
      const v = out(seg(k, at, at + 0.2));
      const from = FROM[i % 4]!;
      tile.style.clipPath = v >= 1 ? 'inset(0 0 0 0 round 16px)' : `${from.replace(/100%/g, `${(1 - v) * 100}%`).replace(')', ' round 16px)')}`;
      const img = tile.querySelector<HTMLElement>('img, .mo-fill');
      if (img) img.style.transform = `scale(${1.25 - v * 0.25})`;
    });
  });
  return (
    <div ref={root} className="mo">
      <div className="mo-head">
        <p className="fd-kicker">Beyond class</p>
        <h2 className="fx-h">Sport, music, competition and service.</h2>
      </div>
      <div className="mo-grid">
        {TILES.map((a) => (
          <div key={a.title} className="mo-tile" style={{ '--tone': a.tone ?? '#333' } as CSSProperties}>
            {a.image ? <img src={a.image} alt="" loading="lazy" /> : <i className="mo-fill" />}
            <b>{a.title}</b>
            <small>{a.line}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Goals: split blue and white; letters rise, the timeline fills ------------------------------

export function Goals({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  const items = [{ when: 'Next', title: goals.education }, ...goals.career.map((g, i) => ({ when: i === 0 ? 'Career' : 'Goal', title: g }))];
  const head = 'Where he is heading';
  useFx(reg, (t) => {
    const k = within(t, 'goals');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.08));
    el.querySelectorAll<HTMLElement>('.gl').forEach((c, i, all) => {
      const v = out(seg(k, 0.03 + (i / all.length) * 0.22, 0.1 + (i / all.length) * 0.22));
      c.style.transform = `translateY(${(1 - v) * 110}%)`;
    });
    const f = smooth(seg(k, 0.3, 0.92));
    el.style.setProperty('--fill', f.toFixed(3));
    el.querySelectorAll<HTMLElement>('.gg-item').forEach((it, i, all) => {
      const on = f >= (i / all.length) * 0.98;
      it.classList.toggle('is-on', on);
    });
  });
  return (
    <div ref={root} className="gg">
      <h2 className="gg-h" aria-label={head}>
        {head.split('').map((c, i) => (
          <span key={i} className="gl-mask" aria-hidden="true">
            <span className="gl">{c === ' ' ? ' ' : c}</span>
          </span>
        ))}
      </h2>
      <div className="gg-bottom is-light">
        <div className="gg-line">
          <i />
        </div>
        <div className="gg-items">
          {items.map((g, i) => (
            <div key={g.title} className="gg-item">
              <span>
                {String(i + 1).padStart(2, '0')} · {g.when}
              </span>
              <b>{g.title}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Projects: covers in flight that settle into a row, then come forward one by one ---------

const WORKS = [
  { title: 'Oncure', sub: 'Research proposal · 2026', bg: '#ff5a1f', fg: '#1a0a00', to: '/research/oncure' },
  { title: 'AI Trading App', sub: 'Personal project · 2026', bg: '#0f1a14', fg: '#5be3a0', to: '/projects/stock-trading-app' },
  { title: 'Peer Tutoring', sub: 'Math and Science · 7th–8th grade', bg: '#a3b6c6', fg: '#14202b', to: '/tutoring' },
  { title: 'Seven Awards', sub: 'Top 1% · College Board NRP', bg: '#ffd23f', fg: '#1d1600', to: '/achievements' },
  { title: 'Young Authors', sub: 'Contest winner · 2023', bg: '#f1e7d6', fg: '#b0213a', to: '/achievements' },
  { title: 'Science Olympiad', sub: 'Fulton Science Academy · 2024, 2025', bg: '#1f3a2c', fg: '#e8f3ea', to: '/about' },
  { title: 'DECA', sub: 'Fulton Science Academy · 2026', bg: '#13101d', fg: '#ff4fa3', to: '/about' },
  { title: 'Medical Camp', sub: 'TAMA · student volunteer', bg: '#e8e3db', fg: '#1d1d1d', to: '/about' },
];
const GLYPHS = ['S', 'B', 'A', '9', '2', 'R', 'Y', '0', 'H', '6', 'E', '1', 'K', '3', 'M', '7'];
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function Volumes({ reg }: { reg: Reg }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const last = useRef(-2);
  useFx(reg, (t, vw, vh) => {
    const k = within(t, 'gallery');
    const el = root.current;
    if (!el) return;
    show(el, k > 0 && k < 1);
    if (k <= 0 || k >= 1) return;
    el.style.opacity = String(envelope(k, 0.05));
    const now = performance.now() / 1000;
    const n = WORKS.length;
    const cols = vw < 700 ? 4 : n;
    const rows = Math.ceil(n / cols);
    const gap = vw < 700 ? 8 : 12;
    const w = Math.min(150, (vw * 0.9 - gap * (cols - 1)) / cols);
    const h = w * 1.34;
    const rowW = cols * w + (cols - 1) * gap;
    const top = -vh * (vw < 700 ? 0.14 : 0.08) - ((rows - 1) * (h + gap)) / 2;
    // Which cover is forward (after the row has formed).
    const f = seg(k, 0.46, 0.96) * n;
    const act = k > 0.46 ? Math.min(n - 1, Math.floor(f)) : -1;
    el.querySelectorAll<HTMLElement>('.vl-cover').forEach((c, i) => {
      const a = smooth(seg(k, 0.04 + i * 0.022, 0.3 + i * 0.022));
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = -rowW / 2 + col * (w + gap) + w / 2;
      const ty = top + row * (h + gap) + h / 2;
      // Scattered start, tumbling slowly while in flight.
      const sx = (rnd(i, 1) - 0.5) * vw * 1.1;
      const sy = (rnd(i, 2) - 0.5) * vh * 1.0;
      const sz = -700 + rnd(i, 3) * 900;
      const spin = 1 - a;
      const rx = (rnd(i, 4) - 0.5) * 140 * spin + Math.sin(now * 0.6 + i) * 18 * spin;
      const ry = (rnd(i, 5) - 0.5) * 200 * spin + Math.cos(now * 0.5 + i) * 22 * spin;
      const rz = (rnd(i, 6) - 0.5) * 90 * spin;
      const on = i === act;
      const lift = on ? 1 : 0;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      c.style.transform = `translate(-50%, -50%) translate3d(${sx + (tx - sx) * a}px, ${sy + (ty - sy) * a - lift * 22}px, ${sz * spin + lift * 90}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${1 + lift * 0.14})`;
      c.style.opacity = String(act >= 0 && !on ? 0.55 : 1);
      c.style.zIndex = on ? '5' : '1';
    });
    el.querySelectorAll<HTMLElement>('.vl-bit').forEach((b, i) => {
      const gone = smooth(seg(k, 0.25, 0.42));
      const x = (rnd(i + 40, 1) - 0.5) * vw * 1.1 + Math.sin(now * 0.3 + i) * 20;
      const y = (rnd(i + 40, 2) - 0.5) * vh * 0.9 - k * 120 + Math.cos(now * 0.4 + i) * 14;
      b.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${(rnd(i + 40, 3) - 0.5) * 600}px) rotate(${(rnd(i + 40, 4) - 0.5) * 120 + now * 12}deg)`;
      b.style.opacity = String((1 - gone) * 0.9);
    });
    el.querySelectorAll<HTMLElement>('.vl-tick').forEach((tk, i) => tk.classList.toggle('is-on', i === act));
    if (act !== last.current) setActive((last.current = act));
  });
  const cur = active >= 0 ? WORKS[active]! : null;
  return (
    <div ref={root} className="vl">
      <div className="vl-head">
        <b>Selected projects</b>
        <small>Research, apps, teaching and awards</small>
      </div>
      <div className="vl-space" aria-hidden="false">
        {GLYPHS.map((g, i) => (
          <span key={i} className="vl-bit" aria-hidden="true">
            {g}
          </span>
        ))}
        {WORKS.map((p) => (
          <Link key={p.title} to={p.to} className="vl-cover" style={{ '--bg': p.bg, '--fg': p.fg } as CSSProperties} aria-label={`${p.title}: ${p.sub}`}>
            <span>{p.title}</span>
          </Link>
        ))}
      </div>
      <ol className="vl-ticks" aria-hidden="true">
        {WORKS.map((p) => (
          <li key={p.title} className="vl-tick" />
        ))}
      </ol>
      <div className="vl-foot">
        <h2 className="vl-h">His work, taking shape.</h2>
        {cur ? (
          <p className="vl-cur" key={cur.title}>
            <span>{String(active + 1).padStart(2, '0')}</span> <b>{cur.title}</b> · {cur.sub}{' '}
            <Link to={cur.to}>
              Open <ArrowRight weight="bold" aria-hidden="true" />
            </Link>
          </p>
        ) : (
          <p className="vl-sub">Research, an app, teaching and recognition · 2021–2026</p>
        )}
      </div>
    </div>
  );
}
