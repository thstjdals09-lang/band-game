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
  server: {
    port: 5173,
    watch: {
      // 그림을 폴더에 떨어뜨릴 때 복사 프로그램이 만드는 임시 파일은 감시하지 않는다.
      // Windows에서 아직 쓰는 중인 파일을 열려다 EBUSY가 나면 개발 서버가 통째로 죽는다.
      ignored: ['**/*.~tmp', '**/*.crdownload', '**/*.partial', '**/~$*'],
    },
  },
});
