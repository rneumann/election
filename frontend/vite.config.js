import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // =====================================================================
    // TODO: REMOVE THIS PROXY CONFIGURATION WHEN NGINX IS IMPLEMENTED
    // =====================================================================
    // This proxy is ONLY for local development without nginx.
    // In production, nginx will handle routing between frontend and backend.
    // When nginx is ready, delete the entire 'proxy' section below.
    // =====================================================================
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Backend server URL
        changeOrigin: true,
        secure: false,
      },
    },
    // =====================================================================
    // END OF TEMPORARY PROXY CONFIGURATION
    // =====================================================================
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
