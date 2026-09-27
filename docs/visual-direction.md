# Visual direction from user references

Status: the user approved retaining the reference game's aesthetics. The descriptions below separate visible evidence from proposed implementation. The reference game's title and underlying technology have not been verified.

## Observed character language

- Oversized heads and hair silhouettes relative to compact torsos and short legs.
- Thick dark contour lines around character parts; simpler shading on characters than on environments.
- Round hands visibly separated from the torso, with minimal or absent visible arms in the supplied images.
- Chunky shoes, simple shirts/shorts, and very simplified facial features.
- Strong hair colour and shape variation: orange spikes, long yellow hair, blue/purple styles, brown short hair, and pale/white styles.
- Clothing colours and hair silhouettes distinguish players at gameplay distance.
- The lineup image includes expressive poses and large outlined names. Names remain reference content. **Superseded on 2026-09-27:** the user subsequently explicitly required the three exact character designs, sharing one skeleton; see [character-recreation.md](character-recreation.md).

## Observed environments

- Indoor footage: warm wooden court, readable white markings, a mesh net, tall gym interior, and crowded bleachers.
- Beach footage/image: pale sand, blue boundary lines, ocean/shore, loungers, umbrellas, palm trees, and buildings.
- Park footage: saturated green court/grass with trees and blue sky.
- One montage shot uses a simplified orange court against a cyan background.
- The gray checkerboard image presents a sparse court with the same character/marker language; it is not a request to ship a gray prototype aesthetic.
- Environments have more texture/detail than the cartoon characters, while court contrast keeps action readable.

Multiple settings appear in the references. They establish a style range, not a requirement for multiple maps in a seven-hour build.

## Observed camera and motion

- Elevated perspective generally views the court from behind a near-side player, with the far side visible.
- The montage also includes oblique angles and a close ball shot. This does not prove continuous gameplay uses a fixed camera or require reproducing every cut.
- Characters visibly jump, dive/lean, and perform exaggerated aerial poses.
- The ball is large and visually prominent relative to the players.
- Ball shadows/ground markers help read its height and position.

## Observed feedback and UI

- Bright cyan rings and directional markers identify controlled players.
- Other visible markers include coloured arrows, ground crosses, landing rings, and a translucent red cylindrical indicator in the checkerboard image. Their exact functions cannot be established from stills alone.
- Long cyan, green, and pink ball trails exaggerate powerful movement.
- Contact effects include bright bursts and floating multiplier badges such as x2/x3.
- Compact score UI uses saturated contrasting colours; large outlined words appear for results/events.
- Names can float above characters. Reference overlays are not part of our game requirements.

Audio was not analyzed in this capture. Do not claim specific reference sound effects or music have been studied.

## Translation to our soccer-tennis game

Subsequent explicit user decision: use chibis with huge feet/shoes to reinforce arcade soccer. Exaggerate shoe silhouette and kick poses while preserving the reference head/body/hand language. See [asset-manifest.md](asset-manifest.md).

Preserve the chibi human proportions, thick dark outlines, vivid hair, simple clothing, bright selection ring, visible ball/landing cues, and colourful impact/trail language. Change the sport's contact actions to kicks, headers, and an optional bicycle kick, and use a soccer ball and a suitable low net.

Do not default to the previously suggested robots, realistic human anatomy, or a generic dark/neon arena. The intended style is playful cartoon characters in a bright, readable 3D sports setting.

For a feasible first court, use a small palette and simple environmental geometry. Character silhouettes, outline quality, camera framing, ball visibility, and contact poses should receive attention before background crowd detail.

Potential implementation methods, not final choices:

- Articulated simple meshes for head, hair, torso, detached hands, legs, and shoes.
- Cartoon material/shading and an outline technique evaluated for overlapping limbs and net visibility.
- Procedural hair silhouettes if imported character assets are unavailable.
- A legible soccer-ball pattern and high-contrast ground shadow/landing cue.
- Brief stylized contact poses and restrained camera effects that preserve the ability to track a rally.

## Visual review checklist for the eventual build

- Characters read as the approved cartoon style at normal gameplay distance.
- Players, ball, net, boundaries, and landing cues remain distinguishable during a rally.
- Hair silhouettes and clothing identify opponents without depending on name labels.
- Strong attacks visibly differ from ordinary returns.
- Court/environment support the action rather than obscuring it.
- Foot-tennis actions read as kicks/headers rather than volleyball hand strikes.

See [the media inventory](../references/README.md) for the originals and inspection contact sheets.
