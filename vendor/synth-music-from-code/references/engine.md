# Engine reference

## Song fields
`id, title, bpm, key ("A dorian"), scale (pitch classes), length (s), finalStep (112), seed, swing (fraction of a 16th), fade (s),`
`sections [[name, fromBar, toBar]]` (bars 0-based, end-exclusive; names: Pickup, Groove, Build, Drop, Variation, Ending),
`delay {steps, fb, lp, hp, gain, toRev}`, `reverb {size, decay, damp, predelay, hp, lp, gain}`, `retDuck`, `duckRel`,
`master {eq: [[type, f, q, gain]], comp {thr, ratio, att, rel, knee}, sat, lofi?: {wow: [rate, depthSec], flutter: [rate, depthSec], lp}}`,
`spec?` (what check.js enforces), `parts []`.

## Part fields
`name, inst, notes, p` (voice params), level `pk` (peak, dB vs kick) **or** `lu` (loudness vs reference),
`rev, dly` (send amounts), `duck` (0–1), `duckRel` (s), `swing` (bool), `hum` (s, random timing), `vrand` (velocity spread),
`late` (s, laid-back offset), `role` ('bass' | 'chords' | 'lead'), `keep` (store a stem for `rumble`), `fx` (insert list).

## Inserts (`fx`)
`['hp'|'lp'|'bp', f, q]`, `['peak'|'ls'|'hs', f, q, gainDb]`, `['drive', amount]`, `['chorus', {rate, depth, delay, mix}]`,
`['comp', {...}]`, `['width', w]`, `['pan', -1..1]`, `['lpAuto'|'hpAuto', [[sec, Hz], ...], q]`, `['gainAuto', [[sec, gain], ...]]`.

## Voices (`inst`)
| inst | what it is | key params |
|---|---|---|
| kick | sine with pitch drop, tonal click, saturation | f0, f1 (settle, keep 55 = A1 or another in-key root), pd, hold, dec, click, drive, knock, len |
| clap | four noise bursts and a tail, band-passed | fc, q, dec, hp |
| snare | two tuned tones (A3/E4) plus noise | f, body, bdec, ndec, nhp, nlp |
| hat | six polyBLEP squares (808-style) plus noise | dec, bp, bpq, hp, lp, metal, noise, pan; note length = choke |
| shaker | band-passed noise with a soft attack | fc, q, hp, att, dec, pan |
| ride, crash | metallic squares plus noise (ride has in-key bells) | dec, base, pan, hp, lp |
| rim | two in-key tones plus click | f1, f2, pan |
| drum | tuned hand drum or tom (note name sets pitch) | dec, bend, bendT, slap, slapF, drive; note extra `{pan}` |
| boom | sub impact on a note | dec |
| riser | resonant noise sweep (note length = sweep) | f0, f1, q, curve, shape |
| vinyl | crackle, pops, hiss (note length = span) | rate, pops, hiss |
| mono | mono synth: saw/square/sub, ladder filter, glide, accent | saw, sq, sub, cut (or automation), res, envOct, envDec, att, adec, sus, rel, drive, glide, hp; note extras `{slide, acc}` |
| stab | three detuned saws plus optional sine body, enveloped filter | cut, envOct, envDec, q, dec, sus, att, rel, det, body, spread |
| organ | additive drawbars with key click | harm, amps, dec, sus, rel, click, spread |
| ep | FM electric piano (1:1 body plus 14:1 tine), tremolo pan | idx, idec, dec, tine, rel, trem, tremRate |
| pad | supersaw with filter automation | voices, det, width, cut, q, att, rel; note extra `{att}` |
| pluck | three saws plus sub square, filter envelope | det, sq, cut (automation), envOct, envDec, q, dec, rel, spread |
| fmpluck | 2-operator FM pluck | ratio, idx, idec, idx0, dec, det, sub, lp |
| vox | formant "vocal" voice (risky: sounded robotic, avoid) | bwScale, tilt, vib, scoop; note extra `{vw: 'ao'}` |
| rumble | the kick stem through a dark reverb (needs kick `keep: true`) | size, decay, damp; `src: 'kick'` |

Automation arrays use seconds. Frequencies interpolate on a log scale. Bar n starts at `n * 16 * 60 / bpm / 4` seconds.
