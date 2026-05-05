/**
 * OPFS-backed project store for the launcher.
 *
 * Why OPFS, not localStorage:
 *   - localStorage caps at 5–10MB per origin. A kid building 5 games
 *     with PNG thumbnails (each ~100KB as data URL) plus wizard state
 *     hits the wall fast and silently fails to save.
 *   - localStorage is synchronous; large writes block the main thread.
 *   - OPFS is the platform's native "device filesystem for the app"
 *     — exactly what the user asked for ("save on device filesystem
 *     all games. OPFS").
 *
 * Layout:
 *   /games/
 *     /{project_id}/
 *       project.json       # metadata (name, template, timestamps)
 *       wizard-state.json  # the wizard snapshot for resume + remix
 *       game.py            # compiled Python — what the launcher runs
 *       thumbnail.png      # optional canvas thumb (binary PNG, not data URL)
 *
 * Why split files instead of one big blob: thumbnails are large, the
 * launcher list view doesn't need wizard state to render, and OPFS
 * lazy-reads each file. Listing 50 games shouldn't pull 50 wizard
 * states into memory.
 *
 * Schema versioning: project.json carries `schema_version`. Reads
 * fail closed on unknown versions (forward-compat: a kid on an older
 * launcher won't try to interpret a future schema as if it matched
 * the current one). Writes always emit the current version.
 *
 * NOT here: ingest of incoming zip exports. Exports are one-way
 * send-mode artifacts — see src/pygame/runtime/exporter.ts. The
 * launcher doesn't accept zip imports because validating + executing
 * unknown-origin game.py is a sandbox-escape risk.
 */

import { z } from 'zod';
import { persistedWizardStateSchema } from '@lib/storage/persistence';

const GAMES_DIR = 'games';
const PROJECT_FILE = 'project.json';
const WIZARD_FILE = 'wizard-state.json';
const GAME_PY_FILE = 'game.py';
const THUMBNAIL_FILE = 'thumbnail.png';

const PROJECT_SCHEMA_VERSION = 1;

const ProjectMetaSchema = z.object({
  schema_version: z.literal(PROJECT_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1),
  template: z.string().min(1),
  created_at: z.string(), // ISO 8601
  updated_at: z.string(), // ISO 8601
});

export type OpfsProjectMeta = z.infer<typeof ProjectMetaSchema>;

export interface OpfsProjectInput {
  id?: string;
  name: string;
  template: string;
  wizardState: unknown; // validated against persistedWizardStateSchema
  gamePy?: string;
  thumbnailBlob?: Blob;
}

export interface OpfsProjectListItem {
  id: string;
  name: string;
  template: string;
  createdAt: Date;
  updatedAt: Date;
  /** Object URL for the thumbnail PNG, or null if absent. Caller
   * responsible for URL.revokeObjectURL when done. */
  thumbnailUrl: string | null;
}

export class OpfsUnavailableError extends Error {
  constructor() {
    super('OPFS is not available in this environment');
    this.name = 'OpfsUnavailableError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project ${id} not found`);
    this.name = 'ProjectNotFoundError';
  }
}

export async function isOpfsProjectsAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.storage || !('getDirectory' in navigator.storage)) return false;
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

async function getGamesDir(): Promise<FileSystemDirectoryHandle> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    throw new OpfsUnavailableError();
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(GAMES_DIR, { create: true });
}

async function getProjectDir(id: string, create = false): Promise<FileSystemDirectoryHandle> {
  const games = await getGamesDir();
  return games.getDirectoryHandle(id, { create });
}

async function readJsonFile<T>(
  dir: FileSystemDirectoryHandle,
  name: string,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  let handle: FileSystemFileHandle;
  try {
    handle = await dir.getFileHandle(name);
  } catch {
    return null;
  }
  const file = await handle.getFile();
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Corrupted JSON (truncated write, browser-extension tampering).
    // Treat as missing — the caller can overwrite on next save.
    return null;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.warn(`[opfs-projects] ${name} failed schema validation`, result.error.issues);
    return null;
  }
  return result.data;
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: BufferSource | Blob | string
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Save (create or update) a project to OPFS. Returns the persisted metadata. */
export async function saveOpfsProject(input: OpfsProjectInput): Promise<OpfsProjectMeta> {
  // Validate the wizard state at the boundary — refuse to persist
  // shapes that won't round-trip through loadOpfsProject.
  const wizardResult = persistedWizardStateSchema.safeParse(input.wizardState);
  if (!wizardResult.success) {
    throw new Error(
      `wizardState failed schema validation: ${wizardResult.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }

  const id = input.id ?? generateId();
  const now = new Date().toISOString();
  const dir = await getProjectDir(id, true);

  // Read existing meta (if updating) so we preserve created_at.
  const existing = await readJsonFile(dir, PROJECT_FILE, ProjectMetaSchema);
  const meta: OpfsProjectMeta = {
    schema_version: PROJECT_SCHEMA_VERSION,
    id,
    name: input.name,
    template: input.template,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  await writeFile(dir, PROJECT_FILE, JSON.stringify(meta, null, 2));
  await writeFile(dir, WIZARD_FILE, JSON.stringify(wizardResult.data));
  if (input.gamePy !== undefined) {
    await writeFile(dir, GAME_PY_FILE, input.gamePy);
  }
  if (input.thumbnailBlob) {
    await writeFile(dir, THUMBNAIL_FILE, input.thumbnailBlob);
  }
  return meta;
}

/** List every project for the launcher's library. Newest first. */
export async function listOpfsProjects(): Promise<OpfsProjectListItem[]> {
  const games = await getGamesDir();
  const items: OpfsProjectListItem[] = [];
  // Iterate child directories.
  for await (const entry of games.values()) {
    if (entry.kind !== 'directory') continue;
    const projectDir = entry as FileSystemDirectoryHandle;
    const meta = await readJsonFile(projectDir, PROJECT_FILE, ProjectMetaSchema);
    if (!meta) continue; // skip corrupt / partial-write directories

    let thumbnailUrl: string | null = null;
    try {
      const thumbHandle = await projectDir.getFileHandle(THUMBNAIL_FILE);
      const thumbFile = await thumbHandle.getFile();
      thumbnailUrl = URL.createObjectURL(thumbFile);
    } catch {
      // No thumbnail — fine.
    }

    items.push({
      id: meta.id,
      name: meta.name,
      template: meta.template,
      createdAt: new Date(meta.created_at),
      updatedAt: new Date(meta.updated_at),
      thumbnailUrl,
    });
  }
  // Newest update first — matches existing /home My Games sort.
  items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return items;
}

export interface LoadedOpfsProject {
  meta: OpfsProjectMeta;
  wizardState: z.infer<typeof persistedWizardStateSchema>;
  gamePy: string | null;
  thumbnailUrl: string | null;
}

/** Load a project for resume / remix / play. Returns null if not found or corrupt. */
export async function loadOpfsProject(id: string): Promise<LoadedOpfsProject | null> {
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await getProjectDir(id);
  } catch {
    return null;
  }
  const meta = await readJsonFile(dir, PROJECT_FILE, ProjectMetaSchema);
  if (!meta) return null;
  const wizardState = await readJsonFile(dir, WIZARD_FILE, persistedWizardStateSchema);
  if (!wizardState) return null;

  let gamePy: string | null = null;
  try {
    const gameHandle = await dir.getFileHandle(GAME_PY_FILE);
    gamePy = await (await gameHandle.getFile()).text();
  } catch {
    // OK — game.py is optional (older saves predate the launcher).
  }

  let thumbnailUrl: string | null = null;
  try {
    const thumbHandle = await dir.getFileHandle(THUMBNAIL_FILE);
    thumbnailUrl = URL.createObjectURL(await thumbHandle.getFile());
  } catch {
    // OK — no thumbnail.
  }

  return { meta, wizardState, gamePy, thumbnailUrl };
}

/** Delete a project (and all its files). Idempotent. */
export async function deleteOpfsProject(id: string): Promise<void> {
  const games = await getGamesDir();
  try {
    await games.removeEntry(id, { recursive: true });
  } catch {
    // Already gone — nothing to do.
  }
}

/** Test-only: wipe the entire launcher library. Used by integration tests. */
export async function __clearAllOpfsProjectsForTests(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
  const root = await navigator.storage.getDirectory();
  try {
    await root.removeEntry(GAMES_DIR, { recursive: true });
  } catch {
    // Already absent.
  }
}
