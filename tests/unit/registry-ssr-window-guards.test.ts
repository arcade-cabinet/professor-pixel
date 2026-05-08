import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Both pygame registries (components + templates) install a `window.test*`
// debug helper inside an `if (typeof window !== 'undefined')` block. The
// truthy arm is hot in jsdom — every other test imports through it. The
// falsy SSR arm sat cold: no test runs the modules with window absent.
//
// We use vi.resetModules + vi.stubGlobal('window', undefined) + dynamic
// import so each module re-evaluates with the SSR guard in its falsy
// state, exercising the BRDA path-1 falsy arm at:
//   src/pygame/components/registry.ts:64
//   src/pygame/templates/registry.ts:45
//
// Verifying behaviour: the import must succeed (no ReferenceError on
// `window`), and the modules' public exports stay intact — i.e. the
// guard's only effect is to skip helper-installation on SSR.

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('pygame/components/registry — SSR window guard (line 64 path 1 falsy)', () => {
  it('imports cleanly when typeof window === "undefined" and exports stay intact', async () => {
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/pygame/components/registry');
    // Module-level side-effect (helper install) skipped — but registry data
    // is still populated; importers (compiler, editor, exporter) keep working.
    expect(Array.isArray(mod.pygameComponents)).toBe(true);
    expect(mod.pygameComponents.length).toBeGreaterThan(0);
    expect(mod.getAllComponents()).toBe(mod.pygameComponents);
  });
});

describe('pygame/templates/registry — SSR window guard (line 45 path 1 falsy)', () => {
  it('imports cleanly when typeof window === "undefined" and exports stay intact', async () => {
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/pygame/templates/registry');
    expect(Array.isArray(mod.gameTemplates)).toBe(true);
    expect(mod.gameTemplates.length).toBeGreaterThan(0);
    expect(mod.getAllTemplates()).toBe(mod.gameTemplates);
  });
});
