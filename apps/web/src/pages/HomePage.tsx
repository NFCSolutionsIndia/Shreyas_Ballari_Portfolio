import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { JsonLd } from '@/components/seo/JsonLd';
import { Seo } from '@/components/seo/Seo';
import { profile } from '@/content/portfolio';
import { useScrollTo } from '@/hooks/useSmoothScroll';
import { ClassicPortfolio } from '@/portfolios/classic/ClassicPortfolio';
import { CreativePortfolio } from '@/portfolios/creative/CreativePortfolio';
import { AgentsPortfolio } from '@/portfolios/agents/AgentsPortfolio';
import { WorldPortfolio } from '@/portfolios/world/WorldPortfolio';
import { PortfolioSwitcher } from '@/portfolios/switcher/PortfolioSwitcher';
import { usePortfolioChoice } from '@/portfolios/switcher/usePortfolioChoice';
import '@/portfolios/portfolios.css';

export function Component() {
  const { hash } = useLocation();
  const scrollTo = useScrollTo();
  const [choice, choose] = usePortfolioChoice();

  // Arriving via /#section: wait a frame for layout, then glide there.
  useEffect(() => {
    if (!hash) return;
    const id = requestAnimationFrame(() => scrollTo(hash));
    return () => cancelAnimationFrame(id);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Seo description="Shreyas Ballari is a high school student at Fulton Science Academy: an independent researcher behind Oncure, an app builder and a peer tutor." />
      <JsonLd
        data={{
          '@type': 'Person',
          name: profile.name,
          affiliation: { '@type': 'EducationalOrganization', name: profile.school },
          knowsAbout: ['Artificial intelligence', 'Biomedical research', 'Nanotechnology', 'Finance'],
        }}
      />
      {/* Temporary: four styles side by side until the family picks one (see README). */}
      <PortfolioSwitcher value={choice} onChange={choose} />
      <div role="tabpanel" aria-label="Portfolio">
        {choice === 'classic' && <ClassicPortfolio />}
        {choice === 'creative' && <CreativePortfolio />}
        {choice === 'studio' && <AgentsPortfolio />}
        {choice === 'travel' && <WorldPortfolio />}
      </div>
    </>
  );
}
