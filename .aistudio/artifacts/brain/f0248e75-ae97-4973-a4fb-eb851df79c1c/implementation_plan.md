# Project BreachPoint: Pre-Game Staging Lobby, Weapon FX & Ballistics Overhaul

A comprehensive overhaul of the BreachPoint micro-voxel FPS engine, introducing a 3D military pre-game staging lobby with weapon turntable inspection, a full micro-step ray-marching ballistic penetration engine with real-world material resistance thresholds and cumulative voxel degradation, restored procedural weapon firing FX (dynamic point-light muzzle flashes, physical brass shell ejections, recoil kickback), and decoupled match customization controls.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been confirmed and integrated into this implementation plan:

- **Confirmed Decision 1 (Lobby Presentation)**: 3D Military Staging Lobby featuring an interactive real-time weapon turntable (rotatable, zoomable) and tactical operator preview, keeping the match simulation and round timer paused until the player clicks "DEPLOY TO MATCH".
- **Confirmed Decision 2 (Ballistic Simulation)**: Full micro-step ray-marching ballistics engine calculating bullet mass ($m$), velocity ($v$), kinetic energy ($E_k = \frac{1}{2}m v^2$), penetration resistance per material density/hardness, cumulative voxel structural degradation, and angle-of-incidence trajectory deflection upon breach exit.
- **Confirmed Decision 3 (Bot Roster & Difficulty)**: Pre-configured Dynamic Tactical roster with 4 bots of mixed AI competencies (Recruit, Regular, Hardened, Veteran), dynamically configurable before deployment.
- **Confirmed Decision 4 (Zero-GC Optimization)**: Object-pooled brass shells, muzzle spark particles, smoke puffs, and WebAudio procedural voice channels to guarantee zero garbage-collection frame drops during automatic fire.

---

### 1. Overview & Core Concept

- **What It Delivers**:
  1. **Pre-Game Staging Lobby**: Players spawn into a sleek military terminal backdrop with an interactive 3D gunsmith turntable, allowing full customization of primary/secondary weapons, attachments (optics, barrels, muzzles, grips), camo finishes, audio/graphics quality sliders, and match rule toggles (bot count, difficulty, friendly fire, minimap radar, airdrops).
  2. **Material-Based Ballistic Penetration Engine**: Replaces instant raycasting with a physics-driven ray-marcher. Every voxel type (Glass, Plywood, Brick, Concrete, Sheet Metal, Sandbags, Armor Steel) possesses calibrated density ($\text{kg/m}^3$), hardness rating, and durability. High-caliber rounds (7.92mm Mauser, .50 AE) penetrate multiple layers of wood or thin sheet metal with calibrated kinetic decay and exit deflection, while chipping away outer stone; low-caliber rounds (9mm Parabellum) deform or ricochet on hardened surfaces.
  3. **Cumulative Structural Degradation**: Voxels track damage accumulation. Weakened structures yield lower resistance to successive rounds, enabling wall breaching, peep-hole creation, and tactical shoot-throughs.
  4. **Weapon Visual & Audio FX Overhaul**: Restored dynamic point-light flashes with rapid decay, particle-based muzzle smoke and sparks, physics-based brass shell ejection with ground bounce, procedural viewmodel recoil kick and recovery, and spatial WebAudio gunshots with mechanical click-clack actions and environmental reverb.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Lobby Initialization**: App boots into the Staging Area. The 3D camera smoothly orbits the player's customized weapon on a military workbench turntable with ambient volumetric spotlights and dust motes.
2. **Gunsmith & Loadout Customization**: Players cycle through weapons (M4A1, MP5, Kar98k, .50 GS, RPG-7), toggle optics (Iron Sights, Holographic, 4x ACOG, Sniper Scope), muzzle devices (Compensator, Tactical Suppressor), and tactical camos (Urban Digital, Matte OD Green, Carbon Fiber, Desert Splinter, Gold Damascus). The 3D model updates in real time on the turntable.
3. **Match Rules & Settings**: Players adjust bot density (0 to 8 bots), AI difficulty thresholds, airdrop events, friendly fire, and graphics presets (Shadows, Post-Processing, Particles) via an ergonomic slide-out panel.
4. **Deploy Transition**: Clicking **DEPLOY TO MATCH** or pressing `Space` initiates a cinematic 0.8s camera push from the armory bench into first-person operator stance, enables pointer lock, and starts match orchestration with audio cues.
5. **In-Match Combat**: Firing produces intense dynamic light flashes illuminating nearby destructible walls, brass shells ejecting to the right with physics tumble, procedural recoil bucking the weapon, and bullets penetrating or ricocheting off surfaces with material-specific sparks/dust.

#### Visual Styling & Token Palette
- **Aesthetic**: Tactical Modern Military HUD (Charcoal Gray, Tactical Amber, Muted Emerald, Warning Crimson).
- **Background Atmosphere**: Industrial concrete armory with directional overhead warm spot lighting and subtle dust particles.
- **Typography**: Clean, condensed monospace and sans-serif pairings (`JetBrains Mono` / `Inter`) with high-contrast military telemetry readouts.

---

### 3. Key Architectural & Technical Decisions

- **Decision 1: Full Micro-Step Ray-Marching Ballistics (`BallisticsEngine.ts`)**:
  - *Approach*: Advances bullets in discrete 0.05m increments along the trajectory vector. At each step, evaluates the intersecting voxel material properties from the `MaterialRegistry`.
  - *Energy Equation*:
    $$\Delta E_k = \rho_{\text{material}} \times H_{\text{hardness}} \times \Delta x \times C_{\text{drag}}$$
    If $E_k > 0$, the bullet continues through the voxel with reduced velocity $v' = \sqrt{\frac{2 E_k}{m}}$. When exiting a boundary at angle $\theta$, deflection $\Delta \vec{d} = \vec{N} \times \sin(\theta) \times (1 - \text{elasticity})$ alters trajectory.
  - *Why*: Delivers true tactical wallbanging, bullet drop, realistic material chipping, and distinct combat utility between SMG 9mm, AR 5.56 NATO, and Sniper 7.92mm.

- **Decision 2: Decoupled State & Zero-GC Pools (`weaponFX.ts`, `MaterialRegistry.ts`)**:
  - *Approach*: Pre-instantiate fixed pools of 64 shell casing meshes, 256 particle quads, and pre-allocated Raycast hit structures. Reuse active indices with circular ring buffers.
  - *Why*: Eliminates garbage collection stutter during sustained full-auto firing bursts.

- **Decision 3: Seamless Lobby-to-Match State Machine**:
  - *Approach*: Single Three.js scene containing both the staging armory bench area and the 48m × 48m killhouse compound. When in `'lobby'` mode, the camera is locked to the turntable target with orbit controls enabled; upon `'playing'`, the camera smoothly interpolates to the player head rig and activates FPS pointer lock.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BREACHPOINT CLIENT ENGINE                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────────────┐         ┌───────────────────────────┐   │
│   │   PRE-GAME STAGING UI    │         │     IN-MATCH HUD LAYER    │   │
│   │  - Gunsmith Turntable    │         │  - Tactical Compass Bar   │   │
│   │  - Match Settings Panel  │         │  - Rotating Radar Minimap │   │
│   │  - Bot Roster Customizer │         │  - Dynamic Hitmarkers     │   │
│   │  - Deploy Trigger        │         │  - Weapon Telemetry & Mag │   │
│   └─────────────┬────────────┘         └─────────────▲─────────────┘   │
│                 │ (Match Start Event)                │                 │
│   ┌─────────────▼────────────────────────────────────┴─────────────┐   │
│   │                   CLIENT ORCHESTRATION (App.tsx)               │   │
│   │    - GameState Machine: 'lobby' | 'staging' | 'playing'        │   │
│   │    - MatchConfig: Bots, Difficulty, Penetration, Graphics      │   │
│   └──────┬──────────────────────┬────────────────────────────┬─────┘   │
│          │                      │                            │         │
│   ┌──────▼─────────────┐ ┌──────▼─────────────────────┐ ┌────▼───────┐ │
│   │ THREE.JS RENDERER  │ │ MATERIAL BALLISTICS ENGINE │ │ WEAPON FX  │ │
│   │ - PBR Shaders      │ │ - Micro-step ray-march     │ │ - Muzzle   │ │
│   │ - Dynamic Shadows  │ │ - Density/Hardness Matrix  │ │   Flash    │ │
│   │ - Camera Turntable │ │ - Kinetic Energy Decay     │ │ - Shell    │ │
│   │ - Voxel Meshes     │ │ - Cumulative Degradation   │ │   Ejection │ │
│   │ - Debris Chunks    │ │ - Deflection & Ricochet    │ │ - Recoil   │ │
│   └────────────────────┘ └──────────────┬─────────────┘ └────┬───────┘ │
│                                         │                    │         │
│   ┌─────────────────────────────────────▼────────────────────▼─────┐   │
│   │       PROCEDURAL WEBAUDIO & ZERO-GC PARTICLE POOLS             │   │
│   │ - Spatial Sound Synth (Gunfire, Ricochet, Debris, Mechanical)  │   │
│   │ - Object-Pooled Shell Casings & Bullet Impact Smoke/Sparks     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### New & Refactored Modules
1. `src/engine/materials.ts`: Complete physical property definitions for all game materials (Glass, Wood, Sheet Metal, Brick, Concrete, Sandbag, Hardened Steel) including density, hardness, sound profile, impact particle color, and penetration resistance.
2. `src/engine/ballistics.ts`: Core ray-marching ballistic simulator with step-wise energy loss, exit deflection, cumulative voxel degradation tracking, and material-specific impact spawning.
3. `src/engine/weaponFX.ts`: Pooled muzzle flash point lights, particle systems (sparks, dust puffs, smoke), animated brass shell casings with physical bounce, and viewmodel recoil impulse generator.
4. `src/ui/Lobby.tsx`: Comprehensive pre-game staging interface with 3D turntable interaction, attachment toggles, camo switcher, bot roster sliders, and deploy button.
5. `src/engine/weapons.ts`: Updated weapon definitions with real-world ballistics parameters (bullet mass in grams, muzzle velocity in m/s, caliber, penetration coefficient, recoil impulse vectors).
6. `src/App.tsx`: Refactored main loop supporting seamless transition between Lobby mode and Play mode, integrating the new ballistics engine, weapon FX, and match configuration.

---

### Verification Guidance
- **Lobby Verification**: On load, verify the game starts in the 3D Staging Lobby with the rotating weapon model. Ensure the game timer and bot movement are completely frozen until "DEPLOY TO MATCH" is pressed.
- **Turntable & Customization**: Test rotating/inspecting the weapon, changing attachments (suppressor, scope), and cycling camos.
- **Weapon FX Verification**: Fire in automatic mode. Confirm bright dynamic point-light flashes illuminating the weapon and surrounding walls, brass shells ejecting and bouncing on the floor, viewmodel kicking backward with natural recovery, and distinct firing audio.
- **Ballistics & Penetration**: Fire standard 5.56mm or 7.92mm rounds through thin wooden doors/partitions; verify exit holes, dust particles, and penetration hits on bots behind cover. Fire 9mm rounds at solid concrete; verify sparks, ricochets, and lack of penetration.
- **Zero-GC & Performance**: Verify consistent 60+ FPS during sustained fire and destruction events without frame drops.
