import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import type {TemplateMeta} from '../vocab';
import {clamp, easeIn} from './motion';

export type SceneProps<P> = P & {duration: number};
type ExitMode = 'fade' | 'slide' | 'none';

const Exit: React.FC<{duration: number; mode: ExitMode; children: React.ReactNode}> = ({duration, mode, children}) => {
  const frame = useCurrentFrame();
  const t = mode === 'none' ? 0 : interpolate(frame, [duration - 12, duration], [0, 1], {...clamp, easing: easeIn});
  return <AbsoluteFill style={{opacity: 1 - t, transform: mode === 'slide' ? `translateX(${t * -80}px)` : undefined}}>{children}</AbsoluteFill>;
};

// Render one component per meta scene, so scene timing has a single source.
export function SceneTrack<P extends object>({meta, scenes, props, exit = 'fade'}: {
  meta: TemplateMeta;
  scenes: React.FC<SceneProps<P>>[];
  props: P;
  exit?: ExitMode;
}) {
  return (
    <>
      {meta.scenes.map((s, i) => {
        const Scene = scenes[i];
        return (
          <Sequence key={i} name={s.type} from={s.from} durationInFrames={s.duration}>
            <Exit duration={s.duration} mode={i === scenes.length - 1 ? 'none' : exit}>
              <Scene {...props} duration={s.duration} />
            </Exit>
          </Sequence>
        );
      })}
    </>
  );
}
