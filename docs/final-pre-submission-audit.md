# Final pre-submission / recording audit

November 15, 2026, Asia/Kuala_Lumpur. Audited main:
`f9d5f488fe12e818658f6fd62e24ba67b960892f`, including merged PR #48.
The patches accompanying this report require review/merge before they appear on Pages.

## Findings patched

- Replaced deprecated `THREE.Clock` with `THREE.Timer`, updated it once per render
  tick, and connected/disposed its visibility listener. This removes a console
  warning present on the live main build; fixed physics steps and MET remain intact.
- Added a keyboard-accessible, scrollable native **CREDITS & SOURCES** dialog in
  the lobby and HTML SI metadata. README, submission text and app now identify the
  three user-supplied categories: **Coding, Debugging, or Troubleshooting**;
  **Writing, Editing, or Translation**; **Research or Information Gathering**.
  Disclosures include starfall, Outpost HUD/comms and mobile HUD minimization,
  as well as documented Claude Code, Codex, Copilot and historical scaffolding use.
- Clarified that Motion and Lucide were removed unused template dependencies;
  they are not current libraries. Retained React, Three.js, Vite, TypeScript,
  Tailwind, Bun, and the supplied Determination font/CC BY 3.0 attribution.
- Crossref bibliographic records confirmed Zhang et al. (2020), *First measurements
  of the radiation dose on the lunar surface*, DOI `10.1126/sciadv.aaz1334`, and
  Hassler et al. (2014), *Mars’ Surface Radiation Environment Measured with the
  Mars Science Laboratory’s Curiosity Rover*, DOI `10.1126/science.1244797`.
  This verifies citation identity, not the exact gameplay radiation rates. The
  debrief now explicitly calls those numbers unverified scenario inputs.
- Quiz cards now scroll from a reachable top on short displays and hide the
  redundant EXAM GATEWAY label on narrow screens to avoid crowding the heading.
- Pages deployment now uses the type-checking production build command, preserving
  its repository subpath. Updated the offline smoke check to include both outpost
  destinations, SI credits, and console warnings; added `scripts/verify-demo.mjs`.

## NASA / asset findings

No NASA logo, flag, seal or official mission insignia was found in reviewed SVG
badges, procedural 2D/3D scenes, banner/preview assets or rendered screens. Existing
PNG/GIF assets are unchanged from the inspected release; the game uses project
artwork and plain-text source attribution. This is an asset/source review, not a
NASA approval or certification.

Horizons System/API snapshots remain the integrated NASA source: sunlight affects
outpost power; the Moon/Earth reference appears in the HUD/export. NASA Open APIs
is planned only. Chang'e-4/LND is a Chinese mission/instrument literature reference;
Curiosity RAD is NASA MSL literature. Both radiation papers remain outside the
integrated API list. Craft physics and stage tolerances are arcade game values.

A current-tree scan (source, scripts, public files, config, docs and rebuilt output;
excluding installed dependencies and Git internals) found no provider SDK/API-key
configuration or common credential patterns. No `.env*` files were present.
Historical AI disclosures are intentionally retained. The team must confirm any
unrecorded AI tools/artwork; repository inspection cannot recover missing history.

## Verification

| Check | Result |
| --- | --- |
| Frozen Bun install | Passed |
| Full Bun suite | 196 passed, 0 failed, 21 files, 15,768 assertions |
| `npm run build` | Strict TypeScript + production bundling passed; no build warnings (npm printed an unrelated update notice) |
| `bun run build -- --base=/cadet-1_-orbital-telemetry/` | Passed; emitted correct subpath URLs |
| `verify-demo.mjs` | SI metadata/credits and native dialog; Moon/Mars; all three quiz gates, certification victory and lobby at 1920×1080, 390×844, 320×568 and 568×320; zero console warnings/errors |
| `verify-title.mjs` | Pointer/touch/wheel navigation at desktop/mobile/landscape sizes; all controls reachable |
| `verify-audio.mjs` | Synthesized signals/mute; actual HUD-guided Stage 1 steering; quiz input lock, wrong-answer retry/pass and pause/lobby |
| `verify-hud.mjs` | Minimal/full mobile HUD, pixelated one-third buffer, modal log exports and restart isolation |
| `verify-outpost-hud.mjs` | Drawers, notification skip/recall, shared mute, real schedule/build/run actions, checklist collapse, five sizes, reduced motion and cleanup |
| `verify-starfall.mjs` | Actual engine timing, pause/reset, camera modes, four sizes, shader compilation and reduced motion |
| Production `verify-release.mjs` + `verify-fonts.mjs` | Pages-path local build loads without external requests; disconnected replay, JSON export, Moon/Mars, bundled credits, self-hosted font/notices and Web Audio interactions pass |

The demo script controls stage/task entry to reach every gate efficiently; it is
not a complete piloted Stage 2/3 playthrough. Stage rules remain covered by unit
tests. Screenshots of the recording/mobile states were inspected. Testing used
Chromium/SwiftShader; hardware/browser differences still apply.

## Live Pages status

The [Pages deployment run](https://github.com/NabilUbay5/cadet-1_-orbital-telemetry/actions/runs/43705097560)
succeeded for exact main SHA `f9d5f488fe12e818658f6fd62e24ba67b960892f`.
The public URL returned HTTP 200, and its loaded bundle contains PR #48 starfall
and the Outpost Flight Director. Live title/Moon navigation passed with no app
errors and no external runtime requests. It emitted the `THREE.Clock` deprecation
warning addressed by this patch. Local patched flows emitted no warnings/errors.
Cloud Chromium needed a certificate-trust bypass for the live navigation only;
independent HTTPS retrieval using system trust succeeded. No certificate setting
was changed in the application.

After merging this patch, wait for the Pages deployment of that merge SHA to turn
green, then hard-refresh the public link and confirm CREDITS & SOURCES is present.
The existing deployment is current for audited main; these final patches are not
published until merged.

## Recording and submission limits

- Record at 1920×1080. Show Outpost Ops, a meaningful build/schedule/day decision,
  and the NASA sunlight drawer; Flight Academy can show the reference HUD or
  starfall. Starfall starts after 10 active MET seconds, so prepare that segment
  before recording or edit together actual gameplay captures.
- Keep a locally served build for offline judging. Gameplay works after loading
  and from local assets without internet. A first visit/reload of the remote
  Pages site while offline is not supplied by a service worker/cache.
- The actual submission portal contents, final public video URL, official rules
  and team-provided deadline have not been independently certified by this audit.
  Use the updated disclosure in `docs/submission.md`, list integrated Horizons
  sources accurately, and verify the video is public before Submit for Judging.
