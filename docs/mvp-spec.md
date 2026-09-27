# Foot Tennis — seven-hour deliverable MVP

Date: 2026-09-27.
Status: MVP direction accepted by the user; updated with the explicit huge-shoe character requirement. Layered execution is defined in [implementation-plan.md](implementation-plan.md), beginning with cube-player movement before final assets arrive.
Working title: Foot Tennis. Final branding is not a dependency.

## 1. Product promise

A player opens a link, presses Play, and immediately chases and kicks a soccer ball across a low net against an adaptive opponent. The game looks like the supplied cartoon sports references: oversized heads, small bodies, detached round hands, thick outlines, bright surroundings, and expressive ball effects.

Success means a fun, complete, replayable match delivered today, rather than a broad sports platform. The first satisfying return should be possible within ten seconds of pressing Play once assets have loaded. A match should typically last two to four minutes; this is a playtest target, not a timer-enforced rule.

## 2. Approaches considered

| Approach | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| One-touch arcade foot tennis | Simple controls, immediate rallies, easy to explain | Less setup strategy | Recommended MVP |
| Two-touch receive/setup/attack | Richer attack preparation | More state, animations, rules, and onboarding | Defer |
| Realistic foot-tennis simulation | Authentic manual control | Precision contact and physics threaten instant fun and schedule | Exclude |

The recommended design replaces the earlier proposed two-touch loop. It is an arcade adaptation, not a claim about official sport rules.

## 3. Scope and assumptions

### Required deliverable

- A deployed browser game and a reproducible local build.
- One beach court, one playable chibi human, one chibi AI rival.
- One complete 1v1 match mode with serve, rally, faults, score, result, and rematch.
- Responsive movement, assisted kick contact, aim, and an aerial bicycle-kick payoff.
- An adaptive local opponent with visible tactical changes.
- HUD, landing cue, trails, hit sounds, mute, and pause.
- Documentation for setup, controls, AI behaviour, verification, and deployment.

### Planning assumptions

- Desktop keyboard play is the supported MVP input. Mobile controls and touch usability are excluded; show a concise keyboard-required notice on unsuitable devices.
- Initial court is a beach because it fits the supplied lineup and can look finished with inexpensive scenery. The user has approved the aesthetic, not this specific setting yet.
- The user confirmed that simple AI opponents are the target and local AI is acceptable. Use local game AI exclusively for the MVP; no language model or AI API is needed.
- A deployment account/host and credentials may need to be supplied. Do not claim a public deliverable without a verified URL.
- No additional MCP or external 3D asset service is necessary for the core build.

### Exclusions

Multiplayer, teams, accounts, character selection/customization, progression, multiple courts, realism-focused physics, ragdolls, voice/chat, leaderboards, complex spin, and a free camera. No loading dependency on large external character packs.

## 4. Player journey

1. Load the scene with a small branded overlay and Play button. Show only "Move: WASD / arrows · Kick: Space · Pause: Esc" plus the one-bounce rule.
2. Play dismisses the overlay, enables audio, and starts a short Ready cue. An opponent serve arrives near the player's starting position with a generous flight time.
3. Move toward the landing ring. Press Space near the descending ball to kick it over the net. Show timing feedback briefly near contact.
4. Opponent returns it. Reposition and aim shots to create space; good timing builds power.
5. Score on a miss or fault. Show the reason and updated score, then automatically begin the next point after a short pause.
6. First to five wins. Show the result and Rematch. Rematch resets score, power, rally state, and learned match statistics.

No tutorial modal, mandatory dialogue, account, or API wait interrupts the opening rally.

## 5. Controls and match rules

### Controls

- WASD/arrows: move on the player's half. Clamp movement inside the court; normalize diagonal input.
- Space: request a kick. Buffer a press for approximately 180 ms to forgive slightly early input. Holding Space does not repeatedly generate kicks; require a new press.
- Left/right movement input at contact biases the shot left/right. Forward biases toward the far baseline; backward biases toward a shorter landing. Neutral targets a safe middle/deep shot. A small target indicator on the far court previews aim when receiving.
- Esc: pause/resume. Losing window focus clears held inputs and pauses. Resume discards elapsed background time.
- Mute button: toggle sound without changing gameplay.

### Rules

- One return contact per side. Any valid kick immediately sends the ball toward the other half; no self-setting in the MVP.
- One ground bounce allowed on the receiving side. The second bounce awards the point to the sender.
- A ball's center landing on a court line counts as in. Its first landing outside the receiving half awards the point to the receiver.
- A shot contacting the net awards the point to the receiver. The low net is a real rule boundary, not decorative geometry.
- No hand/arm contacts. Foot contact and aerial bicycle-kick contact provide the MVP animation vocabulary; headers are deferred.
- First to five, no win-by-two. Every point counts equally; special shots do not change scoring.
- The opponent serves the opening point. Thereafter the point loser serves automatically from a standard position. Serves are normal safe shots, not special attacks.
- Resolve a terminal fault exactly once and immediately stop further scoring events until the next serve.

### Contact assistance and timing

Accept kicks only when the ball is on the player's side and within a tunable horizontal contact radius and reachable height. Start around a 0.9-unit radius and a height range of 0.35–2.8 units, relative to a roughly 2-unit-tall character; tune these through playtesting.

Regular kicks auto-select a grounded or jumping pose from ball height. No manual jump control is required. A valid imperfect kick returns safely with a slower/high arc. A perfect kick is a tighter timing band around the ball's predicted arrival at a reachable strike height; it travels faster and gives immediate feedback. Never label distant button presses as successful contact or teleport the ball to the player.

Use approximately a 100-ms perfect band as an initial tuning value. Early/late within the valid contact window still returns the ball. Recovery cooldown and a per-flight contact identifier prevent double hits.

### Bicycle-kick payoff

Three perfect returns fill a three-segment power meter. When full, the next valid contact automatically spends power and performs a bicycle kick with a faster, safe-over-net trajectory, bright trail, impact burst, and short articulated character rotation. No extra key or animation asset is required.

Power persists between points and resets on rematch. A missed kick does not spend power. A powered shot can still be returned by a well-positioned opponent. Keep input and ball simulation responsive during the animation.

## 6. Visual and audio specification

### Court and camera

- Single pale-sand beach court with blue lines, low mesh net, ocean/horizon, and a few palms/umbrellas outside play.
- Fixed elevated perspective behind the near-side player. Both court halves, boundaries, and expected ball apex remain in frame at supported aspect ratios.
- Do not reproduce montage camera cuts during live rallies. Only a restrained impact shake is permitted; disable it under reduced motion.
- Initial coordinates: x across court, y up, z along court; net at z=0, player on positive z. Start with a court approximately 10 units wide × 16 long and a net around 1 unit high. These are tuning defaults, not official dimensions.

### Characters

- Two original chibi humans built from articulated geometry: large head/hair, compact torso, short legs, huge feet/shoes, detached round hands. Huge shoes are an explicit user requirement and must read at match-camera distance.
- Distinct blue versus orange/pink hair/clothing accents, simplified faces, thick dark character outlines, and cartoon shading.
- Minimum poses: idle, running leg cycle, foot kick, jumping kick, bicycle kick, celebration, and loss reaction. Use procedural transforms; no dependency on detailed skeletal animation.
- The cyan controlled-player ring follows the player's feet. Opponent identification stays visually quieter.

### Ball and feedback

- A clearly patterned soccer ball with visible rotation and readable scale.
- Ball ground shadow indicates current projection. A separate landing ring indicates the next predicted ground contact and remains consistent with simulation.
- Ordinary trail is subtle; perfect/powered trails are brighter and longer. Pool transient particles.
- HUD: score at top center, power near bottom, concise controls and mute/pause access. Timing/fault text is short, outlined, and transient.
- Synthesized or small local sounds for kick, bounce, perfect contact, point, and match result. Audio starts only following user interaction. No music is required.

Visual acceptance is judged against [visual-direction.md](visual-direction.md) and saved media, not merely by the presence of 3D geometry. The actual reference audio has not been analyzed.

## 7. Local opponent AI

Use a readable state machine: recover position → track incoming ball → intercept → return → recover. Predict a reachable contact location from the same trajectory function used by the simulation. Apply bounded reaction delay, target error, movement speed, and recovery cooldown. Avoid perfect knowledge producing unbeatable returns.

Start with approximately 250–400 ms reaction delay and a movement speed at or slightly below the player's. The first two rallies use safer, slower shots. Tune for an attentive new player to sustain a rally and score without making the rival stationary or deliberately missing every attack.

Collect per-match aggregate facts: player return targets, typical player depth, successful/failed returns, and score. After each point select one of four tactics:

- Balanced: distribute safe returns.
- Play deep: target deeper when the player stays forward.
- Play short: target shorter when the player stays back.
- Cover favourite side: shift recovery toward the player's repeated left/right target.

All tactics keep identical physical constraints. Adaptation changes shot selection or recovery positioning, never teleports or secretly increases speed. Show a short tactic badge between points, then minimize it during play. The local selector makes adaptation inspectable and testable without a network.

## 8. AI technology decision

The user clarified that the target is simple AI opponents and local AI is acceptable. Use the local state machine and tactical selector in section 7. This is the cheapest sufficient approach: no model inference, network delay, backend, API key, or usage charges.

The bot's job is movement, interception, and shot selection. These operations use known game geometry and bounded rules, so a language model adds no necessary capability. Label the opponent as an AI rival without implying model/API use.

Generative coaching is out of scope for today's MVP. It may be reconsidered in a future specification if a concrete requirement warrants it. No provider/model selection is required.

## 9. Technical structure

- Vite + TypeScript + Three.js; HTML/CSS overlays. No React or physics engine required for this MVP.
- Deterministic fixed-step simulation with render interpolation. Cap catch-up after stalls; pausing clears the accumulator.
- Ball motion uses gravity and explicit bounce/shot velocities. Derive a launch velocity from contact position, chosen landing target, and flight duration; ensure regular assisted shots clear the net. Powered shots shorten flight duration within a safe minimum.
- Resolve net-plane crossing and ground intersections within a simulation step to avoid tunnelling. Use the same analytic trajectory for landing cues and AI predictions.
- Keep simulation separate from Three.js objects and input: scene/character presentation, rules/match state, trajectory/contact mechanics, opponent tactics, UI/audio, and local AI tactics.
- Match states: menu, ready, rally, point_result, match_result; pause preserves the previous active state.
- Small focused modules; dispose scene/audio resources on teardown and reuse particles/trail buffers.
- Debug aids may expose collision radius, landing targets, AI tactic, and state transitions in development. They are hidden in the public experience.

## 10. Delivery schedule and cut order

This is a seven-hour work budget from implementation start, not a guarantee of elapsed progress.

The detailed [implementation plan](implementation-plan.md) refines the approximate allocation below into eight playable layers and is the execution schedule. Movement starts with cube players; design assets are integrated through a presentation adapter without blocking gameplay work.

| Time | Checkpoint |
| --- | --- |
| 0–1 h | Court/camera, input, character movement, local run command |
| 1–2.5 h | Trajectories, kick assistance, bounce/net/out rules, basic bot; playable rally |
| 2.5–3.5 h | Score, serve/reset, rematch/pause; complete match; tune first ten seconds |
| 3.5–4.5 h | Chibi fidelity, kick poses, markers, trails, sound, bicycle kick |
| 4.5–5.5 h | Local opponent adaptation and difficulty tuning |
| 5.5–6 h | HUD/scene polish and accessibility basics |
| 6–7 h | Rule checks, real-browser playtest, production build, deployment, demo rehearsal |

If no fun rally exists by 2.5 hours, stop adding features and repair contact/camera/AI. Cut in order: decorative scenery complexity, extra celebration poses, fancy particles/shake, elaborate special animation. Preserve one readable aerial special if possible. Never cut scoring, rematch, fair opponent behaviour, or final verification.

## 11. Acceptance and verification

### Game behaviour

- From Play, the first serve is reachable without precision knowledge; a new player can return it using the displayed controls.
- Both competitors can return shots; a player can intentionally aim left/right and beat the opponent.
- One legal bounce does not score; a second does. First landing out and net contact score for the correct receiver. A boundary-line landing is in.
- A point is scored once even if net/ground events occur close together. Serving resets transient ball/contact state.
- Invalid/held kicks do not duplicate contact. Power gains, consumption, and rematch reset follow section 5.
- First to five ends the match; Rematch starts a clean match. Pause/focus loss does not move the ball or leave movement keys stuck.
- Local tactical behaviour changes after representative repeated player patterns.
- AI decisions remain entirely local and do not depend on network access.

### Presentation and performance

- Character silhouettes, outlines, bright court, selection ring, and trails visibly reflect the references.
- Kicks look like soccer contacts; ordinary gameplay has no volleyball hand strikes.
- Whole court, ball, score, and controls remain usable at 1280×720 and 1920×1080. Check one narrow desktop viewport for overlays/camera framing.
- Target 60 fps on the development machine; measure and report actual hardware/browser results. No claim of universal 60 fps.
- No browser console errors during a complete match and rematch. Mute works; reduced motion suppresses shake and reduces particles.

### Verification approach

Use focused automated checks for trajectory/net crossing, bounce/out scoring, duplicate-point prevention, contact consumption, match reset, and tactic selection. Use real-browser manual playtesting for feel, controls, camera, silhouettes, audio, pause, and a full match/rematch. Run the production build and verify the deployed build as well as localhost. Record checks and limitations in the repo rather than asserting unperformed tests.

## 12. Handoff and demo

Deliver a README with install/run/build instructions, controls/rules, AI explanation, public URL, and supported input/browser limitations. Add an implementation/verification record and index it from AGENTS.md.

Demo sequence: press Play → return a ball → aim to open space → show a perfect hit/bicycle kick → show rival tactic → finish a point → explain how the local opponent predicts contact positions and adapts between points. Use actual captured play, not claims of unavailable features.

## 13. Review decisions

This draft deliberately chooses one-touch play, automatic jumping, a beach court, desktop controls, and first-to-five scoring. The user accepted this direction and added chibi characters with huge feet/shoes. See [asset-manifest.md](asset-manifest.md). The user has confirmed local AI is sufficient. Deployment access is an operational dependency. No other unresolved choice is required to begin building after design approval.
