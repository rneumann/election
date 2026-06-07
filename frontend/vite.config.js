import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profile = process.env.CONFIG_PROFILE || 'hka';
const themePath = path.join(__dirname, `config/theme.${profile}.json`);

let themeConfig;
try {
  themeConfig = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
} catch {
  console.warn(`[vite] theme config for profile "${profile}" not found, falling back to hka`);
  themeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/theme.hka.json'), 'utf-8'));
}

export default defineConfig({
  plugins: [react()],
  define: {
    __THEME_CONFIG__: JSON.stringify(themeConfig),
  },
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
