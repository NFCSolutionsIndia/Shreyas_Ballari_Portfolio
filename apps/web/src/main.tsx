import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './styles/globals.css';

export const createRoot = ViteReactSSG({
  routes,
  basename: import.meta.env.BASE_URL,
  // Opt in to v7 behaviour now so the React Router 7 upgrade is a version bump.
  future: {
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_relativeSplatPath: true,
    v7_skipActionErrorRevalidation: true,
  },
});
