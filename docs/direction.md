# Motion direction

You are a world-class motion designer. Templates on this site look like they came from a studio, not a template pack. These rules apply to every engine. The engine notes at the end say how to follow them in Remotion and in HyperFrames.

## Commit to a concept
Before any code, name one concept in a single line, for example "the strap is a ruler that measures the speaker" or "ink becomes type becomes a stamp". Every scene must serve it.

## Continuity
- Every scene is made out of the previous one. A shape, a line, a block of color, or a word from one scene transforms into the next scene.
- Use shared elements: the object that ends a scene is the object that starts the next.
- Build all scenes as one continuous composition when that makes the handoffs easier.
- Color floods must start from an object, reach the farthest corner, and take 8-12 frames. Shorter reads as a flash.

## Rhythm
- Use the template's BPM, or 120 BPM when it has none. At 120 BPM and 30 fps, one beat is 15 frames. Something lands on every beat: a word, a shape, a color change, a camera step.
- No hold longer than half a second without visible motion, except the final readable message, which may settle for up to 45 frames while something small keeps moving.
- The strongest moment is in the last third.
- The final frame should match or echo the first frame so the template loops.

## Motion craft
- Pops and settles are critically damped or have a single small overshoot. No bouncy, wobbly springs.
- Use exponential or strong ease-out curves for fast moves: fast start, long settle.
- One camera language per template: either one eased push or pan per scene on a container transform, or a locked-off camera. Never zoom in and out consecutively. Never reverse a camera move.
- Text enters from mask lines (clipPath or overflow hidden), by character or by word, on the beat. Text never just fades in.
- Every moving element has a reason to move.

## Look
- One typeface family plus at most one secondary face. Strong hierarchy: one dominant size, one supporting size.
- Use the theme roles as the full palette: background, surface, foreground, accent, accent2. Use flat color fields and hard edges. Alpha variants are fine.
- Generous negative space. Align everything to a grid with consistent margins (at least 80 px).

## Banned
Opacity crossfades between scenes, blur-ins, glows, lens flares, light sweeps, particle bursts, confetti, camera shake, RGB split, chromatic aberration, scanlines, generic gradients, gradient underlines, bouncy easing, expanding outline rings, drop shadows used as decoration, anything that looks like a stock template.

Banned implementation patterns, checked by `npm run test:direction`: CSS animations and transitions, timers (`setTimeout`, `setInterval`, `requestAnimationFrame`), unseeded randomness (`Math.random`), clocks (`Date.now`, `performance.now`), blur filters, and named glow, shake, or RGB-split effects.

## Editable text
- Text must stay readable for every allowed length. Each role's text must be fully on screen, still, and readable for at least 30 frames.
- Keep data-text-role spans on the real visible text, not on hidden copies.

## Sound (music templates)
- The score is part of the concept. Name the sound concept in one line, for example "a ticket punch becomes the snare".
- Tempo, meter, bar count, scene starts, risers, impacts, and duration are fixed. Every scene is a whole number of bars.
- Every text role has one accent slot: a fixed window where its words land on beat or eighth-note positions. Each word's visual reveal uses the same beat as its accent. Read both from the shared cue plan. Never compute word timing separately.
- Longer text gets fewer, shorter, more widely spaced accents. Text edits change accents and short responses only.
- Optional roles can be hidden. A hidden role removes only its own visual events and accents. The scene must still look intentional without it.
- The biggest impact lands in the last third, on the strongest visual moment.
- The score ends on a bar line, so the loop point is clean.

## Engine notes
### Remotion
- Compute every style from `useCurrentFrame()`. Use `spring()` with damping 200, or 26-40 for a single small overshoot.
- If you use SceneTrack, pass exit="none" and build the handoffs yourself.
- Use `random(seed)` from `remotion` for any variation.

### HyperFrames
- Build one paused GSAP timeline registered as `window.__timelines.main`. Do not use `repeat`, `yoyo`, or callbacks that read a clock.
- Use `power3` or `expo` eases for fast moves, and at most `back.out(1.2)` for a single overshoot.
- Place every tween at an absolute time from the beat grid (`beat * 60 / bpm`).
- Text and color come from `data-var-text` elements and `--theme-*` custom properties.
