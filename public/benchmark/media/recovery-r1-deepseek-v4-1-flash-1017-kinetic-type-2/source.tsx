import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { palette } from "./contract";

const FONT = "Archivo";

const clampOpts = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], clampOpts);
  const glow = 0.04 + 0.05 * t;
  const gridMask =
    "radial-gradient(ellipse 64% 64% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.28) 68%, rgba(0,0,0,0) 100%)";

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(ellipse 58% 62% at 50% 46%, rgba(184, 243, 107, ${glow.toFixed(
            3
          )}) 0%, rgba(16, 17, 20, 0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(245,245,242,0.07) 1px, rgba(245,245,242,0) 1px), linear-gradient(to bottom, rgba(245,245,242,0.07) 1px, rgba(245,245,242,0) 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.45,
          maskImage: gridMask,
          WebkitMaskImage: gridMask,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const RelayLine: React.FC = () => {
  const frame = useCurrentFrame();
  const travel = interpolate(frame, [0, 300], [0, 1], {
    ...clampOpts,
    easing: Easing.inOut(Easing.cubic),
  });
  const trackLeft = 80;
  const trackWidth = 1920 - 160;
  const segment = 150;
  const x = travel * (trackWidth - segment);

  return (
    <div
      style={{
        position: "absolute",
        left: trackLeft,
        bottom: 80,
        width: trackWidth,
        height: 2,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: trackWidth,
          height: 2,
          borderRadius: 2,
          backgroundColor: palette.foreground,
          opacity: 0.08,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: 0,
          width: segment,
          height: 2,
          borderRadius: 2,
          backgroundColor: palette.accent,
          opacity: 0.45,
        }}
      />
    </div>
  );
};

const PhraseOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = interpolate(frame, [80, 90], [0, 1], {
    ...clampOpts,
    easing: Easing.in(Easing.quad),
  });

  const chars = Array.from("Less noise.");

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          opacity: 1 - exit,
          transform: `translateY(${-30 * exit}px)`,
          filter: `blur(${8 * exit}px)`,
        }}
      >
        {chars.map((ch, i) => {
          const p = spring({
            frame: frame - i * 0.8,
            fps,
            config: { damping: 200, mass: 0.55, stiffness: 130 },
            durationInFrames: 20,
          });
          const isNoise = i >= 5;
          const isDot = i === 10;
          return (
            <span
              key={`char-${i}`}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 172,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: isDot
                  ? palette.accent
                  : isNoise
                  ? palette.muted
                  : palette.foreground,
                opacity: interpolate(p, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(p, [0, 1], [36, 0])}px)`,
                filter: `blur(${interpolate(p, [0, 1], [10, 0])}px)`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PhraseTwo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 90 },
    durationInFrames: 24,
  });

  const exit = interpolate(frame, [80, 90], [0, 1], clampOpts);

  const blur = interpolate(s, [0, 1], [18, 0]);
  const scale = interpolate(s, [0, 1], [1.06, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const tracking = interpolate(s, [0, 1], [0.08, -0.04]);
  const xMore = interpolate(s, [0, 1], [-90, 0]);
  const xFocus = interpolate(s, [0, 1], [90, 0]);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 168,
          lineHeight: 1.1,
          letterSpacing: `${tracking}em`,
          opacity: opacity * (1 - exit),
          transform: `scale(${scale}) translateY(${-28 * exit}px)`,
          filter: `blur(${blur + 8 * exit}px)`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            color: palette.foreground,
            transform: `translateX(${xMore}px)`,
          }}
        >
          More
        </span>
        <span style={{ display: "inline-block", width: "0.26em" }} />
        <span
          style={{
            display: "inline-block",
            color: palette.secondary,
            transform: `translateX(${xFocus}px)`,
          }}
        >
          focus.
        </span>
      </div>
    </AbsoluteFill>
  );
};

const RiseWord: React.FC<{ text: string; delay: number; color: string }> = ({
  text,
  delay,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.7, stiffness: 120 },
    durationInFrames: 20,
  });
  const y = interpolate(p, [0, 1], [118, 0]);

  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        paddingBottom: "0.22em",
        marginBottom: "-0.22em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${y}%)`,
          color,
          fontFamily: FONT,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          lineHeight: 1.1,
        }}
      >
        {text}
      </span>
    </span>
  );
};

const PhraseThree: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [80, 90], [0, 1], clampOpts);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: 1 - exit,
          transform: `translateY(${-26 * exit}px) scale(${1 - 0.02 * exit})`,
          filter: `blur(${7 * exit}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            fontSize: 118,
            lineHeight: 1.1,
          }}
        >
          <RiseWord text="Better" delay={0} color={palette.foreground} />
          <span style={{ display: "inline-block", width: "0.2em" }} />
          <RiseWord text="work," delay={5} color={palette.foreground} />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 152,
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          <RiseWord text="together." delay={10} color={palette.accent} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PhraseFour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sA = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 110 },
    durationInFrames: 20,
  });
  const sB = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200, mass: 0.9, stiffness: 110 },
    durationInFrames: 20,
  });

  const lineWidth = interpolate(sB, [0, 1], [0, 200]);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 56,
            lineHeight: 1.2,
            letterSpacing: "0.01em",
            color: palette.foreground,
            opacity: interpolate(sA, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(sA, [0, 1], [18, 0])}px)`,
          }}
        >
          Make room for what matters.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginTop: 30,
          }}
        >
          {Array.from("Relay").map((ch, i) => {
            const p = spring({
              frame: frame - 2 - i * 2,
              fps,
              config: { damping: 200, mass: 0.7, stiffness: 120 },
              durationInFrames: 18,
            });
            return (
              <span
                key={`relay-${i}`}
                style={{
                  display: "inline-block",
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: 264,
                  lineHeight: 1,
                  letterSpacing: "-0.045em",
                  color: palette.accent,
                  opacity: interpolate(p, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px)`,
                  filter: `blur(${interpolate(p, [0, 1], [12, 0])}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 24,
            height: 4,
            width: lineWidth,
            borderRadius: 2,
            backgroundColor: palette.accent,
            opacity: 0.85,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
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
      <RelayLine />
    </AbsoluteFill>
  );
};