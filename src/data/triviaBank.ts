/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TriviaQuestion {
  id: string;
  stage: 1 | 2 | 3;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface StageBadge {
  id: string;
  stage: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

export const STAGE_BADGES: Record<1 | 2 | 3, StageBadge> = {
  1: {
    id: 'badge-gravity',
    stage: 1,
    title: 'GRAVITY & VECTOR SPECIALIST',
    subtitle: 'STAGE 1 CERTIFIED',
    description: 'Stabilized flight attitude against gravitational turbulence and calibrated orbital gyros.',
    color: '#00F0FF',
  },
  2: {
    id: 'badge-orbital',
    stage: 2,
    title: 'ORBITAL ENTRY AVIATOR',
    subtitle: 'STAGE 2 CERTIFIED',
    description: 'Harvested vital orbital energy cores while navigating hazardous atmospheric debris.',
    color: '#FFB000',
  },
  3: {
    id: 'badge-deepspace',
    stage: 3,
    title: 'DEEP SPACE NAVIGATOR',
    subtitle: 'STAGE 3 CERTIFIED',
    description: 'Aligned deep-space telemetry relay coordinates and mastered long-range orbital vectors.',
    color: '#00FF66',
  },
};

export const TRIVIA_QUESTIONS: Record<1 | 2 | 3, TriviaQuestion[]> = {
  // Stage 1: Ground School & Gravity Basics
  1: [
    {
      id: 'q1-1',
      stage: 1,
      question: 'WHAT FORCE KEEPS PLANETS AND SPACECRAFT IN ORBIT AROUND THE SUN?',
      options: ['MAGNETISM', 'GRAVITY', 'SOLAR WIND', 'STATIC ELECTRICITY'],
      correctIndex: 1,
      explanation: 'Gravity is the universal invisible force that pulls objects toward one another.',
    },
    {
      id: 'q1-2',
      stage: 1,
      question: 'WHY DO ASTRONAUTS FLOAT INSIDE AN ORBITING SPACE STATION?',
      options: [
        'THERE IS ZERO GRAVITY IN SPACE',
        'THEY ARE IN CONTINUOUS FREE-FALL',
        'THE CABIN HAS ANTI-GRAVITY TILES',
        'MAGNETIC REPELLERS FLOAT THEM',
      ],
      correctIndex: 1,
      explanation: 'Astronauts in orbit are constantly falling around Earth at orbital speed (free-fall)!',
    },
    {
      id: 'q1-3',
      stage: 1,
      question: 'COMPARED TO EARTH, HOW STRONG IS GRAVITY ON THE MOON?',
      options: ['EQUAL TO EARTH', 'ABOUT 1/6TH AS STRONG', 'TWICE AS STRONG', 'ZERO GRAVITY'],
      correctIndex: 1,
      explanation: "The Moon has less mass than Earth, giving it about 1/6th of Earth's gravity.",
    },
  ],

  // Stage 2: Atmosphere & Orbital Entry
  2: [
    {
      id: 'q2-1',
      stage: 2,
      question: 'WHAT IS THE GENERALLY ACCEPTED BOUNDARY WHERE SPACE BEGINS (100 KM UP)?',
      options: ['THE OZONE LAYER', 'THE STRATOSPHERE', 'THE KARMAN LINE', 'THE ASTEROID BELT'],
      correctIndex: 2,
      explanation: 'The Kármán Line at 100 km (62 miles) altitude marks the official edge of outer space.',
    },
    {
      id: 'q2-2',
      stage: 2,
      question: 'WHY DO SPACECRAFT GLOW RED-HOT DURING ATMOSPHERIC RE-ENTRY?',
      options: [
        'EXTREME AIR COMPRESSION & FRICTION',
        'ROCKET ENGINES ARE FIRING',
        'SOLAR RADIATION OVERHEAT',
        'LASER COMMUNICATIONS',
      ],
      correctIndex: 0,
      explanation: 'Hyper-velocity travel rapidly compresses air molecules ahead of the heat shield.',
    },
    {
      id: 'q2-3',
      stage: 2,
      question: 'WHAT SHIELD PROTECTS ORBITING ASTRONAUTS FROM HARMFUL SOLAR RADIATION?',
      options: [
        "EARTH'S MAGNETIC FIELD (MAGNETOSPHERE)",
        'SOLAR PANELS',
        'THE MOON SHADOW',
        'COSMIC MIRRORS',
      ],
      correctIndex: 0,
      explanation: "Earth's magnetosphere deflects dangerous high-energy solar and cosmic particles.",
    },
  ],

  // Stage 3: Deep Space Navigation
  3: [
    {
      id: 'q3-1',
      stage: 3,
      question: 'WHAT IS THE LARGEST PLANET IN OUR SOLAR SYSTEM?',
      options: ['SATURN', 'JUPITER', 'NEPTUNE', 'MARS'],
      correctIndex: 1,
      explanation: 'Jupiter is more than twice as massive as all other planets combined!',
    },
    {
      id: 'q3-2',
      stage: 3,
      question: 'HOW LONG DOES LIGHT/RADIO SIGNALS FROM THE SUN TAKE TO REACH EARTH?',
      options: ['8 SECONDS', '8 MINUTES', '8 HOURS', 'INSTANTLY'],
      correctIndex: 1,
      explanation: 'Traveling at 300,000 km/s, light takes roughly 8 minutes and 20 seconds from the Sun.',
    },
    {
      id: 'q3-3',
      stage: 3,
      question: 'WHAT DOES SATELLITE TELEMETRY DATA TRANSMIT TO MISSION CONTROL?',
      options: [
        'SPACECRAFT HEALTH, POSITION & SENSORS',
        'RADIO POP MUSIC',
        'WEATHER ON MARS ONLY',
        'COMPUTER GAMES',
      ],
      correctIndex: 0,
      explanation: 'Telemetry transmits vital real-time sensor measurements, voltage, velocity, and trajectory.',
    },
  ],
};
