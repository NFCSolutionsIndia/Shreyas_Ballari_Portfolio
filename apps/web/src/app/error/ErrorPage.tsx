import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/Button';
import { Section } from '@/components/layout/Section';
import { NotFoundPage } from './NotFoundPage';

export function ErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <Section
      as="h1"
      title="Something went wrong"
      intro="Please refresh the page. If it keeps happening, try again later."
    >
      <Link to="/" className={buttonClasses('primary')}>
        Go home
      </Link>
      {/* Development only: show what broke. Never shown in production builds. */}
      {import.meta.env.DEV && error instanceof Error && (
        <pre data-dev-error className="mt-10 overflow-auto rounded-md bg-black p-4 text-xs text-white">
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
      )}
    </Section>
  );
}
