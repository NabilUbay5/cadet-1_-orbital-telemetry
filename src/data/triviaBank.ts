/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TriviaSource {
  title: string;
  url: string;
}

export interface TriviaQuestion {
  id: string;
  stage: 1 | 2 | 3;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  source: TriviaSource;
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

const NASA_GRAVITY: TriviaSource = {
  title: 'NASA Space Place: What Is Gravity?',
  url: 'https://spaceplace.nasa.gov/what-is-gravity/en/',
};
const NASA_MOON: TriviaSource = {
  title: 'NASA Science: Moon Facts',
  url: 'https://science.nasa.gov/moon/facts/',
};
const NASA_TIDAL_LOCKING: TriviaSource = {
  title: 'NASA Science: Tidal Locking',
  url: 'https://science.nasa.gov/moon/tidal-locking/',
};
const NASA_MARS: TriviaSource = {
  title: 'NASA Science: Mars Facts',
  url: 'https://science.nasa.gov/mars/facts/',
};
const NASA_JUPITER: TriviaSource = {
  title: 'NASA Science: Jupiter Facts',
  url: 'https://science.nasa.gov/jupiter/jupiter-facts/',
};
const NASA_EARTH: TriviaSource = {
  title: 'NASA Science: Earth',
  url: 'https://science.nasa.gov/earth/facts/',
};
const NASA_SUN: TriviaSource = {
  title: 'NASA Science: Our Sun: Facts',
  url: 'https://science.nasa.gov/sun/facts/',
};

export const TRIVIA_QUESTIONS: Record<1 | 2 | 3, TriviaQuestion[]> = {
  1: [
    {
      id: 'q1-gravity-orbit',
      stage: 1,
      question: 'WHAT FORCE KEEPS THE PLANETS IN ORBIT AROUND THE SUN?',
      options: ['MAGNETISM', 'GRAVITY', 'SOLAR WIND', 'STATIC ELECTRICITY'],
      correctIndex: 1,
      explanation: 'The Sun’s gravity keeps the planets in orbit around it.',
      source: NASA_GRAVITY,
    },
    {
      id: 'q1-moon-gravity',
      stage: 1,
      question: 'ABOUT HOW STRONG IS SURFACE GRAVITY ON THE MOON COMPARED WITH EARTH?',
      options: ['ABOUT THE SAME', 'ABOUT ONE-SIXTH', 'ABOUT TWICE AS STRONG', 'ZERO'],
      correctIndex: 1,
      explanation: 'The Moon’s surface gravity is about one-sixth of Earth’s.',
      source: NASA_MOON,
    },
    {
      id: 'q1-moon-tidal-lock',
      stage: 1,
      question: 'WHY DOES THE SAME SIDE OF THE MOON GENERALLY FACE EARTH?',
      options: [
        'THE MOON DOES NOT ROTATE',
        'ITS ROTATION AND ORBIT PERIODS MATCH',
        'EARTH’S CLOUDS HIDE THE OTHER SIDE',
        'THE SUN PULLS ONLY ONE SIDE',
      ],
      correctIndex: 1,
      explanation: 'The Moon rotates once in the same time it takes to orbit Earth, a state called synchronous tidal locking.',
      source: NASA_TIDAL_LOCKING,
    },
    {
      id: 'q1-moon-atmosphere',
      stage: 1,
      question: 'WHAT KIND OF ATMOSPHERE DOES THE MOON HAVE?',
      options: ['A THICK, BREATHABLE ATMOSPHERE', 'A VERY THIN EXOSPHERE', 'NO SURFACE AT ALL', 'A HYDROGEN-OXYGEN ATMOSPHERE'],
      correctIndex: 1,
      explanation: 'The Moon has a very thin, tenuous exosphere that is not breathable.',
      source: NASA_MOON,
    },
    {
      id: 'q1-moon-phases',
      stage: 1,
      question: 'WHAT CAUSES THE MOON’S PHASES AS SEEN FROM EARTH?',
      options: [
        'EARTH’S SHADOW COVERS THE MOON EVERY NIGHT',
        'WE SEE DIFFERENT AMOUNTS OF ITS SUNLIT SIDE AS IT ORBITS',
        'THE MOON MAKES ITS OWN LIGHT',
        'CLOUDS CHANGE THE MOON’S SHAPE',
      ],
      correctIndex: 1,
      explanation: 'As the Moon orbits Earth, we see changing portions of its sunlit hemisphere.',
      source: NASA_MOON,
    },
  ],
  2: [
    {
      id: 'q2-mars-sol',
      stage: 2,
      question: 'ABOUT HOW LONG IS ONE MARTIAN SOL?',
      options: ['12 HOURS', '24.6 HOURS', '7 EARTH DAYS', '365 EARTH DAYS'],
      correctIndex: 1,
      explanation: 'A Martian solar day, called a sol, lasts about 24.6 hours.',
      source: NASA_MARS,
    },
    {
      id: 'q2-mars-color',
      stage: 2,
      question: 'WHY DOES MARS LOOK RED?',
      options: [
        'ITS IRON-RICH SURFACE MATERIAL HAS RUSTED',
        'ITS OCEANS REFLECT RED LIGHT',
        'ITS CLOUDS ARE MADE OF FIRE',
        'THE SUN LIGHTS IT WITH A RED BEAM',
      ],
      correctIndex: 0,
      explanation: 'Iron minerals in Martian rocks, soil, and dust oxidize, or rust, giving Mars its reddish appearance.',
      source: NASA_MARS,
    },
    {
      id: 'q2-mars-moons',
      stage: 2,
      question: 'HOW MANY NATURAL MOONS DOES MARS HAVE?',
      options: ['NONE', 'ONE', 'TWO', 'FOUR'],
      correctIndex: 2,
      explanation: 'Mars has two small moons: Phobos and Deimos.',
      source: NASA_MARS,
    },
    {
      id: 'q2-mars-atmosphere',
      stage: 2,
      question: 'HOW DOES NASA DESCRIBE THE MARTIAN ATMOSPHERE?',
      options: ['VERY THIN', 'THICKER THAN VENUS’ ATMOSPHERE', 'BREATHABLE', 'ABSENT'],
      correctIndex: 0,
      explanation: 'Mars has a very thin atmosphere; it is not an Earth-like breathable atmosphere.',
      source: NASA_MARS,
    },
    {
      id: 'q2-olympus-mons',
      stage: 2,
      question: 'WHICH PLANETARY VOLCANO IS THE LARGEST IN THE SOLAR SYSTEM?',
      options: ['MAUNA KEA', 'OLYMPUS MONS', 'MOUNT EVEREST', 'MARS’ Valles Marineris'],
      correctIndex: 1,
      explanation: 'Olympus Mons on Mars is the largest volcano in the solar system.',
      source: NASA_MARS,
    },
  ],
  3: [
    {
      id: 'q3-jupiter-largest',
      stage: 3,
      question: 'WHICH PLANET IS THE LARGEST IN OUR SOLAR SYSTEM?',
      options: ['SATURN', 'JUPITER', 'NEPTUNE', 'MARS'],
      correctIndex: 1,
      explanation: 'Jupiter is the largest planet in our solar system.',
      source: NASA_JUPITER,
    },
    {
      id: 'q3-sun-light-time',
      stage: 3,
      question: 'ABOUT HOW LONG DOES SUNLIGHT TAKE TO REACH EARTH?',
      options: ['8 SECONDS', '8.35 MINUTES', '8 HOURS', 'INSTANTLY'],
      correctIndex: 1,
      explanation: 'NASA lists the one-way light time from the Sun to Earth as about 8.35 minutes.',
      source: NASA_EARTH,
    },
    {
      id: 'q3-sun-gravity',
      stage: 3,
      question: 'WHAT DOES THE SUN’S GRAVITY DO IN OUR SOLAR SYSTEM?',
      options: [
        'IT HOLDS THE SOLAR SYSTEM TOGETHER',
        'IT STOPS PLANETS FROM ROTATING',
        'IT PUSHES PLANETS AWAY IN STRAIGHT LINES',
        'IT ONLY AFFECTS EARTH',
      ],
      correctIndex: 0,
      explanation: 'The Sun’s gravity holds the solar system together and keeps objects in orbit around it.',
      source: NASA_SUN,
    },
    {
      id: 'q3-earth-year',
      stage: 3,
      question: 'ABOUT HOW LONG DOES EARTH TAKE TO ORBIT THE SUN ONCE?',
      options: ['24 HOURS', '30 DAYS', '365.25 DAYS', '12 YEARS'],
      correctIndex: 2,
      explanation: 'One Earth year is about 365.25 days.',
      source: NASA_EARTH,
    },
    {
      id: 'q3-jupiter-day',
      stage: 3,
      question: 'ABOUT HOW LONG IS ONE DAY ON JUPITER?',
      options: ['9.9 HOURS', '24 HOURS', '7 EARTH DAYS', '12 EARTH YEARS'],
      correctIndex: 0,
      explanation: 'Jupiter rotates once in about 9.9 hours, the shortest day of any planet in the solar system.',
      source: NASA_JUPITER,
    },
  ],
};
