import type {CSSProperties} from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame} from 'remotion';
import {palette} from './contract';

const FPS = 30;

const chartData = [
  {day: 'Monday', value: 2},
  {day: 'Tuesday', value: 3},
  {day: 'Wednesday', value: 4},
  {day: 'Thursday', value: 3},
  {day: 'Friday', value: 5},
] as const;

const rootStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  backgroundColor: palette.background,
  color: palette.foreground,
  fontFamily: 'Archivo',
};

const gridBackground: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(' +
    palette.foreground +
    '08 1px, transparent 1px), linear-gradient(90deg, ' +
    palette.foreground +
    '08 1px, transparent 1px)',
  backgroundSize: '80px 80px',
};

function IntroScene() {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [76, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = enter * exit;
  const titleY = interpolate(enter, [0, 1], [42, 0]);
  const lineWidth = interpolate(frame, [16, 52], [0, 620], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={gridBackground} />
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 210,
          width: 8,
          height: 430,
          borderRadius: 8,
          backgroundColor: palette.accent,
          transform: 'scaleY(' + enter + ')',
          transformOrigin: 'top',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 210,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: interpolate(frame, [6, 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: 'translateY(' + interpolate(enter, [0, 1], [18, 0]) + 'px)',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: palette.secondary,
          }}
        />
        <div
          style={{
            color: palette.muted,
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Illustrative data
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 285,
          width: 1450,
          fontSize: 112,
          lineHeight: 0.98,
          fontWeight: 760,
          letterSpacing: '-0.045em',
          transform: 'translateY(' + titleY + 'px)',
        }}
      >
        <div>A week with</div>
        <div style={{color: palette.accent}}>more focus</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 575,
          height: 5,
          width: lineWidth,
          borderRadius: 4,
          backgroundColor: palette.secondary,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 614,
          display: 'flex',
          gap: 18,
          opacity: interpolate(frame, [28, 44], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            style={{
              width: 54,
              height: 5,
              borderRadius: 4,
              backgroundColor:
                item === 4 ? palette.accent : palette.muted + '66',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function ChartScene() {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0.25, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [171, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sceneOpacity = enter * exit;
  const headerOpacity = interpolate(frame, [2, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dayOpacity = interpolate(frame, [10, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const plotLeft = 60;
  const plotWidth = 1460;
  const baseline = 520;
  const axisTop = 120;
  const axisHeight = baseline - axisTop;
  const unit = axisHeight / 5;
  const slotWidth = plotWidth / chartData.length;
  const barWidth = 150;

  return (
    <AbsoluteFill style={{opacity: sceneOpacity}}>
      <div style={gridBackground} />
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 108,
          right: 200,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          opacity: headerOpacity,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1,
              fontWeight: 740,
              letterSpacing: '-0.035em',
            }}
          >
            Focus hours
          </div>
          <div
            style={{
              marginTop: 18,
              color: palette.muted,
              fontSize: 23,
              fontWeight: 560,
              letterSpacing: '0.05em',
            }}
          >
            Illustrative data
          </div>
        </div>
        <div
          style={{
            padding: '12px 18px',
            border: '1px solid ' + palette.muted + '44',
            borderRadius: 999,
            color: palette.secondary,
            fontSize: 18,
            fontWeight: 650,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          0–5 hours · linear scale
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 235,
          width: 1520,
          height: 620,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((tick) => {
          const y = baseline - tick * unit;
          const isBaseline = tick === 0;
          return (
            <div key={tick}>
              <div
                style={{
                  position: 'absolute',
                  left: plotLeft,
                  top: y,
                  width: plotWidth,
                  height: isBaseline ? 3 : 1,
                  backgroundColor: isBaseline
                    ? palette.accent
                    : palette.muted + '2E',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: y,
                  width: 46,
                  textAlign: 'right',
                  color: isBaseline ? palette.foreground : palette.muted,
                  fontSize: 20,
                  lineHeight: 1,
                  fontWeight: 650,
                  fontVariantNumeric: 'tabular-nums',
                  transform: 'translateY(-50%)',
                }}
              >
                {tick}
              </div>
            </div>
          );
        })}

        {chartData.map((item, index) => {
          const delay = index * 4;
          const rawProgress = spring({
            frame: Math.max(0, frame - delay),
            fps: FPS,
            durationInFrames: 34,
            config: {
              damping: 200,
              stiffness: 130,
              mass: 0.8,
            },
          });
          const progress = Math.min(1, Math.max(0, rawProgress));
          const barHeight = item.value * unit * progress;
          const barLeft = plotLeft + index * slotWidth + (slotWidth - barWidth) / 2;
          const barCenter = plotLeft + index * slotWidth + slotWidth / 2;
          const valueOpacity = interpolate(
            frame,
            [delay + 18, delay + 26],
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            },
          );
          const valueTop = baseline - item.value * unit - 58;

          return (
            <div key={item.day}>
              <div
                style={{
                  position: 'absolute',
                  left: barLeft,
                  top: baseline - barHeight,
                  width: barWidth,
                  height: barHeight,
                  borderRadius: '18px 18px 0 0',
                  background:
                    'linear-gradient(180deg, ' +
                    palette.accent +
                    ', ' +
                    palette.accent +
                    'C7)',
                  boxShadow: '0 18px 48px ' + palette.accent + '18',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: barLeft - 13,
                  top: valueTop,
                  width: 176,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  border: '1px solid ' + palette.accent + '80',
                  backgroundColor: palette.background,
                  color: palette.foreground,
                  fontSize: 22,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  opacity: valueOpacity,
                  transform:
                    'translateY(' +
                    interpolate(valueOpacity, [0, 1], [10, 0]) +
                    'px)',
                }}
              >
                {item.value} hours
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: barCenter - 100,
                  top: 548,
                  width: 200,
                  textAlign: 'center',
                  color: palette.muted,
                  fontSize: 26,
                  lineHeight: 1.2,
                  fontWeight: 620,
                  opacity: dayOpacity,
                  transform:
                    'translateY(' +
                    interpolate(dayOpacity, [0, 1], [12, 0]) +
                    'px)',
                }}
              >
                {item.day}
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 594,
            width: 1520,
            color: palette.muted,
            fontSize: 17,
            fontWeight: 650,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: dayOpacity * 0.8,
          }}
        >
          Hours
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FinalScene() {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 12], [0.35, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [0, 12], [28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const relayProgress = spring({
    frame,
    fps: FPS,
    durationInFrames: 22,
    config: {
      damping: 200,
      stiffness: 120,
      mass: 0.8,
    },
  });
  const relayScale = interpolate(relayProgress, [0, 1], [0.86, 1]);
  const ringScale = interpolate(relayProgress, [0, 1], [0.78, 1]);

  return (
    <AbsoluteFill>
      <div style={gridBackground} />
      <div
        style={{
          position: 'absolute',
          left: 650,
          top: 210,
          width: 620,
          height: 620,
          borderRadius: 310,
          border: '2px solid ' + palette.secondary + '24',
          boxShadow: '0 0 100px ' + palette.secondary + '0D',
          transform: 'scale(' + ringScale + ')',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 224,
          textAlign: 'center',
          color: palette.muted,
          fontSize: 22,
          fontWeight: 650,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          opacity: titleOpacity,
        }}
      >
        Illustrative data
      </div>
      <div
        style={{
          position: 'absolute',
          left: 160,
          right: 160,
          top: 342,
          textAlign: 'center',
          color: palette.foreground,
          fontSize: 96,
          lineHeight: 1.05,
          fontWeight: 720,
          letterSpacing: '-0.04em',
          opacity: titleOpacity,
          transform: 'translateY(' + titleY + 'px)',
        }}
      >
        17 hours of focused work
      </div>
      <div
        style={{
          position: 'absolute',
          left: 250,
          top: 515,
          width: 1420,
          height: 5,
          borderRadius: 4,
          backgroundColor: palette.secondary + '66',
          transform: 'scaleX(' + ringScale + ')',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 570,
          textAlign: 'center',
          color: palette.accent,
          fontSize: 164,
          lineHeight: 1,
          fontWeight: 820,
          letterSpacing: '0.055em',
          opacity: relayProgress,
          transform: 'scale(' + relayScale + ')',
        }}
      >
        Relay
      </div>
    </AbsoluteFill>
  );
}

export const BenchmarkVideo = () => {
  return (
    <AbsoluteFill style={rootStyle}>
      <Sequence from={0} durationInFrames={90} premountFor={30}>
        <IntroScene />
      </Sequence>
      <Sequence from={90} durationInFrames={180} premountFor={30}>
        <ChartScene />
      </Sequence>
      <Sequence from={270} durationInFrames={90} premountFor={30}>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  );
};