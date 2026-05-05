// P5 — multi-project save/load.
//
// The wizard already persists a single `wizard.state.v1` blob via persistence.ts;
// that gives us "resume the LAST game" behavior. P5 lifts that into a real
// project list so a kid can have multiple games on the same browser without
// silent overwrites.
//
// Storage backend: OPFS first (via src/storage/opfs-projects.ts), localStorage
// as a one-release fallback for browsers without OPFS support and for read
// resilience while the migration sentinel still has stragglers. The
// localStorage path is identical to the original P5 implementation; the OPFS
// path translates the same WizardProjectSnapshot contract through the
// launcher store. Both paths emit the same `projects.changed` events so
// /home updates regardless of which backend won.

import type { Project } from '@lib/types/schema';
import { getClientStorage } from '@lib/storage/mode';
import { type PersistedWizardState, persistedWizardStateSchema } from '@lib/storage/persistence';
import { publishStorageEvent } from '@lib/storage/broadcast';
import {
  deleteOpfsProject,
  isOpfsProjectsAvailable,
  listOpfsProjects,
  loadOpfsProject,
  saveOpfsProject,
} from '@lib/storage/opfs-projects';
import { compilePythonGame } from '@lib/pygame/runtime/compiler';
import { assetManager } from '@lib/assets/manager';
import type { GameAsset } from '@lib/assets/types';

const ANON_USER_ID = 'anonymous-user';
const SNAPSHOT_FILE = 'wizard-state.json';

// Cache the OPFS-availability probe so the storage path resolves
// synchronously after the first hit. The probe itself touches
// navigator.storage.getDirectory() which is cheap but async.
let opfsAvailableCache: boolean | null = null;
async function useOpfs(): Promise<boolean> {
  if (opfsAvailableCache !== null) return opfsAvailableCache;
  opfsAvailableCache = await isOpfsProjectsAvailable();
  return opfsAvailableCache;
}

/** Test-only: drop the cached availability probe. */
export function __resetOpfsRoutingForTests(): void {
  opfsAvailableCache = null;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Adapt an OPFS list item into the legacy `Project` shape consumed by
 * /home. Thumbnail is fetched from the OPFS object URL and converted to
 * a data URL because the existing UI binds <img src> to a data URL
 * (object URLs would leak across the React Query cache without
 * URL.revokeObjectURL discipline that the UI doesn't enforce).
 */
async function opfsItemToProject(item: {
  id: string;
  name: string;
  template: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl: string | null;
}): Promise<Project> {
  let thumbnailDataUrl: string | undefined;
  if (item.thumbnailUrl) {
    try {
      const res = await fetch(item.thumbnailUrl);
      const blob = await res.blob();
      thumbnailDataUrl = await blobToDataUrl(blob);
    } catch {
      // Thumbnail unreadable — drop it; the row falls back to gradient.
    } finally {
      URL.revokeObjectURL(item.thumbnailUrl);
    }
  }
  return {
    id: item.id,
    userId: ANON_USER_ID,
    name: item.name,
    template: item.template,
    description: undefined,
    published: false,
    thumbnailDataUrl,
    files: [], // not surfaced from list view; load via loadWizardProject for full state
    assets: [],
    createdAt: item.createdAt,
  } as Project;
}

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
  /**
   * Optional pre-compiled Python source (compilePythonGame output)
   * persisted at save time so the launcher's /play route doesn't
   * recompile on every load. Backwards-compatible: older projects
   * predate this field, and /play falls back to compile-on-the-fly
   * when it's absent. Mid-wizard saves with no chosen components
   * persist no gamePy — the launcher renders the unfinished state
   * for those.
   */
  gamePy?: string;
}

export async function listWizardProjects(): Promise<Project[]> {
  if (await useOpfs()) {
    const items = await listOpfsProjects();
    // listOpfsProjects already returns newest-update-first; preserve.
    return Promise.all(items.map(opfsItemToProject));
  }
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
  if (await useOpfs()) {
    return saveWizardProjectOpfs(snapshot, existingId);
  }
  return saveWizardProjectLocalStorage(snapshot, existingId);
}

async function saveWizardProjectOpfs(
  snapshot: WizardProjectSnapshot,
  existingId?: string
): Promise<Project> {
  let resolvedId = existingId;
  if (!resolvedId) {
    // Same name+template dedup contract as localStorage path.
    const targetName = snapshot.name.trim().toLowerCase();
    const existing = await listOpfsProjects();
    const match = existing.find(
      (p) => p.name.trim().toLowerCase() === targetName && p.template === snapshot.template
    );
    if (match) {
      resolvedId = match.id;
    }
    // Every URL from listOpfsProjects() must be revoked here — the
    // save path doesn't return any of them to the caller, so nothing
    // downstream owns the lifetime. Even the matched id's URL is
    // discarded: saveOpfsProject below writes a fresh thumbnail.png
    // (or leaves the existing one untouched), and the next list/load
    // call mints its own object URL. Skipping the matched id leaks
    // ~one URL per save.
    for (const item of existing) {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    }
  }

  // Convert data URL → blob if a new thumbnail was supplied. Mid-wizard
  // saves with no thumbnailDataUrl preserve the existing one (the
  // launcher store keeps the old thumbnail.png on update if no new
  // blob is passed in).
  let thumbnailBlob: Blob | undefined;
  if (snapshot.thumbnailDataUrl) {
    try {
      thumbnailBlob = await dataUrlToBlob(snapshot.thumbnailDataUrl);
    } catch (err) {
      console.warn('[projects] failed to decode thumbnail data URL on save', err);
    }
  }

  // Compile + persist game.py at save time so /play doesn't have to
  // recompile on every load. Side benefit: a kid's broken-shape choice
  // map fails loudly here instead of silently saving a snapshot that
  // crashes /play. Only compile when there are components — mid-wizard
  // saves are stored without game.py and surface as "unfinished" on /play.
  const sessionActions = (snapshot.wizardState as { sessionActions?: unknown })
    .sessionActions as { selectedComponents?: Record<string, string> } | undefined;
  const selectedComponents = sessionActions?.selectedComponents ?? {};
  const assetIds = (snapshot.wizardState as { selectedAssetIds?: string[] }).selectedAssetIds ?? [];
  let gamePy: string | undefined;
  if (Object.keys(selectedComponents).length > 0) {
    const selectedAssets = assetIds
      .map((id) => assetManager.getAssetById(id))
      .filter((a): a is GameAsset => Boolean(a));
    try {
      gamePy = compilePythonGame(selectedComponents, selectedAssets);
    } catch (err) {
      // Compile failure is a real bug — surface it loudly. Don't fall
      // back to "save without game.py" because that hides regressions
      // in the compiler. The wizard's auto-save path swallows this in
      // its catch handler so the kid sees a save toast either way.
      console.warn('[projects] compilePythonGame failed at save time', err);
    }
  }

  const meta = await saveOpfsProject({
    id: resolvedId,
    name: snapshot.name,
    template: snapshot.template,
    wizardState: snapshot.wizardState,
    gamePy,
    thumbnailBlob,
  });
  publishStorageEvent({
    type: 'projects.changed',
    reason: resolvedId ? 'update' : 'create',
  });

  // Mirror the legacy createProject / updateProject return shape.
  return {
    id: meta.id,
    userId: ANON_USER_ID,
    name: meta.name,
    template: meta.template,
    description: undefined,
    published: false,
    thumbnailDataUrl: snapshot.thumbnailDataUrl,
    files: [{ path: SNAPSHOT_FILE, content: JSON.stringify(snapshot.wizardState) }],
    assets: [],
    createdAt: new Date(meta.created_at),
  } as Project;
}

async function saveWizardProjectLocalStorage(
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
    const updated = await storage.updateProject(resolvedId, {
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
    publishStorageEvent({ type: 'projects.changed', reason: 'update' });
    return updated;
  }
  const created = await storage.createProject({
    userId: ANON_USER_ID,
    name: snapshot.name,
    template: snapshot.template,
    description: undefined,
    published: false,
    thumbnailDataUrl: snapshot.thumbnailDataUrl,
    files: [fileEntry],
    assets: [],
  });
  publishStorageEvent({ type: 'projects.changed', reason: 'create' });
  return created;
}

export async function loadWizardProject(id: string): Promise<WizardProjectSnapshot | null> {
  if (await useOpfs()) {
    const loaded = await loadOpfsProject(id);
    if (!loaded) {
      // OPFS doesn't have it; fall through to localStorage in case the
      // migration sentinel was written before the kid's project row
      // got copied (rare partial-migration recovery path).
    } else {
      let thumbnailDataUrl: string | undefined;
      if (loaded.thumbnailUrl) {
        try {
          const res = await fetch(loaded.thumbnailUrl);
          thumbnailDataUrl = await blobToDataUrl(await res.blob());
        } catch {
          // Drop on failure — caller renders gradient.
        } finally {
          URL.revokeObjectURL(loaded.thumbnailUrl);
        }
      }
      return {
        wizardState: loaded.wizardState as PersistedWizardState,
        name: loaded.meta.name,
        template: loaded.meta.template,
        thumbnailDataUrl,
        gamePy: loaded.gamePy ?? undefined,
      };
    }
  }
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
  if (await useOpfs()) {
    await deleteOpfsProject(id);
    publishStorageEvent({ type: 'projects.changed', reason: 'delete' });
    return;
  }
  const storage = getClientStorage();
  await storage.deleteProject(id);
  publishStorageEvent({ type: 'projects.changed', reason: 'delete' });
}

/**
 * P4.18 — Clone a project. Used by the /home Remix button so a kid can
 * spin off a variant ("what if my Knight game had ninjas instead?")
 * without losing the original. The clone gets a "{name} — Remix N"
 * suffix where N is the smallest integer that doesn't collide with an
 * existing project name (kid clicks Remix three times → Remix 1, Remix
 * 2, Remix 3). Files, template, and thumbnail are copied verbatim from
 * the source. Returns the new project so the caller can route into it.
 *
 * Throws if the source id doesn't exist (kid clicked Remix on a row
 * that was deleted from another tab).
 */
export async function cloneWizardProject(sourceId: string): Promise<Project> {
  if (await useOpfs()) {
    const loaded = await loadOpfsProject(sourceId);
    if (!loaded) {
      throw new Error(`Project ${sourceId} not found`);
    }
    const all = await listOpfsProjects();
    const baseName = loaded.meta.name.replace(/ — Remix \d+$/, '');
    let n = 1;
    while (all.some((p) => p.name === `${baseName} — Remix ${n}`)) {
      n += 1;
    }
    const cloneName = `${baseName} — Remix ${n}`;

    let thumbnailBlob: Blob | undefined;
    if (loaded.thumbnailUrl) {
      try {
        const res = await fetch(loaded.thumbnailUrl);
        thumbnailBlob = await res.blob();
      } catch {
        // No thumbnail on the clone — fine.
      } finally {
        URL.revokeObjectURL(loaded.thumbnailUrl);
      }
    }
    // Revoke the URLs from the list scan we don't end up using.
    for (const item of all) {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    }

    const meta = await saveOpfsProject({
      // No id ⇒ new project.
      name: cloneName,
      template: loaded.meta.template,
      wizardState: loaded.wizardState,
      gamePy: loaded.gamePy ?? undefined,
      thumbnailBlob,
    });
    publishStorageEvent({ type: 'projects.changed', reason: 'clone' });
    let thumbnailDataUrl: string | undefined;
    if (thumbnailBlob) {
      try {
        thumbnailDataUrl = await blobToDataUrl(thumbnailBlob);
      } catch {
        // Drop.
      }
    }
    return {
      id: meta.id,
      userId: ANON_USER_ID,
      name: meta.name,
      template: meta.template,
      description: undefined,
      published: false,
      thumbnailDataUrl,
      files: [{ path: SNAPSHOT_FILE, content: JSON.stringify(loaded.wizardState) }],
      assets: [],
      createdAt: new Date(meta.created_at),
    } as Project;
  }
  const storage = getClientStorage();
  const source = await storage.getProject(sourceId);
  if (!source) {
    throw new Error(`Project ${sourceId} not found`);
  }
  const allProjects = await storage.listProjects(ANON_USER_ID);
  // Find a non-colliding remix name. We pick the lowest free integer
  // rather than max+1 so a kid who deleted Remix 1 between attempts
  // doesn't land on Remix 4 — the suffixes stay tight.
  const baseName = source.name.replace(/ — Remix \d+$/, '');
  let n = 1;
  while (allProjects.some((p) => p.name === `${baseName} — Remix ${n}`)) {
    n += 1;
  }
  const cloneName = `${baseName} — Remix ${n}`;
  const cloned = await storage.createProject({
    userId: ANON_USER_ID,
    name: cloneName,
    template: source.template,
    description: source.description,
    published: false,
    thumbnailDataUrl: source.thumbnailDataUrl,
    files: source.files.map((f) => ({ ...f })),
    assets: source.assets.map((a) => ({ ...a })),
  });
  publishStorageEvent({ type: 'projects.changed', reason: 'clone' });
  return cloned;
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
  if (await useOpfs()) {
    const loaded = await loadOpfsProject(id);
    if (!loaded) {
      throw new Error(`Project ${id} not found`);
    }
    if (loaded.thumbnailUrl) URL.revokeObjectURL(loaded.thumbnailUrl);
    const meta = await saveOpfsProject({
      id,
      name: trimmed,
      template: loaded.meta.template,
      wizardState: loaded.wizardState,
      gamePy: loaded.gamePy ?? undefined,
      // No thumbnailBlob — the launcher store keeps the existing
      // thumbnail.png on update if no new blob is supplied.
    });
    publishStorageEvent({ type: 'projects.changed', reason: 'rename' });
    return {
      id: meta.id,
      userId: ANON_USER_ID,
      name: meta.name,
      template: meta.template,
      description: undefined,
      published: false,
      thumbnailDataUrl: undefined,
      files: [{ path: SNAPSHOT_FILE, content: JSON.stringify(loaded.wizardState) }],
      assets: [],
      createdAt: new Date(meta.created_at),
    } as Project;
  }
  const storage = getClientStorage();
  const updated = await storage.updateProject(id, { name: trimmed });
  publishStorageEvent({ type: 'projects.changed', reason: 'rename' });
  return updated;
}
