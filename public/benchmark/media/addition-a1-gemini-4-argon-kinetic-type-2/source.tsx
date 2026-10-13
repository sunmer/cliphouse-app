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

const FONT_FAMILY = '"Archivo", sans-serif';
const SAFE_MARGIN = 80;

const withAlpha = (hex: string, alpha: number): string => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Ambient architectural canvas that evolves across the 4 acts
 * and freezes during the final 2-second stillness hold (frames 296-360).
 */
const AmbientCanvas: React.FC = () => {
  const rawFrame = useCurrentFrame();
  // Freeze ambient motion after global frame 296 so the last >2s are 100% still
  const frame = rawFrame >= 296 ? 296 : rawFrame;

  const glowX = interpolate(
    frame,
    [0, 90, 180, 270, 296],
    [50, 50, 44, 56, 50],
    { extrapolateRight: "clamp" }
  );
  const glowY = interpolate(
    frame,
    [0, 90, 180, 270, 296],
    [52, 50, 50, 46, 46],
    { extrapolateRight: "clamp" }
  );

  const accentGlowOpacity = interpolate(
    frame,
    [0, 20, 90, 110, 180, 202, 270, 296],
    [0.06, 0.11, 0.08, 0.14, 0.09, 0.13, 0.08, 0.12],
    { extrapolateRight: "clamp" }
  );

  const secondaryGlowOpacity = interpolate(
    frame,
    [0, 90, 180, 202, 270, 296],
    [0.09, 0.07, 0.14, 0.16, 0.1, 0.1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, overflow: "hidden" }}>
      {/* Subtle radial atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at ${glowX}% ${glowY}%, ${withAlpha(
              palette.accent,
              accentGlowOpacity
            )} 0%, transparent 52%),
            radial-gradient(circle at ${100 - glowX}% ${100 - glowY}%, ${withAlpha(
              palette.secondary,
              secondaryGlowOpacity
            )} 0%, transparent 58%)
          `,
        }}
      />

      {/* Subtle structural grid lines inside safe margins */}
      <div
        style={{
          position: "absolute",
          left: SAFE_MARGIN,
          right: SAFE_MARGIN,
          top: SAFE_MARGIN,
          bottom: SAFE_MARGIN,
          border: `1px solid ${withAlpha(palette.muted, 0.08)}`,
          pointerEvents: "none",
        }}
      >
        {/* Vertical center & third guide hairlines */}
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
      </div>
    </AbsoluteFill>
  );
};

/**
 * SCENE 1 (0 - 3s / Frames 0 - 90): "Less noise."
 * Kinetic concept: High-frequency visual static and scattered chromatic jitter
 * get compressed and attenuated into crystal-clear typographic silence by frame 20.
 * Hold: Frames 20 - 76 (56 frames = 1.87s > 1.5s requirement).
 */
const SceneLessNoise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Compression of noise happens between frame 0 and 20
  const silenceProgress = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit transition (frames 76 - 90)
  const exitProgress = interpolate(frame, [76, 90], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const containerOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const containerScale = interpolate(exitProgress, [0, 1], [1, 0.92]);
  const containerBlur = interpolate(exitProgress, [0, 1], [0, 10]);

  // "Less" presses down decisively like a dampener
  const lessSpring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 180, mass: 0.8 },
  });
  const lessY = interpolate(lessSpring, [0, 1], [-48, 0]);
  const lessScaleY = interpolate(lessSpring, [0, 1], [1.28, 1]);
  const lessOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const noiseChars = ["n", "o", "i", "s", "e", "."];
  const barCount = 44;

  return (
    <AbsoluteFill
      style={{
        padding: SAFE_MARGIN,
        justifyContent: "center",
        alignItems: "center",
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
        filter: `blur(${containerBlur}px)`,
      }}
    >
      {/* Horizontal interference fragments that collapse inward */}
      {Array.from({ length: 10 }).map((_, idx) => {
        const seed = idx + 1;
        const rawNoise = 1 - silenceProgress;
        const yPos = Math.sin(seed * 2.1) * 260;
        const xOffset =
          Math.cos(frame * 0.9 + seed * 3.4) * 320 * rawNoise +
          Math.sin(seed * 1.3) * 180;
        const width = interpolate(silenceProgress, [0, 1], [90 + (idx % 4) * 60, 0]);
        const color = idx % 2 === 0 ? palette.secondary : palette.muted;

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              top: `calc(50% + ${yPos}px)`,
              left: `calc(50% + ${xOffset}px)`,
              width,
              height: 2,
              backgroundColor: withAlpha(color, 0.45 * rawNoise),
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}

      {/* Equalizer / frequency static bars that flatten into a quiet horizon line */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 122px)",
          width: 1120 * interpolate(exitProgress, [0, 1], [1, 0.25]),
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
          const localDecay = interpolate(
            frame,
            [i * 0.22, 12 + i * 0.18],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const wave =
            Math.abs(
              Math.sin(frame * 0.95 + i * 1.35) *
                Math.cos(frame * 0.55 - i * 0.85)
            ) *
            (1 - centerDist * 0.35);
          const barHeight = 3 + wave * 115 * localDecay;
          const isAccentBar = i === barCount - 4;

          return (
            <div
              key={i}
              style={{
                width: 3,
                height: barHeight,
                borderRadius: 2,
                backgroundColor: isAccentBar
                  ? palette.accent
                  : localDecay > 0.1
                  ? i % 3 === 0
                    ? palette.secondary
                    : palette.muted
                  : withAlpha(palette.muted, 0.35),
                opacity: isAccentBar ? 1 : 0.35 + localDecay * 0.55,
              }}
            />
          );
        })}
      </div>

      {/* Main Phrase: "Less noise." */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          fontSize: 156,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: palette.foreground,
          userSelect: "none",
        }}
      >
        {/* Word 1: "Less" */}
        <span
          style={{
            display: "inline-block",
            opacity: lessOpacity,
            transform: `translateY(${lessY}px) scaleY(${lessScaleY})`,
            transformOrigin: "bottom center",
            marginRight: "0.26em",
          }}
        >
          Less
        </span>

        {/* Word 2: "noise." - each character dampens from jitter to stillness by frame 20 */}
        <span style={{ display: "inline-flex", alignItems: "baseline" }}>
          {noiseChars.map((char, idx) => {
            const charSettle = interpolate(
              frame,
              [2 + idx * 1.1, 14 + idx * 1.1],
              [1, 0],
              {
                easing: Easing.out(Easing.cubic),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            const jitterX =
              Math.sin(frame * 1.9 + idx * 2.7) * 22 * charSettle;
            const jitterY =
              Math.cos(frame * 2.3 + idx * 1.9) * 34 * charSettle;
            const jitterRot =
              Math.sin(frame * 1.6 - idx * 3.1) * 14 * charSettle;
            const extraSpread = (idx - 2.5) * 14 * charSettle;
            const charBlur = charSettle * 6;
            const chromaOffset = charSettle * 12;

            const isPeriod = char === ".";
            const charColor = isPeriod ? palette.accent : palette.foreground;

            return (
              <span
                key={idx}
                style={{
                  display: "inline-block",
                  color: charColor,
                  transform: `translate(${jitterX + extraSpread}px, ${jitterY}px) rotate(${jitterRot}deg)`,
                  filter: `blur(${charBlur}px)`,
                  textShadow:
                    charSettle > 0.01
                      ? `${-chromaOffset}px 0px 0px ${withAlpha(
                          palette.secondary,
                          charSettle * 0.75
                        )}, ${chromaOffset}px 0px 0px ${withAlpha(
                          palette.accent,
                          charSettle * 0.75
                        )}`
                      : "none",
                }}
              >
                {char}
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/**
 * SCENE 2 (3 - 6s / Frames 90 - 180): "More focus."
 * Kinetic concept: Optical depth-of-field pull and precision viewfinder brackets
 * contracting onto the focal plane by frame 20.
 * Hold: Frames 20 - 76 (56 frames = 1.87s > 1.5s requirement).
 */
const SceneMoreFocus: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Optical lock completes by frame 20
  const lockProgress = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const springLock = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 170, mass: 0.8 },
  });

  // Exit transition (frames 76 - 90)
  const exitProgress = interpolate(frame, [76, 90], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sceneOpacity = interpolate(exitProgress, [0, 1], [1, 0]);

  // Viewfinder dimensions tighten around "More focus."
  const boxWidth = interpolate(springLock, [0, 1], [1560, 1080]) +
    interpolate(exitProgress, [0, 1], [0, 320]);
  const boxHeight = interpolate(springLock, [0, 1], [680, 270]) +
    interpolate(exitProgress, [0, 1], [0, -80]);

  // Concentric lens rings
  const outerRingScale = interpolate(lockProgress, [0, 1], [1.85, 1]);
  const innerRingScale = interpolate(lockProgress, [0, 1], [0.45, 1]);
  const ringOpacity = interpolate(lockProgress, [0, 1], [0.05, 0.16]) * (1 - exitProgress);

  const phraseChars = [
    { char: "M", word: 0 },
    { char: "o", word: 0 },
    { char: "r", word: 0 },
    { char: "e", word: 0 },
    { char: " ", word: 0 },
    { char: "f", word: 1 },
    { char: "o", word: 1 },
    { char: "c", word: 1 },
    { char: "u", word: 1 },
    { char: "s", word: 1 },
    { char: ".", word: 1 },
  ];

  const cornerSize = 28;
  const cornerThickness = 3;
  const bracketColor = lockProgress > 0.9 ? palette.accent : palette.secondary;

  return (
    <AbsoluteFill
      style={{
        padding: SAFE_MARGIN,
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Concentric optical circles */}
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: "50%",
          border: `1px solid ${withAlpha(palette.secondary, ringOpacity)}`,
          transform: `scale(${outerRingScale})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          borderRadius: "50%",
          border: `1px dashed ${withAlpha(palette.accent, ringOpacity)}`,
          transform: `scale(${innerRingScale})`,
        }}
      />

      {/* Precision Viewfinder Frame */}
      <div
        style={{
          position: "absolute",
          width: boxWidth,
          height: boxHeight,
          pointerEvents: "none",
        }}
      >
        {/* Top-Left Bracket */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: cornerSize,
            height: cornerSize,
            borderTop: `${cornerThickness}px solid ${bracketColor}`,
            borderLeft: `${cornerThickness}px solid ${bracketColor}`,
          }}
        />
        {/* Top-Right Bracket */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: cornerSize,
            height: cornerSize,
            borderTop: `${cornerThickness}px solid ${bracketColor}`,
            borderRight: `${cornerThickness}px solid ${bracketColor}`,
          }}
        />
        {/* Bottom-Left Bracket */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: cornerSize,
            height: cornerSize,
            borderBottom: `${cornerThickness}px solid ${bracketColor}`,
            borderLeft: `${cornerThickness}px solid ${bracketColor}`,
          }}
        />
        {/* Bottom-Right Bracket */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: cornerSize,
            height: cornerSize,
            borderBottom: `${cornerThickness}px solid ${bracketColor}`,
            borderRight: `${cornerThickness}px solid ${bracketColor}`,
          }}
        />

        {/* Midpoint optical crosshairs */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            width: 2,
            height: 16,
            backgroundColor: withAlpha(palette.muted, 0.5),
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
            backgroundColor: withAlpha(palette.muted, 0.5),
            transform: "translateX(-50%)",
          }}
        />
      </div>

      {/* Typography: "More focus." */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          fontSize: 156,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
      >
        {phraseChars.map((item, idx) => {
          if (item.char === " ") {
            return (
              <span
                key={idx}
                style={{ display: "inline-block", width: "0.26em" }}
              />
            );
          }

          const distFromCenter = Math.abs(idx - 5) / 5;
          const charProgress = interpolate(
            frame,
            [distFromCenter * 3, 16 + distFromCenter * 4],
            [0, 1],
            {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          );

          const blur = interpolate(charProgress, [0, 1], [24, 0]);
          const scale = interpolate(charProgress, [0, 1], [1.65, 1]);
          const spreadX = (idx - 5) * 32 * (1 - charProgress);
          const opacity = interpolate(charProgress, [0, 0.35, 1], [0, 0.7, 1]);
          const exitShift = (item.word === 0 ? -1 : 1) * exitProgress * 60;

          return (
            <span
              key={idx}
              style={{
                display: "inline-block",
                color: item.word === 1 ? palette.accent : palette.foreground,
                opacity,
                filter: `blur(${blur}px)`,
                transform: `translateX(${spreadX + exitShift}px) scale(${scale})`,
                transformOrigin: "center center",
              }}
            >
              {item.char}
            </span>
          );
        })}
      </div>

      {/* Precision focal-plane underline under "focus." */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 86px)",
          left: "calc(50% + 188px)",
          width: 430 * interpolate(lockProgress, [0.4, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 4,
          backgroundColor: palette.accent,
          transform: "translateX(-50%)",
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * SCENE 3 (6 - 9s / Frames 180 - 270): "Better work, together."
 * Kinetic concept: Two parallel horizontal relay tracks glide in from opposite directions
 * and interlock in the center by frame 22.
 * Hold: Frames 22 - 76 (54 frames = 1.80s > 1.5s requirement).
 */
const SceneBetterWorkTogether: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convergence completes by frame 22
  const joinProgress = interpolate(frame, [0, 22], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const topSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 160, mass: 0.85 },
  });
  const bottomSpring = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 18, stiffness: 160, mass: 0.85 },
  });

  // Exit transition (frames 76 - 90): tracks part vertically to "make room" for Scene 4
  const exitProgress = interpolate(frame, [76, 90], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sceneOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const topExitY = interpolate(exitProgress, [0, 1], [0, -110]);
  const bottomExitY = interpolate(exitProgress, [0, 1], [0, 110]);

  const topX = interpolate(topSpring, [0, 1], [-280, 0]);
  const topSkew = interpolate(joinProgress, [0, 1], [-12, 0]);
  const bottomX = interpolate(bottomSpring, [0, 1], [280, 0]);
  const bottomSkew = interpolate(joinProgress, [0, 1], [12, 0]);
  const togetherTracking = interpolate(joinProgress, [0, 1], [0.16, -0.04]);

  const bridgeProgress = interpolate(frame, [12, 22], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: SAFE_MARGIN,
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Upper and Lower Relay Vector Tracks */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% - 170px)",
          left: SAFE_MARGIN,
          right: SAFE_MARGIN,
          height: 2,
          backgroundColor: withAlpha(palette.secondary, 0.28),
          transform: `translateY(${topExitY}px) scaleX(${joinProgress})`,
          transformOrigin: "left center",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 170px)",
          left: SAFE_MARGIN,
          right: SAFE_MARGIN,
          height: 2,
          backgroundColor: withAlpha(palette.accent, 0.28),
          transform: `translateY(${bottomExitY}px) scaleX(${joinProgress})`,
          transformOrigin: "right center",
        }}
      />

      {/* Central Two-Line Interlocking Lockup */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontFamily: FONT_FAMILY,
          userSelect: "none",
        }}
      >
        {/* Line 1: "Better work," */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            transform: `translate(${topX - 48}px, ${topExitY}px) skewX(${topSkew}deg)`,
            opacity: interpolate(frame, [0, 10], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {/* Geometric relay baton node on left */}
          <div
            style={{
              width: 56 * bridgeProgress,
              height: 14,
              borderRadius: 7,
              backgroundColor: palette.secondary,
            }}
          />
          <span
            style={{
              fontSize: 132,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              color: palette.foreground,
            }}
          >
            Better work,
          </span>
        </div>

        {/* Line 2: "together." */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            transform: `translate(${bottomX + 48}px, ${bottomExitY}px) skewX(${bottomSkew}deg)`,
            opacity: interpolate(frame, [2, 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontSize: 132,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: `${togetherTracking}em`,
              color: palette.secondary,
            }}
          >
            together
            <span style={{ color: palette.accent }}>.</span>
          </span>
          {/* Interlocking accent baton node on right */}
          <div
            style={{
              width: 84 * bridgeProgress,
              height: 14,
              borderRadius: 7,
              backgroundColor: palette.accent,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * SCENE 4 (9 - 12s / Frames 270 - 360): "Make room for what matters." with "Relay"
 * Kinetic concept: Architectural room expansion and clean baseline reveal.
 * CRITICAL TIMING: All motion completes by local frame 26 (global frame 296).
 * From local frame 26 to 90 (64 frames = 2.13 seconds > 2.0s requirement),
 * every element is clamped to its final state so the final message is 100% still and readable.
 */
const SceneFinalRelay: React.FC = () => {
  const rawFrame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp animation frame at 26 so frames 26..90 (64 frames = 2.13s) are 100% still
  const frame = Math.min(rawFrame, 26);

  const roomExpand = interpolate(frame, [0, 26], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const line1Spring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 170, mass: 0.75 },
  });
  const line1Settled = frame >= 26 ? 1 : line1Spring;

  const line2Progress = interpolate(frame, [4, 24], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandProgress = interpolate(frame, [8, 26], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Architectural border expands from center to the 80px safe margin perimeter
  const frameInsetX = interpolate(roomExpand, [0, 1], [420, 0]);
  const frameInsetY = interpolate(roomExpand, [0, 1], [220, 0]);

  // "Make" and "room" part slightly to literally create space between them
  const makeRoomGap = interpolate(roomExpand, [0, 1], [12, 110]);
  const line1Y = interpolate(line1Settled, [0, 1], [54, 0]);
  const line2Y = interpolate(line2Progress, [0, 1], [60, 0]);
  const brandY = interpolate(brandProgress, [0, 1], [28, 0]);

  return (
    <AbsoluteFill
      style={{
        padding: SAFE_MARGIN,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Architectural "Room" Frame expanding to the safe margin */}
      <div
        style={{
          position: "absolute",
          left: SAFE_MARGIN + frameInsetX,
          right: SAFE_MARGIN + frameInsetX,
          top: SAFE_MARGIN + frameInsetY,
          bottom: SAFE_MARGIN + frameInsetY,
          border: `1.5px solid ${withAlpha(palette.muted, 0.24)}`,
          pointerEvents: "none",
        }}
      >
        {/* 4 Accent Corner Anchors */}
        <div
          style={{
            position: "absolute",
            top: -2,
            left: -2,
            width: 20,
            height: 20,
            borderTop: `3px solid ${palette.accent}`,
            borderLeft: `3px solid ${palette.accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 20,
            height: 20,
            borderTop: `3px solid ${palette.accent}`,
            borderRight: `3px solid ${palette.accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            left: -2,
            width: 20,
            height: 20,
            borderBottom: `3px solid ${palette.accent}`,
            borderLeft: `3px solid ${palette.accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderBottom: `3px solid ${palette.accent}`,
            borderRight: `3px solid ${palette.accent}`,
          }}
        />
      </div>

      {/* Central Editorial Composition */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          userSelect: "none",
          maxWidth: 1600,
        }}
      >
        {/* Line 1: "Make room" with expanding architectural bridge */}
        <div style={{ overflow: "hidden", paddingBottom: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 116,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              color: palette.foreground,
              transform: `translateY(${line1Y}px)`,
              opacity: interpolate(roomExpand, [0, 0.35], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span>Make</span>
            {/* Architectural space bar that opens room between "Make" and "room" */}
            <div
              style={{
                width: makeRoomGap,
                height: 12,
                margin: "0 26px",
                borderRadius: 6,
                border: `2px solid ${withAlpha(palette.secondary, 0.75)}`,
                backgroundColor: withAlpha(palette.secondary, 0.16),
              }}
            />
            <span>room</span>
          </div>
        </div>

        {/* Line 2: "for what matters." */}
        <div style={{ overflow: "hidden", paddingBottom: 12 }}>
          <div
            style={{
              fontSize: 116,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              color: palette.foreground,
              transform: `translateY(${line2Y}px)`,
              opacity: interpolate(line2Progress, [0, 0.4], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            for what{" "}
            <span style={{ color: palette.accent }}>matters.</span>
          </div>
        </div>

        {/* Horizontal Structural Divider */}
        <div
          style={{
            width: 520 * brandProgress,
            height: 2,
            backgroundColor: withAlpha(palette.muted, 0.3),
            marginTop: 44,
            marginBottom: 40,
          }}
        />

        {/* Brand Lockup: "Relay" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: brandProgress,
            transform: `translateY(${brandY}px)`,
          }}
        >
          {/* Geometric Relay Emblem (two interlocking parallel capsules) */}
          <div
            style={{
              position: "relative",
              width: 48,
              height: 36,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 34,
                height: 10,
                borderRadius: 5,
                backgroundColor: palette.secondary,
                transform: `translateX(${interpolate(
                  brandProgress,
                  [0, 1],
                  [-14, 0]
                )}px)`,
              }}
            />
            <div
              style={{
                width: 34,
                height: 10,
                borderRadius: 5,
                backgroundColor: palette.accent,
                alignSelf: "flex-end",
                transform: `translateX(${interpolate(
                  brandProgress,
                  [0, 1],
                  [14, 0]
                )}px)`,
              }}
            />
          </div>

          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
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
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        fontFamily: FONT_FAMILY,
      }}
    >
      <AmbientCanvas />

      {/* 0 - 3s: "Less noise." */}
      <Sequence from={0} durationInFrames={90}>
        <SceneLessNoise />
      </Sequence>

      {/* 3 - 6s: "More focus." */}
      <Sequence from={90} durationInFrames={90}>
        <SceneMoreFocus />
      </Sequence>

      {/* 6 - 9s: "Better work, together." */}
      <Sequence from={180} durationInFrames={90}>
        <SceneBetterWorkTogether />
      </Sequence>

      {/* 9 - 12s: "Make room for what matters." with "Relay" */}
      <Sequence from={270} durationInFrames={90}>
        <SceneFinalRelay />
      </Sequence>
    </AbsoluteFill>
  );
};
