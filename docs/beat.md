# Beat templates

Every template is a beat template. One `score.json` per template drives the picture and the sound: tempo, bars, scenes, fixed cues, the list schedules, and the sound design. Opus designs the score from the template's own look, so no two templates sound alike.

## Contract

- `src/videos/beat/score.ts`: the score type and timing math. `beatFrames` (13, 14, 15, or 16 frames per beat at 30 fps: 138.5, 128.6, 120, or 112.5 BPM) keeps every beat on a whole frame.
- `src/videos/beat/plan.ts`: `beatPlan(score, count)` is the one event plan. It holds the groove, a frame for every cue, and the start and accent frames of each list item. The synthesizer plays it and the composition reads it, so picture and sound cannot drift.
- `src/videos/beat/synth.ts`: deterministic synthesis and mastering to about -14 LUFS with a -1 dBTP ceiling. The same score and count give the same WAV in the editor worker, the export server, and source packages.
- `src/videos/beat/list.ts`: the list contract. A list is the `list` text role, one item per line. The score sets `min`, `max` (the preset's item count), `itemMax`, and an optional `chart` format.
- List parts: every visual repeated per item (rows, checks, markers, pips, meters, rail stops, placeholders) carries `data-list-part="<name>"` and `data-list-item="<index>"`, one element per shown item. HyperFrames templates put row parts in `<template data-list-row>` and generate companion parts with `m.parts(host, name, make)` from `m.items`, never as fixed HTML. Each part is timed to its item's `start` or `accent`. `data-list-group="scaffold"` marks parts drawn before the items, `data-list-group="finale"` a deliberate group moment, and `data-list-align="y"` or `"x"` a part that must sit on its item.
- `src/videos/beat/schema.ts`: `beatSchema(score, roles)` gives texts, theme, and `audio: {enabled}`. `beatMeta(meta, score)` derives the duration and scenes.
- Remotion: `useBeat(score, props)` in `src/videos/beat/remotion.tsx`. HyperFrames: `CliphouseBeat.mount(tl, score, build)` from `src/hyperframes/shared/beat.js` (`npm run beat:runtime`).

Only the list item count changes the music. Each item adds its own note on its accent. Wording, colors, and images never change it.

## Variety

`src/videos/beat/variety.ts` fingerprints each score on tempo, genre, key, progression, groove, timbre, and swing. `scripts/beat.test.ts` fails when two templates share five or more of the seven traits. The ten genres in `src/videos/beat/genres.ts` are starting points; Opus moves every value to fit the template.

## Gates

| Command | Checks |
| --- | --- |
| `node --import tsx --test scripts/beat.test.ts` | Score rules, timing, presets, list contract, plan invariants per count, deterministic mixes, loudness, peaks, onsets, prop contract, variety |
| `node --import tsx scripts/beat-direction.mjs <id>` | For every list count: readability, overlap, frame bounds, a landing on every beat, idle holds, loop, item timing, and list parts (one per item, aligned, first shown in the item's window, no stale index after an in-place count change). Short and max text at every scene focus. Sheets in `--sheets` |
| `node --import tsx scripts/beat-export.mjs <id>` | The export server path for every list count: streams, sync, onsets, and loudness on decoded AAC |

Text that repeats only as decoration, such as marquee bands, carries `data-text-copy`, so the gates read the one real copy.

## Converting the library

`node scripts/beat/convert.mjs <id> plan|review|repair` runs one Opus conversation per template. See `scripts/beat/README.md`.
