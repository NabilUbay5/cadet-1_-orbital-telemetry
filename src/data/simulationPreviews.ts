/** Player-facing preview copy shared by the lobby and preview dialogs. */
export type SimulationMode = 'outpost' | 'academy';

export const SIMULATION_PREVIEWS = {
  outpost: {
    title: 'Outpost Ops',
    label: 'MAIN MODE · MOON & MARS',
    summary: 'Command a Moon or Mars habitat for 30 days with NASA/JPL Horizons sunlight.',
    highlights: 'Tactical HUD · active comms · crew & resource forecasts',
    features: [
      'Compact life-support and crew bars, collapsible Sunlight / Power Budget / Mission Log drawers, and angled tactical controls.',
      'Flight Director transmissions with typewriter text, radar/comms pings and synthesized audio. Tap to reveal; global mute is respected.',
      'Bundled Horizons day/night cycles, including about 14 Earth days of lunar night. Allocate crew and forecast power, oxygen, water and food.',
      'Manage shielding, flares, dust storms and breakdowns. Radiation rates and hazard effects are game scenario inputs, not NASA safety limits.',
    ],
    images: [
      { file: 'outpost-moon.png', alt: 'Moon habitat with Determination text, compact life-support bars, tactical orders and Flight Director comms', caption: 'Moon · tactical HUD and comms' },
      { file: 'outpost-mars.png', alt: 'Mars habitat and resource forecasts with collapsed secondary telemetry drawers', caption: 'Mars · crew and resource planning' },
    ],
  },
  academy: {
    title: 'Flight Academy',
    label: '3 FLIGHT STAGES + CERTIFICATION',
    summary: 'Stabilize the gyros, retrieve energy cubes through debris, and align with the satellite relay.',
    highlights: 'Compact mobile directives · starfall · pods for RP',
    features: [
      'Three progressive stages: gyro stabilization, debris-field retrieval and satellite docking/alignment. Pass a three-question certification gate after each.',
      'Portrait and landscape HUD minimization keeps a compact stage and active-directive pill visible; expand the full telemetry when needed.',
      'Pooled camera-relative starfall every 10 active flight seconds. Collect telemetry pods for Research Points and watch bundled Moon/Earth orbital reference replay.',
      'Determination typography, pixelated WebGL, procedural audio and pause/result flight-log export. Starfall respects reduced motion and pauses with flight MET.',
    ],
    images: [
      { file: 'telemetry-hud.png', alt: 'Current Flight Academy HUD with NASA orbital reference panels, lives, research points and a shooting star', caption: 'Flight · NASA reference and starfall' },
      { file: 'academy-mobile-portrait.png', alt: 'Portrait Flight Academy with minimized HUD and persistent stage/directive pill', caption: 'Mobile · compact stage and directive' },
    ],
  },
} as const;
