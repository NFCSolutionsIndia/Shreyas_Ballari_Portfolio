import type { RouteRecord } from 'vite-react-ssg';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { ErrorPage } from '@/app/error/ErrorPage';
import { NotFoundPage } from '@/app/error/NotFoundPage';
import { AppProviders } from '@/app/providers/AppProviders';

// Slugs to pre-render; from day 2 these come from the API at build time.
const RESEARCH_SLUGS = ['oncure'];
const PROJECT_SLUGS = ['stock-trading-app'];

const publicRoutes: RouteRecord[] = [
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, lazy: () => import('@/pages/HomePage') },
      { path: 'about', lazy: () => import('@/pages/AboutPage') },
      { path: 'research', lazy: () => import('@/pages/ResearchPage') },
      {
        path: 'research/:slug',
        lazy: () => import('@/pages/ResearchDetailPage'),
        getStaticPaths: () => RESEARCH_SLUGS.map((s) => `research/${s}`),
      },
      { path: 'projects', lazy: () => import('@/pages/ProjectsPage') },
      {
        path: 'projects/:slug',
        lazy: () => import('@/pages/ProjectDetailPage'),
        getStaticPaths: () => PROJECT_SLUGS.map((s) => `projects/${s}`),
      },
      { path: 'achievements', lazy: () => import('@/pages/AchievementsPage') },
      { path: 'tutoring', lazy: () => import('@/pages/TutoringPage') },
      { path: 'resume', lazy: () => import('@/pages/ResumePage') },
      { path: 'contact', lazy: () => import('@/pages/ContactPage') },
      { path: 'privacy', lazy: () => import('@/pages/PrivacyPage') },
      // Not lazy: ErrorPage already bundles it for 404 route errors.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [{ index: true, lazy: () => import('@/pages/admin/DashboardPage') }],
  },
];

export const routes: RouteRecord[] = [{ element: <AppProviders />, children: publicRoutes }];
