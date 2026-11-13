import { Flow } from './flow/Flow';
import { ClassicMore } from './more/More';
import { ArcIntro } from './intro/ArcIntro';
import './classic.css';

/**
 * Classic tab: the light-arc intro, then one scroll film (see flow/timeline.ts for the order:
 * hero → education ring → sparkle → Oncure film → trading app → awards → technical skills), then the
 * sections after it (more/More.tsx): education, awards wall, activities, tutoring, goals, contact.
 */
export function ClassicPortfolio() {
  return (
    <div className="pf">
      <main>
        <ArcIntro />
        <Flow />
        <ClassicMore />
      </main>
    </div>
  );
}
