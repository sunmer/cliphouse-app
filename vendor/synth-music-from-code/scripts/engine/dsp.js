// ===== dsp.js — every sound is computed here, sample by sample. No samples, no IRs. =====
'use strict';
var SR = 44100;
var TAU = Math.PI * 2;

function mulberry(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
var NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function nm(s) {
  if (typeof s === 'number') return s;
  var m = /^([A-G][#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}
// fast sine from a 4096-point table, argument in cycles (any real number)
var SIN_N = 4096, SIN_T = (function () { var t = new Float64Array(SIN_N + 1); for (var i = 0; i <= SIN_N; i++) t[i] = Math.sin(TAU * i / SIN_N); return t; })();
function fsin(c) { var x = (c - Math.floor(c)) * SIN_N, i = x | 0, f = x - i; return SIN_T[i] + (SIN_T[i + 1] - SIN_T[i]) * f; }
function db(x) { return Math.pow(10, x / 20); }
function ftanh(x) { if (x > 3) return 1; if (x < -3) return -1; var x2 = x * x; return x * (27 + x2) / (27 + 9 * x2); }
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

// polyBLEP residual for band-limited saw/pulse
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function sawBlep(p, dt) { return 2 * p - 1 - blep(p, dt); }
function sqBlep(p, dt) {
  var y = p < 0.5 ? 1 : -1;
  y += blep(p, dt);
  var p2 = p + 0.5; if (p2 >= 1) p2 -= 1;
  y -= blep(p2, dt);
  return y;
}

// Zero-delay-feedback state-variable filter (Simper)
function SVF() { this.ic1 = 0; this.ic2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; this.k = 1; this.a1 = 0; this.a2 = 0; this.a3 = 0; }
SVF.prototype.set = function (fc, Q) {
  fc = clamp(fc, 10, SR * 0.47);
  var g = Math.tan(Math.PI * fc / SR);
  this.k = 1 / Q;
  this.a1 = 1 / (1 + g * (g + this.k));
  this.a2 = g * this.a1;
  this.a3 = g * this.a2;
};
SVF.prototype.proc = function (v0) {
  v0 += 1e-18;   // keeps state out of denormal range (huge CPU cost otherwise)
  var v3 = v0 - this.ic2;
  var v1 = this.a1 * this.ic1 + this.a2 * v3;
  var v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
  this.ic1 = 2 * v1 - this.ic1;
  this.ic2 = 2 * v2 - this.ic2;
  this.lp = v2; this.bp = v1; this.hp = v0 - this.k * v1 - v2;
  return v2;
};

// 4-pole transistor-ladder style lowpass, 2x oversampled, with soft saturation
function Ladder() { this.s0 = 0; this.s1 = 0; this.s2 = 0; this.s3 = 0; this.xp = 0; }
Ladder.prototype.proc = function (x, fc, res) {
  x += 1e-18;
  fc = clamp(fc, 20, 18000);
  var g = 1 - Math.exp(-TAU * fc / (2 * SR));
  var k = res * 4.1;
  var y = 0;
  for (var o = 0; o < 2; o++) {
    var xin = o === 0 ? 0.5 * (x + this.xp) : x;
    var u = ftanh((xin - k * this.s3) * 1.1);
    this.s0 += g * (u - ftanh(this.s0));
    this.s1 += g * (ftanh(this.s0) - ftanh(this.s1));
    this.s2 += g * (ftanh(this.s1) - ftanh(this.s2));
    this.s3 += g * (ftanh(this.s2) - this.s3);
    y += this.s3;
  }
  this.xp = x;
  return y * 0.5 * (1 + res * 1.2);
};

// RBJ biquad
function Biquad(type, f, Q, gainDb) { this.z1 = 0; this.z2 = 0; this.set(type, f, Q, gainDb || 0); }
Biquad.prototype.set = function (type, f, Q, gainDb) {
  var A = Math.pow(10, gainDb / 40), w0 = TAU * clamp(f, 5, SR * 0.47) / SR, cw = Math.cos(w0), sw = Math.sin(w0);
  var alpha = sw / (2 * Q), b0, b1, b2, a0, a1, a2, sA = Math.sqrt(A);
  switch (type) {
    case 'lp': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'bp': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'peak': b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    case 'ls': b0 = A * ((A + 1) - (A - 1) * cw + 2 * sA * alpha); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - 2 * sA * alpha);
      a0 = (A + 1) + (A - 1) * cw + 2 * sA * alpha; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - 2 * sA * alpha; break;
    case 'hs': b0 = A * ((A + 1) + (A - 1) * cw + 2 * sA * alpha); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - 2 * sA * alpha);
      a0 = (A + 1) - (A - 1) * cw + 2 * sA * alpha; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - 2 * sA * alpha; break;
    default: throw new Error('biquad type ' + type);
  }
  this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
};
Biquad.prototype.proc = function (x) {
  x += 1e-18;
  var y = this.b0 * x + this.z1;
  this.z1 = this.b1 * x - this.a1 * y + this.z2;
  this.z2 = this.b2 * x - this.a2 * y;
  return y;
};
function biquadRun(buf, type, f, Q, g) { var b = new Biquad(type, f, Q, g); for (var i = 0; i < buf.length; i++) buf[i] = b.proc(buf[i]); }

// automation: points [[sec, value], ...]; exp=true interpolates in log domain (for frequencies)
function autoFn(points, exp) {
  if (typeof points === 'number') { var c = points; return function () { return c; }; }
  return function (t) {
    if (t <= points[0][0]) return points[0][1];
    for (var i = 1; i < points.length; i++) {
      if (t <= points[i][0]) {
        var a = points[i - 1], b = points[i], x = (t - a[0]) / (b[0] - a[0] || 1);
        return exp ? a[1] * Math.pow(b[1] / a[1], x) : a[1] + (b[1] - a[1]) * x;
      }
    }
    return points[points.length - 1][1];
  };
}

// ---------- effects ----------
// Feedback-delay-network reverb: 8 lines, Householder mixing, damping, slow modulation, input diffusion.
function reverbFDN(inL, inR, p) {
  var n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n);
  var base = [1123, 1361, 1597, 1811, 2069, 2311, 2593, 2903];
  var N = 8, size = p.size || 1, rt = p.decay || 2.2, pre = Math.floor((p.predelay || 0.02) * SR);
  var lens = base.map(function (b) { return Math.floor(b * size); });
  var bufs = lens.map(function (l) { return new Float32Array(l + 64); });
  var wp = new Int32Array(N), lpS = new Float64Array(N);
  var gains = lens.map(function (l) { return Math.pow(10, -3 * l / (SR * rt)); });
  var dampA = 1 - Math.exp(-TAU * (p.damp || 6000) / SR);
  // input diffusers (allpass) per channel
  var apLen = [[142, 107, 379, 277], [151, 113, 389, 263]];
  var apBuf = apLen.map(function (ls) { return ls.map(function (l) { return new Float32Array(Math.floor(l * size)); }); });
  var apIdx = [[0, 0, 0, 0], [0, 0, 0, 0]];
  var preBufL = new Float32Array(pre + 1), preBufR = new Float32Array(pre + 1), pi = 0;
  var hpL = new Biquad('hp', p.hp || 180, 0.7), hpR = new Biquad('hp', p.hp || 180, 0.7);
  var lpOL = new Biquad('lp', p.lp || 9000, 0.7), lpOR = new Biquad('lp', p.lp || 9000, 0.7);
  var lfoPh = [0, 1.3, 2.1, 3.7, 0.6, 4.4, 5.2, 2.9], lfoR = [0.31, 0.37, 0.43, 0.29, 0.41, 0.33, 0.47, 0.39];
  var modD = (p.mod === undefined ? 6 : p.mod);
  var x = new Float64Array(N), y = new Float64Array(N);
  var signL = [1, -1, 1, -1, 1, -1, 1, -1], signR = [1, 1, -1, -1, 1, 1, -1, -1];
  for (var i = 0; i < n; i++) {
    var l = inL[i] + 1e-18, r = inR[i] + 1e-18;
    var dl = preBufL[pi], dr = preBufR[pi]; preBufL[pi] = l; preBufR[pi] = r; pi++; if (pi > pre) pi = 0;
    dl = hpL.proc(dl); dr = hpR.proc(dr);
    // diffusion
    for (var c = 0; c < 2; c++) {
      var s = c ? dr : dl;
      for (var a = 0; a < 4; a++) {
        var B = apBuf[c][a], j = apIdx[c][a], d = B[j];
        var v = s + 0.62 * d; B[j] = v; s = d - 0.62 * v;
        j++; if (j >= B.length) j = 0; apIdx[c][a] = j;
      }
      if (c) dr = s; else dl = s;
    }
    // read lines with modulation
    var sum = 0;
    for (var k = 0; k < N; k++) {
      var buf = bufs[k], L = buf.length;
      lfoPh[k] += TAU * lfoR[k] / SR;
      var dly = lens[k] - modD - 2 + modD * Math.sin(lfoPh[k]);
      var rp = wp[k] - dly; while (rp < 0) rp += L;
      var i0 = Math.floor(rp), fr = rp - i0, i1 = i0 + 1; if (i1 >= L) i1 -= L;
      var v2 = buf[i0] * (1 - fr) + buf[i1] * fr;
      lpS[k] += dampA * (v2 - lpS[k]);
      y[k] = lpS[k] * gains[k];
      sum += y[k];
    }
    var oL = 0, oR = 0;
    for (k = 0; k < N; k++) { oL += y[k] * signL[k]; oR += y[k] * signR[k]; }
    for (var hh = 1; hh < N; hh *= 2) for (var a0 = 0; a0 < N; a0 += 2 * hh) for (var jj = a0; jj < a0 + hh; jj++) { var u0 = y[jj], u1 = y[jj + hh]; y[jj] = u0 + u1; y[jj + hh] = u0 - u1; }
    for (k = 0; k < N; k++) {
      var inj = (k & 1) ? dr : dl;
      var B2 = bufs[k];
      B2[wp[k]] = y[k] * 0.35355339 + inj * 0.5;
      wp[k]++; if (wp[k] >= B2.length) wp[k] = 0;
    }
    outL[i] = lpOL.proc(oL * 0.35); outR[i] = lpOR.proc(oR * 0.35);
  }
  return [outL, outR];
}

// Stereo ping-pong delay with filtered feedback; killAt clears echoes of earlier material at that sample.
function pingPong(inL, inR, p) {
  var n = inL.length, outL = new Float32Array(n), outR = new Float32Array(n);
  var D = Math.max(1, Math.floor(p.time * SR));
  var bL = new Float32Array(D), bR = new Float32Array(D), w = 0;
  var lp = new Biquad('lp', p.lp || 4500, 0.7), hp = new Biquad('hp', p.hp || 300, 0.7);
  var fb = p.fb || 0.4, killAt = p.killAt || -1;
  for (var i = 0; i < n; i++) {
    if (i === killAt) { bL.fill(0); bR.fill(0); }
    var yl = bL[w], yr = bR[w];
    var inp = (killAt >= 0 && i >= killAt) ? 1e-18 : (inL[i] + inR[i]) * 0.5 + 1e-18;   // no echoes of the final hit: the ending is one hit + a ringing tail
    var f = hp.proc(lp.proc(yr));
    bL[w] = inp + f * fb;
    bR[w] = yl;
    w++; if (w >= D) w = 0;
    outL[i] = yl; outR[i] = yr;
  }
  return [outL, outR];
}

// Stereo chorus (in place), wet/dry mix
function chorus(L, R, p) {
  var n = L.length, maxD = Math.floor(0.03 * SR);
  var bL = new Float32Array(maxD), bR = new Float32Array(maxD), w = 0;
  var rate = p.rate || 0.5, depth = (p.depth || 0.003) * SR, base = (p.delay || 0.012) * SR, mix = p.mix === undefined ? 0.5 : p.mix;
  var ph = 0;
  for (var i = 0; i < n; i++) {
    bL[w] = L[i]; bR[w] = R[i];
    ph += TAU * rate / SR;
    var dl = base + depth * Math.sin(ph), dr = base + depth * Math.sin(ph + Math.PI / 2);
    var rl = w - dl; while (rl < 0) rl += maxD; var rr = w - dr; while (rr < 0) rr += maxD;
    var a = Math.floor(rl), fa = rl - a, a1 = (a + 1) % maxD;
    var b = Math.floor(rr), fb = rr - b, b1 = (b + 1) % maxD;
    var wl = bL[a] * (1 - fa) + bL[a1] * fa;
    var wr = bR[b] * (1 - fb) + bR[b1] * fb;
    L[i] = L[i] * (1 - mix * 0.5) + wr * mix;   // cross-feed for width
    R[i] = R[i] * (1 - mix * 0.5) + wl * mix;
    w++; if (w >= maxD) w = 0;
  }
}

// Tape wow and flutter (in place): a slowly modulated delay, same on both channels
function wowFlutter(L, R, p, rnd) {
  var n = L.length, maxD = Math.floor(0.03 * SR), bL = new Float32Array(maxD), bR = new Float32Array(maxD), w = 0;
  var base = 0.008 * SR, wr = p.wow[0], wd = p.wow[1] * SR, fr = p.flutter[0], fd = p.flutter[1] * SR, drift = 0, dv = 0;
  for (var i = 0; i < n; i++) {
    bL[w] = L[i]; bR[w] = R[i];
    if ((i & 63) === 0) { dv += (rnd() - 0.5) * 0.02; dv *= 0.995; }
    drift += (dv - drift) * 0.001;
    var t = i / SR, d = base + wd * Math.sin(TAU * wr * t) + fd * Math.sin(TAU * fr * t + 1.3) + drift * wd;
    var r = w - d; while (r < 0) r += maxD;
    var a = Math.floor(r), f = r - a, a1 = (a + 1) % maxD;
    L[i] = bL[a] * (1 - f) + bL[a1] * f; R[i] = bR[a] * (1 - f) + bR[a1] * f;
    w++; if (w >= maxD) w = 0;
  }
}

// Feed-forward stereo-linked compressor (in place)
function compress(L, R, p) {
  var thr = p.thr, ratio = p.ratio || 2, knee = p.knee || 6;
  var aA = Math.exp(-1 / (SR * (p.att || 0.01))), aR = Math.exp(-1 / (SR * (p.rel || 0.12)));
  var env = 0, gr = 0, mk = db(p.makeup || 0);
  for (var i = 0; i < L.length; i++) {
    var lv = Math.max(Math.abs(L[i]), Math.abs(R[i])) + 1e-15;
    env = lv > env ? aA * env + (1 - aA) * lv : aR * env + (1 - aR) * lv;
    var x = 20 * Math.log10(env + 1e-9), o = x - thr, red = 0;
    if (2 * o < -knee) red = 0;
    else if (2 * Math.abs(o) <= knee) red = (1 / ratio - 1) * (o + knee / 2) * (o + knee / 2) / (2 * knee);
    else red = (1 / ratio - 1) * o;
    var g = db(red) * mk;
    L[i] *= g; R[i] *= g;
  }
}

// ---------- loudness (ITU-R BS.1770-4) ----------
function kFilter(x) {
  var y = new Float32Array(x.length);
  var f1 = new Biquad('hs', 1500, 1 / Math.SQRT2, 4.0), f2 = new Biquad('hp', 38, 0.5, 0);
  for (var i = 0; i < x.length; i++) y[i] = f2.proc(f1.proc(x[i]));
  return y;
}
function lufs(L, R) {
  // streaming K-weighting; energy per 100 ms hop, blocks = 4 hops (400 ms, 75% overlap)
  var hop = Math.floor(0.1 * SR), nh = Math.floor(L.length / hop), eL = new Float64Array(nh), eR = new Float64Array(nh);
  var F1 = new Biquad('hs', 1500, 1 / Math.SQRT2, 4.0), F2 = new Biquad('hp', 38, 0.5, 0);
  var a0 = F1.b0, a1 = F1.b1, a2 = F1.b2, a3 = F1.a1, a4 = F1.a2, c0 = F2.b0, c1 = F2.b1, c2 = F2.b2, c3 = F2.a1, c4 = F2.a2;
  for (var ch = 0; ch < 2; ch++) {
    var x = ch ? R : L, e = ch ? eR : eL, z1 = 0, z2 = 0, w1 = 0, w2 = 0;
    for (var h = 0; h < nh; h++) {
      var acc = 0, o = h * hop;
      for (var i = o, ie = o + hop; i < ie; i++) {
        var xi = x[i] + 1e-18, y1 = a0 * xi + z1; z1 = a1 * xi - a3 * y1 + z2; z2 = a2 * xi - a4 * y1;
        var y = c0 * y1 + w1; w1 = c1 * y1 - c3 * y + w2; w2 = c2 * y1 - c4 * y;
        acc += y * y;
      }
      e[h] = acc;
    }
  }
  var zs = [], blk = 4 * hop;
  for (var b = 0; b + 4 <= nh; b++) zs.push([(eL[b] + eL[b + 1] + eL[b + 2] + eL[b + 3]) / blk, (eR[b] + eR[b + 1] + eR[b + 2] + eR[b + 3]) / blk]);
  function ld(z) { return -0.691 + 10 * Math.log10(z[0] + z[1] + 1e-20); }
  var g1 = zs.filter(function (z) { return ld(z) > -70; });
  if (!g1.length) return -120;
  var m = [0, 0]; g1.forEach(function (z) { m[0] += z[0]; m[1] += z[1]; });
  var rel = ld([m[0] / g1.length, m[1] / g1.length]) - 10;
  var g2 = g1.filter(function (z) { return ld(z) > rel; });
  m = [0, 0]; g2.forEach(function (z) { m[0] += z[0]; m[1] += z[1]; });
  return ld([m[0] / g2.length, m[1] / g2.length]);
}

// ---------- true peak (4x oversampled, windowed-sinc polyphase) ----------
var TP_TAPS = 48, TP_FIR = (function () {
  var P = 4, N = TP_TAPS * P, h = new Float64Array(N), c = (TP_TAPS / 2) * P;
  function bessel0(x) { var s = 1, t = 1; for (var k = 1; k < 30; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; }
  var beta = 9;
  for (var i = 0; i < N; i++) {
    var x = (i - c) / P, sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    var r = (i - c) / c, w = bessel0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / bessel0(beta);
    h[i] = sinc * w;
  }
  var ph = [];
  for (var q = 0; q < P; q++) { var a = []; for (var t = 0; t < TP_TAPS; t++) a.push(h[t * P + q]); ph.push(Float64Array.from(a)); }
  return ph;
})();
// per-sample true-peak magnitude (max over channels, over the 4 interpolated points)
function truePeakEnv(L, R, thr) {
  var n = L.length, out = new Float32Array(n), half = TP_TAPS / 2;
  thr = thr || 0;
  [L, R].forEach(function (x) {
    for (var i = 0; i < n; i++) {
      var m = Math.abs(x[i]);
      var nb = Math.max(m, i + 1 < n ? Math.abs(x[i + 1]) : 0, i > 0 ? Math.abs(x[i - 1]) : 0);
      if (nb < thr) { if (m > out[i]) out[i] = m; continue; }
      for (var q = 1; q < 4; q++) {
        var h = TP_FIR[q], s = 0;
        for (var t = 0; t < TP_TAPS; t++) { var j = i + half - t; if (j >= 0 && j < n) s += h[t] * x[j]; }
        var a = Math.abs(s); if (a > m) m = a;
      }
      if (m > out[i]) out[i] = m;
    }
  });
  return out;
}
function truePeakDb(L, R) {
  var pk = 0; for (var i = 0; i < L.length; i++) { var a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) pk = a; }
  var e = truePeakEnv(L, R, pk * 0.45), m = 0; for (var i = 0; i < e.length; i++) if (e[i] > m) m = e[i]; return 20 * Math.log10(m + 1e-12); }

// Look-ahead true-peak limiter (offline). Returns new arrays.
function tpLimit(L, R, ceilDb, relS) {
  var n = L.length, c = db(ceilDb), env = truePeakEnv(L, R, c * 0.45);
  var LA = 96, greq = new Float32Array(n);
  for (var i = 0; i < n; i++) greq[i] = env[i] > c ? c / env[i] : 1;
  // forward-looking min over [i, i+LA]
  // forward-looking min over [i, i+LA] with a monotonic deque (O(n))
  var gmin = new Float32Array(n), dq = new Int32Array(n), h = 0, tl = 0;
  for (var j = 0; j < n + LA; j++) {
    if (j < n) { while (tl > h && greq[dq[tl - 1]] >= greq[j]) tl--; dq[tl++] = j; }
    var st = j - LA;
    if (st >= 0) { while (dq[h] < st) h++; gmin[st] = greq[dq[h]]; }
  }
  var rel = 1 - Math.exp(-1 / (SR * (relS || 0.08))), g = new Float32Array(n), cur = 1;
  for (i = 0; i < n; i++) { cur = cur + (1 - cur) * rel; if (gmin[i] < cur) cur = gmin[i]; g[i] = cur; }
  // trailing moving average over LA+1 samples
  var oL = new Float32Array(n), oR = new Float32Array(n), acc = 0;
  for (i = 0; i < n; i++) {
    acc += g[i]; if (i > LA) acc -= g[i - LA - 1];
    var gs = acc / Math.min(i + 1, LA + 1);
    if (i < LA) gs = Math.min(gs, gmin[i]);
    oL[i] = L[i] * gs; oR[i] = R[i] * gs;
  }
  return [oL, oR];
}

// ---------- WAV (16-bit PCM, TPDF dither) ----------
function encodeWav(L, R, seed) {
  var n = L.length, buf = new ArrayBuffer(44 + n * 4), dv = new DataView(buf), rnd = mulberry(seed || 7);
  function str(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, SR, true);
  dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 4, true);
  var o = 44;
  for (var i = 0; i < n; i++) {
    for (var ch = 0; ch < 2; ch++) {
      var v = (ch ? R[i] : L[i]) * 32767 + (rnd() - rnd());
      v = Math.round(clamp(v, -32767, 32767));
      dv.setInt16(o, v, true); o += 2;
    }
  }
  return buf;
}
