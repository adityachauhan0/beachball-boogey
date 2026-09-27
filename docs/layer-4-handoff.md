# Layer 4 handoff — first-to-five match

Updated: 2026-09-27. **Layer 4 is implemented; both winners, rematch, regression routes and production match/rematch are verified. Fresh real-window focus-loss verification remains open.** Start with [AGENTS.md](../AGENTS.md), this handoff, Layer 4 in [implementation-plan.md](implementation-plan.md), and sections 3–5, 9, and 11 of [mvp-spec.md](mvp-spec.md). The Layer 3 state and exact evidence are in [layer-3-handoff.md](layer-3-handoff.md) and [implementation-log.md](implementation-log.md).

## Current checkpoint

Layers 1–4 are playable. Default `/` and `?mode=match` now provide first-to-five scoring and Rematch. `src/game/match.ts` owns phases, scores, simulation-time delays and loser serves; `rally.ts` remains the live-point mechanics and standalone regression controller. Match results stop serving. The original Layer 3 checkpoint had local AI rallies, shared two-sided contacts, terminal rally outcomes, and automatic rally restarts. At handoff, the game shell had `ready / playing / paused` without scoring/rematch. The implemented match now owns `menu / ready / rally / point_result / match_result` beneath that pause shell.

Current verification: 57 tests, typecheck/build, Codex-browser 5–3 player victory and 0–5 rival victory, keyboard Rematch, rally/point-result pause, reset, regression routes and production match/rematch pass. Fresh real-window focus loss during rally and point-result remains open. See the final Layer 4 entry in the implementation log. At the original handoff, 49 tests, typecheck, and production build passed. In the Codex in-app browser, the parent sustained six contacts and a 23-contact rally, won after a nine-contact alternating-placement rally, produced a rival win, checked pause/reset, and exercised practice and movement regressions. The development server was left available at `http://127.0.0.1:5173/`; check the listener before starting another server. The temporary production preview on 4173 was stopped after Layer 3 verification. Reuse the existing development server; run `npm test`, `npm run typecheck`, and `npm run build` after gameplay changes, and `npm run preview` only after checking port 4173. No Git checkpoint or public deployment exists. See the implementation log for the exact checks and limitations.

## Accepted requirements

- Add menu, ready, rally, point-result, and match-result phases, with pause preserving the active phase. Layer 4 has a 40-minute implementation budget in the accepted plan; reuse current gameplay and prioritize the complete match loop.
- Score **first to five, with no win-by-two**. Each valid terminal fault adds exactly one point; every point has equal value.
- The rival serves the opening point. After each point, the point loser serves automatically from a standard position. A serve is a normal safe shot received by the other side; do not add a manual serve mechanic.
- Preserve the current rules: one kick per side per incoming shot; one receiving-side bounce; a second bounce awards the point to the sender. The first landing outside the receiving half and net contact award the point to the receiver. Court-line landings count in.
- Resolve each point once, stop the active ball, and show the fault and updated score. After a brief point-result pause, serve the next point unless the match has ended.
- At five points, enter match result and stop automatic serves. Offer Rematch; it starts a clean 0–0 match with the rival serving first.
- Reset player/rival positions, ball, pending input, and contact/cooldown state at point boundaries. A full match reset also clears score and match-run counters.
- Pause and focus loss freeze the active match phase, ball, positions, and simulation timers. Clear held/queued input and any unconsumed kick request, but preserve consumed-flight IDs. Resume discards elapsed background time.
- Keep the local AI, fixed-step simulation, cube actors, existing practice/movement regression modes, and single frame loop. No scoring may be delegated to the browser DOM or presentation transforms.

## Existing code and traps

| File / behavior | Layer 4 implication |
| --- | --- |
| `src/game/rally.ts` | `stepRally` currently owns a terminal-result guard **and** an automatic serve/restart timer. In match mode, give next-point serving exactly one owner: move restart scheduling to the match controller or explicitly disable rally auto-restart there. Keep standalone rally regression usable. |
| `src/main.ts` | The fixed-step loop and ready/playing/paused shell already handle Play, Escape, focus loss, reset, modes, and development telemetry. Extend the existing loop; do not add a second RAF. |
| `src/game/contact.ts` | Shared rules expose receiver, side, height/radius/cooldown, shot IDs, mirrored aim, and the accepted-shot path. Keep these authoritative for both actors and serves. |
| `src/game/ball.ts` | `safeLaunch` provides the reusable safe serve trajectory. `stepBall` reports `Net`, `Out`, and `Second bounce`; rally mode opts into continuing after either side's first valid bounce. `landingIn` includes court lines. |
| `winnerFor` in `rally.ts` | `Second bounce` awards the point to the side opposite `receiver`; `Net` and `Out` award it to `receiver`. `Returned` is only the Layer 2 practice success result and must not score a match point. |
| Serve and reset lifecycle | Current serve always launches from the rival's half. It resets opponent state only; it does not reposition both actors or clear both contact memories. A match point boundary must do those resets while the ball is stopped. That visible reset is an intentional between-point ready reset, not a live-rally teleport. |
| Opening AI tuning | The rally controller's `serves <= 2` makes its first two serves forgiving. If match code recreates `RallyState` for every point, that counter starts over and every point stays forgiving. Keep a match-run serve/rally counter that advances across points and clears only on Rematch. |
| Flight IDs and scoring guard | Contact IDs may be reset at a point boundary. Do not identify a previously scored point by `flight` alone if new rallies restart at flight 1. Guard resolution by current match phase/point sequence, or keep a monotonic match-level flight ID. |

## Recommended implementation shape (not additional product requirements)

Add a small `src/game/match.ts` controller for score, server, point/match phase, between-point delay, match-run serve count, and one-time terminal scoring. Keep `rally.ts` responsible for one live point's contacts, rival stepping, and ball physics; human movement currently lives in the main loop. The match controller starts the next serve only after its point-result delay, with the loser as server and winner as receiver. Use the existing safe launch and mirror its starting/target halves.

Keep match phases such as `menu`, `ready`, `rally`, `point_result`, and `match_result` separate from the existing pause/resume shell. Match-result state must not call rally stepping or schedule a serve. Reposition both actors and create clean point state while the ball is stopped between points. Preserve the existing short result message, and add a readable score display plus Rematch control. `R` should reset the entire match to 0–0 with the opening rival serve; this is the recommended reset meaning for the match route. If resetting while paused, keep the pause until explicit resume. Reset both current and previous actor transforms to avoid interpolation from the prior point. Ready and point-result delays must use simulation time and freeze while paused, rather than wall-clock timeouts.

Proposed development URL mapping (choose and document it during Layer 4 implementation): make default / `?mode=match` the full match, retain `?mode=rally` for the Layer 3 rally harness, keep `?mode=practice` and `?mode=movement`, and preserve legacy `?practice=0` when no valid explicit mode is supplied. Existing default behavior is rally, so change it deliberately and keep every regression route explicit.

Handle Rematch and Play as normal accessible buttons, including Enter/Space activation. The current global key handler unconditionally prevents Space defaults; restrict kick handling to the live rally so that it does not block result/menu buttons or retain their activation key as a kick. Clear `KeyboardInput`, buffered kicks, aim, and frame timing at point/rematch boundaries.

Avoid expanding scope into Layer 5 timing/power/audio, Layer 6 art integration, Layer 7 adaptation, or deployment. No power or learned-match statistics exist yet; clear any current match counters on rematch without scaffolding future systems solely to reset them. Add no new AI/model/backend dependency. The user requested GPT-6 Luna xhigh for implementation labour; the parent remains orchestrator and browser tester. Use the Codex in-app browser for manual checks.

## Verification gate

Add focused deterministic tests for first-to-five/no win-by-two, both winners, opening rival serve, loser serves after a point, correct fault-to-winner mapping, net/out/second-bounce outcomes, a court-line landing, and exactly-once scoring. Verify point reset clears actor positions, ball, pending kick, contact IDs, and cooldowns while preserving the match score and serve count. Verify Rematch clears score, run counters, ball/contact state, and restores the opening rival serve. Check that `match_result` cannot auto-serve and that pause/focus loss freezes point/result delays and preserves contact IDs.

In the Codex browser, play a complete match to both possible winners, then Rematch and play again. Confirm the loser serves each next point, score increments once, the winning result stays visible, and no Space press leaks into a later point or Rematch. Check pause and real focus loss during a rally and point-result delay, then resume. Recheck `?mode=rally`, `?mode=practice`, `?mode=movement`, and legacy `?practice=0`; run unit tests, typecheck, production build, and production preview. Record only checks actually performed in `implementation-log.md`; do not call Layer 4 complete from unit tests alone.

## Implementation decision — 2026-09-27

The user requested continuation of this handoff. Adopt the recommended match controller and default `/` / `?mode=match` mapping; retain explicit rally, practice, movement and legacy routes. Implement the accepted complete-match loop before later feedback/art/adaptation. GPT-6 Luna xhigh handles implementation labour; the parent reviews and verifies in the Codex in-app browser. Actual evidence is now recorded in the implementation log. The fresh real-window focus-loss check is the remaining Layer 4 gate.

## Next implementation handoff

[Layer 5 handoff](layer-5-handoff.md) covers accepted timing, power, effects/audio and current integration traps. Layer 5 code has not started; close the recorded real-window focus-loss gate before changing gameplay.
