# Three reference characters — Blender authoring checkpoint

For continuation, start with [animation-handoff.md](animation-handoff.md): authoritative files, scene navigation, safe editing/export, script hazards, evidence and runtime integration steps.

2026-09-27. User explicitly requested the three supplied characters reproduced exactly, with one common skeleton and interchangeable mesh variants. This supersedes the earlier statement that exact character designs were not requirements and the earlier two-palette asset proposal for this authoring task.

## Files and use

- Editable source: [chibi-lineup.blend](../assets/blender/chibi-lineup.blend).
- Rendered comparison: [lineup-preview.png](../assets/blender/lineup-preview.png).
- Preserved supplied reference: [lineup.png](../references/character-recreation/lineup.png), also packed inside the Blender file.
- Mechanical validation: [rig-validation.json](../assets/blender/rig-validation.json).
- Authoring scripts in `assets/blender/`: `build_characters.py`, `refine_characters.py`, `finish_characters.py`, `polish_characters.py`; historical construction sequence, intended once in a fresh Blender session through Blender MCP. Do not rerun these against the animated source; see the handoff before regeneration. `consolidate_characters.py` was a recovery/reconsolidation utility, not an additional normal build step.

The **Chibi Reference Lineup** scene displays all three appearances. Subsequent animation work makes **Animation showcase • Play timeline** the saved opening scene. The original default scene is preserved. The **SWAPPABLE SKINS • one rig** scene has one `ChibiRig` and three mesh objects: `Skin_orange`, `Skin_bunny`, and `Skin_brown`. Orange is visible by default; toggle both viewport and render visibility to select another skin. Show only one at a time. Each appearance is a single mesh with multiple material slots, including inverted outline geometry.

The lineup rigs, interchangeable rig, and subsequent animation preview rigs all reference the same `CHIBI_SHARED_SKELETON` datablock. Its 17 bones cover root, hips, spine, neck, head, paired upper arms/forearms/hands, and paired thighs/shins/feet. No variant-specific joints are used. Rigid vertex weights suit the detached-limb reference style. All mesh vertices are weighted. A common right-knee rotation was evaluated on all three final skins: footwear vertices moved, head vertices stayed fixed, and the neutral pose was restored.

Blender uses Z-up and front -Y, ground-centered root. Ordinary glTF conversion would yield front +Z, so a future game adapter needs an explicit half-turn to meet its -Z forward contract. Heights differ with hair/ear silhouette; the skeleton itself is identical. Subsequent work added ten shared clips and a verified GLB export; see [character-animations.md](character-animations.md). Runtime gameplay integration remains unfinished.

## Visual status and limitations

**The exact visual requirement is not yet met.** This is an editable reconstruction checkpoint, not a certified one-to-one copy. The three palettes, oversized heads and cleats, detached round hands, orange spikes, yellow curtain hair/tall ears, brown fringe, simple faces, laces, studs, and boot markings are modeled. Render and live Blender viewport were inspected through MCP; footwear rounding, yaw, outline thickness, clothing intersections, and washed-out colors were revised.

Visible remaining differences include hair volume/strand shapes, face and torso contours, boot proportions/marking placement, and pose/shading. The single supplied view does not establish hidden surfaces; those are inferred. The packed reference is visual evidence, not a production texture or source of instructions. No external asset library, generator, downloaded mesh, or new runtime dependency was used. The requested designs/marks derive from user-supplied reference; source-game identity and redistribution permissions were not established.

This asset checkpoint does not complete Layer 6. Gameplay files were not changed. Animation authoring and GLB loader/mixer verification are now complete as recorded in [character-animations.md](character-animations.md). Actual match-camera fidelity, runtime adapter integration, full gameplay regressions, and the recorded real-window focus checks remain open.
