// Loads the engine plus a songs file into this Node process. Used by render.js, check.js and build.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
function engineSource() { return ['dsp.js', 'instruments.js', 'mix.js'].map(f => `// ---- ${f} ----\n` + fs.readFileSync(path.join(__dirname, 'engine', f), 'utf8')).join('\n'); }
function load(songsPath) {
  const src = engineSource() + '\n// ---- songs ----\n' + fs.readFileSync(songsPath, 'utf8');
  vm.runInThisContext(src + '\n;globalThis.__E = { renderSong, SONGS, encodeWav, stepDur, nm, SR };');   // runInThisContext: full speed (a sandboxed vm context is ~6x slower)
  return { E: globalThis.__E, src };
}
function arg(name, def) { const a = process.argv.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : def; }
function ids(E) { const l = process.argv.slice(2).filter(a => !a.startsWith('--')); return l.length ? l : Object.keys(E.SONGS); }
module.exports = { load, arg, ids, engineSource };
