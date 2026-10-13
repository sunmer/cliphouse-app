// Generate the royalty-free music library with the ElevenLabs Music API, instrumental only.
// Each track is normalized to -14 LUFS integrated with a -1.5 dBTP ceiling and stored as 48 kHz AAC in public/music/.
// Usage: node --import tsx scripts/library/generate.mjs [id ...]   (reads ELEVENLABS_API_KEY from .env)
// Existing tracks are kept. Pass ids, or FORCE=1, to regenerate.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {TRACKS} from '../../src/music/library.ts';

const root = path.resolve(import.meta.dirname, '../..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('ELEVENLABS_API_KEY is not set.');
const only = new Set(process.argv.slice(2));
const outDir = path.join(root, 'public/music');
const work = path.join(root, 'output/music-library');
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(work, {recursive: true});

async function generate(track) {
  // The key is shared with a live service, so a 429 concurrency refusal waits and retries.
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', {
      method: 'POST',
      headers: {'xi-api-key': KEY, 'content-type': 'application/json'},
      body: JSON.stringify({prompt: track.prompt, music_length_ms: track.seconds * 1000, model_id: 'music_v1', force_instrumental: true}),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = (await res.text()).slice(0, 400);
    if (res.status !== 429 || attempt >= 12) throw new Error(`${track.id}: ElevenLabs ${res.status} ${body}`);
    await new Promise((r) => setTimeout(r, Math.min(60_000, 5_000 * attempt)));
  }
}

// Two-pass loudnorm to -14 LUFS, then a limiter so the AAC never peaks above about -1 dBTP.
function master(input, output) {
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${input}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`]).toString();
  const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
  // Linear gain to -14 LUFS first, then an oversampled limiter at -4 dBFS: AAC adds up to about 2.5 dB of overshoot.
  const gain = -14 - Number(m.input_i);
  const filter = `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.63:level=false:attack=0.5:release=50,aresample=48000`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-af', filter, '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', output]);
}

// REMASTER=1 re-masters the saved raw downloads without new generation calls.
if (process.env.REMASTER === '1') {
  for (const t of TRACKS) master(path.join(work, `${t.id}.mp3`), path.join(outDir, `${t.id}.m4a`));
  console.log(`Remastered ${TRACKS.length} tracks.`);
  process.exit(0);
}

const results = [];
const todo = TRACKS.filter((t) => only.size ? only.has(t.id) : process.env.FORCE === '1' || !fs.existsSync(path.join(outDir, `${t.id}.m4a`)));
// One request at a time: the account allows 5 concurrent requests and shares them with another service.
async function one(track) {
  const raw = path.join(work, `${track.id}.mp3`);
  fs.writeFileSync(raw, await generate(track));
  const out = path.join(outDir, `${track.id}.m4a`);
  master(raw, out);
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
  const r = {id: track.id, seconds, bytes: fs.statSync(out).size};
  results.push(r);
  console.log(JSON.stringify(r));
}
for (const track of todo) await one(track);
if (results.length) fs.appendFileSync(path.join(root, 'output/asset-costs.jsonl'), results.map((r) => `${JSON.stringify({at: new Date().toISOString(), kind: 'music', provider: 'elevenlabs', model: 'music_v1', ...r})}\n`).join(''));
