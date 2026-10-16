# Launch set and music library

HyperFrames templates for SaaS launches, developer updates, and hook-first social clips, plus a library of 8 royalty-free tracks the user picks from.

## Templates

- **Launch set (2026-10-13):** `changelog`, `nowinbeta`, `versionreveal`, `shipped`, `featurelist`, `metricbump`, `integration`, `pricingchange`, `waitlist`, `launchday`, `releasenotes`, `beforenow`, `customerquote`.
- **Developer set (2026-10-14):** `apirelease`, `breakingchange`, `migration`, `codediff`, `githubstars`, `contributors`, `roadmap`, `benchmark`, `modelrelease`, `statusupdate`, `securityadvisory`, `docslaunch`, `hackathon`, `devtalk`, `opensource`.
- **Hook set (2026-10-16):** `hookanswer`, `quickstart`, `howitworks`, `foundernote`, `weeklyshipped`, `whyswitch`, `stathook`, `youasked`, `featuredemo`, `launchweek`, `builtfor`, `workswith`. Briefs with `hook: true` get a scroll-stopping, benefit-led direction. Briefs can set `goals`; otherwise the catalog writer keeps the goals already in the manifest.

- **Briefs:** `scripts/launch/briefs.mjs` fixes each template's id, size, roles, list limits, starter copy, theme, and facets.
- **Generation:** Claude Opus 5.5 at high effort on the Anthropic API (`ANTHROPIC_API_KEY` in `.env`). Opus writes `score.json` (beat timing only) and `src/hyperframes/<id>/index.html`. `scripts/launch/scaffold.mjs` writes `schema.ts`, `meta.ts`, `score.ts`, and the registry module `src/videos/launch/`.
- **Pipeline:** `node scripts/launch/run-background.mjs [id ...]` runs `pipeline.mjs` detached. Each template gets a plan, the type check, the contract check (`contract.mjs`), the direction gates (`beat-direction.mjs`), up to 3 repairs, one visual review, and the checks again. Status is in `output/launch/status.json`; ready templates are kept on later runs.
- **Catalog:** `node --import tsx scripts/launch/catalog.mjs` writes one template and one variant (`<id>-launch`) per brief. Unfinished templates stay hidden.
- **Lists:** the packed `list` role, one item per line, edited as free text in the editor. The score sets 1 to max items and a schedule per count.

## Music library

- `src/music/library.ts` lists the tracks (3 lo-fi, 3 house, 2 techno), the fade lengths, and the license line.
- `node --import tsx scripts/library/generate.mjs` generates missing tracks with the ElevenLabs Music API (`ELEVENLABS_API_KEY`), instrumental only, 40 s each. It masters them to about -14 LUFS with a peak below about -1.8 dBFS and writes 48 kHz AAC to `public/music/`. `REMASTER=1` re-masters the saved raw files without new API calls.
- Library templates store `audio: {enabled, track}` (`src/music/schema.ts`). Any track fits any clip: it plays from its start, is cut at the video length, fades in over 0.3 s, and fades out over the last 1.2 s.
- The editor plays the track with the same envelope (`src/ui/useTrackAudio.ts`). The export server muxes it with ffmpeg (`addTrack` in `server/audio.ts`). Source packages bundle the preset's track and `music/render.mjs`.

## Attribution

Every `agent.json` has an optional `credit` block ("Made with cliphou.se", `https://cliphou.se/?ref=agent`) and a matching instruction. The license stays MIT-0 with no attribution required.

## Verify

```bash
node --import tsx --test scripts/launch.test.ts
node --import tsx scripts/beat-direction.mjs changelog nowinbeta ...
URL=http://127.0.0.1:5190/ node scripts/smoke-launch.cjs
```
