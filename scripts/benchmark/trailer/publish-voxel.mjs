// Publish the GTA 6 trailer challenge: final videos, posters, sources, and results.json into public/benchmark/gta6/.
// Recompresses videos for the web (H.264 CRF 23, faststart). Frames and timing are unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(root, 'src/benchmark/trailer-voxel');
const protocol = JSON.parse(fs.readFileSync(path.join(dir, 'protocol.json'), 'utf8'));
const system = fs.readFileSync(path.join(dir, 'system.txt'), 'utf8').trim();
const brief = fs.readFileSync(path.join(dir, 'brief.txt'), 'utf8').trim();
const store = path.join(root, '.benchmark', protocol.id);
const out = path.join(root, 'public/benchmark/gta6');
const media = path.join(out, 'media');
fs.mkdirSync(media, {recursive: true});
const web = (src, dest, extra = []) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, ...extra, '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dest]);

const entries = [];
for (const model of protocol.models) {
  for (let run = 1; run <= protocol.runs; run++) {
    const id = `${model.key}-${run}`;
    const record = JSON.parse(fs.readFileSync(path.join(store, id, 'record.json'), 'utf8'));
    const v = record.finalVersion;
    const first = record.firstRenderedVersion;
    web(path.join(store, id, `render-${v}`, 'video.mp4'), path.join(media, `${id}.mp4`), ['-an']);
    // First working render, before the model saw its own frames: shows what the review rounds changed.
    web(path.join(store, id, `render-${first}`, 'video.mp4'), path.join(media, `${id}-first.mp4`), ['-an', '-vf', 'scale=960:-2']);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(store, id, `render-${v}`, 'poster.jpg'), '-vf', 'scale=960:-2', '-q:v', '4', path.join(media, `${id}.jpg`)]);
    fs.copyFileSync(path.join(store, id, `submission-${v}.tsx`), path.join(media, `${id}.tsx`));
    fs.copyFileSync(path.join(store, id, `render-${v}`, 'sheet.jpg'), path.join(media, `${id}-sheet.jpg`));
    const tokens = (c) => ({input: c.usage.input_tokens ?? c.usage.prompt_tokens ?? 0, output: c.usage.output_tokens ?? c.usage.completion_tokens ?? 0});
    entries.push({
      model: model.key, run, status: record.status, costUsd: Math.round(record.costUsd * 1e6) / 1e6,
      costSource: model.api === 'openrouter' ? 'OpenRouter usage.cost' : 'Anthropic list prices x reported token usage',
      calls: record.calls.map((c) => ({call: c.call, phase: c.phase, stop: c.stop, passed: c.passed, costUsd: Math.round(c.costUsd * 1e6) / 1e6, generationMs: c.generationMs, renderMs: c.renderMs, ...tokens(c), error: c.error})),
      repairs: record.repairsUsed, reviews: record.reviewsDone, firstRenderedCall: first, finalCall: v,
      generationMs: record.calls.reduce((s, c) => s + c.generationMs, 0), renderMs: record.calls.reduce((s, c) => s + c.renderMs, 0),
      video: `benchmark/gta6/media/${id}.mp4`, firstVideo: `benchmark/gta6/media/${id}-first.mp4`, poster: `benchmark/gta6/media/${id}.jpg`,
      sheet: `benchmark/gta6/media/${id}-sheet.jpg`, source: `benchmark/gta6/media/${id}.tsx`,
    });
  }
}
fs.copyFileSync(path.join(root, 'output/trailer-voxel-benchmark/reveal.mp4'), path.join(media, 'reveal.mp4'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(root, 'output/trailer-voxel-benchmark/reveal.mp4'), '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-c:a', 'copy', '-movflags', '+faststart', path.join(media, 'reveal.mp4')]);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '10', '-i', path.join(media, 'reveal.mp4'), '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', path.join(media, 'reveal.jpg')]);
const reveal = JSON.parse(fs.readFileSync(path.join(root, 'output/trailer-voxel-benchmark/reveal-order.json'), 'utf8'));
const incidents = fs.existsSync(path.join(store, 'harness-incidents')) ? fs.readdirSync(path.join(store, 'harness-incidents')).map((d) => JSON.parse(fs.readFileSync(path.join(store, 'harness-incidents', d, 'incident.json'), 'utf8'))) : [];
const results = {
  id: protocol.id, title: protocol.title, date: protocol.date, protocolHash: createHash('sha256').update(JSON.stringify(protocol) + system + brief).digest('hex'),
  protocol, system, brief, reveal: {seed: reveal.seed, run: reveal.run, order: reveal.tiles.map((t) => ({letter: t.letter, model: t.key}))},
  totalCostUsd: Math.round(entries.reduce((s, e) => s + e.costUsd, 0) * 1e4) / 1e4, harnessIncidents: incidents, entries,
};
fs.writeFileSync(path.join(dir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(`Published ${entries.length} trailers, total $${results.totalCostUsd}.`);
