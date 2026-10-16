import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {HttpError} from './model.ts';
import {LOGO_MAX_BYTES, LOGO_MAX_RATIO, LOGO_MAX_SIDE, LOGO_MIN_RATIO, LOGO_TYPES} from '../src/videos/logo.ts';

export type LogoType = (typeof LOGO_TYPES)[number];
export type ProcessedLogo = {id: string; png: Buffer; ratio: number; transparent: boolean};
const MAX_PNG_BYTES = 1_500_000;

// The input is written to a file: some decoders (librsvg) need a seekable input and read nothing from a pipe.
async function ffmpeg(args: string[], input: Buffer, timeoutMs = 15_000): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'cliphouse-logo-'));
  const file = path.join(dir, 'input');
  await writeFile(file, input);
  try { return await run(args.map((a) => (a === 'pipe:0' ? file : a)), timeoutMs); }
  finally { await rm(dir, {recursive: true, force: true}); }
}
function run(args: string[], timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.LOGO_FFMPEG || 'ffmpeg', ['-v', 'error', '-nostdin', ...args], {stdio: ['ignore', 'pipe', 'pipe']});
    const out: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d: Buffer) => { size += d.length; if (size > 8 * MAX_PNG_BYTES) child.kill('SIGKILL'); else out.push(d); });
    child.stderr.resume();
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg exited with ${code}`)); });
  });
}

// SVGs are rasterized by librsvg, which runs no scripts. As a second guard, documents with entities,
// embedded HTML, scripts, or references to anything but their own fragments are refused outright.
export function checkSvg(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new HttpError(400, 'SVG logos must not use DOCTYPE or entities.');
  if (/<(script|foreignObject|iframe|object|embed)\b/i.test(text)) throw new HttpError(400, 'SVG logos must not contain scripts or embedded content.');
  for (const m of text.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    if (!m[1].startsWith('#') && !/^data:image\/(png|jpeg|webp);base64,/i.test(m[1])) throw new HttpError(400, 'SVG logos must not link to other files.');
  }
  if (/url\(\s*["']?(?!#)/i.test(text)) throw new HttpError(400, 'SVG logos must not load external styles or images.');
  if (!/<svg[\s>]/i.test(text)) throw new HttpError(400, 'This file is not an SVG.');
}

const sniff = (bytes: Buffer): LogoType | null => {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'))) return 'image/svg+xml';
  return null;
};

/** Rasterize an uploaded logo to a PNG at most LOGO_MAX_SIDE on its long side. The id is the PNG's SHA-256. */
export async function processLogo(bytes: Buffer, declared?: string): Promise<ProcessedLogo> {
  if (!bytes.length) throw new HttpError(400, 'The logo file is empty.');
  if (bytes.length > LOGO_MAX_BYTES) throw new HttpError(413, `Logos must be ${LOGO_MAX_BYTES / 1_000_000} MB or smaller.`);
  const type = sniff(bytes);
  if (!type) throw new HttpError(415, 'Use a PNG, JPEG, WebP, or SVG logo.');
  if (declared && declared !== type) throw new HttpError(415, `The file is ${type}, not ${declared}.`);
  if (type === 'image/svg+xml') checkSvg(bytes.toString('utf8'));
  // librsvg renders an SVG at its own size; ask for a large width so small viewBoxes stay sharp, then scale down.
  const input = type === 'image/svg+xml' ? ['-f', 'svg_pipe', '-width', String(LOGO_MAX_SIDE)] : [];
  const fit = `scale=w='min(${LOGO_MAX_SIDE},iw)':h='min(${LOGO_MAX_SIDE},ih)':force_original_aspect_ratio=decrease:flags=lanczos`;
  let png: Buffer;
  try {
    png = await ffmpeg([...input, '-i', 'pipe:0', '-frames:v', '1', '-vf', `${fit},format=rgba`, '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'], bytes);
  } catch { throw new HttpError(400, 'This logo could not be read. Try a PNG or a simpler SVG.'); }
  if (png.length < 33 || png.length > MAX_PNG_BYTES) throw new HttpError(400, 'This logo is too detailed. Try a smaller PNG or SVG.');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const ratio = Math.round((width / height) * 1000) / 1000;
  if (!(ratio >= LOGO_MIN_RATIO && ratio <= LOGO_MAX_RATIO)) throw new HttpError(400, 'Logos must be between 1:5 tall and 8:1 wide.');
  // A logo with a transparent background can be drawn in the template's text color; an opaque one cannot.
  const alpha = await ffmpeg(['-i', 'pipe:0', '-vf', 'format=rgba,alphaextract,scale=32:32:flags=area', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], png).catch(() => Buffer.alloc(0));
  const transparent = alpha.some((v) => v < 200);
  return {id: createHash('sha256').update(png).digest('hex'), png, ratio, transparent};
}

/** Decode a logo sent as base64 (optionally a data: URL) or as SVG text. */
export function logoBytes(input: {data?: unknown; svg?: unknown}): Buffer {
  if (typeof input.svg === 'string' && input.svg.trim()) return Buffer.from(input.svg, 'utf8');
  if (typeof input.data !== 'string' || !input.data) throw new HttpError(400, 'Send the logo as base64 data or SVG text.');
  const raw = input.data.replace(/^data:[^;,]+;base64,/, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw new HttpError(400, 'The logo data is not valid base64.');
  return Buffer.from(raw, 'base64');
}
