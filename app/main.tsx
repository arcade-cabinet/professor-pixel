import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerPyodideCache } from '@lib/python/pyodide-cache';

// Register the OPFS-cache service worker before mount so the
// pyodide.asm.wasm + python_stdlib.zip + pyodide.asm.js payload
// (~12MB) is served from per-origin persistent storage on cold
// start instead of being re-fetched. No-ops if SW unsupported.
registerPyodideCache();

createRoot(document.getElementById('root')!).render(<App />);
