import { Head } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { env } from '@/lib/env';
import { SITE } from '@/lib/site';

interface SeoProps {
  /** Page title; the site name is appended unless this is the home page. */
  title?: string;
  description: string;
  image?: string;
  noindex?: boolean;
}

export function Seo({ title, description, image = `${import.meta.env.BASE_URL}og/default.png`, noindex = false }: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} · ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  const url = new URL(pathname.replace(/^\//, ''), env.VITE_SITE_URL).toString();
  const imageUrl = new URL(image, env.VITE_SITE_URL).toString();

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
}
