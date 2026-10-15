import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { palette } from "./contract";

export const BenchmarkVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p1Opacity = interpolate(frame, [0, 14, 76, 92], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2Opacity = interpolate(frame, [88, 102, 166, 182], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3Opacity = interpolate(frame, [178, 192, 256, 272], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p4Opacity = interpolate(frame, [268, 283, 360], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bgScale = interpolate(frame, [0, 360], [0.96, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = interpolate(frame, [0, 360], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phrase 1 values
  const p1LineScale = interpolate(frame, [10, 38, 70, 90], [0, 1, 1, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p1GroupY = interpolate(frame, [70, 92], [0, -32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p1GroupScale = interpolate(frame, [70, 92], [1, 0.94], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phrase 2 values
  const p2Blur = interpolate(frame, [88, 114, 155, 182], [12, 0, 0, 8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2Scale = interpolate(frame, [88, 114], [1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2LetterSpacing = interpolate(frame, [88, 114], [0.18, -0.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2RingScale = interpolate(frame, [88, 122], [1.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p2RingOpacity = interpolate(frame, [88, 104, 140, 182], [0, 0.35, 0.18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phrase 3 values
  const p3Line1X = interpolate(frame, [178, 202, 250, 272], [-240, 0, 0, -80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3Line2X = interpolate(frame, [178, 206, 250, 272], [240, 0, 0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3Line1Op = interpolate(frame, [178, 195], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3Line2Op = interpolate(frame, [182, 199], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3Stroke = interpolate(frame, [195, 235], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p3StrokeOp = interpolate(frame, [195, 208, 250, 272], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phrase 4 values
  const p4LineScale = interpolate(frame, [288, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p4RelayOpacity = interpolate(frame, [290, 302], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const p4RelayY = interpolate(frame, [290, 302], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phrase1 = "Less noise.";
  const phrase2 = "More focus.";
  const p3First = "Better work,";
  const p3Second = "together.";
  const p4WordsLine1 = ["Make", "room"];
  const p4WordsLine2 = ["for", "what", "matters."];

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: palette.background,
        position: "relative",
        overflow: "hidden",
        fontFamily: "Archivo",
      }}
    >
      {/* subtle background */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          border: `1px solid ${palette.muted}14`,
          transform: `translate(-50%, -50%) scale(${bgScale})`,
          opacity: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 980,
          height: 980,
          borderRadius: "50%",
          border: `1px solid ${palette.muted}0F`,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 85% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.35) 100%)`,
          opacity: 0.9,
        }}
      />

      {/* grid accent bottom */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 80,
          height: 1,
          background: `${palette.muted}14`,
        }}
      />

      {/* SAFE AREA */}
      <div
        style={{
          position: "absolute",
          inset: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* PHRASE 1 */}
        <Sequence from={0} durationInFrames={92}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: p1Opacity,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateY(${p1GroupY}px) scale(${p1GroupScale})`,
                gap: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 184,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: palette.foreground,
                }}
              >
                {phrase1.split("").map((ch, i) => {
                  if (ch === " ") {
                    return (
                      <span
                        key={i}
                        style={{ width: 36, display: "inline-block" }}
                      />
                    );
                  }
                  const s = spring({
                    frame: frame - i * 2,
                    fps,
                    config: { damping: 18, stiffness: 150, mass: 0.6 },
                  });
                  const y = interpolate(s, [0, 1], [110, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const isDot = ch === ".";
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        transform: `translateY(${y}px)`,
                        opacity: s,
                        color: isDot ? palette.accent : palette.foreground,
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                width: 760,
                height: 2,
                background: palette.foreground,
                opacity: 0.12,
                transform: `scaleX(${p1LineScale})`,
                transformOrigin: "center",
              }}
            />
            <div
              style={{
                marginTop: 22,
                display: "flex",
                gap: 14,
                alignItems: "center",
                opacity: interpolate(frame, [18, 34], [0, 0.5], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: palette.muted,
                  opacity: 0.4,
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: palette.accent,
                }}
              />
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: palette.muted,
                  opacity: 0.4,
                }}
              />
            </div>
          </div>
        </Sequence>

        {/* PHRASE 2 */}
        <Sequence from={88} durationInFrames={94}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: p2Opacity,
              filter: `blur(${p2Blur}px)`,
              transform: `scale(${p2Scale})`,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 860,
                height: 860,
                borderRadius: "50%",
                border: `1px solid ${palette.secondary}`,
                opacity: p2RingOpacity,
                transform: `translate(-50%, -50%) scale(${p2RingScale})`,
                left: "50%",
                top: "50%",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 184,
                fontWeight: 300,
                letterSpacing: `${p2LetterSpacing}em`,
                lineHeight: 1,
                color: palette.foreground,
                alignItems: "baseline",
              }}
            >
              {phrase2.split("").map((ch, i) => {
                if (ch === " ") {
                  return (
                    <span
                      key={i}
                      style={{ width: 40, display: "inline-block" }}
                    />
                  );
                }
                const s = spring({
                  frame: frame - 90 - i * 1.2,
                  fps,
                  config: { damping: 20, stiffness: 140, mass: 0.7 },
                });
                const sy = interpolate(s, [0, 1], [18, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const isDot = ch === ".";
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      transform: `translateY(${sy}px)`,
                      opacity: interpolate(s, [0, 1], [0, 1]),
                      fontWeight: isDot ? 800 : ch === "M" ? 800 : 300,
                      color: isDot ? palette.accent : palette.foreground,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          </div>
        </Sequence>

        {/* PHRASE 3 */}
        <Sequence from={178} durationInFrames={94}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: p3Opacity,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                lineHeight: 0.95,
              }}
            >
              <div
                style={{
                  fontSize: 146,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                  color: palette.foreground,
                  transform: `translateX(${p3Line1X}px)`,
                  opacity: p3Line1Op,
                  display: "flex",
                }}
              >
                {p3First.split("").map((ch, i) => {
                  const s = spring({
                    frame: frame - 178 - i * 1.1,
                    fps,
                    config: { damping: 17, stiffness: 160 },
                  });
                  const yy = interpolate(s, [0, 1], [60, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  if (ch === " ") {
                    return (
                      <span key={i} style={{ width: 22 }} />
                    );
                  }
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        transform: `translateY(${yy}px)`,
                        opacity: s,
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
              <div
                style={{
                  fontSize: 146,
                  fontWeight: 300,
                  letterSpacing: "-0.05em",
                  color: palette.accent,
                  transform: `translateX(${p3Line2X}px)`,
                  opacity: p3Line2Op,
                  fontStyle: "italic",
                }}
              >
                {p3Second}
              </div>
            </div>

            <svg
              width={720}
              height={40}
              viewBox="0 0 720 40"
              style={{ marginTop: 18, overflow: "visible" }}
            >
              <line
                x1={80}
                y1={20}
                x2={640}
                y2={20}
                stroke={palette.muted}
                strokeWidth={1.5}
                strokeOpacity={0.18}
                strokeDasharray="720"
                strokeDashoffset={720 - 720 * p3Stroke}
                strokeLinecap="round"
              />
              <circle
                cx={360}
                cy={20}
                r={5}
                fill={palette.accent}
                opacity={p3StrokeOp}
              />
            </svg>
          </div>
        </Sequence>

        {/* PHRASE 4 */}
        <Sequence from={268} durationInFrames={92}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: p4Opacity,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 22,
                  fontSize: 132,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                  lineHeight: 0.95,
                  color: palette.foreground,
                  justifyContent: "center",
                }}
              >
                {p4WordsLine1.map((w, idx) => {
                  const s = spring({
                    frame: frame - 268 - idx * 4,
                    fps,
                    config: { damping: 19, stiffness: 155, mass: 0.7 },
                  });
                  const y = interpolate(s, [0, 1], [90, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  return (
                    <span
                      key={idx}
                      style={{
                        display: "inline-block",
                        transform: `translateY(${y}px)`,
                        opacity: s,
                        overflow: "hidden",
                      }}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  fontSize: 132,
                  fontWeight: 300,
                  letterSpacing: "-0.05em",
                  lineHeight: 0.95,
                  color: palette.foreground,
                  justifyContent: "center",
                }}
              >
                {p4WordsLine2.map((w, idx) => {
                  const s = spring({
                    frame: frame - 268 - (idx + 2) * 4,
                    fps,
                    config: { damping: 19, stiffness: 155, mass: 0.7 },
                  });
                  const y = interpolate(s, [0, 1], [90, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const isMatters = w.includes("matters");
                  return (
                    <span
                      key={idx}
                      style={{
                        display: "inline-block",
                        transform: `translateY(${y}px)`,
                        opacity: s,
                        fontWeight: isMatters ? 500 : 300,
                        color: isMatters ? palette.foreground : palette.foreground,
                      }}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: 36,
                width: 560,
                height: 1,
                background: palette.muted,
                opacity: 0.22,
                transform: `scaleX(${p4LineScale})`,
                transformOrigin: "center",
              }}
            />

            <div
              style={{
                marginTop: 28,
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: p4RelayOpacity,
                transform: `translateY(${p4RelayY}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: palette.foreground,
                  lineHeight: 1,
                }}
              >
                Relay
              </div>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: palette.accent,
                  marginTop: 6,
                }}
              />
            </div>
          </div>
        </Sequence>
      </div>

      {/* progress indicator - graphical only */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 58,
          height: 2,
          background: `${palette.muted}18`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: palette.accent,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 36,
          display: "flex",
          justifyContent: "space-between",
          opacity: 0.28,
        }}
      >
        <div style={{ width: 32, height: 1, background: palette.muted }} />
        <div style={{ width: 32, height: 1, background: palette.muted }} />
      </div>
    </div>
  );
};
