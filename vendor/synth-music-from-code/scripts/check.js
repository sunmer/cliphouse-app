#!/usr/bin/env node
// Rule checks on the note data (no audio needed). Exit code 1 if anything fails.
// Usage: node check.js [id ...] [--songs=path/songs.js]
const path = require('path');
const { load, arg, ids } = require('./load');
const { E } = load(path.resolve(arg('songs', path.join(__dirname, 'songs.js'))));
const MODES = { major: [0,2,4,5,7,9,11], ionian: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10], aeolian: [0,2,3,5,7,8,10], dorian: [0,2,3,5,7,9,10],
  phrygian: [0,1,3,5,7,8,10], lydian: [0,2,4,6,7,9,11], mixolydian: [0,2,4,5,7,9,10], locrian: [0,1,3,5,6,8,10] };
const ROOT = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
function scaleOf(key) { const [r, m] = key.split(' '); return MODES[m.toLowerCase()].map(i => (ROOT[r] + i) % 12); }
let allOk = true;
for (const id of ids(E)) {
  const s = E.SONGS[id], sp = s.spec || {}, fails = [], F = s.finalStep, sd = E.stepDur(s), ok = (c, m) => { if (!c) fails.push(m); };
  const scale = scaleOf(s.key);
  ok(JSON.stringify([...s.scale].sort()) === JSON.stringify([...scale].sort()), `scale table does not match "${s.key}"`);
  if (sp.bpm) ok(Math.abs(s.bpm - sp.bpm) < 0.001, `tempo ${s.bpm} vs ${sp.bpm}`);
  if (sp.key) ok(s.key === sp.key, `key ${s.key} vs ${sp.key}`);
  ok(F === 112, 'final hit is not on bar 8, beat 1 (step 112)');
  if (sp.final) ok(Math.abs(F * sd - sp.final) < 0.001, `final hit at ${(F * sd).toFixed(3)} s, brief says ${sp.final}`);
  ok(s.length <= (sp.maxLen || 15) + 1e-9, `length ${s.length} s over ${sp.maxLen || 15} s`);
  ok(s.length <= 128 * sd + 1e-9, 'longer than 8 bars');
  ok(s.length > F * sd + 0.5, 'less than half a second of tail after the final hit');
  const secStr = s.sections.map(x => `${x[0]}:${x[1]}-${x[2]}`).join(',');
  if (sp.sections) ok(secStr === sp.sections, `sections ${secStr}`);
  ok(s.sections[0][1] === 0 && s.sections[s.sections.length - 1][2] === 8 && s.sections.every((x, i) => !i || x[1] === s.sections[i - 1][2]), 'sections do not tile bars 1-8');
  const leads = s.parts.filter(p => p.role === 'lead');
  ok(leads.length <= 1, `${leads.length} lead parts (max 1)`);
  let pitched = 0, outKey = [], after = 0, atFinal = 0, overhang = [];
  for (const p of s.parts) for (const n of p.notes) {
    const st = n[0], end = n[0] + n[1];
    if (n[2] != null) { pitched++; if (!scale.includes(E.nm(n[2]) % 12)) outKey.push(`${p.name}:${n[2]}`); }
    if (st > F) after++; if (st === F) atFinal++;
    if (st < F && end > F + 1e-9) overhang.push(`${p.name}@${st}`);
  }
  ok(!outKey.length, 'out of key: ' + outKey.slice(0, 12).join(' '));
  ok(!after, `${after} notes start after the final hit (roll or swing pushed them late?)`);
  ok(atFinal > 0, 'nothing plays on the final hit');
  ok(!overhang.length, 'notes still held at the final hit: ' + overhang.slice(0, 8).join(' '));
  const ln = leads[0] ? [...leads[0].notes].sort((a, b) => a[0] - b[0]) : [];
  let ov = 0; for (let i = 1; i < ln.length; i++) if (ln[i][0] < ln[i - 1][0] + ln[i - 1][1] - 1e-9) ov++;
  ok(!ov, `${ov} overlapping notes in the lead line`);
  if (sp.bar4) {
    const b4 = s.parts.filter(p => ['snare', 'conga', 'toms', 'bongo', 'riser'].includes(p.name)).flatMap(p => p.notes.filter(n => n[0] >= 56 && n[0] < 64));
    ok(b4.length, 'no fill or riser in the second half of bar 4');
    if (sp.bar4 === 'riser') ok(s.parts.some(p => p.inst === 'riser' && p.notes.some(n => n[0] >= 48 && n[0] + n[1] === 64)), 'riser does not land on bar 5');
  }
  const tuned = [1760, 659.26, 3520, 4699, 5274, 220, 330, 55].map(f => Math.round(69 + 12 * Math.log2(f / 440)) % 12);   // fixed drum tunings
  ok(tuned.every(pc => scale.includes(pc)), 'a fixed drum tuning (A/D/E based) is out of this key: retune rim/ride/snare/kick');
  console.log(`${id.padEnd(9)} ${fails.length ? 'FAIL' : 'pass'}  ${pitched} pitched notes, ${leads.length ? 'lead "' + leads[0].name + '" ' + ln.length + ' notes' : 'no lead'}, final hit ${(F * sd).toFixed(3)} s, length ${s.length.toFixed(3)} s`);
  fails.forEach(f => console.log('   - ' + f)); if (fails.length) allOk = false;
}
process.exit(allOk ? 0 : 1);
