# Initial USD 1,000 Budget

The operator approved an initial USD 1,000 usage budget on October 8, 2026, conditional on eligible GCP credits covering the services. This is a cumulative launch budget, not a monthly allowance or a programmed spending cap. No automatic cutoff, budget alert, or monitoring job was configured by this change.

Use gross service costs before promotional credits to track this budget. A net invoice of zero can still consume credits. The billing account uses SEK, so USD values below are planning estimates, not an exact SEK invoice or tax calculation. Credit balance, expiry, service restrictions, and coverage for `cliphouse-app` remain unverified. Keep billing disabled until those conditions are confirmed.

## Gallery Transfer

Firebase Hosting currently includes 10 GB/month of transfer, then charges USD 0.15/GB. Both CDN hits and misses consume Hosting transfer. Browser cache hits can avoid transfer.

Measured on the public site on October 8, 2026 using `node scripts/measure-traffic.cjs`, Chromium, 900px viewport height, browser cache disabled, same-origin completed network responses:

| Visit pattern | Transfer per visit | 100,000 visits | Visits to USD 1,000 transfer |
| --- | ---: | ---: | ---: |
| Mobile first screen, 390px | 1.07 MB | About USD 15 | About 6.2 million |
| Desktop first screen, 1440px | 2.01 MB | About USD 29 | About 3.3 million |
| Scroll the entire 28-video gallery | 5.99 MB | About USD 88 | About 1.1 million |

Formula: `max(0, visits * MB_per_visit / 1000 - 10) * 0.15`.

These are transferred-byte estimates, not unique visitors or a total-service guarantee. Incomplete/cancelled responses are not included in the measurement. Browsing more pages, opening editors, fresh sessions, bots, screenshots fetched by link crawlers, repeated downloads, or a larger catalog change the result. Rerun the measurement after substantial catalog or client changes. Monthly free allowances are small enough here that ignoring them is a reasonable conservative approximation for a cumulative launch budget.

Reserve at least USD 200 for other usage when planning from traffic alone. A USD 800 transfer allowance corresponds to approximately 5 TB and 890,000 full-gallery visits. Review at USD 500 actual gross spend, and make a stop/continue decision by USD 800. These are operator checkpoints, not configured alerts. A sudden traffic spike can cross both checkpoints quickly.

For scale: 100,000 full-gallery visits per day would use about USD 90/day in Hosting transfer, so approximately 11 days would consume USD 1,000 in transfer alone.

## Thumbnail Publishing

Each share stores animation props and one JPEG, not a rendered MP4. Website playback uses the existing browser player. Local sample JPEGs were 25-29 KB; the backend caps a JPEG at 1 MB.

For the proposed request-billed Cloud Run configuration (2 vCPU, 2 GiB):

- CPU: USD 0.000024 per active vCPU-second.
- Memory: USD 0.0000025 per active GiB-second.
- Combined CPU/memory estimate: USD 0.000053 per active instance-second.
- At an assumed 10-30 active seconds per thumbnail, 1,000 thumbnails use about USD 0.53-1.59 of compute, before free allowances.

This is an assumption, not a production benchmark. Cold starts, browser setup, failed renders, and upload time count. Also budget for requests, Firestore reads/writes, storage and operations, network transfer, builds, container images, and logging. No free-tier allowance is assumed to be fully available across other projects.

The application currently permits 100 new render attempts per project per UTC day and 10 per user, including failures. That is an initial capacity guardrail, not a total cost ceiling. Saving privately does not render a thumbnail. Repeated shares of an identical edit reuse its completed result. Public view requests still generate work and transfer.

Firebase Auth currently reports `FIREBASE_AUTH`, not Identity Platform. Do not silently upgrade to Identity Platform or enable phone/SMS authentication: those changes can introduce different charges.

## Personalized Previews

`render_preview` renders one 900 px JPEG per new set of props. Identical props reuse the stored file. The share service runs with `--min-instances 1` so the first preview of the day does not wait for a cold start and a browser launch. One idle instance at 2 vCPU and 2 GiB costs roughly USD 0.0000064 per second (idle rate, request-based billing) before free allowances, about USD 17 per month. Check the Cloud Run bill after the first week.

Local timings (Apple Silicon, 2026-10-15), with the persistent preview browser already open:

| Engine | Template | Render |
| --- | --- | --- |
| Remotion | `apppromo-mobile-app` | 1.1 s |
| Remotion | `wordmark-reveal` | 0.8 s |
| HyperFrames (`snapshot`) | `featuredrop-launch` | 3.6 s |
| HyperFrames (`snapshot`) | `signal-orbit` | 2.8 s |

The browser warm-up at startup took 1.4-3.3 s. Posters were 15-62 KB. Record Cloud Run cold and warm times here after deploy: the `ms` field of `events` documents with `type: preview` holds each render time, and `scripts/search-report.mjs` reports p50 and p90 per engine.

Daily limits count renders, not cache hits: 60 per IP, 300 per API key, 4,000 per project. A tailored grid (`render_previews`) uses up to 4 renders per search. At 4,000 renders of about 3 active seconds, compute is about USD 0.64 per day.

## Sources

- https://firebase.google.com/docs/hosting/usage-quotas-pricing
- https://cloud.google.com/run/pricing
- https://firebase.google.com/pricing
- https://cloud.google.com/firestore/pricing
- https://cloud.google.com/storage/pricing
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://docs.cloud.google.com/billing/docs/how-to/resolve-issues
