import { useState, type ComponentType, type CSSProperties } from 'react';
import { CaretLeft, ChartLineUp, Dna, GameController, Guitar, Play, Trophy } from '@phosphor-icons/react';
import { CellDefender } from '../../fun';
import { playUi } from '../../store';
import { PHOTOS } from '@/portfolios/room/photos';
import { storyById } from '../media';
import { AwardMatch } from './AwardMatch';
import { MarketSense } from './MarketSense';
import { getBest } from './shared';
import { StringRhythm } from './StringRhythm';

/**
 * Games: four games, each drawn from a part of Shreyas's story, as big picture tiles. Pick one
 * and it opens full size in the same window, with a way back to the others.
 */

interface Game {
  id: string;
  best: string;
  title: string;
  tag: string;
  how: string;
  image: string;
  tint: string;
  icon: typeof Dna;
  C: ComponentType;
}

const GAMES: Game[] = [
  { id: 'cells', best: 'cell-defender', title: 'Cell Defender', tag: 'Inspired by Oncure', how: 'Tap the tumour cells, spare the healthy ones', image: PHOTOS.cellsIllustration.src, tint: '#e0466e', icon: Dna, C: CellDefender },
  { id: 'market', best: 'market', title: 'Market Sense', tag: 'Inspired by his trading app', how: 'Read the chart and call the next candle', image: storyById('finance')!.image, tint: '#22a06b', icon: ChartLineUp, C: MarketSense },
  { id: 'rhythm', best: 'rhythm', title: 'String Rhythm', tag: 'Inspired by his guitar', how: 'Hit the notes on time to play a melody', image: storyById('guitar')!.image, tint: '#f28c28', icon: Guitar, C: StringRhythm },
  { id: 'match', best: 'match', title: 'Award Match', tag: 'His awards, as a memory game', how: 'Flip the cards and find the pairs', image: storyById('awards')!.image, tint: '#d4a43a', icon: Trophy, C: AwardMatch },
];

function bestOf(g: Game) {
  if (g.id === 'cells') {
    try {
      return Number(localStorage.getItem('fun-cell-defender-best') ?? 0) || 0;
    } catch {
      return 0;
    }
  }
  return getBest(g.best);
}

export function GamesHub() {
  const [open, setOpen] = useState<string | null>(null);
  const g = GAMES.find((x) => x.id === open);
  if (g) {
    const I = g.icon;
    return (
      <section className="os-pane gm-pane gm-playing" style={{ '--tint': g.tint } as CSSProperties}>
        <header className="gm-top">
          <button type="button" className="os-round" aria-label="All games" data-voice="all games" onClick={() => (playUi('close'), setOpen(null))}>
            <CaretLeft weight="bold" />
          </button>
          <span className="gm-top-ico">
            <I weight="fill" aria-hidden="true" />
          </span>
          <span>
            <b>{g.title}</b>
            <small>
              {g.tag} · {g.how}
            </small>
          </span>
        </header>
        <div className={`gm-stage is-${g.id}`}>
          <g.C />
        </div>
      </section>
    );
  }
  return (
    <section className="os-pane gm-pane gm-hub">
      <header className="gm-hub-head">
        <span className="os-app-ico" style={{ background: '#f28c28' }}>
          <GameController weight="fill" aria-hidden="true" />
        </span>
        <div>
          <h2>Games</h2>
          <p>Four games, each from a part of his story</p>
        </div>
      </header>
      <div className="gm-tiles">
        {GAMES.map((x, i) => {
          const I = x.icon;
          const best = bestOf(x);
          return (
            <button key={x.id} type="button" className="gm-tile" style={{ '--i': i, '--tint': x.tint } as CSSProperties} data-voice={x.title} onClick={() => (playUi('open'), setOpen(x.id))}>
              <img src={x.image} alt="" draggable={false} />
              <span className="gm-tile-shade" />
              <span className="gm-tile-n">0{i + 1}</span>
              {best > 0 && <span className="gm-tile-best">Best {best}</span>}
              <span className="gm-tile-body">
                <span className="gm-tile-ico">
                  <I weight="fill" aria-hidden="true" />
                </span>
                <b>{x.title}</b>
                <small>{x.tag}</small>
                <span className="gm-tile-how">{x.how}</span>
                <span className="gm-tile-play">
                  <Play weight="fill" aria-hidden="true" /> Play
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
