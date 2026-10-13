// Export a template's timing plan for the music stage: tempo, bars, scenes, cues, list accents per count,
// risers, and length, in beats, 16th steps, frames, and seconds. Music lands on this plan and never changes it.
// Usage: node --import tsx scripts/beat/timing-export.mjs <template> [count]
import {templateMeta} from '../../src/videos/meta.ts';
import {scoreOf} from '../../src/videos/beat/schema.ts';
import {timingPlan} from '../../src/videos/song/timing.ts';

const [id, count] = process.argv.slice(2);
const score = scoreOf(templateMeta[id]);
if (!score) throw new Error(`${id} has no beat score`);
console.log(JSON.stringify(timingPlan(score, count === undefined ? undefined : Number(count)), null, 2));
