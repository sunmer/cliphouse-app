import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import * as contractModule from "./contract";

const palette: any = (contractModule as any).palette ?? (contractModule as any).default ?? {
  background: "#101114",
  foreground: "#F5F5F2",
  accent: "#B8F36B",
  secondary: "#78B9ED",
  muted: "#B1B4BC",
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: palette.background,
        color: palette.foreground,
        fontFamily: "Archivo",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Background />
      <Sequence from={0} durationInFrames={90}>
        <Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <Middle />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <Outro />
      </Sequence>
      <TopBar />
      <BottomSafeLine />
    </div>
  );
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 360], [0, 40], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "linear-gradient(to right, " +
            palette.muted +
            " 1px, transparent 1px), linear-gradient(to bottom, " +
            palette.muted +
            " 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          transform: `translateY(${drift * 0.2}px)`,
        }}
      />
      {/* accent glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: 1100,
          top: -280,
          background: palette.accent,
          opacity: 0.08,
          filter: "blur(120px)",
          borderRadius: "50%",
          transform: `translate(${drift * 0.3}px, ${drift * 0.1}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          left: -180,
          top: 520,
          background: palette.secondary,
          opacity: 0.07,
          filter: "blur(110px)",
          borderRadius: "50%",
          transform: `translate(${-drift * 0.2}px, ${-drift * 0.15}px)`,
        }}
      />
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
};

const TopBar: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 345, 360], [0, 1, 1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 80,
        right: 80,
        height: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity,
        borderBottom: `1px solid ${palette.foreground}14`,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: palette.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: palette.background,
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: -1,
          }}
        >
          R
        </div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: -0.8, color: palette.foreground }}>Relay</div>
        <div
          style={{
            marginLeft: 18,
            fontSize: 12,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            color: palette.muted,
            fontWeight: 600,
            opacity: 0.9,
          }}
        >
          Team Planning
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: palette.muted,
            border: `1px solid ${palette.foreground}18`,
            padding: "8px 14px",
            borderRadius: 999,
            background: `${palette.foreground}0D`,
          }}
        >
          Silent preview • 12s
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: palette.accent }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: palette.secondary }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: palette.muted, opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
};

const BottomSafeLine: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 360], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 38,
        left: 80,
        right: 80,
        height: 2,
        background: `${palette.foreground}14`,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: palette.accent,
          borderRadius: 999,
        }}
      />
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const tagSpring = spring({ frame: frame - 12, fps, config: { damping: 16 } });
  const lineProgress = spring({ frame: frame - 6, fps, config: { damping: 20 } });
  const fadeOut = interpolate(frame, [78, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const logoY = interpolate(logoSpring, [0, 1], [40, 0]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);
  const tagY = interpolate(tagSpring, [0, 1], [20, 0]);
  const tagOpacity = interpolate(tagSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${logoY}px)`,
          opacity: logoOpacity,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div
            style={{
              fontSize: 168,
              fontWeight: 800,
              letterSpacing: -7,
              lineHeight: 1,
              color: palette.foreground,
            }}
          >
            Relay
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: palette.accent,
              marginBottom: 24,
              transform: `scale(${interpolate(lineProgress, [0, 1], [0, 1])})`,
              boxShadow: `0 0 24px ${palette.accent}66`,
            }}
          />
        </div>

        <div
          style={{
            width: 720 * lineProgress,
            height: 2,
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.secondary})`,
            marginTop: 12,
            borderRadius: 999,
            opacity: 0.9,
          }}
        />

        <div
          style={{
            marginTop: 32,
            fontSize: 34,
            letterSpacing: -0.6,
            fontWeight: 400,
            color: palette.foreground,
            transform: `translateY(${tagY}px)`,
            opacity: tagOpacity,
            textAlign: "center",
          }}
        >
          Make room for <span style={{ color: palette.accent, fontWeight: 700 }}>focused work</span>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 12,
            alignItems: "center",
            opacity: tagOpacity,
          }}
        >
          <span
            style={{
              fontSize: 13,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: palette.muted,
              fontWeight: 600,
            }}
          >
            Plan • Protect • Progress
          </span>
          <span style={{ width: 32, height: 1, background: `${palette.muted}66` }} />
          <span style={{ fontSize: 13, color: palette.muted, letterSpacing: 0.4 }}>A calmer way to plan together</span>
        </div>
      </div>

      {/* floating cards hint */}
      <div
        style={{
          position: "absolute",
          bottom: 170,
          display: "flex",
          gap: 16,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [20, 40], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        {["Mon", "Tue", "Wed"].map((d, i) => (
          <div
            key={d}
            style={{
              width: 220,
              height: 74,
              background: `${palette.foreground}0F`,
              border: `1px solid ${palette.foreground}14`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 16px",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: i === 1 ? palette.accent : `${palette.foreground}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: i === 1 ? palette.background : palette.muted,
              }}
            >
              {d}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: palette.foreground }}>{i === 1 ? "Focus block" : "Team sync"}</div>
              <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>{i === 1 ? "2h protected" : "9:30 AM"}</div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: i === 1 ? palette.accent : palette.secondary,
                opacity: 0.9,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const Middle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // feature index 0,1,2
  const featureIndex = Math.min(2, Math.floor(frame / 60));
  const featureNames = ["Plan together", "Protect focus time", "See progress"];
  const featureDescriptions = [
    "Share a single team plan everyone can follow",
    "Block time for deep work — and keep it",
    "Track momentum without the noise",
  ];
  const featureAccent = [palette.accent, palette.secondary, palette.accent];

  const fadeInOuter = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "116px 80px 80px 80px",
        display: "flex",
        flexDirection: "column",
        opacity: fadeInOuter,
      }}
    >
      {/* header row */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: `${featureAccent[featureIndex]}22`,
                border: `1px solid ${featureAccent[featureIndex]}44`,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 700,
                color: featureAccent[featureIndex],
              }}
            >
              0{featureIndex + 1} — 03
            </div>
            <div style={{ width: 40, height: 1, background: `${palette.foreground}22` }} />
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: palette.muted, fontWeight: 600 }}>
              Relay workspace
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 14 }}>
            <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: -2.2, lineHeight: 1, color: palette.foreground }}>
              {featureNames[featureIndex]}
            </div>
            <div style={{ fontSize: 15, color: palette.muted, fontWeight: 400, maxWidth: 420, lineHeight: 1.4 }}>
              {featureDescriptions[featureIndex]}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 8 }}>
          {[0, 1, 2].map((i) => {
            const isActive = i === featureIndex;
            const w = isActive ? 44 : 14;
            return (
              <div
                key={i}
                style={{
                  width: w,
                  height: 6,
                  borderRadius: 999,
                  background: isActive ? palette.accent : `${palette.foreground}22`,
                  transition: "all 0.3s",
                  opacity: isActive ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* product window */}
      <div
        style={{
          marginTop: 28,
          flex: 1,
          background: "#17181B",
          borderRadius: 24,
          border: `1px solid ${palette.foreground}14`,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* chrome */}
        <div
          style={{
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            background: "#1E1F23",
            borderBottom: `1px solid ${palette.foreground}0F`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 999, background: "#FF5F57" }} />
              <div style={{ width: 12, height: 12, borderRadius: 999, background: "#FFBD2E" }} />
              <div style={{ width: 12, height: 12, borderRadius: 999, background: "#28CA42" }} />
            </div>
            <div style={{ marginLeft: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: palette.foreground, display: "flex", alignItems: "center", justifyContent: "center", color: palette.background, fontWeight: 800, fontSize: 12 }}>R</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: palette.foreground }}>Relay</div>
              <div style={{ width: 1, height: 16, background: `${palette.foreground}18`, margin: "0 4px" }} />
              <div style={{ fontSize: 13, color: palette.muted }}>Next week • May 12—16</div>
              <div
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  color: palette.accent,
                  background: `${palette.accent}18`,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: `1px solid ${palette.accent}33`,
                }}
              >
                ● Live
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: palette.muted }}>Share</div>
            <div
              style={{
                background: palette.foreground,
                color: palette.background,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 999,
              }}
            >
              Publish plan
            </div>
            <div style={{ display: "flex", marginLeft: 6 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: i === 0 ? palette.accent : i === 1 ? palette.secondary : "#FFC857",
                    border: "2px solid #1E1F23",
                    marginLeft: i === 0 ? 0 : -8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: palette.background,
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* content area with crossfade */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#121316" }}>
          {/* PLAN TOGETHER */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: featureIndex === 0 ? 1 : 0,
              transform: `translateX(${interpolate(featureIndex === 0 ? 1 : 0, [0, 1], [16, 0])}px)`,
              transition: "opacity 0.4s",
              display: "flex",
            }}
          >
            <PlanTogetherContent frame={frame} fps={fps} active={featureIndex === 0} />
          </div>
          {/* PROTECT */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: featureIndex === 1 ? 1 : 0,
              transition: "opacity 0.4s",
              display: "flex",
            }}
          >
            <ProtectFocusContent frame={frame} fps={fps} active={featureIndex === 1} />
          </div>
          {/* SEE PROGRESS */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: featureIndex === 2 ? 1 : 0,
              transition: "opacity 0.4s",
              display: "flex",
            }}
          >
            <SeeProgressContent frame={frame} fps={fps} active={featureIndex === 2} />
          </div>
        </div>

        {/* bottom status */}
        <div
          style={{
            height: 36,
            background: "#1A1C1F",
            borderTop: `1px solid ${palette.foreground}0D`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            fontSize: 11,
            color: palette.muted,
            letterSpacing: 0.2,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: palette.accent, display: "inline-block" }} /> Updating in real time
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>3 editors • Last edit 2m ago</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: `${palette.foreground}0F`, padding: "4px 8px", borderRadius: 6, border: `1px solid ${palette.foreground}12` }}>⌘ K to command</span>
            <span>{featureIndex === 0 ? "Plan together" : featureIndex === 1 ? "Protect focus" : "See progress"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlanTogetherContent: React.FC<{ frame: number; fps: number; active: boolean }> = ({ frame, fps, active }) => {
  const local = frame - 0;
  const enter = spring({ frame: local, fps, config: { damping: 18 } });
  const dragProgress = active ? interpolate(local, [18, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const dragSpring = spring({ frame: Math.max(0, local - 18), fps, config: { damping: 14 } });

  return (
    <>
      {/* sidebar */}
      <div
        style={{
          width: 300,
          background: "#131416",
          borderRight: `1px solid ${palette.foreground}0D`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(enter, [0, 1], [-16, 0])}px)`,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>Projects</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { name: "Website launch", active: true, count: 8 },
              { name: "Q2 Roadmap", active: false, count: 12 },
              { name: "Hiring sprint", active: false, count: 5 },
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 12px",
                  borderRadius: 12,
                  background: p.active ? palette.foreground : "transparent",
                  color: p.active ? palette.background : palette.muted,
                  border: `1px solid ${p.active ? palette.foreground : `${palette.foreground}0D`}`,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span>{p.name}</span>
                <span
                  style={{
                    background: p.active ? palette.background + "22" : `${palette.foreground}10`,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                  }}
                >
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: `${palette.foreground}0D` }} />

        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>Team</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { n: "Alex Rivera", r: "Design", c: palette.accent },
              { n: "Sam Chen", r: "Engineering", c: palette.secondary },
              { n: "Maya Patel", r: "Product", c: "#FFC857" },
            ].map((u, idx) => (
              <div key={u.n} style={{ display: "flex", alignItems: "center", gap: 10, opacity: interpolate(spring({ frame: local - idx * 4, fps, config: { damping: 16 } }), [0, 1], [0, 1]) }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: u.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: palette.background }}>{u.n[0]}</div>
                <div>
                  <div style={{ fontSize: 13, color: palette.foreground, fontWeight: 600, lineHeight: 1 }}>{u.n}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{u.r}</div>
                </div>
                <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: 999, background: palette.accent }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", background: `${palette.accent}14`, border: `1px solid ${palette.accent}22`, borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: palette.foreground }}>Everyone in sync</div>
          <div style={{ fontSize: 11, color: palette.muted, marginTop: 4, lineHeight: 1.4 }}>Changes update live. No extra meetings needed.</div>
        </div>
      </div>

      {/* kanban */}
      <div style={{ flex: 1, padding: 20, display: "flex", gap: 16, background: "#0F1012" }}>
        {[
          { title: "To do", items: [{ t: "Homepage hero", tag: "Design", c: palette.muted }, { t: "Pricing table", tag: "Content", c: palette.secondary }], accent: false },
          { title: "In progress", items: [{ t: "Checkout flow", tag: "Engineering", c: palette.accent }, { t: "Brand review", tag: "Design", c: "#FFC857" }], accent: true },
          { title: "Done", items: [{ t: "Research synthesis", tag: "Research", c: palette.muted }], accent: false },
        ].map((col, colIndex) => (
          <div
            key={col.title}
            style={{
              flex: 1,
              background: col.accent ? `${palette.accent}08` : "#181A1E",
              border: `1px solid ${col.accent ? `${palette.accent}22` : `${palette.foreground}0D`}`,
              borderRadius: 16,
              padding: 14,
              transform: `translateY(${interpolate(spring({ frame: local - colIndex * 5, fps, config: { damping: 18 } }), [0, 1], [16, 0])}px)`,
              opacity: interpolate(spring({ frame: local - colIndex * 5, fps, config: { damping: 18 } }), [0, 1], [0, 1]),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: col.accent ? palette.accent : palette.muted }}>{col.title}</div>
              <div style={{ fontSize: 11, background: `${palette.foreground}0D`, color: palette.muted, padding: "2px 8px", borderRadius: 999 }}>{col.items.length}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {col.items.map((it, idx) => {
                const isDragging = col.title === "To do" && idx === 1 && active;
                const dragX = isDragging ? interpolate(dragSpring, [0, 1], [0, 280]) : 0;
                const dragY = isDragging ? interpolate(dragSpring, [0, 1], [0, -4]) : 0;
                const dragRotate = isDragging ? interpolate(dragSpring, [0, 1], [0, -1.5]) : 0;
                const dragOpacity = isDragging && dragProgress > 0.85 ? 0 : 1;
                return (
                  <div
                    key={it.t}
                    style={{
                      background: "#23252A",
                      border: `1px solid ${palette.foreground}0F`,
                      borderRadius: 12,
                      padding: "12px 12px",
                      transform: `translate(${dragX}px, ${dragY}px) rotate(${dragRotate}deg)`,
                      opacity: dragOpacity,
                      boxShadow: isDragging ? "0 12px 32px rgba(0,0,0,0.4)" : "none",
                      zIndex: isDragging ? 5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 999, background: it.c }} />
                      <div style={{ fontSize: 11, color: palette.muted, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>{it.tag}</div>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 999, background: `${palette.foreground}18` }} />
                        <div style={{ width: 14, height: 14, borderRadius: 999, background: palette.accent, border: "1px solid #23252A" }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: palette.foreground, lineHeight: 1.2 }}>{it.t}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 11, background: `${palette.foreground}0D`, color: palette.muted, padding: "4px 8px", borderRadius: 999 }}>Due Fri</span>
                      <span style={{ fontSize: 11, color: palette.muted, padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>◐ 3 subtasks</span>
                    </div>
                  </div>
                );
              })}
              {/* ghost card that appears in In progress after drag */}
              {col.title === "In progress" && (
                <div
                  style={{
                    background: "#23252A",
                    border: `1px dashed ${palette.accent}66`,
                    borderRadius: 12,
                    padding: "12px 12px",
                    opacity: dragProgress > 0.5 ? interpolate(dragSpring, [0, 1], [0, 1]) : 0,
                    transform: `scale(${interpolate(dragSpring, [0, 1], [0.96, 1])})`,
                    height: dragProgress > 0.5 ? "auto" : 0,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: palette.secondary }} />
                    <div style={{ fontSize: 11, color: palette.muted, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>Content</div>
                    <div style={{ marginLeft: "auto", fontSize: 10, color: palette.accent, fontWeight: 700, background: `${palette.accent}18`, padding: "2px 6px", borderRadius: 999 }}>NEW</div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: palette.foreground }}>Pricing table</div>
                  <div style={{ marginTop: 6, fontSize: 11, color: palette.muted }}>Moved by Sam • just now</div>
                </div>
              )}
              <div
                style={{
                  marginTop: 6,
                  border: `1px dashed ${palette.foreground}14`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: palette.muted,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>+</span> Add task
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const ProtectFocusContent: React.FC<{ frame: number; fps: number; active: boolean }> = ({ frame, fps, active }) => {
  const local = frame - 60;
  const enter = spring({ frame: Math.max(0, local), fps, config: { damping: 18 } });
  const focusGrow = active ? interpolate(local, [10, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const toggle = active ? interpolate(local, [14, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hours = ["9 AM", "11 AM", "1 PM", "3 PM", "5 PM"];

  return (
    <>
      <div style={{ width: 340, background: "#131416", borderRight: `1px solid ${palette.foreground}0D`, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>Focus control</div>
          <div style={{ marginTop: 16, background: "#1B1D20", border: `1px solid ${palette.foreground}0D`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: palette.foreground }}>Protect focus time</div>
                <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>Block calendar automatically</div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  background: toggle > 0.5 ? palette.accent : `${palette.foreground}18`,
                  position: "relative",
                  transition: "background 0.3s",
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: palette.foreground,
                    transform: `translateX(${toggle * 16}px)`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: `${palette.accent}16`, border: `1px solid ${palette.accent}24`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: palette.accent, lineHeight: 1 }}>14h</div>
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>protected this week</div>
              </div>
              <div style={{ flex: 1, background: `${palette.foreground}06`, border: `1px solid ${palette.foreground}0D`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: palette.foreground, lineHeight: 1 }}>3</div>
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>conflicts avoided</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { l: "Do not disturb", v: "On", on: true },
              { l: "Decline new meetings", v: "Focus blocks", on: true },
              { l: "Slack status", v: "Auto • Focusing", on: true },
            ].map((row) => (
              <div key={row.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#181A1E", border: `1px solid ${palette.foreground}0D`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: palette.foreground }}>{row.l}</div>
                <div style={{ fontSize: 11, color: palette.accent, background: `${palette.accent}14`, padding: "4px 8px", borderRadius: 999, fontWeight: 700 }}>{row.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, background: "#1B1D20", borderRadius: 12, padding: "12px 14px", border: `1px solid ${palette.foreground}0D` }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: palette.secondary, display: "flex", alignItems: "center", justifyContent: "center", color: palette.background, fontWeight: 800 }}>✓</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: palette.foreground }}>Focus time protected</div>
            <div style={{ fontSize: 11, color: palette.muted }}>No interruptions until 3 PM</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", background: "#0F1012" }}>
        <div style={{ display: "flex", gap: 0, flex: 1, opacity: interpolate(enter, [0, 1], [0, 1]) }}>
          {days.map((day, di) => (
            <div key={day} style={{ flex: 1, borderRight: di < 4 ? `1px solid ${palette.foreground}0A` : "none", padding: "0 10px", position: "relative" }}>
              <div style={{ textAlign: "center", padding: "8px 0", borderBottom: `1px solid ${palette.foreground}0D`, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: di === 2 ? palette.accent : palette.foreground }}>{day}</div>
                <div style={{ fontSize: 11, color: palette.muted }}>{12 + di}</div>
              </div>
              <div style={{ position: "relative", height: 320 }}>
                {/* hour lines */}
                {hours.map((_, hi) => (
                  <div key={hi} style={{ position: "absolute", top: hi * 64, left: 0, right: 0, height: 1, background: `${palette.foreground}08` }} />
                ))}
                {/* meeting blocks */}
                <div style={{ position: "absolute", top: 12, left: 6, right: 6, height: 44, background: `${palette.foreground}12`, border: `1px solid ${palette.foreground}10`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: palette.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Standup</div>
                  <div style={{ fontSize: 11, color: palette.foreground, fontWeight: 600 }}>9:00 — 9:30</div>
                </div>
                {/* focus block - grows */}
                <div
                  style={{
                    position: "absolute",
                    top: 74,
                    left: 6,
                    right: 6,
                    height: 108 * (di === 1 || di === 3 ? 0.9 + focusGrow * 0.3 : 1) * (di === 2 ? 1 : 0.85),
                    background: di === 2 ? palette.accent : `${palette.accent}B8`,
                    borderRadius: 12,
                    padding: "10px 10px",
                    opacity: di === 2 ? 1 : 0.95,
                    transform: `scaleY(${0.4 + focusGrow * 0.6})`,
                    transformOrigin: "top",
                    boxShadow: di === 2 ? `0 8px 24px ${palette.accent}33` : "none",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: palette.background, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 999, background: palette.background, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>◐</span> Focus
                  </div>
                  <div style={{ fontSize: 11, color: palette.background, opacity: 0.8, marginTop: 4, fontWeight: 600 }}>10:00 — 12:00</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 999, background: `${palette.background}33` }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 999, background: `${palette.background}33` }} />
                  </div>
                </div>

                {di !== 2 && (
                  <div style={{ position: "absolute", top: 210, left: 6, right: 6, height: 36, background: "#23252A", border: `1px solid ${palette.foreground}0D`, borderRadius: 10, padding: "6px 8px", opacity: 0.9 }}>
                    <div style={{ fontSize: 10, color: palette.muted, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Review</div>
                    <div style={{ fontSize: 11, color: palette.foreground, fontWeight: 600 }}>2:30 — 3:00</div>
                  </div>
                )}
                {di === 2 && (
                  <div style={{ position: "absolute", top: 210, left: 6, right: 6, height: 52, background: `repeating-linear-gradient(45deg, ${palette.foreground}10 0 8px, transparent 8px 12px)`, border: `1px dashed ${palette.foreground}18`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 999, background: `${palette.muted}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: palette.background }}>✕</span>
                    <span style={{ fontSize: 11, color: palette.muted, fontWeight: 600 }}>Declined</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, padding: "0 4px", fontSize: 11, color: palette.muted }}>
          <span>Hours shown in your timezone</span>
          <span style={{ color: palette.accent, fontWeight: 600 }}>14 hours protected →</span>
        </div>
      </div>
    </>
  );
};

const SeeProgressContent: React.FC<{ frame: number; fps: number; active: boolean }> = ({ frame, fps, active }) => {
  const local = frame - 120;
  const s1 = spring({ frame: Math.max(0, local), fps, config: { damping: 16 } });
  const s2 = spring({ frame: Math.max(0, local - 8), fps, config: { damping: 16 } });
  const s3 = spring({ frame: Math.max(0, local - 16), fps, config: { damping: 16 } });

  const bars = [56, 72, 48, 86, 64];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16, background: "#0F1012" }}>
      <div style={{ display: "flex", gap: 14 }}>
        {[
          { k: "Tasks done", v: "24", sub: "+6 this week", col: palette.accent },
          { k: "Focus time", v: "18.5h", sub: "82% of goal", col: palette.secondary },
          { k: "On track", v: "91%", sub: "3 at risk", col: "#FFC857" },
        ].map((stat, i) => (
          <div
            key={stat.k}
            style={{
              flex: 1,
              background: "#181A1E",
              border: `1px solid ${palette.foreground}0D`,
              borderRadius: 16,
              padding: "16px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: interpolate([s1, s2, s3][i] ?? s1, [0, 1], [0, 1]),
              transform: `translateY(${interpolate([s1, s2, s3][i] ?? s1, [0, 1], [12, 0])}px)`,
            }}
          >
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>{stat.k}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: palette.foreground, lineHeight: 1, marginTop: 6 }}>
                {stat.v} <span style={{ fontSize: 13, fontWeight: 600, color: palette.muted }}>{stat.sub}</span>
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `${stat.col}18`,
                border: `1px solid ${stat.col}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: stat.col,
                fontWeight: 800,
              }}
            >
              ↗
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, flex: 1 }}>
        <div
          style={{
            flex: 1.7,
            background: "#181A1E",
            border: `1px solid ${palette.foreground}0D`,
            borderRadius: 16,
            padding: 18,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.foreground }}>Weekly momentum</div>
            <div style={{ fontSize: 11, color: palette.muted, background: `${palette.foreground}0D`, padding: "6px 10px", borderRadius: 999, border: `1px solid ${palette.foreground}0D` }}>Last 5 days</div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 18, flex: 1, paddingBottom: 8 }}>
            {bars.map((h, i) => {
              const barSpring = spring({ frame: Math.max(0, local - i * 3), fps, config: { damping: 14 } });
              const height = h * (active ? barSpring : 0);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: "100%", display: "flex", gap: 6, alignItems: "flex-end", justifyContent: "center", height: 140 }}>
                    <div
                      style={{
                        flex: 1,
                        height: height,
                        background: i === 3 ? palette.accent : `${palette.foreground}16`,
                        borderRadius: "10px 10px 0 0",
                        position: "relative",
                        boxShadow: i === 3 ? `0 8px 20px ${palette.accent}33` : "none",
                      }}
                    >
                      {i === 3 && (
                        <div
                          style={{
                            position: "absolute",
                            top: -28,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: palette.accent,
                            color: palette.background,
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                            opacity: interpolate(spring({ frame: Math.max(0, local - 12), fps }), [0, 1], [0, 1]),
                          }}
                        >
                          Peak focus
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: (h * 0.55) * (active ? spring({ frame: Math.max(0, local - i * 3 - 2), fps, config: { damping: 14 } }) : 0),
                        background: i === 3 ? `${palette.secondary}AA` : `${palette.foreground}0A`,
                        borderRadius: "10px 10px 0 0",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: i === 3 ? palette.accent : palette.muted }}>{["Mon", "Tue", "Wed", "Thu", "Fri"][i]}</div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{["6", "8", "5", "9", "7"][i]} tasks</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, height: 1, background: `${palette.foreground}0D` }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: palette.muted }}>
            <span>Compared to last week</span>
            <span style={{ color: palette.accent, fontWeight: 700 }}>+18% focus time</span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#181A1E",
              border: `1px solid ${palette.foreground}0D`,
              borderRadius: 16,
              padding: 16,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              opacity: interpolate(s2, [0, 1], [0, 1]),
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: palette.foreground }}>Project health</div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 84, height: 84 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    background: `conic-gradient(${palette.accent} ${interpolate(s3, [0, 1], [0, 91]) * 3.6}deg, ${palette.foreground}14 0deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ inset: 8, position: "absolute", background: "#181A1E", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: palette.foreground }}>{Math.round(interpolate(s3, [0, 1], [0, 91]))}%</div>
                    <div style={{ fontSize: 10, color: palette.muted, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>on track</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { l: "On track", v: 12, c: palette.accent },
                  { l: "At risk", v: 2, c: "#FFC857" },
                  { l: "Blocked", v: 1, c: palette.muted },
                ].map((r) => (
                  <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: r.c }} />
                    <div style={{ fontSize: 12, color: palette.foreground, fontWeight: 600, flex: 1 }}>{r.l}</div>
                    <div style={{ fontSize: 12, color: palette.muted }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, background: `${palette.accent}12`, border: `1px solid ${palette.accent}1A`, borderRadius: 10, padding: "10px 12px", fontSize: 11, color: palette.muted, lineHeight: 1.4 }}>
              <span style={{ color: palette.foreground, fontWeight: 700 }}>Maya</span> moved 3 tasks to done today. Nice momentum.
            </div>
          </div>

          <div
            style={{
              background: palette.accent,
              borderRadius: 16,
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: palette.background, opacity: 0.7 }}>Weekly summary</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.background, marginTop: 4 }}>Ready to share</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: palette.background, color: palette.foreground, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>→</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const s2 = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const s3 = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const lineW = interpolate(spring({ frame: frame - 6, fps, config: { damping: 20 } }), [0, 1], [0, 1]);

  // Ensure final message fully readable for at least 60 frames (2 seconds) - from frame 30 to 90 in this sequence (which is 300-360 global). Keep opacity 1.
  const holdOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          opacity: holdOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(s1, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(s1, [0, 1], [20, 0])}px)`,
          }}
        >
          <span style={{ width: 36, height: 1, background: `${palette.foreground}22` }} />
          <span style={{ fontSize: 12, letterSpacing: 3.2, textTransform: "uppercase", color: palette.accent, fontWeight: 700 }}>Relay is ready</span>
          <span style={{ width: 36, height: 1, background: `${palette.foreground}22` }} />
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 0.95,
            color: palette.foreground,
            opacity: interpolate(s1, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(s1, [0, 1], [24, 0])}px)`,
          }}
        >
          <div>Start your next week</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 6 }}>
            <span>with</span>
            <span style={{ color: palette.accent, display: "flex", alignItems: "center", gap: 12 }}>
              Relay
              <span style={{ width: 20, height: 20, borderRadius: 999, background: palette.accent, display: "inline-block", boxShadow: `0 0 18px ${palette.accent}66` }} />
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            width: 520 * lineW,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${palette.accent}, ${palette.secondary}, transparent)`,
            borderRadius: 999,
            opacity: 0.9,
          }}
        />

        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(s2, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(s2, [0, 1], [12, 0])}px)`,
          }}
        >
          <div
            style={{
              background: palette.accent,
              color: palette.background,
              fontWeight: 800,
              fontSize: 16,
              padding: "14px 26px",
              borderRadius: 999,
              letterSpacing: -0.3,
              boxShadow: `0 8px 24px ${palette.accent}33`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Get started at relay.so <span style={{ fontSize: 18 }}>→</span>
          </div>
          <div
            style={{
              background: `${palette.foreground}0D`,
              border: `1px solid ${palette.foreground}14`,
              color: palette.foreground,
              fontWeight: 600,
              fontSize: 14,
              padding: "14px 22px",
              borderRadius: 999,
            }}
          >
            See how it works
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            letterSpacing: 0.8,
            color: palette.muted,
            opacity: interpolate(s3, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(s3, [0, 1], [8, 0])}px)`,
          }}
        >
          Free for teams • No credit card required • Set up in 2 minutes
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 82,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: interpolate(s3, [0, 1], [0, 1]),
          fontSize: 11,
          color: `${palette.muted}AA`,
          letterSpacing: 0.6,
        }}
      >
        <span>© Relay 2025 • Made for focused teams</span>
        <span>relay.so • privacy • terms</span>
      </div>
    </div>
  );
};
