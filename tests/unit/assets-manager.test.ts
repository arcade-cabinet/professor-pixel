import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BackgroundAsset, GameAsset, SoundAsset, SpriteAsset } from '@lib/assets/types';

// AssetManager hydrates from /assets/catalog.json via loadCatalog(), then
// services search/filter/preload/selection APIs. Tests stub fetch and
// vi.resetModules per test so each constructs a fresh manager.

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const fakeSprite = (overrides: Partial<SpriteAsset> = {}): SpriteAsset => ({
  id: 'sprite-1',
  name: 'Sprite One',
  description: 'first sprite',
  type: 'sprite',
  path: '/assets/sprite-1.png',
  tags: ['hero', 'blue'],
  license: 'CC0',
  category: 'characters',
  ...overrides,
});

const fakeSound = (overrides: Partial<SoundAsset> = {}): SoundAsset =>
  ({
    id: 'sound-1',
    name: 'Beep',
    description: 'beep sound',
    type: 'sound',
    path: '/assets/beep.ogg',
    tags: ['sfx'],
    license: 'CC0',
    category: 'jump',
    ...overrides,
  }) as SoundAsset;

const fakeBackground = (overrides: Partial<BackgroundAsset> = {}): BackgroundAsset =>
  ({
    id: 'bg-1',
    name: 'Forest BG',
    description: 'forest scene',
    type: 'background',
    path: '/assets/bg.png',
    tags: ['forest'],
    license: 'CC0',
    category: 'forest',
    ...overrides,
  }) as BackgroundAsset;

function stubCatalogFetch(catalog: {
  sprites?: SpriteAsset[];
  sounds?: SoundAsset[];
  backgrounds?: BackgroundAsset[];
}) {
  // catalog.ts fetches /assets/catalog.json with the raw shape
  // {sprites, sounds, backgrounds, generatedAt}. catalog.ts then maps
  // each CatalogEntry to its typed Asset variant. To skip that mapping
  // we shape the raw entries to match what the mapper produces.
  const raw = {
    sprites: (catalog.sprites ?? []).map((s) => ({
      kind: 'sprite' as const,
      id: s.id,
      name: s.name,
      path: s.path,
      category: s.category,
      tags: s.tags,
    })),
    sounds: (catalog.sounds ?? []).map((s) => ({
      kind: 'sound' as const,
      id: s.id,
      name: s.name,
      path: s.path,
      category: 'sfx',
      tags: s.tags,
    })),
    backgrounds: (catalog.backgrounds ?? []).map((b) => ({
      kind: 'background' as const,
      id: b.id,
      name: b.name,
      path: b.path,
      category: 'scene',
      tags: b.tags,
    })),
    generatedAt: '2026-05-07T00:00:00Z',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => raw,
    })
  );
}

describe('AssetManager — ready() hydration', () => {
  it('populates the registry from /assets/catalog.json', async () => {
    stubCatalogFetch({
      sprites: [fakeSprite()],
      sounds: [fakeSound()],
      backgrounds: [fakeBackground()],
    });
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    expect(m.getAllAssets().length).toBe(3);
    expect(m.getAssetById('sprite-1')?.name).toBe('Sprite One');
  });

  it('ready() is idempotent — second call does not re-fetch', async () => {
    stubCatalogFetch({ sprites: [fakeSprite()] });
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    await m.ready();
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('clears the hydration promise on failure so the next call retries', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', failingFetch);
    const { AssetManager } = await import('@lib/assets/manager');
    // Note: importing the module also triggers an eager hydration on the
    // singleton via the `export const assetManager = getAssetManager()`
    // line. That counts as fetch call #1. We only care about the calls
    // our explicit `m.ready()` invocations make.
    const callsBefore = failingFetch.mock.calls.length;
    const m = new AssetManager();
    await expect(m.ready()).rejects.toThrow(/offline/);
    // Now the fetch comes back — second ready() must re-attempt.
    failingFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sprites: [],
        sounds: [],
        backgrounds: [],
        generatedAt: '2026-05-07',
      }),
    });
    await expect(m.ready()).resolves.toBeUndefined();
    // We made 2 explicit ready() calls and the failure cleared the cache,
    // so this manager's fetch invocations should be exactly 2.
    expect(failingFetch.mock.calls.length - callsBefore).toBe(2);
  });
});

describe('AssetManager — typed accessors', () => {
  async function makeReady(catalog: Parameters<typeof stubCatalogFetch>[0]) {
    stubCatalogFetch(catalog);
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    return m;
  }

  it('getSprites/getSounds/getBackgrounds return only that type', async () => {
    const m = await makeReady({
      sprites: [fakeSprite({ id: 's-a' }), fakeSprite({ id: 's-b' })],
      sounds: [fakeSound({ id: 'snd-a' })],
      backgrounds: [fakeBackground({ id: 'bg-a' })],
    });
    expect(m.getSprites().every((a) => a.type === 'sprite')).toBe(true);
    expect(m.getSprites().length).toBe(2);
    expect(m.getSounds().every((a) => a.type === 'sound')).toBe(true);
    expect(m.getBackgrounds().every((a) => a.type === 'background')).toBe(true);
  });

  it('getMusic returns only music-typed entries (not sfx)', async () => {
    const m = await makeReady({
      sounds: [
        fakeSound({ id: 'sfx-1', type: 'sound' }),
        fakeSound({ id: 'mus-1', type: 'music' }) as unknown as SoundAsset,
      ],
    });
    const music = m.getMusic();
    expect(music.every((a) => (a as GameAsset).type === 'music')).toBe(true);
  });
});

describe('AssetManager — filterAssets', () => {
  async function makeManagerWithMix() {
    stubCatalogFetch({
      sprites: [
        fakeSprite({ id: 'hero-blue', name: 'Hero', tags: ['hero'], category: 'characters' }),
        fakeSprite({ id: 'gem-red', name: 'Gem', tags: ['item'], category: 'items' }),
      ],
      sounds: [fakeSound({ id: 'jump-fx', name: 'Jump', tags: ['fx'] })],
      backgrounds: [fakeBackground({ id: 'forest', name: 'Forest', tags: ['forest', 'green'] })],
    });
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    return m;
  }

  it('filter by type narrows correctly', async () => {
    const m = await makeManagerWithMix();
    expect(m.filterAssets({ type: 'sprite' }).length).toBe(2);
    expect(m.filterAssets({ type: 'sound' }).length).toBe(1);
    expect(m.filterAssets({ type: 'background' }).length).toBe(1);
  });

  it('filter by tag returns assets whose tags include the requested tag', async () => {
    const m = await makeManagerWithMix();
    expect(m.filterAssets({ tags: ['hero'] }).map((a) => a.id)).toEqual(['hero-blue']);
    expect(m.filterAssets({ tags: ['forest'] }).map((a) => a.id)).toEqual(['forest']);
  });

  it('filter by category — only assets with .category support this branch', async () => {
    const m = await makeManagerWithMix();
    const items = m.filterAssets({ category: 'items' });
    expect(items.length).toBe(1);
    expect(items[0]!.id).toBe('gem-red');
  });

  it('filter by search hits name, description, and tags case-insensitively', async () => {
    const m = await makeManagerWithMix();
    expect(m.filterAssets({ search: 'gem' }).map((a) => a.id)).toEqual(['gem-red']);
    expect(m.filterAssets({ search: 'jump' }).map((a) => a.id)).toEqual(['jump-fx']);
    expect(m.filterAssets({ search: 'GREEN' }).map((a) => a.id)).toEqual(['forest']);
  });

  it('filter combining type + search narrows correctly', async () => {
    const m = await makeManagerWithMix();
    const result = m.filterAssets({ type: 'sprite', search: 'hero' });
    expect(result.map((a) => a.id)).toEqual(['hero-blue']);
  });
});

describe('AssetManager — selection APIs', () => {
  async function makeManagerWithMix() {
    stubCatalogFetch({
      sprites: [
        fakeSprite({ id: 'player-1' }),
        fakeSprite({ id: 'enemy-1' }),
        fakeSprite({ id: 'item-1' }),
      ],
      sounds: [
        fakeSound({ id: 'sfx-1' }),
        fakeSound({ id: 'mus-1', type: 'music' }) as unknown as SoundAsset,
      ],
      backgrounds: [fakeBackground({ id: 'bg-1' })],
    });
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    return m;
  }

  it('selectPlayerSprite sets the player', async () => {
    const m = await makeManagerWithMix();
    m.selectPlayerSprite('player-1');
    expect(m.getSelection().player?.id).toBe('player-1');
  });

  it('selectPlayerSprite is a no-op for non-sprite ids', async () => {
    const m = await makeManagerWithMix();
    m.selectPlayerSprite('bg-1'); // wrong type
    expect(m.getSelection().player).toBeUndefined();
  });

  it('addEnemySprite + addItemSprite append, addSound appends', async () => {
    const m = await makeManagerWithMix();
    m.addEnemySprite('enemy-1');
    m.addItemSprite('item-1');
    m.addSound('sfx-1');
    const sel = m.getSelection();
    expect(sel.enemies?.map((e) => e.id)).toEqual(['enemy-1']);
    expect(sel.items?.map((i) => i.id)).toEqual(['item-1']);
    expect(sel.sounds?.map((s) => s.id)).toEqual(['sfx-1']);
  });

  it('selectBackground + selectMusic set their slots', async () => {
    const m = await makeManagerWithMix();
    m.selectBackground('bg-1');
    m.selectMusic('mus-1');
    expect(m.getSelection().background?.id).toBe('bg-1');
    expect(m.getSelection().music?.id).toBe('mus-1');
  });

  // Cover the wrong-type guard arms in selection setters (manager.ts
  // 240, 248, 256, 263, 270): `if (asset && asset.type === 'X')`. Each
  // method is a no-op when an id resolves but the type doesn't match.
  // selectPlayerSprite already has its symmetric test above; the rest
  // were missing.
  it('addEnemySprite is a no-op for non-sprite ids (wrong-type guard)', async () => {
    const m = await makeManagerWithMix();
    m.addEnemySprite('bg-1'); // background, not sprite
    expect(m.getSelection().enemies).toEqual([]);
  });

  it('addItemSprite is a no-op for non-sprite ids (wrong-type guard)', async () => {
    const m = await makeManagerWithMix();
    m.addItemSprite('sfx-1'); // sound, not sprite
    expect(m.getSelection().items).toEqual([]);
  });

  it('selectBackground is a no-op for non-background ids (wrong-type guard)', async () => {
    const m = await makeManagerWithMix();
    m.selectBackground('player-1'); // sprite, not background
    expect(m.getSelection().background).toBeUndefined();
  });

  it('selectMusic is a no-op for non-sound/non-music ids (wrong-type guard)', async () => {
    const m = await makeManagerWithMix();
    m.selectMusic('bg-1'); // background, not sound/music
    expect(m.getSelection().music).toBeUndefined();
  });

  it('addSound is a no-op for non-sound/non-music ids (wrong-type guard)', async () => {
    const m = await makeManagerWithMix();
    m.addSound('player-1'); // sprite, not sound/music
    expect(m.getSelection().sounds).toEqual([]);
  });

  it('clearSelection wipes everything', async () => {
    const m = await makeManagerWithMix();
    m.selectPlayerSprite('player-1');
    m.selectBackground('bg-1');
    m.clearSelection();
    const sel = m.getSelection();
    expect(sel.player).toBeUndefined();
    expect(sel.enemies).toEqual([]);
    expect(sel.items).toEqual([]);
    expect(sel.background).toBeUndefined();
  });
});

describe('AssetManager — getSuggestedAssets', () => {
  async function makeManagerWithSuggested() {
    stubCatalogFetch({
      sprites: [
        fakeSprite({ id: 'robot-blue' }),
        fakeSprite({ id: 'robot-grey' }),
        fakeSprite({ id: 'robot-red' }),
        fakeSprite({ id: 'ghost-floating' }),
        fakeSprite({ id: 'spikey-hazard' }),
        fakeSprite({ id: 'gem-blue' }),
        fakeSprite({ id: 'key-green' }),
        fakeSprite({ id: 'alien-flying' }),
        fakeSprite({ id: 'crystal-blue' }),
        fakeSprite({ id: 'walker-enemy' }),
        fakeSprite({ id: 'key-red' }),
        fakeSprite({ id: 'gem-red' }),
      ],
      backgrounds: [
        fakeBackground({ id: 'bg-forest' }),
        fakeBackground({ id: 'bg-space-stars' }),
        fakeBackground({ id: 'bg-dungeon-stone' }),
        fakeBackground({ id: 'bg-solid-sky' }),
      ],
      sounds: [
        fakeSound({ id: 'music-adventure', type: 'music' }) as unknown as SoundAsset,
        fakeSound({ id: 'music-boss', type: 'music' }) as unknown as SoundAsset,
      ],
    });
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    return m;
  }

  it('platformer maps to robot-blue + bg-forest + music-adventure', async () => {
    const m = await makeManagerWithSuggested();
    const sug = m.getSuggestedAssets('platformer');
    expect(sug.player?.id).toBe('robot-blue');
    expect(sug.background?.id).toBe('bg-forest');
    expect(sug.music?.id).toBe('music-adventure');
  });

  it('space + dungeon use distinct character/bg/music sets', async () => {
    const m = await makeManagerWithSuggested();
    expect(m.getSuggestedAssets('space').player?.id).toBe('robot-grey');
    expect(m.getSuggestedAssets('dungeon').player?.id).toBe('robot-red');
    expect(m.getSuggestedAssets('space').background?.id).toBe('bg-space-stars');
    expect(m.getSuggestedAssets('dungeon').background?.id).toBe('bg-dungeon-stone');
  });

  it('unknown gameType falls through to default (robot-blue + bg-solid-sky)', async () => {
    const m = await makeManagerWithSuggested();
    const sug = m.getSuggestedAssets('totally-unknown-genre');
    expect(sug.player?.id).toBe('robot-blue');
    expect(sug.background?.id).toBe('bg-solid-sky');
  });
});

describe('getAssetManager — singleton', () => {
  it('returns the same instance across calls', async () => {
    stubCatalogFetch({});
    const { getAssetManager } = await import('@lib/assets/manager');
    const a = getAssetManager();
    const b = getAssetManager();
    expect(a).toBe(b);
  });
});
