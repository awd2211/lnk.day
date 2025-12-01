import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 60011,
    host: true,
    allowedHosts: ['console.lnk.day', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:60009',
        changeOrigin: true,
      },
    },
  },
});
