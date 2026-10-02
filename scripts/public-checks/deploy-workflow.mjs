import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const workflowPath = ".github/workflows/pages-deploy.yml";
const releaseGatesPath = "docs/RELEASE_GATES.md";
const repositorySettingsPath = "docs/REPOSITORY_SETTINGS.md";

const requiredWorkflowSnippets = [
  "name: Pages deploy",
  "workflow_dispatch:",
  "push:",
  "- master"
];

const guard = "if: ${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}";

// The job that installs packages and runs the checks holds no Pages or identity-token permission; the
// deploy job holds them and runs only the Pages actions.
const requiredBuildSnippets = [guard, "pnpm verify", "path: apps/complyeaze/dist"];
const requiredDeploySnippets = [guard, "needs: build", "name: github-pages", "pages: write", "id-token: write"];
const buildPinnedActions = ["actions/upload-pages-artifact"];
const deployPinnedActions = ["actions/configure-pages", "actions/deploy-pages"];

const forbiddenSnippets = [
  "secrets.",
  "CNAME",
  "custom_domain",
  "Prisma",
  "Redis",
  "BullMQ",
  "DATABASE_URL",
  "COOKIE",
  "TOKEN"
];

function uncommented(text) {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

function jobBlock(workflow, jobName) {
  const marker = `  ${jobName}:`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";
  const nextJob = workflow.slice(start + marker.length).search(/\n  [a-zA-Z0-9_-]+:\n/);
  return nextJob === -1 ? workflow.slice(start) : workflow.slice(start, start + marker.length + nextJob);
}

export function assertDeployWorkflow(root) {
  const absolutePath = path.join(root, workflowPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing ${workflowPath}`);
  }

  const workflow = uncommented(readFileSync(absolutePath, "utf8"));
  const buildJob = jobBlock(workflow, "build");
  const deployJob = jobBlock(workflow, "deploy");
  const header = workflow.slice(0, Math.max(0, workflow.indexOf("\njobs:")));
  const releaseGates = readFileSync(path.join(root, releaseGatesPath), "utf8");
  const repositorySettings = readFileSync(path.join(root, repositorySettingsPath), "utf8");
  const findings = [];

  for (const snippet of requiredWorkflowSnippets) {
    if (!workflow.includes(snippet)) {
      findings.push(`${workflowPath}: missing ${snippet}`);
    }
  }
  if (!workflow.includes("\njobs:")) {
    findings.push(`${workflowPath}: missing jobs`);
  }
  // Workflow level: read access only, so a job added later does not inherit a Pages or identity-token grant.
  const topPermissions = /\npermissions:\n((?: {2}\S.*\n)+)/.exec(`${header}\n`)?.[1];
  if (topPermissions !== "  contents: read\n") {
    findings.push(`${workflowPath}: the workflow-level permissions must be exactly contents: read`);
  }
  for (const grant of ["id-token:", "pages:"]) {
    if (header.includes(grant)) {
      findings.push(`${workflowPath}: ${grant} must be granted to the deploy job only, not at workflow level`);
    }
  }
  const jobIds = [...workflow.slice(workflow.indexOf("\njobs:")).matchAll(/\n {2}([A-Za-z0-9_-]+):\n/g)].map((match) => match[1]);
  if (jobIds.join() !== "build,deploy") {
    findings.push(`${workflowPath}: the jobs must be exactly build and deploy, found ${jobIds.join(", ") || "none"}`);
  }
  if (!buildJob) findings.push(`${workflowPath}: missing build job`);
  if (!deployJob) findings.push(`${workflowPath}: missing deploy job`);
  for (const snippet of requiredBuildSnippets) {
    if (!buildJob.includes(snippet)) findings.push(`${workflowPath}: build job missing ${snippet}`);
  }
  for (const snippet of requiredDeploySnippets) {
    if (!deployJob.includes(snippet)) findings.push(`${workflowPath}: deploy job missing ${snippet}`);
  }
  for (const grant of ["id-token:", "pages:", "environment:"]) {
    if (buildJob.includes(grant)) findings.push(`${workflowPath}: the build job must not have ${grant}`);
  }
  // The deploy job runs the Pages actions only: no checkout, no package manager, no shell step.
  const deployUses = [...deployJob.matchAll(/uses: ([^@\s]+)@/g)].map((match) => match[1]);
  if ([...deployUses].sort().join() !== [...deployPinnedActions].sort().join()) {
    findings.push(`${workflowPath}: the deploy job may use only ${deployPinnedActions.join(" and ")}, found ${deployUses.join(", ") || "none"}`);
  }
  if (/\n\s+run:/.test(deployJob) || /\bpnpm\b|\bnode\b/.test(deployJob.replace(/node-version/g, ""))) {
    findings.push(`${workflowPath}: the deploy job must not run commands`);
  }
  for (const [job, actions, label] of [[buildJob, buildPinnedActions, "build"], [deployJob, deployPinnedActions, "deploy"]]) {
    for (const actionName of actions) {
      const pattern = new RegExp(`uses: ${escapeRegex(actionName)}@[a-f0-9]{40}`);
      if (!pattern.test(job)) {
        findings.push(`${workflowPath}: ${actionName} must be pinned to a 40-character SHA in the ${label} job`);
      }
    }
  }

  for (const snippet of forbiddenSnippets) {
    if (workflow.includes(snippet)) {
      findings.push(`${workflowPath}: forbidden deployment content ${snippet}`);
    }
  }

  for (const [filePath, text] of [
    [releaseGatesPath, releaseGates],
    [repositorySettingsPath, repositorySettings]
  ]) {
    if (!text.includes("ENABLE_GITHUB_PAGES_DEPLOY")) {
      findings.push(`${filePath}: missing Pages deploy guard variable`);
    }
    if (!text.includes("hosted route")) {
      findings.push(`${filePath}: missing hosted-route cleanup caveat`);
    }
  }

  if (findings.length > 0) {
    throw new Error(`Deploy workflow findings:\n${findings.join("\n")}`);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
