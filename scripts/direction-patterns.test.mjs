import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {EFFECT_FILE, bannedIn} from './direction-patterns.mjs';

const root = path.resolve(import.meta.dirname, '..');
const blurred = (file, source) => bannedIn(file, source).includes('blur filters');

test('the shared Remotion effect file has only allowed blur', () => {
  assert.equal(blurred(EFFECT_FILE, fs.readFileSync(path.join(root, EFFECT_FILE), 'utf8')), false);
  assert.equal(blurred(EFFECT_FILE, `${fs.readFileSync(path.join(root, EFFECT_FILE), 'utf8')}\nconst x = 'blur(4px)';`), true);
});

test('Remotion templates cannot write blur directly', () => {
  assert.equal(blurred('src/videos/demo/Demo.tsx', "import {WhipPan} from '../effects/effects';"), false);
  assert.equal(blurred('src/videos/demo/Demo.tsx', "const style = {filter: 'blur(8px)'};"), true);
});

test('HyperFrames allows only the exact effect declarations', () => {
  const css = `.cliphouse-whip { filter: blur(var(--whip-blur, 0px)); }
.cliphouse-glass { backdrop-filter: blur(18px) saturate(1.3); -webkit-backdrop-filter: blur(18px) saturate(1.3); }`;
  assert.equal(blurred('src/hyperframes/demo/index.html', css), false);
  assert.equal(blurred('src/hyperframes/demo/index.html', '.title { filter: blur(8px); }'), true);
  assert.equal(blurred('src/hyperframes/demo/index.html', '.cliphouse-glass { backdrop-filter: blur(40px); }'), true);
  assert.equal(blurred('src/hyperframes/demo/index.html', '.cliphouse-whip { filter: blur(var(--whip-blur, 0px)); } .x { filter: blur(2px); }'), true);
});
