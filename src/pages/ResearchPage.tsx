import { Link } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import '@/features/details/style';
import { oncure, researchInterests } from '@/content/portfolio';

/** /research: his research interests and Oncure. */
export function Component() {
  return (
    <>
      <Seo title="Research" description="Independent research by Shreyas Ballari: AI in oncology and AI-enabled trading." />
      <div className="dt dt--page is-static">
        <div className="dt-body">
          <header className="dt-head">
            <p className="dt-kicker">Research</p>
            <h1 className="dt-title">What he is researching</h1>
          </header>
          <ul className="dt-grid">
            {researchInterests.map((r) => (
              <li key={r.title}>
                <b>{r.title}</b>
                <p>{r.line}</p>
              </li>
            ))}
          </ul>
          <Link to="/research/oncure" className="dt-end dt-link">
            <span className="dt-kicker">Research concept</span>
            <b className="dt-h">{oncure.name}</b>
            <p>{oncure.pitch}</p>
            <span className="dt-note">{oncure.disclaimer}</span>
            <span className="dt-go">Read the full concept and watch the film →</span>
          </Link>
        </div>
      </div>
    </>
  );
}
