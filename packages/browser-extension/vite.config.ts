import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Copy public files to dist after build
function copyPublicFiles() {
  return {
    name: 'copy-public-files',
    closeBundle() {
      const publicDir = resolve(__dirname, 'public');
      const distDir = resolve(__dirname, 'dist');

      // Ensure icons directory exists
      const iconsDir = resolve(distDir, 'icons');
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }

      // Copy manifest.json
      copyFileSync(
        resolve(publicDir, 'manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      // Copy offscreen files
      copyFileSync(
        resolve(publicDir, 'offscreen.html'),
        resolve(distDir, 'offscreen.html')
      );
      copyFileSync(
        resolve(publicDir, 'offscreen.js'),
        resolve(distDir, 'offscreen.js')
      );

      // Copy icons if they exist
      const iconSizes = ['16', '32', '48', '128'];
      for (const size of iconSizes) {
        const iconPath = resolve(publicDir, `icons/icon-${size}.png`);
        if (existsSync(iconPath)) {
          copyFileSync(iconPath, resolve(iconsDir, `icon-${size}.png`));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Place HTML entry points in root, others as JS files
          if (chunkInfo.name === 'popup' || chunkInfo.name === 'options') {
            return '[name].js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep CSS files at root level
          if (assetInfo.name?.endsWith('.css')) {
            return '[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
