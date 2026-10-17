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

type PaletteShape = {
  background?: string;
  foreground?: string;
  accent?: string;
  secondary?: string;
  muted?: string;
};

const P = ((palette ?? {}) as unknown) as PaletteShape;

const BG = P.background ?? "#101114";
const FG = P.foreground ?? "#F5F5F2";
const ACCENT = P.accent ?? "#B8F36B";
const SECONDARY = P.secondary ?? "#78B9ED";
const MUTED = P.muted ?? "#B1B4BC";

const FONT = "Archivo";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const DAYS = [
  { label: "Monday", value: 2 },
  { label: "Tuesday", value: 3 },
  { label: "Wednesday", value: 4 },
  { label: "Thursday", value: 3 },
  { label: "Friday", value: 5 },
];

const X0 = 260;
const X1 = 1740;
const YB = 880;
const PX_H = 100;
const SLOT = (X1 - X0) / 5;
const BAR_W = 168;

const BrandMark: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      left: 120,
      top: 96,
      display: "flex",
      alignItems: "center",
      gap: 14,
      opacity,
    }}
  >
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: ACCENT,
      }}
    />
    <div style={{ fontSize: 28, fontWeight: 600, color: FG }}>Relay</div>
  </div>
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 70 },
    durationInFrames: 36,
  });
  const titleY = interpolate(rise, [0, 1], [40, 0]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], CLAMP);

  const subRise = spring({
    frame: Math.max(0, frame - 16),
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 70 },
    durationInFrames: 34,
  });
  const subY = interpolate(subRise, [0, 1], [24, 0]);
  const subOpacity = interpolate(frame, [16, 34], [0, 1], CLAMP);

  const rule = interpolate(frame, [26, 52], [0, 1], CLAMP);
  const brandOpacity = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const fadeOut = interpolate(frame, [82, 100], [1, 0], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily: FONT,
        opacity: fadeOut,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <BrandMark opacity={brandOpacity} />

      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          fontSize: 104,
          fontWeight: 700,
          color: FG,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          textAlign: "center",
        }}
      >
        A week with more focus
      </div>

      <div
        style={{
          marginTop: 40,
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 46 * rule,
            height: 2,
            borderRadius: 2,
            backgroundColor: SECONDARY,
            opacity: rule,
          }}
        />
        <div
          style={{
            fontSize: 30,
            color: MUTED,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Illustrative data
        </div>
        <div
          style={{
            width: 46 * rule,
            height: 2,
            borderRadius: 2,
            backgroundColor: ACCENT,
            opacity: rule,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Chart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const fadeOut = interpolate(frame, [178, 200], [1, 0], CLAMP);
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  const headerOpacity = interpolate(frame, [0, 22], [0, 1], CLAMP);
  const gridOpacity = interpolate(frame, [4, 26], [0, 1], CLAMP);
  const captionOpacity = interpolate(frame, [14, 36], [0, 1], CLAMP);

  const bars = DAYS.map((day, i) => {
    const delay = 10 + i * 6;
    const progress = spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: { damping: 200, mass: 0.9, stiffness: 80 },
      durationInFrames: 38,
    });
    const height = day.value * PX_H * progress;
    const cx = X0 + SLOT * i + SLOT / 2;
    const barTop = YB - height;
    const dayOpacity = interpolate(
      frame,
      [8 + i * 4, 22 + i * 4],
      [0, 1],
      CLAMP
    );
    const valueOpacity = interpolate(
      frame,
      [delay + 24, delay + 38],
      [0, 1],
      CLAMP
    );
    return { ...day, height, cx, barTop, dayOpacity, valueOpacity };
  });

  return (
    <AbsoluteFill
      style={{ backgroundColor: BG, fontFamily: FONT, opacity: sceneOpacity }}
    >
      <BrandMark opacity={headerOpacity} />

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 148,
          fontSize: 34,
          fontWeight: 500,
          color: FG,
          opacity: 0.8 * headerOpacity,
          letterSpacing: "-0.01em",
        }}
      >
        A week with more focus
      </div>

      <div
        style={{
          position: "absolute",
          right: 120,
          top: 142,
          padding: "10px 24px",
          borderRadius: 999,
          border: `1px solid ${MUTED}59`,
          fontSize: 22,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: MUTED,
          opacity: headerOpacity,
          fontWeight: 500,
        }}
      >
        Illustrative data
      </div>

      <div
        style={{
          position: "absolute",
          left: X0,
          top: 250,
          fontSize: 24,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: MUTED,
          opacity: 0.75 * captionOpacity,
          fontWeight: 500,
        }}
      >
        Focus hours per day
      </div>

      {[0, 1, 2, 3, 4, 5].map((h) => {
        const y = YB - h * PX_H;
        const isBase = h === 0;
        return (
          <React.Fragment key={`grid-${h}`}>
            <div
              style={{
                position: "absolute",
                left: X0,
                top: y,
                width: X1 - X0,
                height: isBase ? 2 : 1,
                backgroundColor: isBase
                  ? "rgba(245,245,242,0.30)"
                  : "rgba(245,245,242,0.08)",
                opacity: gridOpacity,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                width: X0 - 26,
                top: y - 15,
                textAlign: "right",
                fontSize: 24,
                color: MUTED,
                opacity: 0.6 * gridOpacity,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {h}
            </div>
          </React.Fragment>
        );
      })}

      {bars.map((bar) => (
        <React.Fragment key={bar.label}>
          <div
            style={{
              position: "absolute",
              left: bar.cx - BAR_W / 2,
              top: bar.barTop,
              width: BAR_W,
              height: bar.height,
              backgroundColor: ACCENT,
              borderRadius: "10px 10px 0 0",
              opacity: 0.94,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: bar.cx - 130,
              width: 260,
              top: bar.barTop - 62,
              textAlign: "center",
              fontSize: 44,
              fontWeight: 700,
              color: FG,
              opacity: bar.valueOpacity,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}
          >
            {bar.value}
          </div>
          <div
            style={{
              position: "absolute",
              left: bar.cx - 150,
              width: 300,
              top: YB + 26,
              textAlign: "center",
              fontSize: 28,
              color: MUTED,
              opacity: bar.dayOpacity,
              fontWeight: 500,
            }}
          >
            {bar.label}
          </div>
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 70 },
    durationInFrames: 36,
  });
  const translate = interpolate(rise, [0, 1], [44, 0]);

  const headOpacity = interpolate(frame, [0, 18], [0, 1], CLAMP);
  const sceneOpacity = interpolate(frame, [0, 22], [0, 1], CLAMP);

  const ruleGrow = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 70 },
    durationInFrames: 34,
  });

  const relayOpacity = interpolate(frame, [18, 36], [0, 1], CLAMP);
  const noteOpacity = interpolate(frame, [28, 48], [0, 1], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily: FONT,
        opacity: sceneOpacity,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `translateY(${translate}px)`,
          opacity: headOpacity,
          fontSize: 96,
          fontWeight: 700,
          color: FG,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          textAlign: "center",
        }}
      >
        17 hours of focused work
      </div>

      <div
        style={{
          width: 120 * ruleGrow,
          height: 4,
          borderRadius: 2,
          backgroundColor: ACCENT,
          marginTop: 44,
          marginBottom: 34,
        }}
      />

      <div
        style={{
          opacity: relayOpacity,
          fontSize: 56,
          fontWeight: 800,
          color: ACCENT,
          letterSpacing: "0.02em",
        }}
      >
        Relay
      </div>

      <div
        style={{
          opacity: noteOpacity,
          marginTop: 48,
          fontSize: 22,
          color: MUTED,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        Illustrative data
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Sequence from={0} durationInFrames={100}>
        <Intro />
      </Sequence>
      <Sequence from={80} durationInFrames={200}>
        <Chart />
      </Sequence>
      <Sequence from={262} durationInFrames={98}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};