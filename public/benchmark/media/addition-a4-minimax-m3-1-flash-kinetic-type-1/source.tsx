import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame} from 'remotion';
import {palette} from './contract';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const Background: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle at 82% 18%, ${palette.secondary}18 0%, transparent 36%), radial-gradient(circle at 16% 84%, ${palette.accent}12 0%, transparent 32%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${palette.foreground}09 1px, transparent 1px), linear-gradient(90deg, ${palette.foreground}09 1px, transparent 1px)`,
          backgroundSize: '96px 96px',
          opacity: 0.32,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 180,
          width: 4,
          height: 220,
          borderRadius: 4,
          backgroundColor: palette.accent,
          opacity: 0.72,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 92,
          bottom: 92,
          width: 44,
          height: 4,
          borderRadius: 4,
          backgroundColor: palette.secondary,
          opacity: 0.62,
        }}
      />
    </AbsoluteFill>
  );
};

const LessNoise: React.FC = () => {
  const frame = useCurrentFrame();
  const springProgress = spring({
    frame,
    fps: 30,
    config: {damping: 200, stiffness: 130, mass: 0.8},
  });
  const enter = interpolate(springProgress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [78, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [0, 9, 78, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 140px',
        opacity,
        transform: `translateY(${(1 - enter) * 54 - exit * 28}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 170,
          top: 350,
          width: 380,
          height: 380,
          border: `2px solid ${palette.secondary}45`,
          borderRadius: '50%',
          opacity: (1 - exit) * 0.62,
          transform: `scale(${interpolate(enter, [0, 1], [0.76, 1])})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 245,
          top: 425,
          width: 230,
          height: 230,
          border: `1px solid ${palette.accent}35`,
          borderRadius: '50%',
          opacity: (1 - exit) * 0.48,
          transform: `scale(${interpolate(enter, [0, 1], [0.6, 1])})`,
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'baseline',
          whiteSpace: 'pre',
          fontFamily: 'Archivo',
          fontSize: 190,
          fontWeight: 650,
          lineHeight: 1,
          letterSpacing: -7,
          color: palette.foreground,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: `translate3d(${interpolate(enter, [0, 1], [-74, 0])}px, 0, 0)`,
          }}
        >
          Less
        </span>
        {' '}
        <span
          style={{
            display: 'inline-block',
            color: palette.accent,
            transform: `translate3d(${interpolate(enter, [0, 1], [74, 0])}px, 0, 0)`,
          }}
        >
          noise.
        </span>
      </div>
    </AbsoluteFill>
  );
};

const MoreFocus: React.FC = () => {
  const frame = useCurrentFrame();
  const moreProgress = interpolate(frame, [0, 14], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const focusProgress = interpolate(frame, [4, 18], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ruleProgress = spring({
    frame,
    fps: 30,
    config: {damping: 200, stiffness: 150, mass: 0.7},
  });
  const opacity = interpolate(frame, [0, 7, 78, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const moreOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const focusOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `translateY(${(1 - focusProgress) * 20}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          whiteSpace: 'pre',
          fontFamily: 'Archivo',
          fontSize: 184,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: -8,
        }}
      >
        <span
          style={{
            color: palette.foreground,
            opacity: moreOpacity,
            display: 'inline-block',
            transform: `translate3d(${(1 - moreProgress) * 88}px, 0, 0)`,
          }}
        >
          More
        </span>
        {' '}
        <span
          style={{
            position: 'relative',
            color: palette.accent,
            opacity: focusOpacity,
            display: 'inline-block',
            clipPath: `inset(0 ${(1 - focusProgress) * 100}% 0 0)`,
          }}
        >
          focus.
        </span>
      </div>
      <div
        style={{
          marginTop: 36,
          width: 520,
          height: 6,
          borderRadius: 6,
          backgroundColor: palette.secondary,
          transform: `scaleX(${interpolate(ruleProgress, [0, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
          transformOrigin: 'left center',
          opacity: 0.82,
        }}
      />
    </AbsoluteFill>
  );
};

const BetterTogether: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [78, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const first = interpolate(frame, [0, 10], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const second = interpolate(frame, [4, 14], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const third = interpolate(frame, [8, 18], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const firstOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const secondOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const thirdOpacity = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rule = interpolate(frame, [4, 22], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 1 - exit,
        transform: `translateX(${exit * 90}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          whiteSpace: 'pre',
          fontFamily: 'Archivo',
          fontSize: 142,
          fontWeight: 650,
          lineHeight: 1,
          letterSpacing: -5,
        }}
      >
        <span
          style={{
            color: palette.foreground,
            opacity: firstOpacity,
            display: 'inline-block',
            transform: `translate3d(0, ${(1 - first) * 58}px, 0)`,
          }}
        >
          Better
        </span>
        {' '}
        <span
          style={{
            color: palette.foreground,
            opacity: secondOpacity,
            display: 'inline-block',
            transform: `translate3d(0, ${(1 - second) * 58}px, 0)`,
          }}
        >
          work,
        </span>
        {' '}
        <span
          style={{
            color: palette.accent,
            opacity: thirdOpacity,
            display: 'inline-block',
            transform: `translate3d(0, ${(1 - third) * 58}px, 0)`,
          }}
        >
          together.
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 650,
          width: 860,
          height: 4,
          borderRadius: 4,
          backgroundColor: palette.secondary,
          opacity: 0.58,
          transform: `scaleX(${rule})`,
          transformOrigin: 'center center',
        }}
      />
    </AbsoluteFill>
  );
};

const FinalMessage: React.FC = () => {
  const frame = useCurrentFrame();
  const markerProgress = interpolate(frame, [0, 12], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineProgress = interpolate(frame, [0, 12], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const relayProgress = interpolate(frame, [12, 30], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underlineProgress = interpolate(frame, [14, 30], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const relayOpacity = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: 'Archivo',
        }}
      >
        <div
          style={{
            width: 120,
            height: 5,
            borderRadius: 5,
            backgroundColor: palette.secondary,
            opacity: markerProgress,
            transform: `scaleX(${markerProgress})`,
            transformOrigin: 'center center',
            marginBottom: 34,
          }}
        />
        <div
          style={{
            fontSize: 88,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: -2,
            color: palette.foreground,
            opacity: taglineOpacity,
            transform: `translateY(${(1 - taglineProgress) * -24}px)`,
            whiteSpace: 'pre',
          }}
        >
          Make room for what matters.
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 280,
            fontWeight: 750,
            lineHeight: 0.95,
            letterSpacing: -13,
            color: palette.accent,
            opacity: relayOpacity,
            transform: `translateY(${(1 - relayProgress) * 48}px)`,
          }}
        >
          Relay
        </div>
        <div
          style={{
            marginTop: 30,
            width: 560,
            height: 8,
            borderRadius: 8,
            backgroundColor: palette.accent,
            opacity: underlineProgress * 0.88,
            transform: `scaleX(${underlineProgress})`,
            transformOrigin: 'center center',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: palette.background}}>
      <Background />
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
    </AbsoluteFill>
  );
};
