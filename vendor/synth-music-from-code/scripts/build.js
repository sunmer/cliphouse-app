#!/usr/bin/env node
// Build a self-contained HTML player: every track is synthesized in the browser (Web Worker, main-thread fallback),
// with play/stop, waveform + section lanes, live LUFS/true-peak readout, and Save (WAV inside a .zip).
// Usage: node build.js --ids=deep,tech --title="Four tracks, synthesized in your browser" --out=page.html
//        [--songs=songs.js] [--names=deep:deep-house,tech:tech-house] [--note="Mastered to -14 LUFS ..."]
const fs = require('fs'), path = require('path');
const { arg, engineSource } = require('./load');
const songs = fs.readFileSync(path.resolve(arg('songs', path.join(__dirname, 'songs.js'))), 'utf8');
const ids = arg('ids', '').split(',').filter(Boolean);
if (!ids.length) { console.error('pass --ids=a,b'); process.exit(1); }
const names = Object.fromEntries(arg('names', '').split(',').filter(Boolean).map(x => x.split(':')));
ids.forEach(id => { if (!names[id]) names[id] = id; });
let engine = engineSource() + '\n// ---- songs ----\n' + songs;
if (engine.includes('</script')) throw new Error('engine contains </script');
const tpl = fs.readFileSync(path.join(__dirname, 'web', 'template.html'), 'utf8');
const title = arg('title', 'Tracks, synthesized in your browser');
const html = tpl.replace('/*__ENGINE__*/', () => engine)
  .replace('LOFI_ORDER: LOFI_ORDER, ', '')
  .split('__TITLE__').join(title)
  .replace('__ORDER__', JSON.stringify(ids)).replace('__FILES__', JSON.stringify(names))
  .replace('__NOTE__', arg('note', 'Each track is mastered to −14 LUFS with its true peak under −1.5 dBTP, measured in your browser after it renders.'));
const out = path.resolve(arg('out', 'page.html'));
fs.writeFileSync(out, html); console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
