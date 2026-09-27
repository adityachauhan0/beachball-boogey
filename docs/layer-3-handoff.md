# Layer 3 checkpoint — local AI rallies

Updated: 2026-09-27. **Historical Layer 3 checkpoint, implemented and verified. Layer 4 scoring/rematch is now implemented; see its handoff/log for current evidence and the remaining focus-loss check.** Start with [AGENTS.md](../AGENTS.md), [implementation-log.md](implementation-log.md), and Layer 4 in [implementation-plan.md](implementation-plan.md). The accepted rules remain in [mvp-spec.md](mvp-spec.md). Layer 2's formerly pending manual gate is closed; its historic details are retained in [layer-2-handoff.md](layer-2-handoff.md).

## Run and modes

The existing development server is available at `http://127.0.0.1:5173/`. Verify the listener before starting another server; process IDs are transient. `npm run dev` uses strict port 5173. `npm run preview` uses 4173 and requires a current build. No Git checkout/commit or public deployment was created.

| Query | Checkpoint |
| --- | --- |
| Default / `?mode=rally` | Moving local AI rallies |
| `?mode=practice` | Layer 2 feeds and stationary rival |
| `?mode=movement` | Layer 1 movement, no ball |
| `?practice=0` | Legacy movement; valid explicit `mode` takes precedence |

WASD/arrows move and aim; Space requests an assisted kick; Escape pauses/resumes; R/reset recreates both players and all rally state. Ready/playing/paused still uses one fixed-step loop. A fault shows its winner/reason and automatically starts another rally; there is no match score yet.

## Code map

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Modes, one fixed-step loop, input/lifecycle, actor interpolation, HUD and DEV telemetry |
| `src/input.ts` | Held/tapped movement and edge-triggered Space |
| `src/game/movement.ts` | Shared normalized movement and legal bounds |
| `src/game/ball.ts` | Analytic trajectories/net/ground events, landing and descending-height prediction |
| `src/game/contact.ts` | Both-side contact rules, aim targets, safe launch, receiver swap and shot IDs |
| `src/game/practice.ts` | Repeatable regression feeds, explicit successful far-side landing |
| `src/game/opponent.ts` | Recover/track/intercept/return rival, reachability and best-effort pursuit |
| `src/game/rally.ts` | Waiting/playing/result loop, alternating contacts, winner/fault guard and restart |
| `src/render/ball.ts` | Explicit ball/time/visibility/landing/aim input; independent of practice state |
| `tests/rally.test.ts` | Both-side contacts/bounces, local AI, legal-controller rally/win, lifecycle |

## Rules and tuning

Both actors share a 0.9-unit horizontal contact radius, y 0.35–2.8 window, 0.3-second cooldown, legal receiving half, and consumed incoming-shot identifier. Each accepted contact immediately returns to the opposite side, resets bounce count, and advances `flight`. One receiving-side bounce is playable on **both** halves. Net, out and second bounce are terminal. Practice retains `Returned` on a valid far-side landing via ball-step options; rallies explicitly disable that completion.

Human kick buffer is 0.18 simulation seconds. Neutral shot target is (0,-5), lateral aim ±3, forward/back depth -6.8/-3.2; rival-side targets mirror the half and orientation. Nominal shared shot duration is 1.65 seconds, raised for net clearance as needed. Opening serve arrives near the player start (0,5.65), after a 0.35-second ready delay; another serve begins 0.85 seconds after a terminal result.

Rival starts at (0,-5.6), uses mirrored x ±4.35 / z -7.22…-0.62 bounds, and moves at **1.8 u/s** versus player 4.8. Its deterministic reaction delay is 0.28–0.38 seconds, with target error capped at 0.38. It predicts descending strike samples from shared trajectory math; if the first target is difficult, it pursues a legal best-effort target instead of giving up. First two rallies return near the centre; later placements depend on current positions, without history-based adaptation. The parent speed sweep and actual keyboard win motivated the slower setting; it is initial playable tuning, not a final balance verdict.

Yuka's allowed enum fallback was selected after inspecting its package/type overhead: v0.7.8 has no TypeScript declarations and about 1 MB unpacked for four states. No Yuka code/dependency was adopted. See [reuse-research.md](reuse-research.md).

Pause retains the ball, rival timers and per-actor contact/cooldown state, clearing only input and pending kicks. Reset clears both actors, contact IDs, timers, ball, counters and accumulated frame time. Do not clear consumed IDs during ordinary pause or create a second loop.

## Verification gate closed

Exact evidence and limitations are in [implementation-log.md](implementation-log.md):

- **49/49 tests**, typecheck and production build pass. Build has Vite's roughly 504 KB chunk advisory.
- Codex in-app browser actual Space input sustained six alternating contacts (flight 7); a later trial reached 23 contacts.
- Forward positioning and alternating short flanks produced a nine-contact human win. The rival visibly chased the final shot and missed outside the shared radius.
- Deliberate miss produced a rival win; terminal count held at one before automatic serve 2.
- Pause held ball, positions, reaction timer and contact IDs unchanged; reset while paused restored clean starting state.
- Five consecutive practice feeds returned on final code; movement and legacy routes work.
- Production preview: Play, opening return and Escape work; telemetry hidden; fresh-tab console clean.

DEV DOM telemetry exposes ball/landing, rival state/reaction/position, rally phase/time/contacts/flight/bounces/result/winner/terminal count, and per-actor consumed IDs/cooldowns. `data-fps` measures local RAF delivery (observed 200.0); it is not a low-end performance guarantee. Layer 2 framing checks used Codex viewport overrides with scaled screenshot composition; exact CSS-pixel capture and final art/camera acceptance remain delivery work.

## Next work and boundaries

Start with [Layer 4 handoff](layer-4-handoff.md). Implement Layer 4 first-to-five score, loser serves, point/match result and rematch from the accepted plan; preserve these regression modes, contact rules, lifecycle and winner adjudication. Do not silently add adaptation, power/audio or character assets to this layer. Cube/orthographic presentation remains temporary; later art must use huge-shoe human chibis from [asset-manifest.md](asset-manifest.md).

User-approved delegation: GPT-6 Luna at xhigh for labour; parent orchestrates, reviews and tests. Browser checks use the **Codex in-app browser**. Design assets are not a gameplay dependency; do not message an asset team without authorization.
