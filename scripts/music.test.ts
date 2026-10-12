// Unit and contract tests for the music score, cue plan, synthesizer, and prop contract.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateProps} from '../src/agent/handoff.ts';
import {schemas} from '../src/videos/schemas.ts';
import {templateMeta} from '../src/videos/meta.ts';
import {ROLES, type Role} from '../src/videos/vocab.ts';
import {scoreErrors} from '../src/videos/music/check.ts';
import {ROLE_MAX, musicPlan, structureCues} from '../src/videos/music/cues.ts';
import {beatFrame, durationInFrames, durationInSamples, durationSeconds, sceneStartBeat, scoreScenes, type Score} from '../src/videos/music/score.ts';
import {encodeWav, master} from '../src/videos/music/synth.ts';
import {renderMusic} from '../src/videos/music/index.ts';
import {hideableRoles, isMusicSchema, scoreOf} from '../src/videos/music/schema.ts';
import {validateShare} from '../server/model.ts';
import {audioErrors, editLeakErrors, hiddenSets, textSet} from './music-gates.ts';

const root = path.resolve(import.meta.dirname, '..');
// The older score format. Beat templates are tested in scripts/beat.test.ts.
const isOldScore = (id: string) => !('beatFrames' in JSON.parse(fs.readFileSync(path.join(root, 'src/videos', id, 'score.json'), 'utf8')));
const music = manifest.templates.filter((t) => (t as {music?: boolean}).music && isOldScore(t.id)).map((t) => t.id);
const score = (id: string) => scoreOf(templateMeta[id])!;
const preset = (id: string) => manifest.variants.find((v) => v.template === id && !(v as {hidden?: boolean}).hidden)!;
const hashes = JSON.parse(fs.readFileSync(path.join(root, 'scripts/music-hashes.json'), 'utf8')) as Record<string, string>;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('four music templates: two Remotion, two HyperFrames, with the planned formats and tempos', () => {
  assert.deepEqual(music.sort(), ['beatreel', 'eventcountdown', 'featuredrop', 'productpulse']);
  const facts = Object.fromEntries(music.map((id) => [id, [templateMeta[id].width, templateMeta[id].height, score(id).bpm]]));
  assert.deepEqual(facts, {beatreel: [1920, 1080, 120], productpulse: [1080, 1920, 120], featuredrop: [1080, 1080, 128], eventcountdown: [1080, 1350, 120]});
});

test('scores are valid, whole-bar, and drive the template timing', () => {
  for (const id of music) {
    const s = score(id);
    assert.deepEqual(scoreErrors(s), [], id);
    const meta = templateMeta[id];
    assert.equal(meta.durationInFrames, durationInFrames(s), id);
    assert.deepEqual(meta.scenes, scoreScenes(s), id);
    assert.ok(Number.isInteger(durationSeconds(s) * meta.fps), `${id}: whole frames`);
    s.scenes.forEach((_, i) => assert.equal(meta.scenes[i].from, beatFrame(s, sceneStartBeat(s, i)), `${id} scene ${i}`));
  }
});

test('score validation rejects broken structure', () => {
  const s = score('beatreel');
  const broken = (patch: Partial<Score>) => scoreErrors({...s, ...patch});
  assert.match(broken({bpm: 30}).join(), /bpm/);
  assert.match(broken({optional: ['brand']}).join(), /brand cannot be optional/);
  assert.match(broken({impacts: [0]}).join(), /last third/);
  assert.match(broken({slots: s.slots.map((x) => x.role === 'cta' ? {...x, beat: 0.25} : x)}).join(), /eighth-note/);
  assert.match(broken({slots: s.slots.filter((x) => x.role !== 'cta')}).join(), /cta has no accent slot/);
  assert.match(broken({scenes: s.scenes.map((x, i) => i ? x : {...x, bars: 1.5})}).join(), /whole number/);
});

test('role limits in the cue plan match the shared vocabulary', () => {
  for (const [role, max] of Object.entries(ROLE_MAX)) assert.equal(ROLES[role as Role].max, max, role);
});

test('text edits change only accents inside the edited slot, and keep the eighth-note grid and hit limits', () => {
  for (const id of music) {
    const s = score(id);
    const texts = preset(id).props.texts as Record<Role, string>;
    for (const slot of s.slots) for (const kind of ['short', 'max'] as const) {
      const value = textSet(kind, slot.role, texts[slot.role]);
      assert.deepEqual(editLeakErrors(s, texts, slot.role, value), [], `${id} ${slot.role} ${kind}`);
    }
  }
});

test('longer text gets shorter, wider-spaced accents, never more than the slot allows', () => {
  const s = score('beatreel');
  const texts = preset('beatreel').props.texts as Record<Role, string>;
  const slot = s.slots.find((x) => x.role === 'headline')!;
  const accents = (t: string) => musicPlan(s, {...texts, headline: t}).cues.filter((c) => c.role === 'headline' && c.kind === 'accent');
  const short = accents('Go big now');
  const long = accents(textSet('max', 'headline', texts.headline));
  const many = accents('A b c d e f g h i j k');
  assert.ok(many.length <= slot.maxHits);
  assert.ok(long[0].beats < short[0].beats);
  const gap = (list: typeof long) => list.length > 1 ? list[1].beat - list[0].beat : Infinity;
  assert.ok(gap(long) >= 1, 'long text accents are at least a quarter note apart');
});

test('hidden roles remove only their own accents; structure and duration never change', () => {
  for (const id of music) {
    const s = score(id);
    const texts = preset(id).props.texts;
    const base = musicPlan(s, texts);
    const key = (c: object) => JSON.stringify(c);
    const sorted = (list: object[]) => list.map(key).sort();
    for (const hidden of hiddenSets(s)) {
      const plan = musicPlan(s, texts, hidden);
      assert.deepEqual(sorted(plan.cues.filter((c) => c.kind === 'structure')), sorted(structureCues(s)), `${id} ${hidden}`);
      assert.deepEqual(plan.cues.filter((c) => c.role && !hidden.includes(c.role)), base.cues.filter((c) => c.role && !hidden.includes(c.role)), `${id} ${hidden}`);
      for (const r of hidden) assert.equal(plan.roles[r], undefined);
      assert.equal(renderMusic(s, {texts, hidden}).left.length, durationInSamples(s));
    }
  }
});

test('the same props always produce the same WAV, and presets match their recorded hashes', () => {
  for (const id of music) {
    const p = preset(id).props;
    const a = encodeWav(renderMusic(score(id), p));
    const b = encodeWav(renderMusic(score(id), structuredClone(p)));
    assert.equal(sha(a), sha(b), id);
    assert.equal(sha(a), hashes[id], `${id}: WAV hash changed. If the change is intended, run npm run music:hashes and listen to the mix.`);
    // 48 kHz 16-bit stereo PCM header.
    const view = new DataView(a.buffer);
    assert.equal(view.getUint32(24, true), 48000);
    assert.equal(view.getUint16(22, true), 2);
    assert.equal(view.getUint16(34, true), 16);
  }
});

test('mastered mixes start on the beat, keep beats within 10 ms, never clip, and reach -14 LUFS', () => {
  for (const id of music) {
    const s = score(id);
    const texts = preset(id).props.texts as Record<Role, string>;
    for (const kind of ['short', 'typical', 'max'] as const) {
      const edit = Object.fromEntries(Object.entries(texts).map(([r, v]) => [r, textSet(kind, r as Role, v)]));
      assert.deepEqual(audioErrors(s, master(s, musicPlan(s, edit).cues)), [], `${id} ${kind}`);
    }
  }
});

test('music templates accept only their declared fields and optional roles', () => {
  for (const id of music) {
    const schema = schemas[id];
    const p = structuredClone(preset(id).props) as Record<string, unknown>;
    assert.ok(isMusicSchema(schema));
    assert.deepEqual(hideableRoles(schema), score(id).optional);
    assert.ok(validateProps(schema, p).ok, id);
    assert.ok(validateProps(schema, {...p, hidden: score(id).optional}).ok, `${id}: hide all optional`);
    for (const bad of [
      {...p, hidden: ['brand']}, {...p, hidden: ['headline']}, {...p, hidden: ['cta']}, {...p, hidden: ['quote']},
      {...p, hidden: [score(id).optional[0], score(id).optional[0]]}, {...p, hidden: 'point3'},
      {...p, audio: {enabled: 'yes'}}, {...p, audio: {enabled: true, volume: 1}}, {texts: p.texts, theme: p.theme},
    ]) assert.equal(validateProps(schema, bad).ok, false, `${id}: ${JSON.stringify({hidden: bad.hidden, audio: bad.audio})}`);
  }
});

test('silent templates reject the music fields', () => {
  const silent = (t: string) => !(manifest.templates.find((x) => x.id === t) as {music?: boolean}).music;
  for (const v of manifest.variants.filter((v) => !(v as {hidden?: boolean}).hidden && silent(v.template)).slice(0, 40)) {
    const schema = schemas[v.template];
    assert.equal(isMusicSchema(schema), false);
    assert.equal(validateProps(schema, {...v.props, hidden: []}).ok, false, v.id);
    assert.equal(validateProps(schema, {...v.props, audio: {enabled: true}}).ok, false, v.id);
    assert.throws(() => validateShare({variantId: v.id, props: {...v.props, audio: {enabled: false}}}), /Invalid video/);
  }
});

test('the share server canonicalizes hidden roles and rejects required ones', () => {
  const id = 'beatreel';
  const p = preset(id).props;
  const a = validateShare({variantId: preset(id).id, props: {...p, hidden: ['subhead', 'point3']}, templateVersion: 1});
  const b = validateShare({variantId: preset(id).id, props: {...p, hidden: ['point3', 'subhead']}, templateVersion: 1});
  assert.deepEqual(a.props, b.props);
  assert.throws(() => validateShare({variantId: preset(id).id, props: {...p, hidden: ['brand']}, templateVersion: 1}), /brand cannot be hidden/);
});
