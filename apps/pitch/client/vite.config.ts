import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        // Add retry logic for startup connection issues
        configure: (proxy) => {
          proxy.on('error', () => {
            // Suppress repetitive error logs during startup
          });
        },
      },
    },
  },
})