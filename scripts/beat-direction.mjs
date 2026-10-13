// Visual direction gates for beat templates, in either engine. For every list count and for short,
// typical, and max-length text: readability, clipping, overlap, frame bounds, motion on every beat,
// idle holds, loop match, and each list item landing on its planned frame. Writes review sheets.
// Usage: node --import tsx scripts/beat-direction.mjs [--sheets <dir>] [--json <file>] template ...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {scoreOf} from '../src/videos/beat/schema.ts';
import {beatPlan} from '../src/videos/beat/plan.ts';
import {beatFrame, totalBeats} from '../src/videos/beat/score.ts';
import {parseLines} from '../src/videos/beat/list.ts';
import {ROLES} from '../src/videos/vocab.ts';
import {launch, openTemplate, grab, closeServer} from './directed/frames.mjs';

const args = process.argv.slice(2);
const opt = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const sheetsAt = opt('--sheets') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'cliphouse-beat-direction-'));
const jsonAt = opt('--json');
const ids = args.filter((a, i) => !a.startsWith('--') && !['--sheets', '--json'].includes(args[i - 1]));
const READ_FRAMES = 30;
// Share of pixels that must change near a beat. Film grain alone changes about 0.0001-0.0002.
const BEAT_MOTION = 0.0004;
const IDLE_MOTION = 0.0001;
const LOOP_DIFF = 0.012;

const WORDS = 'Northwind Studio Weekly Creative Session Launch Report Insight Better Design Signal Moment'.split(' ');
const longText = (max) => { let s = ''; for (let i = 0; s.length < max; i++) s += (s ? ' ' : '') + WORDS[i % WORDS.length]; return s.slice(0, max).trim(); };
const shortText = (v) => v.split(/\s+/)[0];
function textSet(kind, props, score) {
  const texts = {};
  for (const [role, value] of Object.entries(props.texts)) {
    if (role === 'list') {
      const items = parseLines(value);
      const l = score.list;
      texts.list = items.map((it, i) => kind === 'typical' || l.format === 'chart' ? it
        : kind === 'short' ? shortText(it) : longText(l.itemMax - (i % 2))).join('\n');
    } else if (ROLES[role].pattern || kind === 'typical') texts[role] = value;
    else texts[role] = kind === 'short' ? shortText(value) : longText(ROLES[role].max);
  }
  return {...props, texts};
}
const withCount = (props, n) => ({...props, texts: {...props.texts, list: parseLines(props.texts.list).slice(0, n).join('\n')}});

async function thumb(png) {
  const img = sharp(png);
  const {width} = await img.metadata();
  return img.resize(Math.round(width / 2)).grayscale().raw().toBuffer();
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 24) n++; return n / a.length; };
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
async function sheet(files, cols, out) {
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(300, 300, {fit: 'inside', background: '#fff'}).extend({top: 3, bottom: 3, left: 3, right: 3, background: '#fff'}).png().toBuffer({resolveWithObject: true})));
  const w = Math.max(...tiles.map((t) => t.info.width));
  const h = Math.max(...tiles.map((t) => t.info.height));
  const rows = Math.ceil(tiles.length / cols);
  await sharp({create: {width: w * cols, height: h * rows, channels: 3, background: '#fff'}})
    .composite(tiles.map((t, i) => ({input: t.data, left: (i % cols) * w, top: Math.floor(i / cols) * h}))).png().toFile(out);
}

const browser = await launch();
const report = {};
for (const id of ids) {
  const meta = templateMeta[id];
  const score = scoreOf(meta);
  const errors = [];
  const fail = (m) => errors.push(m);
  // Templates still in generation have only a hidden preset; gate it so they can become visible.
  const variant = manifest.variants.find((v) => v.template === id && !v.hidden) ?? manifest.variants.find((v) => v.template === id);
  const dir = path.join(sheetsAt, id);
  fs.mkdirSync(dir, {recursive: true});
  const max = score.list ? parseLines(variant.props.texts.list).length : 0;
  const counts = score.list ? Array.from({length: max - score.list.min + 1}, (_, k) => max - k) : [0];
  const total = meta.durationInFrames;
  try {
    for (const n of counts) {
      const props = score.list ? withCount(variant.props, n) : variant.props;
      const plan = beatPlan(score, n);
      const tag = score.list ? `${n} items` : 'typical';
      // 1. Every frame, typical text: readability, overlap, motion on every beat, idle holds, loop, list timing.
      const tpl = await openTemplate(browser, id, props);
      const shots = [];
      const seen = {};
      const firstSeen = {};
      const overlaps = {};
      const beatFiles = [];
      for (let f = 0; f < total; f++) {
        const onBeat = f % score.beatFrames === 0 || f === total - 1;
        const png = onBeat ? path.join(dir, `b-${n}-${String(f).padStart(4, '0')}.png`) : undefined;
        const {boxes: all, shot} = await grab(tpl, f, {png});
        // Decorative repeats (marquee bands) are marked data-text-copy and exempt from text checks.
        const boxes = all.filter((b) => !b.copy);
        if (png) beatFiles.push(png);
        shots.push(await thumb(shot));
        const want = (role) => role === 'list' ? null : String(props.texts[role] ?? '');
        const norm = (s) => s.replace(/\s+/g, '').toUpperCase();
        const live = new Set();
        const items = parseLines(props.texts.list ?? '');
        for (const b of boxes) {
          // List items are tracked by their data-list-item index; other roles must show their full text.
          const index = b.role === 'list' ? (b.item !== null ? Number(b.item) : items.findIndex((t) => norm(t) === norm(b.text))) : null;
          const key = `${b.role}#${index}@${Math.round(b.top / 40)}`;
          live.add(key);
          const full = b.role === 'list' ? index >= 0 && norm(items[index] ?? '') === norm(b.text) : norm(b.text) === norm(want(b.role));
          if (b.role === 'list' && full) firstSeen[index] ??= f;
          const s = seen[key] ??= {role: b.role, item: index, run: 0, best: 0, prev: null};
          const still = s.prev && Math.abs(s.prev.left - b.left) < 1 && Math.abs(s.prev.top - b.top) < 1 && Math.abs(s.prev.right - b.right) < 1;
          const ok = !b.clipped && full;
          s.run = ok ? (still ? s.run + 1 : 1) : 0;
          s.best = Math.max(s.best, s.run);
          s.prev = b;
          if (b.left < -2 || b.top < -2 || b.right > meta.width + 2 || b.bottom > meta.height + 2) { if (!errors.some((e) => e.includes(`${b.role} leaves the frame`))) fail(`${tag}: ${b.role} leaves the frame at ${f}`); }
        }
        for (const key of Object.keys(seen)) if (!live.has(key)) { seen[key].run = 0; seen[key].prev = null; }
        // Overlap shorter than one beat is a handoff (a wipe or a label roll); a full beat is a layout fault.
        const pairs = new Set();
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], c = boxes[j];
          if ((a.role !== c.role || (a.role === 'list' && a.item !== c.item)) && overlap(a, c) > 16) pairs.add([a.role, c.role].sort().join(' overlaps '));
        }
        for (const k of Object.keys(overlaps)) if (!pairs.has(k)) overlaps[k] = 0;
        for (const k of pairs) {
          overlaps[k] = (overlaps[k] ?? 0) + 1;
          if (overlaps[k] === score.beatFrames && !errors.some((e) => e.startsWith(`${tag}: ${k}`))) fail(`${tag}: ${k} for a full beat, from frame ${f - score.beatFrames + 1}`);
        }
      }
      await tpl.close();
      for (const role of Object.keys(props.texts)) {
        if (role === 'list') {
          for (let i = 0; i < n; i++) {
            const best = Math.max(0, ...Object.values(seen).filter((s) => s.role === 'list' && s.item === i).map((s) => s.best));
            if (best < READ_FRAMES) fail(`${tag}: list item ${i + 1} is still and readable for ${best} frames, needs ${READ_FRAMES}`);
          }
          continue;
        }
        const best = Math.max(0, ...Object.values(seen).filter((s) => s.role === role).map((s) => s.best));
        if (best < READ_FRAMES) fail(`${tag}: ${role} is still and readable for ${best} frames, needs ${READ_FRAMES}`);
      }
      // Each item becomes fully readable after its planned start and no later than one beat after its accent.
      for (const it of plan.items) {
        const at = firstSeen[it.index];
        if (at === undefined) fail(`${tag}: list item ${it.index + 1} never shows its full text`);
        else if (at < it.startFrame || at > it.accentFrame + score.beatFrames) fail(`${tag}: list item ${it.index + 1} is first readable at frame ${at}, planned ${it.startFrame}-${it.accentFrame + score.beatFrames}`);
      }
      const motion = shots.slice(1).map((s, i) => diff(s, shots[i]));
      // Something lands on every beat: the change at the beat is at least twice the change between beats,
      // and above a small absolute floor, so a held frame with a steady drift does not count.
      for (let beat = 1; beat < totalBeats(score); beat++) {
        const f = beatFrame(score, beat);
        const at = Math.max(...motion.slice(Math.max(0, f - 2), f + 3));
        const quiet = motion.slice(f + 4, f + score.beatFrames - 3).sort((a, b) => a - b);
        const floor = quiet.length ? quiet[Math.floor(quiet.length / 2)] : 0;
        if (!(at > BEAT_MOTION || (at > 0.0002 && at >= floor * 2))) fail(`${tag}: nothing lands on beat ${beat} (frame ${f})`);
      }
      const finalFrom = beatFrame(score, totalBeats(score) - 4);
      let run = 0;
      motion.forEach((d, i) => {
        run = d > IDLE_MOTION ? 0 : run + 1;
        if (run > score.beatFrames * 2 && i < finalFrom) { fail(`${tag}: idle hold ends at frame ${i + 1} (${run} frames)`); run = -Infinity; }
      });
      // Loop: the wrap from the last frame to the first must look like an ordinary frame step nearby.
      const loop = diff(shots.at(-1), shots[0]);
      const nearby = Math.max(...motion.slice(0, 4), ...motion.slice(-4));
      if (loop > Math.max(LOOP_DIFF, nearby * 2)) fail(`${tag}: the loop jumps: last to first frame changes ${(loop * 100).toFixed(1)}% of pixels, nearby steps change ${(nearby * 100).toFixed(1)}%`);
      await sheet(beatFiles, 8, path.join(dir, `beats-${tag.replace(' ', '-')}.png`));
      for (const f of beatFiles) fs.rmSync(f);
    }
    // 2. Short and max text at each scene focus, for the largest and smallest list.
    const focus = meta.scenes.map((s) => s.focus);
    for (const kind of ['short', 'max']) for (const n of [...new Set([counts[0], counts.at(-1)])]) {
      const props = textSet(kind, score.list ? withCount(variant.props, n) : variant.props, score);
      const tpl = await openTemplate(browser, id, props);
      const files = [];
      for (const f of focus) {
        const png = path.join(dir, `${kind}-${n}-${f}.png`);
        const {boxes: all} = await grab(tpl, f, {png});
        const boxes = all.filter((b) => !b.copy);
        files.push(png);
        const scene = meta.scenes.find((s) => f >= s.from && f < s.from + s.duration);
        for (const role of scene.roles) {
          // A role shown only as scrolling copies (a marquee) is present; it must read in full elsewhere.
          const box = boxes.find((b) => b.role === role);
          // Long marquee copies cover the frame and are measured as fragments; any copy in the DOM counts.
          const copy = all.some((b) => b.role === role && b.copy) || await tpl.page.evaluate((r) => !!document.querySelector(`[data-text-copy][data-text-role="${r}"]`), role);
          const flatText = (t) => String(t).replace(/\s+/g, '').toUpperCase();
          if (!box && !copy) fail(`${kind} ${n}: ${role} is not readable at its scene focus (frame ${f})`);
          else if (box?.clipped && !copy) fail(`${kind} ${n}: ${role} is clipped at frame ${f}`);
          else if (box && role !== 'list' && !boxes.some((b) => b.role === role && !b.clipped && flatText(b.text) === flatText(props.texts[role])))
            fail(`${kind} ${n}: ${role} shows "${box.text}", not its full text, at frame ${f}`);
        }
        if (scene.roles.includes('list')) {
          const flat = (t) => t.replace(/\s+/g, '').toUpperCase();
          const shown = new Set(boxes.filter((b) => b.role === 'list' && !b.clipped).map((b) => flat(b.text)));
          const missing = parseLines(props.texts.list).filter((t) => !shown.has(flat(t)));
          if (missing.length) fail(`${kind} ${n}: list items not fully readable at frame ${f}: ${missing.join(' | ')}`);
        }
        for (const b of boxes) if (b.left < -2 || b.top < -2 || b.right > meta.width + 2 || b.bottom > meta.height + 2) fail(`${kind} ${n}: ${b.role} leaves the frame at ${f}`);
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], c = boxes[j];
          if ((a.role !== c.role || (a.role === 'list' && a.text !== c.text)) && overlap(a, c) > 16) fail(`${kind} ${n}: ${a.role} overlaps ${c.role} at frame ${f}`);
        }
      }
      await tpl.close();
      await sheet(files, Math.min(files.length, 4), path.join(dir, `${kind}-${n}.png`));
      for (const f of files) fs.rmSync(f);
    }
  } catch (e) {
    fail(`gate crashed: ${e.message.split('\n')[0]}`);
  }
  report[id] = {errors, sheets: dir};
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${id} ${errors.length ? `\n  ${errors.slice(0, 30).join('\n  ')}` : ''}`);
}
await browser.close();
await closeServer();
if (jsonAt) fs.writeFileSync(jsonAt, JSON.stringify(report, null, 2));
if (Object.values(report).some((r) => r.errors.length)) process.exitCode = 1;
