import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const isReplitDev =
  process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined;

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(isReplitDev
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer(),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'app'),
      '@lib': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
});
