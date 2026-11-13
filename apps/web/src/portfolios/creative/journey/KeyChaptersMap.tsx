import type { ComponentType } from 'react';
import { Atom, Heartbeat, PenNib, Plant, RocketLaunch, Trophy, type IconProps } from '@phosphor-icons/react';
import { CHAPTERS, JOURNEY_ART, MAP_POINTS } from '@/content/journeyChapters';
import { cn } from '@/lib/cn';
import { MAP_ICONS, MAP_PATH, mapPosition, pathShare, pinAt } from './geometry';
import { goToChapter, useProgress } from './store';

const ICONS: ComponentType<IconProps>[] = [Plant, Heartbeat, PenNib, Trophy, Atom, RocketLaunch];
const POSITIONS = CHAPTERS.map((c) => c.mapPosition);

/** First chapter that sits on a map point (map points jump straight to it). */
const chapterFor = (point: number) => CHAPTERS.findIndex((c) => c.mapPosition === point);

/** The parchment "Key Chapters" map with its dashed path, pin and flag. */
export function KeyChaptersMap() {
  const p = useProgress();
  const pos = mapPosition(POSITIONS, p);
  const pin = pinAt(pos);
  const share = pathShare(pos);
  const near = Math.round(pos);
  return (
    <div className="jt-map">
      <img src={JOURNEY_ART.parchment} alt="" className="jt-map-paper" aria-hidden="true" />
      <div className="jt-map-sign" aria-hidden="true">
        Key Chapters
      </div>
      <svg className="jt-map-path" viewBox="0 0 1440 900" aria-hidden="true">
        <path d={MAP_PATH} className="jt-map-dash" />
        <path d={MAP_PATH} className="jt-map-gold" pathLength={1000} style={{ strokeDasharray: `${share * 1000} 2000` }} />
      </svg>
      {MAP_POINTS.map((m, i) => {
        const Icon = ICONS[i]!;
        const at = MAP_ICONS[i]!;
        return (
          <button
            key={m.title}
            type="button"
            className={cn('jt-map-point', Math.abs(pos - i) < 0.25 && near === i && 'is-here')}
            style={{ left: at.x, top: at.y }}
            onClick={() => goToChapter(chapterFor(i))}
            tabIndex={-1}
            aria-hidden="true"
          >
            <Icon size={26} weight="light" />
            <span className="jt-map-title">{m.title}</span>
            <span className="jt-map-sub">{m.sub}</span>
          </button>
        );
      })}
      <div className="jt-flag" aria-hidden="true">
        <svg viewBox="0 0 70 90">
          <path d="M 8 4 L 8 88" className="jt-flag-pole" />
          <path d="M 10 6 C 30 0, 44 14, 66 8 L 58 26 L 66 42 C 44 48, 30 34, 10 40 Z" className="jt-flag-cloth" />
        </svg>
        <span>
          The Next Chapter
          <br />…
        </span>
      </div>
      <span className="jt-pin" style={{ transform: `translate(${pin.x}px, ${pin.y}px)` }} aria-hidden="true">
        <svg viewBox="0 0 40 60">
          <circle cx="20" cy="14" r="12" />
          <path d="M 20 26 L 20 58" />
        </svg>
      </span>
    </div>
  );
}
