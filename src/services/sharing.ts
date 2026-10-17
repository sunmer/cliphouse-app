import {auth} from './firebase';
import type {VideoProps} from '../videos/contract';

const apiOrigin = (import.meta.env.VITE_SHARE_API_ORIGIN || '').replace(/\/$/, '');
export const sharingConfigured = Boolean(apiOrigin);
// Public reads go through the site (Cloudflare, then the Hosting rewrite) so they are cached and rate-limited
// at the edge. Writes and renders use the direct Cloud Run origin: renders can outlast proxy time limits.
const readOrigin = import.meta.env.PROD ? '' : apiOrigin;
export type SharedVideo = {id: string; variantId: string; templateVersion: number; props: VideoProps; title: string; url: string; image: string; agent: string};
// `url` is a signed Cloud Storage link that expires after a few minutes.
export type ExportedVideo = {id: string; filename: string; url: string};

async function request(path: string, options: RequestInit = {}, authenticated = false, base = apiOrigin) {
  const headers = new Headers(options.headers);
  if (authenticated) {
    const user = auth?.currentUser;
    if (!user) throw new Error('Sign in before publishing a video.');
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {...options, headers, signal: options.signal ?? AbortSignal.timeout(300_000)});
  } catch {
    throw new Error('Connection lost. Your edits are still here. Try again to recover your link.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Sharing is unavailable. Please try again.');
  return body;
}

export async function publishVideo(variantId: string, props: VideoProps, templateVersion: number): Promise<SharedVideo> {
  if (!sharingConfigured) throw new Error('Publishing is not available yet. Your edits remain on this device.');
  return request('/api/shares', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({variantId, props, templateVersion}),
  }, true);
}

export async function loadSharedVideo(id: string, signal: AbortSignal): Promise<SharedVideo> {
  return request(`/api/shares/${encodeURIComponent(id)}`, {signal}, false, readOrigin);
}

export async function deleteSharedVideo(id: string) {
  return request(`/api/shares/${encodeURIComponent(id)}`, {method: 'DELETE'}, true);
}

export async function exportVideo(variantId: string, props: VideoProps, templateVersion: number): Promise<ExportedVideo> {
  if (!sharingConfigured) throw new Error('MP4 export is not available yet. Copy the render command instead.');
  return request('/api/exports', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({variantId, props, templateVersion}),
  }, true);
}

export type UploadedLogo = {id: string; ratio: number; mono: boolean; transparent: boolean; url: string};
// Rasterized and stored by the share service; the browser sends the file as base64 JSON.
export async function uploadLogo(file: File): Promise<UploadedLogo> {
  if (!sharingConfigured) throw new Error('Logo uploads are not available yet.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('This file could not be read.'));
    reader.readAsDataURL(file);
  });
  return request('/api/logos', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({data})}, true);
}
// Logos load from the site in production (cached at the edge) and from the API origin in development.
// Pages embedded on another origin (the MCP App preview) set an absolute site origin first.
let siteOrigin = '';
export const setSiteOrigin = (origin: string) => { siteOrigin = origin.replace(/\/$/, ''); };
export const logoUrl = (id: string) => `${readOrigin || siteOrigin || location.origin}/l/${id}.png`;

export type ApiKey = {id: string; createdAt: number; last4: string};
export const listApiKeys = async (): Promise<ApiKey[]> => (await request('/api/keys', {}, true)).keys;
export const createApiKey = async (): Promise<ApiKey & {key: string}> =>
  request('/api/keys', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}, true);
export const revokeApiKey = (id: string) => request(`/api/keys/${encodeURIComponent(id)}`, {method: 'DELETE'}, true);
