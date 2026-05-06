---
title: Pillar 6 — Storage
updated: 2026-05-06
status: current
domain: pillar
pillar: 6
---

# Pillar 6 — Storage

How kid-saved games persist on the device, how the Pyodide WASM cache survives reloads, and how `/assets/*` paths get into the in-browser Python runtime so `pygame.image.load()` resolves.

## Layers

| Layer | Backing | Where | What lives there |
|---|---|---|---|
| Saved games | OPFS (Origin Private File System) | `src/storage/opfs-projects.ts` | Per-project: `project.json`, `wizard-state.json`, `game.py`, `thumbnail.png` |
| Pyodide WASM cache | OPFS via service worker | `public/pyodide-sw.js` | `pyodide.asm.{wasm,js,data}`, `python_stdlib.zip`, pre-fetched `pygame-ce` wheel |
| Settings + flags | localStorage | `pp.profile`, `pp.audioEnabled`, `pp.debug` | Tiny KV; not OPFS because we want sync read at boot |
| Pyodide FS asset mounts | Emscripten in-memory FS | `src/python/asset-mount.ts` | Selected `/assets/*` PNGs, copied per-launch |

OPFS is the platform's "private filesystem for this origin" — async, large-quota, opaque to other apps. localStorage is kept for tiny synchronous reads at boot. The Emscripten FS inside Pyodide is in-memory only; it lives and dies with the Pyodide instance.

## Saved games — OPFS layout

```
/games/
  /<project_id>/
    project.json       # metadata (name, template, createdAt, updatedAt)
    wizard-state.json  # wizard snapshot for resume + remix
    game.py            # compiled Python — what the launcher runs
    thumbnail.png      # optional canvas thumb (binary PNG, not data URL)
```

`game.py` is **persisted at save time**, not recomputed on launch. The launcher (`app/pages/play.tsx`) reads `game.py` directly and skips compilation. `wizard-state.json` is kept so "Edit" can re-open the wizard at the same step.

## Save-time atomicity (write-then-rename)

`saveOpfsProject()` writes `project.json` via temp-then-rename to avoid leaving a corrupted metadata file if the tab crashes mid-write:

1. Write all blobs to their final names.
2. Write `project.json` to `project.json.tmp`.
3. Replace `project.json` from the temp contents.

`loadOpfsProject()` ignores `*.tmp` files. The window where a half-written `project.json` is visible to a concurrent reader is bounded by step 3.

## Routing — localStorage fallback

`shouldUseOpfs()` (in `src/storage/mode.ts`) caches a boot-time probe: try `navigator.storage.getDirectory()`, fall back to localStorage on jsdom or Safari private mode. The cache means the probe runs once per page load.

Tests force the routing via `__resetOpfsRoutingForTests()` + `__clearAllOpfsProjectsForTests()` exported from `src/storage/opfs-projects.ts`.

## Migration sentinel

`src/storage/opfs-migration.ts` runs once: scan localStorage for the legacy `pygame_academy_projects` key, parse with runtime validation (object check + `Array.isArray(project.files)`), copy each surviving project into OPFS, write a sentinel file. The sentinel only lands when **no** writes failed — partial-failure runs leave the localStorage copy alive so the user doesn't lose data.

Sentinel: `/games/.migration-v1.json`. Idempotent on re-run.

## Schema validation at the boundary

Every OPFS read goes through `persistedWizardStateSchema.safeParse()` before anything else trusts the shape. Same Zod schema that the localStorage path uses — schema drift fails closed (`return null`), not by leaking an unchecked object into `/play` or the wizard.

## Pyodide WASM cache — service worker + OPFS

The first cold start downloads ~12MB of Pyodide assets. Subsequent loads should be instant — service worker `public/pyodide-sw.js` intercepts `/pyodide/*` requests, mirrors them into OPFS under `pyodide-cache-v<version>/`, and serves from cache on the next reload.

**Cache-write allowlist.** Only responses with the right `Content-Type` AND a matching extension (`.wasm`, `.js`, `.mjs`, `.json`, `.zip`, `.data`, `.whl`) get persisted. The `.whl` entry covers Pyodide's Python wheel downloads (e.g. the pre-fetched `pygame-ce` wheel). This is defense against captive-portal HTML or CDN misroutes poisoning the cache.

**Version-keyed eviction.** Cache directory name embeds the Pyodide version (`pyodide-cache-v0.29.3`). On `activate`, the SW deletes any `pyodide-cache-v*` directory whose version doesn't match the current `PYODIDE_VERSION` constant. Version bumps drop the old WASM automatically.

**Capacitor short-circuit.** Inside the native shell (`location.protocol === 'capacitor:'`) the WASM ships in the APK, so the SW registration is skipped entirely. There's nothing to cache and the SW would just intercept asset reads pointlessly.

## Asset mounting — Pyodide Emscripten FS

Generated games contain `pygame.image.load('/assets/vehicles/car.png')`. Pyodide's Emscripten FS doesn't have those URL paths mounted by default, so without intervention every selected sprite falls through to the compiler's try/except magenta placeholder — a silent visual regression.

`src/python/asset-mount.ts` exports `mountAssetsForGame(pyodide, assets)`:

1. For each `asset.path` that starts with `/`, fetch via `withBase(asset.path)` so Pages subpath deploys resolve.
2. `mkdir` cumulatively for each parent directory (ignoring EEXIST).
3. `pyodide.FS.writeFile(asset.path, Uint8Array)`.

Used by both `app/pages/play.tsx` (launcher) and the live-preview path. Same helper, same mount points, same path semantics — no drift.

Idempotent: `writeFile` overwrites silently, so re-launching an already-mounted game is fine.

## Object URL hygiene

Thumbnails are surfaced as object URLs (`URL.createObjectURL(blob)`). Two leak vectors closed:

- The dedupe scan in `src/storage/projects.ts` revokes the previous `thumbnailUrl` for every replaced row (including the matched-id row when its blob changes).
- The OPFS rename path returns the existing `thumbnailUrl` instead of clearing it — optimistic UI keeps the thumbnail visible until the next refetch.

## Storage quota errors

Cross-browser quota detection lives in `src/storage/client.ts`: matches `DOMException.name === 'QuotaExceededError'`, code `22`, message regex fallbacks for older Firefox + Safari. Surfaces as a user-facing toast ("Your device storage is full"), not a silent save failure.

## Testing

- `tests/component/opfs-projects.test.ts` — round-trip OPFS save/load with thumbnail.
- `tests/component/opfs-migration.test.ts` — sentinel idempotency, partial-failure preservation, schema-drift skip.
- `tests/component/projects-opfs-routing.test.ts` — `shouldUseOpfs()` cache + force-flags.
- `tests/component/launcher-e2e.test.tsx` — wizard save → `/play` round-trip with real Pyodide WASM.

## Cross-references

- Pyodide bootstrap, worker, voiceschanged race: [Pillar 2 — Runtime](./02-runtime.md)
- Wizard state schema, persisted shape: [Pillar 3 — Lesson Engine](./03-lesson-engine.md)
- Asset catalog, taxonomy, manager: [Pillar 1 — Frontend](./01-frontend.md)
- Deploy targets that affect storage paths (Pages subpath, Capacitor): [Pillar 7 — Deploy](./07-deploy.md)
