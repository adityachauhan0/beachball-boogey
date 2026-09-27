BEACH COURT ENVIRONMENT - toon shader pass
==========================================

beach_court_environment.blend
    The working file (Blender 5.2 LTS, EEVEE, 1584x993, 24fps, frames 1-192).
    Open this one.

beach_court_still_f001.png
beach_court_still_f096.png
    Reference stills from frame 1 and frame 96.

ORIGINAL_before_toon_beach_court_environment.blend
    Untouched copy of the file as it was BEFORE any of these changes.
    Rollback point: rename to beach_court_environment.blend (or just open it).


WHAT CHANGED
------------
- Fixed 8 "Front *" foreground leaves that rendered as black blobs
  (all were baked flat at exactly z=2.5, overlapping, shadowing each other).
- Converted 78 materials to a cel/toon shader:
  Diffuse -> ShaderToRGB -> ColorRamp (CONSTANT, 4 bands) -> Emission.
- Lighting: sun 1.7 -> 3.4 energy, 6deg -> 1deg softness, elevation 52deg -> 34deg;
  overhead fill 650W -> 300W; world strength 0.65 -> 0.50.
- Deleted 6 painted shadow decals that were causing a milky patch on the left sand.
- Render engine Cycles (CPU) -> EEVEE. Render time ~86s -> ~14s.
- Purged 21 orphaned actions, 141 dead shader nodes, duplicate datablocks.

ANIMATION (already in the file, verified working)
-------------------------------------------------
Ocean: 4 shape-key phases on "Animated turquoise waves" cross-fade in
sequence and loop cleanly (frame 192 matches frame 1).
Also animated: "Broad broken shore wash", and 4 banner cloths.

KNOWN GAPS
----------
- Shadows on the court itself are weaker than the reference; the palms sit
  outside the court line so their frond shadows fall off-frame.
- No ball on the far post (it was removed along with the player boxes).
- Three sand materials use window-coordinate image projection, so those
  patches will visibly swim if you animate the camera. Fine locked off.
- The wave animation is correct but subtle at this camera distance.
