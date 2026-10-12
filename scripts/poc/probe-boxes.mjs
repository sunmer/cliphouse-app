import manifest from '../../src/catalog/manifest.json' with {type: 'json'};
import {launch, openTemplate, grab, closeServer} from '../directed/frames.mjs';
const [id, ...frames] = process.argv.slice(2);
const b = await launch();
const v = manifest.variants.find((x) => x.template === id);
const t = await openTemplate(b, id, v.props);
for (const f of frames) { const {boxes} = await grab(t, Number(f)); console.log(f, JSON.stringify(boxes.map((x) => [x.role, x.item, x.text.slice(0, 40), x.clipped, Math.round(x.left), Math.round(x.top)]))); }
await t.close(); await b.close(); await closeServer();
