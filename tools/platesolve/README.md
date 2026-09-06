# Zenith plate solve

Astrometric solution for a handheld iPhone zenith exposure taken from
Penn Quarter, Washington DC (Plus code `87C4VXXJ+F6H`). The source JPEG had
its EXIF stripped, so pointing, focal length and time were all recovered
from the star field itself.

## Result

| | |
|---|---|
| Field centre | 22h 15m 28s, +39° 40′ 37″ (Lacerta) |
| Altitude of centre | 89.22° — 0.78° off true vertical |
| Top of frame | azimuth 204° (SSW) |
| Focal length | 2849.9 px = 25.4 mm equivalent (main camera) |
| Field of view | 55.9° × 70.5°, 73.0 arcsec/px |
| Distortion | none required; the JPEG is already rectilinear |
| Fit quality | 0.92 px mean residual over 9 anchor stars |
| Blind validation | 47 of 48 further named stars land on measured sources |
| Local sidereal time | 22h 15m 28s → 04:22 UT, 00:22 EDT on 2026-09-06 |

## Pipeline

| Step | Script |
|---|---|
| Decode the Plus code to lat/lon | `olc.py` |
| Detect point sources (robust local background) | `detect4.py` |
| Blind pair-match solve with analytic focal length | `solver2.py` |
| Least-squares refinement, distortion model comparison | `fit.py` |
| Photometry, sky geometry, galactic plane, star export | `export.py` |
| Project and validate the extended catalogue | `build.py` |
| Assemble constellation figures and the viewer bundle | `assemble.py` |

`stars_src.py` and `figures.py` hold the extended star/DSO coordinates and the
constellation line definitions. Every coordinate is validated by projecting it
through the solution and requiring it to land on a detected source.

Reference positions come from the 108 bright stars bundled with `pyephem`;
planetary positions use JPL DE421 via `skyfield-data`.

## Method

Sources are found as local maxima against a background estimated on a 63 px
grid, with the noise taken from the 16th-to-50th percentile spread so that
dense star fields do not inflate their own detection threshold.

For the blind solve, each pair of bright detections is tested against every
catalogue pair. A pair correspondence fixes the angle the two stars subtend,
and that angle admits exactly one focal length — solved by bisection rather
than searched. Focal length plus two matched directions fixes the full camera
rotation, so every pairing yields a complete hypothesis. Hypotheses are scored
on how many *bright* catalogue stars they place on *bright* detections, which
keeps chance matches near zero, then the winner is refined by Levenberg-style
least squares over rotation, focal length and radial distortion.

Constraining the focal length to real iPhone lens bands matters: without it the
scoring favours implausibly wide fields, because a wider field sweeps in more
catalogue stars and so accumulates more chance matches.

## Viewer

`app.tpl.html` is the viewer template; `assemble.py` and the build step inline
`skydata.json` and the stretched JPEG to produce `zenith-viewer.html` at the
repository root.
