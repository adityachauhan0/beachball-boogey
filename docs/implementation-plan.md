# Layered MVP implementation plan

For continuation, start with [animation-handoff.md](animation-handoff.md): authoritative files, scene navigation, safe editing/export, script hazards, evidence and runtime integration steps.

Date: 2026-09-27. Status: Layers 1–5.5 implemented. Layer 5.5 adds Space jump, F kick, E header and grounded/airborne action events without changing scoring or AI. See [layer-5.5-handoff.md](layer-5.5-handoff.md) for the current gameplay/animation contract. Controlled real-window focus loss during rally and point-result remains open for delivery verification.

User direction: start with player movement, keep every stage runnable and interactive, and use cubes until the design team's assets arrive. This plan implements [mvp-spec.md](mvp-spec.md); it does not expand the deliverable.

## Reuse decisions after GitHub research

See [reuse-research.md](reuse-research.md) for inspected sources, pinned revisions, licenses, and exclusions. Adopt selected Soccer_ThreeJS cube movement functions, official Three.js OutlineEffect/GLTFLoader/AnimationMixer, and Yuka State/StateMachine. Do not fork a whole soccer game or import a general character controller. Trajectories, assisted kicks, scoring, and tactical choices remain specific to our game.

At each adoption, preserve license/provenance notices and check released-version compatibility. Selected cube/movement patterns have been adapted and verified in Layer 1; Three.js is installed. Yuka remains unadopted after the Layer 3 package/type-overhead trial; the documented enum fallback was selected. Optional addons/effects remain unadopted. Keep current budgets; any reuse savings go into playtesting. Timebox uncertain integration to 15 minutes, then use a smaller fallback if necessary.

## Operating principle

Ship a small playable slice, test it, then add the next layer. The first slice is a movement playground, not a finished tennis match. A rally arrives in layer 3; a complete match arrives in layer 4. Do not wait for art to build or verify gameplay.

Keep one working development URL throughout. Each layer must preserve the previous layer's controls and functionality. Record what actually passed, unresolved issues, and tuning changes in a short implementation/verification log indexed by AGENTS.md. Do not call an untested layer complete.

## Schedule and dependency order

| Layer | Budget | Cumulative | Playable checkpoint |
| --- | --- | --- | --- |
| 1. Movement playground | 45 min | 45 min | Drive a cube around the near court |
| 2. Ball and kick practice | 50 min | 95 min | Chase repeatable feeds and kick them across the net |
| 3. Basic AI rallies | 55 min | 150 min | Rally against a moving cube opponent |
| 4. Complete match | 40 min | 190 min | Play first-to-five and rematch |
| 5. Timing, power, and feedback | 40 min | 230 min | Aim, earn perfects, and perform power shots |
| 5.5. Jump, kicks, and headers | Added milestone | — | Space jump, F/E contacts, and animation-ready action events |
| 6. Character/scene integration | 60 min | 290 min | Same match with huge-shoe chibis and beach presentation |
| 7. Adaptive opponent | 40 min | 330 min | Rival visibly changes tactics |
| 8. Delivery verification | 90 min | 420 min | Tested production build, deployed match, documented handoff |

Budgets are timeboxes from implementation start, not elapsed progress. Asset preparation may happen independently with the design team; this plan does not automatically dispatch agents or messages. If assets arrive early, integrate them at a stable checkpoint without blocking the next gameplay layer.

## Layer 1 — movement playground

### Build

- Scaffold Vite + TypeScript + Three.js, local start command, production build command, and a minimal README.
- Adapt licensed `createPlayer`/`updatePlayer` and keyboard mapping from Soccer_ThreeJS rather than re-derive cube movement. Convert to logical-state TypeScript and dt-based speed; add our input lifecycle and half-court constraints. Do not copy its globals, whole init loop, music, or ball logic. Record exact functions/revision and MIT notice upon adoption.
- Flat court, boundary lines, simple low-net placeholder, fixed elevated camera, lighting, player cube, stationary rival cube.
- Blue player and contrasting rival colours; visible facing indicator and player ring.
- Keyboard input with WASD/arrows; map up toward the net and left/right to screen-readable court directions.
- Fixed-step movement, diagonal normalization, half-court clamping, render interpolation, and frame catch-up cap.
- Start/Play interaction that immediately enables movement; concise on-screen controls.
- Esc pause, focus-loss pause, held-key clearing, and simple reset control for the development playground.
- Resize camera/UI without losing either court half. Separate logical player position/facing from mesh transforms from day one.

### Test gate

Manually test cardinal/diagonal motion, start/stop, opposite keys, court corners, net boundary, focus loss, pause/resume, reset, and resize. Confirm no diagonal speed advantage or post-resume jump. Confirm the player can repeatedly reach all four corners without fighting the camera. Typecheck/build must pass.

### Checkpoint for the user

Share/open the local game and describe exactly what is testable: movement speed, responsiveness, court size, and camera. There is no ball or AI movement yet. Keep a neutral tuning default if feedback is not immediately available; do not hold development idle for optional feedback.

## Layer 2 — ball and kick practice

### Build

- Sphere ball with gravity, controlled launch velocities, rotation, bounce, and ground shadow.
- Shared trajectory calculations for actual ball motion and predicted landing ring.
- Development practice mode: feed a reachable ball from the far side; after a miss or completed return, automatically feed the next. Keep reset available. This is a development test harness, not an extra public game mode.
- Space press buffering, valid side/radius/height checks, contact cooldown, and consumed-contact identifier.
- Successful contact immediately sends a safe return over the net; cube tilt/flash demonstrates contact while waiting for animation assets.
- Direction at contact selects left/right/deep/short landing targets; neutral is safe.
- Net/ground crossing within a timestep and in/out detection. Show simple fault/contact labels in practice mode.

### Test gate

Return five consecutive practice feeds. Miss intentionally and verify a new feed arrives. Holding Space must not auto-return every feed; distant presses must not hit. Check early buffered input, high/low contact, aim directions, landing marker accuracy, and net/ground crossing at high speed. Add focused trajectory and contact-consumption tests.

### Checkpoint

The user can now assess whether moving to the ball and kicking feels good. Tune feed speed, player speed, contact radius, and kick buffer together before investing in opponent intelligence.

## Layer 3 — basic AI rallies

### Build

- Rival cube uses the same movement constraints and contact/shot functions as the player.
- Simple state machine: recover, track, intercept, return. Reuse trajectory prediction.
- Use Yuka State/StateMachine for state transitions, with a thin opponent context calling our shared movement/contact code. Validate integration within 15 minutes; use a small explicit enum if package/type overhead exceeds its benefit. Do not introduce a separate Vehicle physics system.
- Finite reaction delay, movement speed, reachable targets, and bounded contact error.
- Safe balanced returns; opening feeds are forgiving. No adaptation yet.
- Alternate legal receiving sides; reset bounce count on a valid return.
- After a terminal miss, show its reason and restart a rally. Keep practice mode behind a development switch.

### Test gate

Sustain at least a six-contact rally, then win a rally by placing the opponent out of reach. Verify the opponent can also win, never crosses the net or teleports, and cannot double-hit. Measure actual rally difficulty rather than making the bot perfect. If movement/contact still feels unreliable at 150 minutes, repair it before layer 4.

### Checkpoint

First genuine soccer-tennis loop: two cubes, one ball, clear landing cue, and an opponent. Visual simplicity must not prevent assessing rally fun.

## Layer 4 — complete match

### Build

- Menu, ready, rally, point_result, match_result states; pause preserves the active state.
- Score first-to-five, opening opponent serve, subsequent loser serves, brief point transition, and Rematch.
- Fault handling for second bounce, out first landing, and net contact; line center counts in.
- Terminal-point guard prevents repeated scoring from later events in the same update.
- Reset player/ball/transient input and contact state at point boundaries; full match reset clears stats/power.
- Plain but usable score, fault text, start/result/pause overlays.

### Test gate

Play a full match and rematch. Exercise both winners, second bounce, net fault, out, line landing, pause during play, and focus loss. Add focused rule/state-reset tests. Confirm each point increments once and no stale kick crosses a serve boundary.

### Checkpoint

A complete, replayable game exists even if characters are still cubes. This is the minimum gameplay milestone that later art/polish must preserve.

## Layer 5 — timing, power, and feedback

Start with [layer-5-handoff.md](layer-5-handoff.md) for current code, state-lifetime traps, accepted scope and verification gates.

### Build

- Perfect timing band, regular/perfect shot speeds, timing labels, and three-segment power meter.
- Three perfects charge power; next valid contact spends it on an aerial power shot. Cube rotation acts as the temporary bicycle-kick presentation.
- Normal/perfect/powered trails and contact burst with pooled objects.
- Keep basic effects small; three.quarks is an optional inspected-README candidate if a richer trail system becomes necessary, not a mandatory dependency.
- Synthesized kick/bounce/score/result audio, unlocked by Play, plus mute.
- Far-court aim indicator; keep landing prediction distinct from current ball shadow.
- Reduced-motion handling. Avoid camera shake until basic readability is verified.

### Test gate

Earn and spend power deliberately. Check power persists across points and resets on rematch; misses do not spend it. Verify stronger shots remain physically returnable and clear the net. Check mute and ensure visuals/audio do not delay contact. Add focused power accounting checks.

## Layer 6 — integrate art without changing gameplay

Start with [animation-handoff.md](animation-handoff.md) for asset authority and [layer-5.5-handoff.md](layer-5.5-handoff.md) for the current action/event mapping.

### Build

- Replace cube visuals through the character presentation adapter below; retain all simulation/input/rule code.
- Use official GLTFLoader for GLBs, AnimationMixer for supplied clips, and matching SkeletonUtils if skinned cloning is needed. The current exported skins already include inverted outline geometry; inspect it at the match camera before adding another outline effect. If needed, evaluate Three.js OutlineEffect; inspect marker/net exclusions and character normals before accepting it. Do not implement custom loaders, animation players, or outline shaders unnecessarily.
- Integrate the supplied three interchangeable chibi appearances on the shared rig, choosing player/rival skins while preserving all variants. The earlier two-palette proposal is superseded; exact reference fidelity remains unfinished.
- Bind pose events to idle/run/kick/aerial/bicycle/celebrate/loss animations.
- Replace flat court materials with sand/blue lines/net; add ocean/sky and cheap scenery outside play.
- Polish HUD hierarchy and score/result presentation using the reference aesthetic.
- Assets must be bundled locally with source/license records. Retain development cube mode for debugging.

### Test gate

Repeat a complete match. Confirm visual replacement has not changed movement speed, contact reach, trajectory, or scoring. Inspect shoe/ball contact, foot grounding, court visibility, outline overlaps, and bicycle-kick recovery. Check both target desktop resolutions.

### If design assets are late

Continue all gameplay work using cubes. At this layer, build a procedural chibi fallback with huge shoes if no usable asset exists. A cube-only match is a useful test build but does not satisfy final aesthetic acceptance. Simplify decoration and poses before sacrificing the chibi silhouette/huge-shoe direction.

## Layer 7 — adaptive local rival

The detailed proposed continuation is now [layer-7-implementation-plan.md](layer-7-implementation-plan.md), based on the current Layer 6 mouse aim, ballistic jumps, action windows and authored court. It supersedes the historical build details below where they differ and estimates 90–150 minutes for expanded rival action parity, difficulty/adaptation and verification. Model research is revised in [ai-opponent-research.md](ai-opponent-research.md); no model is adopted or gameplay implemented by that planning pass.

### Build

- Collect return-side preference and average player depth; track match outcomes.
- Between points choose balanced, play-deep, play-short, or cover-favourite-side from explicit thresholds and adequate samples.
- Show a short between-point tactic label; keep gameplay unobstructed.
- Adapt target/recovery choices without changing movement speed or contact rules.
- Make the first two rallies approachable and tune later shot distribution through actual play.

### Test gate

Use controlled sample histories to verify each tactic and reset. In-browser, repeatedly use one side and confirm the rival shifts recovery; camp forward/back and confirm appropriate target changes. Verify noise from a single shot does not flip tactics erratically. No network/model dependencies.

## Layer 8 — verify and deliver

### Build/finish

- Resolve blocking gameplay/art defects; stop adding features.
- Run focused automated suite, typecheck, and production build.
- Play the production preview through a full match and rematch; check browser console, sound, pause/focus, input, reduced motion, and supported aspect ratios.
- Measure performance on the actual development machine/browser and document it.
- Deploy the static build using the available authorized host; verify the public URL separately. If access is unavailable, retain the tested build and document the precise deployment dependency.
- Finish README, asset provenance/status, implementation log, controls/rules, AI explanation, and known limitations. Update AGENTS.md links.
- Include THIRD_PARTY_NOTICES for actual copied/adapted source and adopted packages/assets. Research candidates that were never used must not be presented as game dependencies.
- Rehearse a short demo showing immediate return, aiming, power kick, and visible local adaptation.

### Delivery gate

No claim of completion until the complete match/rematch and production build are verified. No claim of public deployment without a tested URL. Record any scope cut and its impact explicitly.

## Character asset handoff contract

Gameplay owns position, facing, movement speed, contact radius, score, and power. Presentation owns geometry, colours, shoe proportions, and pose animation. Asset loading must not mutate gameplay parameters.

- World units: approximately one unit per metre; standing character target height around two units. Court x=width, y=up, z=depth; net z=0, player positive z.
- Character root at ground level between the feet. Neutral local forward is -z; rotate the root to face the rival rather than export separate facing variants.
- Use metres/consistent scale or provide explicit import scale. Grounded shoe soles should sit at y=0 after normalization.
- Separate named parts or bones for head/hair, torso, left/right hands, upper/lower legs, and huge shoes. The adapter may map names; exact exporter naming is flexible if documented.
- One shared GLB/rig plus palette/hair variants preferred. No mandatory external texture links. Provide source format if further edits are expected.
- Adapter contract: create visual, update from logical pose, trigger contact/result animation, dispose resources. Cubes and chibis implement the same small interface; do not build a generic plugin framework.
- Visual contact events identify regular/perfect/powered and grounded/aerial variants. Animation starts when the simulation accepts contact, not vice versa.
- Huge shoes are visual exaggeration. Gameplay assistance remains explicit and tunable independently.

## Proposed file boundaries

Introduce modules when their layer needs them, not as empty scaffolding:

- `src/main.ts`: initialize app and frame lifecycle.
- `src/input.ts`: keyboard state, edge presses, focus clearing.
- `src/game/`: tuning, movement, trajectories/contact, match rules, opponent.
- `src/render/`: scene/camera, cube/chibi adapter, ball, effects.
- `src/ui/`: overlays/HUD and audio helpers as needed.
- `public/assets/`: production assets only; originals remain in references.
- `tests/`: focused simulation/rule tests.

Keep these boundaries lightweight. Do not introduce an ECS, full physics engine, backend, or model API for this MVP.

## Feedback and cut policy

Share a testable checkpoint after layers 1, 2, 3, 4, and 6. User corrections to movement/feel take priority over decoration. A check gate means verify required behaviour, not wait for a new approval at every layer after implementation is authorized.

If behind, cut decorative scenery, extra face/celebration detail, shake, and fancy particles first. Keep responsive movement, legal rallies, first-to-five/rematch, chibi huge-shoe silhouette, basic local AI/adaptation, and delivery verification. Changes to those essentials require an explicit scope decision rather than silently redefining completion.
