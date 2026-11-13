import { useContext, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SmoothScrollContext } from '@/app/providers/SmoothScroll';

/**
 * Click handler for in-page links (`#about`). On the home page it scrolls smoothly; elsewhere it
 * navigates to `/#about` and HomePage scrolls on arrival.
 */
export function useHashLink() {
  const ctx = useContext(SmoothScrollContext);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (hash: string, onDone?: () => void) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (pathname !== '/') {
      onDone?.();
      navigate(`/${hash}`);
    } else if (onDone) {
      // Let the caller (the menu) close and release its scroll lock before scrolling.
      onDone();
      setTimeout(() => ctx?.scrollTo(hash), 0);
    } else {
      ctx?.scrollTo(hash);
    }
  };
}

export function useScrollTo() {
  const ctx = useContext(SmoothScrollContext);
  return (hash: string) => ctx?.scrollTo(hash);
}
