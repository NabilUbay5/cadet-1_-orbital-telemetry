import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';
import { parseMoonEarthStateVectorResponse } from '../moonEarthStateVector.ts';

const fixtureUrl = new URL('../moon-earth-state-vector-20261114.json', import.meta.url);
const provenanceUrl = new URL('../moon-earth-state-vector-20261114.md', import.meta.url);
const fixtureBytes = readFileSync(fixtureUrl);
const fixtureText = fixtureBytes.toString('utf8');
const fixtureResponse = JSON.parse(fixtureText) as { result: string; [key: string]: unknown };

function responseWithResult(result: string): string {
  return JSON.stringify({ ...fixtureResponse, result });
}

function responseWithTableRows(rows: string[]): string {
  const result = fixtureResponse.result.replace(
    /\$\$SOE\s*\r?\n[\s\S]*?\r?\n\$\$EOE/,
    () => `$$SOE\n${rows.join('\n')}\n$$EOE`
  );
  return responseWithResult(result);
}

function originalTableRows(): [string, string, string] {
  const match = fixtureResponse.result.match(/\$\$SOE\s*\r?\n([\s\S]*?)\r?\n\$\$EOE/);
  if (!match) throw new Error('Checked-in Horizons fixture has no vector table.');
  const rows = match[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const [first, second, third] = rows;
  if (rows.length !== 3 || !first || !second || !third) {
    throw new Error('Checked-in Horizons fixture must contain three vector records.');
  }
  return [first, second, third];
}

describe('saved NASA/JPL Horizons Moon-Earth vector fixture', () => {
  test('validates metadata and parses exactly three ordered TDB state vectors', () => {
    const records = parseMoonEarthStateVectorResponse(fixtureText);

    expect(records).toHaveLength(3);
    expect(records.map((record) => record.epoch)).toEqual([
      { julianDay: 2461406.5, calendar: 'A.D. 2027-Jan-01 00:00:00.0000', timeScale: 'TDB' },
      { julianDay: 2461407.5, calendar: 'A.D. 2027-Jan-02 00:00:00.0000', timeScale: 'TDB' },
      { julianDay: 2461408.5, calendar: 'A.D. 2027-Jan-03 00:00:00.0000', timeScale: 'TDB' },
    ]);
    expect(records.every((record) => typeof record.epoch.calendar === 'string')).toBe(true);
    expect(records.every((record) =>
      Number.isFinite(record.positionMagnitudeKm) && Number.isFinite(record.speedKmPerSecond)
    )).toBe(true);
    const expectedMagnitudes = [
      [391495.397292, 0.999962422],
      [396090.477288, 0.989241514],
      [399838.001881, 0.981430774],
    ] as const;
    for (const [index, [positionMagnitudeKm, speedKmPerSecond]] of expectedMagnitudes.entries()) {
      expect(records[index].positionMagnitudeKm).toBeCloseTo(positionMagnitudeKm, 3);
      expect(records[index].speedKmPerSecond).toBeCloseTo(speedKmPerSecond, 6);
    }
  });

  test('rejects API error responses and invalid JSON', () => {
    expect(() => parseMoonEarthStateVectorResponse('not JSON')).toThrow('not valid JSON');
    expect(() => parseMoonEarthStateVectorResponse(JSON.stringify({
      ...fixtureResponse,
      error: 'invalid query',
    }))).toThrow('Horizons returned an error');
  });

  test('rejects missing signature or result metadata', () => {
    expect(() => parseMoonEarthStateVectorResponse(JSON.stringify({
      result: fixtureResponse.result,
    }))).toThrow('API signature metadata');
    expect(() => parseMoonEarthStateVectorResponse(JSON.stringify({
      signature: fixtureResponse.signature,
    }))).toThrow('result text');
  });

  test('rejects metadata that does not identify this target, center, frame, time scale, or units', () => {
    const invalidMetadata = [
      ['Target body name: Moon (301)', 'Target body name: Mars (499)'],
      ['Center body name: Earth (399)', 'Center body name: Mars (499)'],
      ['Reference frame : ICRF', 'Reference frame : B1950'],
      ['Start time      : A.D. 2027-Jan-01 00:00:00.0000 TDB', 'Start time      : A.D. 2027-Jan-01 00:00:00.0000 UTC'],
      ['Output units    : KM-S', 'Output units    : AU-D'],
      ['Output type     : GEOMETRIC cartesian states', 'Output type     : ASTROMETRIC cartesian states'],
      ['Output format   : 2 (position and velocity)', 'Output format   : 1 (position only)'],
      ['Calendar Date (TDB)', 'Calendar Date (UTC)'],
    ] as const;

    for (const [expected, replacement] of invalidMetadata) {
      expect(fixtureResponse.result).toContain(expected);
      expect(() => parseMoonEarthStateVectorResponse(
        responseWithResult(fixtureResponse.result.replace(expected, replacement))
      )).toThrow('missing required metadata');
    }
  });

  test('rejects missing or extra records and missing table markers', () => {
    const rows = originalTableRows();
    expect(() => parseMoonEarthStateVectorResponse(responseWithTableRows(rows.slice(0, 2))))
      .toThrow('exactly 3 vector records');
    expect(() => parseMoonEarthStateVectorResponse(responseWithTableRows([...rows, rows[2]])))
      .toThrow('exactly 3 vector records');
    expect(() => parseMoonEarthStateVectorResponse(
      responseWithResult(fixtureResponse.result.replace('$$EOE', ''))
    )).toThrow('exactly one $$SOE and one $$EOE marker');
  });

  test('rejects malformed, missing, or non-finite vector components', () => {
    const rows = originalTableRows();
    const badNumber = rows.slice();
    badNumber[0] = badNumber[0].replace('-3.558664989671228E+05', 'not-a-number');
    expect(() => parseMoonEarthStateVectorResponse(responseWithTableRows(badNumber)))
      .toThrow('not a valid number');

    const missingComponent = rows.slice();
    missingComponent[0] = missingComponent[0].replace(
      ', -4.120712539120940E-01,',
      ','
    );
    expect(() => parseMoonEarthStateVectorResponse(responseWithTableRows(missingComponent)))
      .toThrow('epoch and six components');

    const infiniteComponent = rows.slice();
    infiniteComponent[0] = infiniteComponent[0].replace(
      '-3.558664989671228E+05',
      '1e999'
    );
    expect(() => parseMoonEarthStateVectorResponse(responseWithTableRows(infiniteComponent)))
      .toThrow('not finite');
  });

  test('rejects duplicate and out-of-order epochs', () => {
    const rows = originalTableRows();
    expect(() => parseMoonEarthStateVectorResponse(
      responseWithTableRows([rows[0], rows[0], rows[2]])
    )).toThrow('must be A.D. 2027-Jan-02');
    expect(() => parseMoonEarthStateVectorResponse(
      responseWithTableRows([rows[1], rows[0], rows[2]])
    )).toThrow('must be A.D. 2027-Jan-01');
  });

  test('the original fixture bytes match the SHA-256 recorded in the provenance note', () => {
    const note = readFileSync(provenanceUrl, 'utf8');
    const recordedHash = note.match(/SHA-256 of the saved response: `([a-f0-9]{64})`/)?.[1];
    if (!recordedHash) throw new Error('Provenance note does not record a SHA-256 checksum.');

    const actualHash = createHash('sha256').update(fixtureBytes).digest('hex');
    expect(actualHash).toBe(recordedHash);
    expect(note).toContain('Filename date: `20261114` is the retrieval date');
  });
});
