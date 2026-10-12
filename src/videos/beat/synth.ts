// Deterministic dance-music synthesizer and mastering chain. Same score and plan give the same samples.
// No randomness except seeded generators, no clocks, no platform audio APIs, so the editor worker,
// the export server, and source packages produce identical WAVs.
import {SAMPLE_RATE, beatSeconds, durationInSamples, type BeatScore} from './score.ts';
import {rng, type BeatPlan, type Note} from './plan.ts';

export const TARGET_LUFS = -14;
export const CEILING_DBTP = -1;
/** Sample-peak ceiling. Low enough that AAC encoding overshoot stays under -1 dBTP. */
const LIMIT = 10 ** (-2.2 / 20);
export type Stereo = {left: Float32Array; right: Float32Array};

const SR = SAMPLE_RATE;
const TAU = Math.PI * 2;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
const env = (t: number, rate: number) => Math.exp(-t * rate);

// Topology-preserving state-variable filter. mode 0 low-pass, 1 band-pass, 2 high-pass.
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x: number, fc: number, q: number, mode: 0 | 1 | 2) => {
    const g = Math.tan(Math.PI * Math.min(Math.max(fc, 20), SR * 0.45) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const v3 = x - ic2;
    const v1 = a1 * ic1 + g * a1 * v3;
    const v2 = ic2 + g * v1;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return mode === 0 ? v2 : mode === 1 ? v1 : x - k * v1 - v2;
  };
}
// Band-limited sawtooth and square (polyBLEP).
function blep(t: number, dt: number) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function saw() {
  let p = 0;
  return (f: number) => { const dt = f / SR; p += dt; if (p >= 1) p -= 1; return 2 * p - 1 - blep(p, dt); };
}
function square() {
  let p = 0;
  return (f: number) => {
    const dt = f / SR; p += dt; if (p >= 1) p -= 1;
    let v = p < 0.5 ? 1 : -1;
    v += blep(p, dt); v -= blep((p + 0.5) % 1, dt);
    return v;
  };
}
function sine() { let p = 0; return (f: number) => { p += f / SR; if (p >= 1) p -= 1; return Math.sin(TAU * p); }; }

type Voice = {length: number; gain: number; pan: number; send: number; echo?: number; stereo?: boolean; make: (ch: number) => (t: number) => number};

// One mono or stereo voice per note. Lengths are seconds; t is seconds since the note start.
function voiceFor(s: BeatScore, n: Note, seed: number, prevBass: number | null): Voice {
  const d = s.sound;
  const len = n.beats * beatSeconds(s);
  const f = n.notes.length ? mtof(n.notes[0]) : 0;
  const noise = rng(seed);
  const white = () => noise() * 2 - 1;
  switch (n.instrument) {
    case 'kick': {
      const body = d.kick.pitch;
      const decay = 5 + (1 - d.kick.decay) * 9;
      return {length: 0.6, gain: 1.05, pan: 0, send: 0, make: () => {
        let p = 0;
        const hp = svf();
        return (t) => {
          p += (body + body * 3.2 * env(t, 34)) / SR;
          const tone = Math.sin(TAU * p) * env(t, decay) * Math.min(1, t / 0.0015);
          const click = t < 0.004 ? hp(white(), 3000, 0.7, 2) * d.kick.punch * 0.6 * (1 - t / 0.004) : 0;
          return Math.tanh((tone + click) * 1.6) / Math.tanh(1.6);
        };
      }};
    }
    case 'clap': return {length: 0.4, gain: 0.42, pan: 0, send: 0.25, make: () => {
      const bp = svf();
      return (t) => {
        const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o && t < o + 0.01 ? env(t - o, 140) : 0), 0);
        return bp(white(), 1250, 1.4, 1) * (bursts + 0.55 * (t > 0.022 ? env(t - 0.022, 16) : 0)) * 2.2;
      };
    }};
    case 'snare': return {length: 0.35, gain: 0.42, pan: 0, send: 0.2, make: () => {
      const hp = svf(); const tone = sine();
      return (t) => tone(185 * (1 + 0.5 * env(t, 40))) * env(t, 22) * 0.55 + hp(white(), 1800, 0.7, 2) * env(t, 15) * 0.9;
    }};
    case 'rim': return {length: 0.08, gain: 0.3, pan: 0.15, send: 0.15, make: () => {
      const a = sine(); const bp = svf();
      return (t) => (a(1700) * 0.6 + bp(white(), 2600, 3, 1) * 1.2) * env(t, 70);
    }};
    case 'hat': case 'openhat': {
      const open = n.instrument === 'openhat';
      return {length: open ? 0.4 : 0.09, gain: open ? 0.13 : 0.14, pan: 0.22, send: 0.05, make: () => {
        const hp = svf(); const bp = svf();
        const fc = 7000 + d.hats.tone * 4000;
        return (t) => { const x = hp(white(), fc, 0.7, 2); return (x * 0.7 + bp(x, 10000, 2, 1) * 0.6) * env(t, open ? 9 : 55); };
      }};
    }
    case 'shaker': return {length: 0.08, gain: 0.07, pan: -0.3, send: 0.05, make: () => {
      const bp = svf();
      return (t) => bp(white(), 6500, 1.2, 1) * Math.min(1, t / 0.006) * env(t, 45) * 2;
    }};
    case 'conga': {
      const base = [210, 290, 380][n.notes[0] ?? 0] ?? 290;
      return {length: 0.3, gain: 0.26, pan: (n.notes[0] ?? 1) - 1 ? 0.35 : -0.25, send: 0.2, make: () => {
        const o = sine();
        return (t) => o(base * (1 + 0.25 * env(t, 60))) * env(t, 14);
      }};
    }
    case 'cowbell': return {length: 0.3, gain: 0.08, pan: -0.2, send: 0.2, make: () => {
      const a = square(); const b = square(); const bp = svf();
      return (t) => bp(a(545) + b(815), 900, 2.5, 1) * env(t, 12);
    }};
    case 'tom': return {length: 0.5, gain: 0.38, pan: 0.1, send: 0.2, make: () => {
      const o = sine();
      return (t) => o(120 * (1 + 0.6 * env(t, 18))) * env(t, 7.5);
    }};
    case 'bass': {
      const pattern = d.bass.pattern;
      const from = n.slide && prevBass ? mtof(prevBass) : f;
      return {length: len + 0.04, gain: pattern === 'sub' ? 0.5 : 0.36, pan: 0, send: 0, make: () => {
        const osc = saw();
        const sub = sine();
        const lp = svf();
        const res = pattern === 'acid' ? 4 + d.bass.resonance * 10 : 0.7 + d.bass.resonance * 2;
        const cut = 120 + d.bass.cutoff * 1400;
        return (t) => {
          const freq = n.slide ? from + (f - from) * Math.min(1, t / 0.06) : f;
          const amp = Math.min(1, t / 0.003) * (t > len ? Math.max(0, 1 - (t - len) / 0.04) : 1);
          const fenv = (n.accent ? 2.2 : 1) * env(t, pattern === 'acid' ? 9 : 14);
          const fc = cut * (1 + fenv * (pattern === 'acid' ? 6 : 3));
          const tone = pattern === 'sub' ? sub(freq) + 0.15 * sub(freq * 2) : lp(osc(freq) * 0.8, fc, res, 0) + sub(freq) * 0.45;
          return Math.tanh(tone * (1 + d.bass.drive * 3)) * amp;
        };
      }};
    }
    case 'chord': {
      const kind = n.kind === 'groove' ? d.chords.voice : 'stab';
      const freqs = n.notes.map(mtof);
      const bright = d.chords.brightness;
      const tail = kind === 'pad' ? 0.6 : kind === 'organ' ? 0.08 : 0.18;
      const gain = {stab: 0.07, organ: 0.06, pad: 0.05, pluck: 0.08, keys: 0.09, none: 0}[kind];
      return {length: len + tail, gain: n.kind === 'groove' ? gain : 0.1, pan: 0, send: kind === 'pad' ? 0.55 : 0.35, echo: n.kind === 'groove' ? 0 : 0.3, stereo: true, make: (ch) => {
        const det = ch ? 1.004 : 0.996;
        const oscA = freqs.map(() => saw()); const oscB = freqs.map(() => saw());
        const sines = freqs.map(() => [sine(), sine(), sine()]);
        const lp = svf();
        return (t) => {
          const gate = t > len ? Math.max(0, 1 - (t - len) / tail) : 1;
          if (kind === 'organ') {
            let v = 0;
            freqs.forEach((fr, i) => { const [a, b, c] = sines[i]; v += a(fr * det) + 0.6 * b(fr * 2) + 0.35 * c(fr * 3); });
            return v * Math.min(1, t / 0.004) * gate * (0.6 + 0.4 * env(t, 8));
          }
          if (kind === 'keys') {
            let v = 0;
            freqs.forEach((fr, i) => { v += Math.sin(TAU * fr * det * t + 1.6 * env(t, 6) * sines[i][0](fr)); });
            return v * Math.min(1, t / 0.003) * env(t, 2.2) * gate;
          }
          let v = 0;
          freqs.forEach((fr, i) => { v += oscA[i](fr * det) + oscB[i](fr * (2 - det)); });
          const attack = kind === 'pad' ? Math.min(1, t / 0.25) : Math.min(1, t / 0.003);
          const fc = kind === 'pad' ? 900 + bright * 1800 : (500 + bright * 3500) * (1 + 3 * env(t, kind === 'pluck' ? 18 : 10));
          return lp(v * 0.5, fc, 0.9, 0) * attack * gate;
        };
      }};
    }
    case 'riser': return {length: len, gain: 0.22, pan: 0, send: 0.4, stereo: true, make: () => {
      const lp = svf(); const o = sine();
      return (t) => {
        const x = Math.min(1, t / len);
        return (lp(white(), 400 + 9000 * x * x, 1.5, 1) * 1.4 + o(200 + 1400 * x * x) * 0.12) * x * x;
      };
    }};
    case 'crash': case 'impact': {
      if (n.instrument === 'crash') return {length: 2.2, gain: 0.1, pan: 0.1, send: 0.4, stereo: true, make: () => {
        const hp = svf(); const m = [square(), square(), square()];
        return (t) => (hp(white(), 5000, 0.7, 2) + 0.15 * (m[0](421) + m[1](687) + m[2](1123))) * env(t, 2.4);
      }};
      return {length: 1.8, gain: 0.7, pan: 0, send: 0.35, make: () => {
        const o = sine(); const lp = svf();
        return (t) => o(30 + 60 * env(t, 6)) * env(t, 2.3) + lp(white(), 600, 0.7, 0) * 1.6 * env(t, 9);
      }};
    }
    case 'stamp': return {length: 0.6, gain: 0.55, pan: 0, send: 0.2, make: () => {
      let p = 0; const lp = svf();
      return (t) => {
        p += 70 * (1 + 2.5 * env(t, 30)) / SR;
        return Math.sin(TAU * p) * env(t, 7) + lp(white(), 3000, 0.7, 0) * 1.4 * env(t, 55);
      };
    }};
    case 'snap': return {length: 0.12, gain: 0.35, pan: 0.1, send: 0.3, make: () => {
      const bp = svf();
      return (t) => bp(white(), 2200, 2, 1) * env(t, 60) * 2.4;
    }};
    case 'zap': return {length: 0.22, gain: 0.18, pan: -0.1, send: 0.3, echo: 0.3, make: () => {
      const o = square(); const lp = svf();
      return (t) => lp(o(150 + 2400 * env(t, 22)), 3000, 1, 0) * env(t, 12);
    }};
    case 'flap': return {length: 0.12, gain: 0.5, pan: 0, send: 0.1, make: () => {
      const bp = svf(); const o = sine();
      return (t) => bp(white(), 2400, 1.5, 1) * 1.6 * env(t, 200) + o(f / 2) * 0.4 * env(t, 45);
    }};
    case 'clatter': return {length: len, gain: 0.3, pan: 0, send: 0.05, make: () => {
      const bp = svf();
      // A run of card clicks that thins out over the flap time.
      const clicks = Array.from({length: 9}, (_, c) => len * (c / 9) ** 1.15);
      return (t) => {
        let v = 0;
        for (let c = 0; c < clicks.length; c++) { const dt = t - clicks[c]; if (dt >= 0 && dt < 0.02) v += env(dt, 260) * (1 - c / 14) * (c % 2 ? 1 : -1); }
        return bp(white() * v, 2600, 1.2, 1) * 3;
      };
    }};
    default: break;
  }
  // Pitched voices for text and list landings.
  const tonal: Record<string, Omit<Voice, 'make'> & {fn: () => (t: number) => number}> = {
    bell: {length: 1.4, gain: 0.13, pan: 0.25, send: 0.45, echo: 0.35, fn: () => (t) => Math.sin(TAU * f * t + 2.2 * env(t, 3) * Math.sin(TAU * f * 3.5 * t)) * env(t, 2.6) * Math.min(1, t / 0.002)},
    pluck: {length: 0.6, gain: 0.16, pan: -0.2, send: 0.35, echo: 0.3, fn: () => { const o = saw(); const lp = svf(); return (t) => lp(o(f), 600 + 5000 * env(t, 20), 1.2, 0) * env(t, 6) * Math.min(1, t / 0.002); }},
    marimba: {length: 0.8, gain: 0.2, pan: 0.15, send: 0.35, echo: 0.25, fn: () => (t) => (Math.sin(TAU * f * t) * env(t, 6) + 0.3 * Math.sin(TAU * f * 4 * t) * env(t, 30)) * Math.min(1, t / 0.001)},
    blip: {length: 0.15, gain: 0.08, pan: 0.2, send: 0.3, echo: 0.4, fn: () => { const o = square(); return (t) => o(f * (1 + 0.5 * env(t, 80))) * env(t, 25); }},
    keys: {length: 1.0, gain: 0.14, pan: -0.1, send: 0.35, echo: 0.25, fn: () => (t) => Math.sin(TAU * f * t + 1.8 * env(t, 5) * Math.sin(TAU * f * t)) * env(t, 3) * Math.min(1, t / 0.002)},
    lead: {length: 0.5, gain: 0.08, pan: 0, send: 0.35, echo: 0.35, fn: () => { const a = saw(); const b = saw(); const lp = svf(); return (t) => lp(a(f) + b(f * 1.006), 2400, 0.9, 0) * Math.min(1, t / 0.005) * env(t, 4); }},
    chord: {length: 0.7, gain: 0.07, pan: 0, send: 0.4, echo: 0.3, fn: () => {
      const oscs = [0, 4, 7].map(() => saw()); const lp = svf();
      return (t) => lp(oscs.reduce((v, o, i) => v + o(f * 2 ** ([0, 4, 7][i] / 12)), 0), 800 + 4000 * env(t, 12), 0.9, 0) * env(t, 5);
    }},
    stab: {length: 0.5, gain: 0.08, pan: 0, send: 0.45, echo: 0.3, fn: () => {
      const oscs = [0, 3, 7, 10].map(() => saw()); const lp = svf();
      return (t) => lp(oscs.reduce((v, o, i) => v + o(f / 2 * 2 ** ([0, 3, 7, 10][i] / 12)), 0), 700 + 5000 * env(t, 14), 1, 0) * env(t, 7);
    }},
  };
  const v = tonal[n.instrument] ?? tonal.bell;
  return {...v, make: v.fn};
}

// Freeverb-style room: parallel damped combs into series all-passes, one set per channel.
function reverb(input: Stereo, size: number) {
  const tune = SR / 44100;
  const out = {left: new Float32Array(input.left.length), right: new Float32Array(input.left.length)};
  [0, 1].forEach((ch) => {
    const x = ch ? input.right : input.left;
    const y = ch ? out.right : out.left;
    const spread = ch * 23;
    const combs = [1116, 1188, 1277, 1356, 1422, 1491].map((l) => ({buf: new Float32Array(Math.round((l + spread) * tune)), i: 0, low: 0}));
    const alls = [556, 441, 341].map((l) => ({buf: new Float32Array(Math.round((l + spread) * tune)), i: 0}));
    const fb = 0.72 + size * 0.2;
    for (let n = 0; n < x.length; n++) {
      let acc = 0;
      for (const c of combs) {
        const o = c.buf[c.i];
        c.low = o * 0.65 + c.low * 0.35;
        c.buf[c.i] = x[n] * 0.12 + c.low * fb;
        c.i = (c.i + 1) % c.buf.length;
        acc += o;
      }
      for (const a of alls) {
        const o = a.buf[a.i];
        a.buf[a.i] = acc + o * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = o - acc;
      }
      y[n] = acc;
    }
  });
  return out;
}

// Dotted-eighth ping-pong echo for text and list landings.
function echo(input: Stereo, s: BeatScore) {
  const n = input.left.length;
  const delay = Math.round(0.75 * beatSeconds(s) * SR);
  const out = {left: new Float32Array(n), right: new Float32Array(n)};
  let lowL = 0, lowR = 0;
  for (let i = 0; i < n; i++) {
    const dl = i >= delay ? out.right[i - delay] : 0;
    const dr = i >= delay ? out.left[i - delay] : 0;
    lowL = lowL * 0.6 + (input.left[i] + dl * 0.42) * 0.4;
    lowR = lowR * 0.6 + (input.right[i] + dr * 0.42) * 0.4;
    out.left[i] = lowL;
    out.right[i] = lowR;
  }
  // The dry signal is not part of the echo bus.
  for (let i = 0; i < n; i++) { out.left[i] -= input.left[i] * 0.4; out.right[i] -= input.right[i] * 0.4; }
  return out;
}

const DUCKED = new Set(['bass', 'chord']);
type Bus = {dry: Stereo; ducked: Stereo; send: Stereo; echo: Stereo};
const stereo = (n: number): Stereo => ({left: new Float32Array(n), right: new Float32Array(n)});

function renderBus(s: BeatScore, notes: Note[]): Bus {
  const n = durationInSamples(s);
  const bus: Bus = {dry: stereo(n), ducked: stereo(n), send: stereo(n), echo: stereo(n)};
  const spb = beatSeconds(s);
  let prevBass: number | null = null;
  notes.forEach((note) => {
    const start = Math.round(note.beat * spb * SR);
    const seed = (Math.round(note.beat * 960) * 2654435761 + note.instrument.length * 40503 + (note.notes[0] ?? 0) * 97 + s.sound.seed) >>> 0;
    const v = voiceFor(s, note, seed, prevBass);
    if (note.instrument === 'bass') prevBass = note.notes[0];
    const target = DUCKED.has(note.instrument) && note.kind === 'groove' ? bus.ducked : bus.dry;
    const gain = v.gain * note.velocity;
    const lg = gain * Math.min(1, 1 - v.pan);
    const rg = gain * Math.min(1, 1 + v.pan);
    const send = v.send * (0.4 + s.sound.space);
    const echoAmount = v.echo ?? 0;
    const length = Math.min(n - start, Math.ceil(v.length * SR));
    const left = v.make(0);
    const right = v.stereo ? v.make(1) : left;
    for (let i = 0; i < length; i++) {
      const t = i / SR;
      const l = left(t);
      const r = v.stereo ? right(t) : l;
      const at = start + i;
      target.left[at] += l * lg;
      target.right[at] += r * rg;
      if (send) { bus.send.left[at] += l * lg * send; bus.send.right[at] += r * rg * send; }
      if (echoAmount) { bus.echo.left[at] += l * lg * echoAmount; bus.echo.right[at] += r * rg * echoAmount; }
    }
  });
  return bus;
}

function mixBus(s: BeatScore, bus: Bus, duck: Float32Array): Stereo {
  const n = bus.dry.left.length;
  const room = reverb(bus.send, s.sound.space);
  const delay = echo(bus.echo, s);
  const out = stereo(n);
  for (let i = 0; i < n; i++) {
    out.left[i] = bus.dry.left[i] + bus.ducked.left[i] * duck[i] + room.left[i] * 0.9 + delay.left[i] * 0.8;
    out.right[i] = bus.dry.right[i] + bus.ducked.right[i] * duck[i] + room.right[i] * 0.9 + delay.right[i] * 0.8;
  }
  return out;
}

/** Render and master a plan. Gain comes from the groove alone, so list edits never move the overall level. */
export function renderBeat(s: BeatScore, plan: BeatPlan): Stereo {
  const n = durationInSamples(s);
  const groove = renderBus(s, plan.notes.filter((x) => x.kind === 'groove'));
  const events = renderBus(s, plan.notes.filter((x) => x.kind !== 'groove'));
  // Sidechain: bass and chords dip after every kick, the house pump.
  const duck = new Float32Array(n).fill(1);
  const depth = 0.25 + s.sound.pump * 0.6;
  for (const k of plan.notes) if (k.instrument === 'kick') {
    const start = Math.round(k.beat * beatSeconds(s) * SR);
    const length = Math.min(n - start, Math.round(beatSeconds(s) * SR));
    for (let i = 0; i < length; i++) {
      const t = i / SR;
      duck[start + i] = Math.min(duck[start + i], 1 - depth * (t < 0.004 ? t / 0.004 : Math.exp(-(t - 0.004) / (0.07 + beatSeconds(s) * 0.12))));
    }
  }
  const g = mixBus(s, groove, duck);
  const e = mixBus(s, events, duck);
  const base = loudness(g);
  const gain = 10 ** ((Number.isFinite(base) ? TARGET_LUFS + 0.5 - base : 0) / 20);
  const out = stereo(n);
  for (let i = 0; i < n; i++) {
    // A gentle bus saturator before the limiter, so peaks round off instead of being chopped.
    out.left[i] = Math.tanh((g.left[i] + e.left[i]) * gain * 0.9) / 0.9;
    out.right[i] = Math.tanh((g.right[i] + e.right[i]) * gain * 0.9) / 0.9;
  }
  limit(out);
  // A 2 ms fade at both ends keeps the loop point click-free.
  const fade = Math.round(0.002 * SR);
  for (let i = 0; i < fade; i++) {
    const a = i / fade;
    out.left[n - 1 - i] *= a; out.right[n - 1 - i] *= a;
  }
  // Quantize to 16-bit so the browser preview and the WAV play identical samples.
  for (const ch of [out.left, out.right]) for (let i = 0; i < n; i++) ch[i] = Math.round(ch[i] * 32767) / 32767;
  return out;
}

// ITU-R BS.1770-4 K-weighting at 48 kHz.
function kWeight(x: Float32Array) {
  const stages = [
    {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585]},
    {b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621]},
  ];
  let input: ArrayLike<number> = x;
  for (const {b, a} of stages) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const v = input[i];
      const o = b[0] * v + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1; x1 = v; y2 = y1; y1 = o;
      y[i] = o;
    }
    input = y;
  }
  return input as Float64Array;
}

/** Integrated loudness in LUFS (gated, BS.1770-4). */
export function loudness({left, right}: Stereo) {
  const l = kWeight(left);
  const r = kWeight(right);
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const powers: number[] = [];
  for (let start = 0; start + block <= l.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + block; i++) sum += l[i] * l[i] + r[i] * r[i];
    powers.push(sum / block);
  }
  const lufs = (p: number) => -0.691 + 10 * Math.log10(p);
  const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  const absolute = powers.filter((p) => lufs(p) > -70);
  if (!absolute.length) return -Infinity;
  const threshold = lufs(mean(absolute)) - 10;
  return lufs(mean(absolute.filter((p) => lufs(p) > threshold)));
}

/** True peak in dBTP, estimated with 4x windowed-sinc oversampling. */
export function truePeak({left, right}: Stereo) {
  const taps = 12;
  const phases = [0.25, 0.5, 0.75].map((frac) => {
    const kernel: number[] = [];
    for (let k = -taps + 1; k <= taps; k++) {
      const x = k - frac;
      const w = 0.5 + 0.5 * Math.cos(Math.PI * x / taps);
      kernel.push(Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x) * w);
    }
    return kernel;
  });
  let peak = 0;
  for (const ch of [left, right]) for (let i = 0; i < ch.length; i++) {
    peak = Math.max(peak, Math.abs(ch[i]));
    if (Math.abs(ch[i]) < 0.5) continue;
    for (const kernel of phases) {
      let sum = 0;
      for (let k = 0; k < kernel.length; k++) {
        const j = i + k - taps + 1;
        if (j >= 0 && j < ch.length) sum += ch[j] * kernel[k];
      }
      peak = Math.max(peak, Math.abs(sum));
    }
  }
  return 20 * Math.log10(peak || 1e-12);
}

// Look-ahead peak limiter. Gain drops before a peak and recovers smoothly after it.
function limit({left, right}: Stereo) {
  const n = left.length;
  const ahead = Math.round(0.003 * SR);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    need[i] = p > LIMIT ? LIMIT / p : 1;
  }
  // Sliding-window minimum over the look-ahead, so the gain is already down when a peak arrives.
  const target = new Float32Array(n);
  const q: number[] = [];
  let head = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (q.length > head && need[q[q.length - 1]] >= need[i]) q.pop();
    q.push(i);
    while (q[head] > i + ahead) head++;
    target[i] = need[q[head]];
  }
  const release = Math.exp(-1 / (0.08 * SR));
  let g = 1;
  for (let i = 0; i < n; i++) {
    g = target[i] < g ? target[i] : target[i] - (target[i] - g) * release;
    left[i] = Math.max(-LIMIT, Math.min(LIMIT, left[i] * g));
    right[i] = Math.max(-LIMIT, Math.min(LIMIT, right[i] * g));
  }
}

/** 16-bit PCM stereo WAV at 48 kHz. */
export function encodeWav({left, right}: Stereo): Uint8Array {
  const n = left.length;
  const bytes = new Uint8Array(44 + n * 4);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + n * 4, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, SR, true); view.setUint32(28, SR * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    view.setInt16(44 + i * 4, Math.round(left[i] * 32767), true);
    view.setInt16(46 + i * 4, Math.round(right[i] * 32767), true);
  }
  return bytes;
}

export function decodeWav(bytes: Uint8Array): Stereo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(40, true) / 4;
  const out = stereo(n);
  for (let i = 0; i < n; i++) {
    out.left[i] = view.getInt16(44 + i * 4, true) / 32767;
    out.right[i] = view.getInt16(46 + i * 4, true) / 32767;
  }
  return out;
}
