import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listWizardProjects,
  saveWizardProject,
  loadWizardProject,
  deleteWizardProject,
  renameWizardProject,
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

  it('returns null when the stored snapshot fails schema validation', async () => {
    // CR review feedback: loadWizardProject must validate the snapshot
    // shape before handing it back to the wizard, otherwise corrupt or
    // schema-drifted data flows untyped into the resume path. Plant a
    // bad snapshot directly in storage and confirm the loader fails
    // closed (returns null) rather than handing back the cast garbage.
    const saved = await saveWizardProject(baseSnapshot);
    const raw = JSON.parse(localStorage.getItem('pygame_academy_projects') ?? '{}');
    raw[saved.id].files[0].content = JSON.stringify({ totally: 'not-a-wizard-state' });
    localStorage.setItem('pygame_academy_projects', JSON.stringify(raw));
    // The schema is permissive (most fields optional with passthrough), so
    // this isn't a great failure case — but it pins the validation path.
    // A more aggressive break: write content that isn't even an object.
    raw[saved.id].files[0].content = JSON.stringify('not-an-object');
    localStorage.setItem('pygame_academy_projects', JSON.stringify(raw));
    expect(await loadWizardProject(saved.id)).toBeNull();
  });

  it('persists a thumbnail data URL with the project and restores it on list (P4.9)', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/2wBDAA==';
    const saved = await saveWizardProject({ ...baseSnapshot, thumbnailDataUrl: dataUrl });
    expect(saved.thumbnailDataUrl).toBe(dataUrl);

    const list = await listWizardProjects();
    expect(list[0].thumbnailDataUrl).toBe(dataUrl);
  });

  it('preserves an existing thumbnail across a saveWizardProject(existingId) without a new dataUrl', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/2wBDAA==';
    const saved = await saveWizardProject({ ...baseSnapshot, thumbnailDataUrl: dataUrl });

    // Mid-wizard auto-save when the canvas is unmounted: caller passes
    // no thumbnailDataUrl, so the spread guard skips the field rather
    // than clobbering the prior thumbnail with `undefined`.
    await saveWizardProject(baseSnapshot, saved.id);

    const list = await listWizardProjects();
    expect(list[0].thumbnailDataUrl).toBe(dataUrl);
  });

  it('renames a project in place, preserving files and template (P4.8)', async () => {
    const saved = await saveWizardProject(baseSnapshot);
    expect(saved.name).toBe('Robot Quest');

    const renamed = await renameWizardProject(saved.id, 'Robot Adventure');
    expect(renamed.id).toBe(saved.id);
    expect(renamed.name).toBe('Robot Adventure');
    // Files and template are untouched — rename is name-only.
    expect(renamed.template).toBe('platformer');
    expect(renamed.files).toHaveLength(1);
    expect(renamed.files[0].path).toBe('wizard-state.json');

    // The list reflects the new name.
    const list = await listWizardProjects();
    expect(list[0].name).toBe('Robot Adventure');

    // Snapshot still loads correctly with the new top-level name.
    const loaded = await loadWizardProject(saved.id);
    expect(loaded?.name).toBe('Robot Adventure');
    expect(loaded?.wizardState.gameType).toBe('platformer');
  });

  it('trims whitespace from rename input and rejects empty names', async () => {
    const saved = await saveWizardProject(baseSnapshot);

    // Whitespace-only name is empty after trim — must reject so the kid
    // sees an error toast instead of a silent rename to "" (which would
    // render as a blank row).
    await expect(renameWizardProject(saved.id, '   ')).rejects.toThrow(/empty/i);
    await expect(renameWizardProject(saved.id, '')).rejects.toThrow(/empty/i);

    // Surrounding whitespace is trimmed but a non-empty core is kept.
    const renamed = await renameWizardProject(saved.id, '  Spacey Name  ');
    expect(renamed.name).toBe('Spacey Name');
  });

  it('rejects when saving with a stale existingId so callers can fall back', async () => {
    // The wizard's save effect uses this signal: if the kid had a project
    // saved during the current mount but it was deleted (manual delete from
    // home, storage cleared, etc.), passing the old id must surface as a
    // rejected promise so the caller can retry as a fresh create. Silently
    // swallowing it would lose the kid's progress.
    await expect(saveWizardProject(baseSnapshot, 'definitely-not-a-real-id')).rejects.toThrow();
  });

  it('does not duplicate when the same (name, template) is saved without existingId (P4.11)', async () => {
    // A kid finishes the wizard, the savedProjectIdRef is cleared (component
    // unmounts), they come back and rebuild the same kind of game — without
    // the guard, this silently creates a second row with the same name. The
    // guard treats it as an implicit overwrite so My Games stays clean.
    const first = await saveWizardProject(baseSnapshot);
    const second = await saveWizardProject(baseSnapshot);
    expect(second.id).toBe(first.id);
    const list = await listWizardProjects();
    expect(list).toHaveLength(1);
  });

  it('keeps distinct rows when name matches but template differs (P4.11)', async () => {
    // Same name across templates is intentional — a "Knight" platformer and
    // a "Knight" shooter are different games. The guard scopes to the
    // (name, template) pair so cross-template collisions don't merge.
    const platformer = await saveWizardProject({ ...baseSnapshot, template: 'platformer' });
    const shooter = await saveWizardProject({ ...baseSnapshot, template: 'shooter' });
    expect(shooter.id).not.toBe(platformer.id);
    const list = await listWizardProjects();
    expect(list).toHaveLength(2);
  });
});
