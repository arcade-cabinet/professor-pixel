// Cover the cold SSR/performance/existing-tag-undefined-status branches
// in src/python/pyodide-singleton.ts that the existing pyodide-* suites
// skip:
//   - line 82 path 1 falsy: existing <script> tag whose dataset.pyodideStatus
//     is NEITHER 'loaded' NOR 'error' NOR 'loading' (e.g., a tag without
//     the dataset attribute at all). Falls through to the else-arm at
//     lines 86-92 which attaches load/error listeners.
//   - line 113 path 0 truthy: bootstrap throws when window is undefined.
//   - line 178 / 186 path 1 falsy: performance is undefined → Date.now()
//     fallback for both start and end markers.
//   - line 249 path 1 falsy: __resetPyodideForTests no-ops cleanly when
//     window is undefined (the typeof guard short-circuits the delete).
//   - line 272 path 1 falsy: recoverPyodide same SSR shape.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface TestWindow {
  loadPyodide?: (...args: unknown[]) => Promise<unknown>;
  pyodide?: unknown;
}

beforeEach(() => {
  vi.resetModules();
  document.querySelectorAll('script[src*="pyodide.js"]').forEach((s) => s.remove());
  delete (window as unknown as TestWindow).loadPyodide;
  delete (window as unknown as TestWindow).pyodide;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.querySelectorAll('script[src*="pyodide.js"]').forEach((s) => s.remove());
  delete (window as unknown as TestWindow).loadPyodide;
  delete (window as unknown as TestWindow).pyodide;
  vi.resetModules();
});

describe('pyodide-singleton — existing tag with no status dataset (line 82 falsy → else-arm)', () => {
  it('attaches load/error listeners when dataset.pyodideStatus is undefined', async () => {
    // Plant a script tag matching the src but WITHOUT the dataset
    // attribute. The line-82 OR-chain checks for explicit 'loaded' /
    // 'error' / 'loading' values; an undefined status is none of those,
    // so the else-arm at lines 86-92 fires and listeners are attached.
    const tag = document.createElement('script');
    tag.src = `/pyodide/pyodide.js`;
    // Intentionally NO dataset.pyodideStatus.
    document.head.appendChild(tag);
    const { __resetPyodideForTests, getPyodide } = await import('@lib/python/pyodide-singleton');
    __resetPyodideForTests();
    // Mock window.loadPyodide so the bootstrap can complete after our
    // tag fires its synthetic 'load' event.
    const fake = { runPython: vi.fn() } as unknown;
    (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fake);
    const promise = getPyodide();
    // Synthetic load event resolves the wait — the line-86 else-arm
    // path is what attaches the listener that fires here.
    tag.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeDefined();
    __resetPyodideForTests();
  });
});

describe('pyodide-singleton — bootstrap SSR (line 113 truthy)', () => {
  it('throws PyodideLoadError when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    // The dynamic import has to happen AFTER the stub so the module's
    // bootstrap function reads the patched globalThis.
    const mod = await import('@lib/python/pyodide-singleton');
    mod.__resetPyodideForTests();
    await expect(mod.getPyodide()).rejects.toThrow(/cannot be loaded outside the browser/i);
  });
});

describe('pyodide-singleton — Date.now fallback when performance undefined (lines 178, 186)', () => {
  it('falls back to Date.now() for cold-start timing when performance is undefined', async () => {
    // Stub performance globally to undefined → both `start` (line 178)
    // and `end` (line 186) measurements take the falsy arm and call
    // Date.now() instead.
    vi.stubGlobal('performance', undefined);
    const fake = { runPython: vi.fn() } as unknown;
    (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fake);
    const mod = await import('@lib/python/pyodide-singleton');
    mod.__resetPyodideForTests();
    const promise = mod.getPyodide();
    // Synthetic load event for the freshly-created tag.
    await Promise.resolve();
    const tag = document.querySelector('script[src*="pyodide.js"]') as HTMLScriptElement | null;
    if (tag && tag.onload) tag.onload(new Event('load'));
    await expect(promise).resolves.toBeDefined();
    // Cold-start was measured via Date.now() so it's a finite number.
    expect(typeof mod.getColdStartMs()).toBe('number');
  });
});

describe('pyodide-singleton — SSR guards for reset/recover (lines 249, 272)', () => {
  it('__resetPyodideForTests does not throw when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/python/pyodide-singleton');
    expect(() => mod.__resetPyodideForTests()).not.toThrow();
  });

  it('recoverPyodide does not throw when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/python/pyodide-singleton');
    expect(() => mod.recoverPyodide()).not.toThrow();
  });
});
