// P5 — multi-project save/load.
//
// The wizard already persists a single `wizard.state.v1` blob via persistence.ts;
// that gives us "resume the LAST game" behavior. P5 lifts that into a real
// project list so a kid can have multiple games on the same browser without
// silent overwrites.
//
// Schema reuse: Project from src/types/schema.ts already has `id`, `name`,
// `template`, `files`, `assets`. We cram the wizard snapshot into a single
// `files: [{ path: 'wizard-state.json', content: JSON.stringify(snapshot) }]`
// entry — no schema change required, and a future "real file" project shape
// can sit alongside without migration.

import type { Project } from '@lib/types/schema';
import { getClientStorage } from '@lib/storage/mode';
import { type PersistedWizardState, persistedWizardStateSchema } from '@lib/storage/persistence';

const ANON_USER_ID = 'anonymous-user';
const SNAPSHOT_FILE = 'wizard-state.json';

export interface WizardProjectSnapshot {
  /** Wizard state at the moment of save — exact shape stored under `wizard.state.v1`. */
  wizardState: PersistedWizardState;
  /** Free-form name the kid gave the game in the wizard. */
  name: string;
  /** Game template id (e.g., 'platformer', 'shooter'). */
  template: string;
  /**
   * Optional canvas snapshot captured at save time. Stored as a data URL
   * (image/png) so the /home My Games row can show what the kid built
   * without re-running the wizard or pyodide. The wizard caller is
   * responsible for capturing canvas.toDataURL — projects.ts is just the
   * persistence channel. Backwards-compatible: older projects without a
   * thumbnail still load fine; the home card just falls back to a
   * gradient placeholder.
   */
  thumbnailDataUrl?: string;
}

export async function listWizardProjects(): Promise<Project[]> {
  const storage = getClientStorage();
  const projects = await storage.listProjects(ANON_USER_ID);
  // Sort newest first — `createdAt` is a Date or a parseable date string.
  return projects.slice().sort((a, b) => {
    const aMs = new Date(a.createdAt).getTime();
    const bMs = new Date(b.createdAt).getTime();
    return bMs - aMs;
  });
}

/**
 * Persist a wizard snapshot. If the project already exists (matched by
 * `id`), update in place; otherwise create. Returns the saved project.
 *
 * Duplicate-name guard (P4.11): when no `existingId` is supplied AND a
 * project already exists with the same `(name, template)` pair, treat it
 * as an implicit overwrite rather than creating a second row. This makes
 * the auto-save flow idempotent across "kid finishes the wizard, comes
 * back, builds another with the same name" — without it, every revisit
 * would silently spawn a duplicate. Same-template is part of the match
 * key so a "Knight" platformer and a "Knight" shooter remain distinct
 * games even though they share a name.
 */
export async function saveWizardProject(
  snapshot: WizardProjectSnapshot,
  existingId?: string
): Promise<Project> {
  const storage = getClientStorage();
  const fileEntry = {
    path: SNAPSHOT_FILE,
    content: JSON.stringify(snapshot.wizardState),
  };

  let resolvedId = existingId;
  if (!resolvedId) {
    // Compare on a normalized (trim + lowercase) name so "Robot Quest" and
    // "robot quest" don't spawn two rows for the same logical game. The
    // template id comes from flow JSON constants so it's already stable;
    // strict equality is fine there.
    const targetName = snapshot.name.trim().toLowerCase();
    const existing = await storage.listProjects(ANON_USER_ID);
    const match = existing.find(
      (p) => p.name.trim().toLowerCase() === targetName && p.template === snapshot.template
    );
    if (match) {
      resolvedId = match.id;
    }
  }

  if (resolvedId) {
    return storage.updateProject(resolvedId, {
      name: snapshot.name,
      template: snapshot.template,
      // Only include thumbnailDataUrl if the caller supplied one. Sending
      // `undefined` would clobber a previously-saved thumbnail with each
      // mid-wizard auto-save (the kid built a thing, then the canvas
      // unmounted before the next save).
      ...(snapshot.thumbnailDataUrl !== undefined
        ? { thumbnailDataUrl: snapshot.thumbnailDataUrl }
        : {}),
      files: [fileEntry],
      assets: [],
    });
  }
  return storage.createProject({
    userId: ANON_USER_ID,
    name: snapshot.name,
    template: snapshot.template,
    description: undefined,
    published: false,
    thumbnailDataUrl: snapshot.thumbnailDataUrl,
    files: [fileEntry],
    assets: [],
  });
}

export async function loadWizardProject(id: string): Promise<WizardProjectSnapshot | null> {
  const storage = getClientStorage();
  const project = await storage.getProject(id);
  if (!project) return null;
  const file = project.files.find((f) => f.path === SNAPSHOT_FILE);
  if (!file) return null;
  try {
    const raw = JSON.parse(file.content) as unknown;
    // Validate via the canonical schema so a corrupt or schema-drifted
    // snapshot fails closed (treated as "no resumable state") instead of
    // propagating untrusted shape into the wizard.
    const result = persistedWizardStateSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[projects] wizard snapshot failed schema validation', result.error.issues);
      return null;
    }
    return {
      wizardState: result.data as PersistedWizardState,
      name: project.name,
      template: project.template,
      thumbnailDataUrl: project.thumbnailDataUrl,
    };
  } catch {
    // Corrupt snapshot — caller treats null as "no resumable state".
    return null;
  }
}

export async function deleteWizardProject(id: string): Promise<void> {
  const storage = getClientStorage();
  await storage.deleteProject(id);
}

/**
 * Rename a project in place — touches `name` only, leaving files / template /
 * assets / thumbnail untouched. Used by the inline rename affordance on the
 * /home project rows so a kid can fix a typo without opening the wizard.
 *
 * Throws if the project doesn't exist or the new name is empty after trim.
 */
export async function renameWizardProject(id: string, newName: string): Promise<Project> {
  const trimmed = newName.trim();
  if (trimmed.length === 0) {
    throw new Error('Project name cannot be empty');
  }
  const storage = getClientStorage();
  return storage.updateProject(id, { name: trimmed });
}
