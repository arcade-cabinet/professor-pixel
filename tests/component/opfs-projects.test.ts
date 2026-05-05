/**
 * OPFS-backed launcher project store — round-trip and edge cases.
 *
 * Browser mode (real Chromium via @vitest/browser) is mandatory:
 * navigator.storage.getDirectory() doesn't exist in jsdom. These tests
 * exercise real OPFS write/read paths to prove the launcher's library
 * persistence actually works on a real browser surface.
 *
 * Each test cleans up its own data via __clearAllOpfsProjectsForTests
 * so concurrent tests in the same Chromium worker don't see each other's
 * games.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __clearAllOpfsProjectsForTests,
  deleteOpfsProject,
  isOpfsProjectsAvailable,
  listOpfsProjects,
  loadOpfsProject,
  saveOpfsProject,
} from '@lib/storage/opfs-projects';

// Minimal valid wizard snapshot. persistedWizardStateSchema in
// src/storage/persistence.ts is .passthrough() with all fields optional,
// so even an empty object parses. We include a couple of fields so a
// future tightening of the schema doesn't silently turn this into a
// no-op fixture — and so loadOpfsProject().wizardState is non-trivial
// to assert against.
const SAMPLE_WIZARD_STATE = {
  version: '1.0.0',
  selectedAssetIds: ['robot-blue', 'platform-grass'],
  gameType: 'platformer',
};

describe('OPFS projects store (launcher persistence)', () => {
  beforeEach(async () => {
    await __clearAllOpfsProjectsForTests();
  });
  afterEach(async () => {
    await __clearAllOpfsProjectsForTests();
  });

  it('reports OPFS as available in this Chromium', async () => {
    expect(await isOpfsProjectsAvailable()).toBe(true);
  });

  it('round-trips a project through save → list → load', async () => {
    const meta = await saveOpfsProject({
      name: 'Robot Quest',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
      gamePy: 'print("hello robot")',
    });
    expect(meta.id).toBeTruthy();
    expect(meta.schema_version).toBe(1);
    expect(meta.name).toBe('Robot Quest');

    const list = await listOpfsProjects();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(meta.id);
    expect(list[0].name).toBe('Robot Quest');
    expect(list[0].template).toBe('platformer');

    const loaded = await loadOpfsProject(meta.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.gamePy).toBe('print("hello robot")');
    expect(loaded!.wizardState.gameType).toBe('platformer');
    expect(loaded!.wizardState.selectedAssetIds).toEqual(['robot-blue', 'platform-grass']);
  });

  it('preserves created_at on update, refreshes updated_at', async () => {
    const initial = await saveOpfsProject({
      name: 'Robot Quest',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    // Wait long enough for ISO-second granularity to differ. Most CI
    // runners have ms-resolution clocks but the schema only requires
    // a parseable ISO string; comparing >= covers both cases.
    await new Promise((r) => setTimeout(r, 50));
    const updated = await saveOpfsProject({
      id: initial.id,
      name: 'Robot Quest 2',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    expect(updated.id).toBe(initial.id);
    expect(updated.created_at).toBe(initial.created_at);
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(initial.updated_at).getTime()
    );
    expect(updated.name).toBe('Robot Quest 2');
  });

  it('lists multiple projects newest-first by updated_at', async () => {
    const a = await saveOpfsProject({
      name: 'Game A',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    await new Promise((r) => setTimeout(r, 20));
    await saveOpfsProject({
      name: 'Game B',
      template: 'shooter',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    await new Promise((r) => setTimeout(r, 20));
    // Re-save A so it becomes newer than B.
    await saveOpfsProject({
      id: a.id,
      name: 'Game A',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });

    const list = await listOpfsProjects();
    expect(list.map((p) => p.name)).toEqual(['Game A', 'Game B']);
  });

  it('persists thumbnail PNG and exposes it as an object URL', async () => {
    // 1x1 transparent PNG.
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
    const blob = new Blob([pngBytes], { type: 'image/png' });
    const meta = await saveOpfsProject({
      name: 'Thumb Test',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
      thumbnailBlob: blob,
    });

    const list = await listOpfsProjects();
    const item = list.find((p) => p.id === meta.id);
    expect(item).toBeDefined();
    expect(item!.thumbnailUrl).toMatch(/^blob:/);

    // Cleanup the object URL we got back.
    URL.revokeObjectURL(item!.thumbnailUrl!);
  });

  it('returns null from loadOpfsProject for a missing id', async () => {
    expect(await loadOpfsProject('does-not-exist')).toBeNull();
  });

  it('deleteOpfsProject is idempotent', async () => {
    const meta = await saveOpfsProject({
      name: 'Tmp',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    await deleteOpfsProject(meta.id);
    await deleteOpfsProject(meta.id); // second call — must not throw
    expect(await loadOpfsProject(meta.id)).toBeNull();
    expect(await listOpfsProjects()).toEqual([]);
  });

  it('rejects a save when wizardState fails schema validation', async () => {
    // persistedWizardStateSchema is .passthrough() with all fields
    // optional, so the way to fail validation is to break a typed
    // field — selectedAssetIds must be an array of strings, so a
    // number array hits z.array(z.string()).
    await expect(
      saveOpfsProject({
        name: 'Bad',
        template: 'platformer',
        wizardState: { selectedAssetIds: [1, 2, 3] },
      })
    ).rejects.toThrow(/wizardState failed schema validation/);
  });
});
