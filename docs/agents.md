# Agent Specs And Source Packages

Every cliphou.se video is deterministic code plus props. An agent can read it, edit it, and return it to cliphou.se or continue in its own project.

## Light Path: Text And Colors

- `/templates/<variant>/agent.json` is a static file. `/s/<share-id>/agent.json` comes from the share service. Neither needs JavaScript.
- Each spec has the template version, source hash, generation model and effort, current props, text roles and limits, color roles, scenes, format, a JSON Schema generated from zod, a handoff URL, and the source package link.
- Every catalog template must define `generation.model`, `generation.modelId`, `generation.provider`, and `generation.effort`. The build rejects missing values and non-model agent names.
- The handoff URL is `/#/v/<variant>?props=<url-encoded JSON>`. Older versions add `&v=<version>`. Encoded props are limited to 8,000 characters.
- The editor validates handoff props against the exact template schema. Unknown keys, missing keys, long text, blank text, control characters, and invalid colors are rejected with a message. Rejected props are not loaded, saved, published, or rendered. The handoff path never runs code.
- The editor's Copy agent link action copies the spec URL and the current edit as a handoff URL.

## Heavy Path: Source Packages

- `/source/<template>/v<version>.tar.gz` is a standalone project for the template's locked engine. The spec's `engine` field is `remotion` or `hyperframes`.
- Remotion packages contain the component, schema, metadata, shared helpers, exact dependency versions, a lockfile, `props.json`, a README, and the MIT-0 license.
- HyperFrames packages contain `index.html`, declared variables, `variables.json`, local GSAP and fonts, a README, and the MIT-0 license. Render with `npx --yes hyperframes@0.8.146 render --variables-file variables.json --strict-variables -o out/video.mp4`.
- Music template packages also contain the score, the audio generator, the preset's WAV, and `music/render.mjs`, which renders video with AAC sound. The spec's `music` field lists the tempo, bars, and accent slots, and `editableFields` adds `hidden` and `audio`. See [music.md](music.md).
- Fonts install from pinned Fontsource packages. Templates use no network assets and no unseeded randomness.
- Use `source.renderCommand` from the spec. Remotion uses `props.json`; HyperFrames uses `variables.json`.
- `npm run test:source-render -- <template>` extracts a package, installs it, and checks that its frame is byte-identical to the repository render.

## MCP Server

`https://cliphou.se/mcp` is an MCP server using the stateless Streamable HTTP transport: `POST` only, JSON responses, no sessions or SSE. `GET` returns 405. Request bodies are limited to 16 KB, except `upload_logo` calls, which may carry a logo of up to 1 MB. Each request is limited to 10 seconds, except `render_preview`, which is limited to 30 seconds and always answers within 25.

Agents search by marketing goal first. The goal IDs live in `src/agent/goals.ts`: `launch-product`, `announce-feature`, `share-update`, `grow-waitlist`, `announce-integration`, `announce-pricing`, `celebrate-milestone`, `share-social-proof`, `promote-event`, `introduce-brand`, `run-promotion`, and `hire-team`. Search hides the rendering engine unless the caller uses the advanced `engine` filter. Specs and source packages still name the engine.

Release moments are agent-only search metadata in `src/agent/moments.ts`. Each moment records why a release is worth sharing, the facts it needs, a benefit angle, its goals, and the templates that fit it, in priority order. The IDs are `most-requested-feature`, `generally-available`, `limit-raised`, `faster`, `manual-step-removed`, `integration-live`, `pricing-changed`, `reliability-fix`, `new-language-or-region`, `new-platform`, `free-resource`, and `milestone`. An explicit `moment` filters search to its templates and ranks them in that order. A query alone returns up to three `detectedMoments` as hints and does not filter. Search results and template specs list `moments`. The gallery, template pages, editor, and SEO pages do not use moments.

| Tool | Input | Returns |
| --- | --- | --- |
| `search_templates` | `goal?`, `moment?`, `query?`, `aspect?` (`16:9`, `9:16`, `4:5`, `1:1`), `maxSeconds?`, `music?`, `purpose?`, `engine?` (`remotion` or `hyperframes`, advanced), `limit?` (1-20, default 6) | `{searchId, contractVersion, goal, moment, detectedMoments, results}`. Each detected moment has id, label, requiredFacts, angle, and goals. Each result has id, title, description, purpose, goals, goal labels, moments, template, aspect, seconds, music, preview MP4, poster, page, spec URL, editor URL. `engine` is included only when the engine filter is used. `fixedSampleContent` lists numbers the design draws that no field can change; these templates rank slightly lower. The list lives in `src/agent/sample-data.ts`. |
| `get_template_spec` | `variantId`, `searchId?` | the same JSON as `/templates/<variant>/agent.json` |
| `build_edit_link` | `variantId`, `props`, `templateVersion?`, `searchId?` | a handoff URL, after the same validation the share service uses. Invalid props return a tool error. |
| `render_preview` | `variantId`, `props`, `templateVersion?`, `loop?` (`"start"` or `true`), `searchId?` | `{poster, video, editor}` plus the poster as an inline JPEG. `poster` is `https://cliphou.se/p/<hash>.jpg`. With `loop: true`, `video` is the 4-second animated loop of the same props (`https://cliphou.se/p/<hash>.webp`); a loop not ready within 45 s gives `video: null` and `videoPending: true`, and keeps rendering for a repeat call. Without `loop`, `video` is `null`. Invalid props return a tool error that names the field, for example `texts.cta is 22 characters; the limit is 20`. On a timeout, render failure, or daily limit, `poster` is `null`, `message` says why, and `editor` still works. |
| `render_previews` | `variantIds` (1-4), `brand` (`name`, `headline?`, `subhead?`, `points?`, `cta?`, `date?`, `theme?`, `logo?`), `loop?`, `searchId?` | `{results}`: per template, `id`, `title`, `aspect`, `poster`, `editor`, the tailored `props`, `keptSample` (text roles that still hold the template's sample text), `shortened` (brand texts cut to fit, as `{role, from, to, max}`), and `fixedSampleContent` when the design has fixed numbers, plus each poster as an inline JPEG in result order. The server maps the brand onto each template's text roles, shortens text to each role's limit at a word boundary, and keeps the template's own text for any role the brand does not fill. A template whose poster is not ready within 20 s gets `poster: null`, `stockPoster`, and `message`. |

| `upload_logo` | `svg?` (SVG text) or `data?` (base64 PNG, JPEG, WebP, or SVG), up to 1 MB | `{logo: {id, ratio, mono}, url, transparent}`. Pass `logo` as `brand.logo` or `props.logo`. Counts against a daily per-caller upload limit (20 anonymous, 100 with an API key). |

## Logos

The 40 release and developer templates (the HyperFrames library set, `librarySchema`) take an optional `props.logo`: `{id, ratio, mono}`. Other templates reject it.

- **Upload:** `POST /api/logos` (signed-in Google account, from the editor's Logo panel and the gallery brand kit) or the `upload_logo` MCP tool. `server/logos.ts` checks the type by its bytes, refuses SVGs with scripts, entities, embedded content, or outside references, and rasterizes with ffmpeg (librsvg, no scripts) to a PNG at most 1024 px on its long side. The id is the PNG's SHA-256, so the same file is stored once. Ratios run from 1:5 to 8:1.
- **Storage:** `logos/<id>.png` in the share bucket, served at `/l/<id>.png` (immutable, CORS open). Daily quotas live in `logoQuota/`. Shares, exports, links, and previews refuse a logo id that was never uploaded.
- **Rendering:** `bindHyperframes` adds a small runtime after the beat runtime only when the props carry a logo. It wraps `CliphouseBeat.mount` and puts the logo in every `[data-beat-text="brand"]` element as its single masked word, so the template's own brand motion moves it. The logo is one em tall at the fitted brand size. `mono: true` draws it as a mask in the brand text color. Template sources and source packages do not change. Renders copy the PNG into the project, so they read no network assets. The loop worker reads `logos/` with a read-only IAM condition.
- **Brand kit:** the gallery strip (Customize) and the editor ("Use this logo for every video") store one logo in `cliphouse:brandkit:logo`. Untouched videos with a logo slot open with it, and gallery cards preview it.

The `initialize` response includes `instructions` with the cliphou.se skill workflow: read the project (or the conversation) for product facts, search, show previews, fill the spec props, and return the editor link. Search uses the skill ranking and synonyms. Keep the `SYNONYMS` table in `server/mcp.ts` in sync with the skill helper.

### Agent contract guard

`AGENT_CONTRACT_VERSION` in `src/agent/goals.ts` names the agent-visible contract. Bump it when a tool, argument, result field, goal, or workflow changes. The build publishes it at `/agent-contract.json`, and `/.well-known/mcp.json` includes it.

`scripts/agent-contract.test.ts` checks the public skill repo before deploy. It fails when the skill or helper has a different contract version, misses a goal, does not use an MCP tool, or has a different synonym table. CI checks out `sunmer/cliphouse` into `.agent-skill`; locally, the test reads `../cliphouse-skills` or `CLIPHOUSE_SKILL_DIR`. Merge and push the skill change before the app change, or the app deploy stops.

Search, spec, and link answer from catalog data bundled in the share service image. `render_preview` renders one 900 px still of the filled template at its poster frame. Remotion templates render in a browser that stays open for the life of the instance; HyperFrames templates use `hyperframes snapshot` at the poster time. Posters are cached in the share bucket under `previews/<hash>.jpg`, keyed by variant, props, template version, and deploy, so identical props are rendered once. `previews/` objects are deleted after 30 days. Previews run up to 3 at a time per instance, as pages in the one open browser, in their own queue (at most 12 waiting), so shares and exports never block them. Renders, not cache hits, count toward a daily limit: 60 per IP, 300 per API key, and 4,000 per project (`PREVIEWS_PER_IP_DAY`, `PREVIEWS_PER_KEY_DAY`, `PREVIEWS_PER_DAY`).

`render_previews` can also return `video` per template: a 4-second, silent animated WebP (30 fps for Remotion, 24 fps for HyperFrames) of the filled template, 640 px wide (960 px tall for portrait and 4:5), ending just after the poster frame. Remotion renders only that frame range; HyperFrames captures the 96 instants in one persistent browser. ffmpeg encodes with `libwebp_anim` at quality 70, and encodes again at quality 40, then 20, when a loop is over 1.2 MB (photo-heavy templates), which the image's Debian ffmpeg includes (set `LOOP_FFMPEG` to use another build locally). Loops are cached next to the poster as `previews/<hash>.webp` and served at `/p/<hash>.webp`. Each loop render counts toward the same daily preview limit.

Loops take two calls. `loop: "start"` returns the posters as fast as a plain call and queues the loops. `loop: true` waits up to 45 s for them; a loop still rendering has `video: null` and `videoPending: true`, and a later call picks it up. Loops render in the background under their own 120 s budget, so a render outlives the call that started it. One render gate per instance keeps posters first: a loop starts only when no poster is rendering. Loops run one at a time per instance (`LOOP_CONCURRENCY`, at most 12 waiting). The skill runs `tailor` (step 1) and then `animate` (step 2).

With `LOOP_WORKER_URL` set (the `LOOP_WORKER_URL` repository variable), the share service sends each loop to `cliphouse-loop`, a private Cloud Run service that runs `server/loop-worker.ts` from the same image: 4 vCPU, 4 GiB, 3 requests per instance, 1 to 8 instances. One warm instance renders one gallery's 3 loops at once; busier times add instances. Only the `cliphouse-share` service account has `roles/run.invoker` on it; the share service gets an ID token from the metadata server. Up to 24 loops render at once (`LOOP_CONCURRENCY`, at most 120 waiting) and never share CPU with posters. CI deploys the worker with every release, from the image it just built. Without the variable, loops render on the share service behind the render gate.

HyperFrames loops use `server/hf-capture.ts`: a pool of up to 3 Chrome browsers (`HF_BROWSER_POOL`), opened when the worker starts and kept between loops, one loop per browser at a time (headless Chrome runs no animation frames in a background tab, and the seek waits for them). Each loop loads its page, waits for the HyperFrames runtime to be ready, then seeks and screenshots each frame straight at loop size. It reuses HyperFrames' own bundler, Chrome arguments, readiness check, and seek, imported from `node_modules/hyperframes/dist` by file name, so it is pinned to HyperFrames 0.8.146 and checks the version at load. If the module cannot load or a capture fails, the loop falls back to `hyperframes snapshot`; `HF_PERSISTENT=0` forces the fallback. A HyperFrames upgrade must update the file names in `hf-capture.ts`.

### Search logging

Every `search_templates` call writes a `searches/{autoId}` document: `at`, `searchId`, `query` (trimmed, at most 200 characters), `filters`, `resultIds` (first 10), `resultCount`, `empty`, `topScore`, `engines`, `client` (the `initialize` `clientInfo`, else `User-Agent`), and `caller` (`key:<owner>` or `ip:<address>`). Spec, link, and preview calls write `events/{autoId}` with `type`, `variantId`, `searchId`, and, for previews, `engine`, `ms`, `cached`, `poster`, and any error. Writes wait at most 300 ms and never fail a tool call. Clients cannot read either collection. `node scripts/search-report.mjs [--days 7]` prints the weekly report (empty and weak searches first, then search-to-poster time, poster-null share, engine split, top queries, clients, and per-template conversion) and writes `out/search-report-<date>.md`.

### Rate limits

| Caller | Identified by | Limit |
| --- | --- | --- |
| Anonymous | `CF-Connecting-IP`, else the first `X-Forwarded-For` hop | 60 requests per minute, 1,000 per day |
| API key | `Authorization: Bearer chk_...` | 600 requests per minute, 20,000 per day |

Every response carries `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` (Unix seconds). Over the limit, the server returns HTTP 429 with `Retry-After` and a JSON-RPC error (`-32029`). Clients must wait `Retry-After` seconds and back off; rejected requests still count toward the daily limit. An invalid or revoked key returns 401. The limits are in memory, per Cloud Run instance; the service runs at most two instances, so the effective ceiling is at most twice the table. Move them to a shared store before raising `--max-instances`.

### API keys

A signed-in user creates keys in the account dialog (MCP API keys). Each account may hold two keys. A key is shown once. Firestore stores only its SHA-256 in `apiKeys/{hash}` (`id`, `owner`, `createdAt`, `revoked`) and the owner's index in `users/{uid}/apiKeys/{id}` (`createdAt`, `last4`, `hash`). Clients cannot read `apiKeys` at all, and owners can only read their own index. The server endpoints are `POST /api/keys`, `GET /api/keys`, and `DELETE /api/keys/<id>`, and each requires a verified Google token. Key lookups are cached for 5 minutes per instance; revocation clears the cache on the instance that handled it, so another instance may accept a revoked key for up to 5 minutes.

### MCP Registry

The server is listed in the official MCP Registry as `se.cliphou/templates`. That is the reverse-DNS form of `cliphou.se`, proven with HTTP domain authentication. `server.json` in the repository root is the published metadata, and its `version` also sets the server's `serverInfo.version`.

- `/.well-known/mcp-registry-auth` serves the Ed25519 public key in `server/discovery.ts` (`REGISTRY_AUTH`). The private key is kept outside the repository, in `~/.config/cliphouse-mcp/key.pem` on the publishing machine.
- `/.well-known/mcp.json` is a discovery document with the endpoint, tools, and rate limits.
- Firebase Hosting does not deploy dotfiles, so the share service serves both paths through Hosting rewrites. They are exempt from the edge-secret check.

To publish a new version:
1. Bump `version` in `server.json`.
2. Deploy.
3. Run `mcp-publisher validate`.
4. Log in with `mcp-publisher login http --domain cliphou.se --private-key <hex>`.
5. Run `mcp-publisher publish`.

The Registry does not allow a version to be re-published. A remote URL can belong to only one server name.

## Versioning

- `src/videos/versions.json` lists the versions of each template. Packages in `public/source` are immutable.
- After a template or shared helper changes, run `npm run sources` and commit the result. The build fails when a package is out of date.
- `npm run sources` copies the superseded version into `src/legacy/` and regenerates `src/videos/legacy.ts` and `legacy-schemas.ts`. The editor, Remotion root (`<template>-v<version>`), and share server use those files, so existing saved and shared videos keep their original code.
- Drafts and shares store `templateVersion`. Records made before versioning use v1.

## License

Templates, presets, specs, and source packages use MIT-0. Remotion is a dependency with separate terms: https://remotion.dev/license
