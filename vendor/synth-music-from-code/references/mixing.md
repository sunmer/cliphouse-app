# Mixing by measurement (when you cannot listen)

## How levels are set
- Kick: `pk: 0`, so its peak sits at −6 dBFS before mastering. All other parts are relative to this.
- Every other part: `lu: X`, so its gated loudness lands at −13 + X LUFS before mastering. Look at `render.js --report` ("LUFS in mix") to see the real result.
- A low part set by peak alone comes out far too quiet. In the session, the bass sat 7–10 LU under the kick, because a sustained bass has a high peak relative to its loudness. Set bass by `lu` instead.
- A noisy part's peak says little about how loud it sounds. Hats and claps have high crest factors (peak-to-average ratio). Judge them by loudness, and tame claps with a `['drive', 1.6–1.8]` insert.

## Targets that sounded right (LUFS in mix, from `--report`)
| Part | House / techno | Lo-fi |
|---|---|---|
| Kick | ≈ −12 to −14 (reference) | ≈ −15.5 to −16.5 |
| Bass | 2–4 LU under the kick | about 1 LU under the kick |
| Chord hook (stab, organ, pluck, EP) | 3–5 LU under the kick | same level as the kick |
| Clap / snare | 7–9 LU under the kick | snare 2.5–3.5 LU under the kick |
| Closed hats | 15–17 LU under | 13 LU under |
| Open hats | 13–15 LU under | 15 LU under |
| Shaker / ride | 16–20 LU under | 16–20 LU under |
| Pad | 9–13 LU under | — |
| Lead or fills | — | 5–6 LU under the kick |
| Vinyl | — | about 20 LU under the kick |

## Band balance after mastering (`analyze.py`, dB relative to total)
Healthy house/techno ranges: 20–60 Hz −3 to −5 · 60–120 −4 to −6 · 120–250 −8 to −11 · 250–500 −11 to −15 · 500–1k −13 to −18 · 1–2k −16 to −22 · 2–4k −20 to −25 · 4–8k −21 to −24 · 8–16k −22 to −24.
- If 8–16 kHz is higher than 4–8 kHz, the hats are too bright or too loud.
- If 2–4 kHz sits well below 4–8 kHz, add presence: clap band to 1.5–1.65 kHz, a peak at 2.4–3 kHz on the hook, or +1 to +2 dB at 3 kHz on the master.
- Lo-fi should be darker: 8–16 kHz around −32 is correct. Add +2.5 dB at 1.5 kHz to the electric piano so the chords don't go hollow.

## Stereo
- Keep kick, bass and rumble centred (mono). Widen chords with per-note `spread`, chorus and `['width', 1.3]`. Pan hats and percussion to opposite sides. Ping-pong delay and reverb add the rest.
- Target an L/R correlation (similarity of left and right) of 0.87–0.96 (`analyze.py corr`). A competitor that measured 1.00 (mono) sounded small next to this.

## Contrast
- With a kick in every bar, a drop rarely gets more than about 1 LU louder. The lift comes from opening filters (chords from ~3 kHz to 6–9 kHz) and adding open hats, ride, pad and congas. Melodic techno's build bar is the exception: dropping the kick for half a bar gives a real dip and a real lift.

## The final hit
- Nothing is ducked on the final kick (handled in `mix.js`). Pads on the final chord use `{ att: 0.015 }` so they don't swell in after the hit.
- `audiocheck.py` fails a track if the energy rises by 3 dB or more after the hit. This catches swells, echoes and late notes.
