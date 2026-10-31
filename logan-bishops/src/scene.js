/* Logan Bishops: scene painter.
 * The Logan Square apartment at night, painted as an anime background.
 *   bg  : room shell, night windows with the city, the OVER $1 BILLION RECOVERED billboard, the golden arches,
 *         the globe lamp, the dracaena, the blond wood floor.
 *   mid : checkered rug, clogs, desk + monitor, red chairs, kitchen island (terrazzo, pint, can, tissues,
 *         cat bottle, coffee shelf, "Peanut Day" box), then the state layers: shoujo bokeh, villain panel, impact flat.
 * All DOM is built once in create(); update() only sets attributes. Every visual is a pure function of (state, t). */
(function () {
  'use strict';
  var LB = window.LB;

  // ------------------------------------------------------------------ path helpers (world units)
  function f(v) { return Math.round(v * 10) / 10; }
  function pt(x, y) { return f(x) + ' ' + f(y); }
  function rectD(x, y, w, h) { return 'M' + pt(x, y) + 'H' + f(x + w) + 'V' + f(y + h) + 'H' + f(x) + 'Z'; }
  function polyD(p) {
    var s = 'M' + pt(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) s += 'L' + pt(p[i][0], p[i][1]);
    return s + 'Z';
  }
  function ellD(cx, cy, rx, ry) {
    ry = ry == null ? rx : ry;
    return 'M' + pt(cx - rx, cy) + 'A' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + pt(cx + rx, cy) +
      'A' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + pt(cx - rx, cy) + 'Z';
  }
  function rrD(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return 'M' + pt(x + r, y) + 'H' + f(x + w - r) + 'Q' + pt(x + w, y) + ' ' + pt(x + w, y + r) + 'V' + f(y + h - r) +
      'Q' + pt(x + w, y + h) + ' ' + pt(x + w - r, y + h) + 'H' + f(x + r) + 'Q' + pt(x, y + h) + ' ' + pt(x, y + h - r) +
      'V' + f(y + r) + 'Q' + pt(x, y) + ' ' + pt(x + r, y) + 'Z';
  }
  // smooth curve through points (Catmull-Rom as cubic Beziers)
  function smoothD(p, closed) {
    var n = p.length, s = 'M' + pt(p[0][0], p[0][1]);
    var segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      if (!closed) { if (i === 0) p0 = p1; if (i + 2 > n - 1) p3 = p2; }
      s += 'C' + pt(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        pt(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6) + ' ' + pt(p2[0], p2[1]);
    }
    return s + (closed ? 'Z' : '');
  }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function r3(v) { return Math.round(v * 1000) / 1000; }

  // ------------------------------------------------------------------ floor perspective
  // Ground plane (X across, Z depth) seen from eye level: horizon y 400, vanishing point x 520.
  var HZ = 400, VX = 520, FK = 1000, WALL_Y = 768;
  function proj(X, Z) { return [VX + FK * X / Z, HZ + FK / Z]; }
  function unproj(x, y) { var d = y - HZ; return [(x - VX) / d, FK / d]; }

  // fixed world points shared with other modules
  var BB = { x0: 455, y0: 164, x1: 575, y1: 226 }; // billboard outer frame (120 x 62), bottom at y 226
  var ARCH = { x: 590, y: 225 }; // = LB.WORLD.arches
  var FONT_BB = "'Source Sans 3', 'Source Sans Pro', 'Arial Narrow', Arial, sans-serif";
  var FONT_BOX = "'Mochiy Pop One', 'M PLUS Rounded 1c', 'Arial Rounded MT Bold', sans-serif";

  function create(stage) {
    var defs = stage.defsWorld, bg = stage.layers.bg, mid = stage.layers.mid;

    // -------------------------------------------------------------- gradient helpers (ids via LB.uid)
    function grad(kind, attrs, stops) {
      var a = { id: LB.uid('scn') };
      for (var k in attrs) a[k] = attrs[k];
      var gr = LB.el(kind, a, defs);
      for (var i = 0; i < stops.length; i++) {
        var s = stops[i];
        LB.el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, gr);
      }
      return 'url(#' + a.id + ')';
    }
    function lin(x1, y1, x2, y2, stops) {
      return grad('linearGradient', { gradientUnits: 'userSpaceOnUse', x1: x1, y1: y1, x2: x2, y2: y2 }, stops);
    }
    function linV(y1, y2, stops) { return lin(0, y1, 0, y2, stops); }
    function linH(x1, x2, stops) { return lin(x1, 0, x2, 0, stops); }
    function radU(cx, cy, r, stops, fx, fy) {
      return grad('radialGradient', { gradientUnits: 'userSpaceOnUse', cx: cx, cy: cy, r: r, fx: fx, fy: fy }, stops);
    }
    function radB(stops, fx, fy) { return grad('radialGradient', { cx: 0.5, cy: 0.5, r: 0.5, fx: fx, fy: fy }, stops); }
    // shapes take `opacity` as fill-/stroke-opacity so the renderer never opens a transparency layer for them
    function P(parent, d, attrs) {
      var a = attrs || {};
      if (a.opacity != null && !a.filter) {
        var o = a.opacity, hasFill = a.fill !== 'none', hasStroke = a.stroke && a.stroke !== 'none';
        if (hasFill) a['fill-opacity'] = r3(o * (a['fill-opacity'] != null ? a['fill-opacity'] : 1));
        if (hasStroke) a['stroke-opacity'] = r3(o * (a['stroke-opacity'] != null ? a['stroke-opacity'] : 1));
        delete a.opacity;
      }
      return LB.path(parent, d, a);
    }
    function G(parent, attrs) { return LB.g(parent, attrs); }

    // ================================================================ BG: room shell
    P(bg, rectD(-2600, -2600, 6400, 6400), { fill: radU(70, 230, 1500, [[0, '#FFF9EC'], [0.12, '#FAF2E3'], [0.3, '#F0E8DA'], [0.66, '#E2D9C9'], [1, '#D4CAB8']]) });
    // ceiling plane and the soft cove shadow under it
    P(bg, rectD(-2600, -2600, 6400, 2618), { fill: linV(-500, 18, [[0, '#BFB6A6'], [1, '#E0D8C9']]) });
    P(bg, rectD(-2600, 18, 6400, 34), { fill: linV(18, 52, [[0, '#6B5A45', 0.14], [1, '#6B5A45', 0]]) });
    // warm washes: globe lamp (upper left) and the uplight under the dracaena
    P(bg, ellD(330, 560, 300, 420), { fill: radB([[0, '#FFC982', 0.5], [0.5, '#FFD59C', 0.2], [1, '#FFDDAA', 0]]) });
    // the left window sits in a slightly darker wall bay; a soft corner shade marks it
    P(bg, rectD(146, 18, 26, 740), { fill: linH(146, 172, [[0, '#8A7458', 0.1], [1, '#8A7458', 0]]) });

    // ================================================================ BG: big back window (night street)
    // window plane x 380..1388, y 56..700; wall opening is a little larger (recess drawn in perspective)
    P(bg, polyD([[372, 37], [1436, 37], [1388, 56], [380, 56]]), { fill: '#CFC5B5' });
    P(bg, polyD([[372, 37], [380, 56], [380, 700], [372, 717]]), { fill: '#D6CCBC' });
    P(bg, polyD([[1388, 56], [1436, 37], [1436, 717], [1388, 700]]), { fill: linH(1388, 1436, [[0, '#E3DACB'], [1, '#EEE7DB']]) });

    var WX0 = 394, WX1 = 1374, WY0 = 80, WY1 = 688;
    P(bg, rectD(380, 56, 1008, 644), { fill: linV(WY0, WY1, [[0, '#0B1630'], [0.3, '#122247'], [0.5, '#1E2F58'], [0.72, '#2A3462'], [1, '#33365A']]) });

    // clouds lit faintly by the city
    function cloudD(x0, x1, yb, h, seed) {
      var r = LB.rng(seed), pts = [], n = Math.max(4, Math.round((x1 - x0) / 38)), i, x, e;
      for (i = 0; i <= n; i++) { x = LB.lerp(x0, x1, i / n); e = Math.sin(Math.PI * i / n); pts.push([x, yb - h * e * (0.5 + 0.5 * r())]); }
      for (i = n; i >= 0; i--) { x = LB.lerp(x0, x1, i / n); e = Math.sin(Math.PI * i / n); pts.push([x + (r() - 0.5) * 8, yb + h * 0.16 * e * r()]); }
      return smoothD(pts, true);
    }
    var cloudFill = linV(90, 330, [[0, '#17264A'], [1, '#24365F']]);
    P(bg, cloudD(394, 700, 132, 28, 3) + cloudD(760, 1180, 116, 22, 5) + cloudD(1000, 1380, 176, 30, 7) + cloudD(560, 900, 262, 18, 9),
      { fill: cloudFill, opacity: 0.8 });
    // a few faint stars
    (function () {
      var r = LB.rng(5), d = '';
      for (var i = 0; i < 22; i++) d += ellD(WX0 + r() * (WX1 - WX0), WY0 + 6 + r() * 150, 0.6 + r() * 0.6);
      P(bg, d, { fill: '#DCE6FF', opacity: 0.55 });
    })();
    // light-pollution glow along the horizon

    // distant skyline
    (function () {
      var r = LB.rng(11), pts = [[WX0, WY1]], x = WX0, lit = '';
      while (x < WX1) {
        var w = 26 + r() * 64, top = 318 + r() * 70 - (r() < 0.18 ? 70 : 0);
        pts.push([x, top]); pts.push([x + w, top]);
        for (var k = 0; k < 4; k++) { var lx = x + 4 + r() * (w - 10), ly = top + 8 + r() * 60; if (r() < 0.5 && lx < WX1 - 4) lit += rectD(lx, ly, 2.6, 3.4); }
        x += w;
      }
      pts.push([WX1, WY1]);
      pts.forEach(function (q) { q[0] = Math.min(q[0], WX1); });
      P(bg, polyD(pts), { fill: linV(250, 688, [[0, '#18233F'], [1, '#262C4A']]) });
      P(bg, lit, { fill: '#D7B36C', opacity: 0.45 });
    })();

    // a building facade (gradient + cool rim light) with small windows; lit ones grouped by colour into a few paths
    function building(x0, x1, top, o) {
      var yEnd = o.bottom || WY1;
      P(bg, rectD(x0, top, x1 - x0, yEnd - top), { fill: linV(top, yEnd, [[0, o.c0], [1, o.c1]]) });
      if (o.parapet) P(bg, rectD(x0 - 2, top - 4, x1 - x0 + 4, 5), { fill: o.parapet });
      P(bg, rectD(x0, top, 1.6, yEnd - top), { fill: '#6A7CB4', opacity: 0.35 });
      var r = LB.rng(o.seed), out = { warm: '', pale: '', cool: '', dark: '', shade: '', band: '' };
      var fl = 0;
      for (var y = top + o.oy; y + o.h <= yEnd - 6; y += o.gy, fl++) {
        var floorK = 0.45 + 1.1 * LB.hash(o.seed * 3.7 + fl * 13.1);
        if (o.bands) out.band += rectD(x0, y + o.h + 3, x1 - x0, 2.6);
        for (var x = x0 + o.ox; x + o.w <= x1 - 3; x += o.gx) {
          var v = r(), c = r();
          if (v < o.lit * floorK) {
            var key = c < 0.55 ? 'warm' : c < 0.85 ? 'pale' : 'cool';
            out[key] += rectD(x, y, o.w, o.h);
            if (r() < 0.35) out.shade += rectD(x, y, o.w, o.h * (0.25 + r() * 0.35));
          } else out.dark += rectD(x, y, o.w, o.h);
        }
      }
      if (out.band) P(bg, out.band, { fill: o.bands });
      P(bg, out.dark, { fill: o.darkWin || '#131A2F', opacity: 0.8 });
      if (out.warm) P(bg, out.warm, { fill: '#E2B86F', opacity: 0.88 });
      if (out.pale) P(bg, out.pale, { fill: '#EFDDB2', opacity: 0.85 });
      if (out.cool) P(bg, out.cool, { fill: '#9DB6DC', opacity: 0.85 });
      if (out.shade) P(bg, out.shade, { fill: '#2A2236', opacity: 0.45 });
    }
    building(652, 828, 210, { seed: 21, c0: '#221F3E', c1: '#33294A', ox: 9, oy: 14, w: 11, h: 14, gx: 21, gy: 25, lit: 0.3, parapet: '#2A3050' });
    // rooftop water tank on that building (a city-rooftop silhouette by the mitre)
    P(bg, 'M778 210V194M800 210V194M789 210V194', { stroke: '#121729', 'stroke-width': 2 });
    P(bg, rrD(774, 170, 30, 26, 2) + polyD([[771, 171], [807, 171], [789, 157]]), { fill: '#141A2C' });
    P(bg, 'M775 176H803M775 183H803M775 190H803', { stroke: '#232A40', 'stroke-width': 1 });
    P(bg, 'M772 171L789 157.6', { stroke: '#5B6A9C', 'stroke-width': 1, opacity: 0.6 });
    building(430, 648, 302, { seed: 23, c0: '#181F3B', c1: '#252B49', ox: 11, oy: 14, w: 10, h: 13, gx: 19, gy: 23, lit: 0.28 });
    building(394, 472, 248, { seed: 25, c0: '#1F2643', c1: '#2C3251', ox: 8, oy: 14, w: 11, h: 15, gx: 19, gy: 26, lit: 0.34, parapet: '#2A3150' });
    building(828, 1132, 164, { seed: 27, c0: '#20223D', c1: '#2E3050', ox: 9, oy: 10, w: 24, h: 24, gx: 33, gy: 38, lit: 0.34, bands: '#3B3E60', parapet: '#30324F' });
    P(bg, 'M1000 164V110M994 128H1006', { stroke: '#141A2C', 'stroke-width': 1.6 });
    P(bg, ellD(1000, 109, 7), { fill: radB([[0, '#FF5050', 0.7], [1, '#FF5050', 0]]) });
    P(bg, ellD(1000, 109, 1.6), { fill: '#FFB0A0' });
    building(1132, 1374, 290, { seed: 29, c0: '#2C2943', c1: '#3B3552', ox: 14, oy: 22, w: 15, h: 28, gx: 25, gy: 46, lit: 0.42, parapet: '#4A4462', darkWin: '#1E1A2E' });
    P(bg, rectD(1132, 296, 242, 6), { fill: '#443E5C' });
    P(bg, rectD(1150, 304, 72, 384) + rectD(1262, 304, 72, 384), { fill: '#FFFFFF', opacity: 0.035 });

    // ground-floor shopfronts along the street (lit glass, awnings, two little neon squiggles, no lettering)
    (function () {
      var shops = [[402, 40, 'w'], [466, 58, 'c'], [548, 34, 'w'], [694, 62, 'w'], [786, 40, 'c'], [972, 74, 'w'], [1088, 38, 'w'], [1150, 64, 'c'], [1252, 52, 'w']];
      var warm = '', cool = '', awn = '';
      shops.forEach(function (sh) {
        var d = rectD(sh[0], 584, sh[1], 28);
        if (sh[2] === 'w') warm += d; else cool += d;
        awn += rectD(sh[0] - 3, 577, sh[1] + 6, 6);
      });
      P(bg, rectD(WX0, 572, WX1 - WX0, 40), { fill: '#1A1C30' });
      P(bg, warm, { fill: linV(584, 612, [[0, '#F5D49A'], [1, '#E3A964']]), opacity: 0.85 });
      P(bg, cool, { fill: linV(584, 612, [[0, '#CDE4F4'], [1, '#8DB4D6']]), opacity: 0.75 });
      P(bg, awn, { fill: '#2D2338' });
      P(bg, 'M712 570q6 -8 12 0t12 0t12 0M1170 568q5 -7 10 0t10 0', { fill: 'none', stroke: '#FF6FA8', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.3 });
      P(bg, 'M712 570q6 -8 12 0t12 0t12 0M1170 568q5 -7 10 0t10 0', { fill: 'none', stroke: '#FFC2DA', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
    })();
    // street level: sidewalk, road, parked cars, warm haze
    P(bg, rectD(WX0, 612, WX1 - WX0, 14), { fill: '#272A43' });
    P(bg, rectD(WX0, 626, WX1 - WX0, 62), { fill: '#181C2F' });
    P(bg, rrD(950, 636, 130, 34, 12) + rrD(1180, 640, 150, 32, 12), { fill: '#10131F' });
    P(bg, ellD(1072, 652, 4, 3) + ellD(958, 652, 4, 3), { fill: '#FF5A48' });
    P(bg, ellD(1186, 656, 5, 3.5), { fill: '#FFF3CC' });
    P(bg, rectD(WX0, 520, WX1 - WX0, 168), { fill: linV(520, 688, [[0, '#F0A35C', 0], [1, '#F0A35C', 0.15]]) });
    // traffic light (green) at the right
    P(bg, rectD(1328, 560, 4, 128) + rrD(1320, 540, 20, 40, 3), { fill: '#141826' });
    P(bg, ellD(1330, 572, 16), { fill: radB([[0, '#5CFFB0', 0.8], [0.4, '#3CE890', 0.25], [1, '#3CE890', 0]]) });
    P(bg, ellD(1330, 572, 3.6), { fill: '#C8FFE4' });

    // streetlights (sodium cobra heads)
    P(bg, 'M962 688V342Q962 330 950 330H930M1262 688V366Q1262 354 1250 354H1230', { fill: 'none', stroke: '#141826', 'stroke-width': 4 });
    P(bg, rrD(916, 326, 18, 7, 3) + rrD(1216, 350, 18, 7, 3), { fill: '#141826' });
    var sodium = radB([[0, '#FFD9A0', 0.85], [0.3, '#FFB25E', 0.35], [1, '#FFB25E', 0]]);
    P(bg, ellD(925, 338, 40, 34) + ellD(1225, 362, 40, 34), { fill: sodium });
    P(bg, ellD(925, 333.5, 6, 2) + ellD(1225, 357.5, 6, 2), { fill: '#FFF2D2' });

    // ---------------------------------------------------------------- billboard (OVER / $1 BILLION / RECOVERED)
    P(bg, rectD(476, 229, 4, 74) + rectD(550, 229, 4, 74) + rectD(449, 226, 132, 3), { fill: '#161A28' });
    P(bg, 'M478 236L552 296M552 236L478 296', { stroke: '#161A28', 'stroke-width': 1.5, fill: 'none' });
    var bbGlow = P(bg, ellD(515, 195, 112, 76), { fill: radB([[0, '#A8C1FF', 0.8], [0.5, '#7C9BE6', 0.32], [1, '#7C9BE6', 0]]) });
    // gooseneck flood lamps on top
    P(bg, 'M485 164V156Q485 152 489 152M515 164V156Q515 152 519 152M545 164V156Q545 152 549 152', { fill: 'none', stroke: '#252A36', 'stroke-width': 1.6 });
    P(bg, polyD([[486, 149], [496, 149], [494, 154], [488, 154]]) + polyD([[516, 149], [526, 149], [524, 154], [518, 154]]) +
      polyD([[546, 149], [556, 149], [554, 154], [548, 154]]), { fill: '#2B303C' });
    P(bg, rectD(BB.x0, BB.y0, BB.x1 - BB.x0, BB.y1 - BB.y0), { fill: '#272C38' });
    P(bg, rectD(BB.x0 + 2, BB.y0 + 2, BB.x1 - BB.x0 - 4, BB.y1 - BB.y0 - 4),
      { fill: linV(BB.y0, BB.y1, [[0, '#1C3375'], [0.42, '#11235A'], [1, '#0B183F']]) });
    var bbCones = P(bg, polyD([[488, 166], [494, 166], [512, 206], [470, 206]]) + polyD([[518, 166], [524, 166], [542, 206], [500, 206]]) +
      polyD([[548, 166], [554, 166], [572, 206], [530, 206]]), { fill: linV(166, 206, [[0, '#DCE8FF', 0.34], [1, '#DCE8FF', 0]]) });
    P(bg, ellD(491, 154.6, 3, 1) + ellD(521, 154.6, 3, 1) + ellD(551, 154.6, 3, 1), { fill: '#FFF7E0' });
    function bbTexts(parent, extra) {
      var base = { 'font-family': FONT_BB, 'font-weight': 700, 'font-size': 13.6 };
      function T(attrs) { var a = {}, k; for (k in base) a[k] = base[k]; for (k in attrs) a[k] = attrs[k]; for (k in extra) a[k] = extra[k]; return LB.el('text', a, parent); }
      T({ x: 465, y: 184, 'letter-spacing': 0.6, text: 'OVER' });
      T({ x: 515, y: 202.2, 'font-size': 21.6, 'text-anchor': 'middle', textLength: 104, lengthAdjust: 'spacingAndGlyphs', text: '$1 BILLION' });
      T({ x: 565, y: 215.2, 'text-anchor': 'end', 'letter-spacing': 0.3, text: 'RECOVERED' });
    }
    var bbTextGlow = G(bg, {});
    bbTexts(bbTextGlow, { fill: '#8FB2FF', stroke: '#8FB2FF', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
    bbTexts(G(bg, {}), { fill: '#FFFFFF' });
    var bbDim = P(bg, rectD(BB.x0 + 2, BB.y0 + 2, BB.x1 - BB.x0 - 4, BB.y1 - BB.y0 - 4), { fill: '#02050E', opacity: 0 });
    P(bg, 'M457 166.6H573', { stroke: '#6F86C8', 'stroke-width': 0.8, opacity: 0.6 });

    // ---------------------------------------------------------------- golden arches pylon (no wordmark)
    var archD = 'M-21 20C-20.6 -5 -16.6 -19 -10.4 -19C-4.3 -19 -0.8 -6 0 7C0.8 -6 4.3 -19 10.4 -19C16.6 -19 20.6 -5 21 20';
    var arch = G(bg, { transform: 'translate(' + ARCH.x + ' ' + ARCH.y + ')' });
    var archWash = P(arch, ellD(0, 4, 240), { fill: radB([[0, '#FFE28A', 0.5], [0.16, '#FFD25A', 0.3], [0.45, '#FFC23C', 0.08], [1, '#FFC23C', 0]]), opacity: 0 });
    P(arch, rectD(-2.5, 37, 5, 430), { fill: '#161A28' });
    P(arch, ellD(0, 30, 34, 16), { fill: radB([[0, '#FF3A2A', 0.45], [1, '#FF3A2A', 0]]) });
    var archHalo = P(arch, ellD(0, 2, 52), { fill: radB([[0, '#FFD54F', 0.75], [0.35, '#FFC72C', 0.38], [1, '#FFC72C', 0]]) });
    P(arch, rrD(-19, 22, 38, 15, 1.5), { fill: linV(22, 37, [[0, '#E2392C'], [1, '#B7241C']]) });
    P(arch, 'M-18 23.2H18', { stroke: '#FF8A70', 'stroke-width': 0.9, opacity: 0.8 });
    var blurId = LB.uid('scnblur');
    var flt = LB.el('filter', { id: blurId, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    LB.el('feGaussianBlur', { stdDeviation: 3.2 }, flt);
    var archBlur = P(arch, archD, { fill: 'none', stroke: '#FFC72C', 'stroke-width': 9, filter: 'url(#' + blurId + ')', opacity: 0.7 });
    P(arch, archD, { fill: 'none', stroke: '#FFC72C', 'stroke-width': 5.4 });
    var archCore = P(arch, archD, { fill: 'none', stroke: '#FFEDB0', 'stroke-width': 1.7, opacity: 0.9 });

    // ---------------------------------------------------------------- window frames (black), highlights, glass sheen
    P(bg, rectD(380, 56, 1008, 24) + rectD(380, 688, 1008, 12) + rectD(380, 56, 14, 644) + rectD(1374, 56, 14, 644) +
      rectD(712, 80, 12, 608) + rectD(1040, 80, 12, 608) + rectD(394, 466, 980, 10), { fill: '#1E1F26' });
    P(bg, rectD(380, 58, 1008, 7), { fill: '#2B2C34' });
    P(bg, 'M394 80.6H1374M394 466.6H1374M394.6 80V688M724.6 80V688M1052.6 80V688',
      { fill: 'none', stroke: '#62687B', 'stroke-width': 1.1, opacity: 0.75 });
    P(bg, polyD([[690, 688], [744, 688], [868, 80], [814, 80]]) + polyD([[1150, 688], [1176, 688], [1300, 80], [1274, 80]]),
      { fill: '#FFFFFF', opacity: 0.035 });
    // sill
    P(bg, polyD([[380, 700], [1388, 700], [1436, 717], [372, 717]]), { fill: '#F4EEE4' });
    P(bg, rectD(372, 717, 1064, 6), { fill: '#E2D9CA' });
    P(bg, rectD(372, 723, 1064, 10), { fill: linV(723, 733, [[0, '#6B5A45', 0.16], [1, '#6B5A45', 0]]) });

    // ================================================================ BG: left window, Logan Square column, globe lamp
    P(bg, polyD([[-292, 84], [152, 84], [140, 96], [-280, 96]]), { fill: '#CFC5B5' });
    P(bg, polyD([[-292, 84], [-280, 96], [-280, 478], [-292, 490]]), { fill: '#D6CCBC' });
    P(bg, rectD(-280, 96, 420, 382), { fill: linV(120, 466, [[0, '#0B1630'], [0.5, '#16274C'], [1, '#26345A']]) });
    P(bg, cloudD(-260, 120, 168, 22, 13), { fill: cloudFill, opacity: 0.8 });
    P(bg, polyD([[-266, 466], [-266, 330], [-200, 330], [-200, 300], [-150, 300], [-150, 352], [-60, 352], [-60, 316], [10, 316], [10, 360], [128, 360], [128, 466]]), { fill: '#16223F' });
    building(-250, -120, 236, { seed: 31, c0: '#1F2643', c1: '#2C3251', ox: 9, oy: 14, w: 11, h: 14, gx: 20, gy: 25, lit: 0.34, parapet: '#2A3150', bottom: 466 });
    // the Logan Square column (Illinois Centennial Monument), floodlit, far away
    P(bg, ellD(98, 330, 24, 80), { fill: radB([[0, '#FFE6B8', 0.3], [1, '#FFE6B8', 0]]) });
    P(bg, polyD([[95.2, 272], [100.8, 272], [101.8, 470], [94.2, 470]]), { fill: linH(94, 102, [[0, '#E6DCC6'], [1, '#B9AC93']]) });
    P(bg, rectD(93.6, 268.5, 8.8, 3.5) + polyD([[96, 268.5], [100, 268.5], [99.4, 264], [96.6, 264]]), { fill: '#E8DEC9' });
    P(bg, 'M98 264L93.5 258.5L97.2 260.6L98 256L98.8 260.6L102.5 258.5Z', { fill: '#2E2A3C' });
    P(bg, rectD(-280, 96, 420, 24) + rectD(-280, 466, 420, 12) + rectD(-280, 96, 14, 382) + rectD(128, 96, 12, 382) + rectD(-76, 120, 12, 346), { fill: '#1E1F26' });
    P(bg, rectD(-280, 98, 420, 7), { fill: '#2B2C34' });
    P(bg, 'M-266 120.6H128M-63.4 120V466M-265.4 120V466', { fill: 'none', stroke: '#62687B', 'stroke-width': 1.1, opacity: 0.75 });
    P(bg, polyD([[-280, 478], [140, 478], [152, 490], [-292, 490]]), { fill: '#F2ECE2' });
    // globe pendant lamp
    P(bg, ellD(45, 182, 170), { fill: radB([[0, '#FFF8E6', 0.9], [0.22, '#FFF1D6', 0.55], [0.55, '#FFE8C2', 0.16], [1, '#FFE8C2', 0]]) });
    P(bg, 'M45 146V-400', { stroke: '#3A332C', 'stroke-width': 1.6 });
    P(bg, rrD(38, 142, 14, 8, 2), { fill: '#C2A46E' });
    P(bg, ellD(45, 182, 34), { fill: radU(38, 172, 42, [[0, '#FFFFFF'], [0.55, '#FFFBF0'], [0.82, '#FCEFD2'], [1, '#EFD9AE']]) });
    P(bg, 'M24 168Q30 156 42 152', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.9 });

    // ================================================================ BG: baseboard + blond wood floor
    P(bg, rectD(-2600, 754, 6400, 14), { fill: '#F3EEE6' });
    P(bg, 'M-2600 754.5H3800', { stroke: '#D2C8B8', 'stroke-width': 1 });
    P(bg, rectD(-2600, WALL_Y, 6400, 3000), { fill: linV(WALL_Y, 1700, [[0, '#CBA97B'], [0.1, '#D6B686'], [0.45, '#DFC092'], [1, '#E6CA9E']]) });
    (function floor() {
      // plank detail only where any camera can reach (x -800..1800, y up to 1900); the base fill covers the rest
      var r = LB.rng(41), PW = 0.085, Zw = FK / (WALL_Y - HZ), Zmin = FK / (1900 - HZ);
      var dark = '', light = '', seams = '', joints = '', grain = '', grainL = '';
      var X0 = Math.floor(unproj(-800, WALL_Y)[0] / PW) * PW, X1 = unproj(1800, WALL_Y)[0];
      function inView(X, za, zb) {
        var a = proj(X, za), b = proj(X, zb);
        return Math.max(a[0], b[0]) > -820 && Math.min(a[0], b[0]) < 1820;
      }
      function clipZ(X) {
        // smallest Z (nearest) whose screen x stays within the painted area
        if (Math.abs(X) < 1e-6) return Zmin;
        var lim = X > 0 ? 1800 : -800;
        return Math.max(Zmin, FK * X / (lim - VX));
      }
      for (var X = X0; X < X1; X += PW) {
        var zEnd = clipZ(X);
        var a = proj(X, Zw), b = proj(X, zEnd);
        seams += 'M' + pt(a[0], a[1]) + 'L' + pt(b[0], b[1]);
        var z = Zw - r() * 0.7;
        var segs = [[Zw, z]];
        while (z > zEnd) { var nz = z - (0.45 + r() * 0.7); segs.push([z, Math.max(nz, zEnd)]); z = nz; }
        for (var i = 0; i < segs.length; i++) {
          var za = segs[i][0], zb = segs[i][1];
          if (!inView(X, za, zb) && !inView(X + PW, za, zb)) continue;
          var q = polyD([proj(X, za), proj(X + PW, za), proj(X + PW, zb), proj(X, zb)]);
          var v = r();
          if (v < 0.3) dark += q; else if (v > 0.72) light += q;
          if (i > 0) { var j0 = proj(X, za), j1 = proj(X + PW, za); joints += 'M' + pt(j0[0], j0[1]) + 'L' + pt(j1[0], j1[1]); }
          // fine grain only where close-ups can see it (wide shot floor and the socks close-up)
          var c = proj(X + PW / 2, (za + zb) / 2);
          if (c[0] > -250 && c[0] < 1350 && c[1] < 1300) {
            var ng = 2 + Math.floor(r() * 3);
            for (var k = 0; k < ng; k++) {
              var u = 0.12 + r() * 0.76, w1 = (r() - 0.5) * PW * 0.12, w2 = (r() - 0.5) * PW * 0.16;
              var z1 = LB.lerp(za, zb, r() * 0.3), z2 = LB.lerp(za, zb, 0.7 + r() * 0.3), zm = (z1 + z2) / 2;
              var p1 = proj(X + PW * u, z1), pm = proj(X + PW * u + w2, zm), p2 = proj(X + PW * u + w1, z2);
              var s = 'M' + pt(p1[0], p1[1]) + 'Q' + pt(pm[0], pm[1]) + ' ' + pt(p2[0], p2[1]);
              if (k % 2) grainL += s; else grain += s;
            }
          }
        }
      }
      P(bg, dark, { fill: '#B98F5E', opacity: 0.22 });
      P(bg, light, { fill: '#F6DEB2', opacity: 0.32 });
      P(bg, grain, { fill: 'none', stroke: '#A57D4E', 'stroke-width': 0.7, opacity: 0.26, 'stroke-linecap': 'round' });
      P(bg, grainL, { fill: 'none', stroke: '#FFF0D2', 'stroke-width': 2.4, opacity: 0.17, 'stroke-linecap': 'round' });
      P(bg, seams, { fill: 'none', stroke: '#9E7A4F', 'stroke-width': 0.9, opacity: 0.55 });
      P(bg, joints, { fill: 'none', stroke: '#9E7A4F', 'stroke-width': 0.9, opacity: 0.5 });
    })();
    // glossy floor: soft sheen from the room light, shadow line along the wall
    P(bg, ellD(560, 1000, 620, 150), { fill: radB([[0, '#FFF6E4', 0.32], [1, '#FFF6E4', 0]]) });
    P(bg, rectD(-2600, WALL_Y, 6400, 30), { fill: linV(WALL_Y, WALL_Y + 30, [[0, '#4F3C28', 0.22], [1, '#4F3C28', 0]]) });

    // ================================================================ BG: dracaena (corn plant), lit warm from below
    (function plant() {
      var r = LB.rng(57);
      // soft leaf shadows thrown up the wall by the uplight (filled in below), clipped to plaster, never on glass
      var clipId = LB.uid('scnclip');
      var clip = LB.el('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' }, defs);
      LB.el('path', { d: rectD(-2600, -2600, 6400, 2637) + rectD(140, 37, 232, 723) }, clip);
      var shadowG = G(bg, { 'clip-path': 'url(#' + clipId + ')' });
      // pot (hidden behind the King in the wide shot, painted for zoom-outs)
      P(bg, ellD(332, 900, 70, 12), { fill: radB([[0, '#4A3624', 0.35], [1, '#4A3624', 0]]) });
      P(bg, polyD([[288, 790], [376, 790], [368, 896], [296, 896]]), { fill: linH(288, 376, [[0, '#F1ECE3'], [1, '#CFC6B8']]) });
      // mass canes of different heights, ringed bark
      var canes = [[314, 800, 262, 232], [338, 800, 352, 200], [326, 800, 236, 356], [346, 800, 402, 324], [332, 800, 298, 296]];
      var caneD = '', caneHi = '', rings = '';
      canes.forEach(function (c) {
        var mx = (c[0] + c[2]) / 2 + (c[2] > c[0] ? -8 : 8), my = (c[1] + c[3]) / 2;
        caneD += 'M' + pt(c[0], c[1]) + 'Q' + pt(mx, my) + ' ' + pt(c[2], c[3] + 12);
        caneHi += 'M' + pt(c[0] - 3.5, c[1]) + 'Q' + pt(mx - 3.5, my) + ' ' + pt(c[2] - 3.5, c[3] + 14);
        for (var u = 0.1; u < 0.97; u += 0.075) {
          var iu = 1 - u, x = iu * iu * c[0] + 2 * iu * u * mx + u * u * c[2], y = iu * iu * c[1] + 2 * iu * u * my + u * u * (c[3] + 12);
          rings += 'M' + pt(x - 5.5, y) + 'Q' + pt(x, y + 2.6) + ' ' + pt(x + 5.5, y);
        }
      });
      P(bg, caneD, { fill: 'none', stroke: '#7B6750', 'stroke-width': 12, 'stroke-linecap': 'round' });
      P(bg, caneHi, { fill: 'none', stroke: '#C2A985', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.75 });
      P(bg, rings, { fill: 'none', stroke: '#54442F', 'stroke-width': 1.3, opacity: 0.6 });

      var L3 = { back: '', mid: '', front: '' }, lit = '', stripe = '';
      // one strap leaf: quadratic midrib bending by `bend` degrees, widest near 40 percent, pointed tip
      function leafGeo(bx, by, ang, len, wid, bend) {
        var a0 = ang * LB.deg, a1 = (ang + bend) * LB.deg;
        var c = [bx + Math.cos(a0) * len * 0.5, by + Math.sin(a0) * len * 0.5];
        var tip = [c[0] + Math.cos(a1) * len * 0.55, c[1] + Math.sin(a1) * len * 0.55];
        var L = [], R = [], M = [], N = 6;
        for (var i = 0; i <= N; i++) {
          var u = i / N, iu = 1 - u;
          var x = iu * iu * bx + 2 * iu * u * c[0] + u * u * tip[0], y = iu * iu * by + 2 * iu * u * c[1] + u * u * tip[1];
          var tx = 2 * iu * (c[0] - bx) + 2 * u * (tip[0] - c[0]), ty = 2 * iu * (c[1] - by) + 2 * u * (tip[1] - c[1]);
          var tl = Math.sqrt(tx * tx + ty * ty) || 1, nx = -ty / tl, ny = tx / tl;
          var hw = i === N ? 0 : wid * 0.5 * (0.32 + 0.68 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + u * 0.95)), 0.7));
          if (u > 0.75) hw *= 1 - (u - 0.75) / 0.25 * 0.55;
          L.push([x + nx * hw, y + ny * hw]); R.push([x - nx * hw, y - ny * hw]); M.push([x, y, nx, ny, hw]);
        }
        return { L: L, R: R, M: M, N: N, c: c, tip: tip };
      }
      function hitsBillboard(g) {
        for (var i = 0; i < g.L.length; i++) {
          if ((g.L[i][0] > 446 && g.L[i][1] < 234) || (g.R[i][0] > 446 && g.R[i][1] < 234)) return true;
        }
        return false;
      }
      function leaf(bx, by, ang, len, wid, bend, layer) {
        var g = leafGeo(bx, by, ang, len, wid, bend), tries = 0;
        while (hitsBillboard(g) && tries++ < 8) { len *= 0.85; g = leafGeo(bx, by, ang, len, wid, bend); }
        if (hitsBillboard(g)) return;
        var N = g.N, i;
        L3[layer] += smoothD(g.L.concat(g.R.slice(0, N).reverse()), true);
        // underside catching the warm uplight: the half whose normal points down
        var half = g.L[3][1] > g.R[3][1] ? g.L : g.R, mids = [];
        for (i = N; i >= 0; i--) mids.push([g.M[i][0], g.M[i][1]]);
        var drooping = g.M[N][1] > g.M[0][1] - len * 0.2;
        if (layer !== 'back' && (drooping || r() < 0.55)) lit += smoothD(half.concat(mids.slice(1)), true);
        // pale central stripe
        var se = [LB.lerp(g.c[0], g.tip[0], 0.6), LB.lerp(g.c[1], g.tip[1], 0.6)];
        stripe += 'M' + pt(bx, by) + 'Q' + pt(LB.lerp(bx, g.c[0], 0.9), LB.lerp(by, g.c[1], 0.9)) + ' ' + pt(se[0], se[1]);
      }
      var tufts = [
        { x: 300, y: 292, n: 9, len: [64, 94], wid: [20, 26], a: [-200, 20] },
        { x: 230, y: 356, n: 10, len: [66, 104], wid: [21, 27], a: [-205, 12] },
        { x: 404, y: 326, n: 9, len: [60, 96], wid: [20, 26], a: [-190, 25] },
        { x: 262, y: 222, n: 15, len: [88, 128], wid: [23, 30], a: [-196, 14] },
        { x: 352, y: 198, n: 14, len: [82, 124], wid: [23, 30], a: [-200, -6] },
      ];
      tufts.forEach(function (tf) {
        for (var i = 0; i < tf.n; i++) {
          var u = (i + 0.5) / tf.n;
          var ang = LB.lerp(tf.a[0], tf.a[1], u) + (r() - 0.5) * 18;
          var c = Math.cos(ang * LB.deg), sn = Math.sin(ang * LB.deg);
          var low = r(); // where along the cane top the leaf sprouts: lower leaves are older and droop more
          var len = LB.lerp(tf.len[0], tf.len[1], r()) * (sn < 0 ? 1 : 0.82) * (0.9 + 0.2 * low);
          var bend = (58 + 42 * low) * c * (sn < -0.85 ? 0.45 : 1) + (r() - 0.5) * 12;
          var lay = r(), layer = lay < 0.3 ? 'back' : lay < 0.7 ? 'mid' : 'front';
          leaf(tf.x + (r() - 0.5) * 12, tf.y - low * 40 + 10, ang, len, LB.lerp(tf.wid[0], tf.wid[1], r()), bend, layer);
        }
      });
      // leaf masses live once in defs; drawn as the plant and again, enlarged about the uplight, as its wall shadow
      var XL = 'http://www.w3.org/1999/xlink';
      function use(parent, id, attrs) {
        var u = LB.el('use', attrs, parent);
        u.setAttribute('href', '#' + id);
        u.setAttributeNS(XL, 'xlink:href', '#' + id);
        return u;
      }
      var cols = { back: '#2B4631', mid: '#3A6139', front: '#4C7A43' };
      ['back', 'mid', 'front'].forEach(function (k) {
        var id = LB.uid('scnleaf');
        LB.el('path', { id: id, d: L3[k] }, defs);
        if (k === 'mid') use(shadowG, id, { fill: '#6E5238', 'fill-opacity': 0.07, transform: 'translate(330 640) scale(1.24) translate(-330 -640)' });
        use(bg, id, { fill: cols[k] });
      });
      P(bg, lit, { fill: '#97AE58', opacity: 0.6 });
      P(bg, stripe, { fill: 'none', stroke: '#D2D88C', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.5 });
    })();

    // ================================================================ MID: checkered rug (projected on the floor)
    (function rug() {
      var bl = unproj(778, 786), fl = unproj(762, 1300);
      var dX = fl[0] - bl[0], dZ = fl[1] - bl[1], L = Math.sqrt(dX * dX + dZ * dZ);
      var dv = [dX / L, dZ / L], du = [-dv[1], dv[0]];
      if (du[0] < 0) du = [-du[0], -du[1]];
      var RW = 1.36, RD = 1.9, NU = 17, NV = 25;
      function at(u, v) { return proj(bl[0] + du[0] * u + dv[0] * v, bl[1] + du[1] * u + dv[1] * v); }
      P(mid, polyD([at(0, 0), at(RW, 0), at(RW, RD), at(0, RD)]), { fill: linV(786, 1400, [[0, '#E0D5BE'], [1, '#F1E9D8']]) });
      var checks = '';
      for (var i = 0; i < NU; i++) for (var j = 0; j < NV; j++) {
        if ((i + j) % 2 === 0) continue;
        var u0 = i * RW / NU, u1 = (i + 1) * RW / NU, v0 = j * RD / NV, v1 = (j + 1) * RD / NV;
        checks += polyD([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
      }
      P(mid, checks, { fill: linV(786, 1400, [[0, '#C9B795'], [1, '#D8C8A8']]) });
      var e0 = at(0, 0), e1 = at(0, RD), e2 = at(RW, 0);
      P(mid, 'M' + pt(e0[0] - 2, e0[1] + 1) + 'L' + pt(e1[0] - 2, e1[1] + 1), { stroke: '#5A4530', 'stroke-width': 3, opacity: 0.16 });
      P(mid, 'M' + pt(e1[0], e1[1]) + 'L' + pt(e0[0], e0[1]) + 'L' + pt(e2[0], e2[1]), { fill: 'none', stroke: '#B6A381', 'stroke-width': 1.4 });
    })();

    // contact shadows under the trio (soft, so they work with any rig)
    var shadowFill = radB([[0, '#4A3420', 0.34], [0.6, '#4A3420', 0.14], [1, '#4A3420', 0]]);
    P(mid, ellD(300, 954, 112, 16) + ellD(500, 954, 100, 14), { fill: shadowFill });
    P(mid, ellD(712, 954, 76, 12), { fill: shadowFill });

    // ================================================================ MID: tan clog slippers on the rug (3/4 top view)
    function clog(x, y, s, rot) {
      var c = G(mid, { transform: 'translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')' });
      var K = 0.48, NS = 56;
      function fp(t, ins) {
        var co = Math.cos(t), si = Math.sin(t);
        return [ins * 32 * (co < 0 ? -1 : 1) * Math.pow(Math.abs(co), 0.8), ins * si * (11 - 2.4 * co)];
      }
      // silhouette of the outline extruded from height h0 to h1 (far half on top, near half at the bottom)
      // upper height: domed over the toe, lower at the open heel
      function ht(x) {
        var toe = x < -8 ? Math.sqrt(Math.max(0, 1 - Math.pow((x + 8) / 24.5, 2))) : 1;
        return 8 + 16 * toe * (1 - 0.38 * LB.smoothstep(2, 31, x));
      }
      // silhouette of the outline extruded from height h0 to h1 (far half on top, near half at the bottom)
      function extr(h0, h1, ins) {
        var p = [], i, q;
        for (i = 0; i <= NS / 2; i++) { q = fp(Math.PI + i / NS * 2 * Math.PI, ins); p.push([q[0], q[1] * K - (h1 < 0 ? ht(q[0]) : h1)]); }
        for (i = 0; i <= NS / 2; i++) { q = fp(i / NS * 2 * Math.PI, ins); p.push([q[0], q[1] * K - h0]); }
        return polyD(p);
      }
      function ring(h, ins) {
        var p = [];
        for (var i = 0; i < NS; i++) { var q = fp(i / NS * 2 * Math.PI, ins); p.push([q[0], q[1] * K - (h < 0 ? ht(q[0]) : h)]); }
        return polyD(p);
      }
      function nearEdge(h, ins) {
        var d = '';
        for (var i = 0; i <= NS / 2; i++) { var q = fp(i / NS * 2 * Math.PI, ins); d += (i ? 'L' : 'M') + pt(q[0], q[1] * K - h); }
        return d;
      }
      P(c, ellD(1, 2, 37, 9), { fill: radB([[0, '#3E2C1C', 0.38], [0.7, '#3E2C1C', 0.12], [1, '#3E2C1C', 0]]) });
      P(c, extr(0, 7, 1), { fill: '#5B3E28' });
      P(c, nearEdge(7, 1), { fill: 'none', stroke: '#8C6744', 'stroke-width': 1.3 });
      P(c, extr(7, -1, 0.95), { fill: linV(-26, -6, [[0, '#C7935F'], [1, '#9A693F']]) });
      P(c, nearEdge(8.6, 0.96), { fill: 'none', stroke: '#EAD3A6', 'stroke-width': 1.7, 'stroke-dasharray': '1.7 1.3', opacity: 0.9 });
      P(c, ring(-1, 0.95), { fill: linH(-32, 32, [[0, '#D9AA73'], [1, '#C9965F']]) });
      P(c, ellD(-14, -25, 12, 4.2), { fill: radB([[0, '#F0CC9A', 0.9], [1, '#F0CC9A', 0]]) });
      P(c, 'M-29.5 -16C-27 -26.5 -12 -29 -2 -26.2', { fill: 'none', stroke: '#A97A49', 'stroke-width': 0.9, 'stroke-dasharray': '1.6 1.2' });
      P(c, ellD(11.5, -21.6, 16.5, 5), { fill: '#F3EADA' });
      P(c, ellD(12.1, -21, 13, 3.2), { fill: '#C6AE88' });
      P(c, 'M-0.5 -23.4Q11.5 -26.6 24 -23.2', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: 0.8 });
    }
    clog(818, 894, 0.98, -6);
    clog(826, 944, 1.04, 4);

    // ================================================================ MID: desk, monitor, headphones
    P(mid, rectD(868, 622, 10, 178) + rectD(1520, 622, 10, 178), { fill: '#C9A97C' });
    P(mid, polyD([[870, 597], [1530, 597], [1536, 612], [862, 612]]), { fill: '#E9D3AC' });
    P(mid, rectD(862, 612, 674, 10), { fill: '#CFB185' });
    P(mid, rectD(870, 622, 660, 10), { fill: linV(622, 632, [[0, '#2A2030', 0.4], [1, '#2A2030', 0]]) });
    P(mid, 'M864 612.5H1534', { stroke: '#FFF4DC', 'stroke-width': 1, opacity: 0.8 });
    P(mid, ellD(965, 600, 30, 4.5), { fill: '#24252B' });
    P(mid, rectD(960, 566, 10, 34), { fill: '#2B2C33' });
    P(mid, rrD(890, 476, 152, 94, 4), { fill: '#17181D' });
    P(mid, rectD(894.5, 480.5, 143, 82), { fill: linV(480, 562, [[0, '#1D2433'], [1, '#0E1119']]) });
    P(mid, polyD([[930, 480.5], [968, 480.5], [916, 562.5], [894.5, 562.5], [894.5, 540]]), { fill: '#FFFFFF', opacity: 0.06 });
    P(mid, 'M891 477H1041', { stroke: '#4C4F5A', 'stroke-width': 1, opacity: 0.9 });
    P(mid, 'M976 596C978 578 1014 578 1016 596', { fill: 'none', stroke: '#E7E1D6', 'stroke-width': 3.4 });
    P(mid, ellD(976, 596, 8, 5) + ellD(1016, 596, 8, 5), { fill: '#F1ECE3' });

    // ================================================================ MID: red chairs
    function chair(x, y, s) {
      var c = G(mid, { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' });
      P(c, ellD(0, -6, 74, 12), { fill: radB([[0, '#4A3420', 0.25], [1, '#4A3420', 0]]) });
      P(c, 'M-44 -18L-40 -128M44 -18L40 -128', { stroke: '#6E2420', 'stroke-width': 3.4, 'stroke-linecap': 'round' });
      P(c, 'M-54 0L-50 -120M54 0L50 -120', { stroke: '#8F3229', 'stroke-width': 3.8, 'stroke-linecap': 'round' });
      P(c, 'M-52 -134C-56 -180 -60 -218 -58 -236Q-57 -244 -49 -244H49Q57 -244 58 -236C60 -218 56 -180 52 -134Z',
        { fill: linH(-60, 60, [[0, '#C95A4C'], [0.35, '#B4453A'], [1, '#8A3028']]) });
      P(c, 'M-50 -236Q-49 -240 -42 -240H40', { fill: 'none', stroke: '#E08C7C', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.8 });
      P(c, 'M-60 -132Q-60 -138 -54 -138H54Q60 -138 61 -132L63 -121H-62Z', { fill: '#B9463B' });
      P(c, rrD(-63, -121, 126, 8, 3), { fill: '#82302A' });
      P(c, 'M-56 -133H40', { stroke: '#E07565', 'stroke-width': 1.4, opacity: 0.7 });
    }
    chair(1142, 842, 0.93);
    chair(918, 868, 1);

    // ================================================================ MID: kitchen island and its clutter (left)
    (function kitchen() {
      // wire shelf rack standing on the counter, coffee bags and jars
      P(mid, rectD(-40, 352, 3, 178) + rectD(157, 352, 3, 178) + rectD(-42, 352, 204, 4) + rectD(-42, 440, 204, 4), { fill: '#1E1D21' });
      P(mid, 'M-42 348.5H162M-42 436.5H162', { stroke: '#1E1D21', 'stroke-width': 1.2 });
      P(mid, rrD(70, 322, 82, 30, 3), { fill: '#EAE8E3' });
      P(mid, rectD(78, 330, 10, 14) + rectD(94, 330, 10, 14) + rectD(110, 330, 10, 14) + rectD(126, 330, 10, 14), { fill: '#C9C5BD' });
      P(mid, rrD(20, 326, 28, 26, 4), { fill: '#6B4A33', opacity: 0.85 });
      P(mid, rrD(18, 320, 32, 8, 2), { fill: '#3B3A3E' });
      function bag(x, w, top, body, label, lab2) {
        P(mid, 'M' + pt(x, 440) + 'L' + pt(x + 1, top + 6) + 'L' + pt(x + w - 1, top + 6) + 'L' + pt(x + w, 440) + 'Z', { fill: body });
        P(mid, rectD(x + 1, top, w - 2, 7), { fill: body });
        P(mid, rectD(x + 1, top + 6, w - 2, 1.4), { fill: '#000000', opacity: 0.18 });
        P(mid, rrD(x + 5, top + 16, w - 10, Math.min(24, 430 - top - 16), 2), { fill: label });
        if (lab2) P(mid, rectD(x + 8, top + 22, w - 16, 3) + rectD(x + 8, top + 28, w - 20, 2), { fill: lab2 });
      }
      bag(-34, 34, 386, '#B4433A', '#F1E7D6', '#B4433A');
      bag(2, 34, 392, '#C5A177', '#FFFFFF', '#2E2A27');
      bag(38, 34, 380, '#2C2B30', '#C9A55A', '#2C2B30');
      bag(74, 32, 394, '#ECE8E0', '#5B7FB0', '#ECE8E0');
      bag(108, 36, 398, '#B8956A', '#D2483C', '#F4ECDD');
      P(mid, rrD(120, 452, 14, 78, 4) + rectD(123, 444, 8, 10), { fill: '#3E5A3A' });
      P(mid, rrD(138, 466, 16, 64, 4) + rectD(142, 458, 8, 10), { fill: '#A8682B', opacity: 0.9 });
      P(mid, rrD(88, 474, 26, 56, 5), { fill: '#EFEBE4' });
      P(mid, 'M124 458V526M142 470V526', { stroke: '#FFFFFF', 'stroke-width': 1.4, opacity: 0.5 });

      // tissue box on the counter (floral print) with a tissue poking out
      P(mid, polyD([[4, 494], [62, 494], [66, 488], [8, 488]]), { fill: '#F4EBDD' });
      P(mid, rectD(4, 494, 58, 40), { fill: '#E7D9C6' });
      var fl = '', r = LB.rng(61);
      for (var i = 0; i < 16; i++) fl += ellD(8 + r() * 50, 498 + r() * 32, 1.8, 1.6);
      P(mid, fl, { fill: '#D98C98' });
      fl = '';
      for (i = 0; i < 12; i++) fl += ellD(8 + r() * 50, 498 + r() * 32, 1.5, 1.3);
      P(mid, fl, { fill: '#7FA6C4' });
      P(mid, 'M24 491C20 476 30 468 36 474C40 464 52 470 46 482C50 484 46 491 42 491Z', { fill: '#FFFFFF' });
      P(mid, 'M33 476Q37 482 36 490', { fill: 'none', stroke: '#DCD6CC', 'stroke-width': 1 });

      // terrazzo counter top with seeded speckles
      var top = [[-440, 528], [190, 528], [197, 612], [-460, 612]];
      P(mid, polyD(top), { fill: linV(528, 612, [[0, '#E6E1D8'], [1, '#F1EDE6']]) });
      P(mid, rectD(-460, 612, 657, 22), { fill: linV(612, 634, [[0, '#E4DFD6'], [1, '#D3CDC2']]) });
      var sp = { g: '', rust: '', k: '', w: '' };
      r = LB.rng(73);
      function speck(x, y, sz) {
        var v = r(), key = v < 0.42 ? 'g' : v < 0.66 ? 'rust' : v < 0.86 ? 'k' : 'w';
        var pts = [], n = 4, a0 = r() * 6.28;
        for (var k = 0; k < n; k++) {
          var a = a0 + k / n * 6.283, rr = sz * (0.6 + r() * 0.5);
          pts.push([x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 0.62]);
        }
        sp[key] += polyD(pts);
      }
      for (i = 0; i < 380; i++) {
        var u = r(), v = r();
        var x = u < 0.75 ? -60 + r() * 256 : -460 + r() * 400, y = 529 + v * 104;
        if (y < 612) { var xl = LB.lerp(-440, -460, (y - 528) / 84), xr = LB.lerp(190, 197, (y - 528) / 84); if (x < xl || x > xr) continue; }
        speck(x, y, 0.7 + r() * (r() < 0.12 ? 2.2 : 1.1));
      }
      P(mid, sp.g, { fill: '#9C968D' });
      P(mid, sp.rust, { fill: '#C58262' });
      P(mid, sp.k, { fill: '#45403C' });
      P(mid, sp.w, { fill: '#D9B98F' });
      P(mid, 'M-460 612.6H197', { stroke: '#FFFFFF', 'stroke-width': 1.3, opacity: 0.85 });

      // soda can (pink + orange), half-drunk pint, two small glasses, cat-print bottle
      P(mid, rrD(-2, 568, 23, 42, 3), { fill: linH(-2, 21, [[0, '#D9806F'], [0.35, '#F6C9B6'], [0.7, '#E99A8C'], [1, '#C9705F']]) });
      P(mid, rectD(-2, 584, 23, 9), { fill: '#F08A3C', opacity: 0.85 });
      P(mid, ellD(9.5, 568.5, 11.5, 2.2), { fill: '#C9CED3' });
      P(mid, 'M3 573V606', { stroke: '#FFFFFF', 'stroke-width': 1.4, opacity: 0.7 });
      P(mid, polyD([[24.5, 571], [49.5, 571], [47.6, 603], [26.4, 603]]), { fill: linV(571, 603, [[0, '#F3C55E'], [1, '#D9962C']]) });
      P(mid, rrD(23.6, 565.5, 26.8, 6.5, 2.5), { fill: '#FFF5DD' });
      P(mid, polyD([[22, 540], [52, 540], [48, 604], [26, 604]]), { fill: '#E3ECF2', opacity: 0.28, stroke: '#FFFFFF', 'stroke-width': 1, 'stroke-opacity': 0.7 });
      P(mid, ellD(37, 540, 15, 2.6), { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1, opacity: 0.8 });
      P(mid, 'M27.5 546L29.5 598', { stroke: '#FFFFFF', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.85 });
      P(mid, polyD([[64, 552], [82, 552], [80.5, 576], [65.5, 576]]) + polyD([[90, 558], [106, 558], [105, 580], [91, 580]]),
        { fill: '#E3ECF2', opacity: 0.3, stroke: '#FFFFFF', 'stroke-width': 1, 'stroke-opacity': 0.75 });
      P(mid, 'M67 556V573M93 562V577', { stroke: '#FFFFFF', 'stroke-width': 1.3, opacity: 0.8 });
      // cat-print water bottle
      P(mid, 'M140 504Q140 492 148 492Q156 492 156 504', { fill: 'none', stroke: '#3D4B45', 'stroke-width': 3 });
      P(mid, rrD(135, 500, 26, 16, 4), { fill: '#3D4B45' });
      P(mid, rrD(132, 514, 32, 90, 8), { fill: linH(132, 164, [[0, '#E4ECDB'], [0.4, '#F3F6EC'], [1, '#CBD5C2']]) });
      var cats = [[141, 530, '#7B6656'], [155, 545, '#F0A35C'], [142, 560, '#2E2B2A'], [155, 576, '#9A8E86'], [142, 590, '#F0A35C'], [154, 528, '#2E2B2A']];
      cats.forEach(function (cc) {
        P(mid, 'M' + pt(cc[0] - 5, cc[1] + 1) + 'Q' + pt(cc[0] - 5, cc[1] + 6) + ' ' + pt(cc[0], cc[1] + 6) + 'Q' + pt(cc[0] + 5, cc[1] + 6) + ' ' + pt(cc[0] + 5, cc[1] + 1) +
          'L' + pt(cc[0] + 4.5, cc[1] - 5) + 'L' + pt(cc[0] + 1.5, cc[1] - 2.5) + 'L' + pt(cc[0] - 1.5, cc[1] - 2.5) + 'L' + pt(cc[0] - 4.5, cc[1] - 5) + 'Z', { fill: cc[2] });
      });
      P(mid, ellD(140, 531, 0.8) + ellD(143, 531, 0.8) + ellD(154, 546, 0.8) + ellD(157, 546, 0.8), { fill: '#FFFFFF', opacity: 0.85 });
      P(mid, 'M137 520V596', { stroke: '#FFFFFF', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.8 });

      // maple island body: apron, legs, open shelves, wire baskets, the Peanut Day box
      P(mid, ellD(-130, 944, 360, 16), { fill: radB([[0, '#3E2E20', 0.36], [1, '#3E2E20', 0]]) });
      P(mid, rectD(-436, 650, 610, 232), { fill: linV(650, 882, [[0, '#4A3B2E'], [1, '#6E5B47']]) });
      P(mid, rectD(-460, 634, 657, 16), { fill: '#E2C69B' });
      P(mid, rrD(-6, 664, 86, 30, 10) + rrD(96, 668, 62, 26, 9), { fill: '#D7A9A3' });
      P(mid, rrD(10, 672, 40, 18, 8) + rrD(108, 674, 36, 14, 6), { fill: '#EFE2CF' });
      function basket(x, y, w, h) {
        var d = rectD(x, y, w, h), k;
        for (k = x + 8; k < x + w - 2; k += 8) d += 'M' + pt(k, y) + 'V' + f(y + h);
        for (k = y + 10; k < y + h - 2; k += 10) d += 'M' + pt(x, k) + 'H' + f(x + w);
        P(mid, d, { fill: 'none', stroke: '#1E1E22', 'stroke-width': 1.2 });
        P(mid, rectD(x, y, w, h), { fill: 'none', stroke: '#1E1E22', 'stroke-width': 2.4 });
      }
      basket(-8, 676, 92, 76);
      basket(94, 680, 70, 72);
      P(mid, rectD(-460, 752, 657, 12) + rectD(-460, 880, 657, 14), { fill: '#E6CCA2' });
      P(mid, rectD(-460, 634, 24, 296) + rectD(172, 634, 25, 296) + rectD(-150, 650, 20, 280), { fill: linH(-460, 200, [[0, '#E7CDA4'], [1, '#DDC093']]) });
      P(mid, rectD(190, 634, 7, 296), { fill: '#C4A578' });
      P(mid, 'M-460 752.6H197M-460 880.6H197M-460 634.6H197', { stroke: '#FFF3DA', 'stroke-width': 1, opacity: 0.85 });
      P(mid, ellD(-448, 938, 9) + ellD(184, 938, 9) + ellD(-140, 938, 8), { fill: '#2A2828' });
      // Peanut Day box
      P(mid, polyD([[26, 792], [162, 792], [156, 784], [32, 784]]), { fill: '#F6F0E4' });
      P(mid, rectD(26, 792, 136, 88), { fill: linV(792, 880, [[0, '#F0E9DB'], [1, '#D9CFBD']]) });
      P(mid, polyD([[162, 792], [170, 786], [170, 874], [162, 880]]), { fill: '#CBBFA8' });
      P(mid, rectD(84, 784, 20, 13), { fill: '#D8C29C', opacity: 0.85 });
      var lbl = G(mid, { transform: 'rotate(-6 94 840)' });
      var tA = { 'font-family': FONT_BOX, 'font-size': 21, 'text-anchor': 'middle', fill: '#2B2522', stroke: '#FFFFFF', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
      tA.x = 92; tA.y = 834; tA.text = 'Peanut'; LB.el('text', tA, lbl);
      tA.x = 100; tA.y = 860; tA.text = 'Day'; LB.el('text', tA, lbl);
    })();

    // ================================================================ MID: state layers (shoujo bokeh, villain panel, impact)
    var bokehG = G(mid, {});
    LB.show(bokehG, false);
    var bubbleFills = {
      p: radB([[0, '#FFE3EF', 0.12], [0.55, '#FFC2D9', 0.28], [0.84, '#FF9FC4', 0.55], [1, '#FFD3E5', 0.95]]),
      g: radB([[0, '#FFF4D8', 0.12], [0.55, '#FFE0A0', 0.28], [0.84, '#FFC85E', 0.55], [1, '#FFE9B5', 0.95]]),
      w: radB([[0, '#FFFFFF', 0.1], [0.55, '#FFF4FA', 0.25], [0.84, '#FFFFFF', 0.5], [1, '#FFFFFF', 0.95]]),
      dp: radB([[0, '#FFD0E2', 0.62], [0.55, '#FFB8D2', 0.42], [1, '#FFB8D2', 0]]),
      dg: radB([[0, '#FFE6B0', 0.62], [0.55, '#FFD47E', 0.42], [1, '#FFD47E', 0]]),
      dw: radB([[0, '#FFFFFF', 0.6], [0.55, '#FFF0F6', 0.38], [1, '#FFF0F6', 0]]),
    };
    var ringCol = { p: '#FF9EC6', g: '#FFC85A', w: '#FFFFFF' };
    var BUB = [
      [210, 150, 34, 'p'], [300, 92, 24, 'dg'], [398, 196, 40, 'w'], [452, 112, 26, 'p'], [560, 140, 34, 'dg'], [618, 252, 24, 'p'],
      [664, 118, 18, 'w'], [800, 142, 40, 'dp'], [884, 244, 28, 'g'], [858, 88, 16, 'w'], [112, 262, 34, 'dg'], [72, 424, 40, 'p'],
      [140, 560, 22, 'p'], [96, 722, 34, 'dp'], [150, 828, 18, 'g'], [904, 382, 34, 'w'], [880, 540, 30, 'dp'], [934, 700, 38, 'g'],
      [872, 822, 20, 'p'], [502, 200, 28, 'w'], [378, 330, 22, 'dw'], [626, 334, 22, 'g'], [250, 70, 14, 'w'], [736, 70, 26, 'dg'],
    ];
    var bubbles = BUB.map(function (b, i) {
      var gN = G(bokehG, {});
      var disc = b[3].charAt(0) === 'd';
      var circ = LB.el('circle', { cx: 0, cy: 0, r: b[2], fill: bubbleFills[b[3]], stroke: disc ? 'none' : ringCol[b[3]], 'stroke-width': 2 }, gN);
      var hi = P(gN, 'M' + pt(-b[2] * 0.62, -b[2] * 0.22) + 'A' + f(b[2] * 0.66) + ' ' + f(b[2] * 0.66) + ' 0 0 1 ' + pt(-b[2] * 0.2, -b[2] * 0.62),
        { fill: 'none', stroke: '#FFFFFF', 'stroke-width': Math.max(1.4, b[2] * 0.09), 'stroke-linecap': 'round' });
      if (disc) LB.show(hi, false);
      return { x: b[0], y: b[1], r: b[2], g: gN, c: circ, hi: hi, d: LB.hash(i * 3.1 + 1), d2: LB.hash(i * 7.7 + 5), ph: LB.hash(i * 1.3 + 9) };
    });

    var panelG = G(mid, {});
    LB.show(panelG, false);
    var PC = { x: 500, y: 330 };
    var panelBase = P(panelG, rectD(-2600, -2600, 6400, 6400), { fill: radU(PC.x, PC.y, 250, [[0, '#4A1D6E'], [0.2, '#3A1758'], [0.62, '#220A3C'], [1, '#12061F']]) });
    var panelAura = P(panelG, ellD(PC.x, PC.y - 6, 150), { fill: radB([[0, '#9B45D8', 0.5], [0.5, '#6E2AA8', 0.18], [1, '#6E2AA8', 0]]) });
    var linesG = G(panelG, {}), linesDk, linesLt;
    (function () {
      var r = LB.rng(91), dk = '', lt = '', i, a, w, r0, r1 = 1900;
      function wedge(a, w, r0) {
        var c = Math.cos(a * LB.deg), s = Math.sin(a * LB.deg);
        var ca = Math.cos((a - w) * LB.deg), sa = Math.sin((a - w) * LB.deg), cb = Math.cos((a + w) * LB.deg), sb = Math.sin((a + w) * LB.deg);
        return polyD([[PC.x + c * r0, PC.y + s * r0], [PC.x + ca * r1, PC.y + sa * r1], [PC.x + cb * r1, PC.y + sb * r1]]);
      }
      for (i = 0; i < 96; i++) { a = i / 96 * 360 + r() * 2.5; w = 0.35 + r() * 1.1; r0 = 40 + r() * 70; dk += wedge(a, w, r0); }
      for (i = 0; i < 36; i++) { a = (i + 0.5) / 36 * 360 + r() * 4; w = 0.15 + r() * 0.35; r0 = 70 + r() * 80; lt += wedge(a, w, r0); }
      linesDk = P(linesG, dk, { fill: '#07020D', 'fill-opacity': 0.6 });
      linesLt = P(linesG, lt, { fill: '#8A4BC2', 'fill-opacity': 0.2 });
    })();
    var panelVig = P(panelG, rectD(-2600, -2600, 6400, 6400), { fill: radU(PC.x, PC.y, 215, [[0, '#050009', 0], [0.48, '#050009', 0], [0.8, '#050009', 0.5], [1, '#050009', 0.88]]) });

    var impactR = P(mid, rectD(-3000, -3000, 7000, 7000), { fill: '#C8161E' });
    LB.show(impactR, false);

    // ================================================================ update (attributes only, cached)
    var cache = {};
    function setA(node, key, name, val) { if (cache[key] !== val) { cache[key] = val; node.setAttribute(name, val); } }
    function vis(node, key, on) { if (cache[key] !== on) { cache[key] = on; LB.show(node, on); } }

    return {
      update: function (s, t) {
        s = s || {};
        t = num(t, 0);

        // impact: flat red over the whole room, under the characters
        var imp = LB.clamp(num(s.impact, 0), 0, 1);
        vis(impactR, 'imp', imp > 0.001);
        if (imp > 0.001) setA(impactR, 'impO', 'fill-opacity', r3(imp));

        // villain panel
        var pk = s.panel === 'villain' ? LB.clamp(num(s.panelK, 1), 0, 1) : 0;
        vis(panelG, 'pan', pk > 0.001);
        if (pk > 0.001) {
          setA(panelBase, 'pb', 'fill-opacity', r3(pk));
          setA(panelAura, 'pa', 'fill-opacity', r3(pk * (0.85 + 0.15 * LB.loopSin(t, 6))));
          setA(panelVig, 'pv', 'fill-opacity', r3(pk));
          setA(linesDk, 'pl', 'fill-opacity', r3(0.6 * pk));
          setA(linesLt, 'pl2', 'fill-opacity', r3(0.2 * pk));
          setA(linesG, 'plr', 'transform', 'rotate(' + r3(t * (LB.reducedMotion ? 1.5 : 5)) + ' ' + PC.x + ' ' + PC.y + ')');
        }

        // shoujo bokeh: bloom in with stagger, drift up, then pop out as breaking rings
        var bk = LB.clamp(num(s.bokeh, 0), 0, 1), pop = LB.clamp(num(s.bokehPop, 0), 0, 1);
        var bOn = bk > 0.001 && pop < 0.999;
        vis(bokehG, 'bok', bOn);
        if (bOn) {
          var drift = LB.reducedMotion ? 0.3 : 1;
          bubbles.forEach(function (b, i) {
            var k = LB.clamp((bk - b.d * 0.4) / 0.6, 0, 1);
            var pi = LB.clamp((pop - b.d2 * 0.35) / 0.65, 0, 1);
            var sc = (0.35 + 0.65 * LB.ease.outBack(k)) * (1 + 0.55 * LB.ease.outCubic(pi));
            var x = b.x + 6 * drift * LB.loopSin(t, 3, b.ph);
            var y = b.y - drift * (14 * t + 5 * LB.loopSin(t, 6, b.ph + 0.25));
            setA(b.g, 'bt' + i, 'transform', 'translate(' + r3(x) + ' ' + r3(y) + ') scale(' + r3(Math.max(0.001, sc)) + ')');
            var body = k * (1 - pi);
            setA(b.c, 'bf' + i, 'fill-opacity', r3(body * 0.95));
            setA(b.c, 'bs' + i, 'stroke-opacity', r3(k * (pi > 0 ? (1 - pi) * 1.0 : 0.75)));
            var circ = 2 * Math.PI * b.r, seg = circ / 8, dash = seg * (1 - 0.8 * pi);
            setA(b.c, 'bd' + i, 'stroke-dasharray', pi > 0 ? r3(dash) + ' ' + r3(seg - dash) : 'none');
            setA(b.c, 'bw' + i, 'stroke-width', r3(1.6 + 1.6 * Math.sin(Math.PI * pi)));
            setA(b.hi, 'bh' + i, 'stroke-opacity', r3(body * 0.9));
          });
        }

        // billboard brightness: pre-baked glow layers driven by opacity (dips to 0.6, boost to 1.3)
        var gB = Math.max(0, num(s.billboardGlow, 1));
        setA(bbGlow, 'bbg', 'fill-opacity', r3(LB.clamp(0.62 * gB, 0, 1)));
        setA(bbCones, 'bbc', 'fill-opacity', r3(LB.clamp((gB - 0.6) / 0.7, 0, 1.3) / 1.3));
        var tg = r3(LB.clamp(0.16 + (gB - 1) * 1.3, 0, 1));
        setA(bbTextGlow, 'bbt', 'fill-opacity', tg);
        setA(bbTextGlow, 'bbt2', 'stroke-opacity', tg);
        var dim = LB.clamp((1 - gB) * 0.95, 0, 0.85);
        vis(bbDim, 'bbdv', dim > 0.001);
        if (dim > 0.001) setA(bbDim, 'bbd', 'fill-opacity', r3(dim));

        // golden arches: halo opacity/scale, blurred neon and a warm wash for the flare
        var a = Math.max(0, num(s.archesGlow, 1)), ex = Math.max(0, a - 1);
        setA(archHalo, 'ah', 'fill-opacity', r3(LB.clamp(0.5 + ex * 0.42, 0, 1) * Math.min(1, a)));
        setA(archHalo, 'ahs', 'transform', 'scale(' + r3(1 + ex * 0.95) + ')');
        setA(archBlur, 'ab', 'opacity', r3(LB.clamp(0.62 * a, 0, 1)));
        setA(archBlur, 'abw', 'stroke-width', r3(9 + ex * 5));
        vis(archWash, 'awv', ex > 0.001);
        if (ex > 0.001) setA(archWash, 'aw', 'fill-opacity', r3(LB.clamp(ex * 0.85, 0, 1)));
        setA(archCore, 'ac', 'stroke', LB.lerpColor('#FFEDB0', '#FFFBEA', LB.clamp(ex / 1.2, 0, 1)));
      },
    };
  }

  LB.register('scene', { create: create });
})();
