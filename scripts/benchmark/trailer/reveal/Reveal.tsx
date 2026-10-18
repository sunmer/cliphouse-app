// 16 s vertical reveal: trailers stacked top to bottom with a price tag bottom-left.
// At the fade-out (last 3 s) each trailer freezes and dims, and the model name rises above its price tag.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import tiles from './tiles.json';

const TRAILER = 390;
const TOTAL = 480;
const TILE_H = 608;
const GAP = 24;
const ink = '#F5F5F2';
const hot = '#FF3D7F';
const sun = '#FFC94A';
const night = '#0B0912';
const ease = Easing.out(Easing.exp);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Tile = {letter: string; video: string; cost: string; model: string; effort: string};
const list = tiles as Tile[];
const stackH = list.length * TILE_H + (list.length - 1) * GAP;
const top = Math.round((1920 - stackH) / 2);

const Clip: React.FC<{tile: Tile}> = ({tile}) => {
  const frame = useCurrentFrame();
  const video = <OffthreadVideo src={staticFile(tile.video)} muted style={{width: 1080, height: TILE_H}} />;
  return frame < TRAILER ? video : <Freeze frame={TRAILER - 1}>{video}</Freeze>;
};

const Overlay: React.FC<{tile: Tile; index: number}> = ({tile, index}) => {
  const frame = useCurrentFrame();
  const start = TRAILER + 4 + index * 8;
  const pop = interpolate(frame, [6, 18], [0, 1], {...clamp, easing: ease});
  const dim = interpolate(frame, [TRAILER, TRAILER + 18], [0, 0.72], clamp);
  const rise = interpolate(frame, [start, start + 16], [110, 0], {...clamp, easing: ease});
  const sub = interpolate(frame, [start + 6, start + 20], [110, 0], {...clamp, easing: ease});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `rgba(6,4,14,${dim})`}} />
      <div style={{position: 'absolute', left: 40, right: 40, bottom: 176, height: 80, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${rise}%)`, fontSize: 68, fontWeight: 900, color: ink, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{tile.model}</div>
      </div>
      <div style={{position: 'absolute', left: 40, bottom: 128, height: 42, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${sub}%)`, fontSize: 32, fontWeight: 700, color: sun, lineHeight: 1.3, textTransform: 'uppercase'}}>{tile.effort} effort</div>
      </div>
      <div style={{position: 'absolute', left: 32, bottom: 32, transform: `scale(${pop})`, transformOrigin: 'bottom left',
        background: night, color: sun, fontSize: 52, fontWeight: 900, padding: '6px 20px', fontVariantNumeric: 'tabular-nums', borderLeft: `8px solid ${hot}`}}>
        {tile.cost}
      </div>
    </AbsoluteFill>
  );
};

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [0, 14], [110, 0], {...clamp, easing: ease});
  const askOut = interpolate(frame, [TRAILER - 8, TRAILER], [0, -110], {...clamp, easing: ease});
  const answerIn = interpolate(frame, [TRAILER, TRAILER + 12], [110, 0], {...clamp, easing: ease});
  const band = {position: 'absolute' as const, left: 40, right: 40, overflow: 'hidden', display: 'flex', justifyContent: 'center'};
  const line = {position: 'absolute' as const, fontSize: 44, fontWeight: 700, whiteSpace: 'nowrap' as const, lineHeight: 1.3};
  return (
    <AbsoluteFill style={{background: night, fontFamily: 'Archivo'}}>
      <Audio src={staticFile('music.m4a')} volume={(f) => Math.max(0, Math.min(1, f / 9, (TOTAL - f) / 36))} />
      <div style={{...band, top: top - 236, height: 100}}>
        <div style={{transform: `translateY(${head}%)`, fontSize: 72, fontWeight: 900, color: ink, lineHeight: 1.2, whiteSpace: 'nowrap'}}>GTA6 Trailer Benchmark</div>
      </div>
      <div style={{...band, top: top - 124, height: 60}}>
        <div style={{...line, color: ink, transform: `translateY(${head + askOut}%)`}}>Same brief. Two AIs. <span style={{color: hot}}>Which is which?</span></div>
        <div style={{...line, color: hot, transform: `translateY(${answerIn}%)`}}>The reveal</div>
      </div>
      {list.map((tile, i) => (
        <div key={tile.letter} style={{position: 'absolute', left: 0, top: top + i * (TILE_H + GAP), width: 1080, height: TILE_H, overflow: 'hidden'}}>
          <Clip tile={tile} />
          <Overlay tile={tile} index={i} />
        </div>
      ))}
      <div style={{...band, top: top + stackH + 70, height: 60}}>
        <div style={{...line, fontSize: 40, color: ink}}>Every run: <span style={{color: sun}}>cliphou.se/benchmark/gta6</span></div>
      </div>
    </AbsoluteFill>
  );
};
