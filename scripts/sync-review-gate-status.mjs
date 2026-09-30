#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const repo = readArgValue("--repo") ?? process.env.GITHUB_REPOSITORY;
const explicitPr = readArgValue("--pr");
const listOpen = args.has("--list-open");
const repair = args.has("--repair");
const runUrl = readArgValue("--run-url");
const waitHeadReviewMs = readNonNegativeIntegerArg("--wait-head-review-ms", 0);
const pollIntervalMs = readNonNegativeIntegerArg("--poll-interval-ms", 10_000);
const strictHeadReview = args.has("--strict-head-review");
const allowMissingHeadReview = args.has("--allow-missing-head-review");
const skipPendingStatus = args.has("--skip-pending-status");
const requiredReviewAuthor = readArgValue("--required-review-author");
const REVIEW_GATE_CONTEXT = "Review gate";
const REVIEW_GATE_CREATOR = "github-actions[bot]";
const ALLOWED_MISSING_HEAD_REVIEW_MARKER =
  "review-gate:allowed-missing-head-review";

run();

function run() {
  if (!repo || !repo.includes("/")) fail("Pass --repo owner/name.");
  if (listOpen) {
    if (explicitPr || repair) {
      fail("--list-open cannot be combined with --pr or --repair.");
    }
    console.log(
      JSON.stringify(listOpenPullRequests().map((pullRequest) => pullRequest.number)),
    );
    return;
  }
  if (!explicitPr || !Number.isInteger(Number(explicitPr))) {
    fail("Pass --pr <number>.");
  }

  const target = readPullRequest(Number(explicitPr));
  if (target.state && target.state !== "OPEN") {
    console.log(`Skipping PR #${target.number} because it is ${target.state}.`);
    return;
  }

  if (!skipPendingStatus && !repair) {
    setReviewGateStatus(
      target,
      "pending",
      "Review gate is evaluating review state.",
    );
  }
  const evaluation = evaluateReviewGate(target);
  setReviewGateStatus(target, evaluation.state, evaluation.description);
  if (!repair && evaluation.state === "failure") process.exitCode = 1;
}

function evaluateReviewGate(target) {
  const result = runReviewGate(target);
  if (!result.ok) {
    return {
      state: "failure",
      description:
        "Unresolved thread, requested changes, or missing current-head review found.",
    };
  }
  return {
    state: "success",
    description: result.allowedMissingHeadReview
      ? "No active review blockers; no current-head GitHub review found."
      : "No active review blockers found.",
  };
}

function readPullRequest(number) {
  return runJson([
    "pr",
    "view",
    String(number),
    "--repo",
    repo,
    "--json",
    "number,headRefOid,state",
  ]);
}

function listOpenPullRequests() {
  const [owner, name] = repo.split("/");
  const pullRequests = [];
  let after = null;

  while (true) {
    const page = runJson([
      "api",
      "graphql",
      "-F",
      `owner=${owner}`,
      "-F",
      `name=${name}`,
      ...(after ? ["-F", `after=${after}`] : []),
      "-f",
      after
        ? "query=query($owner:String!,$name:String!,$after:String!){repository(owner:$owner,name:$name){pullRequests(states:OPEN,first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{number headRefOid}}}}"
        : "query=query($owner:String!,$name:String!){repository(owner:$owner,name:$name){pullRequests(states:OPEN,first:100){pageInfo{hasNextPage endCursor} nodes{number headRefOid}}}}",
    ]);
    const pageData = page.data?.repository?.pullRequests;
    if (!pageData) fail(`Could not list open pull requests for ${repo}.`);

    pullRequests.push(...pageData.nodes);
    if (!pageData.pageInfo?.hasNextPage) return pullRequests;
    after = pageData.pageInfo.endCursor;
  }
}

function runReviewGate(target) {
  const gateArgs = [
    fileURLToPath(new URL("./check-pr-review-gate.mjs", import.meta.url)),
    "--repo",
    repo,
    "--pr",
    String(target.number),
    "--wait-head-review-ms",
    String(waitHeadReviewMs),
    "--poll-interval-ms",
    String(pollIntervalMs),
    "--expected-head-oid",
    target.headRefOid,
  ];

  if (strictHeadReview) gateArgs.push("--strict-head-review");
  if (allowMissingHeadReview) gateArgs.push("--allow-missing-head-review");
  if (requiredReviewAuthor) {
    gateArgs.push("--required-review-author", requiredReviewAuthor);
  }

  try {
    const output = execFileSync(process.execPath, gateArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(output);
    return {
      ok: true,
      allowedMissingHeadReview: output.includes(
        ALLOWED_MISSING_HEAD_REVIEW_MARKER,
      ),
    };
  } catch (error) {
    const failure = error;
    process.stdout.write(String(failure.stdout ?? ""));
    process.stderr.write(String(failure.stderr ?? ""));
    return { ok: false, allowedMissingHeadReview: false };
  }
}

function setReviewGateStatus(target, state, description) {
  const latestStatus = readLatestReviewGateStatus(target);
  if (
    isReviewGateCreator(latestStatus) &&
    latestStatus?.state === state &&
    latestStatus?.description === description
  ) {
    console.log(
      `Review gate status already ${state} for #${target.number}; skipping duplicate write.`,
    );
    return null;
  }

  return postReviewGateStatus(target, state, description, runUrl);
}

function postReviewGateStatus(target, state, description, targetUrl) {
  return runJson([
    "api",
    "-X",
    "POST",
    `repos/${repo}/statuses/${target.headRefOid}`,
    "-f",
    `state=${state}`,
    "-f",
    `context=${REVIEW_GATE_CONTEXT}`,
    ...(description ? ["-f", `description=${description}`] : []),
    ...(targetUrl ? ["-f", `target_url=${targetUrl}`] : []),
  ]);
}

function readLatestReviewGateStatus(target) {
  return readReviewGateStatuses(target)[0] ?? null;
}

function readReviewGateStatuses(target) {
  const statuses = runJson([
    "api",
    `repos/${repo}/commits/${target.headRefOid}/statuses`,
  ]);
  return statuses.filter((status) => status.context === REVIEW_GATE_CONTEXT);
}

function isReviewGateCreator(status) {
  return (
    String(status?.creator?.login ?? "").toLowerCase() === REVIEW_GATE_CREATOR
  );
}

function readArgValue(name) {
  const index = rawArgs.indexOf(name);
  if (index === -1) return undefined;
  const value = rawArgs[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function readNonNegativeIntegerArg(name, fallback) {
  const rawValue = readArgValue(name);
  if (rawValue === undefined) return fallback;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 0)
    fail(`${name} must be a non-negative integer.`);
  return value;
}

function runJson(ghArgs) {
  return JSON.parse(runText(ghArgs));
}

function runText(ghArgs) {
  return execFileSync("gh", ghArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
