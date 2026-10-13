#!/usr/bin/env node
// Render tracks to 16-bit WAV (+ a .json sidecar used by audiocheck.py).
// Usage: node render.js [id ...] [--songs=path/songs.js] [--out=out] [--report]
const fs = require('fs'), path = require('path');
const { load, arg, ids } = require('./load');
const { E } = load(path.resolve(arg('songs', path.join(__dirname, 'songs.js'))));
const out = path.resolve(arg('out', 'out')); fs.mkdirSync(out, { recursive: true });
for (const id of ids(E)) {
  const s = E.SONGS[id]; if (!s) { console.log('no song', id); continue; }
  const t0 = Date.now(), r = E.renderSong(s);
  fs.writeFileSync(path.join(out, id + '.wav'), Buffer.from(E.encodeWav(r.L, r.R, 7)));
  fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify({ id, title: s.title, final: s.finalStep * E.stepDur(s), maxLen: (s.spec && s.spec.maxLen) || 15, length: s.length }));
  console.log(`${id}: ${Date.now() - t0} ms  LUFS ${r.lufs.toFixed(2)}  TP ${r.tp.toFixed(2)}  ${(r.L.length / E.SR).toFixed(3)} s`);
  if (process.argv.includes('--report')) r.report.forEach(p => console.log(`   ${p.name.padEnd(9)} LUFS in mix ${p.inMix.toFixed(1).padStart(6)}`));
}
