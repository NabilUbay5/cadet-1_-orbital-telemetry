# Pre-submission release audit

Date: November 15, 2026, Asia/Kuala_Lumpur. Base: `94fc911` on
`NabilUbay5/cadet-1_-orbital-telemetry/main`. Results apply to the accompanying
release-cleanup changes, not to an unmodified checkout of that base.

## Cleanup and current-tree scan

Reviewed tracked source, scripts, public assets, package/lock/config files, HTML,
hidden/ignored project files including `.env*`, and the rebuilt `dist/` output.
The current-file scan excluded dependency installation directories and `.git`;
provider SDKs were checked in the dependency manifest and lockfile. It searched
provider names/endpoints, SDK imports, API-key configuration and common credential
shapes without printing secret values. No `.env*` files were present.

- Removed the unused AI Studio design-note asset and unused `metadata.json`,
  including its frame-permissions key. Rebuilding from an empty `dist/` removes
  the copied public artifact from the release too.
- Removed eight unused direct dependencies: `dotenv`, `express`, `lucide-react`,
  `motion`, `@types/express`, `autoprefixer`, `esbuild` and `tsx`. Build tools and
  Three.js types now belong in `devDependencies`; the Bun lockfile is synchronized.
- Replaced the placeholder package name. Removed the unused root import alias,
  decorator flag, agent-specific HMR configuration and stale `server.js` cleanup
  target. Preserved class-field behavior and existing license notices.
- Removed the `__dirname` config warning and split React/Three.js into static
  chunks without suppressing build warnings or increasing the warning threshold.
  The largest JavaScript chunk is 352.58 kB before gzip.
- Inlined the existing 280-byte project favicon in HTML. Browser testing exposed
  Chromium re-requesting the tab icon during downloads after disconnection;
  inlining fixes that request. The inline bytes match `public/favicon.svg`.

Result: **no active AI Studio/Gemini configuration, provider SDK imports, provider
API keys, or runtime LLM requests detected in the current project or release**.
Intentional AI provenance references remain in README and submission/audit docs.
Git history is preserved. Pattern scanning is evidence about these files, not a
claim that every possible secret format or unrecorded tool use can be detected.

## NASA provenance and presentation

- README distinguishes **Integrated** Horizons System/API data from the
  **Planned only** `api.nasa.gov` portal and **Unverified scenario inputs** from
  Chang'e-4/Curiosity RAD literature. Both official fetch scripts are identified.
- Bundled outpost sunlight drives simulated power availability. Moon/Earth vectors
  drive a reference HUD replay and exported reference readings; arcade spacecraft
  physics and flight-stage tolerances are not derived from NASA ephemerides.
- Tests check saved source/frame/epoch/unit metadata, vector equality with the
  original response, interpolation accuracy and coverage boundaries, plus the
  SHA-256 of the separate three-epoch reference fixture. Source data was not
  regenerated or altered during cleanup.
- Outpost destination cards now label 1.37 mSv per lunar game day and 0.64 mSv per
  Martian sol as unverified scenario inputs directly on screen.
- Visual inspection of both banners, PNG previews and sampled GIF frames, plus
  SVG badge/favicon and procedural scene source review, found no NASA logo,
  insignia, seal or flag. Plain-text NASA/JPL source attribution is retained.
- AI disclosure records Claude Code, OpenAI Codex and GitHub Copilot assistance,
  this audit, and historical Google AI Studio/Gemini scaffolding. The original
  scaffold's model and generation scope are undocumented. The team must add any
  other AI use; source inspection alone cannot establish an exhaustive history.

## Verification results

Environment: Bun 1.4.4, Node 24.22.1, strict TypeScript, Vite 8.3.6;
Chromium with SwiftShader and optional externally installed Playwright.

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile --ignore-scripts` | Pass; no lockfile changes |
| `bun run lint` | Pass; strict TypeScript, no errors |
| `bun test` | **100 passed, 0 failed**, 11 test files, 11,383 assertions |
| `bun run clean && bun run build` | Pass; strict TypeScript and Vite, **zero build warnings** |
| `scripts/verify-release.mjs` against production preview | Pass; fresh local load with external requests blocked, then all networking disabled; advancing NASA epoch, real JSON download with valid provenance/readings, Outpost Ops startup; no browser errors |
| `scripts/verify-hud.mjs` with `HUD_OFFLINE=1` against dev server | Pass; 1280×800, 390×844, 320×568 and 568×320 at DPR 2; one-third/minimum canvas, pixelated scaling, no wing overflow, pause/victory/defeat downloads and restart isolation |
| `scripts/verify-audio.mjs` | Pass; audio signals, mute, quiz failure/retry/pass, stage transition, pause/resume and lobby |
| `git diff --check` and browser-script syntax checks | Pass |

The unit suite includes mission rules, outpost resources/sunlight, fixed-timestep
behavior, telemetry, audio/effects and quiz logic. Victory/defeat HUD checks use
controlled engine transitions; they are not a full mission playthrough. No physics
loop or mission-rule implementation was changed by this cleanup.

For browser reproduction, use the commands in README. Set `PLAYWRIGHT_MODULE`
and `CHROMIUM_PATH` for the local installation; `APP_URL` can override the
production preview default (`http://127.0.0.1:4173`) or dev default (port 3000).

## Submission limits

- Gameplay is self-contained when a built copy is served locally, and continues
  after disconnecting a loaded page. Remote-site first load/reload while offline
  is not provided: there is no service worker/offline install cache. A local
  static-server copy is the supported offline judging setup.
- The official team project page returned HTTP 503 during this audit. Eligibility,
  the official challenge selection, the user-provided November 15 at 11:59 PM
  Malaysia-time deadline, and actual form completion were not independently
  verified. A green build does not certify Global Award eligibility.
- A final public video/slides URL remains unverified. The existing GIF/PNG previews
  are not a confirmed completed submission demonstration.
- [Submission text](submission.md) contains a 146-word summary, the two integrated
  source links and an evidence-backed AI statement. Confirm any unrecorded AI use
  before pasting the final disclosure. This audit does not submit the event form.
