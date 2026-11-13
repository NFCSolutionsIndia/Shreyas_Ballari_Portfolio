import { Outlet } from 'react-router-dom';

/**
 * Pathless root route: vite-react-ssg owns the router, so app-wide providers wrap the route
 * tree here. QueryProvider and ToastProvider join when data fetching starts. (Smooth scrolling
 * lives in PublicLayout so the admin panel scrolls natively.)
 */
export function AppProviders() {
  return <Outlet />;
}
