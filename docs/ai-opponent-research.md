# Opponent AI and difficulty research

Date: 2026-09-27. Status: research complete; no Layer 7 gameplay code or runtime dependency was added.

## Revised research — current movement mechanics

Re-researched 2026-09-27 against the latest Layer 6 handoff and current source. The recommendations below are proposals, not user-approved model adoption. Implementation is specified in [layer-7-implementation-plan.md](layer-7-implementation-plan.md).

### Corrections to the first research pass

The previous conclusion overstated certainty: no model was trained or measured, so PPO cannot be called the proven best model, and whole-browser RAM cannot be guaranteed from parameter counts. The earlier 18-input/7-output architecture was illustrative, not a sufficient movement/action specification. The statement that no useful pretrained opponent exists was too broad: SlimeVolley has one, but its contract is incompatible with Foot Tennis.

The current player moves at 4.8 units/s with normalized diagonals and independent continuous mouse aiming. Jump launch speed is 6, actor gravity is 12, apex is 1.5, and airtime is 1 second. Ball gravity is separately 8. LMB/F chooses kick, RMB/E header; airborne variants depend on actor height. Court bounds and net height come from `court.ts`, including asymmetric baselines. These must be shared by any controller or training environment.

Source inspection found that the rival still moves at 1.8 units/s, never requests a jump, and calls `tryContact` with no action/actor height. Its visible kick/header is inferred afterward. `main.ts` sends `jumping: false` for the rival, and match reset only resets its horizontal state. Adding a neural network alone fixes none of these gaps.

### Candidates examined again

| Candidate | Evidence and fit | Recommendation |
| --- | --- | --- |
| SlimeVolley baseline, 120 parameters | Official repository supplies a tiny trained neural rival, a 12-value observation and three binary actions. It plays 2D volleyball with different collision/ground rules. No depth movement, aimed kicks or manual headers matching ours. | Closest concrete tiny pretrained example; reference only, weights not reusable directly. |
| Custom small MLP, imitation learning then optional PPO | Can consume numeric world state and choose bounded actions. Training data and environment must match our mechanics. PPO is one viable trainer, not a model download or proven winner. | Preferred neural experiment if a learned model is required. Begin by imitating a verified controller; evaluate before PPO refinement. |
| Contextual bandit for tactic selection | Learns from context, selected action and observed reward. Suitable for a few tactics, not jump/intercept control. A match has only 5–9 point outcomes, making per-point learning sparse. | Possible later tactic learner; explicit evidence thresholds are easier to tune now. |
| SmolLM2-135M-Instruct | Actual small downloadable text model with browser tooling. Approximate weight-only arithmetic: 270 MB FP16, 135 MB int8, 67.5 MB at ideal 4-bit packing, before scales, tokenizer, cache and runtime. No evidence of our control accuracy or sub-150 MB peak RAM. | Reject for this controller; small text-model size does not establish suitability. |
| Existing predictor plus bounded action planner | Already shares exact ball physics and contact ownership; can explicitly plan grounded and aerial actions and track mouse-aimed shot tendencies. | Recommended Layer 7 path for immediate playability and controllable difficulty. |

Sources: [SlimeVolley repository](https://github.com/hardmaru/slimevolleygym), [Stable-Baselines3 algorithm selection/evaluation guidance](https://stable-baselines3.readthedocs.io/en/master/guide/rl_tips.html), [imitation learning with custom environments](https://imitation.readthedocs.io/en/latest/tutorials/10_train_custom_env.html), [Vowpal Wabbit contextual bandits](https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/python_Contextual_bandits_and_Vowpal_Wabbit.html), [SmolLM2 model card](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct). These establish available approaches; fit judgments and memory arithmetic are our analysis, not benchmarks.

### Revised neural option and RAM claim

For a later tactical policy, use a concrete candidate `32 → 64 → 64 → 4` tanh MLP producing continuous shot x/z and recovery x/z. This has 6,532 parameters, or 26,128 bytes in float32. The 32 inputs comprise ball position/velocity (6), player position/estimated horizontal velocity/jump height/vertical velocity (6), rival equivalents (6), receiving-side flag/bounce count (2), predicted landing x/z/time (3), both scores (2), player power (1), recent left/centre/right shot fractions (3), average player depth (1), difficulty code (1), and sample confidence (1). Use side-specific court normalization, fixed documented velocity scales, clipping and finite checks; derive velocity from simulation observations rather than keyboard intent. Exclude cursor position and pending inputs.

Keep jump/action timing in the verified planner. Train this policy from planner demonstrations first, then consider PPO for an objectively measured improvement. A frozen policy only responds to supplied history features; it is not learning new weights in the browser. Training requires a separate memory budget and is not claimed to fit 150 MB.

Direct typed-array inference should require very little AI memory, but only weights are calculated here. Set an incremental AI memory target of under 1 MB and a hard acceptance ceiling of 150 MB; measure before claiming compliance. Report whole-tab/process/GPU memory separately and state the browser/tool used. No candidate has been benchmarked in this pass.

## Original recommendation — retained as historical proposal

The remaining original sections predate the mouse/jump/court repairs. Their architecture and tuning are superseded where the revised research and Layer 7 plan differ.

For the seven-hour browser MVP, implement Layer 7 difficulty and adaptation with the existing deterministic local controller. Do **not** add an LLM, a downloaded pretrained model, TensorFlow.js, or ONNX Runtime to the shipped game.

If the project specifically needs a learned opponent after the deterministic Layer 7 gate is closed, the best-fit model is a **tiny PPO-trained multilayer perceptron (MLP)** whose output is limited to tactic, shot target, and recovery target selection. Keep the existing trajectory prediction, bounded movement, contact validation, scoring, and match lifecycle authoritative.

There is no useful off-the-shelf model to download for this game. A policy must be trained against Foot Tennis's exact observation and action contract. “PPO MLP” identifies the training algorithm and deployable architecture, not a pretrained artifact that can be dropped in safely.

## Why this is the right model class

Foot Tennis already exposes compact numeric state: ball position/velocity/receiver/bounces, predicted landing and intercept time, both actor positions, score, serve, power, and recent player tendencies. The useful actions are also compact: choose a legal shot lane/depth and a recovery location. Images, text, and general world knowledge are unnecessary.

PPO is a practical policy-gradient algorithm intended for policies learned through environment interaction. Stable-Baselines3 supports MLP policies and bounded continuous actions, and Gymnasium documents custom environments. Those tools are suitable for offline training; neither belongs in the production browser bundle.

Recommended deployable actor:

- Input: about 18 normalized scalar observations.
- Hidden layers: 32 tanh units, then 32 tanh units.
- Output: 7 values: shot x/z, recovery x/z, and three tactical logits (safe, exploit space, cover tendency). Clamp every result through existing legal target bounds.
- Parameters: `(18×32+32) + (32×32+32) + (32×7+7) = 1,895`.
- Float32 weights: 7,580 bytes; int8 weights would be about 1,895 bytes plus small scales.
- Working activations: comfortably below 1 KB for one inference. A small handwritten dense-layer evaluator and typed arrays keep incremental AI memory far below 1 MB.
- Inference cadence: once when planning an intercept/return and once at a point boundary, not every render frame.

The size figures above are arithmetic for the proposed actor only. They are not a measured whole-tab memory claim. The complete Three.js game must still be profiled on the target browser if the 150 MB requirement applies to the entire tab rather than the AI component.

## Runtime options considered

| Option | Fit | Memory/bundle implication | Decision |
| --- | --- | --- | --- |
| Existing state machine plus explicit adaptive tactics | Excellent for the hackathon; deterministic and directly testable | Negligible incremental memory; no dependency | **Ship for Layer 7** |
| Tiny PPO MLP, weights evaluated directly in TypeScript | Best learned-policy option after offline training | Model is about 7.6 KB float32; evaluator is tiny | **Preferred learned extension** |
| Tiny PPO MLP through ONNX Runtime Web | Technically valid and portable | Runtime/WASM is disproportionate to a 1,895-parameter network; custom minimal builds add delivery work | Reject for MVP |
| TensorFlow.js policy network | Proven capable of browser policy-gradient demos | Adds a general tensor runtime and tensor/GPU memory lifecycle to a game that only needs a few matrix multiplies | Reject for MVP |
| Small language model / Transformers.js | No meaningful advantage for numeric real-time control | Model and runtime are vastly larger, less deterministic, and harder to validate | Reject |
| Online learning during a match | Could personalize over long sessions | A first-to-five match provides too little stable data; risks erratic difficulty and persistence/privacy work | Reject |

ONNX Runtime Web officially supports browser inference through WASM, WebGPU, WebGL, and WebNN, and ORT format/custom builds can reduce size and peak memory. That is useful for larger or changing model graphs, but unnecessary overhead for three tiny dense layers. TensorFlow.js likewise supports browser reinforcement-learning examples, but its WebGL tensors require deliberate disposal; again, the runtime solves a larger problem than this game has.

## Layer 7 difficulty recommendation

Difficulty is a player-facing contract; adaptation happens inside each difficulty without silently turning the opponent into a perfect bot.

| Difficulty | Reaction delay | Target error | Tactical behavior | Intended experience |
| --- | ---: | ---: | --- | --- |
| Easy | 0.42–0.56 s | up to 0.55 units | Mostly safe centre returns; adapts only after 4 samples | Approachable rallies and visible mistakes |
| Normal | current 0.28–0.38 s | current 0.38 units | Layer 7 balanced/deep/short/cover tactics after 3 samples | Default, fair adaptation |
| Hard | 0.18–0.28 s | up to 0.20 units | Uses depth and favourite-side evidence sooner, but keeps bounded noise | Demanding without cheating |

These are starting targets for playtesting, not accepted final tuning. Keep rival movement speed, contact radius, legal bounds, one-bounce rule, and physics identical across difficulties. Difficulty changes reaction, decision error, and tactic selection only. This preserves the existing rule that adaptation must not mutate movement/contact mechanics and avoids a bot that wins through hidden physical advantages.

Recommended adaptation state:

- Count the player's left/centre/right landing lanes and short/mid/deep depths from accepted returns.
- Maintain small decayed counts or match-local totals; require at least three observations on Normal and four on Easy before changing tactic.
- Select exactly one readable tactic between points: `Balanced`, `Guarding left/right`, `Pressing short`, or `Pushing deep`.
- Add hysteresis: retain the current tactic until a challenger exceeds it by a clear margin, so one shot cannot flip behavior.
- Reset all learned match statistics and tactic state on Rematch. Difficulty preference may persist in local UI state, but adaptation data must not.
- The first two rallies remain forgiving regardless of selected difficulty; Hard may react faster but should not target extreme corners immediately.

## Optional learned-policy contract

Only pursue this after the explicit Layer 7 version is implemented and verified.

1. Mirror the deterministic TypeScript simulation in a small Gymnasium environment or expose an accelerated headless simulation.
2. Train the PPO actor against a curriculum of scripted player styles, including centre-safe, alternating flanks, short camper, deep camper, and noisy mixed play.
3. Reward legal returns and point wins, but penalize unreachable/illegal targets and repetitive play. Include an entropy term or evaluation constraint so the bot remains varied.
4. Export only normalized actor weights. Do not ship the value network, optimizer, replay data, Python, Gymnasium, or Stable-Baselines3.
5. Evaluate the three dense layers in TypeScript using preallocated `Float32Array`s. Seed tactic sampling per match for reproducible tests.
6. Clamp outputs through the same `RIVAL_BOUNDS` and legal shot-target helpers. If weights fail validation, fall back to the explicit tactic selector.
7. Acceptance requires win-rate and rally-length evaluation against every scripted style at every difficulty; model size alone is not evidence that the opponent is fun.

## Evidence and limits

- The current opponent is already a compact deterministic `recover → track → intercept → return` controller with analytic trajectory prediction, bounded movement, reaction delay, target error, and shared authoritative contacts. Layer 7 can add difficulty and adaptation without replacing those proven mechanics.
- The proposed actor is guaranteed by construction to be far below 150 MB as an AI component. No whole-page RAM measurement has been performed, so a total-tab 150 MB guarantee remains open.
- No model was trained or benchmarked in this research pass. Calling any learned policy “perfect” before simulation evaluation and browser playtesting would be misleading.
- A learned policy is a post-MVP option, not a prerequisite for the requested Layer 7 behavior.

## Primary sources

- [Schulman et al., Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)
- [Stable-Baselines3 policy-network documentation](https://stable-baselines3.readthedocs.io/en/master/guide/custom_policy.html)
- [Gymnasium custom-environment documentation](https://gymnasium.farama.org/main/tutorials/environment_creation/)
- [ONNX Runtime Web documentation](https://onnxruntime.ai/docs/tutorials/web/)
- [ONNX Runtime minimal web builds](https://onnxruntime.ai/docs/build/web.html)
- [TensorFlow.js browser reinforcement-learning example](https://github.com/tensorflow/tfjs-examples/tree/master/cart-pole)
- [TensorFlow.js platform and memory-management guide](https://www.tensorflow.org/js/guide/platform_environment)
