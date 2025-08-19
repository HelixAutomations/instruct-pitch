// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: 'dist',  // ✅ Build to dist root for proper static serving
    assetsDir: 'assets',
  },
  base: '/',  // ✅ Root base path for universal asset serving
  // Dev server proxy: forward any /api requests to the backend (port 3000 for production, 4000 for mock)
  // so the Vite dev server can serve the client while backend APIs are reachable.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});