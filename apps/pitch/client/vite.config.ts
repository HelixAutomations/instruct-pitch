// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: 'dist/pitch',  // ✅ Build to dist/pitch to match IIS structure
    assetsDir: 'assets',
  },
  base: '/pitch/',  // ✅ Base path for assets
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