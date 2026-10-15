import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { palette } from "./contract";

const DATA = [
  { day: "Monday", value: 2 },
  { day: "Tuesday", value: 3 },
  { day: "Wednesday", value: 4 },
  { day: "Thursday", value: 3 },
  { day: "Friday", value: 5 },
];

const MAX = 5;

const Header: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: palette.accent,
          }}
        />
        <span
          style={{
            fontFamily: "Archivo",
            fontSize: 18,
            letterSpacing: 3.2,
            fontWeight: 700,
            color: palette.foreground,
            textTransform: "uppercase",
          }}
        >
          Relay
        </span>
        <span
          style={{
            fontFamily: "Archivo",
            fontSize: 13,
            letterSpacing: 1.4,
            color: palette.muted,
            fontWeight: 500,
            marginLeft: 10,
            opacity: 0.9,
          }}
        >
          Focus Systems
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: `1px solid ${palette.muted}55`,
          borderRadius: 999,
          padding: "8px 14px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: palette.accent,
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: "Archivo",
            fontSize: 12,
            letterSpacing: 1.6,
            fontWeight: 700,
            color: palette.muted,
            textTransform: "uppercase",
          }}
        >
          Illustrative data
        </span>
      </div>
    </div>
  );
};

const IntroContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerOpacity = interpolate(frame, [0, 18, 72, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });

  const line2Progress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });

  const badgeProgress = spring({
    frame: frame - 14,
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  const ruleScale = spring({
    frame: frame - 18,
    fps,
    config: { damping: 20, stiffness: 120 },
  });

  return (
    <AbsoluteFill style={{ padding: 80, fontFamily: "Archivo" }}>
      <Header opacity={containerOpacity} />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 80,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: containerOpacity,
        }}
      >
        <div
          style={{
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [16, 0])}px)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: 4.2,
              fontWeight: 700,
              color: palette.accent,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            03 — 09 &middot; Example Week
          </div>
          <div
            style={{
              fontSize: 92,
              lineHeight: 0.95,
              fontWeight: 800,
              letterSpacing: -3.2,
              color: palette.foreground,
              textAlign: "center",
            }}
          >
            <div style={{ display: "block" }}>A week with</div>
            <div style={{ display: "block", color: palette.foreground }}>more focus</div>
          </div>
        </div>

        <div
          style={{
            width: 520,
            height: 2,
            background: palette.accent,
            marginTop: 28,
            transform: `scaleX(${ruleScale})`,
            transformOrigin: "center",
            opacity: ruleScale,
          }}
        />

        <div
          style={{
            marginTop: 26,
            transform: `translateY(${interpolate(line2Progress, [0, 1], [12, 0])}px)`,
            opacity: line2Progress,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: palette.muted,
              letterSpacing: 0.2,
            }}
          >
            A calm look at daily focus hours — scaled to a common baseline
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: badgeProgress,
            transform: `translateY(${interpolate(badgeProgress, [0, 1], [8, 0])}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(184,243,107,0.12)",
              border: `1px solid ${palette.accent}55`,
              borderRadius: 999,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: palette.accent,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: palette.accent,
              }}
            >
              Illustrative data &middot; Not measured results
            </span>
          </div>
          <span style={{ fontSize: 13, color: palette.muted, letterSpacing: 0.6 }}>
            Linear scale &middot; Zero baseline
          </span>
        </div>

        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: 8,
            alignItems: "center",
            opacity: containerOpacity,
          }}
        >
          <div style={{ width: 28, height: 2, background: palette.accent }} />
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: containerOpacity,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: palette.muted,
            fontWeight: 600,
          }}
        >
          Silent story &middot; 12s
        </span>
        <span
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: palette.muted,
            fontWeight: 600,
          }}
        >
          No audio
        </span>
      </div>
    </AbsoluteFill>
  );
};

const ChartContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const outerOpacity = interpolate(frame, [0, 16, 164, 180], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerShift = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 110 },
  });

  const chartHeight = 430;

  return (
    <AbsoluteFill style={{ padding: 80, fontFamily: "Archivo" }}>
      <Header opacity={outerOpacity} />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 110,
          bottom: 80,
          opacity: outerOpacity,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title block */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            transform: `translateY(${interpolate(headerShift, [0, 1], [10, 0])}px)`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2.2,
                fontWeight: 700,
                color: palette.accent,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Daily focus hours &middot; Example week
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: -1.4,
                color: palette.foreground,
                lineHeight: 1,
              }}
            >
              Focus, day by day
            </div>
            <div
              style={{
                fontSize: 16,
                color: palette.muted,
                marginTop: 8,
                fontWeight: 500,
              }}
            >
              Linear scale &middot; Common zero baseline &middot; Max 5 hrs
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 320 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                border: `1px solid ${palette.muted}33`,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: "10px 14px",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: palette.secondary,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: palette.muted,
                }}
              >
                Illustrative data &middot; Not customer results
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: palette.muted,
                marginTop: 8,
                letterSpacing: 0.4,
              }}
            >
              Every value shown on the bar &amp; axis
            </div>
          </div>
        </div>

        {/* Chart area */}
        <div
          style={{
            marginTop: 28,
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 22,
            padding: "22px 28px 18px 28px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* subtle accent top line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, ${palette.accent}, transparent)`,
              opacity: 0.9,
            }}
          />

          <div style={{ display: "flex", flex: 1, gap: 18 }}>
            {/* Y axis */}
            <div
              style={{
                width: 64,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingTop: 12,
                paddingBottom: 46,
                height: chartHeight + 46,
              }}
            >
              {[5, 4, 3, 2, 1, 0].map((t) => (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: t === 0 ? palette.foreground : palette.muted,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t}h
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 1,
                      background: t === 0 ? palette.foreground : "rgba(255,255,255,0.18)",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bars + grid */}
            <div style={{ flex: 1, position: "relative", height: chartHeight + 46 }}>
              {/* grid lines */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: chartHeight,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  paddingTop: 14,
                }}
              >
                {[5, 4, 3, 2, 1, 0].map((lvl) => (
                  <div
                    key={lvl}
                    style={{
                      height: 1,
                      background:
                        lvl === 0 ? "rgba(245,245,242,0.95)" : "rgba(255,255,255,0.08)",
                      width: "100%",
                    }}
                  />
                ))}
              </div>

              {/* bars */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 18,
                  paddingRight: 8,
                  paddingLeft: 4,
                  paddingBottom: 46,
                  height: chartHeight + 46,
                }}
              >
                {DATA.map((d, i) => {
                  const delay = i * 7;
                  const p = spring({
                    frame: frame - delay,
                    fps,
                    config: { damping: 14, stiffness: 110, mass: 0.8 },
                  });
                  const barH = p * (d.value / MAX) * chartHeight;
                  const valueOpacity = interpolate(p, [0.55, 0.9], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
                  const isMax = d.value === MAX;

                  return (
                    <div
                      key={d.day}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        height: "100%",
                        gap: 0,
                      }}
                    >
                      {/* value label - always reserved space */}
                      <div style={{ height: 28, marginBottom: 8, display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            opacity: valueOpacity,
                            transform: `translateY(${interpolate(p, [0, 1], [6, 0])}px)`,
                            background: isMax ? palette.accent : "rgba(255,255,255,0.09)",
                            border: `1px solid ${isMax ? palette.accent : "rgba(255,255,255,0.1)"}`,
                            color: isMax ? palette.background : palette.foreground,
                            borderRadius: 999,
                            padding: "5px 12px",
                            fontSize: 13,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1,
                          }}
                        >
                          {d.value} hrs
                        </div>
                      </div>

                      {/* bar */}
                      <div
                        style={{
                          width: "100%",
                          height: chartHeight,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            maxWidth: 240,
                            height: barH,
                            background: isMax
                              ? palette.accent
                              : i % 2 === 0
                              ? palette.secondary
                              : "#2A2D33",
                            border: `1px solid ${isMax ? palette.accent : "rgba(255,255,255,0.08)"}`,
                            borderBottom: "none",
                            borderTopLeftRadius: 14,
                            borderTopRightRadius: 14,
                            position: "relative",
                            boxShadow: isMax ? `0 10px 30px ${palette.accent}33` : "none",
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "center",
                          }}
                        >
                          {/* inner highlight */}
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 1,
                              background: "rgba(255,255,255,0.35)",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>

                      {/* day label - always visible */}
                      <div
                        style={{
                          height: 46,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          marginTop: 10,
                          width: "100%",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 0.8,
                            textTransform: "uppercase",
                            color: palette.foreground,
                            textAlign: "center",
                          }}
                        >
                          {d.day}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: 0.6,
                            color: palette.muted,
                          }}
                        >
                          {d.value}/5 hrs
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* baseline caption */}
          <div
            style={{
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: palette.muted,
                fontWeight: 700,
              }}
            >
              Zero baseline &middot; Linear scale &middot; Hours per day
            </span>
            <span
              style={{
                fontSize: 11,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: palette.muted,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: palette.accent, display: "inline-block" }} />
              Peak: Friday &middot; 5 hrs
            </span>
          </div>
        </div>

        {/* bottom progress */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, opacity: 0.95 }}>
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ width: 28, height: 2, background: palette.accent }} />
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20, 75, 90], [0, 1, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  const subtle = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 100 },
  });

  // Count up 0 -> 17 in first 22 frames, then hold
  const countProgress = interpolate(frame, [6, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const easedCount = interpolate(countProgress, [0, 1], [0, 1]);
  const displayCount = Math.round(interpolate(easedCount, [0, 1], [0, 17]));

  return (
    <AbsoluteFill style={{ padding: 80, fontFamily: "Archivo" }}>
      <Header opacity={opacity} />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 80,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 999,
            padding: "8px 16px",
            transform: `translateY(${interpolate(subtle, [0, 1], [8, 0])}px)`,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: palette.accent }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: palette.muted,
            }}
          >
            Illustrative total &middot; Example week
          </span>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "baseline",
            gap: 18,
            transform: `scale(${interpolate(scale, [0, 1], [0.96, 1])})`,
          }}
        >
          <span
            style={{
              fontSize: 168,
              fontWeight: 900,
              letterSpacing: -8,
              lineHeight: 0.85,
              color: palette.accent,
              fontVariantNumeric: "tabular-nums",
              textShadow: `0 12px 40px ${palette.accent}33`,
            }}
          >
            {displayCount}
          </span>
          <span
            style={{
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: -1.2,
              color: palette.foreground,
              transform: "translateY(-22px)",
            }}
          >
            hours
          </span>
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: -1.2,
            color: palette.foreground,
            lineHeight: 1,
            textAlign: "center",
            opacity: subtle,
            transform: `translateY(${interpolate(subtle, [0, 1], [10, 0])}px)`,
          }}
        >
          of focused work
        </div>

        <div
          style={{
            width: 560,
            height: 2,
            background: palette.accent,
            marginTop: 26,
            transform: `scaleX(${subtle})`,
            transformOrigin: "center",
          }}
        />

        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            opacity: subtle,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 4.5,
                textTransform: "uppercase",
                color: palette.foreground,
              }}
            >
              Relay
            </span>
            <span
              style={{
                width: 1,
                height: 18,
                background: "rgba(255,255,255,0.18)",
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 0.6,
                color: palette.muted,
              }}
            >
              Stay in flow, together
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 1.1,
              color: palette.muted,
              fontWeight: 500,
            }}
          >
            Illustrative data &middot; Not measured customer results
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 38, opacity: 0.9 }}>
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ width: 28, height: 2, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ width: 28, height: 2, background: palette.accent }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GlobalBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: palette.background, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -240,
          top: -260,
          background: `radial-gradient(closest-side, ${palette.secondary}18, transparent)`,
          borderRadius: 999,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          right: -280,
          bottom: -360,
          background: `radial-gradient(closest-side, ${palette.accent}14, transparent)`,
          borderRadius: 999,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 80,
          bottom: 80,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 24,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        fontFamily: "Archivo",
        color: palette.foreground,
      }}
    >
      <GlobalBackground />
      <Sequence from={0} durationInFrames={90}>
        <IntroContent />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <ChartContent />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <OutroContent />
      </Sequence>
    </AbsoluteFill>
  );
};
