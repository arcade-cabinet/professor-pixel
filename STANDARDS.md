---
title: STANDARDS
updated: 2026-05-04
status: current
domain: technical
---

# STANDARDS.md

Non-negotiables for code, design, and accessibility. If a rule here conflicts with anything in `AGENTS.md` or a profile, this file wins.

## TypeScript

- **`strict: true`** is mandatory. The repo's `tsconfig.json` already enables it; never weaken it per file.
- **No `any`.** `@typescript-eslint/no-explicit-any` is `"warn"` today; treat it as `"error"`. New code adding `any` will be rejected. Use `unknown` + a type guard, or fix the type.
- **No `as` casts** except (a) narrowing `unknown` after a runtime check, (b) the `as const` assertion. Anything else needs a comment explaining why TS can't infer it.
- **`noEmit: true`** — type-checking is the build for `tsc`. The actual JS output comes from Vite.
- **Module boundaries.** Use the `@/` (`./app/*`), `@lib/` (`./src/*`), and `@assets/` (`./app/assets/*`) aliases — never relative paths that reach across a domain boundary.
- **Schema-first.** Cross-domain data is defined as a Zod schema in `src/types/schema.ts` (or the relevant domain folder); the TypeScript type is `z.infer<typeof Schema>`. Don't hand-write a type and a validator that can drift. See [`docs/pillars/03-lesson-engine.md`](docs/pillars/03-lesson-engine.md) for the canonical lesson schema and [`docs/pillars/04-grading.md`](docs/pillars/04-grading.md) for grading rule schemas.

## ESLint / Prettier

- **`npx eslint .` must be clean** before merge. No `// eslint-disable-next-line` without a one-line justification on the same comment. (The CI lint job is currently advisory — `continue-on-error: true` — while the codebase is brought to a clean state. New code is held to the standard at review time and the CI gate flips to blocking once the existing backlog is addressed; tracked in [`docs/STATE.md`](docs/STATE.md).)
- **Prettier is the formatter.** Settings: `printWidth: 100`, single quotes, 2-space indent, semicolons, `trailingComma: 'es5'`, LF line endings. Don't argue with Prettier — fix the config or accept it.
- **No unused variables.** Allowed: prefix with `_` (e.g., `_unused`). The rule respects this.
- **Naming convention.** camelCase for variables and functions, PascalCase for types and components, SCREAMING_SNAKE_CASE only for true compile-time constants.
- **No `console.*`** in shipped code except `console.error` for genuinely unexpected paths. Use `@lib/monitoring/console-logger` when an audit trail is needed.

## React

- **Functional components only.** No class components. Hooks for state and effects.
- **`react-hooks/exhaustive-deps`** is `error`-level — fix the dependency array, don't suppress the lint.
- **Keys must be stable.** Don't use array index for keys when the list reorders.
- **Components stay small.** If a file is >300 lines or a component does >1 thing, split it. The "reader can hold it in their head" test is the gate.
- **Accessibility primitives via Radix / shadcn.** Don't reinvent menus, dialogs, popovers, tooltips, etc. — they're in `app/components/ui/`.

## Accessibility (`jsx-a11y` + Testing Library)

- **`plugin:jsx-a11y/recommended` must pass.** No exceptions for "we'll fix it later."
- **Keyboard-first.** Every interactive control must be reachable and operable with Tab + Enter/Space. Focus rings stay visible — don't `outline: none` without an equivalent visible alternative.
- **Color is not the only signal.** Status, errors, and selection must convey meaning beyond hue (icon, text, weight).
- **Label every input.** Use `<label>` (with `htmlFor`) or `aria-label`. Placeholder text is not a label.
- **Modals and dialogs trap focus.** Use Radix Dialog; don't roll your own.
- **`alt` text is mandatory** for `<img>` — empty (`alt=""`) is acceptable for decorative images, but the attribute must be present.
- **WCAG 2.2 AA contrast** for text against background. Brand palette must be checked against this; see *Visual design* below.

## Visual design

- **Warm, soft colors.** No harsh black-on-white or white-on-black. Theme tokens live in CSS variables (`--background`, `--foreground`, etc.) and are wired through Tailwind via `tailwind.config.ts`.
- **No hardcoded hex values** in components. Reach for the semantic token (`bg-background`, `text-foreground`, `text-muted-foreground`, …) or extend the token set in `tailwind.config.ts` first.
- **Type scale + spacing scale come from Tailwind defaults** unless explicitly extended. Don't add ad-hoc `text-[13px]` or `mt-[7px]` in components.
- **Mascot voice (Pixel).** Friendly, plain-language, no jargon. See [`docs/DESIGN.md`](docs/DESIGN.md) for tone philosophy and [`docs/pillars/05-design-system.md`](docs/pillars/05-design-system.md) for the implementation contract (tokens, components, voice rules).
- **Layout efficiency.** Minimize negative space; the platform is dense by design (the audience is kids on small screens). When in doubt, tighter is better than airier.
- **Animations honor `prefers-reduced-motion`.** Wrap non-essential motion in a `@media (prefers-reduced-motion: reduce)` check or use Framer Motion's `useReducedMotion`.

## Testing

- **Every new feature ships with a test.** Vitest for logic, Playwright for user-visible behavior.
- **`data-testid` is mandatory** for interactive elements that e2e tests target. Format: `{action}-{target}` (`button-select-jump`), or `{type}-{description}-{id}` for dynamic items.
- **No `it.todo`, no `.skip`, no commented-out tests.** Either fix the test or delete it with a real reason in the commit body.
- **Test names describe behavior, not implementation.** "renders the wizard with a Next button" — not "calls useWizard".
- See [`docs/TESTING.md`](docs/TESTING.md) for runners, coverage, and CI integration.

## Security

- **There is no server.** User-authored Python runs in Pyodide, in the browser, full stop. The seam is the PyGame simulator.
- **No secrets in source.** `.env` is gitignored. The current build has no required secrets — the SPA is fully static.
- **Validate every untrusted input** at the boundary with Zod (or the equivalent runtime guard). Trust nothing from network fetches, postMessage, or `localStorage` reads.
- **No `dangerouslySetInnerHTML`** with user-derived content. If it's unavoidable, sanitize with a vetted library and document why in a comment.

## Git & PRs

- **Conventional Commits**, always. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.
- **Squash-merge** to `main`. Branch names mirror the commit type: `feat/wizard-jump-tuning`, `fix/asset-loader-race`, `docs/standards-overhaul`.
- **One topic per PR.** Drive-by refactors get their own PR.
- **CI must be green** before merge. No `--admin` merges, no force-pushing to `main`.
- **release-please owns versioning.** Don't bump `package.json` versions by hand.

## Documentation

- **Every `.md` in the repo root and in `docs/` carries frontmatter** (`title`, `updated`, `status`, `domain`). Update `updated` when you touch the file.
- **Behavior-changing PRs update docs in the same PR.** Stale docs are bugs.
- **Comments explain *why*.** What the code does is the code's job; the comment exists for the reader who'd otherwise be surprised.
