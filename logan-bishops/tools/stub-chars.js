/* Placeholder characters for testing scene / fx / director before the real rigs exist.
 * Simple flat shapes at the CONTRACT neutral layout, honoring x, y, scale, hidden, silhouette, a few pose fields,
 * and returning every contract anchor. Load it with tools/harness.cjs --extra (never ship it). */
(function () {
  'use strict';
  var LB = window.LB;
  function rig(layer, stage, build, anchors) {
    var root = LB.g(layer, { opacity: 0.85 });
    var parts = build(root);
    var last = {};
    return {
      root: root,
      update: function (s) {
        last = s;
        LB.show(root, !s.hidden);
        var x = s.x != null ? s.x : parts.x, y = s.y != null ? s.y : 950;
        root.setAttribute('transform', 'translate(' + (x - parts.x) + ' ' + (y - 950) + ')');
        LB.silhouette(root, (s.silhouette || 0) > 0.5, s.silhouetteColor);
        if (parts.update) parts.update(s);
      },
      anchor: function (name) {
        var a = (anchors(last)[name]) || anchors(last).head;
        var dx = (last.x != null ? last.x : parts.x) - parts.x, dy = (last.y != null ? last.y : 950) - 950;
        return { x: a.x + dx, y: a.y + dy };
      },
    };
  }
  function knobPos(s) {
    if (s.pose === 'bonk') return { x: 500, y: LB.lerp(222, 258, s.drop || 0) };
    if (s.pose === 'raise') { var k = s.raise || 0; return { x: LB.lerp(462, 500, k), y: LB.lerp(470, 222, k) }; }
    if (s.pose === 'hide' || s.pose === 'peek') return { x: 372, y: 330 };
    return { x: 462, y: 470 };
  }
  LB.register('king', { create: function (layer, stage) {
    return rig(layer, stage, function (g) {
      LB.el('rect', { x: 180, y: 410, width: 240, height: 540, rx: 40, fill: '#b3141c' }, g);
      LB.el('circle', { cx: 310, cy: 358, r: 57, fill: '#f2c9ae' }, g);
      LB.el('rect', { x: 268, y: 262, width: 80, height: 40, fill: '#a0121a', stroke: '#e3b23c', 'stroke-width': 6 }, g);
      var sc = LB.el('line', { x1: 130, y1: 952, x2: 462, y2: 470, stroke: '#141414', 'stroke-width': 10 }, g);
      var kn = LB.el('circle', { cx: 462, cy: 470, r: 14, fill: '#e8b530' }, g);
      LB.el('text', { x: 300, y: 700, 'text-anchor': 'middle', 'font-size': 40, fill: '#fff', text: 'KING' }, g);
      return { x: 300, update: function (s) {
        var k = knobPos(s);
        kn.setAttribute('cx', k.x); kn.setAttribute('cy', k.y);
        sc.setAttribute('x2', k.x); sc.setAttribute('y2', k.y);
      } };
    }, function (s) {
      return { head: { x: 310, y: 358 }, knob: knobPos(s), crown: { x: 300, y: 262 }, mouth: { x: 312, y: 395 }, temple: { x: 352, y: 340 } };
    });
  } });
  LB.register('friar', { create: function (layer, stage) {
    return rig(layer, stage, function (g) {
      LB.el('rect', { x: 405, y: 372, width: 195, height: 578, rx: 50, fill: '#c9a27e' }, g);
      LB.el('circle', { cx: 500, cy: 320, r: 58, fill: '#f2c9ae' }, g);
      LB.el('rect', { x: 465, y: 310, width: 70, height: 20, fill: 'none', stroke: '#333', 'stroke-width': 4 }, g);
      var bump = LB.el('circle', { cx: 500, cy: 254, r: 18, fill: '#f2c9ae', stroke: '#333', 'stroke-width': 3 }, g);
      LB.el('text', { x: 500, y: 700, 'text-anchor': 'middle', 'font-size': 40, fill: '#fff', text: 'FRIAR' }, g);
      return { x: 500, update: function (s) { bump.setAttribute('r', 18 * (s.bump || 0)); } };
    }, function (s) {
      return { head: { x: 500, y: 320 }, bump: { x: 500, y: (s.bump || 0) > 0.05 ? 236 : 262 }, glasses: { x: 500, y: 320 }, lensR: { x: 538, y: 312 }, hands: { x: 500, y: LB.lerp(640, 400, s.steeple || 0) } };
    });
  } });
  LB.register('bishop', { create: function (layer, stage) {
    return rig(layer, stage, function (g) {
      LB.el('rect', { x: 590, y: 330, width: 260, height: 620, rx: 40, fill: '#c8161e' }, g);
      LB.el('circle', { cx: 718, cy: 265, r: 59, fill: '#f2c9ae' }, g);
      var mitre = LB.el('path', { d: 'M668 225 L718 80 L768 225 Z', fill: '#f3eedc', stroke: '#d4a84a', 'stroke-width': 6 }, g);
      LB.el('rect', { x: 690, y: 935, width: 60, height: 15, fill: '#23304a' }, g);
      LB.el('text', { x: 718, y: 700, 'text-anchor': 'middle', 'font-size': 40, fill: '#fff', text: 'BISHOP' }, g);
      return { x: 718, update: function (s) {
        var m = s.mitreStretch || 1;
        mitre.setAttribute('d', 'M668 225 L718 ' + (225 - 145 * m) + ' L768 225 Z');
      } };
    }, function (s) {
      var c = s.cast || 0;
      return { head: { x: 718, y: 265 }, feet: { x: 718, y: 950 }, hand: { x: LB.lerp(620, 565, c), y: LB.lerp(600, 370, c) }, mustache: { x: 718, y: 292 }, mitreTop: { x: 718, y: 225 - 145 * (s.mitreStretch || 1) } };
    });
  } });
})();
