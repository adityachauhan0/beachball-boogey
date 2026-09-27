# Blender MCP — models and animations

For continuation, start with [animation-handoff.md](animation-handoff.md): authoritative files, scene navigation, safe editing/export, script hazards, evidence and runtime integration steps.

Updated: 2026-09-27. **User-approved tooling:** use Blender MCP through Codex for this project's 3D models and animations. This setup does not complete Layer 6 or change gameplay requirements.

## Installed local setup

- Blender: `/Applications/Blender.app`, verified **5.2.2 LTS**.
- Integration: third-party [MCP for Blender](https://github.com/ahujasid/mcp-for-blender), package **mcp-for-blender 2.1.1**, add-on **1.7 / protocol 11**. This is not an official Blender integration.
- Add-on installed and enabled in saved Blender preferences: `/Users/adityachauhan/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp.py`.
- Codex server name: `blender`, enabled globally in `/Users/adityachauhan/.codex/config.toml`. Desktop and CLI use the [Codex MCP configuration](https://developers.openai.com/codex/mcp/).
- Command: `/opt/homebrew/bin/uvx --python 3.11 mcp-for-blender==2.1.1`.
- Environment: `BLENDER_HOST=127.0.0.1`, `BLENDER_PORT=9876`, `DISABLE_TELEMETRY=true`. Listener verified on loopback only. Local modeling/animation needs no API key; external asset services are optional.

Recreate the Codex registration if needed:

```sh
codex mcp add blender --env BLENDER_HOST=127.0.0.1 --env BLENDER_PORT=9876 --env DISABLE_TELEMETRY=true -- /opt/homebrew/bin/uvx --python 3.11 mcp-for-blender==2.1.1
```

Install/reinstall the matching add-on:

```sh
/opt/homebrew/bin/uvx --python 3.11 mcp-for-blender==2.1.1 install-addon
```

## Starting and verifying a session

1. Restart Codex after adding the server so the tools load. If tools are already callable, no restart is needed.
2. Open the intended `.blend` in Blender. Enable **Interface: MCP for Blender** in Preferences → Add-ons if needed.
3. In the 3D viewport press **N**, open **MCP for Blender**, and start/connect the server. Keep Blender open. If another instance owns port 9876, disconnect that instance first; only one scene should own this endpoint.
4. Check `codex mcp get blender`. Then call `get_scene_info` to confirm the intended scene before modifying it. A registered MCP server alone does not prove Blender is connected.
5. Use `get_object_info` and `get_viewport_screenshot` to inspect results; use `execute_blender_code` for mesh construction, materials, rigging, keyframes, and exports. Supply the user's actual request to tools that require `user_prompt`.

**Verification performed:** a real MCP stdio client initialized the pinned server, listed **36 tools**, negotiated add-on protocol 11, and successfully called `get_scene_info`, receiving Cube, Camera, and Light from a separate default-scene Blender session. Add-on enablement and preferences save succeeded. The previously open Blender scene was preserved. Native UI input failed with `noWindowsAvailable`; activation used Blender's Python interface in the separate session. A production model, rig, animation export, and in-game GLB load were not created or verified by this tooling task.

If connection is refused, verify Blender is open and its add-on listener is started; `lsof -nP -iTCP:9876 -sTCP:LISTEN` should show Blender at `127.0.0.1:9876`. If tools are missing, restart Codex and inspect its MCP settings. The add-on stays enabled across launches; explicitly check/start the connection after reopening Blender.

## Project asset workflow

Read [asset-manifest.md](asset-manifest.md), [visual-direction.md](visual-direction.md), [implementation-plan.md](implementation-plan.md), and [layer-5-handoff.md](layer-5-handoff.md) before asset work.

- Author editable sources under `assets/blender/` (the current package already exists). Export only runtime assets to `public/assets/`, preferably self-contained **GLB** with embedded materials/textures. Keep source `.blend` files out of the runtime bundle. Preserve references.
- Build one articulated **chibi human with huge shoes**, with the three supplied orange-haired, bunny-eared and brown-haired mesh variants on the same skeleton. The earlier two-palette proposal is superseded. Match the supplied reference aesthetics and inspect the silhouette from the actual match camera.
- Keep a ground-centered root and usable joint pivots; record scale and forward direction with each asset. Blender is Z-up; verify the glTF exporter conversion against the Three.js Y-up scene. Apply mesh transforms deliberately before rigging and verify export scale, facing, and foot placement in the game.
- Required animation states: idle, run, ground kick, aerial kick, bicycle kick, celebration, loss reaction. Recommended export names: `idle`, `run`, `ground_kick`, `aerial_kick`, `bicycle_kick`, `celebration`, `loss`. These names are an authoring convention to map in the adapter, not an existing runtime API. Bake/export intended actions and inspect that every clip survives GLB export.
- Keep motion in place: logical gameplay position/facing owns the root. Accepted simulation contact events trigger kick poses; animation must never decide contact, reach, shot timing, trajectory, scoring, or power. Huge shoes do not enlarge collision radius.
- Bind through the existing character adapter contract. Advance animation with simulation time; preserve pause/reset, reduced motion, disposal, and the existing single feedback-event fan-out. Preserve grounded player/rival indicators and ball landing/aim readability.
- Record source/license, editable source path, exported path, clip inventory, scale/facing, and verification status in the asset manifest. Record imported dependencies/notices if used. Preview locally before integration; Blender preview alone does not establish browser fidelity.
- Verify exported geometry/materials/clips in Three.js, all three character appearances, kick readability/clipping, match/rematch, timing/power, pause/reset/reduced motion, regression routes, and production build per Layer 6 gates. Asset work remains proportional to the hackathon; procedural fallback remains available.

Blender MCP is an authoring tool on this machine. The shipped web game loads bundled assets and does not depend on Blender, MCP, a model API, or a backend.
