import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame} from 'remotion';
import {palette} from './contract';

const background = palette.background;
const foreground = palette.foreground;
const accent = palette.accent;
const secondary = palette.secondary;
const muted = palette.muted;
const FONT = 'Archivo, sans-serif';
const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

type IconKind = 'plan' | 'focus' | 'progress';

function LogoMark({size = 44}: {size?: number}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: accent,
        color: background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 12px 34px ' + accent + '26',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox='0 0 40 40' fill='none'>
        <path
          d='M8 14H29L23 8M32 26H11L17 32'
          stroke='currentColor'
          strokeWidth='3.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
  );
}

function Icon({kind, size = 20, color = foreground}: {kind: IconKind; size?: number; color?: string}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    style: {color},
  };

  if (kind === 'plan') {
    return (
      <svg {...common}>
        <rect x='3.5' y='4' width='7' height='7' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
        <rect x='13.5' y='4' width='7' height='7' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
        <rect x='3.5' y='14' width='7' height='6' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
        <rect x='13.5' y='14' width='7' height='6' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
      </svg>
    );
  }

  if (kind === 'focus') {
    return (
      <svg {...common}>
        <circle cx='12' cy='12' r='7.5' stroke='currentColor' strokeWidth='1.8' />
        <circle cx='12' cy='12' r='2.5' fill='currentColor' />
        <path d='M12 1.5V5M12 19V22.5M1.5 12H5M19 12H22.5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d='M4 19V14M10 19V9M16 19V12M22 19V4' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' />
    </svg>
  );
}

function Avatar({name, index = 0, size = 30}: {name: string; index?: number; size?: number}) {
  const colors = [accent, secondary, foreground];
  const fills = [accent + '28', secondary + '28', foreground + '16'];
  const color = colors[index % colors.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fills[index % fills.length],
        border: '1px solid ' + color + '70',
        color,
        fontFamily: FONT,
        fontSize: Math.round(size * 0.36),
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}

function Background() {
  return (
    <AbsoluteFill style={{backgroundColor: background, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle at 82% 20%, ' +
            accent +
            '16 0%, ' +
            background +
            '00 38%), radial-gradient(circle at 12% 78%, ' +
            secondary +
            '12 0%, ' +
            background +
            '00 42%)',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.38,
          backgroundImage:
            'linear-gradient(' + foreground + '08 1px, transparent 1px), linear-gradient(90deg, ' + foreground + '08 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </AbsoluteFill>
  );
}

function Intro() {
  const frame = useCurrentFrame();
  const enter = spring({frame, fps: 30, config: {damping: 17, stiffness: 72, mass: 1.05}});
  const exit = interpolate(frame, [76, 90], [1, 0], clamp);
  const titleY = interpolate(frame, [0, 28], [58, 0], clamp);
  const float = interpolate(frame, [0, 42], [18, -16], clamp);
  const focusScale = spring({frame: Math.max(0, frame - 8), fps: 30, config: {damping: 15, stiffness: 90}});

  return (
    <AbsoluteFill style={{fontFamily: FONT, opacity: enter * exit}}>
      <div style={{position: 'absolute', left: 100, top: 82, display: 'flex', alignItems: 'center', gap: 18}}>
        <LogoMark size={46} />
        <span style={{fontSize: 25, fontWeight: 800, color: foreground, letterSpacing: '-0.03em'}}>Relay</span>
      </div>

      <div style={{position: 'absolute', left: 100, top: 286, width: 1040, transform: 'translateY(' + titleY + 'px)'}}>
        <div style={{width: 78, height: 6, borderRadius: 3, backgroundColor: accent, marginBottom: 30}} />
        <h1
          style={{
            margin: 0,
            color: foreground,
            fontSize: 190,
            lineHeight: 0.9,
            letterSpacing: '-0.075em',
            fontWeight: 800,
          }}
        >
          Relay
        </h1>
        <p
          style={{
            margin: '34px 0 0',
            color: foreground,
            fontSize: 64,
            lineHeight: 1.02,
            letterSpacing: '-0.045em',
            fontWeight: 600,
          }}
        >
          Make room for
          <br />
          focused work
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 130,
          top: 185,
          width: 570,
          height: 700,
          borderRadius: 36,
          border: '1px solid ' + foreground + '1F',
          backgroundColor: foreground + '05',
          transform: 'translateY(' + float + 'px)',
          overflow: 'hidden',
        }}
      >
        <div style={{position: 'absolute', width: 420, height: 420, borderRadius: '50%', border: '1px solid ' + foreground + '16', right: -80, top: 80}} />
        <div style={{position: 'absolute', width: 270, height: 270, borderRadius: '50%', border: '1px solid ' + secondary + '45', right: -5, top: 155}} />
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 116,
            width: 280,
            height: 116,
            borderRadius: 20,
            backgroundColor: foreground + '0A',
            border: '1px solid ' + foreground + '18',
            transform: 'translateY(' + -22 * focusScale + 'px) rotate(-5deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 116,
            top: 278,
            width: 350,
            height: 138,
            borderRadius: 22,
            backgroundColor: secondary + '12',
            border: '1px solid ' + secondary + '45',
            transform: 'translateY(' + 28 * (1 - focusScale) + 'px) rotate(4deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 68,
            top: 446,
            width: 328,
            height: 154,
            borderRadius: 24,
            backgroundColor: accent,
            boxShadow: '0 30px 80px ' + accent + '28',
            transform: 'scale(' + (0.94 + 0.06 * focusScale) + ')',
          }}
        >
          <div style={{position: 'absolute', left: 30, top: 30, width: 42, height: 42, borderRadius: 12, backgroundColor: background + '18'}} />
          <div style={{position: 'absolute', left: 30, top: 91, width: 190, height: 9, borderRadius: 5, backgroundColor: background + '42'}} />
          <div style={{position: 'absolute', left: 30, top: 114, width: 118, height: 7, borderRadius: 4, backgroundColor: background + '24'}} />
        </div>
        <div style={{position: 'absolute', left: 70, bottom: 46, width: 140, height: 5, borderRadius: 3, backgroundColor: foreground + '20'}} />
        <div style={{position: 'absolute', left: 70, bottom: 46, width: 48, height: 5, borderRadius: 3, backgroundColor: accent}} />
      </div>
    </AbsoluteFill>
  );
}

function FeatureLabel({index, title, icon, opacity, frame}: {index: number; title: string; icon: IconKind; opacity: number; frame: number}) {
  const y = interpolate(frame, [0, 12], [26, 0], clamp);

  return (
    <div style={{position: 'absolute', left: 100, top: 326, width: 410, opacity, transform: 'translateY(' + y + 'px)'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30}}>
        <span style={{color: muted, fontSize: 15, fontWeight: 800, letterSpacing: '0.12em'}}>0{index}</span>
        <div style={{width: 74, height: 2, backgroundColor: accent}} />
      </div>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 17,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          backgroundColor: accent + '16',
          border: '1px solid ' + accent + '48',
          marginBottom: 24,
        }}
      >
        <Icon kind={icon} size={27} color={accent} />
      </div>
      <h2 style={{margin: 0, color: foreground, fontSize: 66, lineHeight: 0.98, letterSpacing: '-0.055em', fontWeight: 750}}>{title}</h2>
    </div>
  );
}

function TaskCard({title, tag, color, left, top, frame, index, avatar}: {title: string; tag: string; color: string; left: number; top: number; frame: number; index: number; avatar: string}) {
  const appear = spring({frame: Math.max(0, frame - 5 - index * 2), fps: 30, config: {damping: 16, stiffness: 110, mass: 0.8}});

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 286,
        height: 100,
        borderRadius: 16,
        padding: '16px 17px',
        backgroundColor: foreground + '08',
        border: '1px solid ' + foreground + '16',
        opacity: appear,
        transform: 'translateY(' + 24 * (1 - appear) + 'px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color, textTransform: 'uppercase'}}>{tag}</span>
        <span style={{color: muted, fontSize: 18}}>•••</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14}}>
        <span style={{fontSize: 17, fontWeight: 650, color: foreground}}>{title}</span>
        <Avatar name={avatar} index={index} size={27} />
      </div>
    </div>
  );
}

function PlanView({opacity, frame}: {opacity: number; frame: number}) {
  const y = interpolate(frame, [0, 10], [16, 0], clamp);
  const columns = [
    {name: 'Now', left: 34, count: 3},
    {name: 'Next', left: 354, count: 2},
    {name: 'Later', left: 674, count: 1},
  ];

  return (
    <div style={{position: 'absolute', left: 225, top: 78, width: 1035, height: 662, opacity, transform: 'translateY(' + y + 'px)'}}>
      <div style={{position: 'absolute', left: 34, top: 30}}>
        <div style={{fontSize: 28, fontWeight: 750, color: foreground, letterSpacing: '-0.035em'}}>Weekly plan</div>
        <div style={{fontSize: 14, color: muted, marginTop: 8}}>Relay workspace</div>
      </div>
      <div style={{position: 'absolute', right: 38, top: 34, width: 132, height: 38, borderRadius: 12, backgroundColor: foreground + '08', border: '1px solid ' + foreground + '16', display: 'flex', alignItems: 'center', padding: '0 13px', gap: 9}}>
        <div style={{width: 7, height: 7, borderRadius: '50%', backgroundColor: accent}} />
        <span style={{fontSize: 13, color: muted}}>This week</span>
      </div>

      {columns.map((column) => (
        <div key={column.name} style={{position: 'absolute', left: column.left, top: 101, width: 286, height: 510, borderRadius: 18, backgroundColor: foreground + '035', border: '1px solid ' + foreground + '10'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '17px 17px 0'}}>
            <span style={{fontSize: 14, fontWeight: 750, color: foreground}}>{column.name}</span>
            <span style={{fontSize: 12, color: muted}}>{column.count}</span>
          </div>
        </div>
      ))}

      <TaskCard title='Draft brief' tag='Ready' color={accent} left={34} top={157} frame={frame} index={0} avatar='Ava' />
      <TaskCard title='Review flow' tag='Review' color={secondary} left={34} top={271} frame={frame} index={1} avatar='Noah' />
      <TaskCard title='Map tasks' tag='Ready' color={accent} left={354} top={157} frame={frame} index={2} avatar='Mia' />
      <TaskCard title='Share notes' tag='Next' color={secondary} left={354} top={271} frame={frame} index={3} avatar='Ava' />
      <TaskCard title='Plan ahead' tag='Later' color={muted} left={674} top={157} frame={frame} index={4} avatar='Noah' />
    </div>
  );
}

function FocusView({opacity, frame}: {opacity: number; frame: number}) {
  const y = interpolate(frame, [0, 10], [16, 0], clamp);
  const rows = [
    {name: 'Ava', title: 'Deep work', time: '09:00 — 11:00', left: 128, width: 410, color: accent, delay: 0},
    {name: 'Noah', title: 'Review', time: '11:30 — 12:30', left: 420, width: 300, color: secondary, delay: 2},
    {name: 'Mia', title: 'Quiet block', time: '14:00 — 15:00', left: 610, width: 250, color: muted, delay: 4},
  ];

  return (
    <div style={{position: 'absolute', left: 225, top: 78, width: 1035, height: 662, opacity, transform: 'translateY(' + y + 'px)'}}>
      <div style={{position: 'absolute', left: 34, top: 30}}>
        <div style={{fontSize: 28, fontWeight: 750, color: foreground, letterSpacing: '-0.035em'}}>Focus blocks</div>
        <div style={{fontSize: 14, color: muted, marginTop: 8}}>Weekly schedule</div>
      </div>
      <div style={{position: 'absolute', left: 34, top: 105, width: 967, height: 470, borderRadius: 22, backgroundColor: foreground + '035', border: '1px solid ' + foreground + '12'}}>
        <div style={{position: 'absolute', left: 128, right: 34, top: 45, height: 1, backgroundColor: foreground + '18'}} />
        {['09:00', '11:00', '13:00', '15:00'].map((time, index) => (
          <div key={time} style={{position: 'absolute', left: 128 + index * 210, top: 24, fontSize: 12, color: muted}}>{time}</div>
        ))}
        {rows.map((row, index) => {
          const blockWidth = interpolate(frame, [5 + row.delay, 22 + row.delay], [0, row.width], clamp);
          return (
            <div key={row.name} style={{position: 'absolute', left: 0, right: 0, top: 92 + index * 118}}>
              <div style={{position: 'absolute', left: 30, top: 26, color: foreground, fontSize: 15, fontWeight: 700}}>{row.name}</div>
              <div style={{position: 'absolute', left: 128, right: 34, top: 24, height: 64, borderRadius: 15, backgroundColor: foreground + '04', border: '1px solid ' + foreground + '0D'}} />
              <div
                style={{
                  position: 'absolute',
                  left: row.left,
                  top: 27,
                  width: blockWidth,
                  height: 58,
                  borderRadius: 13,
                  backgroundColor: row.color + '20',
                  border: '1px solid ' + row.color + '70',
                  boxSizing: 'border-box',
                  padding: '9px 13px',
                  overflow: 'hidden',
                }}
              >
                <div style={{fontSize: 14, fontWeight: 700, color: foreground, whiteSpace: 'nowrap'}}>{row.title}</div>
                <div style={{fontSize: 11, color: row.color, marginTop: 4, whiteSpace: 'nowrap'}}>{row.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressView({opacity, frame}: {opacity: number; frame: number}) {
  const y = interpolate(frame, [0, 10], [16, 0], clamp);
  const rows = [
    {title: 'Research', status: 'Complete', target: 1, color: accent, delay: 0, complete: true},
    {title: 'Design', status: 'In progress', target: 0.68, color: secondary, delay: 3, complete: false},
    {title: 'Launch', status: 'Upcoming', target: 0.3, color: muted, delay: 6, complete: false},
  ];

  return (
    <div style={{position: 'absolute', left: 225, top: 78, width: 1035, height: 662, opacity, transform: 'translateY(' + y + 'px)'}}>
      <div style={{position: 'absolute', left: 34, top: 30}}>
        <div style={{fontSize: 28, fontWeight: 750, color: foreground, letterSpacing: '-0.035em'}}>Milestones</div>
        <div style={{fontSize: 14, color: muted, marginTop: 8}}>Project progress</div>
      </div>
      <div style={{position: 'absolute', right: 38, top: 31, width: 42, height: 42, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '16', border: '1px solid ' + accent + '50', color: accent}}>
        <Icon kind='progress' size={21} color={accent} />
      </div>
      <div style={{position: 'absolute', left: 34, top: 120, width: 967, height: 430, borderRadius: 22, backgroundColor: foreground + '035', border: '1px solid ' + foreground + '12'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 102, height: 1, backgroundColor: foreground + '0D'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 220, height: 1, backgroundColor: foreground + '0D'}} />
        {rows.map((row, index) => {
          const width = interpolate(frame, [5 + row.delay, 25 + row.delay], [0, row.target * 570], clamp);
          return (
            <div key={row.title} style={{position: 'absolute', left: 0, top: index * 118, width: 967, height: 102}}>
              <div style={{position: 'absolute', left: 34, top: 23, width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: row.color + '18', border: '1px solid ' + row.color + '55'}}>
                {row.complete ? (
                  <svg width='19' height='19' viewBox='0 0 20 20' fill='none'>
                    <path d='M5 10.5L8.3 14L15 6.5' stroke={row.color} strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                ) : (
                  <div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: row.color}} />
                )}
              </div>
              <div style={{position: 'absolute', left: 94, top: 29, width: 150, color: foreground, fontSize: 17, fontWeight: 700}}>{row.title}</div>
              <div style={{position: 'absolute', left: 250, top: 32, width: 570, height: 8, borderRadius: 4, backgroundColor: foreground + '0D'}}>
                <div style={{width, height: '100%', borderRadius: 4, backgroundColor: row.color}} />
              </div>
              <div style={{position: 'absolute', right: 32, top: 29, color: row.color, fontSize: 13, fontWeight: 750}}>{row.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppShell({frame}: {frame: number}) {
  const navTop = frame < 60 ? 88 : frame < 120 ? 154 : 220;
  const planActive = frame < 60;
  const focusActive = frame >= 60 && frame < 120;
  const progressActive = frame >= 120;
  const items = [
    {kind: 'plan' as IconKind, label: 'Plan', active: planActive},
    {kind: 'focus' as IconKind, label: 'Focus', active: focusActive},
    {kind: 'progress' as IconKind, label: 'Progress', active: progressActive},
  ];

  return (
    <div style={{position: 'absolute', inset: 0, backgroundColor: foreground + '055', border: '1px solid ' + foreground + '20', borderRadius: 28, overflow: 'hidden', boxShadow: '0 36px 110px rgba(16,17,20,0.46)'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 78, display: 'flex', alignItems: 'center', padding: '0 26px', borderBottom: '1px solid ' + foreground + '14', zIndex: 4, backgroundColor: background + '40'}}>
        <LogoMark size={34} />
        <span style={{marginLeft: 13, color: foreground, fontSize: 17, fontWeight: 800, letterSpacing: '-0.025em'}}>Relay</span>
        <div style={{width: 1, height: 22, backgroundColor: foreground + '1C', margin: '0 20px'}} />
        <span style={{color: muted, fontSize: 14}}>My workspace</span>
        <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9}}>
          <Avatar name='Ava' index={0} size={31} />
          <Avatar name='Noah' index={1} size={31} />
          <Avatar name='Mia' index={2} size={31} />
          <div style={{width: 32, height: 32, borderRadius: '50%', border: '1px dashed ' + foreground + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 20, marginLeft: 2}}>+</div>
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, top: 78, bottom: 0, width: 225, borderRight: '1px solid ' + foreground + '14', zIndex: 4, backgroundColor: background + '28'}}>
        <div style={{position: 'absolute', left: 25, top: 30, color: muted, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em'}}>WORKSPACE</div>
        <div style={{position: 'absolute', left: 18, top: navTop, width: 4, height: 42, borderRadius: 3, backgroundColor: accent}} />
        {items.map((item, index) => (
          <div key={item.label} style={{position: 'absolute', left: 18, top: 88 + index * 66, width: 189, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '0 13px', backgroundColor: item.active ? accent + '12' : 'transparent', color: item.active ? accent : muted, opacity: item.active ? 1 : 0.56}}>
            <Icon kind={item.kind} size={19} color={item.active ? accent : muted} />
            <span style={{fontSize: 14, fontWeight: item.active ? 750 : 600}}>{item.label}</span>
          </div>
        ))}
        <div style={{position: 'absolute', left: 24, bottom: 28, display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: accent}} />
          <span style={{fontSize: 12, color: muted}}>Relay workspace</span>
        </div>
      </div>

      <div style={{position: 'absolute', left: 225, top: 78, right: 0, bottom: 0, backgroundColor: background + '26'}} />
    </div>
  );
}

function ProductStage() {
  const frame = useCurrentFrame();
  const shellIn = spring({frame, fps: 30, config: {damping: 17, stiffness: 78, mass: 1}});
  const stageOpacity = interpolate(frame, [0, 12], [0, 1], clamp) * interpolate(frame, [168, 180], [1, 0], clamp);
  const shellY = interpolate(shellIn, [0, 1], [58, 0], clamp);
  const planOpacity = interpolate(frame, [0, 8], [0, 1], clamp) * interpolate(frame, [52, 60], [1, 0], clamp);
  const focusOpacity = interpolate(frame, [58, 68], [0, 1], clamp) * interpolate(frame, [112, 120], [1, 0], clamp);
  const progressOpacity = interpolate(frame, [118, 128], [0, 1], clamp) * interpolate(frame, [174, 180], [1, 0], clamp);

  return (
    <AbsoluteFill style={{fontFamily: FONT, opacity: stageOpacity}}>
      <FeatureLabel index={1} title='Plan together' icon='plan' opacity={planOpacity} frame={frame} />
      <FeatureLabel index={2} title='Protect focus time' icon='focus' opacity={focusOpacity} frame={Math.max(0, frame - 60)} />
      <FeatureLabel index={3} title='See progress' icon='progress' opacity={progressOpacity} frame={Math.max(0, frame - 120)} />

      <div style={{position: 'absolute', left: 560, top: 160, width: 1260, height: 760, transform: 'translateY(' + shellY + 'px)'}}>
        <AppShell frame={frame} />
        <PlanView opacity={planOpacity} frame={frame} />
        <FocusView opacity={focusOpacity} frame={Math.max(0, frame - 60)} />
        <ProgressView opacity={progressOpacity} frame={Math.max(0, frame - 120)} />
      </div>
    </AbsoluteFill>
  );
}

function WeekStrip({frame}: {frame: number}) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const panelOpacity = interpolate(frame, [10, 28], [0, 1], clamp);

  return (
    <div style={{position: 'absolute', left: 280, top: 700, width: 1360, height: 146, borderRadius: 25, border: '1px solid ' + foreground + '1B', backgroundColor: foreground + '05', opacity: panelOpacity, display: 'flex', overflow: 'hidden'}}>
      {days.map((day, index) => {
        const appear = spring({frame: Math.max(0, frame - 12 - index * 2), fps: 30, config: {damping: 15, stiffness: 120}});
        return (
          <div key={day} style={{width: '14.2857%', height: '100%', borderRight: index < days.length - 1 ? '1px solid ' + foreground + '10' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, transform: 'translateY(' + 18 * (1 - appear) + 'px)', opacity: appear}}>
            <span style={{fontSize: 12, fontWeight: 750, letterSpacing: '0.13em', color: muted}}>{day}</span>
            <div style={{width: 34, height: 34, borderRadius: 11, backgroundColor: index === 4 ? accent : foreground + '08', border: index === 4 ? 'none' : '1px solid ' + foreground + '18'}} />
          </div>
        );
      })}
    </div>
  );
}

function FinalStage() {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 14], [0, 1], clamp);
  const headlineY = interpolate(frame, [0, 24], [46, 0], clamp);
  const underline = interpolate(frame, [8, 26], [0, 340], clamp);
  const brandOpacity = interpolate(frame, [0, 10], [0, 1], clamp);

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 100, top: 78, display: 'flex', alignItems: 'center', gap: 16, opacity: brandOpacity}}>
        <LogoMark size={42} />
        <span style={{fontSize: 23, color: foreground, fontWeight: 800, letterSpacing: '-0.03em'}}>Relay</span>
      </div>

      <div style={{position: 'absolute', left: 120, right: 120, top: 292, textAlign: 'center', opacity: reveal, transform: 'translateY(' + headlineY + 'px)'}}>
        <h2 style={{margin: 0, color: foreground, fontSize: 110, lineHeight: 0.99, letterSpacing: '-0.065em', fontWeight: 750}}>
          Start your next week
          <br />
          <span style={{color: accent}}>with Relay</span>
        </h2>
        <div style={{width: underline, height: 7, borderRadius: 4, backgroundColor: accent, margin: '40px auto 0'}} />
      </div>

      <WeekStrip frame={frame} />
      <div style={{position: 'absolute', left: 140, right: 140, bottom: 78, height: 1, backgroundColor: foreground + '12'}} />
    </AbsoluteFill>
  );
}

export const BenchmarkVideo = () => {
  return (
    <AbsoluteFill style={{fontFamily: FONT, backgroundColor: background, color: foreground, overflow: 'hidden'}}>
      <Background />
      <Sequence from={0} durationInFrames={90}>
        <Intro />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <ProductStage />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <FinalStage />
      </Sequence>
      <AbsoluteFill style={{boxShadow: 'inset 0 0 180px ' + background + '52', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};