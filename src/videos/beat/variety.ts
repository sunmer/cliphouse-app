// Library variety: no two templates may sound alike. Opus designs each score from the template's
// own picture, and this check compares the result against every other score in the library.
import {bpmOf, type BeatScore} from './score.ts';

/** A short fingerprint of what a listener hears first: tempo, genre, key, groove, and lead timbre. */
export const soundPrint = (s: BeatScore) => {
  const d = s.sound;
  return {
    bpm: Math.round(bpmOf(s)), genre: d.genre, key: `${d.root % 12}:${d.scale}`, progression: d.progression.join(''),
    groove: `${d.kick.pattern}/${d.hats.pattern}/${d.snare.kind}-${d.snare.pattern}/${d.bass.pattern}`,
    timbre: `${d.chords.voice}/${d.chords.rhythm}/${d.perc}`, swing: Math.round(d.swing * 10),
  };
};

/** How many of the fingerprint fields two scores share (0-7). Five or more sounds like a copy. */
export function likeness(a: BeatScore, b: BeatScore) {
  const x = soundPrint(a) as Record<string, unknown>;
  const y = soundPrint(b) as Record<string, unknown>;
  return Object.keys(x).filter((k) => x[k] === y[k]).length;
}

/** Pairs of templates that sound too much alike. */
export function varietyErrors(scores: Record<string, BeatScore>, limit = 5): string[] {
  const ids = Object.keys(scores);
  const out: string[] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const n = likeness(scores[ids[i]], scores[ids[j]]);
    if (n >= limit) out.push(`${ids[i]} and ${ids[j]} share ${n} of 7 sound traits`);
  }
  return out;
}
