# Shared Videos

## Status

The implementation is locally tested. Production publishing remains disabled. The operator approved thumbnail-first sharing and private saves, and an initial USD 1,000 budget conditional on GCP credit coverage. They did not request a programmed cap. Before enabling paid services, verify the existing credit balance, expiry, and eligible services. See [cost-budget.md](cost-budget.md) for traffic thresholds and limitations. An unset `VITE_SHARE_API_ORIGIN` shows an unavailable state instead of generating a broken link.

A read-only check on October 7, 2026 confirmed that `cliphouse-app` has no billing account attached and billing is disabled. The account API does not return the promotional credit ledger. The remaining credit amount, expiry, and service scope still need verification in Billing > Credits. No billing settings were changed.

## Contract

- Gallery cards show Edit and Star controls. Featured uses catalog order; there are no fabricated popularity metrics.
- Anonymous editing keeps device-local drafts. Save requires Google sign-in and writes a private account draft without rendering media. The original edit survives the sign-in popup, including cancellation and retry.
- Successful Save routes to `#/d/<id>`. Saved videos in the account reopen these private drafts; the gallery's Starred filter is only for bookmarks. Deleting a private draft does not delete published snapshots.
- Share saves a private draft before publishing, then routes to the published snapshot with its link dialog open. Authentication resumes the requested action automatically.
- Publishing requires a verified Google Firebase account. Browsing a shared link requires no account.
- `POST /api/shares` validates the exact text/color schema, then renders one JPEG. A retry of the same user's edit and render version reuses the completed link.
- `/s/<random-id>` serves actual HTML Open Graph metadata, not hash-route metadata or a JavaScript redirect.
- The JPEG is specific to the published edit. Link metadata includes an image, not an MP4. Playback happens in the website's existing animation player using immutable saved props.
- Thumbnail delivery supports byte ranges and HEAD requests. Each rendered JPEG is capped at 1 MB.
- `GET /api/shares/<id>` returns public composition data, never account identifiers.
- `DELETE /api/shares/<id>` requires its owner's token. First-party caches expire after one minute; external copies cannot be recalled.
- Published links appear under the account. The newest 20 are shown. Local unpublished drafts remain separate from shared compositions.
- `POST /api/exports` requires the same verified Google identity and exact schema validation as publishing, then renders one full-resolution, silent H.264 MP4 (CRF 18, `yuv420p`). A retry of the same user's edit and render version reuses the completed file for up to 6 days. The response contains a V4 signed Cloud Storage URL that expires after 10 minutes, so MP4 bytes never stream through Cloud Run and a leaked link stops working quickly. A lifecycle rule (`storage-lifecycle.json`) deletes `exports/` objects after 7 days; published thumbnails under `shares/` are kept. The editor shows the Download MP4 button only when `VITE_SHARE_API_ORIGIN` is set, and records `mp4_export` after a successful export.

## Storage And Limits

`users/{uid}/drafts/{id}` stores private saved edits with a bounded JSON payload, title, template variant ID, and server timestamp. Only its verified Google owner can read or write it. Client validation checks the template schema on save and load; the publishing backend independently validates every field before rendering.

`shares/{id}` stores the immutable composition and its owner. `users/{uid}/shares/{id}` stores the owner's private link index. `shareJobs/{digest}` stores retry state. `exports/{id}` and `exportJobs/{digest}` store MP4 export records. Cloud Storage holds private `shares/{id}/preview.jpg` and `exports/{id}/video.mp4` objects. The server serves thumbnails. MP4s are read only through short-lived signed URLs.

Public share lookups and their 404 results are cached for 60 seconds per instance. Public 404 responses carry `s-maxage=300`, so the Hosting CDN absorbs repeated probes of the same ID. Requests to the direct Cloud Run origin bypass the CDN; `--max-instances 2` bounds them.

Account gate (`src/services/gate.ts`, `FREE_VIDEOS = 3`). Signed-out visitors browse the gallery and SEO pages freely. Opening a catalog video in the editor counts once per distinct video in `localStorage`. The 2nd distinct video shows a dismissible prompt once ("Not now"). Opening a 4th new video shows a gate that Escape and backdrop clicks do not close. It offers "Sign in with Google" and "Back to gallery", and the editor stays paused and inert behind it. The first three videos stay open without a gate. After sign-in, the gate closes and the edit continues. Shared links, saved drafts, agent handoff links (`?props=`), automated browsers, and builds without Firebase are never gated. The gate is a conversion tool, not a cost control: bots do not run client code, and clearing site data resets it. Events: `signup_prompt_show`, `signup_prompt_dismiss`, `signup_gate_show`, `signup_gate_back`, and `login` with `source: signup_prompt` or `signup_gate`.

Public share reads from the browser use the same-origin path `/api/shares/<id>` (Cloudflare, then the Hosting rewrite) in production, so they get edge caching and rate limits. Publishing, export, API key, and delete calls use the direct Cloud Run origin. See [deployment.md](deployment.md#cloudflare-edge) for edge-only enforcement.

MP4 export shares the one-render-per-instance lock with thumbnails. It allows 10 attempts per user and 200 per project per UTC day, set by `EXPORTS_PER_USER_DAY` and `EXPORTS_PER_DAY`. A local 8-second 1080 by 1920 export took 9 seconds and produced a 638 KB file. Cloud Run timing still needs a production measurement.

The server permits one active render per instance, 10 render attempts per user per UTC day, and 100 per project per day. Firestore transactions enforce the daily limits across instances. Failed attempts count. Ready retries do not. Cloud Run should use two CPUs, 2 GiB memory, zero minimum instances, at most two instances, concurrency eight, and a 300-second timeout. Budget alerts are not a spending cap.

These render limits do not cap total spending: public reads, bandwidth, private draft writes, build jobs, and stored files can also generate usage. Credits can expire or have service restrictions. Do not promise a zero-charge guarantee from alerts or render limits.

Do not enable public bucket access. Do not grant clients Firestore writes to share collections. Do not allow emulator environment variables in Cloud Run.

## Production Activation

1. Verify credit scope, balance, and expiry before attaching billing under the conditional USD 1,000 launch approval. Do not imply that an alert or application quota enforces the budget.
2. Validate the active gcloud identity and token. Keep using explicit `--project cliphouse-app`.
3. Link the approved billing account. Enable Cloud Run, Cloud Build, Artifact Registry, and Cloud Storage APIs.
4. Create `cliphouse-app-shares` in `europe-west1` with uniform bucket-level access and public-access prevention. Apply `gcloud storage buckets update gs://cliphouse-app-shares --lifecycle-file=storage-lifecycle.json`. It deletes only `exports/`; do not add rules that delete published `shares/` objects.
5. Create `cliphouse-share@cliphouse-app.iam.gserviceaccount.com`. Grant project `roles/datastore.user` and `roles/firebaseauth.viewer`, plus bucket-scoped `roles/storage.objectUser`. Grant it `roles/iam.serviceAccountTokenCreator` on itself so it can sign export URLs through the IAM `signBlob` API, and enable the IAM Service Account Credentials API. Do not use a service-account key.
6. Grant the existing keyless GitHub deploy identity only the roles needed to build and deploy this service, including service-account-user on the runtime identity. Configure the Cloud Build identity's artifact and logging permissions. Do not widen access to other projects.
7. Build the frontend with `BASE=/` and the Firebase web configuration. Deploy the Dockerfile as `cliphouse-share` in `europe-west1`. Use the resource settings above and environment variables from the workflow. The first deployment establishes the direct Cloud Run HTTPS origin.
8. Set GitHub Actions variable `VITE_SHARE_API_ORIGIN` to that HTTPS origin. This variable activates the conditional share deployment and selects `firebase.sharing.json` on future pushes. Render requests use the direct origin because Firebase Hosting has a 60-second request limit.
9. Rebuild and deploy the frontend and service together so the Vite asset manifest matches. The share page reads `dist/.vite/manifest.json`; the Docker build must include hidden `.vite` files. `.gcloudignore` and `.dockerignore` exclude local secrets.
10. Enable Firebase's Google provider after approval of its public support contact. Verify authorized domains and a real Google login.
11. Test private save and reopen, publishing, logged-out viewing, thumbnails, account isolation, repeat publishing, and owner deletion on the deployed service. Test an actual iMessage thumbnail on an iPhone. Check DNS and HTTPS last.

Existing `firebase.json` deliberately retains static-only hosting until activation. Do not deploy that config after enabling sharing: use `firebase.sharing.json` or the conditional workflow.

## Verification

```sh
npm run build
npx tsc -p tsconfig.server.json
npm run test:sharing
npm run test:rules
npm run build:sharing
node scripts/smoke-sharing.cjs
node scripts/smoke-sharing.cjs --ios
node scripts/smoke-saving.cjs
node scripts/smoke-saving.cjs --ios
```

The browser tests default to a root-base Vite server on port 5183 with a configured share API origin. The saving test requires Auth and Firestore emulators. `TEST_LOGIN=true` adds Google emulator login, a real private-draft write, a failed publish, and a successful retry using an intercepted publishing response. API tests and real rendering are separate checks; these mocks do not prove production Cloud Run or iMessage behavior. Run emulator-login browser scripts serially to avoid account-picker updates from concurrent test-account creation.

Source references:

- https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages
- https://firebase.google.com/docs/hosting/cloud-run
- https://www.remotion.dev/docs/renderer/render-still
- https://docs.cloud.google.com/billing/docs/how-to/resolve-issues
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
