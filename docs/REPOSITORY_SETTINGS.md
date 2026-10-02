# Repository Settings

Status: active
Last verified: 2026-07-16

## Repository

- GitHub repository: `ComplyEaze/complyeaze-public`
- Visibility: public
- Default branch: `master`
- Homepage: `https://complyeaze.com`
- Issues: enabled
- Projects: disabled
- Wiki: disabled
- Topics: `complyeaze`, `public-site`, `compliance`, `open-source`, `trust`

## Master Branch Ruleset

Ruleset: `Protect master`

Required for `refs/heads/master`:

- No branch deletion.
- No non-fast-forward updates.
- Pull request required.
- One approving review required.
- Code-owner review required.
- Stale reviews dismissed on push.
- Review thread resolution required.
- Squash merge only.
- Strict required status checks.
- Required checks:
  - `Public site gates`
  - `Review gate`

`Review gate` enforces unresolved review-thread and requested-changes blockers.
It is not a substitute for the PR template's review-rectify evidence or a
maintainer review of the current diff.

The maintainer bypass path is limited to pull requests, matching the repo-family
pattern used by Sanchika.

## Maintenance Notes

- Keep `Public site gates` aligned with `pnpm verify`.
- Run `pnpm github:settings` after changing repository settings, branch
  rulesets, required checks, merge policy, topics, homepage, issues, Projects,
  Wiki, or Pages readiness.
- Keep `Review gate` pinned to the GitHub Actions integration when rulesets are
  edited.
- Keep `Pages deploy` non-required until GitHub Pages is intentionally enabled
  and a hosted route/canonical/redirect/rollback review is complete.
- Keep pull-request review-gate sync at zero wait so it reports blocker-thread
  state quickly. Do not describe it as current-head reviewer enforcement
  unless a guaranteed reviewer integration is installed and required.
- Do not enable Projects or Wiki unless the public contribution model changes.
- Do not make `master` directly pushable after the initial bootstrap commit.

## Live Settings Audit

Command:

```bash
pnpm github:settings
```

During the one-time default-branch migration PR, before the live cutover, run:

```bash
pnpm github:settings --allow-main-transition
```

The transition flag accepts either `main` or `master` as the live default but
still requires the matching `Protect main` or `Protect master` ruleset and the
complete review, merge-method, and required-check policy. Remove the flag after
the live default changes; the ordinary command remains strict for `master`.

The audit uses the GitHub CLI to verify the live
`ComplyEaze/complyeaze-public` repository metadata and `Protect master` ruleset:
public visibility, default branch, homepage, issue/project/wiki posture, topic
set, squash merge support, active `refs/heads/master` ruleset enforcement, branch
deletion and non-fast-forward protection, pull-request requirement, one approving
review, code-owner review, stale review dismissal, review-thread resolution,
`allowed_merge_methods: ["squash"]`, strict required checks, and the required
`Public site gates` and `Review gate` contexts.

This command is intentionally separate from `pnpm verify` because it requires
authenticated GitHub API access. A clean local gate proves the repository files
are internally consistent; `pnpm github:settings` proves GitHub still matches
the documented governance posture.

## GitHub Pages Deploy Guard

Workflow: `.github/workflows/pages-deploy.yml`

Status: live for `complyeaze.com`. A Pages deployment is still not treated as
evidence for private-app route cleanup.

The deploy job is disabled unless all of these are true:

- The workflow is running on `refs/heads/master`.
- Repository variable `ENABLE_GITHUB_PAGES_DEPLOY` is exactly `true`.
- GitHub Pages is configured to use GitHub Actions.
- The `github-pages` environment has been reviewed for the intended deployment
  approval policy.

When enabled, the build job runs `pnpm verify` and uploads only
`apps/complyeaze/dist` with `contents: read`; the deploy job, which runs only the
GitHub Pages actions, holds the Pages token permissions `contents: read`,
`pages: write`, and `id-token: write`. The workflow itself is limited to
`contents: read`. It must not use deployment secrets, private app variables,
Prisma, Redis, BullMQ, portal automation, document storage, custom-domain
changes, or authenticated app infrastructure.

Do not use a successful Pages deployment alone as parent-route cleanup evidence.
Cleanup still requires hosted route, canonical, redirect, and rollback evidence
recorded in the migration ledger.
