import {useEffect, useRef, useState, type PointerEvent, type RefObject} from 'react';
import {SCENE_TYPES, type Role, type TemplateMeta} from '../videos/vocab';
import type {VideoPlayerRef} from './VideoPlayer';

// Scene strip under the player: shows where each scene sits, follows playback, and scrubs continuously.
export function Timeline({meta, player, focusRole, disabled = false}: {meta: TemplateMeta; player: RefObject<VideoPlayerRef | null>; focusRole: Role | null; disabled?: boolean}) {
  const [frame, setFrame] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const resume = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
    p.addEventListener('frameupdate', on);
    p.addEventListener('seeked', on);
    return () => {
      p.removeEventListener('frameupdate', on);
      p.removeEventListener('seeked', on);
    };
  }, [player]);

  const total = meta.durationInFrames;
  const scenes = meta.scenes.filter((s) => s.type !== 'transition');
  const seekAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const next = Math.min(total - 1, Math.round(ratio * (total - 1)));
    setFrame(next);
    player.current?.seekTo(next);
  };
  const finish = () => {
    if (!active.current) return;
    active.current = false;
    setScrubbing(false);
    if (resume.current) player.current?.play();
  };
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    finish();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <div className={`timeline ${scrubbing ? 'scrubbing' : ''} ${disabled ? 'disabled' : ''}`}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        // Keep focus on the editor so Space continues to control playback.
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        resume.current = !!player.current?.isPlaying();
        player.current?.pause();
        active.current = true;
        setScrubbing(true);
        seekAt(event);
      }}
      onPointerMove={(event) => { if (active.current) seekAt(event); }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={finish}>
      {scenes.map((s, i) => {
        const end = i < scenes.length - 1 ? scenes[i + 1].from : total;
        const current = frame >= s.from && frame < end;
        const linked = focusRole !== null && s.roles.includes(focusRole);
        return (
          <button
            key={i}
            disabled={disabled}
            aria-label={`${SCENE_TYPES[s.type]} scene`}
            className={`scene ${current ? 'current' : ''} ${linked ? 'linked' : ''}`}
            style={{left: `${(s.from / total) * 100}%`, width: `${((end - s.from) / total) * 100}%`}}
            title={`${SCENE_TYPES[s.type]} · ${(s.from / meta.fps).toFixed(1)}s`}
            onClick={(event) => {
              // Pointer input scrubs on the strip; keyboard activation jumps to the scene.
              if (event.detail !== 0) return;
              player.current?.seekTo(s.from + s.focus);
              player.current?.pause();
            }}
          >
            <span>{SCENE_TYPES[s.type]}</span>
          </button>
        );
      })}
      <div className="playhead" style={{left: `${(frame / Math.max(1, total - 1)) * 100}%`}} />
    </div>
  );
}
