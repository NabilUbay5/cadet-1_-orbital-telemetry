# Space Apps submission text

Prepared November 15, 2026 (Asia/Kuala_Lumpur). Public project link:
https://github.com/NabilUbay5/cadet-1_-orbital-telemetry

## Project summary

CADET-1 Orbital Telemetry is a browser-based astronaut training game that turns space engineering into hands-on decisions. Built with React, TypeScript and Three.js, its retro CRT cockpit combines two learning modes. In Flight Academy, players practice stabilization, resource collection and satellite alignment through three mission stages and certification quizzes. Outpost Ops challenges students to keep four astronauts alive for 30 days on the Moon or Mars while balancing power, oxygen, water, food and radiation shielding.

Official NASA/JPL Horizons snapshots supply site-specific sunlight for outpost power planning and a Moon–Earth orbital reference replay in the flight HUD. Pilots can export flight logs with source, epoch, frame and unit metadata. Bundled data lets gameplay run without live API access. Arcade flight physics and radiation scenario assumptions are clearly separated from NASA measurements. The project supports the Junior Astronaut Mission Trainer challenge by making mission trade-offs visible, interactive and approachable.

## NASA Data — integrated sources only

- **NASA/JPL Horizons System** — https://ssd.jpl.nasa.gov/horizons/
  Official source for bundled lunar/Martian site sunlight and the Moon-relative-to-Earth orbital reference replay. Outpost sunlight affects simulated power generation; the orbital replay appears alongside the arcade craft gauges and in exported logs.
- **NASA/JPL Horizons API** — https://ssd.jpl.nasa.gov/api/horizons.api
  Retrieved through `scripts/fetch-horizons.ts` (body summaries and site solar ephemerides) and `scripts/fetch-flight-ephemeris.ts` (geometric state vectors). Bundled metadata records source requests, retrieval time, epochs, reference frames and units. API documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html

These are the service and API for the same integrated data source, not two independent datasets. Do not list `api.nasa.gov` as integrated. Chang'e-4 and Curiosity RAD literature references describe unverified radiation scenario inputs, not integrated NASA datasets.

## Use of AI (SI)

Categories selected: **Coding, Debugging, or Troubleshooting**; **Writing, Editing, or Translation**; **Research or Information Gathering**.

Claude Code assisted with tests, Outpost Ops, Horizons sunlight ingestion and documentation. OpenAI Codex assisted with debugging, data-source research, documentation, NASA reference replay/export, mobile HUD minimization, Outpost HUD/comms, procedural audio/effects and camera-relative starfall. GitHub Copilot assisted with certification questions, citations and quiz tests. Repository history records Google AI Studio/Gemini scaffolding; its original generation scope is undocumented. NASA ephemerides are retrieved data; previews are application captures. AI assistance does not imply NASA endorsement.

## Before submitting

The AI statement reflects repository evidence; the team must add any unrecorded tools or generated artwork. Confirm the official challenge selection, current eligibility rules, local deadline and public demonstration URL in the event portal. The video/slides link and actual form completion were not verified by this repository audit. A repository audit alone cannot establish award eligibility.
