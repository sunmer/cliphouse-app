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

const clampIn = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const easeOut = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const easeInOut = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

const rgbOf = (hex: string) => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const alpha = (hex: string, a: number) => {
  const { r, g, b } = rgbOf(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const mixHex = (from: string, to: string, t: number) => {
  const a = rgbOf(from);
  const b = rgbOf(to);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const RelayMark: React.FC<{ size: number; style?: React.CSSProperties }> = ({
  size,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <rect
      x="2"
      y="2"
      width="44"
      height="44"
      rx="13"
      fill="none"
      stroke={alpha(palette.foreground, 0.2)}
      strokeWidth="3"
    />
    <path
      d="M21 24 H27"
      stroke={alpha(palette.foreground, 0.38)}
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="16" cy="24" r="5" fill={palette.accent} />
    <circle cx="32" cy="24" r="5" fill={palette.secondary} />
  </svg>
);

const LockIcon: React.FC<{ size: number; color?: string }> = ({
  size,
  color = palette.accent,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M7 10.5V8a5 5 0 0 1 10 0v2.5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" fill={color} />
  </svg>
);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const gx = 66 + Math.sin(t * 0.4) * 7;
  const gy = 18 + Math.cos(t * 0.33) * 6;
  const gx2 = 16 + Math.cos(t * 0.29) * 6;
  const gy2 = 90 + Math.sin(t * 0.36) * 6;
  const drift = `${(frame * 0.2) % 96}px ${(frame * 0.34) % 96}px`;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1500px 1050px at ${gx}% ${gy}%, ${alpha(
            palette.accent,
            0.13,
          )} 0%, ${alpha(palette.accent, 0)} 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(1300px 950px at ${gx2}% ${gy2}%, ${alpha(
            palette.secondary,
            0.13,
          )} 0%, ${alpha(palette.secondary, 0)} 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha(
            palette.foreground,
            0.045,
          )} 1px, transparent 1px), linear-gradient(90deg, ${alpha(
            palette.foreground,
            0.045,
          )} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: drift,
          maskImage:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 78%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 78%)",
        }}
      />
    </AbsoluteFill>
  );
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markIn = easeOut(frame, 0, 18);
  const pop = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.7 },
  });
  const ruleIn = easeOut(frame, 20, 44);
  const tagIn = easeOut(frame, 24, 46);
  const out = clampIn(frame, 74, 90);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${-out * 36}px)`,
        }}
      >
        <RelayMark
          size={58}
          style={{
            marginBottom: 36,
            opacity: markIn * (1 - out),
            transform: `translateY(${(1 - markIn) * 14}px)`,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 184,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.05em",
            color: palette.foreground,
            opacity: pop * (1 - out),
            transform: `scale(${0.94 + 0.06 * pop})`,
          }}
        >
          <span>Relay</span>
          <span style={{ color: palette.accent }}>.</span>
        </div>
        <div
          style={{
            marginTop: 30,
            width: 88 * ruleIn,
            height: 3,
            borderRadius: 2,
            backgroundColor: alpha(palette.accent, 0.9),
            opacity: 1 - out,
          }}
        />
        <div
          style={{
            marginTop: 30,
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: "0.005em",
            color: palette.muted,
            opacity: tagIn * (1 - out),
            transform: `translateY(${(1 - tagIn) * 12}px)`,
          }}
        >
          Make room for focused work
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SLOT_H = 96;
const SLOT_GAP = 10;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type Tone = "accent" | "blue" | "muted";

type Blk = {
  id: string;
  day: number;
  start: number;
  span: number;
  label: string;
  tone: Tone;
};

const BLOCKS: Blk[] = [
  { id: "m1", day: 0, start: 0, span: 1, label: "Standup", tone: "blue" },
  { id: "m2", day: 0, start: 1, span: 2, label: "Roadmap review", tone: "muted" },
  { id: "m3", day: 0, start: 3, span: 1, label: "Design sync", tone: "accent" },
  { id: "t1", day: 1, start: 0, span: 1, label: "Standup", tone: "blue" },
  { id: "t2", day: 1, start: 1, span: 1, label: "1:1", tone: "muted" },
  { id: "t3", day: 1, start: 2, span: 2, label: "Deep work", tone: "accent" },
  { id: "w1", day: 2, start: 0, span: 1, label: "Standup", tone: "blue" },
  { id: "w2", day: 2, start: 1, span: 2, label: "Sprint plan", tone: "blue" },
  { id: "w3", day: 2, start: 3, span: 1, label: "Review", tone: "muted" },
  { id: "h1", day: 3, start: 0, span: 1, label: "Standup", tone: "blue" },
  { id: "h2", day: 3, start: 1, span: 2, label: "Deep work", tone: "accent" },
  { id: "h3", day: 3, start: 3, span: 1, label: "Handoff", tone: "muted" },
  { id: "f1", day: 4, start: 0, span: 1, label: "Standup", tone: "blue" },
  { id: "f2", day: 4, start: 1, span: 1, label: "Demo prep", tone: "muted" },
  { id: "f3", day: 4, start: 2, span: 2, label: "Focus", tone: "accent" },
];

const toneHex = (t: Tone) =>
  t === "accent" ? palette.accent : t === "blue" ? palette.secondary : palette.muted;

const CalendarBlock: React.FC<{
  blk: Blk;
  index: number;
  frame: number;
  fps: number;
  focusAmt: number;
  isFocus: boolean;
}> = ({ blk, index, frame, fps, focusAmt, isFocus }) => {
  const appear = 8 + index * 2;
  const local = frame - appear;
  const p =
    local <= 0
      ? 0
      : spring({
          frame: local,
          fps,
          config: { damping: 18, stiffness: 150, mass: 0.6 },
        });

  const tone = toneHex(blk.tone);
  const dim = isFocus ? 1 : 1 - 0.55 * focusAmt;
  const glow = isFocus ? focusAmt : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: blk.start * (SLOT_H + SLOT_GAP),
        height: blk.span * (SLOT_H + SLOT_GAP) - SLOT_GAP,
        borderRadius: 12,
        padding: "13px 14px",
        boxSizing: "border-box",
        backgroundColor: alpha(tone, 0.14 + 0.12 * glow),
        border: `1px solid ${alpha(tone, 0.28 + 0.38 * glow)}`,
        boxShadow:
          glow > 0 ? `0 0 ${30 * glow}px ${alpha(palette.accent, 0.3 * glow)}` : "none",
        opacity: p * dim,
        transform: `translateY(${(1 - p) * -10}px) scaleY(${0.72 + 0.28 * p})`,
        transformOrigin: "top center",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: tone,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "-0.005em",
            color: alpha(palette.foreground, 0.92),
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {blk.label}
        </div>
      </div>
      {isFocus ? (
        <div style={{ position: "absolute", right: 13, top: 13, opacity: glow }}>
          <LockIcon size={16} />
        </div>
      ) : null}
    </div>
  );
};

const AVATARS = [
  { initials: "AR", color: palette.accent },
  { initials: "MK", color: palette.secondary },
  { initials: "JT", color: palette.muted },
];

const FEATURES = ["Plan together", "Protect focus time", "See progress"];

const ProductScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const out = clampIn(frame, 164, 180);
  const cardIn = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 200, stiffness: 90, mass: 1 },
  });
  const brandIn = easeOut(frame, 6, 24);
  const sideIn = easeOut(frame, 10, 30);
  const focusAmt = easeInOut(frame, 64, 82);
  const panelIn = easeOut(frame, 98, 118);
  const prog = easeOut(frame, 120, 158);

  const act = (i: number) => {
    const s = [6, 64, 118][i];
    const e = [64, 118, 200][i];
    return interpolate(frame, [s, s + 16, e, e + 16], [0, 1, 1, i === 2 ? 1 : 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 96,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: brandIn,
        }}
      >
        <RelayMark size={30} />
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: palette.foreground,
          }}
        >
          Relay
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 0,
          height: 1080,
          width: 540,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          transform: `translateX(${(1 - sideIn) * -26}px)`,
        }}
      >
        {FEATURES.map((f, i) => {
          const a = act(i);
          return (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                padding: "26px 0",
                opacity: (0.34 + 0.66 * a) * sideIn,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 52,
                  borderRadius: 2,
                  backgroundColor: palette.accent,
                  opacity: a,
                  transform: `scaleY(${0.35 + 0.65 * a})`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.22em",
                    color: alpha(palette.muted, 0.85),
                    marginBottom: 10,
                  }}
                >
                  {`0${i + 1}`}
                </div>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 500,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.05,
                    whiteSpace: "nowrap",
                    color: mixHex(palette.muted, palette.foreground, a),
                  }}
                >
                  {f}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 720,
          top: 168,
          width: 1080,
          height: 744,
          borderRadius: 28,
          background: `linear-gradient(160deg, ${alpha(
            palette.foreground,
            0.07,
          )} 0%, ${alpha(palette.foreground, 0.02)} 55%, ${alpha(
            palette.foreground,
            0.045,
          )} 100%)`,
          border: `1px solid ${alpha(palette.foreground, 0.1)}`,
          boxShadow: `0 40px 120px ${alpha("#000000", 0.5)}`,
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 44}px) scale(${0.98 + 0.02 * cardIn})`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 40,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: palette.foreground,
                }}
              >
                Week 42
              </span>
              <span style={{ fontSize: 16, color: alpha(palette.muted, 0.9) }}>
                Product team
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {AVATARS.map((av, i) => {
                const local = frame - (12 + i * 4);
                const p =
                  local <= 0
                    ? 0
                    : spring({
                        frame: local,
                        fps,
                        config: { damping: 16, stiffness: 160, mass: 0.5 },
                      });
                return (
                  <div
                    key={av.initials}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      marginLeft: i === 0 ? 0 : -10,
                      boxSizing: "border-box",
                      backgroundColor: alpha(av.color, 0.16),
                      border: `1px solid ${alpha(av.color, 0.5)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      color: av.color,
                      opacity: p,
                      transform: `scale(${0.6 + 0.4 * p})`,
                    }}
                  >
                    {av.initials}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 26, display: "flex", gap: 16 }}>
            {DAYS.map((d, di) => (
              <div
                key={d}
                style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: alpha(palette.muted, 0.8),
                    marginBottom: 12,
                    textAlign: "center",
                    lineHeight: "16px",
                  }}
                >
                  {d}
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 4 * SLOT_H + 3 * SLOT_GAP,
                  }}
                >
                  {[0, 1, 2, 3].map((s) => (
                    <div
                      key={s}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: s * (SLOT_H + SLOT_GAP),
                        height: SLOT_H,
                        borderRadius: 12,
                        backgroundColor: alpha(palette.foreground, 0.035),
                      }}
                    />
                  ))}
                  {BLOCKS.map((blk, bi) =>
                    blk.day === di ? (
                      <CalendarBlock
                        key={blk.id}
                        blk={blk}
                        index={bi}
                        frame={frame}
                        fps={fps}
                        focusAmt={focusAmt}
                        isFocus={blk.id === "h2"}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 44,
              height: 100,
              borderRadius: 16,
              backgroundColor: alpha(palette.foreground, 0.04),
              border: `1px solid ${alpha(palette.foreground, 0.08)}`,
              padding: "0 28px",
              display: "flex",
              alignItems: "center",
              gap: 24,
              boxSizing: "border-box",
              opacity: panelIn,
              transform: `translateY(${(1 - panelIn) * 16}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: 320,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: palette.accent,
                  opacity: 0.35 + 0.65 * prog,
                }}
              />
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: alpha(palette.foreground, 0.85),
                }}
              >
                Week progress
              </span>
            </div>
            <div
              style={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                backgroundColor: alpha(palette.foreground, 0.08),
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${prog * 86}%`,
                  height: "100%",
                  borderRadius: 5,
                  background: `linear-gradient(90deg, ${palette.accent}, ${palette.secondary})`,
                }}
              />
            </div>
            <div
              style={{
                width: 92,
                textAlign: "right",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: palette.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {`${Math.round(prog * 86)}%`}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();

  const markIn = easeOut(frame, 0, 14);
  const l1 = easeOut(frame, 2, 18);
  const l2 = easeOut(frame, 5, 20);
  const rule = easeOut(frame, 16, 38);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <RelayMark
          size={52}
          style={{
            marginBottom: 40,
            opacity: markIn,
            transform: `translateY(${(1 - markIn) * 12}px)`,
          }}
        />
        <div
          style={{
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: palette.foreground,
          }}
        >
          <div
            style={{
              opacity: l1,
              transform: `translateY(${(1 - l1) * 18}px)`,
            }}
          >
            Start your next week
          </div>
          <div
            style={{
              opacity: l2,
              transform: `translateY(${(1 - l2) * 18}px)`,
            }}
          >
            with <span style={{ color: palette.accent }}>Relay</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 42,
            width: 128 * rule,
            height: 3,
            borderRadius: 2,
            backgroundColor: alpha(palette.accent, 0.9),
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
        fontFamily: "Archivo",
        backgroundColor: palette.background,
        overflow: "hidden",
      }}
    >
      <Background />
      <Sequence from={0} durationInFrames={90}>
        <IntroScene />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <ProductScene />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};