import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowCounterClockwise, ArrowDown, ArrowUp, Lightbulb, Trophy } from '@phosphor-icons/react';
import { chime, getBest, saveBest, seeded } from './shared';

/**
 * Market Sense: a practice chart made of random data. Read it and call the next candle: up or
 * down. Ten calls a game, +10 for each right call and a bonus for streaks. A "trend hint" shows a
 * simple moving average, the kind of signal his AI trading app would build on. Not real market
 * data and not financial advice.
 */

const ROUNDS = 10;
const SHOWN = 26;

interface Candle {
  o: number;
  c: number;
  h: number;
  l: number;
}

function makeSeries(seed: number, n: number): Candle[] {
  const r = seeded(seed);
  const out: Candle[] = [];
  let price = 100;
  let drift = (r() - 0.5) * 0.8;
  for (let i = 0; i < n; i++) {
    if (i % 9 === 0) drift = (r() - 0.5) * 1.2;
    const o = price;
    const c = Math.max(20, o + drift + (r() - 0.5) * 4);
    out.push({ o, c, h: Math.max(o, c) + r() * 1.6, l: Math.min(o, c) - r() * 1.6 });
    price = c;
  }
  return out;
}

const sma = (s: Candle[], end: number, k = 5) => s.slice(Math.max(0, end - k), end).reduce((a, x) => a + x.c, 0) / Math.min(k, end);

export function MarketSense() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const series = useMemo(() => makeSeries(seed, SHOWN + ROUNDS + 1), [seed]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hint, setHint] = useState(false);
  const [last, setLast] = useState<null | { right: boolean; dir: 'up' | 'down' }>(null);
  const [best, setBest] = useState(() => getBest('market'));
  const over = round >= ROUNDS;
  const visible = series.slice(round, SHOWN + round);
  const lo = Math.min(...visible.map((c) => c.l));
  const hi = Math.max(...visible.map((c) => c.h));
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo || 1)) * 84;
  const w = 100 / SHOWN;

  const call = (dir: 'up' | 'down') => {
    if (over) return;
    const next = series[SHOWN + round]!;
    const right = (next.c >= next.o) === (dir === 'up');
    chime(right);
    setLast({ right, dir });
    setStreak((s) => (right ? s + 1 : 0));
    const gained = right ? 10 + Math.min(streak, 4) * 2 : 0;
    const total = score + gained;
    setScore(total);
    setRound((r) => r + 1);
    if (round + 1 >= ROUNDS && saveBest('market', total)) setBest(total);
  };
  const again = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setRound(0);
    setScore(0);
    setStreak(0);
    setLast(null);
  };
  const trendUp = sma(series, SHOWN + round) >= sma(series, SHOWN + round - 3);
  const maPath = visible.map((_, i) => `${i ? 'L' : 'M'}${(i + 0.5) * w},${y(sma(series, round + i + 1))}`).join(' ');

  return (
    <div className="gm-game ms">
      <div className="gm-hud">
        <span className="gm-chip">Call {Math.min(round + 1, ROUNDS)} / {ROUNDS}</span>
        <span className="gm-chip">Score {score}</span>
        <span className="gm-chip">Streak {streak}</span>
        <span className="gm-chip is-dim">Best {best}</span>
      </div>
      <div className="ms-chart">
        <span className="ms-tag">Practice chart · random data · not financial advice</span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Practice price chart">
          {visible.map((c, i) => {
            const up = c.c >= c.o;
            const isNew = i === SHOWN - 1 && round > 0;
            return (
              <g key={round + i} className={`ms-candle ${up ? 'is-up' : 'is-down'} ${isNew ? 'is-new' : ''}`} style={{ '--i': i } as CSSProperties}>
                <line x1={(i + 0.5) * w} x2={(i + 0.5) * w} y1={y(c.h)} y2={y(c.l)} />
                <rect x={i * w + w * 0.18} width={w * 0.64} y={y(Math.max(c.o, c.c))} height={Math.max(0.8, Math.abs(y(c.o) - y(c.c)))} rx="0.4" />
              </g>
            );
          })}
          {hint && <path d={maPath} className="ms-ma" />}
          <line x1="100" x2="100" y1="0" y2="100" className="ms-now" />
        </svg>
        <div className="ms-next" aria-hidden="true">
          <span>?</span>
        </div>
        {last && !over && (
          <p key={round} className={`ms-result ${last.right ? 'is-right' : 'is-wrong'}`} role="status">
            {last.right ? 'Right call' : 'Not this time'}
          </p>
        )}
        {over && (
          <div className="gm-over" role="status">
            <Trophy weight="duotone" aria-hidden="true" />
            <b>{score} points</b>
            <small>{score >= best && score > 0 ? 'New best!' : `Best ${best}`}</small>
            <button type="button" className="gm-btn is-primary" data-voice="play again" onClick={again}>
              <ArrowCounterClockwise weight="bold" aria-hidden="true" /> Play again
            </button>
          </div>
        )}
      </div>
      <div className="ms-controls">
        <button type="button" className="gm-btn ms-up" data-voice="up" disabled={over} onClick={() => call('up')}>
          <ArrowUp weight="bold" aria-hidden="true" /> Up
        </button>
        <button type="button" className={`gm-btn ms-hint ${hint ? 'is-on' : ''}`} aria-pressed={hint} data-voice="hint" onClick={() => setHint((h) => !h)}>
          <Lightbulb weight={hint ? 'fill' : 'bold'} aria-hidden="true" />
          {hint ? `Trend: ${trendUp ? 'rising' : 'falling'}` : 'Trend hint'}
        </button>
        <button type="button" className="gm-btn ms-down" data-voice="down" disabled={over} onClick={() => call('down')}>
          <ArrowDown weight="bold" aria-hidden="true" /> Down
        </button>
      </div>
    </div>
  );
}
