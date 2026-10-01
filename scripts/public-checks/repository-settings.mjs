import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repositorySettingsPath = "docs/REPOSITORY_SETTINGS.md";
const ciWorkflowPath = ".github/workflows/ci.yml";
const reviewGateWorkflowPath = ".github/workflows/review-gate.yml";
const pagesDeployWorkflowPath = ".github/workflows/pages-deploy.yml";
const pullRequestTemplatePath = ".github/PULL_REQUEST_TEMPLATE.md";
const releaseGatesPath = "docs/RELEASE_GATES.md";
const reviewRectifyPath = "docs/REVIEW_RECTIFY.md";
const packageJsonPath = "package.json";
const githubSettingsScriptPath = "scripts/check-github-repository-settings.mjs";

const requiredRepositoryTerms = [
  "GitHub repository: `ComplyEaze/complyeaze-public`",
  "Visibility: public",
  "Default branch: `master`",
  "Homepage: `https://complyeaze.com`",
  "Issues: enabled",
  "Projects: disabled",
  "Wiki: disabled",
  "Topics: `complyeaze`, `public-site`, `compliance`, `open-source`, `trust`",
  "Ruleset: `Protect master`",
  "No branch deletion",
  "No non-fast-forward updates",
  "Pull request required",
  "One approving review required",
  "Code-owner review required",
  "Stale reviews dismissed on push",
  "Review thread resolution required",
  "Squash merge only",
  "Strict required status checks",
  "`Public site gates`",
  "`Review gate`",
  "not a substitute for the PR template's review-rectify evidence",
  "maintainer bypass path is limited to pull requests",
  "Keep `Pages deploy` non-required",
  "GitHub Pages is configured to use GitHub Actions",
  "`github-pages` environment has been reviewed",
  "Do not enable Projects or Wiki",
  "Do not make `master` directly pushable",
  "pnpm github:settings",
  "pnpm github:settings --allow-main-transition",
  "Live Settings Audit"
];

const requiredCiTerms = [
  "name: CI",
  "pull_request:",
  "push:",
  "- master",
  "name: Public site gates",
  "permissions:",
  "contents: read",
  "pnpm lint",
  "pnpm typecheck",
  "pnpm test",
  "pnpm build",
  "pnpm visual:check",
  "pnpm public:check",
  "pnpm links:check",
  "pnpm metadata:check",
  "git diff --check",
  "public-site-build",
  "public-visual-evidence"
];

const requiredPackageTerms = [
  "\"verify\"",
  "\"github:settings\"",
  "pnpm lint",
  "pnpm typecheck",
  "pnpm test",
  "pnpm build",
  "pnpm visual:check",
  "pnpm public:check",
  "pnpm links:check",
  "pnpm metadata:check",
  "git diff --check"
];

const requiredGithubSettingsScriptTerms = [
  "ComplyEaze/complyeaze-public",
  "--allow-main-transition",
  "acceptedDefaultBranches",
  "rulesetName",
  "protectedRef",
  "allowed_merge_methods",
  "required_approving_review_count",
  "require_code_owner_review",
  "required_status_checks",
  "Public site gates",
  "Review gate"
];

const requiredReviewGateTerms = [
  "name: Review findings gate",
  "pull_request_target:",
  "schedule:",
  "contents: read",
  "pull-requests: read",
  "statuses: write",
  "Checkout trusted default branch",
  "ref: ${{ github.event.repository.default_branch }}",
  "persist-credentials: false",
  "wait-head-review-ms 0",
  "skip-pending-status"
];

const requiredPagesDeployTerms = [
  "name: Pages deploy",
  "workflow_dispatch:",
  "push:",
  "- master",
  "contents: read",
  "pages: write",
  "id-token: write",
  "ENABLE_GITHUB_PAGES_DEPLOY",
  "name: github-pages",
  "pnpm verify",
  "path: apps/complyeaze/dist"
];

const requiredPullRequestTerms = [
  "Review-Rectify",
  "Route Migration Or Cutover",
  "No private-app route removal or redirect is claimed by this PR",
  "This PR does not enable Pages, DNS, CNAME, redirects, or parent-route cleanup",
  "Latest review has no open Critical or High findings"
];

const requiredReleaseTerms = [
  "Public site gates",
  "Review gate",
  "public-site-build",
  "public-visual-evidence",
  "ENABLE_GITHUB_PAGES_DEPLOY",
  "pnpm github:settings",
  "git diff --check",
  "not replace the review-rectify table"
];

const requiredReviewRectifyTerms = [
  "Public site gates",
  "Review gate",
  "public-site-build",
  "public-visual-evidence",
  "ENABLE_GITHUB_PAGES_DEPLOY",
  "git diff --check",
  "not replace the review-rectify table"
];

export function assertRepositorySettings(root) {
  const findings = [];
  const repositorySettings = readFile(root, repositorySettingsPath);
  const ciWorkflow = readFile(root, ciWorkflowPath);
  const reviewGateWorkflow = readFile(root, reviewGateWorkflowPath);
  const pagesDeployWorkflow = readFile(root, pagesDeployWorkflowPath);
  const pullRequestTemplate = readFile(root, pullRequestTemplatePath);
  const releaseGates = readFile(root, releaseGatesPath);
  const reviewRectify = readFile(root, reviewRectifyPath);
  const packageJson = readFile(root, packageJsonPath);
  const githubSettingsScript = readFile(root, githubSettingsScriptPath);

  assertTerms(repositorySettingsPath, repositorySettings, requiredRepositoryTerms, findings);
  assertTerms(ciWorkflowPath, ciWorkflow, requiredCiTerms, findings);
  assertTerms(reviewGateWorkflowPath, reviewGateWorkflow, requiredReviewGateTerms, findings);
  assertTerms(pagesDeployWorkflowPath, pagesDeployWorkflow, requiredPagesDeployTerms, findings);
  assertTerms(pullRequestTemplatePath, pullRequestTemplate, requiredPullRequestTerms, findings);
  assertTerms(packageJsonPath, packageJson, requiredPackageTerms, findings);
  assertTerms(githubSettingsScriptPath, githubSettingsScript, requiredGithubSettingsScriptTerms, findings);

  assertTerms(releaseGatesPath, releaseGates, requiredReleaseTerms, findings);
  assertTerms(reviewRectifyPath, reviewRectify, requiredReviewRectifyTerms, findings);

  if (!/uses: actions\/checkout@[a-f0-9]{40}/.test(ciWorkflow)) {
    findings.push(`${ciWorkflowPath}: checkout action must stay pinned to a 40-character SHA`);
  }
  if (!/uses: actions\/checkout@[a-f0-9]{40}/.test(reviewGateWorkflow)) {
    findings.push(`${reviewGateWorkflowPath}: checkout action must stay pinned to a 40-character SHA`);
  }
  if (!/uses: actions\/checkout@[a-f0-9]{40}/.test(pagesDeployWorkflow)) {
    findings.push(`${pagesDeployWorkflowPath}: checkout action must stay pinned to a 40-character SHA`);
  }
  if (existsSync(path.join(root, "CNAME")) || existsSync(path.join(root, "src", "CNAME"))) {
    findings.push("CNAME: custom-domain cutover requires a dedicated hosted-route and rollback review");
  }

  if (findings.length > 0) {
    throw new Error(`Repository settings findings:\n${findings.join("\n")}`);
  }
}

function assertTerms(filePath, text, terms, findings) {
  const normalized = normalize(text);
  for (const term of terms) {
    if (!normalized.includes(normalize(term))) {
      findings.push(`${filePath}: missing ${term}`);
    }
  }
}

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function readFile(root, filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}
