/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TdbEpoch {
  julianDay: number;
  calendar: string;
  timeScale: 'TDB';
}

export interface CartesianVector {
  x: number;
  y: number;
  z: number;
}

export interface MoonEarthStateVector {
  epoch: TdbEpoch;
  positionKm: CartesianVector;
  velocityKmPerSecond: CartesianVector;
  positionMagnitudeKm: number;
  speedKmPerSecond: number;
}

const EXPECTED_EPOCHS = [
  { julianDay: 2461406.5, calendar: 'A.D. 2027-Jan-01 00:00:00.0000' },
  { julianDay: 2461407.5, calendar: 'A.D. 2027-Jan-02 00:00:00.0000' },
  { julianDay: 2461408.5, calendar: 'A.D. 2027-Jan-03 00:00:00.0000' },
] as const;

function assertMetadata(result: string): void {
  const requiredLines = [
    /^Target body name:\s*Moon \(301\)\s/m,
    /^Center body name:\s*Earth \(399\)\s/m,
    /^Start time\s*:.*\bTDB\s*$/m,
    /^Stop\s+time\s*:.*\bTDB\s*$/m,
    /^Output units\s*:\s*KM-S\s*$/m,
    /^Output type\s*:\s*GEOMETRIC cartesian states\s*$/m,
    /^Output format\s*:\s*2 \(position and velocity\)\s*$/m,
    /^Reference frame\s*:\s*ICRF\s*$/m,
    /^\s*JDTDB,\s*Calendar Date \(TDB\),\s*X,\s*Y,\s*Z,\s*VX,\s*VY,\s*VZ,\s*$/m,
  ];

  for (const requiredLine of requiredLines) {
    if (!requiredLine.test(result)) {
      throw new Error(`Horizons response is missing required metadata matching ${requiredLine}.`);
    }
  }
}

function parseFiniteNumber(value: string, label: string): number {
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/.test(trimmed)) {
    throw new Error(`Horizons vector ${label} is not a valid number: "${value}".`);
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Horizons vector ${label} is not finite.`);
  }
  return parsed;
}

function parseRecord(line: string, index: number): MoonEarthStateVector {
  const cells = line.trim().replace(/,$/, '').split(',');
  if (cells.length !== 8) {
    throw new Error(`Horizons vector record ${index + 1} must contain an epoch and six components.`);
  }

  const julianDay = parseFiniteNumber(cells[0], `record ${index + 1} epoch`);
  const calendar = cells[1].trim();
  const expectedEpoch = EXPECTED_EPOCHS[index];
  if (julianDay !== expectedEpoch.julianDay || calendar !== expectedEpoch.calendar) {
    throw new Error(
      `Horizons vector record ${index + 1} must be ${expectedEpoch.calendar} TDB (JD ${expectedEpoch.julianDay}); received "${calendar}" (JD ${julianDay}).`
    );
  }

  const components = cells.slice(2).map((cell, componentIndex) =>
    parseFiniteNumber(cell, `record ${index + 1} component ${componentIndex + 1}`)
  );
  const [x, y, z, vx, vy, vz] = components;
  const positionMagnitudeKm = Math.hypot(x, y, z);
  const speedKmPerSecond = Math.hypot(vx, vy, vz);

  return {
    epoch: { julianDay, calendar, timeScale: 'TDB' },
    positionKm: { x, y, z },
    velocityKmPerSecond: { x: vx, y: vy, z: vz },
    positionMagnitudeKm,
    speedKmPerSecond,
  };
}

/** Parses the saved Horizons response for offline analysis, not simulation guidance. */
export function parseMoonEarthStateVectorResponse(rawJson: string): MoonEarthStateVector[] {
  let response: unknown;
  try {
    response = JSON.parse(rawJson);
  } catch (error) {
    throw new Error('Horizons response is not valid JSON.', { cause: error });
  }

  if (typeof response !== 'object' || response === null || Array.isArray(response)) {
    throw new Error('Horizons response must be a JSON object.');
  }
  const envelope = response as Record<string, unknown>;
  if ('error' in envelope) {
    throw new Error(`Horizons returned an error: ${String(envelope.error)}`);
  }

  const signature = envelope.signature;
  if (
    typeof signature !== 'object' ||
    signature === null ||
    !('source' in signature) ||
    signature.source !== 'NASA/JPL Horizons API' ||
    !('version' in signature) ||
    typeof signature.version !== 'string' ||
    signature.version.length === 0
  ) {
    throw new Error('Horizons response is missing its API signature metadata.');
  }
  if (typeof envelope.result !== 'string') {
    throw new Error('Horizons response is missing its result text.');
  }

  const result = envelope.result;
  assertMetadata(result);
  if ((result.match(/\$\$SOE/g) ?? []).length !== 1 || (result.match(/\$\$EOE/g) ?? []).length !== 1) {
    throw new Error('Horizons response must contain exactly one $$SOE and one $$EOE marker.');
  }
  const match = result.match(/\$\$SOE\s*\r?\n([\s\S]*?)\r?\n\$\$EOE/);
  if (!match) throw new Error('Horizons response has malformed vector table markers.');

  const lines = match[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== EXPECTED_EPOCHS.length) {
    throw new Error(`Horizons response must contain exactly ${EXPECTED_EPOCHS.length} vector records.`);
  }

  return lines.map(parseRecord);
}
