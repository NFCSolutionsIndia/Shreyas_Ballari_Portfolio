import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowCounterClockwise, Play, Trophy } from '@phosphor-icons/react';
import { spatial } from '../../store';
import { getBest, pluck, saveBest, seeded } from './shared';

/**
 * String Rhythm: notes slide down four guitar strings. Hit each one as it crosses the line (tap
 * the string, press D F J K, or pinch) and the guitar plays it: land them all and you play a
 * melody. Perfect +100, good +50, a combo multiplies. 40 seconds. The guitar sound is synthesised
 * in the browser (a plucked-string model), not a recording.
 */

const LANES = [
  { key: 'D', name: 'D', freq: 146.83, color: '#ff6b8b' },
  { key: 'F', name: 'G', freq: 196.0, color: '#ffb347' },
  { key: 'J', name: 'B', freq: 246.94, color: '#5be3a0' },
  { key: 'K', name: 'E', freq: 329.63, color: '#6aa8ff' },
];
/** A pentatonic answer to each lane, so hits sound like a tune. */
const MELODY = [0, 1, 2, 3, 2, 1, 2, 3, 3, 2, 1, 0, 1, 2, 1, 0];
const LENGTH = 40;
const FALL = 1.9; // seconds from top to the line
const PERFECT = 0.09;
const GOOD = 0.17;

interface Note {
  t: number;
  lane: number;
  hit: 'perfect' | 'good' | 'miss' | null;
  el?: HTMLElement | null;
}

function chart(seed: number): Note[] {
  const r = seeded(seed);
  const notes: Note[] = [];
  let t = 2;
  let m = 0;
  while (t < LENGTH - 1) {
    const lane = r() < 0.7 ? MELODY[m++ % MELODY.length]! : Math.floor(r() * 4);
    notes.push({ t, lane, hit: null });
    // Speeds up a little as the round goes on.
    const beat = t < 14 ? 0.6 : t < 28 ? 0.48 : 0.4;
    t += r() < 0.2 ? beat / 2 : beat;
  }
  return notes;
}

export function StringRhythm() {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [judge, setJudge] = useState<{ text: string; lane: number; n: number } | null>(null);
  const [best, setBest] = useState(() => getBest('rhythm'));
  const [left, setLeft] = useState(LENGTH);
  const notes = useRef<Note[]>([]);
  const start = useRef(0);
  const raf = useRef(0);
  const field = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const [lit, setLit] = useState<number | null>(null);

  const now = () => (performance.now() - start.current) / 1000;

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setPhase('over');
    if (saveBest('rhythm', scoreRef.current)) setBest(scoreRef.current);
  }, []);

  const loop = useCallback(() => {
    const t = now();
    const h = field.current?.clientHeight ?? 400;
    const line = h * 0.82;
    for (const n of notes.current) {
      if (!n.el) continue;
      const dy = (1 - (n.t - t) / FALL) * line;
      if (n.hit === 'perfect' || n.hit === 'good') {
        n.el.style.opacity = '0';
        continue;
      }
      if (n.hit === null && t - n.t > GOOD) {
        n.hit = 'miss';
        comboRef.current = 0;
        setCombo(0);
        n.el.classList.add('is-miss');
      }
      n.el.style.transform = `translateY(${dy}px)`;
      n.el.style.opacity = dy < -40 || dy > h ? '0' : '1';
    }
    setLeft(Math.max(0, Math.ceil(LENGTH - t)));
    if (t >= LENGTH) finish();
    else raf.current = requestAnimationFrame(loop);
  }, [finish]);

  const begin = () => {
    notes.current = chart(Math.floor(Math.random() * 1e9));
    scoreRef.current = 0;
    comboRef.current = 0;
    setScore(0);
    setCombo(0);
    setJudge(null);
    setPhase('playing');
    pluck(196, 0.01); // wake the audio up on this tap
    start.current = performance.now();
  };
  useEffect(() => {
    if (phase !== 'playing') return;
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, loop]);

  const hit = useCallback(
    (lane: number) => {
      setLit(lane);
      window.setTimeout(() => setLit((l) => (l === lane ? null : l)), 120);
      if (phase !== 'playing') {
        pluck(LANES[lane]!.freq, 0.3);
        return;
      }
      const t = now();
      let bestNote: Note | null = null;
      for (const n of notes.current) if (n.lane === lane && n.hit === null && Math.abs(n.t - t) <= GOOD && (!bestNote || Math.abs(n.t - t) < Math.abs(bestNote.t - t))) bestNote = n;
      if (!bestNote) {
        comboRef.current = 0;
        setCombo(0);
        pluck(LANES[lane]!.freq / 2, 0.12);
        return;
      }
      const d = Math.abs(bestNote.t - t);
      bestNote.hit = d <= PERFECT ? 'perfect' : 'good';
      pluck(LANES[lane]!.freq, 0.4);
      comboRef.current += 1;
      const pts = (bestNote.hit === 'perfect' ? 100 : 50) * (1 + Math.min(4, Math.floor(comboRef.current / 8)));
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      setJudge({ text: bestNote.hit === 'perfect' ? 'Perfect' : 'Good', lane, n: Date.now() });
    },
    [phase],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA'].includes(t.tagName))) return;
      if (spatial.get().walk || spatial.get().tour) return;
      const i = LANES.findIndex((l) => l.key === e.key.toUpperCase());
      if (i < 0 || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      hit(i);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hit]);

  return (
    <div className="gm-game sr">
      <div className="gm-hud">
        <span className="gm-chip">Score {score}</span>
        <span className="gm-chip">Combo ×{1 + Math.min(4, Math.floor(combo / 8))} · {combo}</span>
        <span className="gm-chip">{phase === 'playing' ? `${left}s` : `${LENGTH}s`}</span>
        <span className="gm-chip is-dim">Best {best}</span>
      </div>
      <div ref={field} className="sr-field">
        {LANES.map((l, i) => (
          <button
            key={l.key}
            type="button"
            className={`sr-lane ${lit === i ? 'is-lit' : ''}`}
            style={{ '--c': l.color } as CSSProperties}
            aria-label={`String ${l.name} (key ${l.key})`}
            data-voice={`string ${i + 1}`}
            onPointerDown={(e) => {
              e.preventDefault();
              hit(i);
            }}
            onClick={(e) => {
              // Hand mode and keyboard send clicks rather than pointer presses.
              if (e.detail === 0) hit(i);
            }}
          >
            <span className="sr-string" />
            <span className="sr-target">
              <b>{l.name}</b>
              <small>{l.key}</small>
            </span>
            {judge?.lane === i && (
              <span key={judge.n} className={`sr-judge is-${judge.text.toLowerCase()}`}>
                {judge.text}
              </span>
            )}
          </button>
        ))}
        <div className="sr-notes" aria-hidden="true">
          {phase === 'playing' &&
            notes.current.map((n, k) => (
              <i key={k} ref={(el) => void (n.el = el)} className="sr-note" style={{ left: `${n.lane * 25 + 12.5}%`, '--c': LANES[n.lane]!.color } as CSSProperties} />
            ))}
        </div>
        <div className="sr-line" aria-hidden="true" />
        {phase !== 'playing' && (
          <div className="gm-over">
            {phase === 'over' ? (
              <>
                <Trophy weight="duotone" aria-hidden="true" />
                <b>{score} points</b>
                <small>{score >= best && score > 0 ? 'New best!' : `Best ${best}`}</small>
              </>
            ) : (
              <>
                <b>Play the strings</b>
                <small>Hit each note as it crosses the line: tap a string, press D F J K, or pinch.</small>
              </>
            )}
            <button type="button" className="gm-btn is-primary" data-voice={phase === 'over' ? 'play again' : 'start game'} onClick={begin}>
              {phase === 'over' ? <ArrowCounterClockwise weight="bold" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
              {phase === 'over' ? 'Play again' : 'Start'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
