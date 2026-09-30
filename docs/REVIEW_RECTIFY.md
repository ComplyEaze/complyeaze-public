# Review-Rectify Policy

Use this policy for every non-trivial change before commit, PR, or deployment.

## Severity

- Critical: secret or real taxpayer data exposure, misleading government or
  statutory claim, malicious link/download behavior, or trademark misuse that
  implies official endorsement.
- High: unsupported security/privacy/release claim, unsupported parent-route
  cleanup or cutover claim, broken primary public route, inaccessible critical
  page state, unsafe form behavior, or failed visual gate on a launch-critical
  page.
- Medium: broken secondary link, incomplete responsive state, weak empty/error
  state, unclear evidence, stale copy, or maintainability issue with realistic
  public impact.
- Low: wording, formatting, small layout polish, or local cleanup.

## Loop

1. Keep one repository and one open implementation PR active at a time.
2. Review the diff, rendered pages, screenshots, and current branch.
3. Record findings with severity, file or URL, evidence, and proposed fix.
4. Fix all Critical and High findings.
5. Fix Medium findings when low-cost; otherwise record a follow-up with owner
   and reason.
6. Re-run focused checks.
7. Run the full public gate.
8. Before every commit, have fresh Claude reviewers (a Sonnet reviewer and an
   Opus critic, each a new instance started without your working notes) review
   the complete intended diff. Rectify valid findings and rerun affected checks
   before committing.
9. After every push, run a current-head review with both reviewers as new
   instances. Record each reviewer's model, round, verdict (CLEAN or NOT CLEAN),
   and findings in the PR's Review-Rectify table. Reply to and resolve addressed
   threads, then repeat the loop for any valid finding. A GitHub Codex review is
   not required.
10. Link or cite the `public-site-build` and `public-visual-evidence` CI
   artifacts when the change affects routes, rendering, release evidence, or
   deployment posture.
11. Repeat until the review has no open Critical or High findings.

## Full Public Gate

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

The GitHub `Review gate` status enforces unresolved review-thread and
requested-changes blockers only. It does not require any particular reviewer,
and it does not verify the Claude reviewer verdicts: the author records those in
the pull request, and the maintainer checks them. It does not replace the
review-rectify table in the pull request or the maintainer's current-diff
review.

The GitHub `Public site gates` status should run the full public gate for every
pull request and `master` push. A skipped or successful Pages deploy is not
release or cleanup evidence unless `ENABLE_GITHUB_PAGES_DEPLOY` is intentionally
enabled and the hosted-route, redirect, rollback, and migration-ledger evidence
is reviewed.

`pnpm test` runs `scripts/test-review-gate-fixtures.mjs`, which proves the local
review gate fails unresolved threads, current-head requested changes, and
missing strict current-head reviews while allowing current-head approvals that
clear stale requested changes. This fixture test is offline and must not require
GitHub tokens or live PR state.

## Visual Gate

Visual review must cover:

- Desktop, tablet, and mobile widths.
- Header, navigation, footer, and primary content.
- Long words, long product names, long URLs, and policy pages.
- Reduced-motion behavior.
- Keyboard focus and visible focus states.
- Contrast and text legibility.
- No broken images, blank sections, overlap, or clipped controls.
- Synthetic data only.
