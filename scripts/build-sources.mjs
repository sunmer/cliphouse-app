// Package each template as a standalone Remotion or HyperFrames project and assign immutable versions.
// Usage: node scripts/build-sources.mjs          add a version for every changed template
//        node scripts/build-sources.mjs --check  fail when a package is missing or out of date
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const versionsFile = path.join(root, 'src/videos/versions.json');
const legacyFile = path.join(root, 'src/videos/legacy.ts');
const legacySchemasFile = path.join(root, 'src/videos/legacy-schemas.ts');
const legacyDir = path.join(root, 'src/legacy');
const outDir = path.join(root, 'public/source');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8'));
const versions = fs.existsSync(versionsFile) ? JSON.parse(fs.readFileSync(versionsFile, 'utf8')) : {};
const read = (p) => fs.readFileSync(path.join(root, p));
const shared = ['src/videos/contract.ts', 'src/videos/vocab.ts', ...fs.readdirSync(path.join(root, 'src/videos/shared')).sort().map((f) => `src/videos/shared/${f}`)];
const tree = (dir) => fs.readdirSync(path.join(root, dir), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((e) => e.isDirectory() ? tree(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
// Optional modules. A package includes one only when its template imports it, so older packages keep their hashes.
const optional = [
  {dir: 'src/videos/media', pattern: /from '\.\.\/media\//, template: 'scripts/source-template/media'},
  {dir: 'src/videos/three', pattern: /from '\.\.\/three\//, template: 'scripts/source-template/three'},
];
const template = JSON.parse(read('scripts/source-template/package.json'));
const lock = read('scripts/source-template/package-lock.json');
const license = read('LICENSE');
const hyperframesIds = new Set(JSON.parse(read('src/videos/engine.ts').toString().match(/HYPERFRAMES_TEMPLATES = (\[[^\]]+\])/)[1].replaceAll("'", '"')));
const hfAssets = [
  ['assets/gsap.min.js', 'node_modules/gsap/dist/gsap.min.js'],
  ['assets/fonts/archivo.woff2', 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2'],
  ['assets/fonts/fraunces.woff2', 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2'],
  ['assets/fonts/fraunces-italic.woff2', 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2'],
  ['assets/fonts/inter.woff2', 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
  ['assets/fonts/jetbrains-mono.woff2', 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'],
];

const pascal = (id) => id[0].toUpperCase() + id.slice(1);
function hyperframesDeclarations(props) {
  const labels = {brand: 'Brand', headline: 'Headline', subhead: 'Subhead', point1: 'Point 1', point2: 'Point 2', point3: 'Point 3', cta: 'Call to action', quote: 'Quote', author: 'Author', date: 'Date', price: 'Price', priceNote: 'Price note', stat: 'Stat'};
  return [
    ...Object.entries(props.texts).map(([role, value]) => ({id: `text_${role}`, type: 'string', label: labels[role], default: value})),
    ...Object.entries(props.theme).map(([role, value]) => ({id: `theme_${role}`, type: 'color', label: role === 'foreground' ? 'Text' : role === 'accent2' ? 'Accent 2' : pascal(role), default: value})),
  ];
}
function hyperframesFiles(id, version, variant) {
  const html = read(`src/hyperframes/${id}/index.html`).toString()
    .replace('__BASE_CSS__', read('src/hyperframes/shared/base.css').toString())
    .replace('__BASE_JS__', read('src/hyperframes/shared/base.js').toString())
    .replaceAll('__ASSET_BASE__', 'assets')
    .replace(/data-composition-variables='[^']*'/, `data-composition-variables='${JSON.stringify(hyperframesDeclarations(variant.props)).replace(/'/g, '&#39;')}'`);
  const out = new Map([
    ['index.html', Buffer.from(html)],
    ['hyperframes.json', Buffer.from(`${JSON.stringify({$schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', paths: {assets: 'assets'}, media: {autoProxy: true}}, null, 2)}\n`)],
    ['package.json', Buffer.from(`${JSON.stringify({name: `cliphouse-${id}`, private: true, license: 'MIT-0', type: 'module', scripts: {preview: 'npx --yes hyperframes@0.8.146 preview', check: 'npx --yes hyperframes@0.8.146 check', render: 'npx --yes hyperframes@0.8.146 render --variables-file variables.json --strict-variables -o out/video.mp4'}}, null, 2)}\n`)],
    ['variables.json', Buffer.from(`${JSON.stringify(Object.fromEntries([...Object.entries(variant.props.texts).map(([k, v]) => [`text_${k}`, v]), ...Object.entries(variant.props.theme).map(([k, v]) => [`theme_${k}`, v])]), null, 2)}\n`)],
    ['LICENSE', license],
    ['README.md', Buffer.from(`# ${pascal(id)} by cliphou.se, template v${version}\n\nThis is a native HyperFrames project for the cliphou.se \`${id}\` template.\n\n\`\`\`bash\nnpx --yes hyperframes@0.8.146 check\nnpx --yes hyperframes@0.8.146 render --variables-file variables.json --strict-variables -o out/video.mp4\nnpx --yes hyperframes@0.8.146 preview\n\`\`\`\n\n- Change text and colors in \`variables.json\`.\n- Change layout, timing, and GSAP motion in \`index.html\`.\n- GSAP and fonts are local. The composition uses a paused, seekable timeline and no network assets.\n\nThe cliphou.se template is MIT-0. GSAP and fonts keep their own licenses.\n`)],
  ]);
  for (const [target, source] of hfAssets) out.set(target, read(source));
  for (const name of ['archivo', 'fraunces', 'inter', 'jetbrains-mono']) out.set(`assets/fonts/LICENSE-${name}.txt`, read(`node_modules/@fontsource-variable/${name}/LICENSE`));
  return out;
}
function files(id, version) {
  const variant = manifest.variants.find((v) => v.template === id && !v.hidden) ?? manifest.variants.find((v) => v.template === id);
  if (hyperframesIds.has(id)) return hyperframesFiles(id, version, variant);
  const dir = `src/videos/${id}`;
  const component = fs.readdirSync(path.join(root, dir)).find((f) => f.endsWith('.tsx'));
  const name = component.replace(/\.tsx$/, '');
  const out = new Map();
  // prompts.json is generator input; records.json in the package holds each asset's exact prompt.
  const own = tree(dir).filter((f) => !f.endsWith('/assets/prompts.json'));
  const code = own.filter((f) => /\.tsx?$/.test(f)).map((f) => read(f).toString()).join('\n');
  const used = optional.filter((o) => o.pattern.test(code));
  for (const f of [...own, ...shared, ...used.flatMap((o) => tree(o.dir))]) out.set(f, read(f));
  // A module with extra npm dependencies brings its own package.json and lockfile.
  const deps = used.findLast((o) => fs.existsSync(path.join(root, o.template, 'package.json')));
  const pkgTemplate = deps ? JSON.parse(read(`${deps.template}/package.json`)) : template;
  out.set('package.json', Buffer.from(`${JSON.stringify({...pkgTemplate, name: pkgTemplate.name, description: `cliphou.se ${pascal(id)} template v${version}`,
    scripts: {render: `remotion render src/index.ts ${id} out/video.mp4 --props=props.json`, studio: 'remotion studio src/index.ts'}}, null, 2)}\n`));
  out.set('package-lock.json', deps ? read(`${deps.template}/package-lock.json`) : lock);
  out.set('LICENSE', license);
  out.set('props.json', Buffer.from(`${JSON.stringify(variant.props, null, 2)}\n`));
  out.set('tsconfig.json', Buffer.from(`${JSON.stringify({compilerOptions: {target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, resolveJsonModule: true, esModuleInterop: true, skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true}, include: ['src']}, null, 2)}\n`));
  out.set('src/fonts.d.ts', Buffer.from(`declare module '*.woff2' {\n  const url: string;\n  export default url;\n}\n${used.some((o) => o.dir.endsWith('media')) ? "declare module '*.webp' {\n  const url: string;\n  export default url;\n}\n" : ''}`));
  out.set('src/index.ts', Buffer.from("import {registerRoot} from 'remotion';\nimport {RemotionRoot} from './Root';\n\nregisterRoot(RemotionRoot);\n"));
  out.set('src/Root.tsx', Buffer.from(`import React from 'react';
import {Composition} from 'remotion';
import props from '../props.json';
import {${name}} from './videos/${id}/${name}';
import {${id}Meta as meta} from './videos/${id}/meta';
import {${id}Schema as schema} from './videos/${id}/schema';

export const RemotionRoot: React.FC = () => (
  <Composition id="${id}" component={${name}} schema={schema} defaultProps={props as never}
    width={meta.width} height={meta.height} fps={meta.fps} durationInFrames={meta.durationInFrames} />
);
`));
  out.set('README.md', Buffer.from(`# ${pascal(id)} by cliphou.se, template v${version}

This is a standalone Remotion project for the cliphou.se \`${id}\` template.

\`\`\`bash
npm ci
npx remotion render src/index.ts ${id} out/video.mp4 --props=props.json
npx remotion studio src/index.ts
\`\`\`

- Change text and colors${used.some((o) => o.dir.endsWith('media')) ? ', and choose a bundled image by ID,' : ''} in \`props.json\`. The schema is in \`src/videos/${id}/schema.ts\`.
- Change layout, motion, and timing in \`src/videos/${id}/\`. Scene timing is in \`meta.ts\`.
- Fonts come from pinned Fontsource packages.${used.some((o) => o.dir.endsWith('media')) ? ` Images are bundled in \`src/videos/${id}/assets/\`; \`records.json\` lists each image's prompt, model, size, and hash.` : ''} The template uses no network assets and no unseeded randomness.
- The same template version, dependency versions, and props render the same video.

The template is MIT-0: copy, modify, sell, and share it without attribution. Remotion has separate license terms: https://remotion.dev/license
`));
  return out;
}

function digest(map) {
  const hash = createHash('sha256');
  for (const [name, data] of [...map].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(`${name}\0${data.length}\0`).update(data);
  }
  return hash.digest('hex').slice(0, 16);
}

// Minimal ustar writer with fixed metadata, so identical files give identical archives.
function tar(map, prefix) {
  const blocks = [];
  for (const [name, data] of [...map].sort(([a], [b]) => a.localeCompare(b))) {
    const header = Buffer.alloc(512);
    const full = `${prefix}/${name}`;
    if (Buffer.byteLength(full) > 100) throw new Error(`Path too long for tar: ${full}`);
    header.write(full, 0);
    header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124);
    header.write('00000000000\0', 136);
    header.write('        ', 148); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks), {level: 9});
}

function untar(file) {
  const data = zlib.gunzipSync(fs.readFileSync(file));
  const out = new Map();
  for (let at = 0; at + 512 <= data.length;) {
    const name = data.subarray(at, at + 100).toString().replace(/\0.*$/s, '');
    if (!name) break;
    const size = parseInt(data.subarray(at + 124, at + 136).toString(), 8);
    out.set(name.slice(name.indexOf('/') + 1), data.subarray(at + 512, at + 512 + size));
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

// Keep superseded versions in the app bundle, so saved and shared videos keep playing their original code.
function keepLegacy(id, version) {
  const target = path.join(legacyDir, id, `v${version}`);
  if (fs.existsSync(target)) return;
  for (const [name, data] of untar(path.join(outDir, id, `v${version}.tar.gz`))) {
    if (!name.startsWith('src/videos/')) continue;
    const file = path.join(target, name.slice('src/videos/'.length));
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, data);
  }
}

function writeLegacyIndex() {
  const entries = [];
  for (const [id, list] of Object.entries(versions)) for (const {version} of list.slice(0, -1)) {
    const dir = path.join(legacyDir, id, `v${version}`, id);
    const name = fs.readdirSync(dir).find((f) => f.endsWith('.tsx')).replace(/\.tsx$/, '');
    entries.push({id, version, name, base: `../legacy/${id}/v${version}/${id}`});
  }
  const alias = (e) => `${e.id}V${e.version}`;
  const text = `// Generated by scripts/build-sources.mjs. Do not edit.
import type {TemplateMeta, VideoSchema} from './contract';
import type React from 'react';
${entries.map((e) => `import {${e.name} as ${alias(e)}} from '${e.base}/${e.name}';
import {${e.id}Meta as ${alias(e)}Meta} from '${e.base}/meta';
import {${e.id}Schema as ${alias(e)}Schema} from '${e.base}/schema';`).join('\n')}

export type LegacyDef = TemplateMeta & {component: React.FC<any>; schema: VideoSchema};
export const legacy: Record<string, Record<number, LegacyDef>> = {
${[...new Set(entries.map((e) => e.id))].map((id) => `  ${id}: {${entries.filter((e) => e.id === id).map((e) => `${e.version}: {...${alias(e)}Meta, component: ${alias(e)}, schema: ${alias(e)}Schema as unknown as VideoSchema}`).join(', ')}},`).join('\n')}
};
`;
  const schemasText = `// Generated by scripts/build-sources.mjs. Do not edit.
import type {VideoSchema} from './contract';
${entries.map((e) => `import {${e.id}Schema as ${alias(e)}Schema} from '${e.base}/schema';`).join('\n')}

export const legacySchemas: Record<string, Record<number, VideoSchema>> = {
${[...new Set(entries.map((e) => e.id))].map((id) => `  ${id}: {${entries.filter((e) => e.id === id).map((e) => `${e.version}: ${alias(e)}Schema as unknown as VideoSchema`).join(', ')}},`).join('\n')}
};
`;
  for (const [file, body] of [[legacyFile, text], [legacySchemasFile, schemasText]]) {
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== body) errors.push(`${path.relative(root, file)} is out of date. Run npm run sources.`); }
    else fs.writeFileSync(file, body);
  }
}

const errors = [];
let added = 0;
for (const id of manifest.templates.map((t) => t.id)) {
  const list = versions[id] ?? [];
  const latest = list.at(-1);
  // Hash with a placeholder version so only source or dependency changes create a new version.
  const hash = digest(files(id, 'N'));
  for (const v of list) if (!fs.existsSync(path.join(outDir, id, `v${v.version}.tar.gz`))) errors.push(`${id}: missing package for v${v.version}`);
  if (latest?.hash === hash) continue;
  if (check) { errors.push(`${id}: source changed since v${latest?.version ?? 0}. Run npm run sources and commit the new version.`); continue; }
  const version = (latest?.version ?? 0) + 1;
  if (latest) keepLegacy(id, latest.version);
  const archive = tar(files(id, version), `cliphouse-${id}-v${version}`);
  fs.mkdirSync(path.join(outDir, id), {recursive: true});
  const file = path.join(outDir, id, `v${version}.tar.gz`);
  if (fs.existsSync(file)) throw new Error(`${file} already exists. Published packages are immutable.`);
  fs.writeFileSync(file, archive);
  versions[id] = [...list, {version, hash, sha256: createHash('sha256').update(archive).digest('hex'), createdAt: new Date().toISOString().slice(0, 10)}];
  added++;
}
writeLegacyIndex();
if (errors.length) throw new Error(`Source packages are out of date:\n${errors.map((e) => `- ${e}`).join('\n')}`);
if (!check) {
  fs.writeFileSync(versionsFile, `${JSON.stringify(versions, null, 2)}\n`);
  console.log(`Added ${added} template source version${added === 1 ? '' : 's'}.`);
} else console.log('Template source packages are current.');
