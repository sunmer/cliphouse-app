import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';

export const root = path.resolve(import.meta.dirname, '../..');
export const protocol = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/protocol.json'), 'utf8'));
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const contract = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/contract.json'), 'utf8')).system;

export const digest = hash(JSON.stringify(protocol) + contract);
// Late additions reuse protocol 1.1 unchanged; their hash binds the addition to the baseline digest.
export const addition = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/addition.json'), 'utf8'));
export const additionDigest = hash(JSON.stringify(addition) + digest);
// Each later addition has its own file, store, ledger, and hash. A1 stays in addition.json unchanged.
export const loadAddition = (id) => id === 'A1' ? addition : JSON.parse(fs.readFileSync(path.join(root, `src/benchmark/addition-${id.toLowerCase()}.json`), 'utf8'));
export const additionDigestOf = (value) => hash(JSON.stringify(value) + digest);
export const laterAdditions = ['A2', 'A3'].map(loadAddition);
export const additions = [addition, ...laterAdditions];
// Newest additions first, matching the page's shortlist order.
export const allModels = [...[...additions].reverse().flatMap((item) => item.models), ...protocol.models];
export const additionResultsFile = (item) => path.join(root, `src/benchmark/${item.id === 'A1' ? 'addition-results' : `addition-${item.id.toLowerCase()}-results`}.json`);
const localAsset = z.string().regex(/^benchmark\/media\/[a-z0-9-]+\/[a-z0-9-]+\.(mp4|jpg|tsx|json)$/);
const scores = z.object(Object.fromEntries(protocol.rubric.map((criterion) => [criterion.id, z.number().min(1).max(5)]))).strict();
const entrySchema = (models) => z.object({
  model: z.enum(models.map((model) => model.key)),
  brief: z.enum(protocol.briefs.map((brief) => brief.id)),
  run: z.number().int().min(1).max(protocol.runs),
  status: z.enum(['rendered', 'failed']),
  attempts: z.number().int().min(1).max(2),
  firstAttemptPassed: z.boolean(),
  provider: z.string().min(1),
  generatedAt: z.iso.datetime(),
  costUsd: z.number().nonnegative(),
  generationMs: z.number().nonnegative(),
  renderMs: z.number().nonnegative(),
  video: localAsset.optional(),
  poster: localAsset.optional(),
  source: localAsset.optional(),
  request: localAsset.optional(),
  error: z.string().max(1000).optional(),
  reviews: z.array(z.object({reviewer: z.string().min(1), scores}).strict()).max(2),
}).strict().superRefine((entry, ctx) => {
  if (entry.status === 'rendered' && (!entry.video || !entry.poster || !entry.source || !entry.request)) ctx.addIssue({code: 'custom', message: 'Rendered entries need video, poster, source, and request artifacts.'});
  if (entry.status === 'failed' && (entry.video || entry.poster || entry.reviews.length)) ctx.addIssue({code: 'custom', message: 'Failed entries cannot have video, poster, or visual scores.'});
  if (entry.reviews.length === 1 || new Set(entry.reviews.map((review) => review.reviewer)).size !== entry.reviews.length) ctx.addIssue({code: 'custom', message: 'Publish either zero reviews or two distinct reviewers.'});
  if (entry.firstAttemptPassed !== (entry.status === 'rendered' && entry.attempts === 1)) ctx.addIssue({code: 'custom', message: 'First-attempt status does not match the result.'});
});
export const resultSchema = entrySchema(protocol.models);

function checkAssets(entries, assetRoot) {
  for (const entry of entries) {
    for (const field of ['video', 'poster', 'source', 'request']) {
      if (entry[field]) {
        const file = path.join(assetRoot, entry[field]);
        if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || !fs.statSync(file).size) throw new Error(`Missing benchmark artifact: ${entry[field]}`);
        const relative = path.relative(fs.realpathSync(assetRoot), fs.realpathSync(file));
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Benchmark artifact escapes the public directory.');
      }
    }
  }
}

export function validateAddition(data, baseline, assetRoot, item = addition) {
  const validated = z.object({
    id: z.literal(item.id), edition: z.literal(item.edition), updatedAt: z.iso.date(),
    entries: z.array(entrySchema(item.models)),
  }).strict().parse(data);
  const keys = validated.entries.map((entry) => `${entry.model}/${entry.brief}/${entry.run}`);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate addition entries.');
  if (validated.entries.some((entry) => entry.reviews.length)) throw new Error('Addition entries are not reviewed.');
  const media = new Set(baseline.entries.flatMap((entry) => [entry.video, entry.source, entry.request]).filter(Boolean));
  if (validated.entries.some((entry) => [entry.video, entry.source, entry.request].some((file) => file && media.has(file)))) throw new Error('Addition media must not overwrite original assets.');
  if (assetRoot) checkAssets(validated.entries, assetRoot);
  return validated;
}

// Every addition's results merged into one {entries} list, each validated against its own definition.
export function loadAdditionResults(baseline, assetRoot) {
  const entries = additions.flatMap((item) => {
    const file = additionResultsFile(item);
    if (!fs.existsSync(file)) return [];
    return validateAddition(JSON.parse(fs.readFileSync(file, 'utf8')), baseline, assetRoot, item).entries.map((entry) => ({...entry, addition: item.id}));
  });
  return {entries};
}

export function validateResults(data, assetRoot) {
  const validated = z.object({
    version: z.literal(protocol.version),
    edition: z.literal(protocol.edition),
    updatedAt: z.iso.date(),
    status: z.enum(['awaiting-runs', 'in-progress', 'reviewing', 'complete']),
    entries: z.array(resultSchema),
  }).strict().parse(data);
  const keys = validated.entries.map((entry) => `${entry.model}/${entry.brief}/${entry.run}`);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate benchmark entries.');
  const rendered = validated.entries.filter((entry) => entry.status === 'rendered');
  const expected = protocol.models.length * protocol.briefs.length * protocol.runs;
  const expectedStatus = !keys.length ? 'awaiting-runs' : keys.length < expected ? 'in-progress' : rendered.some((entry) => entry.reviews.length < 2) ? 'reviewing' : 'complete';
  if (validated.status !== expectedStatus) throw new Error(`Expected benchmark status ${expectedStatus}.`);
  if (assetRoot) checkAssets(validated.entries, assetRoot);
  return validated;
}

export function parseSource(content) {
  const data = z.object({source: z.string().min(50).max(250000)}).strict().parse(JSON.parse(content));
  return data.source;
}

export function priceCeiling(pricing) {
  const tiers = [pricing, ...(pricing.overrides ?? [])];
  const maximum = (key) => Math.max(...tiers.map((tier) => Number(tier[key] ?? pricing[key])));
  const rates = {prompt: maximum('prompt'), completion: maximum('completion')};
  if (Object.values(rates).some((rate) => !Number.isFinite(rate) || rate < 0)) throw new Error('Provider has missing or invalid prices.');
  return rates;
}

export function reserveCost(messages, rates, maxTokens = protocol.limits.maxTokens) {
  // UTF-8 bytes plus message overhead deliberately overestimate input tokens.
  return (Buffer.byteLength(JSON.stringify(messages), 'utf8') + 2048) * rates.prompt + maxTokens * rates.completion;
}

export function ensureBudget(ledger, kind, reservation, {allowInFlight = false} = {}) {
  // A ledger cap set by the runner (for keys without an OpenRouter limit) applies on top of the edition limits.
  if (typeof ledger.capUsd === 'number') {
    const total = ledger.charges.reduce((sum, charge) => sum + charge.cost, 0) + (Array.isArray(ledger.pending) ? ledger.pending : []).reduce((sum, request) => sum + request.reservation, 0);
    if (total + reservation > ledger.capUsd + 1e-9) throw new Error(`Ledger cap of $${ledger.capUsd} would be exceeded. No request sent.`);
  }
  const pending = Array.isArray(ledger.pending) ? ledger.pending : ledger.pending ? [ledger.pending] : [];
  if (pending.length && !allowInFlight) throw new Error('An earlier request has unknown cost. Reconcile it with OpenRouter before continuing.');
  if (!Number.isFinite(reservation) || reservation < 0) throw new Error('Invalid cost reservation.');
  const limit = kind === 'generation' ? protocol.limits.generationBudgetUsd : protocol.limits.repairBudgetUsd;
  const spend = ledger.charges.filter((charge) => charge.kind === kind).reduce((sum, charge) => sum + charge.cost, 0) + pending.filter((request) => request.kind === kind).reduce((sum, request) => sum + request.reservation, 0);
  if (spend + reservation > limit + 1e-9) throw new Error(`${kind} budget would exceed $${limit}. No request sent.`);
  if (ledger.charges.reduce((sum, charge) => sum + charge.cost, 0) + pending.reduce((sum, request) => sum + request.reservation, 0) + reservation > 35 + 1e-9) throw new Error('Combined API budget would exceed $35. No request sent.');
}

export function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {mode: 0o600});
  fs.renameSync(temporary, file);
}
