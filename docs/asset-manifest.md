# MVP asset manifest

For continuation, start with [animation-handoff.md](animation-handoff.md): authoritative files, scene navigation, safe editing/export, script hazards, evidence and runtime integration steps.

Updated: 2026-09-27. This is the final MVP asset target. Layer 6 now loads the authored animated chibis in gameplay while retaining cubes as a load-failure fallback. Final character fidelity and remaining delivery acceptance are still open.

## Authored beach court package

The user supplied `beach_court_toon_2026-09-27.zip` for the playing-court replacement. Its editable working source is `assets/blender/beach_court_environment.blend`; supplied stills and README are preserved beside it. `public/assets/environments/beach-court.glb` is the runtime export. This is user-supplied project material; no independent third-party provenance or licence claim is inferred from the archive.

Blender MCP measured the authored white lines and net before integration. Runtime coordinates are centralized in `src/game/court.ts`: x `-5.46…5.46`, near/player baseline z `7.99`, far/rival baseline z `-8.27`, net z `0`, net top `1.435`. Movement, aim, scoring, AI, serving and collision now share those measurements. The environment loader retains a minimal sand fallback. The latest fixed-camera appearance bake freezes scenery at frame 1; characters and ball remain animated.

The earlier flat-palette export was rejected and superseded. `assets/blender/export_beach_court.py` now bakes the authored Eevee camera view onto retained 3D geometry, includes the sand cover planes and exports the camera and embedded texture. `src/render/court-appearance.ts` provides exact projective sampling; this 2.97 MB GLB is intended for the fixed match camera. Source `.blend` is preserved. See the latest appearance repair in [Layer 6 handoff](layer-6-handoff.md) for limitations and verification.

## Explicit character requirement

Chibi humans with huge feet/shoes to emphasize arcade soccer. Preserve oversized heads, small bodies, detached round hands, thick outlines, and vivid hair. Shoes must be a primary silhouette feature and the focal point of kicks. Tune proportions at the match camera; visual shoe size must not silently change gameplay collision radius.

## Authored character package

The user subsequently required exact reproduction of three supplied designs on one shared skeleton. This supersedes the two-palette character proposal in the original table below. The saved Blender source and one-skeleton GLB contain all three skins and ten shared clips; see [character-animations.md](character-animations.md). Asset validation passed and runtime integration is implemented; exact visual fidelity remains unfinished.

## Required 3D assets (original MVP planning table)

User-approved authoring tool: **Blender MCP through Codex**, configured and connection-tested on 2026-09-27. See [blender-mcp.md](blender-mcp.md) for setup, source/GLB paths, animation conventions, and integration checks. No final asset was produced by setup; procedural construction remains an available fallback.

| Asset | Quantity | Requirements |
| --- | --- | --- |
| Shared chibi construction | 1 | Articulated head/hair, torso, hands, legs, huge shoes; simple face; usable pivots |
| Player appearance | 1 variant | Blue/cyan palette, distinct hair, huge shoes |
| Rival appearance | 1 variant | Orange/pink palette, contrasting hair, huge shoes |
| Soccer ball | 1 | Recognizable contrasting panels, visible rotation |
| Beach court | 1 | Supplied authored sand court with white boundary lines and teal runoff; integrated |
| Net assembly | 1 | Low mesh, top tape, two posts |
| Ocean/sky backdrop | 1 | Bright horizon, low visual noise |
| Palm tree | 1 construction reused | Stylized trunk/leaves outside play |
| Beach umbrella | 1 construction reused | Simple bright accent outside play |

All can be built procedurally in Three.js. An imported character GLB is optional, not a dependency. Reuse one character construction for two appearances; do not create separate models for poses.

## Animation states

One shared character supports idle, run, ground kick, aerial kick, bicycle kick, celebration, and loss reaction. Procedural transforms are sufficient. Huge shoes need readable swing/follow-through, grounded placement, and inspection for body/net clipping. No animation sprite sheet or external animation service is required.

## 2D textures/materials

| Asset | Quantity | Suggested approach |
| --- | --- | --- |
| Soccer panel pattern | 1 if not modelled | Generated texture, 512–1024 px |
| Sand grain | 1 | Subtle tileable generated texture, 512–1024 px |
| Net grid | 1 if not geometry | Transparent generated pattern, 128–256 px |
| Simple faces | Neutral plus expressive variants | Canvas texture or geometry, shared across characters |
| Particle mask | 1 | Generated dot/star texture |
| UI font | 1 family | System font first; licensed bundled font if needed |

No 2D character sprites are needed: characters and their motion are 3D. Small generated textures may replace downloaded assets.

## Effects and UI assets

Implement these with geometry, pooled particles, CSS, and inline SVG; external image files are unnecessary:

- Character outlines/cartoon materials.
- Cyan player ring, ball ground shadow, predicted landing ring, far-court aim indicator.
- Normal/perfect/power ball trails, contact burst, timing feedback.
- Scoreboard, three-segment power meter, controls hint.
- Play/Rematch buttons, pause overlay, win/loss and fault text.
- Mute/pause icons, loading and keyboard-required notices.

## Audio

Seven short cues: normal kick, bounce, perfect kick, bicycle-kick smash, point scored, match win, match loss. Web Audio synthesis is sufficient; no downloaded sound pack required. Start audio after user interaction and provide mute.

## Optional polish — cut first

Loungers, shoreline foam, extra scenery, extra hair/faces, shoe decals, illustrated logo, richer celebrations, music, crowd/ambient audio. No bleachers or crowd required for the beach MVP.

## Production and verification

- Prioritize character silhouette/huge shoes, then ball/court/net, then cues/effects, then decoration.
- Review at match-camera distance: head and shoes must both read clearly, and player/rival must remain distinguishable.
- Inspect kick poses for shoe/ball contact readability and clipping.
- Bundle runtime assets locally; record source/license/local path for any imports here.
- Reference media provide inspiration; they are not extracted production textures/models.
- Add actual asset paths and completion status as production proceeds.

Minimum package: one articulated chibi construction with two appearances, one ball, one procedural beach scene/net, generated UI/effects/textures, and seven synthesized sound cues.

## Three-character authoring checkpoint — 2026-09-27

The latest explicit user request supersedes the two proposed palette variants for this task: reproduce all three supplied designs, exactly, over one shared skeleton. [Character recreation checkpoint](character-recreation.md) records `assets/blender/chibi-lineup.blend`, three interchangeable single-mesh skins, one shared 17-bone skeleton, preserved reference, render, and validation. Rigging is verified; exact visual matching is **not achieved**. No runtime export/integration or animation clips are complete.

## Shared animation package — 2026-09-27

[Animation handoff](character-animations.md) records ten clips on the existing 17-bone skeleton, including jump, ground/aerial kicks, standing/jumping headers and the 0.55s bicycle kick. `assets/blender/chibi-lineup.blend` now includes an editable timeline showcase. `public/assets/characters/chibi-animated.glb` contains three interchangeable skin groups and all shared clips, verified with the actual Three.js loader/mixer. Blender and export floor/loop checks pass. Runtime integration remains unfinished; the earlier no-animation/no-export checkpoint above is superseded by this entry.

## Runtime integration checkpoint — 2026-09-27

[Layer 6 handoff](layer-6-handoff.md) records the official Three.js loader/clone/mixer adapter, one uniform scale, half-turn correction, exact event mapping, cube fallback and browser evidence. Orange player / brown rival is provisional rather than an approved assignment. All three skins were inspected at the match camera through development-only query overrides. Exact visual fidelity and final Layer 6 acceptance remain open.
