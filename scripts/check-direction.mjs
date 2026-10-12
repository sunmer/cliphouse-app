// Direction gate for music templates. The production build runs `--records` (fast, no browser):
// every music template needs an approved direction.json that lists every gate, plus a clean banned-pattern scan.
// `npm run test:direction` runs the full visual gates in a browser and writes review sheets.
// Usage: node --import tsx scripts/check-direction.mjs [--records] [--sheets <dir>] [template ...]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {directionSchema, REQUIRED_GATES} from '../src/direction/schema.ts';
import {templateMeta} from '../src/videos/meta.ts';
import {engineOf} from '../src/videos/engine.ts';
import {scoreOf} from '../src/videos/music/schema.ts';
import {scoreErrors} from '../src/videos/music/check.ts';
import {beatFrame, totalBeats} from '../src/videos/music/score.ts';

import {hiddenSets, textSet} from './music-gates.ts';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const recordsOnly = args.includes('--records');
const sheetsAt = args.includes('--sheets') ? args[args.indexOf('--sheets') + 1] : null;
const only = new Set(args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--sheets'));
const music = manifest.templates.filter((t) => t.music && (!only.size || only.has(t.id)));
const errors = [];
const fail = (id, message) => errors.push(`${id}: ${message}`);

// ---------- banned implementation patterns ----------
const BANNED = [
  [/@keyframes|animation\s*:|animation-name|transition\s*:/, 'CSS animations or transitions'],
  [/\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b/, 'timers'],
  [/Math\.random\s*\(/, 'unseeded randomness'],
  [/Date\.now\s*\(|performance\.now\s*\(|new Date\s*\(/, 'clocks'],
  [/\bblur\s*\(/, 'blur filters'],
  [/glow|shake|rgb-?split|chromatic|scanline|lens-?flare|confetti/i, 'a named glow, shake, RGB-split, or other banned effect'],
  [/repeat\s*:\s*-?\d|yoyo\s*:\s*true/, 'repeating or yoyo GSAP tweens'],
  [/opacity\s*:\s*0\s*}\s*,\s*{\s*opacity\s*:\s*1|crossfade/i, 'opacity crossfades'],
];
function sources(id) {
  if (engineOf(id) === 'hyperframes') return [`src/hyperframes/${id}/index.html`];
  return fs.readdirSync(path.join(root, 'src/videos', id)).filter((f) => /\.tsx?$/.test(f)).map((f) => `src/videos/${id}/${f}`);
}
// Shared music helpers run in templates too; include them in every scan.
const SHARED = ['src/videos/music/remotion.tsx', 'src/hyperframes/shared/music-entry.ts'];
function scan(id) {
  for (const file of [...sources(id), ...SHARED]) {
    const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [pattern, label] of BANNED) if (pattern.test(text)) fail(id, `${file} uses ${label}`);
  }
}

// ---------- direction record ----------
function record(id) {
  const file = path.join(root, 'src/videos', id, 'direction.json');
  if (!fs.existsSync(file)) return fail(id, 'missing direction.json');
  const parsed = directionSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.success) return fail(id, `direction.json: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  const d = parsed.data;
  if (d.template !== id) fail(id, 'direction.json names another template');
  if (d.engine !== engineOf(id)) fail(id, `direction.json engine is ${d.engine}, template uses ${engineOf(id)}`);
  if (d.approval.status !== 'approved') fail(id, `direction is ${d.approval.status}, not approved`);
  const missing = REQUIRED_GATES.filter((g) => !d.approval.gates.includes(g));
  if (missing.length) fail(id, `approval does not list gates: ${missing.join(', ')}`);
  if (!d.approval.listened && !d.approval.waiver) fail(id, 'the final mix has not been listened to');
  if (!d.approval.listened && d.approval.waiver) console.warn(`${id}: shipping before the listening review (${d.approval.waiver})`);
  const score = scoreOf(templateMeta[id]);
  if (d.handoffs.length !== score.scenes.length - 1) fail(id, `direction lists ${d.handoffs.length} handoffs for ${score.scenes.length - 1} scene boundaries`);
  const total = totalBeats(score);
  const covered = new Set();
  for (const b of d.beatMap) for (let k = Math.ceil(b.beats[0]); k <= Math.floor(b.beats[1]); k++) covered.add(k);
  const gaps = Array.from({length: total}, (_, k) => k).filter((k) => !covered.has(k));
  if (gaps.length) fail(id, `beat map skips beats ${gaps.slice(0, 8).join(', ')}${gaps.length > 8 ? ', ...' : ''}`);
  const template = manifest.templates.find((t) => t.id === id);
  for (const k of ['model', 'modelId', 'provider', 'effort']) if (d.generation[k] !== template.generation[k]) fail(id, `direction generation.${k} differs from the manifest`);
}

for (const t of music) {
  const s = scoreOf(templateMeta[t.id]);
  if (!s) { fail(t.id, 'music template has no score'); continue; }
  for (const e of scoreErrors(s)) fail(t.id, `score: ${e}`);
  scan(t.id);
  record(t.id);
}
// Silent templates must not claim the music flag without a score, and score files only exist on music templates.
for (const t of manifest.templates.filter((t) => !t.music)) if (scoreOf(templateMeta[t.id])) fail(t.id, 'has a score but is not marked music in the manifest');

if (recordsOnly) {
  if (errors.length) { console.error(`Direction gate failed:\n${errors.map((e) => `- ${e}`).join('\n')}`); process.exit(1); }
  console.log(`Direction records approved for ${music.length} music templates.`);
  process.exit(0);
}

// ---------- visual gates ----------
const {launch, openTemplate, grab, closeServer} = await import('./directed/frames.mjs');
const browser = await launch();
const READ_FRAMES = 30;
const IDLE_FRAMES = 15;
const outRoot = sheetsAt ?? fs.mkdtempSync(path.join(os.tmpdir(), 'cliphouse-direction-'));

// Motion between two frames: the share of pixels whose gray level changes by more than 24 (0-1),
// measured at half resolution so a small arrow nudge still counts as motion.
async function thumb(png) {
  const img = sharp(png);
  const {width} = await img.metadata();
  return img.resize(Math.round(width / 2)).grayscale().raw().toBuffer();
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 24) n++; return n / a.length; };
/** Smallest changed area that counts as something landing on a beat, and as not idle. */
const BEAT_MOTION = 0.0004;
const IDLE_MOTION = 0.0001;
const LOOP_DIFF = 0.01;
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

async function sheet(files, cols, out) {
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(360, 360, {fit: 'inside', background: '#fff'}).extend({top: 4, bottom: 4, left: 4, right: 4, background: '#fff'}).png().toBuffer({resolveWithObject: true})));
  const w = Math.max(...tiles.map((t) => t.info.width));
  const h = Math.max(...tiles.map((t) => t.info.height));
  const rows = Math.ceil(tiles.length / cols);
  await sharp({create: {width: w * cols, height: h * rows, channels: 3, background: '#fff'}})
    .composite(tiles.map((t, i) => ({input: t.data, left: (i % cols) * w, top: Math.floor(i / cols) * h}))).png().toFile(out);
}

for (const t of music) {
  const id = t.id;
  const meta = templateMeta[id];
  const score = scoreOf(meta);
  const variant = manifest.variants.find((v) => v.template === id && !v.hidden);
  const dir = path.join(outRoot, id);
  fs.mkdirSync(dir, {recursive: true});
  const withTexts = (kind, hidden = []) => ({...variant.props, hidden,
    texts: Object.fromEntries(Object.entries(variant.props.texts).map(([r, v]) => [r, textSet(kind, r, v)]))});

  // 1. Every frame of the typical text: motion on every beat, idle holds, readable duration, loop.
  {
    const tpl = await openTemplate(browser, id, variant.props);
    const total = meta.durationInFrames;
    const shots = [];
    const seen = {};
    for (let f = 0; f < total; f++) {
      const {boxes, shot} = await grab(tpl, f);
      shots.push(await thumb(shot));
      // A role is readable while its full text shows, unclipped, at a fixed position. A role may appear in two
      // places (the brand in an intro and an end lockup), so each place keeps its own run.
      const full = (b) => b.text.replace(/\s+/g, ' ') === String(variant.props.texts[b.role]).toUpperCase().replace(/\s+/g, ' ') ||
        b.text.replace(/\s+/g, ' ') === String(variant.props.texts[b.role]).replace(/\s+/g, ' ');
      const live = new Set();
      for (const b of boxes) {
        const key = `${b.role}@${Math.round(b.top / 40)}`;
        live.add(key);
        const s = seen[key] ??= {role: b.role, run: 0, best: 0, prev: null};
        const still = s.prev && Math.abs(s.prev.left - b.left) < 1 && Math.abs(s.prev.top - b.top) < 1 && Math.abs(s.prev.right - b.right) < 1;
        const ok = !b.clipped && full(b);
        s.run = ok ? (still ? s.run + 1 : 1) : 0;
        s.best = Math.max(s.best, s.run);
        s.prev = b;
      }
      for (const key of Object.keys(seen)) if (!live.has(key)) { seen[key].run = 0; seen[key].prev = null; }
      // Text never overlaps other text roles.
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        if (boxes[i].role !== boxes[j].role && overlap(boxes[i], boxes[j]) > 16) fail(id, `frame ${f}: ${boxes[i].role} overlaps ${boxes[j].role}`);
      }
    }
    await tpl.close();
    for (const role of Object.keys(variant.props.texts)) {
      const best = Math.max(0, ...Object.values(seen).filter((s) => s.role === role).map((s) => s.best));
      if (best < READ_FRAMES) fail(id, `${role} is still and readable for ${best} frames, needs ${READ_FRAMES}`);
    }
    const motion = shots.slice(1).map((s, i) => diff(s, shots[i]));
    // Something lands on every beat: the picture changes within 3 frames of each beat.
    for (let beat = 1; beat < totalBeats(score); beat++) {
      const f = beatFrame(score, beat);
      const hit = motion.slice(Math.max(0, f - 3), f + 3).some((d) => d > BEAT_MOTION);
      if (!hit) fail(id, `nothing moves on beat ${beat} (frame ${f})`);
    }
    // No idle hold over half a second, except the final message in the last bar.
    const finalFrom = beatFrame(score, totalBeats(score) - score.meter);
    let run = 0;
    motion.forEach((d, i) => {
      run = d > IDLE_MOTION ? 0 : run + 1;
      if (run > IDLE_FRAMES && i < finalFrom) { fail(id, `idle hold ends at frame ${i + 1} (${run} frames)`); run = -Infinity; }
    });
    // Loop: the last frame matches the first.
    const loop = diff(shots[0], shots.at(-1));
    if (loop > LOOP_DIFF) fail(id, `first and last frames differ in ${(loop * 100).toFixed(1)}% of pixels`);
  }

  // 2. Text sheets at each scene focus: short, typical, max. 3. Hidden-role sheets for every combination.
  const focus = meta.scenes.map((s) => s.from + s.focus);
  const cases = [...['short', 'typical', 'max'].map((k) => ({name: k, props: withTexts(k)})),
    ...hiddenSets(score).filter((h) => h.length).map((h) => ({name: `hide-${h.join('-')}`, props: withTexts('max', h)}))];
  for (const c of cases) {
    const tpl = await openTemplate(browser, id, c.props);
    const files = [];
    for (const f of focus) {
      const png = path.join(dir, `${c.name}-${f}.png`);
      const {boxes} = await grab(tpl, f, {png});
      files.push(png);
      const scene = meta.scenes.find((s) => f >= s.from && f < s.from + s.duration);
      for (const role of scene.roles) {
        const hidden = c.props.hidden.includes(role);
        const box = boxes.find((b) => b.role === role);
        if (hidden && box) fail(id, `${c.name}: hidden ${role} is visible at frame ${f}`);
        if (!hidden && !box) fail(id, `${c.name}: ${role} is not readable at its scene focus (frame ${f})`);
        if (box?.clipped) fail(id, `${c.name}: ${role} is clipped at frame ${f}`);
        if (box && (box.left < 0 || box.top < 0 || box.right > meta.width || box.bottom > meta.height)) fail(id, `${c.name}: ${role} leaves the frame at ${f}`);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        if (boxes[i].role !== boxes[j].role && overlap(boxes[i], boxes[j]) > 16) fail(id, `${c.name}: ${boxes[i].role} overlaps ${boxes[j].role} at frame ${f}`);
      }
    }
    await tpl.close();
    await sheet(files, Math.min(files.length, 5), path.join(dir, `${c.name}.png`));
    for (const f of files) fs.rmSync(f);
  }

  // 4. Beat sheet: one still per beat for review.
  {
    const tpl = await openTemplate(browser, id, variant.props);
    const files = [];
    for (let beat = 0; beat <= totalBeats(score); beat++) {
      const f = Math.min(meta.durationInFrames - 1, beatFrame(score, beat));
      const png = path.join(dir, `beat-${String(beat).padStart(2, '0')}.png`);
      await grab(tpl, f, {png});
      files.push(png);
    }
    await tpl.close();
    await sheet(files, 8, path.join(dir, 'beats.png'));
    for (const f of files) fs.rmSync(f);
  }
  console.log(`${id}: sheets in ${dir}`);
}
await browser.close();
await closeServer();
if (errors.length) { console.error(`Direction gate failed:\n${errors.map((e) => `- ${e}`).join('\n')}`); process.exit(1); }
console.log(`Direction gates passed for ${music.length} music templates.`);
