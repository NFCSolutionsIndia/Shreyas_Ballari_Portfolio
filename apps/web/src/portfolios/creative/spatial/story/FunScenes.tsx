import { useState } from 'react';
import { CellDefender, MusicPlayer, Quiz } from '../fun';

/** Music and games scenes, using the generated guitar player and the two games from ../fun. */

export function MusicScene() {
  return (
    <div className="sc-music sc-pop" style={{ ['--i' as string]: 0 }}>
      <MusicPlayer />
    </div>
  );
}

export function GamesScene() {
  const [game, setGame] = useState<'cells' | 'quiz'>('cells');
  return (
    <div className="sc-games">
      <div className="sc-tabs" role="tablist" aria-label="Games">
        <button type="button" role="tab" aria-selected={game === 'cells'} className={game === 'cells' ? 'is-on' : ''} data-voice="cell defender" onClick={() => setGame('cells')}>
          Cell Defender
        </button>
        <button type="button" role="tab" aria-selected={game === 'quiz'} className={game === 'quiz' ? 'is-on' : ''} data-voice="quiz" onClick={() => setGame('quiz')}>
          How well do you know Shreyas?
        </button>
      </div>
      <div className="sc-game sc-pop" style={{ ['--i' as string]: 1 }}>
        {game === 'cells' ? <CellDefender /> : <Quiz />}
      </div>
    </div>
  );
}
