// Generate a template one-shot with Claude on Amazon Bedrock.
// Usage: node scripts/generate.mjs <id>            (fresh generation)
//        node scripts/generate.mjs <id> --repair   (send tsc errors back once)
// Saves the exact request and raw response under generations/<id>/ and writes
// Claude's files unedited to src/videos/<id>/.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {effectChoiceSchema, effectPrompt} from '../src/direction/effects.ts';

const root = path.resolve(import.meta.dirname, '..');
const MODEL = process.env.MODEL || 'eu.anthropic.claude-opus-5-5';
const EFFORT = process.env.EFFORT || 'medium';
if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(EFFORT)) throw new Error(`Invalid EFFORT ${EFFORT}`);
const REGION = process.env.AWS_REGION || 'eu-north-1';
const [id, flag] = process.argv.slice(2);
const briefs = JSON.parse(fs.readFileSync(path.join(root, 'generations/briefs.json'), 'utf8'));
const brief = briefs[id];
if (!brief) throw new Error(`No brief for ${id}`);

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const Name = brief.name;
// Optional brief.effects: [{id, at, why}] from src/direction/effects.ts. Omit it to let the model choose.
const effects = (brief.effects ?? []).map((e) => effectChoiceSchema.parse(e));

const slots = brief.slots ?? ['background'];
const imageRule = brief.kind !== 'image' ? '' : `
- This is an image template. Its images already exist in ./assets/ (records are provided below). Import records with \`import {${id}Assets} from './assets'\` and files with \`import {${id}Files} from './assets/files'\`. The schema adds \`media: z.object({${slots.map((s) => `${s}: assetSchema(${id}Assets)`).join(', ')}}).strict()\`. A full-frame photo must use <Backdrop> from '../media/Backdrop' with one zone per large text block, and labelShadow(theme.background) as textShadow on small labels such as brand or date and foreground set to every theme color used for text over it. Never use one zone for the whole frame: the photo must stay visible outside the text. Pass push-ins and drifts as the motion prop (a CSS transform) so only the photo moves and the scrims stay under the text. Inline photos in cards or frames can use <Img> from remotion directly.`;

const system = `You write Remotion (v4) compositions for a template marketplace. Templates must follow this editing contract exactly:
- All copy comes from props.texts, using only the shared roles in vocab.ts. All color comes from props.theme (5 roles). Never hardcode brand copy or colors (neutral shadows and fixed UI chrome like window dots are fine).
- Export a meta object (TemplateMeta) whose scenes list drives the <Sequence> timeline in the component, so metadata and render always agree.
- Text must fit for any value up to each role's max length. Use the shared fit() helper or your own wrapping.
- Rendering must be deterministic: use remotion's random(seed), never Math.random. No external assets, fonts, or network.
- Only import from react, remotion, zod, '../contract', '../shared/motion', '../shared/fonts', '../shared/scenes', and your own files.${brief.kind === '3d' ? `
- This is a 3D template. Render all 3D through <Scene3D> from '../three/Scene3D'; children are @react-three/fiber JSX (mesh, boxGeometry, meshStandardMaterial, lights). Drive every transform from useCurrentFrame(); never use useFrame, clocks, or Math.random. Keep editable text in normal HTML layers above the canvas, with data-text-role spans.` : ''}${imageRule}

Reply with exactly three files, each as a line "FILE: <name>" followed by one fenced code block: meta.ts, schema.ts, ${Name}.tsx. No other prose.`;

const context = [
  ['src/videos/vocab.ts', read('src/videos/vocab.ts')],
  ['src/videos/contract.ts', read('src/videos/contract.ts')],
  ['src/videos/shared/motion.tsx', read('src/videos/shared/motion.tsx')],
  ['src/videos/stack/meta.ts (example)', read('src/videos/stack/meta.ts')],
  ['src/videos/stack/schema.ts (example)', read('src/videos/stack/schema.ts')],
  ['src/videos/stack/Stack.tsx (example)', read('src/videos/stack/Stack.tsx')],
  ['src/videos/shared/fonts.ts', read('src/videos/shared/fonts.ts')],
  ['src/videos/shared/scenes.tsx', read('src/videos/shared/scenes.tsx')],
  ...(brief.kind === '3d' ? [
    ['src/videos/three/Scene3D.tsx', read('src/videos/three/Scene3D.tsx')],
    ['src/videos/orbit3d/Orbit3d.tsx (3D example)', read('src/videos/orbit3d/Orbit3d.tsx')],
  ] : []),
  ...(brief.kind === 'image' ? [
    ['src/videos/media/catalog.ts', read('src/videos/media/catalog.ts')],
    ['src/videos/media/Backdrop.tsx', read('src/videos/media/Backdrop.tsx')],
    [`src/videos/${id}/assets/records.json (your images)`, read(`src/videos/${id}/assets/records.json`)],
    ['src/videos/phototitle/schema.ts (image example)', read('src/videos/phototitle/schema.ts')],
    ['src/videos/phototitle/Phototitle.tsx (image example)', read('src/videos/phototitle/Phototitle.tsx')],
  ] : []),
]
  .map(([n, c]) => `### ${n}\n\`\`\`ts\n${c}\n\`\`\``)
  .join('\n\n');

const spec = `Create the template "${id}" (component export name ${Name}, schema export ${id}Schema, props type ${Name}Props, meta export ${id}Meta).
Fixed technical spec: ${brief.width}x${brief.height}, ${brief.fps} fps, ${brief.durationInFrames} frames. Text roles (exactly these): ${brief.roles.join(', ')}.
Use scene types and motion values from vocab.ts only.

Creative brief:
${brief.prompt}

${effectPrompt(effects)}

Make it look distinctly different from the example template.`;

const dir = path.join(root, 'generations', id);
fs.mkdirSync(dir, {recursive: true});

let messages = [{role: 'user', content: [{text: `${context}\n\n${spec}`}]}];
let attempt = 1;
if (flag === '--repair') {
  const prev = JSON.parse(fs.readFileSync(path.join(dir, 'log.json'), 'utf8'));
  attempt = prev.attempts.length + 1;
  messages = prev.messages;
  const errors = fs.readFileSync(path.join(dir, `tsc-${attempt - 1}.txt`), 'utf8');
  messages.push({role: 'user', content: [{text: `The type check failed:\n\n${errors}\n\nReturn all three files again, fixed, in the same format.`}]});
}

const input = {modelId: MODEL, system: [{text: system}], messages, inferenceConfig: {maxTokens: 32000},
  additionalModelRequestFields: {output_config: {effort: EFFORT}}};
const tmp = path.join(os.tmpdir(), `gen-${id}.json`);
fs.writeFileSync(tmp, JSON.stringify(input));
const t0 = Date.now();
const out = JSON.parse(
  execFileSync('aws', ['bedrock-runtime', 'converse', '--region', REGION, '--cli-read-timeout', '900', '--cli-input-json', `file://${tmp}`], {
    maxBuffer: 64 * 1024 * 1024,
  }).toString(),
);
const text = out.output.message.content.map((c) => c.text ?? '').join('');
messages.push({role: 'assistant', content: [{text}]});
fs.writeFileSync(path.join(dir, `response-${attempt}.md`), text);

const files = [...text.matchAll(/FILE:\s*`?([\w.]+)`?\s*\n+```[a-z]*\n([\s\S]*?)\n```/g)];
if (files.length !== 3) throw new Error(`Expected 3 files, got ${files.length}; see response-${attempt}.md`);
const target = path.join(root, 'src/videos', id);
fs.mkdirSync(target, {recursive: true});
// Replace only the code files; generated image assets in assets/ stay.
for (const f of fs.readdirSync(target)) if (/\.tsx?$/.test(f)) fs.rmSync(path.join(target, f));
for (const [, name, code] of files) fs.writeFileSync(path.join(target, name), code + '\n');

const logPath = path.join(dir, 'log.json');
const log = fs.existsSync(logPath) && flag === '--repair' ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : {model: MODEL, effort: EFFORT, system, attempts: []};
if (log.effort && log.effort !== EFFORT) throw new Error(`Repair effort ${EFFORT} does not match original effort ${log.effort}`);
log.messages = messages;
log.attempts.push({attempt, ms: Date.now() - t0, usage: out.usage, stopReason: out.stopReason, files: files.map((f) => f[1])});
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
// Opus 5.5 on Bedrock: USD 5 per million input tokens and USD 25 per million output tokens.
const cost = (out.usage.inputTokens * 5 + out.usage.outputTokens * 25) / 1e6;
fs.mkdirSync(path.join(root, 'output'), {recursive: true});
fs.appendFileSync(path.join(root, 'output/template-costs.jsonl'), `${JSON.stringify({at: new Date().toISOString(), id, attempt, model: MODEL, effort: EFFORT, usage: out.usage, cost})}\n`);
console.log(JSON.stringify({id, attempt, usage: out.usage, cost, stop: out.stopReason, files: files.map((f) => f[1])}));
