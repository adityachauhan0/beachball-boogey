# Layer 5 handoff — implemented timing, power, and feedback

For continuation, start with [animation-handoff.md](animation-handoff.md): authoritative files, scene navigation, safe editing/export, script hazards, evidence and runtime integration steps.

Updated: 2026-09-27. **Layers 1–5 are implemented; Layer 6 character/scene integration is next.** This document replaces the earlier pre-implementation Layer 5 instructions. Accepted requirements remain in [mvp-spec.md](mvp-spec.md) and [implementation-plan.md](implementation-plan.md); historical decisions and exact test evidence remain in [implementation-log.md](implementation-log.md).

> Layer 5.5 now supersedes the controls and action boundary below. Read [layer-5.5-handoff.md](layer-5.5-handoff.md) for Space jump, F kick, E header, airborne variants and the current Layer 6 event mapping. Layer 5 evidence remains historical and valid for its checkpoint.

Read [AGENTS.md](../AGENTS.md), this handoff, [asset-manifest.md](asset-manifest.md), the Layer 6 section and character adapter contract in [implementation-plan.md](implementation-plan.md), and [visual-direction.md](visual-direction.md) before continuing. The supplied references establish visual direction; final characters must be **chibi humans with huge shoes**, as explicitly requested.

## Current playable checkpoint

Default `/` and `?mode=match` run first-to-five against local AI: rival opening serve, subsequent loser serves, one-second point result, 0.35-second ready cue, match result and accessible Rematch. One return per incoming flight and one receiving-side bounce remain the rules. Every shot quality awards only one point. No backend/model/API is involved.

Layer 5 adds regular/perfect/powered returns, a three-segment meter, brief timing labels, pooled trails/contact bursts, synthesized sounds, mute and reduced motion. Three perfects fill the meter; the **next valid contact** automatically spends it on a faster safe aerial shot. A miss spends nothing. Charge survives points and clears on Rematch/R. The rival can return a powered shot through the ordinary shared controller.

Characters remain cubes. A temporary cube-body rotation/lift represents the bicycle kick; its ground ring and facing indicator stay grounded. Movement, aim and physics continue during the pose. Final articulated poses, huge-shoe chibi fidelity and final scene/camera polish are Layer 6 work. Adaptation and deployment are later layers. Layer 5 added no dependency, camera shake or public mode.

### Controls and modes to preserve

- WASD/arrows: move; direction at accepted contact aims left/right/deep/short/neutral.
- Space: edge-triggered buffered kick. No separate power or manual jump key.
- Escape: pause/resume. Focus/visibility loss clears input and pauses.
- R/Reset: full reset; resetting while paused stays paused.
- Sound on/off: accessible mute, including before Play.
- Reduce motion: calmer procedural effects; device reduced-motion preference takes precedence. Mute and reduced-motion choices survive Rematch/R, but are not stored across page reloads.

| Route | Behavior |
| --- | --- |
| Default / `?mode=match` | Full match with timing/power |
| `?mode=rally` | Automatic standalone rallies, same timing/power |
| `?mode=practice` | Repeatable feeds, stationary rival; far-side `Returned` is practice success |
| `?mode=movement` | Movement only; no ball/kick/power HUD |
| `?practice=0` | Legacy movement; valid explicit `mode` takes precedence |

Standalone rally/practice retain charge across their automatic serves/feeds until full reset. They do not become scored match modes.

## Implemented tuning

These are selected implementation constants, not final user balance judgments.

| Setting | Value / semantics |
| --- | --- |
| Contact radius / height / cooldown | 0.9 units / 0.35–2.8 units / 0.3 s; unchanged shared checks |
| Human kick buffer | 0.18 s from the original press time |
| Timing reference before bounce | Fixed descending crossing at 1.2 units |
| Timing reference after legal first bounce | Fixed descending crossing at 0.9 units |
| Perfect band | 100 ms **total width**, inclusive ±50 ms |
| Timing precision | Original keypress in simulation time, at 60 Hz resolution |
| Regular / perfect / powered nominal duration | 1.65 / 1.4 / 1.2 s |
| Regular / perfect / powered net clearance margin | 0.18 / 0.12 / 0.06 units above sphere/net boundary |
| Power capacity | Three perfect accepted contacts |
| Powered body pose | 0.55 s |
| Regular / perfect / powered label duration | 0.45 / 0.8 / 0.8 s |
| Event queue / particle pool | At most 64 queued events / 72 reusable meshes |
| Reduced-motion bursts | Two stationary particles; no trails or body rotation/lift |

`updateTiming` computes a reference once per flight/bounce trajectory. It does not slide the reference to match accepted contact. A crossing outside the reachable player court envelope has no perfect reference; normal contact can still succeed. This envelope check does not promise the player can reach it from their current position. A legal bounce establishes a new reference, but the shared consumed-flight guard still allows only one accepted return/reward.

`safeLaunch` can increase nominal duration to clear the net. Differing positive clearance margins preserve actual quality speed differences when that constraint dominates. Do not assume a smaller nominal duration alone proves a faster shot; preserve actual-velocity trajectory tests.

## Source map and integration contracts

| Source | Current responsibility / contract |
| --- | --- |
| `src/game/feedback.ts` | `FeedbackState`, `KickRequest`, timing/classification/charge, cosmetic timers and events. `tryPlayerShot` snapshots incoming flight/position, calls shared `tryContact`, then changes charge/cues only if accepted. `lastShot` records press/reference/acceptance/quality for diagnostics. |
| `src/game/contact.ts` | Authoritative side/half/radius/height/cooldown/flight/target checks. `tryContact(..., quality = 'regular')` chooses safe velocity, changes receiver, resets bounces and increments flight. AI uses the regular default. |
| `src/game/ball.ts` | Analytic trajectory/net/ground rules. `stepBall` accepts `onBounce(position, bounce)` and emits legal first and terminal second bounces separately, including within one catch-up step. Net/out remain terminal results. |
| `src/game/rally.ts` | Human timed buffering, shared player shot, local rival stepping and live-point physics. Owns feedback in standalone mode; receives the match-owned object in match mode. Snapshots rival contact position/flight before AI mutates the ball. |
| `src/game/practice.ts` | Feed lifecycle using the same timed player-shot path. Its own feedback/charge survives feeds; `Returned` remains practice-only. |
| `src/game/match.ts` | Owns score/serve/phases and run-lived feedback. Replacement rallies share `match.feedback`. Emits point/match events once; clears shot-local presentation at point boundaries. `startMatch` creates fresh feedback on full reset. |
| `src/input.ts` | `keyDown(code, repeat, time)` retains original press time. `takeTimedKick(time)` returns `false` or `{ time }`; legacy `takeKick()` remains available. Held/repeated Space does not produce new edges. |
| `src/main.ts` | Single 60 Hz simulation loop and RAF, interpolation/catch-up, lifecycle/HUD. Drains events after every simulation step into effects/audio, then steps effects. Derives cube pose from logical timers; never derives physics from DOM/mesh transforms. |
| `src/render/scene.ts` | Ground-position roots plus separate `playerPose`/`rivalPose` body groups. Current main-loop cube transforms depend on these fields; replace/adapt deliberately for articulated characters. |
| `src/render/ball.ts` | Explicit ball/time/visibility/landing/aim renderer. Ball shadow, orange predicted landing ring and cyan far-court aim remain distinct. |
| `src/render/effects.ts` | Fixed pool; `consume(event)`, `step(dt, ball, visible)`, `clear`, `setReducedMotion`, `dispose`. Consumes events, never controls contact/trajectory. |
| `src/ui/audio.ts` | Gesture unlock, synthesized cues, mute, pause/clear/dispose and graceful failure. Drops events before unlock/while inactive; no queued replay on resume. |
| `index.html`, `src/style.css` | Match/power/timing HUD, accessible mute/reduced-motion controls and overlays. Keep cues clear of score, toolbar and both court halves. |

### Event ownership

`FeedbackEvent` carries `sequence`, `type`, copied `position`, `side`, `quality`, incoming `flight`, and optional bounce number. Types are contact, bounce, serve, point and match. Player/rival contacts emit in rally/practice; score/result events come from match. Main drains the stream **once** and fans the same drained events out to presentation consumers. Standalone rally/practice do not currently emit scored point/match cues.

Rally time and flight IDs restart at match points. Use run-scoped event sequence for identity, not flight alone. Full reset restarts sequence and clears consumers. Do not spawn effects/animations by repeatedly polling unchanged `message`, `lastShot`, `kickFlash` or result. Do not add a second independent drain that steals events from audio/effects: integrate a character consumer into the existing fan-out.

Contact position provides strike height; the current event schema does **not** contain an explicit grounded/aerial animation variant. Layer 6 can derive the cosmetic variant from event position or add a presentation field without changing shot eligibility.

### State lifetime and pause/reset traps

| Boundary | Preserve | Clear / behavior |
| --- | --- | --- |
| Pause/focus loss | Score, charge, trajectory/reference, consumed contact IDs/cooldowns, simulation/cue/pose/effect ages | Pending kick/request and held movement/aim; stop voices and suspend audio. Resume discards background elapsed time. |
| Match point result / new point | Score/serve counters, charge, run event sequence, presentation preferences | Shot-local reference/request/cue/pose; terminal cube kick flash. Effects clear from point/serve events; next rally shares existing feedback. |
| Standalone serve / practice feed | Charge, run event sequence, preferences | Shot-local feedback and trail history at serve event |
| Rematch/R/full reset | Mute and reduced motion; paused shell for R | Fresh feedback/actors/ball/input/contact/run state; clear effects/audio transients. Rematch starts playing. |
| HMR disposal | Nothing from the replaced instance | Cancel RAF; remove input/button/resize/media-query listeners, including Rematch; dispose audio/pool/court resources |

`clearPointFeedback` intentionally preserves charge, sequence and `lastShot`; the latter is a diagnostic snapshot and must not retrigger a pose. Full reset clears it. `advanceFeedback` and effect `step` must receive simulation delta only; zero time must preserve ages.

Device reduced motion OR the player's toggle enables reduced effects. A device preference disables the toggle so it cannot accidentally negate that preference. The pose timer may remain positive in reduced mode, while visual rotation/lift are suppressed. Do not equate a live cosmetic timer with permission to animate.

## Verification completed

Detailed values, attempts and limits are in the final Layer 5 entry of [implementation-log.md](implementation-log.md). Checks below were performed during implementation, not rerun for this documentation update.

- **76/76 tests**, typecheck and production build pass. Deterministic coverage includes timing boundaries/buffering, fill/next-hit spending, invalid/held requests, pause/reset/point lifetime, event identity/draining/catch-up, equal scoring, audio failure/no-replay, pooling/reduced motion and shared rival returns.
- Actual safe velocities for both halves, heights 0.35/1.2/2.8, depths 0.62/5.65/7.22 and left/right/neutral × short/deep/neutral targets clear the net and land correctly. Actual duration decreases regular → perfect → powered.
- **Codex in-app browser, actual keyboard input, no ball/charge/actor injection:** three perfects on incoming flights 1/3/5 showed meter 1/2/3; third shot stayed perfect. Full charge survived a deliberately lost point and invalid press, then spent on the next valid contact. Movement remained responsive; the rival returned the powered shot through normal AI.
- Paused powered pose, simulation time and particles held through a wait; audio was suspended with zero voices. An early pending kick was cleared without consuming a flight or replaying on resume. Point-result pause and paused R reset passed.
- Development **0–5** match and Space Rematch passed. The final production build also completed **0–5**, restored 0–0/rival serve/charge 0 on Space Rematch and retained mute/reduced motion. Fresh production console captured no warnings/errors; DEV telemetry was hidden and diagnostic HUD attributes absent.
- Standalone rally sustained six contacts, then another earned perfect/power cycle. Practice completed five accepted returns across six feeds with one intervening miss; this is **not** five consecutive perfects. Explicit and legacy movement kept no ball and hid kick/power HUD.
- Real in-game Reduce motion toggle passed: subsequent power contact had two particles, suppressed trails/body pose, and reset preserved preference. Engine tests establish stationary reduced particles. No OS preference switch was performed.
- 1280×720 and 1920×1080 viewport overrides established readable court/HUD framing; captures are scaled, not exact pixel-resolution evidence. Overrides were restored.

### Evidence captures

[Earned charge](verification/layer-5-charged.png) · [Live power shot](verification/layer-5-power-live.png) · [Reduced motion](verification/layer-5-reduced-motion.png) · [1280 framing](verification/layer-5-framing-1280.png) · [1920 framing](verification/layer-5-framing-1920.png) · [Production result](verification/layer-5-production.png).

Charge/live/framing captures precede the small Reduce motion button addition; reduced-motion capture includes it.

## Open checks and known limits

1. **Controlled real-window focus loss during live rally and point_result remains unverified.** Earlier Layer 2 human evidence and a Layer 5 unscripted focus-loss pause exist, but do not close this controlled pair. Finder automation did not establish it; native Codex control was denied. Verify held-input clearing, frozen trajectory/score/delay/charge, stopped audio and no jump/stale request on resume. Escape, synthetic blur or the unscripted pause are not substitutes. The renewed user request authorized implementation to proceed while this remained explicitly recorded.
2. Failed/unsupported audio is covered by injected adapter factory tests, not by disabling audio in a real browser. Subjective sound balance is still a playtest item.
3. Both winners are covered by tests and prior Layer 4 browser evidence. Layer 5 has fresh browser rival victories; no fresh Layer 5 browser player-win claim is made.
4. Vite retains an approximately **517 KB minified / 134 KB gzip** bundle advisory. Final art performance and supported-resolution acceptance are later delivery checks.
5. Cubes and the orthographic camera remain placeholders. Final chibi/huge-shoe fidelity, character contact readability, adaptation and public deployment are unfinished.

## Continue with Layer 6

Layer 6's accepted budget is **60 minutes**, a planning timebox. Follow [asset-manifest.md](asset-manifest.md) and the existing character adapter contract; preserve reference aesthetics and huge-shoe silhouette. Do not wait indefinitely for assets: use the plan's procedural articulated chibi fallback if no usable asset exists.

1. Inspect available assets/provenance and current pose/body boundaries. Keep original reference files intact. Optional imports should use the already-selected official Three.js loaders/animation tools when needed, with license/source records; do not add a loader framework speculatively.
2. Replace/adapt cube presentation with one articulated chibi construction and two distinct appearances. Keep logical position/facing, movement speed, reach, trajectory, scoring and power in gameplay. Huge shoes do not expand contact radius.
3. Bind accepted contact events to foot/aerial/bicycle poses. Keep movement and simulation live; use simulation clocks, reduced motion, pause/reset and disposal contracts above. Preserve grounded player ring and landing/aim readability. Idle/run/result poses can use logical movement and lifecycle state.
4. Integrate cartoon outlines, materials and inexpensive beach scenery to match references. Inspect shoes/head at match-camera distance, ground placement and body/net/ball clipping. Retain a lightweight cube debugging option according to the plan without adding public modes.
5. Rerun tests/typecheck/build and use the **Codex browser** for a complete match/Rematch, an earned three-perfect → power cycle, powered rival return, pause/reset/reduced motion/mute, regression routes and both desktop framings. Check production separately after rebuilding. Verify art integration did not change shot eligibility, speed, landing or score; record only performed evidence.

Keep work proportional to the hackathon. Simplify decoration and fancy animation before sacrificing the chibi/huge-shoe silhouette or responsive gameplay. No adaptation/backend/deployment expansion belongs in character integration. Do not dispatch an asset team or create new chats without user authorization.

## Local environment and delivery state

Development listener on **http://127.0.0.1:5173/** was rechecked for this handoff; reuse it. Production preview **4173 is stopped**. The previous gameplay task retained a ready Codex browser tab. Recheck the port before starting preview, stop temporary preview afterward, and preserve development availability.

Commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run preview`. DEV power attributes expose original press/reference/acceptance, charge, request/time/cue/pose, sequence, particles and reduced motion; mute attributes expose audio status/voices. Do not require those attributes in production tests.

No Git repository/checkpoint or public deployment exists at this checkpoint. Update the repository index, README and implementation log when requirements, implementation or verification status change.
