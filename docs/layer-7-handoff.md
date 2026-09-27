# Layer 7 — fast learning shot selector

Implemented 2026-09-27 after the user explicitly approved a reduced scope and requested immediate delivery with brief checks. This supersedes the expanded Layer 7 implementation plan for this checkpoint.

## Continuation instructions

The user signalled handoff after receiving the implementation for playtesting. No explicit playtest result was supplied; do not infer that balance, a full match or Layer 6 acceptance passed. The user prefers implementation speed and minimal visual testing, and will perform playtests themselves. Do not restart visual test loops or implement the superseded aerial/PPO plan without a new request.

Start here, then consult `layer-6-handoff.md` for mouse controls, jump/contact physics and authored environment. Default match is open in the Codex browser at `http://127.0.0.1:5173/`; preserve its state. Reuse the existing strict-port development server. Typecheck/build have already passed for this implementation; no checks were repeated for this documentation handoff.

Next work should follow the user's playtest feedback or Layer 8 delivery request. Remaining delivery work includes production full-match/rematch and power/focus checks, performance evidence and deployment. There is no verified public deployment in this handoff. Exact character fidelity is still open independently of the learning AI.

## Implementation details

- `src/game/shot-learning.ts`: five-arm epsilon-greedy Bernoulli bandit with Beta(1,1) priors. Arms are centre/left/right/short/deep; ratings track whether the player failed to return each actual rival shot. Deterministic seeded selection, bounded variation, no dependency/network/model download.
- `opponent.ts`: caches a selected target for the incoming flight and records the outgoing flight only after a successful rival contact. Existing grounded movement/interception/contact remain in place.
- `rally.ts`: a successful player contact settles the pending rival shot as returned; second bounce on the player's half settles it as a success for the rival; rival net/out shots receive failure. A pending flight resolves once. Serves have no pending arm and do not train the selector. The first two points retain forgiving centre returns.
- `match.ts`: shares the learning object across point replacements; full reset/Rematch creates fresh counters with the selected difficulty retained. Standalone rally also learns within its session.
- `main.ts`, `index.html`, `style.css`: Easy/Normal/Hard selector in the top bar before Play/at match result; locked during play. Between-point copy reports the highest-rated placement after three outcomes, otherwise reports learning. Development telemetry includes difficulty, learned-shot count and per-arm attempts/wins.

Difficulty changes safe-centre probability (55/15/0%), exploration (30/25/15% conditional on non-safe selection), lateral spread (45/65/80% of legal half-width) and reaction multiplier (1.4/1/0.7). Speed stays 1.8 and all player mouse/jump/action controls stay as repaired in Layer 6. No rival jumps, neural training, recovery adaptation or new power system was added.

Verification kept brief per user: typecheck and production build pass; existing large-chunk advisory remains (640.63 KB minified JS). Codex browser loaded the court/characters and selector, and actual Enter activation on Play entered IN PLAY with learning copy and a locked Normal selector. Full suite, full match and learned-outcome browser playthrough were not performed. Balance and learning behavior await user playtesting; outstanding Layer 6 acceptance gates remain open. No RAM benchmark was performed; learner stores ten counters and small transient state.

Play default `http://127.0.0.1:5173/`. Choose difficulty before Play; return shots using LMB/F or RMB/E, with mouse aim and Space jump. Learning needs actual rival returns; simply missing opening serves supplies no samples. Rematch clears what the rival learned.

## Maintenance traps

- Preserve the learning object when `advancePointResult` replaces the rally. Only `startMatch` should create fresh match statistics while retaining difficulty.
- Register pending rewards only after an accepted rival contact; match the outgoing flight ID. Player contact increments flight, so reward settlement uses the previous ID. Clear pending rewards on serve and resolve each once.
- The displayed tactic is a posterior preference, not proof of a statistically established player weakness. Short matches can provide very few samples; the initial three-outcome label threshold is presentation tuning.
- No download/API, pretrained neural model, or browser weight training is involved. The bandit learns online by updating outcome counters; movement remains the prior local controller.
- Standalone rally Reset currently recreates default Normal learning; match Reset/Rematch retains difficulty. Keep the scope of reset claims precise.
