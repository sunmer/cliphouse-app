import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {z} from 'zod';
import manifest from '../src/catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../src/videos/meta.ts';
import {engineOf} from '../src/videos/engine.ts';
import {agentSpec} from '../src/agent/spec.ts';
import {handoffPath, specPath} from '../src/agent/versions.ts';
import {HttpError, validateShare} from './model.ts';

const visible = manifest.variants.filter((v) => !('hidden' in v && v.hidden));
const aspect = (template: string) => {
  const m = templateMeta[template];
  const r = m.width / m.height;
  return r > 1.2 ? '16:9' : r < 0.7 ? '9:16' : r < 0.9 ? '4:5' : '1:1';
};
const text = (value: unknown) => ({content: [{type: 'text' as const, text: JSON.stringify(value, null, 2)}]});
const failure = (message: string) => ({isError: true, content: [{type: 'text' as const, text: message}]});

export function searchTemplates(origin: string, {query, purpose, engine, limit = 10}: {query?: string; purpose?: string; engine?: string; limit?: number}) {
  const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return visible
    .filter((v) => !purpose || v.purpose.toLowerCase() === purpose.toLowerCase())
    .filter((v) => !engine || engineOf(v.template) === engine)
    .map((v) => {
      const haystack = [v.title, v.purpose, v.seoDescription, ...(v.style ?? []), ...(v.useCases ?? [])].join(' ').toLowerCase();
      return {v, score: words.filter((w) => haystack.includes(w)).length};
    })
    .filter(({score}) => !words.length || score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(limit, 1), 20))
    .map(({v}) => ({id: v.id, title: v.title, template: v.template, engine: engineOf(v.template), aspect: aspect(v.template),
      purpose: v.purpose, spec: `${origin}${specPath(v.id)}`, editor: `${origin}/#/v/${v.id}`}));
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

function createServer(origin: string) {
  const server = new McpServer({name: 'cliphouse', version: '1.0.0'});
  const readOnly = {readOnlyHint: true, openWorldHint: false};
  server.registerTool('search_templates', {
    description: 'Search the cliphou.se motion graphics template catalog. Returns template ids, spec URLs, and editor URLs.',
    inputSchema: {query: z.string().max(200).optional(), purpose: z.string().max(60).optional(),
      engine: z.enum(['remotion', 'hyperframes']).optional(), limit: z.number().int().min(1).max(20).optional()},
    annotations: readOnly,
  }, async (args) => text(searchTemplates(origin, args)));
  server.registerTool('get_template_spec', {
    description: 'Get the agent spec for one template: editable text roles and limits, theme colors, JSON Schema, and source package.',
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/)},
    annotations: readOnly,
  }, async ({variantId}) => {
    const spec = templateSpec(origin, variantId);
    return spec ? text(spec) : failure(`Unknown template "${variantId}". Use search_templates to find ids.`);
  });
  server.registerTool('build_edit_link', {
    description: 'Validate edited props for a template and return a cliphou.se link that opens the edit in the browser editor.',
    inputSchema: {variantId: z.string().regex(/^[a-z0-9-]{1,100}$/), props: z.record(z.string(), z.unknown()),
      templateVersion: z.number().int().positive().optional()},
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
