import {timingSafeEqual} from 'node:crypto';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {pipeline} from 'node:stream/promises';
import {TIERS, clientIp, createLimiter} from './limits.ts';
import {handleMcp} from './mcp.ts';
import {REGISTRY_AUTH, discovery} from './discovery.ts';
import {hashKey} from './store.ts';
import {HttpError, byteRange, exportFilename, fingerprint, publicExport, publicVideo, shareHtml, shareSpec, validId, validateShare} from './model.ts';
import type {Exported, Published} from './model.ts';
import type {createStore} from './store.ts';
import type {renderThumbnail, renderVideo} from './render.ts';
import type {createPreviewService} from './preview.ts';

type Dependencies = {
  origin: string; origins: Set<string>; version: string;
  assets: {file: string; css?: string[]};
  store: ReturnType<typeof createStore>;
  render: typeof renderThumbnail;
  renderVideo: typeof renderVideo;
  verify: (token: string) => Promise<{uid: string; email_verified?: boolean; firebase?: {sign_in_provider: string}}>;
  // When set, public reads must carry the X-Cliphouse-Edge header that Cloudflare adds.
  edgeSecret?: string;
  limiter?: ReturnType<typeof createLimiter>;
  mcpTimeoutMs?: number;
  // Personalized posters for render_preview. Optional so the handler runs without a renderer.
  preview?: ReturnType<typeof createPreviewService>;
  previewTimeoutMs?: number;
};
async function readBody(req: IncomingMessage, label = 'Video request') {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new HttpError(415, 'Use JSON.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new HttpError(413, `${label} is too large.`);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}
const fromEdge = (secret: string, header: string | string[] | undefined) => {
  const value = Buffer.from(Array.isArray(header) ? header[0] : header ?? '');
  const expected = Buffer.from(secret);
  return value.length === expected.length && timingSafeEqual(value, expected);
};
export function createHandler(deps: Dependencies) {
  let rendering = false;
  const limiter = deps.limiter ?? createLimiter();
  // API key lookups cached per instance for 5 minutes. Revoking a key clears it on the instance that served the revoke.
  const KEY_TTL_MS = 300_000;
  const keys = new Map<string, {at: number; owner: string | null}>();
  const apiKeyOwner = async (key: string) => {
    const hash = hashKey(key);
    const hit = keys.get(hash);
    if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit.owner;
    if (keys.size >= 10_000) keys.delete(keys.keys().next().value!);
    const owner = (await deps.store.findApiKey(hash))?.owner ?? null;
    keys.set(hash, {at: Date.now(), owner});
    return owner;
  };
  // Short-lived per-instance cache of public share lookups, including misses.
  // Repeated views and repeated random-ID probes then skip Firestore.
  const LOOKUP_TTL_MS = 60_000;
  const LOOKUP_MAX = 5_000;
  const lookups = new Map<string, {at: number; video?: Published; error?: HttpError}>();
  const lookup = async (id: string) => {
    const hit = lookups.get(id);
    if (hit && Date.now() - hit.at < LOOKUP_TTL_MS) {
      if (hit.error) throw hit.error;
      return hit.video!;
    }
    lookups.delete(id);
    if (lookups.size >= LOOKUP_MAX) lookups.delete(lookups.keys().next().value!);
    try {
      const video = await deps.store.get(id);
      lookups.set(id, {at: Date.now(), video});
      return video;
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) lookups.set(id, {at: Date.now(), error: e});
      throw e;
    }
  };
  const exclusive = async <T>(work: () => Promise<T>) => {
    if (rendering) throw new HttpError(429, 'The renderer is busy. Please try again shortly.');
    rendering = true;
    try { return await work(); } finally { rendering = false; }
  };
  const send = async (req: IncomingMessage, res: ServerResponse, file: {size: number; stream: (range?: {start: number; end: number}) => NodeJS.ReadableStream}, type: string) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', type);
    let range;
    try { range = byteRange(req.headers.range, file.size); }
    catch (e) { res.setHeader('Content-Range', `bytes */${file.size}`); throw e; }
    if (range) {
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
    }
    res.setHeader('Content-Length', range ? range.end - range.start + 1 : file.size);
    if (req.method === 'HEAD') { res.end(); return; }
    await pipeline(file.stream(range || undefined), res);
  };
  const user = async (req: IncomingMessage) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
    if (!match) throw new HttpError(401, 'Sign in to continue.');
    let identity;
    try { identity = await deps.verify(match[1]); }
    catch { throw new HttpError(401, 'Your session has expired. Sign in again.'); }
    if (!identity.email_verified || identity.firebase?.sign_in_provider !== 'google.com') throw new HttpError(403, 'Use a verified Google account to publish.');
    return identity.uid;
  };
  return async (req: IncomingMessage, res: ServerResponse) => {
    // Set for public share routes so a 404 can be cached at the CDN.
    let publicRoute = false;
    const json = (status: number, data: unknown) => {
      res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify(data));
    };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    try {
      const origin = req.headers.origin;
      if (origin) {
        if (!deps.origins.has(origin)) throw new HttpError(403, 'This origin is not allowed.');
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.setHeader('Access-Control-Max-Age', '3600');
      }
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const pathname = new URL(req.url || '/', deps.origin).pathname;
      if ((pathname === '/health' || pathname === '/api/health') && req.method === 'GET') {
        // EDGE_CHECK=1 reports only whether the edge header arrived (never its value), to confirm that
        // Firebase Hosting forwards it before EDGE_SECRET is enabled. Remove EDGE_CHECK afterwards.
        json(200, {ok: true, ...(process.env.EDGE_CHECK === '1' ? {edgeHeader: Boolean(req.headers['x-cliphouse-edge'])} : {})}); return;
      }
      // Public, static MCP metadata. Served before the edge check so the registry and directories can always read it.
      if ((pathname === '/.well-known/mcp-registry-auth' || pathname === '/.well-known/mcp.json') && ['GET', 'HEAD'].includes(req.method || '')) {
        const body = pathname.endsWith('auth') ? `${REGISTRY_AUTH}\n` : `${JSON.stringify(discovery(deps.origin), null, 2)}\n`;
        res.setHeader('Content-Type', pathname.endsWith('auth') ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.end(req.method === 'HEAD' ? undefined : body); return;
      }
      const readOnly = ['GET', 'HEAD'].includes(req.method || '');
      const edgeOnly = pathname === '/mcp' || (readOnly && (/^\/(s|p)\//.test(pathname) || /^\/api\/shares\/[^/]+$/.test(pathname)));
      if (deps.edgeSecret && edgeOnly && !fromEdge(deps.edgeSecret, req.headers['x-cliphouse-edge'])) {
        throw new HttpError(403, `Use ${deps.origin}.`);
      }
      if (pathname === '/mcp') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new HttpError(405, 'The MCP endpoint accepts POST only.'); }
        const bearer = /^Bearer (chk_[A-Za-z0-9_-]{20,64})$/.exec(req.headers.authorization || '')?.[1];
        if (req.headers.authorization && !bearer) throw new HttpError(401, 'Invalid API key.');
        const owner = bearer ? await apiKeyOwner(bearer) : null;
        if (bearer && !owner) throw new HttpError(401, 'Invalid or revoked API key.');
        const caller = owner ? `key:${owner}` : `ip:${clientIp(req.headers, req.socket.remoteAddress)}`;
        const limit = limiter(caller, owner ? TIERS.key : TIERS.anonymous);
        res.setHeader('RateLimit-Limit', String(limit.limit));
        res.setHeader('RateLimit-Remaining', String(limit.remaining));
        res.setHeader('RateLimit-Reset', String(limit.reset));
        if (!limit.ok) {
          res.setHeader('Retry-After', String(limit.retryAfter));
          json(429, {jsonrpc: '2.0', id: null, error: {code: -32029, message: `Rate limit exceeded. Retry after ${limit.retryAfter} seconds.${owner ? '' : ` Create a free API key at ${deps.origin} for higher limits.`}`}});
          return;
        }
        const body = await readBody(req, 'MCP request');
        const call = body as {method?: string; params?: {name?: string}} | null;
        const rendersPreview = call?.method === 'tools/call' && ['render_preview', 'render_previews'].includes(call.params?.name ?? '');
        // render_preview (25 s) and render_previews (20 s) have their own render budgets inside this limit.
        const timeout = rendersPreview ? deps.previewTimeoutMs ?? 30_000 : deps.mcpTimeoutMs ?? 10_000;
        // Stateless MCP has no session, so clientInfo is only seen on initialize. Use it there, else the User-Agent.
        const info = (body as {method?: string; params?: {clientInfo?: {name?: unknown; version?: unknown}}})?.params?.clientInfo;
        const client = String(info?.name ? `${info.name}/${info.version ?? ''}` : req.headers['user-agent'] || 'unknown').slice(0, 120);
        const ctx = {client, caller, keyed: Boolean(owner), preview: deps.preview,
          logSearch: deps.store.logSearch && ((entry: Parameters<typeof deps.store.logSearch>[0]) => deps.store.logSearch(entry)),
          logEvent: deps.store.logEvent && ((entry: Parameters<typeof deps.store.logEvent>[0]) => deps.store.logEvent(entry))};
        let timer: NodeJS.Timeout | undefined;
        await Promise.race([handleMcp(deps.origin, req, res, body, ctx), new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new HttpError(504, 'The MCP request timed out.')), timeout);
        })]).finally(() => clearTimeout(timer));
        return;
      }
      const poster = pathname.match(/^\/p\/([a-f0-9]{64})\.jpg$/);
      if (poster) {
        publicRoute = true;
        if (!['GET', 'HEAD'].includes(req.method || '')) throw new HttpError(405, 'Method not allowed.');
        let file;
        try { file = await deps.store.previewAsset(poster[1]); }
        catch { throw new HttpError(404, 'This preview is unavailable.'); }
        // Content-addressed, so the bytes never change. Objects expire after 30 days (storage-lifecycle.json).
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000');
        res.setHeader('Access-Control-Allow-Origin', '*');
        await send(req, res, file, 'image/jpeg');
        return;
      }
      if (pathname === '/api/keys' && req.method === 'POST') {
        const uid = await user(req);
        json(201, await deps.store.createApiKey(uid)); return;
      }
      if (pathname === '/api/keys' && req.method === 'GET') {
        const uid = await user(req);
        json(200, {keys: await deps.store.listApiKeys(uid)}); return;
      }
      const keyRoute = pathname.match(/^\/api\/keys\/([A-Za-z0-9_-]{8,32})$/);
      if (keyRoute && req.method === 'DELETE') {
        const uid = await user(req);
        keys.delete(await deps.store.revokeApiKey(uid, keyRoute[1]));
        json(200, {revoked: true}); return;
      }
      if (pathname === '/api/exports' && req.method === 'POST') {
        const uid = await user(req);
        const value = validateShare(await readBody(req));
        await exclusive(async () => {
          const key = fingerprint(uid, value, `${deps.version}-mp4`);
          let reservation;
          // The response carries a short-lived signed Cloud Storage link, so the file never streams through Cloud Run.
          const signed = async (video: Exported) => publicExport(video, await deps.store.exportUrl(video.id, exportFilename(video)));
          try {
            reservation = await deps.store.reserveExport(uid, key, value);
            if (reservation.ready) { json(200, await signed(reservation.ready)); return; }
            const paths = await deps.renderVideo(value);
            try {
              const ready = await deps.store.finishExport(key, reservation.video!, paths);
              json(201, await signed(ready));
            } finally { await paths.cleanup().catch(() => {}); }
          } catch (e) {
            if (reservation?.video) await deps.store.failExport(key, reservation.video.id).catch(() => {});
            throw e;
          }
        });
        return;
      }
      if (pathname === '/api/shares' && req.method === 'POST') {
        const uid = await user(req);
        const value = validateShare(await readBody(req));
        await exclusive(async () => {
          const key = fingerprint(uid, value, deps.version);
          let reservation;
          try {
            reservation = await deps.store.reserve(uid, key, value);
            if (reservation.ready) { json(200, publicVideo(reservation.ready, deps.origin)); return; }
            const paths = await deps.render(value);
            try {
              const ready = await deps.store.finish(key, reservation.video!, paths);
              lookups.delete(ready.id);
              json(201, publicVideo(ready, deps.origin));
            } finally { await paths.cleanup().catch(() => {}); }
          } catch (e) {
            if (reservation?.video) await deps.store.fail(key, reservation.video.id).catch(() => {});
            throw e;
          }
        });
        return;
      }
      const api = pathname.match(/^\/api\/shares\/([^/]+)$/);
      const page = pathname.match(/^\/s\/([^/]+)\/?$/);
      const spec = pathname.match(/^\/s\/([^/]+)\/agent\.json$/);
      const asset = pathname.match(/^\/s\/([^/]+)\/(preview\.jpg)$/);
      const id = api?.[1] || page?.[1] || spec?.[1] || asset?.[1];
      publicRoute = !!id && ['GET', 'HEAD'].includes(req.method || '');
      if (!id || !validId(id)) throw new HttpError(404, 'This shared video is unavailable.');
      if (api && req.method === 'DELETE') {
        await deps.store.remove(id, await user(req));
        lookups.delete(id);
        json(200, {deleted: true}); return;
      }
      if (!['GET', 'HEAD'].includes(req.method || '')) throw new HttpError(405, 'Method not allowed.');
      const video = await lookup(id);
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      if (api) { if (req.method === 'HEAD') { res.end(); return; } json(200, publicVideo(video, deps.origin)); return; }
      if (spec) {
        const body = `${JSON.stringify(shareSpec(video, deps.origin), null, 2)}\n`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(req.method === 'HEAD' ? undefined : body); return;
      }
      if (page) {
        const html = shareHtml(video, deps.origin, deps.assets);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(html));
        res.end(req.method === 'HEAD' ? undefined : html); return;
      }
      await send(req, res, await deps.store.asset(id, asset![2]), 'image/jpeg');
    } catch (e) {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      const expected = e instanceof HttpError;
      // Cache public misses briefly at the CDN so repeated probes skip Cloud Run.
      res.setHeader('Cache-Control', publicRoute && expected && e.status === 404 ? 'public, max-age=60, s-maxage=300' : 'no-store');
      res.removeHeader('Content-Length');
      if (!expected) console.error('Share request failed:', (e as {code?: string}).code || (e as Error).name);
      json(expected ? e.status : 503, {error: expected ? e.message : 'Could not prepare this video. Your edits are safe. Please try again.'});
    }
  };
}
