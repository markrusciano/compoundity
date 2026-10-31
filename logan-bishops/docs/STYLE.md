# Logan Bishops: style bible (character art)

Owner: lead character designer. Code: `src/face.js` (`LB.style`, `LB.face`). Style reference rig: `src/char-king.js`.
If this file and CONTRACT.md disagree, CONTRACT.md wins on API; this file wins on look.

## 1. Target look
Modern TV anime (think a clean seasonal comedy, not chibi, not moe): adult men, handsome but comedic, flat cel color
with exactly ONE hard-edged shadow tone per material, crisp warm-black ink, small almond eyes with a bold tapered upper
lash line and a modest iris, simple mouths. The deadpan stare from the photo is the default face and the face we see
most: a straight heavy upper lid cutting across the top third of the iris. Recognizability comes from the costume
silhouettes and the facial hair, not from realistic rendering.

### Reference renders (match these)
All rendered from `src/char-king.js` + `src/face.js` with stand-in Friar/Bishop and a stand-in room.
- Wide photo pose, seam frame (sweat 1), camera (500,500) z1: `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead/final/t00.00.png`
- Face ECU, deadpan, z3.4: `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead/final/t02.25.png`
- Face ECU, k_oops (dot / up / o under a mustache): `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead/final/t02.50.png`
- Face ECU, k_whistle in K_PEEK (gaze up-left, whistle, sweat): `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead/final/t02.75.png`
- Face ECU, k_solemn at raise 1: `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead/final/t03.00.png`
- Push camera, raise 1 / smear / bonk oops / impact silhouette: `.../final/t00.75.png`, `.../final/t01.00.png`, `.../final/t01.25.png`, `.../final/t01.50.png`
- Dead-air close-up (500,340) z3, K_HIDE: `.../final/t01.75.png`; two-shot (612,330) z1.8, K_PEEK: `.../final/t02.00.png`
- Torso detail z2.6 (jacket, tee, hands, trim): `.../final/t04.50.png`
- Face kit expression grid (every eyes / brows / mouth value, gaze extremes, sweat, blush, heavy lids): `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead/r_face3/t00.00.png`
(`...` = `/tmp/claude-0/-home-user-compoundity/880bcda0-2b03-5361-99df-72fbe50dae48/scratchpad/build/lead`)

## 2. Ink (outlines), world units
| constant | value | use |
|---|---|---|
| `LB.style.line` | `#2A1B16` warm near-black | every outline, lash lines, mouth lines |
| `LB.style.lineSoft` | `#6A4333` | soft skin lines: lip shadow, finger separations, nostril |
| `LB.style.lineCloth` | `#3A2620` | seams and fold lines on fabric (or use the material's seam color) |
| `LB.style.lw.outer` | 2.4 | outer silhouette of a part: head, cape, robe, limbs, hat |
| `LB.style.lw.inner` | 1.7 | overlapping inner contours: jacket panels, sleeves, hands, trims, beard edge |
| `LB.style.lw.detail` | 1.1 | seams, ear inner line, pocket edges, strand lines |
| `LB.style.lw.fine` | 0.75 | smallest ticks (stitching, knit). Never go below 0.7: thinner lines shimmer at z1 |
- Always `stroke-linejoin: round`, `stroke-linecap: round` (use `LB.face.ol(width, color)`).
- Facial features are FILLED tapered shapes, not strokes (`LB.face.taperD`): lash line about 3.3 thick at the King's
  eye size, brows about 3.6, mouth line 1.5, all tapering to points. This is what keeps them crisp from z1 to z3.4.
- Gold, jewels and small props keep the same ink color (`#2A1B16`); a darker gold line (`goldLine`) is only for engraving.
- Black items (King's socks, scepter shaft, Friar's tee) still get the ink outline plus one lighter rim/highlight so they read.

## 3. Light and shading
- Key light = the globe lamp, upper-left. `LB.style.light = {x:-0.6, y:-0.8}`, `LB.style.shadowDir = {x:0.6, y:0.8}`.
  Shadows sit on the lower-right of every form: right cheek and jaw, under the chin onto the neck, right side of each
  limb (`LB.face.tubeShadeD` picks the side automatically), right panel of capes, under hat brims and crown bands.
- ONE shadow tone per material (tables below), hard edged, no gradients on characters. Clip shadows to the part with
  `LB.face.cel` (it builds base + clipped shadow + optional clipped highlight + outline).
- Highlights only on shiny or soft-sheen materials (velvet sheen, satin streaks, gold, glasses, eyes, sweat, hair shine).
  Every highlight gets `data-sil="hide"` so it disappears in the impact silhouette.
- Cast shadows that sell the costume: a skinShadow band under the crown/mitre band on the forehead (draw it into
  `head.face.inner`, the clipped face group), a hair-shadow ribbon where hair meets a hat band, the jaw shadow on the neck
  (built into `LB.face.head`).

## 4. Palettes (`LB.style.palette.king|friar|bishop`, refined from PHOTO.md)
King: skin `#F2C9AE`/`#DBA185`, lip `#D98C84`; hair and mustache `#6B4A33`/`#46301F`, shine `#94704F`; iris `#7A5536`;
brow `#4A3122`; cape velvet `#B3141C`/`#6E0A10`, sheen `#D8262C`, lining `#8E0E16`/`#5E070D`; ermine `#F4F1EA`/`#CFC6B8`,
spots `#141414`; crown velvet `#A0121A`/`#650A10`; gold `#E3B23C`/`#A8781E`, hi `#FFF1B0`; jewels blue `#2C5BD0`,
green `#14936A`, red `#D3263A`; jacket `#B9A07A`/`#8C7551`; tee `#6B4A36`/`#4B3223`, print `#E9A35A`; jeans `#2B3448`/`#1A2030`,
fade `#36415B`, cuff `#4A5878`, selvedge `#EDE7DA`; socks `#232328`/`#101013`; shaft `#141414`; knob `#E8B530`/`#A8781E`.

Friar: skin `#F2C9AE`/`#DBA185`; hair and beard `#5A4030`/`#3B291E`, shine `#7E5E48`; iris `#5D7486`; brow `#3F2C21`;
robe `#C9A27E`/`#9E7656`, mottling `#DDBB97`; black tee `#1C1C1F`/`#0C0C0E`; lens `#EAF3F8` (opaque state) with `#FFFFFF`
glint; rimless frame bits `#B8BCC2`; socks `#8C8C8C`/`#696969`.

Bishop: skin `#F2C7AC`/`#DA9F84`; hair and mustache ginger-brown `#8A4E2E`/`#5E321B`, shine `#B07148`; iris `#5A86A6`;
brow `#6E3C22`; mitre `#F3EEDC`/`#CFC4A6`, mitre gold `#D4A84A`/`#9E7728`; satin `#C8161E`/`#7A0A10`, satin streak
`#F2666C`; stole `#D9B25B`/`#A7823A`; collar `#F7F5EE`/`#D2CDC0`; pants `#3A3B40`/`#25262A`; wool socks `#8C8C8C`/`#686868`,
knit lines `#A8A8A8`; slides navy `#23304A`/`#141C2D`.

## 5. Materials
- **Velvet (King cape, crown cap):** deep saturated base, very dark shadow tone, long vertical fold shadows drawn as
  tapered shapes (`taperD(points, [0, .8w, w, .6w, 0])`, w 6 to 10) in the shadow color inside the part's clip, plus 1 or 2
  soft sheen streaks in the lighter `capeSheen` on the lit (left) crest of a fold. No fold outlines.
- **Satin (Bishop cape):** brighter red, hard shadow shapes that follow big diagonal drapes, and sharp narrow highlight
  streaks (`satinHi`) with pointed ends running along the fold crests: more and sharper highlights than velvet. That
  contrast (velvet soft, satin shiny) is how the two red capes read as different cloth.
- **Matte cotton / poly (Friar robe, jacket, tee):** no highlights at all. Shadow on the right side and in a few long
  folds; the Friar's robe adds a sparse mottling of `robeMottle` blotches (one path, seeded with `LB.rng`).
- **Wool (Bishop socks):** base + shadow + 4 to 8 short knit ticks (`lw.fine`) in `sockKnit`; a ribbed cuff band.
- **Denim (King jeans):** indigo base, shadow on the right of each leg, one lighter fade streak on the thigh, knee and
  ankle wrinkle ticks in the shadow color, rolled cuffs in lighter `cuff` with a selvedge line and dashed stitching.
- **Fur (ermine):** strip in `ermine` with a shadow band on the side away from the light and seeded spot blobs, all spots
  in ONE path. Taper the strip ends (the King's collar) so they read as tucked fur, not cut ribbon.
- **Gold (crown, knob, mitre trim, stole):** base, shadow on the lower-right, a thin pale highlight stripe or an ellipse
  specular (`data-sil="hide"`), ink outline 1.0 to 1.4. Engraving in `goldLine` at 0.8.
- **Skin:** `skin` + `skinShadow` only. No blush unless the `blush` field asks for it.

## 6. Faces (`LB.face`)
Build order inside the rig's head group (face-local coordinates, origin = midpoint between the eyes):
1. hair back mass (behind the face) 2. `var hd = LB.face.head(headG, opts)` (neck, ears, face base, cel shadow, outline)
3. extra skin shading into `hd.face.inner` (hat band shadow) 4. a `feat` group holding `LB.face.create(feat, {..., faceClip: hd.clipId})`
and the facial hair (so a chin-up/down offset moves features and mustache together) 5. front hair locks 6. hats, glasses.

King values to copy proportions from: head `w 88, top -60, chin 53, jawY 31, jaw 0.6, chinW 22`; face
`eyeSpacing 38, eyeW 21.5, eyeH 11, browY -12.5, mouthY 35, mouthW 15, noseY 19.5, cheekY 15, sweatAt {48,-24}`.
Head = 115 units hair top to chin, eye line 62 below the hair top. Keep the other two within that family:
- Friar: slightly wider and rounder face (w 90 to 92, jaw 0.65, chinW 24), `mustache: false`; the short full beard is a
  rig shape drawn after the face kit: a cel shape hugging the jaw from ear to ear with a slightly jagged lower edge
  (5 to 7 shallow points), a moustache bridge connecting to it, and a mouth gap so `closed`/`smirk`/`frown` read through
  it (mouthY about 33). Glasses (rimless rectangles) go on top of everything; `opaque` = flat `lens` fill + one glint.
- Bishop: longer face (w 84, jaw 0.5, chin 55), `lids: 'heavy'` for the smolder, `mustache: true` with a BIG ginger
  mustache (about 1.3x the King's width, fuller, tips curling slightly down), mouth fully hidden in `closed`.
- Expressions are shared names; unknown names fall back to the default. `mustache: true` drops `o` and `whistle` lower so
  they read below the mustache. The rig draws the mustache AFTER the face kit so it covers the mouth line.
- `sweatAt` is the screen-right temple by default; keep it on the side the camera sees in that character's shots.
- `shadowFace` needs `faceClip`; `blush` is hatching plus a soft pink ellipse.
- `LB.face.layers` gives you the eyes/brows/mouth groups if you must reorder (for example glasses between eyes and brows).

## 7. Hair
- Back mass: one closed shape slightly outside the skull (3 to 5 units), drawn before the head, with a hairShadow
  wedge on the right side and the outline.
- Front locks: `LB.face.lockD(base0, base1, tip, bend)` pointed locks, 2 to 4 of them, merged into ONE fill path and ONE
  outline path. Tips point in the comb direction (King: side-swept toward screen-right), and stop 8+ units above the brows.
- One hairShadow ribbon where hair meets a hat, one `hairShine` taper streak (`data-sil="hide"`), 1 or 2 strand lines in
  hairShadow at `lw.fine` to `0.8`.
- Facial hair uses the same recipe: base, one shadow on the lower part and the right side, 3 to 6 short strand ticks.

## 8. Hands
Simplified but clean: a rounded mitten or fist shape (22 to 28 units), thumb as its own small shape or line, 2 or 3 finger
separations in `lineSoft` at 0.85, skin shadow on the right/lower side, outline at `lw.inner`. Rings are a short light
gray stroke with `data-sil="hide"`. A hand gripping a prop is built in the prop's local frame so it rotates with it
(King: fist in the scepter frame, scaled 1.18). Sleeves end with a cuff line; connect a hand to a sleeve with a short
skin wrist tube drawn before the hand.

## 9. Detail level for close-ups (z3 to z3.4 on faces, z3.4 on feet)
Must exist and stay crisp: catchlight, lid shade band under the lash, lid crease, lower-lid tick, nose wedge, lip shadow,
mustache strand ticks, ear inner line, hair strand lines, fabric seams near the face (collar, neckline). Must NOT exist:
hairline gaps between fills (overlap neighbouring fills 1 to 2 units under the ink), visible seams at joints (use
`LB.face.limb` two-pass outlines), strokes under 0.7, raster-looking noise. At z1 the head is about 46 px tall on a phone,
so every expression must read by the lash line and mouth silhouette alone.

## 10. Rig conventions (follow `src/char-king.js`)
- Groups: `root` (transform from x, y, rot, scale, sx, sy about the feet origin) > `leanBack` (things behind the legs)
  > `legs` (never leaned) > `leanFront` (torso, arms, head). `leanBack` and `leanFront` share one matrix: lean about the
  hip pivot plus `bob` (and loop-safe `breathe`). Head group = `translate(neck) rotate(headTilt) translate(0, -50)`.
- Compute every transform as a 2D matrix in JS (`matrix(a b c d e f)`), and compute anchors from the SAME matrices
  (`ap(chain(...), point)`). Do not use `getCTM` for anchors: it breaks when the character is hidden.
- `update(s)`: read the pose preset first, then let explicit numeric fields override it (`s.lean`, `s.headTilt`, ...).
  Missing fields = photo pose. Cache the last written string per attribute and only touch the DOM when it changes.
  Build all geometry in `create`; per frame only set `transform`, `d` of a few moving parts, and `display`.
- No internal time or accumulated state: everything is a pure function of `s` (and `s.t` for loop-safe idle). Stepping
  on twos is the director's job; rigs must not quantize.
- Moving limbs: 2-bone IK with fixed lengths, elbow side chosen once (`bend` sign), drawn with `LB.face.limb`.
- Something that must pass under one part and over another (King's upper arm under the cape drape, forearm over it):
  draw the part over the limb as a clipped `<use>` clone of the panel (see the drape). Clones do not get the silhouette
  CSS, so hide them while `silhouette` is on.
- Ids only from `LB.uid()`. Everything else (`clipPath`s) can live inside the rig's own groups.

## 11. Silhouette and hidden
- `LB.silhouette(root, s.silhouette > 0.5, s.silhouetteColor || '#000')` every frame.
- Mark highlights, glints, catchlights, rings, sweat highlights, smear ghosts with `data-sil="hide"`.
- The silhouette must still read: crown cross, raised scepter, mitre point, the Friar's bump. Avoid thin gaps in the
  silhouette that would let the red impact background cut a character in two.
- `hidden: true` -> `LB.show(root, false)` and return early; anchors keep returning the last pose.

## 12. Element budget
Stay under about 350 SVG elements per character (King: 342 including the 80-element face kit). Tricks: `cel({flat: true})`,
put same-color shapes in one path (all ermine spots, all fleurs, all buttons), merge fill+stroke when nothing is drawn in
between, one path per fold set, `inner` groups are only created when used.

## 13. Do / don't
Do:
- Keep the deadpan as the resting face; let poses and props carry the comedy.
- Keep props and costume identifiers big and readable at z1 (crown, mitre, scepter knob, glasses, mustaches, socks).
- Overlap shapes generously under the ink; let the outline define the edge.
- Test every pose at its storyboard camera and at z3.4, and in silhouette.
Don't:
- No gradients, filters or blur on characters (the only gradients allowed are pre-baked glows like `castGlow`).
- No giant moe eyes, no blush or sparkles unless the state asks for them, no outlines on fold shadows.
- No per-frame DOM creation, no `Math.random()`, no `getCTM` anchors, no hard-coded ids.
- No em dashes in any text you add.

## 14. Kit API quick reference (`src/face.js`)
- `LB.face.create(parentG, opts) -> { g, update(state), layers, opts }` (opts and state documented in the source).
- `LB.face.head(parent, opts) -> { g, faceD, clipId, face (cel), neck, earL, earR, P }`.
- `LB.face.cel(parent, {d, fill, shadow, shadowD, hi, hiD, lw, line, noLine, flat}) -> { g, base, shadow, hi, outline, clip, clipId, inner, setD }`.
- `LB.face.limb(parent, {fill, shadow, lw, line}) -> { set(A, B, C, wA, wB, wC) }` two-segment limb with seamless outline.
- Path builders: `crD(points, closed)`, `crSeg`, `crSample`, `taperD(points, widths)`, `ribbonD(points, w|fn, f0, f1)`,
  `tubeD(A, B, wA, wB, f0, f1, caps)`, `tubeShadeD(A, B, wA, wB)`, `lockD(b0, b1, tip, bend)`.
- Attribute helpers: `ol(width, color, extra)` outline-only, `fl(color, extra)` fill-only. Formatting: `pt`, `n2`.
- Name lists: `LB.face.EYES`, `LB.face.BROWS`, `LB.face.MOUTHS`.
