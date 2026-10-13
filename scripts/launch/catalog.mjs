// Catalog entries for the launch set: one template and one visible variant each, merged into manifest.json.
// Usage: node --import tsx scripts/launch/catalog.mjs   (writes the manifest; ready templates only unless ALL=1)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAUNCH} from './briefs.mjs';

const root = path.resolve(import.meta.dirname, '../..');
// Preset tracks rotate through the library so the gallery shows the range. House leads: it suits launches.
const PRESET_TRACKS = ['house-launch', 'techno-pulse', 'lofi-window', 'house-shipit', 'house-rooftop', 'techno-grid', 'lofi-sunday', 'lofi-nightshift'];
export const presetProps = (b) => ({texts: Object.fromEntries(b.roles.map((r) => [r, b.texts[r]])), theme: b.theme,
  audio: {enabled: true, track: PRESET_TRACKS[LAUNCH.indexOf(b) % PRESET_TRACKS.length]}});

const seo = (b) => {
  const format = b.size[0] === b.size[1] ? '1:1' : b.size[0] > b.size[1] ? '16:9' : b.size[0] / b.size[1] < 0.7 ? '9:16' : '4:5';
  const text = `A free ${format} ${b.title.toLowerCase()} template for SaaS launches, with royalty-free music. Edit text, list items, colors, and the track online.`;
  return text.length <= 170 ? text : text.slice(0, 167) + '...';
};

export function entries(b) {
  return {
    template: {id: b.id, title: b.name, creator: 'cliphouse.studio', prompt: b.brief, createdAt: '2026-10-13', license: 'MIT-0',
      generation: {model: 'Claude Opus 5.5', modelId: 'claude-opus-5-5', provider: 'Anthropic', effort: 'high'}},
    variant: {template: b.id, creator: 'cliphouse.studio', stats: {exports: 0, remixes: 0}, createdAt: '2026-10-13',
      id: `${b.id}-launch`, title: b.title, description: b.brief.replace(/^A \S+ /, 'A '),
      purpose: b.useCases.includes('testimonial') ? 'Testimonial' : b.useCases.includes('data-recap') ? 'Data recap' : 'Product launch',
      style: b.style, energy: b.energy,
      keywords: [`${b.title.toLowerCase()} video`, 'saas launch video', 'changelog video', 'product launch template', 'hyperframes template'],
      props: presetProps(b), seoDescription: seo(b), useCases: b.useCases, launch: true},
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const status = JSON.parse(fs.readFileSync(path.join(root, 'output/launch/status.json'), 'utf8'));
  const p = path.join(root, 'src/catalog/manifest.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ready = LAUNCH.filter((b) => process.env.ALL === '1' || status[b.id]?.state === 'ready');
  m.templates = m.templates.filter((t) => !LAUNCH.some((b) => b.id === t.id));
  m.variants = m.variants.filter((v) => !LAUNCH.some((b) => b.id === v.template));
  // Every launch template is registered so gates and the editor can open it; unfinished ones stay hidden.
  for (const b of LAUNCH) {
    const {template, variant} = entries(b);
    m.templates.push(template);
    m.variants.push(ready.includes(b) ? variant : {...variant, hidden: true});
  }
  fs.writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  console.log(`Catalog: ${ready.length} launch templates.`);
}
