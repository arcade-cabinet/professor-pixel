# `artifacts/` — gitignored review surfaces

This directory is **gitignored** (see `.gitignore`). Files here are review
artifacts for a human, not regression baselines for CI.

## What lands here

| Subpath | Producer | Purpose |
|---|---|---|
| `artifacts/screenshots/web/<viewport>/<route>.png` | `tests/e2e/visual-routes-smoke.spec.ts` | Per-route Playwright screenshot at every viewport (desktop, tablet, mobile, etc.). Run with `pnpm test:e2e`. |
| `artifacts/screenshots/android/` | `pnpm test:android:smoke` (Maestro flow) | APK boot + key-route screenshots from a connected Android emulator/device. |
| `artifacts/part0-audit.md` | `node scripts/audit-ui-as-shell.mjs` | Mechanical UI-as-shell architecture audit table — input to `docs/audits/`. |

## Why no committed baselines

Per the 2026-05-08 functional truth audit's intentional decision: until the
UI/UX is confident enough to lock in, baselines would just enshrine the
current state's flaws. Screenshots are dumped here for human review;
visual regression with diffs becomes meaningful only after the audit fix
list closes.

## How to clear

```sh
# Wipe screenshots but keep this README (the only tracked file under artifacts/):
find artifacts -mindepth 1 ! -name README.md -exec rm -rf {} +
```

Anything important got referenced from a doc or PR description by hash —
the directory is replaceable.
