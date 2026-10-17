// Before-and-after contact sheet for pilot templates: the published poster on the left, the candidate on the right.
// Usage: node scripts/launch/pilot-sheet.mjs <pilot-dir> <id> [...]   (writes <pilot-dir>/compare.png)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const [dirArg, ...ids] = process.argv.slice(2);
const dir = path.resolve(root, dirArg);
const rows = ids.map((id) => [path.join(root, 'public/previews', `${id}-launch.jpg`), path.join(dir, id, 'poster.jpg')]).filter(([a, b]) => fs.existsSync(a) && fs.existsSync(b));
if (!rows.length) throw new Error('No pilot posters to compare yet.');
const inputs = rows.flat().flatMap((f) => ['-i', f]);
const cells = rows.flat().map((_, i) => `[${i}:v]scale=480:360:force_original_aspect_ratio=decrease,pad=500:380:(ow-iw)/2:(oh-ih)/2:color=0x808080[c${i}]`);
const layout = rows.flat().map((_, i) => `${(i % 2) * 500}_${Math.floor(i / 2) * 380}`).join('|');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${cells.join(';')};${rows.flat().map((_, i) => `[c${i}]`).join('')}xstack=inputs=${rows.length * 2}:layout=${layout}`,
  '-frames:v', '1', path.join(dir, 'compare.png')]);
console.log(`${rows.length} rows: before (left), candidate (right)`);
