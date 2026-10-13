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

const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const withAlpha = (hex: string, alpha: number): string => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const RelayLogo: React.FC<{
  size?: number;
  progress?: number;
}> = ({ size = 64, progress = 1 }) => {
  const slide = interpolate(progress, [0, 1], [-8, 8], CLAMP);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill={withAlpha(palette.foreground, 0.05)}
        stroke={withAlpha(palette.foreground, 0.16)}
        strokeWidth="2"
      />
      {/* Top baton track */}
      <rect
        x={14 - slide * 0.5}
        y="18"
        width="28"
        height="10"
        rx="5"
        fill={palette.secondary}
      />
      {/* Handoff connector */}
      <path
        d={`M ${32 - slide * 0.3} 28 L ${32 + slide * 0.3} 36`}
        stroke={withAlpha(palette.foreground, 0.5)}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Bottom focus baton track */}
      <rect
        x={22 + slide * 0.5}
        y="36"
        width="28"
        height="10"
        rx="5"
        fill={palette.accent}
      />
      <circle
        cx={43 + slide * 0.5}
        cy="41"
        r="3"
        fill={palette.background}
      />
    </svg>
  );
};

const CursorArrow: React.FC<{
  x: number;
  y: number;
  color: string;
  scale?: number;
  opacity?: number;
}> = ({ x, y, color, scale = 1, opacity = 1 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        opacity,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M4 3L23 11.5L14 14.5L11 23.5L4 3Z"
          fill={color}
          stroke={palette.background}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clutter blocks parting to "make room for focused work"
  const partProgress = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.9 },
  });

  const logoProgress = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.8 },
  });

  const headlineProgress = spring({
    frame: Math.max(0, frame - 16),
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.85 },
  });

  // Transition out into Scene 2 between frames 80 and 90
  const exitProgress = interpolate(frame, [80, 90], [0, 1], CLAMP);
  const containerScale = interpolate(exitProgress, [0, 1], [1, 0.95], CLAMP);
  const containerOpacity = interpolate(exitProgress, [0, 1], [1, 0], CLAMP);

  const roomWidth = interpolate(partProgress, [0, 1], [240, 1380], CLAMP);
  const roomHeight = interpolate(partProgress, [0, 1], [180, 560], CLAMP);

  const leftBlocks = [
    { top: 220, height: 110, width: 220, offset: 0 },
    { top: 360, height: 140, width: 260, offset: 30 },
    { top: 530, height: 110, width: 200, offset: 15 },
    { top: 670, height: 120, width: 240, offset: 40 },
  ];

  const rightBlocks = [
    { top: 210, height: 120, width: 240, offset: 20 },
    { top: 360, height: 110, width: 210, offset: 0 },
    { top: 500, height: 140, width: 250, offset: 35 },
    { top: 670, height: 110, width: 220, offset: 10 },
  ];

  const pushDistance = interpolate(partProgress, [0, 1], [0, 560], CLAMP);
  const clutterOpacity = interpolate(partProgress, [0, 0.7, 1], [0.55, 0.25, 0.12], CLAMP);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
      }}
    >
      {/* Parting background blocks illustrating clearing space for focus */}
      {leftBlocks.map((b, i) => (
        <div
          key={`left-${i}`}
          style={{
            position: "absolute",
            left: 560 - pushDistance - b.offset,
            top: b.top,
            width: b.width,
            height: b.height,
            borderRadius: 18,
            backgroundColor: withAlpha(palette.muted, clutterOpacity),
            border: `1px solid ${withAlpha(palette.foreground, clutterOpacity * 0.5)}`,
          }}
        />
      ))}
      {rightBlocks.map((b, i) => (
        <div
          key={`right-${i}`}
          style={{
            position: "absolute",
            right: 560 - pushDistance - b.offset,
            top: b.top,
            width: b.width,
            height: b.height,
            borderRadius: 18,
            backgroundColor: withAlpha(palette.muted, clutterOpacity),
            border: `1px solid ${withAlpha(palette.foreground, clutterOpacity * 0.5)}`,
          }}
        />
      ))}

      {/* Cleared architectural focus zone */}
      <div
        style={{
          width: roomWidth,
          height: roomHeight,
          borderRadius: 36,
          backgroundColor: withAlpha(palette.foreground, 0.03),
          border: `1.5px solid ${withAlpha(palette.accent, interpolate(partProgress, [0, 1], [0.15, 0.45], CLAMP))}`,
          boxShadow: `0 30px 90px ${withAlpha(palette.background, 0.85)}, inset 0 0 80px ${withAlpha(palette.accent, 0.05)}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          padding: "48px 64px",
        }}
      >
        {/* Left & Right Accent Brackets */}
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 48,
            bottom: 48,
            width: 4,
            borderRadius: 2,
            backgroundColor: palette.accent,
            opacity: interpolate(partProgress, [0.2, 1], [0, 0.85], CLAMP),
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 48,
            bottom: 48,
            width: 4,
            borderRadius: 2,
            backgroundColor: palette.accent,
            opacity: interpolate(partProgress, [0.2, 1], [0, 0.85], CLAMP),
          }}
        />

        {/* Relay Brand Identity */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: interpolate(logoProgress, [0, 0.6], [0, 1], CLAMP),
            transform: `translateY(${interpolate(logoProgress, [0, 1], [24, 0], CLAMP)}px) scale(${interpolate(logoProgress, [0, 1], [0.92, 1], CLAMP)})`,
            marginBottom: 32,
          }}
        >
          <RelayLogo size={84} progress={logoProgress} />
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: palette.foreground,
              lineHeight: 1,
            }}
          >
            Relay
          </span>
        </div>

        {/* Tagline: Make room for focused work */}
        <div
          style={{
            opacity: interpolate(headlineProgress, [0, 0.7], [0, 1], CLAMP),
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [28, 0], CLAMP)}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "14px 32px",
              borderRadius: 999,
              backgroundColor: withAlpha(palette.accent, 0.12),
              border: `1px solid ${withAlpha(palette.accent, 0.35)}`,
            }}
          >
            <span
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 54,
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: palette.foreground,
                lineHeight: 1.15,
                 whiteSpace: "nowrap",
              }}
            >
              Make room for focused work
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProductInterfaceScene: React.FC = () => {
  const frame = useCurrentFrame(); // 0..179 (global 90..269)
  const { fps } = useVideoConfig();

  // Three 60-frame chapters:
  // 0..59: Plan together
  // 60..119: Protect focus time
  // 120..179: See progress
  const activePhase = frame < 60 ? 0 : frame < 120 ? 1 : 2;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 17, stiffness: 120, mass: 0.9 },
  });

  const exitProgress = interpolate(frame, [170, 180], [0, 1], CLAMP);
  const sceneScale = interpolate(enterSpring, [0, 1], [0.94, 1], CLAMP) *
    interpolate(exitProgress, [0, 1], [1, 0.96], CLAMP);
  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], CLAMP) *
    interpolate(exitProgress, [0, 1], [1, 0], CLAMP);

  // Phase transitions
  const phase1Spring = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.85 },
  });

  const phase2Spring = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.85 },
  });

  const phase3Spring = spring({
    frame: Math.max(0, frame - 120),
    fps,
    config: { damping: 16, stiffness: 115, mass: 0.9 },
  });

  const steps = [
    { num: "01", label: "Plan together", color: palette.secondary },
    { num: "02", label: "Protect focus time", color: palette.accent },
    { num: "03", label: "See progress", color: palette.accent },
  ];

  const days = ["M", "T", "W", "T", "F"];

  // Task block definitions on the 5-column schedule
  const taskCards = [
    {
      id: 0,
      col: 0,
      row: 0,
      startColOffset: -0.55,
      startRowOffset: 0.45,
      color: palette.secondary,
      delay: 6,
    },
    {
      id: 1,
      col: 1,
      row: 0,
      startColOffset: 0.65,
      startRowOffset: 0.8,
      color: palette.secondary,
      delay: 12,
    },
    {
      id: 2,
      col: 2,
      row: 2,
      startColOffset: -0.7,
      startRowOffset: -0.6,
      color: palette.accent,
      delay: 16,
    },
    {
      id: 3,
      col: 3,
      row: 0,
      startColOffset: 0.5,
      startRowOffset: 0.6,
      color: palette.secondary,
      delay: 20,
    },
    {
      id: 4,
      col: 4,
      row: 2,
      startColOffset: -0.45,
      startRowOffset: -0.75,
      color: palette.accent,
      delay: 24,
    },
  ];

  // Width of the schedule area shrinks smoothly in Phase 3 to reveal the Progress Drawer
  const scheduleWidth = interpolate(phase3Spring, [0, 1], [1040, 620], CLAMP);
  const colWidth = (scheduleWidth - 88) / 5;

  // Progress percentage for Phase 3
  const progressPct = Math.round(
    interpolate(frame, [124, 158], [0, 100], CLAMP)
  );
  const ringRadius = 74;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference * (1 - interpolate(frame, [124, 158], [0, 1], CLAMP));

  // Cursors for Phase 1 ("Plan together")
  const cursorOpacity = interpolate(frame, [4, 12, 48, 58], [0, 1, 1, 0], CLAMP);
  const cursor1X = interpolate(
    phase1Spring,
    [0, 1],
    [220, 110 + colWidth * 1.4],
    CLAMP
  );
  const cursor1Y = interpolate(phase1Spring, [0, 1], [340, 175], CLAMP);

  const cursor2X = interpolate(
    phase1Spring,
    [0, 1],
    [760, 110 + colWidth * 2.4],
    CLAMP
  );
  const cursor2Y = interpolate(phase1Spring, [0, 1], [230, 515], CLAMP);

  return (
    <AbsoluteFill
      style={{
        padding: "84px 104px",
        opacity: sceneOpacity,
        transform: `scale(${sceneScale})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: 84,
          borderRadius: 22,
          backgroundColor: withAlpha(palette.foreground, 0.04),
          border: `1px solid ${withAlpha(palette.foreground, 0.1)}`,
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <RelayLogo size={44} progress={1} />
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: palette.foreground,
            }}
          >
            Relay
          </span>
        </div>

        {/* Stepper Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {steps.map((step, idx) => {
            const isActive = activePhase === idx;
            const isDone = activePhase > idx;
            return (
              <div
                key={step.num}
                style={{
                  padding: "10px 22px",
                  borderRadius: 999,
                  backgroundColor: isActive
                    ? withAlpha(step.color, 0.16)
                    : withAlpha(palette.foreground, 0.03),
                  border: `1.5px solid ${
                    isActive
                      ? step.color
                      : isDone
                      ? withAlpha(step.color, 0.45)
                      : withAlpha(palette.foreground, 0.1)
                  }`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 16,
                    fontWeight: 700,
                    color: isActive || isDone ? step.color : palette.muted,
                  }}
                >
                  {step.num}
                </span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 20,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? palette.foreground : palette.muted,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Stage */}
      <div
        style={{
          height: 796,
          display: "flex",
          gap: 36,
          alignItems: "stretch",
        }}
      >
        {/* Left Column: Active Feature Callout & Chapter Timeline */}
        <div
          style={{
            width: 560,
            borderRadius: 28,
            backgroundColor: withAlpha(palette.foreground, 0.03),
            border: `1px solid ${withAlpha(palette.foreground, 0.1)}`,
            padding: "44px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Large Active Feature Headline */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 16px",
                borderRadius: 999,
                backgroundColor: withAlpha(steps[activePhase].color, 0.14),
                border: `1px solid ${withAlpha(steps[activePhase].color, 0.4)}`,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: steps[activePhase].color,
                }}
              />
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 18,
                  fontWeight: 700,
                  color: steps[activePhase].color,
                  letterSpacing: "0.04em",
                }}
              >
                {steps[activePhase].num}
              </span>
            </div>

            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 64,
                fontWeight: 700,
                color: palette.foreground,
                letterSpacing: "-0.035em",
                lineHeight: 1.06,
                minHeight: 150,
              }}
            >
              {steps[activePhase].label}
            </div>
          </div>

          {/* Three-Chapter Interactive Progress Stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {steps.map((step, idx) => {
              const segStart = idx * 60;
              const segEnd = (idx + 1) * 60;
              const fill = interpolate(frame, [segStart, segEnd], [0, 1], CLAMP);
              const isCurrent = activePhase === idx;
              return (
                <div
                  key={step.num}
                  style={{
                    padding: "20px 24px",
                    borderRadius: 20,
                    backgroundColor: isCurrent
                      ? withAlpha(palette.foreground, 0.06)
                      : withAlpha(palette.foreground, 0.02),
                    border: `1px solid ${
                      isCurrent
                        ? withAlpha(step.color, 0.5)
                        : withAlpha(palette.foreground, 0.08)
                    }`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontSize: 26,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? palette.foreground : palette.muted,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {step.label}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontSize: 18,
                        fontWeight: 700,
                        color: fill > 0 ? step.color : palette.muted,
                      }}
                    >
                      {step.num}
                    </span>
                  </div>

                  {/* Progress bar track */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: withAlpha(palette.foreground, 0.08),
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${fill * 100}%`,
                        height: "100%",
                        borderRadius: 3,
                        backgroundColor: step.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Animated Product Interface Canvas */}
        <div
          style={{
            flex: 1,
            borderRadius: 28,
            backgroundColor: withAlpha(palette.foreground, 0.03),
            border: `1px solid ${withAlpha(palette.foreground, 0.12)}`,
            padding: 32,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            gap: 24,
          }}
        >
          {/* Schedule Grid Area */}
          <div
            style={{
              width: scheduleWidth,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* Day Columns Header */}
            <div
              style={{
                display: "flex",
                paddingLeft: 88,
                height: 52,
                alignItems: "center",
                borderBottom: `1px solid ${withAlpha(palette.foreground, 0.1)}`,
              }}
            >
              {days.map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: colWidth,
                    textAlign: "center",
                    fontFamily: FONT_FAMILY,
                    fontSize: 20,
                    fontWeight: 700,
                    color: palette.muted,
                    letterSpacing: "0.04em",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 3 Horizontal Swimlanes: Morning (Row 0), Focus Corridor (Row 1), Afternoon (Row 2) */}
            <div
              style={{
                flex: 1,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingTop: 20,
              }}
            >
              {["09:00", "11:00", "15:00"].map((timeLabel, rowIdx) => (
                <div
                  key={timeLabel}
                  style={{
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    borderBottom:
                      rowIdx < 2
                        ? `1px dashed ${withAlpha(palette.foreground, 0.08)}`
                        : "none",
                    position: "relative",
                  }}
                >
                  {/* Time & Avatar Column */}
                  <div
                    style={{
                      width: 88,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontSize: 16,
                        fontWeight: 600,
                        color: palette.muted,
                      }}
                    >
                      {timeLabel}
                    </span>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: withAlpha(
                          rowIdx === 1 ? palette.accent : palette.secondary,
                          0.2
                        ),
                        border: `2px solid ${
                          rowIdx === 1 ? palette.accent : palette.secondary
                        }`,
                      }}
                    />
                  </div>

                  {/* Day Grid Cells */}
                  <div style={{ display: "flex", flex: 1, height: "100%" }}>
                    {days.map((_, colIdx) => (
                      <div
                        key={colIdx}
                        style={{
                          width: colWidth,
                          height: "100%",
                          borderLeft: `1px solid ${withAlpha(palette.foreground, 0.05)}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Animated Collaborative Task Cards (Phase 1 -> Phase 3) */}
              {taskCards.map((card, idx) => {
                const cardSpring = spring({
                  frame: Math.max(0, frame - card.delay),
                  fps,
                  config: { damping: 14, stiffness: 120, mass: 0.8 },
                });

                const currentCol = interpolate(
                  cardSpring,
                  [0, 1],
                  [card.col + card.startColOffset, card.col],
                  CLAMP
                );
                const currentRow = interpolate(
                  cardSpring,
                  [0, 1],
                  [card.row + card.startRowOffset, card.row],
                  CLAMP
                );

                const checkSpring = spring({
                  frame: Math.max(0, frame - (124 + idx * 5)),
                  fps,
                  config: { damping: 14, stiffness: 150 },
                });

                const cardX = 88 + currentCol * colWidth + 10;
                const cardY = 20 + currentRow * 215 + 24;
                const cardW = colWidth - 20;
                const cardH = 148;

                return (
                  <div
                    key={card.id}
                    style={{
                      position: "absolute",
                      left: cardX,
                      top: cardY,
                      width: cardW,
                      height: cardH,
                      borderRadius: 18,
                      backgroundColor: withAlpha(
                        checkSpring > 0.1 ? palette.accent : card.color,
                        0.15
                      ),
                      border: `2px solid ${
                        checkSpring > 0.1 ? palette.accent : card.color
                      }`,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: `0 12px 30px ${withAlpha(palette.background, 0.5)}`,
                      zIndex: 10,
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
                          width: 34,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor:
                            checkSpring > 0.1 ? palette.accent : card.color,
                        }}
                      />
                      {/* Completion Check Badge */}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor:
                            checkSpring > 0.1
                              ? palette.accent
                              : withAlpha(palette.foreground, 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `scale(${interpolate(checkSpring, [0, 0.5, 1], [0.85, 1.15, 1], CLAMP)})`,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3.5 8.5L6.5 11.5L12.5 4.5"
                            stroke={palette.background}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="16"
                            strokeDashoffset={interpolate(
                              checkSpring,
                              [0, 1],
                              [16, 0],
                              CLAMP
                            )}
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Structural task progress bars */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: "80%",
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: withAlpha(palette.foreground, 0.25),
                        }}
                      />
                      <div
                        style={{
                          width: "100%",
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: withAlpha(palette.foreground, 0.12),
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${interpolate(checkSpring, [0, 1], [35, 100], CLAMP)}%`,
                            height: "100%",
                            backgroundColor:
                              checkSpring > 0.1 ? palette.accent : card.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Phase 2: "Protect focus time" Shield Band across Middle Row */}
              <div
                style={{
                  position: "absolute",
                  left: 88,
                  top: 238,
                  width: (scheduleWidth - 88) * interpolate(phase2Spring, [0, 1], [0, 1], CLAMP),
                  height: 192,
                  borderRadius: 22,
                  backgroundColor: withAlpha(palette.accent, 0.16),
                  border: `2.5px solid ${palette.accent}`,
                  boxShadow: `0 0 50px ${withAlpha(palette.accent, 0.22)}`,
                  opacity: interpolate(phase2Spring, [0, 0.15], [0, 1], CLAMP),
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
                }}
              >
                {/* Subtle Diagonal Protection Hatch */}
                <svg
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", inset: 0, opacity: 0.16 }}
                >
                  <defs>
                    <pattern
                      id="focusHatch"
                      width="24"
                      height="24"
                      patternTransform="rotate(45 0 0)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="24"
                        stroke={palette.accent}
                        strokeWidth="3"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#focusHatch)" />
                </svg>

                {/* Focus Shield Badge */}
                <div
                  style={{
                    padding: "16px 28px",
                    borderRadius: 999,
                    backgroundColor: palette.background,
                    border: `2px solid ${palette.accent}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transform: `scale(${interpolate(phase2Spring, [0.3, 1], [0.85, 1], CLAMP)})`,
                    whiteSpace: "nowrap",
                    zIndex: 2,
                  }}
                >
                  {/* Shield SVG Icon */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path
                      d="M14 3L23 7V13.5C23 19.2 19.1 23.9 14 25.5C8.9 23.9 5 19.2 5 13.5V7L14 3Z"
                      fill={palette.accent}
                    />
                    <path
                      d="M10.5 14L13 16.5L18 11.5"
                      stroke={palette.background}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontFamily: FONT_FAMILY,
                      fontSize: 26,
                      fontWeight: 700,
                      color: palette.foreground,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Protect focus time
                  </span>
                </div>
              </div>

              {/* Collaborative Cursors during Phase 1 */}
              <CursorArrow
                x={cursor1X}
                y={cursor1Y}
                color={palette.secondary}
                opacity={cursorOpacity}
              />
              <CursorArrow
                x={cursor2X}
                y={cursor2Y}
                color={palette.accent}
                opacity={cursorOpacity}
              />
            </div>
          </div>

          {/* Phase 3: "See progress" Analytics Drawer */}
          <div
            style={{
              width: 396,
              height: "100%",
              borderRadius: 22,
              backgroundColor: withAlpha(palette.background, 0.75),
              border: `1.5px solid ${withAlpha(palette.accent, 0.4)}`,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: interpolate(phase3Spring, [0.05, 0.4], [0, 1], CLAMP),
              transform: `translateX(${interpolate(phase3Spring, [0, 1], [60, 0], CLAMP)}px)`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 26,
                  fontWeight: 700,
                  color: palette.foreground,
                  letterSpacing: "-0.02em",
                }}
              >
                See progress
              </span>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: palette.accent,
                }}
              />
            </div>

            {/* Radial Completion Ring */}
            <div
              style={{
                position: "relative",
                width: 190,
                height: 190,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="190"
                height="190"
                viewBox="0 0 190 190"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="95"
                  cy="95"
                  r={ringRadius}
                  stroke={withAlpha(palette.foreground, 0.1)}
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="95"
                  cy="95"
                  r={ringRadius}
                  stroke={palette.accent}
                  strokeWidth="16"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 46,
                    fontWeight: 700,
                    color: palette.foreground,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {progressPct}%
                </span>
              </div>
            </div>

            {/* 5-Day Completion Bars */}
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                height: 150,
                padding: "0 12px",
              }}
            >
              {days.map((d, idx) => {
                const barSpring = spring({
                  frame: Math.max(0, frame - (126 + idx * 4)),
                  fps,
                  config: { damping: 13, stiffness: 130 },
                });
                const heights = [96, 112, 124, 118, 134];
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: heights[idx] * barSpring,
                        borderRadius: 10,
                        backgroundColor:
                          idx >= 2 ? palette.accent : palette.secondary,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontSize: 16,
                        fontWeight: 700,
                        color: palette.muted,
                      }}
                    >
                      {d}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FinaleScene: React.FC = () => {
  const frame = useCurrentFrame(); // 0..89 (global 270..359)
  const { fps } = useVideoConfig();

  // Fast, decisive entrance so the final message is 100% settled by local frame 14 (2.53s of full readability)
  const entrance = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 180, mass: 0.75 },
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], CLAMP);
  const translateY = interpolate(entrance, [0, 1], [28, 0], CLAMP);
  const scale = interpolate(entrance, [0, 1], [0.95, 1], CLAMP);

  const days = ["M", "T", "W", "T", "F"];

  return (
    <AbsoluteFill
      style={{
        padding: "100px 120px",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          width: 1560,
          height: 780,
          borderRadius: 40,
          backgroundColor: withAlpha(palette.foreground, 0.03),
          border: `1.5px solid ${withAlpha(palette.accent, 0.35)}`,
          boxShadow: `0 40px 120px ${withAlpha(palette.background, 0.9)}, inset 0 0 100px ${withAlpha(palette.accent, 0.05)}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "64px 80px",
          position: "relative",
          overflow: "hidden",
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        {/* Relay Logo Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 40,
          }}
        >
          <RelayLogo size={72} progress={entrance} />
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 48,
              fontWeight: 700,
              color: palette.foreground,
              letterSpacing: "-0.03em",
            }}
          >
            Relay
          </span>
        </div>

        {/* Final Message: Fully readable from frame 282 to 360 (>2.5 seconds) */}
        <h1
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 84,
            fontWeight: 700,
            color: palette.foreground,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            textAlign: "center",
            margin: 0,
            marginBottom: 56,
          }}
        >
          Start your next week with{" "}
          <span style={{ color: palette.accent }}>Relay</span>
        </h1>

        {/* Illuminated Next-Week Horizon Strip */}
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
          }}
        >
          {days.map((d, idx) => {
            const pillSpring = spring({
              frame: Math.max(0, frame - (6 + idx * 4)),
              fps,
              config: { damping: 15, stiffness: 150 },
            });
            return (
              <div
                key={idx}
                style={{
                  width: 196,
                  height: 84,
                  borderRadius: 20,
                  backgroundColor: withAlpha(
                    idx === 2 ? palette.accent : palette.secondary,
                    0.12
                  ),
                  border: `2px solid ${
                    idx === 2 ? palette.accent : withAlpha(palette.secondary, 0.55)
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 24px",
                  transform: `translateY(${interpolate(pillSpring, [0, 1], [16, 0], CLAMP)}px)`,
                  opacity: interpolate(pillSpring, [0, 1], [0, 1], CLAMP),
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 24,
                    fontWeight: 700,
                    color: palette.foreground,
                  }}
                >
                  {d}
                </span>
                <div
                  style={{
                    width: 44,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor:
                      idx === 2 ? palette.accent : palette.secondary,
                  }}
                />
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

  // Subtle ambient background glow drift across the 12-second timeline
  const glowX = interpolate(frame, [0, 180, 360], [30, 70, 50], CLAMP);
  const glowY = interpolate(frame, [0, 180, 360], [35, 55, 45], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
      }}
    >
      {/* Ambient radial lighting using palette colors */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${withAlpha(
            palette.secondary,
            0.11
          )} 0%, ${withAlpha(palette.accent, 0.06)} 35%, transparent 70%)`,
        }}
      />

      {/* Subtle architectural grid lines */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(to right, ${withAlpha(palette.muted, 0.05)} 1px, transparent 1px),
            linear-gradient(to bottom, ${withAlpha(palette.muted, 0.05)} 1px, transparent 1px)
          `,
          backgroundSize: "96px 96px",
        }}
      />

      {/* 0-3s: Intro ("Relay" & "Make room for focused work") */}
      <Sequence from={0} durationInFrames={90}>
        <IntroScene />
      </Sequence>

      {/* 3-9s: Animated Product Interface ("Plan together", "Protect focus time", "See progress") */}
      <Sequence from={90} durationInFrames={180}>
        <ProductInterfaceScene />
      </Sequence>

      {/* 9-12s: Finale ("Start your next week with Relay") */}
      <Sequence from={270} durationInFrames={90}>
        <FinaleScene />
      </Sequence>
    </AbsoluteFill>
  );
};
