---
name: synth-music-from-code
description: Make finished, mastered electronic music tracks where every sound is synthesized by code (no samples, no SoundFonts, no recordings, no audio AI). Covers deep house, tech house, melodic techno, techno and lo-fi hip-hop beats; renders WAVs offline in plain JavaScript, checks them against rules (key, length, final hit, loudness, true peak), and builds a browser player page that re-synthesizes them live. Use this skill whenever the user wants beats, loops, tracks, instrumentals or a music-production contest entry generated in code, mentions Tone.js / Web Audio / JS synths, asks for "lo-fi beats", "house", "techno", WAV output at a LUFS target, or wants to compete against another AI at making music, even if they do not say "synthesize".
---

# Synth music from code

This skill turns a music brief into finished WAV files and a player page. Every sound is computed sample by sample in plain JavaScript. The same engine runs in Node (for rendering and checking) and in the browser (for the player), and both produce bit-identical files.

## The one lesson that matters most

**Write beats, bass and two or three chords. Do not write lead melodies.**

The first attempt in the session that produced this skill used vocal-style leads, arpeggio melodies and acid lines. The listener called it "all pretty bad" and said the melodies were the weakest part. The rebuild used only drums, bass and a 2–3 chord vamp whose rhythm carried the hook. The verdict was "much better". You cannot hear your output, so choose musical material that is hard to get wrong:

- Two or three jazzy chords (min9, maj9, 9, 13, m7) with smooth voice-leading. Move only one or two notes between chords.
- The hook is the **rhythm** of the chord stab plus delay echoes, not a tune.
- Embellishment, when asked for (lo-fi), is a short single-note fill at a phrase end, built only from the current chord's tones. Three or four notes, then stop.

`references/composition.md` has tested voicings, hook rhythms and per-genre templates. Read it before writing notes.

## Workflow

1. **Pin the brief.** Write down tempo, key, mode, bars, section map, final-hit time, length cap, loudness and peak targets, and lead rules. One 16th step lasts `60 / bpm / 4` seconds. Eight bars is 128 steps. "Bar 8, beat 1" is step 112. If the brief's length cap can't fit 8 bars at the genre's tempo (lo-fi at 76–90 BPM needs about 21–25 s), say so and state what you chose.
2. **Copy the engine and an example.** Copy `scripts/` into a working folder. `scripts/songs.js` holds six worked examples: four contest tracks and two lo-fi beats. Start from the closest one; don't start from scratch.
3. **Write the song as note data** (format below, full detail in `references/engine.md`). Keep each part's role clear: drums, `bass`, `chords`, and at most one `lead`.
4. **Check the notes:** `node check.js <id>`. This catches out-of-key notes, notes after or held over the final hit, overlapping lead notes, wrong sections and wrong final-hit time before you render anything.
5. **Render:** `node render.js <id> --out=out --report`. `--report` prints each part's loudness in the mix. Compare it with the targets in `references/mixing.md` and adjust the `lu` and `pk` values.
6. **Check the audio:** `python3 audiocheck.py out/*.wav`. It checks −14 LUFS, true peak ≤ −1 dBTP with 8× oversampling, no clipping, the length cap, and a tail that only fades after the final hit. Fix everything until it all passes.
7. **Look, since you can't listen.** Run `python3 spec.py shot.png out/<id>.wav` and view the image. Check that sections read clearly, the final hit is a single vertical line followed by a fading tail, and nothing sits where it shouldn't. `python3 analyze.py out/*.wav` prints band balance and stereo width. Compare with `references/mixing.md`.
8. **Build the player page:** `node build.js --ids=a,b --names=a:file-a,b:file-b --title="..." --out=/mnt/user-data/outputs/page.html`. Publish it as an artifact with `capabilities: {downloads: true}`. Save delivers a `.zip` containing the WAV, because the viewer's download allowlist doesn't include `.wav`. Also hand over the WAVs themselves with `present_files`.
9. **Test the page** in headless Chromium if available (`scripts/pagetest.py`). It waits for all tracks to synthesize, presses play, and takes screenshots at desktop and phone widths. The only expected console error offline is the Google Fonts request.
10. **Ask for ears early.** Say plainly that you can't hear the result. Ask which track is weakest and what sounds wrong (thin, stiff, muddy, harsh, boring). Then fix that specific thing. One round of real feedback is worth more than any amount of measuring.

## Song format (short version)

```js
SONGS.mytrack = {
  id: 'mytrack', title: 'Deep house', bpm: 120, key: 'A dorian', scale: [9, 11, 0, 2, 4, 6, 7],
  length: 15.0, finalStep: 112, seed: 11, swing: 0.14, fade: 0.3,
  sections: [['Pickup', 0, 1], ['Groove', 1, 4], ['Drop', 4, 6], ['Variation', 6, 7], ['Ending', 7, 8]],
  delay: { steps: 3, fb: 0.4, lp: 3200, hp: 450 }, reverb: { size: 1.0, decay: 2.2, damp: 5000 },
  master: { eq: [['peak', 3000, 0.7, 1.5]], comp: { thr: -13, ratio: 1.8 }, sat: 1.15 },
  spec: { bpm: 120, key: 'A dorian', final: 14.0, maxLen: 15 },          // optional: what check.js enforces
  parts: [
    { name: 'kick', inst: 'kick', pk: 0, notes: drums([1, 2, 3], 'X...X...X...X...'), p: { f0: 160, f1: 55, dec: 0.14 } },
    { name: 'keys', inst: 'stab', lu: -4.5, rev: 0.3, dly: 0.2, duck: 0.4, swing: true, role: 'chords',
      notes: chord(0, 0, 2, ['C4', 'E4', 'G4', 'B4'], 0.85), p: { cut: 900, envOct: 1.4, sus: 0.35 } },
  ]
};
```

A note row is `[step, lengthInSteps, noteName | null, velocity, extra]`. The helpers `drums()`, `bar()`, `chord()`, `hits()` and `cat()` are defined at the top of `songs.js`.

## Rules the engine already handles (don't re-solve them)

- **Mastering.** The mix is normalised to −14 LUFS, then a look-ahead true-peak limiter holds it at −1.5 dBTP. The loop repeats until loudness is within 0.03 LU.
- **Clean ending.** The kick on the final hit doesn't duck anything, so the last chord lands solid. Delay echoes of earlier notes are cleared at the final hit. The last 0.3 s fades to digital silence.
- **Sidechain** ("ducking": turning parts down under each kick) is computed from the kick part's note times. `duck` sets the depth per part.
- **Swing** applies only to parts with `swing: true`, and only to notes on odd 16ths. Keep the kick straight.

## Pitfalls already paid for

Read `references/lessons.md` for the full list. The expensive ones:

- **Denormals.** Filters running over silence become 20× slower. Every filter adds `1e-18` to its input. Keep that when you write new filters.
- **Leveling by loudness alone fails for low parts.** Set the kick by peak (`pk: 0`) and everything else by loudness relative to it (`lu`). See `references/mixing.md`.
- **Hats too loud and bright** is the default failure. Start hats at `lu: -16` to `-18` and keep their band centre around 7–9 kHz.
- **A rolled chord or a swung note can land after the final hit.** Write the final chord unrolled and put it exactly on step 112.
- **Fixed drum tunings** (rim A6/E5, ride bells A7/D8/E8, snare A3/E4, kick settling on A1) suit keys that contain A, D and E. For other keys, retune them or `check.js` will flag it.

## Files

- `scripts/engine/dsp.js`: oscillators, filters, reverb, delay, chorus, compressor, wow/flutter, loudness meter, true-peak limiter, WAV writer.
- `scripts/engine/instruments.js`: every voice (see `references/engine.md`).
- `scripts/engine/mix.js`: note data to stems, levels, sidechain, sends, master.
- `scripts/songs.js`: six worked examples. Copy one and edit it.
- `scripts/render.js`, `check.js`, `audiocheck.py`, `analyze.py`, `spec.py`, `build.js`, `pagetest.py`, `web/template.html`.
- `references/composition.md`: read before writing notes.
- `references/mixing.md`: read before adjusting levels.
- `references/engine.md`: read when you need a voice or parameter you haven't used yet.
- `references/lessons.md`: the session history, including what failed and why.
