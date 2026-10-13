// Contract checks for one launch template: score rules, list counts, schema, and the preset props.
// Usage: node --import tsx scripts/launch/contract.mjs <id>   (exit 1 with the errors on stdout)
import {templateMeta} from '../../src/videos/meta.ts';
import {scoreOf} from '../../src/videos/beat/schema.ts';
import {scoreErrors} from '../../src/videos/beat/check.ts';
import {countErrors} from '../beat-gates.ts';
import {schemas} from '../../src/videos/schemas.ts';
import {validateProps} from '../../src/agent/handoff.ts';
import {LAUNCH} from './briefs.mjs';
import {presetProps} from './catalog.mjs';

const id = process.argv[2];
const b = LAUNCH.find((x) => x.id === id);
const s = scoreOf(templateMeta[id]);
const e = [];
if (!s) e.push('meta.ts does not carry a beat score');
else {
  e.push(...scoreErrors(s).map((x) => `score: ${x}`));
  if (s.sound) e.push('score: remove the "sound" block; the score is timing only');
  e.push(...countErrors(s));
  if (b.list && !s.list) e.push('score: this template needs a "list" with role "list"');
  if (s.list && (s.list.max !== b.list?.max || s.list.itemMax !== b.list?.itemMax || s.list.min !== 1)) e.push(`score.list must have min 1, max ${b.list?.max}, itemMax ${b.list?.itemMax}`);
  const seconds = templateMeta[id].durationInFrames / 30;
  if (Math.abs(seconds - b.seconds) > 3) e.push(`length is ${seconds.toFixed(1)} s; the brief asks for about ${b.seconds} s`);
  const r = validateProps(schemas[id], presetProps(b));
  if (!r.ok) e.push(`preset: ${r.error}`);
}
if (e.length) { console.log(e.join('\n')); process.exit(1); }
console.log('ok');
