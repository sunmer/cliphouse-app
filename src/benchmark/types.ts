import protocol from './protocol.json';
import addition from './addition.json';

export type BenchmarkModel = typeof protocol.models[number] | typeof addition.models[number];
export type BenchmarkBrief = typeof protocol.briefs[number];
export type BenchmarkResult = {
  model: string;
  brief: string;
  run: number;
  status: 'rendered' | 'failed';
  attempts: number;
  firstAttemptPassed: boolean;
  provider: string;
  generatedAt: string;
  costUsd: number;
  generationMs: number;
  renderMs: number;
  video?: string;
  poster?: string;
  source?: string;
  request?: string;
  error?: string;
  reviews: {reviewer: string; scores: {design: number; motion: number; readability: number; adherence: number}}[];
  recovery?: BenchmarkRecovery & {originalError?: string; originalAttempts: number; originalCostUsd: number};
};
export type BenchmarkRecovery = Omit<BenchmarkResult, 'reviews' | 'firstAttemptPassed' | 'recovery'>;
export type BenchmarkRecoveries = {version: string; entries: BenchmarkRecovery[]};
export type BenchmarkTiming = {
  video: string;
  sourceSha256: string;
  generationId: string;
  model: string;
  resolvedModel: string;
  provider: string | null;
  generationTimeMs: number | null;
  fetchedAt: string;
  unavailableReason?: string;
};
export type BenchmarkTimings = {version: number; metric: string; unit: string; entries: BenchmarkTiming[]};
export type BenchmarkResults = {
  version: string;
  edition: string;
  updatedAt: string;
  status: string;
  entries: BenchmarkResult[];
};
export type BenchmarkAdditionResults = {id: string; edition: string; updatedAt: string; entries: BenchmarkResult[]};

export function withRecovery(original: BenchmarkResult, recovery?: BenchmarkRecovery): BenchmarkResult {
  if (!recovery || original.status !== 'failed') return original;
  return {...original, ...recovery, error: recovery.error, firstAttemptPassed: false, reviews: [],
    attempts: original.attempts + recovery.attempts,
    costUsd: original.costUsd + recovery.costUsd,
    generationMs: original.generationMs + recovery.generationMs,
    renderMs: original.renderMs + recovery.renderMs,
    recovery: {...recovery, originalError: original.error, originalAttempts: original.attempts, originalCostUsd: original.costUsd}};
}

export function visualScore(entry?: BenchmarkResult) {
  if (!entry || entry.status !== 'rendered' || entry.reviews.length < 2) return null;
  return entry.reviews.reduce((total, review) => total + protocol.rubric.reduce((sum, category) =>
    sum + review.scores[category.id as keyof typeof review.scores] / 5 * category.weight, 0), 0) / entry.reviews.length;
}
