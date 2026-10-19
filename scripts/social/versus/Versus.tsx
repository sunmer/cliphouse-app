// Model vs model social video, 1080 x 1920. Clips stacked top to bottom, each with a small fixed tag in its
// top-left corner (model, effort, cost, generation time). Frame 0 is a cover: every clip at posterFrame,
// so share sheets and feeds show real content. Clips then play from their start, freeze on their last frame,
// and an end card with the link wipes up over them.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import props from './props.json';

export type Clip = {video: string; model: string; effort?: string; cost: string; time: string};
export type VersusProps = {title: string; clipFrames: number; posterFrame: number; endFrames: number; music?: string;
  end: {kicker: string; url: string}; clips: Clip[]};

const p = props as VersusProps;
export const durationInFrames = 1 + p.clipFrames + p.endFrames;
const ink = '#F5F5F2';
const hot = '#FF3D7F';
const sun = '#FFC94A';
const night = '#0B0912';
const ease = Easing.out(Easing.exp);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const GAP = 12;
const TILE_H = Math.round(1080 * 9 / 16);
const stackH = p.clips.length * TILE_H + (p.clips.length - 1) * GAP;
const TITLE_H = 120;
const top = Math.round((1920 - stackH + TITLE_H) / 2);
const endStart = 1 + p.clipFrames;

const ClipVideo: React.FC<{clip: Clip}> = ({clip}) => {
  const frame = useCurrentFrame();
  const video = <OffthreadVideo src={staticFile(clip.video)} muted style={{width: 1080, height: TILE_H, display: 'block'}} />;
  if (frame === 0) return <Freeze frame={p.posterFrame}>{video}</Freeze>;
  if (frame >= endStart) return <Freeze frame={p.clipFrames - 1}>{video}</Freeze>;
  return <Sequence from={1} layout="none">{video}</Sequence>;
};

const Tag: React.FC<{clip: Clip}> = ({clip}) => (
  <div style={{position: 'absolute', left: 16, top: 16, background: 'rgba(11,9,18,0.86)', borderLeft: `5px solid ${hot}`, padding: '6px 14px 7px', maxWidth: 1048}}>
    <div style={{fontSize: 26, fontWeight: 900, color: ink, lineHeight: 1.2, whiteSpace: 'nowrap'}}>
      {clip.model}{clip.effort && <span style={{fontSize: 17, fontWeight: 700, color: '#B9B4C8', marginLeft: 9, textTransform: 'uppercase'}}>{clip.effort}</span>}
    </div>
    <div style={{fontSize: 24, fontWeight: 800, color: sun, lineHeight: 1.25, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>
      {clip.cost}<span style={{color: '#8C8798', margin: '0 9px'}}>·</span>{clip.time}
    </div>
  </div>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [endStart, endStart + 12], [100, 0], {...clamp, easing: ease});
  const kicker = interpolate(frame, [endStart + 8, endStart + 22], [110, 0], {...clamp, easing: ease});
  const url = interpolate(frame, [endStart + 12, endStart + 28], [110, 0], {...clamp, easing: ease});
  if (frame < endStart) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: top - 40, bottom: 0, background: night, transform: `translateY(${wipe}%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, paddingBottom: 240}}>
      <div style={{overflow: 'hidden'}}><div style={{transform: `translateY(${kicker}%)`, fontSize: 46, fontWeight: 700, color: ink, lineHeight: 1.3}}>{p.end.kicker}</div></div>
      <div style={{overflow: 'hidden', borderBottom: `8px solid ${hot}`, paddingBottom: 8}}>
        <div style={{transform: `translateY(${url}%)`, fontSize: 66, fontWeight: 900, color: sun, lineHeight: 1.25, whiteSpace: 'nowrap'}}>{p.end.url}</div>
      </div>
    </div>
  );
};

export const Versus: React.FC = () => (
  <AbsoluteFill style={{background: night, fontFamily: 'Archivo'}}>
    {p.music && <Audio src={staticFile(p.music)} volume={(f) => Math.max(0, Math.min(1, f / 9, (durationInFrames - f) / 30))} />}
    <div style={{position: 'absolute', left: 40, right: 40, top: top - TITLE_H - 10, height: TITLE_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 64, fontWeight: 900, color: ink, lineHeight: 1.1, whiteSpace: 'nowrap'}}>{p.title}</div>
    {p.clips.map((clip, i) => (
      <div key={clip.model + i} style={{position: 'absolute', left: 0, top: top + i * (TILE_H + GAP), width: 1080, height: TILE_H, overflow: 'hidden'}}>
        <ClipVideo clip={clip} />
        <Tag clip={clip} />
      </div>
    ))}
    <EndCard />
  </AbsoluteFill>
);
