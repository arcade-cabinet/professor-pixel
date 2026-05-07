// Cover src/assets/catalog.ts (~106 LOC, 77.77% → ~95%+).
//   - loadCatalog memoizes the fetch promise
//   - sprite/sound/background mappers (toSprite, toSound, toBackground)
//     transform CatalogEntry → typed asset shape
//   - loadSprites / loadSounds / loadBackgrounds are the convenience wrappers
//   - 'music' category branch in toSound (line 54)
//   - cache eviction on fetch error (lines 88-90)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_RAW = {
  sprites: [
    {
      kind: 'sprite' as const,
      id: 's1',
      name: 'hero-sprite_a',
      path: '/assets/sprites/hero.png',
      category: 'character',
      tags: ['hero'],
    },
  ],
  sounds: [
    {
      kind: 'sound' as const,
      id: 'sfx1',
      name: 'jump',
      path: '/assets/sounds/jump.wav',
      category: 'sfx',
      tags: ['sfx'],
    },
    {
      kind: 'sound' as const,
      id: 'mus1',
      name: 'theme',
      path: '/assets/music/theme.ogg',
      category: 'music',
      tags: ['music'],
    },
  ],
  backgrounds: [
    {
      kind: 'background' as const,
      id: 'bg1',
      name: 'sky',
      path: '/assets/bg/sky.png',
      category: 'sky',
      tags: ['outdoor'],
    },
  ],
  generatedAt: '2026-05-07T00:00:00Z',
};

beforeEach(() => {
  // Force a fresh module per test so the `cached` module-level promise
  // resets — otherwise the first test's cache leaks into the second.
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadCatalog', () => {
  it('fetches the catalog JSON and maps it to typed assets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => FAKE_RAW,
      }))
    );
    const { loadCatalog } = await import('@lib/assets/catalog');
    const catalog = await loadCatalog();
    expect(catalog.sprites).toHaveLength(1);
    expect(catalog.sprites[0].type).toBe('sprite');
    expect(catalog.sprites[0].license).toBe('CC0');
    // The 'music' category in raw should map to type='music', everything
    // else to 'sound'.
    expect(catalog.sounds.find((s) => s.id === 'sfx1')?.type).toBe('sound');
    expect(catalog.sounds.find((s) => s.id === 'mus1')?.type).toBe('music');
    expect(catalog.backgrounds).toHaveLength(1);
  });

  it('memoizes the catalog promise (second call does not re-fetch)', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => FAKE_RAW,
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const { loadCatalog } = await import('@lib/assets/catalog');
    await loadCatalog();
    await loadCatalog();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the cache when the fetch errors so a retry can succeed', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({}),
          };
        }
        return {
          ok: true,
          json: async () => FAKE_RAW,
        };
      })
    );
    const { loadCatalog } = await import('@lib/assets/catalog');
    await expect(loadCatalog()).rejects.toThrow(/500/);
    // Second call should retry rather than reuse the rejected promise.
    const catalog = await loadCatalog();
    expect(catalog.sprites).toHaveLength(1);
    expect(callCount).toBe(2);
  });
});

describe('loadSprites / loadSounds / loadBackgrounds', () => {
  it('return their respective slices of the catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => FAKE_RAW,
      }))
    );
    const { loadSprites, loadSounds, loadBackgrounds } = await import(
      '@lib/assets/catalog'
    );
    const sprites = await loadSprites();
    const sounds = await loadSounds();
    const backgrounds = await loadBackgrounds();
    expect(sprites).toHaveLength(1);
    expect(sounds).toHaveLength(2);
    expect(backgrounds).toHaveLength(1);
  });
});
