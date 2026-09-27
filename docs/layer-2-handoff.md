# Layer 2 status — ball and kick practice

Updated: 2026-09-27. **Layer 2 verification gate closed**; see the latest implementation-log entry for new evidence and measurement limits. Historic pending-check statements below describe the prior checkpoint. Repository: `/Users/adityachauhan/Documents/GameJam`.

## Start here

For the next implementation task, start with [Layer 3 handoff](layer-3-handoff.md). This document preserves the Layer 2 checkpoint and verification details.

Layers 1 and 2 are implemented. Layer 2 provides repeatable ball feeds and assisted kicks with cube players. This remains the handoff document for closing Layer 2 verification; once its gate is complete, proceed to Layer 3 AI rallies. Do not scaffold a second project or restart at movement.

Read in order: AGENTS.md → this document → docs/implementation-log.md → layer 2 of docs/implementation-plan.md → sections 5/9/11 of docs/mvp-spec.md. Read docs/reuse-research.md before importing outside code and docs/asset-manifest.md before changing character presentation.

## Non-negotiable decisions

- 3D browser foot tennis, seven-hour hackathon; playable immediately and after every layer.
- TypeScript, Vite, direct Three.js; custom arcade ball simulation, no physics engine/backend/model API.
- Simple local AI is sufficient; moving opponent belongs to Layer 3, tactical adaptation to Layer 7.
- Final visuals: reference-style human chibis with oversized heads and **huge shoes**, detached hands, dark outlines, bright beach court. Continue with cubes until assets arrive.
- One return touch per side, one receiving-side bounce; first-to-five match later. Two-touch self-setting was superseded.
- Separate authoritative gameplay state from visual transforms; art replacement cannot change movement/contact rules.

## Existing runtime and commands

- Development URL: `http://127.0.0.1:5173/`. It was left running and a Codex in-app browser tab was opened at that address for playtesting.
- Vite was started in exec session `7821`; the process was PID `48239` when checked. These are transient observations, not durable identifiers. Check the port before starting another process. Do not kill an unrelated listener or silently choose another port.
- Node used for verification: v26.9.0; npm 11.19.1.
- Installed versions from lockfile/node_modules: Three.js 0.180.0, Vite 7.3.6, TypeScript 5.9.3, Vitest 3.2.7.
- `npm ci` if dependencies are absent; `npm run dev` uses strict port 5173.
- `npm test`, `npm run typecheck`, `npm run build`; `npm run preview` uses port 4173.
- `package-lock.json` exists. No Git checkout/commit was created by this task; do not assume a committed checkpoint or branch.

## Code map and tuning

| File | Current responsibility / extension point |
| --- | --- |
| src/main.ts | Frame loop, ready/playing/paused lifecycle, UI, Play/Esc/R/reset/focus handling; runs the practice state in the fixed-step loop |
| src/input.ts | KeyboardInput holds movement, retains short taps until sampled, and exposes one-shot Space kick requests |
| src/game/movement.ts | Plain player state, normalized movement, bounds, interpolation; preserve shared movement primitives |
| src/game/ball.ts | Ball state, ballistic trajectory helpers, predicted landing, safe launch, court/net event handling |
| src/game/practice.ts | Repeatable feeds, contact window and cooldown, shot aim, return/result messages |
| src/render/scene.ts / src/render/ball.ts | Court/cubes and independently rendered ball, shadow, predicted landing ring, and aim cue |
| index.html / src/style.css | Intro, compact active toolbar, pause overlay, controls, DEV telemetry |
| tests/ | Preserve Layer 1 movement/input checks and Layer 2 trajectory/contact checks |
| THIRD_PARTY_NOTICES | Exact MIT source attribution for adapted cube/movement code |

World axes: x across court, y up, z along court; player positive z, rival negative z, net z=0. Court lines at x=±5 and z=±8. **Player movement bounds differ from ball in/out bounds**: x=±4.35, z=0.62…7.22. Start player x=0,z=5.65; rival x=0,z=-5.6. Speed 4.8 units/second. Fixed step 1/60 second, frame delta capped at 0.1 second, at most five catch-up steps, remainder backlog discarded.

Current net tape center y=1.04 with height 0.13 (top 1.105); posts are decorative. Net contact uses ball radius 0.22, net slab half-depth 0.06, and collision width 5.18. Ground contact and court-line adjudication also use the ball radius/center consistently.

Current camera is **orthographic**, chosen for the placeholder movement scene. The final spec described perspective; that difference has not been expressly accepted as a final camera decision. Keep Layer 2 readable and revisit camera fidelity during asset integration rather than silently claiming exact aesthetic compliance.

## What has actually been verified

- Seven unit tests passed: movement speed, diagonal normalization, near-half clamping, facing retention, render interpolation, quick taps, opposing keys and clearing.
- Typecheck and production build passed; build rerun after the toolbar positioning fix.
- Parent opened the game in Codex browser and verified Play, ArrowUp (z 5.65 → 5.57), Escape pause/resume, ignored movement while paused, and R reset.
- User explicitly confirmed: "the WASD keys work, the movement works."
- Scene visually inspected; active toolbar moved higher so it does not cover a court corner. External font import removed; local/system fonts used.
- HMR cleanup cancels RAF and removes named listeners. Escape repeats ignored; reset clears frame time. These were source-reviewed, not comprehensive automated lifecycle tests.

Layer 2 evidence (2026-09-27):

- Parent verified Play with Enter in the Codex browser, Escape pause/resume, and R reset. Alternating ArrowLeft/ArrowRight taps with actual Space presses on feeds 1–5 yielded five completed returns (terminal `Returned` for feeds 1–5); a miss auto-restarted practice. The player ended at x=-0.08,z=5.65 and was paused after the fifth return.
- Automated checks: 39/39 passed; typecheck and production build passed on the final source. Coverage includes five aimed kick targets and legal terminal landings, contact height/side/receiver rules, cooldown and one contact per flight, kick buffering/expiry, movement sampling independent of queued Space, and input clearing.
- Production preview on port 4173: Play and Escape worked, development telemetry was hidden, and no console warning/error was captured.
- Directional shot target logic is covered by tests, and alternating direction taps were used during the successful browser returns. A visible comparison of left/right landing displacement has not been recorded; do not claim that visual aim behavior has been verified.
- Development server at `http://127.0.0.1:5173/` was restored and left available. The existing tab was not discoverable through current tools, so a new in-app browser tab was opened at the same URL.

Still outstanding: sustained real-window held-key focus-loss behavior, visible browser comparison of directional landing displacement, all-corner/opposing/diagonal movement comparison, full supported-resolution framing, and performance review. Automated tests cover buffered/expired/distant/held Space, zero-distance contact, reset and stale feed input, terminal-event uniqueness, trajectory prediction, net/ground tunnelling, in/out lines, and second bounce. An input unit test verifies clearing queued kicks, but switching to another in-app tab did not trigger window focus loss and does not count as a browser focus-loss check. An earlier 1280×720 viewport attempt produced irregular screenshot composition; override was restored and that attempt is not a reliable framing pass.

## Implemented Layer 2 behavior and tuning

`src/game/ball.ts` owns the plain ball state and analytic motion. Radius is 0.22 world units and gravity is 8; net top is y=1.105 with a 0.06 half-depth. The ball stores previous/current position for render interpolation, velocity, receiver, bounce count, and flight id. Simulation and landing ring share the same ballistic predictor. `safeLaunch` solves a target flight and raises the arc as needed for net clearance.

`src/game/practice.ts` feeds from (0, 1.8, -5.6) toward z=5.65, alternating target x values 0, -0.6, +0.6, with a 1.9 s nominal flight. First feed begins 0.35 s after practice starts. After a result, the next feed starts after 0.85 s. The far cube stays still; its-side landing ends the return successfully, and there is no score or AI movement.

Space is an edge-triggered request buffered for 0.18 simulation seconds. Contact requires the player to be the receiver, ball z>0, y=0.35–2.8, horizontal x/z distance at most 0.9, cooldown elapsed (0.3 s), and no prior contact with that flight. One receiving-side bounce is allowed. Aim uses current movement input: left/right target x=-3/+3; W targets z=-6.8, S targets z=-3.2, and neutral targets z=-5. Safe launches use a 1.65 s nominal duration. An accepted kick increments returns and briefly tilts the cube. The practice switch is enabled by default and can be disabled with `?practice=0`.

Analytic net and ground event timing is implemented to avoid tunnelling across steps. Net, out, second bounce, or successful far-side landing ends an attempt, displays a brief result, and schedules a new feed. These behaviors are implemented; the checks listed above determine which edge cases have been verified.

Use focused modules; keep one frame loop. Do not introduce an ECS, generic event bus, new input library, network dependency, or Yuka during this layer. Soccer_ThreeJS ball code was inspected and rejected because it is planar rolling/friction; do not reuse it for airborne returns. Official Three.js sphere/math/render utilities are already available.

## Layer 2 completion gate

- Five consecutive feeds returned in-browser, a miss restarts practice, and automated shot-target/trajectory tests pass.
- All 39 tests, typecheck, and production build pass on the final source.
- Visually compare left/right landing displacement; the five-feed browser trial used alternating direction taps but did not record the landing comparison.
- Complete sustained held-key focus-loss, all-corner/opposed/diagonal movement, supported-resolution framing, and performance checks.
- Keep the browser game available for the user; record any new results in docs/implementation-log.md and then advance to Layer 3.

## Asset and agent coordination

Design assets are not present or required for Layer 2. Use cubes and consult the adapter contract in docs/implementation-plan.md when files arrive. Do not wait for the design team or send them messages without authorization.

Layer 1 was delegated to GPT-6 Luna at xhigh under the user's explicit instruction; the parent reviewed source and handled browser verification. The subagent was interrupted when the user took over testing; its final summary is not required to recover state because code and verified results are now documented. Do not assume another agent is still working. Future delegation should follow the user's instructions for the next task.
