# Layer 7 — difficulty and adaptive opponent implementation plan

Superseded for urgent delivery by the user-approved five-arm learning selector and three difficulty presets. See [layer-7-handoff.md](layer-7-handoff.md) for what is implemented. Expanded rival aerial actions and neural experiments below remain deferred proposals.

Date: 2026-09-27. Status: proposed implementation plan; research/documentation only. No gameplay changes or model adoption in this pass.

Read [layer-6-handoff.md](layer-6-handoff.md) for current mechanics and open acceptance gates, and [ai-opponent-research.md](ai-opponent-research.md) for the revised evidence. This plan supersedes the original Layer 7 details wherever they assume keyboard-only aim, a permanently grounded rival, or the former court.

## Outcome and approach

Provide Easy/Normal/Hard and a rival that legally moves, jumps, kicks and headers, learns the player's observed placement/depth tendencies within a match, and changes readable tactics between points. Recommended implementation is a deterministic action planner plus bounded match statistics. A trained neural tactical policy is a separate optional experiment after this baseline is verified; it is not required to deliver adaptive AI.

Three approaches were considered: explicit planning (recommended; little integration risk), a trained tactical MLP above the same planner (small inference footprint, extra training/evaluation work), and end-to-end learned movement (largest training and regression risk). The research did not establish a pretrained model compatible with our mechanics.

## Mechanics that the design must respect

| Current contract | Implementation consequence |
| --- | --- |
| WASD/arrows movement, independent continuous mouse aim | Observe accepted outgoing trajectories; movement direction no longer reliably indicates shot direction. Never read live cursor or buffered player actions. |
| Space jump: speed 6, gravity 12, 1 s airtime, 1.5 apex | Rival uses `stepPlayer` and these same constants; no direct height assignments for interception or midair jumps. |
| Ball gravity 8; bounce changes velocity | Predict with `ball.ts`, including the legal first bounce and terminal second bounce. Actor and ball gravity are different. |
| Ground threshold 0.12; radius 0.9; cooldown 0.3 s | Pass an explicit `ContactAction` and actual actor height to `tryContact`; preserve ownership and flight locking. |
| Kick relative height 0.35–1.45 grounded, −0.2–1.45 airborne; header 1.15–2.8 grounded, 0.9–2.25 airborne | Evaluate exact shared windows, including the broad absolute floor 0.35 and actor-relative ceiling. Broad reach alone must not authorize a strike. |
| Authored asymmetric court and net 1.435 | All targets, normalization and bounds derive from `court.ts`; do not mirror the player's baseline to infer the rival baseline. |
| Visual jump follows logical height; clips compensate baked lift | Rival receives interpolated height and vertical velocity just like the player, including cube fallback. |
| Match creates a fresh RallyState each point | Match adaptation cannot live only in `OpponentState` or be erased by `resetOpponent`. |

## 1. Difficulty configuration and ownership

Add `src/game/difficulty.ts` with immutable presets and explicit `Difficulty` type. Normal is the default. Initial tuning, subject to playtesting:

| Setting | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Reaction delay per incoming flight | 0.42–0.56 s | 0.28–0.38 s | 0.18–0.28 s |
| Intercept target error cap | 0.55 | 0.38 | 0.20 |
| Samples before adapting | 6 returns | 4 returns | 4 returns |
| Recovery displacement cap from home | 0.6 | 1.0 | 1.4 |
| Shot aggression: safe-to-wide target blend | 0.25 | 0.55 | 0.80 |

Keep rival speed at the current 1.8 across presets for the first measured pass, player speed at 4.8, and action/physics rules shared. All modes can jump; Easy prefers later grounded interceptions when available. Treat the wider mouse target range as a balance risk: if all difficulties miss most flank shots, first inspect recovery and intercept timing. Any later global rival-speed retune must update reachability and movement together and be recorded; never silently increase speed during adaptation.

Store selected difficulty on MatchState, copied into each rally's controller context. Pick before Play and at match result; lock during a running match. Rematch retains selection but clears learned statistics, reaction/plans, jump/action state and input. No localStorage dependency is needed. Practice/movement retain their controls; standalone rally defaults to Normal with its own session adaptation state.

## 2. Shared legal actions and a grounded baseline

In `contact.ts`, extract the existing action-height predicate into a pure helper used by both prediction and authoritative `tryContact`; keep exact current boundary behavior. Do not duplicate a second version of those windows.

In `opponent.ts`, return accepted contact metadata (`action`, position, incoming flight) rather than just a boolean. `rally.ts` emits that actual action instead of inferring it from world height after the fact. First make grounded kick/header selection explicit and preserve existing returns before adding jumps. Keep rival shot quality regular; giving the rival a power meter is outside this layer.

## 3. Bounded aerial interception

Add a focused `src/game/opponent-planner.ts` only if needed to keep `opponent.ts` manageable. Produce `InterceptPlan { flight, contactAt, target, action, jumpAt? }` using simulation time, not wall time.

After the flight reaction delay, evaluate a bounded candidate set over the incoming ball's remaining life: up to 120 simulation samples at 1/60 s, ending immediately on a net/out/second-bounce fault. Run prediction on a small copied BallState using existing `stepBall`, with feedback disabled. Enumerate a bounded set of takeoff delays (0, 0.1, 0.2, 0.3, 0.4 s) plus staying grounded; if already airborne, only the current jump trajectory is legal. Use the shared movement integrator on scratch states to validate shortlisted horizontal paths and jump windows; an optimistic speed×time test alone cannot guarantee the discrete steering path reaches the ball.

Prefer a reachable grounded return; select an aerial return when it materially advances contact or makes an otherwise unreachable high ball playable. Use deterministic tie breaks and per-flight bounded error. A plan never grants a contact: the live simulation must still pass `tryContact` at strike time. If no candidate is feasible, chase the closest legal intercept/bounce position and allow the miss.

Cache the plan per flight; invalidate on bounce, changed flight, expired contact window or observed divergence. Replan at most 10 Hz plus those events. Once launched, never reset vertical velocity to fit a revised plan. Sample errors once per flight using point sequence plus flight ID so new rally IDs do not repeat the exact same mistake pattern every point.

Critical integration fix: advance rival movement/jump physics exactly once every active simulation tick, including track/reaction/return branches. Current early returns skip `stepPlayer`; leaving those branches untouched would freeze a jumping rival. Compute the intended movement/jump command first, then integrate once, then attempt contact.

## 4. Rendering and lifecycle parity

Update `main.ts` to pass rival `jumpHeight`/`jumpVelocity` to `characters.update`, interpolate rival pose height, and settle airborne rivals during non-rally transitions. Apply the same visible-height behavior to cube fallback. Point events clear action clips; reset/serve boundaries explicitly clear both actors' height, previous height, velocity and action.

`match.ts:resetActors` currently resets these fields only for the player: extend it to the rival. Standalone rally serve/reset needs the same vertical reset semantics. Pause freezes all simulation timers and jump motion; focus loss also clears inputs. Strikes face the committed shot target; ordinary movement faces travel. Preserve the authored camera, mouse raycasting and static court appearance.

## 5. Match-local observations and adaptation

Add `src/game/adaptation.ts` with bounded statistics and pure tactic selection. MatchState owns the object and passes it through successive rallies. Standalone rally owns an equivalent object for its session. Serve/point resets clear controller transients only; full reset/Rematch creates new statistics.

Record exactly once per accepted player return: projected landing from the new outgoing velocity, player position/depth at contact, action and quality. Exclude serves, misses and repeated button requests. Key observations by point sequence plus incoming flight ID. Classify continuous landing x into left/centre/right thirds using court dimensions; retain a ring buffer of the last 12 valid returns. Also accumulate time-weighted player depth during live play, rather than only contact depth, to detect camping without render-rate bias. Maintain bounded point win/loss counts for diagnostics, not automatic score rubber-banding.

At `finishPoint`, after a single validated terminal outcome, choose the next tactic. Before the sample minimum and during the first two points, use Balanced and forgiving returns. Thereafter:

- Favourite lane at ≥65% of recent returns: Cover left/right; shift recovery toward that lane by the preset cap.
- Time-weighted depth in the front third: Play deep. Back third: Play short.
- Otherwise Balanced. If side and depth signals both qualify, choose the stronger normalized excess beyond its threshold; ties retain the current tactic, then use a fixed priority.

Hysteresis: an existing lane tactic remains eligible down to 55%; front/back tactics remain until mean depth leaves the corresponding outer 40%. A challenger must win on two consecutive point decisions to replace a still-eligible tactic. Switch immediately to Balanced when no signal remains eligible. Clear challenger state on reset. Freeze tactic during each point and display its short label during point_result/ready.

## 6. Continuous shot and recovery choices

Derive legal rival aim bounds from the player half with a 0.3 baseline/side inset and 0.65 net inset. Use side-specific helpers rather than reusing `PLAYER_AIM_BOUNDS`, which targets the rival half.

Generate a small candidate set at left/centre/right × short/mid/deep positions expressed as fractions of those bounds. Score distance from the observed player position, the current tactic and safe central placement, then blend the selected target using the preset aggression and add bounded seeded variation. Send the resulting continuous target through existing `safeLaunch`. Estimate arrival with its actual computed launch, since net clearance may lengthen flight beyond nominal shot duration. Do not promise a low/fast trajectory simply from the chosen label.

Commit aim when selecting the return; update only on a legitimate replan. The rival can react to visible player position and ball flight, but cannot anticipate an unexecuted mouse aim. Recovery stays on the rival half, moves through `stepPlayer`, and begins after contact. It never teleports to its preferred position.

## 7. UI and focused verification

Add the difficulty selector to existing menu/result controls in `index.html`, with wiring in `main.ts` and minimal changes to current styles. Keep controls explicit: WASD/arrows move, mouse aims, Space jumps, LMB kick, RMB header, F/E fallback. Display a brief tactic label between points; keep internal model terminology out of game UI.

Focused automated checks:

1. Each preset is threaded through actual reaction and interception; Normal retains baseline settings. Difficulty survives Rematch while statistics and plans clear.
2. Explicit grounded/aerial action windows, no double jump/contact, legal movement/net bounds, and one integration per tick across all opponent states.
3. A high incoming ball causes a real rival jump/header; accepted action reaches feedback and presentation. Post-bounce replan works; unreachable shots still miss.
4. Independent movement and mouse targets produce correct observed lanes. Serves/misses do not inflate statistics; replacing RallyState preserves them.
5. Controlled histories select each tactic, hysteresis resists a single contrary shot, and all state resets properly.
6. Pause, point result and reset while airborne preserve/settle/reset both actors as specified.

Run the affected tests, then typecheck/build and one full suite at the stable checkpoint. The latest environment repair had six focused passes but no new complete-suite pass; do not carry forward 98/98 as a fresh current result. Honour the request for short verification: investigate only a relevant failure instead of repeatedly running broad checks under machine load.

Browser check: one Normal first-to-five/Rematch with mouse controls, at least one accepted player aerial kick and jumping header, visible rival aerial return, deliberate three-perfect power spend, one observed adaptation change, plus short Easy/Hard comparisons. Carry forward controlled real-window focus and visual clipping checks from Layer 6; do not mark them passed from Escape or unit tests. User feel acceptance remains a separate recorded verdict.

Small deterministic balance probe: fixed seed set and scripted legal players for centre-safe, alternating continuous flanks, forward/back camping and mixed aerial play. Report return rate, rally length, point wins and jump attempts by difficulty; verify Hard is stronger in aggregate without requiring every seed to be monotonic. These probes tune difficulty, not certify human enjoyment.

Measure planner p95 CPU cost and bounded memory growth on the actual browser. Proposed targets: <1 ms per replan and <1 MB incremental AI allocation retained; hard AI RAM ceiling 150 MB. Report whole-page memory separately if measurable. No performance/RAM result is claimed by this plan.

## Optional neural milestone

Only after the baseline is stable: collect legal planner demonstrations from the exact headless TypeScript simulation, train the 32→64→64→4 tactical actor specified in the research, and export weights plus normalization/schema version. Reuse the simulation through a training bridge; avoid maintaining a divergent Python physics copy. Prefer one bounded continuous action space for shot/recovery targets; the planner continues selecting jump/kick/header. Use imitation learning first, then optional PPO if held-out performance needs improvement.

Evaluate unseen seeds/styles against the scripted baseline, check exporter/TypeScript output agreement, finite/clamped outputs, load failure fallback, and browser latency/memory. Ship only after evidence of better play; no training-duration or win-rate guarantee. Training memory is outside the inference budget. Do not describe a frozen policy as online learning.

## Work order and estimates

1. Configuration + explicit grounded actions: 15–25 minutes.
2. Jump planner + rendering/reset parity: 30–50 minutes.
3. Adaptation + continuous targets + UI: 25–40 minutes.
4. Focused verification, balance and documentation: 20–35 minutes.

Total planning estimate: 90–150 minutes, excluding unresolved Layer 6 acceptance and optional model training. This supersedes the old 40-minute Layer 7 estimate for the expanded action-aware scope; it is not measured elapsed work. Deliver grounded difficulty/adaptation first if time runs short, and explicitly report aerial rival support as incomplete rather than silently treating a grounded rival as full action parity.

On implementation completion, add `docs/layer-7-handoff.md` with exact tuning and evidence, update the index, README and implementation log, and leave unverified Layer 6/fidelity gates open.
