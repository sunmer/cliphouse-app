#!/usr/bin/env node
// Weekly demand report from the share service's search and event logs.
// Usage: node scripts/search-report.mjs [--days 7] [--project cliphouse-app]
// Uses Application Default Credentials, or FIRESTORE_EMULATOR_HOST for local data.
import {mkdirSync, writeFileSync} from 'node:fs';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const days = Number(arg('days', 7));
const projectId = arg('project', process.env.GOOGLE_CLOUD_PROJECT || 'cliphouse-app');
initializeApp({projectId});
const db = getFirestore();
const since = Timestamp.fromMillis(Date.now() - days * 86_400_000);
const read = async (name) => (await db.collection(name).where('at', '>=', since).get()).docs.map((d) => ({...d.data(), at: d.data().at?.toMillis?.() ?? 0}));
const [searches, events] = await Promise.all([read('searches'), read('events')]);

// A weak search has results, but no template from it was opened, linked, or previewed.
// It is shown only for callers whose clients pass searchId (else every search would look weak).
const bySearch = new Map();
for (const e of events) if (e.searchId) (bySearch.get(e.searchId) ?? bySearch.set(e.searchId, []).get(e.searchId)).push(e);
const tracingClients = new Set(searches.filter((s) => bySearch.has(s.searchId)).map((s) => s.client));
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const count = (items, key) => [...items.reduce((m, x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
const norm = (q) => q.toLowerCase().replace(/\s+/g, ' ').trim() || '(no query)';
const filters = (f = {}) => Object.entries(f).map(([k, v]) => `${k}=${v}`).join(' ');
const cell = (s) => String(s).replace(/\|/g, '/').slice(0, 80);
const quantile = (xs, q) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const secs = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`);
const table = (head, rows) => rows.length ? [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n') : '_None._';

const empty = searches.filter((s) => s.empty);
const weak = searches.filter((s) => !s.empty && tracingClients.has(s.client) && !bySearch.has(s.searchId));
// Previews that reached the renderer (prop validation errors carry no poster field).
const rendered = events.filter((e) => e.type === 'preview' && e.poster !== undefined);
const searchAt = new Map(searches.map((s) => [s.searchId, s.at]));
const toPreview = rendered.filter((e) => e.poster && e.searchId && searchAt.has(e.searchId))
  .reduce((m, e) => m.set(e.searchId, Math.min(m.get(e.searchId) ?? Infinity, e.at - searchAt.get(e.searchId))), new Map());
const firstPreviewTimes = [...toPreview.values()];

const templates = new Map();
for (const s of searches) for (const id of s.resultIds ?? []) (templates.get(id) ?? templates.set(id, {shown: 0, spec: 0, link: 0, preview: 0}).get(id)).shown++;
for (const e of events) if (!e.error) { const t = templates.get(e.variantId) ?? templates.set(e.variantId, {shown: 0, spec: 0, link: 0, preview: 0}).get(e.variantId); t[e.type]++; }
const engines = count(rendered, (e) => e.engine ?? 'unknown').map(([engine, n]) => {
  const list = rendered.filter((e) => (e.engine ?? 'unknown') === engine);
  const ms = list.filter((e) => e.poster && !e.cached).map((e) => e.ms);
  return [engine, n, pct(list.filter((e) => !e.poster).length, n), secs(quantile(ms, 0.5)), secs(quantile(ms, 0.9))];
});
const picksByEngine = count(events.filter((e) => e.type === 'spec'), (e) => e.engine ?? 'unknown');

const date = new Date().toISOString().slice(0, 10);
const md = `# cliphou.se search report, ${date}

Last ${days} days. ${searches.length} searches from ${new Set(searches.map((s) => s.caller)).size} callers.

## Empty searches (${empty.length}, ${pct(empty.length, searches.length)})

No template matched. These are the templates to build next.

${table(['Query', 'Filters', 'Times', 'Callers'], count(empty, (s) => `${norm(s.query)}\u0000${filters(s.filters)}`).map(([k, n]) => {
  const [q, f] = k.split('\u0000');
  return [q, f || '-', n, new Set(empty.filter((s) => norm(s.query) === q).map((s) => s.caller)).size];
}))}

## Weak searches (${weak.length}, ${pct(weak.length, searches.length)})

Results came back, but the caller opened none of them. Only clients that pass searchId: ${[...tracingClients].join(', ') || 'none yet'}.

${table(['Query', 'Filters', 'Times', 'Top results'], count(weak, (s) => `${norm(s.query)}\u0000${filters(s.filters)}`).slice(0, 40).map(([k, n]) => {
  const [q, f] = k.split('\u0000');
  return [q, f || '-', n, weak.find((s) => norm(s.query) === q)?.resultIds?.slice(0, 3).join(', ') ?? ''];
}))}

## The promise: search to personalized poster

- Previews requested: ${rendered.length}. Returned a poster: ${rendered.filter((e) => e.poster).length} (${pct(rendered.filter((e) => e.poster).length, rendered.length)}). Poster null: ${pct(rendered.filter((e) => !e.poster).length, rendered.length)}.
- Cache hits: ${pct(rendered.filter((e) => e.cached).length, rendered.length)}.
- Time from search to first poster: median ${secs(quantile(firstPreviewTimes, 0.5))}, p90 ${secs(quantile(firstPreviewTimes, 0.9))} (${firstPreviewTimes.length} searches). This includes the agent's time to fill the props.
- Render time (cache misses): median ${secs(quantile(rendered.filter((e) => e.poster && !e.cached).map((e) => e.ms), 0.5))}, p90 ${secs(quantile(rendered.filter((e) => e.poster && !e.cached).map((e) => e.ms), 0.9))}.

${table(['Engine', 'Previews', 'Poster null', 'Render p50', 'Render p90'], engines)}

Picks (spec opened) by engine: ${picksByEngine.map(([e, n]) => `${e} ${n}`).join(', ') || 'none'}.

Why posters were null:

${table(['Reason', 'Times'], count(rendered.filter((e) => !e.poster), (e) => e.error ?? 'unknown'))}

## Top queries

${table(['Query', 'Times', 'Empty'], count(searches, (s) => norm(s.query)).slice(0, 30).map(([q, n]) => [q, n, searches.filter((s) => norm(s.query) === q && s.empty).length]))}

## Clients

${table(['Client', 'Searches', 'Callers'], count(searches, (s) => s.client).map(([c, n]) => [c, n, new Set(searches.filter((s) => s.client === c).map((s) => s.caller)).size]))}

## Conversion per template

${table(['Template', 'Shown', 'Spec', 'Link', 'Preview', 'Spec rate'], [...templates].sort((a, b) => b[1].spec - a[1].spec || b[1].shown - a[1].shown).slice(0, 40)
  .map(([id, t]) => [id, t.shown, t.spec, t.link, t.preview, pct(t.spec, t.shown)]))}

## Repeat callers

${(() => {
  const daysBy = new Map();
  for (const s of searches) (daysBy.get(s.caller) ?? daysBy.set(s.caller, {n: 0, days: new Set()}).get(s.caller)).n++, daysBy.get(s.caller).days.add(new Date(s.at).toISOString().slice(0, 10));
  const repeat = [...daysBy.values()].filter((c) => c.n > 3 && c.days.size >= 2).length;
  return `${repeat} of ${daysBy.size} callers made more than 3 searches on 2 or more days (the trigger for offering local rendering).`;
})()}
`;
mkdirSync('out', {recursive: true});
writeFileSync(`out/search-report-${date}.md`, md);
console.log(md);
console.error(`Wrote out/search-report-${date}.md`);
