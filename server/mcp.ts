import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {z} from 'zod';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {engineOf} from '../src/videos/engine.ts';
import {scoreOf} from '../src/videos/music/schema.ts';
import {agentSpec} from '../src/agent/spec.ts';
import {handoffPath, specPath} from '../src/agent/versions.ts';
import {MCP_VERSION} from './discovery.ts';
import {HttpError, validateShare} from './model.ts';

const visible = manifest.variants.filter((v) => !('hidden' in v && v.hidden));
const ASPECTS = ['16:9', '9:16', '4:5', '1:1'] as const;
const aspect = (template: string) => {
  const m = templateMeta[template];
  const r = m.width / m.height;
  return r > 1.2 ? '16:9' : r < 0.7 ? '9:16' : r < 0.9 ? '4:5' : '1:1';
};
const text = (value: unknown) => ({content: [{type: 'text' as const, text: JSON.stringify(value, null, 2)}]});
const failure = (message: string) => ({isError: true, content: [{type: 'text' as const, text: message}]});

// Query words that should also match catalog vocabulary. Keep in sync with skills/cliphouse/scripts/cliphouse.mjs.
const SYNONYMS: Record<string, string[]> = {
  launch: ['launch', 'release', 'feature', 'drop', 'product'], release: ['launch', 'release'], ship: ['launch', 'release'],
  product: ['product', 'launch', 'saas', 'app'], app: ['app', 'mobile', 'saas', 'product'], saas: ['saas', 'product', 'app'],
  promo: ['promo', 'ad', 'social'], ad: ['ad', 'promo', 'social'], intro: ['intro', 'reveal', 'title', 'opener'],
  logo: ['logo', 'reveal', 'brand'], brand: ['brand', 'logo', 'intro'], announce: ['announcement', 'news'],
  stats: ['stat', 'data', 'chart', 'counter', 'recap'], data: ['data', 'chart', 'stat'], music: ['music', 'beat', 'score'],
  event: ['event', 'webinar', 'speaker', 'agenda'], sale: ['sale', 'discount', 'offer'], hiring: ['hiring', 'jobs'],
};
const STOP = new Set('a an the for of to and or with my our this that need want make video videos clip some me i we it is in on'.split(' '));
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9:]+/).filter((w) => w && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|es|s)$/, '');

// Each query word counts once, weighted by the strongest field it matches: title and purpose beat style and description.
// A synonym match counts less than the word itself, and the whole query found in a keyword or title adds a bonus.
function score(v: (typeof visible)[number], terms: string[][], phrase: string) {
  const fields: [string, number][] = [[v.title, 3], [[v.purpose, ...(v.useCases ?? [])].join(' '), 3],
    [[...(v.style ?? []), ...(v.keywords ?? [])].join(' '), 1], [v.seoDescription ?? v.description ?? '', 1]];
  const hit = (tokens: string[], t: string) => tokens.some((tok) => tok === t || (t.length > 3 && tok.startsWith(t)));
  const words_ = terms.reduce((total, group) => total + Math.max(0, ...fields.map(([field, weight]) => {
    const tokens = words(field).map(stem);
    return hit(tokens, group[0]) ? weight : group.some((t) => hit(tokens, t)) ? weight * 0.6 : 0;
  })), 0);
  const exact = phrase.includes(' ') && [v.title, v.purpose, ...(v.keywords ?? [])].some((f) => f.toLowerCase().includes(phrase));
  return words_ + (exact ? 3 : 0);
}

type SearchArgs = {query?: string; purpose?: string; engine?: string; aspect?: string; maxSeconds?: number; music?: boolean; limit?: number};
export function searchTemplates(origin: string, {query, purpose, engine, aspect: wanted, maxSeconds, music, limit = 6}: SearchArgs) {
  const kept = words(query ?? '').filter((w) => !(ASPECTS as readonly string[]).includes(w));
  const terms = kept.map((w) => [stem(w), ...(SYNONYMS[w] ?? SYNONYMS[stem(w)] ?? []).map(stem)]);
  const phrase = kept.join(' ');
  return visible
    .filter((v) => !purpose || v.purpose.toLowerCase() === purpose.toLowerCase())
    .filter((v) => !engine || engineOf(v.template) === engine)
    .filter((v) => !wanted || aspect(v.template) === wanted)
    .filter((v) => !maxSeconds || templateMeta[v.template].durationInFrames / templateMeta[v.template].fps <= maxSeconds)
    .filter((v) => music === undefined || Boolean(scoreOf(templateMeta[v.template])) === music)
    .map((v) => ({v, score: terms.length ? score(v, terms, phrase) : 1}))
    .filter(({score}) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(limit, 1), 20))
    .map(({v}) => {
      const meta = templateMeta[v.template];
      return {id: v.id, title: v.title, description: v.description, purpose: v.purpose, template: v.template, engine: engineOf(v.template),
        aspect: aspect(v.template), seconds: Math.round(meta.durationInFrames / meta.fps), music: Boolean(scoreOf(meta)),
        preview: `${origin}/previews/${v.id}.mp4`, poster: `${origin}/previews/${v.id}.jpg`, page: `${origin}/templates/${v.id}/`,
        spec: `${origin}${specPath(v.id)}`, editor: `${origin}/#/v/${v.id}`};
    });
}

export function templateSpec(origin: string, variantId: string) {
  const v = visible.find((item) => item.id === variantId);
  if (!v) return null;
  return agentSpec({site: origin, kind: 'template', id: v.id, url: `${origin}/templates/${v.id}/`, title: v.title, variant: v, props: v.props as never});
}

export function editLink(origin: string, variantId: string, props: unknown, templateVersion?: number) {
  const value = validateShare({variantId, props, ...(templateVersion === undefined ? {} : {templateVersion})});
  return `${origin}${handoffPath(variantId, value.props, templateVersion)}`;
}

const INSTRUCTIONS = `cliphou.se is a free library of editable motion graphics video templates (MIT-0): launch videos, promos, intros, social reels, logo reveals, teasers.
Workflow:
1. Learn the product before you search. If you can read the user's project, read it first: README, package.json, landing page, CSS variables, Tailwind config, and logo. Otherwise use the conversation, attached files, or a page the user gives. Collect the product name, tagline, 2-3 real features or numbers, call to action, and brand colors. Do not ask for facts the project already contains. Ask only for facts you cannot find. Never invent numbers.
2. Call search_templates with a short query (for example "product launch developer tool"). Set aspect only when the destination implies it: 9:16 for Reels, TikTok, and Shorts; 16:9 for YouTube and websites; 1:1 or 4:5 for feeds.
3. Show the best 3-4 results with title, aspect, length, and the poster image or preview link, and let the user pick one.
4. Call get_template_spec. Start from its props and change only texts, theme, and media (and hidden/audio for music templates). Keep each text within maxLength and each color as #RRGGBB, with good contrast.
5. Call build_edit_link. If it returns an error, fix the props and call it again. Give the user the link and a short list of the text you used. The link opens a live, editable preview; the user exports the MP4 there.
6. Treat follow-ups ("punchier", "use our green") as prop edits and return a new link.
For layout, motion, or timing changes, or a local MP4 render in a code project, point the user to the spec's source.package and source.renderCommand.`;

function createServer(origin: string) {
  const server = new McpServer({name: 'cliphouse', title: 'cliphou.se motion graphics', version: MCP_VERSION}, {instructions: INSTRUCTIONS});
  const readOnly = {readOnlyHint: true, openWorldHint: false};
  server.registerTool('search_templates', {
    title: 'Search video templates',
    description: 'Find motion graphics video templates (launch videos, promos, intros, social reels, logo reveals, teasers) in the free cliphou.se catalog. Returns id, title, aspect, length in seconds, preview MP4, poster image, and editor URL. Use this first when the user wants a video for a product, project, or announcement.',
    inputSchema: {
      query: z.string().max(200).optional().describe('Short description of the video, for example "saas product launch" or "logo intro".'),
      aspect: z.enum(ASPECTS).optional().describe('Only when the destination implies it: 9:16 vertical (Reels, TikTok, Shorts), 16:9 (YouTube, web), 1:1 or 4:5 (feeds).'),
      maxSeconds: z.number().int().min(1).max(600).optional().describe('Maximum video length in seconds.'),
      music: z.boolean().optional().describe('true for beat-synced templates with a generated soundtrack, false for silent ones.'),
      purpose: z.string().max(60).optional().describe('Exact catalog purpose, for example "Product launch".'),
      engine: z.enum(['remotion', 'hyperframes']).optional().describe('Rendering engine of the source package. Usually omit.'),
      limit: z.number().int().min(1).max(20).optional().describe('Maximum results, default 6.'),
    },
    annotations: readOnly,
  }, async (args) => text(searchTemplates(origin, args)));
  server.registerTool('get_template_spec', {
    title: 'Get template spec',
    description: 'Get the editable fields of one template: current props, text roles with maxLength, theme colors, scenes, format, JSON Schema, and the source package for local rendering. Call before build_edit_link and start from the returned props.',
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/).describe('Template id from search_templates.')},
    annotations: readOnly,
  }, async ({variantId}) => {
    const spec = templateSpec(origin, variantId);
    return spec ? text(spec) : failure(`Unknown template "${variantId}". Use search_templates to find ids.`);
  });
  server.registerTool('build_edit_link', {
    title: 'Build editor link',
    description: 'Validate filled-in props for a template and return a cliphou.se link that opens a live, editable preview of the customized video. The user can export the MP4 there. Invalid props return an error that names the field to fix.',
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/).describe('Template id.'),
      props: z.record(z.string(), z.unknown()).describe('The full props object from get_template_spec with edited texts, theme, and media.'),
      templateVersion: z.number().int().positive().optional().describe('Only for older template versions. Usually omit.')},
    annotations: readOnly,
  }, async ({variantId, props, templateVersion}) => {
    try { return text({url: editLink(origin, variantId, props, templateVersion)}); }
    catch (e) { return failure(e instanceof HttpError ? e.message : 'The props could not be validated.'); }
  });
  return server;
}

// Stateless Streamable HTTP: a fresh server and transport per request, JSON responses, no sessions or SSE.
export async function handleMcp(origin: string, req: IncomingMessage, res: ServerResponse, body: unknown) {
  const server = createServer(origin);
  const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
  res.on('close', () => { void transport.close(); void server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
