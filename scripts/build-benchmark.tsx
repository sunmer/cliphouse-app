import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {loadEnv} from 'vite';
import {renderToString} from 'react-dom/server';
import {BenchmarkPage} from '../src/benchmark/BenchmarkPage';
import {addition, additionDigest, allModels, contract, digest, protocol, root, validateAddition, validateResults} from './benchmark/protocol.mjs';
import {recoveryProtocol, validateRecovery} from './benchmark/recovery.mjs';
import {validateTimings} from './benchmark/timings.mjs';

const dist = path.join(root, 'dist');
const base = process.env.BASE ?? '/voodoo/';
const results = validateResults(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/results.json'), 'utf8')), path.join(root, 'public'));
const additions = validateAddition(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/addition-results.json'), 'utf8')), results, path.join(root, 'public'));
const recovery = validateRecovery(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/recovery.json'), 'utf8')), results, path.join(root, 'public'));
const timings = validateTimings(JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/timings.json'), 'utf8')), results, recovery, path.join(root, 'public'), additions);
const ga = process.env.VITE_GA_MEASUREMENT_ID ?? loadEnv('production', root, 'VITE_').VITE_GA_MEASUREMENT_ID ?? '';
const runCount = results.entries.length + additions.entries.length;
const description = results.entries.length
  ? `Compare ${runCount} actual AI motion graphics runs across ${allModels.length} models and three Remotion briefs, with generated videos, failures, and measured API costs.`
  : 'Find the right AI model for motion graphics without testing every model yourself. The first results are pending.';
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
for (const edition of [false, true]) {
  const url = `https://cliphou.se/benchmark/${edition ? '2026-10/' : ''}`;
  const file = path.join(dist, 'benchmark', edition ? '2026-10/index.html' : 'index.html');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${edition ? 'October 2026 ' : ''}Motion Graphics Benchmark`,
    description,
    url, mainEntityOfPage: url, datePublished: protocol.date, dateModified: results.updatedAt,
    author: {'@type': 'Organization', name: 'cliphou.se', url: 'https://cliphou.se/'},
    publisher: {'@type': 'Organization', name: 'cliphou.se', url: 'https://cliphou.se/'},
    image: 'https://cliphou.se/social.png',
  };
  const analytics = /^G-[A-Z0-9]+$/.test(ga) ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config',${safeJson(ga)},{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});gtag('event','page_view',{page_title:${safeJson(schema.headline)},page_location:${safeJson(url)}});</script>` : '';
  const html = fs.readFileSync(file, 'utf8').replace('<div id="root"></div>', `<div id="root">${renderToString(<BenchmarkPage base={base} edition={edition} />)}</div>`)
    .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*(")/g, `$1${description}$2`)
    .replace('</head>', `<script type="application/ld+json">${safeJson(schema)}</script>${analytics}</head>`);
  fs.writeFileSync(file, html);
}
fs.writeFileSync(path.join(dist, 'benchmark/protocol.json'), `${JSON.stringify({...protocol, sha256: digest}, null, 2)}\n`);
fs.writeFileSync(path.join(dist, 'benchmark/contract.txt'), `${contract}\n`);
fs.writeFileSync(path.join(dist, 'benchmark/results.json'), `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(path.join(dist, 'benchmark/addition-results.json'), `${JSON.stringify({...additions, addition, additionHash: additionDigest}, null, 2)}\n`);
fs.writeFileSync(path.join(dist, 'benchmark/recovery.json'), `${JSON.stringify(recovery, null, 2)}\n`);
fs.writeFileSync(path.join(dist, 'benchmark/recovery-protocol.json'), `${JSON.stringify(recoveryProtocol, null, 2)}\n`);
fs.writeFileSync(path.join(dist, 'benchmark/timings.json'), `${JSON.stringify(timings, null, 2)}\n`);
console.log('Prerendered benchmark and October edition, validated results, and exported protocol.');
