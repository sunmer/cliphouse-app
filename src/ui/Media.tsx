import {useEffect, useRef, useState} from 'react';
import type {Variant} from '../catalog/catalog';
import type {VideoProps} from '../videos/vocab';
import {compositions} from '../videos/registry';
import {ViewportVideo} from './ViewportVideo';
import {VideoThumbnail} from './VideoPlayer';

const asset = (file: string) => `${import.meta.env.BASE_URL}previews/${file}`;
const FRAME_RATIO = 16 / 10;

// Fits any aspect ratio into a fixed 16:10 card frame, letterboxed with the theme background.
// Preset cards use the same viewport-only loading policy as article videos.
export function Media({variant, props, autoplay = true}: {variant: Variant; props: VideoProps | null; autoplay?: boolean}) {
  const c = compositions[variant.template];
  const ratio = c.width / c.height;
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {rootMargin: '0px'});
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const inner = ratio >= FRAME_RATIO ? {width: '100%'} : {height: '100%'};
  const bg = (props ?? variant.props).theme.background;

  return (
    <div ref={box} className="media" style={{background: bg}}>
      <div className="media-inner" style={{aspectRatio: `${c.width} / ${c.height}`, ...inner}}>
        {props ? (
          // Brand color previews: one static Remotion frame per card, only while on screen.
          visible && (
            <VideoThumbnail composition={c} props={props} style={{width: '100%', height: '100%'}} />
          )
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
