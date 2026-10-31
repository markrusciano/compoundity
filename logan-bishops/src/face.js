/* Logan Bishops: shared anime face kit (LB.face) and style constants (LB.style).
 * Owned by the lead character designer. See docs/STYLE.md for how to use it. */
(function () {
  'use strict';
  var LB = window.LB;

  function n2(v) { return Math.round(v * 100) / 100; }
  function pt(p) { return n2(p[0]) + ' ' + n2(p[1]); }
  function lerp(a, b, k) { return a + (b - a) * k; }

  // ------------------------------------------------------------------ style bible constants
  var S = (LB.style = {
    // ink
    line: '#2A1B16',        // main outline: warm near-black
    lineSoft: '#6A4333',    // soft interior lines on skin (lid crease, lip shadow)
    lineCloth: '#3A2620',   // fold and seam lines on fabric
    lw: { outer: 2.4, inner: 1.7, detail: 1.1, fine: 0.75 },
    // light: key light is the globe lamp, upper-left. Shadows fall on the lower-right of every form.
    light: { x: -0.6, y: -0.8 },
    shadowDir: { x: 0.6, y: 0.8 },
    // eyes and face
    eyeWhite: '#FCFAF6', eyeShade: '#D9CFE2', catchlight: '#FFFFFF',
    crease: '#9C6650',
    mouthIn: '#5A1E28', tongue: '#C65662', lipShadow: '#B97563',
    sweat: '#CDEEFF', sweatShade: '#93CBEF', sweatLine: '#3A76AC',
    blush: '#EF8C93', blushLine: '#D9606E',
    skin: '#F2C9AE', skinShadow: '#DBA185',
    palette: {
      king: {
        skin: '#F2C9AE', skinShadow: '#DBA185', lip: '#D98C84',
        hair: '#6B4A33', hairShadow: '#46301F', hairShine: '#94704F',
        iris: '#7A5536', irisDark: '#3E2918', irisLight: '#B98E5E',
        brow: '#4A3122', mustache: '#6B4A33', mustacheShadow: '#46301F',
        cape: '#B3141C', capeShadow: '#6E0A10', capeSheen: '#D8262C', lining: '#8E0E16', liningShadow: '#5E070D',
        ermine: '#F4F1EA', ermineShadow: '#CFC6B8', ermineSpot: '#141414',
        crown: '#A0121A', crownShadow: '#650A10', crownSheen: '#CC2A32',
        gold: '#E3B23C', goldShadow: '#A8781E', goldHi: '#FFF1B0', goldLine: '#5E3F0C',
        jewelBlue: '#2C5BD0', jewelGreen: '#14936A', jewelRed: '#D3263A',
        jacket: '#B9A07A', jacketShadow: '#8C7551', jacketSeam: '#6F5A3C',
        tee: '#6B4A36', teeShadow: '#4B3223', teePrint: '#E9A35A',
        jeans: '#2B3448', jeansShadow: '#1A2030', jeansFade: '#36415B', cuff: '#4A5878', stitch: '#C98A3C', selvedge: '#EDE7DA',
        sock: '#232328', sockShadow: '#101013', sockHi: '#4A4A55',
        shaft: '#141414', shaftHi: '#55555C', knob: '#E8B530', knobShadow: '#A8781E', knobHi: '#FFF6C8',
        ring: '#C9CDD3', cord: '#C0121C',
      },
      friar: {
        skin: '#F2C9AE', skinShadow: '#DBA185', lip: '#D88A82',
        hair: '#5A4030', hairShadow: '#3B291E', hairShine: '#7E5E48',
        beard: '#664A36', beardShadow: '#47321F',   // a touch lighter than the hair: short, close-trimmed (photo)
        iris: '#5D7486', irisDark: '#2F3E4C', irisLight: '#93AABB', brow: '#3F2C21',
        robe: '#C9A27E', robeShadow: '#9E7656', robeMottle: '#DDBB97',
        tee: '#1C1C1F', teeShadow: '#0C0C0E',
        lens: '#EAF3F8', lensShine: '#FFFFFF', frame: '#B8BCC2',
        sock: '#8C8C8C', sockShadow: '#696969',
      },
      bishop: {
        skin: '#F2C7AC', skinShadow: '#DA9F84', lip: '#D88A82',
        hair: '#8A4E2E', hairShadow: '#5E321B', hairShine: '#B07148',
        mustache: '#8A4E2E', mustacheShadow: '#5E321B',
        iris: '#5A86A6', irisDark: '#2C4A62', irisLight: '#9CC2DA', brow: '#6E3C22',
        mitre: '#F3EEDC', mitreShadow: '#CFC4A6', mitreGold: '#D4A84A', mitreGoldShadow: '#9E7728',
        satin: '#C8161E', satinShadow: '#7A0A10', satinHi: '#F2666C',
        stole: '#D9B25B', stoleShadow: '#A7823A', collar: '#F7F5EE', collarShadow: '#D2CDC0',
        pants: '#3A3B40', pantsShadow: '#25262A', sock: '#8C8C8C', sockShadow: '#686868', sockKnit: '#A8A8A8',
        slide: '#23304A', slideShadow: '#141C2D',
      },
    },
  });

  // ------------------------------------------------------------------ geometry helpers
  // Catmull-Rom spline through points -> cubic Bezier segments (string without the leading M).
  function crSeg(P, closed) {
    var n = P.length, s = '', i, last = closed ? n : n - 1;
    function at(k) { return closed ? P[(k + n) % n] : P[Math.max(0, Math.min(n - 1, k))]; }
    for (i = 0; i < last; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      s += 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(p2);
    }
    return s;
  }
  // smooth path through points
  function crD(P, closed) { return 'M' + pt(P[0]) + crSeg(P, closed) + (closed ? 'Z' : ''); }
  // sample a Catmull-Rom spline densely (for tapering)
  function crSample(P, per) {
    per = per || 6;
    var n = P.length, out = [], i, j;
    function at(k) { return P[Math.max(0, Math.min(n - 1, k))]; }
    for (i = 0; i < n - 1; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (j = 0; j < per; j++) {
        var t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (c) {
          return 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
        }));
      }
    }
    out.push(P[n - 1].slice());
    return out;
  }
  // Tapered brush stroke along a smooth centerline. W: widths spaced evenly along the arc length.
  // Returns a closed filled path; ends are pointed where width is 0 and cut square otherwise.
  function taperD(P, W, per) {
    var C = crSample(P, per || 5), N = C.length, len = [0], i;
    for (i = 1; i < N; i++) len.push(len[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
    var total = len[N - 1] || 1, L = [], R = [];
    for (i = 0; i < N; i++) {
      var a = C[Math.max(0, i - 1)], b = C[Math.min(N - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
      var nx = -dy / dl, ny = dx / dl;
      var u = (len[i] / total) * (W.length - 1), k = Math.min(W.length - 2, Math.floor(u));
      var w = lerp(W[k], W[k + 1], u - k) / 2;
      L.push([C[i][0] + nx * w, C[i][1] + ny * w]);
      R.push([C[i][0] - nx * w, C[i][1] - ny * w]);
    }
    R.reverse();
    return 'M' + pt(L[0]) + crSeg(L, false) + 'L' + pt(R[0]) + crSeg(R, false) + 'Z';
  }
  // A band across a tapered tube from A to B (widths wA, wB). f0..f1 in -1..1 picks the band across the width
  // (-1 = left side when walking A->B, +1 = right side). caps: round caps at both ends when the band is the full tube
  // (sweep 1, so they bulge OUTWARD: two tubes sharing a joint overlap into one rounded elbow with no notch).
  function tubeD(A, B, wA, wB, f0, f1, caps) {
    if (f0 == null) { f0 = -1; f1 = 1; }
    var dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1;
    var nx = -dy / d, ny = dx / d; // right-hand normal (screen coords, y down)
    function P(base, w, f) { return [base[0] + nx * w / 2 * f, base[1] + ny * w / 2 * f]; }
    var a0 = P(A, wA, f0), a1 = P(A, wA, f1), b0 = P(B, wB, f0), b1 = P(B, wB, f1);
    if (caps && f0 === -1 && f1 === 1) {
      return 'M' + pt(a0) + 'L' + pt(b0) + 'A' + n2(wB / 2) + ' ' + n2(wB / 2) + ' 0 0 1 ' + pt(b1) +
        'L' + pt(a1) + 'A' + n2(wA / 2) + ' ' + n2(wA / 2) + ' 0 0 1 ' + pt(a0) + 'Z';
    }
    return 'M' + pt(a0) + 'L' + pt(b0) + 'L' + pt(b1) + 'L' + pt(a1) + 'Z';
  }
  // A pointed hair lock: base from b0 to b1, tip at t, bowed sideways by `bend` (fraction of length).
  function lockD(b0, b1, t, bend) {
    bend = bend || 0;
    var mx = (b0[0] + b1[0]) / 2, my = (b0[1] + b1[1]) / 2;
    var dx = t[0] - mx, dy = t[1] - my, nx = -dy * bend, ny = dx * bend;
    var c0 = [lerp(b0[0], t[0], 0.55) + nx, lerp(b0[1], t[1], 0.55) + ny];
    var c1 = [lerp(b1[0], t[0], 0.55) + nx, lerp(b1[1], t[1], 0.55) + ny];
    return 'M' + pt(b0) + 'Q' + pt(c0) + ' ' + pt(t) + 'Q' + pt(c1) + ' ' + pt(b1) + 'Z';
  }
  // standard ink attributes for an outline-only path
  function ol(lw, color, extra) {
    var a = { fill: 'none', stroke: color || S.line, 'stroke-width': lw == null ? S.lw.outer : lw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return a;
  }
  // fill-only attributes
  function fl(color, extra) {
    var a = { fill: color, stroke: 'none' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return a;
  }
  // Cel-shaded part: flat base, one shadow tone clipped to the base, optional highlight, then the ink outline on top.
  // spec: { d, fill, shadowD, shadow, hiD, hi, lw, line, noLine, flat }
  //   -> { g, base, shadow, hi, outline, clip, clipId, inner, setD(d, shadowD, hiD) }
  // flat: true puts the parts straight into parent (saves a <g>). inner is a clipped group, created on first use,
  // for extra details (folds, seams) that must stay inside the shape; it sits just under the outline.
  function cel(parent, spec) {
    var g = spec.flat ? parent : LB.g(parent);
    var id = LB.uid('lbcel');
    var clip = LB.el('clipPath', { id: id }, g);
    var clipP = LB.path(clip, spec.d);
    var cp = 'url(#' + id + ')';
    var base = LB.path(g, spec.d, fl(spec.fill));
    var shadow = spec.shadow ? LB.path(g, spec.shadowD || 'M0 0', fl(spec.shadow, { 'clip-path': cp })) : null;
    var hi = spec.hi ? LB.path(g, spec.hiD || 'M0 0', fl(spec.hi, { 'data-sil': 'hide', 'clip-path': cp })) : null;
    var innerG = null;
    var outline = spec.noLine ? null : LB.path(g, spec.d, ol(spec.lw, spec.line));
    return {
      g: g, base: base, shadow: shadow, hi: hi, outline: outline, clip: clipP, clipId: id,
      get inner() {
        if (!innerG) { innerG = LB.el('g', { 'clip-path': cp }); g.insertBefore(innerG, outline || null); }
        return innerG;
      },
      setD: function (d, sd, hd) {
        if (d) { clipP.setAttribute('d', d); base.setAttribute('d', d); if (outline) outline.setAttribute('d', d); }
        if (sd && shadow) shadow.setAttribute('d', sd);
        if (hd && hi) hi.setAttribute('d', hd);
      },
    };
  }

  // Band along a smooth centerline: w is a number or a function of t (0..1 along the line); f0..f1 picks the band across
  // the width (-1..1, -1 = left of the walking direction). ribbonD(pts, w) is the full strip (sashes, stoles, trims, straps).
  function ribbonD(P, w, f0, f1, per) {
    if (f0 == null) { f0 = -1; f1 = 1; }
    var C = P.length > 2 || per ? crSample(P, per || 7) : P, L = [], Rr = [], N = C.length;
    for (var i = 0; i < N; i++) {
      var a = C[Math.max(0, i - 1)], b = C[Math.min(N - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
      var ww = typeof w === 'function' ? w(i / (N - 1)) : w;
      L.push([C[i][0] + nx * ww / 2 * f0, C[i][1] + ny * ww / 2 * f0]);
      Rr.push([C[i][0] + nx * ww / 2 * f1, C[i][1] + ny * ww / 2 * f1]);
    }
    Rr.reverse();
    return 'M' + pt(L[0]) + crSeg(L, false) + 'L' + pt(Rr[0]) + crSeg(Rr, false) + 'Z';
  }
  // The shadow band of a tube A->B: the 35% of its width that faces away from the key light (lower-right).
  function tubeShadeD(A, B, wA, wB) {
    var dx = B[0] - A[0], dy = B[1] - A[1];
    var side = (-dy) * S.shadowDir.x + dx * S.shadowDir.y > 0 ? 1 : -1;
    return side > 0 ? tubeD(A, B, wA, wB, 0.3, 1) : tubeD(A, B, wA, wB, -1, -0.3);
  }
  // Two-segment limb (sleeve, arm, leg) with a seamless two-pass outline: a fat ink pass of the union, then the fill,
  // then one shadow band per segment. limb(parent, { fill, shadow, lw, line }) -> { g, ink, base, shade, set(A, B, C, wA, wB, wC) }
  // C may be null for a single segment. Call set() from update(); it only touches the DOM when the geometry changed.
  function limb(parent, o) {
    o = o || {};
    var g = LB.g(parent);
    var line = o.line || S.line;
    var ink = LB.path(g, 'M0 0', { fill: line, stroke: line, 'stroke-width': (o.lw || S.lw.outer) * 2, 'stroke-linejoin': 'round' });
    var base = LB.path(g, 'M0 0', fl(o.fill || '#999999'));
    var shade = LB.path(g, 'M0 0', fl(o.shadow || '#666666'));
    var lastD = '';
    return {
      g: g, ink: ink, base: base, shade: shade,
      set: function (A, B, C, wA, wB, wC) {
        var d = tubeD(A, B, wA, wB, -1, 1, true) + (C ? tubeD(B, C, wB, wC, -1, 1, true) : '');
        if (d === lastD) return;
        lastD = d;
        ink.setAttribute('d', d);
        base.setAttribute('d', d);
        shade.setAttribute('d', tubeShadeD(A, B, wA, wB) + (C ? tubeShadeD(B, C, wB, wC) : ''));
      },
    };
  }

  // ------------------------------------------------------------------ head
  // Adult male anime head in face-local coords (origin = midpoint between the eyes, units = world units).
  // opts: { w (face width at the cheekbones, 84), top (-60), chin (53), cheekY (2), jawY (34), jaw (0..1 squareness, 0.5),
  //         chinW (18), earY (2), earH (24), earW (9), ears (true), neckW (36), neckTop (26), neckBot (100),
  //         skin, skinShadow, line, lw, shadow (true) }
  // The King uses { w: 88, top: -60, chin: 53, cheekY: 3, jawY: 31, jaw: 0.6, chinW: 22, earY: 4, earH: 25, earW: 9.5, neckW: 34, neckBot: 96 }.
  // returns { g, faceD, clipId, neck, earL, earR, face, P: {chin, jawL, jawR, cheekL, cheekR, earL, earR, top} }
  function head(parent, o) {
    o = o || {};
    var W = (o.w || 84) / 2, top = o.top != null ? o.top : -60, chin = o.chin != null ? o.chin : 53;
    var cheekY = o.cheekY != null ? o.cheekY : 2, jawY = o.jawY != null ? o.jawY : 34, jaw = o.jaw != null ? o.jaw : 0.5;
    var chinW = o.chinW != null ? o.chinW : 18, earY = o.earY != null ? o.earY : 2, earH = o.earH || 24, earW = o.earW || 9;
    var neckW = o.neckW || 36, neckTop = o.neckTop != null ? o.neckTop : 26, neckBot = o.neckBot != null ? o.neckBot : 100;
    var skin = o.skin || S.skin, sh = o.skinShadow || S.skinShadow, line = o.line || S.line, lw = o.lw || S.lw.outer;
    var g = LB.g(parent, { class: 'lb-head' });
    var jx = W * (0.72 + 0.16 * jaw), cx = chinW / 2;
    var JC = [cx - jx, chin - 1.5 - jawY];
    // right half as cubic segments from the top to the chin bottom
    var segs = [
      [[W * 0.62, top], [W * 0.97, top * 0.72], [W * 0.985, top * 0.36]],
      [[W * 1.0, top * 0.12], [W * 1.01, cheekY - 6], [W, cheekY]],
      [[W * 0.995, cheekY + (jawY - cheekY) * 0.45], [jx + (W - jx) * (0.42 - 0.3 * jaw), jawY - 7 + 4 * jaw], [jx, jawY]],
      [[jx + JC[0] * (0.3 - 0.12 * jaw) + 1.2, jawY + JC[1] * (0.3 + 0.12 * jaw) + 0.6], [jx + JC[0] * 0.8, jawY + JC[1] * 0.92 + 0.3], [cx, chin - 1.5]],
      [[cx * 0.55, chin + 0.2], [cx * 0.2, chin], [0, chin]],
    ];
    function mir(p) { return [-p[0], p[1]]; }
    var d = 'M' + pt([0, top]);
    segs.forEach(function (s) { d += 'C' + pt(s[0]) + ' ' + pt(s[1]) + ' ' + pt(s[2]); });
    var prev = [[0, top]].concat(segs.map(function (s) { return s[2]; }));
    for (var i = segs.length - 1; i >= 0; i--) {
      d += 'C' + pt(mir(segs[i][1])) + ' ' + pt(mir(segs[i][0])) + ' ' + pt(mir(prev[i]));
    }
    d += 'Z';
    // neck (behind the face)
    var neck = LB.g(g, { class: 'lb-neck' });
    var nd = 'M' + pt([-neckW / 2, neckTop]) + 'C' + pt([-neckW / 2, neckTop + 30]) + ' ' + pt([-neckW / 2 - 3, neckBot - 20]) + ' ' + pt([-neckW / 2 - 5, neckBot]) +
      'L' + pt([neckW / 2 + 5, neckBot]) + 'C' + pt([neckW / 2 + 3, neckBot - 20]) + ' ' + pt([neckW / 2, neckTop + 30]) + ' ' + pt([neckW / 2, neckTop]) + 'Z';
    LB.path(neck, nd, fl(skin));
    LB.path(neck, 'M' + pt([-neckW / 2 - 1, neckTop]) + 'L' + pt([neckW / 2 + 1, neckTop]) + 'C' + pt([neckW / 2, neckTop + 30]) + ' ' +
      pt([neckW / 2 + 3, neckBot - 20]) + ' ' + pt([neckW / 2 + 5, neckBot]) + 'L' + pt([neckW / 2 - 4, neckBot]) +
      'C' + pt([neckW / 2 - 5, neckBot - 25]) + ' ' + pt([neckW / 2 - 7, chin + 26]) + ' ' + pt([neckW / 2 - 7, chin + 15]) +
      'Q' + pt([0, chin + 10]) + ' ' + pt([-neckW / 2 - 1, chin + 6]) + 'Z', fl(sh));
    LB.path(neck, 'M' + pt([-neckW / 2, neckTop]) + 'C' + pt([-neckW / 2, neckTop + 30]) + ' ' + pt([-neckW / 2 - 3, neckBot - 20]) + ' ' + pt([-neckW / 2 - 5, neckBot]) +
      'M' + pt([neckW / 2, neckTop]) + 'C' + pt([neckW / 2, neckTop + 30]) + ' ' + pt([neckW / 2 + 3, neckBot - 20]) + ' ' + pt([neckW / 2 + 5, neckBot]), ol(lw * 0.85, line));
    // ears (behind the face outline)
    function ear(sx) {
      var eg = LB.g(g, { class: 'lb-ear' });
      var X = function (v) { return sx * v; };
      var ed = 'M' + pt([X(W - 3), earY - earH * 0.46]) +
        'C' + pt([X(W + earW * 0.7), earY - earH * 0.72]) + ' ' + pt([X(W + earW * 1.15), earY - earH * 0.2]) + ' ' + pt([X(W + earW * 0.8), earY + earH * 0.16]) +
        'C' + pt([X(W + earW * 0.55), earY + earH * 0.46]) + ' ' + pt([X(W + earW * 0.15), earY + earH * 0.58]) + ' ' + pt([X(W - 3), earY + earH * 0.5]) + 'Z';
      LB.path(eg, ed, fl(skin));
      if (sx > 0) LB.path(eg, 'M' + pt([X(W + earW * 0.6), earY - earH * 0.1]) + 'C' + pt([X(W + earW * 0.85), earY + earH * 0.15]) + ' ' +
        pt([X(W + earW * 0.4), earY + earH * 0.48]) + ' ' + pt([X(W - 2), earY + earH * 0.5]) + 'L' + pt([X(W - 2), earY]) + 'Z', fl(sh));
      LB.path(eg, ed, ol(lw * 0.85, line));
      LB.path(eg, 'M' + pt([X(W + earW * 0.55), earY - earH * 0.3]) + 'C' + pt([X(W + earW * 0.1), earY - earH * 0.3]) + ' ' +
        pt([X(W + earW * 0.05), earY + earH * 0.05]) + ' ' + pt([X(W + earW * 0.45), earY + earH * 0.22]), ol(S.lw.detail, line));
      return eg;
    }
    var earL = o.ears === false ? null : ear(-1);
    var earR = o.ears === false ? null : ear(1);
    // face: base, cel shadow (lower-right), outline
    var shD = 'M' + pt([W * 0.66, top * 0.75]) + 'C' + pt([W * 0.6, top * 0.3]) + ' ' + pt([W * 0.74, cheekY - 12]) + ' ' + pt([W * 0.7, cheekY + 2]) +
      'C' + pt([W * 0.66, jawY - 10]) + ' ' + pt([W * 0.42, jawY + 2]) + ' ' + pt([W * 0.16, chin - 5]) +
      'C' + pt([W * 0.05, chin - 2]) + ' ' + pt([-W * 0.15, chin - 1]) + ' ' + pt([-W * 0.4, chin + 4]) +
      'L' + pt([-W * 0.4, chin + 20]) + 'L' + pt([W * 1.6, chin + 20]) + 'L' + pt([W * 1.6, top]) + 'Z';
    var face = cel(g, { flat: true, d: d, fill: skin, shadow: o.shadow === false ? null : sh, shadowD: shD, lw: lw, line: line });
    return {
      g: g, faceD: d, clipId: face.clipId, face: face, neck: neck, earL: earL, earR: earR,
      P: { top: [0, top], chin: [0, chin], jawL: [-jx, jawY], jawR: [jx, jawY], cheekL: [-W, cheekY], cheekR: [W, cheekY],
        earL: [-(W + earW * 0.5), earY], earR: [W + earW * 0.5, earY] },
    };
  }

  // ------------------------------------------------------------------ expressions
  var EYES = ['deadpan', 'closed', 'dot', 'hero', 'droop'];
  var BROWS = ['flat', 'up', 'down', 'oneUp', 'sad'];
  var MOUTHS = ['closed', 'o', 'whistle', 'smirk', 'frown'];
  function pick(list, v) { return list.indexOf(v) >= 0 ? v : list[0]; }

  var DEF = {
    eyeSpacing: 38, eyeW: 22, eyeH: 11.5, irisColor: '#6E4E33', irisDark: null, irisLight: null, pupil: null,
    lashColor: null, browColor: '#4A3122', browW: null, browT: null, browY: -11, mouthY: 33, mouthW: 16,
    mustache: false, lids: 'normal', skin: null, skinShadow: null, sweatAt: { x: 40, y: -20 }, cheekY: 14,
    nose: true, noseY: 19, lipColor: null, oneUpSide: 1, faceClip: null, sweatScale: 1, gazeUp: 0.1,
  };

  // LB.face.create(parentG, opts) -> { g, update(state), layers: { eyes, brows, mouth, nose, sweat, blush }, opts }
  // Face-local origin (0,0) = midpoint between the eyes, +x = viewer's right, world units. Builds every expression once;
  // update() only toggles visibility and swaps prebuilt path data, so it is cheap to call every frame.
  // opts (all optional): eyeSpacing 38, eyeW 22, eyeH 11.5, irisColor, irisDark, irisLight, pupil, lashColor, browColor,
  //   browW (1.12 eyeW), browT (0.17 eyeW), browY -11, mouthY 33, mouthW 16, mustache false, lids 'normal'|'heavy',
  //   skin, skinShadow, sweatAt {x: 40, y: -20}, sweatScale 1, cheekY 14, nose true, noseY 19, lipColor null,
  //   oneUpSide 1 (which brow 'oneUp' raises: 1 = screen-right), faceClip (head().clipId, enables shadowFace),
  //   gazeUp 0.1 (iris travel per unit of upward gaze, in eyeH; downward is 0.24. Small, so an upward glance stays a sideways
  //   slide under the heavy deadpan lid instead of rolling the iris out of sight).
  // state: eyes, brows, mouth (names in EYES/BROWS/MOUTHS, unknown -> default), gazeX, gazeY (-1..1), sweat, blush,
  //   shadowFace (0..1), headTurn (-1..1).
  function create(parentG, opts) {
    var o = {}, k;
    for (k in DEF) o[k] = DEF[k];
    if (opts) for (k in opts) if (opts[k] != null) o[k] = opts[k];
    var w = o.eyeW, h = o.eyeH, sp = o.eyeSpacing;
    var lash = o.lashColor || S.line;
    var skinSh = o.skinShadow || S.skinShadow;
    var iris = o.irisColor, irisDark = o.irisDark || LB.shade(iris, -0.45), irisLight = o.irisLight || LB.shade(iris, 0.35);
    var pupilC = o.pupil || LB.shade(iris, -0.75);
    var heroIris = LB.lerpColor(iris, irisLight, 0.55), heroLight = LB.lerpColor(irisLight, '#FFFFFF', 0.55);
    var bw = o.browW || w * 1.12, bt = o.browT || w * 0.17;
    var mw = o.mouthW, my = o.mouthY, md = o.mustache ? 1 : 0;
    var heavy = o.lids === 'heavy';

    var g = LB.g(parentG, { class: 'lb-face' });
    var shadeG = LB.g(g);            // shadowFace band (under the features)
    var blushG = LB.g(g, { 'data-sil': 'hide' });
    var noseG = LB.g(g);
    var mouthG = LB.g(g);
    var eyesG = LB.g(g);
    var browsG = LB.g(g);
    var sweatG = LB.g(g);

    // ---- shadowFace
    var shadeBand = null;
    if (o.faceClip) {
      var sg = LB.g(shadeG, { 'clip-path': 'url(#' + o.faceClip + ')', 'data-sil': 'hide' });
      shadeBand = LB.path(sg, 'M' + pt([-80, o.browY - 30]) + 'L' + pt([80, o.browY - 30]) + 'L' + pt([80, h * 0.9]) +
        'C' + pt([30, h * 1.6]) + ' ' + pt([-30, h * 1.6]) + ' ' + pt([-80, h * 0.9]) + 'Z', fl('#26132E', { opacity: 0 }));
    }

    // ---- blush (hatching)
    var bl = '', bx;
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 4; i++) {
        bx = s * (sp / 2 + 1) + (i - 1.5) * 3.1;
        bl += 'M' + pt([bx + 1.4, o.cheekY - 2.4]) + 'L' + pt([bx - 1.4, o.cheekY + 2.4]);
      }
    });
    LB.path(blushG, [-1, 1].map(function (s) { var cx = s * (sp / 2 + 1); return 'M' + pt([cx - 8.5, o.cheekY]) + 'a8.5 3.4 0 1 0 17 0a8.5 3.4 0 1 0 -17 0Z'; }).join(''),
      fl(S.blush, { opacity: 0.45 }));
    LB.path(blushG, bl, ol(0.9, S.blushLine));

    // ---- nose: tiny wedge on the shadow side + nostril tick
    if (o.nose) {
      var ny = o.noseY;
      LB.path(noseG, 'M' + pt([0.4, ny - 9]) + 'C' + pt([1.6, ny - 5]) + ' ' + pt([3.4, ny - 1.2]) + ' ' + pt([3.2, ny + 0.4]) +
        'C' + pt([2.2, ny + 1.4]) + ' ' + pt([0.6, ny + 1.5]) + ' ' + pt([-0.6, ny + 1.1]) + 'C' + pt([1.0, ny + 0.2]) + ' ' + pt([1.6, ny - 3.5]) + ' ' + pt([0.4, ny - 9]) + 'Z', fl(skinSh));
      LB.path(noseG, taperD([[-1.6, ny + 1.0], [0.6, ny + 1.6], [2.8, ny + 0.6]], [0.2, 1.1, 0.3]), fl(S.lineSoft));
    }

    // ---- mouths (prebuilt, one visible)
    var mouths = {};
    (function () {
      var y = my;
      var mc = LB.g(mouthG);
      if (o.lipColor) LB.path(mc, 'M' + pt([-0.3 * mw, y + 1.1]) + 'C' + pt([-0.18 * mw, y + 4.2]) + ' ' + pt([0.18 * mw, y + 4.2]) + ' ' + pt([0.3 * mw, y + 1.1]) +
        'C' + pt([0.12 * mw, y + 1.7]) + ' ' + pt([-0.12 * mw, y + 1.7]) + ' ' + pt([-0.3 * mw, y + 1.1]) + 'Z', fl(o.lipColor));
      LB.path(mc, taperD([[-0.5 * mw, y + 0.7], [-0.22 * mw, y], [0.2 * mw, y], [0.5 * mw, y + 0.7]], [0.3, 1.4, 1.5, 1.3, 0.3]), fl(lash));
      LB.path(mc, taperD([[-0.16 * mw, y + 4.6], [0, y + 5.1], [0.16 * mw, y + 4.6]], [0.1, 0.9, 0.1]), fl(S.lipShadow));
      mouths.closed = mc;

      var mo = LB.g(mouthG);
      var oy = y + md * 2.6, ory = 3.4 + md * 0.6;
      LB.el('ellipse', { cx: 0, cy: oy, rx: 2.8, ry: ory, fill: S.mouthIn }, mo);
      LB.el('ellipse', { cx: 0.3, cy: oy + ory * 0.5, rx: 1.7, ry: ory * 0.38, fill: S.tongue }, mo);
      LB.el('ellipse', { cx: 0, cy: oy, rx: 2.8, ry: ory, fill: 'none', stroke: lash, 'stroke-width': 1.25 }, mo);
      mouths.o = mo;

      var mwh = LB.g(mouthG);
      var wy = y + 1.0 + md * 2.4, wx = -0.8;
      var lipC = o.lipColor || LB.shade(o.skin || S.skin, -0.12);
      var lipD = 'M' + pt([wx - 4.2, wy]) + 'C' + pt([wx - 4.4, wy - 3.2]) + ' ' + pt([wx - 1.6, wy - 3.9]) + ' ' + pt([wx, wy - 3.6]) +
        'C' + pt([wx + 1.8, wy - 3.9]) + ' ' + pt([wx + 4.5, wy - 3.0]) + ' ' + pt([wx + 4.2, wy + 0.2]) +
        'C' + pt([wx + 4.0, wy + 3.4]) + ' ' + pt([wx + 1.6, wy + 4.0]) + ' ' + pt([wx, wy + 3.8]) +
        'C' + pt([wx - 1.8, wy + 4.0]) + ' ' + pt([wx - 4.0, wy + 3.2]) + ' ' + pt([wx - 4.2, wy]) + 'Z';
      LB.path(mwh, lipD, fl(lipC));
      LB.path(mwh, 'M' + pt([wx + 3.2, wy - 1.0]) + 'C' + pt([wx + 4.0, wy + 1.5]) + ' ' + pt([wx + 2.5, wy + 3.4]) + ' ' + pt([wx, wy + 3.4]) +
        'C' + pt([wx + 2.0, wy + 2.3]) + ' ' + pt([wx + 3.1, wy + 1.0]) + ' ' + pt([wx + 3.2, wy - 1.0]) + 'Z', fl(S.lipShadow));
      LB.path(mwh, lipD, ol(1.1, lash));
      LB.el('ellipse', { cx: wx + 0.1, cy: wy + 0.1, rx: 1.25, ry: 1.5, fill: S.mouthIn }, mwh);
      LB.path(mwh, 'M' + pt([wx - 6.0, wy - 1.6]) + 'Q' + pt([wx - 6.8, wy]) + ' ' + pt([wx - 6.0, wy + 1.6]) +
        'M' + pt([wx + 6.0, wy - 1.6]) + 'Q' + pt([wx + 6.8, wy]) + ' ' + pt([wx + 6.0, wy + 1.6]), ol(0.75, S.lineSoft));
      mouths.whistle = mwh;

      var ms = LB.g(mouthG);
      LB.path(ms, taperD([[-0.45 * mw, y + 0.9], [-0.1 * mw, y + 0.7], [0.25 * mw, y - 0.3], [0.5 * mw, y - 2.1]], [0.3, 1.3, 1.5, 0.6]), fl(lash));
      LB.path(ms, taperD([[0.5 * mw + 0.6, y - 3.4], [0.58 * mw + 0.6, y - 1.6], [0.52 * mw + 0.6, y + 0.2]], [0.1, 0.8, 0.1]), fl(S.lineSoft));
      if (o.lipColor) LB.path(ms, 'M' + pt([-0.24 * mw, y + 1.8]) + 'C' + pt([-0.1 * mw, y + 4.2]) + ' ' + pt([0.22 * mw, y + 3.6]) + ' ' + pt([0.3 * mw, y + 0.9]) +
        'C' + pt([0.12 * mw, y + 2.0]) + ' ' + pt([-0.1 * mw, y + 2.2]) + ' ' + pt([-0.24 * mw, y + 1.8]) + 'Z', fl(o.lipColor));
      mouths.smirk = ms;

      var mf = LB.g(mouthG);
      LB.path(mf, taperD([[-0.42 * mw, y + 2.0], [-0.15 * mw, y - 0.1], [0.15 * mw, y - 0.1], [0.42 * mw, y + 2.0]], [0.3, 1.4, 1.5, 1.4, 0.3]), fl(lash));
      LB.path(mf, taperD([[-0.12 * mw, y + 4.8], [0, y + 5.3], [0.12 * mw, y + 4.8]], [0.1, 0.8, 0.1]), fl(S.lipShadow));
      mouths.frown = mf;
      for (var m in mouths) LB.show(mouths[m], false);
    })();

    // ---- eyes
    var irx = 0.25 * w, iry = 0.5 * h, icy = 0.06 * h;
    var lashT = 2.7 * (w / 18) * (heavy ? 1.12 : 1);
    function lidShape(kind) {
      // returns { T: top edge points (u coords, inner -> outer), B: bottom edge (outer -> inner), lashW, catchY }
      var lid, T, B;
      if (kind === 'dot') {
        T = [[-0.47 * w, 0.12 * h], [-0.32 * w, -0.42 * h], [0.02 * w, -0.56 * h], [0.34 * w, -0.42 * h], [0.5 * w, 0.08 * h]];
        B = [[0.5 * w, 0.08 * h], [0.33 * w, 0.5 * h], [0, 0.6 * h], [-0.33 * w, 0.48 * h], [-0.47 * w, 0.12 * h]];
        return { T: T, B: B };
      }
      if (kind === 'droop') {
        lid = icy + (heavy ? 0.16 : 0.08) * h - lashT * 0.45;
        T = [[-0.5 * w, 0.2 * h], [-0.4 * w, lid - 0.06 * h], [-0.1 * w, lid - 0.05 * h], [0.24 * w, lid + 0.04 * h], [0.44 * w, lid + 0.16 * h], [0.54 * w, 0.36 * h]];
        B = [[0.54 * w, 0.36 * h], [0.3 * w, 0.53 * h], [-0.05 * w, 0.57 * h], [-0.35 * w, 0.45 * h], [-0.5 * w, 0.2 * h]];
        return { T: T, B: B, flick: [0.6 * w, 0.42 * h] };
      }
      // deadpan / hero: the lash's LOWER edge sits across the top third of the iris (heavy: nearly half)
      lid = icy - iry * (heavy ? 0.08 : 0.34) - lashT * 0.42;
      T = [[-0.5 * w, 0.17 * h], [-0.41 * w, lid + 0.05 * h], [-0.12 * w, lid], [0.24 * w, lid - 0.004 * h], [0.43 * w, lid + 0.07 * h], [0.53 * w, 0.25 * h]];
      B = [[0.53 * w, 0.25 * h], [0.3 * w, 0.5 * h], [-0.05 * w, 0.56 * h], [-0.35 * w, 0.43 * h], [-0.5 * w, 0.17 * h]];
      return { T: T, B: B, flick: [0.62 * w, 0.2 * h] };
    }
    var SH = { deadpan: lidShape('deadpan'), droop: lidShape('droop'), dot: lidShape('dot') };
    SH.hero = SH.deadpan;

    function buildEye(s) {
      // s = -1 screen-left eye, +1 screen-right eye. u coords: + = outer corner.
      var X = function (p) { return [s * p[0], p[1]]; };
      var cx = s * sp / 2;
      var eg = LB.g(eyesG, { transform: 'translate(' + n2(cx) + ' 0)' });
      var D = {};
      ['deadpan', 'droop', 'dot'].forEach(function (kind) {
        var sh = SH[kind];
        var T = sh.T.map(X), B = sh.B.map(X);
        var open = 'M' + pt(T[0]) + crSeg(T, false) + 'L' + pt(B[0]) + crSeg(B, false) + 'Z';
        var ent = { open: open, T: T };
        if (kind !== 'dot') {
          var LT = T.slice(); LT.push(X(sh.flick));
          ent.lash = taperD(LT, [0.5, lashT * 0.7, lashT * 0.95, lashT, lashT * 0.95, lashT * 0.55, 0.15]);
          ent.lidShade = crD(T, false);
          var c0 = sh.T[1], c1 = sh.T[3];
          var cy0 = Math.min(c0[1], c1[1]) - (heavy ? 2.4 : 3.0) * (h / 10);
          ent.crease = taperD([X([-0.25 * w, cy0 + 0.6]), X([0.1 * w, cy0 - 0.3]), X([0.44 * w, cy0 + 0.9])], [0.1, heavy ? 1.0 : 0.75, 0.15]);
          ent.lower = taperD([X(sh.B[0]).map(function (v, i) { return i ? v + 0.4 : v; }), X([0.3 * w, sh.B[1][1] + 0.35]), X([0.02 * w, sh.B[2][1] + 0.35])], [0.1, 0.85, 0.1]);
        } else {
          ent.lash = null;
        }
        D[kind] = ent;
      });
      D.hero = D.deadpan;
      var clipId = LB.uid('lbeye');
      var clip = LB.el('clipPath', { id: clipId }, eg);
      var clipP = LB.path(clip, D.deadpan.open);
      var white = LB.path(eg, D.deadpan.open, { fill: S.eyeWhite, stroke: 'none', 'stroke-width': 1.0, 'stroke-linejoin': 'round' });
      var inner = LB.g(eg, { 'clip-path': 'url(#' + clipId + ')' });
      var irisG = LB.g(inner);
      var irisE = LB.el('ellipse', { cx: 0, cy: 0, rx: irx, ry: iry, fill: iris, stroke: lash, 'stroke-width': 0.6 }, irisG);
      LB.path(irisG, 'M' + pt([-irx * 0.995, -iry * 0.05]) + 'A' + n2(irx) + ' ' + n2(iry) + ' 0 0 1 ' + pt([irx * 0.995, -iry * 0.05]) +
        'Q' + pt([0, iry * 0.2]) + ' ' + pt([-irx * 0.995, -iry * 0.05]) + 'Z', fl(irisDark));
      var lightC = LB.path(irisG, 'M' + pt([-irx * 0.78, iry * 0.5]) + 'Q' + pt([0, iry * 1.02]) + ' ' + pt([irx * 0.78, iry * 0.5]) +
        'Q' + pt([0, iry * 0.74]) + ' ' + pt([-irx * 0.78, iry * 0.5]) + 'Z', fl(irisLight));
      var pupilE = LB.el('ellipse', { cx: 0, cy: iry * 0.06, rx: irx * 0.42, ry: iry * 0.46, fill: pupilC }, irisG);
      var catch1 = LB.el('ellipse', { cx: 0, cy: 0, rx: irx * 0.3, ry: iry * 0.24, fill: S.catchlight, transform: 'rotate(-25)', 'data-sil': 'hide' }, irisG);
      // hero: a sharp 4-point star catchlight plus two round ones, one path
      var sa = iry * 0.62, sb = irx * 0.5, sc = 0.1, hx = -irx * 0.36, hy = -iry * 0.02;
      function circ(cx, cy, r) { return 'M' + n2(cx - r) + ' ' + n2(cy) + 'a' + n2(r) + ' ' + n2(r) + ' 0 1 0 ' + n2(2 * r) + ' 0a' + n2(r) + ' ' + n2(r) + ' 0 1 0 ' + n2(-2 * r) + ' 0Z'; }
      var heroG = LB.path(irisG, 'M' + n2(hx) + ' ' + n2(hy - sa) + 'Q' + n2(hx + sb * sc) + ' ' + n2(hy - sa * sc) + ' ' + n2(hx + sb) + ' ' + n2(hy) +
        'Q' + n2(hx + sb * sc) + ' ' + n2(hy + sa * sc) + ' ' + n2(hx) + ' ' + n2(hy + sa) + 'Q' + n2(hx - sb * sc) + ' ' + n2(hy + sa * sc) + ' ' + n2(hx - sb) + ' ' + n2(hy) +
        'Q' + n2(hx - sb * sc) + ' ' + n2(hy - sa * sc) + ' ' + n2(hx) + ' ' + n2(hy - sa) + 'Z' + circ(irx * 0.45, iry * 0.4, irx * 0.19) + circ(-irx * 0.05, iry * 0.66, irx * 0.1),
        fl(S.catchlight, { 'data-sil': 'hide' }));
      var lidShade = LB.path(inner, D.deadpan.lidShade, ol(lashT * 1.55, S.eyeShade));
      var dotPupil = LB.el('circle', { cx: 0, cy: 0, r: Math.max(1.2, 0.085 * w), fill: lash }, eg);
      var lower = LB.path(eg, D.deadpan.lower, fl(lash));
      var crease = LB.path(eg, D.deadpan.crease, fl(S.crease));
      var lashP = LB.path(eg, D.deadpan.lash, fl(lash));
      var closedP = LB.path(eg, taperD([X([-0.5 * w, 0.06 * h]), X([-0.24 * w, 0.36 * h]), X([0.12 * w, 0.42 * h]), X([0.42 * w, 0.26 * h]), X([0.6 * w, 0.06 * h])],
        [0.3, lashT * 0.75, lashT * 0.9, lashT * 0.8, 0.3]), fl(lash));
      var closedCrease = LB.path(eg, taperD([X([-0.2 * w, -0.12 * h]), X([0.12 * w, -0.16 * h]), X([0.42 * w, -0.06 * h])], [0.1, 0.7, 0.1]), fl(S.crease));
      return {
        g: eg, s: s, cx: cx, D: D, clipP: clipP, white: white, inner: inner, irisG: irisG, irisE: irisE, lightC: lightC, pupilE: pupilE,
        catch1: catch1, heroG: heroG, lidShade: lidShade, dotOutline: null, dotPupil: dotPupil, lower: lower, crease: crease,
        lashP: lashP, closedP: closedP, closedCrease: closedCrease,
      };
    }
    var eyes = [buildEye(-1), buildEye(1)];

    // ---- brows
    function browPts(kind, s) {
      var b;
      var up = 0;
      if (kind === 'oneUp') kind = s === o.oneUpSide ? 'oneUpHi' : 'oneUpLo';
      switch (kind) {
        case 'up': b = [[-0.5, 0.2 - 3.4], [-0.1, -1.6 - 3.4], [0.3, -1.7 - 3.4], [0.54, -0.2 - 3.4]]; break;
        case 'down': b = [[-0.52, 3.0], [-0.15, 1.3], [0.25, -0.4], [0.54, -0.9]]; break;
        case 'sad': b = [[-0.5, -2.6], [-0.15, -1.9], [0.25, -0.3], [0.54, 1.3]]; break;
        case 'oneUpHi': b = [[-0.5, -2.6], [-0.08, -6.6], [0.3, -6.8], [0.56, -4.4]]; break;
        case 'oneUpLo': b = [[-0.5, 1.6], [-0.1, 0.9], [0.3, 0.8], [0.54, 1.5]]; break;
        default: b = [[-0.5, 0.6], [-0.1, -0.6], [0.3, -0.7], [0.54, 0.5]];
      }
      var bx = sp / 2 + 0.03 * w;
      return b.map(function (p) { return [s * (bx + p[0] * bw), o.browY + up + p[1] * (h / 10)]; });
    }
    var browD = {};
    BROWS.concat([]).forEach(function (kind) {
      browD[kind] = [-1, 1].map(function (s) {
        var heavyW = kind === 'down' ? 1.12 : 1;
        return taperD(browPts(kind, s), [bt * 0.8 * heavyW, bt * heavyW, bt * 0.95 * heavyW, bt * 0.62, 0.25]);
      });
    });
    var browP = [-1, 1].map(function (s, i) { return LB.path(browsG, browD.flat[i], fl(o.browColor)); });

    // ---- sweat drop
    var sw = LB.g(sweatG, { transform: 'translate(' + n2(o.sweatAt.x) + ' ' + n2(o.sweatAt.y) + ') scale(' + n2(o.sweatScale) + ')' });
    var swInner = sw;
    var dropD = 'M0 -8.6C1.3 -5.6 5.6 -1.6 5.6 2.2C5.6 5.5 3.1 7.7 0 7.7C-3.1 7.7 -5.6 5.5 -5.6 2.2C-5.6 -1.6 -1.3 -5.6 0 -8.6Z';
    LB.path(swInner, dropD, fl(S.sweat));
    LB.path(swInner, 'M3.9 0.4C4.8 3.6 3.1 6.2 0 6.5C2.5 5.3 3.7 3.3 3.9 0.4Z', fl(S.sweatShade));
    LB.path(swInner, dropD, ol(1.05, S.sweatLine));
    LB.el('ellipse', { cx: -2.3, cy: 2.0, rx: 1.15, ry: 2.1, fill: '#FFFFFF', transform: 'rotate(18 -2.3 2)', 'data-sil': 'hide' }, swInner);
    LB.el('circle', { cx: -1.1, cy: -2.9, r: 0.65, fill: '#FFFFFF', 'data-sil': 'hide' }, swInner);

    // ---- update
    var last = {};
    function set(node, key, attr, v) {
      if (last[key] !== v) { last[key] = v; node.setAttribute(attr, v); }
    }
    function vis(node, key, on) {
      if (last[key] !== on) { last[key] = on; LB.show(node, on); }
    }
    function update(st) {
      st = st || {};
      var ex = pick(EYES, st.eyes), br = pick(BROWS, st.brows), mo = pick(MOUTHS, st.mouth);
      var gx = LB.clamp(+st.gazeX || 0, -1, 1), gy = LB.clamp(+st.gazeY || 0, -1, 1);
      var turn = LB.clamp(+st.headTurn || 0, -1, 1);
      // head turn: features slide toward the turn, far eye narrows
      set(eyesG, 'eT', 'transform', 'translate(' + n2(turn * sp * 0.28) + ' 0)');
      set(browsG, 'bT', 'transform', 'translate(' + n2(turn * sp * 0.26) + ' 0)');
      set(noseG, 'nT', 'transform', 'translate(' + n2(turn * sp * 0.45) + ' 0)');
      set(mouthG, 'mT', 'transform', 'translate(' + n2(turn * sp * 0.36) + ' 0)');
      eyes.forEach(function (e, i) {
        var far = turn * e.s > 0 ? Math.abs(turn) : 0, near = turn * e.s < 0 ? Math.abs(turn) : 0;
        var sx = 1 - 0.28 * far + 0.04 * near;
        set(e.g, 'eg' + i, 'transform', 'translate(' + n2(e.cx - e.s * far * 2.5) + ' 0) scale(' + n2(sx) + ' 1)');
        var kind = ex === 'closed' ? 'deadpan' : ex;
        var D = e.D[kind];
        var isOpen = ex !== 'closed', isDot = ex === 'dot';
        vis(e.white, 'w' + i, isOpen);
        vis(e.inner, 'in' + i, isOpen && !isDot);
        set(e.white, 'ws' + i, 'stroke', isDot ? lash : 'none');
        vis(e.dotPupil, 'dp' + i, isDot);
        vis(e.lashP, 'la' + i, isOpen && !isDot);
        vis(e.lower, 'lo' + i, isOpen && !isDot);
        vis(e.crease, 'cr' + i, isOpen && !isDot);
        vis(e.closedP, 'cl' + i, !isOpen);
        vis(e.closedCrease, 'cc' + i, !isOpen);
        vis(e.heroG, 'he' + i, ex === 'hero');
        vis(e.catch1, 'c1v' + i, ex !== 'hero');
        if (isOpen) {
          set(e.white, 'wd' + i, 'd', D.open);
          set(e.clipP, 'cd' + i, 'd', D.open);
          if (!isDot) {
            set(e.lashP, 'ld' + i, 'd', D.lash);
            set(e.lidShade, 'sd' + i, 'd', D.lidShade);
            set(e.lower, 'lw' + i, 'd', D.lower);
            set(e.crease, 'crd' + i, 'd', D.crease);
          }
        }
        var ix = e.s * 0.02 * w + gx * (0.5 * w - irx - 1.0);
        var iy = icy + gy * (gy < 0 ? o.gazeUp : 0.24) * h;
        var isc = ex === 'droop' ? 0.88 : 1;
        set(e.irisG, 'ig' + i, 'transform', 'translate(' + n2(ix) + ' ' + n2(iy) + ') scale(' + isc + ')');
        set(e.irisE, 'if' + i, 'fill', ex === 'hero' ? heroIris : iris);
        set(e.lightC, 'lf' + i, 'fill', ex === 'hero' ? heroLight : irisLight);
        set(e.pupilE, 'pr' + i, 'rx', n2(irx * (ex === 'droop' ? 0.26 : ex === 'hero' ? 0.36 : 0.42)));
        set(e.pupilE, 'pry' + i, 'ry', n2(iry * (ex === 'droop' ? 0.3 : ex === 'hero' ? 0.42 : 0.46)));
        // catchlight sits just under the lid line so it reads in the half-lidded stare
        var cy = ex === 'droop' ? iry * 0.12 : heavy ? iry * 0.02 : -iry * 0.14;
        set(e.catch1, 'c1' + i, 'transform', 'translate(' + n2(-irx * 0.42) + ' ' + n2(cy) + ') rotate(-25)');
        set(e.catch1, 'c1r' + i, 'rx', n2(irx * (ex === 'droop' ? 0.24 : 0.3)));
        if (isDot) {
          set(e.dotPupil, 'dpx' + i, 'cx', n2(e.s * 0.01 * w + gx * 0.18 * w));
          set(e.dotPupil, 'dpy' + i, 'cy', n2(0.03 * h + gy * 0.18 * h));
        }
      });
      browP.forEach(function (p, i) { set(p, 'br' + i, 'd', browD[br][i]); });
      Object.keys(mouths).forEach(function (m) { vis(mouths[m], 'm_' + m, m === mo); });
      var swk = LB.clamp(+st.sweat || 0, 0, 1);
      vis(sweatG, 'swv', swk > 0.001);
      if (swk > 0.001) set(sweatG, 'swo', 'opacity', n2(swk));
      var blk = LB.clamp(+st.blush || 0, 0, 1);
      vis(blushG, 'blv', blk > 0.001);
      if (blk > 0.001) set(blushG, 'blo', 'opacity', n2(blk));
      if (shadeBand) {
        var sfk = LB.clamp(+st.shadowFace || 0, 0, 1);
        set(shadeBand, 'sf', 'opacity', n2(sfk * 0.55));
      }
    }
    update({});
    return { g: g, update: update, layers: { eyes: eyesG, brows: browsG, mouth: mouthG, nose: noseG, sweat: sweatG, blush: blushG }, opts: o };
  }

  LB.face = {
    create: create,
    head: head,
    cel: cel,
    ol: ol,
    fl: fl,
    crD: crD,
    crSeg: crSeg,
    crSample: crSample,
    taperD: taperD,
    tubeD: tubeD,
    tubeShadeD: tubeShadeD,
    ribbonD: ribbonD,
    limb: limb,
    lockD: lockD,
    pt: pt,
    n2: n2,
    EYES: EYES, BROWS: BROWS, MOUTHS: MOUTHS,
  };
})();
