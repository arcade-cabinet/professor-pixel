---
title: Playtest Analysis (cross-cutting)
updated: 2026-05-05
status: current
domain: product
summary: Critical issues observed across all game-type playtests
---

# Comprehensive Playtest Analysis

## CRITICAL ISSUES ACROSS ALL GAME TYPES

### 1. Transition Failure
**PROBLEM**: `transitionToSpecializedFlow` action doesn't work
- Game type selection happens
- Intro message appears  
- Flow gets stuck, specialized flow never loads
- **FIX NEEDED**: Dialogue engine must detect action and load new flow file

### 2. Asset Picker Fatigue
**PROBLEM**: Too many consecutive "pick an asset" screens
- Platformer: 3 in a row (background, character, music)
- Dungeon: 8+ asset pickers!
- Racing: 3 in a row
- **FIX**: Bundle into themed packs with A/B choices
  - "Forest Pack" vs "Desert Pack" (includes matching assets)
  - "Retro Style" vs "Modern Style"

### 3. Missing A/B Choices
**WEAK AREAS** where we just have asset pickers but need choices:
- Title screen layout style
- Boss behavior patterns
- Enemy AI strategies
- Power-up systems
- Visual effect styles

## MISSING CRITICAL SCENES

### Universal (All Games Need)
1. **Start/Menu Transition**
   - How does "Press Start" work?
   - Need: "Fade In" vs "Slide Transition"

2. **Death/Respawn**
   - What happens when player dies?
   - Need: "Instant Respawn" vs "Death Animation"
   - **Engine prerequisites CLOSED (2026-05, player-experience pillar):** wizard `gameAssembled` action gate + `isWizardComplete` derived state + per-component property panel both support a Death/Respawn scene authored as a sub-flow. Remaining work is content authoring (per-game flow-JSON edits), not engineering.

3. **Pause Menu**
   - Never mentioned in any flow
   - Need: "Simple Resume" vs "Full Menu"

4. **Settings/Options**
   - Volume, controls, difficulty
   - Need: "Basic Settings" vs "Advanced Options"

### Game-Specific Missing Scenes

**Platformer**:
- Level complete transition
- Checkpoint system
- Death → Respawn sequence

**RPG**:
- Dialogue sequences
- Shop/merchant interaction  
- Quest completion
- Level up sequence
- Save/load system

**Dungeon**:
- Floor transitions (going deeper)
- Secret room discovery
- Rest/save points
- Mini-map display

**Racing**:
- Pre-race countdown
- Lap completion
- Finish line sequence
- Post-race results
- Garage/customization

**Puzzle**:
- Tutorial/teaching
- Hint system
- Level selection screen
- Solution celebration

**Space**:
- Launch sequence
- Wave transitions
- Shield/damage feedback
- Game over → retry

## STRONGEST PATTERNS TO REPLICATE

### Good A/B Choices (Keep These)
1. **Movement Styles**: Floaty vs Realistic (platformer)
2. **Combat Systems**: Real-time vs Turn-based (RPG)
3. **View Perspectives**: Top-down vs Side-scroll (racing)
4. **Physics**: Arcade vs Realistic (multiple games)
5. **Difficulty**: Easy/Medium/Hard with clear differences

### Good Multi-Choice Patterns
1. **Dungeon Room Layouts**: Linear/Maze/Caverns
2. **Game Types**: Initial selection works well
3. **World Themes**: Fantasy/Sci-fi/Horror

## RECOMMENDED FLOW STRUCTURE

### Stage-by-Stage Template
Each game should follow this pattern:

**STAGE 1: Theme & Style** (2-3 A/B choices)
- Visual theme pack (bundles multiple assets)
- Music/audio style
- UI style (minimal vs detailed)

**STAGE 2: Core Mechanics** (3-4 A/B choices)
- Movement system
- Primary action (jump/shoot/solve)
- Physics model

**STAGE 3: World/Level Design** (2-3 choices)
- Structure (linear vs open)
- Complexity (simple vs complex)
- Progression (locked vs unlocked)

**STAGE 4: Challenge/Enemies** (2-3 choices)
- AI behavior
- Difficulty scaling
- Power balance

**STAGE 5: Polish/Effects** (2 choices)
- Victory style
- Particle effects
- Transitions

## PRIORITY FIXES

### Immediate (Blocking Progress)
1. **CLOSED (commit 21dba7b):** `transitionToSpecializedFlow` in dialogue engine — verified working in the post-restructure dialogue-engine.tsx by the integration test in `tests/integration/wizard-dialogue-engine.test.tsx`. The original report referenced the legacy `client/src/components/wizard-dialogue-engine.tsx`, which was deleted; the replacement at `app/components/wizard/dialogue-engine.tsx` handles the transition correctly.
2. **CLOSED (commit 21dba7b):** Remove single-option "continue" buttons — `src/wizard/utils.ts` `CONTINUE_PATTERN` + `isSingleContinueOption` collapse pure-navigation continue-pattern single options to `<ContinueButton>`. `dialogue-engine.tsx` `advance()` now navigates the collapsed option's `next`. Tests in `tests/unit/wizard-utils.test.ts` + integration test pin the behaviour.
3. **CLOSED (commit 21dba7b):** Auto-advance after asset selection — `app/components/wizard/universal.tsx` `handleAssetSelection` already calls `advance()` after closing the browser. The original report was stale relative to the post-restructure code.

### High Priority (Major UX Issues) — content design, not engineering
These are flow-JSON content authoring tasks, picked up by content authors as separate non-engineering work. The engine supports them today; what's missing is the content.
1. Bundle asset selections into theme packs
2. Add missing death/respawn sequences
3. Add transition scenes between major sections

### Medium Priority (Polish) — content design, not engineering
1. Add preview displays after each stage
2. Add more sophisticated boss patterns
3. Include settings/pause menu options

### Low Priority (Nice to Have) — out of scope for this codebase
1. Achievement systems
2. Leaderboards
3. Multiplayer options
4. Advanced customization

## IMPLEMENTATION STRATEGY

1. **Fix the engine first** - Get specialized flows loading
2. **Restructure flows** - Implement bundled choices
3. **Add missing scenes** - Fill gaps in game flow
4. **Test complete paths** - Ensure no dead ends
5. **Polish transitions** - Smooth scene changes