---
title: Space Shooter Playtest
updated: 2026-05-04
status: current
domain: product
summary: Wizard playtest notes for the space-shooter game type
---

# Space Shooter Playtest

## Starting Point
- Selected: "Pew pew! Space battles!"
- Pixel: "YES! Space shooters are so cool! I'm already imagining the laser sounds... pew pew! 🚀"
- Follow-up: "We'll build an epic galactic battle scene by scene!"
- **CLOSED (commit 21dba7b):** transitionToSpecializedFlow now loads `/space-flow.json` correctly via the post-restructure `app/components/wizard/dialogue-engine.tsx`. Pinned by `tests/integration/wizard-dialogue-engine.test.tsx`. The original report referenced the deleted legacy `client/src/components/wizard-dialogue-engine.tsx`.

> **Engineering status:** The remaining `**WEAK**` / `**FIX**` items below are flow-JSON content authoring tasks (theme packs, A/B framing, missing scenes). The dialogue engine supports them today; what's missing is the content. Tracked as content-design work, not engineering.

## Expected Flow (from space-flow.json)
### Stage 1: Title Screen
1. **Space Background**
   - **WEAK**: Just asset picker
   - **FIX**: "Deep Space" vs "Asteroid Field" vs "Near Planet"

2. **Ship Selection**
   - **WEAK**: Just sprite picker  
   - **FIX**: Ship class choice first
     - "Fighter: Fast & Fragile" vs "Bomber: Slow & Tough"

3. **Music**
   - **WEAK**: Asset picker
   - **FIX**: "Epic Orchestra" vs "Synthwave"

### Stage 2: Movement (GOOD A/B)
- Classic arcade: 8-way movement
- Twin-stick: Move and aim separately

### Stage 3: Enemies
- **WEAK**: Just sprite selection
- **FIX**: Enemy behavior patterns
  - "Wave Formations" vs "Random Spawns"
  - "Predictable Patterns" vs "AI Hunters"

### Stage 4: Shooting System (Component A/B)
- Rapid fire: Hold to spray
- Charged shots: Hold to power up

### Stage 5: Power-ups
- **WEAK**: Sprite selection only
- **FIX**: Power-up system
  - "Weapon Upgrades" vs "Ship Abilities"
  - "Temporary" vs "Permanent"

### Stage 6: Effects (GOOD A/B)
- Colorful arcade explosions
- Realistic space debris

### Stage 7: Score System
- Points for kills
- Combo multipliers

### Stage 8: Boss
- **WEAK**: Just sprite pick
- **FIX**: Boss mechanics
  - "Bullet Hell Patterns" vs "Weak Points System"
  - "Single Phase" vs "Multi-Phase"

### Stage 9: Victory (GOOD A/B)
- Fireworks in space
- Epic medal ceremony

## CRITICAL WEAK POINTS

1. **No Shield/Health System**
   - How much damage can player take?
   - Need: "Shield + Health" vs "Lives System"

2. **No Wave Structure**
   - How do enemy waves work?
   - Need: "Endless Waves" vs "Designed Levels"

3. **No Background Scrolling**
   - Static or moving space?
   - Need: "Auto-scroll" vs "Free Movement"

4. **No Weapon Variety**
   - Just one gun type?
   - Need: "Multi-weapon" vs "Upgrade Path"

## MISSING SCENES

1. **Launch Sequence**
   - How does game start?
   - "Hangar Launch" vs "Warp In"

2. **Between Waves**
   - What happens between enemy waves?
   - "Shop/Upgrade" vs "Brief Respite"

3. **Death Animation**
   - Ship destruction
   - "Explosion" vs "Escape Pod"

4. **Game Over**
   - Failure screen
   - "Retry Wave" vs "Start Over"

5. **Leaderboard**
   - Score tracking
   - "Local High Score" vs "Daily Challenge"