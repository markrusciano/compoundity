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
  LB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
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
  LB.applyCamera = function (stage, cam, t) {
    cam = cam || {};
    var zoom = cam.zoom || 1, x = cam.x != null ? cam.x : 500, y = cam.y != null ? cam.y : 500;
    var sh = LB.shake(t, cam.shake || 0, cam.shakeFreq || 24, 3);
    var rot = (cam.rot || 0) + sh.rot;
    stage.camera.setAttribute('transform',
      'translate(' + r4(500 + sh.x) + ' ' + r4(500 + sh.y) + ') rotate(' + r4(rot) + ') scale(' + r4(zoom) + ') translate(' + r4(-x) + ' ' + r4(-y) + ')');
    stage.world.style.filter = cam.filter || '';
  };
  // world-space position of an element's local point (pre-camera), for anchors
  LB.worldPoint = function (stage, node, px, py) {
    var m = stage.layers.chars.getCTM().inverse().multiply(node.getCTM());
    return { x: m.a * (px || 0) + m.c * (py || 0) + m.e, y: m.b * (px || 0) + m.d * (py || 0) + m.f };
  };

  // module registry (each src file calls LB.register('name', impl))
  LB.mod = {};
  LB.register = function (name, impl) { LB.mod[name] = impl; return impl; };
})();
