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

const FONT_FAMILY = "'Archivo', sans-serif";

interface DayDatum {
  day: string;
  hours: number;
  isPeak?: boolean;
}

const WEEK_DATA: DayDatum[] = [
  { day: "Monday", hours: 2 },
  { day: "Tuesday", hours: 3 },
  { day: "Wednesday", hours: 4 },
  { day: "Thursday", hours: 3 },
  { day: "Friday", hours: 5, isPeak: true },
];

const Y_TICKS = [0, 1, 2, 3, 4, 5];

const AmbientBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const glowX = interpolate(frame, [0, 180, 360], [28, 52, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowY = interpolate(frame, [0, 180, 360], [36, 48, 42], {
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
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${palette.secondary}14 0%, ${palette.accent}08 28%, transparent 65%)`,
        }}
      />
      <svg
        width={1920}
        height={1080}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
        }}
      >
        <defs>
          <pattern
            id="relay-grid"
            width={80}
            height={80}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke={palette.muted}
              strokeWidth={1}
              strokeOpacity={0.35}
            />
          </pattern>
        </defs>
        <rect width={1920} height={1080} fill="url(#relay-grid)" />
      </svg>
    </AbsoluteFill>
  );
};

const IllustrativeBadge: React.FC<{ opacity?: number }> = ({
  opacity = 1,
}) => {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        borderRadius: 999,
        border: `1px solid ${palette.muted}40`,
        backgroundColor: `${palette.background}CC`,
        opacity,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: palette.secondary,
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: palette.muted,
        }}
      >
        Illustrative data
      </span>
    </div>
  );
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeProgress = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 160, mass: 0.8 },
  });

  const titleProgress = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 22, stiffness: 150, mass: 0.9 },
  });

  const lineProgress = interpolate(frame, [10, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitOpacity = interpolate(frame, [76, 89], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitTranslateY = interpolate(frame, [76, 89], [0, -24], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeTranslateY = interpolate(badgeProgress, [0, 1], [20, 0]);
  const titleTranslateY = interpolate(titleProgress, [0, 1], [32, 0]);

  return (
    <AbsoluteFill
      style={{
        padding: "120px 140px",
        justifyContent: "center",
        opacity: exitOpacity,
        transform: `translateY(${exitTranslateY}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 36,
          maxWidth: 1400,
        }}
      >
        <div
          style={{
            opacity: badgeProgress,
            transform: `translateY(${badgeTranslateY}px)`,
          }}
        >
          <IllustrativeBadge />
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: FONT_FAMILY,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            color: palette.foreground,
            opacity: titleProgress,
            transform: `translateY(${titleTranslateY}px)`,
          }}
        >
          A week with{" "}
          <span style={{ color: palette.accent }}>more focus</span>
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
          }}
        >
          {WEEK_DATA.map((item, idx) => {
            const dotSpring = spring({
              frame: Math.max(0, frame - 12 - idx * 3),
              fps,
              config: { damping: 20, stiffness: 180 },
            });
            return (
              <div
                key={item.day}
                style={{
                  width: 96,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor:
                    idx === 4 ? palette.accent : `${palette.secondary}88`,
                  transform: `scaleX(${dotSpring})`,
                  transformOrigin: "left center",
                  opacity: lineProgress,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneEnter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sceneExit = interpolate(frame, [166, 179], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sceneOpacity = sceneEnter * sceneExit;

  // Strict linear scale geometry:
  // Common zero baseline at y = 800, top at y = 260 => 540px total height for 5 hours (108px per hour).
  const chartTop = 260;
  const chartBottom = 800;
  const maxHours = 5;
  const unitHeight = (chartBottom - chartTop) / maxHours; // Exactly 108px per 1 unit
  const plotLeft = 240;
  const plotRight = 1760;
  const plotWidth = plotRight - plotLeft; // 1520px
  const colWidth = plotWidth / WEEK_DATA.length; // 304px
  const barWidth = 144;

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
      }}
    >
      {/* Top Header within 80px safe margin */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 140,
          right: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: palette.foreground,
          }}
        >
          A week with more focus
        </div>
        <IllustrativeBadge />
      </div>

      {/* Horizontal Linear Scale Gridlines & Y-Axis Ticks */}
      {Y_TICKS.map((tick) => {
        const y = chartBottom - tick * unitHeight;
        const isZeroBaseline = tick === 0;
        return (
          <React.Fragment key={tick}>
            <div
              style={{
                position: "absolute",
                left: 140,
                top: y - 16,
                width: 72,
                textAlign: "right",
                fontFamily: FONT_FAMILY,
                fontSize: 24,
                fontWeight: isZeroBaseline ? 700 : 500,
                color: isZeroBaseline ? palette.foreground : palette.muted,
              }}
            >
              {tick}
            </div>
            <div
              style={{
                position: "absolute",
                left: plotLeft,
                top: y,
                width: plotWidth,
                height: isZeroBaseline ? 2 : 1,
                backgroundColor: isZeroBaseline
                  ? `${palette.foreground}99`
                  : `${palette.muted}2E`,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Bars, Exact Values, and Day Labels */}
      {WEEK_DATA.map((item, index) => {
        const delay = 8 + index * 6;
        const rawSpring = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 24, stiffness: 170, mass: 0.85 },
        });

        // Guarantee 100% settled state by frame 66 (over 3.3s before scene exit)
        const settleLock = interpolate(frame, [60, 66], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const growth = rawSpring * (1 - settleLock) + 1 * settleLock;

        const exactBarHeight = item.hours * unitHeight;
        const currentBarHeight = exactBarHeight * growth;
        const barTop = chartBottom - currentBarHeight;
        const colCenter = plotLeft + index * colWidth + colWidth / 2;
        const barLeft = colCenter - barWidth / 2;

        const labelOpacity = interpolate(
          frame,
          [delay + 6, Math.min(64, delay + 22)],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );

        const dayLabelOpacity = interpolate(frame, [4 + index * 3, 20 + index * 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const barColor = item.isPeak ? palette.accent : palette.secondary;

        return (
          <React.Fragment key={item.day}>
            {/* Bar sitting on common zero baseline (chartBottom = 800) */}
            <div
              style={{
                position: "absolute",
                left: barLeft,
                top: barTop,
                width: barWidth,
                height: currentBarHeight,
                backgroundColor: barColor,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                boxShadow: item.isPeak
                  ? `0 0 36px ${palette.accent}33`
                  : `0 0 24px ${palette.secondary}22`,
              }}
            />

            {/* Exact Numeric Value above bar */}
            <div
              style={{
                position: "absolute",
                left: colCenter - 100,
                width: 200,
                top: barTop - 58,
                textAlign: "center",
                fontFamily: FONT_FAMILY,
                fontSize: 42,
                fontWeight: 700,
                color: item.isPeak ? palette.accent : palette.foreground,
                opacity: labelOpacity,
              }}
            >
              {item.hours}
            </div>

            {/* Day Label below common zero baseline */}
            <div
              style={{
                position: "absolute",
                left: colCenter - 140,
                width: 280,
                top: chartBottom + 24,
                textAlign: "center",
                fontFamily: FONT_FAMILY,
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: palette.foreground,
                opacity: dayLabelOpacity,
              }}
            >
              {item.day}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const SummaryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Settles completely by local frame 18 (frame 288), remaining static for 72 frames (2.4s > 2.0s)
  const entranceSpring = spring({
    frame,
    fps,
    config: { damping: 24, stiffness: 190, mass: 0.8 },
  });

  const settleLock = interpolate(frame, [14, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = entranceSpring * (1 - settleLock) + 1 * settleLock;
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(progress, [0, 1], [28, 0]);

  return (
    <AbsoluteFill
      style={{
        padding: "120px 140px",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 36,
          maxWidth: 1500,
        }}
      >
        {/* Relay Brand Identity */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            padding: "14px 32px",
            borderRadius: 999,
            backgroundColor: `${palette.foreground}0D`,
            border: `1px solid ${palette.muted}38`,
          }}
        >
          <svg width={36} height={36} viewBox="0 0 36 36">
            <rect
              x={4}
              y={18}
              width={7}
              height={14}
              rx={3.5}
              fill={palette.secondary}
            />
            <rect
              x={14.5}
              y={11}
              width={7}
              height={21}
              rx={3.5}
              fill={palette.secondary}
            />
            <rect
              x={25}
              y={4}
              width={7}
              height={28}
              rx={3.5}
              fill={palette.accent}
            />
          </svg>
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: palette.foreground,
            }}
          >
            Relay
          </span>
        </div>

        {/* Primary Total Statement */}
        <h2
          style={{
            margin: 0,
            fontFamily: FONT_FAMILY,
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            color: palette.foreground,
          }}
        >
          <span style={{ color: palette.accent }}>17 hours</span> of focused
          work
        </h2>

        {/* Proportional 17-hour Week Synthesis Bar (2 + 3 + 4 + 3 + 5 = 17) */}
        <div
          style={{
            display: "flex",
            width: 920,
            height: 16,
            gap: 10,
            marginTop: 8,
          }}
        >
          {WEEK_DATA.map((item) => (
            <div
              key={item.day}
              style={{
                flex: item.hours,
                height: "100%",
                borderRadius: 999,
                backgroundColor: item.isPeak
                  ? palette.accent
                  : palette.secondary,
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <IllustrativeBadge />
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
        fontFamily: FONT_FAMILY,
      }}
    >
      <AmbientBackground />

      {/* 0–3s (Frames 0–89): Intro */}
      <Sequence from={0} durationInFrames={90}>
        <IntroScene />
      </Sequence>

      {/* 3–9s (Frames 90–269): Animated Bar Chart */}
      <Sequence from={90} durationInFrames={180}>
        <ChartScene />
      </Sequence>

      {/* 9–12s (Frames 270–359): Final Summary */}
      <Sequence from={270} durationInFrames={90}>
        <SummaryScene />
      </Sequence>
    </AbsoluteFill>
  );
};
