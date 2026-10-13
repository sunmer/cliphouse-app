import {useEffect, useRef, useState, type RefObject} from 'react';
import {FADE_IN, FADE_OUT, trackPath} from '../music/library';
import type {VideoPlayerRef} from './VideoPlayer';
import {MAX_DRIFT} from './useScoreAudio';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
// Fetched bytes are shared across editor visits; each audio context decodes its own copy.
const fetched = new Map<string, Promise<ArrayBuffer>>();

/**
 * Plays a music-library track in time with the player. The track starts at its beginning on the
 * first frame, is cut at the video length, and fades in and out on every loop, exactly as the export does.
 */
export function useTrackAudio({track, duration, fps, player, enabled}: {
  track: string | undefined; duration: number; fps: number; player: RefObject<VideoPlayerRef | null>; enabled: boolean;
}) {
  const ctx = useRef<AudioContext | null>(null);
  const buffer = useRef<AudioBuffer | null>(null);
  const source = useRef<{node: AudioBufferSourceNode; gain: GainNode; startedAt: number; offset: number} | null>(null);
  const on = useRef(enabled);
  const frame = useRef(0);
  const [ready, setReady] = useState(false);

  const context = () => (ctx.current ??= new AudioContext({latencyHint: 'interactive'}));
  const stop = () => {
    const s = source.current;
    source.current = null;
    if (!s) return;
    try { s.node.stop(); } catch { /* Already stopped. */ }
    s.node.disconnect();
    s.gain.disconnect();
  };
  const start = (atFrame: number) => {
    stop();
    if (!on.current || !buffer.current || !ctx.current || !player.current?.isPlaying()) return;
    const c = ctx.current;
    const offset = Math.max(0, Math.min(duration - 0.001, atFrame / fps));
    const when = c.currentTime + 0.01;
    const node = c.createBufferSource();
    node.buffer = buffer.current;
    const gain = c.createGain();
    // The fade envelope from the current position to the loop point; the next loop restarts it.
    const fadeOut = Math.min(FADE_OUT, duration / 3);
    const g = gain.gain;
    const level = (t: number) => Math.max(0, Math.min(1, t / FADE_IN, (duration - t) / fadeOut));
    g.setValueAtTime(level(offset), when);
    if (offset < FADE_IN) g.linearRampToValueAtTime(1, when + FADE_IN - offset);
    const outAt = duration - fadeOut;
    if (offset < outAt) g.setValueAtTime(1, when + outAt - offset);
    g.linearRampToValueAtTime(0, when + duration - offset);
    node.connect(gain).connect(c.destination);
    node.start(when, offset, duration - offset);
    source.current = {node, gain, startedAt: when, offset};
  };
  const heard = () => {
    const s = source.current;
    return s && ctx.current ? ctx.current.currentTime - s.startedAt + s.offset : null;
  };
  const shown = () => player.current?.currentTime() ?? frame.current / fps;

  // Load and decode the chosen track. A newer choice replaces an older load.
  useEffect(() => {
    if (!track) return;
    let live = true;
    stop();
    buffer.current = null;
    setReady(false);
    const url = `${base}${trackPath(track)}`;
    if (!fetched.has(url)) fetched.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`Track ${track} failed to load`); return r.arrayBuffer(); }));
    fetched.get(url)!.then((data) => context().decodeAudioData(data.slice(0))).then((b) => {
      if (!live) return;
      buffer.current = b;
      setReady(true);
      start(frame.current);
    }).catch(() => { fetched.delete(url); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // Follow the player: play, pause, seeks, loops, and drift.
  useEffect(() => {
    const p = player.current;
    if (!track || !p) return;
    const onPlay = () => { void ctx.current?.resume(); start(frame.current); };
    const onPause = () => stop();
    const onSeek = (e: {detail: {frame: number}}) => { frame.current = e.detail.frame; start(frame.current); };
    const onFrame = (e: {detail: {frame: number}}) => {
      const looped = e.detail.frame < frame.current - fps / 2;
      frame.current = e.detail.frame;
      if (!on.current || !p.isPlaying()) return;
      const h = heard();
      if (h === null || looped || Math.abs(h - shown()) > MAX_DRIFT) start(shown() * fps);
    };
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('seeked', onSeek);
    p.addEventListener('frameupdate', onFrame);
    return () => {
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('seeked', onSeek);
      p.removeEventListener('frameupdate', onFrame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, player, fps, duration]);

  useEffect(() => {
    on.current = enabled;
    if (enabled) { void ctx.current?.resume(); start(frame.current); } else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  useEffect(() => () => { stop(); void ctx.current?.close(); ctx.current = null; }, []);

  // Browser tests read playback state here, in the same shape as the score hook.
  useEffect(() => {
    if (!track) return;
    const w = window as Window & {__cliphouseAudio?: () => object};
    w.__cliphouseAudio = () => {
      const h = heard();
      return {playing: !!source.current, context: ctx.current?.state ?? 'none', frame: frame.current,
        // The played length: the track is cut at the video's end.
        drift: h === null ? null : h - shown(), duration: buffer.current ? Math.min(buffer.current.duration, duration) : null, track};
    };
    return () => { delete w.__cliphouseAudio; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, fps, duration]);

  return {ready, unlock: () => { void context().resume(); }};
}
