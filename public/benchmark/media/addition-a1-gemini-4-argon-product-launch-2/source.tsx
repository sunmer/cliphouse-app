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

const FONT_FAMILY = "Archivo, sans-serif";

const withAlpha = (hex: string, alphaHex: string): string => `${hex}${alphaHex}`;

const RelayMark: React.FC<{
  size?: number;
  progress?: number;
}> = ({ size = 64, progress = 1 }) => {
  const shift = interpolate(progress, [0, 1], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(progress, [0, 0.4, 1], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
       fill="none"
      style={{ opacity, display: "block" }}
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        fill={palette.background}
        stroke={withAlpha(palette.foreground, "26")}
        strokeWidth="2"
      />
      <g transform={`translate(${-shift}, 0)`}>
        <rect
          x="13"
          y="16"
          width="26"
          height="12"
          rx="6"
          fill={palette.accent}
        />
      </g>
      <g transform={`translate(${shift}, 0)`}>
        <rect
          x="25"
          y="36"
          width="26"
          height="12"
          rx="6"
          fill={palette.secondary}
        />
      </g>
      <circle
        cx="32"
        cy="32"
        r={interpolate(progress, [0, 1], [0, 4.5], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
        fill={palette.foreground}
      />
    </svg>
  );
};

const AmbientBackground: React.FC<{ frame: number }> = ({ frame }) => {
  const orb1X = interpolate(frame, [0, 360], [20, 75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const orb1Y = interpolate(frame, [0, 360], [25, 65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const orb2X = interpolate(frame, [0, 360], [80, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const orb2Y = interpolate(frame, [0, 360], [75, 30], {
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
          background: `radial-gradient(circle at ${orb1X}% ${orb1Y}%, ${withAlpha(
            palette.accent,
            "16"
          )} 0%, transparent 48%), radial-gradient(circle at ${orb2X}% ${orb2Y}%, ${withAlpha(
            palette.secondary,
            "16"
          )} 0%, transparent 50%)`,
        }}
      />
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, opacity: 0.14 }}
      >
        {Array.from({ length: 17 }).map((_, i) => {
          const x = i * 120;
          return (
            <line
              key={`v-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={1080}
              stroke={palette.muted}
              strokeWidth="1"
              strokeOpacity="0.22"
            />
          );
        })}
        {Array.from({ length: 10 }).map((_, i) => {
          const y = i * 120;
          return (
            <line
              key={`h-${i}`}
              x1={0}
              y1={y}
              x2={1920}
              y2={y}
              stroke={palette.muted}
              strokeWidth="1"
              strokeOpacity="0.22"
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140 },
  });

  const titleSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 16, stiffness: 130 },
  });

  const roomExpand = spring({
    frame: frame - 16,
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  const subtitleSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const exitOpacity = interpolate(frame, [78, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitScale = interpolate(frame, [78, 90], [1, 0.96], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clutterShift = interpolate(roomExpand, [0, 1], [0, 290], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clutterOpacity = interpolate(roomExpand, [0, 0.2, 1], [0, 0.45, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bracketWidth = interpolate(roomExpand, [0, 1], [240, 1060], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: "100px 120px",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      {/* Left & Right Clutter Blocks being pushed aside to "make room" */}
      <div
        style={{
          position: "absolute",
          left: 260 - clutterShift * 0.45,
          top: 340,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          opacity: clutterOpacity,
          transform: `scale(${interpolate(roomExpand, [0, 1], [1, 0.92])})`,
        }}
      >
        {[0, 1, 2].map((idx) => (
          <div
            key={`left-block-${idx}`}
            style={{
              width: 210,
              height: 68,
              borderRadius: 16,
              backgroundColor: withAlpha(palette.foreground, "08"),
              border: `1px solid ${withAlpha(palette.muted, "28")}`,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                width: "55%",
                height: 10,
                borderRadius: 5,
                backgroundColor: withAlpha(palette.muted, "55"),
              }}
            />
            <div
              style={{
                width: "80%",
                height: 8,
                borderRadius: 4,
                backgroundColor: withAlpha(palette.muted, "30"),
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          right: 260 - clutterShift * 0.45,
          top: 340,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          opacity: clutterOpacity,
          transform: `scale(${interpolate(roomExpand, [0, 1], [1, 0.92])})`,
        }}
      >
        {[0, 1, 2].map((idx) => (
          <div
            key={`right-block-${idx}`}
            style={{
              width: 210,
              height: 68,
              borderRadius: 16,
              backgroundColor: withAlpha(palette.foreground, "08"),
              border: `1px solid ${withAlpha(palette.muted, "28")}`,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                width: "65%",
                height: 10,
                borderRadius: 5,
                backgroundColor: withAlpha(palette.muted, "55"),
              }}
            />
            <div
              style={{
                width: "75%",
                height: 8,
                borderRadius: 4,
                backgroundColor: withAlpha(palette.muted, "30"),
              }}
            />
          </div>
        ))}
      </div>

      {/* Central Brand + Tagline Stage */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [28, 0])}px) scale(${interpolate(
              logoSpring,
              [0, 1],
              [0.85, 1]
            )})`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          <RelayMark size={108} progress={logoSpring} />
          <span
            style={{
              fontSize: 136,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: palette.foreground,
              lineHeight: 1,
            }}
          >
            Relay
          </span>
        </div>

        {/* Expanding Focus Room Frame */}
        <div
          style={{
            width: bracketWidth,
            height: 120,
            borderRadius: 28,
            backgroundColor: withAlpha(palette.foreground, "07"),
            border: `2px solid ${withAlpha(palette.accent, "66")}`,
            boxShadow: `0 24px 80px ${withAlpha(palette.accent, "14")}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            opacity: interpolate(subtitleSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* Left Bracket Accent */}
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 22,
              bottom: 22,
              width: 6,
              borderRadius: 3,
              backgroundColor: palette.accent,
            }}
          />
          {/* Right Bracket Accent */}
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 22,
              bottom: 22,
              width: 6,
              borderRadius: 3,
              backgroundColor: palette.secondary,
            }}
          />

          <span
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: palette.foreground,
              whiteSpace: "nowrap",
            }}
          >
            Make room for focused work
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FeatureStepIcon: React.FC<{
  index: number;
  active: boolean;
  completed: boolean;
}> = ({ index, active, completed }) => {
  const strokeColor = active
    ? palette.background
    : completed
    ? palette.accent
    : palette.muted;

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: active
          ? palette.accent
          : completed
          ? withAlpha(palette.accent, "18")
          : withAlpha(palette.foreground, "08"),
        border: `1.5px solid ${
          active
            ? palette.accent
            : completed
            ? withAlpha(palette.accent, "55")
            : withAlpha(palette.muted, "33")
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {index === 0 && (
          <>
            <rect
              x="3"
              y="4"
              width="7"
              height="7"
              rx="2"
              stroke={strokeColor}
              strokeWidth="2.2"
            />
            <rect
              x="14"
              y="4"
              width="7"
              height="7"
              rx="2"
              stroke={strokeColor}
              strokeWidth="2.2"
            />
            <rect
              x="8.5"
              y="14"
              width="7"
              height="7"
              rx="2"
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          </>
        )}
        {index === 1 && (
          <path
            d="M12 3L19 6V11.5C19 16.2 16 19.9 12 21C8 19.9 5 16.2 5 11.5V6L12 3Z"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        )}
        {index === 2 && (
          <path
            d="M4 13.5L9.2 18.5L20 6.5"
            stroke={strokeColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
};

const ProductScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  const exitOpacity = interpolate(frame, [168, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const stageIndex = frame < 60 ? 0 : frame < 120 ? 1 : 2;

  const stage2Progress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 15, stiffness: 110 },
  });

  const stage3Progress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  const features = [
    { title: "Plan together", color: palette.secondary },
    { title: "Protect focus time", color: palette.accent },
    { title: "See progress", color: palette.accent },
  ];

  // Cursor 1 & Cursor 2 motion for "Plan together" (frames 0..60)
  const planDrag1 = spring({
    frame: frame - 8,
    fps,
    config: { damping: 15, stiffness: 110 },
  });
  const planDrag2 = spring({
    frame: frame - 18,
    fps,
    config: { damping: 15, stiffness: 110 },
  });

  const cursorFadeOut = interpolate(frame, [52, 64], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cursor1X = interpolate(planDrag1, [0, 1], [310, 175]);
  const cursor1Y = interpolate(planDrag1, [0, 1], [210, 125]);

  const cursor2X = interpolate(planDrag2, [0, 1], [760, 565]);
  const cursor2Y = interpolate(planDrag2, [0, 1], [260, 125]);

  return (
    <AbsoluteFill
      style={{
        padding: "96px 110px",
        fontFamily: FONT_FAMILY,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
        opacity: exitOpacity,
        transform: `translateY(${interpolate(enterSpring, [0, 1], [32, 0])}px)`,
      }}
    >
      {/* Left Column: Brand + 3 Required Feature Phrases */}
      <div
        style={{
          width: 540,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 820,
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <RelayMark size={52} progress={1} />
          <span
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: palette.foreground,
            }}
          >
            Relay
          </span>
        </div>

        {/* Feature Callout Stack */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {features.map((item, idx) => {
            const isActive = stageIndex === idx;
            const isPassed = stageIndex > idx;
            const cardSpring = spring({
              frame: frame - idx * 60,
              fps,
              config: { damping: 15, stiffness: 130 },
            });

            const localFrame = frame - idx * 60;
            const barFill = interpolate(localFrame, [0, 56], [0, 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={item.title}
                style={{
                  position: "relative",
                  borderRadius: 24,
                  padding: "28px 30px",
                  backgroundColor: isActive
                    ? withAlpha(palette.foreground, "0D")
                    : withAlpha(palette.foreground, "04"),
                  border: `2px solid ${
                    isActive
                      ? item.color
                      : isPassed
                      ? withAlpha(palette.accent, "44")
                      : withAlpha(palette.muted, "22")
                  }`,
                  transform: `scale(${
                    isActive
                      ? interpolate(cardSpring, [0, 1], [0.97, 1.02])
                      : 0.98
                  })`,
                  boxShadow: isActive
                    ? `0 20px 60px ${withAlpha(item.color, "18")}`
                    : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <FeatureStepIcon
                    index={idx}
                    active={isActive}
                    completed={isPassed}
                  />
                  <span
                    style={{
                      fontSize: 42,
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      color: isActive
                        ? palette.foreground
                        : isPassed
                        ? withAlpha(palette.foreground, "CC")
                        : palette.muted,
                      lineHeight: 1.1,
                    }}
                  >
                    {item.title}
                  </span>
                </div>

                {/* Active Stage Timeline Indicator Bar */}
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: withAlpha(palette.muted, "24"),
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${isPassed ? 100 : isActive ? barFill : 0}%`,
                      height: "100%",
                      borderRadius: 3,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtle Subtitle Echo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: palette.accent,
            }}
          />
          <span
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: palette.muted,
              letterSpacing: "-0.01em",
            }}
          >
            Make room for focused work
          </span>
        </div>
      </div>

      {/* Right Column: Animated Product Interface */}
      <div
        style={{
          flex: 1,
          height: 820,
          borderRadius: 32,
          backgroundColor: palette.background,
          border: `2px solid ${withAlpha(palette.foreground, "1F")}`,
          boxShadow: `0 32px 100px ${withAlpha(palette.background, "CC")}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* App Window Top Bar */}
        <div
          style={{
            height: 78,
            padding: "0 32px",
            borderBottom: `1px solid ${withAlpha(palette.foreground, "14")}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: withAlpha(palette.foreground, "04"),
          }}
        >
          {/* Window Controls + Workspace Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {[0, 1, 2].map((dot) => (
                <div
                  key={dot}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: withAlpha(palette.muted, "44"),
                  }}
                />
              ))}
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                backgroundColor: withAlpha(palette.foreground, "18"),
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RelayMark size={28} progress={1} />
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: palette.foreground,
                  letterSpacing: "-0.02em",
                }}
              >
                Relay
              </span>
            </div>
          </div>

          {/* Active Mode Pill inside UI */}
          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              backgroundColor: withAlpha(
                features[stageIndex].color,
                "18"
              ),
              border: `1.5px solid ${features[stageIndex].color}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: features[stageIndex].color,
              }}
            />
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: palette.foreground,
                letterSpacing: "-0.01em",
              }}
            >
              {features[stageIndex].title}
            </span>
          </div>

          {/* Team Presence Avatars */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {[palette.accent, palette.secondary, palette.foreground].map(
              (col, i) => (
                <div
                  key={i}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: withAlpha(col, "28"),
                    border: `2px solid ${col}`,
                    marginLeft: i === 0 ? 0 : -10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: col,
                    }}
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Main 5-Column Weekly Planning Grid */}
        <div
          style={{
            flex: 1,
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            position: "relative",
          }}
        >
          {/* 5 Columns Container */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 18,
              position: "relative",
            }}
          >
            {Array.from({ length: 5 }).map((_, colIdx) => {
              const colCheckSpring = spring({
                frame: frame - 124 - colIdx * 5,
                fps,
                config: { damping: 14, stiffness: 140 },
              });

              const isDraggedCol1 = colIdx === 1;
              const isDraggedCol3 = colIdx === 3;

              const cardTopOffset = isDraggedCol1
                ? interpolate(planDrag1, [0, 1], [65, 0])
                : isDraggedCol3
                ? interpolate(planDrag2, [0, 1], [95, 0])
                : 0;

              const cardTopXOffset = isDraggedCol1
                ? interpolate(planDrag1, [0, 1], [90, 0])
                : isDraggedCol3
                ? interpolate(planDrag2, [0, 1], [110, 0])
                : 0;

              const bottomCardPush = interpolate(
                stage2Progress,
                [0, 1],
                [0, 138],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }
              );

              return (
                <div
                  key={`col-${colIdx}`}
                  style={{
                    borderRadius: 20,
                    backgroundColor: withAlpha(palette.foreground, "04"),
                    border: `1px solid ${withAlpha(palette.foreground, "10")}`,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                  }}
                >
                  {/* Column Header + Progress Bar */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      paddingBottom: 8,
                      borderBottom: `1px solid ${withAlpha(
                        palette.foreground,
                        "0D"
                      )}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: withAlpha(palette.foreground, "40"),
                        }}
                      />
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor:
                            colCheckSpring > 0.1
                              ? palette.accent
                              : withAlpha(palette.foreground, "12"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `scale(${interpolate(
                            colCheckSpring,
                            [0, 1],
                            [0.8, 1]
                          )})`,
                        }}
                      >
                        {colCheckSpring > 0.1 && (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M3 7.5L5.8 10.2L11 4"
                              stroke={palette.background}
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: withAlpha(palette.foreground, "12"),
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${interpolate(
                            colCheckSpring,
                            [0, 1],
                            [35, 100]
                          )}%`,
                          height: "100%",
                          borderRadius: 3,
                          backgroundColor:
                            colCheckSpring > 0.1
                              ? palette.accent
                              : palette.secondary,
                        }}
                      />
                    </div>
                  </div>

                  {/* Top Task Card (collaboratively aligned in Stage 1) */}
                  <div
                    style={{
                      height: 96,
                      borderRadius: 14,
                      backgroundColor: withAlpha(palette.foreground, "0A"),
                      border: `1.5px solid ${
                        colCheckSpring > 0.2
                          ? withAlpha(palette.accent, "88")
                          : isDraggedCol1 || isDraggedCol3
                          ? palette.secondary
                          : withAlpha(palette.foreground, "18")
                      }`,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transform: `translate(${cardTopXOffset}px, ${cardTopOffset}px)`,
                      zIndex: 3,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "62%",
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: palette.foreground,
                        }}
                      />
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor:
                            colIdx % 2 === 0
                              ? palette.accent
                              : palette.secondary,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: "85%",
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: withAlpha(palette.muted, "66"),
                      }}
                    />
                    <div
                      style={{
                        width: "45%",
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: withAlpha(palette.muted, "44"),
                      }}
                    />
                  </div>

                  {/* Bottom Task Card (slides down to make room for Focus Shield in Stage 2) */}
                  <div
                    style={{
                      height: 88,
                      borderRadius: 14,
                      backgroundColor: withAlpha(palette.foreground, "07"),
                      border: `1px solid ${
                        colCheckSpring > 0.2
                          ? withAlpha(palette.accent, "66")
                          : withAlpha(palette.foreground, "14")
                      }`,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transform: `translateY(${bottomCardPush}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: "72%",
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: withAlpha(palette.foreground, "88"),
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: "50%",
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: withAlpha(palette.muted, "55"),
                        }}
                      />
                      <div
                        style={{
                          width: 24,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor:
                            colCheckSpring > 0.2
                              ? palette.accent
                              : withAlpha(palette.secondary, "66"),
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Stage 2: Protected Focus Time橫跨5列的防護區塊 */}
            {frame >= 56 && (
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  top: 186,
                  height: 118,
                  borderRadius: 20,
                  backgroundColor: withAlpha(palette.background, "E6"),
                  border: `2.5px solid ${palette.accent}`,
                  boxShadow: `0 18px 50px ${withAlpha(palette.accent, "28")}`,
                  transform: `scaleX(${interpolate(
                    stage2Progress,
                    [0, 1],
                    [0.15, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }
                  )})`,
                  opacity: interpolate(stage2Progress, [0, 0.25, 1], [0, 1, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transformOrigin: "left center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 32px",
                  overflow: "hidden",
                  zIndex: 6,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, ${withAlpha(
                      palette.accent,
                      "24"
                    )} 0%, ${withAlpha(palette.secondary, "16")} 100%)`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: palette.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3L19 6V11.5C19 16.2 16 19.9 12 21C8 19.9 5 16.2 5 11.5V6L12 3Z"
                        stroke={palette.background}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: palette.foreground,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Protect focus time
                  </span>
                </div>

                {/* 5 Protected Slot Pills */}
                <div style={{ display: "flex", gap: 12, zIndex: 1 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 46,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: palette.accent,
                        opacity: interpolate(
                          stage2Progress,
                          [0.2 + i * 0.1, 0.5 + i * 0.1],
                          [0.25, 1],
                          {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          }
                        ),
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Collaborative Cursors in Stage 1 */}
            {cursorFadeOut > 0.01 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: cursor1X,
                    top: cursor1Y,
                    opacity: cursorFadeOut,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path
                      d="M4 4L12 24L15.5 15.5L24 12L4 4Z"
                      fill={palette.accent}
                      stroke={palette.background}
                      strokeWidth="2"
                    />
                  </svg>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      backgroundColor: palette.accent,
                      color: palette.background,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    Plan together
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: cursor2X,
                    top: cursor2Y,
                    opacity: cursorFadeOut,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path
                      d="M4 4L12 24L15.5 15.5L24 12L4 4Z"
                      fill={palette.secondary}
                      stroke={palette.background}
                      strokeWidth="2"
                    />
                  </svg>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      backgroundColor: palette.secondary,
                      color: palette.background,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    Relay
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Progress Bar & Velocity Drawer (illuminates in Stage 3 "See progress") */}
          <div
            style={{
              height: 156,
              borderRadius: 22,
              backgroundColor: withAlpha(
                palette.foreground,
                stageIndex === 2 ? "0C" : "05"
              ),
              border: `2px solid ${
                stageIndex === 2
                  ? palette.accent
                  : withAlpha(palette.foreground, "12")
              }`,
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              {/* Circular Progress Ring */}
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r="34"
                  fill="none"
                  stroke={withAlpha(palette.muted, "28")}
                  strokeWidth="8"
                />
                <circle
                  cx="44"
                  cy="44"
                  r="34"
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={
                    2 *
                    Math.PI *
                    34 *
                    (1 -
                      interpolate(
                        frame,
                        [0, 60, 120, 165],
                        [0.25, 0.5, 0.65, 1],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }
                      ))
                  }
                  transform="rotate(-90 44 44)"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={interpolate(stage3Progress, [0, 1], [6, 12], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                  fill={palette.accent}
                />
              </svg>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: palette.foreground,
                    letterSpacing: "-0.02em",
                  }}
                >
                  See progress
                </span>
                <div
                  style={{
                    width: 240,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: withAlpha(palette.muted, "30"),
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${interpolate(
                        frame,
                        [0, 120, 165],
                        [32, 64, 100],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }
                      )}%`,
                      height: "100%",
                      backgroundColor: palette.accent,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Animated Rising Weekly Completion Bars */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 16,
                height: 92,
                paddingBottom: 4,
              }}
            >
              {[0.48, 0.62, 0.74, 0.88, 1].map((target, idx) => {
                const barSpring = spring({
                  frame: frame - 120 - idx * 4,
                  fps,
                  config: { damping: 14, stiffness: 130 },
                });
                const h = interpolate(
                  barSpring,
                  [0, 1],
                  [26, 84 * target],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                );
                return (
                  <div
                    key={idx}
                    style={{
                      width: 34,
                      height: h,
                      borderRadius: 10,
                      backgroundColor:
                        barSpring > 0.2
                          ? idx % 2 === 0
                            ? palette.accent
                            : palette.secondary
                          : withAlpha(palette.muted, "38"),
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fast entrance so the final message is 100% readable from frame 14 to 90 (2.53s > 2s)
  const entrance = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 170 },
  });

  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(entrance, [0, 1], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: "100px 140px",
        fontFamily: FONT_FAMILY,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1520,
          borderRadius: 40,
          backgroundColor: withAlpha(palette.foreground, "06"),
          border: `2px solid ${withAlpha(palette.accent, "66")}`,
          boxShadow: `0 40px 120px ${withAlpha(palette.accent, "14")}`,
          padding: "76px 96px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 44,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {/* Brand Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "12px 28px",
            borderRadius: 999,
            backgroundColor: withAlpha(palette.foreground, "0A"),
            border: `1.5px solid ${withAlpha(palette.foreground, "24")}`,
          }}
        >
          <RelayMark size={42} progress={1} />
          <span
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: palette.foreground,
              letterSpacing: "-0.03em",
            }}
          >
            Relay
          </span>
        </div>

        {/* Final Headline: Fully readable for > 2.5 seconds */}
        <h1
          style={{
            margin: 0,
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: palette.foreground,
            textAlign: "center",
          }}
        >
          Start your next week with{" "}
          <span style={{ color: palette.accent }}>Relay</span>
        </h1>

        {/* 5-Day Focused Week Strip Echo */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 20,
            width: "100%",
            maxWidth: 1120,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const pillSpring = spring({
              frame: frame - 4 - i * 3,
              fps,
              config: { damping: 15, stiffness: 150 },
            });
            return (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: withAlpha(palette.background, "CC"),
                  border: `2px solid ${
                    i % 2 === 0 ? palette.accent : palette.secondary
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 20px",
                  transform: `scale(${interpolate(
                    pillSpring,
                    [0, 1],
                    [0.9, 1]
                  )})`,
                }}
              >
                <div
                  style={{
                    width: "55%",
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: palette.foreground,
                  }}
                />
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor:
                      i % 2 === 0 ? palette.accent : palette.secondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7.5L5.8 10.2L11 4"
                      stroke={palette.background}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            );
          })}
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
      <AmbientBackground frame={frame} />

      {/* 0s - 3s (Frames 0 - 90): Introduce "Relay" and "Make room for focused work" */}
      <Sequence from={0} durationInFrames={90}>
        <IntroScene />
      </Sequence>

      {/* 3s - 9s (Frames 90 - 270): "Plan together", "Protect focus time", "See progress" */}
      <Sequence from={90} durationInFrames={180}>
        <ProductScene />
      </Sequence>

      {/* 9s - 12s (Frames 270 - 360): "Start your next week with Relay" */}
      <Sequence from={270} durationInFrames={90}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
