# GitHub reuse research and decisions

Researched 2026-09-27. Scope: improve the seven-hour plan with reusable source, not implement/install a game. Repository metadata, selected source files, and license files were inspected where stated. Demos have NOT been run; integration and runtime compatibility remain to be verified.

## Recommended reuse

### 1. Cube movement: Soccer_ThreeJS

- Repository: https://github.com/unknown11-svg/Soccer_ThreeJS
- Inspected revision: `d96313359611303e0ba1a47fdc2402fdb9957d23`.
- Source: [main.js](https://github.com/unknown11-svg/Soccer_ThreeJS/blob/d96313359611303e0ba1a47fdc2402fdb9957d23/main.js), especially `createPlayer`, `updatePlayer`, `onKeyDown`, and `onKeyUp`.
- Actual LICENSE file: MIT, copyright 2025 unknown11-svg.
- Reuse decision: adapt the compact cube construction and normalized x/z movement/clamping into TypeScript. This is source reuse, not a whole-game fork.
- Required changes: replace per-frame speed with units/second and fixed-step dt; use logical state rather than authoritative mesh position; add arrows, event cleanup, focus clearing, edge-triggered Space, and our half-court bounds.
- Exclude its ball physics and opponent behaviour: inspected ball code is planar velocity/friction; agents chase the player or defend a soccer goal, not intercept aerial tennis returns. Exclude music/images; source licensing does not establish rights to those media, and the README explicitly credits commercial music.
- Inspectable quality concerns: duplicate keyboard registration in initialization; restart invokes animation again; kicks normalize a potentially zero-distance vector; movement/ball updates lack dt. Do not carry these over.

### 2. Character rendering/import: official Three.js

- Repository: https://github.com/mrdoob/three.js
- Research revision: `1af6de5bd8cd481993483dc6127eba668e818dfd` on dev. Implementation should use a pinned released npm version and its matching addons, not mix dev files into a different release.
- Actual license: MIT.
- Use [OutlineEffect](https://github.com/mrdoob/three.js/blob/1af6de5bd8cd481993483dc6127eba668e818dfd/examples/jsm/effects/OutlineEffect.js) for the first cartoon outline attempt. Inspected source is a WebGLRenderer effect with configurable outline thickness/colour and skinning support.
- Use [GLTFLoader](https://github.com/mrdoob/three.js/blob/1af6de5bd8cd481993483dc6127eba668e818dfd/examples/jsm/loaders/GLTFLoader.js) for design-team GLBs; use built-in AnimationMixer for supplied clips rather than writing a GLB parser or clip player.
- If skinned characters need cloning, inspect/use the matching SkeletonUtils addon. Procedural cube/chibi construction still uses our small visual adapter.
- Do not apply outlines indiscriminately to transparent net, markers, and scenery. Verify outline visibility/material configuration on the match camera before committing to this technique.

### 3. Opponent state infrastructure: Yuka

- Repository: https://github.com/Mugen87/yuka
- Inspected revision: `10591304811222d6856020d5de129b39ef43b58d`.
- License: MIT, identified by GitHub metadata and project documentation.
- Inspected [StateMachine](https://github.com/Mugen87/yuka/blob/10591304811222d6856020d5de129b39ef43b58d/src/fsm/StateMachine.js) and [ArriveBehavior](https://github.com/Mugen87/yuka/blob/10591304811222d6856020d5de129b39ef43b58d/src/steering/behaviors/ArriveBehavior.js).
- Original reuse proposal: packaged State/StateMachine for recover/track/intercept/return. **Layer 3 decision: use the allowed small enum fallback.** The builder inspected official State/StateMachine documentation and npm v0.7.8 tarball: 7 files, 1,031,182 unpacked bytes, roughly 443 KB ESM bundle, no `.d.ts`. A local ambient type/adapter layer would add overhead for four plain-state transitions; steering and vehicle code are unused. No Yuka dependency or source was adopted. Avoid general state-registration infrastructure.
- Our code still computes trajectory interception, legal kicks, reaction delays, and tactical choices. Yuka is not a ready-made tennis opponent.
- Do not adopt Yuka Vehicle/Arrive as a second authoritative movement system initially: player and bot must share our movement constraints. Arrive is available if stopping behaviour requires it; inspect adapter cost first.
- Integration gate: spend at most 15 minutes proving state transitions on the cube bot. If the dependency complicates the tiny bot, record the reason and use an explicit small state enum instead. Never spend the hackathon building a framework wrapper.

## Other candidates assessed

| Candidate | Evidence / licensing | Decision |
| --- | --- | --- |
| [SahilK-027/threejs-gamedev-template](https://github.com/SahilK-027/threejs-gamedev-template) | Actual Apache-2.0 license; inspected package/input/time/visibility files at `1bb7f0b31114baf89125f3af82d926a4d23f8aec` | Do not fork: input couples to audio, ignores focus clearing/repeat, cleanup is unfinished; Time uses a capped variable dt. Visibility auto-resumes. Setup imports debug/UI architecture we do not need. GLB/scene organization is a reference only. Bundled models have separate CC-BY notices. |
| [hh-hang/three-player-controller](https://github.com/hh-hang/three-player-controller) | MIT via metadata; README supports collision, cameras, rigid bodies, vehicles, IK, BVH | Exclude for flat fixed-camera court: large feature mismatch; not source/runtime verified. |
| [malted/charactercontroller](https://github.com/malted/charactercontroller) | MIT via metadata; first-person controller; last push 2022 | Exclude: camera/input model does not fit our fixed sports camera. |
| [luketas/soccer-ai](https://github.com/luketas/soccer-ai) | README says MIT but no LICENSE found in recursive tree and metadata license is null; inspected input file is a broad touch/mouse/keyboard system | Do not copy until license grant is verified; not a straightforward foot-tennis implementation. |
| [acherm/fifacher](https://github.com/acherm/fifacher) | Rich procedural soccer and tools in README; GitHub license metadata null | Reference only; no reusable grant verified, no source/runtime suitability established. |
| [leslieyip02/tennis](https://github.com/leslieyip02/tennis) | Actual tennis demo, two-player controls in README; no license identified | Do not copy; not a verified licensed local-AI foot-tennis base. |
| [cgewert/pepeBall](https://github.com/cgewert/pepeBall) | Tennis-themed repository; license metadata null | Do not copy; not further source/runtime inspected. |
| [rui-exe/SpaceTennis](https://github.com/rui-exe/SpaceTennis) | MIT indicated on GitHub; README describes court scenery | Low value: scene rather than a verified playable game; our court is simple and different. |
| [mintdotgg/mint-playground](https://github.com/mintdotgg/mint-playground) | MIT metadata; inspected tree contains football experience and tennis atlas | No closer drop-in found; tennis atlas is not a tennis match. No selected source. |
| [Alchemist0823/three.quarks](https://github.com/Alchemist0823/three.quarks) | MIT in README; TypeScript particles, trails/batching; research revision `de7c207f791c8b2260c43334a282976221688b1b` | Optional layer-5 fallback if simple pooled effects stop being sufficient. Do not install by default; no runtime compatibility test yet. |

## Revised build-versus-reuse boundary

Reuse cube movement source and Three.js rendering/model/animation tools. Layer 3 uses the allowed explicit rival-state enum following the documented Yuka trial. Build only our court-specific movement adapter, fixed-step lifecycle/input safeguards, ballistic target solver, assisted kick/timing, fault/scoring state, and adaptation rules. Keep design-team assets independent.

No verified licensed drop-in foot-tennis implementation matching our controls and aesthetic was found in this search. This is a bounded research result, not a claim that none exists anywhere.

## Adoption procedure during implementation

1. Import released packages or copy only selected licensed functions from the pinned source. Do not execute repository setup scripts during research.
2. Record exact source revision/package version, copied files/functions, changes, and license notices in a THIRD_PARTY_NOTICES file when adoption actually happens. Preserve upstream copyright/license; for Apache-derived files retain applicable notices and mark modifications.
3. Keep license/provenance for source and media separate; never assume a code license covers third-party music/models.
4. Validate against each existing layer test gate. Reuse does not remove the obligation to verify our requirements.
5. Timebox uncertain integration to 15 minutes per component; prefer the smaller reliable implementation if adaptation exceeds its benefit.

Expected savings are modest and unmeasured: movement scaffolding, outline implementation, GLB loading, and state-machine infrastructure. Do not subtract speculative savings from the seven-hour verification budget.
