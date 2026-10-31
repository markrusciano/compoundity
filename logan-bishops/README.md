# The Logan Bishops

A fake Vine post: a 6-second, seamlessly looping, anime-style SVG/JS animation of the King, the Friar and the Bishop
in their Logan Square apartment on Halloween 2026. "Ceremonial Bonk: The Lawsuit Arc".

**Watch it:** open `logan-bishops.html` in any browser (single self-contained file; fonts load from Google Fonts).
Tap the video for sound (all audio is synthesized live with WebAudio).

## Layout
- `logan-bishops.html` built output (do not edit by hand)
- `src/` modules: `core.js` (helpers, clock, stage, camera), `main.js` (boot + render loop), `face.js` (shared anime face kit),
  `char-king.js`, `char-friar.js`, `char-bishop.js` (rigs), `scene.js` (the apartment), `fx.js` (effects and title cards),
  `director.js` (all timing), `ui.js` (Vine chrome), `audio.js` (synthesized sound), `index.html` (dev page, loads the modules)
- `docs/` `PHOTO.md` (reference notes), `STORYBOARD.md` (the beat sheet), `CONTRACT.md` (module APIs), `STYLE.md` (art bible)
- `tools/` `build.cjs` (inline modules into one file), `render.cjs` (deterministic frame renderer and contact sheets),
  `harness.cjs` (test pages with chosen modules), `stub-chars.js` (placeholder rigs for testing)

## Commands
```
node tools/build.cjs                                   # rebuild logan-bishops.html
node tools/render.cjs logan-bishops.html --every 0.25 --sheet --out /tmp/lb   # contact sheet of the loop
node tools/render.cjs logan-bishops.html --full --times 1.05 --out /tmp/lb    # whole page with Vine UI
```
Dev page query flags: `?t=2.5` (freeze at a time), `?debug=1` (timecode), `?rate=0.25` (slow motion), `?stageOnly=1`.

Fan-made parody for friends. Not affiliated with Vine.
