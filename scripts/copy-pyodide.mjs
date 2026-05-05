#!/usr/bin/env node
/**
 * Copy the vendored Pyodide assets from node_modules/pyodide/ into
 * public/pyodide/ so the static SPA can serve them directly. Wired in
 * as `postinstall`, `predev`, and `prebuild` so the assets always
 * exist before the dev server starts or the production build runs.
 *
 * The destination is gitignored — these files are build outputs, not
 * checked in. The source-of-truth version is pinned in package.json.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const src = resolve(repoRoot, 'node_modules/pyodide');
const dest = resolve(repoRoot, 'public/pyodide');

if (!existsSync(src)) {
  console.error(`[copy-pyodide] node_modules/pyodide is missing — run "pnpm install" first.`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });

// Files that the loader actually fetches at runtime. Anything else under
// node_modules/pyodide/ (typings, source maps, READMEs) stays in node_modules.
const RUNTIME_FILES = [
  'pyodide.js',
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

let copied = 0;
for (const name of RUNTIME_FILES) {
  const from = join(src, name);
  const to = join(dest, name);
  if (!existsSync(from)) {
    // Fail fast: the runtime won't boot without these. A silent skip would
    // ship a broken vendored Pyodide that only manifests at lesson-page load.
    throw new Error(
      `[copy-pyodide] required runtime asset missing: ${name} (looked in ${src}). ` +
        `Reinstall pyodide or check the package version.`,
    );
  }
  copyFileSync(from, to);
  copied += 1;
}

// Some Pyodide releases ship per-package wheels under a sibling dir; copy any
// .whl files at the package root that future loadPackage() calls might need.
for (const entry of readdirSync(src)) {
  if (!entry.endsWith('.whl')) continue;
  const from = join(src, entry);
  const to = join(dest, entry);
  if (statSync(from).isFile()) {
    copyFileSync(from, to);
    copied += 1;
  }
}

console.log(`[copy-pyodide] vendored ${copied} runtime files into public/pyodide/`);
