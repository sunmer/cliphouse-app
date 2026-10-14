# cliphou.se Deployment

## Architecture

- Firebase Hosting serves the static Vite build, posters, and video loops.
- Firebase Authentication handles Google sign-in.
- Cloud Firestore stores private starred video IDs and server timestamps.
- GA4 loads automatically without a consent banner, as requested by the operator.
- GitHub remains the source repository: `sunmer/voodoo`.

The saved-video sharing service is implemented but needs verified credit coverage before activation under the operator's conditional USD 1,000 launch budget. See [sharing.md](sharing.md) and [cost-budget.md](cost-budget.md). Keep `VITE_SHARE_API_ORIGIN` unset until that service is deployed; the workflow then retains static hosting.

Project ID: `cliphouse-app`. Firestore is in `europe-north1`. GA4 property: `558014868`; web stream: `16063585293`; measurement ID: `G-P7DHJKS5RW`. Use an explicit `--project` argument for every cloud operation. Do not change the global gcloud project or use the existing Autorank backend.

## Launch Gate

Do not switch DNS until all of these checks pass:

1. Firebase is enabled on `cliphouse-app`.
2. The Google sign-in provider is enabled.
3. Firestore exists and `firestore.rules` is deployed.
4. The app has the Firebase web configuration and a real GA4 web measurement ID.
5. The Firebase-hosted URL loads the production build.
6. Google sign-in works from that URL.
7. Two different Google accounts cannot see each other's saved videos.
8. The GA4 web stream has enhanced measurement disabled. Manual page views handle hash routes. Set the property time zone to Europe/Stockholm and review data retention and sharing settings.
9. Both `cliphou.se` and `www.cliphou.se` are added in Firebase Hosting.
10. Google OAuth authorized domains and redirect URIs include the deployed auth domain. Add localhost only for development.
11. The operator has approved a public privacy contact and the privacy notice includes it. The Google login email is not automatically permission to publish it as a contact address.

The web Firebase config is public. Private Google credentials, service-account files, and OAuth secrets must not enter the repository or client bundle.

## Production Build

Populate the values documented in `.env.example`, then run:

```bash
BASE=/ npm run build
firebase deploy --project cliphouse-app --only firestore:rules,hosting
```

Use workload identity federation for GitHub Actions rather than a long-lived service-account key. Scope the identity to this repository and the production branch. Deploy rules and hosting together when their contract changes.

Keep the old GitHub Pages build on `/voodoo/` until the custom-domain site is verified. A root-base build cannot be dropped into a project subdirectory unchanged.

## Loopia

In Loopia Customer Zone, select `cliphou.se`, then open **DNS-editor**.

The Hosting API returned these site-specific records on October 7, 2026:

| Host | Type | Value |
|---|---|---|
| `@` | A | `199.36.158.100` |
| `@` | TXT | `hosting-site=cliphouse-app` |
| `www` | CNAME | `cliphouse-app.web.app` |

Both domains are registered with Firebase Hosting. `www` redirects to the apex. The current Loopia parking addresses, `194.9.94.85` and `194.9.94.86`, must be removed at `@` and `www` when applying these records. Preserve unrelated records.

- Add the ownership TXT record that Firebase supplies under `@`.
- Point `@` to the Firebase-provided A record.
- Add `www.cliphou.se` in Firebase and configure it to redirect to `cliphou.se`.
- Point `www` to the address Firebase supplies for that domain.
- Remove conflicting web A, AAAA, or CNAME records only at the names being moved.
- Keep email MX, SPF, DKIM, DMARC, and other unrelated TXT records.
- Keep Firebase's ownership TXT record after setup.
- Leave the Loopia nameservers in place. DNS records, not web forwarding, route the site.

Wait until Firebase shows **Connected** and both domains pass HTTPS checks. Certificate provisioning can take up to 24 hours after correct DNS propagation. Start the cutover before the public launch.

On October 8, 2026 (Europe/Stockholm), both domains passed strict Node TLS validation with Google Trust Services certificates listing their correct hostnames. `https://cliphou.se/` returned HTTP 200; `https://www.cliphou.se/` redirected to it over valid HTTPS. Firebase reported `HOST_ACTIVE`, `OWNERSHIP_ACTIVE`, and `CERT_PROPAGATING`; propagation can continue after one edge begins serving a valid certificate. No DNS or certificate configuration changes were needed.

## Cloudflare Edge

Cloudflare (free plan) sits in front of `cliphou.se` for caching, DDoS protection, and one rate-limit rule. Firebase Hosting remains the origin. Renders and other authenticated writes go straight to the Cloud Run origin, because Cloudflare ends proxied requests after 100 seconds.

### Cutover

1. Create the `cliphou.se` zone in Cloudflare. Add these records with the proxy **off** (DNS-only, grey cloud):
   - `A @ 199.36.158.100`
   - `CNAME www cliphouse-app.web.app`
   - `TXT @ google-site-verification=9899XtPkcRUwwXvLv1nXrEcpl8NCS5eZUYf61ZrYHhc`
   - `TXT @ hosting-site=cliphouse-app`
   Check the Loopia zone for any other record first and copy it too. On October 14, 2026 there were no MX, AAAA, or other TXT records.
2. At Loopia, replace `ns1.loopia.se` and `ns2.loopia.se` with the two Cloudflare nameservers. Wait until `dig +short NS cliphou.se` returns Cloudflare and `https://cliphou.se/` still loads with the Firebase certificate.
3. SSL/TLS: set the mode to **Full (strict)**. Leave **Always Use HTTPS** off. Firebase already redirects HTTP to HTTPS, and Firebase certificate renewal needs `http://cliphou.se/.well-known/acme-challenge/*` to reach Firebase.
4. Turn the proxy **on** (orange cloud) for `@` and `www`.
5. Add the rules below, then run the post-cutover checks.

### Rules

- **Cache rule** "Static agent and media files": match `starts_with(http.request.uri.path, "/source/") or starts_with(http.request.uri.path, "/templates/") or starts_with(http.request.uri.path, "/previews/") or starts_with(http.request.uri.path, "/assets/") or http.request.uri.path eq "/llms.txt"`. Eligible for cache, edge TTL: use the origin cache-control header. Source packages and assets are immutable for a year; repeat downloads then never reach Firebase transfer.
- **Rate limiting rule** (the free plan allows one): match `starts_with(http.request.uri.path, "/source/") or starts_with(http.request.uri.path, "/s/") or starts_with(http.request.uri.path, "/api/") or http.request.uri.path eq "/mcp"`. Counting characteristic: IP. 40 requests per 10 seconds. Action: block for 10 seconds.
- **Transform rule** (request header modification) on all incoming requests: set static header `X-Cliphouse-Edge` to the edge secret. The value must equal the latest version of Secret Manager secret `cliphouse-edge-secret`. Generate it with `openssl rand -base64 32`.
- **Bots:** leave Bot Fight Mode and "Block AI bots" off. Search crawlers and agents are wanted traffic. The rate-limit rule bounds them.

### Edge-only enforcement

The share service rejects public reads (`GET`/`HEAD` on `/s/*` and `/api/shares/<id>`, and every `/mcp` request) without the edge header when `EDGE_SECRET` is set. This closes the direct `*.run.app` bypass. Authenticated routes (`POST /api/shares`, `POST /api/exports`, `/api/keys`, `DELETE`) and `/health` stay open, because the browser calls them directly.

1. Create the secret: `printf '%s' "$VALUE" | gcloud secrets create cliphouse-edge-secret --project cliphouse-app --data-file=-`. Grant `cliphouse-share@cliphouse-app.iam.gserviceaccount.com` `roles/secretmanager.secretAccessor` on it.
2. Verify that Firebase Hosting forwards the header to Cloud Run. Deploy once with env var `EDGE_CHECK=1` and request `https://cliphou.se/api/health`. The response must contain `"edgeHeader": true`. It reports only presence, never the value. Remove `EDGE_CHECK` afterwards.
3. If `edgeHeader` is `true`, set the GitHub Actions variable `EDGE_SECRET_ENABLED=true` and redeploy. The workflow then adds `--set-secrets EDGE_SECRET=cliphouse-edge-secret:latest`.
4. If `edgeHeader` is `false`, Hosting strips the header. Do not enable `EDGE_SECRET`. The direct origin then stays reachable, bounded only by `--max-instances 2`, the per-instance lookup caches, and the MCP rate limits.

To disable enforcement later, set `EDGE_SECRET_ENABLED=false` and run `gcloud run services update cliphouse-share --region europe-west1 --project cliphouse-app --remove-secrets EDGE_SECRET`. Rotate by adding a new secret version and updating the transform rule in the same change window.

### Post-cutover checks

- `curl -sI https://cliphou.se/source/beatreel/v1.tar.gz` twice. The second response shows `cf-cache-status: HIT`.
- `/s/<id>`, `/templates/<id>/agent.json`, and `POST /mcp` work through `https://cliphou.se`.
- With enforcement on, `https://<service>.run.app/s/<id>` returns 403 and `https://<service>.run.app/health` returns 200.
- A burst of more than 40 requests in 10 seconds to `/source/` returns Cloudflare 429.
- Firebase Hosting still shows both custom domains as **Connected**. Recheck when the certificate renews.

### Rollback

Switch `@` and `www` to DNS-only in Cloudflare. Traffic returns to Firebase directly within the record TTL. If edge-only enforcement is on, disable it first, or public share reads will fail. To leave Cloudflare entirely, restore the Loopia nameservers.

## Quotas

This is a video gallery, so watch Hosting data transfer as well as Firestore reads. The free Spark plan can stop serving after its allowance is exhausted. Do not assume a social launch will remain inside that allowance. Enabling paid usage is a separate billing decision; configure budget alerts first. Budget alerts are not spending caps.

## Operational Checks

- `npm run build`
- `npm test`
- `npm run test:rules`
- `node scripts/smoke-analytics.cjs` against a test Analytics configuration
- `node scripts/smoke-sync.cjs` against local Firebase emulators
- Existing mobile, iOS, inline-edit, and media smoke tests
- Real iPhone Safari and social in-app browser checks
- Verify Analytics page views and actions in GA4 Realtime after deployment

Review the published privacy notice before launch. Account deletion requests currently require operator handling: delete that user's bookmarks, private drafts, published share records, link index, and stored thumbnails as well as the Firebase Auth user. Deleting only the Auth user does not automatically delete Firestore documents or Cloud Storage objects.

The operator requested automatic Analytics without a consent screen. Google Analytics policies and applicable local laws can still require consent or other controls. This implementation should not be represented as privacy-law compliant without review.

## References

- https://firebase.google.com/docs/hosting/custom-domain
- https://firebase.google.com/docs/hosting/usage-quotas-pricing
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/security/test-rules-emulator
- https://support.loopia.se/wiki/dnseditorn-a-och-cname/
- https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic
