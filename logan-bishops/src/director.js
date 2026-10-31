/* Logan Bishops: director. Owns ALL timing: camera, character poses and faces, scene states, fx and text cards.
 * frame(t) is a pure function of t (seconds into the 6.00 s loop); every number comes from docs/STORYBOARD.md.
 *
 * Limited animation: character poses and expressions change on twos (12 drawings per second, LB.onTwos). Each action's
 * twos grid is anchored at the action's own start time, so key drawings land exactly on the storyboard frame (and on the
 * audio hits) and nothing from the previous shot survives a hard cut. A few fast actions (the drop, the bonk reaction,
 * the steeple snap, the mitre growth) are on ones (24 per second). Camera, glows, fades, star orbits, sparkles, speed
 * lines and card motion run smooth on t.
 */
(function () {
  'use strict';
  var LB = window.LB;
  var D = 6;
  var clamp = LB.clamp, lerp = LB.lerp, prog = LB.prog;
  var E = LB.ease;

  // ================================================================ timing helpers
  // Progress 0..1 of an action drawn as `count` held drawings at `fps` (12 = on twos, 24 = on ones), starting at `a`.
  // The first drawing already moves (k = 1/count) and the last drawing is the end pose, which then holds.
  function drawings(t, a, count, fps, ease) {
    if (t < a) return 0;
    var n = fps === 12 ? Math.round(LB.onTwos(t - a) * 12) + 1 : Math.floor((t - a) * fps + 1e-6) + 1;
    var k = Math.min(1, n / count);
    return (E[ease] || E.linear)(k);
  }
  // Held drawings: the value of the last key at or before t, `def` before the first key. keys: [[t, value], ...] sorted.
  function held(t, keys, def) {
    var v = def;
    for (var i = 0; i < keys.length; i++) {
      if (t + 1e-6 >= keys[i][0]) v = keys[i][1];
      else break;
    }
    return v;
  }
  function inWin(t, a, b) { return t >= a && t < b; }
  // smooth 0..1 fade between a and b
  function fade(t, a, b) { return LB.smoothstep(a, b, t); }

  // ================================================================ camera
  // STORYBOARD "Camera keyframes", with framing fixes for the contract layout (see notes on each shot).
  // Hard cuts are two keys at the same time; the ease on a key shapes the segment that ends at it.
  function C(x, y, zoom, rot) { return { x: x, y: y, zoom: zoom, rot: rot }; }
  var SHOT = {
    photo: C(500, 500, 1, 0),
    push: C(485, 430, 1.15, 0),
    // Dead air: x 500 -> 490 so about HALF the King's face sits on the left edge (left edge x 323; his K_HIDE face centre
    // is about x 313..333). The billboard's lower part stays cropped by the top edge right above the bump.
    deadAir: C(490, 340, 3.0, 0),
    billboard: C(515, 196, 4.6, 3),
    billboardEnd: C(515, 196, 4.8, 3),
    // Lawsuit ECU: y 330 -> 362 so the steepled hands (about y 400) sit ABOVE the lower-third arc card instead of under it.
    lawsuit: C(500, 362, 3.4, -8),
    lawsuitEnd: C(500, 362, 3.55, -8),
    socks: C(716, 915, 3.4, 0),
    // Healer face: y 275 -> 240 (and 250 after the micro push) so the whole normal mitre is in frame when the tilt lands
    // (tip about y 80) and the 1.4x stretched tip (about y 25) clearly leaves the top edge.
    healer: C(690, 240, 2.4, 0),
    healerEnd: C(690, 250, 2.5, 0),
    twoShot: C(612, 330, 1.8, 0),
    twoShotEnd: C(612, 330, 1.86, 0),
    // Case dismissed: (500,340) z2.8 -> (512,382) z3.2. The hanko stamp fills screen x 470..950, y 510..770, so the
    // Friar's face goes in the upper half (chin at screen y 484) and the stamp lands under it, off his face, with the
    // gloom lines above his head. Left edge x 356: the King is a sliver (cheek and crown edge, eyes out of frame);
    // right edge x 668: the Bishop is only a red cape edge.
    dismissed: C(512, 382, 3.2, 0),
  };
  // Reduced motion: crash, snap and fast pull-back zooms are eased over 0.16 s instead of 0.06-0.08 s.
  function cameraKeys(rm) {
    var crashEnd = rm ? 2.18 : 2.10, pullEnd = rm ? 4.18 : 4.10, snapEnd = rm ? 5.02 : 4.92;
    return [
      [0.00, SHOT.photo],
      [0.48, SHOT.photo, 'linear'],                       // hold: the photo
      [1.00, SHOT.push, 'inOutSine'],                     // slow ceremonial push
      [1.09, SHOT.push, 'linear'],                        // held through the impact frame
      [1.09, C(485, 430, 1.15, 2)],                       // impact released: roll kicks with the shake
      [1.20, C(485, 430, 1.15, -1.5), 'outCubic'],
      [1.40, SHOT.push, 'outCubic'],
      [1.40, SHOT.deadAir],                               // CUT: Friar close-up
      [2.02, SHOT.deadAir, 'linear'],
      [crashEnd, SHOT.billboard, rm ? 'inOutSine' : 'outCubic'], // crash zoom on the billboard
      [2.70, SHOT.billboardEnd, 'linear'],
      [2.70, SHOT.lawsuit],                               // CUT: lawsuit ECU
      [3.42, SHOT.lawsuitEnd, 'linear'],
      [3.42, SHOT.socks],                                 // CUT: socks in slides
      [3.56, SHOT.socks, 'linear'],
      [3.80, SHOT.healer, 'inOutCubic'],                  // tilt straight up his body
      [4.02, SHOT.healerEnd, 'linear'],                   // micro push while the mitre outgrows the frame
      [pullEnd, SHOT.twoShot, rm ? 'inOutSine' : 'outCubic'], // fast pull-back to the two-shot
      [4.86, SHOT.twoShotEnd, 'linear'],
      [snapEnd, SHOT.dismissed, rm ? 'inOutSine' : 'snap'], // snap zoom onto the Friar
      [5.46, SHOT.dismissed, 'linear'],
      [5.46, SHOT.photo],                                 // CUT: the photo
      [6.00, SHOT.photo, 'linear'],
    ];
  }
  var camTrack = LB.track(cameraKeys(false));
  var camTrackRM = LB.track(cameraKeys(true));
  var shakeTrack = LB.track([
    [0.00, 0],
    [1.09, 0, 'linear'],
    [1.09, 10],                 // bonk shake, decaying 10 -> 5 -> 0
    [1.20, 5, 'outCubic'],
    [1.40, 0, 'outCubic'],
    [4.92, 0, 'linear'],
    [4.92, 6],                  // hanko stamp shake 6 -> 0
    [5.07, 0, 'outQuad'],
    [6.00, 0, 'linear'],
  ]);
  function camera(t) {
    var c = (LB.reducedMotion ? camTrackRM : camTrack)(t);
    return { x: c.x, y: c.y, zoom: c.zoom, rot: c.rot, shake: shakeTrack(t), shakeFreq: 24, filter: '' };
  }

  // ================================================================ faces
  var FACE = {
    k_deadpan: { eyes: 'deadpan', brows: 'flat', mouth: 'closed', gazeX: 0, gazeY: 0 },
    k_away: { eyes: 'deadpan', brows: 'flat', mouth: 'closed', gazeX: -1, gazeY: -0.15 }, // k_deadpan, gaze away from the Friar
    k_solemn: { eyes: 'closed', brows: 'flat', mouth: 'closed', gazeX: 0, gazeY: 0 },
    k_oops: { eyes: 'dot', brows: 'up', mouth: 'o', gazeX: 0, gazeY: 0 },
    k_whistle: { eyes: 'deadpan', brows: 'up', mouth: 'whistle', gazeX: -1, gazeY: -0.6 },
    f_deadpan: { eyes: 'deadpan', brows: 'flat', mouth: 'closed', gazeX: 0, gazeY: 0 },
    f_scheme: { eyes: 'deadpan', brows: 'down', mouth: 'smirk', gazeX: 0, gazeY: 0 },     // eyes hidden by opaque lenses
    f_smug: { eyes: 'deadpan', brows: 'flat', mouth: 'smirk', gazeX: 0, gazeY: 0 },
    f_disappointed: { eyes: 'droop', brows: 'sad', mouth: 'frown', gazeX: 0, gazeY: 0 },
    b_smolder: { eyes: 'deadpan', brows: 'flat', mouth: 'closed', gazeX: 0, gazeY: 0 },
    b_hero: { eyes: 'hero', brows: 'down', mouth: 'closed', gazeX: 0, gazeY: 0 },
    b_oneUp: { eyes: 'deadpan', brows: 'oneUp', mouth: 'closed', gazeX: 0, gazeY: 0 },
  };
  function applyFace(s, name) {
    var f = FACE[name];
    s.eyes = f.eyes; s.brows = f.brows; s.mouth = f.mouth; s.gazeX = f.gazeX; s.gazeY = f.gazeY;
    return s;
  }
  // Common fields every character gets every frame (complete state, photo defaults).
  function base(face) {
    var s = {
      pose: 'photo', hidden: false, breathe: 0,
      eyes: 'deadpan', brows: 'flat', mouth: 'closed', gazeX: 0, gazeY: 0,
      sweat: 0, blush: 0, silhouette: 0, silhouetteColor: '#000',
    };
    return applyFace(s, face);
  }

  // ================================================================ beat times (seconds)
  var T = {
    glintA: 0.28, glintPeak: 0.38, glintB: 0.48,
    raise: 0.48, bishopTrack: 0.52, bokeh: 0.50,
    drop: 0.95, contact: 0.99, impact: 1.02, impactEnd: 1.09,
    cut2: 1.40, slide: 1.56, cut3: 2.02, crashEnd: 2.10, cut4: 2.70, opaque: 2.74, arcCard: 2.78, smirk: 2.80,
    cut5: 3.42, tilt: 3.56, face5: 3.80, beat6: 4.02, cast: 4.10, heal: 4.38, oneUp: 4.60,
    cut7: 4.86, stamp: 4.92, sad: 4.94, slump: 4.96, gloom: 5.00, cut8: 5.46, flash: 5.54, sweatIn: 5.72,
  };
  var CONTACT = { x: 500, y: 258 };                    // knob on the Friar's crown (STORYBOARD beat 1)
  var FOCUS_BOX = [230, 170, 770, 440];                // screen box around the three faces in the wide shot

  // King ceremonial raise: 5 drawings on twos from 0.48 reach the top at 0.813 (with the last celesta note at 0.84); that
  // 6th drawing is the hover, held 0.14 s over the oblivious Friar before the drop at 0.95.
  function raiseK(t) { return drawings(t, T.raise, 5, 12, 'inOutSine'); }

  // ================================================================ King
  function kingSweat(t) {
    if (t < 0.30) return 1;                                   // the seam tell, still there at 0.00
    if (t < 0.45) return 1 - fade(t, 0.30, 0.45);
    if (inWin(t, T.beat6, T.cut7)) return 1;                  // k_whistle in the two-shot
    if (t >= T.sweatIn) return fade(t, T.sweatIn, 5.84);
    return 0;
  }
  function king(t) {
    var s = base('k_deadpan');
    s.raise = 0; s.drop = 0; s.smear = 0;
    if (t < T.raise) {
      // K_PHOTO + k_deadpan
    } else if (t < T.drop) {
      s.pose = 'raise';
      s.raise = raiseK(t);
      s.headTilt = lerp(8, 2, s.raise);                       // chin up into the ceremony
      applyFace(s, 'k_solemn');
    } else if (t < T.cut2) {
      s.pose = 'bonk';
      s.raise = 1;
      // the drop on ones: a smear drawing mid-fall, then the contact drawing (both with ghost scepters), then held
      s.drop = held(t, [[T.drop, 0.5], [T.contact, 1]], 0);
      s.smear = t < T.impact ? 1 : 0;
      s.headTilt = 2;
      applyFace(s, t < T.impactEnd ? 'k_solemn' : 'k_oops');
    } else if (t < T.beat6) {
      s.pose = 'hide';                                        // scepter "hidden" behind his back, completely still
      applyFace(s, 'k_away');
    } else if (t < T.cut7) {
      s.pose = 'peek';
      s.lean = 15;                                            // face enters the left edge of the two-shot
      applyFace(s, 'k_whistle');
    } else if (t < T.cut8) {
      s.pose = 'hide';
      applyFace(s, 'k_away');
    }
    s.sweat = kingSweat(t);
    return s;
  }

  // ================================================================ Friar
  // Star orbit: speed eases from 1.5 to 0.5 turns/s over 1.09-2.02 (v = 0.5 + (1 - u)^2), then 0.5 turns/s.
  // starSpin is the exact integral of that speed (no accumulation), so any t seeks to the same phase.
  var SPIN_A = T.impactEnd, SPIN_L = T.cut3 - T.impactEnd, SPIN_0 = 0.08;
  function starSpin(t) {
    if (t <= SPIN_A) return SPIN_0;
    var u = Math.min(1, (t - SPIN_A) / SPIN_L);
    var turns = 0.5 * (t - SPIN_A) + SPIN_L * (1 - Math.pow(1 - u, 3)) / 3;
    return SPIN_0 + turns;
  }
  function friar(t) {
    var s = base('f_deadpan');
    s.headSquash = 1; s.glasses = 'clear'; s.glassesTilt = 0;
    s.bump = 0; s.stars = 0; s.starSpin = 0; s.steeple = 0;
    if (t < T.impactEnd || t >= T.cut8) return s;             // F_PHOTO (also through the impact frame)

    if (t < T.heal) {
      // F_BONKED: reaction on ones, then held
      s.headSquash = held(t, [[1.09, 0.86], [1.13, 1.05], [1.18, 1.02], [1.22, 1.0]], 1);
      s.bump = held(t, [[1.09, 0.5], [1.13, 1.1], [1.18, 1.0], [4.30, 0.72]], 0);
      s.glassesTilt = 8;
      s.stars = 1;
      s.starSpin = starSpin(t);
    }
    // Dead air: only the pupils slide toward the billboard, 4 drawings on twos (1.56 .. 1.81), then pinned.
    if (inWin(t, T.slide, T.cut4)) {
      var g = drawings(t, T.slide, 4, 12, 'inOutSine');
      s.gazeX = 0.7 * g; s.gazeY = -1 * g;
    }
    // F_STEEPLE: clasped hands snap up under the beard in 2 drawings on ones.
    if (t >= T.cut4) s.steeple = drawings(t, T.cut4, 2, 24, 'linear');
    if (inWin(t, T.opaque, T.heal)) s.glasses = 'opaque';
    if (inWin(t, T.smirk, T.heal)) applyFace(s, 'f_scheme');
    if (inWin(t, T.heal, T.sad)) applyFace(s, 'f_smug');      // healed, has not realized yet
    if (t >= T.sad) applyFace(s, 'f_disappointed');
    // F_SLUMP: hands sink out of frame, shoulders drop a notch, head dips (5 drawings on twos, 4.96 .. 5.29).
    if (t >= T.slump) {
      var k = drawings(t, T.slump, 5, 12, 'inOutSine');
      s.steeple = 1 - k;
      s.bob = 6 * k;
      s.headTilt = lerp(-2, 1, k);
    }
    return s;
  }

  // ================================================================ Bishop
  var TWITCH = [[0, 1], [0.04, 0.35], [0.08, 0.75], [0.12, 0]]; // mustache boing on ones
  function twitch(t, a) { return t < a ? 0 : held(t - a, TWITCH, 0); }
  function bishop(t) {
    var s = base('b_smolder');
    s.mitreStretch = 1; s.cast = 0; s.castGlow = 0; s.mustacheTwitch = 0;
    if (inWin(t, T.bishopTrack, T.cut2)) {
      // B_TRACK: only the pupils follow the rising knob (5 drawings on twos, 0.04 s behind the King's raise).
      var g = drawings(t, T.bishopTrack, 5, 12, 'inOutSine');
      s.gazeX = -0.6 * g; s.gazeY = -0.9 * g;
      if (t >= T.impactEnd) { s.brows = 'up'; s.gazeY = -0.8; }  // brows lift a hair after the bonk
    }
    if (inWin(t, T.face5, T.beat6)) {
      applyFace(s, 'b_hero');
      s.mustacheTwitch = twitch(t, 3.82);
    }
    if (inWin(t, T.face5, T.cut8)) {
      // B_MITRE_STRETCH: 1.0 -> 1.4 outBack on ones, anchored at the headband; held until the 5.46 cut.
      s.mitreStretch = 1 + 0.4 * drawings(t, T.face5, 6, 24, 'outBack');
    }
    if (inWin(t, T.cast, T.cut7)) {
      // B_CAST: arm out of the cape at shoulder height toward the Friar (2 drawings on twos), green glow ring (smooth).
      s.cast = drawings(t, T.cast, 2, 12, 'linear');
      var glow = 0.8 + 0.1 * Math.sin(2 * Math.PI * 7 * (t - T.cast));
      var flare = Math.exp(-Math.pow((t - 4.36) / 0.06, 2)) * 0.25;   // swells as the heal lands
      s.castGlow = clamp((glow + flare) * fade(t, T.cast, 4.18), 0, 1);
    }
    if (inWin(t, T.oneUp, T.cut7)) {
      applyFace(s, 'b_oneUp');
      s.mustacheTwitch = twitch(t, T.oneUp);
    }
    return s;
  }

  // ================================================================ scene
  var archesTrack = LB.track([
    [0, 1], [4.12, 1, 'linear'], [4.30, 2.2, 'inOutSine'], [4.40, 1.3, 'outQuad'], [5.46, 1.3, 'linear'], [5.46, 1], [6, 1, 'linear'],
  ]);
  function bokehK(t) { return t < T.impactEnd ? fade(t, T.bokeh, 0.70) : 0; }
  function scene(t) {
    var billboard = 1;
    if (inWin(t, T.crashEnd, T.cut4)) {
      billboard = 1.3;
      if (inWin(t, 2.22, 2.22 + 2 / 60) || inWin(t, 2.46, 2.46 + 2 / 60)) billboard = 0.6; // 2-frame flicker dips
    }
    var panel = inWin(t, T.cut4, T.cut5);
    return {
      impact: inWin(t, T.impact, T.impactEnd) ? 1 : 0,
      panel: panel ? 'villain' : null,
      panelK: panel ? 1 : 0,
      bokeh: bokehK(t),
      bokehPop: inWin(t, T.impact, T.impactEnd) ? prog(t, T.impact, 1.07) : 0,
      billboardGlow: billboard,
      archesGlow: archesTrack(t),
    };
  }

  // ================================================================ fx
  // kira glint envelope: 0 -> 1 -> 0 across [a, b] peaking at `peak`
  function glintK(t, a, peak, b) {
    if (t < a || t >= b) return 0;
    var u = t < peak ? (t - a) / (peak - a) : 1 - (t - peak) / (b - peak);
    return Math.sin(u * Math.PI / 2);
  }
  function card(id, t, a, b, fadeOut) {
    if (!inWin(t, a, b)) return null;
    var k = fadeOut ? 1 - prog(t, b - fadeOut, b) : 1;
    return { id: id, age: t - a, k: k };
  }
  function fx(t) {
    var f = {
      glints: [], twinkles: null, impactBurst: null, speedLines: null, puff: null, bishounen: null,
      archesFlare: null, heal: null, notes: null, gloom: null, focus: null, flash: 0, cards: [],
    };
    // 1. kira glints
    if (inWin(t, T.glintA, T.glintB)) {
      f.glints.push({ at: 'king.knob', k: glintK(t, T.glintA, T.glintPeak, T.glintB), rot: 45 * prog(t, T.glintA, T.glintB), size: 50 });
    }
    if (inWin(t, T.opaque, 2.92)) {
      f.glints.push({ at: 'friar.lensR', k: glintK(t, T.opaque, 2.78, 2.92), rot: 45 * prog(t, T.opaque, 2.92), size: 34 });
    }
    if (inWin(t, T.face5, 3.95)) {
      f.glints.push({ at: 'bishop.mustache', k: glintK(t, T.face5, 3.84, 3.95), rot: 45 * prog(t, T.face5, 3.95), size: 30 });
    }
    // 2. shoujo twinkles bloom with the bokeh, all pop out on the impact
    if (inWin(t, T.bokeh, T.impactEnd)) {
      f.twinkles = { k: fade(t, T.bokeh, 0.70), pop: t < T.impact ? 0 : prog(t, T.impact, 1.07) };
    }
    // 4. impact frame starburst from the contact point
    if (inWin(t, T.impact, T.impactEnd)) f.impactBurst = { k: 1, at: CONTACT };
    // 7. speed lines, regenerated on twos
    var seed = Math.floor(t * 12 + 1e-6) + 1;
    if (inWin(t, T.cut3, 2.16)) {
      f.speedLines = { mode: 'radial', k: fade(t, T.cut3, 2.035) * (1 - fade(t, 2.10, 2.16)), seed: seed, at: { x: 515, y: 196 } };
    } else if (inWin(t, T.tilt, T.face5)) {
      f.speedLines = { mode: 'vertical', k: fade(t, T.tilt, 3.59) * (1 - fade(t, 3.74, T.face5)), seed: seed, at: null };
    }
    // 6. pop puff where the bump was
    if (inWin(t, T.heal, 4.50)) f.puff = { p: prog(t, T.heal, 4.50), at: 'friar.bump' };
    // 11. bishounen bubbles drifting up from the slides
    if (inWin(t, T.cut5, 3.75)) {
      f.bishounen = { k: fade(t, T.cut5, 3.46) * (1 - fade(t, 3.64, 3.75)), p: prog(t, T.cut5, 3.75), at: 'bishop.feet' };
    }
    // 15. anamorphic streak across the arches, peaking with archesGlow
    if (inWin(t, 4.12, 4.40)) {
      f.archesFlare = { k: t < 4.30 ? E.inOutSine(prog(t, 4.12, 4.30)) : 1 - E.outQuad(prog(t, 4.30, 4.40)) };
    }
    // 16. green heal sparkles rain onto the bump
    if (inWin(t, 4.20, 4.44)) f.heal = { p: prog(t, 4.20, 4.44), at: 'friar.bump' };
    // 18. the King's guilty whistle
    if (inWin(t, T.cast, T.cut7)) f.notes = { p: prog(t, T.cast, T.cut7), at: 'king.mouth' };
    // 21. gloom lines over the Friar's head
    if (inWin(t, T.gloom, T.cut8)) f.gloom = { k: fade(t, T.gloom, 5.12), at: 'friar.head' };
    // 22. phone focus square snaps onto the faces
    if (inWin(t, T.cut8, 5.68)) f.focus = { k: 1 - fade(t, 5.60, 5.68), p: prog(t, T.cut8, T.flash), box: FOCUS_BOX.slice() };
    // 23. shutter flash: 0.7 for 2 frames at 5.54, gone by 5.66
    if (inWin(t, T.flash, 5.66)) f.flash = t < T.flash + 2 / 60 ? 0.7 : 0.7 * Math.pow(1 - prog(t, T.flash + 2 / 60, 5.66), 2);
    // text cards (one at a time)
    var cards = [
      card('gon', t, T.impact, T.cut2),
      card('arc', t, T.arcCard, T.cut5),
      card('healer', t, T.face5, 4.32),
      card('hp', t, 4.36, T.cut7, 0.08),
      card('stamp', t, T.stamp, T.cut8),
    ];
    for (var i = 0; i < cards.length; i++) if (cards[i]) f.cards.push(cards[i]);
    return f;
  }

  // ================================================================ frame
  function frame(t) {
    // wrap only when out of range: ((t % D) + D) % D would turn 2.70 into 2.6999999 and miss the cut by a frame
    if (!(t >= 0 && t < D)) t = ((t % D) + D) % D;
    if (t >= D) t = 0;
    var k = king(t), f = friar(t), b = bishop(t);
    // impact frame: all three as flat black silhouettes on the red
    if (inWin(t, T.impact, T.impactEnd)) k.silhouette = f.silhouette = b.silhouette = 1;
    // villain panel: only the Friar exists
    if (inWin(t, T.cut4, T.cut5)) k.hidden = b.hidden = true;
    return {
      camera: camera(t),
      scene: scene(t),
      chars: { king: k, friar: f, bishop: b },
      fx: fx(t),
      ui: {},
    };
  }

  LB.register('director', {
    duration: D,
    frame: function (t, ctx) { return frame(t); },
  });
})();
