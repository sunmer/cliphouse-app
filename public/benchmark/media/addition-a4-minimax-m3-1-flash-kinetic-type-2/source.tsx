import React, {CSSProperties} from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {palette} from './contract';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const typography: CSSProperties = {
  fontFamily: 'Archivo',
  color: palette.foreground,
  fontWeight: 800,
  letterSpacing: -4,
};

const noiseLines = [
  {width: 420, y: 250, color: palette.secondary, opacity: 0.28},
  {width: 330, y: 320, color: palette.muted, opacity: 0.24},
  {width: 470, y: 390, color: palette.secondary, opacity: 0.2},
  {width: 280, y: 460, color: palette.accent, opacity: 0.3},
  {width: 440, y: 530, color: palette.muted, opacity: 0.22},
  {width: 360, y: 600, color: palette.secondary, opacity: 0.26},
  {width: 480, y: 670, color: palette.muted, opacity: 0.2},
  {width: 300, y: 740, color: palette.accent, opacity: 0.24},
] as const;

const SafeCorners: React.FC = () => {
  const color = `${palette.accent}55`;
  const base: CSSProperties = {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: color,
  };

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{...base, left: 80, top: 80, borderTop: '2px solid', borderLeft: '2px solid'}} />
      <div style={{...base, right: 80, top: 80, borderTop: '2px solid', borderRight: '2px solid'}} />
      <div style={{...base, left: 80, bottom: 80, borderBottom: '2px solid', borderLeft: '2px solid'}} />
      <div style={{...base, right: 80, bottom: 80, borderBottom: '2px solid', borderRight: '2px solid'}} />
    </AbsoluteFill>
  );
};

const LessNoise: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrance = spring({
    frame: Math.min(frame, 22),
    fps,
    config: {damping: 20, stiffness: 115, mass: 0.8},
  });
  const textX = interpolate(entrance, [0, 1], [-72, 0]);
  const wipe = interpolate(frame, [0, 22], [70, 0], clamp);
  const exit = interpolate(frame, [82, 89], [1, 0], clamp);
  const lineScale = interpolate(frame, [0, 30], [1, 0.08], clamp);
  const ruleScale = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        {noiseLines.map((line, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: 1350,
              top: line.y,
              width: line.width,
              height: index % 3 === 0 ? 5 : 2,
              backgroundColor: line.color,
              opacity: line.opacity,
              transformOrigin: 'right center',
              transform: `scaleX(${lineScale})`,
            }}
          />
        ))}
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 346,
          width: 6,
          height: 300,
          backgroundColor: palette.accent,
          transformOrigin: 'top center',
          transform: `scaleY(${ruleScale})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 150,
          right: 150,
          top: 398,
          opacity: exit,
          clipPath: `inset(0 ${wipe}% 0 0)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            ...typography,
            fontSize: 154,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            transform: `translateX(${textX}px)`,
          }}
        >
          Less noise.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 616,
          width: 250,
          height: 8,
          backgroundColor: palette.accent,
          transformOrigin: 'left center',
          transform: `scaleX(${ruleScale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const MoreFocus: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const focusSpring = spring({
    frame: Math.min(frame, 24),
    fps,
    config: {damping: 18, stiffness: 100, mass: 0.9},
  });
  const ringSpring = spring({
    frame: Math.min(frame, 26),
    fps,
    config: {damping: 22, stiffness: 80, mass: 1.1},
  });
  const textScale = interpolate(focusSpring, [0, 1], [0.78, 1]);
  const textRotation = interpolate(focusSpring, [0, 1], [-2.2, 0]);
  const ringScale = interpolate(ringSpring, [0, 1], [0.35, 1]);
  const exit = interpolate(frame, [82, 89], [1, 0], clamp);

  return (
    <AbsoluteFill style={{opacity: exit}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 610,
          height: 610,
          border: `1px solid ${palette.muted}30`,
          borderRadius: '50%',
          transform: `translate(-50%, -50%) scale(${ringScale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 500,
          height: 500,
          border: `3px solid ${palette.accent}`,
          borderRadius: '50%',
          boxShadow: `0 0 90px ${palette.accent}20`,
          transform: `translate(-50%, -50%) scale(${ringScale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 590,
          right: 590,
          top: '50%',
          height: 2,
          backgroundColor: `${palette.secondary}66`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 280,
          bottom: 280,
          left: '50%',
          width: 2,
          backgroundColor: `${palette.secondary}66`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 20,
          height: 20,
          backgroundColor: palette.accent,
          transform: `translate(-50%, -50%) rotate(45deg) scale(${ringScale})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 458,
          textAlign: 'center',
          transformOrigin: 'center center',
          transform: `scale(${textScale}) rotate(${textRotation}deg)`,
        }}
      >
        <div
          style={{
            ...typography,
            fontSize: 154,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textShadow: `0 8px 50px ${palette.background}`,
          }}
        >
          More focus.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const BetterTogether: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const panelSpring = spring({
    frame: Math.min(frame, 24),
    fps,
    config: {damping: 24, stiffness: 95, mass: 1},
  });
  const textSpring = spring({
    frame: Math.min(frame, 24),
    fps,
    config: {damping: 19, stiffness: 110, mass: 0.85},
  });
  const panelX = interpolate(panelSpring, [0, 1], [-420, 0]);
  const textX = interpolate(textSpring, [0, 1], [510, 0]);
  const tracking = interpolate(textSpring, [0, 1], [16, -2]);
  const ruleScale = interpolate(frame, [8, 28], [0, 1], clamp);
  const exit = interpolate(frame, [82, 89], [1, 0], clamp);

  return (
    <AbsoluteFill style={{opacity: exit}}>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 250,
          width: 1700,
          height: 570,
          backgroundColor: `${palette.secondary}0D`,
          border: `1px solid ${palette.secondary}32`,
          transform: `translateX(${panelX}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 682,
          width: 1400,
          height: 2,
          backgroundColor: `${palette.muted}44`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 674,
          width: 1400,
          height: 18,
          backgroundColor: palette.accent,
          transformOrigin: 'left center',
          transform: `scaleX(${ruleScale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 442,
          textAlign: 'center',
          transform: `translateX(${textX}px)`,
        }}
      >
        <div
          style={{
            ...typography,
            fontSize: 122,
            lineHeight: 1,
            letterSpacing: tracking,
            whiteSpace: 'nowrap',
          }}
        >
          Better work, together.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 130,
          top: 662,
          width: 38,
          height: 38,
          backgroundColor: palette.secondary,
          transform: `rotate(45deg) scale(${ruleScale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const FinalMessage: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const phraseProgress = frame >= 30
    ? 1
    : spring({
        frame,
        fps,
        config: {damping: 22, stiffness: 120, mass: 0.8},
      });
  const relayProgress = frame >= 30
    ? 1
    : spring({
        frame: Math.max(0, frame - 4),
        fps,
        config: {damping: 23, stiffness: 125, mass: 0.85},
      });
  const phraseY = interpolate(phraseProgress, [0, 1], [34, 0]);
  const relayY = interpolate(relayProgress, [0, 1], [-58, 0]);
  const ruleScale = interpolate(phraseProgress, [0, 1], [0, 1]);
  const opacity = frame >= 30 ? 1 : interpolate(frame, [0, 9], [0.35, 1], clamp);

  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 218,
          width: 1400,
          height: 540,
          border: `1px solid ${palette.muted}30`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 284,
          textAlign: 'center',
          transform: `translateY(${phraseY}px)`,
        }}
      >
        <div
          style={{
            ...typography,
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
          }}
        >
          Make room for what matters.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 402,
          textAlign: 'center',
          transform: `translateY(${relayY}px)`,
        }}
      >
        <div
          style={{
            ...typography,
            color: palette.accent,
            fontSize: 220,
            lineHeight: 0.9,
            letterSpacing: -10,
            whiteSpace: 'nowrap',
            textShadow: `0 0 60px ${palette.accent}18`,
          }}
        >
          Relay
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 460,
          top: 684,
          width: 1000,
          height: 6,
          backgroundColor: palette.accent,
          transformOrigin: 'center center',
          transform: `scaleX(${ruleScale})`,
        }}
      />
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(Math.min(frame, 300), [0, 300], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        fontFamily: 'Archivo',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${palette.secondary}14 0%, ${palette.background} 62%)`,
        }}
      />

      <Sequence from={0} durationInFrames={90}>
        <LessNoise />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <MoreFocus />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <BetterTogether />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <FinalMessage />
      </Sequence>

      <SafeCorners />

      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 1028,
          height: 2,
          backgroundColor: `${palette.muted}30`,
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: palette.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
