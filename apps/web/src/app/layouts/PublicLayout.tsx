import { Outlet, useLocation } from 'react-router-dom';
import { SmoothScroll } from '@/app/providers/SmoothScroll';
import { SiteBar } from '@/components/layout/SiteBar';
import { SkipLink } from '@/components/layout/SkipLink';
import { SITE } from '@/lib/site';

export function PublicLayout() {
  const isHome = useLocation().pathname === '/';
  return (
    <SmoothScroll>
      <SkipLink />
      {!isHome && <SiteBar />}
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
      {!isHome && (
        <footer className="label px-gutter py-10 text-sm text-text-muted">
          © {new Date().getFullYear()} {SITE.name}
        </footer>
      )}
    </SmoothScroll>
  );
}
