// The beat contract: one timing score per template drives the picture, and the music lands on the same plan.
// Plain data and timing math with no runtime imports, so Remotion, HyperFrames, the editor,
// the export server, and source packages all share it. Wording never changes any time here;
// only the list item count chooses one of the authored list schedules.
import type {Role, SceneDef, SceneType} from '../vocab.ts';

export const SAMPLE_RATE = 48000;
export const FPS = 30;
/** Frames per beat. Whole frames keep every beat on a frame: 16 = 112.5 BPM, 15 = 120, 14 = 128.6, 13 = 138.5. */
export const BEAT_FRAMES = [13, 14, 15, 16] as const;
export type BeatFrames = (typeof BEAT_FRAMES)[number];
export const METER = 4;

export const GENRES = ['deep-house', 'house', 'tech-house', 'techno', 'minimal', 'electro', 'garage', 'breaks', 'disco', 'progressive'] as const;
export type Genre = (typeof GENRES)[number];
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const;
export type ScaleName = keyof typeof SCALES;
/** One-shot sounds for fixed visual landings. */
export const HITS = ['impact', 'stamp', 'snap', 'zap', 'crash', 'stab', 'tom', 'clap', 'flap'] as const;
export type Hit = (typeof HITS)[number];
/** Pitched voices for text and list landings. */
export const VOICES = ['bell', 'pluck', 'marimba', 'blip', 'keys', 'lead', 'chord'] as const;
export type Voice = (typeof VOICES)[number];

export type SoundDesign = {
  genre: Genre;
  /** Seed for small, fixed variations (velocities, acid lines, percussion). Set from the template id. */
  seed: number;
  /** MIDI note of the bass root, 33 (A1) to 45 (A2). Sets the key. */
  root: number;
  scale: ScaleName;
  /** Scale degree (0-6) of the chord in each bar, repeated when shorter than the bar count. */
  progression: number[];
  /** Delay of every second sixteenth, as a share of a sixteenth (0-0.33). */
  swing: number;
  /** Body pitch in Hz (40-62), click amount (0-1), and length (0-1). */
  kick: {pattern: 'four' | 'broken' | 'garage' | 'breaks'; pitch: number; punch: number; decay: number};
  hats: {pattern: 'offbeat' | 'eighths' | 'sixteenths' | 'shuffle' | 'sparse'; open: number; tone: number};
  snare: {kind: 'clap' | 'snare' | 'rim' | 'none'; pattern: 'backbeat' | 'halftime' | 'garage'};
  bass: {pattern: 'offbeat' | 'rolling' | 'sub' | 'acid' | 'octave' | 'syncopated'; cutoff: number; resonance: number; drive: number};
  chords: {voice: 'stab' | 'organ' | 'pad' | 'pluck' | 'keys' | 'none'; rhythm: 'offbeat' | 'held' | 'skank' | 'syncopated' | 'pulse'; brightness: number};
  perc: 'none' | 'shaker' | 'conga' | 'cowbell' | 'tom';
  /** Reverb and delay send, 0-1. */
  space: number;
  /** Sidechain depth on bass and chords, 0-1. */
  pump: number;
};

export type SceneScore = {
  type: SceneType;
  /** Whole bars. */
  bars: number;
  /** Beat within the scene where its content is fully on screen. */
  focusBeat: number;
  roles: Role[];
  /** 0: chords and air only, 1: kick and hats, 2: bass and snare, 3: everything. */
  energy: 0 | 1 | 2 | 3;
};

/** A fixed landing: one visual event and its sound on the same beat. */
export type Cue = {
  /** Name the composition reads, for example "stamp" or "headline". */
  id: string;
  /** Absolute beat on the eighth-note grid. */
  beat: number;
  sound: Hit | Voice;
  role?: Role;
  /** Scale degree for voices, 0-13. Defaults to a chord tone of the bar. */
  note?: number;
  /** 0.2-1. */
  velocity?: number;
};

export type ListScore = {
  /** Always the packed `list` text role: one item per line. */
  role: 'list';
  label?: string;
  scene: number;
  min: number;
  /** Capacity: the item count of the preset list. */
  max: number;
  itemMax: number;
  /** Optional item format. `chart` items read "Label 42". */
  format?: 'chart';
  /** Absolute start beats of each item, one schedule per count from 1 to max (keys "1", "2", ...). */
  schedules: Record<string, number[]>;
  /** Beats from an item's start to its accent, for example the settle of a split-flap row. */
  accentOffset: number;
  voice: Voice | Hit;
};

export type BeatScore = {
  beatFrames: BeatFrames;
  scenes: SceneScore[];
  cues: Cue[];
  list?: ListScore;
  /** Noise risers in absolute beats. */
  risers: {beat: number; beats: number}[];
  /** Legacy synth design, used only by the reference synth in synth.ts. Music now comes from the template's song. */
  sound?: SoundDesign;
};

export const bpmOf = (s: BeatScore) => (60 * FPS) / s.beatFrames;
export const beatSeconds = (s: BeatScore) => s.beatFrames / FPS;
export const totalBars = (s: BeatScore) => s.scenes.reduce((n, scene) => n + scene.bars, 0);
export const totalBeats = (s: BeatScore) => totalBars(s) * METER;
export const durationInFrames = (s: BeatScore) => totalBeats(s) * s.beatFrames;
export const durationSeconds = (s: BeatScore) => durationInFrames(s) / FPS;
export const durationInSamples = (s: BeatScore) => Math.round(durationSeconds(s) * SAMPLE_RATE);
export const beatFrame = (s: BeatScore, beat: number) => Math.round(beat * s.beatFrames);
export const sceneStartBeat = (s: BeatScore, index: number) => s.scenes.slice(0, index).reduce((n, scene) => n + scene.bars * METER, 0);
export const scoreRoles = (s: BeatScore): Role[] => [...new Set([...s.scenes.flatMap((scene) => scene.roles), ...(s.list ? ['list' as Role] : [])])];

/** Scene metadata for TemplateMeta, derived from bars so timing always matches the score. */
export function scoreScenes(s: BeatScore): SceneDef[] {
  return s.scenes.map((scene, i) => {
    const from = beatFrame(s, sceneStartBeat(s, i));
    const end = beatFrame(s, sceneStartBeat(s, i + 1));
    return {type: scene.type, from, duration: end - from, focus: beatFrame(s, scene.focusBeat), roles: scene.roles};
  });
}
