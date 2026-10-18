// Prerender the GTA6 Trailer Benchmark page into dist/benchmark/gta6/index.html.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {Gta6Page} from '../src/benchmark/gta6/Gta6Page';

const root = path.resolve(import.meta.dirname, '..');
const base = process.env.BASE ?? '/voodoo/';
const file = path.join(root, 'dist/benchmark/gta6/index.html');
const results = JSON.parse(fs.readFileSync(path.join(root, 'src/benchmark/trailer-voxel/results.json'), 'utf8'));
for (const entry of results.entries) for (const key of ['video', 'firstVideo', 'poster', 'sheet', 'source']) {
  if (!fs.existsSync(path.join(root, 'public', entry[key]))) throw new Error(`Missing GTA6 benchmark asset: ${entry[key]}`);
}
const url = 'https://cliphou.se/benchmark/gta6/';
const schema = {'@context': 'https://schema.org', '@type': 'Article', headline: 'GTA6 Trailer Benchmark', url, mainEntityOfPage: url, datePublished: results.date, dateModified: results.date,
  author: {'@type': 'Organization', name: 'cliphou.se', url: 'https://cliphou.se/'}, publisher: {'@type': 'Organization', name: 'cliphou.se', url: 'https://cliphou.se/'},
  image: 'https://cliphou.se/benchmark/gta6/media/opus-5-5-high-1.jpg'};
const html = fs.readFileSync(file, 'utf8').replace('<div id="root"></div>', `<div id="root">${renderToString(<Gta6Page base={base} />)}</div>`)
  .replace('</head>', `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script></head>`);
fs.writeFileSync(file, html);
console.log('Prerendered the GTA6 Trailer Benchmark page.');
