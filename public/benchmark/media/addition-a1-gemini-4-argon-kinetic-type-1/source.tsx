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

const FONT_FAMILY = '"Archivo", sans-serif';
const SAFE_MARGIN = 80;

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
};

const clampInterp = (
  frame: number,
  input: [number, number],
  output: [number, number]
): number => {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const AmbientStage: React.FC<{ globalFrame: number }> = ({ globalFrame }) => {
  // Freeze ambient motion at frame 296 so the final 2+ seconds are 100% still
  const effectiveFrame = Math.min(globalFrame, 296);

  const glowX = interpolate(
    effectiveFrame,
    [0, 90, 180, 270, 296],
    [960, 960, 1020, 960, 960],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const glowY = interpolate(
    effectiveFrame,
    [0, 90, 180, 270, 296],
    [540, 540, 510, 500, 500],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const accentGlowOpacity = interpolate(
    effectiveFrame,
    [0, 85, 110, 180, 270, 296],
    [0.06, 0.12, 0.16, 0.12, 0.15, 0.15],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const secondaryGlowOpacity = interpolate(
    effectiveFrame,
    [0, 85, 180, 210, 270, 296],
    [0.14, 0.08, 0.16, 0.18, 0.12, 0.12],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const segments = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      {/* Subtle atmospheric radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle 760px at ${glowX}px ${glowY}px, ${withAlpha(
            palette.accent,
            accentGlowOpacity
          )}, transparent 70%), radial-gradient(circle 920px at ${1920 - glowX}px ${
            1080 - glowY
          }px, ${withAlpha(palette.secondary, secondaryGlowOpacity)}, transparent 75%)`,
        }}
      />

      {/* Architectural Safe-Area Grid Frame (80px margin) */}
      <div
        style={{
          position: "absolute",
          left: SAFE_MARGIN,
          right: SAFE_MARGIN,
          top: SAFE_MARGIN,
          bottom: SAFE_MARGIN,
          border: `1px solid ${withAlpha(palette.muted, 0.1)}`,
          pointerEvents: "none",
        }}
      >
        {/* Subtle center hairlines */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: withAlpha(palette.muted, 0.05),
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: withAlpha(palette.muted, 0.05),
          }}
        />

        {/* Four corner registration L-markers */}
        {[
          { top: -1, left: -1, borderTop: true, borderLeft: true },
          { top: -1, right: -1, borderTop: true, borderRight: true },
          { bottom: -1, left: -1, borderBottom: true, borderLeft: true },
          { bottom: -1, right: -1, borderBottom: true, borderRight: true },
        ].map((corner, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              width: 18,
              height: 18,
              top: corner.top,
              left: corner.left,
              right: corner.right,
              bottom: corner.bottom,
              borderTop: corner.borderTop
                ? `2px solid ${withAlpha(palette.muted, 0.45)}`
                : undefined,
              borderBottom: corner.borderBottom
                ? `2px solid ${withAlpha(palette.muted, 0.45)}`
                : undefined,
              borderLeft: corner.borderLeft
                ? `2px solid ${withAlpha(palette.muted, 0.45)}`
                : undefined,
              borderRight: corner.borderRight
                ? `2px solid ${withAlpha(palette.muted, 0.45)}`
                : undefined,
            }}
          />
        ))}

        {/* Silent geometric relay progress track along bottom safe edge */}
        <div
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            bottom: 20,
            display: "flex",
            gap: 12,
            height: 3,
          }}
        >
          {segments.map((seg) => {
            const segStart = seg * 90;
            const segEnd = seg === 3 ? 296 : (seg + 1) * 90;
            const fill = clampInterp(effectiveFrame, [segStart, segEnd], [0, 1]);
            const isActive = effectiveFrame >= segStart && effectiveFrame <= segEnd + 10;
            return (
              <div
                key={seg}
                style={{
                  flex: 1,
                  height: "100%",
                  backgroundColor: withAlpha(palette.muted, 0.14),
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${fill * 100}%`,
                    height: "100%",
                    backgroundColor:
                      seg % 2 === 0 || isActive ? palette.accent : palette.secondary,
                    borderRadius: 2,
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

/* ==========================================================================
   SCENE 1 (0 - 3s / Frames 0 - 90): "Less noise."
   High-frequency interference bars & echo layers rapidly damp into clarity.
   Readable hold: frames 18 to 76 (58 frames = 1.93s > 1.5s).
   ========================================================================== */
const SceneOneLessNoise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const settleSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 210, mass: 0.7 },
    durationInFrames: 20,
  });
  const entryProgress = frame >= 20 ? 1 : settleSpring;
  const noiseAmount = clampInterp(frame, [0, 19], [1, 0]);

  // Exit between frames 76 and 90
  const exitProgress = clampInterp(frame, [76, 89], [0, 1]);
  const containerOpacity = 1 - exitProgress;
  const containerScale = interpolate(exitProgress, [0, 1], [1, 0.9]);

  // 36 deterministic frequency interference bars that damp to a calm horizon line
  const barCount = 36;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const waveA = Math.sin(i * 1.65 + frame * 0.65);
    const waveB = Math.cos(i * 0.85 - frame * 0.45);
    const rawHeight = Math.abs(waveA * waveB) * 340 + 40;
    const dampedHeight = rawHeight * Math.pow(noiseAmount, 1.35) + 2;
    const offsetY = Math.sin(i * 2.1 + frame * 0.5) * 48 * noiseAmount;
    const isAccent = i % 5 === 0;
    return { dampedHeight, offsetY, isAccent };
  });

  // Slice displacement for "Less noise." during first 18 frames
  const topSliceX = (1 - entryProgress) * 68;
  const midSliceX = (1 - entryProgress) * -52;
  const botSliceX = (1 - entryProgress) * 36;

  const renderPhrase = (colorOverride?: string) => (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontWeight: 800,
        fontSize: 152,
        letterSpacing: "-0.04em",
        lineHeight: 1.05,
        color: colorOverride ?? palette.foreground,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "baseline",
        gap: 32,
      }}
    >
      <span>Less</span>
      <span>
        noise
        <span style={{ color: colorOverride ?? palette.accent }}>.</span>
      </span>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
      }}
    >
      {/* Background interference equalizer bars damping into a calm line */}
      <div
        style={{
          position: "absolute",
          width: 1360,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: interpolate(noiseAmount, [0, 1], [0.28, 0.45]),
        }}
      >
        {bars.map((bar, idx) => (
          <div
            key={idx}
            style={{
              width: 3,
              height: bar.dampedHeight,
              transform: `translateY(${bar.offsetY}px)`,
              backgroundColor: bar.isAccent ? palette.accent : palette.secondary,
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      {/* Horizontal scanlines that collapse inward as noise disappears */}
      {[-150, -85, 85, 150].map((baseY, idx) => {
        const yPos = baseY * (0.25 + 0.75 * noiseAmount);
        const widthPct = interpolate(noiseAmount, [0, 1], [0, 75 - idx * 8]);
        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              width: `${widthPct}%`,
              height: 1.5,
              backgroundColor:
                idx % 2 === 0
                  ? withAlpha(palette.secondary, 0.45 * noiseAmount)
                  : withAlpha(palette.accent, 0.45 * noiseAmount),
              transform: `translateY(${yPos}px)`,
            }}
          />
        );
      })}

      {/* Ghost echo layers that converge into the main phrase by frame 18 */}
      {noiseAmount > 0.01 && (
        <>
          <div
            style={{
              position: "absolute",
              transform: `translate(${-56 * noiseAmount}px, ${-24 * noiseAmount}px) skewX(${
                12 * noiseAmount
              }deg)`,
              opacity: 0.38 * noiseAmount,
              filter: `blur(${4 * noiseAmount}px)`,
            }}
          >
            {renderPhrase(palette.secondary)}
          </div>
          <div
            style={{
              position: "absolute",
              transform: `translate(${54 * noiseAmount}px, ${22 * noiseAmount}px) skewX(${
                -10 * noiseAmount
              }deg)`,
              opacity: 0.34 * noiseAmount,
              filter: `blur(${3 * noiseAmount}px)`,
            }}
          >
            {renderPhrase(palette.accent)}
          </div>
        </>
      )}

      {/* Primary Crisp 3-Slice Typography locking at frame 18 */}
      <div style={{ position: "relative" }}>
        {/* Top slice */}
        <div
          style={{
            clipPath: "inset(0 0 65% 0)",
            transform: `translateX(${topSliceX}px)`,
          }}
        >
          {renderPhrase()}
        </div>
        {/* Middle slice */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: "inset(34% 0 33% 0)",
            transform: `translateX(${midSliceX}px)`,
          }}
        >
          {renderPhrase()}
        </div>
        {/* Bottom slice */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: "inset(66% 0 0 0)",
            transform: `translateX(${botSliceX}px)`,
          }}
        >
          {renderPhrase()}
        </div>

        {/* Calm signal baseline that locks under "noise." once noise clears */}
        <div
          style={{
            marginTop: 22,
            height: 5,
            width: `${entryProgress * 100}%`,
            background: `linear-gradient(90deg, ${withAlpha(
              palette.secondary,
              0.7
            )} 0%, ${palette.accent} 100%)`,
            borderRadius: 3,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ==========================================================================
   SCENE 2 (3 - 6s / Frames 90 - 180): "More focus."
   Optical aperture brackets & concentric lens rings lock onto the phrase.
   Readable hold: local frames 18 to 76 (58 frames = 1.93s > 1.5s).
   ========================================================================== */
const SceneTwoMoreFocus: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rawLock = spring({
    frame,
    fps,
    config: { damping: 19, stiffness: 200, mass: 0.72 },
    durationInFrames: 18,
  });
  const lockProgress = frame >= 18 ? 1 : rawLock;

  const exitProgress = clampInterp(frame, [76, 89], [0, 1]);

  // Viewfinder bracket dimensions contracting from wide safe area to tight lock
  const boxWidth = interpolate(lockProgress, [0, 1], [1560, 1080]) + exitProgress * 220;
  const boxHeight = interpolate(lockProgress, [0, 1], [720, 290]) - exitProgress * 90;
  const sceneOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) * (1 - exitProgress);

  // Typography motion: "More" slides and scales in; "focus." tightens tracking
  const moreTranslateX = interpolate(lockProgress, [0, 1], [-64, 0]);
  const focusTracking = interpolate(lockProgress, [0, 1], [0.22, -0.04]);
  const focusScale = interpolate(lockProgress, [0, 1], [1.16, 1]);
  const ringRotation = interpolate(lockProgress, [0, 1], [-45, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Concentric Optical Lens Rings */}
      <svg
        width={760}
        height={760}
        viewBox="0 0 760 760"
        style={{
          position: "absolute",
          transform: `rotate(${ringRotation}deg) scale(${interpolate(
            lockProgress,
            [0, 1],
            [1.28, 1]
          )})`,
          opacity: 0.32,
        }}
      >
        <circle
          cx="380"
          cy="380"
          r="330"
          fill="none"
          stroke={withAlpha(palette.muted, 0.3)}
          strokeWidth="1.5"
          strokeDasharray="8 12"
        />
        <circle
          cx="380"
          cy="380"
          r="245"
          fill="none"
          stroke={withAlpha(palette.secondary, 0.45)}
          strokeWidth="2"
          strokeDasharray="120 60"
        />
        <circle
          cx="380"
          cy="380"
          r="165"
          fill="none"
          stroke={withAlpha(palette.accent, 0.35)}
          strokeWidth="1.5"
        />
      </svg>

      {/* Contracting Precision Viewfinder Brackets */}
      <div
        style={{
          position: "absolute",
          width: boxWidth,
          height: boxHeight,
          backgroundColor: withAlpha(palette.background, 0.55),
          border: `1px solid ${withAlpha(palette.secondary, 0.22)}`,
          borderRadius: 8,
        }}
      >
        {/* 4 Heavy Accent Corner Brackets */}
        {[
          { top: -3, left: -3, borderTop: true, borderLeft: true },
          { top: -3, right: -3, borderTop: true, borderRight: true },
          { bottom: -3, left: -3, borderBottom: true, borderLeft: true },
          { bottom: -3, right: -3, borderBottom: true, borderRight: true },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 38,
              height: 38,
              top: c.top,
              left: c.left,
              right: c.right,
              bottom: c.bottom,
              borderTop: c.borderTop ? `5px solid ${palette.accent}` : undefined,
              borderBottom: c.borderBottom ? `5px solid ${palette.accent}` : undefined,
              borderLeft: c.borderLeft ? `5px solid ${palette.accent}` : undefined,
              borderRight: c.borderRight ? `5px solid ${palette.accent}` : undefined,
            }}
          />
        ))}

        {/* Midpoint optical tick marks */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            width: 2,
            height: 16,
            backgroundColor: palette.secondary,
            transform: "translateX(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: "50%",
            width: 2,
            height: 16,
            backgroundColor: palette.secondary,
            transform: "translateX(-50%)",
          }}
        />
      </div>

      {/* Typography: "More focus." */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "baseline",
          gap: 34,
          fontFamily: FONT_FAMILY,
          fontWeight: 800,
          fontSize: 152,
          lineHeight: 1.05,
        }}
      >
        <span
          style={{
            color: palette.foreground,
            letterSpacing: "-0.04em",
            transform: `translateX(${moreTranslateX}px)`,
            display: "inline-block",
          }}
        >
          More
        </span>
        <span
          style={{
            color: palette.accent,
            letterSpacing: `${focusTracking}em`,
            transform: `scale(${focusScale})`,
            transformOrigin: "left center",
            display: "inline-block",
          }}
        >
          focus.
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ==========================================================================
   SCENE 3 (6 - 9s / Frames 180 - 270): "Better work, together."
   Two parallel relay tracks glide in from opposite sides and interlock.
   Readable hold: local frames 20 to 76 (56 frames = 1.87s > 1.5s).
   ========================================================================== */
const SceneThreeBetterWork: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rawJoin = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 185, mass: 0.75 },
    durationInFrames: 20,
  });
  const joinProgress = frame >= 20 ? 1 : rawJoin;

  const exitProgress = clampInterp(frame, [76, 89], [0, 1]);
  const sceneOpacity =
    clampInterp(frame, [0, 6], [0, 1]) * (1 - exitProgress);

  const topRowX = interpolate(joinProgress, [0, 1], [-180, 0]) - exitProgress * 90;
  const bottomRowX = interpolate(joinProgress, [0, 1], [180, 0]) + exitProgress * 90;

  // Interlocking geometric capsules behind the text
  const leftCapsuleX = interpolate(joinProgress, [0, 1], [-220, -70]);
  const rightCapsuleX = interpolate(joinProgress, [0, 1], [220, 70]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Interlocking Venn Capsules representing collaboration */}
      <div
        style={{
          position: "absolute",
          width: 680,
          height: 360,
          borderRadius: 180,
          border: `2px solid ${withAlpha(palette.secondary, 0.28)}`,
          backgroundColor: withAlpha(palette.secondary, 0.04),
          transform: `translateX(${leftCapsuleX}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 680,
          height: 360,
          borderRadius: 180,
          border: `2px solid ${withAlpha(palette.accent, 0.28)}`,
          backgroundColor: withAlpha(palette.accent, 0.04),
          transform: `translateX(${rightCapsuleX}px)`,
        }}
      />

      {/* Two-Tier Relay Typography Stack */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        {/* Top Track: "Better work," */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            transform: `translateX(${topRowX}px)`,
          }}
        >
          {/* Relay baton accent bar on left */}
          <div
            style={{
              width: 14,
              height: 108,
              borderRadius: 7,
              backgroundColor: palette.secondary,
            }}
          />
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 800,
              fontSize: 134,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              color: palette.foreground,
              whiteSpace: "nowrap",
            }}
          >
            Better work,
          </div>
        </div>

        {/* Horizontal Relay Handoff Connector Line */}
        <div
          style={{
            width: interpolate(joinProgress, [0, 1], [240, 880]),
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${palette.secondary} 0%, ${palette.accent} 100%)`,
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Center handoff node */}
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: palette.foreground,
              border: `4px solid ${palette.background}`,
              transform: `scale(${joinProgress})`,
            }}
          />
        </div>

        {/* Bottom Track: "together." */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            transform: `translateX(${bottomRowX}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 800,
              fontSize: 134,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              color: palette.accent,
              whiteSpace: "nowrap",
            }}
          >
            together.
          </div>
          {/* Relay baton accent bar on right */}
          <div
            style={{
              width: 14,
              height: 108,
              borderRadius: 7,
              backgroundColor: palette.accent,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ==========================================================================
   SCENE 4 (9 - 12s / Frames 270 - 360):
   "Make room for what matters." with "Relay"
   All motion completes by local frame 26 (global frame 296).
   Completely STILL and readable for the final 64 frames (> 2.0 seconds).
   ========================================================================== */
const SceneFourMakeRoomRelay: React.FC = () => {
  const rawFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp local animation frame at 26 so the last 64 frames (2.13s) are 100% still
  const frame = Math.min(rawFrame, 26);

  const rawExpand = spring({
    frame,
    fps,
    config: { damping: 19, stiffness: 175, mass: 0.72 },
    durationInFrames: 26,
  });
  const expandProgress = rawFrame >= 26 ? 1 : rawExpand;

  const rawSub = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 19, stiffness: 190, mass: 0.7 },
    durationInFrames: 22,
  });
  const subProgress = rawFrame >= 26 ? 1 : rawSub;

  const rawBrand = spring({
    frame: Math.max(0, frame - 7),
    fps,
    config: { damping: 18, stiffness: 200, mass: 0.68 },
    durationInFrames: 19,
  });
  const brandProgress = rawFrame >= 26 ? 1 : rawBrand;

  // Architectural room frame expanding outward
  const roomWidth = interpolate(expandProgress, [0, 1], [920, 1620]);
  const roomHeight = interpolate(expandProgress, [0, 1], [380, 760]);
  const sceneOpacity = clampInterp(frame, [0, 6], [0, 1]);

  // Physical "room" spacer expanding between "Make" and "room"
  const wordGapWidth = interpolate(expandProgress, [0, 1], [4, 56]);

  // Line 2 upward reveal
  const lineTwoY = interpolate(subProgress, [0, 1], [68, 0]);
  const lineTwoOpacity = clampInterp(frame, [3, 14], [0, 1]);

  // Brand lockup reveal
  const brandY = interpolate(brandProgress, [0, 1], [32, 0]);
  const brandOpacity = clampInterp(frame, [7, 18], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Expanding Architectural "Room" Frame inside safe margins */}
      <div
        style={{
          position: "absolute",
          width: roomWidth,
          height: roomHeight,
          borderRadius: 16,
          border: `1.5px solid ${withAlpha(palette.muted, 0.24)}`,
          background: `linear-gradient(180deg, ${withAlpha(
            palette.secondary,
            0.05
          )} 0%, ${withAlpha(palette.background, 0.6)} 100%)`,
          boxShadow: `0 30px 90px ${withAlpha("#000000", 0.45)}`,
        }}
      >
        {/* Top and bottom accent architectural beams */}
        <div
          style={{
            position: "absolute",
            top: -2,
            left: "50%",
            transform: "translateX(-50%)",
            width: interpolate(expandProgress, [0, 1], [80, 420]),
            height: 4,
            backgroundColor: palette.accent,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            left: "50%",
            transform: "translateX(-50%)",
            width: interpolate(expandProgress, [0, 1], [80, 420]),
            height: 4,
            backgroundColor: palette.secondary,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Central Editorial Content Stack */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 40px",
        }}
      >
        {/* Line 1: "Make room" with expanding geometric space bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_FAMILY,
            fontWeight: 800,
            fontSize: 116,
            letterSpacing: "-0.035em",
            lineHeight: 1.06,
            color: palette.foreground,
          }}
        >
          <span>Make</span>
          <div
            style={{
              width: wordGapWidth,
              height: 22,
              margin: "0 18px",
              borderRadius: 6,
              border: `2px solid ${palette.secondary}`,
              backgroundColor: withAlpha(palette.secondary, 0.18),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 5px",
            }}
          >
            <div
              style={{
                width: 4,
                height: 10,
                backgroundColor: palette.accent,
                borderRadius: 1,
              }}
            />
            <div
              style={{
                width: 4,
                height: 10,
                backgroundColor: palette.accent,
                borderRadius: 1,
              }}
            />
          </div>
          <span>room</span>
        </div>

        {/* Line 2: "for what matters." */}
        <div
          style={{
            overflow: "hidden",
            paddingBottom: 8,
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 800,
              fontSize: 116,
              letterSpacing: "-0.035em",
              lineHeight: 1.06,
              color: palette.foreground,
              transform: `translateY(${lineTwoY}px)`,
              opacity: lineTwoOpacity,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "baseline",
              gap: 26,
            }}
          >
            <span>for what</span>
            <span style={{ color: palette.accent }}>matters.</span>
          </div>
        </div>

        {/* Expanding Divider Line */}
        <div
          style={{
            marginTop: 42,
            marginBottom: 36,
            width: interpolate(brandProgress, [0, 1], [0, 680]),
            height: 2,
            backgroundColor: withAlpha(palette.muted, 0.25),
          }}
        />

        {/* Brand Lockup: "Relay" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "14px 36px",
            borderRadius: 999,
            backgroundColor: withAlpha(palette.foreground, 0.05),
            border: `1.5px solid ${withAlpha(palette.accent, 0.45)}`,
            transform: `translateY(${brandY}px)`,
            opacity: brandOpacity,
          }}
        >
          {/* Geometric Relay Emblem (two interlocking batons) */}
          <svg width={44} height={44} viewBox="0 0 44 44">
            <rect
              x="4"
              y="9"
              width="22"
              height="10"
              rx="5"
              fill={palette.secondary}
            />
            <rect
              x="18"
              y="25"
              width="22"
              height="10"
              rx="5"
              fill={palette.accent}
            />
            <circle cx="22" cy="22" r="4" fill={palette.foreground} />
          </svg>
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 900,
              fontSize: 64,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: palette.foreground,
            }}
          >
            Relay
          </span>
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
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
      }}
    >
      <AmbientStage globalFrame={frame} />

      {/* 0 - 3s: "Less noise." */}
      <Sequence from={0} durationInFrames={90}>
        <SceneOneLessNoise />
      </Sequence>

      {/* 3 - 6s: "More focus." */}
      <Sequence from={90} durationInFrames={90}>
        <SceneTwoMoreFocus />
      </Sequence>

      {/* 6 - 9s: "Better work, together." */}
      <Sequence from={180} durationInFrames={90}>
        <SceneThreeBetterWork />
      </Sequence>

      {/* 9 - 12s: "Make room for what matters." with "Relay" */}
      <Sequence from={270} durationInFrames={90}>
        <SceneFourMakeRoomRelay />
      </Sequence>
    </AbsoluteFill>
  );
};
