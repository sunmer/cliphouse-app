// Record the SHA-256 of each music preset's WAV. Run after an intended change to the synthesizer
// or a score, and listen to every mix before committing. Usage: npm run music:hashes
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {scoreOf} from '../src/videos/music/schema.ts';
import {musicWav} from '../src/videos/music/index.ts';

const root = path.resolve(import.meta.dirname, '..');
const out = {};
for (const t of manifest.templates.filter((t) => t.music)) {
  const v = manifest.variants.find((x) => x.template === t.id && !x.hidden);
  out[t.id] = createHash('sha256').update(musicWav(scoreOf(templateMeta[t.id]), v.props)).digest('hex');
  if (process.env.WAV_DIR) fs.writeFileSync(path.join(process.env.WAV_DIR, `${v.id}.wav`), musicWav(scoreOf(templateMeta[t.id]), v.props));
}
fs.writeFileSync(path.join(root, 'scripts/music-hashes.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(out);
