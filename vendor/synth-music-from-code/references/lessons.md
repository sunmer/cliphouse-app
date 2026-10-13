# Lessons from the session that built this skill

## What the listener said
- v1 (vocal-style lead, melodic arpeggios, acid line, busy electric-piano comping): "all pretty bad", "your sense of melody sucks", "keep to beats + chords".
- v2 (beats, bass, two or three jazzy chords, rhythm as the hook): "much better".
- So: when you can't hear, choose material that can't be badly wrong, and ask for feedback after the first render, not the last.

## Measuring the competitor first paid off
Opening the other AI's WAVs and measuring them showed near-mono stereo (side channel 22–31 dB below mid), sub-bass dominating the spectrum, and a dull top on one track. Those became targets that needed no ears: real width, kick against bass, a balanced top.

## Engineering traps
- **Denormals:** silent stretches made filters about 20× slower. Fix: add `1e-18` at every filter input.
- **`vm.createContext` sandboxes** run DSP about 6× slower than `vm.runInThisContext`. Browsers are fast. Don't trust sandboxed timings.
- **Render cost:** about 2.5–3.5 s per 15 s track in Node. The page synthesizes two tracks at a time in Web Workers made from a Blob of the engine's own script tag, and falls back to the main thread if workers are blocked.
- **Downloads:** the published-page viewer only saves allowlisted types (zip yes, wav no). Wrap the WAV in a stored (uncompressed) zip built in JS. When the page is opened outside the viewer, a plain blob link downloads the WAV.
- **Bit-identical output:** the page and Node share one engine, seeded random generators, and seeded dither. So the delivered WAVs equal what the page plays. Keep it that way: never use `Math.random()` in the engine.

## Mix traps
- The first kicks rang for 0.45 s and read as an 808 boom. Shorter decays (0.11–0.16 s) plus a smooth tail window fixed it.
- The first hats sat about 7 dB too bright, which `analyze.py` showed as an 8–16 kHz bump. Darker band centres and lower levels fixed it.
- A noise-burst kick click sounded harsh. A short falling tone (2.6 kHz to 650 Hz in about 2 ms) is cleaner.
- Householder feedback in the reverb rang. Hadamard mixing is denser.

## Rule traps
- An open hat with a 3-step length rang into the final hit. Leave the last bar's late off-beats empty.
- A rolled final chord put three notes after the final hit. Never roll the final chord.
- Echoes of pre-final notes and pads swelling in after the hit made the tail rise. The engine now clears echoes at the final hit and doesn't duck the final kick, and final pads use a fast attack.
