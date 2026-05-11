---
title: CHANGELOG
updated: 2026-05-04
status: current
domain: ops
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Going forward, releases and version bumps are managed automatically by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org/) on `main`.

## [1.1.0](https://github.com/arcade-cabinet/professor-pixel/compare/v1.0.0...v1.1.0) (2026-05-11)


### Features

* **finishing-pillar:** coverage ratchet + wizard tests + simulator harness + F4.2 + playtest CLOSED markers ([#23](https://github.com/arcade-cabinet/professor-pixel/issues/23)) ([6d5454e](https://github.com/arcade-cabinet/professor-pixel/commit/6d5454e22d24e20dda7932f6e6b49e9960b6cc15))
* foundations + asset-library refactor ([#2](https://github.com/arcade-cabinet/professor-pixel/issues/2)) ([ec275bd](https://github.com/arcade-cabinet/professor-pixel/commit/ec275bd375031e55f5ed349d19d74cccb2e73ef3))
* foundations pillar completion (T2.1–T5.3, TD.1–TD.9, TC.1) ([#19](https://github.com/arcade-cabinet/professor-pixel/issues/19)) ([f4f418d](https://github.com/arcade-cabinet/professor-pixel/commit/f4f418d022b74b7a00a1697412003aa7724a0ea1))
* **modernization:** closeout — launcher, deploy-chain, e2e, polish ([#30](https://github.com/arcade-cabinet/professor-pixel/issues/30)) ([ff3a21b](https://github.com/arcade-cabinet/professor-pixel/commit/ff3a21b249caa9dbe4fdba4d1476e51a298627ab))
* **player-experience:** pillar 2 — P4 NotFound, P5 multi-project, P6 pause, P7 profile, P8 audio toggle, P9 recovery, P10 lessons states ([#26](https://github.com/arcade-cabinet/professor-pixel/issues/26)) ([58f899d](https://github.com/arcade-cabinet/professor-pixel/commit/58f899d9aa1e42cf477f8d6ba0bed14ab65e72b6))
* **player-experience:** pillar 3 — Q12 storage-blocked + Q15 offline awareness ([#27](https://github.com/arcade-cabinet/professor-pixel/issues/27)) ([cda6e3e](https://github.com/arcade-cabinet/professor-pixel/commit/cda6e3e775427f7436d588684f26a1e1bf06503c))
* **player-experience:** Pillar 4 — 33 tasks of i18n, mobile a11y, editor polish ([#28](https://github.com/arcade-cabinet/professor-pixel/issues/28)) ([42082f3](https://github.com/arcade-cabinet/professor-pixel/commit/42082f3c0c20b4f2070b31b7d8196af73833d80a))
* stabilization pillar (S1–S4, SD.1) ([#20](https://github.com/arcade-cabinet/professor-pixel/issues/20)) ([8f478f8](https://github.com/arcade-cabinet/professor-pixel/commit/8f478f82904d3432eab3fdb8e00efa81fc3988b7))


### Bug Fixes

* **net:** apiRequest no longer silently drops primitive payloads ([#83](https://github.com/arcade-cabinet/professor-pixel/issues/83)) ([5776c99](https://github.com/arcade-cabinet/professor-pixel/commit/5776c9902c876af973e3a0d98dad789a7e8fb65b))
* **tests:** biome cleanups — stale suppression + format drift ([#74](https://github.com/arcade-cabinet/professor-pixel/issues/74)) ([73bfabd](https://github.com/arcade-cabinet/professor-pixel/commit/73bfabdef0787dfcd6c5bac2bfd76f6c3c8340ae))
* **tests:** type python-runner mock fns precisely so MockPyodide satisfies PyodideInterface ([#120](https://github.com/arcade-cabinet/professor-pixel/issues/120)) ([2e3dad3](https://github.com/arcade-cabinet/professor-pixel/commit/2e3dad3fdd3b9d7744066ec5a9c8ce5d53f71f36))


### Refactors

* **hooks:** migrate useMediaQuery to useSyncExternalStore ([#52](https://github.com/arcade-cabinet/professor-pixel/issues/52)) ([372154e](https://github.com/arcade-cabinet/professor-pixel/commit/372154e44d49f9c130649625decbb07c90db3e46))


### Documentation

* 07-deploy preview cmd — add --base + --strictPort ([#33](https://github.com/arcade-cabinet/professor-pixel/issues/33)) ([0cd8cf2](https://github.com/arcade-cabinet/professor-pixel/commit/0cd8cf2946caaa513534ec08c0d46593a7e00647))
* fold-forward gemini findings from [#31](https://github.com/arcade-cabinet/professor-pixel/issues/31) ([#32](https://github.com/arcade-cabinet/professor-pixel/issues/32)) ([b65272f](https://github.com/arcade-cabinet/professor-pixel/commit/b65272fe56af439b5390ec802231091c6007c0bf))
* post-[#30](https://github.com/arcade-cabinet/professor-pixel/issues/30) consolidation — pillars 06+07, plan archive, deploy runbooks ([#31](https://github.com/arcade-cabinet/professor-pixel/issues/31)) ([e5cb28f](https://github.com/arcade-cabinet/professor-pixel/commit/e5cb28f059430837d172563ed1c47aab11f5e680))
* **state:** reflect dep-cleanup wave + 4-PR consolidation sequence ([#39](https://github.com/arcade-cabinet/professor-pixel/issues/39)) ([2929bf1](https://github.com/arcade-cabinet/professor-pixel/commit/2929bf1e730ea6afc69c8321dd1fc812b057c466))

## [Unreleased]

### Added

- Repository documentation overhaul (`README.md`, `AGENTS.md`, `STANDARDS.md`, `CHANGELOG.md`, full `docs/` set, frontmatter on all root + `docs/` markdown). _(docs/standards-overhaul)_
- `release-please` configuration and a `release.yml` workflow to automate version bumps and notes from Conventional Commits.
- `dependabot.yml` for weekly npm + GitHub Actions dependency PRs (minor/patch grouped).

## [1.0.0] — initial development (2025-09 → 2025-09)

The project was developed iteratively in public from the first commit through the v0.1.0 cut. The summary below groups ~150 commits by theme rather than enumerating each one. Use `git log` for the full history.

### Added — Platform & onboarding

- Conversational, mascot-driven game-development platform with **Pixel** as the guide.
- Guided wizard flow with A/B choices for game type (platformer, RPG, dungeon, racing, puzzle, adventure, space).
- WYSIWYG visual editor with drag-and-drop and component property editing.
- Live preview of assembled games inside the platform.
- Game export as a zip with README and runnable PyGame source.
- Project gallery with publish/unpublish flow.
- User accounts with secure login and password reset; profile editing with avatar upload.

### Added — Code execution & grading

- Pyodide-powered in-browser Python execution.
- Custom PyGame simulator that intercepts draw calls and renders to HTML5 canvas.
- Real-time PyGame rendering with improved error reporting.
- Rule-based grading and validation of student code.
- Interactive `input()` prompts inside the browser-hosted Python runtime.

### Added — Content

- Multi-step Python lessons covering core programming concepts.
- Pre-built game components for Title Screen → Gameplay → End Credits, with stage-specific conditional content per game type.
- Curated Kenney and PSX-style asset libraries; categorized asset browser; 3D model preview demo.

### Added — Infrastructure

- Vite + React 18 + TypeScript client; Express + TypeScript server (tsx in dev, esbuild bundle in prod).
- Drizzle ORM schema for users, lessons, and progress (Neon Postgres in prod, in-memory dev).
- shadcn/ui + Radix + Tailwind design system.
- Multi-resolution Playwright test suite, Vitest unit + integration suites with MSW + Pyodide fixtures, Selenium cross-browser legacy harness.
- Replit dev plugins for hot reload and runtime error overlays.
- Initial CI and deploy workflows.

### Changed

- Conversational copy iterated across many passes to be plain-language, encouraging, and non-patronizing.
- Wizard persistence and navigation history added; flow restructured so dialogue transitions precede UI actions.
- Mobile-first layout passes for phones and tablets; edge-swipe gestures; system dark-mode awareness.
- Yarn dialogue files migrated to JSON for the wizard.

### Fixed

- Numerous loading, layout, and execution-flow issues caught by the multi-resolution Playwright suite.
- Code-execution stability after grading pass.
- Asset-loader reliability and pagination on the asset browser.

[Unreleased]: https://github.com/arcade-cabinet/professor-pixel/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arcade-cabinet/professor-pixel/releases/tag/v1.0.0
