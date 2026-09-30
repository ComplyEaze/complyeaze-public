# Release Gates

This repository should release as a public static/site artifact. It must not
require private app secrets, Prisma, Redis, BullMQ, portal automation, document
uploads, or authenticated app infrastructure.

## Required Checks

The protected `master` ruleset should require the GitHub `Public site gates` and
`Review gate` checks. `Public site gates` should stay aligned with the local
gate below; `Review gate` complements, but does not replace the review-rectify
table and maintainer review of the current diff.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm visual:check
pnpm public:check
pnpm links:check
pnpm metadata:check
git diff --check
```

Repository governance changes also require the authenticated GitHub settings
audit:

```bash
pnpm github:settings
```

The one-time default-branch migration PR may use
`pnpm github:settings --allow-main-transition` before the live cutover. That
mode still validates the complete matching branch ruleset; post-cutover
evidence must use the strict command above.

This live audit is separate from `pnpm verify` because it uses the GitHub API to
confirm repository metadata and branch-ruleset state.

Same-repository lifecycle, review, and inline review-comment events reconcile
`Review gate` immediately. Fork review/comment events may receive read-only
tokens, and review-thread resolution or reopening has no dedicated ordinary
event in this workflow. A later trusted lifecycle event or the daily all-open
repair reconciles those cases, so the expected worst-case recovery delay is one
daily interval. Daily repairs and event-driven reconciliation are serialized per
pull request so an older repair cannot publish after a newer event result.

## Release Evidence

Each release should record:

- Commit SHA.
- Build command and artifact path.
- CI artifact `public-site-build`, containing all three `apps/*/dist` Astro
  builds plus `test-results/public-build` aggregate release evidence, retained
  for 7 days.
- CI artifact `public-visual-evidence`, containing rendered screenshots and
  visual summaries with reduced-motion state, focus target, overflow, link,
  touch-target, image, blank-section, clipping, and overlap evidence retained
  for 7 days.
- Aggregate release evidence generated at
  `test-results/public-build/route-manifest.json`, matched to the three typed
  route manifests and their actual Astro HTML outputs. This evidence file is
  not a deployable route.
- Sanchika adoption evidence from the typed manifest, exact GitHub release
  tarball resolutions, package smoke test, and built CSS markers for all three
  public apps.
- Desktop and mobile screenshots.
- Accessibility and link-check results.
- Metadata, robots, sitemap, canonical, and redirect results.
- Hosted route evidence from `scripts/check-hosted-routes.mjs --base-url <url>`
  before any parent-route cleanup or production-host cutover.
- Public claim evidence.
- Dependency review evidence from `docs/DEPENDENCY_POLICY.md` when npm,
  pnpm lockfile, or GitHub Actions dependencies change.
- Review-gate fixture evidence from `scripts/test-review-gate-fixtures.mjs`
  when governance, review policy, or review-gate scripts change.
- Live repository settings evidence from `pnpm github:settings` when repository
  settings, branch rulesets, required checks, merge policy, topics, homepage,
  issues, Projects, Wiki, or Pages readiness change.
- Pages deploy evidence: Actions run URL, skipped/disabled guard status when
  `ENABLE_GITHUB_PAGES_DEPLOY` is not true, Pages environment URL when enabled,
  and confirmation that no `CNAME` or custom-domain cutover changed in the
  release.
- Rollback path.

## Deployment Posture

- Static hosting is preferred unless a reviewed feature requires server runtime.
- `Pages deploy` runs only on `master` while `ENABLE_GITHUB_PAGES_DEPLOY=true`
  and GitHub Pages is configured for GitHub Actions. `complyeaze.com` is served
  this way. Evidence from a hosted route check, plus canonical, redirect, and
  rollback evidence, is still required before any private-app route is removed
  or redirected.
- Hosted route evidence should write `test-results/hosted-routes/summary.json`
  and `test-results/hosted-routes/summary.md` for review.
- The Pages workflow must run `pnpm verify` before deploying and may upload only
  `apps/complyeaze/dist`. Axal and Pack hosting remain separate, unconfigured
  concerns.
- No production database, Redis, worker, portal, credential, or document storage
  dependency is allowed by default.
- If containerized, deployments should use immutable image digests.
- Secrets must stay in the deployment platform and never appear in source,
  examples, logs, or screenshots.

## Astro Cutover Rollback

If the manifest-only cutover regresses an unhosted public build, revert the
cutover commit to the last pre-cutover `master` revision and inspect the retained
seven-day `public-site-build` and `public-visual-evidence` artifacts. Do not
enable Pages, change DNS, or remove private-app routes as part of that rollback.
