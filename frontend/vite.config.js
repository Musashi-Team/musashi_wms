import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api dan /media ke Django agar tidak ada masalah CORS saat development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/media': 'http://127.0.0.1:8000',
    },
  },
});
