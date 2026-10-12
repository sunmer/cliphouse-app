// Convert one template to the beat contract with Opus: a score designed from the template's own look,
// a rewritten composition that reads every time from the shared plan, and migrated presets.
// Usage: node scripts/beat/convert.mjs <template> plan     first conversion
//        node scripts/beat/convert.mjs <template> repair   send type-check, schema, and gate errors back
//        node scripts/beat/convert.mjs <template> review   send beat sheets and the user's notes back (NOTES=...)
// Validates the AWS identity first and stops on failure. It never starts a login.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const MODEL = process.env.MODEL || 'eu.anthropic.claude-opus-5-5';
const EFFORT = process.env.EFFORT || 'high';
const REGION = process.env.AWS_REGION || 'eu-north-1';
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 64000);
const [id, step] = process.argv.slice(2);
if (!id || !['plan', 'repair', 'review'].includes(step)) throw new Error('Usage: convert.mjs <template> <plan|repair|review>');

try { execFileSync('aws', ['sts', 'get-caller-identity', '--output', 'text', '--query', 'Arn'], {stdio: ['ignore', 'pipe', 'pipe']}); }
catch (e) { console.error(`AWS identity check failed: ${(e.stderr ?? e.message).toString().trim()}`); process.exit(2); }

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const manifest = JSON.parse(read('src/catalog/manifest.json'));
const template = manifest.templates.find((t) => t.id === id);
if (!template) throw new Error(`Unknown template ${id}`);
const variants = manifest.variants.filter((v) => v.template === id);
const engine = JSON.parse(read('src/videos/engine.ts').match(/HYPERFRAMES_TEMPLATES = (\[[^\]]+\])/)[1].replaceAll("'", '"')).includes(id) ? 'hyperframes' : 'remotion';
const dir = path.join(root, 'output/beat-convert', id);
fs.mkdirSync(dir, {recursive: true});
const logPath = path.join(dir, 'log.json');
const vdir = `src/videos/${id}`;
const component = fs.readdirSync(path.join(root, vdir)).find((f) => f.endsWith('.tsx'));
const Name = component ? component.replace(/\.tsx$/, '') : id[0].toUpperCase() + id.slice(1);
const hfPath = `src/hyperframes/${id}/index.html`;

// Other templates' sound prints, so Opus can keep this one distinct.
const others = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
  const {templateMeta} = await import('./src/videos/meta.ts');
  const {scoreOf} = await import('./src/videos/beat/schema.ts');
  const {soundPrint} = await import('./src/videos/beat/variety.ts');
  const out = {};
  for (const [k, m] of Object.entries(templateMeta)) { const s = scoreOf(m); if (s && k !== ${JSON.stringify(id)}) out[k] = soundPrint(s); }
  console.log(JSON.stringify(out));`], {cwd: root}).toString());

const reference = engine === 'remotion'
  ? [['src/videos/ticker/score.json (a converted example)', read('src/videos/ticker/score.json')],
     ['src/videos/ticker/schema.ts', read('src/videos/ticker/schema.ts')], ['src/videos/ticker/meta.ts', read('src/videos/ticker/meta.ts')]]
  : [['src/videos/ticker/score.json (a converted example, Remotion)', read('src/videos/ticker/score.json')]];

const shared = [
  ['docs/direction.md', read('docs/direction.md')],
  ['src/videos/vocab.ts', read('src/videos/vocab.ts')],
  ['src/videos/beat/score.ts', read('src/videos/beat/score.ts')],
  ['src/videos/beat/plan.ts', read('src/videos/beat/plan.ts')],
  ['src/videos/beat/list.ts', read('src/videos/beat/list.ts')],
  ['src/videos/beat/schema.ts', read('src/videos/beat/schema.ts')],
  ['src/videos/beat/check.ts (the score rules)', read('src/videos/beat/check.ts')],
  ['src/videos/beat/genres.ts (genre starting points)', read('src/videos/beat/genres.ts')],
  ...(engine === 'remotion'
    ? [['src/videos/beat/remotion.tsx', read('src/videos/beat/remotion.tsx')], ['src/videos/shared/motion.tsx', read('src/videos/shared/motion.tsx')], ['src/videos/shared/fonts.ts', read('src/videos/shared/fonts.ts')]]
    : [['src/hyperframes/shared/beat-entry.ts (the runtime, inlined as CliphouseBeat)', read('src/hyperframes/shared/beat-entry.ts')], ['src/hyperframes/shared/base.css', read('src/hyperframes/shared/base.css')], ['src/hyperframes/shared/base.js', read('src/hyperframes/shared/base.js')]]),
  ...reference,
];
const own = engine === 'remotion'
  ? fs.readdirSync(path.join(root, vdir)).filter((f) => /\.(tsx?|json)$/.test(f) && f !== 'direction.json').map((f) => [`${vdir}/${f} (current)`, read(`${vdir}/${f}`)])
  : [[`${hfPath} (current)`, read(hfPath)], ...fs.readdirSync(path.join(root, vdir)).filter((f) => /\.(tsx?|json)$/.test(f) && f !== 'direction.json').map((f) => [`${vdir}/${f} (current)`, read(`${vdir}/${f}`)])];
const media = exists(`${vdir}/assets/records.json`) ? [[`${vdir}/assets/index.ts`, read(`${vdir}/assets/index.ts`)], ['src/videos/media/Backdrop.tsx', read('src/videos/media/Backdrop.tsx')]] : [];
const three = /from '\.\.\/three\//.test(own.map(([, c]) => c).join('\n')) ? [['src/videos/three/Scene3D.tsx', read('src/videos/three/Scene3D.tsx')]] : [];
const block = (files) => files.map(([n, c]) => `### ${n}\n\`\`\`${n.endsWith('.json') ? 'json' : n.endsWith('.html') ? 'html' : n.endsWith('.md') ? 'md' : 'ts'}\n${c}\n\`\`\``).join('\n\n');

const files = engine === 'remotion' ? ['score.json', 'schema.ts', 'meta.ts', `${Name}.tsx`, 'presets.json'] : ['score.json', 'schema.ts', 'meta.ts', 'index.html', 'presets.json'];
const system = `You convert motion-graphics templates for a template marketplace to a shared beat contract. You are a world-class motion designer and a dance-music producer.

Rules:
- All copy comes from props.texts and all color from props.theme. Never hardcode copy or colors.
- Every visual time comes from the score through the shared plan (${engine === 'remotion' ? 'useBeat' : 'CliphouseBeat.mount'}). Never hardcode a frame or second that is not derived from a beat.
- Rendering is deterministic: ${engine === 'remotion' ? "remotion's random(seed), never Math.random; no CSS animations or transitions; compute every style from useCurrentFrame()" : 'one paused GSAP timeline at absolute beat times, no repeat or yoyo, no timers or clocks'}.
- Every text role must stay readable for any length up to its max. Each list item must be fully readable and still for at least 30 frames.
- Decorative repeats of a text role (marquee bands, echoes) carry data-text-copy; exactly one real copy of each role at a time does not.
- Each list item element carries data-text-role="list" and data-list-item="<index>".
- Follow docs/direction.md, including its banned list.

Reply in this format and nothing else:
CONCEPT: <one line>
SOUND: <one line: why this genre, tempo, key, and timbre fit this template's picture>
BEATS:
<one line per beat range: what lands>
${files.map((f) => `FILE: ${f}\n\`\`\`\n...\n\`\`\``).join('\n')}`;

const listRoles = (texts) => Object.keys(texts).filter((r) => /^point\d$|^items$|^chart$/.test(r));
const seconds = (() => { const m = (own.find(([n]) => n.includes('meta.ts')) ?? ['', ''])[1].match(/durationInFrames:\s*(\d+)/); return m ? Number(m[1]) / 30 : null; })();
const spec = `Convert the template "${id}" (${engine}). The engine, width, and height stay the same.
Catalog brief: ${template.prompt}
Catalog presets (props to migrate): ${JSON.stringify(variants.map((v) => ({id: v.id, props: v.props})))}

What to do:
1. Design score.json for this template only. Read its look, pacing, and purpose, then choose a genre from GENRES and adjust every sound value so the music feels made for this picture: tempo (beatFrames), key and scale, progression, swing, kick, hats, snare, bass, chords, percussion, space, and pump. Calm editorial pieces can be deep house or minimal; loud sale ads tech house, electro, or techno; playful pieces disco or garage. Set sound.seed to ${hashOf(id)}.
   It must sound distinct from every converted template so far (share at most 4 of the 7 traits tempo, genre, key, progression, groove, timbre, swing): ${JSON.stringify(others)}
2. Keep the length close to the current ${seconds ? `${seconds} s` : 'length'} (whole bars only). Scenes are whole bars. Every scene has an energy level; build to energy 3 for the strongest moment in the last third.
3. ${listRoles(variants[0]?.props.texts ?? {}).length ? `Replace the list roles (${listRoles(variants[0].props.texts).join(', ')}) with one packed "list" role, one item per line. Capacity (list.max) is the item count of the first preset. min is 1 unless the design truly needs more (a chart needs 2). Set itemMax to the longest item the layout can hold readably (at most 48). For chart data use format "chart" ("Label 42" per line). Author a schedule for every count from min to max: preserve each item's entrance speed and reflow the layout per count; use the time after the last reveal for a readable hold with restrained motion. Every item lands on its schedule beat plus accentOffset, the beat its sound plays.` : 'This template has no list. Do not add one: omit "list" from the score.'}
4. Add cues for the fixed landings: each cue is one visual event and its sound on the same beat (a stamp, a slam, a flood, the brand landing). One impact, stamp, crash, or stab cue sits in the last third.
5. Rewrite the composition on the beat contract. Preserve the template's visual identity, layout ideas, and colors, and apply the motion direction: continuity between scenes, something landing on every beat, strong ease-outs, masks for text, no crossfades. Use the remaining roles unchanged.
6. presets.json: the migrated props for every preset, as {"<variant id>": props}. Props are {texts, theme, audio: {"enabled": true}${media.length ? ', media' : ''}}, with list text joined by "\\n" and every role the schema declares.
${engine === 'hyperframes' ? '7. index.html: keep data-composition-variables=\'[]\' (the build fills it), __ASSET_BASE__, __BASE_CSS__, __BASE_JS__, and inline the runtime with <script>__BEAT_JS__</script>, then build on CliphouseBeat.mount(tl, __SCORE__, (tl, m) => {...}). List rows come from <template data-list-row> inside a [data-list] host; fixed text uses data-beat-text="<role>" for word masks or data-var-text="text_<role>". Register window.__timelines.main = tl.' : `7. ${Name}.tsx keeps the export name ${Name} and reads score from './score'. meta.ts uses beatMeta and keeps id "${id}", name, width, height, and a posterFrame where everything is readable. schema.ts uses beatSchema${media.length ? ' and keeps the media field' : ''}.`}`;

function hashOf(text) { let h = 2166136261; for (const c of text) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0; return h; }

function converse(messages) {
  const input = {modelId: MODEL, system: [{text: system}], messages, inferenceConfig: {maxTokens: MAX_TOKENS},
    additionalModelRequestFields: {output_config: {effort: EFFORT}}};
  const tmp = path.join(os.tmpdir(), `beat-convert-${id}.json`);
  fs.writeFileSync(tmp, JSON.stringify(input));
  const t0 = Date.now();
  const out = JSON.parse(execFileSync('aws', ['bedrock-runtime', 'converse', '--region', REGION, '--cli-read-timeout', '1800',
    '--cli-input-json', `file://${tmp}`], {maxBuffer: 128 * 1024 * 1024}).toString());
  return {out, ms: Date.now() - t0, text: out.output.message.content.map((c) => c.text ?? '').join('')};
}

const log = step === 'plan' || !fs.existsSync(logPath) ? {model: MODEL, effort: EFFORT, attempts: [], messages: []} : JSON.parse(fs.readFileSync(logPath, 'utf8'));
let messages = step === 'plan' ? [] : log.messages;
if (step === 'plan') messages = [{role: 'user', content: [{text: `${block([...shared, ...media, ...three])}\n\n${block(own)}\n\n${spec}`}]}];
else if (step === 'repair') messages.push({role: 'user', content: [{text: `The checks failed:\n\n${fs.readFileSync(path.join(dir, 'errors.txt'), 'utf8').slice(0, 20000)}\n\nFix every error. Reply in the same format with every file in full.`}]});
else {
  const sheets = fs.readdirSync(path.join(dir, 'sheets')).filter((f) => f.endsWith('.png')).sort();
  messages.push({role: 'user', content: [
    {text: `Here is your render. Sheets named beats-<n>-items show one still per beat for that list count (left to right, top to bottom, from frame 0). short-* and max-* show every scene focus frame with the shortest and longest text.${process.env.NOTES ? `\n\nThe art director's notes:\n${process.env.NOTES}` : ''}`},
    ...sheets.flatMap((f) => [{text: f}, {image: {format: 'png', source: {bytes: fs.readFileSync(path.join(dir, 'sheets', f)).toString('base64')}}}]),
    {text: 'Review it as a motion director. List what is cluttered, off the beat, overlapping, cut off, hard to read, empty for too long, banned by the style guide, or unfaithful to the original identity. Then fix all of it. Reply in the same format with every file in full.'},
  ]});
}

const {out, ms, text} = converse(messages);
messages.push({role: 'assistant', content: [{text}]});
const attempt = log.attempts.length + 1;
fs.writeFileSync(path.join(dir, `response-${attempt}-${step}.md`), text);
log.messages = messages.map((m) => ({...m, content: m.content.map((c) => (c.image ? {text: '[sheet image]'} : c))}));
const cost = (out.usage.inputTokens * 5 + out.usage.outputTokens * 25) / 1e6;
log.attempts.push({attempt, step, ms, usage: out.usage, stopReason: out.stopReason, cost});
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
fs.appendFileSync(path.join(root, 'output/template-costs.jsonl'), `${JSON.stringify({at: new Date().toISOString(), id, attempt, step: `beat-${step}`, model: MODEL, effort: EFFORT, usage: out.usage, cost})}\n`);

const got = new Map([...text.matchAll(/FILE:\s*`?([\w.]+)`?\s*\n+```[a-z]*\n([\s\S]*?)\n```/g)].map((m) => [m[1], m[2]]));
const missing = files.filter((f) => !got.has(f));
if (missing.length) { console.log(JSON.stringify({id, step, attempt, cost, stop: out.stopReason, error: `missing ${missing.join(', ')}`})); process.exit(3); }
// Write the candidate next to the log. The pipeline applies it to the tree under a lock and checks it.
const cand = path.join(dir, 'candidate');
fs.rmSync(cand, {recursive: true, force: true});
fs.mkdirSync(cand, {recursive: true});
for (const f of files) fs.writeFileSync(path.join(cand, f), `${got.get(f)}\n`);
fs.writeFileSync(path.join(cand, 'score.ts'), `import type {BeatScore} from '../beat/score.ts';\nimport json from './score.json' with {type: 'json'};\n\nexport const ${id}Score = json as BeatScore;\n`);
fs.writeFileSync(path.join(dir, 'presets.json'), got.get('presets.json'));
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({concept: text.match(/CONCEPT:\s*(.*)/)?.[1], sound: text.match(/SOUND:\s*(.*)/)?.[1]}, null, 2));
console.log(JSON.stringify({id, step, attempt, usage: out.usage, cost: Math.round(cost * 100) / 100, s: Math.round(ms / 1000), stop: out.stopReason,
  concept: text.match(/CONCEPT:\s*(.*)/)?.[1], sound: text.match(/SOUND:\s*(.*)/)?.[1]}));
