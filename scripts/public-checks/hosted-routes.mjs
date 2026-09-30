import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const scriptPath = "scripts/check-hosted-routes.mjs";
const runbookPath = "docs/HOSTING_CUTOVER.md";
const releaseGatesPath = "docs/RELEASE_GATES.md";
const migrationPath = "docs/MIGRATION.md";
const ledgerPath = "docs/ROUTE_MIGRATION_LEDGER.md";

const requiredRunbookTerms = [
  "scripts/check-hosted-routes.mjs",
  "--base-url",
  "--allow-localhost",
  "hosted route",
  "canonical",
  "redirect",
  "rollback",
  "ENABLE_GITHUB_PAGES_DEPLOY",
  "GitHub Pages",
  "parent-route cleanup"
];

const requiredScriptTerms = [
  "test-results",
  "public-build",
  "route-manifest.json",
  "hosted-routes",
  "--base-url",
  "--allow-localhost",
  "rel=\"canonical\"",
  "requestTimeoutMs",
  "redirectEvidence",
  "productionCutoverEvidence",
  "/robots.txt",
  "/sitemap.xml",
  "discoverability"
];

export function assertHostedRoutesPolicy(root) {
  const findings = [];
  const script = readRequiredFile(root, scriptPath, findings);
  const runbook = readRequiredFile(root, runbookPath, findings);
  const releaseGates = readRequiredFile(root, releaseGatesPath, findings);
  const migration = readRequiredFile(root, migrationPath, findings);
  const ledger = readRequiredFile(root, ledgerPath, findings);

  for (const term of requiredScriptTerms) {
    if (!script.includes(term)) {
      findings.push(`${scriptPath}: missing ${term}`);
    }
  }
  for (const term of requiredRunbookTerms) {
    if (!includesText(runbook, term)) {
      findings.push(`${runbookPath}: missing ${term}`);
    }
  }
  for (const [filePath, text] of [
    [releaseGatesPath, releaseGates],
    [migrationPath, migration],
    [ledgerPath, ledger]
  ]) {
    if (!includesText(text, "scripts/check-hosted-routes.mjs")) {
      findings.push(`${filePath}: missing hosted route checker reference`);
    }
    if (!includesText(text, "hosted route")) {
      findings.push(`${filePath}: missing hosted route evidence language`);
    }
  }

  if (findings.length > 0) {
    throw new Error(`Hosted route policy findings:\n${findings.join("\n")}`);
  }
}

function readRequiredFile(root, filePath, findings) {
  const absolutePath = path.join(root, filePath);
  if (!existsSync(absolutePath)) {
    findings.push(`${filePath}: missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function includesText(text, term) {
  return text.toLowerCase().includes(term.toLowerCase());
}
