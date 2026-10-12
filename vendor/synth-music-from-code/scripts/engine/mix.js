// ===== mix.js — note data → stems → mix → master =====
'use strict';
var REF_PK = -6;    // kick peak (dBFS, pre-master); low-end parts are set by peak relative to it
var REF_LU = -13;   // loudness reference for every other part (part.lu is relative to this)

function stepDur(song) { return 60 / song.bpm / 4; }

// turn a part's note list ([step, durSteps, note, vel, extra]) into timed events
function partEvents(song, part, rnd) {
  var sd = stepDur(song), sw = part.swing ? (song.swing || 0) : 0, hum = part.hum || 0, vr = part.vrand || 0;
  return part.notes.map(function (a) {
    var s = a[0], base = Math.floor(s), isOdd = (base % 2 === 1) && (s === base);
    var t = (s + (isOdd ? sw : 0)) * sd + (hum ? (rnd() - 0.5) * 2 * hum : 0) + (s > 0 && s < song.finalStep ? (part.late || 0) : 0);
    if (s === 0 || t < 0) t = Math.max(0, t);
    var ev = { step: s, t: t, d: a[1] * sd, n: a[2] == null ? null : nm(a[2]), v: clamp(a[3] * (1 + (vr ? (rnd() - 0.5) * 2 * vr : 0)), 0, 1.2) };
    var x = a[4]; if (x) for (var k in x) ev[k] = x[k];
    return ev;
  }).sort(function (a, b) { return a.t - b.t; });
}

// sidechain shape: 1 = fully ducked; finalStep kick is weighted lighter so the last chord rings
function duckShape(song, kickEvents, rel, N) {
  var s = new Float32Array(N), pre = 0.002, att = 0.004;
  var finalT = song.finalStep * stepDur(song);
  kickEvents.forEach(function (k) {
    var w = Math.abs(k.t - finalT) < 1e-3 ? 0 : 1;   // the final hit is not ducked: it lands as one solid hit
    var a = Math.floor((k.t - pre) * SR), b = Math.min(N, Math.floor((k.t + att + rel) * SR));
    for (var i = Math.max(0, a); i < b; i++) {
      var dt = i / SR - k.t, v;
      if (dt < att) v = (dt + pre) / (pre + att);
      else v = 0.5 * (1 + Math.cos(Math.PI * (dt - att) / rel));
      v *= w;
      if (v > s[i]) s[i] = v;
    }
  });
  return s;
}

function applyInserts(L, R, fx, song) {
  (fx || []).forEach(function (f) {
    var type = f[0];
    if (type === 'hp' || type === 'lp' || type === 'bp') { biquadRun(L, type, f[1], f[2] || 0.7, 0); biquadRun(R, type, f[1], f[2] || 0.7, 0); }
    else if (type === 'peak' || type === 'ls' || type === 'hs') { biquadRun(L, type, f[1], f[2], f[3]); biquadRun(R, type, f[1], f[2], f[3]); }
    else if (type === 'drive') { var d = f[1], dn = Math.tanh(d); for (var i = 0; i < L.length; i++) { L[i] = Math.tanh(L[i] * d) / dn; R[i] = Math.tanh(R[i] * d) / dn; } }
    else if (type === 'chorus') chorus(L, R, f[1]);
    else if (type === 'comp') compress(L, R, f[1]);
    else if (type === 'width') { var w = f[1]; for (i = 0; i < L.length; i++) { var m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5 * w; L[i] = m + s; R[i] = m - s; } }
    else if (type === 'pan') { var p = f[1], gl = p > 0 ? 1 - p : 1, gr = p < 0 ? 1 + p : 1; for (i = 0; i < L.length; i++) { L[i] *= gl; R[i] *= gr; } }
    else if (type === 'lpAuto' || type === 'hpAuto') {
      var fn = autoFn(f[1], true), q = f[2] || 0.7;
      [L, R].forEach(function (B) {
        var s1 = new SVF(), s2 = new SVF();
        for (var i = 0; i < B.length; i++) {
          if ((i & 31) === 0) { var fc = fn(i / SR); s1.set(fc, q); s2.set(fc, 0.6); }
          s1.proc(B[i]); var y = type === 'lpAuto' ? s1.lp : s1.hp;
          s2.proc(y); B[i] = type === 'lpAuto' ? s2.lp : s2.hp;
        }
      });
    }
    else if (type === 'gainAuto') { var gf = autoFn(f[1], false); for (i = 0; i < L.length; i++) { var gg = gf(i / SR); L[i] *= gg; R[i] *= gg; } }
    else throw new Error('insert ' + type);
  });
}

function renderSong(song, opts) {
  opts = opts || {};
  var N = Math.round(song.length * SR);
  var rnd = mulberry(song.seed || 1);
  var dryL = new Float32Array(N), dryR = new Float32Array(N);
  var revL = new Float32Array(N), revR = new Float32Array(N);
  var dlyL = new Float32Array(N), dlyR = new Float32Array(N);
  var kickPart = song.parts.filter(function (p) { return p.inst === 'kick'; })[0];
  var kickEv = kickPart ? partEvents(song, kickPart, mulberry(99)) : [];
  var duckCache = {};
  var finalSample = Math.round(song.finalStep * stepDur(song) * SR);
  var keep = {}, report = [];
  song.parts.forEach(function (part, pi) {
    if (opts.only && opts.only.indexOf(part.name) < 0 && part.name !== 'kick') return;
    var prnd = mulberry((song.seed || 1) * 1000 + pi * 7919 + 13);
    var L = new Float32Array(N), R = new Float32Array(N), P = part.p || {};
    if (part.inst === 'rumble') {
      var src = keep[part.src];
      var rv = reverbFDN(src[0], src[1], { size: P.size || 1.3, decay: P.decay || 2.5, damp: P.damp || 300, hp: 30, lp: 400, predelay: 0.005, mod: 2 });
      for (var i = 0; i < N; i++) { L[i] = rv[0][i] + rv[1][i]; R[i] = L[i]; }
    } else {
      var evs = partEvents(song, part, prnd);
      if (part.inst === 'mono') V.mono(L, R, evs, P, prnd, song);
      else evs.forEach(function (ev) { V[part.inst](L, R, Math.round(ev.t * SR), ev, P, prnd, song); });
    }
    applyInserts(L, R, part.fx, song);
    if (part.keep) keep[part.name] = [L.slice(), R.slice()];
    var meas = lufs(L, R), g;
    if (part.pk !== undefined) {
      var pk = 0; for (i = 0; i < N; i++) { var a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > pk) pk = a; if (b > pk) pk = b; }
      g = pk > 0 ? db(REF_PK + part.pk) / pk : 0;
    } else g = meas > -110 ? db(REF_LU + (part.lu || 0) - meas) : 0;
    if (opts.mute && opts.mute.indexOf(part.name) >= 0) g = 0;
    report.push({ name: part.name, measured: meas, gainDb: 20 * Math.log10(g + 1e-12), inMix: meas + 20 * Math.log10(g + 1e-12) });
    if (part.duck) {
      var rel = part.duckRel || song.duckRel || 0.16, key = rel.toFixed(3);
      var sh = duckCache[key] || (duckCache[key] = duckShape(song, kickEv, rel, N));
      for (i = 0; i < N; i++) { var gg = 1 - part.duck * sh[i]; L[i] *= gg; R[i] *= gg; }
    }
    if (opts.stems) { var sl = new Float32Array(N), sr = new Float32Array(N); for (i = 0; i < N; i++) { sl[i] = L[i] * g; sr[i] = R[i] * g; } opts.stems[part.name] = [sl, sr]; }
    var rs = part.rev || 0, ds = part.dly || 0;
    for (i = 0; i < N; i++) {
      var l = L[i] * g, r = R[i] * g;
      dryL[i] += l; dryR[i] += r;
      if (rs) { revL[i] += l * rs; revR[i] += r * rs; }
      if (ds) { dlyL[i] += l * ds; dlyR[i] += r * ds; }
    }
  });
  // returns
  var dl = song.delay, rvp = song.reverb;
  var dOut = pingPong(dlyL, dlyR, { time: dl.steps * stepDur(song), fb: dl.fb, lp: dl.lp, hp: dl.hp, killAt: finalSample });
  for (var i2 = 0; i2 < N; i2++) { revL[i2] += dOut[0][i2] * (dl.toRev || 0.2); revR[i2] += dOut[1][i2] * (dl.toRev || 0.2); }
  var rOut = reverbFDN(revL, revR, rvp);
  var rsh = duckShape(song, kickEv, song.retDuckRel || 0.2, N), rd = song.retDuck || 0.3;
  var mL = new Float32Array(N), mR = new Float32Array(N);
  var rg = rvp.gain || 1, dg = dl.gain || 1;
  for (i2 = 0; i2 < N; i2++) {
    var gd = 1 - rd * rsh[i2];
    mL[i2] = dryL[i2] + (rOut[0][i2] * rg + dOut[0][i2] * dg) * gd;
    mR[i2] = dryR[i2] + (rOut[1][i2] * rg + dOut[1][i2] * dg) * gd;
  }
  // master: tidy lows, tone, glue, colour
  var m = song.master || {};
  biquadRun(mL, 'hp', 24, 0.7, 0); biquadRun(mR, 'hp', 24, 0.7, 0);
  (m.eq || []).forEach(function (e) { biquadRun(mL, e[0], e[1], e[2], e[3]); biquadRun(mR, e[0], e[1], e[2], e[3]); });
  if (m.lofi) {   // tape: wow/flutter, then a gentle top roll-off
    wowFlutter(mL, mR, m.lofi, mulberry((song.seed || 1) + 5));
    biquadRun(mL, 'lp', m.lofi.lp, 0.6, 0); biquadRun(mR, 'lp', m.lofi.lp, 0.6, 0);
  }
  var pre = db(-16 - lufs(mL, mR));
  for (i2 = 0; i2 < N; i2++) { mL[i2] *= pre; mR[i2] *= pre; }
  compress(mL, mR, m.comp || { thr: -12, ratio: 2, att: 0.02, rel: 0.15, knee: 6 });
  var sat = m.sat || 1.15, sn = Math.tanh(sat);
  for (i2 = 0; i2 < N; i2++) { mL[i2] = Math.tanh(mL[i2] * sat) / sn; mR[i2] = Math.tanh(mR[i2] * sat) / sn; }
  // ending: let the tail ring, then a short fade to digital silence
  var fadeLen = Math.floor((song.fade || 0.25) * SR);
  for (i2 = N - fadeLen; i2 < N; i2++) { var x = (N - i2) / fadeLen, fg = 0.5 - 0.5 * Math.cos(Math.PI * x); mL[i2] *= fg; mR[i2] *= fg; }
  // loudness + true-peak control (iterate: normalise, limit, re-measure)
  var target = -14, ceil = -1.5, gainDb = target - lufs(mL, mR), out = null, lu = 0;
  for (var it = 0; it < 5; it++) {
    var gl = db(gainDb), aL = new Float32Array(N), aR = new Float32Array(N);
    for (i2 = 0; i2 < N; i2++) { aL[i2] = mL[i2] * gl; aR[i2] = mR[i2] * gl; }
    out = tpLimit(aL, aR, ceil, 0.06);
    lu = lufs(out[0], out[1]);
    if (Math.abs(lu - target) < 0.03) break;
    gainDb += target - lu;
  }
  var tp = truePeakDb(out[0], out[1]);
  if (tp > ceil + 0.05) {   // safety pass
    out = tpLimit(out[0], out[1], ceil - 0.2, 0.06);
    lu = lufs(out[0], out[1]); tp = truePeakDb(out[0], out[1]);
  }
  return { L: out[0], R: out[1], lufs: lu, tp: tp, report: report };
}
