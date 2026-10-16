# cliphou.se

cliphou.se is a gallery of AI-generated Remotion and HyperFrames videos. Users can find videos with faceted filters, edit text and colors inline, and keep private starred collections through Google sign-in. Each template is locked to one engine, while the editor, agent handoff, sharing, and export flows use the same contract.

The production site is https://cliphou.se/, and Firebase also serves it at https://cliphouse-app.web.app/. Pushes to `main` deploy through keyless GitHub Actions. This repository was renamed from `sunmer/voodoo`, and the old GitHub Pages address is retired.

See [deployment.md](docs/deployment.md) for configuration and the Loopia cutover checklist.
See [sharing.md](docs/sharing.md) for saved video links, rendering, and the pending paid-service activation.
See [agents.md](docs/agents.md) for agent specs, handoff links, source packages, and template versions.

## Use cliphou.se from your agent

[![Demo: a coding agent suggests release video templates, the user picks one, and the agent fills it from the repo](public/agents/poster-16x9-a1.jpg)](https://cliphou.se/agents/)

- Coding agents (Codex, Claude Code): `npx skills add sunmer/cliphouse`
- Chat apps (Claude, ChatGPT, Cursor): connect the MCP server at `https://cliphou.se/mcp`

The skill, the MCP install links, and the demo are in [sunmer/cliphouse](https://github.com/sunmer/cliphouse). The install page is https://cliphou.se/agents/.

## Run

```bash
npm install
npm run dev                 # http://localhost:5180/voodoo/
npm run studio              # Remotion Studio
node scripts/previews.mjs   # rebuild gallery posters and MP4 loops in public/previews
npm run previews:hyperframes # rebuild HyperFrames posters and loops
```

## Accounts And Analytics

Use `.env.example` to configure the public Firebase web settings and GA4 measurement ID. Never put a service-account key or OAuth client secret in a `VITE_` variable. Missing configuration leaves browsing and editing available but does not pretend to save bookmarks.

Stars use `users/{uid}/bookmarks/{variantId}` in Firestore. Rules restrict all access to the account owner and validate the payload. Sign-out clears the visible collection. Existing `voodoo:` local-storage keys are intentionally retained so the rebrand does not discard edits on the same origin. Local edits cannot automatically transfer from the GitHub Pages origin to cliphou.se.

Analytics loads automatically when configured, without a consent banner. The site sends explicit hash-route page views and a small set of actions, without account IDs or editable text. Disable automatic enhanced measurement on the GA4 web stream to avoid duplicate page views or automatic collection. Review consent obligations before public launch; this configuration is not a compliance guarantee.

Google pop-ups can be blocked inside social apps. The error state permits retrying in a regular browser. Native iPhone sign-in still needs a real-device acceptance test before launch.

## Taxonomy

The catalog uses three levels:

- **Template:** code in `src/videos/<id>/`. It sets the scenes, motion, and timing. Its technical facts, such as size, fps, duration, scenes, and motion, are in `meta.ts`.
- **Variant:** an entry in `manifest.json`. It is a template plus preset text and theme values, plus curated facets: purpose, style, energy, and keywords. Users browse variants.
- **Remix:** a user's edit of a variant. Save keeps a private account draft. Publishing saves an immutable composition and JPEG thumbnail behind a share link; the website animates the saved composition without a rendered MP4.

Facets come from different sources:

| Facet | Source |
|---|---|
| Format, duration, placement | Template size and fps |
| Scenes, motion | Template `meta.ts`. The timeline reads the same data. |
| Tone (dark or light) | Brightness of the theme background |
| Purpose, style, energy | Curated in `manifest.json`, using only `vocab` terms |

## Shared Roles

All templates use the text roles in `src/videos/vocab.ts`: `brand`, `headline`, `subhead`, `point1` to `point3`, and `cta`. All templates also use the same five theme roles. Because of this, the **brand kit** can apply one set of values to every video. Each card then shows one static Remotion frame with the user's text, but only while the card is on screen.

Content roles hold text that belongs to one video, so the brand kit never fills them. `quote` (140 characters) and `author` (40 characters) are content roles for testimonials. Countdown digits come from the timeline, not from a text role. Image logo upload is not part of the contract yet; Wordmark animates the brand name as text.

## Add A Template

HyperFrames templates live in `src/hyperframes/<id>/index.html`. Use the shared `__BASE_CSS__`, `__BASE_JS__`, and `__ASSET_BASE__` placeholders, mark editable text with `data-text-role` and `data-var-text`, and register the template ID in `src/videos/engine.ts`. Their source packages are native HyperFrames projects with `variables.json`; run `npx hyperframes check` on an extracted package before publishing.

1. Generate a composition that reads all text from `props.texts` with shared roles, and all color from `props.theme`.
2. Add `meta.ts` with its scenes. Each scene has `from`, `duration`, `focus`, and `roles`. Map the components to scenes in the same order with `SceneTrack` from `src/videos/shared/scenes.tsx`. Each role must be visible at its scene's midpoint because inline tests seek there.
3. Add the schema with `textsSchema([...roles])` and `themeSchema`, and register the template in `src/videos/registry.ts` and `src/videos/meta.ts`.
4. Add the template and one visible variant to `manifest.json`. Keep retired variants with `"hidden": true` so existing links still open. Then run `node scripts/previews.mjs`.
5. Mark each editable text group with `data-text-role="headline"` (or the matching shared role). Use `display: contents` on additional wrappers to preserve the composition layout. Tag the copy itself, not decorative labels or whole scenes.
6. Add the schema to `src/videos/schemas.ts`. Run `npm run sources` to publish its source package and version. Run it again after any template or shared helper change.

## Editor

- Mobile uses a screen-filling stage with overlay controls. Landscape compositions fill the phone when it rotates to landscape. The expand button requests native fullscreen and landscape orientation where supported; otherwise it uses the browser viewport. Desktop keeps a contained preview.
- Click or tap visible text to pause and edit that role in place. Confirm to save one undo step, or cancel. Scene buttons expose later text without a separate text panel.
- Theme controls sit below the video. Video details show the original creative brief with a copy action. Related videos and taxonomy are not part of the editor.
- Saved props are validated before loading. Invalid text cannot be committed. Changes remain available after reloading.
- Share replaces the JSON download. Publishing requires Google sign-in; recipients can view without it. Live publishing stays unavailable until the rendering service is configured.

## Notes

- Preset gallery cards autoplay muted MP4s when at least 35% visible. Scrolling away or hiding the page unloads them. Reduced-motion settings keep the poster, as does a rejected autoplay request.
- iPhone/iPad live compositions skip costly grain, blur, and selected 3D layers. Exported videos retain the full effects. Browser emulation cannot prove stability on every physical iPhone.
- The gallery shows one preset per template. Retired color presets stay hidden but remain valid for bookmarks, saved drafts, and share links. Flex measures glyph bounds to fit variable-width text.

## Verify

```bash
npm run build
npm test
npm run test:agent
npm run test:source-render -- stack
npm run test:rules          # requires Java 21 on PATH
node scripts/smoke.cjs
node scripts/smoke-ios.cjs
node scripts/smoke-media.cjs
node scripts/smoke-media.cjs --ios
node scripts/smoke-inline.cjs
node scripts/smoke-inline.cjs --ios
node scripts/smoke-editor-layout.cjs
node scripts/smoke-editor-layout.cjs --ios
node scripts/smoke-editor-layout.cjs --mobile
```

Additional integration checks:

```bash
# Run a separate Vite server with VITE_GA_MEASUREMENT_ID=G-TEST123.
URL=http://127.0.0.1:5181/voodoo/ node scripts/smoke-analytics.cjs

# Start local emulators with project demo-cliphouse, then start Vite with
# VITE_FIREBASE_EMULATORS=true and demo Firebase settings.
firebase emulators:start --project demo-cliphouse --only auth,firestore
URL=http://127.0.0.1:5182/voodoo/ node scripts/smoke-sync.cjs
```

The emulator switch is ignored in production builds. Security tests cover unauthenticated access, cross-account access, payload validation, and owner writes.

Run the browser checks against the dev server, or set `URL` to the deployed site. Media checks cover viewport autoplay, background cleanup, blocked autoplay, reduced motion, complete editor loops, and Flex text fitting. Screenshots are viewport-sized and written under `/tmp/voodoo-*`.

Inline checks edit every role in every template and verify undo, redo, and persistence. Layout checks cover mobile rotation, the fullscreen fallback, orientation requests, duplicate text values, and validation. The synthetic keyboard viewport test runs in mobile Chromium because overriding that native property crashes this Mac's WebKit test runner; physical-device keyboard behavior still needs manual confirmation.

Design reference: [Adobe's 2026 design trends](https://www.adobe.com/express/learn/blog/design-trends-2026), including tactile collage and playful typography. Playback reference: [WebKit's inline autoplay policies](https://webkit.org/blog/6784/new-video-policies-for-ios/).

## Rendering

- Remotion's downloaded headless Chrome hangs on this machine. `remotion.config.ts` and the preview script use Playwright's cached headless shell instead. To use another browser, set `REMOTION_BROWSER`.
- Remotion needs a company license above a small team size. See remotion.dev/license.
