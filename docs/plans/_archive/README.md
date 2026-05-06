---
title: Archived Plans
updated: 2026-05-06
status: historical
domain: meta
---

# Archived Plans

Merged PRQs live here for historical record. Active PRQs sit in `docs/plans/`. Once a PRQ's directive batch is fully `[x]` and its branch is squash-merged to main, `git mv` it here.

The `git log` is the authoritative history; this directory is the human-readable accounting of which PRQ shipped which slice of work.

## Index (chronological — most recent first)

| File | Merged via | Shipped |
|---|---|---|
| `post-launcher-consolidation.prq.md` | #30 (`ff3a21b`) | OPFS launcher, save-time compile, send-mode export, deploy-chain BASE_URL audit, Capacitor Android shell, security hardening, e2e production-shape suite, experience polish (E3.1–E3.6) |
| `modernization-pillar.prq.md` | #30 (`ff3a21b`) | Toolchain bumps (pnpm 10, TS 6, Vite 8, React 19, Biome 2.4); axe-core a11y suite; cold-start budget; worker stdout truncation; sys.settrace functionCalled; lessons 7–9 |
| `omnibus-cleanup.prq.md` | #29 | i18n, schema-guarded JSON.parse, M4.2 frame-rate, form labels |
| `player-experience-pillar-4.prq.md` | merged | Player-experience iteration 4 |
| `player-experience-pillar-3.prq.md` | merged | Player-experience iteration 3 |
| `player-experience-pillar-2.prq.md` | merged | Player-experience iteration 2 |
| `player-experience-pillar.prq.md` | merged | P1–P10: wizard CTA, landing chooser, audio surface, mobile WYSIWYG, a11y, full export, Pyodide error-recovery, lessons index, code-sync V1 boundary |
| `finishing-pillar.prq.md` | merged | Coverage ratchet, wizard tests, simulator harness, F4.2 single-continue collapse, playtest doc sweep |
| `grader-followups-pillar.prq.md` | #22 | G1 worker-side variableExists; G2 dev HUD |
| `any-cleanup-pillar.prq.md` | #21 | 213 `any` → 0; Biome `noExplicitAny` flipped to error |
| `stabilization-pillar.prq.md` | #20 (`8f478f8`) | Banner restored; component CI blocking; pygame type seam unified; grader e2e via worker |
| `foundations-pillar-completion.prq.md` | #19 (`f4f418d`) | Pyodide singleton + worker; Zod lessons; AST grading; 6 lessons; docs restructure to frontmatter-headed pillars |

## Convention

When a PRQ is closed:

1. Verify every directive batch checkbox is `[x]`.
2. `git mv docs/plans/<name>.prq.md docs/plans/_archive/<name>.prq.md`.
3. Append a row to the table above with `merged via` (PR # or merge commit) and one-line `shipped` summary.
4. The next active PRQ supersedes the archived one — list it in the new PRQ's `supersedes:` frontmatter.
