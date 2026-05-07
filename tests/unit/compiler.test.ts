import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compilePythonGame, downloadPythonFile } from '@lib/pygame/runtime/compiler';
import type { BackgroundAsset, SoundAsset, SpriteAsset } from '@lib/assets/types';

// compiler.ts assembles a runnable Python source string from a wizard
// component selection + asset list. The generators have several
// branches (per asset.type, per variant A/B for jump+score, presence
// of background+music). Tests pin the canonical structural markers
// and the per-branch behaviors so regressions surface as string-match
// failures rather than runtime explosions in the user's lesson.

const sprite = (overrides: Partial<SpriteAsset> = {}): SpriteAsset =>
  ({
    id: 'hero',
    name: 'Hero',
    description: 'h',
    type: 'sprite',
    path: '/assets/hero.png',
    tags: [],
    license: 'CC0',
    category: 'characters',
    ...overrides,
  }) as SpriteAsset;

const background = (overrides: Partial<BackgroundAsset> = {}): BackgroundAsset =>
  ({
    id: 'forest',
    name: 'Forest',
    description: 'f',
    type: 'background',
    path: '/assets/forest.png',
    tags: [],
    license: 'CC0',
    category: 'forest',
    ...overrides,
  }) as BackgroundAsset;

const sound = (overrides: Partial<SoundAsset> = {}): SoundAsset =>
  ({
    id: 'jump-sfx',
    name: 'Jump',
    description: 'j',
    type: 'sound',
    path: '/assets/jump.ogg',
    tags: [],
    license: 'CC0',
    category: 'jump',
    ...overrides,
  }) as SoundAsset;

const music = (overrides: Partial<SoundAsset> = {}): SoundAsset =>
  ({
    id: 'theme',
    name: 'Theme',
    description: 't',
    type: 'music',
    path: '/assets/theme.ogg',
    tags: [],
    license: 'CC0',
    category: 'music',
    ...overrides,
  }) as SoundAsset;

describe('compilePythonGame — structural skeleton', () => {
  it('always emits import + Game class + main entry', () => {
    const out = compilePythonGame({}, []);
    expect(out).toContain('import pygame');
    expect(out).toContain('pygame.init()');
    expect(out).toContain('SCREEN_WIDTH = 800');
    expect(out).toContain('class Game:');
    expect(out).toContain('def __init__(self):');
    expect(out).toContain('def run(self):');
    expect(out).toContain('def show_title_screen(self):');
    expect(out).toContain('def run_gameplay(self, dt):');
    expect(out).toContain('def show_ending_screen(self):');
    expect(out).toContain('if __name__ == "__main__":');
  });
});

describe('compilePythonGame — asset loader branches', () => {
  it('emits a sprite loader for sprite assets', () => {
    const out = compilePythonGame({}, [sprite({ id: 's1', path: '/p/s1.png' })]);
    expect(out).toContain("self.assets['s1'] = pygame.image.load('/p/s1.png')");
    // Placeholder path triggers magenta surface — pin the fallback.
    expect(out).toContain('surf.fill((255, 0, 255))');
  });

  it('emits a background loader with screen-fit scaling', () => {
    const out = compilePythonGame({}, [background({ id: 'bg1' })]);
    expect(out).toContain("self.assets['bg1'] = pygame.image.load");
    expect(out).toContain('pygame.transform.scale');
    expect(out).toContain('(SCREEN_WIDTH, SCREEN_HEIGHT)');
  });

  it('emits a Sound loader for sound assets', () => {
    const out = compilePythonGame({}, [sound({ id: 'sfx1' })]);
    expect(out).toContain("self.assets['sfx1'] = pygame.mixer.Sound");
  });

  it('emits a music_path entry for music assets (loaded at play time, not construction)', () => {
    const out = compilePythonGame({}, [music({ id: 'theme' })]);
    expect(out).toContain("self.assets['theme_music_path']");
    // Music is NOT loaded as a Sound — it's loaded later via mixer.music.load.
    expect(out).not.toContain("pygame.mixer.Sound('/assets/theme.ogg')");
  });

  it('falls back to asset.id when path is missing', () => {
    const out = compilePythonGame({}, [
      sprite({ id: 'no-path', path: undefined as unknown as string }),
    ]);
    expect(out).toContain("pygame.image.load('no-path')");
  });

  it('handles multiple assets of mixed types in one compilation', () => {
    const out = compilePythonGame({}, [
      sprite({ id: 's1' }),
      background({ id: 'b1' }),
      sound({ id: 'snd1' }),
      music({ id: 'mus1' }),
    ]);
    expect(out).toContain("self.assets['s1']");
    expect(out).toContain("self.assets['b1']");
    expect(out).toContain("self.assets['snd1']");
    expect(out).toContain("self.assets['mus1_music_path']");
  });
});

describe('compilePythonGame — title screen branches', () => {
  it('uses the background asset when present', () => {
    const out = compilePythonGame({}, [background({ id: 'forest-bg' })]);
    expect(out).toContain("if 'forest-bg' in self.assets:");
    expect(out).toContain("self.screen.blit(self.assets['forest-bg'], (0, 0))");
  });

  it('falls back to a solid fill when no background is provided', () => {
    const out = compilePythonGame({}, []);
    expect(out).toContain('self.screen.fill((50, 50, 150))');
    // No background-keyed blit when no bg asset present.
    expect(out).not.toMatch(
      /if '[^']+' in self\.assets:\s+self\.screen\.blit\(self\.assets\['[^']+'\], \(0, 0\)\)/
    );
  });

  it('plays music on game start when a music asset is provided', () => {
    const out = compilePythonGame({}, [music({ id: 'theme' })]);
    expect(out).toContain('pygame.mixer.music.load');
    expect(out).toContain('pygame.mixer.music.play(-1)');
  });

  it('does not emit music load code when no music asset is provided', () => {
    const out = compilePythonGame({}, []);
    expect(out).not.toContain('pygame.mixer.music.load');
  });
});

describe('compilePythonGame — gameplay block', () => {
  // Note: the gameplay generator's per-variant blocks (Floaty Jump,
  // Realistic Jump, shooting) are guarded by a lookup against the
  // RENDER component registry (pygameComponents — sprite/ball/paddle/…),
  // not the gameplay-system registry (systems-index — jump/walk/shooting/…).
  // So `compilePythonGame({ jump: 'A' }, [])` finds no `jump` in the
  // render registry and silently skips the variant block. This is a
  // latent compiler bug — when it's fixed, the variant tests should be
  // re-enabled. Pin the current behavior so the fix is a deliberate
  // change.
  it('always emits the basic movement controls (left/right) regardless of selection', () => {
    const out = compilePythonGame({}, []);
    expect(out).toContain('keys[pygame.K_LEFT]');
    expect(out).toContain('keys[pygame.K_RIGHT]');
  });

  it('always emits the player rectangle draw + win condition', () => {
    const out = compilePythonGame({}, []);
    expect(out).toContain('pygame.draw.rect');
    expect(out).toContain('self.score += 1');
    expect(out).toContain('self.state = "ending"');
  });

  it('silently skips component IDs that are not in the render registry (defensive)', () => {
    // A typo'd componentId must NOT crash compilation.
    const out = compilePythonGame({ 'totally-fake': 'A' }, []);
    expect(typeof out).toBe('string');
    expect(out).toContain('class Game:');
  });
});

describe('compilePythonGame — ending screen score variants', () => {
  it('default (no score selection) → animated counter', () => {
    const out = compilePythonGame({}, []);
    expect(out).toContain('Animated score counter');
    expect(out).toContain('self.display_score');
  });

  it('score=A → animated counter', () => {
    const out = compilePythonGame({ score: 'A' }, []);
    expect(out).toContain('Animated score counter');
  });

  it('score=B → instant score display (no animated counter)', () => {
    const out = compilePythonGame({ score: 'B' }, []);
    expect(out).toContain('Instant score display');
    expect(out).not.toContain('Animated score counter');
  });
});

describe('downloadPythonFile', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates an object URL and triggers an anchor click with the download attribute', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    // Spy on createElement so we can intercept the anchor.click().
    const clickSpy = vi.fn();
    const realCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLAnchorElement;
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    downloadPythonFile('print("hi")', 'game.py');

    // Blob → object URL → anchor → click → revoke.
    expect(createObjectURL).toHaveBeenCalledOnce();
    const blobArg = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('text/x-python');

    expect(createSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('appends the anchor to body and removes it after click (no DOM leak)', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const beforeChildren = document.body.children.length;
    downloadPythonFile('code', 'out.py');
    // Anchor is removed before the function returns — no leak.
    expect(document.body.children.length).toBe(beforeChildren);
  });
});
