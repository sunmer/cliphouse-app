import React, {useEffect, useState} from 'react';
import {ArrowDown, ArrowDownToLine, ArrowUpRight, Check, ChevronDown, CircleDashed, Copy, FileCode2, FlaskConical, Play, XCircle} from 'lucide-react';
import {ArticleLayout} from '../ui/ArticleLayout';
import {ViewportVideo} from '../ui/ViewportVideo';
import protocol from './protocol.json';
import addition from './addition.json';
import additionA2 from './addition-a2.json';
import additionData from './addition-results.json';
import additionA2Data from './addition-a2-results.json';
import resultsData from './results.json';
import recoveryData from './recovery.json';
import recoveryProtocol from './recovery-protocol.json';
import timingsData from './timings.json';
import contractData from './contract.json';
import {withRecovery, type BenchmarkAdditionResults, type BenchmarkModel, type BenchmarkResult, type BenchmarkResults, type BenchmarkRecoveries, type BenchmarkTiming, type BenchmarkTimings} from './types';

// The publication build validates this JSON against the result schema.
const defaultResults = resultsData as BenchmarkResults;
const additionList = [addition, additionA2];
const defaultAdditions = {entries: [...(additionData as BenchmarkAdditionResults).entries, ...(additionA2Data as BenchmarkAdditionResults).entries]} as Pick<BenchmarkAdditionResults, 'entries'>;
// Late additions are listed first, newest first.
const allModels: BenchmarkModel[] = [...[...additionList].reverse().flatMap((item) => item.models), ...protocol.models];
const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {month: 'long', day: 'numeric', timeZone: 'UTC'});
const additionOf = new Map(additionList.flatMap((item) => item.models.map((model) => [model.key, item] as const)));
const month = 'October 2026';
const dateLabel = 'October 8, 2026';
const money = (value: number) => `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const fullPrompt = (prompt: string) => `System instructions\n${contractData.system}\n\nBrief\n${prompt}`;

function ResultVideo({entry, base, label}: {entry: BenchmarkResult; base: string; label: string}) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="benchmark-pending"><XCircle size={22} /><span>Playback unavailable</span>
    <a href={`${base}${entry.video}`} download>Download video</a></div> :
    <ViewportVideo label={label} src={`${base}${entry.video}`} poster={entry.poster ? `${base}${entry.poster}` : undefined}
      onError={() => setFailed(true)} />;
}

function ResultCard({model, entry, timing, base, run, brief}: {model: BenchmarkModel; entry?: BenchmarkResult; timing?: BenchmarkTiming; base: string; run: number; brief: string}) {
  const truncated = entry?.error?.includes('Completion limit reached');
  const invalid = entry?.error?.startsWith('Invalid submission:');
  const failureLabel = truncated ? 'Token limit reached' : invalid ? 'Invalid response format' : 'Render failed';
  const failureReason = truncated ? 'The response ended before the code was complete.' : invalid ? 'The response could not be read as the required JSON.' : 'The code did not compile or render.';
  return <article className="benchmark-card">
    <div className="benchmark-card-media">
      {entry?.status === 'rendered' ? <ResultVideo entry={entry} base={base} label={`${model.name}, ${brief}, run ${run}`} /> :
        <div className={`benchmark-pending${entry ? ' is-failed' : ''}`}>
          {entry ? <XCircle size={25} strokeWidth={1.4} aria-hidden="true" /> : <CircleDashed size={25} strokeWidth={1.4} aria-hidden="true" />}
          <span>{entry ? failureLabel : 'Not run'}</span>
          <small>{entry ? `${entry.attempts} attempt${entry.attempts === 1 ? '' : 's'}` : `${brief} / Run ${run}`}</small>
          {entry && <small className="benchmark-failure-reason">{failureReason}</small>}
        </div>}
    </div>
    <div className="benchmark-card-body">
      <div className="benchmark-card-labels"><span>{model.author}</span><span>{model.weights === 'Open' ? 'Open weights' : model.tier}</span></div>
      <h3>{model.name}</h3>
      {additionOf.has(model.key) && <p className="benchmark-addition-label">New / Added {shortDate(additionOf.get(model.key)!.date)}</p>}
      {entry?.recovery && <p className="benchmark-recovery-label">{entry.status === 'rendered' ? 'Recovered' : 'Repair limit reached'} / R1 &middot; {entry.recovery.attempts} additional attempt{entry.recovery.attempts === 1 ? '' : 's'}</p>}
      <dl className="benchmark-metrics">
        <div><dt>API cost</dt><dd>{entry ? money(entry.costUsd) : <span className="metric-pending">Pending</span>}</dd></div>
        <div><dt title="Estimated time from prompt submission until the video was ready">Time to video</dt><dd>{entry?.status === 'rendered'
          ? `~${seconds(entry.generationMs + entry.renderMs)}`
          : <span className="metric-pending">{!entry ? 'Pending' : 'No video'}</span>}</dd></div>
      </dl>
      <details className="benchmark-entry-details">
        <summary>Run details <ChevronDown size={14} aria-hidden="true" /></summary>
        <dl><div><dt>Model ID</dt><dd><code>{model.id}</code></dd></div>
          <div><dt>Reasoning effort</dt><dd>{model.reasoning}</dd></div>
          {entry?.status === 'rendered' && <><div><dt>Model response time</dt><dd>{seconds(entry.generationMs)} across all attempts</dd></div>
            <div><dt>Render time</dt><dd>{seconds(entry.renderMs)} across all attempts</dd></div>
            <div><dt>OpenRouter generation</dt><dd>{timing?.generationTimeMs != null ? `${seconds(timing.generationTimeMs)}, successful attempt only` : 'Unavailable'}</dd></div>
            {timing && <div><dt>Generation ID</dt><dd><code>{timing.generationId}</code></dd></div>}
            {timing?.unavailableReason && <div><dt>Timing unavailable</dt><dd>{timing.unavailableReason}</dd></div>}</>}
          <div><dt>Status</dt><dd>{entry ? entry.recovery ? entry.status === 'rendered' ? 'Recovered in automated repair pass R1' : 'Still failed after repair pass R1' : entry.firstAttemptPassed ? 'Passed on first attempt' : entry.status === 'rendered' ? 'Passed after repair' : 'Failed' : 'Awaiting generation'}</dd></div>
          {entry?.recovery && <><div><dt>Original outcome</dt><dd>Failed after {entry.recovery.originalAttempts} attempt{entry.recovery.originalAttempts === 1 ? '' : 's'}. {entry.recovery.originalError}</dd></div>
            <div><dt>Original API cost</dt><dd>{money(entry.recovery.originalCostUsd)}</dd></div>
            <div><dt>Additional repair cost</dt><dd>{money(entry.recovery.costUsd)}</dd></div>
            <div><dt>Total attempts</dt><dd>{entry.attempts}</dd></div></>}
          {entry && <><div><dt>Provider</dt><dd>{entry.provider}</dd></div><div><dt>Generated</dt><dd>{entry.generatedAt}</dd></div></>}
        </dl>
        {entry?.error && <p>{entry.error}</p>}
        <div className="benchmark-source-links">
          {entry?.source && <a href={`${base}${entry.source}`} download><FileCode2 size={14} />Source</a>}
          {entry?.request && <a href={`${base}${entry.request}`} download>Request</a>}
          <a href={`https://openrouter.ai/${model.id}`} target="_blank" rel="noreferrer">OpenRouter <ArrowUpRight size={13} /></a>
        </div>
      </details>
    </div>
  </article>;
}

export function BenchmarkPage({base = '/', edition = false, data = defaultResults, additions = defaultAdditions, recoveries = recoveryData as BenchmarkRecoveries, timings = timingsData as BenchmarkTimings}: {base?: string; edition?: boolean; data?: BenchmarkResults; additions?: Pick<BenchmarkAdditionResults, 'entries'>; recoveries?: BenchmarkRecoveries; timings?: BenchmarkTimings}) {
  const results = data;
  const [briefId, setBriefId] = useState(protocol.briefs[0].id);
  const [run, setRun] = useState(1);
  const [sort, setSort] = useState('listed');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const brief = protocol.briefs.find((item) => item.id === briefId)!;
  const completed = results.entries.length + additions.entries.length;
  const entries = [...results.entries.filter((entry) => entry.brief === briefId && entry.run === run)
    .map(entry => withRecovery(entry, recoveries.entries.find(item => item.model === entry.model && item.brief === entry.brief && item.run === entry.run))),
    ...additions.entries.filter((entry) => entry.brief === briefId && entry.run === run)];
  const findEntry = (key: string) => entries.find((entry) => entry.model === key);
  const models = [...allModels].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'cost') return (findEntry(a.key)?.costUsd ?? Infinity) - (findEntry(b.key)?.costUsd ?? Infinity);
    return 0;
  });
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (protocol.briefs.some((item) => item.id === params.get('brief'))) setBriefId(params.get('brief')!);
    if (params.get('run') === '2') setRun(2);
  }, []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  function selectBrief(id: string) {
    setBriefId(id);
    setCopied(false);
    setCopyError(false);
    const url = new URL(location.href);
    url.searchParams.set('brief', id);
    history.replaceState(null, '', url);
  }
  function selectRun(value: number) {
    setRun(value);
    const url = new URL(location.href);
    url.searchParams.set('run', String(value));
    history.replaceState(null, '', url);
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt(brief.prompt));
      setCopied(true);
      setCopyError(false);
    } catch { setCopyError(true); }
  }
  return <ArticleLayout base={base}>
    <article>
      <header className="benchmark-intro">
        <div className="benchmark-kicker"><FlaskConical size={15} aria-hidden="true" /><span>Cliphouse Research</span><span className="benchmark-edition">{month} / v{protocol.version}</span></div>
        <h1>Motion Graphics<br />Benchmark<span className="benchmark-period">.</span></h1>
        <p className="benchmark-deck">Find the right AI model for motion graphics<br className="mobile-break" /> without testing every model yourself.</p>
        <div className="benchmark-byline"><span>By cliphou.se</span><span>{dateLabel}</span><span>{edition ? 'Monthly edition' : 'Live comparison'}</span></div>
        <nav className="benchmark-contents" aria-label="In this article">
          <a href="#comparison">Compare models <ArrowDown size={14} /></a>
          <a href="#methodology">Methodology</a>
          <a href="#briefs">Test briefs</a>
          <a href="#editions">Editions</a>
        </nav>
      </header>

      <section id="comparison" className="benchmark-comparison" aria-labelledby="comparison-title">
        <div className="benchmark-section-heading"><div><span className="section-number">01 / Comparison</span><h2 id="comparison-title">One brief. Every model.</h2></div>
          <span className="benchmark-small">{allModels.length} models &middot; 2 independent runs</span></div>
        <div className="benchmark-controls">
          <div className="benchmark-tabs" role="group" aria-label="Test brief">
            {protocol.briefs.map((item) => <button key={item.id} aria-pressed={briefId === item.id} onClick={() => selectBrief(item.id)}>{item.name}</button>)}
          </div>
          <div className="benchmark-secondary-controls">
            <div className="benchmark-run-control" role="group" aria-label="Independent run">{[1, 2].map((value) => <button key={value} aria-pressed={run === value} onClick={() => selectRun(value)}>Run {value}</button>)}</div>
            <label className="benchmark-sort"><span className="article-sr-only">Sort models</span><select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="listed">Shortlist order</option><option value="name">Model name</option>
              <option value="cost">API cost</option>
            </select><ChevronDown size={13} aria-hidden="true" /></label>
          </div>
        </div>
        <div className="benchmark-brief-line"><span>12 seconds &middot; 1080p &middot; 30 fps &middot; Silent</span></div>
        <div id="briefs" className="benchmark-prompt-list">
          <details key={brief.id} className="benchmark-prompt">
            <summary><span>{`${brief.name} - full prompt`}</span><ChevronDown size={18} aria-hidden="true" /></summary>
            <h3>System instructions</h3>
            <pre>{contractData.system}</pre>
            <h3>Brief</h3>
            <pre>{brief.prompt}</pre>
            <div className="benchmark-prompt-footer">
              <p><a href={`${base}benchmark/protocol.json`} download>Full protocol <ArrowDownToLine size={13} /></a></p>
              <button className="benchmark-copy" onClick={copyPrompt} title="Copy the full prompt" aria-label={copied ? 'Prompt copied' : 'Copy full prompt'}>{copied ? <Check size={16} /> : <Copy size={16} />}<span>{copied ? 'Copied' : 'Copy prompt'}</span></button>
            </div>
            {copyError && <p role="status">Clipboard access is unavailable. The full prompt is selectable above.</p>}
          </details>
        </div>
        <p className="article-sr-only" aria-live="polite">{brief.name}, run {run}. {entries.length} completed entries.</p>
        <div className="benchmark-grid">{models.map((model) => {
          const entry = findEntry(model.key);
          const timing = entry?.status === 'rendered' ? timings.entries.find(timing => timing.video === entry.video) : undefined;
          return <ResultCard key={`${model.key}-${briefId}-${run}`} model={model} entry={entry} timing={timing} base={base} run={run} brief={brief.name} />;
        })}</div>
        <p className="benchmark-footnote">A curated selection across price tiers, not a popularity ranking. Empty entries are untested, not failed.</p>
        <p className="benchmark-footnote">Time to video is an estimate from prompt submission until the MP4 was ready. It adds every model response and render attempt, including repairs. It excludes waiting in the render queue and small file-handling overhead. <a href={`${base}benchmark/timings.json`}>OpenRouter timing records</a></p>
        {recoveries.entries.length > 0 && <p className="benchmark-footnote">Recovered entries show total API cost, including original attempts. The additional repair cost is itemized in run details. Recovery means the code compiled and rendered. It is not first-attempt success.</p>}
        <p className="benchmark-footnote"><strong>Late additions:</strong> {additionList.map((item) => `${item.models.map((model) => model.name).join(', ')} (${shortDate(item.date)})`).join(' and ')} were added after the original ten models. They used the same protocol, briefs, token limit, renderer, and repair rule. They did not receive the R1 recovery pass.</p>
      </section>

      <section id="methodology" className="benchmark-section">
        <div className="benchmark-section-heading"><div><span className="section-number">02 / Methodology</span><h2>Same starting point.<br />No hand-picked winners.</h2></div><span className="benchmark-small">Protocol v{protocol.version}</span></div>
        <div className="benchmark-method-grid">
          <div className="benchmark-prose">
            <p>This tests <strong>language models writing motion-graphics code</strong>, not native text-to-video models. Every request goes through OpenRouter. The generated code is rendered with the same Remotion environment.</p>
            <h3>What stays the same</h3>
            <p>Three fixed briefs, two independent runs, one component contract, the same local fonts and palette, and a {protocol.limits.maxTokens.toLocaleString('en-US')}-token completion limit that includes reasoning. No browsing, external assets, or existing Cliphouse compositions.</p>
            <h3>What gets another attempt</h3>
            <p>Only a failed compile or render gets one repair request, with the error log. Successful videos receive no creative revision. Original attempts and repair costs are retained. Transport errors are recorded separately.</p>
            {recoveries.entries.length > 0 && <><h3>Automated recovery / R1</h3>
              <p>{recoveryProtocol.policy} Recovery uses a {recoveryProtocol.maxTokens.toLocaleString('en-US')}-token limit and direct TSX output instead of the original JSON-only format. These are additional repair results, not replacement first attempts.</p>
              <p><a href={`${base}benchmark/recovery.json`}>Repair results</a> &middot; <a href={`${base}benchmark/recovery-protocol.json`}>Repair protocol</a> &middot; <a href={`${base}benchmark/results.json`}>Original results</a></p></>}
            <h3>What we disclose</h3>
            <p>The exact model ID, provider, request, reasoning setting, source code, estimated time to video, OpenRouter generation time, and API cost. Time to video adds local response and render times for all attempts. OpenRouter generation time is shown separately for the successful request. Providers are pinned and fallback is disabled. Up to four API requests overlap; renders remain sequential. Reasoning labels are not equivalent compute budgets across models.</p>
          </div>
          <div className="benchmark-reference">
            <figure><ViewportVideo src={`${base}previews/bento-launch.mp4`} poster={`${base}previews/bento-launch.jpg`} label="Existing Cliphouse motion graphics example" style={{aspectRatio: '16 / 9'}} />
              <figcaption><span><Play size={12} aria-hidden="true" />What we mean by motion graphics</span>Existing Cliphouse template. Not a benchmark submission.</figcaption></figure>
            <div className="benchmark-facts"><div><strong>{allModels.length}</strong><span>models</span></div><div><strong>3</strong><span>fixed briefs</span></div><div><strong>2</strong><span>runs per brief</span></div></div>
          </div>
        </div>
        <div className="benchmark-scoring">
          <p className="benchmark-footnote">Both runs are published, including failures. Two runs are exploratory evidence, not a statistically definitive ranking.</p>
          <p className="benchmark-footnote"><strong>Protocol revision:</strong> A Haiku setup pilot used 13,309 reasoning tokens and was truncated at the original 16,000-token limit. Protocol 1.1 uses 32,000 tokens for all 60 comparable runs. The pilot cost $0.008 and remains in the spending record, outside the comparison.</p>
          <p className="benchmark-footnote"><strong>Repair-feedback limitation:</strong> In this pilot, compile-failure repairs received a stack trace without the detailed TypeScript diagnostics. Treat repair outcomes as provisional. First-attempt outcomes are unaffected.</p>
          {additionList.map((item) => <p key={item.id} className="benchmark-footnote"><strong>Addition {item.id}:</strong> {item.policy} <a href={`${base}benchmark/${item.id === 'A1' ? 'addition-results' : `addition-${item.id.toLowerCase()}-results`}.json`}>Addition results</a></p>)}
        </div>
      </section>

      <section id="editions" className="benchmark-section benchmark-editions">
        <div><span className="section-number">03 / Editions</span><h2>A record, not a moving target.</h2><p>New model versions join the live comparison. Monthly reports preserve the tested versions, protocol, and results. Changes to the test receive a new protocol version.</p></div>
        <a className="benchmark-edition-link" href={`${base}benchmark/${edition ? '' : '2026-10/'}`}><span><strong>{edition ? 'Live comparison' : month}</strong><small>{edition ? 'Latest benchmark entries' : `Edition 01 / ${completed ? `${completed} runs published` : 'Results pending'}`}</small></span><ArrowUpRight size={20} aria-hidden="true" /></a>
      </section>
      <div className="benchmark-sources"><p>Model selection checked {dateLabel}. Availability and prices can change.</p><p>Sources: <a href="https://openrouter.ai/models">OpenRouter model catalog</a>, <a href="https://openrouter.ai/rankings">usage rankings</a>, and <a href="https://openrouter.ai/docs/guides/routing/provider-selection">provider routing</a>.</p></div>
    </article>
  </ArticleLayout>;
}
