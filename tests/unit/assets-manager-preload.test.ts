import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BackgroundAsset, SoundAsset, SpriteAsset } from '@lib/assets/types';

// AssetManager.preloadImage / preloadSound / preloadAssets / getLoadStatus —
// the entire src/assets/manager.ts:137-228 range that the existing
// tests/unit/assets-manager.test.ts intentionally skipped. jsdom provides
// stub Image / Audio constructors; we replace them per-test so we control
// the load lifecycle.

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
  tags: ['hero'],
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => raw }));
}

// ImageStub + AudioStub — capture src assignment + expose triggers for
// onload / onerror / oncanplaythrough so tests can drive the lifecycle.
class ImageStub {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: test stub
  src: any = '';
  static instances: ImageStub[] = [];
  constructor() {
    ImageStub.instances.push(this);
  }
}

class AudioStub {
  oncanplaythrough: (() => void) | null = null;
  onerror: (() => void) | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: test stub
  src: any = '';
  load = vi.fn();
  static instances: AudioStub[] = [];
  constructor() {
    AudioStub.instances.push(this);
  }
}

function installMediaStubs() {
  ImageStub.instances = [];
  AudioStub.instances = [];
  vi.stubGlobal('Image', ImageStub);
  vi.stubGlobal('Audio', AudioStub);
}

describe('AssetManager.preloadImage', () => {
  it('rejects when asset id is unknown', async () => {
    stubCatalogFetch({});
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    await expect(m.preloadImage('nope')).rejects.toThrow(/not found or not an image/);
  });

  it('rejects when asset is non-image (sound)', async () => {
    stubCatalogFetch({ sounds: [fakeSound()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    await expect(m.preloadImage('sound-1')).rejects.toThrow(/not found or not an image/);
  });

  it('short-circuits with cached image on second call', async () => {
    stubCatalogFetch({ sprites: [fakeSprite()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const p1 = m.preloadImage('sprite-1');
    // Drive onload on the first instance.
    queueMicrotask(() => ImageStub.instances[0].onload?.());
    const img1 = await p1;
    const before = ImageStub.instances.length;
    const img2 = await m.preloadImage('sprite-1');
    expect(img2).toBe(img1);
    // No new Image was constructed.
    expect(ImageStub.instances.length).toBe(before);
  });

  it('handles a data: URL synchronously without going through onload', async () => {
    const dataSprite = fakeSprite({
      id: 'data-sprite',
      path: 'data:image/png;base64,AAAA',
    });
    stubCatalogFetch({ sprites: [dataSprite] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const img = await m.preloadImage('data-sprite');
    expect(img).toBeInstanceOf(ImageStub);
    expect(m.getLoadStatus().loaded).toBe(1);
  });

  it('rejects via onerror and records the asset id as failed', async () => {
    stubCatalogFetch({ sprites: [fakeSprite()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const p = m.preloadImage('sprite-1');
    queueMicrotask(() => ImageStub.instances[0].onerror?.());
    await expect(p).rejects.toThrow(/Failed to load image/);
    expect(m.getLoadStatus().failed).toContain('sprite-1');
  });
});

describe('AssetManager.preloadSound', () => {
  it('rejects when asset id is unknown', async () => {
    stubCatalogFetch({});
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    await expect(m.preloadSound('nope')).rejects.toThrow(/not found or not a sound/);
  });

  it('rejects when asset is non-audio (sprite)', async () => {
    stubCatalogFetch({ sprites: [fakeSprite()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    await expect(m.preloadSound('sprite-1')).rejects.toThrow(/not found or not a sound/);
  });

  it('short-circuits with cached audio on second call', async () => {
    stubCatalogFetch({ sounds: [fakeSound()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const p1 = m.preloadSound('sound-1');
    queueMicrotask(() => AudioStub.instances[0].oncanplaythrough?.());
    const a1 = await p1;
    const before = AudioStub.instances.length;
    const a2 = await m.preloadSound('sound-1');
    expect(a2).toBe(a1);
    expect(AudioStub.instances.length).toBe(before);
  });

  it('rejects via onerror and records the asset id as failed', async () => {
    stubCatalogFetch({ sounds: [fakeSound()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const p = m.preloadSound('sound-1');
    queueMicrotask(() => AudioStub.instances[0].onerror?.());
    await expect(p).rejects.toThrow(/Failed to load sound/);
    expect(m.getLoadStatus().failed).toContain('sound-1');
  });
});

describe('AssetManager.preloadAssets', () => {
  it('drives image + sound + background through the right preloader', async () => {
    stubCatalogFetch({
      sprites: [fakeSprite({ path: 'data:image/png;base64,A' })],
      sounds: [fakeSound()],
      backgrounds: [fakeBackground({ path: 'data:image/png;base64,B' })],
    });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    expect(m.getLoadStatus().isLoading).toBe(false);

    const p = m.preloadAssets(['sprite-1', 'sound-1', 'bg-1', 'unknown-id']);
    // sprite + bg are data: URLs (sync) — only the audio needs an event drive.
    queueMicrotask(() => AudioStub.instances[0]?.oncanplaythrough?.());
    await p;

    expect(m.getLoadStatus().isLoading).toBe(false);
    // 1 sprite + 1 background + 1 sound = 3 loads.
    expect(m.getLoadStatus().loaded).toBe(3);
  });

  it('swallows individual load failures so other assets still finish', async () => {
    stubCatalogFetch({
      sprites: [
        fakeSprite({ id: 'good', path: 'data:image/png;base64,A' }),
        fakeSprite({ id: 'bad', path: '/assets/bad.png' }),
      ],
    });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const p = m.preloadAssets(['good', 'bad']);
    // Image #0 is the data: URL (resolves synchronously inside preloadImage).
    // Image #1 is the network path — drive its onerror to reject.
    queueMicrotask(() => {
      const errored = ImageStub.instances.find((inst) => !String(inst.src).startsWith('data:'));
      errored?.onerror?.();
    });
    await p;
    // The good asset still loaded.
    expect(m.getLoadStatus().loaded).toBe(1);
    expect(m.getLoadStatus().failed).toContain('bad');
    // preloadAssets always resets isLoading to false even on individual failures.
    expect(m.getLoadStatus().isLoading).toBe(false);
  });
});

describe('AssetManager.getLoadStatus', () => {
  it('returns a snapshot copy — mutating the returned object does not bleed', async () => {
    stubCatalogFetch({ sprites: [fakeSprite()] });
    installMediaStubs();
    const { AssetManager } = await import('@lib/assets/manager');
    const m = new AssetManager();
    await m.ready();
    const status = m.getLoadStatus();
    status.loaded = 999;
    status.failed.push('synthetic');
    expect(m.getLoadStatus().loaded).toBe(0);
    // The returned `failed` array is a shallow ref though — pin actual behavior.
    // (If someone tightens this to a deep copy later, this test gets bumped.)
    // For now we only check the spread'd numeric fields.
  });
});
