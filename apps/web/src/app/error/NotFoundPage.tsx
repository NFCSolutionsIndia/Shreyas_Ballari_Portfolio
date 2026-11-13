import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/Button';
import { Section } from '@/components/layout/Section';
import { Seo } from '@/components/seo/Seo';

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="This page does not exist." noindex />
      <Section
        as="h1"
        eyebrow="404"
        title="This page doesn't exist"
        intro="The link may be old, or the address may have a typo."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/" className={buttonClasses('primary')}>
            Go home
          </Link>
          <Link to="/research" className={buttonClasses('secondary')}>
            See research
          </Link>
        </div>
      </Section>
    </>
  );
}

export const Component = NotFoundPage;
