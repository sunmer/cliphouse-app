import {Player, Thumbnail, type PlayerRef} from '@remotion/player';
import '@hyperframes/player';
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties} from 'react';
import type {CompositionDef} from '../videos/registry';
import {bindHyperframes, hyperframesVariables} from '../videos/hyperframes';
import type {VideoProps} from '../videos/vocab';

type FrameEvent = {detail: {frame: number}};
type Listener = (event: FrameEvent) => void;
export type VideoPlayerRef = {
  play(): void;
  pause(): void;
  toggle(): void;
  seekTo(frame: number): void;
  isPlaying(): boolean;
  /** The player's exact position in seconds, between frame events. */
  currentTime(): number;
  addEventListener(type: 'play' | 'pause' | 'seeked' | 'frameupdate' | 'ready', listener: Listener): void;
  removeEventListener(type: 'play' | 'pause' | 'seeked' | 'frameupdate' | 'ready', listener: Listener): void;
  textRoot(): HTMLElement | Document | null;
};

type HFPlayer = HTMLElement & {
  play(): void; pause(): void; seek(seconds: number): void; paused: boolean; currentTime: number; ready: boolean;
  iframeElement: HTMLIFrameElement;
};
const assetBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/hyperframes/assets`;
const runtimeSrc = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/hyperframes/runtime/hyperframe.runtime.iife.js`;

function hyperframesDocument(c: Extract<CompositionDef, {engine: 'hyperframes'}>, props: VideoProps) {
  const html = bindHyperframes({html: c.html, meta: c, props, assetBase});
  const values = JSON.stringify(hyperframesVariables(props, c)).replace(/</g, '\\u003c');
  return html.replace('<head>', `<head><script>window.__hfVariables=${values};</script>`);
}

type MusicWindow = Window & {cliphouseFitText?: () => void; cliphouseMusicUpdate?: (vars: Record<string, unknown>) => void;
  cliphouseBeatUpdate?: (vars: Record<string, unknown>) => void; __hfVariables?: Record<string, unknown>};
function applyLive(doc: Document, props: VideoProps, meta: CompositionDef) {
  const values = hyperframesVariables(props, meta);
  const win = doc.defaultView as MusicWindow | null;
  for (const el of doc.querySelectorAll<HTMLElement>('[data-var-text]')) {
    const value = values[el.dataset.varText as keyof typeof values];
    if (typeof value === 'string' && el.textContent !== value) el.textContent = value;
  }
  const root = doc.querySelector<HTMLElement>('[data-composition-id]');
  for (const [key, value] of Object.entries(values)) if (key.startsWith('theme_')) root?.style.setProperty(`--${key.replace('_', '-')}`, String(value));
  // Music and beat templates rebuild word masks, list rows, and the timeline from the new text.
  const rebuild = win?.cliphouseBeatUpdate ?? win?.cliphouseMusicUpdate;
  if (win && rebuild) {
    const key = JSON.stringify(values);
    if (JSON.stringify(win.__hfVariables) !== key) {
      win.__hfVariables = values;
      rebuild(values);
    }
  } else win?.cliphouseFitText?.();
}

export const VideoPlayer = forwardRef<VideoPlayerRef, {
  composition: CompositionDef; props: VideoProps; autoPlay: boolean; style?: CSSProperties;
}>(function VideoPlayer({composition: c, props, autoPlay, style}, ref) {
  const remotion = useRef<PlayerRef>(null);
  const hyper = useRef<HFPlayer>(null);
  const listeners = useRef(new Map<string, Set<Listener>>());
  const [readyDocument, setReadyDocument] = useState<Document | null>(null);
  const initialProps = useRef(props);
  const wantsPlay = useRef(autoPlay);
  const srcdoc = useMemo(() => c.engine === 'hyperframes' ? hyperframesDocument(c, initialProps.current) : '', [c]);
  const emit = (type: string, frame?: number) => listeners.current.get(type)?.forEach((listener) => listener({detail: {frame: frame ?? 0}}));

  useImperativeHandle(ref, () => ({
    play: () => { wantsPlay.current = true; if (c.engine === 'remotion') remotion.current?.play(); else hyper.current?.play(); },
    pause: () => { wantsPlay.current = false; if (c.engine === 'remotion') remotion.current?.pause(); else hyper.current?.pause(); },
    toggle: () => {
      if (c.engine === 'remotion') {
        wantsPlay.current = !remotion.current?.isPlaying();
        remotion.current?.toggle();
      }
      else if (hyper.current?.paused) { wantsPlay.current = true; hyper.current.play(); }
      else { wantsPlay.current = false; hyper.current?.pause(); }
    },
    seekTo: (frame) => {
      if (c.engine === 'remotion') remotion.current?.seekTo(frame);
      else {
        hyper.current?.seek(frame / c.fps);
        requestAnimationFrame(() => emit('seeked', frame));
      }
    },
    // HyperFrames updates `paused` a moment after play() or pause(), so report the requested state;
    // audio that follows the player must not restart in that window.
    isPlaying: () => c.engine === 'remotion' ? !!remotion.current?.isPlaying() : wantsPlay.current && !hyper.current?.paused,
    currentTime: () => c.engine === 'remotion' ? (remotion.current?.getCurrentFrame() ?? 0) / c.fps : hyper.current?.currentTime ?? 0,
    addEventListener: (type, listener) => {
      if (c.engine === 'remotion') { if (type !== 'ready') remotion.current?.addEventListener(type, listener as never); }
      else {
        const set = listeners.current.get(type) ?? new Set();
        set.add(listener);
        listeners.current.set(type, set);
      }
    },
    removeEventListener: (type, listener) => {
      if (c.engine === 'remotion') { if (type !== 'ready') remotion.current?.removeEventListener(type, listener as never); }
      else listeners.current.get(type)?.delete(listener);
    },
    textRoot: () => c.engine === 'remotion' ? null : hyper.current?.iframeElement?.contentDocument ?? null,
  }), [c]);

  useEffect(() => {
    const p = hyper.current;
    if (c.engine !== 'hyperframes' || !p) return;
    const ready = () => {
      const doc = p.iframeElement.contentDocument;
      if (doc) applyLive(doc, props, c);
      setReadyDocument(doc);
      if (wantsPlay.current) p.play(); else p.pause();
      emit('ready', Math.round(p.currentTime * c.fps));
      emit('seeked', Math.round(p.currentTime * c.fps));
    };
    // The runtime pauses and plays on its own around loops; only explicit calls change wantsPlay.
    const play = () => emit('play');
    const pause = () => { emit('pause'); emit('seeked', Math.round(p.currentTime * c.fps)); };
    const time = (event: Event) => emit('frameupdate', Math.round(((event as CustomEvent<{currentTime: number}>).detail.currentTime ?? p.currentTime) * c.fps));
    p.addEventListener('ready', ready);
    p.addEventListener('play', play);
    p.addEventListener('pause', pause);
    p.addEventListener('timeupdate', time);
    if (p.ready) ready();
    return () => {
      p.removeEventListener('ready', ready);
      p.removeEventListener('play', play);
      p.removeEventListener('pause', pause);
      p.removeEventListener('timeupdate', time);
    };
  }, [c]);

  // Remotion's autoPlay sometimes starts with a stalled clock: isPlaying() is true but the frame never
  // advances, so the editor shows Pause on a frozen picture. A short watchdog restarts a stalled player.
  useEffect(() => {
    if (c.engine !== 'remotion') return;
    const r = remotion.current;
    if (!r) return;
    let last = r.getCurrentFrame();
    let still = 0;
    const timer = window.setInterval(() => {
      // Only a player that claims to play is checked, so pauses from scrubbing or editing are left alone.
      if (document.hidden || !r.isPlaying()) { still = 0; last = r.getCurrentFrame(); return; }
      const now = r.getCurrentFrame();
      still = now === last ? still + 1 : 0;
      last = now;
      if (still >= 2) { still = 0; r.pause(); r.play(); }
    }, 200);
    return () => clearInterval(timer);
  }, [c]);

  useEffect(() => {
    if (c.engine === 'hyperframes' && readyDocument) {
      applyLive(readyDocument, props, c);
      requestAnimationFrame(() => emit('seeked', Math.round((hyper.current?.currentTime ?? 0) * c.fps)));
    }
  }, [props, readyDocument, c]);

  if (c.engine === 'remotion') return <Player ref={remotion} component={c.component} inputProps={props} durationInFrames={c.durationInFrames}
    compositionWidth={c.width} compositionHeight={c.height} fps={c.fps} initialFrame={c.posterFrame} loop autoPlay={autoPlay}
    controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} acknowledgeRemotionLicense style={style} />;
  return <hyperframes-player ref={hyper} srcdoc={srcdoc} runtime-src={runtimeSrc} width={c.width} height={c.height} loop={true}
    disable-click-to-play="" assets-loading-ui="none" style={{display: 'block', ...style}} />;
});

export function VideoThumbnail({composition: c, props, style}: {composition: CompositionDef; props: VideoProps; style?: CSSProperties}) {
  const ref = useRef<HFPlayer>(null);
  const srcdoc = useMemo(() => c.engine === 'hyperframes' ? hyperframesDocument(c, props) : '', [c, props]);
  useEffect(() => {
    const p = ref.current;
    if (c.engine !== 'hyperframes' || !p) return;
    const seek = () => p.seek(c.posterFrame / c.fps);
    p.addEventListener('ready', seek);
    if (p.ready) seek();
    return () => p.removeEventListener('ready', seek);
  }, [c, srcdoc]);
  if (c.engine === 'remotion') return <Thumbnail component={c.component} inputProps={props} frameToDisplay={c.posterFrame} durationInFrames={c.durationInFrames}
    compositionWidth={c.width} compositionHeight={c.height} fps={c.fps} style={style} />;
  return <hyperframes-player ref={ref} srcdoc={srcdoc} runtime-src={runtimeSrc} width={c.width} height={c.height} assets-loading-ui="none" low-power-idle="" style={{display: 'block', ...style}} />;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'hyperframes-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}
