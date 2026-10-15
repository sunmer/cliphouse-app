import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { palette } from './contract';

const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      <div style={{ position: 'absolute', width: 900, height: 900, left: -220, top: -320, background: palette.accent, opacity: 0.07, filter: 'blur(120px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', width: 820, height: 820, right: -160, bottom: -240, background: palette.secondary, opacity: 0.055, filter: 'blur(110px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 80, bottom: 80, border: '1px solid rgba(245,245,242,0.06)', borderRadius: 28, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 120 } });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const y = interpolate(p, [0, 1], [-10, 0]);
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, padding: '0 80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, opacity, transform: `translateY(${y}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, background: palette.accent, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.background, fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>R</div>
        <div style={{ color: palette.foreground, fontWeight: 800, fontSize: 22, letterSpacing: -0.8, fontFamily: 'Archivo' }}>Relay</div>
        <div style={{ marginLeft: 10, padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(177,180,188,0.21)', color: palette.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: 700, fontFamily: 'Archivo' }}>TEAM PLANNING</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ color: palette.muted, fontSize: 13, fontWeight: 600, fontFamily: 'Archivo' }}>relay.work</div>
        <div style={{ background: palette.foreground, color: palette.background, padding: '10px 18px', borderRadius: 24, fontSize: 13, fontWeight: 800, fontFamily: 'Archivo' }}>Get started free</div>
      </div>
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  const s2 = spring({ frame: frame - 12, fps, config: { damping: 20 } });
  const s3 = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const s4 = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const titleY = interpolate(s1, [0, 1], [22, 0]);
  const titleO = interpolate(s1, [0, 1], [0, 1]);
  const subY = interpolate(s2, [0, 1], [16, 0]);
  const subO = interpolate(s2, [0, 1], [0, 1]);
  const lineW = interpolate(s3, [0, 1], [0, 1]);
  const fadeOut = interpolate(frame, [72, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 80px', opacity: fadeOut }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 1280 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid rgba(177,180,188,0.19)', borderRadius: 24, padding: '7px 14px', background: 'rgba(255,255,255,0.05)', opacity: subO, transform: `translateY(${subY}px)` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: palette.accent, boxShadow: '0 0 12px rgba(184,243,107,0.5)' }} />
          <span style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.4, fontWeight: 700, fontFamily: 'Archivo' }}>INTRODUCING RELAY — BUILT FOR FOCUS</span>
        </div>
        <div style={{ marginTop: 28, opacity: titleO, transform: `translateY(${titleY}px)` }}>
          <div style={{ fontSize: 172, fontWeight: 900, lineHeight: 0.85, letterSpacing: -7, color: palette.foreground, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 6, fontFamily: 'Archivo' }}>
            Relay
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: palette.accent, display: 'inline-block', marginTop: 22, marginLeft: 6 }} />
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <div style={{ height: 1, background: palette.foreground, opacity: 0.12, width: `${lineW * 560}px` }} />
        </div>
        <div style={{ marginTop: 22, opacity: subO, transform: `translateY(${subY}px)` }}>
          <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1.4, color: palette.foreground, fontFamily: 'Archivo' }}>Make room for focused work.</div>
          <div style={{ marginTop: 12, fontSize: 18, color: palette.muted, fontWeight: 500, maxWidth: 660, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5, fontFamily: 'Archivo' }}>A calm, shared space to plan your week, protect deep work, and move together.</div>
        </div>
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 12, opacity: interpolate(s4, [0, 1], [0, 1]), transform: `translateY(${interpolate(s4, [0, 1], [12, 0])}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: palette.accent, color: palette.background, padding: '13px 24px', borderRadius: 28, fontWeight: 800, fontSize: 14, fontFamily: 'Archivo' }}>Start planning free <span style={{ fontWeight: 400, opacity: 0.9 }}>→</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(245,245,242,0.12)', color: palette.foreground, padding: '13px 20px', borderRadius: 28, fontWeight: 700, fontSize: 14, background: 'rgba(255,255,255,0.05)', fontFamily: 'Archivo' }}>See 30s demo <span style={{ opacity: 0.6 }}>→</span></div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProductStage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [172, 188], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enter, exit);
  const active = frame < 60 ? 0 : frame < 120 ? 1 : 2;
  const titles: string[] = ['Plan together', 'Protect focus time', 'See progress'];
  const descs: string[] = ['Drag, assign, and align on what matters this week — without the noise.', 'Block focus hours, mute distractions, and guard deep work for the whole team.', 'Track momentum at a glance. No check-ins needed, just clear progress.'];
  const eyebrow = active === 0 ? '01  —  PLAN' : active === 1 ? '02  —  FOCUS' : '03  —  PROGRESS';
  const indicatorLeft = interpolate(frame, [0, 60, 120, 180], [0, 188, 376, 376], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const windowScale = interpolate(frame, [0, 18], [0.96, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: palette.accent }} />
            <span style={{ fontSize: 11, letterSpacing: 1.3, fontWeight: 800, color: palette.muted, fontFamily: 'Archivo' }}>{eyebrow}</span>
            <span style={{ fontSize: 11, color: 'rgba(177,180,188,0.5)', fontFamily: 'Archivo' }}>•</span>
            <span style={{ fontSize: 11, letterSpacing: 1, fontWeight: 600, color: palette.foreground, fontFamily: 'Archivo' }}>HOW IT WORKS</span>
          </div>
          <div style={{ height: 56, marginTop: 16, position: 'relative', width: 900, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {titles.map((t, i) => {
              const isActive = i === active;
              const o = interpolate(frame, [i * 60 - 10, i * 60, (i + 1) * 60 - 20, (i + 1) * 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const y = interpolate(frame, [i * 60 - 10, i * 60], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={t} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isActive ? o : 0, transform: `translateY(${isActive ? y : 6}px)` }}>
                  <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.6, color: palette.foreground, fontFamily: 'Archivo', lineHeight: 1 }}>{t}</div>
                  <div style={{ marginTop: 10, fontSize: 16, color: palette.muted, fontWeight: 500, maxWidth: 640, lineHeight: 1.4, fontFamily: 'Archivo' }}>{descs[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 18, width: 1120, height: 520, background: '#181A1F', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset', transform: `scale(${windowScale})`, position: 'relative' }}>
          <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', opacity: 0.9 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', opacity: 0.9 }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA42', opacity: 0.9 }} />
              </div>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
              <div style={{ color: palette.foreground, fontSize: 13, fontWeight: 700, fontFamily: 'Archivo' }}>Week Plan — Marketing • Q2</div>
              <div style={{ background: palette.accent, color: palette.background, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, letterSpacing: 0.6, fontFamily: 'Archivo' }}>LIVE</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '6px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', marginLeft: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FFC4B8', border: '2px solid #181A1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#181A1F' }}>A</div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#78B9ED', border: '2px solid #181A1F', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#181A1F' }}>B</div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#B8F36B', border: '2px solid #181A1F', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#181A1F' }}>C</div>
                </div>
                <span style={{ color: palette.foreground, fontSize: 12, fontWeight: 700, fontFamily: 'Archivo' }}>4 online</span>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.muted, fontSize: 12 }}>≡</div>
            </div>
          </div>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', background: '#1A1D22' }}>
            {titles.map((t, idx) => {
              const isActive = idx === active;
              return (
                <div key={t} style={{ padding: '8px 14px', borderRadius: 10, background: isActive ? 'rgba(184,243,107,0.12)' : 'transparent', border: isActive ? '1px solid rgba(184,243,107,0.19)' : '1px solid transparent', color: isActive ? palette.foreground : palette.muted, fontSize: 13, fontWeight: isActive ? 800 : 600, fontFamily: 'Archivo', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: idx === 0 ? palette.accent : idx === 1 ? palette.secondary : palette.foreground, opacity: isActive ? 1 : 0.4 }} />
                  {t}
                </div>
              );
            })}
            <div style={{ position: 'absolute', bottom: -1, left: 16 + indicatorLeft, width: 176, height: 2, background: palette.accent, borderRadius: 2, opacity: 0.95 }} />
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: palette.muted, fontSize: 11, fontWeight: 600, fontFamily: 'Archivo' }}>WEEK 14</div>
              <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.08)', color: palette.foreground, fontSize: 11, fontWeight: 700 }}>{'<'}</div>
                <div style={{ padding: '4px 8px', color: palette.muted, fontSize: 11, fontWeight: 600 }}>Apr 7 — 11</div>
                <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', color: palette.foreground, fontSize: 11, fontWeight: 700 }}>{'>'}</div>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 420, background: '#15171B' }}>
            <PlanView frame={frame} fps={fps} />
            <FocusView frame={frame} fps={fps} />
            <ProgressView frame={frame} fps={fps} />
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: i === active ? 22 : 8, height: 6, borderRadius: 10, background: i === active ? palette.accent : 'rgba(255,255,255,0.15)' }} />
          ))}
          <span style={{ marginLeft: 8, color: palette.muted, fontSize: 11, letterSpacing: 1, fontWeight: 600, fontFamily: 'Archivo' }}>{active === 0 ? 'PLAN TOGETHER' : active === 1 ? 'PROTECT FOCUS' : 'SEE PROGRESS'}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PlanView: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const viewIndex = 0;
  const local = frame - viewIndex * 60;
  const opacity = interpolate(frame, [viewIndex * 60 - 8, viewIndex * 60, (viewIndex + 1) * 60 - 12, (viewIndex + 1) * 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity, padding: 14, display: 'flex', gap: 14 }}>
      <div style={{ width: 300, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, letterSpacing: 1, fontWeight: 800, color: palette.muted, fontFamily: 'Archivo' }}>THIS WEEK</div>
          <div style={{ background: palette.accent, color: palette.background, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, fontFamily: 'Archivo' }}>12 TASKS</div>
        </div>
        {([
          { t: 'Q2 Launch checklist', d: 'Due Mon • 3 subtasks', prog: 0.7 },
          { t: 'Design system audit', d: 'Due Tue • Maya', prog: 0.45 },
          { t: 'User interviews', d: 'Due Wed • 5 notes', prog: 0.9 },
          { t: 'Sprint retro', d: 'Due Fri • Team', prog: 0.3 },
        ] as const).map((item, idx) => {
          const delay = idx * 4;
          const o = interpolate(local, [delay, delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const y = interpolate(local, [delay, delay + 10], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={item.t} style={{ background: idx === 0 ? 'rgba(184,243,107,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? 'rgba(184,243,107,0.18)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, opacity: o, transform: `translateY(${y}px)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: palette.foreground, fontFamily: 'Archivo' }}>{item.t}</div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: idx === 1 ? '#78B9ED' : idx === 2 ? '#FFC4B8' : palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: palette.background }}>{idx === 1 ? 'M' : idx === 2 ? 'J' : '✓'}</div>
              </div>
              <div style={{ fontSize: 11, color: palette.muted, fontFamily: 'Archivo' }}>{item.d}</div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${item.prog * 100}%`, height: '100%', background: idx === 0 ? palette.accent : palette.foreground, opacity: 0.9 }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 'auto', background: palette.foreground, color: palette.background, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 800, fontFamily: 'Archivo' }}>+ New task</div>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 12 }}>
        {([
          { title: 'Up next', count: '04', cards: [{ n: 'Campaign brief', tag: 'Design', av: 'A' }, { n: 'Site copy review', tag: 'Content', av: 'B' }] },
          { title: 'In progress', count: '03', cards: [{ n: 'Onboarding flow', tag: 'Product', av: 'M' }, { n: 'Pricing page', tag: 'Web', av: 'S' }] },
          { title: 'Done', count: '06', cards: [{ n: 'Research sync', tag: 'Done', av: '✓' }, { n: 'Brand tokens', tag: 'Done', av: '✓' }] },
        ] as const).map((col, colIdx) => (
          <div key={col.title} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: palette.muted, fontFamily: 'Archivo' }}>{col.title.toUpperCase()}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20, fontFamily: 'Archivo' }}>{col.count}</div>
            </div>
            {col.cards.map((card, idx) => {
              const delay = colIdx * 6 + idx * 5 + 4;
              const o = interpolate(local, [delay, delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const y = interpolate(local, [delay, delay + 10], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={card.n} style={{ background: colIdx === 1 ? 'rgba(255,255,255,0.06)' : '#1F2228', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 12px', opacity: o, transform: `translateY(${y}px)`, boxShadow: colIdx === 1 ? '0 8px 24px rgba(0,0,0,0.2)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: palette.foreground, fontFamily: 'Archivo', lineHeight: 1.2 }}>{card.n}</div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: colIdx === 2 ? palette.accent : palette.muted, background: colIdx === 2 ? 'rgba(184,243,107,0.12)' : 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 20, fontFamily: 'Archivo' }}>{card.tag}</div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: card.av === '✓' ? palette.accent : colIdx === 0 ? '#FFC4B8' : palette.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: palette.background }}>{card.av}</div>
                  </div>
                </div>
              );
            })}
            <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.muted, fontSize: 11, fontWeight: 600, fontFamily: 'Archivo' }}>+ Add card</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FocusView: React.FC<{ frame: number; fps: number }> = ({ frame }) => {
  const viewIndex = 1;
  const local = frame - viewIndex * 60;
  const opacity = interpolate(frame, [viewIndex * 60 - 8, viewIndex * 60, (viewIndex + 1) * 60 - 12, (viewIndex + 1) * 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blocks = [
    { day: 0, top: 38, h: 72, title: 'Focus — Writing', sub: '9:00 — 10:30 • No notifications', c: palette.accent },
    { day: 1, top: 150, h: 84, title: 'Deep work', sub: '1:00 — 2:30 • Team muted', c: palette.secondary },
    { day: 2, top: 66, h: 66, title: 'Focus — Design', sub: '10:00 — 11:00', c: palette.accent },
    { day: 3, top: 180, h: 64, title: 'Review block', sub: '2:00 — 3:00', c: '#FFC4B8' },
    { day: 4, top: 28, h: 56, title: 'Planning', sub: '9:00 — 10:00', c: 'rgba(255,255,255,0.9)' },
  ];
  return (
    <AbsoluteFill style={{ opacity, padding: 14, display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 36, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ width: 56, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.muted, fontSize: 10, fontWeight: 700, fontFamily: 'Archivo' }}>GMT+1</div>
          {['MON 7', 'TUE 8', 'WED 9', 'THU 10', 'FRI 11'].map((d, i) => (
            <div key={d} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', borderRight: i === 4 ? 'none' : '1px solid rgba(255,255,255,0.06)', background: i === 2 ? 'rgba(184,243,107,0.06)' : 'transparent' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: i === 2 ? palette.accent : palette.foreground, fontFamily: 'Archivo' }}>{d}</div>
              <div style={{ fontSize: 9, color: palette.muted, fontFamily: 'Archivo' }}>{i === 2 ? 'Today' : ''}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ width: 56, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
            {['9 AM', '11 AM', '1 PM', '3 PM', '5 PM'].map((t) => (
              <div key={t} style={{ height: 58, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: palette.muted, fontSize: 10, fontWeight: 600, fontFamily: 'Archivo', opacity: 0.7 }}>{t}</div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
            {[0, 1, 2, 3, 4].map((day) => (
              <div key={day} style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative', background: day === 2 ? 'rgba(184,243,107,0.03)' : 'transparent' }}>
                <div style={{ position: 'absolute', top: 28, left: 8, right: 8, height: 1, background: 'rgba(255,255,255,0.04)', borderTop: '1px dashed rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', top: 86, left: 8, right: 8, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', top: 144, left: 8, right: 8, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', top: 202, left: 8, right: 8, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                {blocks.filter((b) => b.day === day).map((b, idx) => {
                  const delay = idx * 5 + 6;
                  const o = interpolate(local, [delay, delay + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  const sc = interpolate(local, [delay, delay + 12], [0.92, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  return (
                    <div key={b.title} style={{ position: 'absolute', top: b.top, left: 8, right: 8, height: b.h, background: b.c === palette.accent ? 'rgba(184,243,107,0.14)' : b.c === palette.secondary ? 'rgba(120,185,237,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${b.c}60`, borderLeft: `3px solid ${b.c}`, borderRadius: 10, padding: '8px 10px', opacity: o, transform: `scale(${sc})` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: palette.foreground, fontFamily: 'Archivo', lineHeight: 1 }}>{b.title}</div>
                      <div style={{ fontSize: 9, color: palette.muted, marginTop: 4, fontFamily: 'Archivo', lineHeight: 1.2 }}>{b.sub}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: palette.accent, borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: palette.background, fontFamily: 'Archivo' }}>FOCUS TIME PROTECTED</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: palette.background, marginTop: 4, fontFamily: 'Archivo', letterSpacing: -1 }}>14.5h</div>
          <div style={{ fontSize: 12, color: 'rgba(16,17,20,0.7)', fontWeight: 600, fontFamily: 'Archivo' }}>this week • +2.5h vs last week</div>
          <div style={{ marginTop: 10, background: palette.background, borderRadius: 20, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: palette.foreground, fontFamily: 'Archivo' }}>Guard is on</span>
            <span style={{ background: palette.accent, color: palette.background, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, fontFamily: 'Archivo' }}>ON</span>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: palette.muted, fontFamily: 'Archivo' }}>NOTIFICATIONS</div>
          {([
            { n: 'Slack', s: 'Muted during focus', ok: true },
            { n: 'Email', s: 'Batch at 12pm & 4pm', ok: true },
            { n: 'Meetings', s: '2 declined — focus', ok: false },
          ] as const).map((row) => (
            <div key={row.n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: palette.foreground, fontFamily: 'Archivo' }}>{row.n}</div>
                <div style={{ fontSize: 10, color: palette.muted, fontFamily: 'Archivo' }}>{row.s}</div>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: row.ok ? palette.accent : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: row.ok ? palette.background : palette.muted, fontSize: 10, fontWeight: 800 }}>{row.ok ? '✓' : '•'}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProgressView: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const viewIndex = 2;
  const local = frame - viewIndex * 60;
  const opacity = interpolate(frame, [viewIndex * 60 - 8, viewIndex * 60, (viewIndex + 1) * 60 - 12, (viewIndex + 1) * 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const barHeights = [42, 68, 48, 82, 58, 74, 62];
  return (
    <AbsoluteFill style={{ opacity, padding: 14, display: 'flex', gap: 14 }}>
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#1F2228', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 110, height: 110, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={110} height={110} viewBox='0 0 100 100' style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={50} cy={50} r={42} fill='none' stroke='rgba(255,255,255,0.08)' strokeWidth={10} />
              <circle cx={50} cy={50} r={42} fill='none' stroke={palette.accent} strokeWidth={10} strokeLinecap='round' strokeDasharray={263.89} strokeDashoffset={263.89 - interpolate(local, [6, 28], [0, 190], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: palette.foreground, fontFamily: 'Archivo', letterSpacing: -1 }}>{Math.round(interpolate(local, [6, 28], [0, 72], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))}%</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: palette.muted, fontFamily: 'Archivo' }}>ON TRACK</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: palette.foreground, fontFamily: 'Archivo' }}>Weekly progress</div>
            <div style={{ fontSize: 11, color: palette.muted, marginTop: 4, lineHeight: 1.4, fontFamily: 'Archivo' }}>Tasks completed without extra meetings. Team is moving steady.</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <div style={{ background: palette.accent, color: palette.background, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, fontFamily: 'Archivo' }}>+12% vs last week</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {([
            { k: 'Completed', v: '24', sub: 'tasks', col: palette.accent },
            { k: 'In review', v: '06', sub: 'items', col: palette.secondary },
            { k: 'At risk', v: '02', sub: 'items', col: '#FF5F57' },
          ] as const).map((s) => (
            <div key={s.k} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 10, letterSpacing: 0.8, fontWeight: 800, color: palette.muted, fontFamily: 'Archivo' }}>{s.k.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: palette.foreground, marginTop: 4, fontFamily: 'Archivo' }}>{s.v}</div>
              <div style={{ fontSize: 10, color: palette.muted, fontFamily: 'Archivo' }}>{s.sub}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: s.k === 'Completed' ? '78%' : s.k === 'In review' ? '45%' : '18%', height: '100%', background: s.col }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: palette.foreground, fontFamily: 'Archivo' }}>Momentum — last 7 days</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: palette.accent }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>Tasks closed</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: palette.secondary, marginLeft: 6 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>Focus hours</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 16, padding: '0 6px' }}>
          {barHeights.map((h, i) => {
            const prog = spring({ frame: local - i * 2, fps, config: { damping: 18, stiffness: 140 } });
            const height = interpolate(prog, [0, 1], [6, h * 2.2]);
            const opacityBar = interpolate(prog, [0, 1], [0.2, 1]);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', display: 'flex', gap: 4, alignItems: 'flex-end', justifyContent: 'center', height: 180 }}>
                  <div style={{ flex: 1, height: height, background: palette.accent, borderRadius: 6, opacity: opacityBar }} />
                  <div style={{ flex: 1, height: height * 0.62, background: palette.secondary, borderRadius: 6, opacity: opacityBar * 0.9 }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: i === 3 ? palette.background : palette.muted, background: i === 3 ? palette.foreground : 'transparent', padding: i === 3 ? '2px 8px' : '2px 0', borderRadius: 10, fontFamily: 'Archivo' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, background: 'rgba(184,243,107,0.08)', border: '1px solid rgba(184,243,107,0.14)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.background, fontSize: 11, fontWeight: 800 }}>✓</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.foreground, fontFamily: 'Archivo' }}>No check-ins needed today</span>
          </div>
          <span style={{ fontSize: 11, color: palette.muted, fontFamily: 'Archivo' }}>Updated 2m ago</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 18 } });
  const s2 = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const s3 = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const enter = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(s1, [0, 1], [18, 0]);
  const titleO = interpolate(s1, [0, 1], [0, 1]);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 80px', opacity: enter }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 1100 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: '6px 14px', opacity: titleO, transform: `translateY(${titleY}px)` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: palette.accent }} />
          <span style={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>READY WHEN YOU ARE</span>
        </div>
        <div style={{ marginTop: 22, opacity: titleO, transform: `translateY(${titleY}px)` }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2.2, lineHeight: 0.95, color: palette.foreground, fontFamily: 'Archivo' }}>
            Start your next week
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2.2, lineHeight: 0.95, color: palette.foreground, fontFamily: 'Archivo', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            with <span style={{ color: palette.accent, display: 'inline-flex', alignItems: 'center', gap: 10 }}>Relay <span style={{ width: 14, height: 14, borderRadius: '50%', background: palette.accent, display: 'inline-block' }} /></span>
          </div>
        </div>
        <div style={{ marginTop: 16, opacity: interpolate(s2, [0, 1], [0, 1]), transform: `translateY(${interpolate(s2, [0, 1], [12, 0])}px)` }}>
          <div style={{ fontSize: 18, color: palette.muted, fontWeight: 500, fontFamily: 'Archivo' }}>Plan together. Protect focus. See progress — all in one calm place.</div>
        </div>
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 12, opacity: interpolate(s3, [0, 1], [0, 1]), transform: `translateY(${interpolate(s3, [0, 1], [10, 0])}px)` }}>
          <div style={{ background: palette.accent, color: palette.background, padding: '14px 26px', borderRadius: 28, fontWeight: 800, fontSize: 15, fontFamily: 'Archivo', display: 'flex', alignItems: 'center', gap: 8 }}>Get started free <span>→</span></div>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: palette.foreground, padding: '14px 22px', borderRadius: 28, fontWeight: 700, fontSize: 14, fontFamily: 'Archivo' }}>Book a demo</div>
        </div>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, opacity: 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FFC4B8', border: '2px solid #101114' }} />
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#78B9ED', border: '2px solid #101114', marginLeft: -8 }} />
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#B8F36B', border: '2px solid #101114', marginLeft: -8 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: palette.muted, fontFamily: 'Archivo' }}>Trusted by focused teams</span>
          </div>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: palette.muted, fontFamily: 'Archivo' }}>Free for teams up to 5 • No credit card</span>
        </div>
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 28, opacity: 0.35 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>RELAY.WORK</span>
          <span style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>PRIVACY • TERMS</span>
          <span style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>© 2026 RELAY</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, fontFamily: 'Archivo', overflow: 'hidden' }}>
      <Background />
      <Header />
      <Sequence from={0} durationInFrames={92}>
        <Intro />
      </Sequence>
      <Sequence from={85} durationInFrames={190}>
        <ProductStage />
      </Sequence>
      <Sequence from={265} durationInFrames={95}>
        <Outro />
      </Sequence>
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.35 }}>
        <div style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>SILENT PREVIEW • 12S</div>
        <div style={{ width: 120, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: palette.accent, opacity: 0.9 }} />
        </div>
        <div style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: palette.muted, fontFamily: 'Archivo' }}>1920×1080 • 30FPS</div>
      </div>
    </AbsoluteFill>
  );
};
