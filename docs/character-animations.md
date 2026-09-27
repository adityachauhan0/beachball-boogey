# Shared chibi sports animations

For continuation, start with [animation-handoff.md](animation-handoff.md): authoritative files, scene navigation, safe editing/export, script hazards, evidence and runtime integration steps.

2026-09-27. The user requested jump and kick animations based on the existing game actions, including running, kicking and headers. Animations were authored through the configured live Blender MCP on the existing shared 17-bone skeleton. No new joints or variant-specific animation copies were introduced.

## Deliverables

- Editable source: [chibi-lineup.blend](../assets/blender/chibi-lineup.blend).
- Preserved pre-animation source: [chibi-lineup-before-animation.blend](../assets/blender/chibi-lineup-before-animation.blend).
- Self-contained GLB: [chibi-animated.glb](../public/assets/characters/chibi-animated.glb).
- Clip timing, contact markers and Blender validation: [animation-manifest.json](../assets/blender/animation-manifest.json).
- Actual Three.js loader/mixer validation: [export-validation.json](../assets/blender/export-validation.json).
- Interactive asset preview: [preview page](../assets/blender/animation-preview/index.html), available with the existing Vite server at `http://127.0.0.1:5173/assets/blender/animation-preview/index.html`. Choose any action, pause/replay, change playback speed, or drag the camera.
- Blender-rendered representative poses and [animation reel](../assets/blender/animation-preview/animations.mp4) live under `assets/blender/animation-preview/`.

The saved Blender file opens on **Animation showcase • Play timeline**. Play the timeline to see the shared clips on all three characters. Timeline markers identify the clips. Use **SWAPPABLE SKINS • one rig** to edit the individual Actions on `ChibiRig`; show one `Skin_*` mesh at a time. Actions are marked as Blender assets and have fake users so they survive saving.

## Clip inventory

| Clip | Seconds | Repeat | Strike time |
| --- | ---: | --- | ---: |
| `idle` | 1.20 | Loop | — |
| `run` | 0.40 | Loop | — |
| `jump` | 0.70 | Once | — |
| `ground_kick` | 0.30 | Once | 0.10 |
| `aerial_kick` | 0.55 | Once | 0.20 |
| `header` | 0.35 | Once | 0.10 |
| `jump_header` | 0.60 | Once | 0.24 |
| `bicycle_kick` | 0.55 | Once | 0.20 |
| `celebration` | 0.85 | Once | — |
| `loss` | 0.80 | Once | — |

Authoring is sampled at 60 fps with quaternion rotations and linear interpolation. Takeoff, apex, strike and landing markers are included where relevant. The manifest supplies marker times because ordinary glTF does not transfer Blender pose markers as animation events. Each one-shot returns to the neutral pose; idle/run have matching endpoints. The `root` bone only rises vertically. The armature object never travels; game position and facing remain separate. The bicycle kick rotates around the hip and uses scissoring feet, with extra clearance for the tall rabbit ears during inversion.

## Relationship to the existing game

Inspected `src/main.ts`, movement, feedback/contact, rally and opponent code and opened the local practice game. Current presentation remains cubes: ordinary player contacts get a 0.22-second tilt, rival returns get a 0.18-second tilt, and the powered player pose spins/lifts for 0.55 seconds. Player speed is 4.8 units/s. Shared legal contact heights are 0.35–2.8 units. There is no separate manual jump or header command.

The new clips cover low foot contacts, airborne foot contacts, head-height contacts and powered bicycle contacts. Jump/header clips are authored assets, not newly added game mechanics. Any future adapter should select cosmetics from accepted contact events and their height/quality; it must not change shot eligibility or wait for a visual marker before accepting a shot. When triggered after acceptance, begin at the strike marker or use the fast follow-through portion. Anticipation is available for preview or a pre-contact cosmetic pose. Advance mixers only with simulation delta; preserve pause, reset, reduced motion and the existing event fan-out.

The GLB contains one scene, one skeleton, three `Skin_*` groups and ten animations. A Blender mesh with material slots becomes multiple glTF primitives (24 total); those primitives all bind to the same skeleton. Hide the two inactive skin groups after loading. Exported forward is +Z; the game contract uses -Z, so the adapter must explicitly apply a half-turn. Do not normalize each variant from its full bounding box: hair and ears differ while skeleton proportions and joint positions are identical.

## Verification and limits

- Evaluated every authored frame across all three skins: no floor penetration, nonzero movement in each action, seamless idle/run endpoints and neutral recovery.
- Loaded the actual GLB with the installed official Three.js GLTFLoader and AnimationMixer, verified all ten durations, one scene, 17 bones and a shared skeleton for all primitives.
- Sampled exported motion at 21 times per clip; floor clearance passed. This caught an initial inter-frame bicycle intersection, which was corrected before final export.
- Inspected Blender renders of running, jumps, both kicks, both headers, bicycle kick, celebration and loss; inspected exported running and jump-header playback in the browser. These establish asset playback, not a completed game integration.
- Gameplay code and controls were not changed. Exact character appearance remains the approximation recorded in [character-recreation.md](character-recreation.md). Match-camera contact alignment, gameplay adapter integration, net/body clipping under actual movement, reduced motion behavior and full Layer 6 match/rematch regressions remain later work.

Authoring tools: `assets/blender/animate_characters.py`; validation: `verify_animations.py` through MCP and `node assets/blender/verify-export.mjs`. `create_showcase.py` authors the timeline scene; `render_animation_preview.py` renders its preview. `export_animations.py` is a recovery/export utility; normal authoring already exports the GLB. No new package or model service is required.
