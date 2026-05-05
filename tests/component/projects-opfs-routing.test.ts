/**
 * Confirms the public projects.ts API (saveWizardProject etc.) routes
 * through the OPFS launcher store when OPFS is available.
 *
 * Browser mode (real Chromium via @vitest/browser) is mandatory: OPFS
 * is the whole point.
 *
 * The unit test suite exercises the legacy localStorage branch (jsdom
 * lacks OPFS, so useOpfs() returns false there). This file proves the
 * Chromium branch actually writes to OPFS — i.e., kids on the platform
 * are getting the upgraded backend, not silently still on localStorage.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetOpfsRoutingForTests,
  cloneWizardProject,
  deleteWizardProject,
  listWizardProjects,
  loadWizardProject,
  renameWizardProject,
  saveWizardProject,
} from '@lib/storage/projects';
import {
  __clearAllOpfsProjectsForTests,
  listOpfsProjects,
} from '@lib/storage/opfs-projects';

// `updatedAt` is required by PersistedWizardState even though the zod
// schema marks it optional — the type is what saveWizardProject takes.
const SAMPLE_WIZARD_STATE = {
  version: '1.0.0',
  selectedAssetIds: ['robot-blue'],
  gameType: 'platformer',
  updatedAt: new Date().toISOString(),
};

describe('projects.ts → OPFS routing (browser)', () => {
  beforeEach(async () => {
    __resetOpfsRoutingForTests();
    await __clearAllOpfsProjectsForTests();
    localStorage.removeItem('pygame_academy_projects');
  });
  afterEach(async () => {
    __resetOpfsRoutingForTests();
    await __clearAllOpfsProjectsForTests();
    localStorage.removeItem('pygame_academy_projects');
  });

  it('saveWizardProject lands in OPFS, not localStorage', async () => {
    const project = await saveWizardProject({
      name: 'OPFS Game',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    expect(project.id).toBeTruthy();

    const opfsItems = await listOpfsProjects();
    expect(opfsItems.length).toBe(1);
    expect(opfsItems[0].name).toBe('OPFS Game');
    // Cleanup the URL we picked up from listOpfsProjects.
    if (opfsItems[0].thumbnailUrl) URL.revokeObjectURL(opfsItems[0].thumbnailUrl);

    // localStorage entry should be untouched (no fallback write).
    const ls = localStorage.getItem('pygame_academy_projects');
    expect(ls === null || ls === '{}' || JSON.parse(ls)[project.id] === undefined).toBe(true);
  });

  it('listWizardProjects returns OPFS-backed projects in newest-first order', async () => {
    const a = await saveWizardProject({
      name: 'A',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    await new Promise((r) => setTimeout(r, 20));
    await saveWizardProject({
      name: 'B',
      template: 'shooter',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    await new Promise((r) => setTimeout(r, 20));
    // Update A so it becomes newest.
    await saveWizardProject(
      { name: 'A', template: 'platformer', wizardState: SAMPLE_WIZARD_STATE },
      a.id
    );
    const list = await listWizardProjects();
    expect(list.map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('loadWizardProject returns the snapshot for an OPFS project', async () => {
    const saved = await saveWizardProject({
      name: 'Load Me',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    const loaded = await loadWizardProject(saved.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Load Me');
    expect(loaded!.template).toBe('platformer');
    expect(loaded!.wizardState.gameType).toBe('platformer');
  });

  it('renameWizardProject preserves the id and updates the OPFS metadata', async () => {
    const saved = await saveWizardProject({
      name: 'Old Name',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    const renamed = await renameWizardProject(saved.id, 'New Name');
    expect(renamed.id).toBe(saved.id);
    expect(renamed.name).toBe('New Name');
    const list = await listWizardProjects();
    expect(list.find((p) => p.id === saved.id)?.name).toBe('New Name');
  });

  it('cloneWizardProject creates a new id with a Remix N suffix', async () => {
    const saved = await saveWizardProject({
      name: 'Knight',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    const cloned = await cloneWizardProject(saved.id);
    expect(cloned.id).not.toBe(saved.id);
    expect(cloned.name).toBe('Knight — Remix 1');
    expect(cloned.template).toBe('platformer');
    const list = await listWizardProjects();
    expect(list.length).toBe(2);
  });

  it('deleteWizardProject removes the OPFS row', async () => {
    const saved = await saveWizardProject({
      name: 'Delete Me',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    await deleteWizardProject(saved.id);
    expect(await loadWizardProject(saved.id)).toBeNull();
    expect(await listWizardProjects()).toEqual([]);
  });

  it('saveWizardProject with an existing (name, template) pair updates in place', async () => {
    const first = await saveWizardProject({
      name: 'Same Name',
      template: 'platformer',
      wizardState: { ...SAMPLE_WIZARD_STATE, gameType: 'first' },
    });
    const second = await saveWizardProject({
      name: 'Same Name',
      template: 'platformer',
      wizardState: { ...SAMPLE_WIZARD_STATE, gameType: 'second' },
    });
    // Same id — the duplicate-name guard caught it.
    expect(second.id).toBe(first.id);
    const loaded = await loadWizardProject(first.id);
    expect(loaded!.wizardState.gameType).toBe('second');
  });
});
