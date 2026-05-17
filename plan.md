#General Game Idea:
Really fun and kind of realistic drifting game. 3d game in HTML and javascript using three.js.
Short drifting runs, earning xp and money. Upgrading car (=xp and money multiplier, does not change handling) and track (=earning multiplier). Doing same track again.
Incremental-like: Do first track, upgrade etc, buy second track = able to earn more money, unlock track 3, etc.
Buy second driver with money for the first track, who drives the first track and passively earn money (uses the best lap of the player = recorded = ghost driver = the better the high score for that track the better the passive income.
Focus: Fun and nice handling. The rest is secondary.
Art style: Low poly, 3d, flat colors
Realistic: Car body is basically a floating physics object above the ground. 4 virtual springs keep it off the ground (tunable in debug mode). Acceleration = force in forward (acc) or backwards (brakes) direction. Permanent force to stop moving car sideways = traction simulation. So that means, that the tires do not need to get simulated. Only the car body. The car tires are just purely visual and only need to be adjuster to touch the ground the right way, while the body is able to slightly roll.


#Step-by-step plan for implementation:

##Phase 1. Project Foundation (Three.js + Basic Scene) — DONE
- Set up HTML file with Three.js.
- Create a perspective camera (third-person), a scene, and a renderer.
- Add basic lighting (ambient + directional + point light for low-poly shading).
- Create a simple green flat plane, with a gray low-poly track (no markers / barriers yet - just a flat plane) – placeholder.

##Phase 2. Car Physics Core (Realistic Floating Body) — DONE, UPDATED
- Car object: a Group containing:
  - Visual low-poly body (now just a gray box, at later stage: van glb file in folder "assets/cars").
  - 4 visual wheels (CylinderGeometry) – purely visual, positioned at corners.
- Physics state: position (Vector3), velocity (Vector3), angular velocity (roll/pitch for visual only).
- **Four virtual springs** (one per corner):
  - Each spring independently calculates compression based on that corner's height (accounting for body roll/pitch tilt).
  - Corner height = position.y + cornerXOffset * sin(roll) - cornerZOffset * sin(pitch)
  - Corner vertical velocity includes angular velocity: velocity.y + rollRate * cornerX - pitchRate * cornerZ
  - Force per spring = springConstant * compression - dampingConstant * cornerVy
  - Springs act as tethers (work in both push and pull directions) to prevent instability when body tilts.
  - Spring torques computed via cross product r × F for roll and pitch restoring forces.
  - Additional roll/pitch torques from lateral and longitudinal forces acting at ground level vs center of mass height.
  - Angular damping: exp(-3.0 * dt) per frame to prevent oscillation.
  - Moment of inertia: I_roll = (1/12)*mass*(width²+height²), I_pitch = (1/12)*mass*(length²+height²).
  - Car body roll and pitch are now physically derived from spring forces — softer springs visibly increase body roll/pitch.
- **Traction simulation** (simplified):
  - Lateral force: constant force opposing sideways velocity (sideways drag).
  - Formula: lateralForce = -sidewaysVelocity * lateralDragCoefficient (tunable).
  - No tire slip simulation – keeps handling arcade but predictable.
- **Acceleration & braking**:
  - Apply forward force (relative to car's forward direction) when accelerator is pressed.
  - Apply backward force when brake is pressed (or reverse if speed < small threshold).
  - No clutch / gearbox – simple force-based.
- Debug mode overlay: GUI to tune spring constants, damping, lateral drag, acceleration force, gravity.

##Phase 3. Track & Environment (Low-Poly, Flat Colors) — DONE
- Procedural generated. Not a loop. Has a starting and end point. Use trees glb objects in the assets folder.
- Each track has:
  - A unique ID, name, base money multiplier, cost to unlock.
  - A "best lap time" (player's record) and a stored ghost data (positions per frame, if toggle for ghosts is activated, standard off for now).
- Collision detection: track boundaries (guardrails) reset car to last safe position + slow down.
- Visual style: flat-shaded meshes (MeshStandardMaterial with flat shading), vibrant colors.

##Phase 4. Drifting & Scoring System — DONE
- Detect drift by comparing car's forward direction vs. velocity direction (angle > threshold).
- While drifting: accumulate drift points per second (based on speed + angle).
- Lap completion: when car passes start/finish line in correct order.
- End of run (lap finish or manual reset):
  - Calculate total XP and money:
    - Base = drift points * track multiplier * car multiplier.
    - Money = base * moneyMultiplierFromUpgrades.
  - If lap time is new best → update best time and save ghost replay (array of positions/rotations per frame).

##Phase 5. Upgrades & Multipliers (No Handling Change) — DONE
- Car upgrades (purchasable with money):
  - Increase XP multiplier (e.g., x1.0 → x1.5 → x2.0).
  - Increase money multiplier (separate or combined).
  - Does NOT change handling/physics.
- Track upgrades (per track):
  - Increase earning multiplier for that track.
  - Visual changes (optional).
- Store upgrades in simple JSON.

##Phase 6. Passive Income: Second Driver + Ghost — DONE
- Player can buy a "second driver" for a specific track (cost: $5,000 for track_1).
- Once bought, the second driver automatically earns money over time.
- Earning rate = baseIncome * trackMoneyMultiplier / bestLapTime (per second). Faster best lap = more runs per time = more income.
- No best lap time yet = 0 earning rate (driver needs a ghost to follow).
- Passive income accumulates even during active runs. Updated every frame via game loop.
- HUD display (top-right): earning rate ($/min), accumulated money, Collect button.
- Collect button and auto-collect on new run start both bank accumulated money to player wallet.
- Second driver purchase available in Upgrade Shop under "Second Driver" section.
- Best lap times persisted in localStorage via PassiveIncome module (separate save key: driftgame_passive).
- Auto-saves accumulated money every 5 seconds.
- Files: js/passive.js (PassiveIncome class), updated js/main.js, updated index.html (HUD + shop section).

##Phase 7. Track Unlock Progression — DONE
- Start with Track 1 only (Country Road).
- 5 tracks total, each with unique layout, increasing base money multiplier, and visual complexity:
  - Track 1: Country Road (x1.0, free, lvl 1)
  - Track 2: Mountain Pass (x1.5, $5,000, lvl 3)
  - Track 3: Coastal Highway (x2.0, $15,000, lvl 6)
  - Track 4: Desert Canyon (x3.0, $40,000, lvl 10)
  - Track 5: Arctic Circuit (x4.5, $100,000, lvl 15)
- To unlock Track N+1, player must reach required level AND pay unlock cost.
- Tracks arranged side-by-side on the map (offset in X), all visible simultaneously.
- Active track is full opacity; inactive tracks are dimmed (30% opacity).
- Track select screen (press T): lists available and locked tracks with unlock/select buttons.
- Unlock state persisted in localStorage via UpgradeSystem (unlockedTracks array).
- New RunTracker created on track switch (fixes stale track reference bug).
- Ground plane, fog distance, shadow camera, and camera far plane scaled for the larger scene.
- HUD shows current track name below best time.
- Files: updated js/track.js (5 track defs with offset, setDimmed method), js/upgrades.js (unlock logic), js/main.js (all tracks in scene, track switching), index.html (track select overlay, HUD track name).

##Phase 8. UI & Menus (HTML Overlay) — DONE
- Real-time HUD:
  - Speed, drift angle, current drift points, lap time.
  - Money and XP totals.
- Upgrade shop (car upgrades, track upgrades, second driver purchase).
- Track selection / unlock panel.
- Passive income display & collect button (or automatic adding).
- Debug panel toggle (for spring tuning).

##Phase 9. Ghost Driver & Replay System — DONE
- Record during each lap: array of {time, position, rotation}.
- Store best lap replay in memory and localStorage.
- When player races and has a best ghost for that track:
  - Spawn a semi-transparent ghost car that follows the recorded path.
- Used for passive income calculation (second driver's "skill" = best lap time).

##Phase 10. Polish & "Fun Handling" Focus — DONE
- Body roll/pitch now physics-based from per-corner springs (already completed in Phase 2 update).
- Tune spring constants so car rolls slightly in turns.
- Add simple particle effects (dust/smoke) during drift (sprites or point cloud).
- Low-poly trees, road lines, and a simple sky gradient or cube map.
- Sound effects (engine rev, drift squeal – optional basic WebAudio).
- Ensure framerate stable; optimize draw calls.

##Technical Notes
- Use `Clock` for delta time.
- Car forces: F = m * a, update velocity, integrate position.
- Spring forces: per-corner compression from body tilt, torque via cross product r × F.
- Roll/pitch angular state: rollRate, pitchRate with moment of inertia integration.
- Springs are tethered (bidirectional) to prevent force asymmetry instability.
- Ghost data: record every ~0.033s (30fps), use interpolation for smooth replay.
- Passive income: updated per frame in game loop using delta time, persisted to localStorage.
- Save keys: 'driftgame_save' (upgrades), 'driftgame_passive' (passive income + best lap times).
