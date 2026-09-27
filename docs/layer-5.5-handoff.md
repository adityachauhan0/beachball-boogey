# Layer 5.5 handoff — jump, kicks, and headers

Updated: 2026-09-27. **Layer 5.5 gameplay is implemented with cube presentation; Layer 6 runtime character integration is next.** Read [animation-handoff.md](animation-handoff.md) first for asset authority and maintenance hazards, then use this file for the current gameplay-to-animation contract.

## Current controls and behavior

- WASD/arrows move and aim. Horizontal movement remains fully responsive in the air.
- **Space** starts one edge-triggered arcade jump. Holding or repeating Space does not retrigger in the same jump.
- **F** requests a kick. Grounded contact emits `ground_kick`; airborne contact emits `aerial_kick`.
- **E** requests a header. Grounded contact emits `header`; airborne contact emits `jump_header`.
- Escape pauses/resumes. Reset is button-only; there is no keyboard reset shortcut.
- Kick and header requests use independent 0.18-second buffers. If both are live, the most recently expiring request wins for that step; accepted contact clears both.

Jump is deterministic fixed-step state on `PlayerState`: `jumpHeight` and `jumpVelocity`, launched at 5.6 units/second with 14 units/second² downward acceleration. It changes presentation height and action eligibility, not horizontal bounds, speed, ball physics, score or contact radius. Point/rematch/reset restore the grounded state. Pause/focus loss clears pending edges and freezes simulation.

## Contact and power rules

`ContactAction` is `ground_kick | aerial_kick | header | jump_header`. The accepted action is recorded in `FeedbackState.lastShot.action` and on the once-only `FeedbackEvent.action`. Layer 6 must consume the existing drained event stream; it must not poll messages or `lastShot` to start one-shots.

The shared receiver/half/radius/cooldown/flight checks remain authoritative. Action height checks are relative to the visual/gameplay jump height:

| Action | Eligibility |
| --- | --- |
| `ground_kick` | grounded; relative ball height 0.35–1.45 |
| `aerial_kick` | jump height ≥0.12; relative ball height -0.2–1.45 |
| `header` | grounded; relative ball height 1.15–2.8 |
| `jump_header` | jump height ≥0.12; relative ball height 0.9–2.25 |

The small kick/header overlap around the 1.2-unit timing reference is intentional input forgiveness. Headers may be regular or perfect and can add charge, but **never spend a full meter or become powered**. Only an accepted ground/aerial kick may spend full charge and select `bicycle_kick`. Invalid actions spend/reward nothing. One accepted return per incoming flight and one point per terminal shot are unchanged.

## Layer 6 animation mapping

The runtime asset is `public/assets/characters/chibi-animated.glb`: one shared 17-bone skeleton, three `Skin_*` groups and ten clips. Use official `GLTFLoader`, `SkeletonUtils` cloning and `AnimationMixer`; keep the cube adapter as a development fallback.

| Gameplay signal | Authored clip |
| --- | --- |
| grounded idle | `idle` loop |
| horizontal logical movement | `run` loop |
| airborne without accepted contact | `jump` one-shot/state pose |
| contact event action `ground_kick` | `ground_kick` |
| contact event action `aerial_kick` | `aerial_kick` |
| contact event action `header` | `header` |
| contact event action `jump_header` | `jump_header` |
| powered kick quality | `bicycle_kick` (overrides kick action clip) |
| match winner/loser | `celebration` / `loss` |

The animation manifest contains clip durations and strike markers. Gameplay contact remains authoritative and immediate; start at the marker or fast-follow through it so animation never delays physics. Advance mixers with simulation delta only, freeze on pause, and clear/blend one-shots at serve/point/reset boundaries. Reduced motion must suppress dramatic root/flip motion without changing gameplay.

Blender is Z-up/front -Y; glTF is Y-up/front +Z; gameplay forward is -Z, so the adapter needs a half-turn. Use one uniform scale across all skins. Do not normalize each skin independently. Animation raises the visual root while the armature object stays in place; the gameplay root, selection ring and facing indicator remain grounded. Show exactly one `Skin_*` group per character and inspect the included inverted outline geometry before adding another outline effect.

No player/rival skin assignment is approved yet. Exact character fidelity remains unfinished even though rig, clips and export validation passed.

## Verification

Automated verification after the final E-header remap: **82/82 tests**, typecheck and production build pass. The build retains the existing >500 kB minified-chunk advisory.

Codex-browser practice checks verified a visible jump, ground kick, standing header and perfect aerial kick through actual key input and DOM telemetry. After the final remap, the UI showed E for header and an actual E press produced an accepted `header` event on incoming flight 1. The user also performed an additional practice playtest before requesting the remap.

Still open from Layer 5: controlled real-window focus loss during live rally and point-result. Still open from animation authoring: exact character fidelity, runtime shoe/ball alignment, match-camera grounding/outline overlap, clipping, performance, complete match/rematch with characters and production-preview acceptance.

## Authoritative files

| File | Layer 5.5 responsibility |
| --- | --- |
| `src/input.ts` | Edge-triggered Space/F/E actions and clearing |
| `src/game/movement.ts` | Logical jump state and air-responsive movement |
| `src/game/contact.ts` | Action type, common eligibility and action height windows |
| `src/game/feedback.ts` | Quality/charge accounting and event action payload |
| `src/game/rally.ts` | Independent kick/header buffers and accepted action selection |
| `src/game/practice.ts` | Same action rules in the feed harness |
| `src/game/match.ts` | Point/rematch jump reset and shared rally flow |
| `src/main.ts` | Key routing, simulation stepping and cube jump presentation |

Do not move eligibility into the character adapter or infer accepted actions from mesh transforms.
