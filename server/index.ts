import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createHandler} from './app.ts';
import {createStore} from './store.ts';
import {renderThumbnail, renderVideo} from './render.ts';
import {createPreviewRenderer, createPreviewService} from './preview.ts';

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const bucket = process.env.SHARE_BUCKET;
const origin = process.env.PUBLIC_ORIGIN || 'https://cliphou.se';
if (!projectId || !bucket) throw new Error('GOOGLE_CLOUD_PROJECT and SHARE_BUCKET are required.');
if (process.env.K_SERVICE && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error('Emulators must not be used on Cloud Run.');
}
initializeApp({projectId, storageBucket: bucket});
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const assets = manifest['index.html'];
if (!assets) throw new Error('Build the frontend before starting the share server.');
const store = createStore(bucket);
const previewRenderer = createPreviewRenderer();
// Warm the preview browser before listening, so no request reaches a cold renderer. Bounded; a failure only logs.
await Promise.race([previewRenderer.warm(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 45_000))])
  .catch((e) => console.error('Preview warm-up failed:', (e as Error).message));
const handler = createHandler({
  origin, origins: new Set((process.env.ALLOWED_ORIGINS || `${origin},https://cliphouse-app.web.app,https://cliphouse-app.firebaseapp.com,https://www.cliphou.se`).split(',')),
  version: `${process.env.RENDER_VERSION || '1'}-thumbnail`, assets,
  store, render: renderThumbnail, renderVideo,
  // Keyed by the deploy, so a template change never serves an old poster.
  preview: createPreviewService({store, render: previewRenderer.render, origin, version: process.env.RENDER_VERSION || '1'}),
  verify: (token) => getAuth().verifyIdToken(token, true),
  edgeSecret: process.env.EDGE_SECRET || undefined,
});
const server = createServer(handler);
server.requestTimeout = 290_000;
server.headersTimeout = 15_000;
server.listen(Number(process.env.PORT || 8085), '0.0.0.0', () => console.log('Share server ready'));
process.on('SIGTERM', () => server.close());
