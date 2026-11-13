import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowArcLeft, ArrowArcRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, SpeakerHigh, X } from '@phosphor-icons/react';
import { type Hotspot } from '../house/hotspots';
import { held, type WalkKey } from '../house/walkKeys';
import { speak } from '../story/narrator';
import { playUi, spatial } from '../store';
import { goSpot, RoomPoints, SpotAction } from './Tour';

/**
 * Walk mode: move freely through every room, the garden and the backyard. Keys: W A S D or the
 * arrows to move, Q / E (or the arrows left and right) to turn, Shift to run, drag to look, Esc to
 * stop. On touch screens a pad does the same. Glowing points on nearby things open their details.
 */

function PadButton({ k, label, icon: I }: { k: WalkKey; label: string; icon: typeof ArrowUp }) {
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer */
    }
    held.add(k);
  };
  const up = () => held.delete(k);
  return (
    <button type="button" className={`wk-pad-btn is-${k}`} aria-label={label} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onContextMenu={(e) => e.preventDefault()}>
      <I weight="bold" />
    </button>
  );
}

export function Walk() {
  const [spot, setSpot] = useState<Hotspot | null>(null);
  return (
    <div className="wk">
      <header className="wk-top">
        <span className="wk-badge">
          <Footprints weight="fill" aria-hidden="true" /> Walk mode
        </span>
        <p className="wk-keys">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> or arrows to move · <kbd>Q</kbd>
          <kbd>E</kbd> to turn · <kbd>Shift</kbd> to run · drag to look
        </p>
        <button type="button" className="tour-skip" data-voice="stop walking" onClick={() => spatial.endWalk()}>
          Done <X weight="bold" aria-hidden="true" />
        </button>
      </header>

      <RoomPoints station={null} open={spot?.id ?? null} onOpen={(h) => (playUi('open'), setSpot((s) => (s?.id === h.id ? null : h)))} />

      {spot && (
        <article key={spot.id} className="tour-card is-detail wk-card" style={{ '--tint': spot.tint ?? '#fff' } as CSSProperties} aria-live="polite">
          <button type="button" className="tour-back" onClick={() => setSpot(null)}>
            <X weight="bold" aria-hidden="true" /> Close
          </button>
          <span className="tour-n">{spot.kicker}</span>
          <h2>{spot.title}</h2>
          <div className="tour-body">
            <p>{spot.text}</p>
            {spot.items && (
              <ul className="tour-list">
                {spot.items.map((x, i) => (
                  <li key={x} style={{ '--i': i } as CSSProperties}>
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className="tour-actions">
            <button type="button" className="os-round" aria-label="Read this aloud" onClick={() => speak(`${spot.title}. ${spot.text}`)}>
              <SpeakerHigh weight="bold" />
            </button>
            <SpotAction spot={spot} onGo={goSpot} />
          </footer>
        </article>
      )}

      <div className="wk-pad" aria-label="Move">
        <PadButton k="turnL" label="Turn left" icon={ArrowArcLeft} />
        <PadButton k="forward" label="Walk forward" icon={ArrowUp} />
        <PadButton k="turnR" label="Turn right" icon={ArrowArcRight} />
        <PadButton k="left" label="Step left" icon={ArrowLeft} />
        <PadButton k="back" label="Walk back" icon={ArrowDown} />
        <PadButton k="right" label="Step right" icon={ArrowRight} />
      </div>
    </div>
  );
}
