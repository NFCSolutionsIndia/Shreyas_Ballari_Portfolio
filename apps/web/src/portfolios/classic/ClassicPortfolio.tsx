import { Flow } from './flow/Flow';
import { ArcIntro } from './intro/ArcIntro';
import './classic.css';

/**
 * Classic tab: the light-arc intro, then one scroll film (see flow/timeline.ts for the order:
 * hero → education ring → sparkle → Oncure film → trading app → awards → technical skills).
 */
export function ClassicPortfolio() {
  return (
    <div className="pf">
      <main>
        <ArcIntro />
        <Flow />
      </main>
    </div>
  );
}
