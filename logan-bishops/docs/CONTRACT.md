# Logan Bishops: build contract

One self-contained HTML page: a fake Vine post whose square video is a 6-second, seamlessly looping, anime-style
SVG animation of the three men in `docs/PHOTO.md`, following `docs/STORYBOARD.md`.
This file is the single source of truth for how modules fit together. If something here conflicts with your instincts, follow this file.

## Files (all in `logan-bishops/src/`, plain ES5-ish browser JS, no build step, no imports)

| file | owner | registers |
|---|---|---|
| `core.js` | done (do not edit) | `window.LB` helpers, clock, stage, camera |
| `main.js` | done (do not edit) | boot + render loop |
| `index.html` | done (do not edit, except the integrator) | page shell, Google Fonts, script order |
| `face.js` | face/style lead | `LB.face` shared anime face kit + `LB.style` |
| `char-king.js` | king rigger | `LB.register('king', {create})` |
| `char-friar.js` | friar rigger | `LB.register('friar', {create})` |
| `char-bishop.js` | bishop rigger | `LB.register('bishop', {create})` |
| `scene.js` | scene painter | `LB.register('scene', {create})` |
| `fx.js` | fx artist | `LB.register('fx', {create})` |
| `audio.js` | sound designer | `LB.register('audio', {init, update, setMuted, isMuted})` |
| `ui.js` | Vine UI designer | `LB.register('ui', {create, update})` |
| `director.js` | director | `LB.register('director', {duration, frame, init?})` |

Each file is an IIFE: `(function () { 'use strict'; var LB = window.LB; ... })();`
Only touch your own file. Put scratch harness pages and renders in your own scratch folder (given in your prompt), never in `src/`.
Every element id or gradient/filter id you create must come from `LB.uid('prefix')` (several modules share a document).
No external assets besides the Google Fonts already linked in `index.html`:
`Bangers`, `Dela Gothic One` (Japanese display), `M PLUS Rounded 1c` (500-900), `Mochiy Pop One`, `Pacifico` (Vine wordmark), `Source Sans 3`.
No bitmaps, no `<image>`, no `<foreignObject>`. Performance: target 60fps on a phone; avoid SVG filters that re-run every
frame over the whole stage (blur on small elements is OK; prefer pre-baked gradients and opacity).

## Core helpers you should use (see `src/core.js`)
`LB.el(tag, attrs, parent)`, `LB.g`, `LB.path(parent, d, attrs)`, `LB.attr`, `LB.uid`, `LB.defs(svg)`, `LB.tf({x,y,rot,sx,sy,s,ox,oy})`,
`LB.show(node, bool)`, `LB.opacity(node, k)`, `LB.clamp/lerp/invLerp/remap/smoothstep`, `LB.lerpColor/shade`,
`LB.ease.*` (linear, step, inOutCubic, outBack, outElastic, snap, ...), `LB.track([[t, value, ease], ...])` keyframes
(numbers, '#hex' colors and objects interpolate; strings hold), `LB.env(t, a, b, fadeIn, fadeOut)`, `LB.prog(t, a, b)`,
`LB.loopSin(t, cycles, phase)` (loop-safe: integer cycles per loop), `LB.noise1`, `LB.shake`, `LB.rng(seed)` for static randomness,
`LB.D` (loop duration seconds), `LB.clock` (`t`, `loops`, `seek`, `pause`, `play`, `onLoop`).

**Determinism rule:** every visual must be a pure function of the state passed in (including `t`). No internal timers,
no accumulated physics, no `Math.random()` at render time. Periodic idle motion must use `LB.loopSin` with integer cycles so the
loop seam is invisible. This lets QA seek to any time and get the same frame.

## Stage, world and camera
- `LB.mountStage(container)` makes two stacked square SVGs, each `viewBox="0 0 1000 1000"`:
  - **world** svg: `stage.camera` group (camera transform) containing layers in this order:
    `stage.layers.bg` (room, window, city), `stage.layers.mid` (furniture behind people), `stage.layers.chars`,
    `stage.layers.fg` (anything in front of people), `stage.layers.fxWorld` (world-space fx: sparkles around heads, glints).
  - **overlay** svg (on top, not affected by camera or world filters): `stage.layers.fxScreen` (speed lines, impact flashes,
    title cards, letterbox, vignette) then `stage.layers.text` (on-screen text cards).
- Camera (director output `camera`): `{ x, y, zoom, rot, shake, shakeFreq, filter }`. `(x, y)` is the world point shown at
  frame center; default `{x:500, y:500, zoom:1}` = the WIDE SHOT matching the photo composition. `shake` is an amplitude in
  world px (deterministic noise). `filter` is a CSS filter string applied to the world svg only (e.g. `'invert(1)'`, `'grayscale(1) contrast(3)'`) for impact frames.
- The world must be painted well beyond the wide shot: the scene covers at least x -700..1700, y -700..1700 so pans,
  zoom-outs down to 0.75, dutch tilts up to 15 degrees and shakes never reveal empty space.
- **Floor line: y = 950.** Feet of all three stand on it in the wide shot.

## Characters
`LB.register('king' | 'friar' | 'bishop', { create: function (layer, stage) { ... return instance; } })`

`instance = { root, update(state), anchor(name) }`
- `root`: the character's top-level `<g>`, appended to `layer` (= `stage.layers.chars`). main.js creates them back to front: bishop, friar, king
  (the King's scepter crosses IN FRONT of the Friar).
- `update(state)`: called every frame with a COMPLETE-ish state object. Missing fields fall back to the character's neutral
  defaults (the photo pose). Must be cheap: set attributes/transforms and toggle visibility of prebuilt parts; never rebuild DOM per frame.
- `anchor(name)`: returns `{x, y}` in WORLD coordinates for the last state passed to update (use `LB.worldPoint(stage, node, px, py)`
  on an invisible marker element, or compute it). Unknown names return the head center.

### Neutral layout (wide shot) - riggers MUST hit these within about 12 world units
Anime proportions: about 5.7 to 6.3 heads tall; head (hair top to chin) about 115 units tall; cel-shaded.

| | King | Friar | Bishop |
|---|---|---|---|
| feet origin `(x, 950)` | x = 300 | x = 500 | x = 718 |
| hair top y | 300 | 262 | 205 |
| chin y | 415 | 377 | 323 |
| eye line y | about 362 | about 322 | about 265 |
| tallest point | crown top about y 255 | hair top 262 | **mitre top about y 80** |
| silhouette width | cape about 175..430 | robe about 405..600 (broadest shoulders) | cape about 590..850 |
| neutral head tilt | +8 deg (toward Friar) | -2 deg, chin up | -5 deg (toward Friar), chin down |

King scepter in neutral: knob at about (462, 470) in front of the Friar's upper chest (just under his beard), shaft running
straight down-left through the King's hand at about (331, 660) to the tip on the floor at about (130, 952).

### Common state fields (all characters)
```
t            seconds into the loop (always present)
x, y         feet origin in world coords (defaults = neutral layout)
scale        uniform scale about the feet origin (default 1)
rot          whole-body rotation in degrees about the feet origin
sx, sy       squash/stretch about the feet origin (default 1, 1); anime bounce = sx 1.06, sy 0.94
lean         upper-body lean in degrees, pivot at hips
bob          upper-body vertical offset in units (negative = up)
breathe      0..1 amount of loop-safe idle breathing (default 0.5)
headTilt     degrees (overrides neutral tilt when present)
headTurn     -1..1 three-quarter turn of the face (features shift sideways, hair parallax); 0 = facing camera
eyes         expression name (see expression vocabulary)
gazeX, gazeY -1..1 pupil offset inside the eye
brows        expression name
mouth        expression name
blush        0..1 anime blush hatching on cheeks
sweat        0..1 single big sweat drop on the temple
tears        0..1 anime waterfall tears (optional; fine to implement as streams)
shadowFace   0..1 dramatic upper-face shadow (the "menacing" anime look: dark band over eyes, glowing eye whites)
glow         0..1 rim-light / aura around the silhouette
silhouette   0..1 fill the whole character with one flat color (for impact frames); color in silhouetteColor
silhouetteColor  '#000' default
armL, armR   { sh, el } shoulder and elbow angles in degrees, relative to the neutral pose (0,0 = photo pose)
pose         optional named pose preset (character specific; see below) applied before the numeric fields
```

### Expression vocabulary (shared via `LB.face`, same names for all three)
Filled in from the final storyboard, see section "Expressions required by the storyboard" below.

## Scene, fx, audio, ui, director
See the sections below; each lists its state fields. Director output per frame:
```
{
  camera: {...},
  scene:  {...},          // scene state, see Scene
  chars:  { king: {...}, friar: {...}, bishop: {...} },
  fx:     {...},          // fx state, see FX
  ui:     {...}           // optional hints for the Vine chrome (rarely needed)
}
```
