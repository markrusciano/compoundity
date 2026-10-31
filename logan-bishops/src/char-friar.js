/* Logan Bishops: the Friar rig (middle). Built on LB.face; conventions follow src/char-king.js (see docs/STYLE.md). */
(function () {
  'use strict';
  var LB = window.LB;

  // ------------------------------------------------------------------ tiny affine math (SVG matrix order a b c d e f)
  function mul(m, n) {
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  }
  function T(x, y) { return [1, 0, 0, 1, x, y]; }
  function R(deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; }
  function Sc(x, y) { return [x, 0, 0, y, 0, 0]; }
  function chain() { var m = [1, 0, 0, 1, 0, 0]; for (var i = 0; i < arguments.length; i++) m = mul(m, arguments[i]); return m; }
  function ap(m, p) { return { x: m[0] * p[0] + m[2] * p[1] + m[4], y: m[1] * p[0] + m[3] * p[1] + m[5] }; }
  function ms(m) { return 'matrix(' + m.map(function (v) { return Math.round(v * 1e5) / 1e5; }).join(' ') + ')'; }
  // 2D vectors as [x, y]
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function sc(a, k) { return [a[0] * k, a[1] * k]; }
  function nrm(a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
  var clamp = LB.clamp, lerp = LB.lerp;

  // ------------------------------------------------------------------ fixed rig layout (world units, photo pose)
  var FEET = [500, 950];
  var HIP = [500, 650];
  var NECK = [500, 374];       // head pivot (chin / neck junction)
  var FACE_UP = -52;           // eye midpoint sits 52 units above the pivot -> eye line 322
  var TILT0 = -2;              // neutral roll: chin up, very upright
  var PITCH0 = 0.6;            // chin-up pitch: features ride 1.3 units up the face
  var CLASP = { lo: [499, 628], hi: [500, 404] };                  // clasped hands: waist, and steeple under the beard
  var BUMP_BASE = -57, BUMP_H = 29;                                // bump dome (head-local, top at y 236 when bump 1)

  function create(layer, stage) {
    var F = LB.face, S = LB.style, P = S.palette.friar;
    var fl = F.fl, ol = F.ol, pt = F.pt;
    var LW = S.lw;
    var C = {
      piping: '#7A5536', pipingShadow: '#5C3E26', cuffIn: '#6B4B33', gather: '#A57D5C',
      teeRim: '#45454D', lensTint: '#DDEFFA', lensEdge: '#64737F', lensShade: '#C3D6E4', metal: '#8D96A1',
      star: '#FFD43B', starShade: '#F0A21C', nail: '#F7D9C9',
    };

    var root = LB.g(layer, { class: 'lb-friar' });
    var legsG = LB.g(root);
    var robeG = LB.g(root);
    var leanFront = LB.g(root);

    var last = {};
    function setT(node, key, m) { var v = ms(m); if (last[key] !== v) { last[key] = v; node.setAttribute('transform', v); } }
    function setA(node, key, a, v) { if (last[key] !== v) { last[key] = v; node.setAttribute(a, v); } }
    function setD(node, key, d) { setA(node, key, 'd', d); }
    function vis(node, key, on) { if (last[key] !== on) { last[key] = on; LB.show(node, on); } }
    // path through chains of points: each chain is a smooth Catmull-Rom run, chains meet at corners
    function chainsD(chains, closed) {
      var d = 'M' + pt(chains[0][0]);
      chains.forEach(function (c) { d += c.length > 2 ? F.crSeg(c, false) : 'L' + pt(c[1]); });
      return d + (closed ? 'Z' : '');
    }
    function fold(pts, w) { return F.taperD(pts, [0, w * 0.8, w, w * 0.6, 0], 5); }

    // ================================================================ FEET (gray socks under the hem; never leaned)
    [['M432 951C428 951 427 946 430 942C434 936 443 933 454 933C465 933 474 936 477 942C479 948 476 951 471 951Z',
      'M462 933C470 935 476 939 477 944C478 949 475 951 471 951L462 951C466 945 466 939 462 933Z'],
     ['M524 951C521 951 520 947 523 942C527 936 536 933 547 933C558 933 567 936 571 942C574 947 572 951 567 951Z',
      'M556 933C565 935 571 939 572 944C573 949 571 951 567 951L557 951C561 945 561 939 556 933Z']].forEach(function (f) {
      F.cel(legsG, { flat: true, d: f[0], fill: P.sock, shadow: P.sockShadow, shadowD: f[1], lw: LW.inner });
    });
    LB.path(legsG, 'M436 944C440 941 446 939 451 939M528 944C532 941 538 939 543 939', ol(LW.fine, P.sockShadow));

    // ================================================================ ROBE BODY (warped: hem fixed, shoulders follow lean/bob)
    var R_A = [[461, 389], [446, 393], [428, 402], [414, 416], [407, 436]];
    var R_B = [[407, 436], [406, 480], [407, 545], [409, 615], [408, 700], [406, 790], [404, 870], [402, 937]];
    var R_C = [[402, 937], [418, 939.5], [436, 936.5], [456, 940.5], [478, 937.5], [500, 940], [522, 937.5], [545, 940.5], [566, 936.5], [583, 939.5], [598, 937]];
    var R_D = R_B.map(function (p) { return [1000 - p[0], p[1]]; }).reverse();
    var R_E = R_A.map(function (p) { return [1000 - p[0], p[1]]; }).reverse();
    var R_F = [[539, 389], [528, 401], [514, 407.5], [500, 409.5], [486, 407.5], [472, 401], [461, 389]];
    var ROBE_SH = [[566, 400], [571, 450], [574, 540], [574, 640], [573, 740], [572, 840], [571, 945]];
    var FOLDS = [
      [[[424, 600], [421, 700], [419, 820], [417, 938]], 5],
      [[[452, 690], [449, 790], [447, 870], [446, 939]], 7],
      [[[478, 664], [481, 760], [480, 850], [478, 939]], 6],
      [[[521, 676], [525, 776], [529, 860], [532, 939]], 7],
      [[[547, 640], [551, 742], [555, 850], [557, 939]], 6],
    ];
    var robeClipId = LB.uid('lbfriar-robe');
    var robeClip = LB.el('clipPath', { id: robeClipId }, robeG);
    var robeClipP = LB.path(robeClip, 'M0 0');
    var robeBase = LB.path(robeG, 'M0 0', fl(P.robe));
    var robeIn = LB.g(robeG, { 'clip-path': 'url(#' + robeClipId + ')' });
    // gentle mottling: seeded clouds of light blotches (several overlapping vertical blobs per cloud), one path
    (function () {
      var rnd = LB.rng(4242), d = '';
      for (var c = 0; c < 44; c++) {
        var ccx = 398 + rnd() * 204, ccy = 392 + rnd() * 552, n = 2 + Math.floor(rnd() * 4);
        for (var j = 0; j < n; j++) {
          var cx = ccx + (rnd() - 0.5) * 24, cy = ccy + (rnd() - 0.5) * 40;
          var r = 3 + Math.pow(rnd(), 1.4) * 10, el = 1.3 + rnd() * 1.4, B = [];
          for (var q = 0; q < 7; q++) {
            var a = q / 7 * Math.PI * 2, rr = r * (0.66 + rnd() * 0.44);
            B.push([cx + Math.cos(a) * rr / el, cy + Math.sin(a) * rr]);
          }
          d += F.crD(B, true);
        }
      }
      LB.path(robeIn, d, fl(P.robeMottle, { opacity: 0.44 }));
    })();
    var robeShadow = LB.path(robeIn, 'M0 0', fl(P.robeShadow));
    var robeFolds = LB.path(robeIn, 'M0 0', fl(P.robeShadow));
    var castG = LB.g(robeIn);           // cast shadows of the sleeves and hands (lean frame)
    var castSleeves = LB.path(castG, 'M0 0', fl(P.robeShadow, { transform: 'translate(7 9)' }));
    var castHands = LB.path(castG, 'M0 0', fl(P.robeShadow));
    var robeLine = LB.path(robeG, 'M0 0', ol(LW.outer));
    var gatherP = LB.path(robeG, 'M0 0', ol(LW.fine, C.gather));

    function warpPt(p) {
      var w = LB.smoothstep(940, 650, p[1]);
      if (!w) return p;
      var q = ap(M.lean, p);
      return [p[0] + (q.x - p[0]) * w, p[1] + (q.y - p[1]) * w];
    }
    function drawRobe() {
      var W = function (c) { return c.map(warpPt); };
      var d = chainsD([W(R_A), W(R_B), W(R_C), W(R_D), W(R_E), W(R_F)], true);
      robeClipP.setAttribute('d', d);
      robeBase.setAttribute('d', d);
      robeLine.setAttribute('d', d);
      var sh = W(ROBE_SH);
      robeShadow.setAttribute('d', 'M' + pt(sh[0]) + F.crSeg(sh, false) + 'L650 945L650 380Z');
      robeFolds.setAttribute('d', FOLDS.map(function (f) { return fold(W(f[0]), f[1]); }).join(''));
      var g1 = W([[490, 409], [487.5, 418], [486, 426]]), g2 = W([[510, 409], [512.5, 418], [514, 426]]), g3 = W([[500, 411], [500.5, 419]]);
      gatherP.setAttribute('d', F.crD(g1) + F.crD(g2) + F.crD(g3));
    }

    // ================================================================ NECK (own neck so the head can squash and tilt over it)
    var neckG = LB.g(leanFront);
    var neckD = 'M475 340L525 340C526 360 528 380 533 398C522 405 511 409 500 410C489 409 478 405 467 398C472 380 474 360 475 340Z';
    F.cel(neckG, { flat: true, d: neckD, fill: P.skin, shadow: P.skinShadow,
      shadowD: 'M470 340L530 340L530 384C520 390 508 391 496 388C486 385 478 381 470 380Z M512 340L540 340L540 410L516 410C520 390 518 365 512 340Z', lw: LW.outer * 0.85 });

    // ================================================================ HEAD
    var headG = LB.g(leanFront);
    var backStars = LB.g(headG);
    // bump: skin dome that inflates out of the hair (scaled about its base)
    var bumpG = LB.g(headG);
    var bumpIn = LB.g(bumpG);
    var bumpD = 'M-16.5 0C-18.5 -11 -12 -' + BUMP_H + ' 0 -' + BUMP_H + 'C12 -' + BUMP_H + ' 18.5 -11 16.5 0Z';
    F.cel(bumpIn, { flat: true, d: bumpD, fill: LB.lerpColor(P.skin, '#F5A898', 0.22), shadow: LB.lerpColor(P.skinShadow, '#D9867A', 0.25),
      shadowD: 'M6 -27C14 -22 16 -12 13 0L24 0L24 -30Z', hi: '#FFFFFF',
      hiD: 'M-9.5 -16C-10 -21 -6.5 -25 -2.5 -25.5C-5 -22.5 -6.5 -19.5 -6.8 -15.5C-7.4 -14.6 -9.2 -14.8 -9.5 -16Z', noLine: true, lw: LW.outer });
    LB.path(bumpIn, 'M-16.5 0C-18.5 -11 -12 -' + BUMP_H + ' 0 -' + BUMP_H + 'C12 -' + BUMP_H + ' 18.5 -11 16.5 0', ol(LW.outer));
    LB.el('circle', { cx: -9.6, cy: -10.4, r: 1.3, fill: '#FFFFFF', 'data-sil': 'hide' }, bumpIn);

    var hd = F.head(headG, { w: 92, top: -54, chin: 55, cheekY: 4, jawY: 32, jaw: 0.7, chinW: 28, earY: 3, earH: 25, earW: 9.5,
      neckW: 46, neckTop: 26, neckBot: 70, skin: P.skin, skinShadow: P.skinShadow });
    LB.show(hd.neck, false);
    // temple shade under the swept-up hair (inside the face clip)
    LB.path(hd.face.inner, 'M-60 -60L60 -60L60 -40C46 -41 38 -40 30 -38C20 -40.5 10 -41.5 0 -40.5C-12 -41.5 -24 -41 -34 -37C-44 -37 -52 -38 -60 -38Z', fl(P.skinShadow));

    var feat = LB.g(headG);
    var face = F.create(feat, {
      eyeSpacing: 40, eyeW: 21, eyeH: 11, irisColor: P.iris, irisDark: P.irisDark, irisLight: P.irisLight, browColor: P.brow,
      browY: -14, browW: 24, mouthY: 33, mouthW: 15, mustache: false, lipColor: LB.lerpColor(P.lip, P.skin, 0.35), skin: P.skin, skinShadow: P.skinShadow,
      sweatAt: { x: 41, y: -25 }, cheekY: 14, noseY: 18.5, faceClip: hd.clipId,
    });

    // ---- glasses: rimless rectangles between the eyes and the brows; rotate about the bridge
    var glassesG = LB.el('g', {});
    face.g.insertBefore(glassesG, face.layers.brows);
    var lensR = 'M9 -9.5L31 -9.5Q35.5 -9.5 35.5 -5L35.1 3.6Q34.7 10.2 28.4 10.2L10.6 10.2Q5.2 10.2 4.9 4.8L4.6 -5Q4.6 -9.5 9 -9.5Z';
    var lensL = lensR.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, function (m0, a, b) { return (-parseFloat(a)) + ' ' + b; });
    var lensBoth = lensL + lensR;
    var lensClipId = LB.uid('lbfriar-lens');
    var lensClip = LB.el('clipPath', { id: lensClipId }, glassesG);
    LB.path(lensClip, lensBoth);
    var lcp = 'url(#' + lensClipId + ')';
    var streak = function (s) {
      var X = function (v) { return s * v; };
      return 'M' + X(27) + ' -10L' + X(33.5) + ' -10L' + X(25.5) + ' 1L' + X(22.5) + ' 1Z' + 'M' + X(35) + ' -6L' + X(37) + ' -6L' + X(31) + ' 3L' + X(29.4) + ' 3Z';
    };
    var clearG = LB.g(glassesG);
    LB.path(clearG, lensBoth, fl(C.lensTint, { opacity: 0.2 }));
    LB.path(clearG, streak(-1) + streak(1), fl('#FFFFFF', { opacity: 0.6, 'clip-path': lcp, 'data-sil': 'hide' }));
    LB.path(clearG, lensBoth, ol(1.0, C.lensEdge));
    LB.path(clearG, 'M10.6 10.2L28.4 10.2M-10.6 10.2L-28.4 10.2', ol(1.35, C.lensEdge));
    var opaqueG = LB.g(glassesG);
    LB.path(opaqueG, lensBoth, fl(P.lens));
    LB.path(opaqueG, 'M-40 4L40 4L40 14L-40 14Z M30 -12L40 -12L40 14L28 14Z M-6 -12L-3 -12L-3 14L-6 14Z', fl(C.lensShade, { 'clip-path': lcp }));
    LB.path(opaqueG, streak(-1) + streak(1), fl(P.lensShine, { 'clip-path': lcp, 'data-sil': 'hide' }));
    LB.path(opaqueG, lensBoth, ol(1.25));
    LB.path(glassesG, 'M-4.6 -4.6Q0 -8 4.6 -4.6M35.4 -6.2L46.5 -5M-35.4 -6.2L-46.5 -5', ol(1.2, S.line));
    LB.path(glassesG, 'M-3.2 -5.6Q0 -7.8 3.2 -5.6', ol(0.75, C.metal, { 'data-sil': 'hide' }));

    // ---- short full beard with a connected moustache and a mouth gap (drawn over the face kit's mouth). The gap's shape
    // follows the mouth so the smirk and the frown read inside the beard.
    var beardG = LB.g(feat);
    var GAPS = {
      closed: 'M-10.8 31.2C-7.4 29.8 -3.6 30.2 0 30.4C3.6 30.2 7.4 29.8 10.8 31.2C9.4 34.2 5 36.4 0 36.6C-5 36.4 -9.4 34.2 -10.8 31.2Z',
      smirk: 'M-10.2 32.4C-6.4 30.6 -2.4 30.4 1.6 30C5.4 29.6 8.4 29 11.4 28.2C11 32.4 6 36.2 0 36.4C-5 36.4 -8.6 34.8 -10.2 32.4Z',
      frown: 'M-11 33.6C-8 30.6 -4 30 0 30.1C4 30 8 30.6 11 33.6C9.2 36 5 37.2 0 37.2C-5 37.2 -9.2 36 -11 33.6Z',
    };
    GAPS.o = GAPS.whistle = GAPS.closed;
    var beard = (function () {
      var OE = [[-48.2, -1], [-48.6, 12], [-46.4, 24], [-42, 34], [-34.5, 44], [-24.5, 52.5], [-12.5, 58.2], [0, 60.2], [12.5, 58.2], [24.5, 52.5], [34.5, 44], [42, 34], [46.4, 24], [48.6, 12], [48.2, -1]];
      // jagged lower edge: every other sample below y 38 pushed out a little
      var Cs = F.crSample(OE, 4), out = [];
      Cs.forEach(function (p, i) {
        var a = Cs[Math.max(0, i - 1)], b = Cs[Math.min(Cs.length - 1, i + 1)];
        var nx = (b[1] - a[1]), ny = -(b[0] - a[0]), l = Math.hypot(nx, ny) || 1;
        var k = p[1] > 38 && i % 2 ? 2.1 : 0;
        out.push([p[0] + nx / l * k, p[1] + ny / l * k]);
      });
      // cheek line (right to left) with stubble notches, moustache top under the nose
      var IE = [[48.2, -1], [43.2, -0.5], [42.4, 4], [40.6, 8.6], [38.6, 9.4], [37.4, 13], [34.6, 15.4], [32.4, 15.6], [30.2, 18.6], [26, 20.6], [23.2, 20.8], [20.6, 23], [14.5, 24.2],
        [8, 23.2], [3, 23.6], [0, 24.4], [-3, 23.6], [-8, 23.2], [-14.5, 24.2], [-20.6, 23], [-23.2, 20.8], [-26, 20.6], [-30.2, 18.6], [-32.4, 15.6], [-34.6, 15.4],
        [-37.4, 13], [-38.6, 9.4], [-40.6, 8.6], [-42.4, 4], [-43.2, -0.5], [-48.2, -1]];
      var outer = 'M' + pt(out[0]) + out.slice(1).map(function (p) { return 'L' + pt(p); }).join('');
      var body = outer + IE.map(function (p) { return 'L' + pt(p); }).join('') + 'Z';
      var shD = 'M15 24C24 26 30 34 30 42C28 50 18 56 6 58.6C-6 61 -18 59 -28 54L-30 66L60 66L60 -4L44 -4C42 8 34 18 22 22Z';
      var bc = F.cel(beardG, { flat: true, d: body + GAPS.closed, fill: P.beard, shadow: P.beardShadow, shadowD: shD, noLine: true });
      bc.base.setAttribute('fill-rule', 'evenodd');
      bc.clip.setAttribute('clip-rule', 'evenodd');
      LB.path(beardG, outer, ol(2.0));
      var gapLine = LB.path(beardG, GAPS.closed, ol(0.8, S.lineSoft));
      // strand ticks
      LB.path(beardG, 'M-40 16L-38 21M-36 26L-33 30M-30 34L-26 37.5M-22 41L-18 44.5M-12 46L-9 50M-3 48L-1 52.5M-25 27L-22 30M-17 34L-14 37' +
        'M-8 25.6L-5.5 28.4M-13.5 26.2L-11 29', ol(LW.fine, P.beardShadow));
      LB.path(beardG, 'M6 26L8.5 28.6M11.5 26.4L13.8 29', ol(LW.fine, '#2A1C14'));
      return {
        mouth: function (m, dx) {
          var gd = GAPS[m] || GAPS.closed;
          if (dx) gd = gd.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, function (m0, a, b) { return LB.r4(+a + dx) + ' ' + b; });
          if (last.gap === gd) return;
          last.gap = gd;
          bc.setD(body + gd);
          gapLine.setAttribute('d', gd);
        },
      };
    })();

    // ---- hair: short, swept up and to the screen-right, sideburns into the beard
    var hairFront = LB.g(headG);
    var hairD = 'M-48 7L-48.6 -14C-49.4 -24 -49 -36 -44.5 -45C-40.4 -52.4 -33.4 -56.6 -26 -58.2Q-22 -61.6 -16.5 -63.2Q-15 -60.6 -12 -59.6' +
      'Q-6 -64.6 1 -65.6Q2.6 -62.2 5 -60.6Q11 -64.2 18.4 -63.6Q19.2 -60.6 22 -59.2Q29 -59.2 35.6 -56.4Q35.4 -54.4 37.4 -53.4' +
      'C43.4 -49 48 -40 48.6 -30C49 -24 48.8 -18 48.6 -14L48 7L43.2 7L43.6 -14' +
      'C43.6 -22 41.4 -30 36 -35C29 -40.6 20 -41.6 11 -41.2C7 -42.6 3 -41 -1 -40.6C-8 -41.6 -15 -41.6 -22 -41C-30 -39.6 -37.6 -36 -41.4 -30C-43.4 -26 -43.6 -20 -43.6 -14L-43.2 7Z';
    var hc = F.cel(hairFront, { flat: true, d: hairD, fill: P.hair, shadow: P.hairShadow,
      shadowD: 'M12 -41C24 -44 34 -46 40 -52L60 -52L60 10L44 10C45 -10 42 -28 30 -37C24 -40 18 -41 12 -41Z M-50 -4L-42 -4L-42 10L-50 10Z',
      lw: LW.inner });
    // swept-up lock separations (tapered, hair shadow) and a broken anime shine band
    LB.path(hairFront, [
      [[[-36, -37], [-33, -46], [-27, -53], [-19, -59.5]], 1.7],
      [[[-22, -41.2], [-17, -50], [-10, -57], [-1, -62.5]], 1.9],
      [[[-5, -40.8], [1, -49], [8, -56], [16, -61]], 1.9],
      [[[11, -41.4], [18, -48.5], [25, -53.5], [33, -56.4]], 1.7],
      [[[27, -39], [33, -44], [40, -48.5]], 1.4],
      [[[-43, -27], [-42, -36], [-38, -44]], 1.3],
    ].map(function (l) { return F.taperD(l[0], [0.2, l[1], l[1] * 0.8, 0]); }).join(''), fl(P.hairShadow));
    LB.path(hairFront, F.taperD([[-30, -47.5], [-24, -51.5], [-18, -54]], [0, 2.6, 0]) + F.taperD([[-13, -53.5], [-6, -56.5], [1, -58]], [0, 2.8, 0]) +
      F.taperD([[5, -55.5], [11, -57.6], [16, -58.4]], [0, 2.2, 0]), fl(P.hairShine, { 'data-sil': 'hide' }));

    // ---- stars: 3 yellow 4-point stars orbiting the bump; each exists behind (back half) and in front (front half)
    var frontStars = LB.g(headG);
    var starD = 'M0 -12Q2.1 -2.1 12 0Q2.1 2.1 0 12Q-2.1 2.1 -12 0Q-2.1 -2.1 0 -12Z';
    var starShD = 'M0 0L12 0Q2.1 2.1 0 12Z';
    function mkStar(parent) {
      var g = LB.g(parent);
      LB.path(g, starD, fl(C.star));
      LB.path(g, starShD, fl(C.starShade));
      LB.path(g, starD, ol(1.15));
      LB.el('circle', { cx: -2.4, cy: -2.4, r: 1.5, fill: '#FFFDE8', 'data-sil': 'hide' }, g);
      return g;
    }
    var stars = [0, 1, 2].map(function () { return { back: mkStar(backStars), front: mkStar(frontStars) }; });

    // ---- neckline: black crew-neck tee collar and the robe's brown piping (over the neck base)
    var collarG = LB.g(leanFront);
    var teeD = 'M462 389.5C470 384 476 385 480 389C486 395 493 398.5 500 399C507 398.5 514 395 520 389C524 385 530 384 538 389.5' +
      'C534 399 522 409.5 500 411C478 409.5 466 399 462 389.5Z';
    F.cel(collarG, { flat: true, d: teeD, fill: P.tee, shadow: P.teeShadow, shadowD: 'M506 400C516 397 524 391 530 385L545 385L545 415L506 415Z', lw: LW.inner });
    LB.path(collarG, 'M471 386.6C476 388 479 391 483 394.4C488 397.6 494 399.6 500 400.2C506 399.6 512 397.6 517 394.4C521 391 524 388 529 386.6', ol(1.0, C.teeRim, { 'data-sil': 'hide' }));
    var pipeD = F.ribbonD([[461.5, 389], [468, 399], [483, 406.8], [500, 409.5], [517, 406.8], [532, 399], [538.5, 389]],
      function (t) { return 4.4 * Math.min(1, t / 0.07, (1 - t) / 0.07); });
    LB.path(collarG, pipeD, { fill: C.piping, stroke: S.line, 'stroke-width': LW.detail, 'stroke-linejoin': 'round' });

    // ================================================================ ARMS: bell sleeves + clasped hands
    // Sleeve outlines are authored for the waist clasp (lo) and the steeple under the beard (hi), tweened by `steeple`.
    // Points are for the screen-left sleeve; the screen-right sleeve mirrors them about x 500.
    var UPS = {   // upper sleeve: shoulder top, outer arm down to the elbow, inner arm up to the armpit (inked); last point closes
      lo: [[430, 403], [410, 426], [402, 482], [399, 540], [412, 566], [438, 556], [447, 500], [451, 444], [450, 410]],
      hi: [[430, 403], [410, 426], [403, 466], [403, 500], [414, 522], [436, 510], [447, 476], [451, 444], [450, 410]],
    };
    var FOS = {   // forearm sleeve: elbow (top side), top edge, wrist top (corner), opening, hanging corner, drape, elbow (under)
      lo: [[434, 548], [446, 568], [460, 590], [474, 607], [470, 627], [457, 643], [437, 655], [412, 637], [401, 600], [400, 568]],
      hi: [[408, 492], [428, 458], [450, 428], [470, 399], [484, 414], [490, 440], [484, 470], [458, 494], [432, 514], [412, 520]],
    };
    var SL_FOLDS = {   // fold shadows inside the sleeves: [pts lo, pts hi, width]
      up: [[[[414, 450], [410, 500], [409, 540]], [[414, 445], [411, 470], [410, 496]], 5]],
      fo: [[[[430, 566], [432, 600], [436, 640]], [[426, 500], [446, 482], [470, 470]], 5],
        [[[452, 580], [454, 610], [450, 640]], [[440, 456], [458, 446], [478, 440]], 3.5]],
    };
    function tween(lo, hi, k, side) {
      return lo.map(function (p, i) { var q = mix(p, hi[i], k); return side > 0 ? [1000 - q[0], q[1]] : q; });
    }
    function upperD(U, closed) { return 'M' + pt(U[0]) + F.crSeg(U.slice(0, 8), false) + (closed ? F.crSeg([U[7], U[8], U[0]], false) + 'Z' : ''); }
    function foreD(Q, closed) {
      return 'M' + pt(Q[0]) + F.crSeg(Q.slice(0, 4), false) + F.crSeg(Q.slice(3, 7), false) + F.crSeg(Q.slice(6, 10), false) + (closed ? 'Z' : '');
    }
    var openG = LB.g(leanFront);       // dark sleeve openings (behind the hands)
    var opens = [0, 1].map(function () { return LB.el('ellipse', { cx: 0, cy: 0, rx: 10, ry: 6, fill: C.cuffIn, stroke: S.line, 'stroke-width': LW.inner }, openG); });
    var claspG = LB.g(leanFront);
    buildClasp(LB.g(claspG, { transform: 'scale(1.18)' }));
    // one cel part of a sleeve: shadow-tone base, lit copy shifted toward the light (leaves a lower-right shadow rim),
    // mottling, folds, open ink line
    var partsBuilt = 0;
    function sleevePart(parent, lit) {
      var g = LB.g(parent);
      var clipId = LB.uid('lbfriar-sl');
      var clip = LB.el('clipPath', { id: clipId }, g);
      var clipP = LB.path(clip, 'M0 0');
      var base = LB.path(g, 'M0 0', fl(P.robeShadow));
      var inner = LB.g(g, { 'clip-path': 'url(#' + clipId + ')' });
      var litP = LB.path(inner, 'M0 0', fl(P.robe, { transform: 'translate(' + lit[0] + ' ' + lit[1] + ')' }));
      var rnd = LB.rng(901 + 37 * partsBuilt++), md = '';
      for (var i = 0; i < 26; i++) {
        var cx = 392 + rnd() * 100, cy = 396 + rnd() * 270, r = 2 + Math.pow(rnd(), 1.7) * 7, B = [];
        for (var q = 0; q < 6; q++) { var a = q / 6 * Math.PI * 2, rr = r * (0.6 + rnd() * 0.5); B.push([cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr]); }
        md += F.crD(B, true);
      }
      var mot = LB.path(inner, md, fl(P.robeMottle, { opacity: 0.5 }));
      var folds = LB.path(inner, 'M0 0', fl(P.robeShadow));
      var ink = LB.path(g, 'M0 0', ol(LW.outer));
      return { g: g, clipP: clipP, base: base, litP: litP, mot: mot, folds: folds, ink: ink };
    }
    var sleeves = [0, 1].map(function (i) {
      var lit = i ? [-11, -9] : [-7, -7];
      var g = LB.g(leanFront);
      return { side: i ? 1 : -1, up: sleevePart(g, lit), fo: sleevePart(g, lit) };
    });
    // the right sleeve's mottling is mirrored so both sleeves are not identical
    sleeves[1].up.mot.setAttribute('transform', 'translate(1000 0) scale(-1 1)');
    sleeves[1].fo.mot.setAttribute('transform', 'translate(1000 0) scale(-1 1)');

    // ---------------------------------------------------------------- clasp (interlaced fingers), local frame, centre 0,0
    function buildClasp(g) {
      // backs of both hands (palms toward the body), fingers interlaced in a zipper down the middle: each hand's fingers
      // pass between the other's and their tips curl down over the other hand's back. Thumbs rest together on top.
      var backL = [[-38, -8], [-28, -14], [-15, -16.6], [-4, -15], [0.6, -6], [0.6, 6], [-3.6, 14], [-15, 16.4], [-28, 13.6], [-38, 8.4]];
      var backR = backL.map(function (p) { return [-p[0], p[1]]; });
      // [knuckle y, length, width, droop deg]
      var FL = [[-11.4, 18, 7.6, 14], [-3.8, 19.6, 7.8, 18], [3.8, 18.4, 7.5, 22], [11, 14, 6.4, 26]];
      var FR = [[-7.6, 18, 7.6, 14], [0, 19.6, 7.8, 18], [7.6, 18, 7.3, 22], [14, 13, 6, 26]];
      var fing = [];
      for (var i = 0; i < 4; i++) { fing.push(fGeom(-1, FL[i])); fing.push(fGeom(1, FR[i])); }
      var th = [tGeom(-1), tGeom(1)];
      var all = F.crD(backL, true) + F.crD(backR, true) + fing.map(function (f) { return f.d; }).join('') + th.map(function (t) { return t.d; }).join('');
      LB.path(g, all, { fill: S.line, stroke: S.line, 'stroke-width': LW.inner * 2, 'stroke-linejoin': 'round' });
      F.cel(g, { flat: true, d: F.crD(backR, true), fill: P.skin, shadow: P.skinShadow, shadowD: 'M2 2C12 10 26 11 42 3L42 22L0 22Z M24 -16C30 -13 36 -10 42 -6L42 -20Z', noLine: true });
      F.cel(g, { flat: true, d: F.crD(backL, true), fill: P.skin, shadow: P.skinShadow, shadowD: 'M-42 9C-30 14 -14 14 -1 9L-1 22L-42 22Z', noLine: true });
      LB.path(g, 'M-33 -5C-29 -4 -25 -4.6 -21 -6.6M-32 3C-28 4 -24 3.6 -20 2M33 -3C29 -2 25 -2.6 21 -4.6M32 5C28 6 24 5.6 20 4', ol(0.85, S.lineSoft));
      fing.forEach(function (f) {
        LB.path(g, f.d, fl(P.skin));
        LB.path(g, f.sh, fl(P.skinShadow));
        LB.path(g, f.line, ol(0.95, S.lineSoft));
      });
      th.forEach(function (t) {
        LB.path(g, t.d, fl(P.skin));
        LB.path(g, t.sh, fl(P.skinShadow));
        LB.path(g, t.d, ol(1.0, S.lineSoft));
      });
    }
    // finger: flat base (tucked in the zipper), rounded tip; the soft outline skips the base
    function fGeom(side, f) {
      var y = f[0], len = f[1], w = f[2], a = f[3] * Math.PI / 180, w2 = w * 0.9;
      var A = [side * 2.2, y], B = [side * 2.2 - side * len * Math.cos(a), y + len * Math.sin(a)];
      var u = nrm(sub(B, A)), n = [-u[1], u[0]];
      var a0 = sub(A, sc(n, w / 2)), a1 = add(A, sc(n, w / 2)), b0 = sub(B, sc(n, w2 / 2)), b1 = add(B, sc(n, w2 / 2));
      var r = LB.r4(w2 / 2);
      var tipArc = 'A' + r + ' ' + r + ' 0 0 1 ';
      return {
        d: 'M' + pt(a0) + 'L' + pt(b0) + tipArc + pt(b1) + 'L' + pt(a1) + 'Z',
        line: 'M' + pt(a0) + 'L' + pt(b0) + tipArc + pt(b1) + 'L' + pt(a1),
        sh: side < 0 ? F.tubeD(A, B, w, w2, 0.35, 1) : F.tubeD(A, B, w, w2, -1, -0.35),
      };
    }
    // thumbs lean together on top of the clasp
    function tGeom(side) {
      var A = [side * 13, -12.5], B = [side * 0.6, -21.6];
      return { d: F.tubeD(A, B, 8.4, 6.6, -1, 1, true), sh: F.tubeD(A, B, 8.4, 6.6, side < 0 ? 0.35 : -1, side < 0 ? 1 : -0.35) };
    }

    // ================================================================ state
    var M = { root: null, lean: null, head: null, glasses: null, clasp: null };

    function update(s) {
      s = s || {};
      var hidden = !!s.hidden;
      vis(root, 'hidden', !hidden);
      if (hidden) { last.state = s; return; }
      var x = s.x != null ? +s.x : FEET[0], y = s.y != null ? +s.y : FEET[1];
      var k = s.scale != null ? +s.scale : 1, sx = s.sx != null ? +s.sx : 1, sy = s.sy != null ? +s.sy : 1;
      var lean = s.lean != null ? +s.lean : 0;
      var tilt = s.headTilt != null ? +s.headTilt : TILT0;
      var bob = (+s.bob || 0) - (+s.breathe || 0) * 1.6 * (0.5 + 0.5 * LB.loopSin(s.t || 0, 3));
      var squash = s.headSquash != null ? clamp(+s.headSquash, 0.5, 1.5) : 1;
      var st = clamp(+s.steeple || 0, 0, 1);
      M.root = chain(T(x, y), R(+s.rot || 0), Sc(k * sx, k * sy), T(-FEET[0], -FEET[1]));
      M.lean = chain(T(0, bob), T(HIP[0], HIP[1]), R(lean), T(-HIP[0], -HIP[1]));
      M.head = chain(T(NECK[0], NECK[1]), R(tilt), Sc(1, squash), T(0, FACE_UP));
      setT(root, 'root', M.root);
      setT(leanFront, 'lf', M.lean);
      setT(headG, 'head', M.head);
      setT(feat, 'feat', T(0, -PITCH0 * 2.2));
      var rk = lean.toFixed(3) + '|' + bob.toFixed(3);
      if (last.robeKey !== rk) { last.robeKey = rk; drawRobe(); }
      setT(castG, 'castG', M.lean);

      // arms: tween the authored sleeve outlines, place the openings, the clasp and their cast shadows on the robe
      var armKey = st.toFixed(4);
      if (last.armKey !== armKey) {
        last.armKey = armKey;
        var castD = '';
        sleeves.forEach(function (sl, i) {
          var side = sl.side;
          var U = tween(UPS.lo, UPS.hi, st, side), Q = tween(FOS.lo, FOS.hi, st, side);
          var ud = upperD(U, true), fd = foreD(Q, true);
          [[sl.up, ud, upperD(U, false), SL_FOLDS.up], [sl.fo, fd, foreD(Q, false), SL_FOLDS.fo]].forEach(function (z) {
            var part = z[0];
            part.clipP.setAttribute('d', z[1]);
            part.base.setAttribute('d', z[1]);
            part.litP.setAttribute('d', z[1]);
            part.ink.setAttribute('d', z[2]);
            part.folds.setAttribute('d', z[3].map(function (f) { return fold(tween(f[0], f[1], st, side), f[2]); }).join(''));
          });
          castD += ud + fd;
          // dark opening along the cuff edge (wrist top -> hanging corner), bulging toward the hands
          var Wt = Q[3], Cb = Q[6];
          var oc = mix(Wt, Cb, 0.5), half = Math.hypot(Cb[0] - Wt[0], Cb[1] - Wt[1]) / 2;
          var ang = Math.atan2(Cb[1] - Wt[1], Cb[0] - Wt[0]) * 180 / Math.PI;
          var n = nrm([-(Cb[1] - Wt[1]), Cb[0] - Wt[0]]);
          if (n[0] * side > 0) n = sc(n, -1);
          var e = opens[i];
          e.setAttribute('rx', LB.r4(half - 1.5));
          e.setAttribute('transform', 'translate(' + pt(add(oc, sc(n, 2.5))) + ') rotate(' + LB.r4(ang) + ')');
        });
        castSleeves.setAttribute('d', castD);
        var cc = mix(CLASP.lo, CLASP.hi, st);
        M.clasp = T(cc[0], cc[1]);
        setT(claspG, 'clasp', M.clasp);
        castHands.setAttribute('d', 'M' + pt([cc[0] - 30, cc[1] + 12]) + 'C' + pt([cc[0] - 12, cc[1] + 25]) + ' ' + pt([cc[0] + 20, cc[1] + 27]) + ' ' + pt([cc[0] + 40, cc[1] + 14]) +
          'L' + pt([cc[0] + 40, cc[1] + 4]) + 'L' + pt([cc[0] - 30, cc[1] + 4]) + 'Z');
      }

      // glasses
      var opaque = s.glasses === 'opaque';
      vis(clearG, 'gclear', !opaque);
      vis(opaqueG, 'gopaque', opaque);
      vis(face.layers.eyes, 'eyesv', !opaque);
      var turn = clamp(+s.headTurn || 0, -1, 1);
      M.glasses = chain(T(turn * 40 * 0.28, -3), R(+s.glassesTilt || 0), T(0, 3));
      setT(glassesG, 'gl', M.glasses);

      // bump + stars
      var bump = clamp(+s.bump || 0, 0, 1.3);
      vis(bumpG, 'bumpv', bump > 0.01);
      if (bump > 0.01) setT(bumpG, 'bump', chain(T(0, BUMP_BASE), Sc(bump, bump)));
      var sk = clamp(+s.stars || 0, 0, 1);
      var spin = +s.starSpin || 0;
      var cy = BUMP_BASE - 13 * clamp(bump, 0.6, 1.1);
      stars.forEach(function (o, i) {
        var a = 2 * Math.PI * (spin + i / 3);
        var sn = Math.sin(a), front = sn >= 0;
        var on = sk > 0.01;
        vis(o.front, 'sf' + i, on && front);
        vis(o.back, 'sb' + i, on && !front);
        if (!on) return;
        var g = front ? o.front : o.back;
        var z = (0.82 + 0.2 * sn) * sk;
        setT(g, 'st' + i, chain(T(38 * Math.cos(a), cy + 12 * sn), R(spin * 140 + i * 25), Sc(z, z)));
      });

      face.update(s);
      beard.mouth(s.mouth, turn * 40 * 0.36);
      LB.silhouette(root, (+s.silhouette || 0) > 0.5, s.silhouetteColor || '#000');
      last.state = s;
    }

    function anchor(name) {
      if (!M.root) update({});
      var base = chain(M.root, M.lean);
      var headM = chain(base, M.head);
      var featM = chain(headM, T(0, -PITCH0 * 2.2));
      var st = last.state || {};
      switch (name) {
        case 'bump': {
          var b = clamp(+st.bump || 0, 0, 1.3);
          return ap(headM, [0, b > 0.01 ? BUMP_BASE - BUMP_H * b : -63]);
        }
        case 'glasses': return ap(chain(featM, M.glasses), [0, -4]);
        case 'lensR': return ap(chain(featM, M.glasses), [35.5, -9.5]);
        case 'hands': return ap(chain(base, M.clasp), [0, 0]);
        default: return ap(headM, [0, -6]);
      }
    }

    update({});
    return { root: root, update: update, anchor: anchor };
  }

  LB.register('friar', { create: create });
})();
