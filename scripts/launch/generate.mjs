// Generate one launch-set template with Claude Opus 5.5 at high effort on the Anthropic API.
// Opus writes the beat timing score and the HyperFrames composition. The pipeline writes the fixed files
// (schema, meta, score.ts) from the brief, so roles, size, and the list contract never drift.
// Usage: node scripts/launch/generate.mjs <id> plan     first version
//        node scripts/launch/generate.mjs <id> repair   send check errors back (errors.txt)
//        node scripts/launch/generate.mjs <id> review   send beat sheets back for a visual review (NOTES=...)
// The candidate lands in output/launch/<id>/candidate; scripts/launch/pipeline.mjs applies and checks it.
import fs from 'node:fs';
import path from 'node:path';
import {message, costOf} from './anthropic.mjs';
import {LAUNCH} from './briefs.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const MODEL = process.env.MODEL || 'claude-opus-5-5';
const EFFORT = process.env.EFFORT || 'high';
const [id, step] = process.argv.slice(2);
if (!id || !['plan', 'repair', 'review'].includes(step)) throw new Error('Usage: generate.mjs <id> <plan|repair|review>');
const b = LAUNCH.find((x) => x.id === id);
if (!b) throw new Error(`Unknown launch template ${id}`);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dir = path.join(root, 'output/launch', id);
const cand = path.join(dir, 'candidate');
fs.mkdirSync(dir, {recursive: true});
const logPath = path.join(dir, 'log.json');
const [w, h] = b.size;

const shared = [
  ['docs/direction.md', read('docs/direction.md')],
  ['src/videos/vocab.ts', read('src/videos/vocab.ts')],
  ['src/videos/beat/score.ts', read('src/videos/beat/score.ts')],
  ['src/videos/beat/plan.ts', read('src/videos/beat/plan.ts')],
  ['src/videos/beat/list.ts', read('src/videos/beat/list.ts')],
  ['src/videos/beat/check.ts (the score rules)', read('src/videos/beat/check.ts')],
  ['src/hyperframes/shared/beat-entry.ts (the runtime, inlined as CliphouseBeat)', read('src/hyperframes/shared/beat-entry.ts')],
  ['src/hyperframes/shared/base.css', read('src/hyperframes/shared/base.css')],
  ['src/hyperframes/shared/base.js', read('src/hyperframes/shared/base.js')],
  ['src/videos/pricedrop/score.json (an example score)', read('src/videos/pricedrop/score.json')],
  ['src/hyperframes/pricedrop/index.html (an example composition on the same runtime)', read('src/hyperframes/pricedrop/index.html')],
  ['src/videos/ticker/score.json (an example score with a list)', read('src/videos/ticker/score.json')],
];
const fence = (n) => n.includes('.json') ? 'json' : n.includes('.html') ? 'html' : n.includes('.md') ? 'md' : 'ts';
const block = (files) => files.map(([n, c]) => `### ${n}\n\`\`\`${fence(n)}\n${c}\n\`\`\``).join('\n\n');

const system = [
  'You are a world-class motion designer who builds HyperFrames (HTML + GSAP) templates for cliphou.se, a free template marketplace for SaaS founders and developer-relations teams who ship launches every week. Every template must look like it came from a studio, not a template pack.',
  '',
  'Rules:',
  '- All copy comes from text variables and all color from the five --theme-* custom properties. Never hardcode copy or colors (neutral shadows are fine).',
  '- Every visual time comes from the score through CliphouseBeat.mount. Never hardcode a second that is not derived from a beat.',
  '- One paused GSAP timeline at absolute beat times. No repeat, yoyo, timers, clocks, CSS animations, or transitions.',
  '- Every text role stays readable for any length up to its max (use the shared data-fit-max and data-fit-min helpers, or wrapping). Every role is fully on screen, still, and readable for at least 30 frames. Each list item is fully readable and still for at least 30 frames.',
  '- Something visibly lands on every beat. No idle hold longer than 2 beats except the final message. The last frame must closely match the first frame so the loop is seamless.',
  '- Decorative repeats of a text role carry data-text-copy. Exactly one real copy of each role is visible at a time.',
  '- List rows come from <template data-list-row> inside a [data-list] host. The runtime sets data-list-item on each row and data-text-role="list" on its [data-list-text] element.',
  '- Every visual repeated per item (checks, markers, pips, meters, rail stops, placeholders) carries data-list-part="<name>". Inside the row template the runtime sets its data-list-item. Outside it, generate the parts with m.parts(host, name, make) from m.items; never hardcode one element per item in HTML. Time each part to its item\'s start or accent. Mark parts drawn before the items data-list-group="scaffold" and deliberate group moments data-list-group="finale". Mark parts that must sit on their item data-list-align="y" (or "x").',
  '- Text never leaves the frame. Text boxes of different roles never overlap for a full beat.',
  '- Follow docs/direction.md, including its banned list.',
  '- The score is timing only: never write a "sound" block. Music comes from a separate library and is mixed under the video.',
  '',
  'Reply in this format and nothing else:',
  'CONCEPT: <one line>',
  'PACE: <one line: why this tempo and these landings fit>',
  'POSTER: <one frame number where every key text is fully readable: the gallery poster>',
  'MOTION: <2-4 labels from MOTION in vocab.ts, comma separated>',
  'BEATS:',
  '<one line per beat range: what lands>',
  'FILE: score.json',
  '```json',
  '...',
  '```',
  'FILE: index.html',
  '```html',
  '...',
  '```',
].join('\n');

const listSpec = b.list
  ? `The list role "list" holds 1 to ${b.list.max} items, one per line, each up to ${b.list.itemMax} characters (score.list: role "list", label "${b.list.label}", min 1, max ${b.list.max}, itemMax ${b.list.itemMax}${b.list.format ? `, format "${b.list.format}"` : ''}). Author a schedule for every count from 1 to ${b.list.max}, reflow the layout per count with --count, and keep every count looking designed. The last item must land at least 2 beats before its scene ends.${b.list.format === 'chart' ? ' Each item reads "Label 42": parse the trailing number at runtime and size each bar from it, relative to the largest value.' : ''}`
  : 'This template has no list.';
const spec = [
  `Create the new template "${id}" (${b.name}).`,
  `Format: ${w}x${h} at 30 fps, about ${b.seconds} seconds (whole bars only).`,
  `Brief: ${b.brief}`,
  `Text roles, exactly these and no others: ${b.roles.join(', ')}. Their limits are in vocab.ts (ROLES.max). The scenes in score.json must use exactly these roles, and every role must appear in a scene.`,
  listSpec,
  `Starter copy (the catalog preset): ${JSON.stringify(b.texts)}`,
  `Theme roles and preset values: ${JSON.stringify(b.theme)}`,
  '',
  'What to do:',
  '1. score.json: choose beatFrames (13-16) to fit the energy (calm editorial 16 or 15, punchy launches 14 or 13). Scenes are whole bars with energy levels, building to energy 3 in the last third. Cues mark the fixed landings; one impact, stamp, crash, or stab cue sits in the last third. Risers are optional.',
  `2. index.html: keep data-composition-variables='[]' (the build fills it), __ASSET_BASE__ for assets, <style>__BASE_CSS__ ...</style>, <script>__BASE_JS__</script>, then <script>__BEAT_JS__</script>, then build on CliphouseBeat.mount(tl, __SCORE__, (tl, m) => {...}) and register window.__timelines.main = tl. The root is <div id="root" data-composition-id="main" data-start="0" data-duration="<seconds>" data-width="${w}" data-height="${h}">. Set :root { --w: ${w}px; --h: ${h}px; } and <meta name="viewport" content="width=${w}, height=${h}">. Fixed text uses data-text-role="<role>" with data-beat-text="<role>" for word masks, or data-var-text="text_<role>". Fonts: "Archivo HF" (.display), "Fraunces HF" (.serif), "Inter HF" (body), "Mono HF" (.mono). Only local assets: no images, no network.`,
  `3. ${b.angle ?? (b.developer
    ? 'Make it unmistakably a developer asset: the clip a devrel team or maintainer posts on X, LinkedIn, or GitHub. It must read as made by engineers for engineers. One strong concept, continuity between scenes, studio polish.'
    : 'Make it unmistakably a launch asset for a software product: the clip a founder posts on X or LinkedIn on launch day. One strong concept, continuity between scenes, studio polish.')}`,
  `4. Fill the frame. This is seen on a phone in a feed: the hero text (headline, stat, or price) should be large, roughly 9-16% of the frame height per line, and the layout should use the whole ${w}x${h} canvas at every beat, with no large flat empty bands and nothing crammed into one corner. Secondary text must still read at thumbnail size (at least about 3% of the frame height).`,
].join('\n');

const log = step === 'plan' || !fs.existsSync(logPath) ? {model: MODEL, effort: EFFORT, attempts: [], messages: []} : JSON.parse(fs.readFileSync(logPath, 'utf8'));
let messages = step === 'plan' ? [] : log.messages;
if (step === 'plan') {
  messages = [{role: 'user', content: [{type: 'text', text: block(shared), cache_control: {type: 'ephemeral'}}, {type: 'text', text: spec}]}];
} else if (step === 'repair') {
  messages.push({role: 'user', content: [{type: 'text', text: `The checks failed:\n\n${fs.readFileSync(path.join(dir, 'errors.txt'), 'utf8').slice(0, 20000)}\n\nFix every error. Reply in the same format, but include only the files you change, each in full. Files you leave out stay as they are.`}]});
} else {
  const sheets = fs.readdirSync(path.join(dir, 'sheets')).filter((f) => f.endsWith('.png')).sort();
  messages.push({role: 'user', content: [
    {type: 'text', text: `Here is your render. Sheets named beats-<n>-items (or beats-typical) show one still per beat, left to right and top to bottom, from frame 0. short-* and max-* show every scene focus frame with the shortest and longest text.${process.env.NOTES ? `\n\nThe art director's notes:\n${process.env.NOTES}` : ''}`},
    ...sheets.flatMap((f) => [{type: 'text', text: f}, {type: 'image', source: {type: 'base64', media_type: 'image/png', data: fs.readFileSync(path.join(dir, 'sheets', f)).toString('base64')}}]),
    {type: 'text', text: [
      'Review it as a motion director. Check especially:',
      '- Does the composition use the whole frame at every beat? Large dead areas, a flat empty band, or everything crammed into one third are faults.',
      `- Is the type scale right for a ${w}x${h} post seen on a phone in a feed? The hero text should dominate; small text must still read at thumbnail size.`,
      '- Does it deliver the brief literally (every element it names) and read as a software launch asset?',
      '- Is anything cluttered, off the beat, overlapping, cut off, hard to read, empty for too long, or banned by the style guide?',
      'List the faults, then fix all of them. Reply in the same format, but include only the files you change, each in full. Files you leave out stay as they are.',
    ].join('\n')},
  ]});
}

const t0 = Date.now();
const out = await message({model: MODEL, effort: EFFORT, system, messages, maxTokens: Number(process.env.MAX_TOKENS || 128000)});
const ms = Date.now() - t0;
messages.push({role: 'assistant', content: [{type: 'text', text: out.text}]});
const attempt = log.attempts.length + 1;
fs.writeFileSync(path.join(dir, `response-${attempt}-${step}.md`), out.text);
// Keep the log replayable without images: sheets become placeholders.
log.messages = messages.map((m) => ({...m, content: m.content.map((c) => (c.type === 'image' ? {type: 'text', text: '[sheet image]'} : c))}));
const cost = costOf(MODEL, out.usage);
log.attempts.push({attempt, step, ms, usage: out.usage, stop: out.stop, cost});
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
fs.appendFileSync(path.join(root, 'output/template-costs.jsonl'), `${JSON.stringify({at: new Date().toISOString(), id, attempt, step: `launch-${step}`, model: MODEL, effort: EFFORT, usage: out.usage, cost})}\n`);

const got = new Map([...out.text.matchAll(/FILE:\s*`?([\w.]+)`?\s*\n+```[a-z]*\n([\s\S]*?)\n```/g)].map((m) => [m[1], m[2]]));
const files = ['score.json', 'index.html'];
const missing = files.filter((f) => !got.has(f) && (step === 'plan' || !fs.existsSync(path.join(cand, f))));
if (missing.length) { console.log(JSON.stringify({id, step, attempt, cost, stop: out.stop, error: `missing ${missing.join(', ')}`})); process.exit(3); }
if (step === 'plan') fs.rmSync(cand, {recursive: true, force: true});
fs.mkdirSync(cand, {recursive: true});
for (const f of files) if (got.has(f)) fs.writeFileSync(path.join(cand, f), `${got.get(f)}\n`);
// Repairs and reviews may omit the header lines; keep the last known values.
const metaPath = path.join(dir, 'meta.json');
const prev = fs.existsSync(metaPath) && step !== 'plan' ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
const line = (k) => out.text.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.trim();
fs.writeFileSync(metaPath, JSON.stringify({
  concept: line('CONCEPT') ?? prev.concept, pace: line('PACE') ?? prev.pace,
  poster: line('POSTER') ? Number(line('POSTER').match(/\d+/)?.[0]) : prev.poster,
  motion: line('MOTION') ? line('MOTION').split(',').map((s) => s.trim()).filter(Boolean) : prev.motion,
}, null, 2));
console.log(JSON.stringify({id, step, attempt, model: MODEL, effort: EFFORT, usage: out.usage, cost: Math.round(cost * 100) / 100, s: Math.round(ms / 1000), stop: out.stop,
  concept: out.text.match(/CONCEPT:\s*(.*)/)?.[1]}));
