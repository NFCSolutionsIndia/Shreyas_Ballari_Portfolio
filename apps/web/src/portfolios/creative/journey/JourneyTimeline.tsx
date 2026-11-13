import { CHAPTERS } from '@/content/journeyChapters';
import { cn } from '@/lib/cn';
import { goToChapter, LAST, useActive, useProgress } from './store';

const STEP = 42;

/** Right-hand timeline: nine stops, a gold fill to the active one and an overall progress bar. */
export function JourneyTimeline() {
  const p = useProgress();
  const active = useActive();
  return (
    <nav className="jt-timeline" aria-label="Chapters">
      <p className="jt-timeline-label">
        The
        <br />
        Journey
      </p>
      <span className="jt-timeline-line" aria-hidden="true">
        <span className="jt-timeline-fill" style={{ height: p * STEP }} />
        <span className="jt-timeline-progress" style={{ transform: `scaleY(${p / LAST})` }} />
      </span>
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.slug}>
            <button
              type="button"
              className={cn('jt-stop', i === active && 'is-active', i < active && 'is-past')}
              onClick={() => goToChapter(i)}
              aria-label={`Go to chapter ${i + 1}: ${c.title}`}
              aria-current={i === active ? 'step' : undefined}
            >
              <span className="jt-stop-dot" aria-hidden="true" />
              <span className="jt-stop-label">{c.label}</span>
              <span className="jt-stop-sub">{c.timelineSub}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
