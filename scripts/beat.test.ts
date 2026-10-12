// Contract tests for beat templates: scores, list contract, plan invariants, audio, props, and variety.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {validateProps} from '../src/agent/handoff.ts';
import {schemas} from '../src/videos/schemas.ts';
import {templateMeta} from '../src/videos/meta.ts';
import {scoreErrors} from '../src/videos/beat/check.ts';
import {scoreOf} from '../src/videos/beat/schema.ts';
import {applyList, listItems, listProblems, parseLines} from '../src/videos/beat/list.ts';
import {beatPlan} from '../src/videos/beat/plan.ts';
import {beatFrame, durationInFrames, sceneStartBeat, type BeatScore} from '../src/videos/beat/score.ts';
import {varietyErrors} from '../src/videos/beat/variety.ts';
import {musicOf} from '../src/videos/song/index.ts';
import {validateShare} from '../server/model.ts';
import {countErrors} from './beat-gates.ts';
import {songErrors} from './song-gates.ts';

const beats = manifest.templates.map((t) => t.id).filter((id) => scoreOf(templateMeta[id]));
const score = (id: string) => scoreOf(templateMeta[id])!;
const preset = (id: string) => manifest.variants.find((v) => v.template === id && !(v as {hidden?: boolean}).hidden)!;
void ({} as BeatScore);

test('beat scores are valid and drive the template timing', () => {
  assert.ok(beats.length >= 1);
  for (const id of beats) {
    const s = score(id);
    assert.deepEqual(scoreErrors(s), [], id);
    const meta = templateMeta[id];
    assert.equal(meta.durationInFrames, durationInFrames(s), id);
    meta.scenes.forEach((sc, i) => assert.equal(sc.from, beatFrame(s, sceneStartBeat(s, i)), `${id} scene ${i}`));
  }
});

test('presets fill the list to capacity and pass the schema', () => {
  for (const id of beats) {
    const s = score(id);
    for (const v of manifest.variants.filter((x) => x.template === id)) {
      if (s.list) assert.equal(listItems(v.props as never).length, s.list.max, `${v.id}: preset list sets the capacity`);
      assert.ok(validateProps(schemas[id], v.props).ok, v.id);
    }
  }
});

test('list contract: lines, limits, and punctuation', () => {
  assert.deepEqual(parseLines('  Q&A, live! \n\n 30% off\r\n'), ['Q&A, live!', '30% off']);
  const l = {role: 'list' as const, scene: 0, min: 1, max: 3, itemMax: 16, schedules: {}, accentOffset: 0, voice: 'pluck' as const};
  assert.match(listProblems(l, [])[0].message, /at least one/);
  assert.match(listProblems(l, ['a', 'b', 'c', 'd'])[0].message, /3 items or fewer/);
  assert.match(listProblems(l, ['x'.repeat(17)])[0].message, /17\/16/);
  assert.deepEqual(listProblems(l, ['Q&A, live!']), []);
  assert.match(listProblems({...l, format: 'chart'}, ['Q1']).map((p) => p.message).join(), /label and a number/);
  assert.deepEqual(listProblems({...l, format: 'chart'}, ['Q1 12', 'Mar 2.1k', 'Growth 98%']), []);
});

test('every list count keeps the groove and cues, and removes only item notes', () => {
  for (const id of beats) assert.deepEqual(countErrors(score(id)), [], id);
});

test('the plan depends on the count only, never on wording', () => {
  for (const id of beats) {
    const s = score(id);
    if (!s.list) continue;
    const p = preset(id).props;
    const items = listItems(p as never);
    const edited = applyList(p as never, items.map((t) => t.split('').reverse().join('').slice(0, s.list!.itemMax)));
    assert.deepEqual(beatPlan(s, listItems(edited).length), beatPlan(s, items.length), id);
  }
});

test('beat scores are timing only: the music lives in the template song', () => {
  for (const id of beats) assert.equal(score(id).sound, undefined, `${id}: remove the "sound" block from score.json`);
});

test('songs land on the plan, deterministic, under -1 dBTP, near -14 LUFS, for every count', () => {
  for (const id of beats) {
    const music = musicOf(templateMeta[id]);
    if (!music) continue;
    assert.deepEqual(songErrors(music.score, music.song), [], id);
  }
});

test('templates without a song are silent: no audio on by default and no sound in exports', () => {
  for (const id of beats) {
    if (musicOf(templateMeta[id])) continue;
    for (const v of manifest.variants.filter((x) => x.template === id)) assert.equal((v.props as {audio?: {enabled: boolean}}).audio?.enabled, false, v.id);
  }
});

test('beat templates accept only texts, theme, audio, and valid list text', () => {
  for (const id of beats) {
    const s = score(id);
    const p = preset(id).props as {texts: Record<string, string>; theme: object; audio: object};
    const schema = schemas[id];
    assert.ok(validateProps(schema, p).ok, id);
    const bad: unknown[] = [{...p, hidden: []}, {texts: p.texts, theme: p.theme}, {...p, audio: {enabled: 'yes'}}];
    if (s.list) bad.push(
      {...p, texts: {...p.texts, list: ''}},
      {...p, texts: {...p.texts, list: Array(s.list.max + 1).fill('Item').join('\n')}},
      {...p, texts: {...p.texts, list: 'x'.repeat(s.list.itemMax + 1)}},
      {...p, texts: {...p.texts, list: `${p.texts.list}\n`}},
      {...p, texts: {...p.texts, list: `A\tB`}},
    );
    for (const b of bad) assert.equal(validateProps(schema, b).ok, false, `${id}: ${JSON.stringify(b).slice(0, 120)}`);
    const v = preset(id);
    assert.deepEqual(validateShare({variantId: v.id, props: v.props, templateVersion: 1}).props, v.props, id);
  }
});

test('no two templates sound alike', () => {
  assert.deepEqual(varietyErrors(Object.fromEntries(beats.map((id) => [id, score(id)]))), []);
});

void fs; void path; void createHash;
