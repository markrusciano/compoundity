# Logan Bishops: build contract

One self-contained HTML page: a fake Vine post whose square video is a 6-second, seamlessly looping, anime-style
SVG animation of the three men in `docs/PHOTO.md`, following `docs/STORYBOARD.md`.
This file is the single source of truth for how modules fit together. If something here conflicts with your instincts, follow this file.

## Files (all in `logan-bishops/src/`, plain ES5-ish browser JS, no build step, no imports)

| file | owner | registers |
|---|---|---|
| `core.js` | done | `window.LB` helpers, clock, stage, camera |
| `main.js` | done | boot + render loop |
| `index.html` | done | page shell, Google Fonts, script order |
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
`Bangers`, `Dela Gothic One` (Japanese display), `M PLUS Rounded 1c` (900), `Pacifico` (Vine wordmark), `Source Sans 3`.
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
breathe      0..1 amount of loop-safe idle breathing (default 0: the photo stillness is the joke)
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
armL, armR   optional { sh, el } shoulder and elbow angle offsets in degrees (named poses are the main interface)
pose         optional named pose preset (character specific; see below) applied before the numeric fields
```

`silhouette` uses `LB.silhouette(root, on, color)` from core (a CSS class that paints every shape one color; mark
highlights/glows with `data-sil="hide"` so they vanish). `hidden: true` hides the whole character (`LB.show(root, false)`).

### Expression vocabulary (`LB.face`, same names for all three; first name = default)
| field | names |
|---|---|
| `eyes` | `deadpan`, `closed`, `dot`, `hero`, `droop` |
| `brows` | `flat`, `up`, `down`, `oneUp`, `sad` |
| `mouth` | `closed`, `o`, `whistle`, `smirk`, `frown` |
| floats | `gazeX`, `gazeY` (-1..1), `sweat` (0..1), `blush` (0..1) |
See `docs/STORYBOARD.md` "Poses and expressions" for what each looks like and which character uses which.
Unknown names must fall back to the default instead of throwing.

### `LB.face` (face kit, owned by face.js, used by all three rigs)
```
LB.style            shared look constants (outline color, line widths, light direction, shadow alpha, palette) - see docs/STYLE.md
LB.face.create(parentG, opts) -> { g, update(state) }
  parentG : the rig's head group. Face-local origin (0,0) = midpoint between the two eyes, +x = viewer's right, units = world units.
  opts    : { eyeSpacing, eyeW, eyeH, irisColor, lashColor, browColor, browW, browY, mouthY, mouthW,
              mustache: bool (mouth shapes sit under/inside the mustache), lids: 'normal'|'heavy',
              skin, skinShadow, sweatAt: {x, y}, cheekY }  (sensible defaults for every key)
  update(state): reads eyes, brows, mouth, gazeX, gazeY, sweat, blush, headTurn from the character state.
```
Facial hair, glasses, hair, ears and head shape belong to each rig, not the face kit.

### Character-specific fields (from the storyboard)
| char | field | type / default | meaning |
|---|---|---|---|
| all | `hidden` | false | hide the whole character |
| all | `pose` | `'photo'` | named pose preset |
| king | `pose` | `'photo'`, `'raise'`, `'bonk'`, `'hide'`, `'peek'` | see STORYBOARD K_* |
| king | `raise` | 0..1 (0) | photo -> raised; at raise 1 the knob is at about (500,222) |
| king | `drop` | 0..1 (0) | used with pose 'bonk': drop 0 == raise 1 exactly; drop 1 = knob resting on the Friar's crown at about (500,258) |
| king | `smear` | 0..1 (0) | two ghost scepters along the drop arc (40% and 20% opacity at smear 1) |
| friar | `headSquash` | 1 | head scaleY about the neck |
| friar | `glasses` | `'clear'` | `'clear'` or `'opaque'` (flat white lenses + small highlight, eyes hidden) |
| friar | `glassesTilt` | 0 | degrees |
| friar | `bump` | 0 | 0..1.1 scale of the cartoon bump on top of the hair (top of bump about y 236 in the photo pose) |
| friar | `stars` | 0 | 0..1 visibility of the 3 orbiting yellow 4-point stars |
| friar | `starSpin` | 0 | orbit phase in turns (director integrates speed) |
| friar | `steeple` | 0 | 0..1 clasped hands rise from the waist to just under the beard (about y 400) |
| bishop | `mitreStretch` | 1 | 1..1.4 mitre scaleY anchored at the headband |
| bishop | `cast` | 0 | 0..1 right arm (screen-left) out of the cape toward the Friar, open hand near (565,370) at 1 |
| bishop | `castGlow` | 0 | 0..1 green (#3CFF6E) glow ring around the hand (pre-baked radial gradient) |
| bishop | `mustacheTwitch` | 0 | 0..1 mustache squash-and-stretch |

### Anchors each rig must return from `anchor(name)` (world coords)
- King: `head`, `knob` (gold scepter knob center), `crown`, `mouth`, `temple`
- Friar: `head`, `bump` (top of the bump / top of hair if no bump), `glasses` (bridge), `lensR` (outer corner of the screen-right lens), `hands`
- Bishop: `head`, `feet` (between the slides, on the floor), `hand` (right hand, screen-left), `mustache`, `mitreTop`

## Scene (`scene.js`)
`LB.register('scene', { create: function (stage) { ... return { update: function (sceneState, t, ctx) {} }; } })`
Paints `stage.layers.bg` (room shell, windows, night city, billboard, arches, lamp, plant) and `stage.layers.mid`
(island, desk, chairs, rug, slippers, floor items) and may use `stage.layers.fg`. Placement requirements are in STORYBOARD "Scene states".
```
sceneState = {
  impact: 0..1,          // flat red #C8161E over the whole room (above bg+mid, below characters)
  panel: null|'villain', // villain panel covering the whole view behind the characters
  panelK: 0..1,          // panel opacity
  bokeh: 0..1,           // shoujo bubbles in the mid layer behind the trio (intensity)
  bokehPop: 0..1,        // 0 = normal; ramps 0->1 over a few frames when the bubbles pop out
  billboardGlow: 1,      // brightness multiplier (0.6 dips, 1.3 boosted)
  archesGlow: 1,         // brightness multiplier (flare up to 2.2)
}
```
Fixed world points (also in `LB.WORLD`): arches (590,225), billboard center (515,195), floor y 950.

## FX (`fx.js`)
`LB.register('fx', { create: function (stage, ctx) { ... return { update: function (fxState, t, ctx) {} }; } })`
World-space effects go in `stage.layers.fxWorld`; screen-space ones in `stage.layers.fxScreen`; text cards in `stage.layers.text`.
Positions `at` are either `{x, y}` world points or anchor refs like `'friar.lensR'`; resolve with `LB.resolveAt(ctx, at)`
and convert to screen with `LB.worldToScreen(stage, p)` when drawing in screen space. The director owns WHEN (all timing);
fx owns HOW (look and the motion inside each effect given its progress). Every field may be absent or null = effect off.
```
fxState = {
  glints:      [{ at, k, rot, size }],     // kira 4-point CONCAVE star (curved arms), world space; k 0..1 envelope (scale*opacity); size world units at k=1 (default 36)
  twinkles:    { k, pop },                 // small shoujo twinkles around the trio (world); k intensity, pop 0..1 burst-out progress
  impactBurst: { k, at },                  // white starburst lines radiating from at (screen space), k 0..1
  speedLines:  { mode, k, seed, at },      // mode 'radial' (centered on at's screen point, default frame center) | 'vertical'; seed int changes on twos
  puff:        { p, at },                  // white cloud of 5 circles; p 0..1 progress (invisible at 0 and 1)
  bishounen:   { k, p, at },               // translucent bubbles + twinkles drifting up from at (world); k intensity, p 0..1 drift progress
  archesFlare: { k },                      // horizontal anamorphic streak (about 400 x 6) at LB.WORLD.arches, world space
  heal:        { p, at },                  // green dots + soft 4-point twinkles falling onto at; p 0..1
  notes:       { p, at },                  // ♪ glyphs rising and swaying from at; p 0..1 across the beat
  gloom:       { k, at },                  // vertical blue-gray hatching + dark gradient over the head at at (world); k 0..1
  focus:       { k, p, box },              // phone focus square: yellow #FFD60A four corner brackets, box [x0,y0,x1,y1] screen; p snap 0..1 (scale 1.25 -> 1)
  flash:       0..1,                       // full-frame white overlay alpha (x0.5 under LB.reducedMotion)
  cards:       [{ id, age, k }],           // text cards: id 'gon'|'arc'|'healer'|'hp'|'stamp'; age = seconds since the card started; k 0..1 opacity
}
```
Card looks, strings, fonts, sizes, placement and entrance motion: STORYBOARD "On-screen text" (fx owns them, driven by `age`).

## Audio (`audio.js`)
`LB.register('audio', { init(ctx), update(t, loops), setMuted(bool), isMuted() })`
- Muted by default. Nothing touches `AudioContext` until `setMuted(false)` is called from a user gesture (the UI's tap handler);
  create/resume the context there (iOS Safari requirement).
- Owns the cue sheet in STORYBOARD "Audio cue sheet". `update` is called every frame: schedule cues whose loop time falls in
  the next ~0.2 s look-ahead window on the AudioContext clock (handle the wrap at `LB.D`); never double-schedule; stop
  scheduling while `LB.clock.paused`. On unmute, start with the cues after the current time.
- Master gain with a gentle limiter (DynamicsCompressor); overall level comfortable on phone speakers. Synthesis only.

## UI (`ui.js`)
`LB.register('ui', { create(appEl) -> stageContainerDiv, update(t, loops, uiHints) })`
- Builds the Vine post around a square video: Vine green header with the cursive "Vine" wordmark (Pacifico), post header
  (avatar, display name, @handle, location line, date), the square stage container (returned; main.js mounts the stage into it),
  loop counter, like / comment / revine / more row with counts, caption with green hashtags. Values: STORYBOARD "Vine post chrome".
- Tap on the video (or the speaker icon) toggles sound via `LB.mod.audio.setMuted()`; show the muted speaker icon on the video.
- Loop counter: starts at 1,000,000,037 and +1 on each wrap (`LB.clock.onLoop`).
- Injects its own `<style>`. Responsive: fills a 360-430 px phone width with no horizontal scroll; centered column (max about 480 px) on desktop.

## Director (`director.js`)
`LB.register('director', { duration: 6, frame: function (t, ctx) { return frameState; } })`
```
frameState = {
  camera: { x, y, zoom, rot, shake },
  scene:  sceneState,
  chars:  { king: charState, friar: charState, bishop: charState },
  fx:     fxState,
  ui:     {}
}
```
Implements every timing in STORYBOARD (camera keyframes table, beat table, FX list times, card times). Character pose and
expression changes step on twos (`LB.onTwos(t)`); camera, glows, sparkles and speed lines are smooth. Frame 0 and frame
6.0 must be identical (see "Loop seam").

## Revision notes (polish round)
After the critique and fix round the source is the reference for exact values; this file describes the original plan.
- Display fonts load as one `text=` subset (see `src/index.html`); every string drawn in them must be in that list.
- World signage (billboard, "Peanut Day" box, the King's tee) is baked to paths by `tools/bake-text.cjs`. The world SVG has no `<text>`.
- `LB.silhouette` is an SVG filter, not a CSS fill override. Character state fields go through a `num(v, d)` NaN guard.
- `audio` exposes `onMutedChange` for the UI. `tools/render.cjs --full` finishes CSS transitions before each screenshot.
