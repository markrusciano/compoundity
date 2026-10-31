/* Logan Bishops: the King rig (left). Style reference for the other riggers; see docs/STYLE.md. */
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
  var clamp = LB.clamp, lerp = LB.lerp;

  // ------------------------------------------------------------------ fixed rig layout (world units, photo pose)
  var FEET = [300, 950];
  var HIP = [300, 650];
  var NECK = [305, 411.5];      // head pivot (top of the neck)
  var FACE_UP = -50;            // face origin (eye midpoint) sits 50 units above the pivot before tilt
  var SHOULDER_R = [255, 465];  // character's right shoulder joint (screen-left, scepter arm)
  var L_UP = 120, L_FORE = 110; // upper arm, forearm (elbow to grip)
  var KNOB = 231, TIP = 354;    // scepter: grip to knob center, grip to floor tip
  var GRIP_PHOTO = [331, 660], PHI_PHOTO = Math.atan2(470 - 660, 462 - 331) * 180 / Math.PI; // about -55.4
  var GRIP_RAISE = [407, 434], PHI_RAISE = Math.atan2(222 - 434, 500 - 407) * 180 / Math.PI;  // knob ends near (500,222)
  var GRIP_BONK = [411.4, 471.3], PHI_BONK = Math.atan2(258 - 471.3, 500 - 411.4) * 180 / Math.PI; // knob on the Friar's crown
  var KNOB_HIDE = [386, 402], PHI_HIDE = -72;   // scepter behind the back, knob over the screen-right shoulder

  function create(layer, stage) {
    var F = LB.face, S = LB.style, P = S.palette.king;
    var fl = F.fl, ol = F.ol, pt = F.pt;
    var LW = S.lw;

    var root = LB.g(layer, { class: 'lb-king' });
    var leanBack = LB.g(root);
    var legsG = LB.g(root);
    var leanFront = LB.g(root);

    // ---------------------------------------------------------------- helpers
    function ribbon(C, w, f0, f1) { return F.ribbonD(C, w, f0, f1, 1); }
    function shadowSide(C) {
      var i = Math.floor(C.length / 2), a = C[i - 1], b = C[i + 1];
      var nx = -(b[1] - a[1]), ny = b[0] - a[0];
      return nx * S.shadowDir.x + ny * S.shadowDir.y > 0 ? 1 : -1;
    }
    // ermine trim strip: white fur band with seeded black spots
    function ermine(parent, pts, w, seed, opt) {
      opt = opt || {};
      var g = LB.g(parent);
      var C = F.crSample(pts, 7);
      var tp = opt.taper || [0, 0];
      var wf = function (t) {
        var k = 1;
        if (tp[0] && t < tp[0]) k = Math.min(k, 0.42 + 0.58 * Math.sin(t / tp[0] * Math.PI / 2));
        if (tp[1] && t > 1 - tp[1]) k = Math.min(k, 0.42 + 0.58 * Math.sin((1 - t) / tp[1] * Math.PI / 2));
        return w * k;
      };
      var d = ribbon(C, wf, -1, 1);
      LB.path(g, d, fl(P.ermine));
      var side = opt.side || shadowSide(C);
      LB.path(g, side > 0 ? ribbon(C, wf, 0.25, 1) : ribbon(C, wf, -1, -0.25), fl(P.ermineShadow));
      var rnd = LB.rng(seed), sd = '', len = 0, i;
      var acc = [0];
      for (i = 1; i < C.length; i++) acc.push(acc[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
      len = acc[acc.length - 1];
      var step = opt.step || 6.2, k = 0;
      for (var s = 3 + rnd() * 2; s < len - 2; s += step * (0.75 + rnd() * 0.5), k++) {
        var j = 1;
        while (j < acc.length - 1 && acc[j] < s) j++;
        var u = (s - acc[j - 1]) / ((acc[j] - acc[j - 1]) || 1);
        var cx = lerp(C[j - 1][0], C[j][0], u), cy = lerp(C[j - 1][1], C[j][1], u);
        var dx = C[j][0] - C[j - 1][0], dy = C[j][1] - C[j - 1][1], dl = Math.hypot(dx, dy) || 1;
        var nx = -dy / dl, ny = dx / dl;
        var r = (opt.spot || 1.0) * (1.3 + rnd() * 1.6);
        var off = ((k % 2 ? 1 : -1) * (0.25 + rnd() * 0.45)) * Math.max(0, wf(s / len) / 2 - r - 0.8);
        if (wf(s / len) < 2 * r + 2) continue;
        var px = cx + nx * off, py = cy + ny * off, rot = rnd() * Math.PI, el = 0.65 + rnd() * 0.35;
        var B = [];
        for (var q = 0; q < 6; q++) {
          var a = rot + q * Math.PI / 3, rr = r * (0.78 + rnd() * 0.4);
          var ex = Math.cos(a) * rr, ey = Math.sin(a) * rr * el;
          B.push([px + ex * Math.cos(rot) - ey * Math.sin(rot), py + ex * Math.sin(rot) + ey * Math.cos(rot)]);
        }
        sd += F.crD(B, true);
      }
      LB.path(g, sd, fl(P.ermineSpot));
      LB.path(g, d, ol(LW.inner));
      return g;
    }
    function fold(parent, pts, wmax, color) {
      return LB.path(parent, F.taperD(pts, [0, wmax * 0.8, wmax, wmax * 0.6, 0], 5), fl(color));
    }
    var limbShadow = F.tubeShadeD;

    // ================================================================ BACK (lean group, behind legs)
    // scepter hidden behind the back (only knob + top of shaft are ever visible above the shoulder)
    var scBack = LB.g(leanBack);
    function buildScepter(parent, full) {
      var g = LB.g(parent);
      var shaftLen = full ? TIP : -60;
      LB.path(g, 'M-3.6 -212L-3.6 ' + shaftLen + (full ? 'A3.6 3.6 0 0 0 3.6 ' + shaftLen : 'L3.6 ' + shaftLen) + 'L3.6 -212Z',
        { fill: P.shaft, stroke: full ? S.line : 'none', 'stroke-width': 1.3 });
      LB.path(g, 'M-1.5 -206L-1.5 ' + (shaftLen - 4), ol(1.0, P.shaftHi, { 'data-sil': 'hide' }));
      // knob assembly (local: knob center at 0,-KNOB)
      var k = LB.g(g, { transform: 'translate(0 ' + (-KNOB) + ')' });
      var goldParts = 'M-6.4 22.5C-6.4 20.6 6.4 20.6 6.4 22.5C6.4 24.6 -6.4 24.6 -6.4 22.5Z' +   // lower collar
        'M-4.6 21.4L-3.2 15.2L3.2 15.2L4.6 21.4Z' +                                                // neck
        'M-8.4 14.6C-8.4 11.6 8.4 11.6 8.4 14.6C8.4 17.4 -8.4 17.4 -8.4 14.6Z' +                    // ring
        'M0 -14.5C2.2 -14.5 3.6 -16.4 3.6 -18.2C3.6 -20.4 2 -21.8 0 -21.8C-2 -21.8 -3.6 -20.4 -3.6 -18.2C-3.6 -16.4 -2.2 -14.5 0 -14.5Z'; // finial bead
      LB.path(k, goldParts, { fill: P.knob, stroke: S.line, 'stroke-width': 1.1, 'stroke-linejoin': 'round' });
      LB.el('circle', { cx: 0, cy: 0, r: 12.2, fill: P.knob }, k);
      var shadeG = LB.g(k);
      shadeG.appendChild(LB.path(null, 'M10.6 -6.1A12.2 12.2 0 0 1 -6.1 10.6C2 9.6 8.6 3.6 10.6 -6.1Z', fl(P.knobShadow)));
      LB.el('circle', { cx: 0, cy: 0, r: 12.2, fill: 'none', stroke: S.line, 'stroke-width': 1.4 }, k);
      // engraved bands on the knob
      if (full) LB.path(k, 'M-11.9 -1.6C-6 1.6 6 1.6 11.9 -1.6M-11.6 3.4C-6 6.6 6 6.6 11.6 3.4' +
        'M-8.6 -8.4C-7 -5.6 -5 -5.6 -3.6 -8.6C-2.2 -5.8 2.2 -5.8 3.6 -8.6C5 -5.6 7 -5.6 8.6 -8.4' +
        'M-7 6.4C-5 10 5 10 7 6.4', ol(0.8, P.goldLine));
      var beads = '';
      [-8.4, -4.2, 0, 4.2, 8.4].forEach(function (bx) { var by = 1.1 + 0.0 * bx + (Math.abs(bx) > 6 ? -0.4 : 0.6); beads += 'M' + (bx - 0.9) + ' ' + by + 'a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0Z'; });
      if (full) LB.path(k, beads, fl(P.goldLine));
      LB.path(k, 'M-1.7 -11.6L-1.2 -15.2L1.2 -15.2L1.7 -11.6Z M-1.9 -21.2L0 -26.4L1.9 -21.2Z', { fill: P.knob, stroke: S.line, 'stroke-width': 1.0, 'stroke-linejoin': 'round' });
      var hiG = LB.g(k, { 'data-sil': 'hide' });
      LB.el('ellipse', { cx: -4.6, cy: -5.2, rx: 3.6, ry: 2.2, fill: P.knobHi, transform: 'rotate(-40 -4.6 -5.2)' }, hiG);
      LB.el('circle', { cx: -7.8, cy: -0.6, r: 1.0, fill: '#FFFFFF' }, hiG);
      if (full) LB.el('ellipse', { cx: -2.2, cy: 13.9, rx: 3.2, ry: 0.9, fill: P.knobHi }, hiG);
      return { g: g, knobShade: shadeG, knobHi: hiG };
    }
    var scepterB = buildScepter(scBack, false);

    // cape back: the lining seen between the front edges and behind the legs
    var capeBack = LB.g(leanBack);
    var backD = F.crD([[258, 512], [236, 600], [214, 720], [196, 840], [186, 940], [300, 946], [424, 936], [411, 830], [398, 700], [382, 600], [362, 512]], true);
    var backCel = F.cel(capeBack, { flat: true, d: backD, fill: P.lining, shadow: P.liningShadow, shadowD: 'M300 560L420 560L420 960L330 960C322 860 318 760 300 560Z', lw: LW.outer });
    fold(backCel.inner, [[268, 690], [262, 780], [252, 870], [248, 950]], 9, P.liningShadow);
    fold(backCel.inner, [[302, 700], [306, 800], [304, 900], [302, 955]], 8, P.liningShadow);
    fold(backCel.inner, [[352, 690], [360, 790], [368, 880], [372, 950]], 8, P.liningShadow);

    // ================================================================ LEGS (not leaned)
    function leg(o) {
      var g = legsG;
      var poly = 'M' + pt(o.out[0]) + F.crSeg(o.out, false) + 'L' + pt(o.inn[o.inn.length - 1]) + F.crSeg(o.inn.slice().reverse(), false) + 'Z';
      var c = F.cel(g, { flat: true, d: poly, fill: P.jeans, shadow: P.jeansShadow, shadowD: o.shadow, hi: P.jeansFade, hiD: o.fade, lw: LW.outer });
      LB.path(c.inner, o.seam, ol(0.9, P.jeansShadow));
      // rolled cuff
      var cf = F.cel(g, { flat: true, d: o.cuff, fill: P.cuff, shadow: P.jeansShadow, shadowD: o.cuffShadow, lw: LW.inner });
      LB.path(g, o.selvedge, ol(1.1, P.selvedge, { 'data-sil': 'hide' }));
      LB.path(g, o.stitch, ol(0.7, P.stitch, { 'stroke-dasharray': '2 1.6', 'data-sil': 'hide' }));
      // sock foot
      var sk = F.cel(g, { flat: true, d: o.sock, fill: P.sock, shadow: P.sockShadow, shadowD: o.sockShadow, hi: P.sockHi, hiD: o.sockHi, lw: LW.inner, line: '#050506' });
      return g;
    }
    leg({
      out: [[265, 660], [262, 740], [263, 820], [266, 902]],
      inn: [[306, 700], [302, 760], [298, 830], [296, 902]],
      shadow: 'M286 690C290 760 286 840 284 910L300 910L306 690Z',
      fade: 'M270 700C272 740 274 770 276 800C278 770 278 735 276 700Z',
      seam: 'M300 708C296 780 293 850 292 902M268 786C274 791 282 792 290 788M271 796C276 799 282 800 287 798M268 884C275 889 284 890 293 886',
      cuff: 'M262 899L298 899C299 906 299 913 298 919L263 919C262 913 262 906 262 899Z',
      cuffShadow: 'M286 899L300 899L300 920L286 920Z',
      selvedge: 'M264 917.5L296 917.5',
      stitch: 'M263 903.5L297 903.5',
      sock: 'M268 918L295 918C296 926 298 934 299 941C300 947 297 951 291 951L262 951C254 951 251 947 253 943C256 938 263 934 266 929C267 925 268 921 268 918Z',
      sockShadow: 'M286 918L296 918C297 928 300 938 300 944C299 949 296 951 291 951L282 951C286 941 287 929 286 918Z',
      sockHi: 'M257 943C261 940 266 937 270 933C273 936 268 941 262 945C259 946.5 256 946 257 943Z',
    });
    leg({
      out: [[346, 660], [352, 740], [354, 820], [355, 902]],
      inn: [[310, 700], [315, 760], [320, 830], [323, 902]],
      shadow: 'M338 690C344 760 346 840 344 910L358 910L352 660Z',
      fade: 'M318 712C320 745 323 775 326 800C329 770 328 738 324 712Z',
      seam: 'M316 708C320 780 323 850 325 902M324 782C331 788 340 789 349 784M328 793C333 796 339 797 345 794M326 884C334 889 343 889 352 885',
      cuff: 'M320 899L358 899C359 906 359 913 358 919L321 919C320 913 320 906 320 899Z',
      cuffShadow: 'M344 899L360 899L360 920L344 920Z',
      selvedge: 'M323 917.5L356 917.5',
      stitch: 'M321 903.5L357 903.5',
      sock: 'M325 918L352 918C353 924 355 930 359 935C364 939 370 942 368 947C367 950 363 951 358 951L327 951C322 951 320 948 321 943C322 936 324 927 325 918Z',
      sockShadow: 'M342 918L352 918C353 925 356 932 361 937C366 940 370 943 368 947C367 950 363 951 358 951L345 951C348 941 345 928 342 918Z',
      sockHi: 'M325 930C326 926 328 923 330 922C330 928 328 936 326 942C324 941 324 935 325 930Z',
    });

    // ================================================================ FRONT (lean group)
    // ---- torso: tee + open chore jacket
    var torso = LB.g(leanFront);
    var tee = F.cel(torso, { flat: true, d: 'M289 444L326 444L340 676L294 676Z', fill: P.tee, shadow: P.teeShadow,
      shadowD: 'M289 444L305 444C302 520 304 600 306 676L294 676Z', lw: LW.inner });
    LB.el('text', { x: 314, y: 512, 'text-anchor': 'middle', 'font-family': "'Source Sans 3', sans-serif", 'font-weight': 700, 'font-size': 9.5,
      fill: P.teePrint, transform: 'rotate(2 314 512)', text: 'night' }, torso);
    var jL = F.cel(torso, { flat: true, d: F.crD([[296, 444], [270, 450], [252, 474], [247, 560], [249, 676], [276, 680], [305, 677], [302, 560], [300, 470]], true),
      fill: P.jacket, shadow: P.jacketShadow, shadowD: 'M288 470C292 540 294 610 296 690L320 690L320 440L300 440Z', lw: LW.inner });
    var jR = F.cel(torso, { flat: true, d: F.crD([[318, 444], [346, 448], [362, 470], [368, 560], [370, 676], [350, 680], [334, 677], [332, 560], [328, 470]], true),
      fill: P.jacket, shadow: P.jacketShadow, shadowD: 'M352 460C356 540 358 620 360 700L380 700L380 440Z', lw: LW.inner });
    // pockets, seams, buttons
    LB.path(torso, 'M258 610L290 612L291 652L258 650Z', ol(1.0, P.jacketSeam));
    LB.path(torso, 'M258 616L290 618', ol(0.8, P.jacketSeam, { 'stroke-dasharray': '2 1.6' }));
    LB.path(torso, 'M334 512L356 512L356 548L334 548Z', ol(1.0, P.jacketSeam));
    LB.path(torso, 'M334 518C340 524 350 524 356 518', ol(1.0, P.jacketSeam));
    LB.path(torso, 'M249 668L303 670M334 670L370 668', ol(0.8, P.jacketSeam, { 'stroke-dasharray': '2 1.6' }));
    var btn = '';
    [494, 548, 602, 650].forEach(function (y) { btn += 'M' + pt([339.5, y]) + 'm-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0Z'; });
    LB.path(torso, btn, { fill: '#5B4733', stroke: S.line, 'stroke-width': 0.8 });

    // ---- character's left arm (screen-right): hangs inside the cape opening, shoulder hidden under the right panel
    var lArm = leanFront;
    var LS = [354, 468], LE = [360, 562], LW2 = [364, 650];
    F.limb(lArm, { fill: P.jacket, shadow: P.jacketShadow, lw: LW.inner }).set(LS, LE, LW2, 27, 24, 21);
    LB.path(lArm, 'M353 642L375 644M359 566C361 572 365 574 370 574M352 610C356 613 361 613 366 611', ol(1.0, P.jacketSeam));
    var lhD = 'M355 650C351 660 351 675 355 685C358 693 368 696 373 689C376 683 377 668 374 651Z';
    F.cel(lArm, { flat: true, d: lhD, fill: P.skin, shadow: P.skinShadow, shadowD: 'M368 650C373 664 373 680 366 696L383 696L383 650Z', lw: LW.inner });
    LB.path(lArm, 'M355.5 661C353.5 668 354 675 357.5 680M362 682C364 685 367 686 370 684M363 687.5C365 690 368 690.6 371 689', ol(0.85, S.lineSoft));
    LB.path(lArm, 'M361.6 681.6C364 684.4 368 684.6 371.2 682.4', ol(1.6, P.ring, { 'data-sil': 'hide' }));

    // ---- cape front panel, screen-right (over the character's left shoulder)
    var RT = [[313, 468], [332, 504], [358, 548], [384, 600], [398, 660], [405, 730], [411, 800], [417, 870], [423, 936]];
    var RO = [[322, 434], [352, 440], [380, 456], [398, 490], [408, 550], [416, 630], [423, 720], [430, 810], [435, 880], [438, 928]];
    var rpD = 'M' + pt(RO[0]) + F.crSeg(RO, false) + 'L431 935L' + pt(RT[RT.length - 1]) + F.crSeg(RT.slice().reverse(), false) + 'C312 460 316 448 322 434Z';
    var rPanel = LB.g(leanFront);
    var rp = F.cel(rPanel, { flat: true, d: rpD, fill: P.cape, shadow: P.capeShadow,
      shadowD: 'M384 470C398 560 404 680 412 800C416 860 420 900 420 945L450 945L450 440Z' +
        'M330 470C342 500 360 540 378 600C364 560 346 520 330 470Z', hi: P.capeSheen,
      hiD: F.taperD([[364, 524], [386, 600], [398, 690], [404, 780]], [0, 5, 6, 4, 0]), lw: LW.outer });
    fold(rp.inner, [[394, 640], [402, 720], [410, 800], [418, 900]], 7, P.capeShadow);
    fold(rp.inner, [[352, 470], [368, 520], [382, 560]], 5, P.capeShadow);
    ermine(rPanel, RT, 17, 11);

    // ---- cape front panel, screen-left (over the character's right shoulder); cloned on top of the upper arm as the drape
    var LT = [[301, 468], [296, 505], [287, 548], [276, 598], [263, 655], [249, 720], [233, 795], [217, 870], [204, 944]];
    var LO = [[288, 434], [262, 442], [240, 460], [228, 500], [219, 560], [209, 640], [198, 730], [188, 820], [180, 890], [175, 936]];
    var lpD = 'M' + pt(LO[0]) + F.crSeg(LO, false) + 'L188 943L' + pt(LT[LT.length - 1]) + F.crSeg(LT.slice().reverse(), false) + 'C300 460 294 448 288 434Z';
    var lPanelId = LB.uid('lbking-lp');
    var lPanel = LB.g(leanFront, { id: lPanelId });
    var lp = F.cel(lPanel, { flat: true, d: lpD, fill: P.cape, shadow: P.capeShadow,
      shadowD: 'M296 470C292 520 282 580 270 640C258 700 244 780 226 860C220 900 214 930 212 950L240 950C250 860 266 760 282 660C290 600 300 520 300 470Z' +
        'M238 470C250 480 262 500 270 530C258 510 248 490 238 470Z', hi: P.capeSheen,
      hiD: F.taperD([[236, 520], [228, 610], [220, 700], [212, 790]], [0, 5, 7, 4, 0]), lw: LW.outer });
    fold(lp.inner, [[252, 560], [244, 660], [232, 760], [220, 870], [214, 945]], 8, P.capeShadow);
    fold(lp.inner, [[226, 640], [212, 740], [200, 840], [192, 940]], 6, P.capeShadow);
    ermine(lPanel, LT, 17, 23);

    // ---- right arm (screen-left, scepter arm): two-pass outline so the elbow joint has no seam
    var armG = LB.g(leanFront);
    var armInk = LB.path(armG, 'M0 0', { fill: S.line, stroke: S.line, 'stroke-width': LW.outer * 2, 'stroke-linejoin': 'round' });
    var armFill = LB.path(armG, 'M0 0', fl(P.jacket));
    var armShade = LB.path(armG, 'M0 0', fl(P.jacketShadow));
    var armDetail = LB.path(armG, 'M0 0', ol(1.0, P.jacketSeam));
    var wristInk = LB.path(armG, 'M0 0', { fill: P.skin, stroke: S.line, 'stroke-width': LW.inner });

    // ---- drape: the upper part of the screen-left panel cloned over the upper arm
    var drapeClipId = LB.uid('lbking-drape');
    var drapeClip = LB.el('clipPath', { id: drapeClipId }, leanFront);
    LB.path(drapeClip, 'M150 380L340 380L340 470L300 470C298 520 290 560 280 604L262 612C240 640 214 676 196 716L150 716Z');
    var drape = LB.el('use', { href: '#' + lPanelId, 'clip-path': 'url(#' + drapeClipId + ')' }, leanFront);

    // ---- ermine collar (back part stands up behind the neck)
    var collarBack = LB.g(leanFront);
    ermine(collarBack, [[260, 456], [261, 428], [276, 406], [305, 397], [334, 401], [349, 422], [352, 454]], 25, 37, { side: 1, step: 6.6, taper: [0.14, 0.14] });

    // ================================================================ HEAD
    var headG = LB.g(leanFront);
    var hairBack = LB.g(headG);
    LB.path(hairBack, 'M-49 6C-56 -36 -32 -70 0 -70C32 -70 57 -38 49 6Z', fl(P.hair));
    LB.path(hairBack, 'M18 -61C38 -55 53 -36 49 6L39 6C43 -24 36 -47 18 -61Z', fl(P.hairShadow));
    LB.path(hairBack, 'M-49 6C-56 -36 -32 -70 0 -70C32 -70 57 -38 49 6', ol(LW.outer));
    var hd = F.head(headG, { w: 88, top: -60, chin: 53, cheekY: 3, jawY: 31, jaw: 0.6, chinW: 22, earY: 4, earH: 25, earW: 9.5,
      neckW: 34, neckTop: 26, neckBot: 96, skin: P.skin, skinShadow: P.skinShadow });
    // crown and fringe shadow on the forehead (inside the face clip)
    var foreSh = LB.path(hd.face.inner, 'M-60 -60L60 -60L60 -46C40 -44 20 -38 -2 -34C-20 -31 -40 -26 -60 -22Z', fl(P.skinShadow));
    var feat = LB.g(headG);
    var face = F.create(feat, {
      eyeSpacing: 38, eyeW: 21.5, eyeH: 11, irisColor: P.iris, irisDark: P.irisDark, irisLight: P.irisLight, browColor: P.brow,
      browY: -12.5, mouthY: 35, mouthW: 15, mustache: true, lipColor: P.lip, skin: P.skin, skinShadow: P.skinShadow,
      sweatAt: { x: 48, y: -24 }, cheekY: 15, noseY: 19.5, faceClip: hd.clipId,
    });
    // mustache: brown chevron, thick in the middle, tips drooping a little past the mouth corners
    var mus = LB.g(feat, { transform: 'translate(0 28) scale(1.13 1.1) translate(0 -28)' });
    var musD = 'M0 25.2C-3 22.8 -8 22.2 -12.5 24.4C-16 26.2 -18.6 29.6 -20.4 34.2C-17.6 32.4 -14.4 31.6 -11 31.8C-7 32 -3 31.2 0 30.6' +
      'C3 31.2 7 32 11 31.8C14.4 31.6 17.6 32.4 20.4 34.2C18.6 29.6 16 26.2 12.5 24.4C8 22.2 3 22.8 0 25.2Z';
    var musC = F.cel(mus, { flat: true, d: musD, fill: P.mustache, shadow: P.mustacheShadow,
      shadowD: 'M-22 29.6C-14 28.6 -6 29 0 28.2C6 29 14 28.6 22 29.6L22 36L-22 36Z M6 22L22 22L22 30L10 27Z', lw: 1.3 });
    LB.path(mus, 'M-3 26.5L-6 29.6M-8 25.4L-11.5 29.2M-13 26.2L-16 30.2M3.6 26.5L6.6 29.6M8.6 25.4L12 29.2M13.4 26.4L16.4 30.4', ol(0.7, P.mustacheShadow));
    // sideburns + side-swept fringe peeking under the crown
    var hairFront = LB.g(headG);
    var fr = 'M-44.6 -22C-41.4 -15 -41 -4 -42.2 7L-45 7C-45.8 -4 -45.6 -13 -44.6 -22Z' +
      'M44.6 -24C41.4 -16 41 -4 42.2 7L45 7C45.8 -4 45.6 -14 44.6 -24Z';
    LB.path(hairFront, fr, fl(P.hair));
    var locks = F.lockD([-10, -33], [10, -38], [22, -21], 0.2) + F.lockD([4, -38], [26, -45], [35, -20], 0.16) +
      F.lockD([20, -42], [42, -51], [43, -25], 0.1) + 'M-12 -33L44 -52L46 -42L-8 -30Z';
    LB.path(hairFront, locks, fl(P.hair));
    LB.path(hairFront, F.taperD([[-10, -32.5], [16, -38], [44, -47]], [3, 5, 4]), fl(P.hairShadow));
    LB.path(hairFront, F.taperD([[10, -35], [22, -33], [30, -26]], [0, 2.4, 0]), fl(P.hairShine, { 'data-sil': 'hide' }));
    LB.path(hairFront, F.lockD([-10, -33], [10, -38], [22, -21], 0.2) + F.lockD([4, -38], [26, -45], [35, -20], 0.16) +
      F.lockD([20, -42], [42, -51], [43, -25], 0.1) + fr, ol(LW.inner));
    LB.path(hairFront, 'M14 -33C18 -30 21 -26 23 -22M29 -38C32 -33 34 -27 35 -22', ol(0.8, P.hairShadow));

    // ---- crown (cocked: rotated against the head tilt)
    var crown = LB.g(headG, { transform: 'translate(3 -37) rotate(-14)' });
    var domeD = 'M-46 -15C-55 -34 -44 -57 -22 -60C-12 -61.4 -5 -57 0 -55.4C5 -57 12 -61.4 22 -60C44 -57 55 -34 46 -15Z';
    F.cel(crown, { flat: true, d: domeD, fill: P.crown, shadow: P.crownShadow,
      shadowD: 'M4 -55C14 -46 30 -40 38 -22L60 -14L60 -70L4 -70Z M-50 -24C-36 -30 -14 -30 0 -26C14 -30 36 -30 50 -24L50 -10L-50 -10Z',
      hi: P.crownSheen, hiD: F.taperD([[-40, -32], [-34, -48], [-22, -55]], [0, 5, 0]), lw: LW.outer });
    LB.path(crown, 'M-26 -24C-24 -36 -20 -48 -16 -57M24 -24C22 -36 18 -48 14 -57', ol(0.9, P.crownShadow));
    // gold arch straps over the dome
    var strapD = 'M-7 -14C-7 -32 -6.5 -50 -4.6 -60L4.6 -60C6.5 -50 7 -32 7 -14Z' +
      'M-40 -16C-43 -30 -40 -44 -31 -54L-27 -52C-34 -43 -36 -30 -34 -16Z M40 -16C43 -30 40 -44 31 -54L27 -52C34 -43 36 -30 34 -16Z';
    F.cel(crown, { flat: true, d: strapD, fill: P.gold, shadow: P.goldShadow, shadowD: 'M1.5 -62L10 -62L10 -10L2 -10Z M34 -60L46 -60L46 -10L36 -10Z', lw: 1.3 });
    // finial orb + cross on top
    LB.el('circle', { cx: 0, cy: -63.6, r: 4.2, fill: P.gold, stroke: S.line, 'stroke-width': 1.2 }, crown);
    LB.path(crown, 'M-1.4 -67L1.4 -67L1.4 -70L4 -70L4 -72.6L1.4 -72.6L1.4 -75.4L-1.4 -75.4L-1.4 -72.6L-4 -72.6L-4 -70L-1.4 -70Z', { fill: P.gold, stroke: S.line, 'stroke-width': 1 });
    LB.el('circle', { cx: -1.3, cy: -64.8, r: 1.2, fill: P.goldHi, 'data-sil': 'hide' }, crown);
    // fleurs-de-lis and points on the band top
    function fleur(x, y, s) {
      function q(px, py) { return pt([x + px * s, y + py * s]); }
      return 'M' + q(0, -17) + 'C' + q(3.4, -13) + ' ' + q(4, -8) + ' ' + q(2, -3.6) + 'L' + q(-2, -3.6) + 'C' + q(-4, -8) + ' ' + q(-3.4, -13) + ' ' + q(0, -17) + 'Z' +
        'M' + q(1.6, -3.6) + 'C' + q(4.4, -4.6) + ' ' + q(9.6, -6) + ' ' + q(9.4, -10.6) + 'C' + q(9.2, -13.6) + ' ' + q(5.8, -13.6) + ' ' + q(5.4, -11) +
        'C' + q(7.4, -11) + ' ' + q(7.2, -7.8) + ' ' + q(5, -7) + 'C' + q(3.6, -6.2) + ' ' + q(2.6, -5.4) + ' ' + q(1.6, -3.6) + 'Z' +
        'M' + q(-1.6, -3.6) + 'C' + q(-4.4, -4.6) + ' ' + q(-9.6, -6) + ' ' + q(-9.4, -10.6) + 'C' + q(-9.2, -13.6) + ' ' + q(-5.8, -13.6) + ' ' + q(-5.4, -11) +
        'C' + q(-7.4, -11) + ' ' + q(-7.2, -7.8) + ' ' + q(-5, -7) + 'C' + q(-3.6, -6.2) + ' ' + q(-2.6, -5.4) + ' ' + q(-1.6, -3.6) + 'Z' +
        'M' + q(-5.4, -4.2) + 'L' + q(5.4, -4.2) + 'L' + q(4.6, 1) + 'L' + q(-4.6, 1) + 'Z';
    }
    function spike(x, y) { return 'M' + pt([x - 5, y]) + 'L' + pt([x, y - 11]) + 'L' + pt([x + 5, y]) + 'Z'; }
    var fl1 = fleur(-29, -14.5, 1) + fleur(0, -13, 1.1) + fleur(29, -14.5, 1) + spike(-45, -16) + spike(-14.5, -13.4) + spike(14.5, -13.4) + spike(45, -16);
    LB.path(crown, fl1, fl(P.gold));
        LB.path(crown, fl1, ol(1.0));
    var balls = '';
    [[-45, -27.5], [-14.5, -24.9], [14.5, -24.9], [45, -27.5]].forEach(function (b) { balls += 'M' + pt([b[0] - 2.3, b[1]]) + 'a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0Z'; });
    LB.path(crown, balls, { fill: P.gold, stroke: S.line, 'stroke-width': 0.9 });
    // band
    var bandD = 'M-51 0Q0 9 51 0L51 -18Q0 -9 -51 -18Z';
    F.cel(crown, { flat: true, d: bandD, fill: P.gold, shadow: P.goldShadow, shadowD: 'M-52 -5Q0 4 52 -5L52 4L-52 4Z M30 -20L54 -20L54 4L36 4Z',
      hi: P.goldHi, hiD: 'M-48 -15.6Q-10 -8.6 18 -10.8L18 -9.2Q-10 -7 -48 -13.8Z', lw: 1.4 });
    LB.path(crown, 'M-49 -3.5Q0 5.5 49 -3.5', ol(0.8, P.goldLine));
    // jewels: settings + stones + glints
    var jw = [[-38, -6.4, 'g'], [-19, -4.4, 'b'], [0, -3.8, 'r'], [19, -4.4, 'b'], [38, -6.4, 'g']];
    var settingD = '', jB = '', jG = '', jR = '', jHi = '';
    jw.forEach(function (j) {
      var x = j[0], y = j[1];
      settingD += 'M' + pt([x, y - 7.2]) + 'L' + pt([x + 5.4, y]) + 'L' + pt([x, y + 7.2]) + 'L' + pt([x - 5.4, y]) + 'Z';
      var st = j[2] === 'r' ? 'M' + pt([x - 4, y]) + 'a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z' : 'M' + pt([x - 2.6, y]) + 'a2.6 4.4 0 1 0 5.2 0a2.6 4.4 0 1 0 -5.2 0Z';
      if (j[2] === 'b') jB += st; else if (j[2] === 'g') jG += st; else jR += st;
      jHi += 'M' + pt([x - 1.6, y - 1.6]) + 'a1 1.2 0 1 0 2 0a1 1.2 0 1 0 -2 0Z';
    });
    LB.path(crown, settingD, { fill: P.gold, stroke: P.goldLine, 'stroke-width': 0.9 });
    LB.path(crown, jB, { fill: P.jewelBlue, stroke: S.line, 'stroke-width': 0.8 });
    LB.path(crown, jG, { fill: P.jewelGreen, stroke: S.line, 'stroke-width': 0.8 });
    LB.path(crown, jR, { fill: P.jewelRed, stroke: S.line, 'stroke-width': 0.8 });
    LB.path(crown, jHi, fl('#FFFFFF', { 'data-sil': 'hide' }));
    LB.el('ellipse', { cx: 0, cy: -38, rx: 3, ry: 4.4, fill: P.jewelBlue, stroke: S.line, 'stroke-width': 0.8 }, crown);
    LB.el('circle', { cx: -1, cy: -39.5, r: 0.9, fill: '#FFFFFF', 'data-sil': 'hide' }, crown);

    // ---- front ermine collar + red cord tie
    var collarFront = LB.g(leanFront);
    LB.path(collarFront, 'M289 443C296 452 316 452 323 443L324 449C316 459 296 459 288 449Z', { fill: P.teeShadow, stroke: S.line, 'stroke-width': LW.detail });
    ermine(collarFront, [[262, 414], [267, 437], [281, 454], [306, 465], [331, 454], [344, 437], [350, 416]], 21, 41, { side: 1, step: 6, taper: [0.12, 0.12] });
    var cordD = 'M306 465C300 459 292 459 293 465C294 471 302 469 306 466Z M307 465C313 459 321 460 320 466C319 472 311 469 307 466Z' +
      'M304.6 466.5C303 475 300 483 297 491L299.6 491.6C302 484 305 476 306.6 467Z M308 466.5C310 475 313 483 317 490L314.6 491C311.6 484 309 476 307 467Z';
    LB.path(collarFront, cordD, { fill: P.cord, stroke: S.line, 'stroke-width': 1 });
    LB.el('circle', { cx: 306.5, cy: 465.8, r: 2.8, fill: P.cord, stroke: S.line, 'stroke-width': 1 }, collarFront);

    // ================================================================ SCEPTER (front) + fist
    var scFront = LB.g(leanFront);
    // smear ghosts: one path each (shaft + knob in the knob gold reads as a motion blur of the whole prop)
    var ghosts = [0.4, 0.2].map(function (op) {
      return LB.path(scFront, 'M-3.6 -214L-3.6 ' + TIP + 'L3.6 ' + TIP + 'L3.6 -214Z M-13 ' + (-KNOB) + 'a13 13 0 1 0 26 0a13 13 0 1 0 -26 0Z',
        fl('#3A2E1C', { opacity: op, 'data-sil': 'hide' }));
    });
    var scepterF = buildScepter(scFront, true);
    var fist = LB.g(scFront);
    var fistIn = LB.g(fist, { transform: 'scale(1.18)' });
    var fistD = 'M-10.5 -7C-10.8 -11.6 -4.6 -13.4 1.6 -13C8.4 -12.6 12.6 -8.4 12.6 -2.2C12.8 4.4 10.8 10.2 4.6 11.6C-1.6 12.8 -9.2 11 -10.4 5.6Z';
    F.cel(fistIn, { flat: true, d: fistD, fill: P.skin, shadow: P.skinShadow, shadowD: 'M14 -6C10 2 6 8 -4 12L14 14Z', lw: LW.inner });
    LB.path(fistIn, 'M1.2 -4.2C4.6 -3.4 8.6 -3.6 12 -4.8M1.4 1.6C4.8 2.4 8.6 2.2 12.4 1.2M1.6 7.2C4.6 7.8 7.6 7.6 10.6 6.6', ol(0.9, S.lineSoft));
    LB.path(fistIn, 'M-9.6 -8.2C-6 -12.6 4 -13.4 8.6 -9.6C6 -8 0.6 -7.4 -4 -7.2C-6.6 -7.1 -8.6 -7.3 -9.6 -8.2Z', { fill: P.skin, stroke: S.line, 'stroke-width': 1.0 });
    LB.path(fistIn, 'M2.4 5.6C5.6 6.6 8.6 6.6 11.4 5.2', ol(1.8, P.ring, { 'data-sil': 'hide' }));

    // ================================================================ state
    var last = {};
    var M = { root: null, lean: null, head: null, scep: null, crown: chain(T(3, -37), R(-14)) };

    function setT(node, key, m) { var v = ms(m); if (last[key] !== v) { last[key] = v; node.setAttribute('transform', v); } }
    function vis(node, key, on) { if (last[key] !== on) { last[key] = on; LB.show(node, on); } }
    function setD(node, key, d) { if (last[key] !== d) { last[key] = d; node.setAttribute('d', d); } }

    function ik(Sh, H, bend) {
      var dx = H[0] - Sh[0], dy = H[1] - Sh[1], d = Math.hypot(dx, dy);
      var dd = clamp(d, Math.abs(L_UP - L_FORE) + 0.5, L_UP + L_FORE - 0.5);
      var a = Math.atan2(dy, dx), A = Math.acos(clamp((L_UP * L_UP + dd * dd - L_FORE * L_FORE) / (2 * L_UP * dd), -1, 1));
      var ang = a + bend * A;
      return [Sh[0] + L_UP * Math.cos(ang), Sh[1] + L_UP * Math.sin(ang)];
    }
    function qb(a, c, b, k) { var u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; }

    function poseOf(s) {
      // pitch: chin up (+) / down (-); features shift by -pitch * 2.2 units inside the head
      var p = { tilt: 8, pitch: -0.35, lean: 0, grip: GRIP_PHOTO, phi: PHI_PHOTO, front: true };
      var name = s.pose || 'photo';
      if (name === 'raise') {
        var k = clamp(+s.raise || 0, 0, 1);
        p.grip = qb(GRIP_PHOTO, [352, 520], GRIP_RAISE, k);
        p.phi = lerp(PHI_PHOTO, PHI_RAISE, k) - 18 * Math.pow(Math.sin(Math.PI * k), 1.2);
        p.tilt = lerp(8, 2, LB.ease.inOutSine(k));
        p.pitch = lerp(-0.35, 0.7, LB.ease.inOutSine(k));
      } else if (name === 'bonk') {
        var dk = clamp(+s.drop || 0, 0, 1);
        p.grip = [lerp(GRIP_RAISE[0], GRIP_BONK[0], dk), lerp(GRIP_RAISE[1], GRIP_BONK[1], dk)];
        p.phi = lerp(PHI_RAISE, PHI_BONK, dk);
        p.tilt = 2; p.pitch = 0.7;
      } else if (name === 'hide' || name === 'peek') {
        p.front = false;
        p.lean = name === 'peek' ? 15 : 4;
        p.grip = [KNOB_HIDE[0] - KNOB * Math.cos(PHI_HIDE * LB.deg), KNOB_HIDE[1] - KNOB * Math.sin(PHI_HIDE * LB.deg)];
        p.phi = PHI_HIDE;
      }
      return p;
    }

    function update(s) {
      s = s || {};
      var hidden = !!s.hidden;
      vis(root, 'hidden', !hidden);
      if (hidden) { last.state = s; return; }
      var p = poseOf(s);
      var x = s.x != null ? +s.x : FEET[0], y = s.y != null ? +s.y : FEET[1];
      var sc = s.scale != null ? +s.scale : 1, sx = s.sx != null ? +s.sx : 1, sy = s.sy != null ? +s.sy : 1;
      var lean = s.lean != null ? +s.lean : p.lean;
      var tilt = s.headTilt != null ? +s.headTilt : p.tilt;
      var bob = (+s.bob || 0) - (+s.breathe || 0) * 1.6 * (0.5 + 0.5 * LB.loopSin(s.t || 0, 3));
      M.root = chain(T(x, y), R(+s.rot || 0), Sc(sc * sx, sc * sy), T(-FEET[0], -FEET[1]));
      M.lean = chain(T(0, bob), T(HIP[0], HIP[1]), R(lean), T(-HIP[0], -HIP[1]));
      M.head = chain(T(NECK[0], NECK[1]), R(tilt), T(0, FACE_UP));
      setT(root, 'root', M.root);
      setT(leanBack, 'lb', M.lean);
      setT(leanFront, 'lf', M.lean);
      setT(headG, 'head', M.head);
      setT(feat, 'feat', T(0, -p.pitch * 2.2));

      // arm + scepter
      var grip = p.grip.slice();
      var elbow = null;
      if (p.front) {
        elbow = ik(SHOULDER_R, grip, 1);
        if (s.armR && (s.armR.sh || s.armR.el)) {
          var shA = (+s.armR.sh || 0), elA = (+s.armR.el || 0);
          var e2 = ap(chain(T(SHOULDER_R[0], SHOULDER_R[1]), R(shA), T(-SHOULDER_R[0], -SHOULDER_R[1])), elbow);
          var fv = [grip[0] - elbow[0], grip[1] - elbow[1]];
          var fr2 = ap(R(shA + elA), fv);
          elbow = [e2.x, e2.y]; grip = [elbow[0] + fr2.x, elbow[1] + fr2.y];
        }
        var fdx = grip[0] - elbow[0], fdy = grip[1] - elbow[1], fl0 = Math.hypot(fdx, fdy) || 1;
        var cuff = [grip[0] - fdx / fl0 * 12, grip[1] - fdy / fl0 * 12];
        var up = F.tubeD(SHOULDER_R, elbow, 28, 25, -1, 1, true), fore = F.tubeD(elbow, cuff, 25, 19, -1, 1, true);
        setD(armInk, 'ai', up + fore);
        setD(armFill, 'af', up + fore);
        setD(armShade, 'as', limbShadow(SHOULDER_R, elbow, 28, 25) + limbShadow(elbow, cuff, 25, 19));
        var c0 = [cuff[0] - fdx / fl0 * 6, cuff[1] - fdy / fl0 * 6];
        var nx = -fdy / fl0, ny = fdx / fl0;
        var ux = fdx / fl0, uy = fdy / fl0;
        var fp = function (along, across) { return pt([elbow[0] + ux * along + nx * across, elbow[1] + uy * along + ny * across]); };
        var Lf = fl0 - 12;
        setD(armDetail, 'ad', 'M' + pt([c0[0] + nx * 10, c0[1] + ny * 10]) + 'L' + pt([c0[0] - nx * 10, c0[1] - ny * 10]) +
          'M' + fp(Lf * 0.42, 11.5) + 'Q' + fp(Lf * 0.48, 6) + ' ' + fp(Lf * 0.44, 1) +
          'M' + fp(Lf * 0.62, -10.5) + 'Q' + fp(Lf * 0.58, -5) + ' ' + fp(Lf * 0.64, -1) +
          'M' + fp(Lf * 0.2, -12) + 'Q' + fp(Lf * 0.26, -7) + ' ' + fp(Lf * 0.22, -3));
        setD(wristInk, 'wi', F.tubeD(cuff, grip, 12, 13, -1, 1, true));
      }
      vis(armG, 'armv', p.front);
      vis(scFront, 'scf', p.front);
      vis(scBack, 'scb', !p.front);
      var th = p.phi + 90;
      M.scep = chain(T(grip[0], grip[1]), R(th));
      if (p.front) {
        setT(scepterF.g, 'scg', M.scep);
        setT(fist, 'fist', M.scep);
        setT(scepterF.knobShade, 'ksh', chain(T(0, 0), R(-th)));
        setT(scepterF.knobHi, 'khi', R(-th));
        var sm = clamp(+s.smear || 0, 0, 1);
        ghosts.forEach(function (g, i) {
          var on = sm > 0.01;
          vis(g, 'gh' + i, on);
          if (on) {
            var off = (i + 1) * sm;
            setT(g, 'ght' + i, chain(T(grip[0] - 3 * off, grip[1] - 13 * off), R(th - 7 * off)));
          }
        });
      } else {
        setT(scepterB.g, 'scbg', M.scep);
        setT(scepterB.knobShade, 'kshb', R(-th));
        setT(scepterB.knobHi, 'khib', R(-th));
      }
      face.update(s);
      var sil = (+s.silhouette || 0) > 0.5;
      LB.silhouette(root, sil, s.silhouetteColor || '#000');
      vis(drape, 'drape', !sil);
      last.p = p; last.state = s;
    }

    function anchor(name) {
      if (!M.root) update({});
      var base = chain(M.root, M.lean);
      var headM = chain(base, M.head);
      var p = last.p || poseOf({});
      var pitchY = -p.pitch * 2.2;
      switch (name) {
        case 'knob': return ap(chain(base, M.scep), [0, -KNOB]);
        case 'crown': return ap(chain(headM, M.crown), [0, -30]);
        case 'mouth': return ap(headM, [0, 36 + pitchY]);
        case 'temple': return ap(headM, [44, -22 + pitchY]);
        default: return ap(headM, [0, -6]);
      }
    }

    update({});
    return { root: root, update: update, anchor: anchor };
  }

  LB.register('king', { create: create });
})();
