/* Logan Bishops: fx.js (fx artist).
 * Anime effects and on-screen text cards. API: docs/CONTRACT.md "FX". Looks: docs/STORYBOARD.md "FX list" and "On-screen text".
 * The director owns WHEN (every k, p, age); this file owns HOW. Every visual is a pure function of (fxState, t):
 * all DOM is built once in create(), update() only sets attributes, transforms, opacity and display.
 * Layers: world fx -> stage.layers.fxWorld (moves with the camera), screen fx -> stage.layers.fxScreen,
 * text cards -> stage.layers.text (overlay svg, viewBox 0..1000, sizes are % of frame height x 10). */
(function () {
  'use strict';
  var LB = window.LB;
  var PI = Math.PI, TAU = PI * 2;

  // Japanese cards: Dela Gothic One (one weight, 400). The texts ask for weight 900 with font-synthesis off (JP_HEAVY), so
  // Dela is used as is while a system fallback picks its heaviest cut (Hiragino W8/W9, Yu Gothic Bold, Noto Black).
  var FONT_JP = "'Dela Gothic One', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans CJK JP', 'Noto Sans JP', sans-serif";
  var JP_HEAVY = { 'font-family': FONT_JP, 'font-weight': 900, style: 'font-synthesis:none' };
  var FONT_BANG = "'Bangers', Impact, 'Arial Black', sans-serif";
  var FONT_ROUND = "'M PLUS Rounded 1c', 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
  var GREEN = '#3CFF6E', YELLOW = '#FFD60A', INK = '#111111';

  // Ask the browser for the exact glyph subsets the cards use (CJK fonts are split by unicode-range and would
  // otherwise only download the first time a card shows). Runs before main.js waits on document.fonts.ready.
  (function preloadCardGlyphs() {
    try {
      if (!document.fonts || !document.fonts.load) return;
      var swallow = function () {};
      document.fonts.load('400 100px "Dela Gothic One"', 'ゴン!!訴訟編却下').catch(swallow);
      document.fonts.load('400 100px "Bangers"', 'THE LAWSUIT ARC CASE DISMISSED').catch(swallow);
      document.fonts.load('900 100px "M PLUS Rounded 1c"', 'CLASS: HEALER +999 HP').catch(swallow);
    } catch (e) { /* fonts API missing: cards fall back to system fonts */ }
  })();

  // ------------------------------------------------------------------ small helpers
  function n2(v) { return Math.round(v * 100) / 100; }
  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function vis(node, on) {
    on = !!on;
    if (node.__lbOn !== on) { node.__lbOn = on; node.style.display = on ? '' : 'none'; }
    return on;
  }
  function setOp(node, k) {
    var v = n2(c01(k));
    if (node.__lbOp !== v) { node.__lbOp = v; node.setAttribute('opacity', v); }
  }
  function tf(node, x, y, rot, sx, sy) {
    var s = 'translate(' + n2(x) + ' ' + n2(y) + ')';
    if (rot) s += ' rotate(' + n2(rot) + ')';
    if (sx != null && (sx !== 1 || (sy != null && sy !== 1))) s += ' scale(' + LB.r4(sx) + ' ' + LB.r4(sy != null ? sy : sx) + ')';
    node.setAttribute('transform', s);
  }
  function url(id) { return 'url(#' + id + ')'; }
  function grad(defs, kind, stops, attrs) {
    var id = LB.uid('fxg');
    var a = { id: id };
    for (var key in attrs || {}) a[key] = attrs[key];
    var g = LB.el(kind, a, defs);
    stops.forEach(function (s) {
      LB.el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g);
    });
    return id;
  }
  // 4-point CONCAVE star (curved inward arms). R = vertical arm, H = horizontal arm, q = fullness (0.04 needle kira, 0.35 soft twinkle)
  function starD(R, H, q) {
    var a = R * q, b = H * q;
    return 'M0 ' + n2(-R) +
      'C0 ' + n2(-a) + ' ' + n2(b) + ' 0 ' + n2(H) + ' 0' +
      'C' + n2(b) + ' 0 0 ' + n2(a) + ' 0 ' + n2(R) +
      'C0 ' + n2(a) + ' ' + n2(-b) + ' 0 ' + n2(-H) + ' 0' +
      'C' + n2(-b) + ' 0 0 ' + n2(-a) + ' 0 ' + n2(-R) + 'Z';
  }
  // circle as a clockwise subpath (so several can share one path element)
  function circD(x, y, r) {
    if (r <= 0.01) return '';
    return 'M' + n2(x - r) + ' ' + n2(y) + 'a' + n2(r) + ' ' + n2(r) + ' 0 1 1 ' + n2(2 * r) + ' 0a' + n2(r) + ' ' + n2(r) + ' 0 1 1 ' + n2(-2 * r) + ' 0Z';
  }
  function at2world(ctx, at, fallback) {
    if (!at) return fallback || { x: 500, y: 500 };
    var p = LB.resolveAt(ctx, at);
    return p && isFinite(p.x) && isFinite(p.y) ? p : (fallback || { x: 500, y: 500 });
  }
  function at2screen(stage, ctx, at, fallback) {
    if (!at) return fallback || { x: 500, y: 500 };
    return LB.worldToScreen(stage, at2world(ctx, at));
  }
  function twos(t) { return Math.floor(t * 12 + 1e-6); }
  function jit(seed, amp) { return (LB.hash(seed) - 0.5) * 2 * amp; }
  function textEl(parent, str, a) {
    var o = { 'text-anchor': 'middle', text: str };
    for (var key in a) o[key] = a[key];
    return LB.el('text', o, parent);
  }

  // ======================================================================= create
  LB.register('fx', {
    create: function (stage, ctx) {
      var W = stage.layers.fxWorld, S = stage.layers.fxScreen, T = stage.layers.text;
      var dW = stage.defsWorld, dS = stage.defsOverlay;
      var RM = !!LB.reducedMotion;
      var fx = {};

      // z-order inside fxWorld (back to front)
      var gTwinkles = LB.g(W, { class: 'fx-twinkles' });
      var gBishounen = LB.g(W, { class: 'fx-bishounen' });
      var gArches = LB.g(W, { class: 'fx-arches' });
      var gGloom = LB.g(W, { class: 'fx-gloom' });
      var gHeal = LB.g(W, { class: 'fx-heal' });
      var gPuff = LB.g(W, { class: 'fx-puff' });
      var gNotes = LB.g(W, { class: 'fx-notes' });
      var gGlints = LB.g(W, { class: 'fx-glints' });
      // z-order inside fxScreen
      var gSpeed = LB.g(S, { class: 'fx-speed' });
      var gBurst = LB.g(S, { class: 'fx-burst' });
      var gFocus = LB.g(S, { class: 'fx-focus' });
      var gFlash = LB.g(S, { class: 'fx-flash' });
      [gTwinkles, gBishounen, gArches, gGloom, gHeal, gPuff, gNotes, gGlints, gSpeed, gBurst, gFocus, gFlash]
        .forEach(function (g) { g.setAttribute('pointer-events', 'none'); vis(g, false); });
      T.setAttribute('pointer-events', 'none');

      // ------------------------------------------------------------ glints (kira star, world)
      (function () {
        var halo = grad(dW, 'radialGradient', [[0, '#FFFFFF', 1], [0.16, '#FFFBEA', 0.95], [0.42, '#FFE08A', 0.42], [0.75, '#FFC94D', 0.1], [1, '#FFC23A', 0]]);
        var pool = [];
        for (var i = 0; i < 4; i++) {
          var g = LB.g(gGlints);
          LB.el('circle', { r: 64, fill: url(halo) }, g);
          // short diagonal secondary sparkle, then the main long-armed concave star with a thin gold rim
          LB.path(g, starD(52, 52, 0.04), { fill: '#FFFFFF', stroke: '#F1C24E', 'stroke-width': 4, 'paint-order': 'stroke', opacity: 0.85, transform: 'rotate(45)' });
          LB.path(g, starD(100, 80, 0.05), { fill: '#FFFFFF', stroke: '#E2A92A', 'stroke-width': 6.5, 'stroke-linejoin': 'round', 'paint-order': 'stroke' });
          LB.el('circle', { r: 15, fill: '#FFFFFF' }, g);
          vis(g, false);
          pool.push(g);
        }
        fx.glints = function (list, t) {
          var any = false;
          list = Array.isArray(list) ? list : (list ? [list] : []);
          for (var i = 0; i < pool.length; i++) {
            var gl = list[i], g = pool[i];
            var k = gl ? Math.max(0, num(gl.k, 0)) : 0;
            if (!vis(g, k > 0.002)) continue;
            any = true;
            var p = at2world(ctx, gl.at);
            var s = k * num(gl.size, 36) / 100;
            tf(g, p.x, p.y, num(gl.rot, 0), s);
            setOp(g, k * 1.8);
          }
          vis(gGlints, any);
        };
      })();

      // ------------------------------------------------------------ twinkles (shoujo, pink-gold, around the trio, world)
      (function () {
        var gPink = grad(dW, 'radialGradient', [[0, '#FFFFFF'], [0.16, '#FFE8F4'], [0.5, '#FF8DC7'], [1, '#FF4FA3']]);
        var gGold = grad(dW, 'radialGradient', [[0, '#FFFFFF'], [0.16, '#FFF7D6'], [0.5, '#FFD55C'], [1, '#F2A600']]);
        // hand-placed around the three silhouettes, never over a face (world units)
        var spots = [
          [166, 296, 40, 'p'], [124, 458, 22, 'g'], [226, 200, 26, 'g'], [404, 236, 28, 'p'], [386, 320, 15, 'g'],
          [452, 168, 18, 'g'], [604, 148, 34, 'g'], [632, 50, 18, 'p'], [846, 146, 38, 'p'], [876, 292, 22, 'g'],
          [806, 38, 17, 'g'], [178, 600, 20, 'p'], [882, 470, 27, 'g'], [612, 522, 16, 'p'],
        ];
        var items = spots.map(function (s, i) {
          var g = LB.g(gTwinkles);
          var ring = LB.el('circle', { r: 1, fill: 'none', stroke: s[3] === 'p' ? '#FFB6DA' : '#FFE08A', 'stroke-width': 0.16 }, g);
          var star = LB.path(g, starD(1, 0.78, 0.12), { fill: url(s[3] === 'p' ? gPink : gGold), stroke: s[3] === 'p' ? '#C7357F' : '#B97A06', 'stroke-width': 0.09, 'stroke-linejoin': 'round', 'paint-order': 'stroke' });
          return { g: g, ring: ring, star: star, x: s[0], y: s[1], size: s[2],
            d: (i * 0.37) % 1 * 0.6, f: 1.6 + LB.hash(i + 3) * 1.4, ph: LB.hash(i + 11), r0: (LB.hash(i + 21) - 0.5) * 30 };
        });
        fx.twinkles = function (st, t) {
          var k = st ? c01(num(st.k, 0)) : 0, pop = st ? c01(num(st.pop, 0)) : 0;
          if (!vis(gTwinkles, k > 0.002 && pop < 0.999)) return;
          items.forEach(function (it) {
            var a = LB.smoothstep(it.d, it.d + 0.4, k);
            if (!vis(it.g, a > 0.002)) return;
            var pulse = 0.72 + 0.28 * Math.sin(TAU * (t * it.f + it.ph));
            var s = it.size * a * pulse * (1 + 0.7 * pop);
            var rot = it.r0 + 18 * Math.sin(TAU * (t * 0.6 + it.ph));
            tf(it.g, it.x, it.y, rot);
            it.star.setAttribute('transform', 'scale(' + n2(s) + ')');
            setOp(it.star, 1 - LB.smoothstep(0, 0.55, pop));
            if (vis(it.ring, pop > 0.001)) {
              var rr = it.size * a * (0.35 + 1.25 * LB.ease.outCubic(pop));
              it.ring.setAttribute('r', n2(rr));
              it.ring.setAttribute('stroke-width', n2(Math.max(0.6, it.size * 0.16 * (1 - pop))));
              setOp(it.ring, Math.sin(PI * pop) * 0.6);
            }
          });
        };
      })();

      // ------------------------------------------------------------ impact burst (red impact frame)
      // The white rays sit BEHIND the characters (a group appended to stage.layers.mid, i.e. after the scene's red impact
      // fill, which scene.create made before fx.create), so the three silhouettes stay solid black shapes on the red and
      // white burst. They live in world space but are counter-scaled by the camera zoom, so they keep their screen size.
      // Only the small jagged contact star stays on top, in fxScreen.
      var gBurstBack = LB.g(stage.layers.mid, { class: 'fx-burst-back', 'pointer-events': 'none' });
      vis(gBurstBack, false);
      (function () {
        var rnd = LB.rng(1102);
        var d = '', N = 44;
        for (var i = 0; i < N; i++) {
          var ang = (i + (rnd() - 0.5) * 0.7) / N * TAU;
          var r0 = 120 + rnd() * 190 + (i % 5 === 0 ? -60 : 0);
          var r1 = 1700, hw = 0.006 + rnd() * 0.02;
          d += 'M' + n2(Math.cos(ang) * r0) + ' ' + n2(Math.sin(ang) * r0) +
            'L' + n2(Math.cos(ang - hw) * r1) + ' ' + n2(Math.sin(ang - hw) * r1) +
            'L' + n2(Math.cos(ang + hw) * r1) + ' ' + n2(Math.sin(ang + hw) * r1) + 'Z';
        }
        var spin = LB.g(gBurstBack);
        LB.path(spin, d, { fill: '#FFFFFF' });
        var star = LB.g(gBurst);
        // jagged white contact flash with an ink rim
        var jag = '', M = 14;
        for (var j = 0; j < M * 2; j++) {
          var a2 = j / (M * 2) * TAU, r = j % 2 ? 26 + rnd() * 10 : 58 + rnd() * 34;
          jag += (j ? 'L' : 'M') + n2(Math.cos(a2) * r) + ' ' + n2(Math.sin(a2) * r);
        }
        LB.path(star, jag + 'Z', { fill: '#FFFFFF', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round', 'paint-order': 'stroke' });
        fx.impactBurst = function (st, t) {
          var k = st ? c01(num(st.k, 0)) : 0;
          vis(gBurstBack, k > 0.002);
          if (!vis(gBurst, k > 0.002)) return;
          var w = at2world(ctx, st.at, { x: 500, y: 500 }), p = LB.worldToScreen(stage, w);
          var cam = stage.cam || { zoom: 1, rot: 0 }, z = num(cam.zoom, 1) || 1;
          var f = twos(t), sp = 'rotate(' + n2(jit(f * 1.7 + 4, 6)) + ') scale(' + n2(0.92 + 0.16 * LB.hash(f + 9)) + ')';
          tf(gBurst, p.x, p.y, 0);
          star.setAttribute('transform', sp);
          gBurstBack.setAttribute('transform', 'translate(' + n2(w.x) + ' ' + n2(w.y) + ') rotate(' + n2(-num(cam.rot, 0)) + ') scale(' + LB.r4(1 / z) + ')');
          spin.setAttribute('transform', sp);
          setOp(gBurst, k);
          setOp(gBurstBack, k);
        };
      })();

      // ------------------------------------------------------------ speed lines (screen space, regenerated per seed = on twos)
      (function () {
        var gRad = LB.g(gSpeed), gVer = LB.g(gSpeed);
        var radDark = LB.path(gRad, '', { fill: INK, opacity: 0.88 });
        var radLight = LB.path(gRad, '', { fill: '#FFFFFF', opacity: 0.92 });
        var verDark = LB.path(gVer, '', { fill: INK, opacity: 0.8 });
        var verLight = LB.path(gVer, '', { fill: '#FFFFFF', opacity: 0.9 });
        var lastKey = null;
        function radial(seed) {
          var rnd = LB.rng(seed * 7919 + 17), dk = '', lt = '', N = 72;
          for (var i = 0; i < N; i++) {
            var ang = (i + rnd() * 0.9) / N * TAU;
            var r0 = 250 + rnd() * 230, r1 = 1500, hw = 0.004 + rnd() * 0.014;
            var s = 'M' + n2(Math.cos(ang) * r0) + ' ' + n2(Math.sin(ang) * r0) +
              'L' + n2(Math.cos(ang - hw) * r1) + ' ' + n2(Math.sin(ang - hw) * r1) +
              'L' + n2(Math.cos(ang + hw) * r1) + ' ' + n2(Math.sin(ang + hw) * r1) + 'Z';
            if (rnd() < 0.62) dk += s; else lt += s;
          }
          radDark.setAttribute('d', dk); radLight.setAttribute('d', lt);
        }
        function vertical(seed) {
          var rnd = LB.rng(seed * 104729 + 5), dk = '', lt = '', N = 46;
          for (var i = 0; i < N; i++) {
            // denser toward the frame edges, sparse over the subject in the middle
            var u = rnd(), x = u < 0.5 ? Math.pow(u * 2, 1.6) * 430 : 1000 - Math.pow((1 - u) * 2, 1.6) * 430;
            if (rnd() < 0.18) x = 300 + rnd() * 400;
            var len = 260 + rnd() * 700, y0 = -150 + rnd() * (1150 - len * 0.5), w = 2 + rnd() * 6.5;
            var s = 'M' + n2(x) + ' ' + n2(y0) + 'Q' + n2(x + w) + ' ' + n2(y0 + len / 2) + ' ' + n2(x) + ' ' + n2(y0 + len) +
              'Q' + n2(x - w) + ' ' + n2(y0 + len / 2) + ' ' + n2(x) + ' ' + n2(y0) + 'Z';
            if (rnd() < 0.55) dk += s; else lt += s;
          }
          verDark.setAttribute('d', dk); verLight.setAttribute('d', lt);
        }
        fx.speedLines = function (st) {
          var k = st ? c01(num(st.k, 0)) : 0;
          if (!vis(gSpeed, k > 0.002)) return;
          var mode = st.mode === 'vertical' ? 'vertical' : 'radial';
          var seed = Math.round(num(st.seed, 1));
          var key = mode + seed;
          if (key !== lastKey) { lastKey = key; if (mode === 'radial') radial(seed); else vertical(seed); }
          vis(gRad, mode === 'radial'); vis(gVer, mode === 'vertical');
          if (mode === 'radial') {
            var p = st.at ? at2screen(stage, ctx, st.at) : { x: 500, y: 500 };
            tf(gRad, p.x, p.y, 0);
          }
          setOp(gSpeed, k * (RM ? 0.5 : 1));
        };
      })();

      // ------------------------------------------------------------ puff (white cloud of 5 circles, world)
      (function () {
        var outline = LB.path(gPuff, '', { fill: '#2A2A33' });
        var shade = LB.path(gPuff, '', { fill: '#C9D2E6' });
        var white = LB.path(gPuff, '', { fill: '#FFFFFF' });
        var lobes = [];
        for (var i = 0; i < 5; i++) lobes.push({ a: -PI / 2 + i / 5 * TAU + (LB.hash(i + 40) - 0.5) * 0.5, r: 0.75 + LB.hash(i + 50) * 0.4 });
        var specks = [[-0.9, -1.25, 0.2], [1.25, -0.8, 0.16], [1.05, 0.95, 0.13], [-1.3, 0.6, 0.15]];
        var R = 18; // lobe radius (world) at full size; the 5 overlapping lobes span about 70 units
        fx.puff = function (st) {
          var p = st ? num(st.p, 0) : 0;
          if (!vis(gPuff, p > 0.001 && p < 0.999)) return;
          var at = at2world(ctx, st.at);
          var grow = LB.ease.outBack(c01(p / 0.3));
          var fade = 1 - LB.ease.inCubic(c01((p - 0.35) / 0.65));
          var spread = 4 + 11 * LB.ease.outCubic(c01(p / 0.6));
          var pO = '', pS = '', pW = '';
          lobes.forEach(function (l) {
            var r = R * l.r * grow * (0.35 + 0.65 * fade);
            var x = Math.cos(l.a) * spread, y = Math.sin(l.a) * spread * 0.82;
            pO += circD(x, y, r + 2.6);
            pS += circD(x, y, r);
            pW += circD(x - r * 0.12, y - r * 0.16, r * 0.86);
          });
          specks.forEach(function (s) {
            var m = (spread + 12) / 22, r = R * s[2] * 2 * fade * c01(p / 0.2);
            pO += circD(s[0] * 22 * m, s[1] * 22 * m, r + 2); pW += circD(s[0] * 22 * m, s[1] * 22 * m, r);
          });
          outline.setAttribute('d', pO); shade.setAttribute('d', pS); white.setAttribute('d', pW);
          tf(gPuff, at.x, at.y, 0);
          setOp(gPuff, c01(fade * 1.4));
        };
      })();

      // ------------------------------------------------------------ bishounen bubbles (world, drifting up from at)
      (function () {
        var bPink = grad(dW, 'radialGradient', [[0, '#FFFFFF', 0.04], [0.62, '#FFF0F8', 0.1], [0.84, '#FFB8DD', 0.42], [0.95, '#FFFFFF', 0.95], [1, '#FFFFFF', 0]]);
        var bBlue = grad(dW, 'radialGradient', [[0, '#FFFFFF', 0.04], [0.62, '#F0FAFF', 0.1], [0.84, '#B8E4FF', 0.42], [0.95, '#FFFFFF', 0.95], [1, '#FFFFFF', 0]]);
        var tw = grad(dW, 'radialGradient', [[0, '#FFFFFF'], [0.3, '#FFF0F8'], [1, '#FF8CC6']]);
        var rnd = LB.rng(342);
        var bubbles = [], sparkles = [];
        for (var i = 0; i < 16; i++) {
          var side = i % 2 ? 1 : -1;
          var dx = side * (30 + rnd() * 130), dy = -175 + rnd() * 225;
          var g = LB.g(gBishounen);
          LB.el('circle', { r: 1, fill: url(i % 3 ? bPink : bBlue) }, g);
          LB.el('ellipse', { cx: -0.38, cy: -0.42, rx: 0.2, ry: 0.11, fill: '#FFFFFF', opacity: 0.9, transform: 'rotate(-38 -0.38 -0.42)' }, g);
          // o: how far along its rise a bubble already is at the hard cut, so the shot opens full of bubbles
          bubbles.push({ g: g, dx: dx, dy: dy, r: 7 + rnd() * 17, rise: 70 + rnd() * 130, o: rnd() * 0.45, ph: rnd(), sw: 4 + rnd() * 8 });
        }
        for (var j = 0; j < 8; j++) {
          var sg = LB.path(gBishounen, starD(1, 0.8, 0.12), { fill: url(tw), stroke: '#D9478F', 'stroke-width': 0.08, 'paint-order': 'stroke' });
          sparkles.push({ g: sg, dx: (j % 2 ? 1 : -1) * (36 + rnd() * 120), dy: -165 + rnd() * 200, s: 9 + rnd() * 9, o: rnd() * 0.5, f: 2 + rnd() * 2, ph: rnd() });
        }
        fx.bishounen = function (st, t) {
          var k = st ? c01(num(st.k, 0)) : 0;
          if (!vis(gBishounen, k > 0.002)) return;
          var p = c01(num(st.p, 0)), at = at2world(ctx, st.at, { x: 718, y: 950 });
          bubbles.forEach(function (b) {
            var q = b.o + p * (1 - b.o);
            var a = LB.smoothstep(0, 0.1, p + b.o) * (1 - LB.smoothstep(0.85, 1, q));
            if (!vis(b.g, a > 0.002)) return;
            var x = at.x + b.dx + b.sw * Math.sin(TAU * (q * 1.3 + b.ph)), y = at.y + b.dy - b.rise * q;
            tf(b.g, x, y, 0, b.r * (0.6 + 0.4 * LB.ease.outBack(c01((p + b.o) / 0.2))));
            setOp(b.g, a);
          });
          sparkles.forEach(function (s) {
            var q = c01(s.o + p * (1 - s.o));
            var a = Math.sin(PI * q) * (0.65 + 0.35 * Math.sin(TAU * (t * s.f + s.ph)));
            if (!vis(s.g, a > 0.02)) return;
            tf(s.g, at.x + s.dx, at.y + s.dy - 50 * q, 20 * Math.sin(TAU * s.ph + t * 3), s.s * a);
          });
          setOp(gBishounen, k);
        };
      })();

      // ------------------------------------------------------------ arches flare (horizontal anamorphic streak, world)
      (function () {
        var wide = grad(dW, 'radialGradient', [[0, '#FFE6A0', 0.55], [0.5, '#FFC72C', 0.16], [1, '#FFC72C', 0]]);
        var streak = grad(dW, 'linearGradient', [[0, '#FFC72C', 0], [0.22, '#FFD866', 0.55], [0.42, '#FFF4D2', 0.95], [0.5, '#FFFFFF', 1], [0.58, '#FFF4D2', 0.95], [0.78, '#FFD866', 0.55], [1, '#FFC72C', 0]]);
        var core = grad(dW, 'radialGradient', [[0, '#FFFFFF', 1], [0.25, '#FFF6D6', 0.9], [0.6, '#FFD15A', 0.3], [1, '#FFC72C', 0]]);
        var inner = LB.g(gArches);
        LB.el('ellipse', { cx: 0, cy: 0, rx: 250, ry: 15, fill: url(wide) }, inner);
        LB.el('ellipse', { cx: 0, cy: 0, rx: 200, ry: 3.2, fill: url(streak) }, inner);
        LB.el('ellipse', { cx: 0, cy: 0, rx: 110, ry: 0.9, fill: '#FFFFFF' }, inner);
        var gCore = LB.el('circle', { cx: 0, cy: 0, r: 26, fill: url(core) }, gArches);
        fx.archesFlare = function (st, t) {
          var k = st ? c01(num(st.k, 0)) : 0;
          if (!vis(gArches, k > 0.002)) return;
          var A = LB.WORLD.arches;
          var shimmer = 1 + 0.06 * LB.noise1(t * 30, 7);
          tf(gArches, A.x, A.y, 0);
          inner.setAttribute('transform', 'scale(' + n2((0.45 + 0.55 * k) * shimmer) + ' ' + n2(0.8 + 0.4 * k) + ')');
          gCore.setAttribute('transform', 'scale(' + n2(0.6 + 0.5 * k) + ')');
          setOp(gArches, k);
        };
      })();

      // ------------------------------------------------------------ heal (green dots + soft twinkles falling onto at, world)
      (function () {
        var dotG = grad(dW, 'radialGradient', [[0, '#FFFFFF', 1], [0.28, '#D8FFE2', 1], [0.5, GREEN, 0.9], [1, GREEN, 0]]);
        var twG = grad(dW, 'radialGradient', [[0, '#FFFFFF', 1], [0.4, '#D2FFDC', 1], [1, GREEN, 1]]);
        var glowG = grad(dW, 'radialGradient', [[0, '#E9FFEE', 0.9], [0.35, GREEN, 0.45], [1, GREEN, 0]]);
        var glow = LB.el('circle', { r: 40, fill: url(glowG) }, gHeal);
        var rnd = LB.rng(4200), parts = [];
        for (var i = 0; i < 16; i++) {
          var isStar = i % 3 === 0;
          var node = isStar ? LB.path(gHeal, starD(1, 0.85, 0.3), { fill: url(twG) }) : LB.el('circle', { r: 1, fill: url(dotG) }, gHeal);
          parts.push({ n: node, star: isStar, dx: (rnd() - 0.5) * 120, dy: -70 - rnd() * 120, d: rnd() * 0.5, s: isStar ? 9 + rnd() * 6 : 6 + rnd() * 6, ph: rnd() });
        }
        fx.heal = function (st, t) {
          var p = st ? num(st.p, 0) : 0;
          if (!vis(gHeal, p > 0.001 && p < 0.999)) return;
          var at = at2world(ctx, st.at);
          tf(gHeal, at.x, at.y, 0);
          parts.forEach(function (o) {
            var q = c01((p - o.d) / 0.5);
            var a = LB.smoothstep(0, 0.15, q) * (1 - LB.smoothstep(0.8, 1, q));
            if (!vis(o.n, a > 0.01)) return;
            var e = LB.ease.inQuad(q);
            var x = o.dx * (1 - e) * (1 - 0.35 * q) + 6 * Math.sin(TAU * (q + o.ph)) * (1 - q), y = o.dy * (1 - e) - 4;
            var s = o.s * (o.star ? (0.7 + 0.3 * Math.sin(TAU * (t * 5 + o.ph))) : 1) * (1 - 0.4 * q);
            tf(o.n, x, y, o.star ? 45 * q : 0, s);
            setOp(o.n, a);
          });
          glow.setAttribute('transform', 'translate(0 -6) scale(' + n2(0.6 + 0.6 * p) + ')');
          setOp(glow, 0.9 * Math.sin(PI * p));
        };
      })();

      // ------------------------------------------------------------ music notes (♪ ♫ drawn as glyph paths, world)
      (function () {
        function head(cx, cy) {
          var rx = 7.6, ry = 5.6, phi = -24, c = Math.cos(phi * LB.deg) * rx, s = Math.sin(phi * LB.deg) * rx;
          return 'M' + n2(cx - c) + ' ' + n2(cy - s) + 'a' + rx + ' ' + ry + ' ' + phi + ' 1 1 ' + n2(2 * c) + ' ' + n2(2 * s) +
            'a' + rx + ' ' + ry + ' ' + phi + ' 1 1 ' + n2(-2 * c) + ' ' + n2(-2 * s) + 'Z';
        }
        function stem(x, top, bottom) { return 'M' + n2(x - 2.8) + ' ' + top + 'H' + n2(x) + 'V' + bottom + 'H' + n2(x - 2.8) + 'Z'; }
        var eighth = head(0, 0) + stem(6.6, -34, -2) + 'M3.8 -34C7 -27 17 -25 15 -11C13.5 -18 9 -21 3.8 -22Z';
        var beamed = head(-9, 2) + stem(-2.4, -30, 0) + head(11, -2) + stem(17.6, -34, -4) + 'M-5.2 -30L17.6 -34L17.6 -27L-5.2 -23Z';
        var notes = [];
        for (var i = 0; i < 4; i++) {
          var n = LB.path(gNotes, i % 2 ? beamed : eighth, {
            fill: '#23233A', stroke: '#FFFFFF', 'stroke-width': 4.5, 'stroke-linejoin': 'round', 'paint-order': 'stroke',
          });
          notes.push({ n: n, b: i * 0.2, ph: LB.hash(i + 70), sx: 1 + (i % 2) * 0.1 });
        }
        fx.notes = function (st) {
          var p = st ? num(st.p, 0) : 0;
          if (!vis(gNotes, p > 0.001 && p < 0.999)) return;
          var at = at2world(ctx, st.at);
          notes.forEach(function (o) {
            var q = (p - o.b) / 0.42;
            if (!vis(o.n, q > 0 && q < 1)) return;
            // rise beside the cheek (toward the Friar), not across the King's eyes and crown band
            var x = at.x + 32 + 30 * q + 9 * Math.sin(TAU * (q * 1.1 + o.ph)), y = at.y - 6 - 105 * LB.ease.outQuad(q);
            var s = (0.55 + 0.45 * LB.ease.outBack(c01(q / 0.2))) * o.sx * 0.95;
            tf(o.n, x, y, 16 * Math.sin(TAU * (q * 0.9 + o.ph)), s);
            setOp(o.n, LB.smoothstep(0, 0.08, q) * (1 - LB.smoothstep(0.72, 1, q)));
          });
        };
      })();

      // ------------------------------------------------------------ gloom (anime depression lines over the head, world)
      (function () {
        var shadeG = grad(dW, 'linearGradient', [[0, '#14163A', 0.78], [0.5, '#262C5E', 0.5], [0.8, '#2E3670', 0.2], [1, '#2E3670', 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
        var shade = LB.path(gGloom, '', { fill: url(shadeG) });
        var linesDark = LB.path(gGloom, '', { fill: 'none', stroke: '#2F3768', 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0.85 });
        var linesLight = LB.path(gGloom, '', { fill: 'none', stroke: '#8E9CD2', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.9 });
        var rnd = LB.rng(5000), L = [];
        for (var i = 0; i < 19; i++) {
          var u = i / 18, edge = Math.pow(Math.abs(u - 0.5) * 2, 2);
          // a curtain hanging from above the frame top (beat 7 camera) over the hair, ending on the forehead between
          // -49 and -25: clear of the brows (-14) and the lens tops (-9.5), so the payoff face reads through it
          L.push({ x: -66 + u * 132 + (rnd() - 0.5) * 3, top: -116 + (rnd() - 0.3) * 10 + 20 * edge,
            len: 70 + rnd() * 14 - 20 * edge, light: i % 3 === 1, d: rnd() * 0.4 });
        }
        // dark cap over the crown, its lower edge dissolving on the forehead above the brows (head center = eye line)
        shade.setAttribute('d', 'M-74 -50C-74 -100 -42 -118 0 -118C42 -118 74 -100 74 -50L70 -24L-70 -24Z');
        fx.gloom = function (st) {
          var k = st ? c01(num(st.k, 0)) : 0;
          if (!vis(gGloom, k > 0.002)) return;
          // always anchored on the head of the referenced character (e.g. 'friar.head' or 'friar.bump' both mean his head)
          var head = typeof st.at === 'string' ? ctx.anchor(st.at.split('.')[0], 'head') : at2world(ctx, st.at);
          var dD = '', dL = '';
          L.forEach(function (l) {
            var g = LB.ease.outCubic(c01((k - l.d) / (1 - l.d)));
            if (g <= 0.01) return;
            var s = 'M' + n2(l.x) + ' ' + n2(l.top) + 'V' + n2(l.top + l.len * g);
            if (l.light) dL += s; else dD += s;
          });
          linesDark.setAttribute('d', dD || 'M0 0');
          linesLight.setAttribute('d', dL || 'M0 0');
          tf(gGloom, head.x, head.y, 0);
          setOp(shade, k);
          setOp(gGloom, Math.min(1, k * 1.5));
        };
      })();

      // ------------------------------------------------------------ focus square (phone camera, screen space)
      (function () {
        var shadow = LB.path(gFocus, '', { fill: 'none', stroke: '#000000', 'stroke-opacity': 0.35, 'stroke-width': 12, 'stroke-linecap': 'square' });
        var main = LB.path(gFocus, '', { fill: 'none', stroke: YELLOW, 'stroke-width': 7, 'stroke-linecap': 'square' });
        var tick = LB.path(gFocus, '', { fill: 'none', stroke: YELLOW, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
        var sun = LB.g(gFocus);
        LB.el('circle', { r: 7.5, fill: YELLOW }, sun);
        var rays = '';
        for (var i = 0; i < 8; i++) {
          var a = i / 8 * TAU;
          rays += 'M' + n2(Math.cos(a) * 11.5) + ' ' + n2(Math.sin(a) * 11.5) + 'L' + n2(Math.cos(a) * 16) + ' ' + n2(Math.sin(a) * 16);
        }
        LB.path(sun, rays, { stroke: YELLOW, 'stroke-width': 3.2, 'stroke-linecap': 'round', fill: 'none' });
        var lastBox = '';
        fx.focus = function (st) {
          var k = st ? c01(num(st.k, 0)) : 0;
          if (!vis(gFocus, k > 0.002)) return;
          var b = Array.isArray(st.box) && st.box.length === 4 ? st.box : [230, 170, 770, 440];
          var key = b.join(',');
          var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, hw = Math.abs(b[2] - b[0]) / 2, hh = Math.abs(b[3] - b[1]) / 2;
          if (key !== lastBox) {
            lastBox = key;
            var L = Math.min(hw, hh) * 0.36, d = '';
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
              var x = c[0] * hw, y = c[1] * hh;
              d += 'M' + n2(x) + ' ' + n2(y - c[1] * L) + 'L' + n2(x) + ' ' + n2(y) + 'L' + n2(x - c[0] * L) + ' ' + n2(y);
            });
            main.setAttribute('d', d); shadow.setAttribute('d', d);
            // small mid-edge ticks like a phone focus reticle
            tick.setAttribute('d', 'M0 ' + n2(-hh) + 'V' + n2(-hh + 12) + 'M0 ' + n2(hh) + 'V' + n2(hh - 12) +
              'M' + n2(-hw) + ' 0H' + n2(-hw + 12) + 'M' + n2(hw) + ' 0H' + n2(hw - 12));
            tf(sun, hw + 30, -hh * 0.35, 0);
          }
          var p = LB.ease.outCubic(c01(num(st.p, 1)));
          tf(gFocus, cx, cy, 0, LB.lerp(1.25, 1, p));
          setOp(gFocus, k);
        };
      })();

      // ------------------------------------------------------------ flash (full frame white)
      (function () {
        LB.el('rect', { x: -10, y: -10, width: 1020, height: 1020, fill: '#FFFFFF' }, gFlash);
        fx.flash = function (v) {
          var k = c01(num(v, 0)) * (RM ? 0.5 : 1);
          if (!vis(gFlash, k > 0.002)) return;
          setOp(gFlash, k);
        };
      })();

      // ======================================================================= text cards (overlay, screen space)
      var cards = {};

      // ---- T1 gon: ゴン!! white, thick black stroke, above the contact point, rotated -10
      (function () {
        var g = LB.g(T, { class: 'fx-card-gon' });
        var inner = LB.g(g);
        // ink drop shadow, then the lettering (stroke painted under the fill); y centers the ink box (asc 0.91em)
        // ゴ big, ン smaller and dropped, !! tall: hand-lettered manga SFX rhythm (string stays exactly ゴン!!)
        function gon(attrs) {
          var t = textEl(inner, '', Object.assign({ x: 0, y: 66, 'font-size': 160, 'stroke-linejoin': 'round' }, JP_HEAVY, attrs));
          LB.el('tspan', { 'font-size': 182, dy: 4, text: 'ゴ' }, t);
          LB.el('tspan', { 'font-size': 142, dx: -12, dy: 6, text: 'ン' }, t);
          LB.el('tspan', { 'font-size': 168, dx: -6, dy: -14, 'letter-spacing': -2, text: '!!' }, t);
          return t;
        }
        gon({ transform: 'translate(10 10)', fill: INK, stroke: INK, 'stroke-width': 30 });
        gon({ fill: '#FFFFFF', stroke: INK, 'stroke-width': 26, 'paint-order': 'stroke' });
        vis(g, false);
        cards.gon = function (age, k, t) {
          var s = age < 0.06 ? LB.lerp(1.6, 1, LB.ease.outBack(c01(age / 0.06))) : 1;
          var f = twos(t), amp = RM ? 2 : 4;
          tf(g, 582 + jit(f * 3.1 + 1, amp), 162 + jit(f * 5.3 + 2, amp), -10, s);
          setOp(g, k);
        };
        cards.gon.g = g;
      })();

      // ---- T3 arc: 訴訟編 (red, white inner stroke, black outer stroke) + THE LAWSUIT ARC (Bangers) in the lower third
      (function () {
        var g = LB.g(T, { class: 'fx-card-arc' });
        // cinematic dark band behind the lower third (does not slam; only the lettering does)
        var band = grad(dS, 'linearGradient', [[0, '#000000', 0], [0.4, '#000000', 0.42], [1, '#000000', 0.66]], { x1: 0, y1: 0, x2: 0, y2: 1 });
        var bandNode = LB.el('rect', { x: -10, y: 640, width: 1020, height: 370, fill: url(band) }, g);
        var inner = LB.g(g);
        var red = grad(dS, 'linearGradient', [[0, '#F0383A'], [0.5, '#C8161E'], [1, '#8E0A12']], { x1: 0, y1: 0, x2: 0, y2: 1 });
        var kan = Object.assign({ y: 0, 'font-size': 140, 'letter-spacing': 14, 'stroke-linejoin': 'round' }, JP_HEAVY);
        textEl(inner, '訴訟編', Object.assign({ x: 7, fill: INK, stroke: INK, 'stroke-width': 32 }, kan));
        textEl(inner, '訴訟編', Object.assign({ x: 7, fill: url(red), stroke: '#FFFFFF', 'stroke-width': 10, 'paint-order': 'stroke' }, kan));
        // rules flanking the English line
        LB.path(inner, 'M-330 64H-205M205 64H330', { stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' });
        LB.path(inner, 'M-330 64H-205M205 64H330', { stroke: '#FFFFFF', 'stroke-width': 3.5, 'stroke-linecap': 'round', fill: 'none' });
        LB.path(inner, 'M-190 64l7 -7l7 7l-7 7ZM190 64l-7 -7l-7 7l7 7Z', { fill: '#C8161E', stroke: '#FFFFFF', 'stroke-width': 2.5 });
        // textLength = the Bangers width, so a fallback font is squeezed to fit between the rules
        textEl(inner, 'THE LAWSUIT ARC', { x: 2, y: 88, 'font-family': FONT_BANG, 'font-size': 65, 'letter-spacing': 3, textLength: 405, lengthAdjust: 'spacingAndGlyphs', fill: '#FFFFFF', stroke: INK, 'stroke-width': 11, 'stroke-linejoin': 'round', 'paint-order': 'stroke' });
        vis(g, false);
        cards.arc = function (age, k, t) {
          var s = age < 0.1 ? LB.lerp(2.4, 1, LB.ease.outBack(c01(age / 0.1))) : 1;
          var sh = age >= 0.1 && age < 0.24 ? (RM ? 2 : 4) * (1 - (age - 0.1) / 0.14) : 0, f = twos(t);
          tf(inner, 500 + jit(f * 2.3 + 5, sh), 818 + jit(f * 4.1 + 6, sh), 0, s);
          setOp(bandNode, c01(age / 0.08));
          setOp(g, k);
        };
        cards.arc.g = g;
      })();

      // ---- T4 healer: CLASS: HEALER inside a JRPG menu window, lower-left, slides in from the left
      (function () {
        var g = LB.g(T, { class: 'fx-card-healer' });
        var win = grad(dS, 'linearGradient', [[0, '#26389A'], [0.5, '#16226A'], [1, '#0A1240']], { x1: 0, y1: 0, x2: 0, y2: 1 });
        var X = 40, Y = 796, Wd = 632, H = 108;
        LB.el('rect', { x: X + 7, y: Y + 8, width: Wd, height: H, rx: 16, fill: '#000000', opacity: 0.45 }, g);
        LB.el('rect', { x: X, y: Y, width: Wd, height: H, rx: 16, fill: url(win), stroke: '#FFFFFF', 'stroke-width': 7.5 }, g);
        LB.el('rect', { x: X + 9, y: Y + 9, width: Wd - 18, height: H - 18, rx: 10, fill: 'none', stroke: '#9FB4FF', 'stroke-opacity': 0.55, 'stroke-width': 2 }, g);
        // top sheen like an old console window
        LB.el('rect', { x: X + 12, y: Y + 12, width: Wd - 24, height: 22, rx: 8, fill: '#FFFFFF', opacity: 0.08 }, g);
        var cursor = LB.path(g, 'M0 -16L22 0L0 16Z', { fill: '#FFFFFF', stroke: '#0A1240', 'stroke-width': 2 });
        var tx = { x: X + 76, y: Y + H / 2 + 24, 'text-anchor': 'start', 'font-family': FONT_ROUND, 'font-weight': 900, 'font-size': 65, textLength: 508, lengthAdjust: 'spacingAndGlyphs' };
        textEl(g, 'CLASS: HEALER', Object.assign({ dx: 4, dy: 4, fill: '#050A26' }, tx));
        textEl(g, 'CLASS: HEALER', Object.assign({ fill: '#FFFFFF' }, tx));
        vis(g, false);
        cards.healer = function (age, k) {
          var e = LB.ease.outCubic(c01(age / 0.06));
          var bob = Math.floor(age * 6) % 2 ? 0 : 5;
          tf(cursor, X + 32 + bob, Y + H / 2, 0);
          tf(g, -720 * (1 - e), 0, 0);
          setOp(g, k);
        };
        cards.healer.g = g;
      })();

      // ---- T5 hp: +999 HP, green fill, dark green stroke + white outer stroke, rises 60 from above the Friar's bump
      (function () {
        var g = LB.g(T, { class: 'fx-card-hp' });
        var inner = LB.g(g);
        var fill = grad(dS, 'linearGradient', [[0, '#B9FFCB'], [0.42, GREEN], [1, '#1FD255']], { x1: 0, y1: 0, x2: 0, y2: 1 });
        var a = { x: 0, y: 34, 'font-family': FONT_ROUND, 'font-weight': 900, 'font-size': 90, 'stroke-linejoin': 'round' };
        function build(attrs) {
          var t = textEl(inner, '', Object.assign({}, a, attrs));
          LB.el('tspan', { text: '+999' }, t);
          LB.el('tspan', { 'font-size': 66, dx: 8, text: 'HP' }, t);
          return t;
        }
        // dark green ring wide enough to close the small counters of the 9s, white rim beyond it
        build({ fill: '#FFFFFF', stroke: '#FFFFFF', 'stroke-width': 30 });
        build({ fill: url(fill), stroke: '#0B4A1E', 'stroke-width': 17, 'paint-order': 'stroke' });
        vis(g, false);
        cards.hp = function (age, k, t) {
          var pop = age < 0.07 ? LB.lerp(0.6, 1.15, LB.ease.outQuad(age / 0.07)) : age < 0.14 ? LB.lerp(1.15, 1, LB.ease.inOutQuad((age - 0.07) / 0.07)) : 1;
          // follow the Friar's head (stable when the bump pops at 4.38). In the two-shot the billboard hangs right above
          // his head, so the card pops in already clear of its OVER line (one text at a time) and only rises 25.
          var h = ctx.chars && ctx.chars.friar ? ctx.anchor('friar', 'head') : null;
          var b = h ? LB.worldToScreen(stage, { x: h.x, y: h.y - 84 }) : { x: 300, y: 330 };
          var x = LB.clamp(b.x + 20, 210, 790), y = LB.clamp(b.y - 175, 90, 900); // +20: clear of the sound icon
          tf(g, x, y - 25 * LB.ease.outCubic(c01(age / 0.5)), 0);
          inner.setAttribute('transform', 'scale(' + n2(pop) + ')');
          setOp(g, k); // the director fades k over the card's last 0.08 s
        };
        cards.hp.g = g;
      })();

      // ---- T6 stamp: 却下 red hanko (double border, rough ink, ink gaps), rotated -14, slams in; CASE DISMISSED below
      (function () {
        var g = LB.g(T, { class: 'fx-card-stamp' });
        var inner = LB.g(g);
        var RED = '#D0161E', Wd = 440, H = 256;
        var rnd = LB.rng(4920);
        function roughRect(w, h, r, step, amp, seed) {
          var pts = [], hw = w / 2, hh = h / 2, u = 0;
          function push(x, y, nx, ny) {
            var j = amp * LB.noise1(u * 0.11, seed) + amp * 0.45 * (rnd() - 0.5);
            pts.push(n2(x + nx * j) + ' ' + n2(y + ny * j)); u += 1;
          }
          function seg(x0, y0, x1, y1, nx, ny) {
            var n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
            for (var i = 0; i < n; i++) push(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, nx, ny);
          }
          function arc(cx, cy, a0, a1) {
            var n = Math.max(2, Math.round(r * Math.abs(a1 - a0) / step));
            for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * i / n; push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)); }
          }
          seg(-hw + r, -hh, hw - r, -hh, 0, -1); arc(hw - r, -hh + r, -PI / 2, 0);
          seg(hw, -hh + r, hw, hh - r, 1, 0); arc(hw - r, hh - r, 0, PI / 2);
          seg(hw - r, hh, -hw + r, hh, 0, 1); arc(-hw + r, hh - r, PI / 2, PI);
          seg(-hw, hh - r, -hw, -hh + r, -1, 0); arc(-hw + r, -hh + r, PI, PI * 1.5);
          return 'M' + pts.join('L') + 'Z';
        }
        // paper ground of the impression: keeps the red ink readable over the red cape and the tan robe
        var paperG = grad(dS, 'radialGradient', [[0, '#FFFDF8'], [0.75, '#FBF1E4'], [1, '#F2E2CF']]);
        LB.path(inner, roughRect(Wd + 22, H + 22, 44, 14, 2.2, 9), { fill: url(paperG), opacity: 0.93, stroke: INK, 'stroke-opacity': 0.25, 'stroke-width': 2 });
        // ink mask: white = ink, black flecks and slivers = ink gaps, soft gray = thin ink
        var mid = LB.uid('fxmask');
        var mask = LB.el('mask', { id: mid, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse', x: -300, y: -200, width: 600, height: 400 }, dS);
        LB.el('rect', { x: -300, y: -200, width: 600, height: 400, fill: '#FFFFFF' }, mask);
        var thin = grad(dS, 'radialGradient', [[0, '#B4B4B4'], [0.55, '#DCDCDC'], [1, '#FFFFFF', 0]]);
        [[-150, -96, 70], [176, 92, 64], [60, -20, 46]].forEach(function (b) {
          LB.el('ellipse', { cx: b[0], cy: b[1], rx: b[2], ry: b[2] * 0.55, fill: url(thin) }, mask);
        });
        var fleck = '';
        for (var i = 0; i < 56; i++) {
          var fx0 = (rnd() - 0.5) * Wd * 1.02, fy0 = (rnd() - 0.5) * H * 1.02;
          fleck += circD(fx0, fy0, 0.7 + Math.pow(rnd(), 2.2) * 3);
        }
        // ink gaps where the rubber did not touch: slivers across the borders
        [[-150, -128, 20, 0.08], [212, -46, 15, 1.62], [64, 128, 24, -0.06], [-219, 72, 13, 1.5], [128, -114, 10, 0.1], [-36, 113, 9, 0.04], [-205, -20, 8, 1.55]].forEach(function (s) {
          var ca = Math.cos(s[3]), sa = Math.sin(s[3]), L = s[2], w = 3.6;
          fleck += 'M' + n2(s[0] - ca * L) + ' ' + n2(s[1] - sa * L) + 'Q' + n2(s[0] - sa * w) + ' ' + n2(s[1] + ca * w) + ' ' +
            n2(s[0] + ca * L) + ' ' + n2(s[1] + sa * L) + 'Q' + n2(s[0] + sa * w * 0.5) + ' ' + n2(s[1] - ca * w * 0.5) + ' ' +
            n2(s[0] - ca * L) + ' ' + n2(s[1] - sa * L) + 'Z';
        });
        LB.path(mask, fleck, { fill: '#000000' });
        var ink = LB.g(inner, { mask: url(mid) });
        // double border as one even-odd path: thick outer ring + thin inner ring, both with wobbly ink edges
        var ring = roughRect(Wd, H, 34, 8, 1.5, 1) + roughRect(Wd - 30, H - 30, 21, 8, 1.3, 2) +
          roughRect(Wd - 46, H - 46, 14, 8, 1.1, 3) + roughRect(Wd - 56, H - 56, 10, 8, 1.0, 4);
        LB.path(ink, ring, { fill: RED, 'fill-rule': 'evenodd' });
        textEl(ink, '却下', Object.assign({ x: 3, y: 66, 'font-size': 176, 'letter-spacing': 6, fill: RED }, JP_HEAVY));
        // ink splatter thrown off when it lands
        var splat = '';
        [[-244, -112, 4.2], [-232, -136, 2], [250, 120, 4.8], [266, 98, 2.2], [238, -138, 2.6], [-258, 128, 3]].forEach(function (s) { splat += circD(s[0], s[1], s[2]); });
        var splatNode = LB.path(ink, splat, { fill: RED });
        // landing shockwave: the stamp outline kicked outward once
        var wave = LB.el('rect', { x: -Wd / 2, y: -H / 2, width: Wd, height: H, rx: 36, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 7 }, inner);
        var eng = LB.g(g);
        // textLength = the Bangers width: a fallback font cannot run off the frame edge
        textEl(eng, 'CASE DISMISSED', { x: 0, y: 23, 'font-family': FONT_BANG, 'font-size': 60, 'letter-spacing': 3, textLength: 362, lengthAdjust: 'spacingAndGlyphs', fill: '#FFFFFF', stroke: INK, 'stroke-width': 11, 'stroke-linejoin': 'round', 'paint-order': 'stroke' });
        vis(g, false);
        cards.stamp = function (age, k, t) {
          var land = 0.06, s;
          if (age < land) s = LB.lerp(1.8, 1, LB.ease.inQuad(age / land));
          else s = 1 - 0.045 * Math.sin(PI * c01((age - land) / 0.08));
          var sh = age >= land && age < 0.2 ? (RM ? 2 : 5) * (1 - (age - land) / 0.14) : 0, f = twos(t);
          tf(g, 692 + jit(f * 1.9 + 8, sh), 662 + jit(f * 3.7 + 9, sh), -14);
          inner.setAttribute('transform', 'scale(' + n2(s) + ')');
          setOp(inner, age < land ? 0.6 + 0.4 * (age / land) : 1);
          vis(splatNode, age >= land);
          var w = (age - land) / 0.14;
          if (vis(wave, w >= 0 && w < 1)) {
            wave.setAttribute('transform', 'scale(' + n2(1 + 0.22 * LB.ease.outCubic(w)) + ')');
            wave.setAttribute('stroke-width', n2(8 * (1 - w) + 1));
            setOp(wave, 1 - w);
          }
          var e = c01((age - 0.08) / 0.08);
          if (vis(eng, e > 0)) {
            tf(eng, 0, H / 2 + 64, 0, LB.lerp(1.5, 1, LB.ease.outBack(e)));
            setOp(eng, e);
          }
          setOp(g, k);
        };
        cards.stamp.g = g;
      })();

      fx.cards = function (list, t) {
        var on = {};
        (Array.isArray(list) ? list : []).forEach(function (c) {
          if (!c || !cards[c.id]) return;
          var k = c01(num(c.k, 1));
          if (k <= 0.002) return;
          on[c.id] = true;
          vis(cards[c.id].g, true);
          cards[c.id](Math.max(0, num(c.age, 0)), k, t);
        });
        for (var id in cards) if (!on[id]) vis(cards[id].g, false);
      };

      var ORDER = ['twinkles', 'bishounen', 'archesFlare', 'gloom', 'heal', 'puff', 'notes', 'glints', 'speedLines', 'impactBurst', 'focus', 'flash', 'cards'];
      return {
        update: function (fxState, t) {
          var s = fxState || {};
          t = num(t, 0);
          for (var i = 0; i < ORDER.length; i++) {
            var key = ORDER[i];
            try { fx[key](s[key], t); } catch (e) {
              // one bad field must never take the whole frame down; report once per field
              if (!fx['__err' + key]) { fx['__err' + key] = true; if (window.console) console.warn('[fx] ' + key + ': ' + e.message); }
            }
          }
        },
      };
    },
  });
})();
