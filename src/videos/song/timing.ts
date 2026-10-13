// The timing plan the music stage composes to. It is derived from the score alone.
import {beatPlan} from '../beat/plan.ts';
import {FPS, METER, beatFrame, bpmOf, durationInFrames, durationSeconds, sceneStartBeat, totalBars, type BeatScore} from '../beat/score.ts';

const at = (s: BeatScore, beat: number) => ({beat, step: beat * 4, frame: beatFrame(s, beat), seconds: Math.round(beatFrame(s, beat) / FPS * 1000) / 1000});

export function timingPlan(s: BeatScore, only?: number) {
  const counts = s.list ? Array.from({length: s.list.max - s.list.min + 1}, (_, k) => s.list!.min + k).filter((n) => only === undefined || n === only) : [];
  return {
    bpm: bpmOf(s), beatFrames: s.beatFrames, fps: FPS, meter: `${METER}/4`, bars: totalBars(s), steps: totalBars(s) * 16,
    frames: durationInFrames(s), seconds: durationSeconds(s), stepSeconds: s.beatFrames / FPS / 4,
    scenes: s.scenes.map((sc, i) => ({index: i, type: sc.type, energy: sc.energy, fromBar: sceneStartBeat(s, i) / METER, toBar: sceneStartBeat(s, i + 1) / METER,
      focus: at(s, sc.focusBeat), roles: sc.roles})),
    cues: s.cues.map((c) => ({id: c.id, kind: c.sound, role: c.role, velocity: c.velocity ?? 0.8, ...at(s, c.beat)})),
    risers: s.risers.map((r) => ({from: at(s, r.beat), to: at(s, r.beat + r.beats)})),
    list: s.list ? {
      scene: s.list.scene, min: s.list.min, max: s.list.max, kind: s.list.voice,
      accents: Object.fromEntries(counts.map((n) => [n, beatPlan(s, n).items.map((it) => ({index: it.index, ...at(s, it.accent)}))])),
    } : null,
  };
}
