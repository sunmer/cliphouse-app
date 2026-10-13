// The launch set and the music library: registration, the props contract, the fade envelope, the tracks,
// the export mux, and the agent credit line.
// Usage: node --import tsx --test scripts/launch.test.ts
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {HYPERFRAMES_TEMPLATES} from '../src/videos/engine.ts';
import {LAUNCH_TEMPLATES} from '../src/videos/launch/ids.ts';
import {schemas} from '../src/videos/schemas.ts';
import {templateMeta} from '../src/videos/meta.ts';
import {validateProps} from '../src/agent/handoff.ts';
import {agentSpec, CREDIT} from '../src/agent/spec.ts';
import {usesLibrary} from '../src/music/schema.ts';
import {FADE_IN, FADE_OUT, TRACKS, fadeFilter, fadeGain, trackPath} from '../src/music/library.ts';
import {addTrack, probe} from '../server/audio.ts';
import {validateShare} from '../server/model.ts';
import {currentVersion} from '../src/agent/versions.ts';

const root = path.resolve(import.meta.dirname, '..');
const launchVariants = manifest.variants.filter((v) => (LAUNCH_TEMPLATES as readonly string[]).includes(v.template));
const longest = Math.max(...Object.values(templateMeta).map((m) => m.durationInFrames / m.fps));

test('the launch set is registered as HyperFrames library templates', () => {
  assert.deepEqual(HYPERFRAMES_TEMPLATES.slice(-LAUNCH_TEMPLATES.length), [...LAUNCH_TEMPLATES]);
  for (const id of LAUNCH_TEMPLATES) {
    assert.ok(usesLibrary(schemas[id]), id);
    assert.ok(manifest.templates.some((t) => t.id === id), `${id} is in the manifest`);
  }
});

test('library props need a known track and reject old audio shapes', () => {
  for (const v of launchVariants) {
    const schema = schemas[v.template];
    const p = v.props as {audio: {enabled: boolean; track: string}};
    assert.ok(validateProps(schema, p).ok, v.id);
    for (const t of TRACKS) assert.ok(validateProps(schema, {...p, audio: {enabled: true, track: t.id}}).ok, `${v.id} ${t.id}`);
    for (const bad of [{enabled: true}, {enabled: true, track: 'nope'}, {enabled: 'yes', track: TRACKS[0].id}, {enabled: true, track: TRACKS[0].id, extra: 1}]) {
      assert.equal(validateProps(schema, {...p, audio: bad}).ok, false, `${v.id}: ${JSON.stringify(bad)}`);
    }
    assert.deepEqual(validateShare({variantId: v.id, props: p, templateVersion: currentVersion(v.template)}).props.audio, p.audio, v.id);
  }
});

test('the fade envelope starts and ends silent and is full in between', () => {
  for (const d of [4, 8, 12.8]) {
    assert.equal(fadeGain(0, d), 0);
    assert.equal(fadeGain(d, d), 0);
    assert.equal(fadeGain(d / 2, d), 1);
    assert.ok(Math.abs(fadeGain(FADE_IN / 2, d) - 0.5) < 1e-9);
    assert.ok(Math.abs(fadeGain(d - Math.min(FADE_OUT, d / 3) / 2, d) - 0.5) < 1e-9);
  }
  assert.match(fadeFilter(8), /afade=t=in:st=0:d=0\.3,afade=t=out:st=6\.8/);
});

test('every track exists, is longer than any template, and sits near -14 LUFS', () => {
  for (const t of TRACKS) {
    const file = path.join(root, 'public', trackPath(t.id));
    assert.ok(fs.existsSync(file), t.id);
    const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
    assert.ok(seconds > longest + 1, `${t.id} lasts ${seconds} s`);
    const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128=peak=true -f null - 2>&1`]).toString();
    const lufs = Number(log.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)?.[1] ?? log.match(/I:\s+(-?[\d.]+) LUFS/g)!.at(-1)!.match(/-?[\d.]+/)![0]);
    assert.ok(Math.abs(lufs + 14) <= 1, `${t.id} is ${lufs} LUFS`);
  }
});

test('the export mux cuts the track to the video and fades both ends', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cliphouse-track-'));
  try {
    const video = path.join(dir, 'video.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=30:d=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
    const cwd = process.cwd();
    process.chdir(root);
    try { await addTrack(video, TRACKS[3].id, 6); } finally { process.chdir(cwd); }
    const info = await probe(video);
    assert.equal(info.audio?.codec_name, 'aac');
    assert.ok(Math.abs(Number(info.audio?.duration) - 6) < 0.035, `audio lasts ${info.audio?.duration}`);
    // The first and last 20 ms are near silence; the middle is loud.
    const level = (ss: number, t: number) => Number(execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -ss ${ss} -t ${t} -i "${video}" -af volumedetect -f null - 2>&1`]).toString().match(/max_volume: (-?[\d.]+) dB/)![1]);
    assert.ok(level(0, 0.02) < -30, 'fade-in starts silent');
    assert.ok(level(5.97, 0.03) < -30, 'fade-out ends silent');
    assert.ok(level(2.5, 1) > -12, 'the middle plays at full level');
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('every agent spec carries the optional credit line', () => {
  for (const v of manifest.variants.filter((x) => !(x as {hidden?: boolean}).hidden).slice(0, 20).concat(launchVariants)) {
    const s = agentSpec({site: 'https://cliphou.se', kind: 'template', id: v.id, url: `https://cliphou.se/templates/${v.id}/`, title: v.title, variant: v, props: v.props as never});
    assert.equal(s.credit.text, CREDIT, v.id);
    assert.equal(s.attributionRequired, false, v.id);
    assert.ok(s.instructions.some((i: string) => i.includes(CREDIT)), v.id);
  }
  for (const v of launchVariants) {
    const s = agentSpec({site: 'https://cliphou.se', kind: 'template', id: v.id, url: '', title: v.title, variant: v, props: v.props as never}) as {music?: {library?: unknown[]}};
    assert.equal(s.music?.library?.length, TRACKS.length, v.id);
  }
});
