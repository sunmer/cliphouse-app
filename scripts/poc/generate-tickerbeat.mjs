// Gate 2: one directed Opus generation of the hidden Ticker Beat candidate, plus one visual review pass.
// Usage: node scripts/poc/generate-tickerbeat.mjs plan | review | repair
// Validates the AWS identity first and stops on failure. It never starts a login.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const MODEL = process.env.MODEL || 'eu.anthropic.claude-opus-5-5';
const EFFORT = process.env.EFFORT || 'high';
const REGION = process.env.AWS_REGION || 'eu-north-1';
const step = process.argv[2];
if (!['plan', 'review', 'repair', 'finish'].includes(step)) throw new Error('Usage: generate-tickerbeat.mjs <plan|review|repair|finish>');

try { console.error(execFileSync('aws', ['sts', 'get-caller-identity', '--output', 'text', '--query', 'Arn']).toString().trim()); }
catch (e) { console.error(`AWS identity check failed: ${e.stderr ?? e.message}`); process.exit(1); }

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dir = path.join(root, 'output/poc/tickerbeat');
const target = path.join(root, 'src/poc/tickerbeat/TickerBeat.tsx');
fs.mkdirSync(dir, {recursive: true});
const logPath = path.join(dir, 'log.json');

const contract = `You write Remotion (v4) compositions for a template marketplace. Follow this editing contract exactly:
- All copy comes from props.texts. All color comes from props.theme (5 roles). Never hardcode copy or colors (neutral shadows are fine).
- Text must fit for any value up to each role's max length.
- Rendering must be deterministic: use remotion's random(seed), never Math.random. No external assets or network. No CSS animations or transitions: compute every style from useCurrentFrame().
- Wrap every visible copy of a text role in <span data-text-role="<role>" style={{display: 'contents'}}> on the real visible text.
- Only import from react, remotion, '../../videos/contract', '../../videos/shared/motion', '../../videos/shared/fonts', '../lists', './meta', './schema', './timing'.

${read('docs/direction.md')}

Reply in this format and nothing else:
CONCEPT: <one line>
SOUND: <one line>
BEATS:
<one line per beat: frame range and what lands>
FILE: TickerBeat.tsx
\`\`\`tsx
...
\`\`\``;

const context = [
  ['src/videos/vocab.ts', read('src/videos/vocab.ts')],
  ['src/videos/shared/motion.tsx', read('src/videos/shared/motion.tsx')],
  ['src/videos/shared/fonts.ts', read('src/videos/shared/fonts.ts')],
  ['src/poc/lists.ts (the shared list contract; fixed)', read('src/poc/lists.ts')],
  ['src/poc/tickerbeat/timing.ts (the one timing table, shared with the synthesizer; fixed)', read('src/poc/tickerbeat/timing.ts')],
  ['src/poc/tickerbeat/sound.ts (the sound plan; fixed, for reference)', read('src/poc/tickerbeat/sound.ts')],
  ['src/poc/tickerbeat/meta.ts (fixed)', read('src/poc/tickerbeat/meta.ts')],
  ['src/poc/tickerbeat/schema.ts (fixed)', read('src/poc/tickerbeat/schema.ts')],
  ['src/videos/ticker/Ticker.tsx (the original design to preserve)', read('src/videos/ticker/Ticker.tsx')],
].map(([n, c]) => `### ${n}\n\`\`\`ts\n${c}\n\`\`\``).join('\n\n');

const props = {texts: {brand: 'KICKLAB', headline: 'Weekend drop', point1: '30% off kicks', point2: 'Free shipping', point3: 'Ends Sunday', cta: 'Shop now'},
  theme: {background: '#111111', surface: '#262626', foreground: '#f5f5f0', accent: '#ff3b30', accent2: '#ffd60a'}, hidden: [], audio: {enabled: true}};

const spec = `Write src/poc/tickerbeat/TickerBeat.tsx. Export the component as \`export const TickerBeat: React.FC<TickerBeatProps>\` with TickerBeatProps from './schema'.
Fixed: 1080x1080, 30 fps, 240 frames (8 s at 120 BPM, one beat every 15 frames). Scenes: intro frames 0-59, list 60-179, CTA 180-239. Take every time from timing.ts.

Preservation brief. This is a polish pass on the original Ticker, not a new idea. Keep its identity:
- Tilted, scrolling marquee bands of the headline with contrasting band treatments (outline, filled accent band, solid), and the brand as a stamped sticker over them.
- The split-flap departure board for the list items, with mono row numbers and rules, and the brand and LIVE chrome.
- The stamped CTA pill over an accent field, with the CTA running on a band.
Apply the motion direction: continuity between scenes (a band or block from one scene becomes the next), strong ease-outs, a single small overshoot at most, text entering from masks, motion on every beat, no opacity crossfades. Replace the original's fade-in and its slash wipe with handoffs built from the bands.

The list is the experiment. Read the items with \`listItems(tickerBeatList, props)\` (one to three items; removed items are not shown at all). Row i starts flapping at frameOf(itemBeats(count)[i]) and must settle within FLAP_FRAMES frames, so the settle lands on the clack sound at beat + SETTLE. Do not stagger rows by any other time. Three items reveal at 2, 3, and 4 s; two at 2 and 4 s; one at 2 s.
Reflow the board by count: one item is a large single row, two items are two larger rows, three items are three rows. Keep the entrance speed the same for every count. Use the time after the last reveal for a readable hold with restrained motion (for example a reader marker stepping on each beat, a row number ticking, the LIVE dot). Every item must be still and readable for at least 30 frames before the CTA.
Fixed identity events, each one visual landing on its beat in EVENTS: bands slam in, sticker stamp, board headline, CTA brand rise, CTA stamp (the strongest moment). Wording changes never move any timing.
Items are up to 16 characters and may contain punctuation such as "30% off" or "Q&A, live!". Brand up to 18, headline up to 24, CTA up to 20.
Example props: ${JSON.stringify(props)}`;

function converse(messages) {
  const input = {modelId: MODEL, system: [{text: contract}], messages, inferenceConfig: {maxTokens: Number(process.env.MAX_TOKENS || 64000)},
    additionalModelRequestFields: {output_config: {effort: EFFORT}}};
  const tmp = path.join(os.tmpdir(), 'poc-tickerbeat.json');
  fs.writeFileSync(tmp, JSON.stringify(input));
  const t0 = Date.now();
  const out = JSON.parse(execFileSync('aws', ['bedrock-runtime', 'converse', '--region', REGION, '--cli-read-timeout', '1200',
    '--cli-input-json', `file://${tmp}`], {maxBuffer: 64 * 1024 * 1024}).toString());
  return {out, ms: Date.now() - t0, text: out.output.message.content.map((c) => c.text ?? '').join('')};
}

const log = step === 'plan' ? {model: MODEL, effort: EFFORT, attempts: [], messages: []} : JSON.parse(fs.readFileSync(logPath, 'utf8'));
let messages = log.messages;
if (step === 'plan') messages = [{role: 'user', content: [{text: `${context}\n\n${spec}`}]}];
else if (step === 'finish') messages.push({role: 'user', content: [{text: 'Your reply was cut off before the file ended. Reply again with only the FILE: TickerBeat.tsx block, complete. Keep it compact: no comments longer than one line, no repeated style objects.'}]});
else if (step === 'review') {
  const image = (name) => ({image: {format: 'png', source: {bytes: fs.readFileSync(path.join(dir, name)).toString('base64')}}});
  // Rebuild the image blocks of earlier turns from placeholders is not needed: earlier turns only hold text.
  messages.push({role: 'user', content: [
    {text: 'Here is your render. Image 1: one still every beat (15 frames) with three items, left to right, top to bottom, from frame 0. Image 2: the same with two items. Image 3: one item. Image 4: every role at maximum length at each scene focus frame.'},
    image('beats-3.png'), image('beats-2.png'), image('beats-1.png'), image('stress.png'),
    {text: `Review it as a motion director. List what is cluttered, off the beat, overlapping, cut off, hard to read, empty for too long, or banned by the style guide, and anything that loses the original Ticker identity. Then fix all of it. Reply in the same format with the full file.${process.env.NOTES ? `\n\nThe art director also noted:\n${process.env.NOTES}` : ''}`},
  ]});
} else messages.push({role: 'user', content: [{text: `The type check failed:\n\n${fs.readFileSync(path.join(dir, 'tsc.txt'), 'utf8')}\n\nReturn the file again, fixed, in the same format.`}]});

const {out, ms, text} = converse(messages);
messages.push({role: 'assistant', content: [{text}]});
const attempt = log.attempts.length + 1;
fs.writeFileSync(path.join(dir, `response-${attempt}-${step}.md`), text);
log.messages = messages.map((m) => ({...m, content: m.content.map((c) => (c.image ? {text: '[beat sheet image]'} : c))}));
const cost = (out.usage.inputTokens * 5 + out.usage.outputTokens * 25) / 1e6;
log.attempts.push({attempt, step, ms, usage: out.usage, stopReason: out.stopReason, cost});
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
fs.appendFileSync(path.join(root, 'output/template-costs.jsonl'), `${JSON.stringify({at: new Date().toISOString(), id: 'tickerbeat', attempt, step: `poc-${step}`, model: MODEL, effort: EFFORT, usage: out.usage, cost})}\n`);
console.log(JSON.stringify({step, attempt, usage: out.usage, cost, ms, stop: out.stopReason, concept: text.match(/CONCEPT:\s*(.*)/)?.[1], sound: text.match(/SOUND:\s*(.*)/)?.[1]}));
const file = text.match(/FILE:\s*`?TickerBeat\.tsx`?\s*\n+```[a-z]*\n([\s\S]*?)\n```/);
if (!file) throw new Error(`No complete TickerBeat.tsx in response-${attempt}-${step}.md (stop: ${out.stopReason})`);
fs.writeFileSync(target, file[1] + '\n');
