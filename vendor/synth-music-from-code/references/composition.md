# Composition: beats + bass + 2–3 chords

## Contents
1. The minimal rule set
2. Voicings that worked
3. Hook rhythms (the hook is rhythm, not melody)
4. Bass
5. Genre templates
6. Arrangement moves inside 8 bars
7. Embellishments (lo-fi only, or when asked)

## 1. The minimal rule set
- At most three chords per track. Two is often better. A vamp that changes every bar, plus one new chord in the variation bar, is plenty.
- Extended chords (9ths, 13ths, maj7) voiced without the root. The bass plays the root. This sounds jazzy and stays out of the bass register.
- Move one or two notes between chords and hold the rest (voice-leading). If a voicing jumps, pick a different inversion.
- No lead melody. The chord part plays a syncopated rhythm, and delay echoes turn it into a hook.
- Every pitched sound is in the key, including tuned percussion. Toms, congas and bongos are given note names from the scale.
- Push chord changes: start the next chord one 16th early (step 13 of the bar, sometimes 14). This single move does most of the "house" feel.

## 2. Voicings that worked (rootless, bass plays the root)
| Key | Chord | Voicing | Notes |
|---|---|---|---|
| A dorian | Am9 | C4 E4 G4 B4 | Cmaj7 shape over A |
| A dorian | D9 | C4 E4 F#4 A4 | from Am9: G→F#, B→A |
| A dorian | Gmaj9 | B3 D4 F#4 A4 | variation bar |
| A minor | Am7 | A3 C4 E4 G4 | organ stab |
| A minor | Dm7 | A3 C4 D4 F4 | from Am7: E→D, G→F |
| A minor | Am(add9) / Fmaj7 / G6 | A3 C4 E4 B4 / F3 A3 C4 E4 / G3 B3 D4 E4 | melodic techno pad |
| A phrygian | Am7 / B♭maj7 | A3 C4 E4 G4 / B♭3 D4 F4 A4 | dub techno; ♭II is the dark move |
| F major | Gm9 / C9 / Fmaj9 | B♭3 D4 F4 A4 / B♭3 D4 E4 G4 / A3 C4 E4 G4 | ii–V–I, two notes move each time |
| D dorian | Dm9 / G13 / Cmaj9 | F3 A3 C4 E4 / F3 A3 B3 E4 / G3 B3 D4 E4 | Dm9→G13 moves one note (C→B) |

Avoid two notes a semitone apart in a bright, short stab (for example E and F in a saw stab). They sound like a mistake. In a soft electric piano or pad they're fine.

## 3. Hook rhythms (16 steps per bar)
- **Deep house, 2-bar push** (Am9 ↔ D9). Bar A: hits at 0, 3, 6, then the next chord pushed in at 13. Bar B: hits at 2, 6, 10, then a push back at 13. Delay of 3 steps (a dotted 8th), feedback 0.4.
- **Tech house organ:** A = 3, 6, 10 (the last one longer). B = 3, 6, 9, 12. Short notes (1 step), delay 3 steps, feedback ~0.38.
- **Melodic techno chord pulse:** 0, 3, 6, 8, 11, 14 (a 3-3-2-3-3-2 grouping), three-note plucked chords, filter opening across the track.
- **Dub techno:** 3 and 10 per bar, plus 14 in the drop. Delay feedback 0.55, low-passed around 2.2 kHz so the echoes darken.
- **Lo-fi electric piano:** a rolled chord on beat 1 (notes ~0.08–0.09 steps apart, low to high), and a softer re-hit on the "and" of 2 (step 6) or of 3 (step 10).

## 4. Bass
- House and techno: mostly sine (`sub: 1`) with a little saw (0.1–0.3) for definition, through the ladder filter at 250–400 Hz, with drive around 1.6–2.2.
- Deep house: root on step 2, a repeat on 6, an octave pop on 7, root on 10, and the next chord's root pushed in at 13 (matching the chord push).
- Tech house: off-beat 8ths (2, 6, 10, 14) with ghost notes on 7 and 15.
- Melodic techno: rolling 16ths on every non-kick step (s % 4 ≠ 0), short notes, heavy ducking.
- Techno: off-beat sub (2, 6, 10, 14), plus a quiet kick rumble (`inst: 'rumble'`, `pk: -12`).
- Lo-fi: long root on beat 1, a re-hit, and a passing note on step 14 that walks into the next root. Upright-like decay: `sus: 0.35`, `adec: 0.35–0.4`.

## 5. Genre templates
| | Deep house | Tech house | Melodic techno | Techno | Lo-fi |
|---|---|---|---|---|---|
| Tempo | 118–124 | 124–128 | 122–128 | 128–135 | 70–90 |
| Swing (`song.swing`) | 0.13–0.15 | 0.10–0.12 | 0 | 0–0.05 | 0.20–0.24 |
| Kick (f0 / dec) | 160 / 0.14 | 230 / 0.11 | 185 / 0.15 | 300 / 0.12, drive 2.8 | 120 / 0.16, low-passed at 3.5 kHz |
| Snare / clap | clap 2 & 4 | clap 2 & 4 | clap 2 & 4, big reverb | clap 2 & 4 | snare 2 & 4, `late: 0.015–0.02` s |
| Hats | shaker 16ths, closed then open off-beats | 16ths, then open off-beats + ride in drop | off-beat 8ths, ghost 16ths in drop | 16ths + open off-beats + ride | 8ths or 16ths, dull (band ~7 kHz, LP 8.5 kHz) |
| Chords | soft saw stab (`stab`) + pad in drop | `organ` stab | `pluck` pulse + `pad` | resonant `stab` (q ~2.2) | `ep` (FM electric piano), rolled |
| Extras | congas, rim | bongos, rim | riser + snare roll into drop | toms fill, rim | `vinyl` crackle, tape `lofi` master |

Drum patterns (16 characters: `.` rest, `1`–`9` velocity, `X` full):
- Boom-bap kick (lo-fi): `X......7..8.....` or `X......8.8......`. Snare: `....9.......9...`.
- House shaker: `3273327332733273` (strong on the off-beat 8th).
- Tech house hats, groove: `3363336333633363`. Drop: `33.333.333.333.3` with open hats on `..7...7...7...7.`.

## 6. Arrangement moves inside 8 bars
- Pickup bar: chords plus percussion, with the chord filter partly closed (start the `lpAuto` around 1.1–1.3 kHz). Keep it reasonably present, because a blind listener's first two seconds matter.
- Groove: everything except the drop extras. Keep the chord filter at ~2.4–3.6 kHz and the chord part at ~0.7× gain (`gainAuto`).
- Bar 4: take the kick out from beat 4, add a fill (snare 16ths, congas or toms walking down the scale) and a short noise riser.
- Drop: open the chord filter (6–9 kHz) and add open hats, ride, pad, crash and a sub "boom" on the downbeat.
- Variation bar: the third chord, and a short break (drums out on the last two 16ths) before the final hit.
- Ending: one hit on step 112 with tonic chord, root bass, kick, optional crash, then only the tail.

## 7. Embellishments (lo-fi, or when asked)
- One `lead` part, using the same electric-piano voice at a lower level (`lu ≈ −9`), plus delay and reverb.
- Three or four 16th notes at the end of a phrase (steps 12–15), built from the chord that's playing. Example over C9: G4, B♭4, D5, E5 going up, or E5, D5, B♭4, G4 going down.
- Two or three fills per 8 bars at most. The last one can land a single note on the final hit (the 3rd or 5th of the tonic).
