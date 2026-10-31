/* Logan Bishops: the Bishop rig (right). Built on the King's conventions (docs/STYLE.md, src/char-king.js). */
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
  function Sc(x, y) { return [x, 0, 0, y == null ? x : y, 0, 0]; }
  function chain() { var m = [1, 0, 0, 1, 0, 0]; for (var i = 0; i < arguments.length; i++) m = mul(m, arguments[i]); return m; }
  function ap(m, p) { return { x: m[0] * p[0] + m[2] * p[1] + m[4], y: m[1] * p[0] + m[3] * p[1] + m[5] }; }
  function ms(m) { return 'matrix(' + m.map(function (v) { return Math.round(v * 1e5) / 1e5; }).join(' ') + ')'; }
  function about(px, py, deg) { return chain(T(px, py), R(deg), T(-px, -py)); }
  var clamp = LB.clamp, lerp = LB.lerp;
  function lerpPts(A, B, k) { return A.map(function (p, i) { return [lerp(p[0], B[i][0], k), lerp(p[1], B[i][1], k)]; }); }
  function qb(a, c, b, k) { var u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; }

  // ------------------------------------------------------------------ fixed rig layout (world units, photo pose)
  var FEET = [718, 950];
  var HIP = [718, 610];
  var NECK = [720, 315];        // head pivot (top of the neck)
  var FACE_UP = -50;            // face origin (eye midpoint) sits 50 units above the pivot before tilt
  var SHOULDER = [664, 378];    // character's right shoulder (screen-left, the casting arm)
  var MITRE_BASE = -55;         // mitre band top at the sides (face-local): mitreStretch scales everything above it
  var MITRE_TIP = -188;
  var WRIST0 = [604, 618], WRIST_C = [572, 452], WRIST1 = [594, 361]; // casting arm: hidden at the side -> out at shoulder height
  var HAND_S = 1.25;            // the casting hand reads bigger (it reaches toward the camera-left)
  var MUS_Y = 31;               // mustache squash pivot (face-local)

  // cape front panel, screen-left half: photo pose (L0) and cast pose (L1, the arm lifts it into a wing). Same point count.
  var L0 = [[716, 351], [700, 349], [679, 352], [653, 362], [629, 376], [611, 399], [600, 440], [594, 500], [590, 570], [588, 640],
    [592, 700], [600, 743], [618, 758], [638, 773], [656, 771], [676, 784], [700, 790], [716, 793], [719, 650], [719, 500]];
  var L1 = [[716, 351], [700, 349], [680, 351], [659, 352], [639, 350], [621, 349], [607, 348], [597, 354], [599, 372], [604, 440],
    [608, 520], [622, 610], [636, 690], [650, 740], [664, 762], [682, 780], [702, 789], [716, 793], [719, 650], [719, 500]];
  // satin fold shadows and highlight streaks on that panel (rest / cast), same point counts
  var LF0 = [[[626, 404], [612, 480], [604, 570], [602, 660], [606, 742]], [[662, 376], [650, 470], [642, 580], [636, 690], [640, 772]],
    [[694, 368], [690, 470], [686, 580], [684, 690], [686, 788]], [[632, 386], [648, 424], [664, 466], [676, 504], [682, 534]]];
  var LF1 = [[[606, 364], [612, 440], [620, 520], [632, 620], [648, 716]], [[630, 358], [640, 450], [654, 560], [666, 660], [674, 762]],
    [[694, 366], [690, 470], [688, 580], [688, 690], [690, 786]], [[614, 356], [638, 410], [662, 470], [680, 530], [692, 592]]];
  var LFW = [8, 10, 6, 8];
  var LH0 = [[[640, 400], [627, 480], [619, 580], [617, 690]], [[682, 376], [672, 470], [664, 590], [660, 720]], [[605, 470], [598, 560], [596, 640]],
    [[622, 392], [636, 428], [651, 466], [662, 498]]];
  var LH1 = [[[620, 357], [628, 440], [640, 540], [652, 640]], [[652, 356], [664, 460], [674, 580], [680, 710]], [[601, 380], [606, 440], [610, 500]],
    [[608, 356], [622, 394], [638, 434], [650, 468]]];
  var LHW = [6.4, 4.4, 3.4, 4.2];
  // cape front panel, screen-right half (static; the hand peeks out under its lifted corner)
  var RP = [[721, 351], [738, 349], [759, 352], [785, 362], [809, 376], [827, 399], [838, 440], [845, 500], [848, 560], [849, 606],
    [848, 627], [832, 645], [816, 676], [802, 706], [786, 729], [770, 756], [750, 776], [722, 793], [718, 650], [718, 500]];

  function create(layer, stage) {
    var F = LB.face, S = LB.style, P = S.palette.bishop;
    var fl = F.fl, ol = F.ol, pt = F.pt, n2 = F.n2;
    var LW = S.lw;
    var GOLD_HI = '#FFF3C4', SATIN_REFL = '#DE3A42', SATIN_CORE = '#FFD3D5', CUFF = '#4A4B52', SLIDE_HI = '#41557E';
    var HEATHER_L = '#A6A6A6', HEATHER_D = '#6E6E6E', GLOW = '#3CFF6E';

    var root = LB.g(layer, { class: 'lb-bishop' });
    var defs = LB.el('defs', null, root);
    var floorG = LB.g(root, { 'data-sil': 'hide' });
    var legsG = LB.g(root);
    var leanFront = LB.g(root);

    function circ(cx, cy, r) { return 'M' + n2(cx - r) + ' ' + n2(cy) + 'a' + n2(r) + ' ' + n2(r) + ' 0 1 0 ' + n2(2 * r) + ' 0a' + n2(r) + ' ' + n2(r) + ' 0 1 0 ' + n2(-2 * r) + ' 0Z'; }
    function taper(pts, w) { return F.taperD(pts, [0, w * 0.8, w, w * 0.6, 0], 5); }
    function streak(pts, w) { return F.taperD(pts, [0, w, w * 0.7, 0], 5); }
    function closedD(pts) { return F.crD(pts, true); }
    // capsule A->B with round caps that bulge OUTWARD (sweep 1). The kit's tubeD(..., caps) bends its caps inward.
    function capsule(A, B, wA, wB) {
      var dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, rA = wA / 2, rB = wB / 2;
      return 'M' + pt([A[0] - nx * rA, A[1] - ny * rA]) + 'L' + pt([B[0] - nx * rB, B[1] - ny * rB]) +
        'A' + n2(rB) + ' ' + n2(rB) + ' 0 0 1 ' + pt([B[0] + nx * rB, B[1] + ny * rB]) + 'L' + pt([A[0] + nx * rA, A[1] + ny * rA]) +
        'A' + n2(rA) + ' ' + n2(rA) + ' 0 0 1 ' + pt([A[0] - nx * rA, A[1] - ny * rA]) + 'Z';
    }

    // ================================================================ FLOOR SHADOW + LEGS (never leaned)
    // Slides are modelled on the floor plane (u toward the toe, v across, h up) and projected for a camera looking down ~25 deg.
    var SOLE_H = 14, FOOT_L = 90, FOOT_W = 54, FS = 0.42;
    function foot(o) {
      var a = o.phi * LB.deg, ux = -Math.sin(a), uy = FS * Math.cos(a), vx = Math.cos(a), vy = FS * Math.sin(a);
      var L2 = FOOT_L / 2, W2 = FOOT_W / 2;
      function Pp(u, v, h) { return [o.cx + u * ux + v * vx, o.cy + u * uy + v * vy - 0.92 * h]; }
      function sup(t, inset) {
        var c = Math.cos(t), s = Math.sin(t), e = 0.8;
        var u = (L2 - inset) * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), e);
        var v = (W2 - inset) * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), e) * (0.84 + 0.16 * u / L2);
        return [u, v];
      }
      function ring(inset, h, t0, t1, n, closed) {
        var out = [];
        for (var i = 0; i < (closed ? n : n + 1); i++) { var q = sup(t0 + (t1 - t0) * i / n, inset); out.push(Pp(q[0], q[1], h)); }
        return out;
      }
      var g = LB.g(legsG), i;
      // sole: side band (bottom outline) then the footbed top and its rim line
      LB.path(g, closedD(ring(0, 0, 0, 2 * Math.PI, 24, true)), { fill: P.slideShadow, stroke: S.line, 'stroke-width': LW.inner, 'stroke-linejoin': 'round' });
      LB.path(g, closedD(ring(0, SOLE_H, 0, 2 * Math.PI, 24, true)), { fill: P.slide, stroke: S.line, 'stroke-width': LW.detail, 'stroke-linejoin': 'round' });
      LB.path(g, closedD(ring(3.8, SOLE_H, 0, 2 * Math.PI, 24, true)), ol(LW.fine, P.slideShadow));
      var rimHi = ring(0.9, SOLE_H - 1.6, -1.35, 0.5, 10, false);
      LB.path(g, 'M' + pt(rimHi[0]) + F.crSeg(rimHi, false), ol(1.1, SLIDE_HI, { 'data-sil': 'hide' }));
      // the one wide strap arches over the instep (front edge bows toward the toes)
      var wb = W2 * 0.9, u0 = -0.27 * FOOT_L, u1 = 0.13 * FOOT_L, ARCH = 19;
      function sh(v) { return SOLE_H + 1 + ARCH * Math.sqrt(Math.max(0, 1 - Math.pow(v / wb, 2))); }
      function sFront(v) { return Pp(u1 + 2.6 * (1 - Math.pow(v / wb, 2)), v, sh(v)); }
      var frontC = sFront(0);
      // sock leg: thick heathered wool from under the pants cuff into the slide (its end hides under the strap)
      var Tp = o.sockTop, A = [frontC[0], frontC[1] - 15.5];
      var dx = A[0] - Tp[0], dy = A[1] - Tp[1], dl = Math.hypot(dx, dy), nx = -dy / dl, ny = dx / dl;
      var legD = capsule(Tp, A, 33, 35);
      LB.path(g, legD, fl(P.sock));
      LB.path(g, F.tubeShadeD(Tp, A, 33, 35), fl(P.sockShadow));
      function onLeg(al, f) { var w = lerp(33, 35, al) / 2; return [Tp[0] + dx * al + nx * w * f, Tp[1] + dy * al + ny * w * f]; }
      var ribs = '';
      [-0.78, -0.56, -0.34, -0.12, 0.1, 0.32, 0.54, 0.76].forEach(function (f) { ribs += 'M' + pt(onLeg(0.04, f)) + 'L' + pt(onLeg(o.ribTo, f)); });
      LB.path(g, ribs, ol(0.8, P.sockShadow, { opacity: 0.75 }));
      LB.path(g, 'M' + pt(onLeg(o.ribTo, -0.98)) + 'Q' + pt(onLeg(o.ribTo + 0.05, 0)) + ' ' + pt(onLeg(o.ribTo, 0.98)), ol(0.9, P.sockShadow));
      var wr = '';
      o.scrunch.forEach(function (al) {
        wr += 'M' + pt(onLeg(al, -0.95)) + 'Q' + pt(onLeg(al + 0.1, -0.2)) + ' ' + pt(onLeg(al, 0.35)) + 'Q' + pt(onLeg(al + 0.07, 0.75)) + ' ' + pt(onLeg(al + 0.03, 0.96));
      });
      LB.path(g, wr, ol(0.95, P.sockShadow));
      var rnd = LB.rng(o.seed), spL = '', spD = '';
      for (i = 0; i < 22; i++) {
        var p0 = onLeg(0.06 + rnd() * 0.9, rnd() * 1.7 - 0.85), rr = 0.45 + rnd() * 0.3;
        if (i % 2) spL += circ(p0[0], p0[1], rr); else spD += circ(p0[0], p0[1], rr * 0.85);
      }
      // toes: the sock's front pokes out under the strap and sits on the footbed
      // front contour scalloped into a big-toe lobe and one lobe for the other four (sock toes are blobby)
      function toeInset(t) {
        var tb = o.big * 0.62, tr = -o.big * 0.3;
        var lb = Math.abs(t - tb) < 0.36 ? Math.pow(Math.cos((t - tb) / 0.36 * Math.PI / 2), 2) : 0;
        var lr = Math.abs(t - tr) < 0.68 ? Math.pow(Math.cos((t - tr) / 0.68 * Math.PI / 2), 2) : 0;
        var small = Math.abs(t - tr) < 0.6 ? Math.pow(Math.abs(Math.cos((t - tr + 0.6) / 1.2 * 4 * Math.PI / 2)), 1.5) * 0.9 : 0;
        return 5.8 - 3.2 * lb - 1.5 * lr - small;
      }
      var front = [];
      for (i = 0; i <= 28; i++) { var tf = lerp(-1.2, 1.2, i / 28), qf = sup(tf, toeInset(tf)); front.push(Pp(qf[0], qf[1], SOLE_H + 0.5)); }
      var vmax = Math.abs(sup(1.2, 5.6)[1]);
      var back = [];
      for (i = 0; i <= 6; i++) { var vb = lerp(vmax, -vmax, i / 6), fp = sFront(vb); back.push([fp[0], fp[1] - 3]); }
      var toeD = 'M' + pt(front[0]) + F.crSeg(front, false) + 'L' + pt(back[0]) + F.crSeg(back, false) + 'Z';
      var toeC = F.cel(g, { flat: true, d: toeD, fill: P.sock, shadow: P.sockShadow, shadowD: 'M0 0', noLine: true });
      var tsh = [];
      for (i = 0; i <= 12; i++) { var t1 = lerp(1.2, -0.3, i / 12), q1 = sup(t1, toeInset(t1)); tsh.push(Pp(q1[0], q1[1], SOLE_H + 0.5)); }
      for (i = 8; i >= 0; i--) { var q2 = sup(lerp(1.2, -0.3, i / 8), 11.5); tsh.push(Pp(q2[0] - 1, q2[1] * 0.86, SOLE_H + 6.5)); }
      tsh.push(Pp(14, vmax + 4, SOLE_H + 22));
      toeC.shadow.setAttribute('d', F.crD(tsh, true));
      // toe grooves (the big toe on the inner side) + speckles on the toes
      var grooves = '';
      [[o.big * 0.26, 8, 10], [-o.big * 0.08, 5, 7.5], [-o.big * 0.52, 4.5, 7]].forEach(function (gq) {
        var q = sup(gq[0], toeInset(gq[0]));
        var e0 = Pp(q[0] - 0.3, q[1], SOLE_H + 1.2), e1 = Pp(q[0] - gq[1], q[1] * 0.97, SOLE_H + gq[2]);
        grooves += 'M' + pt(e0) + 'Q' + pt([lerp(e0[0], e1[0], 0.5) + 0.6, lerp(e0[1], e1[1], 0.5)]) + ' ' + pt(e1);
      });
      // the sock's toe seam runs across the top of the toes
      var seam = [];
      for (i = 0; i <= 10; i++) { var ts = lerp(-0.95, 0.95, i / 10), qs = sup(ts, toeInset(ts) + 7); seam.push(Pp(qs[0], qs[1], SOLE_H + 7.5 + 2.5 * Math.cos(ts))); }
      LB.path(toeC.inner, grooves + 'M' + pt(seam[0]) + F.crSeg(seam, false), ol(0.95, P.sockShadow));
      for (i = 0; i < 10; i++) {
        var p1 = Pp(15 + rnd() * 14, (rnd() * 2 - 1) * 11, SOLE_H + 5 + rnd() * 5), r1 = 0.5 + rnd() * 0.35;
        if (i % 2) spL += circ(p1[0], p1[1], r1); else spD += circ(p1[0], p1[1], r1);
      }
      LB.path(g, spL, fl(HEATHER_L));
      LB.path(g, spD, fl(HEATHER_D));
      LB.path(g, legD, ol(LW.inner));
      LB.path(g, toeD, ol(LW.inner));
      // strap
      function strapD(vA, vB) {
        var fr = [], bk = [], n = 12, j;
        for (j = 0; j <= n; j++) fr.push(sFront(lerp(vA, vB, j / n)));
        for (j = n; j >= 0; j--) { var v2 = lerp(vA, vB, j / n); bk.push(Pp(u0, v2, sh(v2) + 1.5)); }
        return { fr: fr, d: 'M' + pt(fr[0]) + F.crSeg(fr, false) + 'L' + pt(bk[0]) + F.crSeg(bk, false) + 'Z' };
      }
      var st = strapD(-wb, wb);
      LB.path(g, st.d, fl(P.slide));
      LB.path(g, strapD(wb * 0.3, wb).d, fl(P.slideShadow));
      var rollPts = st.fr.slice(1, -1).map(function (p) { return [p[0], p[1] - 1.7]; });
      LB.path(g, F.taperD(rollPts, [0.4, 2.8, 3.0, 2.8, 0.4], 3), fl(P.slideShadow));
      var hiPts = [];
      for (i = 0; i <= 4; i++) { var vh = lerp(-wb * 0.74, -wb * 0.1, i / 4); hiPts.push(Pp((u0 + u1) / 2 - 2, vh, sh(vh) + 0.7)); }
      LB.path(g, F.taperD(hiPts, [0, 2.4, 2.8, 1.8, 0], 3), fl(SLIDE_HI, { 'data-sil': 'hide' }));
      LB.path(g, st.d, ol(LW.inner));
      return g;
    }
    function pantsLeg(o) {
      var g = legsG;
      var poly = 'M' + pt(o.out[0]) + F.crSeg(o.out, false) + 'L' + pt(o.inn[o.inn.length - 1]) + F.crSeg(o.inn.slice().reverse(), false) + 'Z';
      var c = F.cel(g, { flat: true, d: poly, fill: P.pants, shadow: P.pantsShadow, shadowD: o.shadow, lw: LW.outer });
      LB.path(c.inner, o.wrinkles, ol(1.0, P.pantsShadow));
      F.cel(g, { flat: true, d: o.cuff, fill: CUFF, shadow: P.pantsShadow, shadowD: o.cuffShadow, lw: LW.inner });
      LB.path(g, o.cuffLine, ol(LW.detail, P.pantsShadow));
    }

    // floor contact shadows (two stacked flat ellipses per slide)
    LB.path(floorG, 'M624 947a50 11 0 1 0 100 0a50 11 0 1 0 -100 0Z M711 946a50 11 0 1 0 100 0a50 11 0 1 0 -100 0Z', fl('#3B2A1C', { opacity: 0.13 }));
    LB.path(floorG, 'M637 948a37 7 0 1 0 74 0a37 7 0 1 0 -74 0Z M724 947.5a37 7 0 1 0 74 0a37 7 0 1 0 -74 0Z', fl('#3B2A1C', { opacity: 0.2 }));

    // screen-left foot (turned out toward the Friar), screen-right foot (pointing at the camera). Pants are high-waters.
    foot({ cx: 676, cy: 934, phi: 26, big: 1, seed: 71, sockTop: [682, 846], ribTo: 0.56, scrunch: [0.58, 0.76] });
    pantsLeg({
      out: [[676, 720], [671, 790], [667, 826], [663, 848]],
      inn: [[716, 720], [711, 790], [706, 826], [701, 848]],
      shadow: 'M694 730C692 790 688 820 686 852L704 852L718 720Z',
      wrinkles: 'M676 806C682 810 690 810 698 806M669 832C677 837 688 838 702 834M690 818C694 822 698 823 704 823',
      cuff: 'M660 840L704 840C705 846 705 852 703 857L661 857C659 852 659 846 660 840Z',
      cuffShadow: 'M690 840L706 840L706 858L690 858Z',
      cuffLine: 'M662 847.5C673 849 691 849 703 847.5',
    });
    foot({ cx: 761, cy: 932, phi: -6, big: -1, seed: 83, sockTop: [756, 852], ribTo: 0.5, scrunch: [0.5, 0.7] });
    pantsLeg({
      out: [[762, 720], [767, 790], [771, 832], [774, 854]],
      inn: [[722, 720], [727, 790], [732, 832], [735, 854]],
      shadow: 'M760 730C764 790 766 830 768 858L780 858L764 720Z',
      wrinkles: 'M734 810C742 814 752 814 762 810M738 840C746 845 758 846 772 841M746 824C752 826 758 826 764 824',
      cuff: 'M733 846L777 846C778 852 778 858 776 863L734 863C732 858 732 852 733 846Z',
      cuffShadow: 'M763 846L779 846L779 864L763 864Z',
      cuffLine: 'M735 853.5C747 855 765 855 776 853.5',
    });

    // ================================================================ FRONT (lean group)
    // ---- clerical collar, back half (inside of the band, seen beside the neck)
    LB.path(leanFront, 'M696 337C697 326 707 320 721 320C735 320 745 326 746 337L746 343C735 334 707 334 696 343Z',
      { fill: P.collarShadow, stroke: S.line, 'stroke-width': LW.detail, 'stroke-linejoin': 'round' });

    // ================================================================ HEAD
    var headG = LB.g(leanFront);
    var hairBack = LB.g(headG);
    LB.path(hairBack, 'M-45 9C-48.4 -6 -49.4 -22 -46 -38L46 -38C49.4 -22 48.4 -6 45 9Z', fl(P.hair));
    LB.path(hairBack, 'M37 -38L46 -38C49.4 -22 48.4 -6 45 9L39 9C41.6 -8 41 -24 37 -38Z', fl(P.hairShadow));
    LB.path(hairBack, 'M-45 9C-48.4 -6 -49.4 -22 -46 -38M45 9C48.4 -6 49.4 -22 46 -38', ol(LW.outer));
    var hd = F.head(headG, { w: 82, top: -60, chin: 57, cheekY: 4, jawY: 35, jaw: 0.46, chinW: 21, earY: 7, earH: 25, earW: 9.5,
      neckW: 32, neckTop: 28, neckBot: 92, skin: P.skin, skinShadow: P.skinShadow });
    // the mitre band's cast shadow across the forehead, and a jaw plane for the long face (inside the face clip)
    LB.path(hd.face.inner, 'M-60 -70L60 -70L60 -24Q0 -15 -60 -24Z M33 20C30 30 24 40 14 48L22 50C30 42 35 32 36 22Z', fl(P.skinShadow));

    var feat = LB.g(headG);
    var face = F.create(feat, {
      eyeSpacing: 35, eyeW: 20, eyeH: 10.2, irisColor: P.iris, irisDark: P.irisDark, irisLight: P.irisLight, browColor: P.brow,
      browY: -10.2, browT: 4.2, mouthY: 37.8, mouthW: 14, mustache: true, lids: 'heavy', lipColor: P.lip, skin: P.skin, skinShadow: P.skinShadow,
      sweatAt: { x: 44, y: -18 }, cheekY: 17, noseY: 22.5, faceClip: hd.clipId,
    });
    // longer nose bridge (shadow side)
    var noseX = LB.g(feat), chinX = LB.g(feat);
    LB.path(noseX, F.taperD([[1.4, 2], [2.8, 9], [3.6, 16], [3.4, 20]], [0, 1.6, 1.3, 0.3]), fl(P.skinShadow));
    LB.path(chinX, 'M0.2 50.2Q0.9 52.4 0.3 54.4', ol(0.8, S.lineSoft)); // chin dimple

    // ---- the mustache: big ginger chevron, layered, tips drooping. Two halves (they flick up on a twitch) + a center tuft.
    var mus = LB.g(feat);
    function musHalf(s) {
      var g = LB.g(mus);
      var X = function (p) { return [s * p[0], p[1]]; };
      var base = [[-2, 26.6], [5, 25.3], [12, 25.7], [19, 27.3], [25.6, 30.2], [30.8, 34.6], [33.8, 40.6], [34.6, 47.4], [32, 43.8],
        [28, 39.2], [21.4, 36.8], [13.4, 37.4], [6, 37.9], [-2, 37.6]].map(X);
      var d = closedD(base);
      var shD = 'M' + pt(X([-4, 34])) + 'C' + pt(X([6, 35.2])) + ' ' + pt(X([16, 34.2])) + ' ' + pt(X([23, 34.6])) +
        'C' + pt(X([28, 35.4])) + ' ' + pt(X([32, 38.6])) + ' ' + pt(X([35.6, 43])) + 'L' + pt(X([38, 54])) + 'L' + pt(X([-4, 54])) + 'Z';
      if (s > 0) shD += 'M23 26C29 29.6 33 35 35 44L42 44L42 22Z';
      var c = F.cel(g, { flat: true, d: d, fill: P.mustache, shadow: P.mustacheShadow, shadowD: shD, lw: 1.35 });
      // upper layer: a second lock lying over the mass (its edge is the layering line)
      var lockP = [[1, 28.8], [9, 28.7], [17, 30.4], [24, 33.8], [29.6, 39], [32.6, 44.6]].map(X);
      LB.path(c.inner, F.taperD(lockP, [3, 5.2, 5.6, 4.6, 2.6, 0.2], 5), fl(P.mustache));
      LB.path(c.inner, F.taperD([[3, 31.4], [10, 31.6], [17, 33.2], [23.4, 36.4], [28.8, 41.6], [31.6, 46]].map(X), [0, 1.3, 1.6, 1.4, 0.9, 0], 5), fl(P.mustacheShadow));
      LB.path(g, F.taperD([[5, 27.8], [11.5, 27.7], [18.5, 29.6]].map(X), [0, 1.8, 0], 4), fl(P.hairShine, { 'data-sil': 'hide' }));
      var ticks = '';
      [[[4, 32], [5.8, 35.8]], [[9.4, 31.6], [11.6, 36.2]], [[15, 32.6], [17.4, 36.4]], [[20.6, 34.4], [23, 37.6]], [[26.2, 37.6], [28.8, 41.8]]].forEach(function (q) {
        var a = X(q[0]), b = X(q[1]);
        ticks += 'M' + pt(a) + 'Q' + pt([lerp(a[0], b[0], 0.5) + s * 0.8, lerp(a[1], b[1], 0.5)]) + ' ' + pt(b);
      });
      LB.path(g, ticks, ol(0.8, P.mustacheShadow));
      return g;
    }
    var musL = musHalf(-1), musR = musHalf(1);
    // center tuft covers the seam; inked only along its top and bottom so it reads as one mustache
    var tuftD = 'M-7 26C-3 24.8 3 24.8 7 26C7.8 29.6 7.6 34 6.6 38.2C2.6 39.2 -2.6 39.2 -6.6 38.2C-7.6 34 -7.8 29.6 -7 26Z';
    LB.path(mus, tuftD, fl(P.mustache));
    LB.path(mus, 'M-7.6 34.4C-3 35.8 3 35.8 7.6 34.4L7.2 38.4C2.6 39.4 -2.6 39.4 -7.2 38.4Z M2.6 25.2L7.6 25.8L7.4 34.6L4 35.2Z', fl(P.mustacheShadow));
    LB.path(mus, 'M-7.6 26.1C-3.4 24.7 3.4 24.7 7.6 26.1M-6.8 38.3C-2.6 39.4 2.6 39.4 6.8 38.3', ol(1.3));
    LB.path(mus, 'M-0.2 25.8C-0.6 28 -1 30 -1.8 32M-3.8 28.8C-4.6 30.8 -5.6 32.6 -6.6 34M3.2 29.2C3.8 31 4.6 32.8 5.6 34.2', ol(0.75, P.mustacheShadow));

    // ---- short reddish hair under the mitre: a side mass with two lock tips + sideburn at each temple
    var hairFront = LB.g(headG);
    function sideHair(s) {
      var X = function (p) { return pt([s * p[0], p[1]]); };
      return 'M' + X([-50.4, -29.5]) + 'C' + X([-51.8, -21]) + ' ' + X([-50.6, -13]) + ' ' + X([-47, -5]) +
        'C' + X([-46.2, -8.4]) + ' ' + X([-45.2, -10.6]) + ' ' + X([-43.8, -11.8]) + 'C' + X([-43.4, -8.6]) + ' ' + X([-42.8, -6]) + ' ' + X([-41.6, -3.6]) +
        'C' + X([-40.2, -10]) + ' ' + X([-39.4, -17]) + ' ' + X([-37.6, -23]) + 'C' + X([-36.8, -25.6]) + ' ' + X([-35.6, -27.8]) + ' ' + X([-33.8, -29]) + 'Z' +
        'M' + X([-42.8, -9]) + 'C' + X([-42.6, -3]) + ' ' + X([-42.2, 1.6]) + ' ' + X([-41.8, 5]) + 'L' + X([-39.8, 5]) + 'C' + X([-39.6, 0]) + ' ' + X([-39.8, -4]) + ' ' + X([-40.2, -9]) + 'Z';
    }
    var sideD = sideHair(1) + sideHair(-1);
    LB.path(hairFront, sideD, fl(P.hair));
    LB.path(hairFront, F.taperD([[-50.6, -29], [-44, -26.4], [-35, -28]], [3.2, 3, 0.6]) + F.taperD([[50.6, -29], [44, -26.4], [35, -28]], [3.2, 3, 0.6]) +
      'M42 -27C44.6 -20 45.6 -12 46.2 -6L47 -5C50.6 -13 51.8 -21 50.4 -29.5Z', fl(P.hairShadow));
    LB.path(hairFront, F.taperD([[-48.6, -22], [-47.2, -15], [-45.2, -10]], [0, 1.6, 0]), fl(P.hairShine, { 'data-sil': 'hide' }));
    LB.path(hairFront, sideD, ol(LW.inner));
    LB.path(hairFront, 'M-46.4 -24C-45.6 -19 -44.6 -15 -43.6 -12.6M-40.6 -25C-40.4 -20 -40.8 -14 -41.6 -9.6M46.4 -24C45.6 -19 44.6 -15 43.6 -12.6M40.6 -25C40.4 -20 40.8 -14 41.6 -9.6',
      ol(0.8, P.hairShadow));

    // ---- the mitre (front panel + back peak + gold band, central orphrey, edge trims, medallions). mitreStretch rebuilds the
    // panel paths with every point above the band scaled from the band; ornaments keep their shape and are re-spaced.
    var mitreG = LB.g(headG);
    function Ym(y, k) { return y < MITRE_BASE ? MITRE_BASE + (y - MITRE_BASE) * k : y; }
    function mp(pts, k) { return pts.map(function (p) { return [p[0], Ym(p[1], k)]; }); }
    var FR = [[52.5, -55], [55.5, -80], [57.8, -104], [57, -120], [51, -137], [41, -153], [28, -167], [13, -178.5], [0, MITRE_TIP]];
    var FLft = FR.map(function (p) { return [-p[0], p[1]]; });
    var BR = [[50, -58], [58.5, -92], [62.5, -118], [61, -136], [56, -150], [50, -160], [44, -168]];
    var BRL = [[38, -160], [30, -148], [18, -130]];
    var SHF = [[26, -52], [33, -84], [36, -114], [30, -142], [17, -166], [3, -190]];
    var backC = F.cel(mitreG, { flat: true, d: 'M0 0', fill: P.mitreShadow, lw: LW.inner });
    var backTrim = LB.path(backC.inner, 'M0 0', fl(P.mitreGoldShadow));
    var frontC = F.cel(mitreG, { flat: true, d: 'M0 0', fill: P.mitre, shadow: P.mitreShadow, shadowD: 'M0 0', lw: LW.outer });
    var trimP = LB.path(frontC.inner, 'M0 0', fl(P.mitreGold));
    var trimSh = LB.path(frontC.inner, 'M0 0', fl(P.mitreGoldShadow));
    var orph = LB.path(frontC.inner, 'M0 0', fl(P.mitreGold));
    var orphSh = LB.path(frontC.inner, 'M0 0', fl(P.mitreGoldShadow));
    var orphLine = LB.path(frontC.inner, 'M0 0', ol(0.9, S.line));
    var trimLine = LB.path(frontC.inner, 'M0 0', ol(0.75, P.mitreGoldShadow));
    // band (never stretched)
    var bandD = 'M-50.5 -28Q0 -20 50.5 -28L52.5 -55Q0 -47.5 -52.5 -55Z';
    var bandSh = 'M29 -62L66 -62L66 -16L27 -16C31 -30 31.6 -46 29 -62Z';
    var bandC = F.cel(mitreG, { flat: true, d: bandD, fill: P.mitre, shadow: P.mitreShadow, shadowD: bandSh, lw: LW.outer });
    LB.path(bandC.inner, 'M-52.5 -55Q0 -47.5 52.5 -55L52 -50.4Q0 -42.9 -52 -50.4Z M-50.5 -28Q0 -20 50.5 -28L50.9 -32.6Q0 -24.6 -50.9 -32.6Z', fl(P.mitreGold));
    LB.path(bandC.inner, bandSh, fl(P.mitreGoldShadow, { opacity: 0.5 }));
    LB.path(bandC.inner, 'M-52 -50.4Q0 -42.9 52 -50.4M-50.9 -32.6Q0 -24.6 50.9 -32.6', ol(0.75, P.mitreGoldShadow));
    // ornaments: rebuilt (positions only) when the stretch changes
    var ornGold = LB.path(mitreG, 'M0 0', fl(P.mitreGold));
    var ornCream = LB.path(mitreG, 'M0 0', fl(P.mitre));
    var ornPetal = LB.path(mitreG, 'M0 0', fl(P.mitreGold));
    var ornDot = LB.path(mitreG, 'M0 0', fl(P.mitreGoldShadow));
    var ornDet = LB.path(mitreG, 'M0 0', ol(0.7, P.mitreGoldShadow));
    var ornInk = LB.path(mitreG, 'M0 0', ol(0.9, S.line));
    var ornHi = LB.path(mitreG, 'M0 0', fl(GOLD_HI, { 'data-sil': 'hide' }));

    function leaf(cx, cy, a, r0, r1, w) {
      var c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, rm = (r0 + r1) / 2;
      var B = [cx + c * r0, cy + s * r0], Tt = [cx + c * r1, cy + s * r1];
      return 'M' + pt(B) + 'Q' + pt([cx + c * rm + nx * w, cy + s * rm + ny * w]) + ' ' + pt(Tt) + 'Q' + pt([cx + c * rm - nx * w, cy + s * rm - ny * w]) + ' ' + pt(B) + 'Z';
    }
    function mitreOrn(k) {
      var o = { gold: '', cream: '', petal: '', dot: '', det: '', ink: '', hi: '' };
      function medallion(cx, cy, r) {
        o.gold += circ(cx, cy, r); o.cream += circ(cx, cy, r * 0.72); o.ink += circ(cx, cy, r); o.det += circ(cx, cy, r * 0.72);
        for (var i = 0; i < 8; i++) o.petal += leaf(cx, cy, i * Math.PI / 4 + Math.PI / 8, r * 0.16, r * 0.64, r * 0.13);
        o.dot += circ(cx, cy, r * 0.15);
        o.hi += circ(cx - r * 0.55, cy - r * 0.6, r * 0.12);
      }
      function lozenge(cx, cy, s) {
        var w = s * 0.72;
        var dd = 'M' + pt([cx, cy - s]) + 'L' + pt([cx + w, cy]) + 'L' + pt([cx, cy + s]) + 'L' + pt([cx - w, cy]) + 'Z';
        o.gold += dd; o.ink += dd;
        o.cream += 'M' + pt([cx, cy - s * 0.52]) + 'L' + pt([cx + w * 0.52, cy]) + 'L' + pt([cx, cy + s * 0.52]) + 'L' + pt([cx - w * 0.52, cy]) + 'Z';
        o.dot += circ(cx, cy, s * 0.17);
      }
      function rosette(cx, cy, r) { o.gold += circ(cx, cy, r); o.ink += circ(cx, cy, r); o.dot += circ(cx, cy, r * 0.32); }
      // band
      medallion(0, -39, 11.5);
      lozenge(-26, -40.6, 8.6); lozenge(26, -40.6, 8.6);
      rosette(-43.4, -42, 4); rosette(43.4, -42, 4);
      // orphrey: one big medallion, one lozenge under it, a column of lozenges above (more of them when stretched)
      var my = Ym(-100, k), tip = Ym(MITRE_TIP, k);
      medallion(0, my, 14);
      lozenge(0, (-51.25 + my + 14) / 2, 7.6);
      for (var y = my - 26; y > tip + 26; y -= 23) lozenge(0, y, 7.6 * clamp((y - tip) / 54, 0.62, 1));
      return o;
    }
    function applyMitre(k) {
      var fr = mp(FR, k), flt = mp(FLft, k), br = mp(BR, k), brl = mp(BRL, k);
      var frontD = 'M' + pt(flt[0]) + F.crSeg(flt, false) + F.crSeg(fr.slice().reverse(), false) + 'Q0 -47.5 -52.5 -55Z';
      var backD = 'M' + pt(br[0]) + F.crSeg(br, false) + 'L' + pt(brl[0]) + F.crSeg(brl, false) + 'L0 -58Z';
      var shf = mp(SHF, k);
      var shD = 'M' + pt(shf[0]) + F.crSeg(shf, false) + 'L80 ' + n2(Ym(-220, k)) + 'L80 -46Z';
      backC.setD(backD);
      backTrim.setAttribute('d', F.ribbonD(br, 13));
      frontC.setD(frontD, shD);
      // edge trims: a band along both front edges (outer half clipped away by the panel)
      trimP.setAttribute('d', F.ribbonD(fr, 15) + F.ribbonD(flt, 15));
      trimSh.setAttribute('d', F.ribbonD(fr, 15, -1, 0));
      trimLine.setAttribute('d', F.ribbonD(fr, 13, -1, -1).replace(/Z$/, '') + F.ribbonD(flt, 13, 1, 1).replace(/Z$/, ''));
      // central orphrey, narrowing toward the tip
      var oc = mp([[0, -48], [0, -100], [0, -150], [0, -198]], k);
      var ow = function (t) { return 24 - 8 * t; };
      orph.setAttribute('d', F.ribbonD(oc, ow));
      orphSh.setAttribute('d', F.ribbonD(oc, ow, 0.32, 1));
      orphLine.setAttribute('d', F.ribbonD(oc, ow));
      var o = mitreOrn(k);
      ornGold.setAttribute('d', o.gold); ornCream.setAttribute('d', o.cream); ornPetal.setAttribute('d', o.petal);
      ornDot.setAttribute('d', o.dot); ornDet.setAttribute('d', o.det); ornInk.setAttribute('d', o.ink); ornHi.setAttribute('d', o.hi);
    }

    // ================================================================ ARMS + CAPE
    // ---- casting arm (screen-left): bare forearm under the cape wing (two-pass outline, outward caps)
    var armG = LB.g(leanFront);
    var armInk = LB.path(armG, 'M0 0', { fill: S.line, stroke: S.line, 'stroke-width': LW.inner * 2, 'stroke-linejoin': 'round' });
    var armFill = LB.path(armG, 'M0 0', fl(P.skin));
    var armShade = LB.path(armG, 'M0 0', fl(P.skinShadow));

    // ---- the other hand (screen-right) hangs at his side and peeks out under the lifted cape corner, as in the photo
    var rHand = LB.g(leanFront);
    var rfD = capsule([842, 596], [842, 648], 17, 16);
    LB.path(rHand, rfD, { fill: P.skin, stroke: S.line, 'stroke-width': LW.inner, 'stroke-linejoin': 'round' });
    LB.path(rHand, F.tubeShadeD([842, 596], [842, 648], 17, 16), fl(P.skinShadow));
    var rhD = 'M832.4 641C828.6 652 828 664 830.2 675C832.4 685 838.4 691.6 845 690.6C851.4 689.6 854.6 682 854.4 671.4C854.2 659.6 853.2 650 851.2 641Z';
    F.cel(rHand, { flat: true, d: rhD, fill: P.skin, shadow: P.skinShadow, shadowD: 'M847 641C850 656 850 674 843 692L860 692L860 641Z', lw: LW.inner });
    LB.path(rHand, 'M834.4 652C829.8 657 828 664.6 829.6 670.4C831.4 672.6 834.4 671.8 835.4 668.6C836.4 663.6 837.6 658 838.6 652.6Z',
      { fill: P.skin, stroke: S.line, 'stroke-width': LW.detail, 'stroke-linejoin': 'round' });
    LB.path(rHand, 'M839.6 676C840.2 681.6 841 686.4 842 689.6M845.6 675.4C846.4 681 847.2 685.6 848.4 689', ol(0.85, S.lineSoft));

    // ---- satin cape, screen-left panel (morphs into a wing when he casts)
    var capeL = F.cel(leanFront, { flat: true, d: 'M0 0', fill: P.satin, shadow: P.satinShadow, shadowD: 'M0 0',
      hi: P.satinHi, hiD: 'M0 0', lw: LW.outer });
    var lFolds = LB.path(capeL.inner, 'M0 0', fl(P.satinShadow));
    var lCores = LB.path(capeL.inner, 'M0 0', fl(SATIN_CORE, { 'data-sil': 'hide' }));
    // ---- screen-right panel (static, mostly in shadow: the key light is upper-left)
    var rpD = closedD(RP);
    var capeR = F.cel(leanFront, { flat: true, d: rpD, fill: P.satin, shadow: P.satinShadow,
      shadowD: 'M790 370C808 430 816 520 812 600C808 676 792 740 764 796L880 800L880 340Z' +
        'M733 352L744 358C746 500 745 650 743 796L733 796Z' +
        'M694 349C705 360 737 360 748 349L748 364C737 372 705 372 694 364Z' + F.ribbonD(RP.slice(10, 18), 14, 1, -1),
      hi: P.satinHi, hiD: streak([[760, 384], [771, 470], [777, 570], [773, 668]], 6.2) + streak([[729, 600], [732, 700], [730, 780]], 3.4) +
        streak([[812, 394], [798, 424], [784, 456]], 3.6), lw: LW.outer });
    LB.path(capeR.inner, taper([[742, 372], [748, 470], [752, 580], [750, 690], [744, 786]], 8) +
      taper([[772, 372], [786, 460], [792, 560], [788, 660], [776, 744]], 10) + taper([[756, 640], [764, 700], [770, 760]], 6) +
      taper([[806, 388], [790, 424], [776, 462], [768, 496], [764, 524]], 9), fl(P.satinShadow));
    LB.path(capeR.inner, streak([[826, 446], [835, 520], [838, 596]], 3) + streak([[812, 640], [802, 680], [792, 712]], 2.4),
      fl(SATIN_REFL, { 'data-sil': 'hide' }));
    LB.path(capeR.inner, F.taperD([[764, 404], [771, 470], [774, 536]], [0, 1.6, 0], 4) + F.taperD([[808, 402], [797, 426], [788, 446]], [0, 1.1, 0], 4),
      fl(SATIN_CORE, { 'data-sil': 'hide' }));

    // ---- gold stole down the center front, with the white collar tab at the top
    var stoleG = LB.g(leanFront);
    function stX(y) { return 716 - (y - 348) / 452 * 3; }
    function stW(y) { return 36 + 4 * (y - 348) / 452; }
    var stC = [[716, 347], [715, 480], [714, 640], [713, 800]];
    var stWf = function (t) { return 36 + 4 * t; };
    F.cel(stoleG, { flat: true, d: F.ribbonD(stC, stWf), fill: P.stole, shadow: P.stoleShadow, shadowD: F.ribbonD(stC, stWf, 0.36, 1) +
      'M690 795L740 795L740 802L690 802Z', lw: LW.inner });
    var emb = '', embDot = '', yy;
    var bl = 'M' + pt([stX(352) - stW(352) / 2 + 4, 352]) + 'L' + pt([stX(796) - stW(796) / 2 + 4, 796]) +
      'M' + pt([stX(352) + stW(352) / 2 - 4, 352]) + 'L' + pt([stX(796) + stW(796) / 2 - 4, 796]);
    for (yy = 502; yy < 790; yy += 34) {
      var xc = stX(yy);
      emb += 'M' + pt([xc, yy - 10]) + 'L' + pt([xc + 6.4, yy]) + 'L' + pt([xc, yy + 10]) + 'L' + pt([xc - 6.4, yy]) + 'Z';
      embDot += circ(xc, yy, 1.8) + (yy + 17 < 790 ? circ(stX(yy + 17), yy + 17, 1.3) : '');
    }
    LB.path(stoleG, bl + emb, ol(0.9, P.stoleShadow));
    LB.path(stoleG, 'M' + pt([stX(486) - stW(486) / 2 + 7.5, 486]) + 'L' + pt([stX(794) - stW(794) / 2 + 7.5, 794]) +
      'M' + pt([stX(486) + stW(486) / 2 - 7.5, 486]) + 'L' + pt([stX(794) + stW(794) / 2 - 7.5, 794]), ol(0.75, P.stoleShadow, { 'stroke-dasharray': '1.4 2.4' }));
    LB.path(stoleG, embDot, fl(P.stoleShadow));
    LB.path(stoleG, streak([[703, 380], [702, 520], [701, 660], [700, 780]], 2.2), fl('#F3D98E', { 'data-sil': 'hide' }));
    F.cel(stoleG, { flat: true, d: 'M709.5 346L709.5 466Q715.6 480 721.7 466L721.7 346Z', fill: P.collar, shadow: P.collarShadow,
      shadowD: 'M716.4 340L726 340L726 482L716.4 482Z', lw: LW.detail });

    // ---- clerical collar, front band
    F.cel(leanFront, { flat: true, d: 'M695 333C703 341 739 341 747 333L748 349C739 358 703 358 694 349Z', fill: P.collar,
      shadow: P.collarShadow, shadowD: 'M730 330L760 330L760 360L728 360C732 350 732 340 730 330Z M690 347C703 355 739 355 752 347L752 362L690 362Z', lw: LW.inner });

    // ---- casting hand: open, fingers forward (toward the Friar), palm toward the camera; the cape's sleeve opening behind it
    var sleeve = LB.el('ellipse', { cx: 0, cy: 0, rx: 5.2, ry: 15, fill: P.satinShadow, stroke: S.line, 'stroke-width': LW.inner }, leanFront);
    // pre-baked green glow + ring (no filters)
    var glowId = LB.uid('lbbish-glow'), coreId = LB.uid('lbbish-core');
    var gr = LB.el('radialGradient', { id: glowId }, defs);
    LB.el('stop', { offset: 0, 'stop-color': GLOW, 'stop-opacity': 0.6 }, gr);
    LB.el('stop', { offset: 0.4, 'stop-color': GLOW, 'stop-opacity': 0.26 }, gr);
    LB.el('stop', { offset: 1, 'stop-color': GLOW, 'stop-opacity': 0 }, gr);
    var gc = LB.el('radialGradient', { id: coreId }, defs);
    LB.el('stop', { offset: 0, 'stop-color': '#F2FFF5', 'stop-opacity': 0.95 }, gc);
    LB.el('stop', { offset: 0.5, 'stop-color': '#9CFFB5', 'stop-opacity': 0.5 }, gc);
    LB.el('stop', { offset: 1, 'stop-color': GLOW, 'stop-opacity': 0 }, gc);
    var glowG = LB.g(leanFront, { 'data-sil': 'hide' });
    LB.el('circle', { cx: 0, cy: 0, r: 92, fill: 'url(#' + glowId + ')' }, glowG);
    LB.el('circle', { cx: -6, cy: 0, r: 34, fill: 'url(#' + coreId + ')' }, glowG);
    var RING = { cx: -5, rx: 10.5, ry: 31 };
    function ringArc(front) { return 'M' + n2(RING.cx) + ' ' + (-RING.ry) + 'A' + RING.rx + ' ' + RING.ry + ' 0 0 ' + (front ? 1 : 0) + ' ' + n2(RING.cx) + ' ' + RING.ry; }
    function ringG(front) {
      var g = LB.g(leanFront, { 'data-sil': 'hide' });
      var d = ringArc(front);
      LB.path(g, d, ol(9, GLOW, { opacity: 0.3 }));
      LB.path(g, d, ol(3.6, GLOW));
      LB.path(g, d, ol(1.2, '#F4FFF6'));
      var dots = LB.path(g, 'M0 0', fl('#F4FFF6', { stroke: GLOW, 'stroke-width': 0.8 }));
      return { g: g, dots: dots };
    }
    var ringBack = ringG(false);
    var handG = LB.g(leanFront);
    (function buildHand() {
      var fingers = [
        [[-8.5, -7.4], [-28.5, -12.6], 6.6, 5.6],
        [[-9.6, -1.6], [-32, -2.4], 6.8, 5.8],
        [[-9.4, 4.4], [-29.6, 7.8], 6.4, 5.4],
        [[-8.2, 9.4], [-23.5, 15.8], 5.6, 4.6],
      ];
      var palm = 'M10 -9.8C12.4 -4 12.4 4 9.8 9.4C4 12.4 -5 13 -10.4 10.8C-13 6 -13 -4 -10.4 -9.4C-6 -12 4 -12 10 -9.8Z'; // clockwise, like capsule()
      var thumb = capsule([3, -8.8], [-4.6, -16.4], 8.4, 7) + capsule([-4.6, -16.4], [-12.2, -20.4], 7, 5.8);
      var wrist = capsule([8, 0], [22, 0], 15, 15.6);
      var fd = '', fs = '';
      fingers.forEach(function (f) { fd += capsule(f[0], f[1], f[2], f[3]); fs += F.tubeShadeD(f[0], f[1], f[2], f[3]); });
      var all = wrist + palm + thumb + fd;
      LB.path(handG, all, { fill: S.line, stroke: S.line, 'stroke-width': LW.inner * 2, 'stroke-linejoin': 'round' });
      LB.path(handG, all, fl(P.skin));
      LB.path(handG, fs + F.tubeShadeD([3, -8.8], [-4.6, -16.4], 8.4, 7) + 'M10.4 -2C10 4 6 9.6 -3 11.6L-10 10.4C-5 12.8 4 12.2 9.6 9.2Z' +
        F.tubeShadeD([8, 0], [22, 0], 15, 15.6), fl(P.skinShadow));
      LB.path(handG, 'M-10.6 -4.6L-16.4 -5.2M-10.8 1.4L-17.6 2.2M-10 7L-15.6 9.2M2 -8C-1 -6.6 -3.6 -7.2 -5.4 -10M5 -3.6C1.2 -0.4 -1.4 4 -2 8.8',
        ol(0.85, S.lineSoft));
    })();
    var ringFront = ringG(true);
    // the cape's sleeve rim wraps over the wrist (clipped to the panel so it never spills past the cape outline)
    var rimG = LB.g(leanFront, { 'clip-path': 'url(#' + capeL.clipId + ')' });
    var rim = LB.g(rimG);
    LB.path(rim, 'M-1.2 -16.5C3.4 -9 3.4 9 -1.2 16.5L12 16.5L12 -16.5Z', fl(P.satin));
    LB.path(rim, 'M4 -12C6 -5 6 5 4 12', ol(0.9, P.satinShadow));
    LB.path(rim, 'M-1.2 -16.5C3.4 -9 3.4 9 -1.2 16.5', ol(LW.inner));

    // ================================================================ state
    var last = {};
    var M = { root: null, lean: null, head: null, hand: T(565, 370), palm: [565, 370] };
    function setT(node, key, m) { var v = ms(m); if (last[key] !== v) { last[key] = v; node.setAttribute('transform', v); } }
    function setA(node, key, attr, v) { if (last[key] !== v) { last[key] = v; node.setAttribute(attr, v); } }
    function vis(node, key, on) { if (last[key] !== on) { last[key] = on; LB.show(node, on); } }

    function applyCape(k) {
      var pts = lerpPts(L0, L1, k);
      var shD = F.ribbonD(pts.slice(10, 18), 14, -1, 1) + 'M694 349C705 360 737 360 748 349L748 364C737 372 705 372 694 364Z' +
        'M' + pt(pts[3]) + 'C' + pt([lerp(pts[3][0], pts[2][0], 0.5), pts[3][1] + 10]) + ' ' + pt([pts[1][0] - 4, pts[1][1] + 12]) + ' ' + pt([pts[1][0] + 2, pts[1][1] + 8]) + 'L' + pt(pts[1]) + 'Z';
      var hiD = '', fd = '';
      for (var i = 0; i < LF0.length; i++) fd += taper(lerpPts(LF0[i], LF1[i], k), LFW[i]);
      for (i = 0; i < LH0.length; i++) hiD += streak(lerpPts(LH0[i], LH1[i], k), LHW[i]);
      var c0 = lerpPts(LH0[0], LH1[0], k), c3 = lerpPts(LH0[3], LH1[3], k);
      capeL.setD(closedD(pts), shD, hiD);
      lFolds.setAttribute('d', fd);
      lCores.setAttribute('d', F.taperD(c0.slice(0, 3), [0, 1.7, 0], 4) + F.taperD(c3.slice(0, 3), [0, 1.2, 0], 4));
    }

    function poseOf(s) {
      // pitch: chin up (+) / down (-); features shift by -pitch * 2.2 units inside the head
      var p = { tilt: -5, pitch: -0.6, lean: 0, cast: 0 };
      if (s.pose === 'cast') p.cast = 1;
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
      var ck = clamp(s.cast != null ? +s.cast : p.cast, 0, 1);
      var lean = s.lean != null ? +s.lean : p.lean - 2 * ck;
      var tilt = s.headTilt != null ? +s.headTilt : p.tilt;
      var bob = (+s.bob || 0) - (+s.breathe || 0) * 1.6 * (0.5 + 0.5 * LB.loopSin(s.t || 0, 3));
      M.root = chain(T(x, y), R(+s.rot || 0), Sc(sc * sx, sc * sy), T(-FEET[0], -FEET[1]));
      M.lean = chain(T(0, bob), T(HIP[0], HIP[1]), R(lean), T(-HIP[0], -HIP[1]));
      M.head = chain(T(NECK[0], NECK[1]), R(tilt), T(0, FACE_UP));
      setT(root, 'root', M.root);
      setT(leanFront, 'lf', M.lean);
      setT(headG, 'head', M.head);
      setT(feat, 'feat', T(0, -p.pitch * 2.2));

      // mitre stretch (rebuilt only when it changes)
      var mk = clamp(s.mitreStretch != null ? +s.mitreStretch : 1, 0.5, 2);
      if (last.mk !== mk) { last.mk = mk; applyMitre(mk); }

      // mustache: squash-and-stretch, the two halves flick their tips up
      var tw = clamp(+s.mustacheTwitch || 0, 0, 1), turn = clamp(+s.headTurn || 0, -1, 1);
      setT(mus, 'mus', chain(T(turn * 36 * 0.36, MUS_Y - 1.4 * tw), Sc(1 + 0.07 * tw, 1 - 0.11 * tw), T(0, -MUS_Y)));
      setT(musL, 'musL', about(-3, 31, 12 * tw));
      setT(musR, 'musR', about(3, 31, -12 * tw));
      setT(noseX, 'noseX', T(turn * 35 * 0.45, 0));   // same slide the face kit gives its nose and mouth
      setT(chinX, 'chinX', T(turn * 35 * 0.3, 0));

      // cape wing + casting arm
      var ckey = Math.round(ck * 1000) / 1000;
      if (last.ck !== ckey) { last.ck = ckey; applyCape(ck); }
      var wr = qb(WRIST0, WRIST_C, WRIST1, ck), th = lerp(90, 192, ck); // fingers end up aimed a little upward, at the Friar's bump
      if (s.armR && (s.armR.sh || s.armR.el)) {
        var rot = clamp((+s.armR.sh || 0) + (+s.armR.el || 0), -25, 25); // the wing does not follow, so keep it small
        var w2 = ap(about(SHOULDER[0], SHOULDER[1], rot), wr);
        wr = [w2.x, w2.y]; th += rot;
      }
      var hs = lerp(1, HAND_S, ck);
      var dir = [Math.cos(th * LB.deg), Math.sin(th * LB.deg)];
      var palm = [wr[0] + dir[0] * 12 * hs, wr[1] + dir[1] * 12 * hs];
      M.palm = palm;
      M.hand = chain(T(palm[0], palm[1]), R(th - 180), Sc(hs, hs));
      var castOn = ck > 0.01;
      vis(armG, 'arm', castOn);
      vis(handG, 'hand', castOn);
      vis(sleeve, 'slv', ck > 0.7);
      vis(rimG, 'rim', ck > 0.7);
      if (castOn) {
        var el = [wr[0] - dir[0] * 46, wr[1] - dir[1] * 46];
        var ad = capsule(el, wr, 17, 15.5);
        setA(armInk, 'ai', 'd', ad); setA(armFill, 'af', 'd', ad);
        setA(armShade, 'as', 'd', F.tubeShadeD(el, wr, 17, 15.5));
        setT(handG, 'hm', M.hand);
        if (ck > 0.7) {
          var slM = chain(T(wr[0] - dir[0] * 8, wr[1] - dir[1] * 8), R(th - 180));
          setT(sleeve, 'slm', slM); setT(rim, 'rimm', slM);
        }
      }
      var gk = castOn ? clamp(+s.castGlow || 0, 0, 1) : 0;
      var glowOn = gk > 0.01;
      vis(glowG, 'glow', glowOn); vis(ringBack.g, 'rb', glowOn); vis(ringFront.g, 'rf', glowOn);
      if (glowOn) {
        setT(glowG, 'gm', T(palm[0], palm[1]));
        setA(glowG, 'go', 'opacity', n2(gk));
        setT(ringBack.g, 'rbm', M.hand); setT(ringFront.g, 'rfm', M.hand);
        setA(ringBack.g, 'rbo', 'opacity', n2(gk)); setA(ringFront.g, 'rfo', 'opacity', n2(gk));
        // five sparks ride the ring (pure function of t)
        var df = '', db = '', tt = +s.t || 0;
        for (var i = 0; i < 5; i++) {
          var a = 2 * Math.PI * (i / 5 + 1.25 * tt), px = RING.cx + RING.rx * Math.cos(a), py = RING.ry * Math.sin(a);
          if (Math.cos(a) >= 0) df += circ(px, py, 2.1); else db += circ(px, py, 1.6);
        }
        setA(ringFront.dots, 'rfd', 'd', df || 'M0 0');
        setA(ringBack.dots, 'rbd', 'd', db || 'M0 0');
      }

      // heavy lids: an upward glance would roll the irises out of sight, so the Bishop looks up with 55% of the travel
      var gy = +s.gazeY || 0;
      face.update(gy < 0 ? Object.assign({}, s, { gazeY: gy * 0.55 }) : s);
      var sil = (+s.silhouette || 0) > 0.5;
      LB.silhouette(root, sil, s.silhouetteColor || '#000');
      last.p = p; last.state = s;
    }

    function anchor(name) {
      if (!M.root) update({});
      var base = chain(M.root, M.lean);
      var headM = chain(base, M.head);
      var p = last.p || poseOf({});
      var pitchY = -p.pitch * 2.2;
      switch (name) {
        case 'feet': return ap(M.root, [FEET[0], FEET[1]]);
        case 'hand': return ap(base, M.palm);
        case 'mustache': return ap(headM, [-14, 29 + pitchY]);
        case 'mitreTop': return ap(headM, [0, Ym(MITRE_TIP, last.mk || 1)]);
        default: return ap(headM, [0, -4]);
      }
    }

    update({});
    return { root: root, update: update, anchor: anchor };
  }

  LB.register('bishop', { create: create });
})();
