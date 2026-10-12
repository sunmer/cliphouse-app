import {useEffect, useRef, useState, type RefObject} from 'react';
import {SAMPLE_RATE, type Score} from '../videos/music/score';
import type {VideoProps} from '../videos/vocab';
import type {VideoPlayerRef} from './VideoPlayer';

/** Largest gap between the heard audio and the player's clock before playback restarts at the player's time. */
export const MAX_DRIFT = 0.04;

type Source = {node: AudioBufferSourceNode; startedAt: number; offset: number};

/**
 * Plays a music template's generated mix in time with the player. The editor starts muted.
 * The worker renders the same samples as the exported WAV whenever text or hidden roles change.
 * Play, pause, scrubbing, scene jumps, and loops restart the source at the player's frame.
 */
export function useScoreAudio({score, fps, props, player, enabled}: {
  score: Score | undefined; fps: number; props: VideoProps; player: RefObject<VideoPlayerRef | null>; enabled: boolean;
}) {
  const ctx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const buffer = useRef<AudioBuffer | null>(null);
  const source = useRef<Source | null>(null);
  const on = useRef(enabled);
  const frame = useRef(0);
  const [ready, setReady] = useState(false);
  const hidden = (props as {hidden?: string[]}).hidden ?? [];
  const key = score ? JSON.stringify([props.texts, hidden]) : '';

  const context = () => {
    if (!ctx.current) {
      ctx.current = new AudioContext({sampleRate: SAMPLE_RATE, latencyHint: 'interactive'});
      gain.current = ctx.current.createGain();
      gain.current.connect(ctx.current.destination);
    }
    return ctx.current;
  };
  const stop = () => {
    const s = source.current;
    source.current = null;
    if (!s) return;
    try { s.node.stop(); } catch { /* Already stopped. */ }
    s.node.disconnect();
  };
  const start = (at: number) => {
    stop();
    if (!on.current || !buffer.current || !ctx.current || !gain.current || !player.current?.isPlaying()) return;
    const node = ctx.current.createBufferSource();
    node.buffer = buffer.current;
    node.connect(gain.current);
    const offset = Math.max(0, Math.min(buffer.current.duration - 0.001, at / fps));
    const when = ctx.current.currentTime + 0.01;
    node.start(when, offset);
    source.current = {node, startedAt: when, offset};
  };
  const heard = () => {
    const s = source.current;
    return s && ctx.current ? ctx.current.currentTime - s.startedAt + s.offset : null;
  };
  // HyperFrames reports time every few frames, so compare against the player's own clock, not the last event.
  const shown = () => player.current?.currentTime() ?? frame.current / fps;

  // Render the mix in a worker. A newer edit replaces an older render.
  useEffect(() => {
    if (!score) return;
    const worker = new Worker(new URL('./audioWorker.ts', import.meta.url), {type: 'module'});
    let live = true;
    worker.onmessage = (event: MessageEvent<{left: Float32Array<ArrayBuffer>; right: Float32Array<ArrayBuffer>}>) => {
      if (!live) return;
      const c = context();
      const next = c.createBuffer(2, event.data.left.length, SAMPLE_RATE);
      next.copyToChannel(event.data.left, 0);
      next.copyToChannel(event.data.right, 1);
      buffer.current = next;
      setReady(true);
      // An edit swaps the mix at the current position.
      if (source.current) start(frame.current);
    };
    worker.postMessage({id: 1, score, props: {texts: props.texts, hidden}});
    return () => { live = false; worker.terminate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, key]);

  // Follow the player.
  useEffect(() => {
    const p = player.current;
    if (!score || !p) return;
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
  }, [score, player, fps]);

  useEffect(() => {
    on.current = enabled;
    if (enabled) { void ctx.current?.resume(); start(frame.current); } else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  useEffect(() => () => { stop(); void ctx.current?.close(); ctx.current = null; }, []);

  // Browser tests read playback state here: whether a source plays, the drift in seconds, the frame, and the mix length.
  useEffect(() => {
    if (!score) return;
    const w = window as Window & {__cliphouseAudio?: () => object};
    w.__cliphouseAudio = () => {
      const h = heard();
      return {playing: !!source.current, context: ctx.current?.state ?? 'none', frame: frame.current,
        drift: h === null ? null : h - shown(), duration: buffer.current?.duration ?? null};
    };
    return () => { delete w.__cliphouseAudio; };
  }, [score, fps]);

  return {
    ready,
    /** Create and resume the audio context inside a click, so the browser allows sound. */
    unlock: () => { void context().resume(); },
  };
}
