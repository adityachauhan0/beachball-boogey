# Implementation and verification log

## 2026-09-27 — Fast Layer 7 learning shots

Implemented the user-approved reduced scope: five-placement learning bandit, three difficulty presets, per-shot rewards and between-point tactic copy. Learning survives points and clears on Rematch. No dependencies or movement/action changes. Typecheck/build and Codex browser Play smoke check pass; broader tests and balance playthrough skipped per the request for immediate testing. See [layer-7-handoff.md](layer-7-handoff.md).

## 2026-09-27 — Layer 1: Movement Playground

Implemented a runnable Vite + TypeScript + Three.js scene with a fixed elevated view of a sand-coloured beach court, blue boundary markings, a low net, a controllable blue cube, and a stationary coral rival. The near-side player moves with WASD or arrow keys at 4.8 world units per second; movement is normalized, fixed-step, interpolated for rendering, clamped to the near court, and protected by a capped catch-up loop.

Play, Pause/Resume, focus-loss pause, Escape, R, and Reset position share one input lifecycle. The development view shows DOM telemetry for player position, facing, status, bounds, and speed. The production build omits that readout. Movement math and keyboard sampling have focused automated checks.

Verification performed by the parent:

- npm test: 7 movement/input tests passed (diagonal normalization, bounds, interpolation, quick taps, opposing keys, clearing).
- npm run typecheck: passed.
- npm run build: passed.
- Codex in-app browser: Play works; user confirmed WASD movement. Parent verified ArrowUp moves z from 5.65 to 5.57, Escape pauses/resumes, a W press while paused leaves position unchanged, and R resets position/facing.
- Court/placeholder scene visually reviewed in the browser; compact in-play toolbar moved above the court corner. A 1280×720 viewport check was attempted, but browser screenshot composition was irregular; viewport restored. Full multi-size framing and sustained held-key focus-loss tests remain to be verified rather than claimed passed.
- Server left running at http://127.0.0.1:5173/ and the existing browser tab marked to remain open.

Layer 1 is the available movement checkpoint; later integration may complete the remaining manual edge-case checks. There is no ball, rally, or moving AI in this checkpoint.

## Layer 1 implementation decisions and review fixes

- Implemented by the explicitly requested GPT-6 Luna xhigh subagent; parent reviewed source and tested the Codex browser. Subagent interrupted during user testing, so the final state is recovered from files and checks rather than an agent final summary.
- Reused only selected Soccer_ThreeJS cube/movement patterns, with pinned source and full MIT notice in THIRD_PARTY_NOTICES. No upstream music or images copied.
- Parent requested and builder fixed Escape key-repeat toggling, R reset, reset frame-timing clearing, RAF cancellation and listener cleanup during HMR.
- Large intro panel collapses during play; parent adjusted its position to clear the court corner. External Google Fonts import removed.
- Orthographic placeholder camera differs from the proposed final perspective camera; assess final style/readability during later integration.
- No ball, AI movement, scoring, chibi assets, or public deployment added. No Git commit/checkpoint was created.
- Layer budgets are planning estimates, not measured elapsed effort.

## Layer 1 checkpoint handoff (historic)

[Layer 2 handoff](layer-2-handoff.md) is the fresh-agent entry point, with exact code/tuning/runtime context, passed and pending checks, ball/kick sequence, and acceptance criteria. Repo context files were synchronized to remove stale statements that no implementation exists or Layer 1 is next.

## 2026-09-27 — Layer 2: Ball and Kick Practice

Added the airborne practice ball, analytic trajectory and net/ground event handling, predicted landing cue, assisted Space kicks, aiming from movement input, automatic restart feeds, and temporary cube kick feedback. Practice uses the existing fixed-step loop and remains independent of rendering. It defaults on; `?practice=0` selects the movement playground. The far-side cube remains stationary, and Layer 2 has no AI movement or point scoring.

Implementation tuning: ball radius 0.22 and gravity 8; net top y=1.105, half-depth 0.06, collision half-width 5.18. Contact window is y=0.35–2.8 and horizontal radius 0.9, with a 0.3-second cooldown and one contact per incoming flight. Space is edge-triggered and buffered 0.18 simulation seconds. One player-side bounce is allowed. Nominal feed is from (0,1.8,-5.6) toward z=5.65 over 1.9 seconds, alternating x=0,-0.6,+0.6; the initial feed starts after 0.35 seconds and later feeds after 0.85 seconds. Shot input aims left/right by 3 world units and W/S select far/short target z=-6.8/-3.2; neutral targets z=-5. Safe launch uses a 1.65-second nominal duration, increasing it as needed to clear the net. These are implementation constants, not final balance claims.

Verification recorded by the parent:

- `npm test`: 39/39 checks passed, including five aimed targets and legal returns; trajectory prediction; fast net/ground crossings; court lines and second bounce; contact height, side, ownership, distance, cooldown, and per-flight limits; buffered/expired/held Space; zero-distance contact; reset; stale feed input; and single terminal result.
- `npm run typecheck`: passed.
- `npm run build`: passed on final source (output bundle `index-BzhW9E-Z.js`).
- Codex browser: Play via Enter, Escape pause/resume, R reset. Alternating ArrowLeft/ArrowRight taps with actual Space presses returned feeds 1–5; each showed terminal `Returned`. A miss restarted practice. Player ended at x=-0.08,z=5.65 and the game was paused after feed 5.
- Production preview on port 4173: Play and Escape worked, development telemetry was hidden, and no console warning/error was captured.
- The development server at `http://127.0.0.1:5173/` was restored and left available. The prior tab was not discoverable through the current tools, so a new in-app tab was opened at the same URL.

Layer 2 remains short of final acceptance. Manual checks still needed: sustained real-window held-key focus loss; opposing, diagonal, and all-corner movement; supported-resolution framing; performance; and a visible comparison confirming that left/right aim changes the far-side landing. An input unit test verifies queued kick clearing, but switching to another in-app tab did not trigger window focus loss and is not a browser focus-loss pass. The browser trial used alternating directional taps and completed all five returns, but it did not record the resulting landing displacement. Do not describe that visual aim comparison as verified. The 39 automated checks and browser return loop establish the core practice behavior; they do not close the remaining presentation and lifecycle checks.

## 2026-09-27 — Layer 3 documentation handoff

Created [Layer 3 handoff](layer-3-handoff.md) for the next agent: shared contacts and shot identifiers, symmetric bounce rules, bounded local AI movement/interception, preserved practice mode, lifecycle integration, and six-contact rally verification. Layer 3 code was not started by this documentation request. Layer 2 manual checks remain explicitly outstanding. The existing port 5173 listener was confirmed; no server restart or gameplay change was made. Updated the repository index and orientation links.

## 2026-09-27 — Layer 2 remaining gate closed

- User verified sustained held W across switching to another app: game pauses; releasing outside and resuming leaves the player still until fresh movement input.
- Parent browser input check: opposing left/right held inputs preserve (0,5.65); 0.5-second diagonal reaches (1.697,3.953), matching normalized 4.8 u/s. All four corners clamp exactly to x ±4.35, z 0.62/7.22. These held-input checks used browser-dispatched keyboard events; actual key presses were used for the Codex practice checks below.
- Codex in-app browser: actual Left+Space and Right+Space returned the opening feed and visibly placed the orange landing ring on opposite far-side flanks. DOM landing targets were (-3,-5) and (+3,-5), respectively.
- Codex browser framing inspected with 1280×720 and 1920×1080 viewport overrides: both court halves, boundaries, characters and active ball remained visible. The browser scales its screenshot composition (DOM viewport differed from requested size), so these establish readable rendered framing rather than exact CSS-pixel screenshots. Overrides were restored.
- Added development-only rolling RAF rate as `data-fps` on existing telemetry, without changing simulation timing. Active Codex practice sample: 200.0 RAF callbacks/second on this machine; no console warning/error captured. This is a local frame-delivery observation, not a low-end hardware guarantee or final production performance audit.
- Parent reran 39/39 tests, typecheck and production build successfully. Earlier five-feed return and production-preview evidence remains valid. Layer 2 gate is closed; proceed with Layer 3.

## 2026-09-27 — Layer 3: Local AI rallies, gate closed

Implemented shared side-aware contacts/aim/launch in `src/game/contact.ts`, a plain rival state machine in `opponent.ts`, and waiting/playing/result rally control in `rally.ts`. Rally physics allows a first receiving-side bounce on both halves; practice explicitly retains its far-side successful-landing result. Every accepted kick advances the shot identifier; both actors own independent consumed-flight IDs and cooldowns. Ball rendering now takes an explicit ball/time/visibility/landing/aim input instead of `PracticeState`. Main retains one fixed-step loop, pause/focus clearing and full reset.

Mode mapping: default and `?mode=rally` are AI rallies; `?mode=practice` preserves Layer 2 feeds; `?mode=movement` is Layer 1, with legacy `?practice=0` supported when no valid explicit mode is present. On-screen controls/title match the active mode; movement's Space row is hidden. Fault messages identify the rally winner and automatic restart, without a score or full-match flow.

Final tuning: rival starts at (0,-5.6), bounds x ±4.35/z -7.22…-0.62, speed 1.8 u/s versus player 4.8, deterministic reaction delay 0.28–0.38 seconds, contact-target error capped at 0.38. It samples descending contact heights, checks reachability and pursues a best-effort legal target when interception is difficult. First two rallies use near-centre AI returns; subsequent shots use bounded placement based on current positions, without match-history adaptation. Shared radius/height/cooldown remain 0.9 / 0.35–2.8 / 0.3 seconds, human buffer 0.18, nominal shot duration 1.65; initial serve 0.35 seconds, next serve 0.85 after a result.

Yuka was not adopted: builder inspected official state-machine documentation and npm v0.7.8 contents (7 files, 1,031,182 unpacked bytes, roughly 443 KB ESM bundle, no TypeScript declarations). Its type/adapter overhead exceeded the benefit of four plain states; used the handoff's allowed enum fallback. No new runtime dependency.

Parent review and verification:

- Both labour agents used explicitly requested GPT-6 Luna at xhigh. Parent reviewed shared mechanics, rival/rally flow and integration, caught the initial incorrect current-position landing helper and interpolation holds, and retained pause contact/timer state.
- Independent legal-movement simulation probe initially found 3.6 and 2.8 u/s rivals too effective. A reachability filter briefly made difficult short shots cause the rival to stay at home; fixed to chase a best-effort strike. An isolated speed sweep then showed neutral sustained rallies and genuine alternating-placement misses at 1.8. This is initial tuning evidence, not a final user balance verdict.
- Parent final full suite: **49/49 tests pass**, typecheck passes. Includes shared contacts/shot IDs, both-side bounces, mirrored aim, bounded speed/legal rival half, finite reaction/reachability, a legal-player six-contact rally and placement win, terminal guards and reset/pause bookkeeping. Production build passes; Vite reports its advisory for a roughly 504 KB minified JS bundle.
- Codex in-app browser, actual keyboard input: Space on incoming flights 1/3/5 produced six alternating contacts, outgoing flight 7, no fault. Rival visibly moved from z -5.6 toward -3.8 and returned the ball. A later trial sustained 23 contacts while using real aimed key combinations.
- Codex browser placement win: moved slightly forward to z≈5.01, alternated Left+Down+Space / Right+Down+Space with forward correction; five human shots / nine total contacts ended flight 10 in `Second bounce`, winner `player`, terminal resolution 1. Final ball (-3.819,0.22,-5.202), rival (-2.879,-5.176): it chased and fell outside the shared contact radius.
- Pause during track held ball flight 2, simulation time 2.183, rival reaction 0.30217, actor positions, cooldowns and consumed IDs exactly unchanged across a 350 ms wait and ignored W/Space presses. Reset while paused restored both starting positions, waiting phase/time 0, no ball, both contact IDs -1, zero cooldowns and reaction. Resume retained the cleared state. Existing focus-loss handler is preserved; Layer 2's user-verified real-window held-key test remains applicable.
- Intentional no-kick miss produced `Second bounce`, winner `rival`, terminal count 1. It remained 1 during the result delay; serve 2 started a new flight and cleared the result automatically.
- Practice regression in Codex: five consecutive actual Space returns, feeds 1–5 each terminal `Returned`, five returns. Movement route and legacy switch both show no ball/stationary rival; actual Up moved z 5.65→5.57. A CSS grid override initially exposed the hidden Space instruction in movement mode; parent fixed it and reverified the DOM.
- Production preview in Codex: Play, actual opening return, automatic rival return (two contacts), and Escape pause work; telemetry hidden; no warning/error captured in its fresh tab. A transient `RIVAL_SPEED_LABEL` error occurred during development edits, was fixed before stable testing, and is absent from the final source/typecheck/production run. Local active rally frame-delivery sample: 200.0 RAF callbacks/second. Frame delivery is specific to this machine/browser and is not a low-end benchmark.

Layer 3's playable gate is closed. Layer 4 (first-to-five scoring and rematch) is next. Huge-shoe chibi characters, power/audio/effects, adaptation and public deployment remain unimplemented. The orthographic cube camera remains a placeholder. Development server remains available on 127.0.0.1:5173; production preview is temporary. No Git checkpoint or public deployment was created.

Final production capture: [Layer 3 rally](verification/layer-3-production.png). The temporary preview was stopped after verification; the default development game was reopened ready in a fresh Codex browser tab with no console warnings/errors and marked to remain open.

## 2026-09-27 — Layer 4 documentation handoff

Created [Layer 4 handoff](layer-4-handoff.md) from the accepted first-to-five/loser-serves/rematch requirements and current Layer 3 source. It records match-versus-rally restart ownership, terminal scoring guards, mirrored automatic serves, point reset versus pause preservation, first-two-rally tuning counters, input/button activation, and deterministic/browser verification gates. Recommended module/state/query/reset choices are identified as implementation recommendations.

Updated AGENTS.md, README, CLAUDE.md, project context, implementation plan and the Layer 3 handoff to point to the new entry point. GPT-6 Luna xhigh drafted the handoff; parent checked it against the source/spec and refined lifecycle/input details. The existing development listener on 5173 was confirmed. This task changed documentation only; Layer 4 code has not started. No game tests/build or browser playtest were rerun for this documentation request; Layer 3 verification remains the prior recorded evidence.

## 2026-09-27 — Layer 4: First-to-five match, focus-loss gate open

Implemented `src/game/match.ts` as the score/lifecycle/serve owner. Phases are menu, ready, rally, point_result, match_result under the existing ready/playing/paused shell. The controller only steps rally physics during a live point, so rally regression restart timers cannot schedule match serves. A normal mirrored safe shot starts each point; the rival serves first, then the point loser. Scores resolve once per live point, first to five without win-by-two. Practice-only `Returned` is explicitly excluded from scoring. The one-second point result and 0.35-second ready cue advance only with simulation steps.

Default `/` and `?mode=match` now run the full match. Explicit `?mode=rally`, `?mode=practice`, `?mode=movement`, and legacy `?practice=0` remain. R/Reset resets the entire match while preserving pause. Between points both current/previous actor positions, ball, contact IDs/cooldowns, pending kick and input/aim are reset; score and serve count persist. Rematch clears score, point sequence, terminal/run counters and all rally state. Run serve count crosses two, preserving the original opening tuning rather than restarting it each point.

Play/Resume/Rematch/Reset restore scene focus; global Space handling respects normal accessible button activation and accepts kicks only during live ball play. Match result cannot auto-serve. Parent review fixed a pause/result overlay stacking conflict, point-message grammar, and a measured score/toolbar overlap by moving the score into the top header. No tuning, art, power, adaptation, backend, dependency, deployment or second frame loop was added.

Verification actually performed:

- GPT-6 Luna xhigh implemented the controller, integration and focused tests; parent reviewed source and exercised the Codex in-app browser. Parent caught/fixed the out-fault fixture (originally inside the net), practice-only result guard, input focus, and HUD issues.
- **57/57 tests pass**, including first-to-five/no win-by-two, both winners, correct fault mapping, court lines, exactly-once scoring, loser serves, both actor transforms/contact reset, Rematch, four-serve counter persistence and zero-simulation-time delay preservation. Typecheck and production build pass. Final build retains Vite's approximately 509 KB chunk advisory.
- Codex browser deliberate misses completed **0–5 rival victory**. Successive observed points incremented once; losing player served the later points. Fifth point entered match_result with no later serve.
- Codex browser actual movement keys plus alternating short-flank Space chords completed **5–3 player victory** across eight points. The first two points took 25 and 19 contacts in the final successful run; later wins used player serves and four-contact rallies. Point/server transitions and terminal count were recorded from DEV DOM telemetry. Final rival chased the ball to approximately x=-2.32,z=-5.43 but missed the second bounce at x=-4.36,z=-5.45. No ball/score/actor state was injected into the browser.
- Multiple placement trials also sustained 25 and 23 contacts; a prior full mixed match ended 3–5. These are local playtest evidence, not final balance/performance claims. Telemetry-guided keyboard automation is not a novice-player study.
- Result remained visible after elapsed time and Space on the court; scores/serves held. Escape at match result showed Pause, then resume restored the result. Enter and Space activated Rematch normally. Fresh paused Rematch state had score 0–0, rival server, sequence/serves/terminal count zero, no ball, consumed IDs -1 and cooldowns zero. Subsequent opening point played normally without a leaked activation kick.
- Pause during an active mixed rally held ball, actor positions, reaction, flight IDs/cooldowns and timers exactly unchanged through ignored W/Space input. Pause during point_result held score, stopped ball, actor position and remaining delay 0.917 exactly unchanged through ignored W/Space. R during that pause restored 0–0/ready, delay 0.35, zero counters, and retained paused status. Resume timing resets accumulator/frame origin in the single existing loop.
- Regression routes on final gameplay code: practice feeds 1–5 all completed `Returned`; standalone rally sustained six contacts/flight 7; explicit movement and legacy movement both hid kicks, kept no ball/stationary rival, and actual Up moved z=5.65 to 5.57. Fresh regression tab had no captured warning/error.
- Final production preview completed **0–5**, Space Rematch reset 0–0/rival server, actual repeated Space input produced player and rival returns (two contacts), and Escape paused. DEV telemetry was hidden; the fresh preview tab captured no warning/error. The final HUD positioning was verified separately after the CSS-only rebuild.

**Remaining verification gate:** fresh *real-window* focus loss during an active rally and during point_result. The existing blur/visibility handler and prior Layer 2 user-verified focus-loss evidence are preserved, but selecting/clicking Finder through this automation did not reliably produce browser focus loss; this is not a fresh pass. A concise user check was requested while independent work continued. Layer 4 implementation is playable; do not label its entire manual gate closed until this check is confirmed. Supported-resolution/final-art performance acceptance remains later delivery work.

Captures: [player win](verification/layer-4-player-win.png), [production result](verification/layer-4-production.png). Development remains on `http://127.0.0.1:5173/`; temporary production preview is stopped after verification. No Git repository/checkpoint or public deployment exists.

## 2026-09-27 — Layer 5 documentation handoff

Created [Layer 5 handoff](layer-5-handoff.md) from the accepted plan/spec and current match/contact/input/render source. It distinguishes accepted requirements from implementation recommendations and covers perfect timing versus buffered press time, power surviving replaced rally state, third-perfect/next-contact accounting, safe-launch speed limits, once-only event identity across reused flights, pause/reset/audio lifecycle, reduced motion, and deterministic/browser verification. Preserved the open Layer 4 real-window focus-loss gate. Updated the repository index and orientation links.

This request changed documentation only; Layer 5 code has not started. Development listener on 5173 was confirmed; 4173 is stopped. No gameplay tests/build or browser checks were rerun for this handoff; prior Layer 4 evidence remains as recorded.

## 2026-09-27 — Layer 5 continuation: prerequisite check pending

Read the Layer 5 handoff, accepted implementation plan/spec, asset manifest and current contact/rally/practice/match/input/render lifecycle. Reconfirmed the existing development listener on 5173 and reran the baseline suite: **57/57 tests pass**. No Layer 5 gameplay changes were made.

Opened a fresh Codex in-app match tab. Enter activated Play and Reset. Selecting Finder and opening its real Recents window through native automation did **not** trigger an observable pause: the match advanced from ready through a rally to point_result while the browser still reported playing. This automation attempt does not establish that a human window switch fails or passes. Native control of the Codex application was denied by the computer-use tool, so that route cannot establish the missing real-window evidence. Requested user verification of actual app switching during a live rally and point_result; confirmation is pending. The handoff explicitly requires that gate to close before gameplay changes. The development tab is restored to ready and retained for the check. No typecheck/build or production verification was rerun in this attempt.

## 2026-09-27 — Layer 5: Timing, power, and feedback implemented

On the renewed user request to complete Layer 5 and test in the Codex browser, proceeded with the accepted implementation while preserving the controlled real-window focus-loss check as unverified. Implemented directly; no subagent or external asset-team message, new dependency, public mode, backend, camera shake, adaptation or character asset was added.

### Behavior and selected tuning

`src/game/feedback.ts` supplies shared pure timing/accounting and a bounded stream of explicit contact/bounce/serve/point/match events. Match owns its feedback object and shares it with each replacement rally; rally/practice own equivalent run-lived feedback. Original Space press time is retained through the existing 0.18-second buffer, at 60 Hz simulation resolution. One reference is fixed per incoming flight/bounce trajectory at a descending height of **1.2 units before bounce / 0.9 after a legal first bounce**, provided the crossing is within the reachable court envelope. The total **100 ms perfect band is inclusive ±50 ms**. Shared eligibility, height/radius/cooldown, consumed-flight and scoring rules remain authoritative.

Three perfect accepted player contacts fill three segments. The third remains perfect; the next valid contact consumes all charge, with no reward from that same powered contact. Invalid/expired/distant/held requests do not alter charge. Point transitions retain charge, while Play from menu, Rematch and R/full reset clear it. Rival uses its existing regular shots and shared controller.

Nominal shot durations **1.65 / 1.4 / 1.2 seconds** for regular/perfect/powered, with positive net-clearance margins **0.18 / 0.12 / 0.06 units** respectively. Safe-launch still increases duration when necessary; the differing positive margin preserves actual speed differences near the net rather than merely changing nominal duration. Regular retains the prior trajectory. The cosmetic powered body pose lasts **0.55 seconds** and rotates/lifts the cube body separately from the grounded ring/facing indicator. Movement/aim/simulation continue throughout. Timing labels last **0.45 / 0.8 / 0.8 seconds**.

Added subtle regular and brighter perfect/gold powered trails, contact bursts using **72 pooled meshes**, a **64-event** queue drained every fixed step, and synthesized normal/perfect/power/bounce/point/win/loss cues. First and second bounce callbacks originate inside analytic physics and emit once even in a catch-up step; contact resets do not masquerade as bounces. Run sequence avoids event collisions when flights restart at a point. Point/serve/full-reset boundaries clear trail history; pause freezes cosmetic ages and stops/suspends audio. Audio never queues events until unlock or replays paused events. Unsupported/failed audio cannot stop gameplay.

Mute unlocks through Play/Resume/Rematch and is accessible before Play. Mute survives Rematch/R. Device reduced-motion preference is respected; added an accessible **Reduce motion** control so players can request calmer effects without changing OS settings. Device preference takes precedence. Both preferences survive Rematch/R. Reduced motion suppresses trails/body rotation/lift and emits only two stationary burst particles. No camera shake. HMR cleanup now includes Rematch/new controls, media-query listener, audio nodes and effect geometries/materials. The single app frame loop is retained. Moved feedback below the control strip to keep timing text clear of it.

### Verification actually performed

- Final **76/76 tests pass**, typecheck and production build pass. Tests cover inclusive timing boundaries, fixed and bounce references, early buffered versus expired requests, held Space, charge fill/spend/invalid contact, pending-request clearing, zero-time freeze, charge across point replacement/full reset, bounded/drained event identity, first/second bounce catch-up, single-point scoring/all qualities, match-result serve guard, audio unlock/mute/pause/no-replay/factory failure, pooling/disposal and reduced-motion behavior. Actual-velocity trajectory checks cover both halves, heights 0.35/1.2/2.8, depths 0.62/5.65/7.22 and left/right/neutral × short/deep/neutral aim. All qualities land on target, clear the net slab and have decreasing actual flight durations. A positioned rival returns a powered neutral shot through the unchanged controller. Build advisory remains at approximately **517 KB minified JS / 134 KB gzip**.
- Codex in-app browser, actual Space presses (no ball/charge/actor state injection): an early buffered regular shot had press time **1.600**, reference **1.777**, acceptance **1.750**, and no charge. In a fresh match, three player perfects on incoming flights **1/3/5** raised charge **1/2/3**; press/reference times were approximately **1.750/1.777**, **4.433/4.454**, **7.133/7.153**. Third shot remained perfect. Perfect cue and full meter were visible.
- Deliberately missed the next incoming ball: result **0–1**, full charge **3** survived point_result and the next player serve. An actual Space press while the ball was on the rival side kept charge **3**. Next valid incoming-flight-2 contact was **powered**, charge became **0**, and a right movement tap moved x **0→0.08** during the pose. The rival legally returned it to **flight 4 / three total contacts**.
- Pause held powered pose **0.516667**, rally time **3.100**, and **18** active particles unchanged over 350 ms. Audio status was suspended with zero voices. Paused Space did not create another shot. Point-result pause also retained full charge/score/delay. An early pending Space at rally time around **1.35**, followed immediately by Escape, paused at **1.416667** with request empty, consumed flight **-1**, and last shot null. Resume with no new kick left contacts/charge zero. An earlier slower pause attempt accepted a regular shot before Escape; it was not used as evidence of pending-input clearing.
- Development full match completed **0–5**; Space Rematch restored **0–0 / rival serve / zero charge**, with mute retained and no leaked activation kick. Deterministic tests additionally cover both match winners and equal scoring for all shot qualities; no fresh Layer 5 browser player-win claim is made.
- Standalone rally regression sustained **six alternating contacts / flight 7** with actual keyboard input. That same rally later earned three additional perfects on flights **7/9/11** and spent on a powered flight-13 contact, with a live feedback capture. This checks the final body-pose separation in actual play.
- Practice regression produced **five accepted returns across six feeds**, with an intervening miss; the fifth return completed the existing far-court `Returned` result. Other timing trials had misses and are not presented as five consecutive perfects. Actual regular/perfect labels and charge progression were observed; practice remains a feed harness, not scored match mode.
- Explicit movement and legacy `?practice=0` both hid kick/power UI, reported disabled ball and stationary rival; actual Up moved z **5.65→5.49 / 5.57**. Browser console had no captured warning/error. Desktop viewport overrides **1280×720 / 1920×1080** showed distinct score/meter/mute/control framing and both court halves. Captures are scaled by the browser; these are readable framing checks, not exact pixel-resolution claims. Overrides restored.
- Real Reduce motion button in Codex: switching on cleared active particles without changing charge. A subsequent earned powered contact had **charge 0**, pose timer **0.533333**, reduced-motion true and **two** particles; source and engine tests establish those particles are stationary and body pose is suppressed. Paused R reset restored ready/0–0/rival serve with last shot null, pose/cue/time/sequence/particles zero, muted/suspended audio and reduced motion retained. OS preference switching was not performed.
- Production preview in a fresh Codex tab: actual opening Space produced regular contact feedback; Escape paused; complete **0–5** result and Space Rematch restored 0–0/rival opening serve. DEV telemetry was hidden and power/audio diagnostic attributes absent. No captured console warning/error. The final build was reopened with mute and Reduce motion enabled before Play, completed another **0–5** match, and Space Rematch restored **0–0 / rival serve / charge 0** while both preferences remained true. Fresh final-build console captured no warnings/errors.

### Remaining verification limits and next layer

Controlled **real-window switching during rally and point_result remains unverified**. One unscripted focus-loss pause was observed during a live incoming flight in development (Focus lost hint, charge preserved), but its exact external action was not controlled. Selecting/opening Finder in earlier automation did not establish focus loss; a later native Finder menu attempt was interrupted by changed app state. Native Codex app control is denied by the computer-use tool. Escape/observed blur are not recorded as substitutes for the missing controlled pair. Do not silently mark this gate closed. Failed/unsupported audio was verified by adapter factory tests, not by disabling audio in a real browser; subjective sound balance remains a playtest item.

Layer 5 functionality and core browser gates are implemented/verified; full manual focus verification remains open. Layer 6 huge-shoe chibi integration is next, with adaptation and deployment later. Development server is preserved on 5173; temporary production preview is stopped after verification and a ready development tab is retained. No Git checkpoint/public deployment exists.

Captures: [earned charge](verification/layer-5-charged.png), [live powered shot](verification/layer-5-power-live.png), [reduced motion](verification/layer-5-reduced-motion.png), [desktop framing 1280](verification/layer-5-framing-1280.png), [desktop framing 1920](verification/layer-5-framing-1920.png), [production result](verification/layer-5-production.png). The charge/live/framing captures precede the small Reduce motion button addition; reduced-motion capture includes that control.


## 2026-09-27 — Completed Layer 5 documentation handoff

Rewrote [layer-5-handoff.md](layer-5-handoff.md) as a handoff from the implemented Layer 5 checkpoint to Layer 6. Removed superseded pre-implementation API descriptions and recommendations; recorded current timed input/contact APIs, bounce callbacks, shared match feedback lifetime, run-scoped event fan-out, cube body versus ground-root boundary, pause/reset/preferences/audio/effect contracts, selected constants, performed verification and exact remaining limits. Added Layer 6 character integration steps and gates without implementing art or expanding scope. Updated AGENTS.md and README link descriptions and the asset manifest checkpoint status. Accepted requirements and historical evidence remain in the spec/plan/log.

Documentation only: inspected relevant current source and checked local document links. Reconfirmed development listener on 5173 and no listener on 4173. Did not rerun tests/build, gameplay or browser checks; prior 76-test and Codex-browser evidence remains as recorded. The controlled real-window focus-loss pair remains open.
## 2026-09-27 — Blender MCP tooling setup

User requested Blender MCP in Codex and project indexing for 3D models/animations. Installed `mcp-for-blender==2.1.1` with uv/Python 3.11, installed the matching add-on in Blender 5.2's user add-ons directory, enabled it and saved preferences using Blender's Python interface. Registered global Codex stdio server `blender` with absolute uvx path, loopback host/port 9876, and telemetry disabled. Existing Blender scene was preserved; a separate default-scene session owns the verified listener.

Verification: `codex mcp get blender` confirms enabled configuration; loopback listener verified; real MCP initialize/list-tools returned 36 tools; `get_scene_info` successfully read Cube/Camera/Light and startup confirmed add-on 1.7/protocol 11 on Blender 5.2.2 LTS. Initial non-TTY Blender session exited and its connection attempt failed; a persistent TTY-backed session resolved this and passed the real MCP read. Native UI input failed with `noWindowsAvailable`. Newly added tools require a Codex restart and were not dynamically available in this chat. No game assets/animation exports or runtime code changed; no gameplay tests/build rerun for tooling/documentation. Layer 6 and existing delivery checks remain open.

Added [blender-mcp.md](blender-mcp.md) with startup/recreation, exact local paths/version, troubleshooting, source/GLB workflow, animation conventions and adapter gates. Indexed in AGENTS.md, README and asset manifest. User approval covers this authoring tool; no external generation service or API subscription was added.

## 2026-09-27 — Blender character reconstruction checkpoint

Created `assets/blender/chibi-lineup.blend` through the configured live Blender MCP (5.2.2). Preserved starting scene and attached reference. Three detailed articulated appearances share armature data; a separate scene holds one `ChibiRig` with three interchangeable single-mesh skins. Verified final weights, shared armature targets, right-knee deformation and stationary heads, restored neutral pose, inspected render and viewport. See [character-recreation.md](character-recreation.md) and `assets/blender/rig-validation.json`. Exact visual matching remains unmet; hair, face/body and cleat differences are documented. No gameplay integration, animation clips, GLB export, or Layer 6 completion claim.

## 2026-09-27 — Shared Blender sports animations

Inspected current movement/contact/feedback and cube pose logic; authored ten shared 60fps clips (idle, run, jump, ground_kick, aerial_kick, header, jump_header, bicycle_kick, celebration, loss) using Blender MCP. Preserved pre-animation source, added editable timeline showcase and interactive preview, exported one-skeleton/three-skin GLB. Every Blender frame across all skins passed floor/loop/recovery checks. Actual official Three.js loader/mixer confirmed 17 bones, one shared skeleton, ten intended durations and sampled floor clearance. Fixed export time offset, an unintended extra-scene export and inter-frame bicycle floor intersection before final verification. See [character-animations.md](character-animations.md). Gameplay still uses cubes; this is animation authoring/export, not Layer 6 gameplay integration or final exact visual matching.

## 2026-09-27 — Animation continuation handoff

Added [animation-handoff.md](animation-handoff.md) and [Blender directory navigation](../assets/blender/README.md). Updated repository entry points, tooling/asset contracts, decision ledger and reference interpretation to distinguish authored assets from pending runtime integration and unmet exact fidelity. Documented destructive/regenerating script behavior, safe export settings, Blender scenes/action slots, orientation, shared-skin handling and continuation gates.

Read-only handoff checks confirmed the connected Blender source/scenes and Actions, the preview responding through the existing Vite server, and the GLB's one scene, 17 shared bones, three skin groups and ten clips. Local documentation links were checked. No assets or gameplay code changed; animation validators and gameplay tests/build were not rerun for this documentation task. Earlier validation reports remain the evidence for numerical asset checks.

## 2026-09-27 — Layer 5.5 jump, kicks, and headers

Added deterministic fixed-step jumping with full horizontal air control. Remapped gameplay to Space jump, F kick and E header; Reset is button-only. Ground/air state selects `ground_kick`, `aerial_kick`, `header` or `jump_header`, recorded on the accepted-shot snapshot and once-only feedback event for Layer 6. Kick and header requests have independent 0.18-second buffers and action-specific relative-height windows. Headers may earn regular/perfect returns and charge but cannot spend a full meter; only an accepted kick can become powered/bicycle.

Point/rematch/reset restore jump state. Pause/focus clearing covers all three input edges and pending action requests. Cube presentation lifts with logical jump height while its selection ring remains grounded. Existing rally, practice, match, movement and AI flows remain shared.

GPT-6 Luna performed the bounded implementation pass; the primary agent reviewed it and fixed two integration defects before acceptance: a header-only request was initially cleared after one step instead of retaining its buffer, and the grounded header window did not overlap the established 1.2-unit perfect reference. Regression coverage was added for retained early headers and a naturally reachable perfect-header height.

Final automated verification after the E remap: **82/82 tests**, typecheck and production build pass. The build retains the existing >500 kB advisory. Codex-browser practice verified visible jump, accepted ground kick, standing header and perfect aerial kick with actual input; after the remap, the UI showed E and an actual E press produced an accepted `header` event on incoming flight 1. The user also playtested the practice build. See [layer-5.5-handoff.md](layer-5.5-handoff.md) for the current controls, exact windows, animation clip mapping and remaining Layer 6 gates.

## 2026-09-27 — Layer 6 runtime character integration checkpoint

Integrated `public/assets/characters/chibi-animated.glb` behind `src/render/character-presentation.ts` using official GLTFLoader, SkeletonUtils clones and per-actor AnimationMixers. The adapter uses one 0.72 scale, shows one skin per actor, applies the exported +Z/game -Z half-turn, starts accepted action clips at their strike marker, advances only by fixed simulation delta and preserves grounded actor roots/rings. Existing cubes remain the loading/error fallback. Orange player / brown rival is an explicit provisional assignment; development query overrides allow all three skins to be inspected.

The adapter joined the existing single feedback-event drain alongside effects/audio. Explicit player actions select ground/aerial kick or standing/jump header; powered kicks select bicycle kick; match result selects celebration/loss. Reset/serve clears one-shots, pause freezes mixers, and reduced motion substitutes a ground kick for the flip. Gameplay physics and state were not changed.

Final automated verification: **83/83 tests pass**, typecheck passes and production build passes with the existing >500 kB advisory (633.39 kB minified / 166.42 kB gzip). Codex in-app browser loaded characters without warnings/errors on match, rally, practice and movement. Orange, bunny and brown were inspected at the match camera. Actual practice input produced accepted `ground_kick` and `header` events; reduced motion, pause and reset preserved character mode. Production preview loaded characters and entered IN PLAY with telemetry hidden and no captured warning/error.

This does not close Layer 6 delivery: a full first-to-five/rematch and deliberately earned powered kick were not replayed in-browser, controlled real-window focus loss remains open, and exhaustive contact/clipping/performance checks were not completed. Exact character fidelity remains unmet. See [layer-6-handoff.md](layer-6-handoff.md).

## 2026-09-27 — Layer 6 mouse aiming and mouse actions

Added free canvas mouse aiming by raycasting onto the rival court and clamping to a legal inset target. Accepted kicks/headers pass this explicit target through the existing contact and safe-launch path; physics, timing, power, eligibility and scoring are unchanged. A solid white overhead direction line/arrow with a thick black outline replaces the former far-court aim ring and hides outside live player-receive play. Before the mouse moves, movement-direction aim remains the fallback; Reset/Rematch restore neutral aim.

Mapped live-canvas LMB to the existing buffered kick request and RMB to the existing buffered header request. Suppressed the live-canvas context menu while retaining F/E keyboard fallbacks and normal UI-button behavior. Updated UI copy, README and handoff.

Final automated verification: **87/87 tests pass across eight files**, typecheck passes and production build passes with the existing >500 kB advisory (636.67 kB minified / 167.54 kB gzip). Codex-browser practice confirmed the outlined guide rendered and continuous pointer positions produced distinct court targets. The user received a refreshed practice tab for testing; their final feel/shot-placement and mouse-button acceptance is not yet recorded. Existing full-match/power/focus/clipping/performance Layer 6 gates remain open.

## 2026-09-27 — Supplied Blender beach court integration

Extracted the user-supplied court package into `assets/blender` without treating its README or imagery as instructions. Opened only `beach_court_environment.blend` in Blender 5.2.2 and used the configured Blender MCP to inspect 289 objects/81 materials and measure the authored white lines and net. Exported `public/assets/environments/beach-court.glb` after temporary glTF-safe flat-material conversion; excluded three cover planes that concealed baked reference-player/net artifacts, then reverted the source without saving export-only changes.

Added `src/game/court.ts` as the shared authored-coordinate contract. Replaced duplicated procedural values across ball in/out, net collision, movement, rival interception/targets, serves, practice feeds and mouse aim. Player/rival starts and safe movement/aim insets now fit the actual mesh. Replaced the procedural scene dressing with the supplied GLB while retaining a minimal sand fallback and simulation-timed environment mixer.

Final verification: **87/87 tests pass**, typecheck passes and production build passes (635.72 kB minified / 167.13 kB gzip, retaining the existing >500 kB advisory). Development practice loaded the golden court, white boundaries, net, beach props and both characters with no captured warning/error; telemetry showed the remapped starts and movement bounds. Full-match/rematch, deliberately earned power, controlled real-window focus and exhaustive clipping/performance checks remain open.


## Layer 6 movement/action repair — 2026-09-27

User rejected the previous checkpoint as unplayable. Repaired physics-to-character height, one-second ballistic airtime, jump-phase animation, jump-relative contact ceiling, immediate missed-action animation, body facing, rival header selection and settling during point results. Added actual GLB/mixer regression coverage: 98 tests pass, typecheck/build pass. Codex-browser live inputs accepted LMB aerial kick and RMB jumping header with visible physics lift. See [Layer 6 handoff](layer-6-handoff.md) for exact evidence and remaining acceptance gates.

## 2026-09-27 — Beach appearance export repair

Replaced the rejected flat export through Blender MCP with the authored frame-1 appearance on retained 3D geometry and the source perspective camera. Added exact projective sampling, fitted canvas framing, live actor shadow receiver and marker height fixes; removed the washout overlay during play. Original Blender source preserved. Six focused export checks, typecheck/build pass. Full-suite attempt: 97 existing checks passed, one timed out under load; stopped per the user’s request to avoid over-verification. Details and static-scenery limitation in [Layer 6 handoff](layer-6-handoff.md).


## 2026-09-27 — Beach Ball Boogey flow and music

Approved menu/player/difficulty/match/results flow implemented, with matching HUD and bottom-right controls. Supplied vintage Hawaii music loops with an independent persistent top-right toggle. Typecheck/build and 14 focused tests pass; brief browser checks covered selection, match entry, pause/restart, unattended result, rematch, main menu, help and music playback/toggle. See [menu flow handoff](menu-flow-handoff.md) for scope and remaining limits.
