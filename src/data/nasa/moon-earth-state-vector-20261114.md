# NASA/JPL Horizons: Moon relative to Earth

## Retrieval

- Retrieved: 2026-11-14 19:17:08 UTC
- Service: [NASA/JPL Horizons API](https://ssd.jpl.nasa.gov/api/horizons.api)
- API documentation: [Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- Service-reported API version: 1.2
- HTTP status: 200 (`application/json`)
- Original response: [moon-earth-state-vector-20261114.json](./moon-earth-state-vector-20261114.json)
- SHA-256 of the saved response: `f9789ff44d6a3782858a72092defe2e21c88ad2bcd0e9cbd534767f28e1d68b5`
- Filename date: `20261114` is the retrieval date, not an ephemeris date. The three requested ephemeris epochs are 2027-01-01 through 2027-01-03 TDB.

The JSON file is the unmodified response body from the API. Its `result` contains
three sample epochs, including the service's table header and explanatory text.

## API version note

The saved response's `signature.version` is `1.2`, while the currently
accessible [API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html#change_log)
identifies itself as version `1.3` (2025 June). Its change log says version 1.3
updated the documentation to mention the `TIME_TYPE` setting; the version 1.2
entry (2022 September) says it updated the list to include `CAL_TYPE`.

These are different version indicators: the former is returned by this API
response, and the latter labels the current documentation. This query explicitly
sent `TIME_TYPE=TDB`, and the service response accepted it and identified the
start/stop and calendar output as TDB. That confirms this setting for this
request only; it does not establish general compatibility between every
version-1.3 documented feature and a service response labeled 1.2.

## Query

The request was an HTTP GET to `https://ssd.jpl.nasa.gov/api/horizons.api` with
these complete parameters:

| Parameter | Value | Purpose |
| --- | --- | --- |
| `format` | `json` | Return the API response as JSON. |
| `COMMAND` | `301` | Target: Moon. |
| `OBJ_DATA` | `NO` | Omit the separate object-summary section. |
| `MAKE_EPHEM` | `YES` | Generate an ephemeris. |
| `EPHEM_TYPE` | `VECTORS` | Request Cartesian state vectors. |
| `CENTER` | `500@399` | Earth geocenter; the response identifies center body Earth (399). |
| `START_TIME` | `2027-01-01 00:00` | Start epoch. |
| `STOP_TIME` | `2027-01-03 00:00` | Stop epoch, inclusive in the returned table. |
| `STEP_SIZE` | `1 d` | One-day sampling interval. |
| `TIME_TYPE` | `TDB` | Barycentric Dynamical Time for input and output epochs. |
| `REF_SYSTEM` | `ICRF` | International Celestial Reference Frame. |
| `REF_PLANE` | `FRAME` | Use the reference frame plane. |
| `OUT_UNITS` | `KM-S` | Position in kilometers; velocity in kilometers per second. |
| `VEC_TABLE` | `2` | Output position and velocity. |
| `VEC_CORR` | `NONE` | Geometric states; no light-time or stellar-aberration corrections. |
| `CSV_FORMAT` | `YES` | CSV-formatted vector table within the JSON `result` string. |

Complete URL used (URL-encoded):

```text
https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%27301%27&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27VECTORS%27&CENTER=%27500%40399%27&START_TIME=%272027-01-01+00%3a00%27&STOP_TIME=%272027-01-03+00%3a00%27&STEP_SIZE=%271+d%27&TIME_TYPE=%27TDB%27&REF_SYSTEM=%27ICRF%27&REF_PLANE=%27FRAME%27&OUT_UNITS=%27KM-S%27&VEC_TABLE=%272%27&VEC_CORR=%27NONE%27&CSV_FORMAT=%27YES%27
```

## Interpretation limits

The returned position and velocity components describe the Moon's geometric
state relative to Earth's center, expressed in ICRF axes at the listed TDB
epochs. They are not gameplay coordinates and have not been transformed,
interpolated, or used to change mission rules. Any conversion or application to
gameplay should be reviewed separately before changing mission thresholds.

## Offline parser and derived magnitudes

[moonEarthStateVector.ts](./moonEarthStateVector.ts) validates the response
metadata and parses the table when explicitly called; it is not called from
the simulation loop. Its offline fixture tests are in
[moonEarthStateVector.test.ts](./__tests__/moonEarthStateVector.test.ts). TDB
epochs remain text/JD values labeled `TDB`; they are not converted to JavaScript
UTC `Date` objects. Position magnitude and speed are Euclidean norms computed
from the six returned components:

| Epoch (TDB) | Position magnitude (km) | Speed (km/s) |
| --- | ---: | ---: |
| 2027-01-01 00:00:00.0000 | 391495.397292 | 0.999962422 |
| 2027-01-02 00:00:00.0000 | 396090.477288 | 0.989241514 |
| 2027-01-03 00:00:00.0000 | 399838.001881 | 0.981430774 |

These are only derived summaries of the sampled fixture. The daily samples are
not interpolated into precision spacecraft guidance, and this work does not
integrate spacecraft telemetry or change mission thresholds.
