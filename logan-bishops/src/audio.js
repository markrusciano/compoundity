/* Logan Bishops: sound design. The STORYBOARD "Audio cue sheet", synthesized with WebAudio only (oscillators, a seeded
 * noise buffer, biquad filters, tanh wave shaping and gain envelopes). No samples, no external assets.
 *
 * API (CONTRACT "Audio"):  LB.register('audio', { init(ctx), update(t, loops), setMuted(bool), isMuted() })
 *   extras: renderLoop(sampleRate[, { only: [cueIds], level }]) -> Promise<AudioBuffer>: one 6 s loop rendered offline
 *           through the same cue code and master chain (QA); cueSheet() -> [{ id, t, dur, level }];
 *           _debug.log(true|false) / _debug.state() (QA scheduling log and live state).
 *
 * - Muted by default. No AudioContext exists until setMuted(false) is called from a user gesture (iOS Safari rule):
 *   the context is created (or resumed) and unlocked right there. Muting fades the master out in about 40 ms, cancels
 *   every pending source and, 0.4 s later, suspends the context (battery); the next unmute resumes it.
 * - Look-ahead scheduler: every frame update(t, loops) maps the absolute loop position P = loops * D + t onto the
 *   AudioContext clock and schedules each cue whose loop time falls in the next LOOKAHEAD (0.2) seconds. Cues are keyed
 *   by their absolute position and the scheduled range only moves forward, so nothing is scheduled twice; the wrap at
 *   LB.D is just the next loop index. Seeks, pauses, stalls and tab switches are detected (the loop clock and the audio
 *   clock disagree) and restart the mapping cleanly; small drift is followed smoothly. Nothing is scheduled while
 *   LB.clock.paused (sounding cues are faded out), or while LB.clock.rate is not 1 (QA slow motion is silent).
 * - Unmuting mid-loop starts with the cues after the current time. A sustained cue already in progress (drone, buzz,
 *   whistles, heal charge, deflate) starts partway with a 30 ms fade-in when the context has been running long enough
 *   for its own timeline to be valid; on the very first unmute it is skipped.
 * - A/V sync: cues land on their storyboard time at the limiter output (its fixed 6 ms look-ahead is compensated) and
 *   any reported output latency beyond about one display frame is scheduled early.
 * - Master chain: master gain -> DynamicsCompressor (gentle limiter, about +3 dB makeup) -> destination.
 * - Silence: nothing sounds from the end of the shutter's second click (5.62) through the seam to the knob ting at
 *   0.38: no room tone, no running sources, exact digital zero, so there is nothing to click at the seam.
 */
(function () {
  'use strict';
  var LB = window.LB;

  // ---------------------------------------------------------------- tuning
  var LOOKAHEAD = 0.2;     // seconds of loop time scheduled ahead of the clock
  var LEVEL = 1.0;         // master gain into the limiter (hits peak about -1.5 dBFS, quiet cues lifted for phones)
  var PRE = 0.006;         // DynamicsCompressor look-ahead delay (Chromium and WebKit); cues are scheduled this early
  var MUSIC_CUT = 1.02;    // BONK: every music voice hard-stops here
  var DISPLAY_LAT = 0.025; // rough rAF-to-glass latency; audio output latency beyond this is scheduled early
  var DRIFT_SOFT = 0.045;  // audio clock vs loop clock disagreement that re-anchors the mapping
  var DRIFT_HARD = 0.3;    // ... that counts as a jump (seek, stall, tab switch): restart cleanly
  var LATE_OK = 0.03;      // a cue at most this late still plays (shifted to now); later ones are skipped
  // peak levels per cue class (before the master gain)
  var LV = { vlow: 0.05, low: 0.12, med: 0.24, high: 0.45 };

  // ---------------------------------------------------------------- notes
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) { // 'C5', 'F#6', 'Eb2'
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    var s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (12 * (parseInt(m[3], 10) + 1) + s - 69) / 12);
  }

  // ---------------------------------------------------------------- per-context shared buffers
  function noiseBuffer(ac) {
    if (ac.__lbNoise) return ac.__lbNoise;
    var len = Math.round(ac.sampleRate), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    var r = LB.rng(0x5eed1);
    for (var i = 0; i < len; i++) d[i] = r() * 2 - 1;
    return (ac.__lbNoise = b);
  }
  function satCurve(ac) {
    if (ac.__lbSat) return ac.__lbSat;
    var n = 1024, c = new Float32Array(n), k = 2.2, norm = Math.tanh(k);
    for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
    return (ac.__lbSat = c);
  }

  // ---------------------------------------------------------------- envelope helpers (AudioParam)
  // percussive: 0 -> peak in atk, exponential decay to -60 dB over dec, then exactly 0. Returns the end time.
  function perc(p, t0, peak, atk, dec) {
    p.setValueAtTime(0, t0);
    p.linearRampToValueAtTime(peak, t0 + atk);
    p.exponentialRampToValueAtTime(peak * 0.001, t0 + atk + dec);
    p.linearRampToValueAtTime(0, t0 + atk + dec + 0.003);
    return t0 + atk + dec + 0.004;
  }
  // piecewise linear: pts = [[t, v], ...] (absolute times), starting from the first value
  function shape(p, pts) {
    p.setValueAtTime(pts[0][1], pts[0][0]);
    for (var i = 1; i < pts.length; i++) p.linearRampToValueAtTime(pts[i][1], pts[i][0]);
  }
  function holdAt(p, now) {
    if (p.cancelAndHoldAtTime) { p.cancelAndHoldAtTime(now); return; }
    var v = p.value;
    p.cancelScheduledValues(now);
    p.setValueAtTime(v, now);
  }

  // ---------------------------------------------------------------- voices
  // One Voice per scheduled cue occurrence. Every node it makes ends in v.out (a gain), so the scheduler can fade or
  // cancel the whole cue, and every source it starts is listed in v.srcs so it can be stopped.
  function Voice(ac, dest, cue, T, base, A) {
    this.ac = ac; this.cue = cue; this.T = T; this.base = base; this.A = A;
    this.srcs = [];
    this.hardStop = Infinity;
    this.out = ac.createGain();
    this.out.connect(dest);
    this.start = T;
    this.end = T + cue.dur + 0.1;
  }
  Voice.prototype.gain = function (dest, v) {
    var g = this.ac.createGain();
    g.gain.value = v == null ? 0 : v;
    g.connect(dest || this.out);
    return g;
  };
  Voice.prototype.osc = function (type, f, t0, t1, dest) {
    var o = this.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    o.start(t0);
    o.stop(Math.min(t1, this.hardStop));
    if (dest) o.connect(dest);
    this.srcs.push(o);
    return o;
  };
  Voice.prototype.noise = function (t0, t1, dest) {
    var s = this.ac.createBufferSource();
    s.buffer = noiseBuffer(this.ac);
    s.loop = true;
    // a different stretch of the noise buffer per cue keeps hits from sounding identical
    s.start(t0, (this.cue.seed * 0.137) % 0.9);
    s.stop(Math.min(t1, this.hardStop));
    if (dest) s.connect(dest);
    this.srcs.push(s);
    return s;
  };
  Voice.prototype.filter = function (type, f, q, dest) {
    var b = this.ac.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q == null ? 0.707 : q;
    if (dest) b.connect(dest);
    return b;
  };
  Voice.prototype.pan = function (x) {
    if (!this.ac.createStereoPanner) return this.out;
    var p = this.ac.createStereoPanner();
    p.pan.value = x;
    p.connect(this.out);
    return p;
  };
  // soft saturation (tanh) so low thuds grow harmonics that phone speakers can actually reproduce
  Voice.prototype.sat = function (outLevel, dest) {
    var w = this.ac.createWaveShaper();
    w.curve = satCurve(this.ac);
    w.connect(this.gain(dest, outLevel));
    return w;
  };
  // sine LFO into an AudioParam (detune in cents, or a gain); depth may be a number or [[t, depth], ...]
  Voice.prototype.lfo = function (rate, depth, param, t0, t1) {
    var o = this.osc('sine', rate, t0, t1);
    var g = this.ac.createGain();
    if (typeof depth === 'number') g.gain.value = depth; else shape(g.gain, depth);
    o.connect(g);
    g.connect(param);
    return o;
  };

  // ---------------------------------------------------------------- the cue sheet
  // Each cue: id, loop time t (onset), dur (how long it can sound), play(v, T) with T = AudioContext time of the onset.
  // music: true -> hard-stopped at the BONK. sustain: true -> may start partway when sound is switched on mid-cue.
  var CUES = [];
  function cue(id, t, dur, level, play, opt) {
    CUES.push({ id: id, t: t, dur: dur, level: level, play: play, seed: CUES.length + 1,
      music: !!(opt && opt.music), sustain: !!(opt && opt.sustain) });
  }

  // 0.38 knob ting: sine 2.6 kHz, 120 ms exponential decay (plus a faint inharmonic glint partial)
  cue('ting', 0.38, 0.13, 'low', function (v, T) {
    var out = v.pan(-0.08), g = v.gain(out);
    perc(g.gain, T, LV.low, 0.001, 0.12);
    v.osc('sine', 2600, T, T + 0.13, g);
    var g2 = v.gain(out);
    perc(g2.gain, T, LV.low * 0.18, 0.001, 0.045);
    v.osc('sine', 2600 * 2.76, T, T + 0.05, g2);
  });

  // 0.48-0.95 ceremony celesta: triangle plus a sine partial at 2x, C5 E5 G5 B5, 400 ms decay each
  ['C5', 'E5', 'G5', 'B5'].forEach(function (n, i) {
    cue('celesta-' + n, 0.48 + 0.12 * i, 0.41, 'med', function (v, T) {
      var f = hz(n), out = v.pan(-0.12 + 0.08 * i);
      var g = v.gain(out);
      perc(g.gain, T, LV.med * 0.62, 0.002, 0.4);
      v.osc('triangle', f, T, T + 0.41, g);
      var g2 = v.gain(out);
      perc(g2.gain, T, LV.med * 0.24, 0.001, 0.24);
      v.osc('sine', 2 * f, T, T + 0.25, g2);
    }, { music: true });
  });

  // 0.62-0.95 harp gliss: 16 short sine plucks rising two octaves (C lydian, B4 to C7), sweeping left to right
  var HARP = ['B4', 'C5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C7'];
  cue('harp', 0.62, 0.42, 'low', function (v, T) {
    var out = v.out;
    if (v.ac.createStereoPanner) {
      out = v.ac.createStereoPanner();
      out.connect(v.out);
      shape(out.pan, [[T, -0.35], [T + 0.3, 0.35]]);
    }
    HARP.forEach(function (n, i) {
      var t0 = T + 0.02 * i, g = v.gain(out);
      perc(g.gain, t0, LV.low * (0.45 + 0.3 * i / 15), 0.002, 0.16);
      v.osc('sine', hz(n), t0, t0 + 0.17, g);
    });
  }, { music: true });

  // 1.02 BONK: sine 900 -> 120 Hz in 90 ms + band-passed noise click (15 ms) + sine 80 Hz thud (120 ms)
  cue('bonk', 1.02, 0.16, 'high', function (v, T) {
    var g = v.gain();
    perc(g.gain, T, LV.high * 0.95, 0.001, 0.11);
    var o = v.osc('sine', 900, T, T + 0.12, g);
    o.frequency.exponentialRampToValueAtTime(120, T + 0.09);
    var gn = v.gain();
    perc(gn.gain, T, LV.high * 1.6, 0.0005, 0.015);
    v.noise(T, T + 0.02, v.filter('bandpass', 2400, 1.2, gn));
    var gt = v.gain(v.sat(LV.high * 0.8));
    perc(gt.gain, T, 2.2, 0.002, 0.12);
    v.osc('sine', 80, T, T + 0.13, gt);
  });

  // 1.09-2.02 star chirps: sine 3.2 kHz, 30 ms blips, spacing 0.18 widening to 0.30 s, alternating sides of the orbit
  [1.09, 1.27, 1.51, 1.81].forEach(function (t, i) {
    cue('chirp-' + (i + 1), t, 0.04, 'vlow', function (v, T) {
      var g = v.gain(v.pan(i % 2 ? 0.45 : -0.45));
      perc(g.gain, T, LV.vlow * 1.6 * (1 - 0.12 * i), 0.002, 0.028);
      var o = v.osc('sine', 3050, T, T + 0.035, g);
      o.frequency.linearRampToValueAtTime(3350, T + 0.03);
    });
  });

  // 2.02 whoosh: white noise through a band-pass sweeping 400 Hz -> 4 kHz over 80 ms
  cue('whoosh', 2.02, 0.09, 'med', function (v, T) {
    var g = v.gain();
    shape(g.gain, [[T, 0], [T + 0.012, LV.med * 2.4], [T + 0.065, LV.med * 2.4], [T + 0.085, 0]]);
    var bp = v.filter('bandpass', 400, 1.6, g);
    bp.frequency.setValueAtTime(400, T);
    bp.frequency.exponentialRampToValueAtTime(4000, T + 0.08);
    v.noise(T, T + 0.09, bp);
  });

  // 2.10 billboard sting: sawtooth chord D4 A4 D5 with a low-pass envelope (400 ms) + taiko boom
  cue('sting', 2.10, 0.45, 'high', function (v, T) {
    var g = v.gain();
    shape(g.gain, [[T, 0], [T + 0.006, LV.high * 0.24]]);
    g.gain.exponentialRampToValueAtTime(LV.high * 0.24 * 0.05, T + 0.38);
    g.gain.linearRampToValueAtTime(0, T + 0.42);
    var lp = v.filter('lowpass', 500, 3, g);
    lp.frequency.setValueAtTime(500, T);
    lp.frequency.exponentialRampToValueAtTime(3800, T + 0.025);
    lp.frequency.exponentialRampToValueAtTime(380, T + 0.4);
    ['D4', 'A4', 'D5'].forEach(function (n) {
      [-7, 7].forEach(function (c) {
        var o = v.osc('sawtooth', hz(n), T, T + 0.43, lp);
        o.detune.value = c;
      });
    });
    // taiko: sine 140 -> 50 Hz over 300 ms + a noise burst for the skin
    var gb = v.gain(v.sat(LV.high * 0.72));
    perc(gb.gain, T, 1.8, 0.002, 0.33);
    var b = v.osc('sine', 140, T, T + 0.34, gb);
    b.frequency.exponentialRampToValueAtTime(50, T + 0.3);
    var gn = v.gain();
    perc(gn.gain, T, LV.high * 0.9, 0.001, 0.05);
    v.noise(T, T + 0.06, v.filter('lowpass', 1400, 0.8, gn));
  });

  // 2.10-2.70 neon buzz: 120 Hz square, low-passed, gated off for 2 frames at 2.22 and 2.46
  cue('buzz', 2.10, 0.6, 'vlow', function (v, T) {
    var g = v.gain(), a = LV.vlow * 0.38, p = g.gain;
    shape(p, [[T, 0], [T + 0.03, a]]);
    [0.12, 0.36].forEach(function (d) {
      p.setValueAtTime(a, T + d);
      p.linearRampToValueAtTime(0, T + d + 0.003);
      p.setValueAtTime(0, T + d + 2 / 60);
      p.linearRampToValueAtTime(a, T + d + 2 / 60 + 0.003);
    });
    p.setValueAtTime(a, T + 0.594);
    p.linearRampToValueAtTime(0, T + 0.6);
    v.osc('square', 120, T, T + 0.602, v.filter('lowpass', 900, 1.2, g));
  }, { sustain: true });

  // 2.74 glint kiiin: sine sweep 1.2 -> 3 kHz, 250 ms (from the screen-right lens)
  cue('kiiin', 2.74, 0.26, 'med', function (v, T) {
    var out = v.pan(0.25), g = v.gain(out), a = LV.med * 0.7;
    shape(g.gain, [[T, 0], [T + 0.004, a], [T + 0.12, a * 0.8]]);
    g.gain.exponentialRampToValueAtTime(a * 0.001, T + 0.25);
    g.gain.linearRampToValueAtTime(0, T + 0.252);
    var o = v.osc('sine', 1200, T, T + 0.255, g);
    o.frequency.exponentialRampToValueAtTime(3000, T + 0.25);
    var g2 = v.gain(out);
    perc(g2.gain, T, a * 0.25, 0.004, 0.2);
    var o2 = v.osc('sine', 2412, T, T + 0.21, g2);
    o2.frequency.exponentialRampToValueAtTime(6030, T + 0.25);
  });

  // 2.78 card slam: sine 60 Hz thud (200 ms) + metallic hit (two detuned squares at 1.1 and 1.6 kHz, 60 ms).
  // Phone speakers drop everything under about 450 Hz: the thud starts higher and a 2.4 kHz click carries the hit.
  cue('slam', 2.78, 0.21, 'high', function (v, T) {
    var gt = v.gain(v.sat(LV.high * 0.8));
    perc(gt.gain, T, 2.4, 0.002, 0.2);
    var o = v.osc('sine', 160, T, T + 0.21, gt);
    o.frequency.exponentialRampToValueAtTime(60, T + 0.05);
    var gn = v.gain();
    perc(gn.gain, T, LV.high * 1.4, 0.0005, 0.025);
    v.noise(T, T + 0.03, v.filter('bandpass', 2400, 1.2, gn));
    var gm = v.gain();
    perc(gm.gain, T, LV.high * 0.6, 0.0008, 0.06);
    var hp = v.filter('highpass', 700, 0.7, gm);
    v.osc('square', 1100, T, T + 0.065, hp).detune.value = -12;
    v.osc('square', 1600, T, T + 0.065, hp).detune.value = 12;
  });

  // 2.80-3.42 villain drone: two sawtooths at D2 and Eb2, low-passed (the sheet's 400 Hz, opened up for phones), fading out by 3.42
  var DRONE_PRE = 2.5, DRONE_SAT = 1.1; // drive into the tanh shaper, and its output level
  cue('drone', 2.80, 0.62, 'med', function (v, T) {
    // the fundamentals are trimmed (high-pass 160 Hz) and the low-pass opened and saturated, so the D / Eb beating lives
    // in harmonics phone speakers can play (at 400 Hz the whole drone vanished on a phone)
    var g = v.gain(v.filter('highpass', 160, 0.6, v.out)), a = LV.med * 0.5;
    shape(g.gain, [[T, 0], [T + 0.08, a], [T + 0.42, a], [T + 0.615, 0]]);
    [['D2', 'A3', -0.35], ['Eb2', 'Bb3', 0.35]].forEach(function (d) {
      var lp = v.filter('lowpass', 900, 2.2);
      var pan = v.ac.createStereoPanner ? v.ac.createStereoPanner() : null;
      var sat = v.sat(DRONE_SAT, pan || g);
      if (pan) { pan.pan.value = d[2]; pan.connect(g); }
      lp.connect(sat);
      shape(lp.frequency, [[T, 900], [T + 0.32, 1400], [T + 0.62, 1000]]);
      v.osc('sawtooth', hz(d[0]), T, T + 0.62, v.gain(lp, DRONE_PRE));
      v.osc('sawtooth', hz(d[1]), T, T + 0.62, v.gain(lp, DRONE_PRE * 0.5)); // A3 / Bb3 (a 12th up), 6 dB down
    });
  }, { sustain: true });

  // 3.42 slide flop: low-passed noise, 60 ms
  cue('flop', 3.42, 0.07, 'low', function (v, T) {
    var g = v.gain();
    perc(g.gain, T, LV.low * 4, 0.002, 0.058);
    v.noise(T, T + 0.065, v.filter('lowpass', 650, 1.4, g));
  });

  // 3.44-3.56 bubble shimmer: 5 high sine blips (E6 G6 A6 B6 D7), 25 ms apart, each a tiny upward "bloop"
  ['E6', 'G6', 'A6', 'B6', 'D7'].forEach(function (n, i) {
    cue('bubble-' + n, 3.44 + 0.025 * i, 0.07, 'low', function (v, T) {
      var f = hz(n), g = v.gain(v.pan([0.15, -0.2, 0.25, -0.1, 0.05][i]));
      perc(g.gain, T, LV.low * 0.55, 0.002, 0.06);
      var o = v.osc('sine', f * 0.78, T, T + 0.07, g);
      o.frequency.exponentialRampToValueAtTime(f, T + 0.018);
    });
  });

  // 3.62-3.80 slide whistle: sine 300 -> 1200 Hz with light vibrato (plus a breath of noise on the pitch). It starts with
  // the tilt (the socks shot holds to 3.62) and still tops out as the camera lands on his face at 3.80.
  cue('slideWhistle', 3.62, 0.19, 'med', function (v, T) {
    var g = v.gain(), a = LV.med * 0.6;
    shape(g.gain, [[T, 0], [T + 0.02, a], [T + 0.165, a], [T + 0.18, 0]]);
    var o = v.osc('sine', 300, T, T + 0.185, g);
    o.frequency.exponentialRampToValueAtTime(1200, T + 0.18);
    v.lfo(7, 22, o.detune, T, T + 0.185);
    var gb = v.gain();
    shape(gb.gain, [[T, 0], [T + 0.02, a * 0.5], [T + 0.165, a * 0.5], [T + 0.18, 0]]);
    var bp = v.filter('bandpass', 300, 9, gb);
    bp.frequency.setValueAtTime(300, T);
    bp.frequency.exponentialRampToValueAtTime(1200, T + 0.18);
    v.noise(T, T + 0.185, bp);
  }, { sustain: true });

  // 3.82 mustache boing: sine 220 Hz with a 30 Hz pitch wobble (180 ms)
  cue('boing', 3.82, 0.19, 'med', function (v, T) {
    var g = v.gain(v.sat(LV.med * 1.1)); // loud enough to survive a phone speaker (was 10 dB under the bonk there)
    perc(g.gain, T, 2.0, 0.002, 0.18);
    var o = v.osc('sine', 220, T, T + 0.19, g);
    v.lfo(30, [[T, 420], [T + 0.18, 40]], o.detune, T, T + 0.19);
  });
  // 3.82 sparkle shing: high noise burst + sine 4 kHz (150 ms)
  cue('shing', 3.82, 0.16, 'med', function (v, T) {
    var out = v.pan(0.1), gn = v.gain(out);
    perc(gn.gain, T, LV.med * 1.1, 0.001, 0.12);
    v.noise(T, T + 0.13, v.filter('highpass', 7000, 0.7, gn));
    var g = v.gain(out);
    perc(g.gain, T, LV.med * 0.4, 0.001, 0.15);
    v.osc('sine', 4000, T, T + 0.16, g);
  });

  // 4.10-4.36 heal charge: three detuned sines sweeping up an octave (E4 -> E5) with a quickening tremolo
  cue('healCharge', 4.10, 0.27, 'med', function (v, T) {
    var out = v.pan(0.3), g = v.gain(out), a = LV.med * 0.6;
    shape(g.gain, [[T, 0], [T + 0.02, a * 0.45], [T + 0.24, a], [T + 0.262, 0]]);
    var trem = v.gain(g, 0.65);
    var l = v.lfo(12, 0.35, trem.gain, T, T + 0.265);
    l.frequency.linearRampToValueAtTime(22, T + 0.26);
    [-9, 0, 9].forEach(function (c) {
      var o = v.osc('sine', hz('E4'), T, T + 0.265, trem);
      o.detune.value = c;
      o.frequency.exponentialRampToValueAtTime(hz('E5'), T + 0.26);
    });
  }, { sustain: true });

  // 4.10-4.86 the King's nervous whistle: sine with vibrato, B5 (0.25 s), G5 (0.15 s), B5 sliding up (0.30 s)
  cue('kingWhistle', 4.10, 0.72, 'vlow', function (v, T) {
    var out = v.pan(-0.45), g = v.gain(out), a = LV.vlow * 1.4, p = g.gain;
    shape(p, [[T, 0], [T + 0.03, a], [T + 0.235, a], [T + 0.25, a * 0.3], [T + 0.265, a],
      [T + 0.385, a], [T + 0.4, a * 0.3], [T + 0.415, a], [T + 0.62, a], [T + 0.7, 0]]);
    var o = v.osc('sine', hz('B5'), T, T + 0.71, g), f = o.frequency;
    f.setValueAtTime(hz('B5'), T + 0.24);
    f.exponentialRampToValueAtTime(hz('G5'), T + 0.255);
    f.setValueAtTime(hz('G5'), T + 0.39);
    f.exponentialRampToValueAtTime(hz('B5'), T + 0.405);
    f.exponentialRampToValueAtTime(hz('D6'), T + 0.7);
    v.lfo(5.5, 28, o.detune, T, T + 0.71);
    // breath: a whisper of noise band-passed on the pitch
    var gb = v.gain(out);
    shape(gb.gain, [[T, 0], [T + 0.03, a * 0.7], [T + 0.62, a * 0.7], [T + 0.7, 0]]);
    var bp = v.filter('bandpass', hz('B5'), 14, gb);
    bp.frequency.setValueAtTime(hz('B5'), T + 0.24);
    bp.frequency.exponentialRampToValueAtTime(hz('G5'), T + 0.255);
    bp.frequency.setValueAtTime(hz('G5'), T + 0.39);
    bp.frequency.exponentialRampToValueAtTime(hz('B5'), T + 0.405);
    bp.frequency.exponentialRampToValueAtTime(hz('D6'), T + 0.7);
    v.noise(T, T + 0.71, bp);
  }, { sustain: true });

  // 4.36 heal arpeggio: square wave, 45 ms per note, E5 B5 F#6 C#7 G#7 (a stack of fifths), plus one soft echo
  cue('healArp', 4.36, 0.4, 'med', function (v, T) {
    var lp = v.filter('lowpass', 7000, 0.7, v.out);
    ['E5', 'B5', 'F#6', 'C#7', 'G#7'].forEach(function (n, i) {
      [[0, 1, lp], [0.12, 0.3, null]].forEach(function (e) {
        var t0 = T + e[0] + 0.045 * i, a = LV.med * 0.42 * e[1];
        var dest = e[2];
        if (!dest) { dest = v.filter('lowpass', 5000, 0.7, v.pan(0.4)); }
        var g = v.gain(dest);
        shape(g.gain, [[t0, 0], [t0 + 0.002, a], [t0 + 0.04, a * 0.7], [t0 + 0.045, 0]]);
        v.osc('square', hz(n), t0, t0 + 0.046, g);
      });
    });
  });

  // 4.38 bump puff: low-passed noise burst, 80 ms
  cue('puff', 4.38, 0.09, 'low', function (v, T) {
    var g = v.gain();
    perc(g.gain, T, LV.low * 3.2, 0.004, 0.076);
    var lp = v.filter('lowpass', 1300, 0.9, g);
    lp.frequency.setValueAtTime(1300, T);
    lp.frequency.exponentialRampToValueAtTime(380, T + 0.08);
    v.noise(T, T + 0.085, lp);
  });

  // 4.98 hanko stamp: sine 100 -> 50 Hz (150 ms) + a 30 ms noise hit, on the stamp's visible contact (fx lands it 4.98)
  // (the thud starts higher and the hit sits at 1.2 kHz so the stamp still lands on a phone speaker)
  cue('stamp', 4.98, 0.16, 'high', function (v, T) {
    var gt = v.gain(v.sat(LV.high * 0.95));
    perc(gt.gain, T, 2.6, 0.0015, 0.15);
    var o = v.osc('sine', 180, T, T + 0.16, gt);
    o.frequency.exponentialRampToValueAtTime(55, T + 0.15);
    var gn = v.gain();
    perc(gn.gain, T, LV.high * 3.2, 0.0005, 0.05);
    v.noise(T, T + 0.055, v.filter('bandpass', 1200, 0.9, gn));
  });
  // 5.03 one wood-block gavel knock: sine 900 Hz, 40 ms
  cue('gavel', 5.03, 0.05, 'high', function (v, T) {
    var g = v.gain();
    perc(g.gain, T, LV.high * 0.75, 0.0005, 0.04);
    var o = v.osc('sine', 960, T, T + 0.045, g);
    o.frequency.exponentialRampToValueAtTime(880, T + 0.04);
    var g2 = v.gain();
    perc(g2.gain, T, LV.high * 0.2, 0.0005, 0.015);
    v.osc('sine', 900 * 2.32, T, T + 0.02, g2);
  });

  // 5.04-5.44 deflate: sine 600 -> 180 Hz slide with a 6 Hz wobble (sad, droopy). It starts with his face falling (5.04)
  // and is gone just before the 5.46 hard cut to the photo.
  cue('deflate', 5.04, 0.41, 'low', function (v, T) {
    var g = v.gain(), a = LV.low * 0.65;
    shape(g.gain, [[T, 0], [T + 0.03, a], [T + 0.33, a * 0.85], [T + 0.40, 0]]);
    var wob = v.gain(g, 0.8);
    v.lfo(6, 0.2, wob.gain, T, T + 0.405);
    var o = v.osc('sine', 600, T, T + 0.405, wob);
    o.frequency.exponentialRampToValueAtTime(180, T + 0.40);
    v.lfo(6, 45, o.detune, T, T + 0.405);
    var o2 = v.osc('triangle', 600, T, T + 0.405, v.gain(wob, 0.35));
    o2.frequency.exponentialRampToValueAtTime(180, T + 0.40);
  }, { sustain: true });

  // 5.54 shutter ka-chak: two band-passed noise clicks 60 ms apart (2 kHz and 3.5 kHz centers)
  cue('shutter', 5.54, 0.085, 'med', function (v, T) {
    [[0, 2000, 1], [0.06, 3500, 0.8]].forEach(function (c) {
      var g = v.gain();
      perc(g.gain, T + c[0], LV.med * 3.2 * c[2], 0.0005, 0.018);
      v.noise(T + c[0], T + c[0] + 0.025, v.filter('bandpass', c[1], 2.2, g));
    });
  });

  CUES.sort(function (a, b) { return a.t - b.t; });

  // ---------------------------------------------------------------- master chain
  function buildChain(ac, level) {
    var master = ac.createGain();
    master.gain.value = level;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 6;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    master.connect(comp);
    comp.connect(ac.destination);
    return { master: master, comp: comp };
  }

  function playCue(ac, dest, c, T, base, A, partial, now) {
    var v = new Voice(ac, dest, c, T, base, A);
    if (c.music) v.hardStop = base + MUSIC_CUT + 0.006;
    if (partial) {
      // switched on mid-cue: the automation already ran on its own timeline; fade the cue in from silence
      v.out.gain.setValueAtTime(0, now);
      v.out.gain.linearRampToValueAtTime(1, now + 0.03);
      v.start = now;
    }
    try {
      c.play(v, T);
    } catch (err) {
      if (window.console) console.warn('[audio] cue ' + c.id + ' failed', err);
    }
    if (c.music) {
      var ct = base + MUSIC_CUT;
      v.out.gain.setValueAtTime(1, ct);
      v.out.gain.linearRampToValueAtTime(0, ct + 0.004);
    }
    return v;
  }

  // ---------------------------------------------------------------- live scheduler
  var S = {
    ctx: null, ac: null, chain: null, muted: true, voices: [],
    synced: false, head: 0, offset: 0, lead: PRE, lastP: 0, epoch: 0, soft: 0,
    suspendTimer: 0, lastResume: 0, log: null,
    // every scheduled cue occurrence, keyed id@A: 'live' (scheduled, not cancelled) or 'cut' (it started, then was
    // stopped by a restart). A live key is never scheduled again; a cut one may only resume partway (sustained cues).
    played: {},
    unmutedAt: 0, listeners: [],
  };
  function cueKey(c, A) { return c.id + '@' + A.toFixed(4); }

  function AudioCtor() { return window.AudioContext || window.webkitAudioContext || null; }
  function ensureContext() {
    if (S.ac) return S.ac;
    var AC = AudioCtor();
    if (!AC) return null;
    try { S.ac = new AC({ latencyHint: 'interactive' }); } catch (e) {
      try { S.ac = new AC(); } catch (e2) { return null; }
    }
    S.chain = buildChain(S.ac, 0);
    // the OS can take the output away while we think we are playing (iOS call or Siri: 'interrupted', older WebKit:
    // 'suspended'). Fall back to muted and tell the UI, so the next tap resumes inside a gesture instead of muting.
    var onState = function () {
      var st = S.ac && S.ac.state;
      if (S.muted || st === 'running') return;
      if (st === 'interrupted' || st === 'closed' || (st === 'suspended' && Date.now() - S.unmutedAt > 1500)) setMuted(true);
    };
    if (S.ac.addEventListener) S.ac.addEventListener('statechange', onState); else S.ac.onstatechange = onState;
    return S.ac;
  }
  function notifyMuted() {
    for (var i = 0; i < S.listeners.length; i++) { try { S.listeners[i](S.muted); } catch (e) { /* ignore */ } }
  }
  // iOS: a one-sample silent buffer played inside the gesture unlocks output
  function unlock(ac) {
    try {
      var s = ac.createBufferSource();
      s.buffer = ac.createBuffer(1, 1, ac.sampleRate);
      s.connect(ac.destination);
      s.start(0);
    } catch (e) { /* ignore */ }
  }
  function tryResume(ac) {
    try {
      var p = ac.resume && ac.resume();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* ignore */ }
  }
  function leadTime(ac) {
    var out = ac.outputLatency;
    if (!(out > 0)) out = ac.baseLatency || 0;
    return PRE + LB.clamp(out - DISPLAY_LAT, 0, 0.15);
  }

  function killVoice(v, now, fade) {
    if (S.log && v.start > now + fade) record(v.cue, v.A, v.T, now, 'cancel');
    var key = cueKey(v.cue, v.A);
    if (v.start > now) delete S.played[key]; else if (S.played[key]) S.played[key].st = 'cut';
    try { holdAt(v.out.gain, now); v.out.gain.linearRampToValueAtTime(0, now + fade); } catch (e) { /* ignore */ }
    for (var i = 0; i < v.srcs.length; i++) {
      try { v.srcs[i].stop(now + fade + 0.005); } catch (e) { /* already stopped */ }
    }
  }
  function killAll(now, fade) {
    for (var i = 0; i < S.voices.length; i++) killVoice(S.voices[i], now, fade);
    S.voices = [];
  }

  function record(c, A, T, now, how) {
    if (S.log) S.log.push({ id: c.id, t: c.t, A: Math.round(A * 1e6) / 1e6, T: T, now: now, how: how, epoch: S.epoch });
  }

  function schedule(c, A, now, allowPartial) {
    var T = A + S.offset - S.lead, how = 'ok';
    if (T < now) {
      if (now - T <= LATE_OK) { T = now + 0.002; how = 'late'; }
      // partway start: its automation runs on its own (past) timeline, which must not reach before audio time 0
      else if (allowPartial && c.sustain && T >= 0 && T + c.dur > now + 0.08) how = 'partial';
      else { record(c, A, T, now, 'skip'); return; }
    }
    var key = cueKey(c, A), prev = S.played[key];
    if (prev && (prev.st === 'live' || how !== 'partial')) { record(c, A, T, now, 'dup'); return; }
    S.played[key] = { A: A, st: 'live' };
    var v = playCue(S.ac, S.chain.master, c, T, T - c.t, A, how === 'partial', now);
    S.voices.push(v);
    record(c, A, T, now, how);
  }

  function scheduleRange(a, b, now) {
    var D = LB.D;
    for (var n = Math.floor(a / D); n <= Math.floor(b / D); n++) {
      for (var i = 0; i < CUES.length; i++) {
        var A = n * D + CUES[i].t;
        if (A >= a && A < b) schedule(CUES[i], A, now, true);
      }
    }
  }

  // sustained cues already sounding at P (only after a clean restart, when nothing of theirs is playing)
  function startInProgress(P, now) {
    var D = LB.D, n = Math.floor(P / D);
    for (var k = n - 1; k <= n; k++) {
      for (var i = 0; i < CUES.length; i++) {
        var c = CUES[i], A = k * D + c.t;
        if (c.sustain && A < P && A + c.dur > P + 0.1) schedule(c, A, now, true);
      }
    }
  }

  function tick(t, loops) {
    var ac = S.ac, clk = LB.clock;
    if (S.muted || !ac) return;
    if ((clk && clk.paused) || (clk && clk.rate !== 1)) {
      if (S.synced) { killAll(ac.currentTime, 0.03); S.synced = false; }
      return;
    }
    if (ac.state !== 'running') {
      if (S.synced) { killAll(ac.currentTime, 0.01); S.synced = false; }
      var ms = Date.now();
      if (ms - S.lastResume > 1000) { S.lastResume = ms; tryResume(ac); }
      return;
    }
    var D = LB.D;
    if (typeof loops !== 'number') loops = clk ? clk.loops : 0;
    var P = loops * D + t, now = ac.currentTime;

    if (S.synced) {
      var dp = P - S.lastP, drift = (now - P) - S.offset, lead = leadTime(ac);
      if (dp < -0.001 || dp > DRIFT_HARD || Math.abs(drift) > DRIFT_HARD) {
        S.synced = false; // jump (seek, stall, tab switch): restart cleanly below
      } else if (Math.abs(drift) > DRIFT_SOFT || Math.abs(lead - S.lead) > 0.004) {
        // re-anchor (clock drift, or the output latency became known or changed): cancel the cues that have not
        // started yet and schedule them again on the new mapping. The head only rewinds to the earliest CANCELLED cue:
        // a cue that already started keeps sounding and must not be scheduled a second time.
        var minA = Infinity;
        S.voices = S.voices.filter(function (v) {
          if (v.start > now + 0.002) { killVoice(v, now, 0.005); minA = Math.min(minA, v.A); return false; }
          return true;
        });
        S.offset = now - P;
        S.lead = lead;
        if (minA !== Infinity) S.head = Math.min(S.head, minA);
        S.soft++;
      } else {
        S.offset += drift * 0.03; // follow slow drift between the frame clock and the audio clock
      }
    }
    if (!S.synced) {
      killAll(now, 0.025);
      // going back (seek, loop restart from QA) or far ahead: those positions may legitimately sound again
      if (P < S.lastP - 0.001 || P > S.lastP + 1) S.played = {};
      S.epoch++;
      S.offset = now - P;
      S.lead = leadTime(ac);
      S.head = P;
      S.synced = true;
      startInProgress(P, now);
    }
    S.lastP = P;

    var end = P + S.lead + LOOKAHEAD;
    if (end > S.head) {
      scheduleRange(S.head, end, now);
      S.head = end;
    }
    // forget finished voices and old cue keys
    if (S.voices.length) S.voices = S.voices.filter(function (v) { return v.end > now; });
    for (var key in S.played) if (S.played[key].A < P - 2) delete S.played[key];
  }

  // ---------------------------------------------------------------- public API
  function setMuted(m) {
    m = !!m;
    if (!m) {
      var ac = ensureContext();
      if (!ac) return; // no WebAudio: stay muted
      if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ } }
      clearTimeout(S.suspendTimer);
      if (ac.state !== 'running') tryResume(ac);
      unlock(ac);
      if (S.muted) {
        var g = S.chain.master.gain, now = ac.currentTime;
        holdAt(g, now);
        g.linearRampToValueAtTime(LEVEL, now + 0.03);
        S.muted = false;
        S.synced = false;
        S.unmutedAt = Date.now();
        if (LB.clock) tick(LB.clock.t, LB.clock.loops);
      }
      return;
    }
    if (S.muted) return;
    S.muted = true;
    S.synced = false;
    notifyMuted();
    if (!S.ac) return;
    var a = S.ac, t0 = a.currentTime, mg = S.chain.master.gain;
    holdAt(mg, t0);
    mg.setTargetAtTime(0, t0, 0.01);
    mg.setValueAtTime(0, t0 + 0.08);
    killAll(t0, 0.07);
    // let the fade finish, then park the context (battery); setMuted(false) resumes it inside the next tap
    clearTimeout(S.suspendTimer);
    S.suspendTimer = setTimeout(function () {
      if (S.muted && S.ac && S.ac.state === 'running' && S.ac.suspend) {
        try { var p = S.ac.suspend(); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ }
      }
    }, 400);
  }

  function renderLoop(sampleRate, opts) {
    opts = opts || {};
    var sr = sampleRate || 48000, D = LB.D;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    var oac = new OAC(2, Math.round(D * sr), sr);
    var chain = buildChain(oac, opts.level != null ? opts.level : LEVEL);
    CUES.forEach(function (c) {
      if (opts.only && opts.only.indexOf(c.id) < 0) return;
      var T = c.t - PRE;
      playCue(oac, chain.master, c, T, T - c.t, c.t, false, 0);
    });
    return new Promise(function (resolve, reject) {
      oac.oncomplete = function (e) { resolve(e.renderedBuffer); };
      var p = oac.startRendering();
      if (p && p.then) p.then(resolve, reject);
    });
  }

  LB.register('audio', {
    init: function (ctx) { S.ctx = ctx; },          // nothing audio happens here: no context before a tap
    update: function (t, loops) { tick(t, loops); },
    setMuted: setMuted,
    isMuted: function () { return S.muted; },
    // optional (UI): fn(muted) when audio mutes itself (output interrupted). Not called for setMuted(false).
    onMutedChange: function (fn) { if (typeof fn === 'function') S.listeners.push(fn); },
    renderLoop: renderLoop,
    cueSheet: function () {
      return CUES.map(function (c) { return { id: c.id, t: c.t, dur: c.dur, level: c.level }; });
    },
    // QA hooks (not part of the contract): scheduling log and live state
    _debug: {
      log: function (on) { if (on) S.log = []; var l = S.log; if (on === false) S.log = null; return l; },
      state: function () {
        return { muted: S.muted, synced: S.synced, head: S.head, offset: S.offset, lead: S.lead, epoch: S.epoch, softResyncs: S.soft,
          voices: S.voices.length, hasContext: !!S.ac, ctxState: S.ac ? S.ac.state : null };
      },
    },
  });
})();
