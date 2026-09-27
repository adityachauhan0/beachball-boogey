# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state and source of truth

This is a seven-hour, 3D browser foot-tennis game. Layers 1–5 are implemented as cube-player movement, practice feeds, local AI rallies, first-to-five scoring/rematch, timing/power/feedback and audio. The remaining Layer 4 check is fresh real-window focus loss during rally and point result; read [AGENTS.md](AGENTS.md) and [docs/layer-5-handoff.md](docs/layer-5-handoff.md) first. The accepted MVP is in [docs/mvp-spec.md](docs/mvp-spec.md), and the ordered playable checkpoints and test gates are in [docs/implementation-plan.md](docs/implementation-plan.md). Record behavior and actual verification in [docs/implementation-log.md](docs/implementation-log.md).

Use npm with Node.js 20.19+ or 22.12+:

- `npm ci` — install the locked dependencies.
- `npm run dev` — start Vite on `127.0.0.1:5173` (strict port).
- `npm test` — run focused gameplay and input checks.
- `npm run typecheck` — check TypeScript without emitting files.
- `npm run build` — create the production build in `dist/`.
- `npm run preview` — preview the build on `127.0.0.1:4173`.

## Game boundaries

The MVP is one keyboard-driven beach-court match against a **local** AI rival; no backend, model API, multiplayer, or physics engine is needed. The player moves with WASD/arrows, presses Space for assisted one-touch returns, and Esc to pause; first to five wins, with one receiving-side bounce allowed and rematch. Fun, responsive rallies take precedence over scenery. The approved visual language comes from [docs/visual-direction.md](docs/visual-direction.md) and preserved media under `references/originals/`: cartoon chibi humans with oversized heads and **huge shoes**, bold outlines, bright court/markers, and expressive kick feedback. The reference clips show volleyball aesthetics, not rules to copy. Keep original media unchanged; [references/README.md](references/README.md) records their provenance.

## Existing architecture and next extensions

The runtime currently has `src/main.ts` for the frame lifecycle, `src/input.ts` for movement and one-shot kick input, `src/game/movement.ts` for player movement, `src/game/ball.ts` for ballistic trajectories and court events, `src/game/practice.ts` for feeds, `contact.ts` for shared side-aware kicks, `opponent.ts` for bounded rival movement/interception, `rally.ts` for rally lifecycle, `match.ts` for score/phases/loser serves, and `src/render/` for the Three.js scene, ball cues, and cubes. `tests/` contains the current automated checks. Power systems are implemented. Chibi runtime presentation and adaptation remain future extensions; the authored assets are indexed in [docs/animation-handoff.md](docs/animation-handoff.md). Gameplay state owns motion and contact; visual adapters own geometry and pose, so swapping cubes for chibis must not change rules. Ball motion and landing cues share the same trajectory calculation. Pause clears input and accumulated frame time.

Follow the eight layers in [docs/implementation-plan.md](docs/implementation-plan.md): movement → kick practice → basic AI rallies → complete match → timing/power/feedback → characters/scene → adaptation → delivery. Each layer has a runnable checkpoint and explicit verification gate. Layer 5 is implemented and earned power/rematch/production are verified; retain the controlled real-window focus check for delivery verification. Record what actually passed and any cuts in an implementation/verification log indexed from AGENTS.md; do not claim a build, match, or deployment is verified before testing it. [docs/asset-manifest.md](docs/asset-manifest.md) defines the later huge-shoe character handoff and procedural fallback.

## Reuse and licensing

[docs/reuse-research.md](docs/reuse-research.md) records reuse decisions. Selected Soccer_ThreeJS cube/movement patterns have been adopted with MIT attribution in THIRD_PARTY_NOTICES; use released-version-matched Three.js addons for outlines/GLB import if needed; timebox Yuka state-machine integration and fall back to a small enum if it complicates the bot. Do not fork a whole soccer game or copy its music/assets. Record exact adopted versions/source and notices in `THIRD_PARTY_NOTICES` upon actual use; research candidates are not dependencies.

## Current checkpoint

[docs/layer-5-handoff.md](docs/layer-5-handoff.md) records the implemented timing/power/feedback/audio checkpoint, tuning and evidence. For character work, start with [docs/animation-handoff.md](docs/animation-handoff.md): three skins, one skeleton, ten clips, Blender/export maintenance and validation limits. Exact fidelity and Layer 6 character integration remain unfinished; controlled real-window focus verification remains open.

Read [docs/layer-4-handoff.md](docs/layer-4-handoff.md) for the current match checkpoint, then [docs/layer-3-handoff.md](docs/layer-3-handoff.md) for the checkpoint. Default/`?mode=match` is first-to-five scoring/rematch, `?mode=rally` is standalone local AI, `?mode=practice` preserves feeds, and `?mode=movement` (or legacy `?practice=0`) preserves movement. Rival speed is tuned to 1.8 u/s with 0.28–0.38-second reaction; both sides share contacts and one-bounce rules. Match scoring is first to five, no win-by-two; opening rival serve and subsequent loser serves are automatic. R resets a match without unpausing it. Preserve the current server/tab and regression routes. The implementation log records exact evidence and the remaining Layer 4 focus-loss gate.
