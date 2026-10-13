import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToString} from 'react-dom/server';
import {BenchmarkPage} from '../../src/benchmark/BenchmarkPage';
import {visualScore, withRecovery, type BenchmarkResult, type BenchmarkResults, type BenchmarkTimings} from '../../src/benchmark/types';

const sample = (): BenchmarkResult => ({
  model: 'opus-5-5', brief: 'product-launch', run: 1, status: 'rendered', attempts: 1,
  firstAttemptPassed: true, provider: 'test-provider', generatedAt: '2026-10-08T12:00:00.000Z',
  costUsd: 0.1234, generationMs: 12300, renderMs: 4100,
  video: 'benchmark/media/test/video.mp4', poster: 'benchmark/media/test/poster.jpg',
  source: 'benchmark/media/test/source.tsx', request: 'benchmark/media/test/request.json', reviews: [],
});
const timingFixture: BenchmarkTimings = {version: 1, metric: 'generation_time', unit: 'milliseconds', entries: [{
  video: 'benchmark/media/test/video.mp4', sourceSha256: 'a'.repeat(64), generationId: 'gen-test',
  model: 'anthropic/claude-opus-5.5', resolvedModel: 'anthropic/claude-opus-5.5', provider: 'test-provider',
  generationTimeMs: 5234, fetchedAt: '2026-10-08T20:00:00.000Z',
}]};
const render = (entry: BenchmarkResult, timings = timingFixture) => {
  const data: BenchmarkResults = {version: '1.0', edition: '2026-10', updatedAt: '2026-10-08', status: 'in-progress', entries: [entry]};
  return renderToString(<BenchmarkPage base="/voodoo/" data={data} additions={{id: 'A1', edition: '2026-10', updatedAt: '2026-10-13', entries: []}} timings={timings} />);
};
test('real rendered entry shows video, actual metrics, and base-aware downloads', () => {
  const html = render(sample());
  assert.match(html, /data-video-src="\/voodoo\/benchmark\/media\/test\/video.mp4"/);
  assert.doesNotMatch(html, /<video[^>]*\ssrc=/);
  assert.match(html, /\$0.123/);
  assert.match(html, /Time to video/);
  assert.match(html, /~16.4s/);
  assert.match(html, /5.2s, successful attempt only/);
  assert.match(html, /gen-test/);
  assert.doesNotMatch(html, /Visual score|Review pending|Generation complete|Original runs/);
  assert.match(html, /href="\/voodoo\/benchmark\/media\/test\/source.tsx"/);
  assert.match(html, /Passed on first attempt/);
});
test('failed entry is not a pending run or a fabricated video', () => {
  const entry = {...sample(), status: 'failed' as const, attempts: 2, firstAttemptPassed: false, video: undefined, poster: undefined, error: '<script>unsafe</script>'};
  const html = render(entry);
  assert.match(html, /Render failed/);
  assert.match(html, /2 attempts/);
  assert.match(html, /No video/);
  assert.doesNotMatch(html, /~16.4s/);
  assert.doesNotMatch(html, /src="\/voodoo\/benchmark\/media\/test\/video.mp4"/);
  assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
});
test('stored visual scores stay out of the public comparison', () => {
  const entry = sample();
  const review = {reviewer: 'A', scores: {design: 4, motion: 3, readability: 5, adherence: 4}};
  assert.equal(visualScore(entry), null);
  entry.reviews = [review];
  assert.equal(visualScore(entry), null);
  entry.reviews.push({...review, reviewer: 'B'});
  assert.equal(visualScore(entry), 80);
  assert.doesNotMatch(render(entry), /80.0|Visual score/);
  assert.equal(visualScore({...entry, status: 'failed'}), null);
});
test('repaired output discloses repair instead of first-attempt success', () => {
  const html = render({...sample(), attempts: 2, firstAttemptPassed: false});
  assert.match(html, /Passed after repair/);
  assert.doesNotMatch(html, /Passed on first attempt/);
  assert.match(html, /Repair-feedback limitation/);
  assert.match(html, /Treat repair outcomes as provisional/);
});
test('a truncated generation is identified separately from a render failure', () => {
  const html = render({...sample(), status: 'failed', firstAttemptPassed: false, video: undefined, poster: undefined, error: 'Invalid submission: Completion limit reached.'});
  assert.match(html, /Token limit reached/);
  assert.match(html, /Completion limit reached/);
});
test('the expandable selected brief precedes its results', () => {
  const html = render(sample());
  assert.match(html, /Product launch - full prompt/);
  assert.match(html, /System instructions/);
  assert.match(html, /You write a complete Remotion 4 composition/);
  assert.doesNotMatch(html, /We give ten leading models|Storytelling, composition/);
  assert.ok(html.indexOf('id="briefs"') < html.indexOf('class="benchmark-grid"'));
  assert.equal((html.match(/class="benchmark-prompt"/g) ?? []).length, 1);
});
test('malformed JSON is distinguished from truncated code', () => {
  const html = render({...sample(), status: 'failed', firstAttemptPassed: false, error: 'Invalid submission: Unexpected token'});
  assert.match(html, /Invalid response format/);
  assert.match(html, /could not be read as the required JSON/);
});
test('recovery keeps original failure and adds costs without claiming first-attempt success', () => {
  const original = {...sample(), status: 'failed' as const, firstAttemptPassed: false, error: 'Invalid submission', video: undefined, poster: undefined};
  const repair = {...sample(), attempts: 2, costUsd: 0.02};
  const entry = withRecovery(original, repair);
  assert.equal(entry.status, 'rendered');
  assert.equal(entry.attempts, 3);
  assert.equal(entry.costUsd, original.costUsd + repair.costUsd);
  assert.equal(entry.firstAttemptPassed, false);
  assert.equal(entry.error, undefined);
  assert.equal(entry.recovery?.originalError, original.error);
  assert.equal(original.status, 'failed');
  assert.equal(visualScore(entry), null);
  const html = render(entry);
  assert.match(html, /Recovered in automated repair pass R1/);
  assert.match(html, /Additional repair cost/);
  assert.match(html, /Original outcome/);
  assert.match(html, /~32.8s/);
  assert.match(html, /5.2s, successful attempt only/);
});
test('missing OpenRouter timing does not replace the estimated time to video', () => {
  for (const entries of [[], [{...timingFixture.entries[0], generationTimeMs: null, unavailableReason: 'Not reported'}]]) {
    const html = render(sample(), {...timingFixture, entries});
    assert.match(html, /OpenRouter generation.*Unavailable/);
    assert.match(html, /~16.4s/);
  }
  const html = render(sample(), {...timingFixture, entries: [{...timingFixture.entries[0], video: 'benchmark/media/another/video.mp4'}]});
  assert.match(html, /OpenRouter generation.*Unavailable/);
  assert.doesNotMatch(html, /5.2s, successful/);
});
test('zero reported generation time remains zero', () => {
  const html = render(sample(), {...timingFixture, entries: [{...timingFixture.entries[0], generationTimeMs: 0}]});
  assert.match(html, /0.0s, successful attempt only/);
});
