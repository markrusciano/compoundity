/* Logan Bishops: boot + render loop. Wires ui, scene, characters, fx, audio and director together. */
(function () {
  'use strict';
  var LB = window.LB;
  var params = new URLSearchParams(location.search);
  var CHAR_ORDER = ['bishop', 'friar', 'king']; // back to front: the King's scepter crosses in front of the Friar

  function noop() {}
  function fallbackStage(app) {
    var box = document.createElement('div');
    box.className = 'lb-stage-only';
    app.appendChild(box);
    return box;
  }

  LB.boot = function () {
    var app = document.getElementById('app');
    var stageOnly = params.has('stageOnly') || !LB.mod.ui;
    if (stageOnly) document.documentElement.classList.add('lb-stage-only-mode');
    var container = stageOnly ? fallbackStage(app) : LB.mod.ui.create(app);
    var stage = (LB.stage = LB.mountStage(container));

    var director = LB.mod.director || { frame: function () { return {}; } };
    if (director.duration) LB.setDuration(director.duration);

    var scene = LB.mod.scene ? LB.mod.scene.create(stage) : { update: noop };
    var chars = {};
    CHAR_ORDER.forEach(function (name) {
      if (LB.mod[name]) chars[name] = LB.mod[name].create(stage.layers.chars, stage);
    });
    var ctx = (LB.ctx = {
      stage: stage,
      chars: chars,
      // world-space point for a named anchor on a character, e.g. ctx.anchor('friar', 'glasses')
      anchor: function (who, name) {
        var c = chars[who];
        return c && c.anchor ? c.anchor(name) : { x: 500, y: 500 };
      },
    });
    var fx = LB.mod.fx ? LB.mod.fx.create(stage, ctx) : { update: noop };
    if (director.init) director.init(ctx);
    var audio = LB.mod.audio || null;
    if (audio && audio.init) audio.init(ctx);
    LB.ctx.fxApi = fx;

    var last = null;
    function render(t) {
      var f = director.frame(t, ctx) || {};
      last = f;
      LB.applyCamera(stage, f.camera, t);
      scene.update(f.scene || {}, t, ctx);
      CHAR_ORDER.forEach(function (name) {
        if (!chars[name]) return;
        var s = Object.assign({ t: t }, (f.chars && f.chars[name]) || {});
        chars[name].update(s);
      });
      fx.update(f.fx || {}, t, ctx);
      if (!stageOnly && LB.mod.ui.update) LB.mod.ui.update(t, LB.clock.loops, f.ui || {});
      if (audio && audio.update) audio.update(t, LB.clock.loops);
      if (debugEl) debugEl.textContent = t.toFixed(2) + 's  loop ' + LB.clock.loops;
    }
    LB.renderNow = function () { render(LB.clock.t); };
    LB.lastFrame = function () { return last; };

    var debugEl = null;
    if (params.has('debug')) {
      debugEl = document.createElement('div');
      debugEl.className = 'lb-debug';
      document.body.appendChild(debugEl);
    }

    if (params.has('t')) {
      LB.clock.pause();
      LB.clock.t = parseFloat(params.get('t')) || 0;
    }
    if (params.has('rate')) LB.clock.rate = parseFloat(params.get('rate')) || 1;

    function loop(now) {
      render(LB.clock.tick(now));
      requestAnimationFrame(loop);
    }
    render(LB.clock.t);
    requestAnimationFrame(loop);
  };

  // window.__lbReady resolves after fonts are loaded and the first frame rendered (used by tools/render.cjs)
  window.__lbReady = new Promise(function (resolve) {
    function go() {
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      var timeout = new Promise(function (r) { setTimeout(r, 2500); });
      Promise.race([fontsReady, timeout]).then(function () {
        LB.boot();
        requestAnimationFrame(function () { resolve(true); });
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  });
})();
