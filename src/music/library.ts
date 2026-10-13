// The music library: royalty-free instrumental tracks generated with the ElevenLabs Music API.
// Plain data with no imports, so the editor, the export server, build scripts, and agent specs share it.
// A video picks one track or none. The track plays from its start, is cut to the video length,
// and fades in and out in code, so any track fits any clip.

export type Track = {
  id: string;
  title: string;
  genre: 'Lo-fi' | 'House' | 'Techno';
  bpm: number;
  /** Generated length in seconds. Every track is longer than the longest template. */
  seconds: number;
  /** The generation prompt, kept for provenance. */
  prompt: string;
};

const NO_VOCALS = 'Instrumental only, no vocals, no voice, no lyrics. Starts immediately with the full groove, no long intro, no fade-in. Steady energy throughout, mixed and mastered like a commercial release.';

export const TRACKS: Track[] = [
  {id: 'lofi-sunday', title: 'Sunday Tape', genre: 'Lo-fi', bpm: 80, seconds: 40,
    prompt: `Lo-fi hip hop beat at 80 BPM. Dusty swung drums, warm Rhodes chords, soft upright bass, light vinyl crackle, mellow and focused. ${NO_VOCALS}`},
  {id: 'lofi-window', title: 'Window Seat', genre: 'Lo-fi', bpm: 86, seconds: 40,
    prompt: `Chill lo-fi beat at 86 BPM. Crisp boom-bap drums, jazzy nylon guitar loop, round sub bass, tape saturation, bright and optimistic. ${NO_VOCALS}`},
  {id: 'lofi-nightshift', title: 'Night Shift', genre: 'Lo-fi', bpm: 74, seconds: 40,
    prompt: `Late-night lo-fi beat at 74 BPM. Laid-back kick and rimshot, muted electric piano, warm pad, gentle bass, cozy and calm. ${NO_VOCALS}`},
  {id: 'house-launch', title: 'Launch Day', genre: 'House', bpm: 124, seconds: 40,
    prompt: `Uplifting deep house at 124 BPM. Four-on-the-floor kick, shuffled hats, warm chord stabs, bouncy bassline, polished and positive, made for a product launch video. ${NO_VOCALS}`},
  {id: 'house-rooftop', title: 'Rooftop', genre: 'House', bpm: 122, seconds: 40,
    prompt: `Melodic house at 122 BPM. Punchy kick, open hats, piano chords, plucked synth hook, smooth bass, sunny and confident. ${NO_VOCALS}`},
  {id: 'house-shipit', title: 'Ship It', genre: 'House', bpm: 126, seconds: 40,
    prompt: `Tech house at 126 BPM. Tight kick and clap, rolling percussion, groovy filtered bassline, short organ stabs, energetic and clean. ${NO_VOCALS}`},
  {id: 'techno-pulse', title: 'Pulse', genre: 'Techno', bpm: 128, seconds: 40,
    prompt: `Driving melodic techno at 128 BPM. Deep punchy kick, hypnotic arpeggiated synth, rumbling bass, crisp hats, modern and focused. ${NO_VOCALS}`},
  {id: 'techno-grid', title: 'Grid', genre: 'Techno', bpm: 132, seconds: 40,
    prompt: `Minimal techno at 132 BPM. Tight kick, metallic percussion, pulsing acid bassline, sharp hats, dark but energetic. ${NO_VOCALS}`},
];

export const TRACK_IDS = TRACKS.map((t) => t.id);
export const trackById = (id: string | null | undefined) => TRACKS.find((t) => t.id === id);
export const trackPath = (id: string) => `/music/${id}.m4a`;
/** Fade lengths in seconds. The fade-out ends on the last frame. */
export const FADE_IN = 0.3;
export const FADE_OUT = 1.2;

/** Gain of the fade envelope at `t` seconds into a clip that lasts `duration` seconds. */
export function fadeGain(t: number, duration: number) {
  if (t <= 0 || t >= duration) return 0;
  const fadeOut = Math.min(FADE_OUT, duration / 3);
  return Math.min(1, t / FADE_IN, (duration - t) / fadeOut);
}
/** The same envelope as an ffmpeg filter for the export server: linear in and out, cut at the video length. */
export function fadeFilter(duration: number) {
  const fadeOut = Math.min(FADE_OUT, duration / 3);
  return `atrim=0:${duration.toFixed(6)},afade=t=in:st=0:d=${FADE_IN},afade=t=out:st=${(duration - fadeOut).toFixed(6)}:d=${fadeOut.toFixed(6)},apad=whole_dur=${duration.toFixed(6)}`;
}
export const MUSIC_LICENSE = 'Royalty-free. Generated for cliphou.se with the ElevenLabs Music API. Free to use in videos made with cliphou.se templates, including commercial use.';
