# Beach Ball Boogey 1.0.0 release

User authorized a public GitHub repository, a decorated README including their demo, and a standalone playable release. Repository: https://github.com/adityachauhan0/beachball-boogey . The existing local Vite server at http://127.0.0.1:5173/ is preserved.

## Deliverables

- Player-facing README with menu artwork, gameplay-video preview/link, downloadable game, rules/controls and later architecture sections.
- `media/demo.mp4`: 1280px H.264/AAC fast-start derivative of the user-supplied demo; the original remains unchanged and is attached to the release separately.
- `npm run release:build`: reproducible 13.1 MB standalone HTML in `release/`, embedding JS, CSS, both GLBs, MP3 and attribution notices. No runtime server or external asset request is needed.
- ZIP includes the HTML, play guide, third-party notices and checksum. The HTML is separately downloadable.
- GitHub Actions runs typecheck, tests and release packaging, then uploads the standalone artifact.
- Ignore generated builds, node_modules, environment files, local agent settings and Blender backup files. Editable Blender sources and original reference media remain in the source repository.

## Validation

Fresh typecheck and production/standalone builds pass. Full suite: 108/108 tests across ten files pass. Existing >500 KB JS chunk advisory remains. Standalone asset embedding and script syntax checked. This supersedes prior uncertainty about the full automated suite, not the open visual/gameplay gates.

Direct-from-disk browser verification is unperformed: browser-tool policy rejected the `file://` URL. No workaround was attempted. Existing local browser verification covers the web game, not the offline HTML specifically. Broader browser/device acceptance, character fidelity, performance and controlled real-window focus checks remain open. The local server's lifetime still depends on the host session/machine.

No blanket license for project-original assets or supplied music was invented. Existing source and bundled Three.js notices are retained.

## Publication

Public repository and v1.0.0 release published successfully. Clean Linux CI exposed missing explicit `@types/node` dependency for the tests; main now declares it and includes `node` in TypeScript types. This is a development-only fix and does not alter the standalone game bytes.

## Live hosting

GitHub Pages URL: https://adityachauhan0.github.io/beachball-boogey/ . `.github/workflows/pages.yml` builds and tests main, packages the self-contained HTML and deploys it as `index.html`. Embedded resources avoid repository-subpath asset failures. Hosting uses GitHub Actions OIDC; no AI Gateway credential is needed or stored. Existing local server remains available independently.

Live verification: GitHub Pages deployment succeeded on 2026-09-27. The public HTTPS page loaded the beach and all three model portraits, advanced through difficulty selection and entered a live match with the HUD visible. No captured browser warnings/errors during this check. The hosted self-contained build is verified; direct `file://` opening remains separately unverified. The workflow ran typecheck, all tests and standalone packaging before publishing.
