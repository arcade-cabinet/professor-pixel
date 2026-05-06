import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const isReplitDev = process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined;

// PWA manifest paths need to honor Vite's --base flag. Vite rewrites paths
// inside index.html (preload hrefs, link/script src) but does NOT touch JSON
// files in public/. Without this, on GitHub Pages with --base=/professor-pixel/
// the manifest's start_url=/ points at the user's github.io root (not our
// subpath), scope=/ leaks across other Pages projects on the same origin, and
// icon srcs 404 because they live under the subpath. This plugin re-emits
// manifest.webmanifest at build time with paths prefixed by config.base.
function pwaManifestPlugin(): Plugin {
  let base = '/';
  return {
    name: 'pp-pwa-manifest',
    apply: 'build',
    configResolved(config) {
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    generateBundle() {
      const sourcePath = path.resolve(import.meta.dirname, 'public/manifest.webmanifest');
      const raw = JSON.parse(readFileSync(sourcePath, 'utf8'));
      const rebased = {
        ...raw,
        start_url: base,
        scope: base,
        icons: Array.isArray(raw.icons)
          ? raw.icons.map((icon: { src: string; [k: string]: unknown }) => ({
              ...icon,
              src: icon.src.startsWith('/') ? `${base}${icon.src.slice(1)}` : icon.src,
            }))
          : raw.icons,
      };
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(rebased, null, 2),
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    react(),
    runtimeErrorOverlay(),
    pwaManifestPlugin(),
    ...(isReplitDev
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer()),
          await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'app'),
      '@lib': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, 'app/assets'),
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
