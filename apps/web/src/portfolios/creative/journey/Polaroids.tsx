import type { CSSProperties } from 'react';
import { CHAPTERS } from '@/content/journeyChapters';
import { polaroid } from './geometry';
import { goToChapter, useProgress } from './store';

/**
 * Polaroids orbiting the calendar: top-right shows chapter i+2, top-left i+1, left i−1; the
 * rest wait behind the calendar. `layer` renders either the ones behind or the ones in front.
 */
export function Polaroids({ layer }: { layer: 'back' | 'front' }) {
  const p = useProgress();
  return (
    <div className={`jt-polaroids is-${layer}`} aria-hidden="true">
      {CHAPTERS.map((c, j) => {
        const s = polaroid(j, p);
        if ((layer === 'front') !== s.front || s.opacity < 0.01) return null;
        return (
          <button
            key={c.slug}
            type="button"
            tabIndex={-1}
            className="jt-polaroid"
            style={
              {
                transform: `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) rotate(${s.rot}deg) scale(${s.scale})`,
                opacity: s.opacity,
                '--bob': `${5 + (j % 3) * 0.7}s`,
              } as CSSProperties
            }
            onClick={() => goToChapter(j)}
          >
            <span className="jt-polaroid-inner">
              <img src={c.image} alt="" decoding="async" />
              <span className="jt-polaroid-caption">{c.polaroidCaption}</span>
              <span className="jt-polaroid-date">{c.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
