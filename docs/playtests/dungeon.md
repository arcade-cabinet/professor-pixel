---
title: Dungeon Crawler Playtest
updated: 2026-05-04
status: current
domain: product
summary: Wizard playtest notes for the dungeon game type
---

# Dungeon Crawler Playtest

## Starting Point
- Selected: "Dark dungeons, monsters, and treasure!"
- Pixel: "A DUNGEON CRAWLER! Dark corridors, treasure, monsters lurking in shadows!"
- Follow-up: "We'll build your dungeon floor by floor, room by room!"
- **CLOSED (commit 21dba7b):** transitionToSpecializedFlow now loads `/dungeon-flow.json` correctly via the post-restructure `app/components/wizard/dialogue-engine.tsx`. Pinned by `tests/integration/wizard-dialogue-engine.test.tsx`. The original "gets stuck" report referred to the deleted legacy `client/src/components/wizard-dialogue-engine.tsx`.

> **Engineering status:** The remaining `**WEAK**` / `**FIX**` items below are flow-JSON content authoring tasks (theme packs, A/B framing, missing scenes). The dialogue engine supports them today; what's missing is the content. Tracked as content-design work, not engineering.

## Expected Flow (from dungeon-flow.json) - VERY COMPREHENSIVE!
### Stage 1: Dungeon Theme (EXCELLENT A/B/C)
- Classic stone dungeon with torches
- Sci-fi space station corridors  
- Haunted crypt with undead

### Stage 2: Entrance Design
1. **Entrance Background**
   - **WEAK**: Just asset picker
   - **FIX**: "Grand Gates" vs "Hidden Passage" as A/B choice

### Stage 3: Hero Selection
- **WEAK**: Just sprite picker
- **FIX**: Add class choice first (Fighter/Rogue/Mage)

### Stage 4: Movement System (EXCELLENT A/B)
- Grid-based: Classic tile movement
- Free movement: Smooth exploration

### Stage 5: Room Generation (EXCELLENT MULTI-CHOICE)
- Linear path with side rooms
- Branching maze with dead ends
- Open caverns with passages

### Stage 6: Room Assets
- **WEAK**: Multiple asset picker
- **FIX**: "Stone Dungeon Pack" vs "Crystal Cave Pack"

### Stage 7: Lighting System (EXCELLENT A/B/C)
- Torch radius: Limited vision
- Room-based: Full room visibility
- No darkness: Everything visible

### Stage 8: Monsters
- **WEAK**: Just sprite selection
- **FIX**: Add behavior patterns
  - "Wandering Patrols" vs "Ambush Predators"
  - "Solo Enemies" vs "Enemy Groups"

### Stage 9: Combat (GOOD A/B)
- Hack and slash: Fast attacks
- Tactical: Timing and positioning

### Stage 10: Treasure System
- **WEAK**: Just asset picking
- **FIX**: Add treasure distribution
  - "Random Chests" vs "Secret Rooms"
  - "Common Drops" vs "Rare Treasures"

### Stage 11: Inventory (GOOD A/B)
- Simple bag: Unlimited
- Grid inventory: Space management

### Stage 12: Traps
- **WEAK**: Just sprite selection
- **FIX**: Trap behavior choices
  - "Visible Warnings" vs "Hidden Dangers"
  - "Instant Death" vs "Damage Over Time"

### Stage 13: Sound & Music
- **WEAK**: Two separate asset pickers
- **FIX**: "Horror Pack" vs "Adventure Pack"

### Stage 14: Boss Chamber
1. **Boss Selection**: Just sprite (WEAK)
2. **Boss Strategy** (GOOD A/B)
   - Arena battle with patterns
   - Chase sequence through collapsing dungeon

### Stage 15: Treasure Room
- Background selection (WEAK)
- **FIX**: "Gold Mountains" vs "Ancient Artifacts"

### Stage 16: Escape Sequence (GOOD A/B)
- Timer-based escape run
- Peaceful exit with treasure

### Stage 17: Victory Screen (GOOD A/B)
- Treasure counts up with coins
- Instant loot summary

## CRITICAL WEAK POINTS

1. **Too Many Asset Pickers**
   - 8+ separate asset selection screens!
   - Solution: Bundle into themed packs

2. **No Mini-Map System**
   - Essential for dungeon crawlers
   - Need: "Full Map" vs "Fog of War"

3. **No Key/Door System**
   - Missing locked doors and keys
   - Need: "Color-coded keys" vs "Universal keys"

4. **No Merchant/Shop**
   - Where to spend treasure?
   - Need: "Shop Rooms" vs "Traveling Merchant"

## MISSING SCENES

1. **Floor Transition**
   - Going deeper into dungeon
   - "Stairs Down" vs "Elevator/Portal"

2. **Death Sequence**
   - What happens when you die?
   - "Restart Floor" vs "Lose Everything"

3. **Secret Discovery**
   - Finding hidden areas
   - "Wall Push" vs "Floor Switch"

4. **Rest Areas**
   - Safe zones in dungeon
   - "Campfire" vs "Save Crystal"

## STRONGEST FLOW
This actually has the most comprehensive flow but suffers from:
- Too many granular asset selections
- Missing some key dungeon mechanics (keys, secrets)
- Could benefit from bundled choices