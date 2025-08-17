import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: 'dist',
    assetsDir: 'assets',
  },
  base: '/pitch/', // ✅ Required so assets resolve correctly when served under /pitch/
  // Dev server proxy: forward any /api requests to the backend (port 4000)
  // so the Vite dev server can serve the client while backend APIs are reachable.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
