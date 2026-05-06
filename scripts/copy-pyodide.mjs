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

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
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
        `Reinstall pyodide or check the package version.`
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

// Vendor pygame-ce (and its transitive deps) from the Pyodide package CDN
// so loadPackage() can serve them from /pyodide/ instead of jsdelivr at
// runtime. This is what makes the launcher actually CDN-free: the bootstrap
// (asm.wasm, asm.js, stdlib.zip, lock.json) is already vendored above; the
// remaining runtime CDN hit is loadPackage('pygame-ce'), and that's what
// this block kills.
//
// Strategy: read pyodide-lock.json, walk pygame-ce's dependency tree, fetch
// each .whl from cdn.jsdelivr.net only if it's not already on disk
// (idempotent — re-running the script after the install is a no-op). Verify
// each .whl matches the SHA-256 declared in the lock file before saving so a
// poisoned CDN response can't ship into the build. The fetch happens on the
// developer's machine (postinstall) and on CI runners (predev/prebuild),
// not at runtime in the browser.
const lockPath = join(dest, 'pyodide-lock.json');
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const PYODIDE_VERSION = '0.29.3'; // matches package.json's pyodide pin
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

function transitiveDeps(rootName) {
  const seen = new Set();
  const queue = [rootName];
  while (queue.length > 0) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const info = lock.packages[name];
    if (!info) continue;
    for (const dep of info.depends ?? []) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return [...seen];
}

const RUNTIME_PACKAGES = ['pygame-ce'];
const allPkgs = new Set();
for (const p of RUNTIME_PACKAGES) {
  for (const dep of transitiveDeps(p)) allPkgs.add(dep);
}

let fetched = 0;
let cached = 0;
for (const pkg of allPkgs) {
  const info = lock.packages[pkg];
  if (!info) {
    throw new Error(`[copy-pyodide] package "${pkg}" not in pyodide-lock.json`);
  }
  const wheelName = info.file_name;
  if (!wheelName) continue;
  const wheelDest = join(dest, wheelName);
  if (existsSync(wheelDest)) {
    // Already vendored. Trust the existing file — the SHA-pinned lock means
    // a wrong-version wheel only happens if someone hand-edited the cache,
    // and that's their problem to debug.
    cached += 1;
    continue;
  }
  const url = `${CDN_BASE}${wheelName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `[copy-pyodide] failed to fetch ${pkg} wheel from ${url}: ${response.status} ${response.statusText}`
    );
  }
  const buf = new Uint8Array(await response.arrayBuffer());
  // Verify the SHA-256 against the lock entry — defends against CDN
  // tampering and accidental cache-lane mismatch (jsdelivr serves whatever
  // it has, which can lag the registry on cold paths).
  const actualSha = createHash('sha256').update(buf).digest('hex');
  if (actualSha !== info.sha256) {
    throw new Error(
      `[copy-pyodide] SHA-256 mismatch for ${pkg}: expected ${info.sha256}, got ${actualSha}. ` +
        `Wheel from ${url} not written.`
    );
  }
  writeFileSync(wheelDest, buf);
  fetched += 1;
}

console.log(
  `[copy-pyodide] vendored ${copied} runtime files + ${fetched} fetched / ${cached} cached package wheels into public/pyodide/`
);
