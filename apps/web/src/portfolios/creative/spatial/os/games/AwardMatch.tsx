import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowCounterClockwise, Medal, Star, Trophy } from '@phosphor-icons/react';
import { AWARDS } from '../media';
import { chime, getBest, saveBest } from './shared';

/**
 * Award Match: the deck is shuffled and dealt face down. Flip two cards at a time to find the
 * pairs of Shreyas's awards; each pair you find tells you what it was for. Fewer moves, more
 * stars.
 */

const SET = AWARDS.slice(0, 6);

interface Card {
  k: number;
  id: string;
  open: boolean;
  done: boolean;
}

const deal = (): Card[] =>
  [...SET, ...SET]
    .map((a, i) => ({ k: i, id: a.id, open: false, done: false }))
    .sort(() => Math.random() - 0.5);

export function AwardMatch() {
  const [cards, setCards] = useState<Card[]>(deal);
  const [moves, setMoves] = useState(0);
  const [found, setFound] = useState<string | null>(null);
  const [dealt, setDealt] = useState(0);
  const [best, setBest] = useState(() => getBest('match'));
  const [lock, setLock] = useState(false);
  const pairs = cards.filter((c) => c.done).length / 2;
  const won = pairs === SET.length;
  const stars = moves <= 9 ? 3 : moves <= 14 ? 2 : 1;
  const points = won ? Math.max(100, 1000 - moves * 40) : 0;

  // Deal animation key: re-deal plays the shuffle again.
  useEffect(() => setDealt((d) => d + 1), []);

  const flip = (c: Card) => {
    if (lock || c.open || c.done || won) return;
    const open = cards.filter((x) => x.open && !x.done);
    const next = cards.map((x) => (x.k === c.k ? { ...x, open: true } : x));
    setCards(next);
    if (open.length === 0) return;
    const a = open[0]!;
    setMoves((m) => m + 1);
    if (a.id === c.id) {
      chime(true);
      const award = SET.find((s) => s.id === c.id)!;
      setFound(`${award.title}: ${award.value}`);
      setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, done: true } : x)));
      if (pairs + 1 === SET.length) {
        const p = Math.max(100, 1000 - (moves + 1) * 40);
        if (saveBest('match', p)) setBest(p);
      }
    } else {
      setLock(true);
      window.setTimeout(() => {
        setCards((cs) => cs.map((x) => (x.k === a.k || x.k === c.k ? { ...x, open: false } : x)));
        setLock(false);
      }, 850);
    }
  };
  const again = () => {
    setCards(deal());
    setMoves(0);
    setFound(null);
    setDealt((d) => d + 1);
  };

  return (
    <div className="gm-game am">
      <div className="gm-hud">
        <span className="gm-chip">Pairs {pairs} / {SET.length}</span>
        <span className="gm-chip">Moves {moves}</span>
        <span className="gm-chip is-dim">Best {best}</span>
        {found && (
          <span key={found} className="gm-chip am-found">
            <Medal weight="fill" aria-hidden="true" /> {found}
          </span>
        )}
      </div>
      <div className="am-grid" key={dealt}>
        {cards.map((c, i) => {
          const a = SET.find((s) => s.id === c.id)!;
          return (
            <button
              key={c.k}
              type="button"
              className={`am-card ${c.open || c.done ? 'is-open' : ''} ${c.done ? 'is-done' : ''}`}
              style={{ '--i': i } as CSSProperties}
              aria-label={c.open || c.done ? a.title : 'Hidden card'}
              data-voice={`card ${i + 1}`}
              data-card=""
              onClick={() => flip(c)}
            >
              <span className="am-inner">
                <span className="am-back">
                  <Trophy weight="fill" aria-hidden="true" />
                </span>
                <span className="am-front">
                  <img src={a.image} alt="" draggable={false} />
                  <b>{a.title}</b>
                </span>
              </span>
            </button>
          );
        })}
        {won && (
          <div className="gm-over" role="status">
            <span className="am-stars" aria-label={`${stars} stars`}>
              {[0, 1, 2].map((s) => (
                <Star key={s} weight={s < stars ? 'fill' : 'regular'} aria-hidden="true" />
              ))}
            </span>
            <b>All pairs in {moves} moves</b>
            <small>
              {points} points · {points >= best ? 'New best!' : `Best ${best}`}
            </small>
            <button type="button" className="gm-btn is-primary" data-voice="play again" onClick={again}>
              <ArrowCounterClockwise weight="bold" aria-hidden="true" /> Shuffle and play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
