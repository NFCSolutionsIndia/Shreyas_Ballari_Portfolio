import { useCallback, useEffect, useState } from 'react';

/**
 * The portfolio styles shown side by side for the family to choose from. Once one is
 * chosen, delete the switcher and the other folders (see README "Choosing a portfolio").
 */
export const PORTFOLIOS = [
  { id: 'creative', label: 'Creative' },
  { id: 'classic', label: 'Classic' },
  { id: 'studio', label: 'Studio' },
] as const;

export type PortfolioId = (typeof PORTFOLIOS)[number]['id'];

const DEFAULT: PortfolioId = 'creative';
// v2: Creative became the first tab; older saved picks are ignored once.
const STORAGE_KEY = 'portfolio-style-v2';
const isPortfolio = (v: string | null): v is PortfolioId => PORTFOLIOS.some((p) => p.id === v);

/**
 * Which portfolio to show. Pre-rendered HTML is the default (Creative); after load the choice comes
 * from `?style=` first, then the visitor's last pick, then Creative.
 */
export function usePortfolioChoice() {
  const [choice, setChoice] = useState<PortfolioId>(DEFAULT);

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('style');
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: fall back to the default.
    }
    if (isPortfolio(fromUrl)) setChoice(fromUrl);
    else if (isPortfolio(stored)) setChoice(stored);
  }, []);

  // Each style styles the page behind it (html background, overscroll colour).
  useEffect(() => {
    document.documentElement.dataset.portfolio = choice;
  }, [choice]);

  const choose = useCallback((next: PortfolioId) => {
    setChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
    const url = new URL(location.href);
    url.searchParams.set('style', next);
    url.hash = '';
    history.replaceState(null, '', url);
    window.scrollTo(0, 0);
  }, []);

  return [choice, choose] as const;
}
