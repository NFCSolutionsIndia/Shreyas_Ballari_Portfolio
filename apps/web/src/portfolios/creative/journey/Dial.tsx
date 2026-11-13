import type { CSSProperties } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { CHAPTERS } from '@/content/journeyChapters';
import { cn } from '@/lib/cn';
import { tile } from './geometry';
import { goToChapter, LAST, useActive, useProgress } from './store';

/** The curved month dial: tiles glide along an ellipse; the active one turns gold. */
export function Dial() {
  const p = useProgress();
  const active = useActive();
  return (
    <div className="jt-dial">
      <span className="jt-dial-base" aria-hidden="true" />
      <span className="jt-dial-inner" aria-hidden="true" />
      {CHAPTERS.map((c, j) => {
        const t = tile(j, p);
        return (
          <button
            key={c.slug}
            type="button"
            className={cn('jt-tile', j === active && 'is-active')}
            style={
              {
                transform: `translate(${t.x}px, ${t.y}px) translate(-50%, -50%) rotate(${t.rot}deg) scale(${t.scale}) translateY(${-6 * t.active}px)`,
                opacity: t.opacity,
                zIndex: t.z,
                visibility: t.opacity < 0.02 ? 'hidden' : 'visible',
              } as CSSProperties
            }
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => goToChapter(j)}
          >
            {c.label.toUpperCase()}
            <span className="jt-tip">{c.title}</span>
          </button>
        );
      })}
      <span className="jt-dial-pointer" aria-hidden="true" />
      <button
        type="button"
        className="jt-chevron is-prev"
        onClick={() => goToChapter(active - 1)}
        disabled={active === 0}
        aria-label="Previous chapter"
      >
        <CaretLeft size={22} weight="bold" />
      </button>
      <button
        type="button"
        className="jt-chevron is-next"
        onClick={() => goToChapter(active + 1)}
        disabled={active === LAST}
        aria-label="Next chapter"
      >
        <CaretRight size={22} weight="bold" />
      </button>
    </div>
  );
}
