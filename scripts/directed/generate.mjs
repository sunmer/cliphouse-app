// Directed regeneration pilot: regenerate an existing template with a motion-design style guide,
// a concept and beat map, and one visual review round using rendered beat sheets.
// Usage: node scripts/directed/generate.mjs <template> plan     (generate v-next from the directed prompt)
//        node scripts/directed/generate.mjs <template> review   (send beat sheets back and get a revision)
//        node scripts/directed/generate.mjs <template> repair   (send tsc errors back)
// The text roles, format, and duration are fixed, so saved props stay valid.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const MODEL = process.env.MODEL || 'eu.anthropic.claude-opus-5-5';
const EFFORT = process.env.EFFORT || 'high';
const REGION = process.env.AWS_REGION || 'eu-north-1';
const [id, step] = process.argv.slice(2);
if (!id || !['plan', 'review', 'repair'].includes(step)) throw new Error('Usage: generate.mjs <template> <plan|review|repair>');

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const manifest = JSON.parse(read('src/catalog/manifest.json'));
const template = manifest.templates.find((t) => t.id === id);
const variant = manifest.variants.find((v) => v.template === id);
const dir = path.join(root, 'output/directed-pilot/runs', id);
const target = path.join(root, 'src/videos', id);
fs.mkdirSync(dir, {recursive: true});
const Name = id[0].toUpperCase() + id.slice(1);
const logPath = path.join(dir, 'log.json');

const briefs = {
  lowerthird: 'A 9 second 16:9 lower thirds pack for interviews and podcasts: a name and title strap, a topic strap, and a social handle. The graphics sit in the lower third over a stand-in footage frame and leave the upper two thirds clear. Each strap is built from the previous one.',
  kinetic: 'A 9 second 1:1 kinetic typography piece. The headline, three single words, a subhead, the brand, and a call to action. Type is the image: words become shapes and shapes become the next words.',
  endscreen: 'A 20 second 16:9 YouTube end screen. A short thank-you, then two video placeholder frames labeled with the two points, a subscribe circle, and the brand and call to action. The placeholders must sit still from second 5 to the end so YouTube end-screen elements can be placed over them, while small details keep moving.',
  wordmark: 'A 6 second 16:9 wordmark logo reveal. The brand name is built from a single mark or line, the headline follows as a tagline, and the call to action ends on a clean lockup.',
  ytintro: 'A 6 second 16:9 YouTube channel intro. The channel name arrives with energy on the beat, then the headline and the call to action. It must feel like a confident channel identity, not a glitch effect.',
};

const style = read('docs/direction.md');
const contract = `You write Remotion (v4) compositions for a template marketplace. Templates must follow this editing contract exactly:
- All copy comes from props.texts, using only the shared roles in vocab.ts. All color comes from props.theme (5 roles). Never hardcode brand copy or colors (neutral shadows and fixed UI chrome like window dots are fine).
- Export a meta object (TemplateMeta) whose scenes list drives the timeline in the component, so metadata and render always agree. Scene "from" and "duration" values must match what the component renders.
- Text must fit for any value up to each role's max length. Use the shared fit() or wrapFit() helpers or your own wrapping.
- Rendering must be deterministic: use remotion's random(seed), never Math.random. No external assets, fonts, or network. No CSS animations or transitions: compute every style from useCurrentFrame().
- Only import from react, remotion, zod, '../contract', '../shared/motion', '../shared/fonts', '../shared/scenes', and your own files.

${style}

Reply in this format and nothing else:
CONCEPT: <one line>
BEATS:
<one line per beat: frame range and what lands>
FILE: meta.ts
\`\`\`ts
...
\`\`\`
FILE: ${Name}.tsx
\`\`\`tsx
...
\`\`\``;

const context = [
  ['src/videos/vocab.ts', read('src/videos/vocab.ts')],
  ['src/videos/contract.ts', read('src/videos/contract.ts')],
  ['src/videos/shared/motion.tsx', read('src/videos/shared/motion.tsx')],
  ['src/videos/shared/fonts.ts', read('src/videos/shared/fonts.ts')],
  ['src/videos/shared/scenes.tsx', read('src/videos/shared/scenes.tsx')],
  [`src/videos/${id}/schema.ts (fixed, do not change)`, read(`src/videos/${id}/schema.ts`)],
  [`src/videos/${id}/meta.ts (current version)`, read(`src/videos/${id}/meta.ts`)],
  [`src/videos/${id}/${Name}.tsx (current version, replace it)`, read(`src/videos/${id}/${Name}.tsx`)],
].map(([n, c]) => `### ${n}\n\`\`\`ts\n${c}\n\`\`\``).join('\n\n');

const meta = JSON.parse(execFileSync('node', ['--import', 'tsx', '-e',
  `import('./src/videos/meta.ts').then(m => console.log(JSON.stringify(m.templateMeta['${id}'])))`], {cwd: root}).toString());

const spec = `Write version 3 of the template "${id}". Keep the export names: component ${Name}, meta ${id}Meta, props type ${Name}Props from './schema'.
Fixed: ${meta.width}x${meta.height}, ${meta.fps} fps, ${meta.durationInFrames} frames, the schema.ts file above, and the text roles in it. Every role must appear on screen.
Use scene types and motion values from vocab.ts only. Update posterFrame to a frame that shows the template at its best, with text fully readable.
Example props (the catalog variant): ${JSON.stringify(variant.props)}

Brief:
${briefs[id]}

The current version is plain. Do not keep its ideas. Make the new version look and move like a studio piece.`;

function converse(messages) {
  const input = {modelId: MODEL, system: [{text: contract}], messages, inferenceConfig: {maxTokens: 48000},
    additionalModelRequestFields: {output_config: {effort: EFFORT}}};
  const tmp = path.join(os.tmpdir(), `directed-${id}.json`);
  fs.writeFileSync(tmp, JSON.stringify(input));
  const t0 = Date.now();
  const out = JSON.parse(execFileSync('aws', ['bedrock-runtime', 'converse', '--region', REGION, '--cli-read-timeout', '1200',
    '--cli-input-json', `file://${tmp}`], {maxBuffer: 64 * 1024 * 1024}).toString());
  return {out, ms: Date.now() - t0, text: out.output.message.content.map((c) => c.text ?? '').join('')};
}

const log = step === 'plan' ? {model: MODEL, effort: EFFORT, attempts: [], messages: []} : JSON.parse(fs.readFileSync(logPath, 'utf8'));
let messages = log.messages;
if (step === 'plan') {
  messages = [{role: 'user', content: [{text: `${context}\n\n${spec}`}]}];
} else if (step === 'review') {
  const sheets = path.join(root, 'output/directed-pilot/review', id);
  const image = (name) => ({image: {format: 'png', source: {bytes: fs.readFileSync(path.join(sheets, name)).toString('base64')}}});
  messages.push({role: 'user', content: [
    {text: 'Here is your render. The first image has one still every beat (15 frames), left to right and top to bottom, starting at frame 0 and ending on the last frame. The second image shows each scene focus frame with every text role at its maximum length.'},
    image('beats.png'), image('stress.png'),
    {text: 'Review it as a motion director. List what is cluttered, off the beat, overlapping, cut off, hard to read, empty for too long, or banned by the style guide. Then fix all of it. Reply in the same format with the full files.'},
  ]});
} else {
  const errors = fs.readFileSync(path.join(dir, 'tsc.txt'), 'utf8');
  messages.push({role: 'user', content: [{text: `The type check failed:\n\n${errors}\n\nReturn both files again, fixed, in the same format.`}]});
}

const {out, ms, text} = converse(messages);
messages.push({role: 'assistant', content: [{text}]});
const attempt = log.attempts.length + 1;
fs.writeFileSync(path.join(dir, `response-${attempt}-${step}.md`), text);
const files = [...text.matchAll(/FILE:\s*`?([\w.]+)`?\s*\n+```[a-z]*\n([\s\S]*?)\n```/g)];
const names = files.map((f) => f[1]).sort();
if (names.join() !== [`${Name}.tsx`, 'meta.ts'].sort().join()) throw new Error(`Expected meta.ts and ${Name}.tsx, got ${names}; see response-${attempt}-${step}.md`);
for (const [, name, code] of files) fs.writeFileSync(path.join(target, name), code + '\n');

// Store image blocks as placeholders so the log stays readable; review rebuilds them from disk.
log.messages = messages.map((m) => ({...m, content: m.content.map((c) => (c.image ? {text: '[beat sheet image]'} : c))}));
// Opus 5.5 on Bedrock: USD 5 per million input tokens and USD 25 per million output tokens.
const cost = (out.usage.inputTokens * 5 + out.usage.outputTokens * 25) / 1e6;
log.attempts.push({attempt, step, ms, usage: out.usage, stopReason: out.stopReason, cost});
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
fs.appendFileSync(path.join(root, 'output/template-costs.jsonl'), `${JSON.stringify({at: new Date().toISOString(), id, attempt, step: `directed-${step}`, model: MODEL, effort: EFFORT, usage: out.usage, cost})}\n`);
console.log(JSON.stringify({id, step, attempt, usage: out.usage, cost, ms, stop: out.stopReason, concept: text.match(/CONCEPT:\s*(.*)/)?.[1]}));
