// Genre defaults for sound design. Opus picks a genre per template, then adjusts these values so
// the template's own picture sets its sound: tempo, key, groove, and timbre. Plain data.
import type {Genre, SoundDesign} from './score.ts';

type Defaults = Omit<SoundDesign, 'genre' | 'seed' | 'root' | 'scale' | 'progression'> & {beatFrames: number[]; scales: SoundDesign['scale'][]};

export const GENRE_DEFAULTS: Record<Genre, Defaults> = {
  'deep-house': {beatFrames: [15, 16], scales: ['minor', 'dorian'], swing: 0.12, kick: {pattern: 'four', pitch: 48, punch: 0.4, decay: 0.6},
    hats: {pattern: 'offbeat', open: 0.5, tone: 0.3}, snare: {kind: 'clap', pattern: 'backbeat'}, bass: {pattern: 'syncopated', cutoff: 0.3, resonance: 0.2, drive: 0.2},
    chords: {voice: 'keys', rhythm: 'syncopated', brightness: 0.35}, perc: 'shaker', space: 0.55, pump: 0.45},
  house: {beatFrames: [15], scales: ['minor', 'dorian', 'major'], swing: 0.08, kick: {pattern: 'four', pitch: 52, punch: 0.6, decay: 0.5},
    hats: {pattern: 'offbeat', open: 0.7, tone: 0.5}, snare: {kind: 'clap', pattern: 'backbeat'}, bass: {pattern: 'octave', cutoff: 0.45, resonance: 0.3, drive: 0.3},
    chords: {voice: 'organ', rhythm: 'offbeat', brightness: 0.55}, perc: 'conga', space: 0.4, pump: 0.55},
  'tech-house': {beatFrames: [14, 15], scales: ['minor', 'phrygian'], swing: 0.06, kick: {pattern: 'four', pitch: 50, punch: 0.7, decay: 0.45},
    hats: {pattern: 'eighths', open: 0.4, tone: 0.6}, snare: {kind: 'clap', pattern: 'backbeat'}, bass: {pattern: 'rolling', cutoff: 0.35, resonance: 0.4, drive: 0.45},
    chords: {voice: 'stab', rhythm: 'syncopated', brightness: 0.45}, perc: 'cowbell', space: 0.3, pump: 0.5},
  techno: {beatFrames: [13, 14], scales: ['minor', 'phrygian'], swing: 0, kick: {pattern: 'four', pitch: 46, punch: 0.8, decay: 0.65},
    hats: {pattern: 'sixteenths', open: 0.6, tone: 0.7}, snare: {kind: 'rim', pattern: 'backbeat'}, bass: {pattern: 'rolling', cutoff: 0.25, resonance: 0.5, drive: 0.6},
    chords: {voice: 'stab', rhythm: 'pulse', brightness: 0.3}, perc: 'tom', space: 0.5, pump: 0.35},
  minimal: {beatFrames: [14, 15], scales: ['minor', 'dorian'], swing: 0.1, kick: {pattern: 'four', pitch: 54, punch: 0.5, decay: 0.35},
    hats: {pattern: 'sparse', open: 0.3, tone: 0.8}, snare: {kind: 'rim', pattern: 'garage'}, bass: {pattern: 'sub', cutoff: 0.2, resonance: 0.2, drive: 0.15},
    chords: {voice: 'pluck', rhythm: 'syncopated', brightness: 0.5}, perc: 'shaker', space: 0.6, pump: 0.3},
  electro: {beatFrames: [14, 15, 16], scales: ['minor', 'phrygian'], swing: 0, kick: {pattern: 'broken', pitch: 50, punch: 0.8, decay: 0.55},
    hats: {pattern: 'eighths', open: 0.2, tone: 0.75}, snare: {kind: 'snare', pattern: 'backbeat'}, bass: {pattern: 'acid', cutoff: 0.35, resonance: 0.75, drive: 0.5},
    chords: {voice: 'stab', rhythm: 'skank', brightness: 0.6}, perc: 'cowbell', space: 0.35, pump: 0.25},
  garage: {beatFrames: [14], scales: ['minor', 'dorian'], swing: 0.3, kick: {pattern: 'garage', pitch: 52, punch: 0.6, decay: 0.5},
    hats: {pattern: 'shuffle', open: 0.4, tone: 0.55}, snare: {kind: 'snare', pattern: 'garage'}, bass: {pattern: 'sub', cutoff: 0.3, resonance: 0.3, drive: 0.35},
    chords: {voice: 'organ', rhythm: 'skank', brightness: 0.5}, perc: 'shaker', space: 0.45, pump: 0.4},
  breaks: {beatFrames: [13, 14], scales: ['minor', 'mixolydian'], swing: 0.05, kick: {pattern: 'breaks', pitch: 54, punch: 0.75, decay: 0.45},
    hats: {pattern: 'eighths', open: 0.5, tone: 0.65}, snare: {kind: 'snare', pattern: 'backbeat'}, bass: {pattern: 'syncopated', cutoff: 0.45, resonance: 0.4, drive: 0.55},
    chords: {voice: 'stab', rhythm: 'syncopated', brightness: 0.55}, perc: 'conga', space: 0.4, pump: 0.3},
  disco: {beatFrames: [15, 16], scales: ['major', 'mixolydian', 'dorian'], swing: 0.04, kick: {pattern: 'four', pitch: 56, punch: 0.5, decay: 0.45},
    hats: {pattern: 'offbeat', open: 0.9, tone: 0.5}, snare: {kind: 'clap', pattern: 'backbeat'}, bass: {pattern: 'octave', cutoff: 0.55, resonance: 0.3, drive: 0.25},
    chords: {voice: 'keys', rhythm: 'skank', brightness: 0.65}, perc: 'conga', space: 0.45, pump: 0.35},
  progressive: {beatFrames: [15, 16], scales: ['minor', 'major'], swing: 0, kick: {pattern: 'four', pitch: 48, punch: 0.5, decay: 0.6},
    hats: {pattern: 'offbeat', open: 0.5, tone: 0.45}, snare: {kind: 'clap', pattern: 'halftime'}, bass: {pattern: 'offbeat', cutoff: 0.4, resonance: 0.35, drive: 0.25},
    chords: {voice: 'pad', rhythm: 'held', brightness: 0.5}, perc: 'none', space: 0.75, pump: 0.6},
};
