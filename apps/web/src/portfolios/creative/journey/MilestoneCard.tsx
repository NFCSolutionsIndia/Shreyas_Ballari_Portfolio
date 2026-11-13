import { Link } from 'react-router-dom';
import { ArrowUpRight, Buildings, CalendarBlank } from '@phosphor-icons/react';
import { CHAPTERS } from '@/content/journeyChapters';
import { useActive } from './store';

/**
 * Chapter details on warm paper. Until the chapter pages exist (Phase 5), View Details links
 * to the existing project pages where there is one, and is shown as not yet available otherwise.
 */
const DETAIL: Record<string, string> = {
  '2026-oncure': '/research/oncure',
  'now-finance-app': '/projects/stock-trading-app',
};

export function MilestoneCard() {
  const active = useActive();
  const c = CHAPTERS[active]!;
  const to = DETAIL[c.slug];
  return (
    <article className="jt-card" aria-hidden="true">
      <div key={c.slug} className="jt-card-body">
        <span className="jt-card-pill">Milestone</span>
        <h3 className="jt-card-title">{c.title}</h3>
        <p className="jt-card-row">
          <CalendarBlank size={16} weight="bold" /> {c.date}
        </p>
        <p className="jt-card-row">
          <Buildings size={16} weight="bold" /> {c.place}
        </p>
        <p className="jt-card-desc">{c.description}</p>
        <ul className="jt-card-tags">
          {c.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      {to ? (
        <Link to={to} className="jt-card-cta" tabIndex={-1}>
          View Details <ArrowUpRight size={13} weight="bold" />
        </Link>
      ) : (
        <span className="jt-card-cta is-off" title="Chapter pages arrive in a later phase">
          View Details <ArrowUpRight size={13} weight="bold" />
        </span>
      )}
      <span className="jt-card-curl" />
    </article>
  );
}
