import * as React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {palette} from './contract';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({
    frame,
    fps,
    config: {damping: 18, stiffness: 135, mass: 0.85},
  });
  const sceneOpacity = interpolate(
    frame,
    [0, 10, 76, 90],
    [0, 1, 1, 0],
    clamp,
  );
  const badgeOpacity = interpolate(frame, [7, 19], [0, 1], clamp);
  const markerHeights = [54, 78, 104, 84, 132];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        fontFamily: 'Archivo',
        opacity: sceneOpacity,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          border: `2px solid ${palette.secondary}24`,
          right: 90,
          top: 70,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          backgroundColor: `${palette.accent}0D`,
          right: 240,
          top: 220,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 176,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: badgeOpacity,
          transform: `translateY(${(1 - entrance) * 18}px)`,
        }}
      >
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: palette.accent,
          }}
        />
        <div
          style={{
            fontSize: 30,
            fontWeight: 650,
            letterSpacing: 1.2,
            color: palette.muted,
          }}
        >
          Illustrative data
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          top: 286,
          fontSize: 116,
          lineHeight: 1.02,
          fontWeight: 760,
          letterSpacing: -4.5,
          transform: `translateY(${(1 - entrance) * 54}px)`,
        }}
      >
        A week with more focus
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          bottom: 116,
          height: 164,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 34,
        }}
      >
        {markerHeights.map((height, index) => {
          const markerProgress = interpolate(
            frame,
            [12 + index * 5, 42 + index * 5],
            [0, 1],
            {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            },
          );
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height,
                borderRadius: '18px 18px 6px 6px',
                backgroundColor:
                  index === markerHeights.length - 1
                    ? palette.accent
                    : `${palette.secondary}55`,
                transform: `scaleY(${markerProgress})`,
                transformOrigin: 'bottom',
                opacity: 0.35 + markerProgress * 0.65,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneOpacity = interpolate(
    frame,
    [0, 10, 168, 180],
    [0, 1, 1, 0],
    clamp,
  );
  const titleProgress = spring({
    frame,
    fps: 30,
    config: {damping: 20, stiffness: 150, mass: 0.8},
  });
  const plotTop = 270;
  const baseline = 820;
  const plotHeight = baseline - plotTop;
  const maxValue = 6;
  const centers = [360, 680, 1000, 1320, 1640];
  const barWidth = 172;
  const days = [
    {label: 'Monday', value: 2},
    {label: 'Tuesday', value: 3},
    {label: 'Wednesday', value: 4},
    {label: 'Thursday', value: 3},
    {label: 'Friday', value: 5},
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        fontFamily: 'Archivo',
        opacity: sceneOpacity,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 94,
          fontSize: 70,
          lineHeight: 1,
          fontWeight: 740,
          letterSpacing: -2.5,
          transform: `translateY(${(1 - titleProgress) * 24}px)`,
        }}
      >
        Focus hours
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 106,
          padding: '11px 20px',
          borderRadius: 999,
          border: `1px solid ${palette.muted}55`,
          color: palette.muted,
          fontSize: 25,
          fontWeight: 620,
          letterSpacing: 0.5,
        }}
      >
        Illustrative data
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 218,
          color: palette.muted,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 2.2,
        }}
      >
        HOURS
      </div>

      {[0, 2, 4, 6].map((value) => {
        const y = baseline - (value / maxValue) * plotHeight;
        return (
          <React.Fragment key={value}>
            <div
              style={{
                position: 'absolute',
                left: 220,
                right: 140,
                top: y,
                height: value === 0 ? 2 : 1,
                backgroundColor:
                  value === 0 ? `${palette.foreground}55` : `${palette.muted}24`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 110,
                top: y - 16,
                width: 72,
                textAlign: 'right',
                color: palette.muted,
                fontSize: 23,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </div>
          </React.Fragment>
        );
      })}

      {days.map((day, index) => {
        const start = 10 + index * 5;
        const progress = interpolate(
          frame,
          [start, start + 42],
          [0, 1],
          {
            ...clamp,
            easing: Easing.out(Easing.cubic),
          },
        );
        const finalHeight = (day.value / maxValue) * plotHeight;
        const height = finalHeight * progress;
        const top = baseline - height;
        const valueOpacity = interpolate(
          frame,
          [start + 12, start + 24],
          [0, 1],
          clamp,
        );
        const labelOpacity = interpolate(
          frame,
          [start + 6, start + 18],
          [0, 1],
          clamp,
        );
        const finalTop = baseline - finalHeight;

        return (
          <React.Fragment key={day.label}>
            <div
              style={{
                position: 'absolute',
                left: centers[index] - barWidth / 2,
                top,
                width: barWidth,
                height,
                borderRadius: '14px 14px 3px 3px',
                backgroundColor:
                  index === days.length - 1
                    ? palette.accent
                    : palette.secondary,
                boxShadow:
                  index === days.length - 1
                    ? `0 18px 48px ${palette.accent}20`
                    : `0 14px 36px ${palette.secondary}12`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: centers[index] - 120,
                width: 240,
                top: finalTop - 61,
                textAlign: 'center',
                color: palette.foreground,
                fontSize: 38,
                lineHeight: 1,
                fontWeight: 760,
                fontVariantNumeric: 'tabular-nums',
                opacity: valueOpacity,
                transform: `translateY(${(1 - progress) * 10}px)`,
              }}
            >
              {day.value}
            </div>
            <div
              style={{
                position: 'absolute',
                left: centers[index] - 120,
                width: 240,
                top: 854,
                textAlign: 'center',
                color: palette.foreground,
                fontSize: 31,
                lineHeight: 1.1,
                fontWeight: 650,
                opacity: labelOpacity,
                transform: `translateY(${(1 - labelOpacity) * 12}px)`,
              }}
            >
              {day.label}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const phraseEntrance = spring({
    frame,
    fps,
    config: {damping: 19, stiffness: 145, mass: 0.85},
  });
  const relayEntrance = spring({
    frame,
    fps,
    delay: 5,
    config: {damping: 18, stiffness: 155, mass: 0.8},
  });
  const phraseOpacity = interpolate(frame, [0, 7], [0, 1], clamp);
  const relayOpacity = interpolate(frame, [3, 11], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        fontFamily: 'Archivo',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 78% 42%, ${palette.accent}12, transparent 34%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          top: 220,
          bottom: 176,
          borderRadius: 36,
          border: `1px solid ${palette.foreground}18`,
          background: `linear-gradient(135deg, ${palette.foreground}0A, ${palette.secondary}12)`,
          boxShadow: `0 36px 100px ${palette.background}88`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 12,
            height: '100%',
            backgroundColor: palette.accent,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 102,
            color: palette.foreground,
            fontSize: 100,
            lineHeight: 1.06,
            fontWeight: 690,
            letterSpacing: -3.2,
            whiteSpace: 'nowrap',
            opacity: phraseOpacity,
            transform: `translateY(${(1 - phraseEntrance) * 34}px)`,
          }}
        >
          17 hours of focused work
        </div>
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 274,
            color: palette.accent,
            fontSize: 182,
            lineHeight: 0.96,
            fontWeight: 820,
            letterSpacing: -8,
            opacity: relayOpacity,
            transform: `translateY(${(1 - relayEntrance) * 42}px)`,
          }}
        >
          Relay
        </div>
        <div
          style={{
            position: 'absolute',
            right: 78,
            bottom: 62,
            width: 250,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: relayOpacity,
          }}
        >
          <div
            style={{
              width: 170,
              height: 6,
              borderRadius: 3,
              backgroundColor: palette.accent,
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: palette.secondary,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        fontFamily: 'Archivo',
      }}
    >
      <Sequence from={0} durationInFrames={90} name='Introduction'>
        <IntroScene />
      </Sequence>
      <Sequence from={90} durationInFrames={180} name='Focus hours chart'>
        <ChartScene />
      </Sequence>
      <Sequence from={270} durationInFrames={90} name='Final message'>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  );
};
