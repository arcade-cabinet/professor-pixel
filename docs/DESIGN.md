---
title: Design
updated: 2026-05-04
status: current
domain: product
---

# Design

> Product vision, identity, and UX principles. The "why" behind every interaction.

## Vision

**Pixel's PyGame Palace** teaches kids to build real Python games. Not coding worksheets, not blocks-that-secretly-aren't-code — actual PyGame, written in real Python, running live in their browser, with assembly help when they want it and a blank canvas when they don't.

Every choice in the product reinforces three beliefs:

1. **Kids can write real code.** We don't dumb down syntax or hide the language.
2. **Confidence comes from shipping.** Every session ends with something the user can run, share, and rebuild.
3. **The teacher is a friend, not a gatekeeper.** Pixel never lectures, never withholds, never patronises.

## Pixel — the mascot

Pixel is a cyberpunk-styled guide who is **always present** but **never in the way**. She is a peer, not an authority figure.

### Voice

- **Plain language.** No jargon unless we just defined it. No "instantiate", no "polymorphism", no "JSON payload" without an explanation kids can hold.
- **Encouraging, not patronising.** "Yeah, that worked." Not "Wow, amazing job, superstar!"
- **Curious, not corrective.** When something breaks, Pixel asks "What do you think happened?" before "Here's the fix."
- **Concise.** One idea per bubble. If it needs three sentences, it needs to be a panel — not a barrage of speech bubbles.
- **Funny is good. Mean is not.** Self-deprecating beats sarcastic. Punching up beats punching at the user.

### Behaviour

- Pixel is a `PixelPresence` overlay (`client/src/components/pixel-presence.tsx`) — minimisable, draggable, never modal. The user can shrink her without losing her.
- Pixel reacts to events: idle wave, success cheer, error sympathy, hint nudge. Reactions are short and respect `prefers-reduced-motion`.
- Pixel narrates the wizard flow but **doesn't narrate the editor.** When the user is heads-down coding, she gets out of the way.

## Conversational UX

The core platform shape is a conversation, not a form.

### A/B choices, not menus

Initial decisions are framed as two natural options:

> Pixel: *"Want me to walk you through it, or jump straight into the code?"*
> [ Walk me through ]   [ Jump in ]

Two visible paths. No hidden third option that needs a "More" button. If a third path matters, it gets surfaced explicitly later in the flow.

### Linear and forgiving

The guided wizard moves forward in a single line: **Title Screen → Gameplay → End Credits**, with stage-specific content swapping based on the game type. The user can:

- Step backward at any point without losing later progress.
- Restart a stage without restarting the project.
- Drop into the WYSIWYG editor at any time and come back to the wizard later.

### Game types

The wizard adapts to seven game types: **platformer, RPG, dungeon, racing, puzzle, adventure, space**. Each type swaps in:

- Stage-specific copy from Pixel (a platformer talks about *jumping*, a racing game talks about *steering*).
- A different starter component palette (paddle/ball for puzzle, ship/projectile for space, …).
- A curated asset shortlist matched to the genre's visual language.

See [`docs/playtests/`](playtests/) for per-game-type playtest notes.

## Visual identity

### Palette

**Warm, soft, low-contrast.** No jet-black, no surgical white, no neon-on-black. We use CSS variable tokens (`--background`, `--foreground`, `--primary`, `--muted`, …) wired through Tailwind in `tailwind.config.ts`; the *values* of those tokens carry the warmth.

- Light mode is the default. Dark mode follows system preference and uses warmer dark tones (no pure `#000`).
- Status colors (success, warning, danger) are tuned to feel like a friendly teacher's pen, not a hospital monitor.
- Hardcoded hex values in components are a code-review failure — extend the token set in `tailwind.config.ts` instead.

### Typography

- Tailwind's default scale, plus a friendly display face for headings and Pixel's bubbles.
- Body text is comfortably large (kids on laptops, kids on phones). Line length capped at the standard `max-w-prose`.

### Layout

- **Dense by intent.** Minimise negative space — the audience is on small screens and lives in a layout where every pixel earns its keep.
- Mobile-first. Wizard, editor, and asset browser all collapse cleanly down to a phone.
- Edge-swipe gestures on mobile for back/forward navigation.

### Motion

- Pixel's animations are short, springy, and looping rarely.
- All non-essential motion respects `prefers-reduced-motion`.
- Framer Motion handles entrance/exit; CSS transitions handle hover/focus.

## Accessibility-first

Accessibility is a **product feature**, not a compliance afterthought. The audience includes kids with motor, visual, cognitive, and screen-reader needs.

- **Keyboard parity.** Every wizard step, every editor action, every asset browse operation is fully reachable with Tab + Enter/Space.
- **Screen-reader transcripts** for Pixel's bubbles. Visual animations don't replace text — they accompany it.
- **WCAG 2.2 AA contrast** on every theme variant. The warm palette is tuned to meet this; new tokens get checked before merge.
- **No artificial gating.** All lessons are available immediately. We do not lock content behind a streak, a paywall, or "complete the previous lesson". Pixel may *recommend* an order, but the user is in charge.
- **Plain language.** A screen reader hearing the UI text should not parse "instantiate the GameObject"; it should hear "make a new player".

See `STANDARDS.md` for the enforceable rules; this section explains the **why**.

## Educational philosophy

> *Teach concepts, not memorisation.*

- **Concepts before syntax.** "We need the program to remember a number" comes before "this is a variable".
- **Show, then ask.** A working snippet runs before the user is asked to modify it. Reading code is a skill we build before writing.
- **Failure is information.** When code breaks, we surface the error with a kid-readable rewrite (`lib/educational-errors.ts`), then offer a hint, then offer a fix. The user always has a way forward.
- **No artificial difficulty curve.** A six-year-old and a sixteen-year-old can use the same wizard; the depth comes from how far they push the editor afterward.
- **Real Python.** What runs in the lesson is what runs in the export. We don't translate between a "kid language" and "real Python" — they're the same thing, because real Python is fine.

## Surfaces

| Surface | Purpose |
|---------|---------|
| **Home** (`/`) | Conversational entry. Pixel offers the two A/B choices: guided wizard or jump-in editor. Recent projects shown for returning users. |
| **Universal Wizard** (`/wizard`, `/game-wizard`) | JSON-driven flow that walks the user through component selection and project assembly. |
| **Lesson** (`/lesson/:id`) | Structured Python lesson with intro, steps, Monaco editor, run + check buttons. |
| **WYSIWYG editor** | Drag-and-drop visual editor with property inspector, code view, live preview. |
| **Asset browser** | Categorised browser for sprites, backgrounds, audio, effects. |
| **Gallery** | Published student projects, sorted by publish date. |
| **Pixel presence** | Persistent, minimisable mascot overlay across all surfaces. |

## Forbidden patterns

- **Dark patterns.** No streaks-as-shame, no fake urgency, no "you're losing progress" guilt. The user owns their time.
- **Gatekeeping animations.** Loading screens that make the user wait to feel the product is "premium" are forbidden. If it's slow, fix it; don't dress it up.
- **Hidden state.** Anything that affects what the user sees next must be visible or explicitly recoverable. No invisible "you've been opted into the advanced track" toggles.
- **Black/white maximum-contrast surfaces.** Visually loud, and tonally wrong for who we're talking to.

## See also

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the technical pieces fit together
- [`../STANDARDS.md`](../STANDARDS.md) — enforceable rules that protect the design above
- [`playtests/`](playtests/) — per-game-type playtest notes that informed wizard tuning
