import React, {useState} from 'react';
import {ArrowDown, ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Copy, FileCode2, Gamepad2} from 'lucide-react';
import {ArticleLayout} from '../../ui/ArticleLayout';
import {ViewportVideo} from '../../ui/ViewportVideo';
import results from '../trailer-voxel/results.json';

type Entry = typeof results.entries[number];
// Bump when media changes: caches key on the full URL, query included.
const MEDIA_VERSION = '4';
const media = (base: string, file: string) => `${base}${file}?v=${MEDIA_VERSION}`;
// Cloudflare caches Firebase's gzip copy of an MP4 and answers byte-range requests from it, so playback
// stops a few seconds in. In production, videos load straight from Firebase Hosting, which answers
// ranges correctly for the identity encoding browsers request for media.
const VIDEO_ORIGIN = 'https://cliphouse-app.web.app/';
const video = (base: string, file: string) => base === '/' ? media(VIDEO_ORIGIN, file) : media(base, file);
const models = results.protocol.models;
const money = (v: number) => v === 0 ? '$0 (free)' : `$${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;
const minutes = (ms: number) => `${Math.round(ms / 60000)} min`;
const byModel = (key: string) => results.entries.filter((e) => e.model === key);
const avg = (key: string) => byModel(key).reduce((s, e) => s + e.costUsd, 0) / byModel(key).length;
const opus = avg('opus-5-5-high');
const deepseek = avg('deepseek-v4-1-flash-1017-high');
// Late addition: added after the first three models were published.
const ADDED = {'minimax-m3-1-flash-high': 'October 19'} as Record<string, string>;
const author = (provider: string) => ({deepseek: 'DeepSeek', minimax: 'MiniMax'} as Record<string, string>)[provider] ?? 'Anthropic';
const via = (m: {api: string; provider: string; id: string}) => m.api === 'anthropic' ? 'Anthropic API'
  : m.id.endsWith(':free') ? `OpenRouter free endpoint, pinned to ${author(m.provider)}` : `OpenRouter, pinned to ${author(m.provider)}`;
const phaseLabel = (p: string) => p === 'generation' ? 'First reply' : p === 'repair' ? 'Repair' : p.endsWith('-repair') ? 'Review repair' : `Review ${p.split('-')[1]}`;

function Card({entry, base}: {entry: Entry; base: string}) {
  const model = models.find((m) => m.key === entry.model)!;
  const [view, setView] = useState<'final' | 'first'>('final');
  const src = view === 'final' ? entry.video : entry.firstVideo;
  return <article className="benchmark-card">
    <div className="benchmark-card-media"><ViewportVideo key={src} src={video(base, src)} poster={media(base, entry.poster)} label={`${model.name}, run ${entry.run}, ${view === 'final' ? 'final trailer' : 'first render'}`} /></div>
    <div className="benchmark-card-body">
      <div className="benchmark-card-labels"><span>{author(model.provider)}</span><span>{ADDED[model.key] ? `Added ${ADDED[model.key]} · ` : ''}Run {entry.run}</span></div>
      <h3>{model.name} <span className="gta6-effort">{model.effort}</span></h3>
      <div className="benchmark-run-control gta6-toggle" role="group" aria-label="Version">
        <button aria-pressed={view === 'final'} onClick={() => setView('final')}>Final</button>
        <button aria-pressed={view === 'first'} onClick={() => setView('first')}>Before review</button>
      </div>
      <dl className="benchmark-metrics">
        <div><dt>API cost</dt><dd>{money(entry.costUsd)}</dd></div>
        <div><dt>Time to video</dt><dd>~{minutes(entry.generationMs + entry.renderMs)}</dd></div>
      </dl>
      <details className="benchmark-entry-details">
        <summary>Run details <ChevronDown size={14} aria-hidden="true" /></summary>
        <dl>
          <div><dt>Model ID</dt><dd><code>{model.id}</code> via {via(model)}</dd></div>
          <div><dt>Calls</dt><dd>{entry.calls.map((c) => `${phaseLabel(c.phase)}: ${money(c.costUsd)}, ${c.output.toLocaleString('en-US')} output tokens${c.stop === 'max_tokens' ? ', hit token limit' : c.passed ? ', rendered' : ', failed'}`).join(' / ')}</dd></div>
          <div><dt>Cost source</dt><dd>{entry.costSource}</dd></div>
          <div><dt>Model time / render time</dt><dd>{minutes(entry.generationMs)} / {minutes(entry.renderMs)}</dd></div>
        </dl>
        <p><a href={`${base}${entry.source}`} download><FileCode2 size={12} /> Source</a> &middot; <a href={`${base}${entry.sheet}`}>Last review sheet</a></p>
      </details>
    </div>
  </article>;
}

export function Gta6Page({base}: {base: string}) {
  const [run, setRun] = useState(1);
  const [copied, setCopied] = useState(false);
  const prompt = `System instructions\n${results.system}\n\nBrief\n${results.brief}`;
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* text stays selectable */ } };
  return <ArticleLayout base={base} current="gta6">
    <article className="benchmark-article">
      <header className="benchmark-intro">
        <div className="benchmark-kicker"><Gamepad2 size={15} aria-hidden="true" /><span>Cliphouse Research</span><span className="benchmark-edition">October 2026</span></div>
        <h1>GTA6 Trailer<br />Benchmark<span className="benchmark-period">.</span></h1>
        <p className="benchmark-deck">Four AI models. One brief. A 13-second GTA6-style trailer, built entirely in code.</p>
        <p className="benchmark-description">Claude Opus 5.5, Claude Sonnet 5.5, DeepSeek V4.1 Flash, and MiniMax M3.1 Flash each wrote a Remotion and Three.js trailer for an open-world crime game made of voxels. No images, no video models, no human edits. Each model reviewed frames of its own render twice and revised. Opus cost about {Math.round(opus / deepseek)}x more per trailer than DeepSeek. MiniMax ran on OpenRouter's free endpoint and cost nothing.</p>
        <div className="benchmark-byline"><span>By cliphou.se</span><span>October 18, 2026</span><span>Updated October 19</span><span>{results.entries.length} trailers, all published</span></div>
        <nav className="benchmark-contents" aria-label="In this article">
          <a href="#trailers">All trailers <ArrowDown size={14} /></a>
          <a href="#costs">Cost and time</a>
          <a href="#method">How it worked</a>
          <a href="#prompt">Full prompt</a>
        </nav>
      </header>

      <section id="trailers" className="benchmark-comparison">
        <div className="benchmark-section-heading"><div><span className="section-number">01 / All trailers</span><h2>Every run. No cherry-picking.</h2></div>
          <div className="benchmark-run-control" role="group" aria-label="Run">{[1, 2, 3].map((v) => <button key={v} aria-pressed={run === v} onClick={() => setRun(v)}>Run {v}</button>)}</div></div>
        <div className="benchmark-brief-line"><span>13 seconds &middot; 1080p &middot; 30 fps &middot; Voxel 3D &middot; Silent</span></div>
        <div className="benchmark-grid">{results.entries.filter((e) => e.run === run).map((e) => <Card key={`${e.model}-${e.run}`} entry={e} base={base} />)}</div>
        <p className="benchmark-footnote">"Before review" is the first version that rendered, before the model saw its own frames. Cost includes every call: first reply, repairs, and both reviews.</p>
      </section>

      <section id="costs" className="benchmark-section">
        <div className="benchmark-section-heading"><div><span className="section-number">02 / Cost and time</span><h2>Average per trailer.</h2></div><span className="benchmark-small">3 runs per model</span></div>
        <table className="gta6-table"><thead><tr><th>Model, high effort</th><th>Avg cost</th><th>Avg time</th></tr></thead>
          <tbody>{models.map((m) => { const e = byModel(m.key); return <tr key={m.key}><td>{m.name}</td><td>{money(avg(m.key))}</td><td>~{minutes(e.reduce((s, x) => s + x.generationMs + x.renderMs, 0) / e.length)}</td></tr>; })}</tbody></table>
      </section>

      <section id="method" className="benchmark-section">
        <div className="benchmark-section-heading"><div><span className="section-number">03 / How it worked</span><h2>Same brief. Same rules.<br />The model directs.</h2></div></div>
        <div className="benchmark-prose gta6-prose">
          <p>Each model got the same system instructions and brief in one request. It returned one TSX module: a Remotion composition that builds a voxel world with Three.js. We rendered it in a sandbox with the network off: Chromium with a CPU WebGL renderer, 1920 x 1080, 30 fps, 390 frames.</p>
          <h3>Repairs</h3>
          <p>{results.protocol.repairPolicy}</p>
          <h3>Self-review</h3>
          <p>{results.protocol.feedback}</p>
          <h3>What happened</h3>
          <p>All 9 runs of the first three models produced a trailer. Every Claude run first used its full {results.protocol.limits.maxTokens.toLocaleString('en-US')}-token output budget, mostly on thinking, before finishing the code, so each needed one repair to return a complete module. That cost is included. DeepSeek never hit the limit. One Opus run also needed a second repair for type errors. Five review revisions failed to compile and were repaired.</p>
          <p>MiniMax M3.1 Flash was added on October 19 with the same brief and rules. All 3 runs produced a trailer. Two first replies failed to compile and rendered after one repair each, and one review revision failed and was repaired. MiniMax never hit the token limit.</p>
          <h3>Cost</h3>
          <p>DeepSeek and MiniMax costs come from OpenRouter's reported usage cost. MiniMax used OpenRouter's free endpoint (<code>minimax/minimax-m3.1-flash:free</code>), which reported $0 for every call. Claude costs are Anthropic list prices multiplied by the token usage the API returned. Total for the {results.entries.length} trailers: {money(results.totalCostUsd)}.</p>
          <p className="benchmark-footnote"><strong>Harness incident:</strong> {results.harnessIncidents.map((i) => i.cause).join(' ')}</p>
          <p className="benchmark-footnote">SUNBURN is our placeholder title. This is a fan benchmark, not affiliated with or endorsed by Rockstar Games or Take-Two. The models were told not to use real logos, names, or characters. Three runs per model is a showcase, not a statistically definitive ranking.</p>
        </div>
      </section>

      <section id="prompt" className="benchmark-section">
        <div className="benchmark-section-heading"><div><span className="section-number">04 / Full prompt</span><h2>Run it yourself.</h2></div></div>
        <div className="benchmark-prompt-list">
          <details className="benchmark-prompt" open>
            <summary><span>System instructions and brief</span><ChevronDown size={18} aria-hidden="true" /></summary>
            <h3>System instructions</h3><pre>{results.system}</pre>
            <h3>Brief</h3><pre>{results.brief}</pre>
            <div className="benchmark-prompt-footer">
              <p><a href={`${base}benchmark/gta6/results.json`} download>Full results and protocol <ArrowDownToLine size={13} /></a></p>
              <button className="benchmark-copy" onClick={copy} title="Copy the full prompt" aria-label={copied ? 'Prompt copied' : 'Copy full prompt'}>{copied ? <Check size={16} /> : <Copy size={16} />}<span>{copied ? 'Copied' : 'Copy prompt'}</span></button>
            </div>
          </details>
        </div>
      </section>

      <section className="benchmark-section benchmark-editions">
        <div><h2>Make videos like this for your product.</h2><p>Cliphouse turns what you ship into motion graphics with your coding agent. Templates are free to edit.</p></div>
        <a className="benchmark-edition-link" href={base}><span><strong>Browse templates</strong><small>Free, no watermark</small></span><ArrowUpRight size={20} aria-hidden="true" /></a>
      </section>
      <div className="benchmark-sources"><p>Also see the <a href={`${base}benchmark/`}>Motion Graphics Benchmark</a>.</p></div>
    </article>
  </ArticleLayout>;
}
