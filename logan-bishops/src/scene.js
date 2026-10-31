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
  // Signage lettering as glyph outlines, not <text>: world text under the zooming camera made Blink re-lay out every text
  // node on every zoom change (the zoom beats dropped to 30 fps on a mid phone), and paths need no web font to look right.
  // Baked by tools/bake-text.cjs from the original text specs (positions as Chrome laid them out with the web fonts).
  //   billboard : Source Sans 3 700. OVER (465,184) 13.6 ls 0.6 / $1 BILLION centred on 515, y 202.2, 21.6, squeezed to
  //               104 wide / RECOVERED ending at 565, y 215.2, 13.6 ls 0.3
  //   peanutDay : Mochiy Pop One 21. Peanut centred (92,834), Day centred (100,860), inside the rotate(-6 94 840) label
  var GLYPH_BILLBOARD = 'M469.7 184.2L469.7 184.2Q468.5 184.2 467.6 183.6Q466.6 183 466.1 182Q465.6 181 465.6 179.5L465.6 179.5Q465.6 178.1 466.1 177.1Q466.6 176 467.6 175.5Q468.5 175 469.7 175L469.7 175Q470.8 175 471.8 175.5Q472.7 176 473.2 177.1Q473.7 178.1 473.7 179.5L473.7 179.5Q473.7 181 473.2 182Q472.7 183 471.8 183.6Q470.8 184.2 469.7 184.2ZM469.7 182.4L469.7 182.4Q470.3 182.4 470.7 182.1Q471.1 181.7 471.4 181.1Q471.6 180.4 471.6 179.5L471.6 179.5Q471.6 178.6 471.4 178Q471.1 177.4 470.7 177Q470.3 176.7 469.7 176.7L469.7 176.7Q469.1 176.7 468.6 177Q468.2 177.4 467.9 178Q467.7 178.6 467.7 179.5L467.7 179.5Q467.7 180.4 467.9 181.1Q468.2 181.7 468.6 182.1Q469.1 182.4 469.7 182.4ZM479.7 184L477.3 184L474.7 175.1L476.8 175.1L477.8 179.3Q477.9 179.7 478 180.2Q478.1 180.7 478.3 181.2Q478.4 181.6 478.5 182.1L478.5 182.1L478.6 182.1Q478.7 181.6 478.8 181.2Q478.9 180.7 479 180.2Q479.1 179.7 479.3 179.3L479.3 179.3L480.4 175.1L482.4 175.1L479.7 184ZM489.6 184L484 184L484 175.1L489.5 175.1L489.5 176.8L486 176.8L486 178.6L489 178.6L489 180.3L486 180.3L486 182.3L489.6 182.3L489.6 184ZM494 184L492 184L492 175.1L495.2 175.1Q496.2 175.1 496.9 175.4Q497.7 175.6 498.2 176.2Q498.6 176.8 498.6 177.9L498.6 177.9Q498.6 178.9 498.2 179.6Q497.7 180.2 496.9 180.5Q496.2 180.8 495.2 180.8L495.2 180.8L494 180.8L494 184ZM494 176.7L494 179.2L495 179.2Q495.8 179.2 496.3 178.9Q496.7 178.5 496.7 177.9L496.7 177.9Q496.7 177.2 496.3 177Q495.8 176.7 495 176.7L495 176.7L494 176.7ZM499.1 184L496.8 184L494.8 180.3L496.2 179L499.1 184ZM468.3 202.5L468.3 202.5Q467.1 202.5 465.9 202Q464.7 201.6 463.8 200.7L463.8 200.7L465.3 198.7Q466 199.4 466.8 199.6Q467.5 199.9 468.3 199.9L468.3 199.9Q469.2 199.9 469.6 199.5Q470 199.1 470 198.4L470 198.4Q470 197.9 469.6 197.5Q469.2 197.1 468.6 196.7Q467.9 196.4 467.2 196Q466.5 195.6 465.8 195.1Q465.2 194.6 464.8 194Q464.4 193.3 464.4 192.3L464.4 192.3Q464.4 191.1 464.9 190.1Q465.4 189.2 466.4 188.7Q467.4 188.2 468.8 188.2L468.8 188.2Q470.2 188.2 471.2 188.7Q472.2 189.2 472.9 190.1L472.9 190.1L471.3 191.8Q470.8 191.3 470.2 191.1Q469.6 190.8 468.9 190.8L468.9 190.8Q468.2 190.8 467.8 191.1Q467.4 191.5 467.4 192.2L467.4 192.2Q467.4 192.7 467.8 193Q468.2 193.4 468.8 193.7Q469.5 194 470.2 194.4Q470.9 194.8 471.6 195.3Q472.2 195.7 472.6 196.4Q473 197.1 473 198.1L473 198.1Q473 199.4 472.5 200.4Q472 201.3 470.9 201.9Q469.8 202.5 468.3 202.5ZM469.7 204.6L467.6 204.6L467.6 201.2L469.7 201.2L469.7 204.6ZM469.7 189.2L467.6 189.2L467.6 186.1L469.7 186.1L469.7 189.2ZM484.5 202.2L475.8 202.2L475.8 199.6L478.8 199.6L478.8 191.7L476.2 191.7L476.2 189.7Q477.3 189.5 478.1 189.2Q478.9 188.9 479.6 188.5L479.6 188.5L481.9 188.5L481.9 199.6L484.5 199.6L484.5 202.2ZM496.8 202.2L491.6 202.2L491.6 188.1L496.4 188.1Q497.8 188.1 499 188.4Q500.2 188.7 500.8 189.5Q501.5 190.3 501.5 191.6L501.5 191.6Q501.5 192.7 501 193.5Q500.6 194.3 499.7 194.7L499.7 194.7L499.7 194.7Q500.9 195 501.5 195.8Q502.2 196.5 502.2 197.9L502.2 197.9Q502.2 199.4 501.5 200.3Q500.7 201.3 499.5 201.7Q498.3 202.2 496.8 202.2L496.8 202.2ZM494.7 190.6L494.7 193.8L496.2 193.8Q497.4 193.8 497.9 193.3Q498.4 192.8 498.4 192.1L498.4 192.1Q498.4 191.3 497.9 190.9Q497.4 190.6 496.2 190.6L496.2 190.6L494.7 190.6ZM494.7 196.1L494.7 199.7L496.5 199.7Q497.8 199.7 498.5 199.3Q499.1 198.8 499.1 197.8L499.1 197.8Q499.1 196.9 498.5 196.5Q497.8 196.1 496.5 196.1L496.5 196.1L494.7 196.1ZM507.7 202.2L504.6 202.2L504.6 188.1L507.7 188.1L507.7 202.2ZM519.7 202.2L511 202.2L511 188.1L514.2 188.1L514.2 199.5L519.7 199.5L519.7 202.2ZM530.8 202.2L522.1 202.2L522.1 188.1L525.3 188.1L525.3 199.5L530.8 199.5L530.8 202.2ZM536.4 202.2L533.2 202.2L533.2 188.1L536.4 188.1L536.4 202.2ZM545.4 202.5L545.4 202.5Q543.5 202.5 542.1 201.6Q540.6 200.7 539.8 199Q539 197.4 539 195.1L539 195.1Q539 192.8 539.8 191.2Q540.6 189.6 542.1 188.7Q543.5 187.9 545.4 187.9L545.4 187.9Q547.3 187.9 548.7 188.7Q550.2 189.6 550.9 191.2Q551.7 192.8 551.7 195.1L551.7 195.1Q551.7 197.4 550.9 199Q550.2 200.7 548.7 201.6Q547.3 202.5 545.4 202.5ZM545.4 199.7L545.4 199.7Q546.4 199.7 547.1 199.1Q547.7 198.6 548.1 197.5Q548.5 196.5 548.5 195.1L548.5 195.1Q548.5 193.7 548.1 192.7Q547.7 191.7 547.1 191.2Q546.4 190.6 545.4 190.6L545.4 190.6Q544.4 190.6 543.7 191.2Q543 191.7 542.7 192.7Q542.3 193.7 542.3 195.1L542.3 195.1Q542.3 196.5 542.7 197.5Q543 198.6 543.7 199.1Q544.4 199.7 545.4 199.7ZM557.4 202.2L554.4 202.2L554.4 188.1L557.7 188.1L561.3 195.1Q561.6 195.8 562 196.6Q562.3 197.4 562.6 198.2L562.6 198.2L562.7 198.2Q562.6 197.1 562.5 195.7Q562.3 194.4 562.3 193.1L562.3 193.1L562.3 188.1L565.3 188.1L565.3 202.2L562 202.2L558.4 195.3Q558.1 194.6 557.7 193.7Q557.4 192.9 557.1 192.1L557.1 192.1L557 192.1Q557.1 193.3 557.2 194.6Q557.4 196 557.4 197.2L557.4 197.2L557.4 202.2ZM493.6 215.2L491.6 215.2L491.6 206.3L494.8 206.3Q495.7 206.3 496.5 206.6Q497.2 206.8 497.7 207.4Q498.2 208 498.2 209.1L498.2 209.1Q498.2 210.1 497.7 210.8Q497.2 211.4 496.5 211.7Q495.7 212 494.8 212L494.8 212L493.6 212L493.6 215.2ZM493.6 207.9L493.6 210.4L494.6 210.4Q495.4 210.4 495.8 210.1Q496.2 209.7 496.2 209.1L496.2 209.1Q496.2 208.4 495.8 208.2Q495.4 207.9 494.6 207.9L494.6 207.9L493.6 207.9ZM498.6 215.2L496.4 215.2L494.4 211.5L495.8 210.2L498.6 215.2ZM505.9 215.2L500.2 215.2L500.2 206.3L505.7 206.3L505.7 208L502.2 208L502.2 209.8L505.2 209.8L505.2 211.5L502.2 211.5L502.2 213.5L505.9 213.5L505.9 215.2ZM511.7 215.4L511.7 215.4Q510.5 215.4 509.6 214.9Q508.7 214.3 508.1 213.3Q507.5 212.3 507.5 210.8L507.5 210.8Q507.5 209.7 507.8 208.9Q508.2 208 508.8 207.4Q509.4 206.8 510.1 206.5Q510.9 206.2 511.7 206.2L511.7 206.2Q512.6 206.2 513.2 206.5Q513.9 206.8 514.4 207.3L514.4 207.3L513.3 208.5Q513 208.2 512.6 208.1Q512.2 207.9 511.7 207.9L511.7 207.9Q511.2 207.9 510.7 208.3Q510.2 208.6 509.9 209.2Q509.6 209.9 509.6 210.8L509.6 210.8Q509.6 211.7 509.9 212.3Q510.1 213 510.7 213.3Q511.2 213.6 511.8 213.6L511.8 213.6Q512.3 213.6 512.8 213.4Q513.2 213.2 513.5 212.9L513.5 212.9L514.5 214.1Q513.9 214.7 513.2 215Q512.5 215.4 511.7 215.4ZM519.2 215.4L519.2 215.4Q518 215.4 517.1 214.8Q516.2 214.2 515.7 213.2Q515.2 212.2 515.2 210.7L515.2 210.7Q515.2 209.3 515.7 208.3Q516.2 207.2 517.1 206.7Q518 206.2 519.2 206.2L519.2 206.2Q520.4 206.2 521.4 206.7Q522.3 207.2 522.8 208.3Q523.3 209.3 523.3 210.7L523.3 210.7Q523.3 212.2 522.8 213.2Q522.3 214.2 521.4 214.8Q520.4 215.4 519.2 215.4ZM519.2 213.6L519.2 213.6Q519.9 213.6 520.3 213.3Q520.7 212.9 521 212.3Q521.2 211.6 521.2 210.7L521.2 210.7Q521.2 209.8 521 209.2Q520.7 208.6 520.3 208.2Q519.9 207.9 519.2 207.9L519.2 207.9Q518.6 207.9 518.2 208.2Q517.7 208.6 517.5 209.2Q517.3 209.8 517.3 210.7L517.3 210.7Q517.3 211.6 517.5 212.3Q517.7 212.9 518.2 213.3Q518.6 213.6 519.2 213.6ZM529 215.2L526.6 215.2L524 206.3L526.1 206.3L527.1 210.5Q527.2 210.9 527.3 211.4Q527.4 211.9 527.6 212.4Q527.7 212.8 527.8 213.3L527.8 213.3L527.9 213.3Q528 212.8 528.1 212.4Q528.2 211.9 528.3 211.4Q528.5 210.9 528.6 210.5L528.6 210.5L529.7 206.3L531.7 206.3L529 215.2ZM538.7 215.2L533 215.2L533 206.3L538.5 206.3L538.5 208L535 208L535 209.8L538 209.8L538 211.5L535 211.5L535 213.5L538.7 213.5L538.7 215.2ZM542.7 215.2L540.7 215.2L540.7 206.3L543.9 206.3Q544.9 206.3 545.6 206.6Q546.4 206.8 546.9 207.4Q547.3 208 547.3 209.1L547.3 209.1Q547.3 210.1 546.9 210.8Q546.4 211.4 545.6 211.7Q544.9 212 543.9 212L543.9 212L542.7 212L542.7 215.2ZM542.7 207.9L542.7 210.4L543.8 210.4Q544.5 210.4 545 210.1Q545.4 209.7 545.4 209.1L545.4 209.1Q545.4 208.4 545 208.2Q544.5 207.9 543.8 207.9L543.8 207.9L542.7 207.9ZM547.8 215.2L545.5 215.2L543.5 211.5L544.9 210.2L547.8 215.2ZM555 215.2L549.3 215.2L549.3 206.3L554.9 206.3L554.9 208L551.3 208L551.3 209.8L554.4 209.8L554.4 211.5L551.3 211.5L551.3 213.5L555 213.5L555 215.2ZM559.7 215.2L557.1 215.2L557.1 206.3L559.6 206.3Q561 206.3 562 206.8Q563 207.3 563.5 208.2Q564 209.2 564 210.7L564 210.7Q564 212.2 563.5 213.2Q563 214.2 562 214.7Q561 215.2 559.7 215.2L559.7 215.2ZM559.1 208L559.1 213.6L559.5 213.6Q560.2 213.6 560.8 213.3Q561.4 213 561.7 212.4Q562 211.8 562 210.7L562 210.7Q562 209.7 561.7 209.1Q561.4 208.5 560.8 208.2Q560.2 208 559.5 208L559.5 208L559.1 208Z';
  var GLYPH_PEANUT_DAY = 'M54.2 835.3L50.7 835.4Q50.6 834.7 50.6 834.1Q50.6 833.4 50.6 832.7L50.6 832.7Q50.6 829.6 50.8 826.7Q50.9 823.8 51.1 821.1L51.1 821.1Q50.2 821.4 49.7 821.5L49.7 821.5L48.8 818.2Q49.9 817.9 51 817.6Q52.2 817.4 53.3 817.2Q54.4 817.1 55.3 817Q56.2 816.9 56.8 816.9L56.8 816.9Q57.5 816.9 58.5 817Q59.4 817.1 60.4 817.5Q61.4 817.8 62.3 818.4Q63.2 819.1 63.8 820.2Q64.3 821.3 64.3 823L64.3 823Q64.3 824.7 63.6 825.8Q62.8 827 61.6 827.6Q60.3 828.3 58.8 828.6Q57.3 828.9 55.9 828.9L55.9 828.9Q55 828.9 54.1 828.8L54.1 828.8Q54.1 829.8 54.1 830.8L54.1 830.8Q54.1 832.2 54.1 833.3Q54.2 834.5 54.2 835.3L54.2 835.3ZM56.7 820.4L56.7 820.4Q56.2 820.4 55.6 820.4Q55 820.5 54.5 820.5L54.5 820.5Q54.4 821.6 54.3 822.9Q54.2 824.2 54.2 825.6L54.2 825.6Q55 825.7 55.8 825.7L55.8 825.7Q60.9 825.7 60.9 822.7L60.9 822.7Q60.9 821.5 59.8 820.9Q58.8 820.4 56.7 820.4ZM72.6 835.7L72.6 835.7Q70.5 835.7 69 834.9Q67.5 834.1 66.6 832.7Q65.8 831.3 65.8 829.4L65.8 829.4Q65.8 828.3 66.2 827.1Q66.6 825.9 67.4 824.8Q68.2 823.7 69.6 823.1Q71 822.4 73 822.4L73 822.4Q74.4 822.4 75.4 822.7Q76.3 823 77 823.5Q77.6 824 77.9 824.6Q78.2 825.2 78.3 825.7Q78.5 826.2 78.5 826.5L78.5 826.5Q78.5 828.6 76.8 829.7Q75 830.8 71.9 830.8L71.9 830.8Q71.2 830.8 70.6 830.7Q69.9 830.6 69.4 830.6L69.4 830.6Q69.8 831.6 70.7 832.1Q71.6 832.6 72.6 832.6L72.6 832.6Q74 832.6 75.1 832.1Q76.2 831.6 77.2 830.5L77.2 830.5L79 833.2Q78.4 833.7 77.5 834.3Q76.7 834.9 75.5 835.3Q74.3 835.7 72.6 835.7ZM73 825.5L73 825.5Q71.8 825.5 70.8 826.2Q69.9 826.8 69.5 827.8L69.5 827.8Q70 827.9 70.5 828Q71 828 71.5 828L71.5 828Q72 828 72.6 827.9Q73.2 827.8 73.7 827.7Q74.3 827.5 74.7 827.2Q75.1 827 75.1 826.6L75.1 826.6Q75.1 826.5 74.9 826.2Q74.7 826 74.3 825.7Q73.9 825.5 73 825.5ZM85.9 835.7L85.9 835.7Q84.4 835.7 83.1 834.9Q81.8 834 81.1 832.7Q80.3 831.3 80.3 829.6L80.3 829.6Q80.3 828 80.9 826.7Q81.5 825.4 82.5 824.5Q83.5 823.6 84.8 823.1Q86.1 822.6 87.6 822.6L87.6 822.6Q88.8 822.6 89.9 822.9L89.9 822.9Q90 822.5 90.1 822L90.1 822L93.7 822.6Q93.5 823 93.4 823.8Q93.2 824.6 93.1 825.6Q93 826.6 93 827.6Q92.9 828.6 92.9 829.4L92.9 829.4Q92.9 830 93 830.7Q93.1 831.3 93.4 831.7Q93.7 832 94.4 832L94.4 832L94.7 832L94.1 835.7Q92.7 835.7 91.8 835.2Q90.9 834.8 90.4 834L90.4 834Q89.5 835 88.3 835.3Q87.2 835.7 85.9 835.7ZM83.8 830L83.8 830Q83.9 831 84.6 831.6Q85.3 832.2 86.4 832.2L86.4 832.2Q87.5 832.2 88.2 831.6Q88.9 831.1 89.4 830.1L89.4 830.1Q89.4 829.7 89.4 829.4L89.4 829.4Q89.4 828.6 89.4 827.8Q89.5 827.1 89.5 826.3L89.5 826.3Q88.6 826 87.7 826L87.7 826Q86.5 826 85.6 826.4Q84.7 826.9 84.2 827.7Q83.7 828.5 83.7 829.5L83.7 829.5Q83.7 829.7 83.7 829.8Q83.7 829.9 83.8 830ZM99.5 835.5L96.2 835.5Q96.1 833.7 96.1 832.1Q96 830.5 96 829L96 829Q96 827.4 96.1 825.9Q96.1 824.4 96.2 822.6L96.2 822.6L99.7 822.6Q99.6 823.5 99.6 824.5L99.6 824.5Q100.3 823.6 101.3 823Q102.3 822.4 103.6 822.4L103.6 822.4Q104.9 822.4 105.8 822.8Q106.6 823.3 107.1 824.1Q107.6 824.8 107.8 825.8Q108.1 826.8 108.1 828Q108.2 829.1 108.2 830.3L108.2 830.3Q108.2 831.5 108.1 832.7Q108.1 833.9 108.1 834.6Q108 835.4 108 835.6L108 835.6L104.5 835.6Q104.5 834.7 104.6 833.7Q104.6 832.7 104.6 831.8Q104.7 830.8 104.7 830.1L104.7 830.1Q104.7 825.6 103.2 825.6L103.2 825.6Q102 825.6 101.1 826.6Q100.1 827.7 99.4 829.2L99.4 829.2Q99.4 829.4 99.4 829.7L99.4 829.7Q99.4 830.7 99.4 831.7Q99.4 832.8 99.5 833.8Q99.5 834.8 99.5 835.5L99.5 835.5ZM114.9 835.7L114.9 835.7Q113.6 835.7 112.7 835.2Q111.8 834.8 111.3 834Q110.8 833.1 110.5 832.1Q110.3 831.1 110.2 830Q110.2 828.9 110.2 827.9L110.2 827.9Q110.2 826.7 110.2 825.5Q110.3 824.3 110.4 822.8L110.4 822.8L114.2 822.6Q114.2 823 114 823.9Q113.9 824.8 113.8 825.9Q113.7 827 113.7 828.3L113.7 828.3Q113.7 830.3 114.1 831.3Q114.4 832.3 115.1 832.3L115.1 832.3Q116.6 832.3 117.2 830.2Q117.9 828.1 117.9 823.6L117.9 823.6L117.9 822.7L119.7 822.6L121.8 822.6Q121.6 824.5 121.4 826.2Q121.3 827.9 121.2 829Q121.2 830.1 121.2 830.5L121.2 830.5Q121.2 831.5 121.3 831.9Q121.5 832.3 121.9 832.3L121.9 832.3Q122.1 832.3 122.4 832.2Q122.6 832.1 123 831.9L123 831.9L122.8 835.5Q122 835.6 121.4 835.6L121.4 835.6Q120.4 835.6 119.8 835.3Q119.2 834.9 118.8 834.3L118.8 834.3Q118.1 834.9 117.2 835.3Q116.2 835.7 114.9 835.7ZM131 835.7L131 835.7Q129.7 835.7 129 835.1Q128.3 834.6 127.9 833.6Q127.6 832.7 127.5 831.5Q127.4 830.3 127.4 828.9L127.4 828.9Q127.4 827.5 127.5 826L127.5 826Q126.1 826.2 124.8 826.5L124.8 826.5L124.2 823.2Q125.9 822.8 127.9 822.6L127.9 822.6Q128 821.5 128.2 820.3Q128.4 819.1 128.6 817.8L128.6 817.8L132.2 818.1Q131.9 819.2 131.7 820.3Q131.5 821.4 131.4 822.4L131.4 822.4Q132.6 822.4 133.6 822.4Q134.7 822.5 135.5 822.6L135.5 822.6L135.1 825.9Q134.4 825.8 133.6 825.8Q132.8 825.7 132 825.7L132 825.7Q131.5 825.7 131 825.8L131 825.8Q130.9 827.3 130.9 828.4Q130.9 829.5 130.9 829.9L130.9 829.9Q130.9 831.1 131 831.6Q131.1 832.1 131.4 832.1L131.4 832.1Q131.8 832.1 132.2 831.9Q132.7 831.6 133.1 831.2Q133.5 830.8 133.8 830.3L133.8 830.3L135.5 833.7Q133.4 835.7 131 835.7ZM80.7 861.7L80.7 861.7L77.2 861.3L78 846.9Q77.4 847 77 847.2L77 847.2L76.3 843.6Q77.4 843.4 79.1 843.2Q80.7 842.9 82.5 842.9L82.5 842.9Q83.8 842.9 85.2 843.2Q86.6 843.5 87.8 844.1Q89.1 844.8 90.1 845.8Q91.1 846.9 91.7 848.5Q92.3 850 92.3 852.1L92.3 852.1Q92.3 855.1 91.3 857.2Q90.4 859.3 88.5 860.4Q86.7 861.6 84.2 861.6L84.2 861.6Q82.5 861.6 80.8 860.9L80.8 860.9Q80.8 861.3 80.7 861.7ZM82.3 846.4L82.3 846.4Q82 846.4 81.7 846.4L81.7 846.4Q81.5 850.3 81.3 853.1Q81.2 855.8 81 857.6L81 857.6Q81.7 857.9 82.4 858Q83.2 858.2 84 858.2L84 858.2Q85.7 858.2 86.8 857.3Q87.8 856.5 88.3 855Q88.7 853.6 88.7 852L88.7 852Q88.7 850.6 88.3 849.7Q87.9 848.8 87.3 848.2Q86.7 847.6 85.9 847.2Q85.1 846.9 84.4 846.7Q83.7 846.5 83.1 846.5Q82.6 846.4 82.3 846.4ZM99.3 861.7L99.3 861.7Q97.8 861.7 96.5 860.9Q95.2 860 94.5 858.7Q93.7 857.3 93.7 855.6L93.7 855.6Q93.7 854 94.3 852.7Q94.9 851.4 95.9 850.5Q96.9 849.6 98.2 849.1Q99.5 848.6 101 848.6L101 848.6Q102.2 848.6 103.3 848.9L103.3 848.9Q103.4 848.5 103.5 848L103.5 848L107 848.6Q106.9 849 106.8 849.8Q106.6 850.6 106.5 851.6Q106.4 852.6 106.4 853.6Q106.3 854.6 106.3 855.4L106.3 855.4Q106.3 856 106.4 856.7Q106.5 857.3 106.8 857.7Q107.1 858 107.8 858L107.8 858L108.1 858L107.5 861.7Q106.1 861.7 105.2 861.2Q104.3 860.8 103.8 860L103.8 860Q102.9 861 101.7 861.3Q100.6 861.7 99.3 861.7ZM97.2 856L97.2 856Q97.3 857 98 857.6Q98.7 858.2 99.8 858.2L99.8 858.2Q100.9 858.2 101.6 857.6Q102.3 857.1 102.8 856.1L102.8 856.1Q102.8 855.7 102.8 855.4L102.8 855.4Q102.8 854.6 102.8 853.8Q102.8 853.1 102.9 852.3L102.9 852.3Q102 852 101.1 852L101.1 852Q99.9 852 99 852.4Q98.1 852.9 97.6 853.7Q97.1 854.5 97.1 855.5L97.1 855.5Q97.1 855.7 97.1 855.8Q97.1 855.9 97.2 856ZM112.7 865.7L112.7 865.7L109.6 864Q110.8 862.7 111.9 861.3Q113 860 114 858.5L114 858.5Q113 857.2 112 855.7Q111 854.1 110.2 852.7Q109.3 851.2 108.8 850L108.8 850L112.2 848.6Q112.6 849.6 113.2 850.8Q113.8 851.9 114.5 853.2Q115.2 854.4 116 855.5L116 855.5Q118.3 851.8 119.7 848.2L119.7 848.2L123.2 849.6Q122.3 851.4 121.1 853.5Q119.9 855.6 118.5 857.7Q117.2 859.8 115.7 861.9Q114.2 863.9 112.7 865.7Z';

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
    function bbTexts(parent, extra) { P(parent, GLYPH_BILLBOARD, extra); }
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
      P(lbl, GLYPH_PEANUT_DAY, { fill: '#2B2522', stroke: '#FFFFFF', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
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
