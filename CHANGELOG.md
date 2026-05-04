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
