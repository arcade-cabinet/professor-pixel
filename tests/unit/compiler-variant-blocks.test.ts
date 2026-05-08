// Cover the per-variant gameplay-block branches in
// src/pygame/runtime/compiler.ts (lines 187, 200, 215). The existing
// compiler.test.ts documents these as effectively dead code under the
// real registry — `jump` and `shooting` are gameplay-systems IDs, not
// render-component IDs, so `pygameComponents.find(...)` returns
// undefined and the per-variant emit is skipped. Mock the registry
// here to surface the branches deterministically; this pins the
// generator output so a future registry-fix doesn't silently regress
// the emitted code.

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/pygame/components/registry', () => ({
  pygameComponents: [
    { id: 'jump', name: 'Jump', type: 'system' },
    { id: 'shooting', name: 'Shooting', type: 'system' },
  ],
}));

import { compilePythonGame } from '@lib/pygame/runtime/compiler';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('compilePythonGame — variant gameplay blocks (lines 187, 200, 215)', () => {
  it('jump variant A emits the Floaty Jump block', () => {
    const out = compilePythonGame({ jump: 'A' }, []);
    expect(out).toContain('Floaty Jump');
    expect(out).toContain('self.player_vy = -15');
    expect(out).toContain('GRAVITY * 0.7');
  });

  it('jump variant B emits the Realistic Jump block', () => {
    const out = compilePythonGame({ jump: 'B' }, []);
    expect(out).toContain('Realistic Jump');
    expect(out).toContain('self.player_vy = -12');
    expect(out).not.toContain('GRAVITY * 0.7');
  });

  it('shooting emits the Shooting mechanics block (any variant)', () => {
    const out = compilePythonGame({ shooting: 'A' }, []);
    expect(out).toContain('Shooting mechanics');
    expect(out).toContain('keys[pygame.K_x]');
  });
});
