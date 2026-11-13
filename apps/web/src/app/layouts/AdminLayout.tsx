import { Head } from 'vite-react-ssg';
import { Outlet } from 'react-router-dom';
import { Container } from '@/components/layout/Container';

// Admin is never pre-rendered (see ssgOptions.includedRoutes) and never indexed.
// The sidebar, top bar and AuthGuard arrive with the admin work on days 7–8.
export function AdminLayout() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin · Shreyas Ballari</title>
      </Head>
      <main id="main" className="min-h-dvh bg-surface py-10">
        <Container>
          <Outlet />
        </Container>
      </main>
    </>
  );
}
