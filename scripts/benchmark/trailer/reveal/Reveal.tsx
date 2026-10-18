// 16 s vertical reveal: three trailers stacked, cost only, then the model and effort in the last 3 s.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import tiles from './tiles.json';

const TRAILER = 390;
const TOTAL = 480;
const TILE_H = 608;
const ink = '#F5F5F2';
const hot = '#FF3D7F';
const sun = '#FFC94A';
const ease = Easing.out(Easing.exp);

type Tile = {letter: string; video: string; cost: string; model: string; effort: string};

const Clip: React.FC<{tile: Tile}> = ({tile}) => {
  const frame = useCurrentFrame();
  const video = <OffthreadVideo src={staticFile(tile.video)} muted style={{width: 1080, height: TILE_H}} />;
  return frame < TRAILER ? video : <Freeze frame={TRAILER - 1}>{video}</Freeze>;
};

const Card: React.FC<{tile: Tile; index: number}> = ({tile, index}) => {
  const frame = useCurrentFrame();
  const start = TRAILER + 6 + index * 8;
  const dim = interpolate(frame, [TRAILER, TRAILER + 10], [0, 0.78], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wipe = interpolate(frame, [start, start + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const rise = interpolate(frame, [start + 4, start + 18], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const sub = interpolate(frame, [start + 10, start + 24], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `rgba(6,4,14,${dim})`}} />
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: hot, transform: `scaleY(${wipe})`, transformOrigin: 'top'}} />
      <div style={{position: 'absolute', left: 64, right: 64, top: 200, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${rise}%)`, fontSize: 60, fontWeight: 900, color: ink, lineHeight: 1.1, whiteSpace: "nowrap"}}>{tile.model}</div>
      </div>
      <div style={{position: 'absolute', left: 64, right: 64, top: 290, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${sub}%)`, fontSize: 44, fontWeight: 700, color: sun, textTransform: 'uppercase', letterSpacing: 0}}>
          {tile.effort} effort · {tile.cost}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{tile: Tile}> = ({tile}) => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: ease});
  const out = interpolate(frame, [TRAILER, TRAILER + 8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 28, top: 28, display: 'flex', alignItems: 'stretch', transform: `scale(${pop * out})`, transformOrigin: 'top left'}}>
      <div style={{background: ink, color: '#0B0912', fontSize: 40, fontWeight: 900, padding: '8px 18px'}}>{tile.letter}</div>
      <div style={{background: '#0B0912', color: ink, fontSize: 40, fontWeight: 800, padding: '8px 20px', fontVariantNumeric: 'tabular-nums'}}>{tile.cost}</div>
    </div>
  );
};

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const hookOut = interpolate(frame, [TRAILER - 6, TRAILER], [0, -100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const urlIn = interpolate(frame, [TRAILER, TRAILER + 12], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const band = {position: 'absolute' as const, left: 0, right: 0, height: 96, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'};
  return (
    <AbsoluteFill style={{background: '#0B0912', fontFamily: 'Archivo'}}>
      <Audio src={staticFile('music.m4a')} volume={(f) => Math.max(0, Math.min(1, f / 9, (TOTAL - f) / 36))} />
      <div style={{...band, top: 0}}>
        <div style={{position: "absolute", opacity: frame < TRAILER ? 1 : 0, transform: `translateY(${hookOut}%)`, fontSize: 40, fontWeight: 800, color: ink}}>
          GTA 6 trailer challenge. <span style={{color: hot}}>Guess the AI.</span>
        </div>
        <div style={{position: 'absolute', transform: `translateY(${urlIn}%)`, fontSize: 38, fontWeight: 800, color: ink, whiteSpace: "nowrap", opacity: frame >= TRAILER ? 1 : 0}}>
          Full prompt and results: <span style={{color: sun}}>cliphou.se/benchmark/gta6</span>
        </div>
      </div>
      {(tiles as Tile[]).map((tile, i) => (
        <div key={tile.letter} style={{position: 'absolute', left: 0, top: 96 + i * TILE_H, width: 1080, height: TILE_H, overflow: 'hidden', borderTop: i ? '0px' : undefined}}>
          <Clip tile={tile} />
          <Badge tile={tile} />
          <Card tile={tile} index={i} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
