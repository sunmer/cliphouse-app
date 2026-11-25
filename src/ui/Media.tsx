import {useEffect, useRef, useState} from 'react';
import type {Variant} from '../catalog/catalog';
import type {VideoProps} from '../videos/vocab';
import {compositions} from '../videos/registry';
import {ViewportVideo} from './ViewportVideo';
import {VideoPlayer, VideoThumbnail} from './VideoPlayer';
import {THREE_TEMPLATES, registerLiveCard} from './liveBudget';

const asset = (file: string) => `${import.meta.env.BASE_URL}previews/${file}`;
const FRAME_RATIO = 16 / 10;

// Fits any aspect ratio into a fixed 16:10 card frame, letterboxed with the theme background.
// Preset cards use pre-rendered MP4 loops; personalized cards run live in the browser under a
// concurrency budget (hover + top visible 2D cards on desktop, centered card on mobile).
export function Media({variant, props, autoplay = true}: {variant: Variant; props: VideoProps | null; autoplay?: boolean}) {
  const c = compositions[variant.template];
  const ratio = c.width / c.height;
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [playingLive, setPlayingLive] = useState(false);
  const hovered = useRef(false);
  const handle = useRef<ReturnType<typeof registerLiveCard> | null>(null);
  const is3d = THREE_TEMPLATES.has(variant.template);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {rootMargin: '0px'});
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!props || !visible || !autoplay || !box.current) {
      setPlayingLive(false);
      handle.current = null;
      return;
    }
    const reg = registerLiveCard(variant.id, box.current, is3d, hovered.current, setPlayingLive);
    handle.current = reg;
    return () => {
      reg.unregister();
      if (handle.current === reg) handle.current = null;
    };
  }, [Boolean(props), visible, autoplay, variant.id, is3d]);

  const setHover = (next: boolean) => {
    hovered.current = next;
    handle.current?.setHovered(next);
  };

  const inner = ratio >= FRAME_RATIO ? {width: '100%'} : {height: '100%'};
  const bg = (props ?? variant.props).theme.background;

  return (
    <div ref={box} className="media" style={{background: bg}}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}>
      <div className="media-inner" style={{aspectRatio: `${c.width} / ${c.height}`, ...inner}}>
        {props ? (
          visible && (playingLive ? (
            <VideoPlayer composition={c} props={props} autoPlay startFrame={0} style={{width: '100%', height: '100%'}} />
          ) : (
            <VideoThumbnail composition={c} props={props} style={{width: '100%', height: '100%'}} />
          ))
        ) : (
          <>
            <img src={asset(`${variant.id}.jpg`)} alt="" loading="lazy" decoding="async" />
            <ViewportVideo src={asset(`${variant.id}.mp4`)} label={`${variant.title} preview`} controls={false} autoplay={autoplay}
              style={{position: 'absolute', inset: 0}} />
          </>
        )}
      </div>
    </div>
  );
}
