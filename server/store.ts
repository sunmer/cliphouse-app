import {createHash, randomBytes} from 'node:crypto';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {HttpError, type Exported, type Published, type Snapshot} from './model.ts';

// storage-lifecycle.json deletes exports/ objects after 7 days. Stop reusing an export a day earlier
// so a reused record never points at a deleted file.
export const EXPORT_REUSE_MS = 6 * 24 * 60 * 60 * 1000;
// Signed download links are short so a leaked link stops working quickly.
export const EXPORT_URL_MS = 10 * 60 * 1000;
export const MAX_API_KEYS = 2;
export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
export type ApiKeyInfo = {id: string; createdAt: number; last4: string};
// Search telemetry for the weekly demand report (scripts/search-report.mjs). Server-only collections.
export type SearchLog = {
  searchId: string; query: string; filters: Record<string, unknown>; resultIds: string[]; resultCount: number; empty: boolean; topScore: number;
  engines: string[]; client: string; caller: string;
};
export type EventLog = {searchId: string | null; type: 'spec' | 'link' | 'preview' | 'loop'; variantId: string; client: string; caller: string;
  engine?: string; ms?: number; cached?: boolean; poster?: boolean; batch?: boolean; error?: string};

export function createStore(bucketName: string) {
  const db = getFirestore();
  const bucket = getStorage().bucket(bucketName);
  const quota = async (tx: FirebaseFirestore.Transaction, kind: 'share' | 'export', owner: string) => {
    const day = new Date().toISOString().slice(0, 10);
    const userRef = db.doc(`users/${owner}/${kind}Quota/${day}`);
    const globalRef = db.doc(`${kind}Quota/${day}`);
    const [user, global] = await Promise.all([tx.get(userRef), tx.get(globalRef)]);
    const limits = kind === 'share'
      ? {user: Number(process.env.SHARES_PER_USER_DAY || 10), global: Number(process.env.SHARES_PER_DAY || 100), label: 'publishing'}
      : {user: Number(process.env.EXPORTS_PER_USER_DAY || 10), global: Number(process.env.EXPORTS_PER_DAY || 200), label: 'MP4 export'};
    const userCount = user.data()?.count || 0;
    const globalCount = global.data()?.count || 0;
    if (userCount >= limits.user) throw new HttpError(429, `Your daily ${limits.label} limit has been reached. Try again tomorrow.`);
    if (globalCount >= limits.global) throw new HttpError(429, `${limits.label === 'publishing' ? 'Publishing' : 'MP4 export'} has reached its daily capacity. Please try again tomorrow.`);
    return () => { tx.set(userRef, {count: userCount + 1}); tx.set(globalRef, {count: globalCount + 1}); };
  };
  return {
    async logSearch(entry: SearchLog) {
      await db.collection('searches').add({...entry, at: FieldValue.serverTimestamp()});
    },
    async logEvent(entry: EventLog) {
      const clean = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined));
      await db.collection('events').add({...clean, at: FieldValue.serverTimestamp()});
    },
    // Personalized previews: one immutable poster (.jpg) and loop (.webp) per (variant, props, version) hash under previews/.
    async previewExists(hash: string, ext: 'jpg' | 'webp' = 'jpg') {
      const [exists] = await bucket.file(`previews/${hash}.${ext}`).exists();
      return exists;
    },
    async savePreview(hash: string, image: string, ext: 'jpg' | 'webp' = 'jpg') {
      await bucket.upload(image, {destination: `previews/${hash}.${ext}`, metadata: {contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg'}});
    },
    async previewAsset(hash: string, ext: 'jpg' | 'webp' = 'jpg') {
      const file = bucket.file(`previews/${hash}.${ext}`);
      const [metadata] = await file.getMetadata();
      return {size: Number(metadata.size), stream: (range?: {start: number; end: number}) => file.createReadStream(range)};
    },
    // Logos: one immutable PNG per content hash under logos/. A logo is kept while any edit may use it.
    async saveLogo(id: string, png: Buffer, owner: string) {
      const file = bucket.file(`logos/${id}.png`);
      const [exists] = await file.exists();
      if (!exists) await file.save(png, {resumable: false, metadata: {contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable', metadata: {owner}}});
    },
    async logoExists(id: string) {
      const [exists] = await bucket.file(`logos/${id}.png`).exists();
      return exists;
    },
    async readLogo(id: string) {
      const [bytes] = await bucket.file(`logos/${id}.png`).download();
      return bytes;
    },
    async logoAsset(id: string) {
      const file = bucket.file(`logos/${id}.png`);
      const [metadata] = await file.getMetadata();
      return {size: Number(metadata.size), stream: (range?: {start: number; end: number}) => file.createReadStream(range)};
    },
    // Daily upload quota per caller and in total. Counts uploads, including repeats of the same file.
    async reserveLogo(caller: string, keyed: boolean) {
      const day = new Date().toISOString().slice(0, 10);
      const globalRef = db.doc(`logoQuota/${day}`);
      const callerRef = db.doc(`logoQuota/${day}/callers/${createHash('sha256').update(caller).digest('hex').slice(0, 32)}`);
      const limits = {global: Number(process.env.LOGOS_PER_DAY || 2_000),
        caller: Number(keyed ? process.env.LOGOS_PER_KEY_DAY || 100 : process.env.LOGOS_PER_CALLER_DAY || 20)};
      await db.runTransaction(async (tx) => {
        const [global, mine] = await Promise.all([tx.get(globalRef), tx.get(callerRef)]);
        const globalCount = global.data()?.count || 0;
        const callerCount = mine.data()?.count || 0;
        if (callerCount >= limits.caller) throw new HttpError(429, 'Your daily logo upload limit has been reached.');
        if (globalCount >= limits.global) throw new HttpError(429, 'Logo uploads have reached their daily capacity.');
        tx.set(globalRef, {count: globalCount + 1});
        tx.set(callerRef, {count: callerCount + 1, caller});
      });
    },
    // Daily preview quota, separate from share and export quotas. Counts renders, not cache hits.
    async reservePreview(caller: string, keyed: boolean) {
      const day = new Date().toISOString().slice(0, 10);
      const globalRef = db.doc(`previewQuota/${day}`);
      const callerRef = db.doc(`previewQuota/${day}/callers/${createHash('sha256').update(caller).digest('hex').slice(0, 32)}`);
      const limits = {global: Number(process.env.PREVIEWS_PER_DAY || 4_000),
        caller: Number(keyed ? process.env.PREVIEWS_PER_KEY_DAY || 300 : process.env.PREVIEWS_PER_IP_DAY || 60)};
      await db.runTransaction(async (tx) => {
        const [global, mine] = await Promise.all([tx.get(globalRef), tx.get(callerRef)]);
        const globalCount = global.data()?.count || 0;
        const callerCount = mine.data()?.count || 0;
        if (callerCount >= limits.caller) throw new HttpError(429, 'Your daily preview limit has been reached.');
        if (globalCount >= limits.global) throw new HttpError(429, 'Previews have reached their daily capacity.');
        tx.set(globalRef, {count: globalCount + 1});
        tx.set(callerRef, {count: callerCount + 1, caller});
      });
    },
    // Keys are shown once. Only their SHA-256 is stored, so a database leak does not expose usable keys.
    async createApiKey(owner: string) {
      const key = `chk_${randomBytes(24).toString('base64url')}`;
      const id = randomBytes(12).toString('base64url');
      const hash = hashKey(key);
      const info: ApiKeyInfo = {id, createdAt: Date.now(), last4: key.slice(-4)};
      await db.runTransaction(async (tx) => {
        const active = await tx.get(db.collection(`users/${owner}/apiKeys`));
        if (active.size >= MAX_API_KEYS) throw new HttpError(409, `You can have ${MAX_API_KEYS} API keys. Revoke one first.`);
        tx.set(db.doc(`apiKeys/${hash}`), {id, owner, createdAt: info.createdAt, revoked: false});
        tx.set(db.doc(`users/${owner}/apiKeys/${id}`), {createdAt: info.createdAt, last4: info.last4, hash});
      });
      return {key, ...info};
    },
    async listApiKeys(owner: string): Promise<ApiKeyInfo[]> {
      const snapshot = await db.collection(`users/${owner}/apiKeys`).orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((d) => ({id: d.id, createdAt: d.data().createdAt, last4: d.data().last4}));
    },
    // Returns the revoked key's hash so the caller can drop it from its lookup cache.
    async revokeApiKey(owner: string, id: string) {
      const ref = db.doc(`users/${owner}/apiKeys/${id}`);
      return db.runTransaction(async (tx) => {
        const item = (await tx.get(ref)).data();
        if (!item) throw new HttpError(404, 'This API key does not exist.');
        tx.update(db.doc(`apiKeys/${item.hash}`), {revoked: true});
        tx.delete(ref);
        return item.hash as string;
      });
    },
    async findApiKey(hash: string) {
      const data = (await db.doc(`apiKeys/${hash}`).get()).data();
      return data && !data.revoked ? {owner: data.owner as string} : null;
    },
    async reserve(owner: string, key: string, value: Snapshot) {
      const ref = db.doc(`shareJobs/${key}`);
      return db.runTransaction(async (tx) => {
        const job = (await tx.get(ref)).data();
        if (job?.status === 'ready') {
          const existing = (await tx.get(db.doc(`shares/${job.id}`))).data();
          if (existing?.status === 'ready') return {ready: existing as Published};
        }
        if (job?.status === 'rendering' && job.leaseUntil > Date.now()) throw new HttpError(409, 'This video is still rendering. Try again shortly.');
        const count = await quota(tx, 'share', owner);
        const id = randomBytes(24).toString('base64url');
        const {meta: _, composition: __, ...snapshot} = value;
        const video: Published = {...snapshot, id, owner, status: 'rendering', createdAt: Date.now()};
        count();
        if (job?.status === 'rendering') tx.delete(db.doc(`shares/${job.id}`));
        tx.set(ref, {id, status: 'rendering', leaseUntil: Date.now() + 600_000});
        tx.set(db.doc(`shares/${id}`), video);
        return {video};
      });
    },
    async finish(key: string, video: Published, paths: {image: string}) {
      const prefix = `shares/${video.id}`;
      try {
        await bucket.upload(paths.image, {destination: `${prefix}/preview.jpg`, metadata: {contentType: 'image/jpeg'}});
        const batch = db.batch();
        batch.update(db.doc(`shares/${video.id}`), {status: 'ready'});
        batch.set(db.doc(`users/${video.owner}/shares/${video.id}`), {id: video.id, title: video.title, createdAt: video.createdAt});
        batch.set(db.doc(`shareJobs/${key}`), {id: video.id, status: 'ready'});
        await batch.commit();
        return {...video, status: 'ready'};
      } catch (e) {
        await bucket.deleteFiles({prefix: `${prefix}/`}).catch(() => {});
        throw e;
      }
    },
    async fail(key: string, id: string) {
      const batch = db.batch();
      batch.set(db.doc(`shareJobs/${key}`), {id, status: 'failed'});
      batch.delete(db.doc(`shares/${id}`));
      await batch.commit();
    },
    async get(id: string): Promise<Published> {
      const data = (await db.doc(`shares/${id}`).get()).data();
      if (!data || data.status !== 'ready') throw new HttpError(404, 'This shared video is unavailable.');
      return data as Published;
    },
    async remove(id: string, uid: string) {
      const video = await this.get(id);
      if (video.owner !== uid) throw new HttpError(403, 'This video belongs to another account.');
      const batch = db.batch();
      batch.delete(db.doc(`shares/${id}`));
      batch.delete(db.doc(`users/${uid}/shares/${id}`));
      await batch.commit();
      await bucket.deleteFiles({prefix: `shares/${id}/`});
    },
    async asset(id: string, name: string) {
      const file = bucket.file(`shares/${id}/${name}`);
      const [metadata] = await file.getMetadata();
      return {size: Number(metadata.size), stream: (range?: {start: number; end: number}) => file.createReadStream(range)};
    },
    async reserveExport(owner: string, key: string, value: Snapshot) {
      const ref = db.doc(`exportJobs/${key}`);
      return db.runTransaction(async (tx) => {
        const job = (await tx.get(ref)).data();
        if (job?.status === 'ready') {
          const existing = (await tx.get(db.doc(`exports/${job.id}`))).data();
          if (existing?.status === 'ready' && Date.now() - existing.createdAt < EXPORT_REUSE_MS) return {ready: existing as Exported};
        }
        if (job?.status === 'rendering' && job.leaseUntil > Date.now()) throw new HttpError(409, 'This MP4 is still rendering. Try again shortly.');
        const count = await quota(tx, 'export', owner);
        const id = randomBytes(24).toString('base64url');
        const video: Exported = {id, owner, variantId: value.variantId, template: value.template, title: value.title, status: 'rendering', createdAt: Date.now()};
        count();
        if (job?.status === 'rendering') tx.delete(db.doc(`exports/${job.id}`));
        tx.set(ref, {id, status: 'rendering', leaseUntil: Date.now() + 600_000});
        tx.set(db.doc(`exports/${id}`), video);
        return {video};
      });
    },
    async finishExport(key: string, video: Exported, paths: {video: string}) {
      const object = `exports/${video.id}/video.mp4`;
      try {
        await bucket.upload(paths.video, {destination: object, metadata: {contentType: 'video/mp4'}});
        const batch = db.batch();
        batch.update(db.doc(`exports/${video.id}`), {status: 'ready'});
        batch.set(db.doc(`exportJobs/${key}`), {id: video.id, status: 'ready'});
        await batch.commit();
        return {...video, status: 'ready'};
      } catch (e) {
        await bucket.file(object).delete({ignoreNotFound: true}).catch(() => {});
        throw e;
      }
    },
    async failExport(key: string, id: string) {
      const batch = db.batch();
      batch.set(db.doc(`exportJobs/${key}`), {id, status: 'failed'});
      batch.delete(db.doc(`exports/${id}`));
      await batch.commit();
    },
    async getExport(id: string): Promise<Exported> {
      const data = (await db.doc(`exports/${id}`).get()).data();
      if (!data || data.status !== 'ready') throw new HttpError(404, 'This MP4 is unavailable.');
      return data as Exported;
    },
    async exportUrl(id: string, filename: string) {
      const [url] = await bucket.file(`exports/${id}/video.mp4`).getSignedUrl({
        version: 'v4', action: 'read', expires: Date.now() + EXPORT_URL_MS,
        responseDisposition: `attachment; filename="${filename}"`, responseType: 'video/mp4',
      });
      return url;
    },
  };
}
