import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cover the four landing-chooser helpers added in the audit fix pass:
//   loadLastLandingPath, saveLastLandingPath, hasSeenIntro, markIntroSeen
// Each has an SSR-window guard (path 0 truthy = window undefined → safe
// default) and a try/catch for storage errors. The home suite mocks the
// whole module, so the real branches sit cold without these tests.

describe('persistence — landing helpers happy path (jsdom has window)', () => {
  beforeEach(async () => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('loadLastLandingPath returns null on a fresh storage', async () => {
    const { loadLastLandingPath } = await import('@lib/storage/persistence');
    expect(loadLastLandingPath()).toBeNull();
  });

  it('saveLastLandingPath then loadLastLandingPath round-trips', async () => {
    const { loadLastLandingPath, saveLastLandingPath } = await import('@lib/storage/persistence');
    saveLastLandingPath('wizard');
    expect(loadLastLandingPath()).toBe('wizard');
    saveLastLandingPath('lessons');
    expect(loadLastLandingPath()).toBe('lessons');
  });

  it('loadLastLandingPath rejects unknown values written into the slot', async () => {
    const { loadLastLandingPath } = await import('@lib/storage/persistence');
    localStorage.setItem('pp.lastLandingPath', 'bogus');
    expect(loadLastLandingPath()).toBeNull();
  });

  it('hasSeenIntro / markIntroSeen flip on flag', async () => {
    const { hasSeenIntro, markIntroSeen } = await import('@lib/storage/persistence');
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });
});

describe('persistence — landing helpers SSR window guard (line 452/462/471/480 path 0 truthy)', () => {
  // Each helper short-circuits with `if (typeof window === 'undefined') return …`.
  // Stubbing `window` to undefined plus vi.resetModules makes the module
  // re-evaluate without window in scope — we then call each helper and
  // pin its safe-default return.

  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('loadLastLandingPath returns null when typeof window === undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { loadLastLandingPath } = await import('@lib/storage/persistence');
    expect(loadLastLandingPath()).toBeNull();
  });

  it('saveLastLandingPath no-ops when typeof window === undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { saveLastLandingPath } = await import('@lib/storage/persistence');
    expect(() => saveLastLandingPath('wizard')).not.toThrow();
  });

  it('hasSeenIntro returns false when typeof window === undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { hasSeenIntro } = await import('@lib/storage/persistence');
    expect(hasSeenIntro()).toBe(false);
  });

  it('markIntroSeen no-ops when typeof window === undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { markIntroSeen } = await import('@lib/storage/persistence');
    expect(() => markIntroSeen()).not.toThrow();
  });
});

describe('persistence — landing helpers try/catch arms (storage throws)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('loadLastLandingPath returns null when localStorage.getItem throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });
    const { loadLastLandingPath } = await import('@lib/storage/persistence');
    expect(loadLastLandingPath()).toBeNull();
  });

  it('saveLastLandingPath swallows when localStorage.setItem throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    const { saveLastLandingPath } = await import('@lib/storage/persistence');
    expect(() => saveLastLandingPath('wizard')).not.toThrow();
  });

  it('hasSeenIntro returns false when localStorage.getItem throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    const { hasSeenIntro } = await import('@lib/storage/persistence');
    expect(hasSeenIntro()).toBe(false);
  });

  it('markIntroSeen swallows when localStorage.setItem throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const { markIntroSeen } = await import('@lib/storage/persistence');
    expect(() => markIntroSeen()).not.toThrow();
  });
});
