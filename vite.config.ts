import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves the app under /band-game/. HashRouter is used so deep links
// and browser Back work without server-side rewrites (see src/app/router.tsx).
export default defineConfig({
  base: '/band-game/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
});
