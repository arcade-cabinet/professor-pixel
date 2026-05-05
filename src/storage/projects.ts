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

  if (existingId) {
    return storage.updateProject(existingId, {
      name: snapshot.name,
      template: snapshot.template,
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
    thumbnailDataUrl: undefined,
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
