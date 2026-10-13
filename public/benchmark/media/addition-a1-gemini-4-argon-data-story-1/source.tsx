import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { palette } from "./contract";

const FONT_FAMILY = '"Archivo", sans-serif';

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface DayFocusDatum {
  day: string;
  hours: number;
}

const FOCUS_DATA: DayFocusDatum[] = [
  { day: "Monday", hours: 2 },
  { day: "Tuesday", hours: 3 },
  { day: "Wednesday", hours: 4 },
  { day: "Thursday", hours: 3 },
  { day: "Friday", hours: 5 },
];

const SCALE_TICKS = [0, 1, 2, 3, 4, 5];
const MAX_HOURS = 5;

const AmbientBackdrop: React.FC<{ frame: number }> = ({ frame }) => {
  const glowShiftX = interpolate(frame, [0, 360], [-40, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowShiftY = interpolate(frame, [0, 360], [-20, 25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${50 + glowShiftX * 0.15}% ${38 + glowShiftY * 0.15}%, ${withAlpha(
            palette.secondary,
            0.11
          )} 0%, ${withAlpha(palette.accent, 0.05)} 34%, ${withAlpha(
            palette.background,
            0
          )} 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 80,
          border: `1px solid ${withAlpha(palette.muted, 0.12)}`,
          borderRadius: 24,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const IntroSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeIn = spring({
    frame,
    fps,
    config: {
      damping: 24,
      stiffness: 190,
      mass: 0.7,
      overshootClamping: true,
    },
  });

  const titleIn = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: {
      damping: 24,
      stiffness: 180,
      mass: 0.75,
      overshootClamping: true,
    },
  });

  const lineProgress = interpolate(frame, [6, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitOpacity = interpolate(frame, [78, 89], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitTranslateY = interpolate(frame, [78, 89], [0, -18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: 120,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
        transform: `translateY(${exitTranslateY}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 1400,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 24px",
            borderRadius: 999,
            backgroundColor: withAlpha(palette.secondary, 0.1),
            border: `1.5px solid ${withAlpha(palette.secondary, 0.38)}`,
            marginBottom: 36,
            opacity: badgeIn,
            transform: `translateY(${interpolate(badgeIn, [0, 1], [16, 0])}px)`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: palette.secondary,
              boxShadow: `0 0 12px ${withAlpha(palette.secondary, 0.8)}`,
            }}
          />
          <span
            style={{
              color: palette.foreground,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            Illustrative data
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            color: palette.foreground,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [24, 0])}px)`,
          }}
        >
          A week with more focus
        </h1>

        <div
          style={{
            marginTop: 44,
            width: 360,
            height: 6,
            borderRadius: 999,
            backgroundColor: withAlpha(palette.muted, 0.18),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${lineProgress * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${palette.secondary} 0%, ${palette.accent} 100%)`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ChartSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const containerOut = interpolate(frame, [168, 179], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chartHeight = 520;
  const pixelsPerHour = chartHeight / MAX_HOURS; // 104px per unit on linear 0..5 scale

  return (
    <AbsoluteFill
      style={{
        paddingLeft: 130,
        paddingRight: 130,
        paddingTop: 110,
        paddingBottom: 110,
        fontFamily: FONT_FAMILY,
        opacity: containerIn * containerOut,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Header inside Safe Margin */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            color: palette.foreground,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          A week with more focus
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 20px",
            borderRadius: 999,
            backgroundColor: withAlpha(palette.secondary, 0.1),
            border: `1px solid ${withAlpha(palette.secondary, 0.35)}`,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: palette.secondary,
            }}
          />
          <span
            style={{
              color: palette.muted,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Illustrative data
          </span>
        </div>
      </div>

      {/* Chart Plot Region */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: chartHeight + 130,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {/* Plot Area with Common Zero Baseline and Linear Grid */}
        <div
          style={{
            position: "relative",
            marginLeft: 70,
            height: chartHeight,
            width: "calc(100% - 70px)",
          }}
        >
          {/* Horizontal Linear Scale Gridlines (0 to 5) */}
          {SCALE_TICKS.map((tick) => {
            const bottomOffset = tick * pixelsPerHour;
            const isZeroBaseline = tick === 0;
            return (
              <div
                key={tick}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: bottomOffset,
                  height: isZeroBaseline ? 2 : 1,
                  backgroundColor: isZeroBaseline
                    ? withAlpha(palette.foreground, 0.55)
                    : withAlpha(palette.muted, 0.18),
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: -56,
                    top: -14,
                    width: 36,
                    textAlign: "right",
                    color: isZeroBaseline ? palette.foreground : palette.muted,
                    fontSize: 22,
                    fontWeight: isZeroBaseline ? 700 : 500,
                  }}
                >
                  {tick}
                </span>
              </div>
            );
          })}

          {/* Bars Container Anchored to Common Zero Baseline (bottom: 0) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
               flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-around",
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            {FOCUS_DATA.map((item, index) => {
              const delay = 6 + index * 5;
              const barProgress = spring({
                frame: Math.max(0, frame - delay),
                fps,
                config: {
                  damping: 24,
                  stiffness: 185,
                  mass: 0.7,
                  overshootClamping: true,
                },
              });

              const labelOpacity = interpolate(
                frame,
                [delay + 6, delay + 18],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }
              );

              const targetHeight = item.hours * pixelsPerHour;
              const currentHeight = targetHeight * barProgress;
              const isPeak = item.hours === MAX_HOURS;

              return (
                <div
                  key={item.day}
                  style={{
                    position: "relative",
                    width: 170,
                    height: "100%",
                    display: "flex",
                     flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  {/* Exact Value Pill Positioned Above Bar */}
                  <div
                    style={{
                      marginBottom: 14,
                      padding: "6px 20px",
                      borderRadius: 12,
                      backgroundColor: isPeak
                        ? withAlpha(palette.accent, 0.18)
                        : withAlpha(palette.secondary, 0.15),
                      border: `1.5px solid ${
                        isPeak
                          ? withAlpha(palette.accent, 0.7)
                          : withAlpha(palette.secondary, 0.5)
                      }`,
                      color: isPeak ? palette.accent : palette.foreground,
                      fontSize: 36,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      opacity: labelOpacity,
                      transform: `translateY(${interpolate(
                        labelOpacity,
                        [0, 1],
                        [10, 0]
                      )}px)`,
                    }}
                  >
                    {item.hours}
                  </div>

                  {/* Animated Bar from Common Zero Baseline */}
                  <div
                    style={{
                      width: "100%",
                      height: currentHeight,
                      borderTopLeftRadius: 14,
                      borderTopRightRadius: 14,
                      background: isPeak
                        ? `linear-gradient(180deg, ${palette.accent} 0%, ${withAlpha(
                            palette.accent,
                            0.32
                          )} 100%)`
                        : `linear-gradient(180deg, ${palette.secondary} 0%, ${withAlpha(
                            palette.secondary,
                            0.28
                          )} 100%)`,
                      borderTop: `4px solid ${
                        isPeak ? palette.accent : palette.secondary
                      }`,
                      boxShadow: isPeak
                        ? `0 -8px 28px ${withAlpha(palette.accent, 0.25)}`
                        : `0 -6px 20px ${withAlpha(palette.secondary, 0.18)}`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Labels Row Below Common Zero Baseline */}
        <div
          style={{
            marginLeft: 70,
            width: "calc(100% - 70px)",
            height: 76,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          {FOCUS_DATA.map((item, index) => {
            const dayIn = interpolate(
              frame,
              [4 + index * 4, 16 + index * 4],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            return (
              <div
                key={item.day}
                style={{
                  width: 170,
                  textAlign: "center",
                  color: palette.foreground,
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  opacity: dayIn,
                  transform: `translateY(${interpolate(
                    dayIn,
                    [0, 1],
                    [8, 0]
                  )}px)`,
                }}
              >
                {item.day}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const summaryIn = spring({
    frame,
    fps,
    config: {
      damping: 24,
      stiffness: 195,
      mass: 0.7,
      overshootClamping: true,
    },
  });

  const brandIn = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: {
      damping: 24,
      stiffness: 195,
      mass: 0.7,
      overshootClamping: true,
    },
  });

  return (
    <AbsoluteFill
      style={{
        padding: 120,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 1500,
        }}
      >
        {/* Proportional 5-day segmented bar summing to 17 units */}
        <div
          style={{
            display: "flex",
            gap: 10,
            width: 520,
            height: 12,
            marginBottom: 44,
            opacity: summaryIn,
            transform: `scaleX(${interpolate(summaryIn, [0, 1], [0.85, 1])})`,
          }}
        >
          {FOCUS_DATA.map((item) => (
            <div
              key={item.day}
              style={{
                flex: item.hours,
                height: "100%",
                borderRadius: 999,
                backgroundColor:
                  item.hours === MAX_HOURS
                    ? palette.accent
                    : palette.secondary,
              }}
            />
          ))}
        </div>

        {/* Main Final Headline */}
        <h1
          style={{
            margin: 0,
            color: palette.foreground,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            opacity: summaryIn,
            transform: `translateY(${interpolate(
              summaryIn,
              [0, 1],
              [22, 0]
            )}px)`,
          }}
        >
          17 hours of focused work
        </h1>

        {/* Relay Brand Sign-off */}
        <div
          style={{
            marginTop: 52,
            display: "inline-flex",
            alignItems: "center",
            gap: 20,
            padding: "16px 40px",
            borderRadius: 999,
            backgroundColor: withAlpha(palette.accent, 0.1),
            border: `2px solid ${withAlpha(palette.accent, 0.55)}`,
            opacity: brandIn,
            transform: `translateY(${interpolate(
              brandIn,
              [0, 1],
              [18, 0]
            )}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 12,
                height: 28,
                borderRadius: 4,
                backgroundColor: palette.secondary,
                transform: "skewX(-16deg)",
              }}
            />
            <span
              style={{
                width: 12,
                height: 28,
                borderRadius: 4,
                backgroundColor: palette.accent,
                transform: "skewX(-16deg)",
              }}
            />
          </div>
          <span
            style={{
              color: palette.foreground,
              fontSize: 54,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Relay
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        color: palette.foreground,
        fontFamily: FONT_FAMILY,
      }}
    >
      <AmbientBackdrop frame={frame} />

      <Sequence from={0} durationInFrames={90}>
        <IntroSequence />
      </Sequence>

      <Sequence from={90} durationInFrames={180}>
        <ChartSequence />
      </Sequence>

      <Sequence from={270} durationInFrames={90}>
        <OutroSequence />
      </Sequence>
    </AbsoluteFill>
  );
};
