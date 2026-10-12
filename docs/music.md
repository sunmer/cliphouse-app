# Directed Music Templates

Music templates add a generated score to the directed v3 style. The score follows a fixed beat grid. Text edits change only accent notes and short responses; tempo, bars, scene timing, and length never change.

## Templates

| Template | Engine | Format | Tempo | Length |
| --- | --- | --- | --- | --- |
| `beatreel` Beat Showreel | Remotion | 16:9 | 120 BPM | 8 bars, 16 s |
| `productpulse` Product Pulse | Remotion | 9:16 | 120 BPM | 5 bars, 10 s |
| `featuredrop` Feature Drop | HyperFrames | 1:1 | 128 BPM | 4 bars, 7.5 s |
| `eventcountdown` Event Countdown | HyperFrames | 4:5 | 120 BPM | 6 bars, 12 s |

Scenes are whole bars, so Beat Showreel is 16 s (15 s at 120 BPM is 7.5 bars) and Feature Drop is 7.5 s (8 s at 128 BPM is 4.27 bars).

## Contract

- `src/videos/<id>/score.json` is the score: BPM, 4/4 meter, scenes in bars, layers, one accent slot per role, optional roles, risers, and impacts. `scoreErrors()` in `src/videos/music/check.ts` lists every rule.
- `musicMeta()` derives `durationInFrames` and `scenes` from the score. `musicSchema()` adds `hidden: Role[]` and `audio: {enabled}`. `brand`, `headline`, and `cta` cannot be hidden. Silent templates keep their exact schema and reject both fields.
- `musicPlan(score, texts, hidden)` in `src/videos/music/cues.ts` is the one cue list for picture and sound. Compositions read word beats from it (`useMusic` in Remotion, `CliphouseMusic.mount` in HyperFrames).
- `src/videos/music/synth.ts` renders 48 kHz stereo, masters to about -14 LUFS with a -1 dBTP ceiling, and writes 16-bit WAV. Mastering gain comes from the structure bus only, so text edits never move the overall level.
- The music modules are kept out of `contract.ts` and `vocab.ts`, so silent templates keep their source package versions.

## Editor, Export, and Packages

- The editor starts muted. The sound toggle plays the same samples as the export, rendered in a worker. Playback follows play, pause, scrubbing, scene jumps, and loops, and restarts when drift passes 40 ms. Gallery previews have no audio stream.
- The editor's Text and sound panel hides and shows optional roles and sets `audio.enabled`. Both are ordinary props, so undo, redo, save, share, and handoff links carry them.
- Export renders silent video with the template's engine, then `server/audio.ts` muxes the WAV as AAC 48 kHz stereo. The export fails when the audio start or length differs from the video or the score by more than 35 ms.
- Source packages add `music/score.json`, the generator modules, `music/render.mjs`, and the preset's `music/score.wav`. `node music/render.mjs` renders video with sound. It needs Node 22.6 or later and ffmpeg.
- HyperFrames templates inline `src/hyperframes/shared/music.js`, bundled from `music-entry.ts` by `npm run music:runtime`. The runtime rejects any tween that starts before 0 or ends after the score, because either breaks the loop.

## Gates

| Command | Checks |
| --- | --- |
| `npm run test:music` | Score rules, cue slots, accent limits, hidden roles, WAV hashes, loudness, peaks, beat onsets, prop contract |
| `npm run test:direction` | Banned patterns, beat sheet, short/typical/max text sheets, every hidden-role combination, clipping, overlap, 30-frame readability, motion on every beat, idle holds, loop match. Sheets go to `output/direction-gates/` |
| `npm run test:music-export` | Both engines through the server export path: streams, sync, onsets, clipping, loudness on the decoded AAC |
| `npm run test:music-source` | Extracted packages reproduce the WAV, frame count, streams, and beat timing |
| `npm run test:music-browser` | Muted start, toggle, sync on play, scrub, scene jump, and loop, hide/show, undo/redo, inline edit |

`npm run build` runs `check-direction.mjs --records`. It fails unless every music template has an approved `direction.json` that lists every gate and `approval.listened: true`. After an intended change to the synthesizer or a score, run `npm run music:hashes`, listen to every mix, and commit the hashes.

## Analytics

GA4 events: `sound_toggle` (`state` on or off), `role_toggle` (`text_role`, `state`), `sound_play` (first playback with sound per editor visit), `audio_export`, `return_visit` (`days_since_last`). `editor_open` and `mp4_export` carry `template_kind`: `directed_music`, `directed_silent`, or `legacy`. Compare music templates with the directed silent pilot on editor engagement, export rate, and return visits before adding more.
