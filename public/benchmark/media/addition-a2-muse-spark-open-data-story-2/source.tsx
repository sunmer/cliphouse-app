import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "./contract";

const data: { day: string; value: number }[] = [
  { day: "Monday", value: 2 },
  { day: "Tuesday", value: 3 },
  { day: "Wednesday", value: 4 },
  { day: "Thursday", value: 3 },
  { day: "Friday", value: 5 },
];

export const BenchmarkVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global progress 0..360
  const introOpacity = interpolate(frame, [0, 18, 72, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const introY = interpolate(frame, [0, 18], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const chartOpacity = interpolate(frame, [90, 108, 252, 270], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const chartY = interpolate(frame, [90, 108], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const outroOpacity = interpolate(frame, [270, 288], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroY = interpolate(frame, [270, 288], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const progress = interpolate(frame, [0, 360], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        fontFamily: "Archivo",
        overflow: "hidden",
      }}
    >
      {/* subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(245,245,242,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(245,245,242,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          opacity: 0.28,
          maskImage: "radial-gradient(ellipse 85% 70% at 50% 50%, black 60%, transparent 95%)",
        }}
      />
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(1100px 700px at 50% 0%, rgba(184,243,107,0.08), transparent 70%), radial-gradient(900px 600px at 90% 100%, rgba(120,185,237,0.08), transparent 70%)`,
        }}
      />

      {/* Safe margin container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: 80,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: palette.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 999, border: `3px solid ${palette.background}`, position: "relative" }}>
                <div style={{ position: "absolute", width: 14, height: 14, borderRadius: 999, border: `3px solid ${palette.background}`, left: 6, top: -3, opacity: 0.95 }} />
              </div>
            </div>
            <span style={{ color: palette.foreground, fontWeight: 700, fontSize: 20, letterSpacing: -0.02 * 20, lineHeight: 1 }}>Relay</span>
            <span
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 0.08 * 13,
                textTransform: "uppercase",
                paddingLeft: 14,
                borderLeft: `1px solid rgba(177,180,188,0.25)`,
                marginLeft: 2,
              }}
            >
              Illustrative data
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: palette.muted,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.12 * 12,
              textTransform: "uppercase",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: palette.accent, display: "inline-block" }} />
            Synthetic example
          </div>
        </div>

        {/* Progress track */}
        <div style={{ position: "absolute", left: 80, right: 80, top: 78, height: 2, background: "rgba(245,245,242,0.12)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: palette.accent, borderRadius: 999 }} />
        </div>

        {/* Center stage */}
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 24, marginBottom: 16 }}>
          {/* INTRO 0-3s */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: introOpacity,
              transform: `translateY(${introY}px)`,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(184,243,107,0.12)",
                border: "1px solid rgba(184,243,107,0.35)",
                color: palette.accent,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.14 * 13,
                textTransform: "uppercase",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: palette.accent }} />
              Illustrative data
            </div>

            <h1
              style={{
                margin: "28px 0 0 0",
                color: palette.foreground,
                fontSize: 96,
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                textAlign: "center",
                maxWidth: 900,
              }}
            >
              A week with <br />
              <span style={{ color: palette.accent, position: "relative", display: "inline-block" }}>
                more focus
                <span
                  style={{
                    position: "absolute",
                    left: -8,
                    right: -8,
                    bottom: 6,
                    height: 10,
                    background: "rgba(184,243,107,0.28)",
                    zIndex: -1,
                    borderRadius: 4,
                  }}
                />
              </span>
            </h1>

            <p
              style={{
                margin: "22px 0 0 0",
                color: palette.muted,
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: -0.01 * 18,
                textAlign: "center",
                maxWidth: 620,
                lineHeight: 1.5,
              }}
            >
              Synthetic example for illustration only — not measured customer results.
            </p>

            <div style={{ marginTop: 36, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 2, background: palette.accent, borderRadius: 999 }} />
              <span style={{ color: "rgba(245,245,242,0.65)", fontSize: 12, fontWeight: 600, letterSpacing: 0.12 * 12, textTransform: "uppercase" }}>00:00 — 03:00</span>
            </div>
          </div>

          {/* CHART 3-9s */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              opacity: chartOpacity,
              transform: `translateY(${chartY}px)`,
              pointerEvents: "none",
            }}
          >
            {/* Chart header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 20 }}>
              <div>
                <div
                  style={{
                    color: palette.accent,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.14 * 12,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ width: 22, height: 2, background: palette.accent, borderRadius: 999 }} />
                  Illustrative week
                </div>
                <div
                  style={{
                    color: palette.foreground,
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: -0.03 * 36,
                    lineHeight: 1,
                    marginTop: 8,
                  }}
                >
                  Focus hours per day
                </div>
                <div style={{ color: palette.muted, fontSize: 14, fontWeight: 500, marginTop: 8 }}>Linear scale · zero baseline · hours</div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(245,245,242,0.06)",
                  border: "1px solid rgba(245,245,242,0.12)",
                  color: palette.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.06 * 12,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 2, background: palette.accent }} />
                Focus time
                <span style={{ width: 1, height: 14, background: "rgba(177,180,188,0.25)", margin: "0 2px" }} />
                <span style={{ color: palette.foreground }}>Mon — Fri</span>
              </div>
            </div>

            {/* Chart card */}
            <div
              style={{
                background: "rgba(245,245,242,0.06)",
                border: "1px solid rgba(245,245,242,0.12)",
                borderRadius: 24,
                padding: "22px 28px 18px 28px",
                backdropFilter: "blur(6px)",
              }}
            >
              <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
                {/* Y axis */}
                <div style={{ width: 44, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 12, paddingBottom: 34 }}>
                  {[5, 4, 3, 2, 1, 0].map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <span style={{ color: t === 0 ? palette.foreground : "rgba(177,180,188,0.85)", fontSize: 12, fontWeight: t === 0 ? 700 : 600, lineHeight: 1 }}>{t}</span>
                      <span style={{ color: "rgba(177,180,188,0.55)", fontSize: 11, fontWeight: 600 }}>{t === 0 ? "" : "h"}</span>
                    </div>
                  ))}
                </div>

                {/* Bars area */}
                <div style={{ flex: 1, position: "relative" }}>
                  {/* grid lines */}
                  <div style={{ position: "absolute", inset: "12px 0 34px 0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{ height: 1, background: i === 0 ? "rgba(245,245,242,0.22)" : "rgba(245,245,242,0.08)", width: "100%" }} />
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 38, alignItems: "flex-end", height: 360, paddingTop: 12, position: "relative", zIndex: 1 }}>
                    {data.map((d, idx) => {
                      const barSpring = spring({
                        frame: frame - (96 + idx * 7),
                        fps,
                        config: { damping: 22, stiffness: 160, mass: 0.7 },
                      });
                      const clamped = Math.max(0, Math.min(1, barSpring));
                      const maxH = 312; // chart height
                      const h = clamped * (d.value / 5) * maxH;
                      const valueOpacity = interpolate(clamped, [0.85, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                      const labelOpacity = interpolate(frame, [108 + idx * 4, 124 + idx * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                      const isMax = d.value === 5;
                      return (
                        <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                          {/* value */}
                          <div style={{ height: 28, display: "flex", alignItems: "flex-end", marginBottom: 8, opacity: chartOpacity < 0.9 ? 0 : valueOpacity }}>
                            <div
                              style={{
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: isMax ? palette.accent : "rgba(245,245,242,0.96)",
                                color: isMax ? palette.background : "#101114",
                                fontWeight: 800,
                                fontSize: 14,
                                lineHeight: 1,
                                letterSpacing: -0.02 * 14,
                                boxShadow: isMax ? "0 6px 18px rgba(184,243,107,0.35)" : "0 4px 12px rgba(0,0,0,0.18)",
                                border: isMax ? "1px solid rgba(184,243,107,1)" : "1px solid rgba(245,245,242,1)",
                                display: "flex",
                                alignItems: "baseline",
                                gap: 2,
                              }}
                            >
                              {d.value}<span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>h</span>
                            </div>
                          </div>

                          {/* bar */}
                          <div
                            style={{
                              width: "100%",
                              maxWidth: 220,
                              height: maxH,
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "center",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                height: h,
                                background: isMax ? palette.accent : palette.secondary,
                                borderRadius: "14px 14px 10px 10px",
                                position: "relative",
                                overflow: "hidden",
                                boxShadow: isMax ? "0 10px 28px rgba(184,243,107,0.25)" : "0 8px 18px rgba(0,0,0,0.12)",
                                opacity: 0.96,
                              }}
                            >
                              {/* highlight */}
                              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.22), transparent)", borderRadius: "14px 14px 0 0" }} />
                              {/* pattern */}
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  backgroundImage: `linear-gradient(rgba(16,17,20,0.08) 1px, transparent 1px)`,
                                  backgroundSize: "100% 14px",
                                  opacity: 0.5,
                                }}
                              />
                            </div>
                            {/* baseline dot */}
                            <div style={{ position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)", width: h > 4 ? 36 : 0, height: 3, background: isMax ? palette.accent : "rgba(120,185,237,0.9)", borderRadius: 999, opacity: 0.9 }} />
                          </div>

                          {/* day label */}
                          <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12, opacity: labelOpacity }}>
                            <span
                              style={{
                                color: isMax ? palette.foreground : "rgba(245,245,242,0.9)",
                                background: isMax ? "rgba(184,243,107,0.14)" : "transparent",
                                border: isMax ? "1px solid rgba(184,243,107,0.28)" : "1px solid transparent",
                                padding: isMax ? "5px 12px" : "5px 8px",
                                borderRadius: 999,
                                fontSize: 14,
                                fontWeight: isMax ? 800 : 600,
                                letterSpacing: -0.01 * 14,
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.day}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* footer disclaimer inside card */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(245,245,242,0.08)", gap: 16 }}>
                <span style={{ color: palette.muted, fontSize: 11, fontWeight: 600, letterSpacing: 0.04 * 11, lineHeight: 1.4 }}>
                  Illustrative data — not measured customer results · Synthetic values for demonstration
                </span>
                <span style={{ color: "rgba(245,245,242,0.55)", fontSize: 11, fontWeight: 600, letterSpacing: 0.08 * 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>0 h baseline · linear scale</span>
              </div>
            </div>
          </div>

          {/* OUTRO 9-12s */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: outroOpacity,
              transform: `translateY(${outroY}px)`,
              pointerEvents: "none",
            }}
          >
            <div style={{ flex: 1, paddingRight: 40 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(184,243,107,0.12)",
                  border: "1px solid rgba(184,243,107,0.35)",
                  color: palette.accent,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.12 * 12,
                  textTransform: "uppercase",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 999, background: palette.accent }} />
                Illustrative total · Mon–Fri
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 28 }}>
                {(() => {
                  const countFrame = Math.max(0, frame - 270);
                  const countProgress = interpolate(countFrame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const eased = 1 - Math.pow(1 - countProgress, 3);
                  const current = Math.round(eased * 17);
                  // Ensure final 17 is shown fully from 300 onwards
                  const display = frame >= 300 ? 17 : current;
                  return (
                    <>
                      <div style={{ color: palette.accent, fontSize: 168, fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.06em", minWidth: 210 }}>
                        {display}
                      </div>
                      <div style={{ color: palette.foreground, fontSize: 54, fontWeight: 800, letterSpacing: -0.03 * 54, lineHeight: 1, marginBottom: 18 }}>
                        hours of
                        <br />
                        focused work
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
                <div style={{ width: 46, height: 3, background: palette.accent, borderRadius: 999 }} />
                <p style={{ margin: 0, color: palette.muted, fontSize: 15, fontWeight: 500, lineHeight: 1.5, maxWidth: 520 }}>
                  Synthetic weekly total for illustration only — not a measured outcome.
                </p>
              </div>
            </div>

            {/* Right Relay lockup */}
            <div style={{ width: 520, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 18 }}>
              <div
                style={{
                  width: "100%",
                  background: "rgba(245,245,242,0.06)",
                  border: "1px solid rgba(245,245,242,0.12)",
                  borderRadius: 28,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: palette.foreground,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 999, border: `4px solid ${palette.background}`, position: "relative" }}>
                        <div style={{ position: "absolute", width: 22, height: 22, borderRadius: 999, border: `4px solid ${palette.background}`, left: 10, top: -4, background: palette.foreground }} />
                      </div>
                    </div>
                    <div style={{ color: palette.foreground, fontSize: 42, fontWeight: 800, letterSpacing: -0.04 * 42, lineHeight: 1 }}>Relay</div>
                  </div>
                  <div style={{ color: palette.accent, fontSize: 12, fontWeight: 800, letterSpacing: 0.16 * 12, textTransform: "uppercase" }}>● Live</div>
                </div>

                <div style={{ height: 1, background: "rgba(245,245,242,0.1)" }} />

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, background: palette.background, borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(245,245,242,0.08)" }}>
                    <div style={{ color: palette.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.1 * 11, textTransform: "uppercase" }}>Illustrative week</div>
                    <div style={{ color: palette.foreground, fontSize: 18, fontWeight: 800, marginTop: 6, letterSpacing: -0.02 * 18 }}>Mon–Fri · 17h total</div>
                  </div>
                  <div style={{ flex: 1, background: palette.accent, borderRadius: 16, padding: "14px 16px" }}>
                    <div style={{ color: "rgba(16,17,20,0.7)", fontSize: 11, fontWeight: 800, letterSpacing: 0.1 * 11, textTransform: "uppercase" }}>Average</div>
                    <div style={{ color: palette.background, fontSize: 18, fontWeight: 900, marginTop: 6, letterSpacing: -0.02 * 18 }}>3.4h / day</div>
                  </div>
                </div>

                <div style={{ color: palette.muted, fontSize: 12, fontWeight: 500, textAlign: "right", letterSpacing: 0.02 * 12 }}>Illustrative data — not customer results</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(245,245,242,0.45)", fontSize: 11, fontWeight: 600, letterSpacing: 0.1 * 11, textTransform: "uppercase" }}>
                <span style={{ width: 18, height: 1, background: "rgba(245,245,242,0.25)" }} />
                Silent story · 12 seconds
              </div>
            </div>
          </div>
        </div>

        {/* Bottom caption */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: palette.muted, fontSize: 12, fontWeight: 500, letterSpacing: 0.01 * 12 }}>
          <span style={{ opacity: 0.9 }}>No audio · Illustrative example only</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: palette.muted, opacity: 0.6 }} />
            1920×1080 · 30 fps
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
