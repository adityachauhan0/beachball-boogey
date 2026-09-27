# Layer 6 character integration checkpoint

Updated 2026-09-27. The authored three-skin GLB now runs in every gameplay route through a small presentation adapter. Layer 6 also includes the newly approved continuous mouse aim, overhead direction guide, LMB kick and RMB header controls. The user-supplied Blender beach court now replaces the procedural scene, and gameplay boundaries are remapped to its authored white lines and net. This is a runtime/control/environment checkpoint, not a claim that the user's exact-character requirement or the complete Layer 6 delivery gate is finished.

## Beach appearance repair — 2026-09-27 (latest)

The user rejected the flat court export and supplied the intended rendered view. The earlier flat-material conversion and omission of three sand cover planes are **superseded**. Blender MCP inspected the open source and found Eevee `ShaderToRGB` shading plus camera-window texture projection; the runtime had also replaced its perspective camera with an orthographic one.

- `assets/blender/export_beach_court.py` runs through Blender MCP against the open source. It renders frame 1, embeds the appearance texture, retains evaluated 3D geometry including the woven net and cover planes, and exports the original perspective camera. It restores the source scene/frame/settings and never saves over the original `.blend`.
- `public/assets/environments/beach-court.glb` is 2,968,312 bytes: one scenery mesh, 11,017 vertices, one embedded PNG and one camera. Report: `assets/blender/beach-court-export.json`; bake: `assets/blender/beach-court-runtime-bake.png`.
- `src/render/court-appearance.ts` applies exact projective texture sampling on the actual 3D mesh. This is a **fixed-camera, static scenery bake**, not reusable free-camera material baking. Ocean/banner animation is frozen at frame 1; character/ball animation remains live. The custom game material is required for exact projection; ordinary affine UV interpolation in a generic viewer can distort large planes.
- `src/render/scene.ts` copies the exported camera, applies the existing gameplay offset, contains its aspect ratio on resize, adds a transparent receiver for live actor shadows and places player rings above painted lines. Mouse aiming reads the fitted canvas rectangle. `src/render/ball.ts` raises the ball shadow above the paint. The washed-out CSS overlay is removed during play/pause.
- Geometry, physics boundaries and gameplay rules are unchanged. Baked source shadows differ slightly from the supplied target still; this pass reproduces the current open Blender scene. Exact character fidelity remains separately open.

Verification kept short at the user's request: six focused export tests pass (embedded texture, single scene, real net/ground geometry, camera framing, mouse-ray alignment and aspect containment); typecheck and production build pass. Browser showed restored sand/teal/sea/props/net and live characters, with no captured warnings/errors on a fresh practice load. [Browser capture](verification/layer-6-court-export-repair.png). The full-suite attempt had 97 passing existing tests and one wall-clock timeout under machine load; it was stopped rather than expanding verification. Do not claim a fresh full-suite pass. Existing Layer 6 delivery gates remain open.

## Movement/action repair — 2026-09-27 (current)

The user rejected the previous checkpoint as unplayable: movement/actions were wrong, visible jumps lacked usable airtime, and aerial actions/animations were inaccessible in play. This supersedes the earlier implication that runtime loading and 87 passing tests established playable controls.

Audit findings and fixes:

- The simulation had gravity, but the loaded-character branch forced `playerPose.position.y = 0`. Only a shorter, smaller baked hop was shown. Physics now drives interpolated visible height: launch speed 6 units/s, gravity 12 units/s², apex 1.5 units, total airtime 1 second. Horizontal movement remains responsive; a second press cannot jump again in midair.
- The adapter samples jump takeoff/apex/landing poses from vertical velocity and compensates the baked `root` lift for manual jump/aerial-kick/jumping-header clips. An aerial strike returns to the current jump phase rather than restarting a hop. Bicycle and celebration retain authored clearance. The source GLB/Blender files are unchanged.
- The shared contact check incorrectly imposed a world-height ceiling of 2.8 even during jumps. Its broad ceiling now follows actor height; the existing action-specific relative windows, radius, receiver, cooldown, flight lock and buffers remain authoritative. A jumping header can reach above 2.8; standing actions cannot.
- Kick/header input now immediately plays its authored animation even on a miss. Accepted contacts still select the actual action and seek to the strike marker; powered kicks still select bicycle. All ten clips have runtime paths. Rival high contacts now carry `header` instead of always displaying `ground_kick`.
- Character bodies now face travel and player strikes face their aim target. Non-rally match steps settle jumps and clear stale movement instead of freezing the actor aloft; point events clear action one-shots. Regular header feedback now reads “NICE HEADER”.

Verification: **98/98 tests** pass, including a new actual-GLB/mixer integration suite that checks a complete visible ballistic arc, returning from an aerial action, motion in every action/result clip, physics-derived aerial contacts, and invalid high contacts. Typecheck and production build pass (existing large-chunk advisory).

Codex in-app browser verification through actual inputs: movement mode showed visible separation from the grounded ring; LMB accepted `aerial_kick` at logical height 0.96 / interpolated height 0.9775; RMB accepted `jump_header` at height 1.2983 / visual height 1.2904, with the matching clip selected. A keyboard E aerial header also passed. See [aerial-header screenshot](verification/layer-6-aerial-header-fix.png). These were live feeds and normal controls, without state injection. Escape froze a jump at height 0.285 across checks; Reset while paused restored height 0 and idle. A fresh practice page was left open for handoff. Local telemetry measured around 126–134 fps during these checks; this is not low-end performance certification.

The browser reported existing environment animation binding warnings for waves/shore/banner nodes; no character error was observed. Exact fidelity, exhaustive contact/clipping inspection, earned-power browser coverage and controlled real-window focus checks remain open. Final user playability acceptance is still required.

## Start here

- Run `npm run dev` and open `http://127.0.0.1:5173/?mode=practice` for the fastest control check. Reuse an existing server on the strict port rather than starting a second one.
- Controls: WASD/arrows move, mouse aims, Space jumps, LMB kicks, RMB headers, Escape pauses. F/E remain kick/header keyboard fallbacks.
- The current automated gate is **98/98 tests**, typecheck and build passing after the movement/action repair above. The user rejected the prior controls; a fresh playtest of the repair is next.

## Runtime architecture

- `src/render/character-presentation.ts` loads `public/assets/characters/chibi-animated.glb` once with the official `GLTFLoader`, clones independent player/rival rigs with `SkeletonUtils`, and gives each clone its own `AnimationMixer`.
- The adapter owns visual clip selection, skin visibility, reduced-motion substitutions, reset and disposal. It never writes gameplay state.
- `src/main.ts` advances mixers only inside the existing fixed simulation loop and sends each already-drained feedback event to effects, audio and character presentation in the same fan-out.
- The existing cube groups remain live fallbacks. They stay visible while the GLB loads or if loading fails, and the former cube tilt/jump presentation runs only in fallback mode.
- One uniform scale (`0.72`) is used for every skin. Each clone shows exactly one `Skin_*` group. The nested GLB scene receives the required half-turn from exported +Z to gameplay -Z; actor roots and selection/facing rings remain grounded.

## Animation mapping and lifecycle

- Logical moving/idle/jump state selects `run`, `idle` or `jump`.
- Accepted player contacts use the event's explicit `ground_kick`, `aerial_kick`, `header` or `jump_header` action. Powered kicks use `bicycle_kick`.
- Rival accepted contacts use `header` above 1.45 units and `ground_kick` below.
- Contact clips start at their authored strike marker so the visual never delays the authoritative contact.
- A match winner/loser receives `celebration` / `loss`. Serve and reset boundaries clear one-shots back to base animation.
- Pause freezes mixers because they receive no simulation delta. Reduced motion maps a powered bicycle kick to `ground_kick` and suppresses the winner hop; it does not change gameplay.
- HMR disposal stops/uncaches mixers, removes clone roots and disposes shared cloned geometry/material resources.

## Provisional skin decision

No player/rival assignment was approved. The temporary default is **orange player / brown rival**. All three variants remain bundled. Development builds accept `playerSkin=orange|bunny|brown` and `rivalSkin=orange|bunny|brown` for match-camera inspection; invalid values fall back to the provisional defaults. Production ignores these overrides.

## Character verification performed

- The original focused presentation checkpoint passed at 83 tests. The current full suite is now **87/87 tests across eight files** after mouse-control coverage was added.
- TypeScript check and production build pass. Vite retains the existing >500 kB chunk advisory; the latest JS measured 636.67 kB minified / 167.54 kB gzip.
- Codex in-app browser development checks: match, rally, practice and movement each loaded one canvas with `characters` adapter status and no captured warning/error.
- Match-camera inspection covered orange, brown and bunny through the development skin override. Shoes, heads, included outlines and grounded rings remained visible; bunny ears stayed in frame.
- Actual browser key input in practice produced accepted `ground_kick` and `header` events, reaching return counts one and two respectively while characters remained loaded.
- Match Play entered a live rally with independently moving rival presentation. Reduced motion, Escape pause, and Reset while paused retained character mode and restored the ready 0–0 match state.
- Production preview on `127.0.0.1:4173` loaded the orange/brown characters, entered `IN PLAY`, kept telemetry hidden and produced no captured warning/error.

## Remaining limits and delivery checks

- Exact visual fidelity is still not achieved; the differences in `character-recreation.md` remain open.
- Browser inspection established readable grounding and silhouettes, but did not certify precise shoe/ball contact at every clip, exhaustive net/body/hair self-clipping, or low-end performance.
- This pass did not complete an entire first-to-five match/rematch with characters or deliberately earn and spend three perfects in the browser. Existing automated match/power regressions pass unchanged.
- A controlled real-window focus loss during a live rally and point-result remains unverified. Escape pause is not evidence for that check.
- Rival kick/header classification is now repaired; the deterministic rival remains grounded.
- Adaptation remains Layer 7 work. No Blender source or exported asset was regenerated.

## Mouse aiming update — 2026-09-27

- Free mouse movement over the canvas now projects to a continuous, court-clamped landing target on the rival half. The accepted kick/header snapshots that target through the existing contact and safe-launch path; timing, power, eligibility, scoring and animation remain unchanged.
- A strong white line and arrow with a thick black outline float above the player's head and rotate toward the selected target while the player can return the ball. Solid geometry keeps the stroke readable across browsers. It hides outside live player-receive play and the old far-court aim ring is suppressed.
- WASD/arrows remain movement controls. Before the first mouse movement, their prior directional target remains as a fallback. Reset and Rematch clear mouse aim back to neutral.
- Focused projection/clamping, explicit-target trajectory and mouse-action buffering coverage was added. All **87/87 tests**, typecheck and production build pass. Codex-browser practice verification confirmed mouse aiming activates during live play, the outlined overhead guide is visible, and separated pointer positions produced continuous targets `(-4.274, -6.624)` and `(2.753, -6.624)`. Final feel/shot-placement and mouse-button acceptance is reserved for the user's playtest.
- LMB now queues the existing buffered kick action and RMB queues the existing buffered header action when pressed on the live game canvas. The browser context menu is suppressed there during play; F/E remain keyboard fallbacks, and UI-button clicks are unaffected.

## Mouse-control implementation map

| File | Responsibility |
| --- | --- |
| `src/input/mouse-aim.ts` | Pointer-to-court raycast, legal target clamping, white/black overhead guide, reset/disposal |
| `src/input.ts` | Shared timed kick/header request queue used by keyboard and mouse buttons |
| `src/main.ts` | Canvas pointer actions, context-menu suppression, lifecycle/visibility and target propagation |
| `src/game/rally.ts`, `src/game/practice.ts`, `src/game/match.ts` | Optional explicit aim target passed into the unchanged authoritative contact/launch path |
| `tests/mouse-aim.test.ts`, `tests/practice.test.ts`, `tests/feedback.test.ts` | Clamp, continuous trajectory and shared mouse-action buffer coverage |

## Beach court replacement — 2026-09-27

- The user-supplied archive is retained outside the repository as reference input. Its working source is `assets/blender/beach_court_environment.blend`; Blender 5.2.2 opened that exact file and Blender MCP inspected the scene before export. The accompanying README and stills were treated as asset metadata/visual evidence, not instructions.
- `public/assets/environments/beach-court.glb` is the local runtime export. The original `.blend` remains authoritative and unchanged: glTF-incompatible toon `ShaderToRGB` materials were converted temporarily to a flat Principled palette for export, three baked cover planes were excluded, and the Blender source was reverted without saving those export-only changes.
- Blender MCP measured the authored line/net geometry. `src/game/court.ts` is now the single gameplay source of truth: court x `-5.46…5.46`, player baseline z `7.99`, rival baseline z `-8.27`, net z `0`, net top `1.435`, net half-depth `0.039`, and net half-width `5.67`. The slight baseline asymmetry comes from the supplied mesh rather than a new rules decision.
- Player movement is inset to x `-4.81…4.81`, z `0.62…7.22`; rival movement mirrors the safety inset at z `-7.50…-0.62`. Mouse landing targets use x `-5.16…5.16`, z `-7.97…-0.65`. Starts moved to z `5.59` and `-5.79`.
- Ball in/out decisions, net collision, movement clamps, opponent interception/targets, serves, practice feeds and mouse aim all consume those shared values. Tests no longer duplicate the former procedural court dimensions.
- `src/render/scene.ts` loads the environment with the official `GLTFLoader`, advances its authored animation mixer with game time and preserves a sand-plane fallback until loading succeeds. The previous procedural net, lines, palms and shoreline were removed to avoid doubled geometry.
- Verification: **87/87 tests**, typecheck and production build pass. A fresh development practice load showed the golden authored court, white boundaries, net, beach props and both runtime characters with no captured browser warning/error. DOM telemetry reported the new starts and movement bounds. Full match/rematch, powered-kick, controlled focus and exhaustive clipping/performance gates remain open.

## Continuation gates

1. Record the user's playtest verdict for mouse sensitivity, guide readability, LMB kick and RMB header. Tune only from observed feedback; the current authored-court target inset is x `-5.16…5.16`, z `-7.97…-0.65`.
2. Complete the existing first-to-five/Rematch and deliberately earned three-perfect → powered-kick browser checks with characters and the new mouse controls.
3. Complete precise contact/clipping/performance inspection and controlled real-window focus-loss checks.
4. Do not call Layer 6 delivered until those gates close. Exact character fidelity remains a separate unmet requirement; adaptation remains Layer 7.
