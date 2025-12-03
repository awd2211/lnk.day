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
    port: 60010,
    host: true,
    allowedHosts: ['app.lnk.day', 'localhost'],
    hmr: {
      // 当通过代理访问时，使用实际的主机名
      host: 'app.lnk.day',
      protocol: 'wss',
      clientPort: 443,
    },
  },
});
