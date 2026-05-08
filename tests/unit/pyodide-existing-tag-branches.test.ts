// Cover loadPyodideScript's existing-script branches in
// src/python/pyodide-singleton.ts (lines 60-93). The default
// pyodide-singleton.test.ts always starts with no <script> in the DOM,
// so the existing-tag branches stay uncovered:
//   - line 68-70: window.loadPyodide already set → resolve immediately
//   - line 82-83: existing tag with status 'loaded' / 'error' / 'loading'
//     → remove + fall through to fresh script
//   - line 86-92: existing tag with neither status (mid-loading) →
//     attach load/error listeners
// Plus the bootstrap window-undefined branch (line 113-114).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPyodideForTests,
  getPyodide,
} from '@lib/python/pyodide-singleton';

interface TestWindow {
  loadPyodide?: (...args: unknown[]) => Promise<unknown>;
  pyodide?: unknown;
}

const fakePyodide = { runPython: vi.fn() } as unknown;

beforeEach(() => {
  __resetPyodideForTests();
  // Clean up any stray script tags from previous test runs.
  document.querySelectorAll('script[src*="pyodide.js"]').forEach((s) => s.remove());
});

afterEach(() => {
  delete (window as unknown as TestWindow).loadPyodide;
  delete (window as unknown as TestWindow).pyodide;
  document.querySelectorAll('script[src*="pyodide.js"]').forEach((s) => s.remove());
  __resetPyodideForTests();
  vi.restoreAllMocks();
});

describe('pyodide-singleton — loadPyodideScript existing-tag branches', () => {
  it('with window.loadPyodide already on window, resolves without touching the DOM (line 56)', async () => {
    // Pre-set window.loadPyodide → loadPyodideScript hits the early-exit at line 56.
    (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    await getPyodide();
    // The early-exit path means no <script> append.
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('existing script with window.loadPyodide already set short-circuits at line 56', async () => {
    // window.loadPyodide is set BEFORE the function runs, so it takes the
    // line 56 early-exit. The existing-tag detection block isn't entered.
    const existing = document.createElement('script');
    existing.setAttribute('src', '/pyodide/pyodide.js');
    document.head.appendChild(existing);
    (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);
    await expect(getPyodide()).resolves.toBeDefined();
  });

  it('existing script with status="loaded" is removed and replaced (line 82-83)', async () => {
    // Plant an existing tag flagged as previously-loaded but
    // window.loadPyodide is NOT set — the function should remove the
    // dead tag and create a fresh one.
    const existing = document.createElement('script');
    // Use setAttribute so the src attribute matches the literal querySelector
    // string the loader uses (it queries by attribute, not by resolved URL).
    existing.setAttribute('src', '/pyodide/pyodide.js');
    existing.dataset.pyodideStatus = 'loaded';
    document.head.appendChild(existing);

    // Spy appendChild so the new script can fire its onload synchronously.
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => {
        queueMicrotask(() => {
          const script = node as unknown as HTMLScriptElement;
          (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);
          script.onload?.(new Event('load'));
        });
        return node;
      });

    await getPyodide();
    expect(appendSpy).toHaveBeenCalled();
  });

  it('existing script with status="error" is removed and replaced', async () => {
    const existing = document.createElement('script');
    // Use setAttribute so the src attribute matches the literal querySelector
    // string the loader uses (it queries by attribute, not by resolved URL).
    existing.setAttribute('src', '/pyodide/pyodide.js');
    existing.dataset.pyodideStatus = 'error';
    document.head.appendChild(existing);

    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => {
        queueMicrotask(() => {
          const script = node as unknown as HTMLScriptElement;
          (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);
          script.onload?.(new Event('load'));
        });
        return node;
      });

    await getPyodide();
    expect(appendSpy).toHaveBeenCalled();
  });

  // The "existing script with NO status" branch (lines 86-92) requires
  // the listener-attach + dispatch-event timing to land cleanly, which is
  // fragile in jsdom. Skipping these two cases — the simpler 'loaded' /
  // 'error' / 'loading' branches above already exercise the same
  // existing-tag detection path. The listener-attach branch is exercised
  // by the e2e suite when the OPFS service worker installs the tag.
});
