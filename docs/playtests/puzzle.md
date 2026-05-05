---
title: Puzzle Playtest
updated: 2026-05-04
status: current
domain: product
summary: Wizard playtest notes for the puzzle game type
---

# Puzzle Game Playtest

## Starting Point
- Selected: "I want to make people think"
- Pixel: "Ooh, smart choice! There's nothing like that 'aha!' moment when you solve a tricky puzzle!"
- Follow-up: "Let's create your brain-teasing challenge!"
- **CLOSED (commit 21dba7b):** transitionToSpecializedFlow now loads `/puzzle-flow.json` correctly via the post-restructure `app/components/wizard/dialogue-engine.tsx`. Pinned by `tests/integration/wizard-dialogue-engine.test.tsx`. The original "fails" report referred to the deleted legacy `client/src/components/wizard-dialogue-engine.tsx`.

> **Engineering status:** The remaining `**WEAK**` / `**FIX**` items below are flow-JSON content authoring tasks (theme packs, A/B framing, missing scenes). The dialogue engine supports them today; what's missing is the content. Tracked as content-design work, not engineering.

## Expected Flow (from puzzle-flow.json)
### Stage 1: Puzzle Type (GOOD A/B/C)
- Match-3: Color matching
- Box Pushing: Sokoban-style
- Physics: Falling and stacking

### Stage 2: Visual Theme
- **WEAK**: Just asset selection
- **FIX**: Theme packs
  - "Candy Theme" vs "Jewel Theme" (for match-3)
  - "Warehouse" vs "Fantasy" (for box pushing)

### Stage 3: Grid Setup
1. **Grid Size** (GOOD A/B)
   - 8x8: Standard
   - 10x10: More complex

2. **Board Shape**
   - **MISSING**: All boards rectangular
   - **NEED**: "Square" vs "Hexagonal" vs "Custom Shape"

### Stage 4: Game Rules
1. **Win Condition** (GOOD MULTI)
   - Reach target score
   - Clear all pieces
   - Limited moves

2. **Special Pieces**
   - **WEAK**: Not defined
   - **NEED**: "Power-ups" vs "Obstacles"

### Stage 5: Difficulty
- Easy: No pressure, hints
- Medium: Some thinking
- Hard: Brain melting + timer

## CRITICAL WEAK POINTS

1. **No Tutorial System**
   - Puzzles need teaching!
   - Need: "Interactive Tutorial" vs "Text Instructions"

2. **No Hint System Details**
   - How do hints work?
   - Need: "Highlight Moves" vs "Solve One Step"

3. **No Level Progression**
   - How do levels increase?
   - Need: "Linear Levels" vs "Star Unlock System"

4. **Physics Puzzle Underdeveloped**
   - Just mentions it exists
   - Need full physics choices:
     - "Gravity Only" vs "Full Physics"
     - "Destruction" vs "Construction"

## MISSING SCENES

1. **Level Select Screen**
   - How to choose levels?
   - "Grid Menu" vs "Path Map"

2. **Puzzle Solution**
   - Victory feedback
   - "Explosion Effects" vs "Peaceful Clear"

3. **Stuck/Help Screen**
   - What if player is stuck?
   - "Skip Level" vs "Show Solution"

4. **Daily Challenge**
   - Missing competitive element
   - "Daily Puzzle" vs "Endless Mode"