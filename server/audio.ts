import {execFile} from 'node:child_process';
import {rename, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {musicWav} from '../src/videos/music/index.ts';
import {durationSeconds, type Score} from '../src/videos/music/score.ts';
import {beatWav, durationSeconds as beatDuration, type BeatScore} from '../src/videos/beat/index.ts';
import type {VideoProps} from '../src/videos/vocab.ts';

type AnyScore = Score | BeatScore;
const isBeat = (s: AnyScore): s is BeatScore => Object.hasOwn(s, 'beatFrames');
const seconds = (s: AnyScore) => isBeat(s) ? beatDuration(s) : durationSeconds(s);

const run = promisify(execFile);
/** Largest accepted difference between audio and video start or length, in seconds. */
export const SYNC_TOLERANCE = 0.035;

type Stream = {codec_type: string; codec_name: string; sample_rate?: string; channels?: number; start_time?: string; duration?: string; nb_frames?: string; r_frame_rate?: string};

export async function probe(file: string, signal?: AbortSignal) {
  const {stdout} = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {signal, maxBuffer: 4 * 1024 * 1024});
  const data = JSON.parse(stdout) as {streams: Stream[]; format: {duration?: string}};
  return {video: data.streams.find((s) => s.codec_type === 'video'), audio: data.streams.find((s) => s.codec_type === 'audio'), duration: Number(data.format.duration)};
}

/** Problems with a muxed music MP4. Empty means the streams line up with the score. */
export function syncErrors(info: Awaited<ReturnType<typeof probe>>, score: AnyScore) {
  const errors: string[] = [];
  const want = seconds(score);
  const {video, audio} = info;
  if (!video) errors.push('missing video stream');
  if (!audio) return [...errors, 'missing audio stream'];
  if (audio.codec_name !== 'aac') errors.push(`audio codec is ${audio.codec_name}, not AAC`);
  if (audio.sample_rate !== '48000') errors.push(`audio sample rate is ${audio.sample_rate}, not 48000`);
  if (audio.channels !== 2) errors.push(`audio has ${audio.channels} channels, not 2`);
  const vStart = Number(video?.start_time ?? 0);
  const aStart = Number(audio.start_time ?? 0);
  if (Math.abs(aStart - vStart) > SYNC_TOLERANCE) errors.push(`audio starts ${(aStart - vStart).toFixed(3)} s after video`);
  const vDur = Number(video?.duration ?? 0);
  const aDur = Number(audio.duration ?? 0);
  if (Math.abs(vDur - want) > SYNC_TOLERANCE) errors.push(`video lasts ${vDur.toFixed(3)} s, score lasts ${want.toFixed(3)} s`);
  if (Math.abs(aDur - want) > SYNC_TOLERANCE) errors.push(`audio lasts ${aDur.toFixed(3)} s, score lasts ${want.toFixed(3)} s`);
  return errors;
}

/** Write the props' WAV next to a silent video and replace the video with the muxed MP4. */
export async function addScore(video: string, score: AnyScore, props: VideoProps, signal?: AbortSignal) {
  const dir = path.dirname(video);
  const wav = path.join(dir, 'score.wav');
  const out = path.join(dir, 'with-audio.mp4');
  await writeFile(wav, isBeat(score) ? beatWav(score, props) : musicWav(score, props));
  // Copy the video stream as is and encode only the audio. -t pins both streams to the score length.
  await run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', seconds(score).toFixed(6), '-movflags', '+faststart', out], {signal});
  const errors = syncErrors(await probe(out, signal), score);
  if (errors.length) throw new Error(`Audio export failed its sync check: ${errors.join('; ')}.`);
  await rename(out, video);
  return wav;
}
