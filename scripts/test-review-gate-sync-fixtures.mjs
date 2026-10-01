#!/usr/bin/env node

import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fixtureDir = mkdtempSync(path.join(tmpdir(), "review-gate-sync-fixtures-"));
const fakeGhPath = path.join(fixtureDir, "gh");
const syncScript = path.join(root, "scripts", "sync-review-gate-status.mjs");
const repository = "ComplyEaze/complyeaze-public";
const runUrl = "https://github.test/actions/runs/123";
let scenarioCount = 0;

try {
  writeFileSync(fakeGhPath, fakeGhSource(), { encoding: "utf8", mode: 0o755 });
  chmodSync(fakeGhPath, 0o755);

  testPerPrCurrentHead();
  testPaginatedOpenList();
  testRepairWritesOneFinalStatus();
  testForeignPublisherIgnored();
  testNewerForeignStatusDoesNotHideRepair();
  testNextRepairUpdatesStaleStatus();

  console.log(`Review-gate sync fixture checks passed for ${scenarioCount} scenarios`);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

function testPerPrCurrentHead() {
  const state = baseState();
  state.pr = { number: 7, headRefOid: "HEAD7", state: "OPEN" };
  state.reviewGraphs["7"] = reviewGraph("HEAD7");
  state.currentStatuses.HEAD7 = [];
  const result = runScenario("per-pr-current-head", state, [
    "--pr", "7", "--run-url", runUrl,
  ]);

  assert(result.posts.length === 2, "per-PR run must write pending and final statuses");
  assert(
    result.posts.every((post) => post.endpoint === `repos/${repository}/statuses/HEAD7`),
    "per-PR statuses must target the current head SHA",
  );
  assert(
    result.posts.every((post) => post.fields.context === "Review gate"),
    "per-PR statuses must use the exact Review gate context",
  );
  assert(
    result.posts.every((post) => post.fields.target_url === runUrl),
    "per-PR statuses must preserve the run target URL",
  );
  assert(result.posts[0].fields.state === "pending", "per-PR run must publish pending first");
  assert(result.posts[1].fields.state === "success", "clean per-PR run must publish success");
  assert(
    result.calls.some((call) => call[0] === "pr" && call[1] === "view" && call.includes("7")),
    "per-PR run must resolve the requested pull request",
  );
}

function testPaginatedOpenList() {
  const state = baseState();
  state.openPages = [
    openPage([{ number: 11, headRefOid: "HEAD11" }], true, "CURSOR1"),
    openPage([{ number: 12, headRefOid: "HEAD12" }], false, null),
  ];
  const result = runScenario("paginated-open-list", state, ["--list-open"]);

  const listCalls = result.calls.filter(isOpenPullRequestQuery);
  assert(listCalls.length === 2, "open-PR planning must consume both pagination pages");
  assert(listCalls[1].includes("after=CURSOR1"), "second open-PR page must use the cursor");
  assert(
    JSON.stringify(JSON.parse(result.stdout)) === JSON.stringify([11, 12]),
    "open-PR planning must return every enumerated pull request number",
  );
  assert(result.posts.length === 0, "open-PR planning must not write statuses");
  assert(
    !result.calls.some((call) => call[0] === "pr" && call[1] === "view"),
    "open-PR planning must not reinterpret a missing PR number",
  );
}

function testRepairWritesOneFinalStatus() {
  const state = singlePrState(13, "HEAD13", reviewGraph("HEAD13", { blocked: true }));
  const result = runScenario("repair-final-status", state, [
    "--pr", "13", "--repair", "--skip-pending-status", "--run-url", runUrl,
  ]);

  assert(result.posts.length === 1, "repair must write one final status without pending");
  assertPost(result.posts, "HEAD13", "failure");
  assert(
    result.posts[0].fields.target_url === runUrl,
    "repair must preserve the run target URL",
  );
}

function testForeignPublisherIgnored() {
  const state = singlePrState(14, "HEAD14", reviewGraph("HEAD14"));
  state.currentStatuses.HEAD14 = [foreignStatus(10, "success")];
  const result = runScenario("foreign-publisher-ignored", state, [
    "--pr", "14", "--repair", "--skip-pending-status",
  ]);

  assert(result.posts.length === 1, "foreign publisher must not suppress the repair write");
  assertPost(result.posts, "HEAD14", "success");
}

function testNewerForeignStatusDoesNotHideRepair() {
  const state = singlePrState(16, "HEAD16", reviewGraph("HEAD16"));
  state.currentStatuses.HEAD16 = [
    foreignStatus(12, "failure"),
    status(11, "success", "No active review blockers found."),
  ];
  const result = runScenario("newer-foreign-status-repaired", state, [
    "--pr", "16", "--repair", "--skip-pending-status",
  ]);

  assert(
    result.posts.length === 1,
    "a newer foreign status must force a fresh bot repair write",
  );
  assertPost(result.posts, "HEAD16", "success");
}

function testNextRepairUpdatesStaleStatus() {
  const state = singlePrState(15, "HEAD15", reviewGraph("HEAD15"));
  state.currentStatuses.HEAD15 = [status(11, "failure", "stale prior result")];
  const result = runScenario("next-repair-updates-stale", state, [
    "--pr", "15", "--repair", "--skip-pending-status",
  ]);

  assert(result.posts.length === 1, "repair must replace a stale current-head status");
  assertPost(result.posts, "HEAD15", "success");
}

function runScenario(name, state, args) {
  scenarioCount += 1;
  const statePath = path.join(fixtureDir, `${name}.json`);
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  const result = spawnSync(
    process.execPath,
    [syncScript, "--repo", repository, "--wait-head-review-ms", "0", ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        FAKE_GH_STATE: statePath,
        PATH: `${fixtureDir}${path.delimiter}${process.env.PATH}`,
      },
      timeout: 10_000,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Review-gate sync fixture failed: ${name}\n${result.stdout}\n${result.stderr}\n${result.error ?? ""}`,
    );
  }
  return {
    ...JSON.parse(readFileSync(statePath, "utf8")),
    stdout: result.stdout,
  };
}

function baseState() {
  return {
    calls: [],
    posts: [],
    openPages: [],
    reviewGraphs: {},
    currentStatuses: {},
    nextStatusId: 100,
  };
}

function singlePrState(number, headRefOid, graph) {
  const state = baseState();
  state.pr = { number, headRefOid, state: "OPEN" };
  state.reviewGraphs[String(number)] = graph;
  state.currentStatuses[headRefOid] = [];
  return state;
}

function openPage(nodes, hasNextPage, endCursor) {
  return {
    data: {
      repository: {
        pullRequests: { pageInfo: { hasNextPage, endCursor }, nodes },
      },
    },
  };
}

function reviewGraph(headRefOid, { blocked = false } = {}) {
  return {
    data: {
      repository: {
        pullRequest: {
          headRefOid,
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: blocked
              ? [{
                  id: "thread-1",
                  isResolved: false,
                  isOutdated: false,
                  path: "src/example.mjs",
                  line: 12,
                  comments: { nodes: [] },
                }]
              : [],
          },
          reviews: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
        },
      },
    },
  };
}

function status(id, state, description = "existing status") {
  return {
    id,
    state,
    description,
    context: "Review gate",
    updated_at: `2026-07-11T00:00:${String(id).padStart(2, "0")}Z`,
    creator: { id: 41898282, login: "github-actions[bot]" },
  };
}

function foreignStatus(id, state) {
  return {
    ...status(id, state, "foreign publisher status"),
    creator: { id: 1, login: "someone-else" },
  };
}

function assertPost(posts, headRefOid, state) {
  const post = posts.find(
    (candidate) =>
      candidate.endpoint === `repos/${repository}/statuses/${headRefOid}` &&
      candidate.fields.state === state,
  );
  assert(Boolean(post), `${headRefOid} must receive ${state}`);
  assert(post.fields.context === "Review gate", `${headRefOid} must use Review gate`);
}

function isOpenPullRequestQuery(call) {
  return call.some((arg) => arg.includes("pullRequests(states:OPEN"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeGhSource() {
  return `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
const statePath = process.env.FAKE_GH_STATE;
const state = JSON.parse(readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
state.calls.push(args);
function save() { writeFileSync(statePath, JSON.stringify(state, null, 2) + "\\n"); }
function output(value) { save(); process.stdout.write(JSON.stringify(value)); process.exit(0); }
if (args[0] === "pr" && args[1] === "view") output(state.pr);
if (args[0] === "api" && args.includes("graphql")) {
  const query = args.find((arg) => arg.startsWith("query=")) || "";
  if (query.includes("pullRequests(states:OPEN")) output(state.openPages.shift());
  const numberArg = args.find((arg) => arg.startsWith("number="));
  const number = String(Number(numberArg?.slice(7)));
  output(state.reviewGraphs[number]);
}
if (args[0] === "api" && args.length === 2) {
  const match = args[1].match(/\\/commits\\/([^/]+)\\/statuses$/);
  if (match) output(state.currentStatuses[match[1]] || []);
}
if (args[0] === "api" && args.includes("-X") && args[args.indexOf("-X") + 1] === "POST") {
  const endpoint = args.find((arg) => arg.startsWith("repos/"));
  const fields = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "-f") continue;
    const field = args[index + 1];
    const separator = field.indexOf("=");
    fields[field.slice(0, separator)] = field.slice(separator + 1);
  }
  state.posts.push({ endpoint, fields });
  const head = endpoint.split("/").at(-1);
  const posted = {
    id: state.nextStatusId++,
    ...fields,
    updated_at: "2026-07-11T00:10:00Z",
    creator: { id: 41898282, login: "github-actions[bot]" },
  };
  state.currentStatuses[head] = [posted, ...(state.currentStatuses[head] || [])];
  output(posted);
}
save();
console.error("Unexpected fake gh invocation: " + JSON.stringify(args));
process.exit(99);
`;
}
