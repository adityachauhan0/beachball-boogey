# Animation handoff — start here for character work

Updated 2026-09-27. **Animation assets are authored, exported and now integrated at runtime.** Continue from the saved assets below for authoring/maintenance, and read [the Layer 6 handoff](layer-6-handoff.md) for the adapter and current acceptance status. Character fidelity remains an approximation, so the user's earlier exact-reproduction requirement is still unmet.

## Runtime repair update — 2026-09-27

The user rejected the initial adapter’s movement/airtime. The repair now applies physics height to the pose parent, cancels baked manual-jump root lift, samples the jump pose from ballistic phase, animates missed action requests and fixes jump-relative reach. The GLB and Blender assets are unchanged. Read the current repair section of [Layer 6](layer-6-handoff.md) before relying on the historical integration instructions below.

## Read in this order

1. [AGENTS.md](../AGENTS.md): requirements, current milestone and knowledge index.
2. This handoff: files, Blender navigation, maintenance traps and next steps.
3. [Character animations](character-animations.md): clip names, durations, strike/takeoff/landing times and verification scope. [animation-manifest.json](../assets/blender/animation-manifest.json) is the machine-readable timing inventory.
4. [Character recreation](character-recreation.md): model construction, supplied reference and remaining fidelity gaps.
5. [Blender MCP](blender-mcp.md): local connection and authoring tools.
6. [Layer 5 handoff](layer-5-handoff.md), [asset manifest](asset-manifest.md), and the Layer 6/character adapter sections of [implementation-plan.md](implementation-plan.md): runtime lifecycle, event ownership and acceptance gates.

## What the user requested and what exists

The user requested the three supplied chibi designs reproduced exactly, sharing the same skeleton with interchangeable meshes. The subsequent animation request covers running, jumping, kicking and headers, informed by the current game's player actions. Ten shared clips were authored: `idle`, `run`, `jump`, `ground_kick`, `aerial_kick`, `header`, `jump_header`, `bicycle_kick`, `celebration`, and `loss`.

The saved Blender file and GLB contain the shared 17-bone rig and all clips. All three appearances use those same clips. Asset playback and export checks passed; actual character integration, final character fidelity and Layer 6 match acceptance remain open. Layer 5.5 subsequently added manual Space jump, F kick and E header gameplay with explicit ground/aerial action events; see [layer-5.5-handoff.md](layer-5.5-handoff.md) for the current runtime contract.

## File map and authority

| File or directory | Role and maintenance rule |
| --- | --- |
| [assets/blender/chibi-lineup.blend](../assets/blender/chibi-lineup.blend) | **Current editable source.** Open this to continue; preserve a separate backup before changing it. |
| [assets/blender/chibi-lineup-before-animation.blend](../assets/blender/chibi-lineup-before-animation.blend) | Intentional model-only checkpoint for recovery or controlled regeneration. Contains no authored sports clips. |
| `assets/blender/chibi-lineup.blend1` | Blender's rolling save backup; its contents change with saves. It is not the intentional checkpoint. |
| [public/assets/characters/chibi-animated.glb](../public/assets/characters/chibi-animated.glb) | Current self-contained runtime export (~3.9 MiB). One scene, one skeleton, three skin groups, ten clips. Derived from the `.blend`; do not use it as editable source. |
| [animation-manifest.json](../assets/blender/animation-manifest.json) | 60 fps, clip durations/loop flags/marker times, source-game constants and Blender validation. Keep timing aligned with Actions after edits. |
| [export-validation.json](../assets/blender/export-validation.json) | Results from the actual Three.js loader/mixer on the final GLB. Derived evidence; rerunning its validator overwrites it. |
| [rig-validation.json](../assets/blender/rig-validation.json) | Model checkpoint evidence: weights, shared skeleton, knee deformation and stationary heads. Predates animations. |
| [animation-preview/index.html](../assets/blender/animation-preview/index.html) | Interactive Three.js asset viewer using the existing dependency. Loads the GLB and manifest, displays all three appearances, offers action/speed/pause/replay and orbit controls. |
| [animations.mp4](../assets/blender/animation-preview/animations.mp4) / [animations.gif](../assets/blender/animation-preview/animations.gif) | Finished Blender reel. MP4: 960×540, 24 fps, 193 frames, about 8.04 seconds. Rendering intermediates were removed after encoding. |
| `assets/blender/animation-preview/<clip>.png` | Final representative poses: `run`, `jump`, `ground_kick`, `aerial_kick`, `header`, `jump_header`, `bicycle_kick`, `celebration`, `loss`. |
| `assets/blender/animation-preview/aerial-kick.png` | Earlier inspection render, superseded by `aerial_kick.png`; not final comparison evidence. |
| [assets/blender/lineup-preview.png](../assets/blender/lineup-preview.png) | Static model checkpoint render, before animation work. |
| [references/character-recreation/lineup.png](../references/character-recreation/lineup.png) | Preserved supplied image, also packed inside Blender. Visual evidence; preserve it. |

Source geometry includes inverted black outline shells. One Blender skin mesh has several material slots, so the GLB has **24 skinned primitives**, grouped under `Skin_orange`, `Skin_bunny`, and `Skin_brown`. They all reference one 17-bone skeleton. Primitive count does not mean 24 character variants. Keep backface culling enabled on the outline material; inspect the included outlines before applying another outline effect.

## Navigate the Blender file

| Scene | Purpose |
| --- | --- |
| `Animation showcase • Play timeline` | Saved opening scene. Three `PreviewRig_*` instances and corresponding `PreviewSkin_*` meshes; NLA sequence frames **1–481 at 60 fps**. Play the timeline to review every clip. Markers identify clips. The saved title is static; the rendered reel uses changing clip labels. |
| `SWAPPABLE SKINS • one rig` | Canonical animated interchange rig: `ChibiRig`, with `Skin_orange`, `Skin_bunny`, `Skin_brown`. Select/edit Actions here and show one appearance at a time. |
| `Chibi Reference Lineup` | Editable multipart geometry and original lineup rigs (`Rig • orange`, `Rig • bunny`, `Rig • brown`). These share armature data; their active preview Action is `run`. |
| `Scene` | Preserved Blender default scene. Exclude it from exports. |

All rigs use `CHIBI_SHARED_SKELETON`. Bones are `root`, `hips`, `spine`, `neck`, `head`, plus `upper_arm`, `forearm`, `hand`, `thigh`, `shin`, `foot` with `.L`/`.R` suffixes. Bone names in Three.js animation tracks may be sanitized; use the loaded skeleton or explicit mapping rather than assuming Blender punctuation survives unchanged.

On `ChibiRig`, select an Action in the Action Editor and set its timeline range from the manifest. The current active Action is `idle`. In Blender 5.2 the Action also has a slot: each clip's slot identifier is `OBChibiRig`. When assigning through MCP, assign the slot belonging to **that Action**, for example `rig.animation_data.action_slot = action.slots[0]`. Using the idle slot for a run Action produces “slot does not belong to the assigned Action.” All Actions have fake users and are marked as assets.

Toggle both viewport and render visibility for skin swaps. Viewport hiding is scoped to a view layer; inspect it in the interchange scene, not from the showcase scene. The export deliberately includes all skins, and a loaded GLB must hide the two inactive `Skin_*` groups.

Multipart lineup meshes and consolidated `Skin_*` meshes are separate data. Changing multipart geometry does not automatically rebuild the consolidated skins. Preview meshes in the showcase share data with the consolidated skins, while their rig objects are separate. Editing a shared Action updates its existing users; changing its duration also requires updating NLA strip ranges, the schedule and the manifest.

## Preview without changing gameplay

From the repository root, reuse an existing Vite listener on port 5173. If absent, run `npm run dev` and open [the asset viewer](http://127.0.0.1:5173/assets/blender/animation-preview/index.html). Do not start a second strict-port server on the same port. The page is an authoring preview, not a gameplay mode or a production entry point; it depends on Vite serving `/node_modules/three/`. The game remains at `/`.

The viewer uses official GLTFLoader, SkeletonUtils cloning, AnimationMixer and OrbitControls. It can demonstrate how to instantiate the skins, but its wall-clock playback is only for inspection. A gameplay adapter must use simulation time instead.

## Edit and export safely

Prefer editing the current `.blend` over regenerating it. Keep the shared skeleton, bone names, ground root, skin weights and neutral rest pose. Edit a clip on `ChibiRig`, review it on all three appearances, then update marker times/ranges in the manifest. Preserve existing evidence as historical if an edit changes the asset; refresh results after verification.

For re-export, use the **interchange scene only**, with `ChibiRig` and all three skins selected and temporarily visible. Use Blender's official glTF exporter through MCP with these verified settings:

```python
bpy.ops.export_scene.gltf(
    filepath="/Users/adityachauhan/Documents/GameJam/public/assets/characters/chibi-animated.glb",
    export_format="GLB",
    use_selection=True,
    use_active_scene=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_frame_range=False,
    export_force_sampling=True,
    export_anim_slide_to_zero=True,
    export_anim_single_armature=True,
    export_extras=True,
    export_yup=True,
)
```

Inspect the current Blender version/API first when using another installation. `use_active_scene=True` excludes the original Cube, stage and other scenes; selection alone did not do that. `export_frame_range=False` exports each full Action rather than the active preview timeline. `export_anim_slide_to_zero=True` prevents the frame-1 start from adding 1/60 second to every exported duration. Verify intended Actions only; the ACTIONS mode can include additional rig-compatible actions left from experiments. Restore preview scene, skin visibility and active Action afterward and save deliberately.

Blender is Z-up/front -Y; glTF is Y-up/front **+Z**. The game convention is forward **-Z**, so the adapter needs a half-turn. Ordinary character height differs with hair/ears (rabbit rest height around 2.96 units; jump reaches about 3.62). Use one uniform import scale for all appearances; do not independently normalize by each variant's bounding box. Animation moves the visual root vertically, while the armature object stays in place. Keep the gameplay root, selection ring and facing indicator grounded.

### Script map and limitations

The scripts are authoring-session utilities, not an idempotent asset build pipeline. They contain the machine's absolute repository path in `BASE` or `root`; adapt it before using another checkout. Python authoring/validation runs inside the connected Blender session through MCP, not ordinary shell Python.

| Script | Use / effect |
| --- | --- |
| [animate_characters.py](../assets/blender/animate_characters.py) | Generates sampled poses, **replaces named Actions**, exports the GLB, writes the manifest and saves the source. Running it on a file with showcase NLA strips can unlink their old Actions. Use for deliberate regeneration, not routine export of hand-edited clips. |
| [export_animations.py](../assets/blender/export_animations.py) | Recovery exporter. Reads clip definitions from the generator script, writes `validation: {}` to the manifest, resets lineup previews and saves. Do not use as a harmless export wrapper; it can discard updated timing/evidence. |
| [verify_animations.py](../assets/blender/verify_animations.py) | Evaluates each authored frame on all skins; writes manifest validation. Temporarily changes scene/Action/visibility and restores idle/interchange visibility before returning to lineup. It does not save the `.blend`. |
| [verify-export.mjs](../assets/blender/verify-export.mjs) | `node assets/blender/verify-export.mjs`; loads actual GLB via installed Three.js and writes export evidence. Does not modify Blender. |
| [create_showcase.py](../assets/blender/create_showcase.py) | Creates showcase scene, preview rigs/NLA, label and still renders; saves the `.blend`. Repeated execution creates `.001` scene/object names. Update/rebuild the existing generated showcase deliberately; do not blindly run twice. |
| [render_animation_preview.py](../assets/blender/render_animation_preview.py) | Defines `render_chunk(start, end)`. Produces `frame-####.png` for 24 fps output by sampling the 60 fps showcase, updates title/pose/render path; does not encode or save. Original reel used chunks `[0,64)`, `[64,128)`, `[128,193)`. |
| `build_characters.py`, `refine_characters.py`, `finish_characters.py`, `polish_characters.py` | Historical model construction sequence. Creates/modifies source scenes and meshes; do not rerun over the current animated asset to continue routine work. |
| `consolidate_characters.py` | Historical recovery utility for generated mesh copies. Inspect its naming/deletion assumptions before rebuilding skins. |

For a full procedural regeneration, work on a copy of the explicit pre-animation checkpoint, run the animation generator, verify, then create one new showcase. Preserve the current canonical asset until the replacement has passed the same checks. The historical model scripts are provenance, not a promise that fresh construction reproduces every saved manual/recovery change.

## Verification evidence and its limits

Completed during animation authoring:

- All ten Actions have motion; every authored frame across the three skins stays above the floor. Idle/run endpoints match; all one-shots return to neutral within numerical precision. The validator asserts loop endpoints only for looping clips; neutral recovery for other clips was inspected and recorded by its endpoint metric.
- Actual GLTFLoader/AnimationMixer verifies one scene, one shared 17-bone skeleton, 24 skinned primitives and ten intended durations. It samples **21 times per clip**, with measured minima roughly 0.0077–0.0080 units above ground. It is not exhaustive collision verification.
- An initial inter-frame bicycle floor intersection was fixed with additional airborne clearance. Keep that margin when tuning the flip, especially for the rabbit ears.
- Representative Blender poses and the full reel were rendered. The MP4 was checked as 193 frames at 960×540, about 8.04 seconds. Exported running/jumping-header playback and preview controls were inspected in the browser without captured console errors.

During this documentation handoff, read the source/scripts/reports, inspected the live Blender file/Actions/slots/scene names without changing them, inspected GLB structure and confirmed the viewer URL responded with HTTP 200. Gameplay tests/build and animation numerical tests were **not rerun** for this documentation change; the results above belong to the animation authoring checkpoint.

No claim is made for gameplay contact alignment, full body/shoe/hair self-collision, net clipping, performance at match distance, reduced-motion adapter behavior, full match/rematch with these assets, or exact reference matching. The controlled real-window focus-loss pair also remains open in the Layer 5 handoff.

## Next work when integration is requested

1. Read [layer-5.5-handoff.md](layer-5.5-handoff.md), then inspect `src/render/scene.ts` cube `pose` groups and `src/main.ts` cube transforms. Introduce the small character adapter from the plan; load this GLB using official Three.js addons. Keep a development cube fallback.
2. Clone with SkeletonUtils for independent player/rival rigs, select one skin group per character, apply consistent facing/scale and verify foot grounding at the actual match camera. Keep palette/variant choice explicit; no player/rival assignment for these three skins was approved yet.
3. Drive idle/run/jump from logical movement and `jumpHeight`; consume accepted contacts in the existing single feedback-event fan-out. Use the event's explicit `ground_kick`, `aerial_kick`, `header` or `jump_header` action; powered kick quality selects `bicycle_kick`. Start at the strike marker or use a fast follow-through so animation does not delay the accepted shot.
4. Account for lifetimes: simulation delta only; freeze on pause; clear one-shots/blends on point/serve/reset as appropriate; preserve preferences; suppress dramatic motion under reduced motion; dispose mixers/resources on HMR. Confirm animation does not change reach, velocity, shot eligibility, score or charge.
5. Run tests/typecheck/build and the complete Layer 6 browser gate from the Layer 5 handoff: match/rematch, earned three-perfect → power, rival return, pause/reset/mute/reduced motion, practice/rally/movement/legacy routes, desktop framing and production preview. Record performance and visual clipping limitations. Verify real-window focus loss separately; do not substitute Escape or synthetic blur.

The presence of assets is not permission to claim runtime integration is complete. Retain the exact-character fidelity issue separately from animation/package completion.
