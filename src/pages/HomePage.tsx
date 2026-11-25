import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { JsonLd } from '@/components/seo/JsonLd';
import { Seo } from '@/components/seo/Seo';
import { profile } from '@/content/portfolio';
import { useScrollTo } from '@/hooks/useSmoothScroll';
import { PortfolioSwitcher } from '@/portfolios/switcher/PortfolioSwitcher';
import { usePortfolioChoice } from '@/portfolios/switcher/usePortfolioChoice';
import '@/portfolios/portfolios.css';

// Each design is its own download, so a visitor only loads the one they see (Classic and Studio
// never fetch the 3D engine). The pre-render waits for these, so the built HTML is unchanged.
const ClassicPortfolio = lazy(() => import('@/portfolios/classic/ClassicPortfolio').then((m) => ({ default: m.ClassicPortfolio })));
const CreativePortfolio = lazy(() => import('@/portfolios/creative/CreativePortfolio').then((m) => ({ default: m.CreativePortfolio })));
const StudioPortfolio = lazy(() => import('@/portfolios/studio/StudioPortfolio').then((m) => ({ default: m.StudioPortfolio })));

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
      {/* Temporary: three styles side by side until the family picks one (see README). */}
      <PortfolioSwitcher value={choice} onChange={choose} />
      <div role="tabpanel" aria-label="Portfolio">
        <Suspense fallback={<div aria-hidden="true" style={{ minHeight: '100vh', background: choice === 'creative' ? '#050507' : undefined }} />}>
          {choice === 'classic' && <ClassicPortfolio />}
          {choice === 'creative' && <CreativePortfolio />}
          {choice === 'studio' && <StudioPortfolio />}
        </Suspense>
      </div>
    </>
  );
}
