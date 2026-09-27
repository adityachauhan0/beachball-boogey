# Project context and decision ledger

Updated: 2026-09-27. Phase: Layers 1–5 implemented. Layer 5 passes 76 tests, typecheck/build and recorded browser/production checks; controlled real-window focus-loss checks remain open. Three chibi skins and ten shared animation clips are authored, with exact fidelity and runtime integration unfinished; see the implementation log for evidence and limits.

## Implementation sequencing decision

GitHub research refined the plan: adapt selected MIT cube-movement functions, use official Three.js rendering/import/animation addons, and try Yuka for opponent state transitions. Whole-game forks and mismatched controllers are excluded. See [reuse-research.md](reuse-research.md). Soccer_ThreeJS movement/cube patterns are now adopted with MIT notices. Layer 1 runtime verification is recorded in implementation-log.md; other candidate integrations are still future work.

The user requested a layer-by-layer plan starting with playable movement and cube player placeholders until design assets arrive. [implementation-plan.md](implementation-plan.md) defines eight runnable checkpoints, focused tests, and an asset adapter/handoff contract. At the Layer 4 checkpoint, Layers 1–4 were implemented. The user confirmed WASD movement and real-window held-key focus loss in Layer 2. Layer 4 adds first-to-five/loser serves/Rematch; 57 tests and both-winner browser/production checks pass, with a fresh focus-loss check outstanding. See implementation-log.md and layer-3-handoff.md for exact evidence and current tuning.

## Current specification

[mvp-spec.md](mvp-spec.md) now defines the proposed deliverable. It chooses one-touch play instead of the earlier two-touch idea, a beach court, automatic aerial contact, first-to-five matches, an adaptive local opponent, and exclusively local AI, following user clarification. The user subsequently accepted this direction and required chibis with huge feet/shoes. [asset-manifest.md](asset-manifest.md) lists the production needs. The historical proposals below remain for context.

## Explicit user requirements

- Make a 3D game with AI in it.
- It must run as a web game.
- It is for a seven-hour hackathon.
- It should be fun the moment the player presses Play.
- Use soccer tennis rather than volleyball.
- Keep the aesthetics of the supplied reference game.
- Save supplied clips and images in the repository for future reference.
- Capture project knowledge and index it in AGENTS.md: the repository is the spec.
- Digest the references first; create the game specification afterward.

## Conversation progression

1. Initial request explored stack choices and AI game ideas. The assistant recommended TypeScript, Vite, Three.js, and a small backend if an AI API is used. Exploration/dialogue concepts were suggested.
2. The first gameplay clip established arcade sports as the intended direction. The user emphasized instant fun and the seven-hour limit. The exploration concept was displaced by arcade court gameplay.
3. The user chose soccer tennis in place of volleyball. The assistant interpreted this as foot tennis across a low net and proposed a compact single-player game.
4. The user asked to preserve the reference game's aesthetics and supplied an additional montage and two character/court images. This supersedes the assistant's suggested robot appearance.

## Latest user clarification

Latest: the user approved and received the fast five-placement learning bandit with Easy/Normal/Hard, requested minimal visual testing and subsequently signalled handoff. See [Layer 7 handoff](layer-7-handoff.md). No specific playtest verdict was supplied. This supersedes the larger research/implementation proposals below for current delivery; aerial rival actions and neural models remain deferred.

The user requested renewed model research and an implementation plan reflecting the latest Layer 6 movement changes. [Layer 7 plan](layer-7-implementation-plan.md) now proposes explicit legal rival jumps/kicks/headers, independent continuous targeting, difficulty presets and match-owned adaptive statistics. The revised [research](ai-opponent-research.md) compares a real tiny pretrained SlimeVolley opponent, a custom learned tactical MLP, contextual bandits and SmolLM2. These are recommendations, not approved model adoption; the older 18-input PPO proposal is superseded by a documented optional 32-input tactical experiment. No gameplay code changed during research/planning.

The user wants simple AI opponents, prefers the cheapest sufficient option, and explicitly permits local AI. The user subsequently requested difficulty levels and research into an opponent model below 150 MB before Layer 7. Research in [ai-opponent-research.md](ai-opponent-research.md) selects the existing deterministic controller plus explicit match-local adaptation for the MVP. No external model/runtime is needed. If learned control is later required, the selected architecture is a roughly 1,895-parameter PPO MLP evaluated directly in TypeScript, limited to tactic and legal target selection. An LLM/API and backend remain out of scope.

## Historical assistant proposals — not an approved spec

### Core play

- 1v1 against an AI opponent on one small court.
- Fixed elevated camera showing both sides.
- Move with WASD/arrows; one kick button, with directional aiming.
- Contextual foot/header contact with a forgiving contact window.
- One bounce and up to two touches per side, allowing receive → setup → attack.
- First to five points and quick rematch.
- A bicycle-kick special as the signature visual payoff.
- Landing markers, trails, and readable feedback.

These are design options, not settled rules. In particular: automatic contact versus explicit kick timing, bounce/touch allowances, aerial control, and power mechanics need specification.

### AI

- Local opponent logic predicts landing locations and executes movement/contact.
- Bound the opponent's reaction speed and precision so it can be beaten.
- Adapt tactics to player positioning and repeated shot preferences.
- If generative AI is required, use an API between points to choose from validated tactics. Keep network calls out of time-critical movement and contact.
- Show adaptation through short readable feedback if useful.

Neither API use nor any specific model/provider is approved. Local game AI and generative AI are distinct options.

### Technical direction

- TypeScript + Vite + direct Three.js is the current recommendation.
- Custom ball arcs/contact rules are proposed to support arcade feel; Rapier is an option if physical interactions justify it.
- HTML/CSS HUD; React only if the interface complexity warrants it.
- Small backend only if AI API integration needs server-side credentials.
- Browser automation can support playtesting; Blender MCP is now configured for local model/animation authoring; see [blender-mcp.md](blender-mcp.md).

The stack has not been formally finalized. Do not add dependencies merely because they appeared in discussion.

## Scope guidance

Aim for one coherent, polished match rather than multiple environments or modes. A playable rally should precede detailed character work. Multiplayer, realistic ragdolls, elaborate spin simulation, extensive customization, and voice interaction were proposed for deferral, not promised features.

An initial suggested seven-hour budget allocated three hours to basic match play, one to game feel, one to AI, one to presentation, and one to verification/deployment. It is a rough planning proposal, not an elapsed-time record or guarantee.

## Open decisions for the spec

- Does the hackathon require a generative AI/API integration, or does adaptive opponent logic qualify?
- Exact foot-tennis rules: bounce limit, touch limit, serve, net/out faults, and scoring.
- Controls and assistance: manual kick, automatic receive, jumping, aiming, and aerial special.
- Initial setting: indoor gym, beach, park, or another court using the same visual language.
- Camera framing and whether any dramatic camera effects are worth the readability cost.
- Minimum character fidelity and the method for outlines and cartoon shading.
- Whether a special/power meter is essential to the first playable version.
- Deployment target and desktop/mobile input scope.

## Superseded directions

- Exploration/escape-house and conversational mystery concepts: replaced by arcade court sports.
- Volleyball as the game being built: replaced by soccer tennis; reference footage still informs aesthetics and feel.
- Robot characters: replaced by the approved reference aesthetic of stylized human/chibi characters.

## Next action

Current continuation: [Layer 7 handoff](layer-7-handoff.md), then user playtest feedback or requested delivery work. The Layer 6 instruction below is historical and its remaining acceptance limits still apply.

Continue Layer 6 from [animation-handoff.md](animation-handoff.md) and [layer-5-handoff.md](layer-5-handoff.md). Use the saved shared-rig assets; do not rebuild them blindly. Preserve gameplay timing and existing regression modes. Exact character fidelity, runtime integration and controlled real-window focus-loss verification remain open.

## 2026-09-27 — Layer 5 continuation

User renewed the instruction to complete Layer 5 and use the Codex browser for testing. Timing/power/feedback/audio are now implemented and exercised with actual keyboard contacts, earned meter segments, charge across points, powered rival returns and match/rematch. Current tuning and performed evidence are in [layer-5-handoff.md](layer-5-handoff.md) and [implementation-log.md](implementation-log.md). Added accessible mute and Reduce motion preferences; device reduced motion takes precedence. Controlled real-window focus-loss checks remain explicitly unverified. Layer 6 huge-shoe chibi integration is next; no adaptation, new mode, backend, dependency or deployment was added.

## 2026-09-27 — Character and animation handoff

The user requires the three supplied designs reproduced exactly with a common skeleton and mesh variants, then sports animations informed by current game actions, including running, jumping, kicks and headers. An editable approximation and ten shared clips are authored/exported; exact fidelity remains unmet. [animation-handoff.md](animation-handoff.md) records authoritative files, safe maintenance and next integration steps. Asset previews are separate from gameplay; no manual jump/header controls have been added.
