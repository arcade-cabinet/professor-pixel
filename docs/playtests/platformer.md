---
title: Platformer Playtest
updated: 2026-05-04
status: current
domain: product
summary: Wizard playtest notes for the platformer game type
---

# Platformer Game Playtest

## Starting Point
- Click "Build a Game with Pixel"
- Pixel appears: "Hey there, game creator! Ready to make something amazing?"
- Options presented:
  - "Something jumpy and bouncy!" ✅ SELECTED
  - "Pew pew! Space battles!"
  - "I want to make people think"
  - "SPEED! Going really, really fast!"
  - "An epic adventure with heroes and quests"
  - "Dark dungeons, monsters, and treasure!"

## After Selection
- Pixel says: "Awesome! I LOVE platformers! There's something so satisfying about nailing that perfect jump!"
- Follow-up: "Let's build this scene by scene - first up: your title screen!"
- Action: `transitionToSpecializedFlow`
- **PROBLEM**: Flow should transition to platformer-flow.json but gets stuck

## Expected Flow (from platformer-flow.json)
### Stage 1: Title Screen Building
1. **Background Selection**
   - "Let's set the mood! Pick a background that shows off your platformer world."
   - Options: outdoor, sky backgrounds
   - **WEAK POINT**: No A/B choice here, just asset browser

2. **Character Preview**
   - "Now let's pick your hero! They'll bounce on the title screen to show off."
   - Options: hero sprites
   - **WEAK POINT**: Again, just asset browser, no meaningful choice

3. **Title Music**
   - "Every platformer needs catchy title music! Pick something upbeat."
   - **WEAK POINT**: Just another asset picker

### Stage 2: Level Selection Design
- **A/B CHOICE**: World map vs Simple grid
- This is good! Meaningful choice that affects game structure

### Stage 3: Gameplay Mechanics
1. **Movement Style** (GOOD A/B)
   - A: Floaty jump - variable height with air control
   - B: Realistic - fixed arc physics
   
2. **Walking Speed** (GOOD A/B)
   - A: Speedy - Fast-paced gameplay
   - B: Careful - Precision platforming

### Stage 4: World Building
- **Platform Types**: Moving vs Static (GOOD A/B)
- **Enemy Behavior**: Patrol vs Chase (GOOD A/B)
- **Collectibles**: Just asset selection (WEAK)
- **Power-ups**: Just asset selection (WEAK)

### Stage 5: Combat (if chosen)
- **Shooting vs Melee** (GOOD CHOICE)
- Then component variants (GOOD A/B)

### Stage 6: Level Progression
- Linear vs Branching paths (GOOD A/B)
- Checkpoint system choices

### Stage 7: Boss Battle
- **WEAK POINT**: Just "pick a boss sprite" - no meaningful choices
- Should have: Boss pattern A/B, arena design choices

### Stage 8: Victory
- **Celebration Style**: Confetti vs Fireworks (GOOD A/B)
- Score display choices

## CRITICAL WEAK POINTS

1. **Title Screen Building**: Three consecutive asset pickers with no choices
   - SOLUTION: Add A/B variants for title screen layouts
   - Example: "Animated title" vs "Static title with effects"

2. **Asset Selection Fatigue**: Too many "pick an asset" steps in a row
   - SOLUTION: Group related assets into themed packages
   - Example: "Forest Pack" vs "Desert Pack" (includes background + platforms + decorations)

3. **Boss Section**: Just sprite selection, no gameplay decisions
   - SOLUTION: Add boss behavior patterns as A/B choice
   - Add arena design choice (open vs obstacles)

4. **No Scene Previews**: User can't see what they're building
   - SOLUTION: Show preview after each major section

## MISSING MULTI-SCENE OPPORTUNITIES

1. **Title → Gameplay Transition**
   - Need: "Press Start" animation style (fade vs slide)
   
2. **Death/Respawn Sequence**
   - Currently missing entirely
   - Need: Respawn effect choice (fade in vs drop from sky)

3. **Level Complete Sequence**
   - Missing transition between levels
   - Need: Victory dance vs Stats screen

4. **Game Over Screen**
   - Not mentioned in flow at all
   - Need: Retry options, score display style