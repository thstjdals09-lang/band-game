// Hash router: works on GitHub Pages / any static host without rewrites, and keeps real browser
// history entries so hardware Back matches the in-game Back rules (IA §25 PWA / 브라우저 Back).
import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ROUTES } from './routes';

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      ...ROUTES.map((r) => ({ path: r.path, element: r.element })),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
