import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SITE } from '@/lib/site';

/** Top bar for inner pages; the home page has its own chrome. */
export function SiteBar() {
  const navigate = useNavigate();
  // Arrived from inside the site: step back, so the portfolio reopens where the visitor was.
  // Arrived directly (new tab, shared link): go to the home page.
  const cameFromSite = useLocation().key !== 'default';
  return (
    <header className="flex items-center justify-between px-gutter py-6">
      <Link to="/" className="label text-xl">
        {SITE.name}
      </Link>
      <Link
        to="/"
        onClick={(e) => {
          if (!cameFromSite) return;
          e.preventDefault();
          navigate(-1);
        }}
        className="label inline-flex min-h-11 items-center gap-2 text-base"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back
      </Link>
    </header>
  );
}
