---
title: Racing Playtest
updated: 2026-05-04
status: current
domain: product
summary: Wizard playtest notes for the racing game type
---

# Racing Game Playtest

## Starting Point
- Selected: "SPEED! Going really, really fast!"
- Pixel: "VROOM VROOM! I can already feel the adrenaline! 🏎️"
- Follow-up: "Let's build something FAST - track by track!"
- **BROKEN**: Should load racing-flow.json but stuck

## Expected Flow (from racing-flow.json)
### Stage 1: Title Screen
1. **Track Preview Background**
   - **WEAK**: Just asset picker
   - **FIX**: "City Streets" vs "Desert Rally" as theme choice

2. **Vehicle Selection**
   - **WEAK**: Just sprite picker
   - **FIX**: Add vehicle class first
     - "Speed Racer" vs "Heavy Duty"
     - "Drift King" vs "All-Terrain"

3. **Title Music**
   - **WEAK**: Asset picker again
   - **FIX**: "Electronic Beats" vs "Rock Anthem"

### Stage 2: View Perspective (EXCELLENT A/B)
- Top-down: Classic arcade view
- Side-scrolling: Endless runner style

### Stage 3: Track Design
1. **Track Environment**
   - City vs Desert vs Space (GOOD MULTI)

2. **Track Complexity** (GOOD A/B)
   - Simple loops
   - Complex with shortcuts

### Stage 4: Vehicle Physics (GOOD A/B)
- Arcade: Instant response
- Realistic: Momentum and drift

### Stage 5: Racing Mechanics
1. **Boost System** (GOOD A/B)
   - Collectible boosts
   - Rechargeable meter

2. **Obstacles**
   - **WEAK**: Just sprite selection
   - **FIX**: "Static Barriers" vs "Moving Traffic"

### Stage 6: Opponents
- **VERY WEAK**: No AI choices
- **NEED**:
   - "Rubber Band AI" vs "Realistic AI"
   - "Ghost Race" vs "Live Opponents"

### Stage 7: Power-ups
- **WEAK**: Asset selection
- **FIX**: Power-up system choice
   - "Mario Kart Style" vs "Need for Speed Style"

### Stage 8: Progression
- **MISSING ENTIRELY**
- **NEED**:
   - "Tournament" vs "Time Trials"
   - "Unlock System" for new tracks/cars

## CRITICAL WEAK POINTS

1. **No Lap System**
   - How many laps? Time limit?
   - Need: "3 Laps" vs "Time Attack"

2. **No Starting Grid**
   - Race start style missing
   - Need: "Rolling Start" vs "Grid Start"

3. **No Collision System**
   - What happens on crash?
   - Need: "Bounce Off" vs "Spin Out"

4. **No Ranking/Position Display**
   - How to show race position?
   - Need: "Leaderboard" vs "Position Only"

## MISSING SCENES

1. **Pre-Race**
   - Countdown sequence
   - "3-2-1-GO!" vs "Traffic Lights"

2. **Mid-Race Events**
   - Weather changes?
   - "Dynamic Weather" vs "Static Conditions"

3. **Finish Line**
   - Victory celebration missing
   - "Checkered Flag" vs "Fireworks"

4. **Post-Race**
   - Results screen style
   - "Podium" vs "Stats Screen"

5. **Garage/Customization**
   - Completely missing
   - Need: "Color Picker" vs "Decal System"