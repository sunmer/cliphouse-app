# Motion Graphics Benchmark

The October 2026 pilot compares ten models writing Remotion code through OpenRouter.
The public pages are `/benchmark/` and `/benchmark/2026-10/`.
Both prerender the article, prompts, and initial comparison without JavaScript.
Brief switching and sorting are enhanced in the browser. No account or facet
sidebar is included.

## Current State

All 60 protocol 1.1 runs finished on October 8, 2026. There are 48 rendered
videos and 12 failed submissions: 11 invalid or truncated submissions and one
compile failure after repair. Of the rendered videos, 47 passed on the first
attempt and one passed after repair. All results are exported, including failures.
The edition is `reviewing`; human reviews have not been completed.

A v1.0 Haiku setup pilot was truncated after 13,309
reasoning tokens at the original 16,000-token completion limit. Its $0.007980687
cost is retained in the ledger, and its artifacts remain under
`.benchmark/pilots/2026-10-v1.0/`. All 60 comparable runs use the new 32,000-token
limit.

The 62 comparison API calls cost $4.01051518857, including two repair requests.
Confirmed charges including the setup pilot total $4.01849587557. An additional
$0.247746 remains reserved for the unavailable GPT Sol Flex endpoint until its
charge is reconciled. It is an estimate, not a confirmed charge. The failed
infrastructure request returned no model output; the standard endpoint was
selected before the comparison runs. Its incident record is under
`.benchmark/2026-10/infrastructure/`. There are no in-flight requests.

All 48 videos passed the format audit: 1920x1080, 30 fps, 360 frames, 12 seconds,
and no audio. The anonymous review package is in
`.benchmark/2026-10/blind-review/`. Keep its separate review key private.

Do not substitute existing gallery videos for benchmark results.
The example in the methodology section is explicitly labeled as a gallery example.

## Late Addition A1

Gemini 4 Argon (`google/gemini-4-argon`) was added on October 13, 2026, the
day it appeared on OpenRouter. It is listed first in the comparison. It uses the
unchanged protocol 1.1 contract, briefs, limits, renderer image, and repair rule.
The provider rule pinned `google-vertex/global`. All six runs rendered on the
first attempt, at a total cost of $0.9453. The original 60 runs, ledger, and
protocol hash are unchanged. A1 did not receive recovery R1, and the Argon runs
are not part of the blind-review package.

Definition: `src/benchmark/addition.json`. Results:
`src/benchmark/addition-results.json`. Raw records and the separate ledger:
`.benchmark/2026-10/addition-a1/`.

```sh
npm run benchmark:run -- --addition
node scripts/benchmark/publish-addition.mjs
node scripts/benchmark/collect-timings.mjs --execute
```

## Late Addition A2

Muse Spark Open (`meta/muse-spark-open`), Meta's open-weight 816B-A42B model, was
added on October 15, 2026, the day it appeared on OpenRouter. It is listed first.
It uses the unchanged protocol 1.1 contract, briefs, limits, renderer image, and
repair rule. Four providers listed the same price, so the provider was pinned to
Fireworks (unquantized listing) instead of the cheapest-price rule. All six runs
rendered: four on the first attempt and two after the single repair, at a total
cost of $0.5446. A1 and the original 60 runs are unchanged. A2 did not receive
recovery R1, and the Muse runs are not part of the blind-review package.

The run used an OpenRouter key without a spending limit, approved by the operator.
`--allow-unlimited-key 3` replaced the key-limit check with a hard $3 cap recorded
in the A2 ledger (`capUsd`, `keyPolicy`). One repair request was rejected upstream
with HTTP 429 (shared provider rate limit, 268 ms, no generation id, no charge). It
was reconciled at $0 and recorded under `addition-a2/infrastructure/`; the repair
then ran with `BENCHMARK_WORKERS=1`. OpenRouter returned generation_time for one of
the six videos at publication. The other five were published as unavailable
until October 17, 2026, when a later lookup returned all six.

Definition: `src/benchmark/addition-a2.json`. Results:
`src/benchmark/addition-a2-results.json`. Raw records and the separate ledger:
`.benchmark/2026-10/addition-a2/`.

```sh
BENCHMARK_WORKERS=1 npm run benchmark:run -- --addition-id A2 [--allow-unlimited-key <cap>]
node scripts/benchmark/publish-addition.mjs --id A2
node scripts/benchmark/collect-timings.mjs --execute
```

## Late Addition A3

DeepSeek V4.1 Flash 1017 (`deepseek/deepseek-v4.1-flash-1017`), the October 17,
2026 snapshot of V4.1 Flash, was added on October 17, 2026, the day it appeared
on OpenRouter. It is listed first. The original `deepseek-v4-1-flash` entry is a
separate model and is unchanged. A3 uses the unchanged protocol 1.1 contract,
briefs, limits, renderer image, and repair rule. The provider is pinned to
DeepSeek's first-party endpoint (`deepseek`) instead of the cheapest-price rule.

The OpenRouter key is the operator's key without a spending limit (stored in
the lovd-by-ai project's `supabase/.env`). `--allow-unlimited-key 1` recorded a
hard $1 cap in the A3 ledger.

One of six runs rendered, on the first attempt, for a total cost of $0.0880.
Five submissions are invalid, so protocol 1.1 gave them no repair: four
wrapped the source in a Markdown code fence instead of the required JSON, and one
reached the 32,000-token completion limit. OpenRouter resolves the snapshot to
`deepseek/deepseek-v4.1-flash-20261017`; the timing check accepts that dated alias.

Definition: `src/benchmark/addition-a3.json`. Results:
`src/benchmark/addition-a3-results.json`. Raw records and the separate ledger:
`.benchmark/2026-10/addition-a3/`.

```sh
BENCHMARK_WORKERS=2 npm run benchmark:run -- --addition-id A3 --allow-unlimited-key 1
node scripts/benchmark/publish-addition.mjs --id A3
node scripts/benchmark/collect-timings.mjs --execute
```

### A3 Recovery R1

On October 17, 2026, the operator asked for the five A3 failures to be repaired
the same way R1 repaired the original edition's failures. The unchanged R1
protocol ran on the A3 store: up to three additional attempts, 64,000 tokens,
direct TSX output, the same pinned DeepSeek provider, and no human edits. All five
rendered after one additional attempt each, for $0.0185. A3 now has six playable
videos in the repaired view; the original A3 results keep one video and five
failures. The A3 definition and hash are unchanged, so its policy text still
says R1 does not apply; the page footnote and each card record the recovery.

Each recovered card has a repair note generated from the recorded responses:

- product-launch 1: the original reached the token limit; the repair returned a complete module.
- product-launch 2: raw TSX in a `tsx` fence; the repair revised the code (24,170 to 22,528 characters).
- kinetic-type 1: fenced JSON; the repair returned identical code, so the video is the original submission.
- kinetic-type 2 and data-story 2: fenced JSON; the repair made small revisions.

The same $1 ledger cap covers the A3 generation and repair spend. Repairs are in
`src/benchmark/addition-a3-recovery.json` and `.benchmark/2026-10/addition-a3/recovery-r1/`.

```sh
npm run benchmark:repair -- --addition-id A3
npm run benchmark:repair -- --execute --addition-id A3 --allow-unlimited-key 1
npm run benchmark:publish-repairs -- --addition-id A3
node scripts/benchmark/collect-timings.mjs --execute
```

## Late Addition A4

MiniMax M3.1 Flash (`minimax/minimax-m3.1-flash:free`) was added on October 19,
2026, the day after it appeared on OpenRouter. It is listed first. A4 uses the
unchanged protocol 1.1 contract, briefs, limits, renderer image, and repair rule.
It runs on OpenRouter's free endpoint, at the operator's request. The only
provider of that endpoint is MiniMax (`minimax`), so the provider is pinned to it.
OpenRouter reported `usage.cost` 0 for every call. Free endpoints have a daily
request limit (1,000 requests on this key), which A4 does not approach.

All six runs rendered, for a total cost of $0: five on the first attempt and one
(product-launch 1) after the single repair. A4 did not need recovery R1.
OpenRouter resolves the endpoint to `minimax/minimax-m3.1-flash-20261019:free`;
the timing check accepts a dated alias before a `:free` variant tag.

Harness incident: the first launch ran in a shell that closed after about ten
minutes, which stopped the runner before either first request returned. No
response or generation id was saved, and the endpoint is free, so both pending
reservations were reconciled at $0. The requests are kept under
`addition-a4/infrastructure/`, and the jobs were rerun from scratch.

Definition: `src/benchmark/addition-a4.json`. Results:
`src/benchmark/addition-a4-results.json`. Raw records and the separate ledger:
`.benchmark/2026-10/addition-a4/`.

```sh
BENCHMARK_WORKERS=2 npm run benchmark:run -- --execute --addition-id A4 --allow-unlimited-key 1
node scripts/benchmark/publish-addition.mjs --id A4
node scripts/benchmark/collect-timings.mjs --execute
```

The GTA6 Trailer Benchmark (`src/benchmark/trailer-voxel/`) also added MiniMax
M3.1 Flash on October 19 with the same brief, limits, repairs, and review rounds.
All three runs rendered at $0. Adding a model changes that set's protocol hash; the
earlier nine records are unchanged and keep their original hash.

## Pilot Limitation

The runner selected stderr instead of combining stdout and stderr for failed
compiles. Both repair requests therefore received the compiler stack trace without
the detailed TypeScript diagnostics. First-attempt outcomes are unaffected.
Repair outcomes are provisional, as disclosed on the public page. Preserve these
original attempts. Before freezing the next protocol version, capture both output
streams and test the repair feedback with a known compiler error. Do not silently
rerun or replace this edition's submissions.

## Automated Recovery R1

R1 completed on October 8, 2026: all 12 original failures compiled and rendered
after one additional model-generated attempt each. The 12 API calls cost
$0.1669760136. The site now has 60 playable submissions in the repaired view;
the original view retains 48 videos and 12 failures. All 60 videos passed the
format audit. Recovered means technically renderable, not visually approved;
blind reviews remain outstanding. Total confirmed recorded API charges, including
the original setup pilot, are approximately $4.19. The separate $0.247746
infrastructure estimate remains reserved, not counted as confirmed spending.

The user authorized automated repairs of the 12 original failures. Recovery R1
allows up to three additional requests per failure, stops at the first successful
render, and retains the original model, pinned provider, reasoning effort, creative
brief, and frozen renderer. Every additional call is charged to the original
$10 repair budget, including repair spending already incurred in v1.1.

R1 requests a complete TSX module directly, accepts one code fence or a valid
source JSON wrapper without modifying the code, raises the completion limit to
64,000 tokens, and passes both stdout and stderr back after compiler/render
errors. The original compile failure is reproduced in the sandbox to obtain full
diagnostics before the first new request. A recovered video is not a first-attempt
success. No human source edits or creative feedback are allowed.

```sh
npm run benchmark:repair
npm run benchmark:repair -- --execute --store /absolute/path/to/.benchmark/2026-10
npm run benchmark:publish-repairs -- --store /absolute/path/to/.benchmark/2026-10
```

Without `--execute`, the runner only prints the plan. The existing dedicated key
must be provided through `OPENROUTER_API_KEY`. It never enters publication files.
The runner locks the original store and writes only under its `recovery-r1/`
directory. It retains all raw responses, sources, requests, costs, errors, and
timings. Resume reuses recorded responses; unresolved charges block new calls.

Publication uses `src/benchmark/recovery.json` and separately prefixed media,
leaving `results.json` and original media intact. The simplified page shows the
repaired results; original results remain downloadable. Recovered cards show
combined costs with separate original and additional costs in run details.
Generation time now uses the successful request's OpenRouter metadata, as described below.
The public recovery request file contains each repair request and response source
plus available compiler diagnostics. The build validates original and recovery
artifacts. Browser tests exercise original result downloads and every brief/run combination.

## OpenRouter Generation Time

The card's Generation metric uses OpenRouter's `generation_time`, in milliseconds,
from `GET https://openrouter.ai/api/v1/generation?id=...`, displayed in seconds.
It belongs only to the successful request whose generated source produced that
video. A repaired video uses its successful repair request, not the sum of the
original and repair attempts. Original successful videos use their original
successful request, including a baseline repair where applicable.

`src/benchmark/timings.json` records the generation ID, requested and resolved
model, provider, source hash, lookup timestamp, and exact reported time for each
video. All 60 current videos have a reported timing. These records are exported
at `/benchmark/timings.json`. The original `generationMs` fields remain unchanged
as historical client-measured totals but are no longer the displayed metric.
Costs still include all attempts. Local render times remain separate.

After publishing new video records, run:

```sh
npm run benchmark:timings -- --execute --store /absolute/path/to/.benchmark/2026-10
```

The command requires `OPENROUTER_API_KEY` in the environment. Without `--execute`,
it only prints the lookup plan. It makes metadata GET requests, never completion
or render requests. It verifies the successful attempt's source hash and ledger
generation ID before publication, and caches raw responses in the private run
store. Missing metadata or null timings display as unavailable, never as local
timing estimates. Authentication, network, and other API errors stop collection.
The build requires a timing record for every published video and verifies its
source hash. Browser tests check all models, briefs, runs, and original result downloads.

## Video Loading

All React gallery and article videos and static template pages use
`src/media/viewport-video.ts`. The initial HTML has no active video `src`.
Autoplay starts after a 200 ms dwell with at least 35 percent of the video
inside the viewport. Leaving the viewport or hiding the document clears the
source and stops buffering. There is no ahead-of-viewport video prefetch.
Reduced-motion, Save-Data, and reported 2G connections disable automatic loading.
Article and template players provide explicit playback when autoplay is disabled
or rejected. Posters remain available; gallery links still open their editor.

Playback uses the existing MP4 files, not generation API calls. Hosting data
transfer still scales with traffic. The published benchmark MP4s total about
38.1 MB, averaging 0.79 MB each. Viewport gating reduces unnecessary transfers;
it is not a hard hosting billing cap.

`npm run test:video-policy` checks loading, unloading, preferences, manual
fallbacks, and nonblank playback in desktop Chromium and mobile WebKit.
The deployment workflow runs it before cloud authentication and deployment.

## Prerequisites

- Configure a dedicated `OPENROUTER_API_KEY` in the shell environment.
- Set its lifetime OpenRouter spending limit to at most USD 40.
- Rotate any key shared in chat after the authorized run ends.
- Start Docker.
- Build the isolated renderer:

```sh
docker build -f scripts/benchmark/sandbox/Dockerfile -t cliphouse-benchmark:1 .
```

The Docker build requires network access to install the fixed lockfile dependencies.
The generated code runs later in a read-only container with networking disabled,
no credentials, restricted resources, and only its input and output directories
mounted. Never render untrusted generated code in the host application.

The image ID is frozen at the first run. A changed image or protocol stops the
runner. The Dockerfile context excludes environment files and credentials.

## Run

```sh
npm run test:benchmark
npm run benchmark:plan
npm run benchmark:run -- --model haiku-5-5 --brief product-launch --run 1
npm run benchmark:run
```

The plan is local and free. Execution validates the key, model availability,
reasoning support, and Docker image before generation. It pins one provider per
model, disables fallback, and records the endpoint snapshot.

Up to four independent API requests overlap. Renders remain sequential in the
same fixed container environment. Queue time is excluded from render time.
The runner reserves the maximum quoted input/output charge for all in-flight
requests before each new call. It stops before crossing USD 25 for generation or USD 10 for
repairs, leaving USD 5 untouched. Reasoning is included in the 32,000 completion
token limit. Price overrides are included in the reservation.

The protocol requests high reasoning except Qwen, whose supported medium effort
is used. Effort names are not equivalent amounts of computation across models.
No temperature or seed is forced on models that do not support it.

Only failed compiles/renders receive one repair. Invalid JSON and truncated
submissions remain failures. Transport errors stop the runner; they are not
silently retried or counted as model failures.

Requests, raw responses, usage, source hashes, image ID, and error logs stay in
`.benchmark/2026-10/`, which is ignored by Git. Existing completed jobs are skipped.
A saved response with a matching ledger charge is reused after interruption,
without another API call. An unresolved request or cost stops execution rather
than regenerating a potentially cherry-picked replacement.

If a request times out or omits a trustworthy `usage.cost`, reconcile the request
with OpenRouter before another run. Do not delete the ledger or guess the cost.
If a process crashes, inspect the pending request and running containers before
removing `runner.lock`. The runner does not attempt automated charge recovery.

## Review And Publish Results

```sh
node scripts/benchmark/publish.mjs --prepare-reviews
```

Give each of two reviewers the `blind-review/` videos and a separate copy of
`review-template.json`. Keep `review-key.json` private. Do not show model names,
source code, costs, or provider details during review. Each reviewer assigns
scores from 1 to 5. Use 1 for poor, 3 for acceptable, and 5 for excellent.

Combine the two completed reviewer objects into a JSON array, then run:

```sh
node scripts/benchmark/publish.mjs --reviews /absolute/path/reviews.json
```

Without `--reviews`, publication includes actual videos and metrics but no scores.
The exporter verifies recorded charges and unchanged source. The build rejects
duplicate entries, missing assets, one-reviewer scores, and unsafe asset paths.
The command prepares local publication data only; it does not deploy.

All completed jobs, including failures, must be published. Displayed run 1 is the
default, never the highest-scoring take. Do not calculate an overall winner from
unequal coverage. Cost, generation time, render time, reliability, and visual
quality remain separate measurements.

## Monthly Editions

Generation for the first edition is complete. It remains in review until both
blind reviews are complete.
The exporter refuses to overwrite a completed edition. Before a later edition,
retain this edition's protocol, results, and media as a separate frozen dataset;
add the new edition and route rather than reusing its files. Corrections require
an identified revision, not silent replacement. Protocol changes require a new
protocol version.

## Verify And Deploy

```sh
BASE=/ npm run build
BASE=/ npx vite preview --host 127.0.0.1 --port 5182 --strictPort
URL=http://127.0.0.1:5182/ node scripts/smoke-benchmark.cjs
```

Use the cloud-token validation and production deployment process in
`docs/deployment.md`. Never change cloud accounts or start interactive login
without user approval. This checkout contains unrelated in-progress changes;
do not commit or deploy those as part of the benchmark without reviewing them.
