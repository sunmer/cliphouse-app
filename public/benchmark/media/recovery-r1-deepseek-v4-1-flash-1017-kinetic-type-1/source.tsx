import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { palette } from './contract';

const FONT = 'Archivo';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const mix = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 270], [0, 1], clamp);
  const cx = interpolate(t, [0, 1], [42, 58]);
  const cy = interpolate(t, [0, 1], [32, 40]);

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 760px at ${cx}% ${cy}%, rgba(120, 185, 237, 0.10), rgba(16, 17, 20, 0) 68%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 620px at ${100 - cx}% ${100 - cy}%, rgba(184, 243, 107, 0.06), rgba(16, 17, 20, 0) 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const PhraseOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headIn = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 110 },
    durationInFrames: 24,
  });

  const headOpacity = interpolate(frame, [0, 10], [0, 1], clamp);
  const headShift = interpolate(headIn, [0, 1], [46, 0]);
  const exit = interpolate(frame, [80, 90], [0, 1], { ...clamp, easing: easeIn });

  const letters = 'noise'.split('');

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          whiteSpace: 'nowrap',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 176,
          lineHeight: 1,
          letterSpacing: '-0.035em',
          color: palette.foreground,
          opacity: 1 - exit,
          transform: `translateY(${headShift - exit * 26}px)`,
        }}
      >
        <span style={{ opacity: headOpacity }}>Less</span>
        <span style={{ display: 'inline-block', width: '0.26em' }} />
        <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          {letters.map((ch, i) => {
            const delay = 2 + i * 2;
            const p = spring({
              frame: frame - delay,
              fps,
              config: { damping: 15, mass: 0.7, stiffness: 150 },
              durationInFrames: 22,
            });
            const settle = interpolate(frame, [delay, delay + 22], [1, 0], clamp);
            const jx = Math.sin((frame + i * 9) * 1.7) * 14 * settle;
            const jy = Math.cos((frame + i * 13) * 2.1) * 9 * settle;
            const y = interpolate(p, [0, 1], [58, 0]);
            const o = interpolate(frame, [delay, delay + 10], [0, 1], clamp);
            const ct = interpolate(frame, [delay, delay + 22], [0, 1], clamp);

            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: mix(palette.foreground, palette.muted, ct),
                  opacity: o,
                  transform: `translate(${jx}px, ${y + jy}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
          <span
            style={{
              display: 'inline-block',
              color: palette.accent,
              opacity: interpolate(frame, [14, 24], [0, 1], clamp),
              transform: `translateY(${interpolate(frame, [14, 24], [26, 0], clamp)}px)`,
            }}
          >
            .
          </span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

const PhraseTwo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({
    frame,
    fps,
    config: { damping: 28, mass: 1.1, stiffness: 70 },
    durationInFrames: 32,
  });

  const tracking = interpolate(p, [0, 1], [0.22, -0.035]);
  const scale = interpolate(p, [0, 1], [1.08, 1]);
  const blur = interpolate(p, [0, 1], [14, 0]);
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  const rule = interpolate(frame, [26, 52], [0, 1], { ...clamp, easing: easeOut });
  const exit = interpolate(frame, [80, 90], [0, 1], { ...clamp, easing: easeIn });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: (1 - exit) * opacity,
          transform: `translateY(${-exit * 22}px) scale(${1 + exit * 0.03})`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 168,
            lineHeight: 1,
            letterSpacing: `${tracking}em`,
            color: palette.foreground,
            whiteSpace: 'nowrap',
            filter: `blur(${blur}px)`,
            transform: `scale(${scale})`,
          }}
        >
          More focus
          <span style={{ color: palette.accent }}>.</span>
        </div>
        <div
          style={{
            marginTop: 52,
            width: 520,
            height: 3,
            borderRadius: 2,
            backgroundColor: palette.accent,
            transform: `scaleX(${rule})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const PhraseThree: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = interpolate(frame, [80, 90], [0, 1], { ...clamp, easing: easeIn });
  const rule = interpolate(frame, [30, 54], [0, 1], { ...clamp, easing: easeOut });

  const tokens: { text: string; dir: number; delay: number }[] = [
    { text: 'Better', dir: -1, delay: 0 },
    { text: 'work,', dir: 1, delay: 4 },
    { text: 'together.', dir: -1, delay: 8 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 1 - exit,
          transform: `translateY(${-exit * 22}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            whiteSpace: 'nowrap',
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 128,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: palette.foreground,
          }}
        >
          {tokens.map((tok, i) => {
            const p = spring({
              frame: frame - tok.delay,
              fps,
              config: { damping: 200, mass: 1, stiffness: 90 },
              durationInFrames: 24,
            });
            const x = interpolate(p, [0, 1], [tok.dir * 200, 0]);
            const o = interpolate(frame, [tok.delay, tok.delay + 12], [0, 1], clamp);
            const isLast = i === tokens.length - 1;

            return (
              <span
                key={tok.text}
                style={{
                  display: 'inline-block',
                  transform: `translateX(${x}px)`,
                  opacity: o,
                  marginLeft: i === 0 ? 0 : '0.24em',
                }}
              >
                {isLast ? (
                  <>
                    {tok.text.slice(0, -1)}
                    <span style={{ color: palette.accent }}>{tok.text.slice(-1)}</span>
                  </>
                ) : (
                  tok.text
                )}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 54,
            width: 640,
            height: 2,
            borderRadius: 1,
            backgroundColor: palette.secondary,
            transform: `scaleX(${rule})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const PhraseFour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineIn = interpolate(frame, [0, 20], [0, 1], { ...clamp, easing: easeOut });
  const hair = interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: easeOut });
  const relayIn = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200, mass: 1, stiffness: 95 },
    durationInFrames: 24,
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 1.1,
            letterSpacing: '0.005em',
            color: palette.muted,
            whiteSpace: 'nowrap',
            opacity: lineIn,
            transform: `translateY(${(1 - lineIn) * 26}px)`,
          }}
        >
          Make room for what matters.
        </div>
        <div
          style={{
            marginTop: 38,
            marginBottom: 38,
            width: 520,
            height: 1,
            backgroundColor: 'rgba(245, 245, 242, 0.18)',
            transform: `scaleX(${hair})`,
          }}
        />
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 196,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: palette.accent,
            whiteSpace: 'nowrap',
            opacity: relayIn,
            transform: `translateY(${(1 - relayIn) * 30}px) scale(${0.94 + 0.06 * relayIn})`,
          }}
        >
          Relay
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, fontFamily: FONT }}>
      <Backdrop />
      <Sequence from={0} durationInFrames={90}>
        <PhraseOne />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <PhraseTwo />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <PhraseThree />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <PhraseFour />
      </Sequence>
    </AbsoluteFill>
  );
};