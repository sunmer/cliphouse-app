import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {allModels, hash} from './protocol.mjs';

const generationId = z.string().regex(/^gen-[0-9A-Za-z-]+$/);
const entrySchema = z.object({
  video: z.string(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  generationId,
  model: z.string(),
  resolvedModel: z.string(),
  provider: z.string().nullable(),
  generationTimeMs: z.number().nonnegative().nullable(),
  fetchedAt: z.iso.datetime(),
  unavailableReason: z.string().min(1).optional(),
}).strict();

// OpenRouter may resolve a dated alias: a "-MMDD" snapshot to its "-YYYYMMDD" form, or any model to "<model>-<date>".
// A variant tag such as ":free" stays at the end: "<model>:free" resolves to "<model>-<date>:free".
const sameModel = (resolved, requested) => {
  const variant = (id) => id.match(/:[a-z]+$/)?.[0] ?? '';
  const tag = variant(requested);
  if (tag && variant(resolved) === tag) return sameBase(resolved.slice(0, -tag.length), requested.slice(0, -tag.length));
  return sameBase(resolved, requested);
};
const sameBase = (resolved, requested) => resolved === requested || resolved.startsWith(`${requested}-`) ||
  (/-\d{4}$/.test(requested) && new RegExp(`^${requested.slice(0, -5).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}${requested.slice(-4)}$`).test(resolved));

export function reportedTiming(metadata, expected) {
  const data = metadata.data;
  if (!data || data.id !== expected.id || typeof data.model !== 'string' ||
      !sameModel(data.model, expected.model) ||
      (data.provider_name && data.provider_name !== expected.provider)) {
    throw new Error('OpenRouter metadata does not match the successful response.');
  }
  const generationTimeMs = z.number().nonnegative().nullable().parse(data.generation_time);
  return {
    generationId: generationId.parse(data.id), model: expected.model, resolvedModel: data.model,
    provider: data.provider_name ?? null, generationTimeMs,
    ...(generationTimeMs === null ? {unavailableReason: 'OpenRouter did not report generation_time.'} : {}),
  };
}

export function validateTimings(data, baseline, recovery, assetRoot, additions = {entries: []}) {
  const parsed = z.object({
    version: z.literal(1), metric: z.literal('generation_time'),
    unit: z.literal('milliseconds'), entries: z.array(entrySchema),
  }).strict().parse(data);
  const videos = [...baseline.entries, ...recovery.entries, ...additions.entries].filter(entry => entry.status === 'rendered');
  const seen = new Set();
  const ids = new Set();
  for (const timing of parsed.entries) {
    const entry = videos.find(entry => entry.video === timing.video);
    if (!entry || seen.has(timing.video) || ids.has(timing.generationId)) throw new Error('Unknown or duplicate generation timing.');
    if (timing.model !== allModels.find(model => model.key === entry.model)?.id) throw new Error('Timing model does not match video.');
    if (!sameModel(timing.resolvedModel, timing.model)) throw new Error('Resolved timing model does not match requested model.');
    if ((timing.generationTimeMs === null) !== Boolean(timing.unavailableReason)) throw new Error('Missing timing must have a reason, not an estimate.');
    if (assetRoot && hash(fs.readFileSync(path.join(assetRoot, entry.source))) !== timing.sourceSha256) throw new Error('Timing source does not match published source.');
    seen.add(timing.video);
    ids.add(timing.generationId);
  }
  if (seen.size !== videos.length) throw new Error('Every published video needs a timing record, including unavailable timings.');
  return parsed;
}
