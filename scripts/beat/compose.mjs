// The music stage: write a template's song (src/videos/<id>/candidate song.ts) from its timing plan, with the
// synth-music-from-code skill as the composition and mixing guide. The picture is never changed here.
// Usage: node scripts/beat/compose.mjs <template> compose   first song
//        node scripts/beat/compose.mjs <template> repair    send audio-gate errors and the mix report back
//        node scripts/beat/compose.mjs <template> revise    send the user's listening notes back (NOTES=...)
// Validates the AWS identity first and stops on failure. It never starts a login.
// MUSIC_PROVIDER=openrouter uses OpenRouter instead of Bedrock (OPENROUTER_API_KEY, MUSIC_MODEL an OpenRouter id,
// MUSIC_ROUTE a pinned provider tag). GENRE asks for a genre. MUSIC_OUT writes to another folder, so trials never
// touch the published song.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const REGION = process.env.AWS_REGION || 'eu-north-1';
const OPENROUTER = process.env.MUSIC_PROVIDER === 'openrouter';
const MODEL = process.env.MUSIC_MODEL || (OPENROUTER ? 'deepseek/deepseek-v4.1-flash-1017' : 'eu.anthropic.claude-sonnet-5-5');
const EFFORT = process.env.MUSIC_EFFORT || 'high';
const GENRE = process.env.GENRE;
const PRICES = {opus: [5, 25], sonnet: [3, 15], haiku: [1, 5]};
const [inRate, outRate] = PRICES[Object.keys(PRICES).find((k) => MODEL.includes(k)) ?? 'opus'];
const costOf = (u) => ((u.inputTokens ?? 0) * inRate + (u.cacheReadInputTokens ?? 0) * inRate * 0.1
  + (u.cacheWriteInputTokens ?? 0) * inRate * 1.25 + (u.outputTokens ?? 0) * outRate) / 1e6;
const [id, step] = process.argv.slice(2);
if (!id || !['compose', 'repair', 'revise'].includes(step)) throw new Error('Usage: compose.mjs <template> <compose|repair|revise>');

if (!OPENROUTER) {
  try { execFileSync('aws', ['sts', 'get-caller-identity', '--output', 'text', '--query', 'Arn'], {stdio: ['ignore', 'pipe', 'pipe']}); }
  catch (e) { console.error(`AWS identity check failed: ${(e.stderr ?? e.message).toString().trim()}`); process.exit(2); }
} else if (!process.env.OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY is not set.'); process.exit(2); }

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dir = path.join(root, process.env.MUSIC_OUT || 'output/beat-music', id);
fs.mkdirSync(dir, {recursive: true});
const logPath = path.join(dir, 'log.json');
const skill = 'vendor/synth-music-from-code';
const timing = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/beat/timing-export.mjs', id], {cwd: root}).toString();
const manifest = JSON.parse(read('src/catalog/manifest.json'));
const template = manifest.templates.find((t) => t.id === id);
const others = fs.readdirSync(path.join(root, 'src/videos')).filter((d) => d !== id && fs.existsSync(path.join(root, 'src/videos', d, 'song.ts')))
  .map((d) => `${d}: ${(read(`src/videos/${d}/song.ts`).match(/genre:\s*'([^']+)'/) ?? [])[1]} in ${(read(`src/videos/${d}/song.ts`).match(/key:\s*'([^']+)'/) ?? [])[1]}`);

const guide = [
  [`${skill}/SKILL.md`, read(`${skill}/SKILL.md`)],
  [`${skill}/references/composition.md`, read(`${skill}/references/composition.md`)],
  [`${skill}/references/mixing.md`, read(`${skill}/references/mixing.md`)],
  [`${skill}/references/engine.md`, read(`${skill}/references/engine.md`)],
  [`${skill}/references/lessons.md`, read(`${skill}/references/lessons.md`)],
  [`${skill}/scripts/songs.js (worked examples; the engine is the same)`, read(`${skill}/scripts/songs.js`)],
  ['src/videos/song/helpers.ts', read('src/videos/song/helpers.ts')],
  ['src/videos/song/fit.ts (how your song meets the timing)', read('src/videos/song/fit.ts')],
];
const block = (files) => files.map(([n, c]) => `### ${n}\n\`\`\`${n.endsWith('.md') ? 'md' : 'ts'}\n${c}\n\`\`\``).join('\n\n');

const system = `You write the music for motion-graphics templates. Every sound is synthesized by the engine in the skill below: you write note data, never audio.

Follow the skill, especially its main lesson: drums, bass, and two or three chords; the hook is the chord rhythm, not a melody. No lead melody.

The template's video is already cut. Its timing plan is fixed and you must land on it, not change it:
- Tempo and length come from the plan. Do not set bpm or length in the song.
- One 16th step lasts plan.stepSeconds. Steps run from 0 to plan.steps - 1. Bar n starts at step n * 16.
- Put a clear, matching hit on every cue's step: impact, stamp, or crash cues get a kick plus crash or boom; snap, clap, or tom cues get that drum; voice cues (bell, pluck, keys, lead, blip, chord) get a short chord stab or a single chord tone. Velocity follows the cue velocity.
- Scene energy 0 is chords and air only, 1 adds kick and hats, 2 adds bass and clap, 3 is everything (open hats, ride, pad, crash). A riser part covers each riser window and ends where it ends.
- The video loops. There is no tail after the end: set finalStep to the last cue in the last scene, or to the last bar's downbeat, and let the last bar hold that hit. Keep the first bar's downbeat strong so the loop restarts cleanly.
- List items: do not write their notes. Set "items" to a short, bright voice (pluck, fmpluck, or stab) with one pitch per item, chord tones of the bar each item lands in, rising through the list. The code places one note on each item's accent for every item count, so removing an item removes only its note.
- Every pitched note, including tuned drums, is in your key.
${GENRE ? `- The genre is ${GENRE}. Use its typical drums, swing, sound palette, and chord voicings. Tempo stays the plan's.` : `- Make it sound distinct from the other templates: ${others.length ? others.join('; ') : 'none yet'}.`}

Reply in this format and nothing else:
STYLE: <one line: the genre, key, and why they fit this picture>
FILE: song.ts
\`\`\`ts
import {bar, bars, cat, chord, drums, hits} from '../song/helpers.ts';
import type {TemplateSong} from '../song/fit.ts';
...
const song: TemplateSong = { id: '${id}', title: ..., genre: ..., key: ..., scale: [...], finalStep: ..., seed: ..., sections: [...], delay: {...}, reverb: {...}, master: {...}, parts: [...], items: {...} };
export default song;
\`\`\``;

const spec = `Write the song for "${id}".
Catalog brief: ${template.prompt}
Timing plan:
\`\`\`json
${timing}
\`\`\``;

// OpenRouter: the same messages in chat format, pinned to one provider. The returned usage.cost is the charge.
function converseOpenRouter(messages) {
  const text = (m) => m.content.map((c) => c.text ?? '').join('\n\n');
  const body = {model: MODEL, max_tokens: 64000, reasoning: {effort: EFFORT}, usage: {include: true},
    ...(process.env.MUSIC_ROUTE ? {provider: {only: [process.env.MUSIC_ROUTE], allow_fallbacks: false}} : {}),
    messages: [{role: 'system', content: system}, ...messages.map((m) => ({role: m.role, content: text(m)}))]};
  const tmp = path.join(os.tmpdir(), `beat-music-${id}-or.json`);
  fs.writeFileSync(tmp, JSON.stringify(body));
  const t0 = Date.now();
  const raw = execFileSync('curl', ['-sS', '--max-time', '1200', 'https://openrouter.ai/api/v1/chat/completions', '-H', 'content-type: application/json',
    '-H', `authorization: Bearer ${process.env.OPENROUTER_API_KEY}`, '--data-binary', `@${tmp}`], {maxBuffer: 64 * 1024 * 1024}).toString();
  const res = JSON.parse(raw);
  if (res.error) throw new Error(`OpenRouter: ${JSON.stringify(res.error).slice(0, 400)}`);
  const u = res.usage ?? {};
  return {ms: Date.now() - t0, text: res.choices?.[0]?.message?.content ?? '', cost: u.cost,
    out: {stopReason: res.choices?.[0]?.finish_reason, provider: res.provider, model: res.model,
      usage: {inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens, reasoningTokens: u.completion_tokens_details?.reasoning_tokens}}};
}

function converse(messages) {
  if (OPENROUTER) return converseOpenRouter(messages);
  const input = {modelId: MODEL, system: [{text: system}], messages, inferenceConfig: {maxTokens: 32000},
    additionalModelRequestFields: {output_config: {effort: EFFORT}}};
  const tmp = path.join(os.tmpdir(), `beat-music-${id}.json`);
  fs.writeFileSync(tmp, JSON.stringify(input));
  const t0 = Date.now();
  const out = JSON.parse(execFileSync('aws', ['bedrock-runtime', 'converse', '--region', REGION, '--cli-read-timeout', '900', '--cli-connect-timeout', '60',
    '--cli-input-json', `file://${tmp}`], {maxBuffer: 64 * 1024 * 1024}).toString());
  return {out, ms: Date.now() - t0, text: out.output.message.content.map((c) => c.text ?? '').join('')};
}

const log = step === 'compose' || !fs.existsSync(logPath) ? {attempts: [], messages: []} : JSON.parse(fs.readFileSync(logPath, 'utf8'));
const messages = step === 'compose' ? [{role: 'user', content: [{text: block(guide)}, {cachePoint: {type: 'default'}}, {text: spec}]}] : log.messages;
if (step === 'repair') messages.push({role: 'user', content: [{text: `The audio checks failed or the mix report shows problems:\n\n${fs.readFileSync(path.join(dir, 'errors.txt'), 'utf8').slice(0, 12000)}\n\nFix all of it. Reply in the same format with song.ts in full.`}]});
if (step === 'revise') messages.push({role: 'user', content: [{text: `The listener's notes:\n${process.env.NOTES ?? ''}\n\nFix exactly what they describe and keep what works. Reply in the same format with song.ts in full.`}]});

const {out, ms, text, cost: charged} = converse(messages);
messages.push({role: 'assistant', content: [{text}]});
const attempt = log.attempts.length + 1;
const cost = typeof charged === 'number' ? charged : costOf(out.usage);
fs.writeFileSync(path.join(dir, `response-${attempt}-${step}.md`), text);
log.messages = messages;
log.attempts.push({attempt, step, model: MODEL, ...(out.provider ? {provider: out.provider, resolved: out.model} : {}), ms, usage: out.usage, stopReason: out.stopReason, cost});
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
fs.appendFileSync(path.join(root, 'output/template-costs.jsonl'), `${JSON.stringify({at: new Date().toISOString(), id, attempt, step: `music-${step}`, model: MODEL, effort: EFFORT, usage: out.usage, cost})}\n`);
const code = text.match(/FILE:\s*`?song\.ts`?\s*\n+```[a-z]*\n([\s\S]*?)\n```/)?.[1];
const style = text.match(/STYLE:\s*(.*)/)?.[1];
if (!code) { console.log(JSON.stringify({id, step, attempt, cost, stop: out.stopReason, error: 'missing song.ts'})); process.exit(3); }
fs.writeFileSync(path.join(dir, 'song.ts'), `${code}\n`);
console.log(JSON.stringify({id, step, attempt, model: MODEL, usage: out.usage, cost: Math.round(cost * 100) / 100, s: Math.round(ms / 1000), stop: out.stopReason, style}));
