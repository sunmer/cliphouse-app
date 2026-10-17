import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { palette } from "./contract";

const D = {
  background: "#101114",
  foreground: "#F5F5F2",
  accent: "#B8F36B",
  secondary: "#78B9ED",
  muted: "#B1B4BC",
};
const C: typeof D = { ...D, ...((palette as Partial<typeof D>) ?? {}) };
const K = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const A = (hex: string, al: number) => {
  const h = (hex || "#ffffff").replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(s, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${al})`;
};
const F = "Archivo";

const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: C.background }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(1000px 820px at 18% 4%, ${A(
          C.accent,
          0.09
        )}, transparent 66%), radial-gradient(900px 700px at 86% 94%, ${A(
          C.secondary,
          0.09
        )}, transparent 70%)`,
      }}
    />
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${A("#ffffff", 0.03)} 1px, transparent 1px), linear-gradient(90deg, ${A(
          "#ffffff",
          0.03
        )} 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(circle at 50% 46%, black 26%, transparent 76%)",
        WebkitMaskImage:
          "radial-gradient(circle at 50% 46%, black 26%, transparent 76%)",
      }}
    />
  </AbsoluteFill>
);

const Mark: React.FC<{ p: number; s?: number }> = ({ p, s = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 * s }}>
    {[0, 1, 2].map((i) => {
      const r = interpolate(p, [i * 0.2, i * 0.2 + 0.5], [0, 1], K);
      const d = (13 + i * 6) * s;
      return (
        <div
          key={i}
          style={{
            width: d,
            height: d,
            borderRadius: "50%",
            background: C.accent,
            opacity: (0.45 + 0.275 * i) * r,
            transform: `scale(${0.5 + 0.5 * r})`,
          }}
        />
      );
    })}
  </div>
);

/* ---------------- Scene 1 ---------------- */

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(f, [74, 90], [0, 1], K);
  const mp = interpolate(f, [0, 26], [0, 1], { ...K, easing: Easing.out(Easing.cubic) });
  const lw = interpolate(f, [24, 48], [0, 150], { ...K, easing: Easing.out(Easing.cubic) });
  const to = interpolate(f, [34, 54], [0, 1], K);
  const ty = interpolate(f, [34, 54], [20, 0], { ...K, easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill
      style={{
        fontFamily: F,
        justifyContent: "center",
        alignItems: "center",
        opacity: 1 - exit,
        transform: `translateY(${-26 * exit}px)`,
      }}
    >
      <div style={{ marginBottom: 36 }}>
        <Mark p={mp} s={1.15} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 150,
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          color: C.foreground,
        }}
      >
        {"Relay".split("").map((ch, i) => {
          const p = spring({
            frame: f - 8 - i * 3,
            fps,
            config: { damping: 200, mass: 0.6, stiffness: 95 },
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 70}px)`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          width: lw,
          height: 5,
          borderRadius: 3,
          background: C.accent,
          marginTop: 30,
        }}
      />
      <div
        style={{
          marginTop: 30,
          fontSize: 42,
          fontWeight: 500,
          color: C.muted,
          opacity: to,
          transform: `translateY(${ty}px)`,
        }}
      >
        Make room for focused work
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Product --------------- */

const COLS: number[][] = [
  [96, 140, 96],
  [72, 120, 128],
  [110, 84, 96, 84],
  [104, 96, 140],
  [140, 96, 100],
];
const TONE = (c: number, b: number): string =>
  c === 2 && b === 1
    ? A(C.accent, 0.3)
    : (c === 1 && b === 1) || (c === 3 && b === 0)
    ? A(C.secondary, 0.26)
    : A(C.foreground, 0.075);

const Grid: React.FC<{ f: number; fps: number; dim?: boolean }> = ({ f, fps, dim }) => {
  let gi = 0;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 14, opacity: dim ? 0.17 : 1 }}>
      {COLS.map((blocks, ci) => (
        <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              height: 24,
              borderRadius: 8,
              background: A(C.foreground, 0.06),
              opacity: spring({
                frame: f - 2 - ci * 2,
                fps,
                config: { damping: 200, mass: 0.4, stiffness: 120 },
              }),
            }}
          />
          {blocks.map((h, bi) => {
            const p = spring({
              frame: f - 2 - gi++ * 1.6,
              fps,
              config: { damping: 200, mass: 0.5, stiffness: 110 },
            });
            return (
              <div
                key={bi}
                style={{
                  height: h,
                  borderRadius: 10,
                  background: TONE(ci, bi),
                  opacity: p,
                  transform: `scaleY(${0.15 + 0.85 * p})`,
                  transformOrigin: "top center",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Plan: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const p = spring({ frame: f - 18, fps, config: { damping: 15, mass: 0.55, stiffness: 120 } });
  return (
    <>
      <Grid f={f} fps={fps} />
      <div
        style={{
          position: "absolute",
          left: 380 + (1 - p) * 48,
          top: 196 + Math.sin((f - 18) / 20) * 4,
          opacity: Math.min(1, Math.max(0, p * 1.5)),
        }}
      >
        <svg width={22} height={27} viewBox="0 0 22 27">
          <path d="M2 2 L2 23 L8.4 16.6 L13.4 26 L18.4 23 L13.4 13.8 L20.6 12.8 Z" fill={C.secondary} />
        </svg>
        <div
          style={{
            marginLeft: 16,
            marginTop: -6,
            width: 78,
            height: 22,
            borderRadius: 6,
            background: C.secondary,
            boxShadow: `0 8px 24px ${A(C.secondary, 0.35)}`,
          }}
        />
      </div>
    </>
  );
};

const Focus: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const p = spring({ frame: f - 66, fps, config: { damping: 16, mass: 0.7, stiffness: 105 } });
  const q = spring({ frame: f - 78, fps, config: { damping: 200, mass: 0.5, stiffness: 100 } });
  return (
    <>
      <Grid f={f} fps={fps} dim />
      <div
        style={{
          position: "absolute",
          left: 179.6,
          top: 36,
          width: 524.8,
          height: 320,
          borderRadius: 16,
          border: `2px dashed ${A(C.accent, 0.3)}`,
          opacity: p * 0.9,
          transform: `scale(${0.9 + 0.1 * p})`,
          transformOrigin: "left center",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 179.6,
          top: 36,
          width: 524.8,
          height: 320,
          borderRadius: 16,
          background: A(C.accent, 0.13),
          border: `1.5px solid ${A(C.accent, 0.72)}`,
          boxShadow: `0 0 70px ${A(C.accent, 0.18)}`,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          opacity: p,
          transform: `scale(${0.88 + 0.12 * p})`,
          transformOrigin: "left center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: q }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 14,
                height: 11,
                border: `2.5px solid ${C.accent}`,
                borderBottom: "none",
                borderRadius: "7px 7px 0 0",
                marginBottom: -2,
              }}
            />
            <div style={{ width: 23, height: 17, borderRadius: 5, background: C.accent }} />
          </div>
          <div style={{ width: 128, height: 11, borderRadius: 6, background: A(C.accent, 0.65) }} />
        </div>
        <div style={{ width: "70%", height: 10, borderRadius: 5, background: A(C.accent, 0.3), opacity: q }} />
        <div style={{ width: "44%", height: 10, borderRadius: 5, background: A(C.accent, 0.18), opacity: q }} />
      </div>
    </>
  );
};

const BARS = [0.34, 0.48, 0.4, 0.62, 0.78, 0.7, 1];

const Progress: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const r = 100;
  const circ = 2 * Math.PI * r;
  const pr = interpolate(f, [118, 150], [0, 0.78], { ...K, easing: Easing.out(Easing.cubic) });
  const ck = interpolate(f, [138, 154], [0, 1], { ...K, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 44 }}>
      <div style={{ flex: 1, height: 400, display: "flex", alignItems: "flex-end", gap: 18 }}>
        {BARS.map((v, i) => {
          const p = spring({ frame: f - 116 - i * 3.5, fps, config: { damping: 16, mass: 0.6, stiffness: 110 } });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${v * 100}%`,
                borderRadius: "10px 10px 6px 6px",
                background: i >= 5 ? A(C.accent, i === 6 ? 0.95 : 0.45) : A(C.foreground, 0.085),
                transform: `scaleY(${p})`,
                transformOrigin: "bottom center",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          width: 250,
          height: 250,
          position: "relative",
          marginBottom: 64,
          opacity: interpolate(f, [114, 128], [0, 1], K),
        }}
      >
        <svg width={250} height={250} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={125} cy={125} r={r} fill="none" stroke={A(C.foreground, 0.08)} strokeWidth={16} />
          <circle
            cx={125}
            cy={125}
            r={r}
            fill="none"
            stroke={C.accent}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pr)}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={72} height={72} viewBox="0 0 72 72">
            <path
              d="M15 37 L30 51 L57 21"
              fill="none"
              stroke={C.accent}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={ck}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

const FEATURES = ["Plan together", "Protect focus time", "See progress"];
const NAV = [58, 78, 66, 88, 54];

const Product: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 200, mass: 0.8, stiffness: 80 } });
  const exit = interpolate(f, [164, 180], [0, 1], K);
  const op = enter * (1 - exit);
  const ty = (1 - enter) * 30 - exit * 22;

  const act = interpolate(f, [10, 50, 66, 104, 116, 152], [0, 0, 1, 1, 2, 2], K);
  const l1 = interpolate(f, [6, 20, 62, 74], [0, 1, 1, 0], K);
  const l2 = interpolate(f, [62, 74, 110, 122], [0, 1, 1, 0], K);
  const l3 = interpolate(f, [112, 124], [0, 1], K);

  return (
    <AbsoluteFill style={{ fontFamily: F }}>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 84,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: op,
          transform: `translateY(${ty}px)`,
        }}
      >
        <Mark p={1} s={0.85} />
        <div style={{ fontSize: 24, fontWeight: 700, color: C.foreground }}>Relay</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 0,
          height: "100%",
          width: 440,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          opacity: op,
          transform: `translateY(${ty}px)`,
        }}
      >
        {FEATURES.map((label, i) => {
          const k = Math.max(0, 1 - Math.abs(act - i));
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 20, transform: `translateX(${k * 12}px)` }}>
              <div
                style={{
                  width: 5,
                  height: 20 + 18 * k,
                  borderRadius: 3,
                  background: A(C.accent, 0.16 + 0.84 * k),
                  boxShadow: k > 0.01 ? `0 0 ${20 * k}px ${A(C.accent, 0.5 * k)}` : "none",
                }}
              />
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  whiteSpace: "nowrap",
                  color: A(C.foreground, 0.32 + 0.68 * k),
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 620,
          top: 200,
          width: 1180,
          height: 720,
          borderRadius: 26,
          background: "#16181D",
          border: `1px solid ${A("#ffffff", 0.07)}`,
          boxShadow: `0 50px 140px rgba(0,0,0,0.6)`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          opacity: op,
          transform: `translateY(${ty}px) scale(${0.98 + 0.02 * enter})`,
        }}
      >
        <div
          style={{
            height: 58,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 22px",
            borderBottom: `1px solid ${A("#ffffff", 0.06)}`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: A(C.muted, i === 0 ? 0.35 : 0.2) }} />
          ))}
          <div style={{ width: 290, height: 12, borderRadius: 6, background: A(C.foreground, 0.06), marginLeft: 10 }} />
          <div style={{ flex: 1 }} />
          {[A(C.accent, 0.92), A(C.secondary, 0.92), A(C.muted, 0.8)].map((bg, i) => {
            const s = spring({ frame: f - 6 - i * 4, fps, config: { damping: 15, mass: 0.5, stiffness: 130 } });
            return (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: bg,
                  border: "2px solid #16181D",
                  marginLeft: i === 0 ? 0 : -9,
                  transform: `scale(${s})`,
                  opacity: Math.min(1, s * 1.4),
                }}
              />
            );
          })}
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: `1px solid ${A("#ffffff", 0.06)}`,
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingLeft: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: C.accent }} />
              <div style={{ width: 64, height: 10, borderRadius: 5, background: A(C.foreground, 0.45) }} />
            </div>
            {NAV.map((w, i) => {
              const k = Math.max(0, 1 - Math.abs(act - i));
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    height: 46,
                    borderRadius: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "0 13px",
                    background: A(C.accent, 0.11 * k),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 14,
                      bottom: 14,
                      width: 3,
                      borderRadius: 2,
                      background: C.accent,
                      opacity: k,
                    }}
                  />
                  <div style={{ width: 16, height: 16, borderRadius: 5, background: A(C.foreground, 0.16 + 0.64 * k) }} />
                  <div style={{ width: w, height: 9, borderRadius: 5, background: A(C.foreground, 0.1 + 0.6 * k) }} />
                </div>
              );
            })}
          </div>

          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ position: "absolute", inset: 28 }}>
              <div style={{ position: "absolute", inset: 0, opacity: l1 }}>
                <Plan f={f} fps={fps} />
              </div>
              <div style={{ position: "absolute", inset: 0, opacity: l2 }}>
                <Focus f={f} fps={fps} />
              </div>
              <div style={{ position: "absolute", inset: 0, opacity: l3 }}>
                <Progress f={f} fps={fps} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Scene 3 ---------------- */

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const mp = interpolate(f, [0, 20], [0, 1], { ...K, easing: Easing.out(Easing.cubic) });
  const o1 = interpolate(f, [4, 22], [0, 1], { ...K, easing: Easing.out(Easing.cubic) });
  const y1 = interpolate(f, [4, 22], [36, 0], { ...K, easing: Easing.out(Easing.cubic) });
  const o2 = interpolate(f, [10, 28], [0, 1], { ...K, easing: Easing.out(Easing.cubic) });
  const y2 = interpolate(f, [10, 28], [36, 0], { ...K, easing: Easing.out(Easing.cubic) });
  const uw = interpolate(f, [22, 44], [0, 200], { ...K, easing: Easing.out(Easing.cubic) });
  const glow = interpolate(f, [0, 30], [0, 1], K);

  return (
    <AbsoluteFill style={{ fontFamily: F, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill
        style={{
          opacity: glow,
          background: `radial-gradient(760px 460px at 50% 52%, ${A(C.accent, 0.11)}, transparent 70%)`,
        }}
      />
      <div style={{ marginBottom: 46 }}>
        <Mark p={mp} />
      </div>
      <div
        style={{
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: C.foreground,
          opacity: o1,
          transform: `translateY(${y1}px)`,
          lineHeight: 1.1,
        }}
      >
        Start your next week
      </div>
      <div
        style={{
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: C.accent,
          opacity: o2,
          transform: `translateY(${y2}px)`,
          lineHeight: 1.1,
        }}
      >
        with Relay
      </div>
      <div style={{ width: uw, height: 5, borderRadius: 3, background: C.accent, marginTop: 34 }} />
    </AbsoluteFill>
  );
};

/* ---------------- Root ------------------ */

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.background }}>
      <Backdrop />
      <Sequence from={0} durationInFrames={90}>
        <Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <Product />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};