import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { palette } from "./contract";

const FONT = "Archivo";

const alpha = (hex: string, a: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const TEXT_SPRING = { damping: 20, mass: 0.9, stiffness: 90 };
const QUICK_SPRING = { damping: 22, mass: 0.8, stiffness: 120 };
const BAR_SPRING = { damping: 18, mass: 1.1, stiffness: 45 };

const DAYS = [
  { day: "Monday", value: 2 },
  { day: "Tuesday", value: 3 },
  { day: "Wednesday", value: 4 },
  { day: "Thursday", value: 3 },
  { day: "Friday", value: 5 },
];

const MAX_VALUE = 5;
const BASELINE = 820;
const PLOT_HEIGHT = 520;
const BAR_WIDTH = 150;
const BAR_GAP = 70;
const CHART_WIDTH = DAYS.length * BAR_WIDTH + (DAYS.length - 1) * BAR_GAP;
const CHART_LEFT = (1920 - CHART_WIDTH) / 2;

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = interpolate(frame, [78, 96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rule = spring({ frame: Math.max(0, frame - 2), fps, config: TEXT_SPRING });
  const lineA = spring({ frame: Math.max(0, frame - 6), fps, config: TEXT_SPRING });
  const lineB = spring({ frame: Math.max(0, frame - 13), fps, config: TEXT_SPRING });
  const meta = spring({ frame: Math.max(0, frame - 24), fps, config: TEXT_SPRING });

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT,
        opacity: 1 - exit,
        transform: `translateY(${-exit * 30}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 72 * rule,
            height: 4,
            borderRadius: 2,
            background: palette.accent,
            marginBottom: 40,
          }}
        />
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            color: palette.foreground,
            opacity: lineA,
            transform: `translateY(${(1 - lineA) * 42}px)`,
          }}
        >
          A week with
        </div>
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            color: palette.foreground,
            opacity: lineB,
            transform: `translateY(${(1 - lineB) * 42}px)`,
          }}
        >
          more focus
        </div>
        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 44,
            padding: "12px 22px",
            border: `1px solid ${alpha(palette.muted, 0.28)}`,
            borderRadius: 999,
            opacity: meta,
            transform: `translateY(${(1 - meta) * 16}px)`,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: palette.secondary,
            }}
          />
          <div
            style={{ fontSize: 22, letterSpacing: "0.06em", color: palette.muted }}
          >
            Illustrative data
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Chart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [172, 186], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gridIn = interpolate(frame, [5, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const head = spring({ frame: Math.max(0, frame - 2), fps, config: TEXT_SPRING });

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT,
        opacity: enter * (1 - exit),
        transform: `translateY(${-exit * 26}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: CHART_LEFT - 140,
          top: 220,
          width: CHART_WIDTH + 280,
          height: 660,
          background: `radial-gradient(closest-side, ${alpha(
            palette.accent,
            0.07
          )}, rgba(0,0,0,0))`,
          opacity: gridIn,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 160,
          top: 140,
          opacity: head,
          transform: `translateY(${(1 - head) * 18}px)`,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: palette.foreground,
          }}
        >
          Focused hours per day
        </div>
        <div
          style={{
            marginTop: 18,
            width: 56 * head,
            height: 3,
            borderRadius: 2,
            background: palette.accent,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          right: 160,
          top: 152,
          fontSize: 20,
          letterSpacing: "0.06em",
          color: palette.muted,
          opacity: gridIn,
        }}
      >
        Illustrative data
      </div>

      {Array.from({ length: MAX_VALUE + 1 }).map((_, v) => {
        const y = BASELINE - (v / MAX_VALUE) * PLOT_HEIGHT;
        return (
          <React.Fragment key={`grid-${v}`}>
            <div
              style={{
                position: "absolute",
                left: CHART_LEFT,
                top: y,
                width: CHART_WIDTH,
                height: 1,
                background: alpha(palette.foreground, v === 0 ? 0.24 : 0.08),
                opacity: gridIn,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: CHART_LEFT - 70,
                top: y - 9,
                width: 50,
                textAlign: "right",
                fontSize: 16,
                color: alpha(palette.muted, 0.85),
                opacity: gridIn,
              }}
            >
              {v}
            </div>
          </React.Fragment>
        );
      })}

      {DAYS.map((d, i) => {
        const start = 14 + i * 4;
        const grow = spring({
          frame: Math.max(0, frame - start),
          fps,
          config: BAR_SPRING,
        });
        const valueIn = spring({
          frame: Math.max(0, frame - (start + 16)),
          fps,
          config: QUICK_SPRING,
        });
        const dayIn = spring({
          frame: Math.max(0, frame - (start + 6)),
          fps,
          config: TEXT_SPRING,
        });
        const h = (d.value / MAX_VALUE) * PLOT_HEIGHT * grow;
        const x = CHART_LEFT + i * (BAR_WIDTH + BAR_GAP);

        return (
          <React.Fragment key={d.day}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASELINE - h,
                width: BAR_WIDTH,
                height: h,
                borderRadius: "10px 10px 0 0",
                background: `linear-gradient(180deg, ${alpha(
                  palette.accent,
                  0.98
                )} 0%, ${alpha(palette.accent, 0.6)} 100%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASELINE - h - 54,
                width: BAR_WIDTH,
                textAlign: "center",
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1,
                color: palette.foreground,
                opacity: valueIn,
                transform: `translateY(${(1 - valueIn) * 12}px)`,
              }}
            >
              {d.value}
            </div>
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASELINE + 32,
                width: BAR_WIDTH,
                textAlign: "center",
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1,
                color: palette.muted,
                opacity: dayIn,
              }}
            >
              {d.day}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const Final: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const s1 = spring({ frame: Math.max(0, frame - 2), fps, config: QUICK_SPRING });
  const s2 = spring({ frame: Math.max(0, frame - 8), fps, config: QUICK_SPRING });
  const s3 = spring({ frame: Math.max(0, frame - 14), fps, config: QUICK_SPRING });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: enter }}>
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: palette.foreground,
            opacity: s1,
            transform: `translateY(${(1 - s1) * 34}px)`,
          }}
        >
          <span style={{ color: palette.accent }}>17</span> hours
        </div>
        <div
          style={{
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: palette.foreground,
            opacity: s2,
            transform: `translateY(${(1 - s2) * 34}px)`,
          }}
        >
          of focused work
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 60,
            opacity: s3,
            transform: `translateY(${(1 - s3) * 20}px)`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 3,
              borderRadius: 2,
              background: palette.accent,
            }}
          />
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: palette.foreground,
            }}
          >
            Relay
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 720px at 76% 12%, ${alpha(
            palette.accent,
            0.09
          )}, rgba(0,0,0,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 620px at 8% 94%, ${alpha(
            palette.secondary,
            0.07
          )}, rgba(0,0,0,0) 70%)`,
        }}
      />
      <Sequence from={0} durationInFrames={96} name="Intro">
        <Intro />
      </Sequence>
      <Sequence from={84} durationInFrames={186} name="Chart">
        <Chart />
      </Sequence>
      <Sequence from={258} durationInFrames={102} name="Final">
        <Final />
      </Sequence>
    </AbsoluteFill>
  );
};
