/* Logan Bishops: shared core (namespace, SVG helpers, easing, keyframes, loop clock, stage). */
(function () {
  'use strict';
  var LB = (window.LB = window.LB || {});
  var NS = (LB.NS = 'http://www.w3.org/2000/svg');

  LB.D = 6.0; // loop duration in seconds; the director may change it via LB.setDuration
  LB.setDuration = function (d) { LB.D = d; };

  // ---------------------------------------------------------------- SVG helpers
  LB.attr = function (node, attrs) {
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === undefined || v === null) continue;
      if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    return node;
  };
  LB.el = function (tag, attrs, parent) {
    var n = LB.attr(document.createElementNS(NS, tag), attrs);
    if (parent) parent.appendChild(n);
    return n;
  };
  LB.g = function (parent, attrs) { return LB.el('g', attrs, parent); };
  LB.path = function (parent, d, attrs) {
    var a = attrs || {};
    a.d = d;
    return LB.el('path', a, parent);
  };
  var uidN = 0;
  LB.uid = function (prefix) { return (prefix || 'lb') + '-' + (++uidN); };
  LB.defs = function (svg) {
    var d = svg.querySelector(':scope > defs');
    if (!d) { d = LB.el('defs'); svg.insertBefore(d, svg.firstChild); }
    return d;
  };
  // transform string helper: LB.tf({x, y, rot, sx, sy, s, ox, oy}) rotates/scales about (ox, oy) after translating.
  LB.tf = function (o) {
    var x = o.x || 0, y = o.y || 0, r = o.rot || 0;
    var sx = o.sx != null ? o.sx : (o.s != null ? o.s : 1);
    var sy = o.sy != null ? o.sy : (o.s != null ? o.s : 1);
    var ox = o.ox || 0, oy = o.oy || 0;
    var s = 'translate(' + r4(x) + ' ' + r4(y) + ')';
    if (ox || oy) s += ' translate(' + r4(ox) + ' ' + r4(oy) + ')';
    if (r) s += ' rotate(' + r4(r) + ')';
    if (sx !== 1 || sy !== 1) s += ' scale(' + r4(sx) + ' ' + r4(sy) + ')';
    if (ox || oy) s += ' translate(' + r4(-ox) + ' ' + r4(-oy) + ')';
    return s;
  };
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  LB.r4 = r4;
  // show/hide without layout churn
  LB.show = function (node, on) { node.style.display = on ? '' : 'none'; };
  LB.opacity = function (node, k) { node.setAttribute('opacity', r4(LB.clamp(k, 0, 1))); };

  // ---------------------------------------------------------------- math
  LB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v === v ? v : a; }; // NaN -> a
  LB.lerp = function (a, b, k) { return a + (b - a) * k; };
  LB.invLerp = function (a, b, v) { return a === b ? 0 : (v - a) / (b - a); };
  LB.remap = function (v, a, b, c, d) { return LB.lerp(c, d, LB.clamp(LB.invLerp(a, b, v), 0, 1)); };
  LB.smoothstep = function (a, b, v) { var k = LB.clamp(LB.invLerp(a, b, v), 0, 1); return k * k * (3 - 2 * k); };
  LB.deg = Math.PI / 180;

  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function toHex(rgb) {
    return '#' + rgb.map(function (v) { var s = Math.round(LB.clamp(v, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }
  LB.lerpColor = function (a, b, k) {
    var A = hex(a), B = hex(b);
    return toHex([LB.lerp(A[0], B[0], k), LB.lerp(A[1], B[1], k), LB.lerp(A[2], B[2], k)]);
  };
  LB.shade = function (c, k) { return k < 0 ? LB.lerpColor(c, '#000000', -k) : LB.lerpColor(c, '#ffffff', k); };

  // ---------------------------------------------------------------- easing
  var E = (LB.ease = {
    linear: function (k) { return k; },
    step: function (k) { return k < 1 ? 0 : 1; },
    hold: function () { return 0; },
    inQuad: function (k) { return k * k; },
    outQuad: function (k) { return k * (2 - k); },
    inOutQuad: function (k) { return k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k; },
    inCubic: function (k) { return k * k * k; },
    outCubic: function (k) { return --k * k * k + 1; },
    inOutCubic: function (k) { return k < 0.5 ? 4 * k * k * k : (k - 1) * (2 * k - 2) * (2 * k - 2) + 1; },
    inQuart: function (k) { return k * k * k * k; },
    outQuart: function (k) { return 1 - --k * k * k * k; },
    inOutSine: function (k) { return -(Math.cos(Math.PI * k) - 1) / 2; },
    outExpo: function (k) { return k === 1 ? 1 : 1 - Math.pow(2, -10 * k); },
    inExpo: function (k) { return k === 0 ? 0 : Math.pow(2, 10 * k - 10); },
    outBack: function (k) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
    inBack: function (k) { var c1 = 1.70158, c3 = c1 + 1; return c3 * k * k * k - c1 * k * k; },
    outElastic: function (k) {
      if (k === 0 || k === 1) return k;
      return Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    },
    outBounce: function (k) {
      var n1 = 7.5625, d1 = 2.75;
      if (k < 1 / d1) return n1 * k * k;
      if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
      if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
      return n1 * (k -= 2.625 / d1) * k + 0.984375;
    },
    // anime "snap": almost all of the motion happens in the first 25%
    snap: function (k) { return 1 - Math.pow(1 - LB.clamp(k, 0, 1), 6); },
  });

  // ---------------------------------------------------------------- keyframe tracks
  // LB.track([[t, value, easeIntoThisKey?], ...]) -> function (t) -> value
  //   numbers interpolate; '#rrggbb' strings interpolate as colors; other strings / booleans hold (step);
  //   plain objects interpolate field by field with the same rules.
  // The ease on a key shapes the segment that ENDS at that key (default 'inOutCubic').
  LB.track = function (keys) {
    keys = keys.slice().sort(function (a, b) { return a[0] - b[0]; });
    return function (t) {
      if (t <= keys[0][0]) return keys[0][1];
      var last = keys[keys.length - 1];
      if (t >= last[0]) return last[1];
      for (var i = 1; i < keys.length; i++) {
        if (t < keys[i][0]) {
          var a = keys[i - 1], b = keys[i];
          var ez = E[b[2] || 'inOutCubic'] || E.inOutCubic;
          return LB.mixValue(a[1], b[1], ez(LB.invLerp(a[0], b[0], t)));
        }
      }
      return last[1];
    };
  };
  LB.mixValue = function (a, b, k) {
    if (typeof a === 'number' && typeof b === 'number') return LB.lerp(a, b, k);
    if (typeof a === 'string' && typeof b === 'string' && a[0] === '#' && b[0] === '#') return LB.lerpColor(a, b, k);
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      var o = {}, key;
      for (key in a) o[key] = key in b ? LB.mixValue(a[key], b[key], k) : a[key];
      for (key in b) if (!(key in a)) o[key] = b[key];
      return o;
    }
    return k < 1 ? a : b;
  };
  // envelope: 0 before a, ramps up over fadeIn, 1 until b, ramps down over fadeOut
  LB.env = function (t, a, b, fadeIn, fadeOut) {
    fadeIn = fadeIn || 0; fadeOut = fadeOut || 0;
    if (t < a || t > b + fadeOut) return 0;
    if (fadeIn && t < a + fadeIn) return (t - a) / fadeIn;
    if (t <= b) return 1;
    return fadeOut ? 1 - (t - b) / fadeOut : 0;
  };
  // progress 0..1 of t inside [a, b], clamped
  LB.prog = function (t, a, b) { return LB.clamp(LB.invLerp(a, b, t), 0, 1); };
  LB.inWin = function (t, a, b) { return t >= a && t < b; };
  // loop-safe periodic motion: `cycles` must be an integer number of cycles per loop to stay seamless
  LB.loopSin = function (t, cycles, phase) { return Math.sin(2 * Math.PI * ((cycles || 1) * t / LB.D + (phase || 0))); };

  // ---------------------------------------------------------------- deterministic noise
  LB.hash = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
  LB.noise1 = function (x, seed) {
    seed = seed || 0;
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return LB.lerp(LB.hash(i + seed * 57.3), LB.hash(i + 1 + seed * 57.3), u) * 2 - 1;
  };
  // deterministic camera shake offset; amp in world units, freq in Hz
  LB.shake = function (t, amp, freq, seed) {
    if (!amp) return { x: 0, y: 0, rot: 0 };
    var f = (freq || 24) * t;
    return { x: LB.noise1(f, seed || 1) * amp, y: LB.noise1(f, (seed || 1) + 9) * amp, rot: LB.noise1(f, (seed || 1) + 17) * amp * 0.08 };
  };
  // seeded PRNG for building static geometry (stars, ermine spots, speckles) identically every load
  LB.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  // ---------------------------------------------------------------- loop clock
  var clock = (LB.clock = {
    t: 0, loops: 0, paused: false, rate: 1,
    _last: null, _listeners: [],
    tick: function (now) {
      if (clock._last === null) clock._last = now;
      var dt = Math.min(0.1, (now - clock._last) / 1000);
      clock._last = now;
      if (!clock.paused) {
        clock.t += dt * clock.rate;
        while (clock.t >= LB.D) {
          clock.t -= LB.D;
          clock.loops++;
          for (var i = 0; i < clock._listeners.length; i++) clock._listeners[i](clock.loops);
        }
      }
      return clock.t;
    },
    seek: function (t) { clock.t = ((t % LB.D) + LB.D) % LB.D; LB.renderNow && LB.renderNow(); },
    pause: function () { clock.paused = true; },
    play: function () { clock.paused = false; clock._last = null; },
    onLoop: function (fn) { clock._listeners.push(fn); },
  });
  LB.seek = clock.seek;
  LB.pause = clock.pause;
  LB.play = clock.play;

  // ---------------------------------------------------------------- stage
  // Two stacked square SVGs, both viewBox 0 0 1000 1000:
  //   world   : everything the camera sees. <g camera> holds layers bg, mid, chars, fxWorld.
  //   overlay : screen-space effects and text (not affected by camera or by world filters).
  LB.mountStage = function (container) {
    container.classList.add('lb-stage');
    var mk = function (cls) {
      var s = LB.el('svg', { viewBox: '0 0 1000 1000', preserveAspectRatio: 'xMidYMid slice', class: cls });
      s.setAttribute('xmlns', NS);
      container.appendChild(s);
      return s;
    };
    var world = mk('lb-world');
    // the world svg is its own compositor layer: slow camera pushes scale it there (see LB.applyCamera)
    world.style.transformOrigin = '50% 50%';
    world.style.willChange = 'transform';
    var camera = LB.g(world, { class: 'lb-camera' });
    var overlay = mk('lb-overlay');
    var stage = {
      root: container,
      world: world,
      camera: camera,
      overlay: overlay,
      layers: {
        bg: LB.g(camera, { class: 'lb-bg' }),
        mid: LB.g(camera, { class: 'lb-mid' }),
        chars: LB.g(camera, { class: 'lb-chars' }),
        fg: LB.g(camera, { class: 'lb-fg' }),
        fxWorld: LB.g(camera, { class: 'lb-fxworld' }),
        fxScreen: LB.g(overlay, { class: 'lb-fxscreen' }),
        text: LB.g(overlay, { class: 'lb-text' }),
      },
      defsWorld: LB.defs(world),
      defsOverlay: LB.defs(overlay),
    };
    return stage;
  };
  LB.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Zoom is split in two: the SVG camera uses the zoom rounded down to a step of a 1.05 ladder (z0), and the remaining
  // factor s = zoom / z0 (1 .. 1.05) is a CSS scale of the world svg about its centre, done by the compositor. During a
  // slow push with a fixed centre (billboard, lawsuit, two-shot) the SVG transform string then stays the same for many
  // frames, so the world is not re-laid out and re-rasterized every frame (that held those beats at 30 fps on a mid
  // phone); only the parts that animate repaint. The split is a pure function of the camera (the ladder is fixed), and
  // screen positions are exactly those of a single SVG zoom (shake offsets are divided by s to compensate).
  var ZSTEP = Math.log(1.05);
  LB.applyCamera = function (stage, cam, t) {
    cam = cam || {};
    var zoom = cam.zoom || 1, x = cam.x != null ? cam.x : 500, y = cam.y != null ? cam.y : 500;
    var sh = LB.shake(t, (cam.shake || 0) * (LB.reducedMotion ? 0.4 : 1), cam.shakeFreq || 24, 3);
    var rot = (cam.rot || 0) + sh.rot;
    stage.cam = { x: x, y: y, zoom: zoom, rot: rot, sx: 500 + sh.x, sy: 500 + sh.y };
    var z0 = Math.exp(Math.floor(Math.log(zoom) / ZSTEP + 1e-6) * ZSTEP), s = zoom / z0;
    if (s < 1.0005) { s = 1; z0 = zoom; }
    var tr = 'translate(' + r4(500 + sh.x / s) + ' ' + r4(500 + sh.y / s) + ') rotate(' + r4(rot) + ') scale(' + r4(z0) + ') translate(' + r4(-x) + ' ' + r4(-y) + ')';
    var css = s === 1 ? '' : 'scale(' + r4(s) + ')', st = stage.__camCache || (stage.__camCache = {});
    if (st.tr !== tr) { st.tr = tr; stage.camera.setAttribute('transform', tr); }
    if (st.css !== css) { st.css = css; stage.world.style.transform = css; }
    var flt = cam.filter || '';
    if (st.flt !== flt) { st.flt = flt; stage.world.style.filter = flt; }
  };
  // world point -> screen point (overlay viewBox units, 0..1000) for the camera applied this frame
  LB.worldToScreen = function (stage, p) {
    var c = stage.cam || { x: 500, y: 500, zoom: 1, rot: 0, sx: 500, sy: 500 };
    var dx = (p.x - c.x) * c.zoom, dy = (p.y - c.y) * c.zoom, a = c.rot * LB.deg;
    return { x: c.sx + dx * Math.cos(a) - dy * Math.sin(a), y: c.sy + dx * Math.sin(a) + dy * Math.cos(a) };
  };

  // Silhouette mode for impact frames: LB.silhouette(root, on, color) paints every shape in `root` one flat color.
  // Mark decorative bits that should vanish in silhouette (highlights, glows) with data-sil="hide".
  // It is an SVG filter (a color matrix: rgb = the color, alpha kept) set on the root, not a `.lb-sil *` paint override:
  // that forced a style recalc and layout-tree rebuild over about 1000 elements, so on a mid phone the 70 ms impact
  // frame showed for one frame and the next drawings were dropped. The hide rule only touches [data-sil] elements, and
  // visibility (not display) needs no layout. The DOM is only touched when the state changes.
  (function injectCss() {
    // (a nested clone sits right after its outer root and vanishes with it when the rig hides the root: hidden: true)
    var css = '.lb-sil [data-sil="hide"] { visibility: hidden !important; }' +
      '[style*="display: none"] + [data-lb-silclone], [style*="display:none"] + [data-lb-silclone] { display: none !important; }';
    var s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  })();
  var silFilter = {}; // color -> filter id (per document; the world svg's defs)
  function silFilterId(root, color) {
    var svg = root.ownerSVGElement || root;
    var key = color + '|' + (svg.__lbSvgId || (svg.__lbSvgId = LB.uid('lbsvg')));
    if (silFilter[key]) return silFilter[key];
    var id = LB.uid('lbsil');
    var f = LB.el('filter', { id: id, x: '-5%', y: '-5%', width: '110%', height: '110%', 'color-interpolation-filters': 'sRGB' }, LB.defs(svg));
    // one primitive: rgb = the color, alpha kept
    var c = hex(color.charAt(0) === '#' ? color : '#000').map(function (v) { return r4(v / 255); });
    LB.el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 ' + c[0] + ' 0 0 0 0 ' + c[1] + ' 0 0 0 0 ' + c[2] + ' 0 0 0 1 0' }, f);
    return (silFilter[key] = id);
  }
  // A nested call (a part inside a silhouetted root, e.g. the King's scepter in gold over his black figure; call the root
  // first) cannot escape the root's filter, so it shows a recolored live <use> clone of the part right above the root.
  function silOuter(node) {
    for (var p = node.parentNode; p && p.nodeType === 1; p = p.parentNode) if (p.__lbSil) return p;
    return null;
  }
  LB.silhouette = function (root, on, color) {
    var key = on ? (color || '#000') : '';
    var outer = on ? silOuter(root) : null;
    if (root.__lbSil === key && !outer) return;
    var was = root.__lbSil;
    root.__lbSil = key;
    if (outer) {
      var u = root.__lbSilUse;
      if (!u) {
        if (!root.id) root.id = LB.uid('lbsilsrc');
        u = root.__lbSilUse = LB.el('use', { 'data-lb-silclone': '1' });
      }
      if (u.parentNode !== outer.parentNode || u.previousSibling !== outer) outer.parentNode.insertBefore(u, outer.nextSibling);
      if (was !== key || !u.hasAttribute('href')) { u.setAttribute('filter', 'url(#' + silFilterId(outer, key) + ')'); u.setAttribute('href', '#' + root.id); }
      (outer.__lbSilClones || (outer.__lbSilClones = [])).indexOf(u) < 0 && outer.__lbSilClones.push(u);
      // place the clone in the outer root's parent space (only while on: a few frames per loop)
      var a = outer.parentNode.getCTM(), b = root.parentNode.getCTM();
      if (a && b) {
        var m = a.inverse().multiply(b);
        u.setAttribute('transform', 'matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].map(r4).join(' ') + ')');
      }
      return;
    }
    if (root.__lbSilUse) root.__lbSilUse.removeAttribute('href'); // no reference while off: no clone upkeep
    if (!on && root.__lbSilClones) root.__lbSilClones.forEach(function (c) { c.removeAttribute('href'); });
    if (on) { root.setAttribute('filter', 'url(#' + silFilterId(root, key) + ')'); root.classList.add('lb-sil'); }
    else { root.removeAttribute('filter'); root.classList.remove('lb-sil'); }
  };

  // resolve a position given as {x, y} (world) or as an anchor ref string 'who.name' (e.g. 'friar.lensR')
  LB.resolveAt = function (ctx, at) {
    if (!at) return { x: 500, y: 500 };
    if (typeof at === 'string') { var p = at.split('.'); return ctx.anchor(p[0], p[1]); }
    return at;
  };
  // fixed world points from the storyboard that several modules need
  LB.WORLD = { arches: { x: 590, y: 225 }, billboard: { x: 515, y: 195 }, floorY: 950 };
  // limited animation helper: quantize time to 12 fps ("on twos")
  LB.onTwos = function (t) { return Math.floor(t * 12 + 1e-6) / 12; };
  // world-space position of an element's local point (pre-camera), for anchors
  LB.worldPoint = function (stage, node, px, py) {
    var m = stage.layers.chars.getCTM().inverse().multiply(node.getCTM());
    return { x: m.a * (px || 0) + m.c * (py || 0) + m.e, y: m.b * (px || 0) + m.d * (py || 0) + m.f };
  };

  // module registry (each src file calls LB.register('name', impl))
  LB.mod = {};
  LB.register = function (name, impl) { LB.mod[name] = impl; return impl; };
})();
