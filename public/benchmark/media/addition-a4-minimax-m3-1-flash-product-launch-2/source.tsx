import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame} from 'remotion';
import {palette} from './contract';

const FONT = 'Archivo';
const frameBorder = 'rgba(245,245,242,0.10)';
const panel = 'rgba(245,245,242,0.045)';
const greenSoft = 'rgba(184,243,107,0.13)';
const blueSoft = 'rgba(120,185,237,0.13)';

const RelayMark: React.FC<{size?: number; color?: string}> = ({size = 64, color = palette.accent}) => (
  <svg width={size} height={size} viewBox='0 0 64 64' style={{display: 'block'}}>
    <rect x='5' y='5' width='38' height='38' rx='12' fill='none' stroke={color} strokeWidth='6' />
    <rect x='21' y='21' width='38' height='38' rx='12' fill={palette.background} stroke={color} strokeWidth='6' />
  </svg>
);

const Glyph: React.FC<{type: 'plan' | 'focus' | 'progress'}> = ({type}) => {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: palette.muted,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (type === 'plan') {
    return (
      <svg {...common}>
        <rect x='3' y='4' width='18' height='16' rx='3' />
        <path d='M7 8h10M7 12h7M7 16h9' />
      </svg>
    );
  }
  if (type === 'focus') {
    return (
      <svg {...common}>
        <path d='M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3' />
        <circle cx='12' cy='12' r='3.2' />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d='M4 19V9M10 19V5M16 19v-7M22 19V3' />
    </svg>
  );
};

const Background: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: palette.background, overflow: 'hidden', fontFamily: FONT}}>
    <div
      style={{
        position: 'absolute',
        width: 920,
        height: 920,
        right: -260,
        top: -310,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(184,243,107,0.12) 0%, rgba(184,243,107,0) 68%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        width: 760,
        height: 760,
        left: -300,
        bottom: -360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,185,237,0.10) 0%, rgba(120,185,237,0) 70%)',
      }}
    />
    <div style={{position: 'absolute', inset: 80, border: '1px solid rgba(245,245,242,0.035)', borderRadius: 36}} />
  </AbsoluteFill>
);

const Intro: React.FC<{frame: number}> = ({frame}) => {
  const titleIn = spring({frame, fps: 30, config: {damping: 20, stiffness: 115, mass: 0.9}});
  const opacity = interpolate(frame, [0, 8, 80, 89], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(titleIn, [0, 1], [54, 0]);
  const lineY = interpolate(frame, [0, 90], [28, 0]);
  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 120, top: 126, transform: `translateY(${lineY}px)`}}>
        <RelayMark size={58} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 260,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            color: palette.foreground,
            fontSize: 190,
            lineHeight: 0.95,
            fontWeight: 760,
            letterSpacing: -9,
          }}
        >
          Relay
        </div>
        <div style={{height: 10, width: interpolate(titleIn, [0, 1], [0, 174]), marginTop: 40, background: palette.accent, borderRadius: 10}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 124,
          top: 635,
          opacity: interpolate(frame, [14, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(frame, [14, 28], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + 'px'})`,
          color: palette.muted,
          fontSize: 58,
          lineHeight: 1.1,
          fontWeight: 430,
          letterSpacing: -1.8,
        }}
      >
        Make room for focused work
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 130,
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(184,243,107,0.28)',
          opacity: interpolate(frame, [8, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `scale(${interpolate(frame, [8, 45], [0.72, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
        }}
      />
    </AbsoluteFill>
  );
};

const AppFrame: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: '#17181D',
      border: `1px solid ${frameBorder}`,
      boxShadow: '0 36px 90px rgba(0,0,0,0.34)',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        height: 72,
        flexShrink: 0,
        borderBottom: `1px solid ${frameBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 26px',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <RelayMark size={30} />
        <span style={{fontSize: 20, fontWeight: 700, color: palette.foreground}}>Relay</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <div style={{width: 9, height: 9, borderRadius: 9, background: palette.accent}} />
        <div style={{width: 32, height: 8, borderRadius: 8, background: 'rgba(245,245,242,0.12)'}} />
        <div style={{width: 32, height: 8, borderRadius: 8, background: 'rgba(245,245,242,0.07)'}} />
        <div style={{width: 36, height: 36, marginLeft: 8, borderRadius: '50%', background: blueSoft, border: '1px solid rgba(120,185,237,0.35)'}} />
      </div>
    </div>
    <div style={{display: 'flex', flex: 1, minHeight: 0}}>
      <aside
        style={{
          width: 218,
          flexShrink: 0,
          borderRight: `1px solid ${frameBorder}`,
          padding: '30px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div style={{display: 'grid', gap: 16, width: '100%'}}>
          <div style={{height: 48, borderRadius: 14, background: greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Glyph type='plan' />
          </div>
          <div style={{height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Glyph type='focus' />
          </div>
          <div style={{height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Glyph type='progress' />
          </div>
        </div>
        <div style={{marginTop: 'auto', width: 42, height: 42, borderRadius: '50%', background: palette.foreground, opacity: 0.9}} />
      </aside>
      <div style={{flex: 1, minWidth: 0, position: 'relative'}}>{children}</div>
    </div>
  </div>
);

const PlanCard: React.FC<{
  title: string;
  color: string;
  delay: number;
  sceneFrame: number;
  width?: number;
}> = ({title, color, delay, sceneFrame, width = '100%'}) => {
  const appear = spring({
    frame: Math.max(0, sceneFrame - 8 - delay),
    fps: 30,
    config: {damping: 19, stiffness: 145, mass: 0.75},
  });
  return (
    <div
      style={{
        width,
        opacity: appear,
        transform: `translateY(${interpolate(appear, [0, 1], [22, 0])}px)`,
        backgroundColor: 'rgba(245,245,242,0.055)',
        border: '1px solid rgba(245,245,242,0.09)',
        borderTop: `3px solid ${color}`,
        borderRadius: 15,
        padding: '18px 18px 16px',
        boxSizing: 'border-box',
        boxShadow: '0 12px 25px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{fontSize: 19, fontWeight: 650, color: palette.foreground, marginBottom: 20}}>{title}</div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex'}}>
          <div style={{width: 25, height: 25, borderRadius: '50%', background: color, marginRight: -6, border: '3px solid #17181D'}} />
          <div style={{width: 25, height: 25, borderRadius: '50%', background: palette.muted, border: '3px solid #17181D'}} />
        </div>
        <div style={{width: 38, height: 7, borderRadius: 7, background: 'rgba(245,245,242,0.10)'}} />
      </div>
    </div>
  );
};

const PlanView: React.FC<{sceneFrame: number}> = ({sceneFrame}) => (
  <div style={{height: '100%', padding: '30px 34px', boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28}}>
      <div style={{fontSize: 30, color: palette.foreground, fontWeight: 700, letterSpacing: -0.8}}>This week</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
        <div style={{width: 10, height: 10, borderRadius: '50%', background: palette.accent}} />
        <div style={{fontSize: 15, color: palette.muted, fontWeight: 600}}>3</div>
      </div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, height: 450}}>
      {[
        {day: 'MON', cards: [['Team planning', palette.accent], ['Research notes', palette.muted]], delay: 0},
        {day: 'TUE', cards: [['Design review', palette.secondary], ['Feedback', palette.muted]], delay: 1},
        {day: 'WED', cards: [['Launch brief', palette.accent], ['Final check', palette.secondary]], delay: 2},
      ].map((column) => (
        <div key={column.day} style={{minWidth: 0}}>
          <div style={{fontSize: 14, color: palette.muted, letterSpacing: 2.2, fontWeight: 750, marginBottom: 18}}>{column.day}</div>
          <div style={{display: 'grid', gap: 16}}>
            {column.cards.map((card, index) => (
              <PlanCard
                key={card[0] as string}
                title={card[0] as string}
                color={card[1] as string}
                delay={column.delay * 3 + index * 2}
                sceneFrame={sceneFrame}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const FocusView: React.FC<{sceneFrame: number}> = ({sceneFrame}) => {
  const focusIn = spring({frame: Math.max(0, sceneFrame - 7), fps: 30, config: {damping: 18, stiffness: 120, mass: 0.8}});
  const shieldIn = spring({frame: Math.max(0, sceneFrame - 13), fps: 30, config: {damping: 16, stiffness: 150, mass: 0.65}});
  return (
    <div style={{height: '100%', padding: '30px 34px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24}}>
        <div style={{fontSize: 30, color: palette.foreground, fontWeight: 700, letterSpacing: -0.8}}>Focus</div>
        <div style={{display: 'flex', gap: 8}}>
          <div style={{width: 42, height: 8, borderRadius: 8, background: greenSoft}} />
          <div style={{width: 42, height: 8, borderRadius: 8, background: 'rgba(245,245,242,0.08)'}} />
        </div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 16}}>
        {['MON', 'TUE', 'WED'].map((day, index) => (
          <div key={day} style={{fontSize: 14, color: index === 1 ? palette.accent : palette.muted, fontWeight: 750, letterSpacing: 2}}>{day}</div>
        ))}
      </div>
      <div style={{height: 420, position: 'relative', borderTop: `1px solid ${frameBorder}`, borderBottom: `1px solid ${frameBorder}`}}>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} style={{position: 'absolute', left: 0, right: 0, top: `${25 + row * 25}%`, height: 1, background: 'rgba(245,245,242,0.065)'}} />
        ))}
        {[0, 1, 2].map((column) => (
          <div key={column} style={{position: 'absolute', top: 0, bottom: 0, left: `${column * 33.333 + 16.666}%`, width: 1, background: 'rgba(245,245,242,0.065)'}} />
        ))}
        <div
          style={{
            position: 'absolute',
            left: '2%',
            top: 58,
            width: '28%',
            height: 88,
            borderRadius: 14,
            background: 'rgba(245,245,242,0.055)',
            border: '1px solid rgba(245,245,242,0.08)',
            opacity: 1 - focusIn * 0.58,
            transform: `translateX(${-focusIn * 16}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '3%',
            top: 195,
            width: '28%',
            height: 88,
            borderRadius: 14,
            background: 'rgba(245,245,242,0.055)',
            border: '1px solid rgba(245,245,242,0.08)',
            opacity: 1 - focusIn * 0.58,
            transform: `translateX(${focusIn * 16}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '35.2%',
            top: 105,
            width: `${31.5 * focusIn}%`,
            minWidth: focusIn > 0.02 ? 0 : 0,
            height: 176,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${greenSoft}, rgba(120,185,237,0.10))`,
            border: '1.5px solid rgba(184,243,107,0.72)',
            boxShadow: '0 0 0 8px rgba(184,243,107,0.035), 0 20px 45px rgba(0,0,0,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: focusIn,
            overflow: 'hidden',
          }}
        >
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(184,243,107,0.08), transparent)', transform: `translateX(${interpolate(focusIn, [0, 1], [-280, 280])}px)`}} />
          <div style={{display: 'flex', alignItems: 'center', gap: 12, position: 'relative'}}>
            <div style={{width: 38, height: 38, borderRadius: 12, background: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke={palette.background} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3' />
                <circle cx='12' cy='12' r='3' />
              </svg>
            </div>
            <div style={{fontSize: 24, color: palette.foreground, fontWeight: 700}}>Focus</div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '34.5%',
            top: 95,
            width: '33%',
            height: 196,
            border: `2px solid ${palette.secondary}`,
            borderRadius: 22,
            opacity: shieldIn * 0.72,
            transform: `scale(${interpolate(shieldIn, [0, 1], [0.94, 1])})`,
            boxShadow: `0 0 34px ${blueSoft}`,
          }}
        />
      </div>
    </div>
  );
};

const ProgressView: React.FC<{sceneFrame: number}> = ({sceneFrame}) => {
  const lineIn = spring({frame: Math.max(0, sceneFrame - 7), fps: 30, config: {damping: 22, stiffness: 95, mass: 1}});
  const checksIn = spring({frame: Math.max(0, sceneFrame - 15), fps: 30, config: {damping: 18, stiffness: 135, mass: 0.75}});
  return (
    <div style={{height: '100%', padding: '30px 34px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24}}>
        <div style={{fontSize: 30, color: palette.foreground, fontWeight: 700, letterSpacing: -0.8}}>Progress</div>
        <div style={{width: 44, height: 44, borderRadius: 14, background: greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Glyph type='progress' />
        </div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 24, flex: 1, minHeight: 0}}>
        <div style={{background: panel, border: `1px solid ${frameBorder}`, borderRadius: 20, padding: '24px 26px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden'}}>
          <svg width='100%' height='100%' viewBox='0 0 820 310' preserveAspectRatio='none' style={{display: 'block', overflow: 'visible'}}>
            <defs>
              <linearGradient id='progressFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={palette.accent} stopOpacity='0.22' />
                <stop offset='100%' stopColor={palette.accent} stopOpacity='0' />
              </linearGradient>
              <linearGradient id='progressLine' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor={palette.secondary} />
                <stop offset='100%' stopColor={palette.accent} />
              </linearGradient>
            </defs>
            {[50, 105, 160, 215, 270].map((y) => (
              <line key={y} x1='32' y1={y} x2='790' y2={y} stroke='rgba(245,245,242,0.075)' strokeWidth='1' />
            ))}
            <path d='M32 260 C130 252 150 215 230 220 C320 226 352 153 438 166 C528 180 576 91 654 108 C716 122 748 61 790 48 L790 280 L32 280 Z' fill='url(#progressFill)' opacity={lineIn} />
            <path
              d='M32 260 C130 252 150 215 230 220 C320 226 352 153 438 166 C528 180 576 91 654 108 C716 122 748 61 790 48'
              fill='none'
              stroke='url(#progressLine)'
              strokeWidth='7'
              strokeLinecap='round'
              strokeDasharray='900'
              strokeDashoffset={900 * (1 - lineIn)}
            />
            {[
              [32, 260],
              [230, 220],
              [438, 166],
              [654, 108],
              [790, 48],
            ].map((point, index) => (
              <circle key={index} cx={point[0]} cy={point[1]} r={index === 4 ? 9 : 6} fill={index === 4 ? palette.accent : '#17181D'} stroke={index === 4 ? palette.accent : palette.secondary} strokeWidth='4' opacity={lineIn} />
            ))}
          </svg>
          <div style={{position: 'absolute', left: 28, bottom: 20, display: 'flex', gap: 18, alignItems: 'center'}}>
            <div style={{width: 10, height: 10, borderRadius: 10, background: palette.secondary}} />
            <div style={{width: 10, height: 10, borderRadius: 10, background: palette.accent}} />
          </div>
        </div>
        <div style={{background: panel, border: `1px solid ${frameBorder}`, borderRadius: 20, padding: '24px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 17}}>
          {['Plan', 'Build', 'Review'].map((label, index) => {
            const itemIn = spring({frame: Math.max(0, sceneFrame - 15 - index * 4), fps: 30, config: {damping: 19, stiffness: 140, mass: 0.7}});
            return (
              <div key={label} style={{display: 'flex', alignItems: 'center', gap: 14, opacity: itemIn, transform: `translateX(${interpolate(itemIn, [0, 1], [24, 0])}px)`}}>
                <div style={{width: 42, height: 42, borderRadius: '50%', background: index === 2 ? palette.accent : greenSoft, border: `1px solid ${index === 2 ? palette.accent : 'rgba(184,243,107,0.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke={index === 2 ? palette.background : palette.accent} strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M5 12.5l4 4L19 6.5' />
                  </svg>
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 18, color: palette.foreground, fontWeight: 650, marginBottom: 8}}>{label}</div>
                  <div style={{height: 6, borderRadius: 6, background: 'rgba(245,245,242,0.08)'}}>
                    <div style={{height: 6, width: `${100 - index * 18}%`, borderRadius: 6, background: index === 2 ? palette.accent : palette.secondary}} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FeatureScene: React.FC<{
  frame: number;
  start: number;
  end: number;
  index: string;
  title: string;
  children: React.ReactNode;
}> = ({frame, start, end, index, title, children}) => {
  const sceneOpacity = interpolate(frame, [start, start + 7, end - 7, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleIn = spring({frame: Math.max(0, frame - start), fps: 30, config: {damping: 20, stiffness: 130, mass: 0.8}});
  const appIn = spring({frame: Math.max(0, frame - start - 2), fps: 30, config: {damping: 19, stiffness: 115, mass: 0.9}});
  return (
    <AbsoluteFill style={{opacity: sceneOpacity}}>
      <div style={{position: 'absolute', left: 120, top: 105, display: 'flex', alignItems: 'center', gap: 18, opacity: titleIn, transform: `translateX(${interpolate(titleIn, [0, 1], [-30, 0])}px)`}}>
        <div style={{width: 45, height: 3, borderRadius: 3, background: palette.accent}} />
        <div style={{fontSize: 18, color: palette.muted, fontWeight: 750, letterSpacing: 2.2}}>{index}</div>
      </div>
      <div style={{position: 'absolute', left: 120, top: 145, color: palette.foreground, fontSize: 68, lineHeight: 1, fontWeight: 730, letterSpacing: -2.5, opacity: titleIn, transform: `translateY(${interpolate(titleIn, [0, 1], [22, 0])}px)`}}>
        {title}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 270,
          width: 1700,
          height: 710,
          opacity: appIn,
          transform: `translateY(${interpolate(appIn, [0, 1], [38, 0])}px) scale(${interpolate(appIn, [0, 1], [0.985, 1])})`,
        }}
      >
        <AppFrame>{children}</AppFrame>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{frame: number}> = ({frame}) => {
  const local = frame - 270;
  const opacity = interpolate(local, [0, 10, 360], [0, 1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(local, [0, 16], [38, 0], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ring = spring({frame: local, fps: 30, config: {damping: 18, stiffness: 90, mass: 1}});
  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 620,
          height: 620,
          marginLeft: -310,
          marginTop: -310,
          borderRadius: '50%',
          border: '1px solid rgba(184,243,107,0.28)',
          transform: `scale(${interpolate(ring, [0, 1], [0.72, 1])})`,
          boxShadow: 'inset 0 0 90px rgba(184,243,107,0.035), 0 0 100px rgba(184,243,107,0.04)',
        }}
      />
      <div style={{position: 'absolute', left: 960, top: 194, transform: 'translateX(-50%)'}}>
        <RelayMark size={72} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 200,
          right: 200,
          top: 350,
          textAlign: 'center',
          transform: `translateY(${y}px)`,
          color: palette.foreground,
          fontSize: 94,
          lineHeight: 1.07,
          fontWeight: 720,
          letterSpacing: -4.2,
        }}
      >
        <div>Start your next week</div>
        <div style={{color: palette.accent}}>with Relay</div>
      </div>
      <div style={{position: 'absolute', left: 760, right: 760, bottom: 170, height: 2, background: 'linear-gradient(90deg, transparent, rgba(184,243,107,0.75), transparent)', opacity: interpolate(local, [8, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};

export const BenchmarkVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: palette.background, fontFamily: FONT, color: palette.foreground}}>
      <Background />
      <Sequence from={0} durationInFrames={90} premountFor={30}>
        <Intro frame={frame} />
      </Sequence>
      <Sequence from={90} durationInFrames={60} premountFor={30}>
        <FeatureScene frame={frame} start={90} end={150} index='01' title='Plan together'>
          <PlanView sceneFrame={frame - 90} />
        </FeatureScene>
      </Sequence>
      <Sequence from={150} durationInFrames={60} premountFor={30}>
        <FeatureScene frame={frame} start={150} end={210} index='02' title='Protect focus time'>
          <FocusView sceneFrame={frame - 150} />
        </FeatureScene>
      </Sequence>
      <Sequence from={210} durationInFrames={60} premountFor={30}>
        <FeatureScene frame={frame} start={210} end={270} index='03' title='See progress'>
          <ProgressView sceneFrame={frame - 210} />
        </FeatureScene>
      </Sequence>
      <Sequence from={270} durationInFrames={90} premountFor={30}>
        <Outro frame={frame} />
      </Sequence>
    </AbsoluteFill>
  );
};
