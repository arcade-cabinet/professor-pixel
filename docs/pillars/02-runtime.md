---
title: Pillar 2 — Runtime
updated: 2026-05-06
status: current
domain: pillar
pillar: 2
---

# Pillar 2 — Runtime

> Python in the browser. Pyodide on a Web Worker, behind a Comlink RPC, with timeouts and resource caps.
> The lesson page and the grading engine run on the worker (one per page). The runner component and `_dev/` pygame preview still use the main-thread singleton because they need synchronous canvas access.

## Why a worker

A `while True: pass` on the main thread wedges React. A `pyodide.runPython` call holds the JS event loop for as long as the Python is busy. Moving Pyodide off the main thread:

- Isolates the Python heap from React state.
- Makes `worker.terminate()` a viable kill switch — no co-routine handshake needed.
- Lets the main bundle drop `unsafe-eval` from CSP later (the worker keeps it scoped).

## Boot sequence

```text
┌──────────────── main thread ────────────────┐    ┌─── worker thread ───┐
│  app/pages/lesson.tsx                       │    │                     │
│   useQuery(['pyodide'], getPyodide)         │    │                     │
│           │                                  │    │                     │
│           ▼                                  │    │                     │
│  src/python/pyodide-singleton.ts            │    │                     │
│   (legacy main-thread bootstrap, used by    │    │                     │
│    runner.tsx + pygame-preview.tsx)         │    │                     │
│                                              │    │                     │
│  src/python/worker-runner.ts                │    │                     │
│   getWorkerRunner()                          │    │                     │
│        │                                     │    │                     │
│        │  new Worker('./worker?worker')      │───►│ worker.ts loads     │
│        │                                     │    │ importScripts(      │
│        │  Comlink.wrap(worker)               │    │  '/pyodide/         │
│        │                                     │    │   pyodide.js')      │
│        │  remote.ready()                     │───►│ self.loadPyodide()  │
│        │                                     │    │  bootstraps Pyodide │
│        │                                     │    │ Comlink.expose(     │
│        │                                     │    │  WorkerRunner)      │
│        │                                     │    │                     │
│        │  remote.runSnippet(code, input)     │───►│ runPythonAsync(code)│
│        │   ◄── {output, error: null}         │    │                     │
└──────────────────────────────────────────────┘    └─────────────────────┘
```

The legacy main-thread singleton (`src/python/pyodide-singleton.ts`) still exists and is used by the runner component and the `_dev/` pygame preview, where the canvas-bridge code needs synchronous DOM access. The lesson page and grading engine use the worker variant.

## API

### Worker (`src/python/worker.ts`)

Exposes `WorkerRunner` over Comlink:

| Method | Purpose |
|--------|---------|
| `ready()` | Boot Pyodide. Idempotent — first call triggers, subsequent calls await the cached promise. |
| `runSnippet(code, input?)` | Run user code; returns `{output, error}`. `input` pre-loads `input()` calls via a StringIO patch on `builtins.input`. |

Both stdout and stderr stream through buffered handlers passed to `loadPyodide`; the buffers are joined at the end of each `runSnippet` and sent back over the channel.

### Main-thread wrapper (`src/python/worker-runner.ts`)

`WorkerPythonRunner.runSnippet(opts)` takes a single options object so it satisfies the `CodeRunner` interface used by the grading engine:

| Field | Default | Purpose |
|-------|---------|---------|
| `code` | _required_ | Source to execute. |
| `input` | undefined | Pre-loaded input lines for `input()`. Stub raises `EOFError` if `input()` is called and none was provided. |
| `timeoutMs` | 5000 | Kill the worker if execution exceeds this. Throws `PythonTimeoutError`. |
| `maxStdout` | 65536 | Truncate captured output above this size; appends a marker. |

After a `PythonTimeoutError`, the wrapper calls `worker.terminate()` and resets internal state. The next `runSnippet` call spawns a fresh worker on demand.

`getWorkerRunner()` returns the page-level singleton.

## Pyodide vendoring

Pyodide ships ~10MB of WASM + a packaged stdlib zip. We don't bundle it through Vite (Vite would choke); we vendor it under `public/pyodide/` via a postinstall script.

| File | Purpose |
|------|---------|
| `public/pyodide/pyodide.js` | The loader |
| `public/pyodide/pyodide.asm.js` + `pyodide.asm.wasm` | The Python interpreter |
| `public/pyodide/python_stdlib.zip` | Stdlib modules |
| `public/pyodide/pyodide-lock.json` | Package metadata |

Source of truth: `package.json`'s `pyodide` dep (currently `^0.29.3`). `scripts/copy-pyodide.mjs` reads `node_modules/pyodide/` and writes `public/pyodide/`. Wired as `postinstall`, `predev`, `prebuild`. The `public/pyodide/` directory is gitignored — it's a build artifact.

The singleton has a CDN fallback (`cdn.jsdelivr.net/pyodide/v0.29.3/full/`) used only when the local copy is missing. Production builds always have the local copy because `prebuild` runs first.

## OPFS WASM cache (service worker)

The first cold start downloads ~12MB of Pyodide assets. Subsequent loads should be effectively free — `public/pyodide-sw.js` intercepts every `/pyodide/*` request, mirrors the response into OPFS under `pyodide-cache-v<version>/`, and serves from cache on the next reload.

The cache write goes through an allowlist (`Content-Type` match plus `.wasm`/`.js`/`.mjs`/`.json`/`.zip`/`.data` extension match) so a misrouted HTML response from a captive portal can't poison it. Activate-time eviction drops any `pyodide-cache-v*` directory that doesn't match the current `PYODIDE_VERSION` constant — version bumps clean up automatically.

**Capacitor short-circuit.** Inside the native shell (`location.protocol === 'capacitor:'`) the WASM ships in the APK, so the SW registration is skipped entirely. The same protocol guard lives at the registration site in `app/main.tsx`. Full layout + invariants in [Pillar 6 — Storage](./06-storage.md#pyodide-wasm-cache--service-worker--opfs).

## Resource caps

The grading engine (Pillar 4) collects per-test caps from the lesson schema and passes them through:

```ts
runner.runSnippet({ code, input, timeoutMs: 3000, maxStdout: 65536 })
```

When multiple tests on a step declare different caps, the engine takes the **minimum** so a fast test doesn't get a generous cap meant for a slower one.

A timed-out test produces `{passed: false, score: 0, feedback: "Your code took too long..."}`. The worker is recycled before the next snippet runs, so the next test starts from a clean Python heap.

## Cold-start budget

Pyodide loads ~10MB of JS + WASM + a Python stdlib zip on first call to `getPyodide()`. The budget for that boot:

- **<3000ms** on a mid-tier laptop (warm cache, dev session)
- **<8000ms** on a Chromebook (cold cache, throttled CPU)

The singleton instruments cold-start with `performance.now()` and emits one of:

- `console.info('Pyodide cold-start <N>ms')` — under budget
- `console.warn('Pyodide cold-start <N>ms exceeds budget 8000ms')` — over budget

The numeric reading is also exposed via `getColdStartMs()` for any HUD overlay that wants to render it. (Subsequent calls share the cached promise; only the first call to `getPyodide()` per page measures cold-start.)

If the warning lands consistently in production, the answer is **not** to raise the budget. The candidates, in order of impact:

1. Precache `python_stdlib.zip` in the service worker (largest single chunk).
2. Pre-warm a worker on idle so user code lands on a hot Python heap.
3. Strip unused stdlib modules at vendor time (currently we ship the full set).

## Worker recovery

Pyodide can wedge in two narrow ways the cached singleton doesn't auto-recover from. The bootstrap path itself is already self-healing: `getPyodide()`'s `.catch` handler nulls `bootstrapPromise` on rejection, so a plain network-blip bootstrap failure is **not** sticky — the next `getPyodide()` call retries from scratch. `recoverPyodide()` exists for the cases where that's not enough.

```ts
import { recoverPyodide, getPyodide } from '@lib/python';

recoverPyodide();              // drops in-flight or ready instance + window.pyodide
const pyodide = await getPyodide();   // fresh bootstrap
```

The two cases `recoverPyodide()` handles that `.catch` on the singleton can't:

1. **Poisoned ready instance.** Bootstrap succeeded, but a kid's runaway script ate the heap or left a partially-initialized class on `window.pyodide`. The singleton is happy (`isPyodideReady()` returns true), but the next `runPython()` will misbehave. `recoverPyodide()` deletes `window.pyodide` and nulls `bootstrapPromise` so a fresh boot replaces the poisoned instance.
2. **Supersede an in-flight boot.** A user clicks "Try again" while the original `loadPyodide()` is still pending (network slow, not failed). `recoverPyodide()` nulls `bootstrapPromise` and resets `coldStartMs`; when the original eventually resolves, its `.then` handler observes `myPromise !== bootstrapPromise` and discards the stale instance instead of writing it to `window.pyodide`. The race-fix lives in `getPyodide()`'s `.then` body.

`recoverPyodide()` is idempotent and safe to call from any surface (error boundary, debug HUD, "Try again" button). The user-facing surface is `app/components/pygame/runner.tsx` — when the runner catches a Pyodide error, it shows a friendly error UI with a **Try again** button that calls `recoverPyodide()`, clears the local `pyodideRef`, then re-runs `initPyodide()`. The button's `onClick` uses `try / catch / finally` so `isLoading` always unblocks, even if the fresh bootstrap fails.

Test coverage in `tests/unit/pyodide-recover.test.ts` (4 tests, including the in-flight supersede race).

## PyGame simulator

Pygame proper can't run in the browser — it depends on SDL via C extensions. Instead, `src/pygame/runtime/simulator.ts` injects a Python module named `pygame` whose draw / event / display functions proxy to JavaScript and paint onto an HTML5 canvas. Lessons that `import pygame` get this simulator transparently.

The simulator surface is documented in `src/pygame/runtime/simulator.ts` itself; the gist:
- `pygame.init()`, `pygame.quit()` — no-ops in browser
- `pygame.display.set_mode((w, h))` — returns a Surface backed by a canvas
- `pygame.draw.{circle,rect,line,polygon}` — translate to `CanvasRenderingContext2D` calls
- `pygame.event.{get,poll}` — fed by JS keyboard/mouse handlers

A lesson's `import pygame` resolves to the simulator because the simulator is registered in `sys.modules` before the user code runs.

## Asset mounting (Pyodide Emscripten FS)

Generated games contain `pygame.image.load('/assets/<path>.png')` calls. Pyodide's Emscripten FS doesn't have `/assets/*` mounted by default, so without intervention every selected sprite falls through to the compiler's try/except magenta placeholder.

`src/python/asset-mount.ts` exports `mountAssetsForGame(pyodide, assets)` — fetches each asset through `withBase()` (so Pages subpath deploys resolve), mkdirs cumulative parents, writes via `pyodide.FS.writeFile`. Used by both `app/pages/play.tsx` (launcher) and the live-preview path. Idempotent.

Full data-flow in [Pillar 6 — Storage → Asset mounting](./06-storage.md#asset-mounting--pyodide-emscripten-fs).

## Web Speech API (TTS)

`src/audio/tts.ts` wraps `window.speechSynthesis` for Pixel mascot narration. Master mute toggle gates both TTS and SFX via `pp.audioEnabled` localStorage key (defaults ON; classroom mute is one click in chrome).

**iOS Safari voiceschanged race.** On the first `speechSynthesis.getVoices()` after page load, iOS Safari returns an empty array and only populates voices after the `voiceschanged` event fires. The fix:

1. `speak(text)` checks `getVoices().length`. If empty, stash `{text, opts}` in `pendingFirstSpeak` and return without calling `speechSynthesis.speak`.
2. A one-time `voiceschanged` listener flushes the pending utterance via a recursive `speak()` call.
3. `prewarmTTSVoices()` exported and called from `AudioToggle.onClick` so the user gesture kicks the voices fetch before Pixel's first line.

Test isolation: tests that exercise the deferred-speak path use `vi.resetModules()` to reset the module-level `pendingFirstSpeak` and `voicesChangedListenerInstalled` state. See `tests/unit/audio.test.ts`.

## See also

- [Pillar 4 — Grading](04-grading.md) — how rules consume the runtime output
- [Pillar 6 — Storage](06-storage.md) — OPFS WASM cache + asset mounting
- [Pillar 7 — Deploy](07-deploy.md) — base-url helper, Capacitor SW short-circuit
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — cross-pillar boundaries
- `src/python/pyodide-singleton.ts` — main-thread bootstrap (canonical source)
- `src/python/worker.ts` — worker bootstrap (canonical source)
- `src/python/asset-mount.ts` — Emscripten FS mount helper
- `src/audio/tts.ts` — TTS + voiceschanged race fix
- `src/pygame/runtime/simulator.ts` — simulator implementation
