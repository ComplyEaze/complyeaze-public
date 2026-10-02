import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseWorkflowYaml } from "./workflow-yaml.mjs";

const workflowPath = ".github/workflows/pages-deploy.yml";
const releaseGatesPath = "docs/RELEASE_GATES.md";
const repositorySettingsPath = "docs/REPOSITORY_SETTINGS.md";

const guard = "${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}";
const pinned = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/;
// The reviewed commits of the Pages actions. The two in the deploy job are the only code that runs with the
// identity token, and GitHub resolves owner/repo@sha even for a commit that exists only in a fork, so a 40-hex
// shape is not enough: any change to one of these SHAs must change this list in the same pull request.
const reviewedPagesActions = {
  "actions/configure-pages": "45bfe0192ca1faeb007ade9deae92b16b8254a0d",
  "actions/deploy-pages": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
  "actions/upload-pages-artifact": "fc324d3547104276b827a68afc52ff2a11cc49c9",
};
const sameSet = (actual, expected) => actual.length === expected.length && expected.every((item) => actual.includes(item));
const sameMap = (actual, expected) => JSON.stringify(Object.entries(actual ?? {}).sort()) === JSON.stringify(Object.entries(expected).sort());

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

function pagesWorkflowFindings(workflow) {
  const findings = [];
  const must = (condition, message) => { if (!condition) findings.push(`${workflowPath}: ${message}`); };
  must(sameSet(Object.keys(workflow), ["name", "on", "permissions", "concurrency", "jobs"]), "the top-level keys must be exactly name, on, permissions, concurrency and jobs");
  must(workflow.name === "Pages deploy", "name must be Pages deploy");
  // A closed trigger set: a push to master and a manual run, nothing else.
  must(sameSet(Object.keys(workflow.on ?? {}), ["workflow_dispatch", "push"]), "the triggers must be exactly push and workflow_dispatch");
  must(workflow.on?.workflow_dispatch === null, "workflow_dispatch takes no inputs");
  must(JSON.stringify(workflow.on?.push) === JSON.stringify({ branches: ["master"] }), "push must be limited to the master branch");
  // Workflow level: read access only, so a job added later does not inherit a Pages or identity-token grant.
  must(sameMap(workflow.permissions, { contents: "read" }), "the workflow-level permissions must be exactly contents: read");
  must(sameMap(workflow.concurrency, { group: "pages-deploy", "cancel-in-progress": "false" }), "the concurrency group must be pages-deploy without cancelling");
  const jobs = workflow.jobs ?? {};
  must(sameSet(Object.keys(jobs), ["build", "deploy"]), `the jobs must be exactly build and deploy, found ${Object.keys(jobs).join(", ") || "none"}`);
  const { build, deploy } = jobs;
  if (!build || !deploy) return findings;

  // The job that installs packages and runs the checks holds only read access and no environment.
  must(sameSet(Object.keys(build), ["name", "if", "runs-on", "permissions", "steps"]), "the build job may have only name, if, runs-on, permissions and steps");
  must(build.if === guard, "the build job's if must be exactly the master-and-variable guard");
  must(build["runs-on"] === "ubuntu-latest", "the build job must run on ubuntu-latest, a GitHub-hosted runner");
  must(sameMap(build.permissions, { contents: "read" }), "the build job's permissions must be exactly contents: read");
  const buildSteps = Array.isArray(build.steps) ? build.steps : [];
  must(buildSteps.length > 0 && buildSteps.every((step) => step && typeof step === "object" && (step.uses === undefined) !== (step.run === undefined)), "every build step must have exactly one of uses and run");
  for (const step of buildSteps) {
    if (step?.uses !== undefined) must(pinned.test(step.uses), `build step uses ${step.uses}, which must be a repository action pinned to a 40-character SHA`);
  }
  must(buildSteps.some((step) => step.run === "pnpm verify"), "the build job must run pnpm verify");
  const upload = buildSteps.find((step) => step.uses?.startsWith("actions/upload-pages-artifact@"));
  must(upload && upload.with?.path === "apps/complyeaze/dist", "the build job must upload apps/complyeaze/dist with actions/upload-pages-artifact");

  // The job that holds the Pages and identity-token permissions runs only the two Pages actions.
  must(sameSet(Object.keys(deploy), ["name", "needs", "if", "runs-on", "permissions", "environment", "steps"]), "the deploy job may have only name, needs, if, runs-on, permissions, environment and steps");
  must(deploy.needs === "build", "the deploy job must need the build job");
  must(deploy.if === guard, "the deploy job's if must be exactly the master-and-variable guard");
  must(deploy["runs-on"] === "ubuntu-latest", "the deploy job must run on ubuntu-latest, a GitHub-hosted runner");
  must(sameMap(deploy.permissions, { contents: "read", pages: "write", "id-token": "write" }), "the deploy job's permissions must be exactly contents: read, pages: write and id-token: write");
  must(sameMap(deploy.environment, { name: "github-pages", url: "${{ steps.deployment.outputs.page_url }}" }), "the deploy job's environment must be github-pages with the deployment step's page url");
  const deploySteps = Array.isArray(deploy.steps) ? deploy.steps : [];
  must(deploySteps.length === 2, "the deploy job must have exactly two steps");
  for (const step of deploySteps) {
    must(step && typeof step === "object" && Object.keys(step).every((key) => ["name", "id", "uses"].includes(key)) && typeof step.uses === "string",
      "each deploy step may have only a name, an id and a uses: no commands, inputs or environment");
  }
  must(deploySteps.every((step) => pinned.test(step?.uses ?? "")), "each deploy step must use a repository action pinned to a 40-character SHA");
  must(deploySteps.map((step) => step?.uses?.split("@")[0]).join() === "actions/configure-pages,actions/deploy-pages", "the deploy job must use exactly actions/configure-pages then actions/deploy-pages");
  for (const step of [...deploySteps, ...(upload ? [upload] : [])]) {
    const [action, sha] = String(step?.uses).split("@");
    must(reviewedPagesActions[action] === sha, `${action} must be the reviewed commit ${reviewedPagesActions[action]}, found ${sha}`);
  }
  must(deploySteps[1]?.id === "deployment", "the deploy-pages step must have the id deployment");
  return findings;
}

export function assertDeployWorkflow(root) {
  const absolutePath = path.join(root, workflowPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing ${workflowPath}`);
  }

  const text = readFileSync(absolutePath, "utf8");
  const releaseGates = readFileSync(path.join(root, releaseGatesPath), "utf8");
  const repositorySettings = readFileSync(path.join(root, repositorySettingsPath), "utf8");
  const findings = [];

  let workflow = null;
  try {
    workflow = parseWorkflowYaml(text);
  } catch (error) {
    findings.push(`${workflowPath}: could not be read as a workflow this check understands: ${error.message}`);
  }
  if (workflow && typeof workflow === "object") findings.push(...pagesWorkflowFindings(workflow));

  for (const snippet of forbiddenSnippets) {
    if (uncommented(text).includes(snippet)) {
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
