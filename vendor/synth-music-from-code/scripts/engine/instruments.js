// ===== instruments.js — every voice is synthesized from oscillators and noise =====
'use strict';
// Poly voices: fn(L, R, i0, note, P, rnd, ctx). note: {t (sec), d (sec), n (midi), v (0..1), ...}
// Mono voices take the whole note list: fn(L, R, notes, P, rnd, ctx)

function panGains(p) { var a = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a) * 1.4142, Math.sin(a) * 1.4142]; }
var PG = [1, 1];
function panInto(p) { var a = (clamp(p, -1, 1) + 1) * Math.PI / 4; PG[0] = Math.cos(a) * 1.4142; PG[1] = Math.sin(a) * 1.4142; }
function endFade(i, n, m) { return i > n - m ? (n - i) / m : 1; }

var V = {};

// ---- drums ----
V.kick = function (L, R, i0, nt, P, rnd) {
  var n = Math.min(Math.floor((P.len || 0.5) * SR), L.length - i0);
  var f0 = P.f0, f1 = P.f1, pd = P.pd, hold = P.hold, dec = P.dec, drv = P.drive || 1, click = P.click || 0;
  var hp = new SVF(); hp.set(P.clickF || 2500, 0.7);
  var kn = Math.tanh(drv), ph = P.phase0 || 0, v = nt.v, cph = 0;
  var knock = P.knock || 0;
  for (var i = 0; i < n; i++) {
    var t = i / SR;
    var f = f1 + (f0 - f1) * Math.exp(-t / pd);
    ph += TAU * f / SR;
    var a = (t < 0.0005 ? t / 0.0005 : 1) * (t < hold ? 1 : Math.exp(-(t - hold) / dec));
    if (i > n * 0.6) { var wx = (i - n * 0.6) / (n * 0.4); a *= 1 - wx * wx * (3 - 2 * wx); }
    var y = Math.sin(ph) * a;
    if (knock) y += Math.sin(ph * 2) * knock * Math.exp(-t / 0.02);
    if (t < 0.012) { cph += TAU * (650 + 2600 * Math.exp(-t / 0.0022)) / SR; y += Math.sin(cph) * click * Math.exp(-t / 0.0024); }
    y = Math.tanh(y * drv) / kn * v * endFade(i, n, 300);
    L[i0 + i] += y; R[i0 + i] += y;
  }
};

V.clap = function (L, R, i0, nt, P, rnd) {
  var n = Math.min(Math.floor((P.len || 0.5) * SR), L.length - i0);
  var offs = [0, 0.0098 + (rnd() - 0.5) * 0.002, 0.0192 + (rnd() - 0.5) * 0.002, 0.029];
  for (var ch = 0; ch < 2; ch++) {
    var B = ch ? R : L, bp = new SVF(), hp = new SVF();
    bp.set((P.fc || 1150) * (ch ? 1.06 : 0.95), P.q || 1.1); hp.set(P.hp || 600, 0.7);
    for (var i = 0; i < n; i++) {
      var t = i / SR, e = 0;
      for (var k = 0; k < 3; k++) { var dt = t - offs[k]; if (dt >= 0 && dt < 0.04) e += Math.exp(-dt / 0.0045); }
      var dt3 = t - offs[3]; if (dt3 >= 0) e += Math.exp(-dt3 / (P.dec || 0.12));
      bp.proc((rnd() * 2 - 1) * e);
      hp.proc(bp.bp * bp.k);
      B[i0 + i] += hp.hp * nt.v * endFade(i, n, 300);
    }
  }
};

V.snare = function (L, R, i0, nt, P, rnd) {
  var n = Math.min(Math.floor((P.len || 0.35) * SR), L.length - i0);
  var f = P.f || 220, p1 = 0, p2 = 0, v = nt.v;
  var hpL = new SVF(), hpR = new SVF(); hpL.set(P.nhp || 1800, 0.7); hpR.set((P.nhp || 1800) * 1.1, 0.7);
  var lpL = new SVF(), lpR = new SVF(); lpL.set(P.nlp || 9000, 0.7); lpR.set(P.nlp || 9000, 0.7);
  for (var i = 0; i < n; i++) {
    var t = i / SR, pe = 1 + 0.25 * Math.exp(-t / 0.008);
    p1 += TAU * f * pe / SR; p2 += TAU * f * 1.5 * pe / SR;
    var body = (Math.sin(p1) * Math.exp(-t / (P.bdec || 0.07)) + 0.6 * Math.sin(p2) * Math.exp(-t / ((P.bdec || 0.07) * 0.6))) * (P.body || 0.6);
    var ne = Math.exp(-t / (P.ndec || 0.13)) * (t < 0.001 ? t / 0.001 : 1);
    hpL.proc(rnd() * 2 - 1); hpR.proc(rnd() * 2 - 1);
    var nl = lpL.proc(hpL.hp) * ne, nr = lpR.proc(hpR.hp) * ne;
    var fe = endFade(i, n, 200);
    L[i0 + i] += (ftanh(body + nl * 1.3)) * v * fe;
    R[i0 + i] += (ftanh(body + nr * 1.3)) * v * fe;
  }
};

var HAT_R = [1, 1.4826, 1.8004, 2.5459, 2.6305, 3.8968];
V.hat = function (L, R, i0, nt, P, rnd) {
  var dec = P.dec || 0.05, choke = nt.d || 99;
  var n = Math.min(Math.floor(Math.min(dec * 7 + 0.01, choke + 0.02) * SR), L.length - i0);
  var base = P.base || 205, ph = HAT_R.map(function () { return rnd(); });
  var bp = new SVF(), hp1 = new SVF(), hp2 = new SVF(), lp = new SVF();
  bp.set(P.bp || 9000, P.bpq || 0.9); hp1.set(P.hp || 6500, 0.7); hp2.set(P.hp || 6500, 0.7); lp.set(P.lp || 12500, 0.7);
  var g = panGains(P.pan || 0), v = nt.v, metal = P.metal === undefined ? 1 : P.metal, noise = P.noise === undefined ? 0.4 : P.noise;
  for (var i = 0; i < n; i++) {
    var t = i / SR, s = 0;
    for (var k = 0; k < 6; k++) {
      var f = base * HAT_R[k], dt = f / SR;
      s += sqBlep(ph[k], dt); ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1;
    }
    var x = s * 0.18 * metal + (rnd() * 2 - 1) * noise;
    bp.proc(x); hp1.proc(bp.bp * bp.k); hp2.proc(hp1.hp); lp.proc(hp2.hp);
    var e = (t < 0.0004 ? t / 0.0004 : 1) * Math.exp(-t / dec);
    if (t > choke) e *= Math.max(0, 1 - (t - choke) / 0.02);
    var y = lp.lp * e * v * endFade(i, n, 64);
    L[i0 + i] += y * g[0]; R[i0 + i] += y * g[1];
  }
};

V.shaker = function (L, R, i0, nt, P, rnd) {
  var att = P.att || 0.008, dec = P.dec || 0.05;
  var n = Math.min(Math.floor((att + dec * 6) * SR), L.length - i0);
  var bp = new SVF(), hp = new SVF(), lp = new SVF(); bp.set(P.fc || 6500, P.q || 1.2); hp.set(P.hp || 3500, 0.7); lp.set(11000, 0.7);
  var g = panGains(P.pan || 0), v = nt.v;
  for (var i = 0; i < n; i++) {
    var t = i / SR, e = t < att ? Math.pow(t / att, 2) : Math.exp(-(t - att) / dec);
    bp.proc(rnd() * 2 - 1); hp.proc(bp.bp * bp.k); lp.proc(hp.hp);
    var y = lp.lp * e * v * (0.85 + 0.3 * rnd()) * endFade(i, n, 64);
    L[i0 + i] += y * g[0]; R[i0 + i] += y * g[1];
  }
};

V.ride = function (L, R, i0, nt, P, rnd) {
  var dec = P.dec || 0.8, n = Math.min(Math.floor(dec * 5 * SR), L.length - i0);
  var base = P.base || 330, ph = HAT_R.map(function () { return rnd(); });
  var bp = new SVF(), hp = new SVF(); bp.set(P.bp || 7000, 0.6); hp.set(P.hp || 4200, 0.7);
  var bells = [3520, 4699, 5274], bph = [0, 0, 0];   // A7, D8, E8 — tuned to key
  var g = panGains(P.pan || 0.3), v = nt.v;
  for (var i = 0; i < n; i++) {
    var t = i / SR, s = 0;
    for (var k = 0; k < 6; k++) { var dt = base * HAT_R[k] / SR; s += sqBlep(ph[k], dt); ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1; }
    var x = s * 0.16 + (rnd() * 2 - 1) * 0.25;
    bp.proc(x); hp.proc(bp.bp * bp.k);
    var bell = 0; for (k = 0; k < 3; k++) { bph[k] += TAU * bells[k] / SR; bell += Math.sin(bph[k]); }
    var e = (t < 0.0006 ? t / 0.0006 : 1) * Math.exp(-t / dec);
    var y = (hp.hp * e + bell * 0.05 * Math.exp(-t / 0.25)) * v * endFade(i, n, 200);
    L[i0 + i] += y * g[0]; R[i0 + i] += y * g[1];
  }
};

V.crash = function (L, R, i0, nt, P, rnd) {
  var dec = P.dec || 1.4, n = Math.min(Math.floor(dec * 4 * SR), L.length - i0);
  var base = P.base || 420;
  for (var ch = 0; ch < 2; ch++) {
    var B = ch ? R : L, ph = HAT_R.map(function () { return rnd(); });
    var hp = new SVF(), lp = new SVF(); hp.set(P.hp || 2800, 0.7); lp.set(P.lp || 12000, 0.7);
    for (var i = 0; i < n; i++) {
      var t = i / SR, s = 0;
      for (var k = 0; k < 6; k++) { var dt = base * (ch ? 1.013 : 1) * HAT_R[k] / SR; s += sqBlep(ph[k], dt); ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1; }
      var x = s * 0.12 + (rnd() * 2 - 1) * 0.5;
      hp.proc(x); lp.proc(hp.hp);
      var e = (t < 0.001 ? t / 0.001 : 1) * (0.55 * Math.exp(-t / 0.08) + 0.45 * Math.exp(-t / dec));
      B[i0 + i] += lp.lp * e * nt.v * endFade(i, n, 400);
    }
  }
};

// rim: two tones tuned to the key (defaults A6 / E5)
V.rim = function (L, R, i0, nt, P, rnd) {
  var n = Math.min(Math.floor(0.08 * SR), L.length - i0);
  var f1 = P.f1 || 1760, f2 = P.f2 || 659.26, p1 = 0, p2 = 0, hp = new SVF(); hp.set(3000, 0.7);
  var g = panGains(P.pan || 0), v = nt.v;
  for (var i = 0; i < n; i++) {
    var t = i / SR; p1 += TAU * f1 / SR; p2 += TAU * f2 / SR;
    hp.proc(rnd() * 2 - 1);
    var y = (Math.sin(p1) * Math.exp(-t / 0.009) * 0.6 + Math.sin(p2) * Math.exp(-t / 0.018) * 0.7 + hp.hp * Math.exp(-t / 0.0015) * 0.5);
    y = ftanh(y * 1.5) * v * endFade(i, n, 64);
    L[i0 + i] += y * g[0]; R[i0 + i] += y * g[1];
  }
};

// tuned hand percussion / toms: pitch settles onto an in-key note
V.drum = function (L, R, i0, nt, P, rnd) {
  var dec = P.dec || 0.18, n = Math.min(Math.floor((dec * 6 + 0.02) * SR), L.length - i0);
  var f = mtof(nt.n), ph = 0, bend = P.bend || 0.3, bt = P.bendT || 0.012;
  var bp = new SVF(); bp.set(P.slapF || 2200, 1.4);
  var g = panGains(nt.pan !== undefined ? nt.pan : (P.pan || 0)), v = nt.v;
  for (var i = 0; i < n; i++) {
    var t = i / SR;
    ph += TAU * f * (1 + bend * Math.exp(-t / bt)) / SR;
    bp.proc(rnd() * 2 - 1);
    var y = Math.sin(ph) * (t < 0.001 ? t / 0.001 : 1) * Math.exp(-t / dec) + bp.bp * bp.k * (P.slap || 0.3) * Math.exp(-t / 0.006);
    y = ftanh(y * (P.drive || 1.2)) * v * endFade(i, n, 128);
    L[i0 + i] += y * g[0]; R[i0 + i] += y * g[1];
  }
};

V.boom = function (L, R, i0, nt, P, rnd) {
  var dec = P.dec || 0.9, n = Math.min(Math.floor(dec * 5 * SR), L.length - i0);
  var f = mtof(nt.n), ph = 0, lp = new SVF(); lp.set(400, 0.7);
  for (var i = 0; i < n; i++) {
    var t = i / SR; ph += TAU * f / SR;
    lp.proc(rnd() * 2 - 1);
    var y = Math.sin(ph) * (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t / dec) + lp.lp * 0.6 * Math.exp(-t / 0.03);
    y = ftanh(y * 1.4) * nt.v * endFade(i, n, 500);
    L[i0 + i] += y; R[i0 + i] += y;
  }
};

// noise riser: resonant band sweep, rising level; nt.d = length
V.riser = function (L, R, i0, nt, P, rnd) {
  var n = Math.min(Math.floor(nt.d * SR), L.length - i0);
  var f0 = P.f0 || 300, f1 = P.f1 || 9000, q = P.q || 2.5, curve = P.curve || 1.6;
  for (var ch = 0; ch < 2; ch++) {
    var B = ch ? R : L, bp = new SVF(), hp = new SVF(); hp.set(150, 0.7);
    for (var i = 0; i < n; i++) {
      var x = i / n;
      if ((i & 31) === 0) bp.set(f0 * Math.pow(f1 / f0, Math.pow(x, curve)) * (ch ? 1.04 : 0.96), q);
      bp.proc(rnd() * 2 - 1); hp.proc(bp.bp * bp.k);
      var e = Math.pow(x, P.shape || 2) * (i > n - 120 ? (n - i) / 120 : 1);
      B[i0 + i] += (hp.hp * 0.8 + bp.lp * 0.0) * e * nt.v;
    }
  }
};

// ---- mono synths (bass, acid): continuous voice with glide, accent, retrigger ----
V.mono = function (L, R, notes, P, rnd, ctx) {
  if (!notes.length) return;
  var cutF = autoFn(P.cut || 400, true), resF = autoFn(P.res === undefined ? 0.2 : P.res, false), envF = autoFn(P.envOct === undefined ? 2 : P.envOct, false);
  var lad = new Ladder(), osc = 0, osc2 = 0.5, sub = 0;
  var glide = P.glide || 0.05, ga = 1 - Math.exp(-1 / (SR * glide / 3));
  var att = P.att || 0.002, rel = P.rel || 0.02, adec = P.adec || 0.3, sus = P.sus === undefined ? 0.7 : P.sus;
  var envDec = P.envDec || 0.15, accDec = P.accDec || 0.09;
  var cAtt = 1 - Math.exp(-1 / (SR * att * 0.5)), cTrk = 1 - Math.exp(-1 / (SR * 0.002)), cRel = 1 - Math.exp(-1 / (SR * rel));
  var curF = mtof(notes[0].n), tgtF = curF, amp = 0, fenv = 0, idx = -1, gate = false, acc = 0, accSm = 0, vel = 1;
  var start = Math.floor(notes[0].t * SR), lastEnd = Math.floor((notes[notes.length - 1].t + notes[notes.length - 1].d) * SR);
  var end = Math.min(L.length, lastEnd + Math.floor((rel * 8 + 0.02) * SR));
  var t0 = 0, cut = 400, res = 0.2, envOct = 2, drive = P.drive || 1, dn = Math.tanh(drive);
  var hp = new SVF(); hp.set(P.hp || 25, 0.7);
  var mixSaw = P.saw === undefined ? 1 : P.saw, mixSq = P.sq || 0, mixSub = P.sub || 0, pw = P.pw || 0.5;
  for (var i = start; i < end; i++) {
    // note events
    while (idx + 1 < notes.length && i >= Math.floor(notes[idx + 1].t * SR)) {
      idx++; var nt = notes[idx];
      tgtF = mtof(nt.n); vel = nt.v;
      acc = nt.acc ? 1 : 0;
      if (!nt.slide || !gate) { t0 = i; fenv = 1; if (!nt.slide) curF = gate && P.legatoGlide ? curF : tgtF; }
      gate = true;
    }
    if (idx >= 0) {
      var cn = notes[idx];
      if (i >= Math.floor((cn.t + cn.d) * SR)) gate = false;
    }
    curF += (tgtF - curF) * ga;
    var t = (i - t0) / SR;
    // envelopes
    var aTarget = gate ? (t < att ? 1 : sus + (1 - sus) * Math.exp(-(t - att) / adec)) : 0;
    amp += (aTarget - amp) * (gate ? (t < att ? cAtt : cTrk) : cRel);
    fenv *= Math.exp(-1 / ((acc ? accDec : envDec) * SR));
    accSm += ((acc ? 1 : 0) * fenv - accSm) * 0.002;
    if ((i & 15) === 0) { var ts = i / SR; cut = cutF(ts); res = resF(ts); envOct = envF(ts); }
    // oscillators
    var dt = curF / SR;
    var s = 0;
    if (mixSaw) s += sawBlep(osc, dt) * mixSaw;
    if (mixSq) { var y2 = (osc2 < pw ? 1 : -1) + blep(osc2, dt); var q2 = osc2 + 1 - pw; if (q2 >= 1) q2 -= 1; y2 -= blep(q2, dt); s += y2 * mixSq; }
    osc += dt; if (osc >= 1) osc -= 1; osc2 += dt; if (osc2 >= 1) osc2 -= 1;
    sub += TAU * curF / SR;
    var fc = cut * Math.pow(2, envOct * fenv * (0.6 + 0.4 * vel) + (acc ? (P.accOct || 1) * fenv : 0) + accSm * 0.8);
    var y = lad.proc(s * 0.5, Math.min(fc, 16000), res);
    y += Math.sin(sub) * mixSub;
    y = Math.tanh(y * drive) / dn;
    y = hp.proc(y);
    y *= amp * vel * (acc ? (P.accAmp || 1.35) : 1);
    L[i] += y; R[i] += y;
  }
};

// ---- electric piano (FM tine model) ----
V.ep = function (L, R, i0, nt, P, rnd, ctx) {
  var f = mtof(nt.n), d = nt.d, rel = P.rel || 0.3;
  var n = Math.min(Math.floor((d + rel * 2.5) * SR), L.length - i0);
  var v = nt.v, pc = 0, pm = rnd(), pc2 = 0, pm2 = 0, det = 1 + (rnd() - 0.5) * 0.0012;
  var tau = (P.dec || 2.2) * Math.pow(261.6 / f, 0.45);
  var I0 = (P.idx || 1.6) * Math.pow(v, 1.4) / TAU, idec = P.idec || 0.35, tine = (P.tine || 0.25) * v;
  var tremR = P.tremRate || 4.6, tremD = P.trem === undefined ? 0.35 : P.trem;
  var kI = Math.exp(-1 / (SR * idec)), kT = Math.exp(-1 / (SR * 0.02)), kB = Math.exp(-1 / (SR * 0.12)), kA = Math.exp(-1 / (SR * tau)), kR = Math.exp(-3 / (SR * rel));
  var eI = 1, eT = 1, eB = 1, eA = 1, gL = 1, gR = 1, bellN = Math.floor(0.7 * SR), dS = Math.floor(d * SR), fadeS = n - 200;
  var wc = f / SR, wm = wc * det, w14 = wc * 14, base = 0.25 / TAU, bI = 1.4 * v / TAU;
  for (var i = 0; i < n; i++) {
    if ((i & 31) === 0) { panInto(Math.sin(TAU * tremR * (i0 + i) / SR) * tremD); gL = PG[0] * 0.7; gR = PG[1] * 0.7; }
    pm += wm; pc += wc;
    var y = fsin(pc + (I0 * eI + base) * fsin(pm));
    eI *= kI;
    if (i < bellN) { pm2 += w14; pc2 += wc; y += fsin(pc2 + bI * eT * fsin(pm2)) * tine * eB; eT *= kT; eB *= kB; }
    var a = (i < 66 ? i / 66 : 1) * eA; eA *= kA;
    if (i > dS) eA *= kR;
    if (i > fadeS) a *= (n - i) / 200;
    y *= a * v;
    L[i0 + i] += y * gL; R[i0 + i] += y * gR;
  }
  if (pc > 1e6) pc = 0;
};

// ---- supersaw pad ----
V.pad = function (L, R, i0, nt, P, rnd, ctx) {
  var f = mtof(nt.n), d = nt.d, att = nt.att || P.att || 0.3, rel = P.rel || 0.5;
  var n = Math.min(Math.floor((d + rel * 4) * SR), L.length - i0);
  var N = P.voices || 7, det = P.det || 18, width = P.width === undefined ? 0.9 : P.width;
  var ph = [], fr = [], gl = [], gr = [];
  for (var k = 0; k < N; k++) {
    var x = N === 1 ? 0 : (k / (N - 1)) * 2 - 1;
    ph.push(rnd()); fr.push(f * Math.pow(2, det * x * (0.85 + 0.3 * rnd()) / 1200));
    var g = panGains(x * width * (k % 2 ? 1 : -1)); gl.push(g[0]); gr.push(g[1]);
  }
  var cutF = autoFn(P.cut || 2000, true), lpL = new SVF(), lpR = new SVF(), lp2L = new SVF(), lp2R = new SVF();
  var q = P.q || 0.7, v = nt.v, cut = 2000;
  for (var i = 0; i < n; i++) {
    var t = i / SR, sl = 0, sr = 0;
    for (k = 0; k < N; k++) {
      var dt = fr[k] / SR, s = sawBlep(ph[k], dt); ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1;
      sl += s * gl[k]; sr += s * gr[k];
    }
    if ((i & 31) === 0) { cut = cutF((i0 + i) / SR); lpL.set(cut, q); lpR.set(cut, q); lp2L.set(cut * 1.5, 0.6); lp2R.set(cut * 1.5, 0.6); }
    var a = t < att ? Math.pow(t / att, 1.5) : 1;
    if (t > d) a *= Math.exp(-(t - d) / (rel / 3));
    a *= v / Math.sqrt(N) * endFade(i, n, 300);
    L[i0 + i] += lp2L.proc(lpL.proc(sl)) * a; R[i0 + i] += lp2R.proc(lpR.proc(sr)) * a;
  }
};

// ---- detuned-saw pluck (arps) ----
V.pluck = function (L, R, i0, nt, P, rnd, ctx) {
  var f = mtof(nt.n), d = nt.d, rel = P.rel || 0.06, dec = P.dec || 0.25;
  var n = Math.min(Math.floor((d + rel * 6) * SR), L.length - i0);
  var det = P.det || 9, ph = [rnd(), rnd(), rnd()], sq = rnd();
  var fr = [f, f * Math.pow(2, det / 1200), f * Math.pow(2, -det / 1200)];
  var cutF = autoFn(P.cut || 1500, true), envOct = P.envOct || 2.5, envDec = P.envDec || 0.08, q = P.q || 1;
  var lpL = new SVF(), lpR = new SVF(), v = nt.v, base = cutF(nt.t);
  var mixSq = P.sq || 0.3;
  panInto(clamp((nt.n - 64) / 12 * (P.spread || 0), -0.8, 0.8)); var gl = PG[0], gr = PG[1];
  for (var i = 0; i < n; i++) {
    var t = i / SR;
    var s0 = 0, sl, sr;
    for (var k = 0; k < 3; k++) { var dt = fr[k] / SR; var s = sawBlep(ph[k], dt); ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1; if (k === 0) s0 = s; else if (k === 1) sl = s; else sr = s; }
    var dts = f * 0.5 / SR, sqv = sqBlep(sq, dts) * mixSq; sq += dts; if (sq >= 1) sq -= 1;
    if ((i & 15) === 0) { var fc = base * Math.pow(2, envOct * v * Math.exp(-t / envDec)); lpL.set(fc, q); lpR.set(fc * 1.03, q); }
    var a = (t < 0.001 ? t / 0.001 : 1) * Math.exp(-t / dec);
    if (t > d) a *= Math.exp(-(t - d) / (rel / 3));
    a *= v * endFade(i, n, 64);
    L[i0 + i] += lpL.proc(s0 * 0.6 + sl * 0.8 + sqv) * a * 0.6 * gl;
    R[i0 + i] += lpR.proc(s0 * 0.6 + sr * 0.8 + sqv) * a * 0.6 * gr;
  }
};

// ---- FM pluck (tech-house hook): woody attack, round body ----
V.fmpluck = function (L, R, i0, nt, P, rnd) {
  var f = mtof(nt.n), d = nt.d, rel = P.rel || 0.05, dec = P.dec || 0.18;
  var n = Math.min(Math.floor((d + rel * 6) * SR), L.length - i0);
  var ratio = P.ratio || 2, I0 = (P.idx || 3) * nt.v, idec = P.idec || 0.05, det = P.det || 6;
  var pcL = 0, pcR = 0, pm = 0, fl = f * Math.pow(2, -det / 1200), fr = f * Math.pow(2, det / 1200), ps = 0;
  var lp = new SVF(); lp.set(P.lp || 5000, 0.7); var lp2 = new SVF(); lp2.set(P.lp || 5000, 0.7);
  for (var i = 0; i < n; i++) {
    var t = i / SR;
    pm += TAU * f * ratio / SR; pcL += TAU * fl / SR; pcR += TAU * fr / SR; ps += TAU * f / SR;
    var I = I0 * Math.exp(-t / idec) + (P.idx0 || 0.3);
    var mod = I * Math.sin(pm);
    var a = (t < 0.0012 ? t / 0.0012 : 1) * Math.exp(-t / dec);
    if (t > d) a *= Math.exp(-(t - d) / (rel / 3));
    a *= nt.v * endFade(i, n, 64);
    var sub = Math.sin(ps) * (P.sub || 0.25);
    L[i0 + i] += lp.proc(Math.sin(pcL + mod) + sub) * a; R[i0 + i] += lp2.proc(Math.sin(pcR + mod) + sub) * a;
  }
};

// ---- chord stab: saws through an enveloped filter ----
V.stab = function (L, R, i0, nt, P, rnd) {
  var f = mtof(nt.n), d = nt.d, rel = P.rel || 0.1, dec = P.dec || 0.25, sus = P.sus || 0, att = P.att || 0.002;
  var n = Math.min(Math.floor((d + rel * 6) * SR), L.length - i0);
  var det = P.det || 10, ph = [rnd(), rnd(), rnd()], fr = [f, f * Math.pow(2, det / 1200), f * Math.pow(2, -det / 1200)], bph = rnd();
  var lpL = new SVF(), lpR = new SVF(), base = P.cut || 500, envOct = P.envOct || 2.5, envDec = P.envDec || 0.07, q = P.q || 1.2, body = P.body || 0;
  panInto(clamp((nt.n - 62) / 14 * (P.spread || 0), -0.8, 0.8)); var gl = PG[0], gr = PG[1];
  for (var i = 0; i < n; i++) {
    var t = i / SR, s0, s1, s2;
    var dt = fr[0] / SR; s0 = sawBlep(ph[0], dt); ph[0] += dt; if (ph[0] >= 1) ph[0] -= 1;
    dt = fr[1] / SR; s1 = sawBlep(ph[1], dt); ph[1] += dt; if (ph[1] >= 1) ph[1] -= 1;
    dt = fr[2] / SR; s2 = sawBlep(ph[2], dt); ph[2] += dt; if (ph[2] >= 1) ph[2] -= 1;
    bph += f / SR; var bs = body ? fsin(bph) * body : 0;
    if ((i & 15) === 0) { var fc = base * Math.pow(2, envOct * nt.v * Math.exp(-t / envDec)); lpL.set(fc, q); lpR.set(fc * 1.02, q); }
    var a = (t < att ? t / att : 1) * (sus + (1 - sus) * Math.exp(-t / dec));
    if (t > d) a *= Math.exp(-(t - d) / (rel / 3));
    a *= nt.v * endFade(i, n, 96);
    L[i0 + i] += (lpL.proc(s0 * 0.5 + s1) * 0.5 + bs) * a * gl; R[i0 + i] += (lpR.proc(s0 * 0.5 + s2) * 0.5 + bs) * a * gr;
  }
};

// ---- house organ stab: additive drawbar harmonics with key click ----
V.organ = function (L, R, i0, nt, P, rnd) {
  var f = mtof(nt.n), d = nt.d, rel = P.rel || 0.06, dec = P.dec || 0.35, sus = P.sus === undefined ? 0.25 : P.sus;
  var n = Math.min(Math.floor((d + rel * 6) * SR), L.length - i0);
  var H = P.harm || [1, 2, 3, 4, 6, 8], A = P.amps || [1, 0.7, 0.45, 0.3, 0.16, 0.1], K = H.length, ph = [], w = [];
  for (var k = 0; k < K; k++) { ph.push(rnd()); w.push(f * H[k] < 17000 ? f * H[k] / SR : 0); }
  var ck = new SVF(); ck.set(P.clickF || 2600, 1.1);
  panInto(clamp((nt.n - 62) / 14 * (P.spread || 0.5), -0.8, 0.8)); var gl = PG[0], gr = PG[1];
  for (var i = 0; i < n; i++) {
    var t = i / SR, s = 0;
    for (k = 0; k < K; k++) { if (w[k]) { s += A[k] * fsin(ph[k]); ph[k] += w[k]; if (ph[k] > 1) ph[k] -= 1; } }
    var c = 0; if (t < 0.012) { ck.proc(rnd() * 2 - 1); c = ck.bp * ck.k * (P.click || 0.25) * Math.exp(-t / 0.0025); }
    var a = (t < 0.0015 ? t / 0.0015 : 1) * (sus + (1 - sus) * Math.exp(-t / dec));
    if (t > d) a *= Math.exp(-(t - d) / (rel / 3));
    var y = (s * 0.3 + c) * a * nt.v * endFade(i, n, 96);
    L[i0 + i] += y * gl; R[i0 + i] += y * gr;
  }
};

// ---- vinyl texture: sparse crackle clicks, rare pops, soft hiss; fades in and out ----
V.vinyl = function (L, R, i0, nt, P, rnd) {
  var n = Math.min(Math.floor(nt.d * SR), L.length - i0), rate = (P.rate || 8) / SR, popRate = (P.pops || 0.4) / SR, hiss = P.hiss === undefined ? 0.06 : P.hiss;
  var fadeN = Math.floor(0.3 * SR);
  for (var ch = 0; ch < 2; ch++) {
    var B = ch ? R : L, hp = new SVF(), lp = new SVF(), hs = new SVF(), pl = new SVF(); hp.set(1500, 0.7); lp.set(8500, 0.7); hs.set(5000, 0.6); pl.set(900, 0.8);
    var c = 0, pop = 0;
    for (var i = 0; i < n; i++) {
      if (rnd() < rate) c += (0.25 + rnd() * 0.75) * (rnd() < 0.5 ? 1 : -1);
      if (rnd() < popRate) pop += (0.5 + rnd() * 0.5) * (rnd() < 0.5 ? 1 : -1);
      c *= 0.82; pop *= 0.985;
      hp.proc(c); lp.proc(hp.hp); pl.proc(pop); hs.proc(rnd() * 2 - 1);
      var y = lp.lp + pl.bp * 0.6 + hs.bp * hiss;
      var e = Math.min(1, i / fadeN, (n - i) / fadeN);
      B[i0 + i] += y * e * nt.v;
    }
  }
};

// ---- formant voice (vocal-chop style lead): glottal-ish source through vowel resonances ----
var VOW = {
  a: { f: [800, 1150, 2800, 3500], a: [0, -4, -20, -36], b: [80, 90, 120, 130] },
  e: { f: [400, 1600, 2700, 3300], a: [0, -24, -30, -35], b: [60, 80, 120, 150] },
  i: { f: [350, 1700, 2700, 3700], a: [0, -20, -30, -36], b: [50, 100, 120, 150] },
  o: { f: [450, 800, 2830, 3500], a: [0, -9, -16, -28], b: [70, 80, 100, 130] },
  u: { f: [325, 700, 2530, 3500], a: [0, -12, -30, -40], b: [50, 60, 170, 180] }
};
V.vox = function (L, R, i0, nt, P, rnd) {
  var f0 = mtof(nt.n), d = nt.d, rel = P.rel || 0.08, att = P.att || 0.014;
  var n = Math.min(Math.floor((d + rel * 5) * SR), L.length - i0);
  var va = VOW[(nt.vw || 'a')[0]], vb = VOW[(nt.vw || 'aa')[1] || (nt.vw || 'a')[0]];
  var bw = P.bwScale || 2.6, tilt = new SVF(), tilt2 = new SVF(); tilt.set(P.tilt || 1400, 0.6); tilt2.set(4200, 0.6);
  var fm = [new SVF(), new SVF(), new SVF(), new SVF()], gains = [0, 0, 0, 0];
  var breath = new SVF(); breath.set(2500, 0.8);
  var ph = 0, ph2 = 0.37, vibPh = rnd() * TAU, jit = 0, v = nt.v, scoop = P.scoop === undefined ? -35 : P.scoop;
  var vibD = P.vib === undefined ? 20 : P.vib;
  var mlen = Math.max(0.06, d * 0.85);
  for (var i = 0; i < n; i++) {
    var t = i / SR;
    if ((i & 31) === 0) {
      var x = clamp((t - 0.02) / mlen, 0, 1); x = x * x * (3 - 2 * x);
      for (var k = 0; k < 4; k++) {
        var ff = va.f[k] * Math.pow(vb.f[k] / va.f[k], x) * (P.fshift || 1);
        var bb = (va.b[k] + (vb.b[k] - va.b[k]) * x) * bw;
        fm[k].set(ff, ff / bb);
        gains[k] = db(va.a[k] + (vb.a[k] - va.a[k]) * x);
      }
      jit += (rnd() - 0.5) * 0.6; jit *= 0.97;
    }
    var vibAmt = vibD * clamp((t - 0.16) / 0.25, 0, 1);
    var cents = scoop * Math.exp(-t / 0.035) + vibAmt * Math.sin(vibPh) + jit;
    vibPh += TAU * 5.4 / SR;
    var f = f0 * Math.pow(2, cents / 1200), dt = f / SR;
    var src = sawBlep(ph, dt) * 0.7 + sawBlep(ph2, dt * 1.0035) * 0.3; ph += dt; if (ph >= 1) ph -= 1; ph2 += dt * 1.0035; if (ph2 >= 1) ph2 -= 1;
    src = tilt2.proc(tilt.proc(src)) * 2.2;
    breath.proc(rnd() * 2 - 1);
    var ex = src + breath.bp * (P.breath || 0.05);
    var y = 0;
    for (k = 0; k < 4; k++) { fm[k].proc(ex); y += fm[k].bp * fm[k].k * gains[k]; }
    var a = t < att ? Math.sin(0.5 * Math.PI * t / att) : 1;
    if (t > d) a *= Math.exp(-(t - d) / (rel / 3));
    y = ftanh(y * 1.2) * a * v * endFade(i, n, 128);
    L[i0 + i] += y; R[i0 + i] += y;
  }
};
