# Hosting Cutover Runbook

Status: complyeaze.com is live from this repository through GitHub Pages, and
search indexing of the pages marked `indexed` was approved on 2026-09-30 (see
the decision record at the end). Removing or redirecting private-app routes
stays blocked until the evidence below is attached to a cleanup PR.

This repository owns public pages only. A deployment, preview, or custom-domain
change does not by itself authorize removal of the private ComplyEaze app's
public routes. Parent-route cleanup starts only after hosted route, canonical,
redirect, and rollback evidence is recorded in this repo and reviewed.

## Current Posture

- GitHub Pages serves `complyeaze.com` from `apps/complyeaze/dist`. The
  custom domain is set in the repository's Pages settings and the repository
  variable `ENABLE_GITHUB_PAGES_DEPLOY` is `true`.
- `.github/workflows/pages-deploy.yml` deploys only when the workflow is running
  on `master` and `ENABLE_GITHUB_PAGES_DEPLOY` is exactly `true`.
- Axal and Pack are not hosted from this repository. `axal.`, `pack.` and
  `tools.complyeaze.com` returned HTTP 525 on 2026-09-30, so indexed routes must
  not link to them (`scripts/public-checks/astro-core-routes.mjs` enforces this).
- No `CNAME` file should be added to the repository without a separate
  reviewed DNS, redirect, and rollback plan.
- Route visibility is one field per route, `discoverability`, in
  `packages/public-content/src/complyeaze.routes.json`: `indexed` pages emit
  `index, follow` and appear in the sitemap; `unlisted` pages emit
  `noindex, follow` and stay out of it; `review-only` pages emit
  `noindex, nofollow`. `robots.txt` allows crawling so crawlers can read those
  directives.
- The public repo must not receive private app secrets, Prisma, Redis, BullMQ,
  portal automation, document storage, or authenticated app infrastructure.

## Required Evidence

For each hosted release or cleanup proposal, attach:

- Commit SHA and PR URL.
- CI run URL for `Public site gates`.
- CI artifacts `public-site-build` and `public-visual-evidence`.
- Pages run URL or preview/deployment URL.
- Hosted route evidence from:

```bash
node scripts/check-hosted-routes.mjs --base-url https://example.com
```

- Local smoke evidence, when useful, from:

```bash
node scripts/check-hosted-routes.mjs --base-url http://127.0.0.1:8000 --allow-localhost
```

- `test-results/hosted-routes/summary.json` and
  `test-results/hosted-routes/summary.md`.
- Hosted destination evidence only; redirect evidence is not checked by
  `scripts/check-hosted-routes.mjs`.
- Preview or GitHub Pages URLs do not prove production custom-domain cutover
  unless the `--base-url` origin matches the manifest origin.
- Confirmation that `/robots.txt`, `/sitemap.xml`, page titles, descriptions,
  canonical tags, Open Graph titles, and main landmarks match the local
  `test-results/public-build/route-manifest.json` release evidence. The
  aggregate evidence file is a CI artifact, not a hosted route.
- Redirect behavior for every private-app source route being removed or
  redirected.
- Rollback owner, command, or revert path.

## Cutover Steps

1. Build the public artifact with `pnpm build`.
2. Run `pnpm verify` and `git diff --check`.
3. Deploy only from reviewed `master` or an explicitly reviewed preview.
4. Run `pnpm hosted:check -- --base-url <hosted URL>` against the hosted URL.
5. Record the evidence in the PR, release note, or migration ledger update.
6. Review redirect behavior from the private app to the public destination.
7. Keep the private-app route available until hosted checks, redirects, and
   rollback evidence are clean.

## Parent-Route Cleanup Rule

Do not remove or redirect a private ComplyEaze public route unless all of these
are true:

- The destination route exists in
  `test-results/public-build/route-manifest.json`.
- The hosted destination route returns HTTP 200.
- Canonical URLs and sitemap entries point to the intended production origin.
- The old route redirect is tested and reversible.
- `docs/ROUTE_MIGRATION_LEDGER.md` and the rendered `/migration/` page identify
  the source host, source route, destination host, destination route, cleanup
  rule, evidence, and rollback.
- The latest review-rectify pass is clean for Critical and High findings.

If any item is missing, keep cleanup blocked and narrow the release to static
site readiness only.

## Decision Record: Search Indexing

- Decision: on 2026-09-30 the owner approved search-engine and AI-assistant
  indexing of the ComplyEaze public pages marked `indexed`: `/`, `/products/`,
  `/products/pack/`, `/products/tools/`, `/about/`, `/contact/`, `/trust/`,
  `/privacy/` and `/terms/`.
- Not indexed: `/docs/`, `/migration/`, `/status/`, `/changelog/`,
  `/release-evidence/` and `/sanchika/` are `unlisted`; `/review/craft/` is
  `review-only`. Any new route must declare its `discoverability`; US services
  pages stay `review-only` until their own launch blockers clear.
- Crawlers: all crawlers are allowed (`User-agent: *` with `Allow: /`); no
  crawler is named individually.
- Scope: this covers `robots.txt`, page robots directives and the sitemap. It
  does not authorize removing or redirecting any private-app route; parent-route
  cleanup remains governed by the rules above and `docs/ROUTE_MIGRATION_LEDGER.md`.
- Reversal: set the routes to `unlisted` or `review-only` and deploy, keeping
  `Allow: /` in `robots.txt` until crawlers have re-read the `noindex`
  directives (a `Disallow: /` would hide them, so already-indexed URLs would
  linger); use Search Console removals for urgent cases. Purge `/robots.txt` and
  `/sitemap.xml` from the CDN cache after every change to either.
- Go-live steps outside this repository: purge `/robots.txt` and `/sitemap.xml`
  from the Cloudflare cache after the deploy (the edge cache holds them for
  hours), and submit the sitemap in Search Console and Bing Webmaster Tools. On
  2026-09-30 the owner confirmed that no crawler is blocked in Cloudflare (Bot
  Fight Mode, Block AI bots, AI Crawl Control and managed robots.txt).
- Claims on indexed pages are backed by `docs/evidence/public-privacy-claims.md`.
