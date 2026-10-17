import {randomBytes} from 'node:crypto';
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
import {AGENT_CONTRACT_VERSION, GOAL_IDS, MARKETING_GOALS, goalLabel, type MarketingGoal} from '../src/agent/goals.ts';
import {MCP_VERSION} from './discovery.ts';
import {HttpError, validateShare} from './model.ts';
import type {EventLog, SearchLog} from './store.ts';
import {LOOP_SECONDS, type LoopResult, type PreviewResult} from './preview.ts';
import {checkBrand, tailorProps} from './tailor.ts';
import {fixedSampleData} from '../src/agent/sample-data.ts';
import {logoOf, logoPath, supportsLogo} from '../src/videos/logo.ts';
import {schemas} from '../src/videos/schemas.ts';
import type {ProcessedLogo} from './logos.ts';
import {APP_MIME, PREVIEW_APP_URI, previewAppMeta, previewToolMeta} from './mcp-app.ts';

// Per-request caller context. Logging is best effort and bounded: it never fails or noticeably delays a tool call.
export type McpContext = {
  client: string; caller: string; keyed?: boolean;
  logSearch?: (entry: SearchLog) => Promise<void>;
  logEvent?: (entry: EventLog) => Promise<void>;
  preview?: (args: {variantId: string; props: unknown; templateVersion?: number; caller: string; keyed: boolean; editor: string; timeoutMs?: number}) => Promise<PreviewResult>;
  loop?: (args: {variantId: string; props: unknown; caller: string; keyed: boolean; timeoutMs?: number}) => Promise<LoopResult>;
  uploadLogo?: (input: {data?: unknown; svg?: unknown}) => Promise<ProcessedLogo>;
  logoExists?: (id: string) => Promise<boolean>;
  // HTML of the live preview view for MCP Apps hosts. Without it the tools return text and images only.
  previewApp?: string | null;
};
// Budget for a whole render_previews batch. Posters not ready by then come back with poster: null.
export const BATCH_BUDGET_MS = 20_000;
// With loop: true the batch waits for the animated loops up to this budget. Loops not ready come back with
// video: null and videoPending: true; they keep rendering, so a repeat call picks them up.
export const LOOP_BUDGET_MS = 45_000;
export const MAX_BATCH = 4;
const LOG_WAIT_MS = 300;
export async function record(write: (() => Promise<void>) | undefined) {
  if (!write) return;
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([write().catch((e) => console.error('Log write failed:', (e as {code?: string}).code || (e as Error).name)),
    new Promise<void>((resolve) => { timer = setTimeout(resolve, LOG_WAIT_MS); })]).finally(() => clearTimeout(timer));
}
const SEARCH_ID = /^[A-Za-z0-9_-]{8,40}$/;
const searchIdField = z.string().regex(SEARCH_ID).optional().describe('The searchId returned by search_templates. Pass it through so picks can be measured.');

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

type SearchArgs = {query?: string; goal?: MarketingGoal; purpose?: string; engine?: string; aspect?: string; maxSeconds?: number; music?: boolean; limit?: number};
const goalsOf = (v: (typeof visible)[number]) => ((v as {goals?: MarketingGoal[]}).goals ?? []);
// Plain requests ("we need a waitlist video") imply a goal. An explicit goal always wins.
export function inferGoal(query = ''): MarketingGoal | undefined {
  const text = ` ${query.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  return MARKETING_GOALS.map((goal) => ({goal: goal.id, score: goal.terms.reduce((n, term) => n + (text.includes(` ${term} `) ? term.split(' ').length : 0), 0)}))
    .filter((item) => item.score > 0).sort((a, b) => b.score - a.score)[0]?.goal;
}
export function rankTemplates({query, goal, purpose, engine, aspect: wanted, maxSeconds, music, limit = 6}: SearchArgs) {
  const selectedGoal = goal ?? inferGoal(query);
  const kept = words(query ?? '').filter((w) => !(ASPECTS as readonly string[]).includes(w));
  const terms = kept.map((w) => [stem(w), ...(SYNONYMS[w] ?? SYNONYMS[stem(w)] ?? []).map(stem)]);
  const phrase = kept.join(' ');
  return visible
    .filter((v) => !goal || goalsOf(v).includes(goal))
    .filter((v) => !purpose || v.purpose.toLowerCase() === purpose.toLowerCase())
    .filter((v) => !engine || engineOf(v.template) === engine)
    .filter((v) => !wanted || aspect(v.template) === wanted)
    .filter((v) => !maxSeconds || templateMeta[v.template].durationInFrames / templateMeta[v.template].fps <= maxSeconds)
    .filter((v) => music === undefined || Boolean(scoreOf(templateMeta[v.template])) === music)
    .map((v) => ({v, score: (terms.length ? score(v, terms, phrase) : 1) + (selectedGoal && goalsOf(v).includes(selectedGoal) ? 5 : 0)}))
    // Templates that draw fixed sample numbers rank a little lower, so they stay findable but rarely lead.
    .map((r) => (fixedSampleData(r.v.template).length ? {...r, score: r.score - 2} : r))
    .filter(({score}) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(limit, 1), 20));
}
const card = (origin: string, includeEngine = false) => ({v}: {v: (typeof visible)[number]}) => {
      const meta = templateMeta[v.template];
      const goals = goalsOf(v);
      const fixed = fixedSampleData(v.template);
      return {id: v.id, title: v.title, description: v.description, purpose: v.purpose, goals, goalLabels: goals.map(goalLabel), template: v.template,
        ...(includeEngine ? {engine: engineOf(v.template)} : {}),
        aspect: aspect(v.template), seconds: Math.round(meta.durationInFrames / meta.fps), music: Boolean(scoreOf(meta)),
        ...(fixed.length ? {fixedSampleContent: fixed} : {}),
        preview: `${origin}/previews/${v.id}.mp4`, poster: `${origin}/previews/${v.id}.jpg`, page: `${origin}/templates/${v.id}/`,
        spec: `${origin}${specPath(v.id)}`, editor: `${origin}/#/v/${v.id}`};
};
export const searchTemplates = (origin: string, args: SearchArgs) => rankTemplates(args).map(card(origin, Boolean(args.engine)));

export function templateSpec(origin: string, variantId: string) {
  const v = visible.find((item) => item.id === variantId);
  if (!v) return null;
  return agentSpec({site: origin, kind: 'template', id: v.id, url: `${origin}/templates/${v.id}/`, title: v.title, variant: v, props: v.props as never});
}

export function editLink(origin: string, variantId: string, props: unknown, templateVersion?: number) {
  const value = validateShare({variantId, props, ...(templateVersion === undefined ? {} : {templateVersion})});
  return `${origin}${handoffPath(variantId, value.props, templateVersion)}`;
}

const INSTRUCTIONS = `cliphou.se turns what the user builds into marketing videos. It has editable motion graphics templates for launches, feature announcements, updates, waitlists, events, social proof, and brand intros. Most users are developers and small teams with no marketer, so you also act as their marketer: find the selling points and write copy that sells. Contract ${AGENT_CONTRACT_VERSION}.
Workflow:
1. Learn the product before you search. If you can read the user's project, read it first: README, package.json, landing page, CSS variables, Tailwind config, and logo. Otherwise use the conversation, attached files, or a page the user gives. Collect the product name, tagline, 2-3 real features or numbers, call to action, and brand colors. If the project has a logo file (an SVG such as public/logo.svg or logo.svg, else a PNG with a transparent background), call upload_logo with it once and keep the returned logo. Do not ask for a logo the project lacks; the brand name shows instead. Do not ask for facts the project already contains. Ask only for facts you cannot find. Never invent numbers.
2. Position it before you write copy. From those facts, decide: the audience (who it is for), the problem they feel, what changed in this release (the git log, CHANGELOG, or the user's words), and the one angle for this video. Turn features into benefits ("Search is 3x faster" beats "New search index"). Pick a hook: a pain, a question, a number, or a before/after. Write the headline as that hook and the points as benefits. Use only facts from the project; never invent numbers, customers, or quotes. Tell the user the angle in one line, so they can redirect it.
3. Choose the marketing goal: ${GOAL_IDS.join(', ')}. Call search_templates with that goal and a short query (for example goal "launch-product", query "developer tool"). Set aspect only when the destination implies it: 9:16 for Reels, TikTok, and Shorts; 16:9 for YouTube and websites; 1:1 or 4:5 for feeds. Do not ask the user to choose a rendering engine.
4. Pick the best 3-4 results, preferring templates whose structure fits the angle (a problem-and-fix hook, a quickstart, a comparison). Skip results with fixedSampleContent (numbers drawn in the design that cannot be edited) unless the project has matching numbers or the user accepts them. Call render_previews once with their ids, the searchId, and one brand object built from steps 1-2 (name, headline, subhead, up to 3 points, cta, theme colors, and logo when you uploaded one). It returns a poster and an editor link for each template with the user's own product. Hosts that support MCP Apps also show a live player of every option, with open and pick buttons. In your reply, list the options as a numbered list with each title linked to its editor link first, because the editor link plays the full video on every device, phones included. Then show each poster as an inline image (Markdown ![title](poster)) where the host renders images, and let the user pick one. If a poster is null, show that template's stock poster from search_templates instead.
5. Call get_template_spec with the searchId. Start from the picked template's tailored props from render_previews, or from the spec's props, and change only texts, theme, and media (and hidden/audio for music templates). Rewrite every role in shortened, so no text is cut mid-phrase. Write each field for its role in this template (the hook, the proof, the benefit, the CTA), not by copying the brand fields. Keep each text within maxLength and each color as #RRGGBB, with good contrast.
6. Call render_preview with the filled props, the searchId, and loop: true. It returns a poster and an animated loop of the template with the user's own product, plus the editor link. Give the editor link first, then the loop (or the poster when video is null), then a short list of the text you used. Say in one line what changed since the user picked, even when it is a small change. If it returns an error, fix the field it names and call it again. The link opens a live, editable preview; the user exports the MP4 there.
7. Treat follow-ups ("punchier", "use our green") as prop edits: call render_preview again with loop: true and show the new preview and link. build_edit_link returns only the link, without rendering. When the user posts the video, offer a caption that leads with the same hook.
For layout, motion, or timing changes, or a local MP4 render in a code project, point the user to the spec's source.package and source.renderCommand.`;

function createServer(origin: string, ctx: McpContext) {
  const server = new McpServer({name: 'cliphouse', title: 'cliphou.se release videos', version: MCP_VERSION}, {instructions: INSTRUCTIONS});
  const readOnly = {readOnlyHint: true, openWorldHint: false};
  // Live previews: MCP Apps hosts play the templates in an iframe. Other hosts ignore the metadata.
  const appMeta = ctx.previewApp ? previewToolMeta : undefined;
  if (ctx.previewApp) {
    const html = ctx.previewApp;
    server.registerResource('cliphouse-previews', PREVIEW_APP_URI, {
      title: 'cliphou.se live previews', description: 'Plays each tailored template live, with open and pick buttons.',
      mimeType: APP_MIME, _meta: previewAppMeta(origin),
    }, async () => ({contents: [{uri: PREVIEW_APP_URI, mimeType: APP_MIME, text: html, _meta: previewAppMeta(origin)}]}));
  }
  const who = {client: ctx.client, caller: ctx.caller};
  const event = (entry: Omit<EventLog, 'client' | 'caller'>) => record(ctx.logEvent && (() => ctx.logEvent!({...entry, ...who})));
  // Renders and links may reference only logos uploaded through upload_logo.
  const unknownLogo = async (props: unknown) => {
    const logo = logoOf(props);
    if (!logo) return null;
    if (!ctx.logoExists) return 'Logos are not available here.';
    return (await ctx.logoExists(logo.id)) ? null : 'Unknown logo id. Call upload_logo first and use the logo it returns.';
  };
  server.registerTool('upload_logo', {
    title: 'Upload brand logo',
    description: `Upload the product's logo once, then pass the returned logo object as brand.logo to render_previews, or as props.logo in templates that support a logo (their spec lists editableFields.logo). Templates with a logo show it wherever they show the brand name; the brand text stays as its alt text. Send an SVG as text in svg, or a PNG, JPEG, WebP, or SVG file as base64 in data. Up to 1 MB. Prefer the project's SVG logo (for example public/logo.svg) or a PNG with a transparent background. mono: true draws the logo in the template's text color, which keeps it readable on any theme; it needs a transparent background.`,
    inputSchema: {
      svg: z.string().max(1_000_000).optional().describe('The logo as SVG text.'),
      data: z.string().max(1_400_000).optional().describe('The logo file as base64, or as a data: URL.'),
    },
    annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false},
  }, async ({svg, data}) => {
    if (!ctx.uploadLogo) return failure('Logo uploads are not available here.');
    try {
      const logo = await ctx.uploadLogo({svg, data});
      return text({logo: {id: logo.id, ratio: logo.ratio, mono: logo.transparent}, url: `${origin}${logoPath(logo.id)}`, transparent: logo.transparent,
        note: logo.transparent ? 'mono is true, so the logo takes each template\'s text color. Set mono to false to keep its own colors.'
          : 'The logo has an opaque background, so it keeps its own colors (mono: false). A transparent PNG or an SVG blends in better.'});
    } catch (e) {
      return failure(e instanceof HttpError ? e.message : 'The logo could not be uploaded.');
    }
  });
  server.registerTool('search_templates', {
    title: 'Search video templates',
    description: 'Find marketing video templates for a product, project, or announcement. Prefer a marketing goal, then add a short product or style query. Returns a searchId and results with id, title, goals, aspect, length, preview MP4, poster image, and editor URL. Engine details appear only when the engine filter is used.',
    inputSchema: {
      query: z.string().max(200).optional().describe('Short product or style description, for example "developer tool" or "minimal logo".'),
      goal: z.enum(GOAL_IDS).optional().describe(`Marketing goal. One of: ${MARKETING_GOALS.map((goal) => `${goal.id} (${goal.label})`).join(', ')}.`),
      aspect: z.enum(ASPECTS).optional().describe('Only when the destination implies it: 9:16 vertical (Reels, TikTok, Shorts), 16:9 (YouTube, web), 1:1 or 4:5 (feeds).'),
      maxSeconds: z.number().int().min(1).max(600).optional().describe('Maximum video length in seconds.'),
      music: z.boolean().optional().describe('true for beat-synced templates with a generated soundtrack, false for silent ones.'),
      purpose: z.string().max(60).optional().describe('Exact catalog purpose, for example "Product launch".'),
      engine: z.enum(['remotion', 'hyperframes']).optional().describe('Advanced source-package filter. Omit unless the user explicitly asks for an engine.'),
      limit: z.number().int().min(1).max(20).optional().describe('Maximum results, default 6.'),
    },
    annotations: readOnly,
  }, async (args) => {
    const ranked = rankTemplates(args);
    const results = ranked.map(card(origin, Boolean(args.engine)));
    const searchId = randomBytes(12).toString('base64url');
    const {query, limit: _, ...filters} = args;
    await record(ctx.logSearch && (() => ctx.logSearch!({
      searchId, query: (query ?? '').trim().slice(0, 200), filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)),
      resultIds: results.slice(0, 10).map((r) => r.id), resultCount: results.length, empty: results.length === 0,
      topScore: ranked[0]?.score ?? 0, engines: ranked.slice(0, 10).map((r) => engineOf(r.v.template)), ...who,
    })));
    return text({searchId, contractVersion: AGENT_CONTRACT_VERSION, goal: args.goal ?? inferGoal(query) ?? null, results});
  });
  server.registerTool('get_template_spec', {
    title: 'Get template spec',
    description: 'Get the editable fields of one template: current props, text roles with maxLength, theme colors, scenes, format, JSON Schema, and the source package for local rendering. Call before build_edit_link and start from the returned props.',
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/).describe('Template id from search_templates.'), searchId: searchIdField},
    annotations: readOnly,
  }, async ({variantId, searchId}) => {
    const spec = templateSpec(origin, variantId);
    if (!spec) return failure(`Unknown template "${variantId}". Use search_templates to find ids.`);
    await event({searchId: searchId ?? null, type: 'spec', variantId, engine: spec.engine});
    return text(spec);
  });
  server.registerTool('build_edit_link', {
    title: 'Build editor link',
    description: 'Validate filled-in props for a template and return a cliphou.se link that opens a live, editable preview of the customized video. The user can export the MP4 there. Invalid props return an error that names the field to fix.',
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/).describe('Template id.'),
      props: z.record(z.string(), z.unknown()).describe('The full props object from get_template_spec with edited texts, theme, and media.'),
      templateVersion: z.number().int().positive().optional().describe('Only for older template versions. Usually omit.'), searchId: searchIdField},
    annotations: readOnly,
  }, async ({variantId, props, templateVersion, searchId}) => {
    const badLogo = await unknownLogo(props);
    if (badLogo) return failure(badLogo);
    let url;
    try { url = editLink(origin, variantId, props, templateVersion); }
    catch (e) {
      const message = e instanceof HttpError ? e.message : 'The props could not be validated.';
      await event({searchId: searchId ?? null, type: 'link', variantId, error: message.slice(0, 200)});
      return failure(message);
    }
    await event({searchId: searchId ?? null, type: 'link', variantId});
    return text({url});
  });
  server.registerTool('render_preview', {
    title: 'Render personalized preview',
    description: `Render a poster image of a template filled with the user's props, in a few seconds, and return it with the editor link. Call after get_template_spec once the props are filled, and show the image to the user. Invalid props return an error that names the field to fix. If rendering is unavailable, poster is null and the editor link still works.
With loop: true it also waits for a ${LOOP_SECONDS}-second animated WebP loop of these props and returns it as video. A loop still rendering has video: null and videoPending: true; call again with the same props to get it. loop: "start" returns the poster now and starts the loop in the background. Show the loop as an image (Markdown ![title](video)) where the host renders images.`,
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/).describe('Template id.'),
      props: z.record(z.string(), z.unknown()).describe('The full props object from get_template_spec with edited texts, theme, and media.'),
      templateVersion: z.number().int().positive().optional().describe('Only for older template versions. Usually omit.'),
      loop: z.union([z.literal('start'), z.boolean()]).optional().describe(`true waits for a ${LOOP_SECONDS}-second animated loop of these props and returns it as video. "start" only starts it.`),
      searchId: searchIdField},
    annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    ...(appMeta ? {_meta: appMeta} : {}),
  }, async ({variantId, props, templateVersion, loop, searchId}) => {
    const badLogo = await unknownLogo(props);
    if (badLogo) return failure(badLogo);
    let editor;
    try { editor = editLink(origin, variantId, props, templateVersion); }
    catch (e) {
      const message = e instanceof HttpError ? e.message : 'The props could not be validated.';
      await event({searchId: searchId ?? null, type: 'preview', variantId, error: message.slice(0, 200)});
      return failure(message);
    }
    const engine = engineOf(visible.find((v) => v.id === variantId)!.template);
    const loopDeadline = Date.now() + LOOP_BUDGET_MS;
    const result: PreviewResult = ctx.preview
      ? await ctx.preview({variantId, props, templateVersion, caller: ctx.caller, keyed: Boolean(ctx.keyed), editor})
      : {poster: null, video: null, editor, previewId: '', cached: false, ms: 0, message: 'Previews are not available here. Open the editor link to see the video.'};
    await event({searchId: searchId ?? null, type: 'preview', variantId, engine, ms: result.ms, cached: result.cached, poster: Boolean(result.poster),
      ...(result.poster ? {} : {error: (result.message ?? 'no poster').slice(0, 200)})});
    // Loops render only after the poster, the same as in render_previews. Older template versions have no loop.
    const clip: LoopResult | null = loop && templateVersion === undefined
      ? (ctx.loop
        ? await ctx.loop({variantId, props, caller: ctx.caller, keyed: Boolean(ctx.keyed), timeoutMs: loop === 'start' ? 0 : Math.max(1_000, loopDeadline - Date.now())})
        : {video: null, previewId: '', cached: false, ms: 0, message: 'Loops are not available here.'})
      : null;
    if (clip && !clip.pending) await event({searchId: searchId ?? null, type: 'loop', variantId, engine, ms: clip.ms, cached: clip.cached,
      poster: Boolean(clip.video), ...(clip.video ? {} : {error: (clip.message ?? 'no loop').slice(0, 200)})});
    const {image, ...data} = result;
    const body = {poster: data.poster, video: clip?.video ?? data.video, editor: data.editor,
      ...(clip?.pending ? {videoPending: true} : clip && !clip.video ? {videoMessage: clip.message} : {}),
      ...(data.message ? {message: data.message} : {})};
    const v = visible.find((x) => x.id === variantId)!;
    return {content: [{type: 'text' as const, text: JSON.stringify(body, null, 2)},
      ...(image ? [{type: 'image' as const, data: image.toString('base64'), mimeType: 'image/jpeg'}] : [])],
      // The live preview view plays these props. Old template versions have no live player.
      ...(templateVersion === undefined ? {structuredContent: {previews: [{id: variantId, title: v.title, aspect: aspect(v.template), editor: data.editor, poster: data.poster, props}]}} : {})};
  });
  const hex = z.string().regex(/^#[a-fA-F0-9]{6}$/);
  server.registerTool('render_previews', {
    title: 'Render tailored previews',
    description: `Render posters of up to ${MAX_BATCH} templates at once, each filled with one brand description, so the user picks from options that already show their product. The server maps the brand onto each template's text fields and shortens text to fit. Returns, per template: id, title, poster URL (null if it was not ready in time), editor link, the tailored props to start from after the pick, and keptSample: text fields that still hold the template's sample text (fill them with real facts after the pick). Inline images follow the text, in the same order as the results.
shortened lists brand texts that were cut to fit a field ({role, from, to, max}); rewrite them for that field after the pick.
Animated loops (${LOOP_SECONDS}-second animated WebP of each tailored template) take two calls. First call with loop: "start": it returns the posters as fast as without loops and starts the loops in the background. Show the posters. Then call again with the same arguments and loop: true: it waits for the loops and returns video (the loop URL) per template. A loop still rendering has video: null and videoPending: true; call once more to get it. Show each loop as an image (Markdown ![title](video)) where the host renders images, so the options animate.`,
    inputSchema: {
      variantIds: z.array(z.string().regex(/^[a-z0-9-]{1,100}$/)).min(1).max(MAX_BATCH).describe('Template ids from search_templates.'),
      brand: z.object({
        name: z.string().min(1).max(60).describe('Product or company name.'),
        headline: z.string().max(120).optional().describe('The hook: a pain, question, number, or benefit, as short as possible.'),
        subhead: z.string().max(200).optional().describe('One sentence: who it is for and what it solves.'),
        points: z.array(z.string().max(80)).max(6).optional().describe('2-3 benefits backed by real features or facts, short phrases.'),
        cta: z.string().max(60).optional().describe('Call to action, for example "Start free".'),
        date: z.string().max(40).optional().describe('Launch or availability date, only if the project states one.'),
        logo: z.object({id: z.string().regex(/^[a-f0-9]{64}$/), ratio: z.number().min(0.2).max(8), mono: z.boolean()}).optional()
          .describe('The logo object from upload_logo. Templates with a logo slot show it in place of the brand name.'),
        theme: z.object({background: hex.optional(), surface: hex.optional(), foreground: hex.optional(), accent: hex.optional(), accent2: hex.optional()})
          .optional().describe('Brand colors as #RRGGBB. Keep good contrast between foreground and background.'),
      }).describe('The product facts from the user\'s project. Never invent numbers.'),
      loop: z.union([z.literal('start'), z.boolean()]).optional().describe(`"start" returns the posters now and starts ${LOOP_SECONDS}-second animated loops in the background. true waits for the loops and returns them as video.`),
      searchId: searchIdField,
    },
    annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    ...(appMeta ? {_meta: appMeta} : {}),
  }, async ({variantIds, brand, loop, searchId}) => {
    let checked;
    try { checked = checkBrand(brand); }
    catch (e) { return failure(e instanceof HttpError ? e.message : 'The brand could not be validated.'); }
    if (checked.logo && ctx.logoExists && !(await ctx.logoExists(checked.logo.id))) return failure('Unknown logo id. Call upload_logo first and use the logo it returns.');
    const ids = [...new Set(variantIds)];
    const unknown = ids.find((id) => !visible.some((v) => v.id === id));
    if (unknown) return failure(`Unknown template: ${unknown}. Use ids from search_templates.`);
    const deadline = Date.now() + BATCH_BUDGET_MS;
    const loopDeadline = Date.now() + LOOP_BUDGET_MS;
    // "start" only queues the loops (wait 0). true waits for them; a poster is cached by then, so it costs nothing.
    const loopWait = () => (loop === 'start' ? 0 : Math.max(1_000, loopDeadline - Date.now()));
    const results = await Promise.all(ids.map(async (variantId) => {
      const v = visible.find((x) => x.id === variantId)!;
      const {props, kept, shortened} = tailorProps(variantId, checked);
      const editor = editLink(origin, variantId, props);
      const result = await (ctx.preview
        ? ctx.preview({variantId, props, caller: ctx.caller, keyed: Boolean(ctx.keyed), editor, timeoutMs: Math.max(1_000, deadline - Date.now())})
        : Promise.resolve<PreviewResult>({poster: null, video: null, editor, previewId: '', cached: false, ms: 0, message: 'Previews are not available here.'}));
      // The loop is requested only after this template's poster is done, so it never competes with it for CPU.
      // The render gate also holds it while other posters on this instance render.
      const clip: LoopResult | null = loop
        ? (ctx.loop
          ? await ctx.loop({variantId, props, caller: ctx.caller, keyed: Boolean(ctx.keyed), timeoutMs: loopWait()})
          : {video: null, previewId: '', cached: false, ms: 0, message: 'Loops are not available here.'})
        : null;
      await event({searchId: searchId ?? null, type: 'preview', variantId, engine: engineOf(v.template), ms: result.ms, cached: result.cached,
        poster: Boolean(result.poster), batch: true, ...(result.poster ? {} : {error: (result.message ?? 'no poster').slice(0, 200)})});
      // A pending loop is not an outcome yet; log it when it arrives or fails.
      if (clip && !clip.pending) await event({searchId: searchId ?? null, type: 'loop', variantId, engine: engineOf(v.template), ms: clip.ms, cached: clip.cached,
        poster: Boolean(clip.video), batch: true, ...(clip.video ? {} : {error: (clip.message ?? 'no loop').slice(0, 200)})});
      const fixed = fixedSampleData(v.template);
      return {id: variantId, title: v.title, aspect: aspect(v.template), poster: result.poster, editor, props, keptSample: kept, shortened,
        ...(fixed.length ? {fixedSampleContent: fixed} : {}),
        ...(clip ? {video: clip.video, ...(clip.pending ? {videoPending: true} : clip.video ? {} : {videoMessage: clip.message})} : {}),
        ...(result.poster ? {} : {stockPoster: `${origin}/previews/${variantId}.jpg`, message: result.message}), image: result.image};
    }));
    const body = {results: results.map(({image, ...r}) => r)};
    return {content: [{type: 'text' as const, text: JSON.stringify(body, null, 2)},
      ...results.flatMap((r) => (r.image ? [{type: 'image' as const, data: r.image.toString('base64'), mimeType: 'image/jpeg'}] : []))],
      structuredContent: {previews: results.map((r) => ({id: r.id, title: r.title, aspect: r.aspect, editor: r.editor, poster: r.poster ?? r.stockPoster ?? null, props: r.props}))}};
  });
  return server;
}

// Stateless Streamable HTTP: a fresh server and transport per request, JSON responses, no sessions or SSE.
export async function handleMcp(origin: string, req: IncomingMessage, res: ServerResponse, body: unknown, ctx: McpContext) {
  const server = createServer(origin, ctx);
  const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
  res.on('close', () => { void transport.close(); void server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
