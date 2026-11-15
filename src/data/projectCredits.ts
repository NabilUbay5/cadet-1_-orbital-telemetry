/** Shared factual disclosure shown in the app and recorded in README/submission docs. */
export const SI_CATEGORIES = [
  'Coding, Debugging, or Troubleshooting',
  'Writing, Editing, or Translation',
  'Research or Information Gathering',
] as const;

export const AI_DISCLOSURE = 'Claude Code assisted with tests, Outpost Ops, Horizons sunlight ingestion and documentation. OpenAI Codex assisted with debugging, data-source research, documentation, NASA reference replay/export, mobile HUD minimization, Outpost HUD/comms, procedural audio/effects and camera-relative starfall. GitHub Copilot assisted with certification questions, citations and quiz tests. Repository history records Google AI Studio/Gemini scaffolding; its original generation scope is undocumented. NASA ephemerides are retrieved data; previews are application captures.';

export const PROJECT_SOURCES = [
  { title: 'NASA/JPL Horizons System — integrated sunlight and orbital reference', url: 'https://ssd.jpl.nasa.gov/horizons/' },
  { title: 'NASA/JPL Horizons API — reproducible offline snapshots', url: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html' },
  { title: 'Chang’e-4: Zhang et al. (2020), First measurements of the radiation dose on the lunar surface', url: 'https://doi.org/10.1126/sciadv.aaz1334' },
  { title: 'Curiosity RAD: Hassler et al. (2014), Mars’ Surface Radiation Environment Measured with the Mars Science Laboratory’s Curiosity Rover', url: 'https://doi.org/10.1126/science.1244797' },
] as const;

export const SOFTWARE_CREDITS = [
  { title: 'React', url: 'https://react.dev' },
  { title: 'Three.js', url: 'https://threejs.org' },
  { title: 'Vite', url: 'https://vite.dev' },
  { title: 'TypeScript', url: 'https://www.typescriptlang.org' },
  { title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
  { title: 'Bun', url: 'https://bun.sh' },
  { title: 'Determination — anonymous-1438277, CC BY 3.0', url: 'https://fontstruct.com/fontstructions/show/2368299' },
] as const;
