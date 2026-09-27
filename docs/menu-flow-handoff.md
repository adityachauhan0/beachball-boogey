# Beach Ball Boogey — menu, HUD and music checkpoint

Implemented 2026-09-27 following approval of the menu flow and subsequent requests for a matching HUD, bottom-right controls and supplied background music.

## Approved direction and implemented flow

- Public name is **Beach Ball Boogey**, from the supplied UI reference. Existing authored 3D beach remains the background; no new scenery image or Blender changes.
- Home → player selection → Easy/Normal/Hard → first-to-five match → results. Results offer Rematch, Change Setup and Main Menu. Pause offers Resume, Restart Match, Options and Main Menu.
- Three existing skins have UI nicknames Sunny (orange), Hopper (bunny), Coco (brown). Names are presentation choices, not new gameplay classes; all share existing movement/actions. Portraits render directly from the shipped GLB. Choosing a skin switches the existing runtime meshes, including when the asset finishes loading later. Rival uses brown unless player chooses brown, then orange.
- Cream panels, teal selection accents, orange primary actions, bold lettering and a beach-ball wordmark follow the reference. No fake Profile or browser-closing Quit button.
- How to Play explains the rules and current controls. Options exposes existing sound effects and reduced-motion controls. Native dialog supplies focus containment; Escape closes it without resuming gameplay underneath. Pause/results keyboard focus moves to the first action and Tab cycles within the active overlay.
- Match HUD: score/server at top centre, pause on left, sound/music top-right, power bottom-left, persistent movement/aim/kick/header/jump/pause reference bottom-right. Development telemetry is visually hidden unless `?debug` is supplied in development.
- Returning home resets the current match, effects and inputs. Setup selections remain in memory for this page session. Rematch/restart retains difficulty and selected skin, and resets learning via the existing match controller.

## Music

User supplied `/Users/adityachauhan/Downloads/vintage_hawaii (4).mp3`, copied to `public/assets/audio/vintage-hawaii.mp3` without altering the source. `src/ui/music.ts` loops it at 35% volume. Top-right Music on/off is independent from sound effects, stores preference in `boogey.music`, starts after a user gesture, pauses when the document is hidden and resumes when visible if enabled. Browser-blocked playback retries on later gestures; asset errors produce an unavailable state. No external music service is used.

## File map

- `src/ui/menu.ts`: screens, selection, dialogs, portrait generation, menu callbacks.
- `src/ui/menu.css`: visual theme and responsive menu/HUD rules layered after existing CSS.
- `src/ui/music.ts`: background audio lifecycle and preference.
- `src/main.ts`: menu/match integration, focus handling, title and telemetry visibility.
- `src/render/character-presentation.ts`: `setSkins` switches existing meshes.
- `index.html`: HUD, pause/results navigation, music toggle and metadata.

## Verification and limits

Typecheck and production build pass; existing large-JS-chunk advisory remains. Fourteen focused match/presentation tests pass. Brief browser verification confirmed model portraits, selection of Hopper, Easy selection and match entry, matching HUD and bottom-right controls, pause, restart at 0–0, an unattended 0–5 result, rematch at 0–0, return to main menu, How to Play/Escape, and music playing with `loop=true`. Turning music off produced paused audio; preference survived reload and turning it on restarted playback. Keyboard activation was used in the background browser; pointer activation did not advance through this browser automation surface and is not claimed verified. Desktop composition was visually inspected. No full responsive/device sweep or full production playtest was performed. Screenshot: [main menu](verification/boogey-menu.png).

Existing Layer 6 power, full-match/rematch, clipping/performance and real-window focus acceptance limits remain open. Character exact-fidelity gap remains open. Layer 7 AI mechanics, learning ownership, authored camera/boundaries and movement physics are unchanged.

## Quick shot-angle repair — 2026-09-27

User reported all returns landing near the net. Root cause: mouse positions on the player's half were clamped to rival z=-0.65. `resolvePlayerAim` now interprets those positions as a direction from the current player location: straight shots target z=-6, angled shots spread laterally with slightly less depth. Cursor positions beyond rival z=-2.5 retain direct placement; the near-net region blends continuously between the two. The target and overhead guide recompute as the player moves, and pointerdown updates aim even without a preceding pointermove. Shared launch/net-clearance physics and AI are unchanged.

Six focused mouse-aim tests pass, including analytic outgoing-flight landing checks for left/straight/right strikes, moving-player angles, direct placement and bounds. Typecheck/build pass (existing chunk advisory). No browser playtest was added for this quick repair; feel awaits user feedback.
