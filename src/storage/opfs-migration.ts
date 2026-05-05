/**
 * One-shot migration from localStorage projects → OPFS launcher store.
 *
 * Existing kids have games saved under
 * `localStorage["pygame_academy_projects"]` (a JSON map keyed by project
 * id). The launcher's OPFS store (src/storage/opfs-projects.ts) is the
 * new home. This module copies the data over once, the first time the
 * app boots on a browser where OPFS is available.
 *
 * Design choices:
 *
 *   1. Idempotent — a per-origin OPFS sentinel marks the migration
 *      done. Re-running the migration won't duplicate or clobber.
 *   2. Non-destructive — we do NOT delete the localStorage entries
 *      after migrating. The next release cycle can clean them up
 *      after telemetry confirms OPFS reads land cleanly. Until then
 *      the localStorage copy is a safety net if a kid's OPFS quota
 *      gets evicted.
 *   3. Best-effort per row — if one project has a corrupted shape
 *      (browser-extension tampering, partial old-format payload), it
 *      gets logged and skipped; the rest still migrate.
 *   4. Runs at app boot, off the critical render path. Failures are
 *      logged but do not block the UI.
 *
 * Trigger this from app/main.tsx alongside registerPyodideCache().
 * One call per app boot is plenty.
 */

import { isOpfsProjectsAvailable, saveOpfsProject } from '@lib/storage/opfs-projects';
import type { Project } from '@lib/types/schema';

const SENTINEL_FILE = 'migration-from-localstorage-v1.done';
const LOCALSTORAGE_KEY = 'pygame_academy_projects';
const SNAPSHOT_FILE = 'wizard-state.json';

let migrationPromise: Promise<MigrationResult> | null = null;

export interface MigrationResult {
  ran: boolean; // false if previously done or OPFS unavailable
  migrated: number; // count of projects copied to OPFS
  skipped: string[]; // project ids skipped due to corrupt shape
}

export function migrateLocalStorageProjectsToOpfs(): Promise<MigrationResult> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = runWithLock();
  return migrationPromise;
}

async function runWithLock(): Promise<MigrationResult> {
  // Cross-tab race: two tabs opened simultaneously on a fresh browser
  // both pass the sentinel check, both enumerate the same set of
  // localStorage projects, and both call saveOpfsProject for each.
  // saveOpfsProject is by-id so the file payloads end up consistent,
  // but the in-flight writes can interleave at the OPFS layer and
  // produce truncated writes on Safari (which serializes writers
  // differently than Chromium). Web Locks gives us a one-writer
  // guarantee scoped to the origin — the second tab waits for the
  // first to finish, then sees the sentinel and short-circuits.
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return run();
  }
  return navigator.locks.request('opfs-migration-v1', () => run());
}

async function run(): Promise<MigrationResult> {
  if (!(await isOpfsProjectsAvailable())) {
    return { ran: false, migrated: 0, skipped: [] };
  }
  if (typeof localStorage === 'undefined') {
    return { ran: false, migrated: 0, skipped: [] };
  }

  // Idempotency check.
  if (await sentinelExists()) {
    return { ran: false, migrated: 0, skipped: [] };
  }

  const raw = localStorage.getItem(LOCALSTORAGE_KEY);
  if (!raw) {
    // Nothing to migrate — still write the sentinel so we don't re-check
    // every boot.
    await writeSentinel();
    return { ran: true, migrated: 0, skipped: [] };
  }

  let parsed: Record<string, Project>;
  try {
    parsed = JSON.parse(raw) as Record<string, Project>;
  } catch (err) {
    console.warn(
      '[opfs-migration] localStorage projects is corrupt; sentinel will mark migration done to avoid retry storms',
      err
    );
    await writeSentinel();
    return { ran: true, migrated: 0, skipped: [] };
  }

  const skipped: string[] = [];
  let migrated = 0;

  for (const project of Object.values(parsed)) {
    if (!project || typeof project !== 'object') {
      skipped.push(String(project));
      continue;
    }
    const wizardFile = project.files?.find((f) => f.path === SNAPSHOT_FILE);
    if (!wizardFile) {
      // Pre-launcher project format that didn't carry a wizard
      // snapshot. Skip — the kid can't resume it anyway, so there's
      // nothing meaningful to migrate.
      skipped.push(project.id ?? '<unknown id>');
      continue;
    }
    let wizardState: unknown;
    try {
      wizardState = JSON.parse(wizardFile.content);
    } catch {
      skipped.push(project.id ?? '<unknown id>');
      continue;
    }
    let thumbnailBlob: Blob | undefined;
    if (project.thumbnailDataUrl) {
      try {
        thumbnailBlob = await dataUrlToBlob(project.thumbnailDataUrl);
      } catch (err) {
        // Bad data URL — keep migrating without the thumb.
        console.warn(`[opfs-migration] couldn't decode thumbnail for ${project.id}`, err);
      }
    }
    try {
      await saveOpfsProject({
        id: project.id,
        name: project.name,
        template: project.template,
        wizardState,
        thumbnailBlob,
      });
      migrated += 1;
    } catch (err) {
      console.warn(`[opfs-migration] failed to migrate project ${project.id}`, err);
      skipped.push(project.id ?? '<unknown id>');
    }
  }

  await writeSentinel();
  return { ran: true, migrated, skipped };
}

async function sentinelExists(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.getFileHandle(SENTINEL_FILE);
    return true;
  } catch {
    return false;
  }
}

async function writeSentinel(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(SENTINEL_FILE, { create: true });
    const writable = await handle.createWritable();
    await writable.write(new Date().toISOString());
    await writable.close();
  } catch (err) {
    // If we can't write the sentinel we'll re-run next boot. Annoying
    // but not catastrophic — the migration is idempotent on the OPFS
    // side because saveOpfsProject by-id either creates or updates.
    console.warn('[opfs-migration] failed to write sentinel; migration may re-run', err);
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  // fetch() handles data: URLs in browsers; cleaner than manual base64
  // decoding and gets us the right MIME type for free.
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Test-only: drop the cached promise so the next call re-runs. */
export function __resetMigrationForTests(): void {
  migrationPromise = null;
}
