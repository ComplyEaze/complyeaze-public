# ComplyEaze Public Agent Guide

## Scope

This repository owns public website, documentation, trust, release, policy, and
brand surfaces for the ComplyEaze product family.

It does not own authenticated app code, tenant data, portal automation,
credentials, document processing, Prisma, Redis/BullMQ workers, or private
deployment infrastructure.

## Public Safety Rules

- Use synthetic data only.
- Do not commit PAN, GSTIN, Aadhaar, phone numbers, taxpayer names, portal HTML,
  notices, orders, credentials, OTPs, CAPTCHA screenshots, cookies, tokens,
  downloaded documents, local browser profiles, or production screenshots.
- Do not claim government approval, statutory correctness, production readiness,
  Chrome Web Store status, or integration behavior unless the claim is backed by
  source, release, or runtime evidence in this repository.
- Preserve trademark boundaries. The code license does not grant rights to use
  ComplyEaze, Axal, Pack, Tools, or Sanchika marks in a way that implies
  endorsement, affiliation, or ownership.

## Governance Freeze

During programme Phases 0-4, do not add new recurring review crons, scorecard
dimensions, repository-settings audits, general-purpose gate frameworks,
governance-only packages, or general check scripts. Prefer consolidating
existing checks; only narrowly scoped adoption/boundary checks or replacements
for objectively broken checks are allowed.

## Design And Content Rules

- Public pages use the brand register. They should communicate clearly and
  distinctively; they are not authenticated workflow screens.
- Avoid generic SaaS landing-page patterns, unverified claims, stock-like
  compliance promises, and decorative AI motifs.
- Important public pages need desktop and mobile rendered review before commit.
- Every compliance, privacy, security, release, or product-status claim must
  have a cited source or a local evidence file.

## Review-Rectify Loop

For non-trivial changes:

1. Keep one repository and one open implementation PR active at a time.
2. Review the real diff and rendered page.
3. Classify findings as Critical, High, Medium, or Low.
4. Fix all Critical and High findings.
5. Fix Medium findings when low-cost, otherwise document follow-up scope.
6. Re-run focused checks, then broaden to the full public gate.
7. Before every commit, have fresh Claude reviewers (a Sonnet reviewer and an
   Opus critic, each a new instance started without your working notes)
   review the complete intended diff, and rectify every valid finding.
8. After every push, run a current-head review with both reviewers as new
   instances. Record each reviewer's model, round, verdict (CLEAN or NOT CLEAN),
   and findings in the PR's Review-Rectify table, and reply to and resolve every
   addressed thread. A GitHub Codex review is not required.
9. Repeat until the latest review is clean.

See `docs/REVIEW_RECTIFY.md`.

## Verification Defaults

Run the smallest relevant check first, then broaden:

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

Do not commit or request review until failures are fixed or explicitly recorded
as accepted follow-ups.
