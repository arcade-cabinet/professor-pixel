import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerPyodideCache } from '@lib/python/pyodide-cache';
import { migrateLocalStorageProjectsToOpfs } from '@lib/storage/opfs-migration';

// Register the OPFS-cache service worker before mount so the
// pyodide.asm.wasm + python_stdlib.zip + pyodide.asm.js payload
// (~12MB) is served from per-origin persistent storage on cold
// start instead of being re-fetched. No-ops if SW unsupported.
registerPyodideCache();

// One-shot migration: copy any localStorage-backed projects from
// pre-launcher releases over to the OPFS launcher store. Idempotent
// (sentinel file marks completion) so this is safe to call every boot.
// Off the critical render path; failures are logged, not surfaced.
migrateLocalStorageProjectsToOpfs().catch((err) => {
  console.warn('[opfs-migration] failed to run', err);
});

createRoot(document.getElementById('root')!).render(<App />);
