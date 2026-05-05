import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listWizardProjects,
  saveWizardProject,
  loadWizardProject,
  deleteWizardProject,
} from '@lib/storage/projects';

// Reset all client-storage state between tests so each one starts fresh —
// listProjects reads the same localStorage keys as the prod ClientStorage.
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

const baseSnapshot = {
  wizardState: {
    version: '1.0.0',
    currentNodeId: 'pickGame',
    gameType: 'platformer',
    selectedAssetIds: ['robot'],
    updatedAt: new Date().toISOString(),
  },
  name: 'Robot Quest',
  template: 'platformer',
};

describe('wizard projects (P5)', () => {
  it('saves a wizard snapshot, lists it, and round-trips through load', async () => {
    const saved = await saveWizardProject(baseSnapshot);
    expect(saved.id).toBeTruthy();
    expect(saved.name).toBe('Robot Quest');
    expect(saved.template).toBe('platformer');
    expect(saved.files).toHaveLength(1);
    expect(saved.files[0].path).toBe('wizard-state.json');

    const list = await listWizardProjects();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(saved.id);

    const loaded = await loadWizardProject(saved.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Robot Quest');
    expect(loaded?.wizardState.gameType).toBe('platformer');
    expect(loaded?.wizardState.selectedAssetIds).toEqual(['robot']);
  });

  it('keeps multiple projects independently — second save does not overwrite the first', async () => {
    const a = await saveWizardProject({ ...baseSnapshot, name: 'Game A' });
    const b = await saveWizardProject({ ...baseSnapshot, name: 'Game B' });
    expect(a.id).not.toBe(b.id);

    const list = await listWizardProjects();
    expect(list.map((p) => p.name).sort()).toEqual(['Game A', 'Game B']);
  });

  it('updates in place when the existing id is supplied', async () => {
    const a = await saveWizardProject(baseSnapshot);
    const updated = await saveWizardProject({ ...baseSnapshot, name: 'Renamed' }, a.id);
    expect(updated.id).toBe(a.id);
    const list = await listWizardProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Renamed');
  });

  it('deleteWizardProject removes the row', async () => {
    const a = await saveWizardProject(baseSnapshot);
    await deleteWizardProject(a.id);
    expect(await listWizardProjects()).toHaveLength(0);
    expect(await loadWizardProject(a.id)).toBeNull();
  });

  it('returns null when loading a missing project id', async () => {
    expect(await loadWizardProject('does-not-exist')).toBeNull();
  });
});
