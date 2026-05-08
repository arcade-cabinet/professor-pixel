---
title: Pillar 5 — Design system
updated: 2026-05-04
status: current
domain: design
---

# Pillar 5 — Design system

> Tokens, layout, components, and the Pixel mascot's voice. The product-vision side of design lives in [`../DESIGN.md`](../DESIGN.md); this file is the implementation contract.

## Tokens

Theme tokens are CSS variables on `:root` (defined in `app/index.css`) and exposed to Tailwind via `tailwind.config.ts`.

| Token | Role |
|-------|------|
| `--background` | Page background. Warm, soft — never `#fff`. |
| `--foreground` | Body text. Tuned for WCAG AA contrast on `--background`. |
| `--muted` | Backgrounds for secondary surfaces (cards, sections). |
| `--muted-foreground` | Secondary text on muted surfaces. |
| `--primary` | Pixel-pink — used for CTAs and active state. |
| `--primary-foreground` | Text on primary surfaces. |
| `--accent` | Hover / focus states. |
| `--destructive` | Errors and dangerous actions. |
| `--border` | Hairline strokes between surfaces. |
| `--ring` | Focus-ring color. Visible — don't `outline: none`. |

**Rules:**
- No hardcoded hex values in components. Use the semantic token (`bg-background`, `text-foreground`, `text-muted-foreground`, …) or extend the token set in `tailwind.config.ts` first.
- No harsh black-on-white or white-on-black. Brand palette is warm.

## Type scale and spacing

Tailwind defaults unless explicitly extended in `tailwind.config.ts`. **No ad-hoc `text-[13px]` or `mt-[7px]`** — if the scale is wrong, extend the config.

## Component primitives

`app/components/ui/` hosts shadcn/ui primitives over Radix:

| Primitive | When |
|-----------|------|
| `Dialog` | Anything modal. Traps focus. Don't roll your own. |
| `DropdownMenu`, `Menubar` | Menus and command surfaces |
| `Popover`, `Tooltip` | Floating context |
| `Tabs`, `Accordion` | Disclosure |
| `Button` | All clickable actions. Variants: `default`, `secondary`, `ghost`, `destructive`. |
| `Input`, `Textarea` | Form fields. Always paired with `<label htmlFor=…>`. |
| `Toast` | Transient feedback |

**Rule:** Don't reinvent menus, dialogs, popovers, or tooltips. They're in `app/components/ui/` already.

## Layout

- **Dense by design.** The audience is kids on small screens. Minimize negative space; tighter is better than airier.
- **Mobile-first.** Most users will be on tablets or smaller. Test at `375×667` (iPhone 8) before claiming a layout works.
- **Container queries** for component-level responsiveness; viewport breakpoints for page-level shape.

## Accessibility

- **Keyboard-first.** Every interactive control must be reachable and operable with Tab + Enter/Space.
- **Focus visible.** `--ring` is always rendered. Never `outline: none` without an equivalent visible alternative.
- **Color is not the only signal.** Status, errors, and selection convey meaning beyond hue (icon, text, weight).
- **Label every input.** `<label htmlFor>` or `aria-label`. Placeholder text is not a label.
- **`alt` text mandatory** for `<img>`; empty (`alt=""`) is acceptable for decorative images.
- **WCAG 2.2 AA contrast.** Brand palette is checked.
- **Modals trap focus.** Use Radix Dialog.
- **`prefers-reduced-motion`.** Wrap non-essential motion in `@media (prefers-reduced-motion: reduce)` or use Framer Motion's `useReducedMotion`.

## Pixel mascot — voice

- **Plain language.** No jargon unless just defined. No "instantiate", no "polymorphism", no "JSON payload" without an explanation kids can hold.
- **Encouraging, not patronising.** "Yeah, that worked." Not "Wow, amazing job, superstar!"
- **Curious, not corrective.** When something breaks, ask "What do you think happened?" before "Here's the fix."
- **Concise.** One idea per bubble. If it needs three sentences, it needs to be a panel.
- **Funny is good. Mean is not.** Self-deprecating beats sarcastic.

The full philosophy lives in [`../DESIGN.md`](../DESIGN.md). This pillar's job is to keep the implementation aligned with that voice — short bubbles, no lectures, friendly error states.

## Pixel components

| Component | Path | Role |
|-----------|------|------|
| `PixelPresence` | `app/components/pixel/presence.tsx` | Page-level overlay; minimizable, draggable, never modal |
| `PixelMenu` | `app/components/pixel/menu.tsx` | Pixel's right-click / dot-menu actions |
| `PixelMinimized` | `app/components/pixel/minimized.tsx` | The shrunken state — still visible, never lost |
| `MinimizeAnimation` | `app/components/pixel/minimize-animation.tsx` | The Framer transition |

Pixel reacts to events (success cheer, error sympathy, hint nudge). Reactions stay short and respect reduced-motion.

## See also

- [`../DESIGN.md`](../DESIGN.md) — product vision, mascot voice philosophy, conversational UX
- `app/components/ui/` — primitives source
- `app/components/pixel/` — mascot components
- `tailwind.config.ts` — token-to-utility wiring
- `app/index.css` — token definitions
