import { CHAPTERS } from '@/content/journeyChapters';
import { bigSize } from './geometry';
import { useActive } from './store';

/**
 * Text on the calendar's blank page (Phase 1: crossfades on change). Phase 3 replaces the
 * front page with the WebGL paper curl and draws this same text into its texture.
 */
export function CalendarPage() {
  const active = useActive();
  const c = CHAPTERS[active]!;
  return (
    <div className="jt-page" aria-hidden="true">
      <div key={c.slug} className="jt-page-ink">
        <p className="jt-page-sign">Shreyas</p>
        <p className="jt-page-month">{c.page.month}</p>
        <p className="jt-page-big" style={{ fontSize: bigSize(c.page.big) }}>
          {c.page.big}
        </p>
        <svg className="jt-page-circle" viewBox="0 0 132 63">
          <ellipse cx="66" cy="31.5" rx="62" ry="27" pathLength={100} />
        </svg>
        <p className="jt-page-circled">{c.page.circled}</p>
      </div>
    </div>
  );
}
