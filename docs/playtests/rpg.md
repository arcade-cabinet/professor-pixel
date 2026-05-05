---
title: RPG Playtest
updated: 2026-05-04
status: current
domain: product
summary: Wizard playtest notes for the RPG game type
---

# RPG Game Playtest

## Starting Point
- Selected: "An epic adventure with heroes and quests"
- Pixel: "Ooh, an epic adventure! I'm getting goosebumps already! ⚔️"
- Follow-up: "Let's craft your epic quest from start to finish!"
- **CLOSED (commit 21dba7b):** transitionToSpecializedFlow now loads `/rpg-flow.json` correctly via the post-restructure `app/components/wizard/dialogue-engine.tsx`. Pinned by `tests/integration/wizard-dialogue-engine.test.tsx`. The original report referenced the deleted legacy `client/src/components/wizard-dialogue-engine.tsx`.

> **Engineering status:** The remaining `**WEAK**` / `**FIX**` items below are flow-JSON content authoring tasks (theme packs, A/B framing, missing scenes). The dialogue engine supports them today; what's missing is the content. Tracked as content-design work, not engineering.

## Expected Flow (from rpg-flow.json)
### Stage 1: Title/Main Menu
1. **Background**: Fantasy landscape selection
   - **WEAK**: Just asset picker, no thematic choice
   - **FIX**: Add "Epic Castle" vs "Mysterious Forest" as A/B

2. **Title Music**: Epic orchestral
   - **WEAK**: Another asset picker
   - **FIX**: "Heroic Fanfare" vs "Mysterious Ambience" as A/B

### Stage 2: Character Creation
1. **Class Selection** (GOOD A/B/C)
   - Warrior: Strength-based
   - Mage: Magic-based  
   - Rogue: Agility-based

2. **Starting Weapon** (Based on class - GOOD)
   - Warrior: Sword vs Axe
   - Mage: Staff vs Wand
   - Rogue: Daggers vs Bow

### Stage 3: World Design
1. **World Type**
   - Open World vs Linear Dungeons (GOOD A/B)

2. **Village Hub**
   - **WEAK**: No choices about village layout
   - **FIX**: "Bustling Market" vs "Quiet Hamlet" 

### Stage 4: Combat System
1. **Battle Style** (EXCELLENT A/B)
   - Real-time: Action combat
   - Turn-based: Strategic combat

2. **Magic System**
   - Mana-based vs Cooldown-based (GOOD A/B)

### Stage 5: Quest Structure
- **COMPLETELY MISSING**: No quest type choices
- **NEED**: 
  - Main quest style: "Linear Story" vs "Branching Paths"
  - Side quests: "Fetch Quests" vs "Mini-Bosses"

### Stage 6: Inventory System
1. **Inventory Type**
   - Grid-based vs List-based (GOOD A/B)

2. **Equipment Slots**
   - **WEAK**: No choice given
   - **FIX**: "Simple (weapon/armor)" vs "Complex (6+ slots)"

### Stage 7: Level Progression
1. **Experience System**
   - XP from enemies vs XP from quests (GOOD A/B)

2. **Skill Trees**
   - **WEAK**: Not implemented
   - **NEED**: "Linear Upgrades" vs "Branching Paths"

### Stage 8: Boss Encounters
- **VERY WEAK**: Just "pick a boss sprite"
- **NEED**:
  - Boss phases: "Single Phase" vs "Multi-Phase"
  - Boss arena: "Empty Arena" vs "Environmental Hazards"
  - Victory: "Loot Drop" vs "Story Progression"

## CRITICAL WEAK POINTS

1. **No Shop/Merchant System**
   - Completely missing
   - Need: Shop UI choice, currency system

2. **No Dialogue System**
   - RPGs need dialogue!
   - Need: "Text boxes" vs "Speech bubbles"
   - Need: "Linear dialogue" vs "Choice trees"

3. **No Save System Mentioned**
   - Critical for RPGs
   - Need: "Checkpoints" vs "Manual saves"

4. **Death/Game Over Missing**
   - Need: "Respawn at checkpoint" vs "Load last save"

## MISSING SCENES

1. **Opening Cutscene**
   - Story introduction style
   - "Text crawl" vs "Animated scenes"

2. **Level Up Sequence**  
   - Visual feedback for progression
   - "Fanfare + stats" vs "Subtle notification"

3. **Quest Complete**
   - Reward presentation
   - "Chest opening" vs "NPC thanks"

4. **Final Boss Sequence**
   - Multi-stage encounter missing
   - Victory cutscene missing

5. **Credits/Ending**
   - No ending sequence at all
   - Need: "Credits roll" vs "Epilogue scenes"