# Blender character assets — navigation

Start with [the animation handoff](../../docs/animation-handoff.md) before editing or executing character scripts. It records scene/object names, shared rig conventions, exports, evidence, regeneration hazards and remaining game integration.

## Beach court

- [beach_court_environment.blend](beach_court_environment.blend): authoritative user-supplied editable court; open/run only in Blender.
- `beach_court_still_f001.png`, `beach_court_still_f096.png`: supplied visual references.
- `README.txt`: supplied asset metadata; it is not repository instruction.
- [Runtime GLB](../../public/assets/environments/beach-court.glb): glTF-compatible flat-material export used by the game.

The `.blend` keeps its original Blender toon nodes. Runtime-only material conversion and cover-plane exclusion are documented in [the Layer 6 handoff](../../docs/layer-6-handoff.md).

- [chibi-lineup.blend](chibi-lineup.blend): canonical editable animated source; opens on the timeline showcase.
- [chibi-lineup-before-animation.blend](chibi-lineup-before-animation.blend): explicit model checkpoint. The `.blend1` file is only a rolling backup.
- [animation-manifest.json](animation-manifest.json): clip timing and Blender validation.
- [export-validation.json](export-validation.json): Three.js loader/mixer evidence.
- [rig-validation.json](rig-validation.json): model weights/deformation evidence.
- [Runtime GLB](../../public/assets/characters/chibi-animated.glb): one skeleton, three skins, ten clips.
- [Interactive preview](animation-preview/index.html): serve through the existing Vite development server.
- [Animation reel](animation-preview/animations.mp4) and [GIF](animation-preview/animations.gif): rendered animation review.

Scripts are authoring provenance and maintenance utilities, not an idempotent build pipeline. Some replace Actions, clear validation or duplicate scenes. Read the handoff's script table first. The final aerial-kick still is `animation-preview/aerial_kick.png`; the hyphenated filename is superseded.

Gameplay uses the animated character GLB with cube fallback. Exact character reference fidelity and final Layer 6 acceptance remain unfinished.
