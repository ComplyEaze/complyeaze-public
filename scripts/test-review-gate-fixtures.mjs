#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const fixtureDir = mkdtempSync(path.join(tmpdir(), "review-gate-fixtures-"));
const fakeBinDir = path.join(fixtureDir, "bin");
const gateScript = path.join(root, "scripts", "check-pr-review-gate.mjs");

mkdirSync(fakeBinDir, { recursive: true });
writeFileSync(
  path.join(fakeBinDir, "gh"),
  "#!/usr/bin/env sh\necho 'unexpected gh invocation' >&2\nexit 99\n",
  "utf8",
);
chmodSync(path.join(fakeBinDir, "gh"), 0o755);

const cases = [
  {
    name: "passes clean current-head approval",
    expectedExit: 0,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [review({ state: "APPROVED", author: "codex", commit: "HEAD" })]
    })
  },
  {
    name: "passes resolved and outdated threads",
    expectedExit: 0,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      threads: [
        thread({ isResolved: true, isOutdated: false }),
        thread({ isResolved: false, isOutdated: true })
      ],
      reviews: [review({ state: "APPROVED", author: "codex", commit: "HEAD" })]
    })
  },
  {
    name: "fails unresolved current thread",
    expectedExit: 1,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      threads: [thread({ isResolved: false, isOutdated: false })],
      reviews: [review({ state: "APPROVED", author: "codex", commit: "HEAD" })]
    })
  },
  {
    name: "fails current-head requested changes",
    expectedExit: 1,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [review({ state: "CHANGES_REQUESTED", author: "codex", commit: "HEAD" })]
    })
  },
  {
    name: "fails current-head requested changes followed by stale approval",
    expectedExit: 1,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [
        review({
          state: "CHANGES_REQUESTED",
          author: "codex",
          commit: "HEAD",
          submittedAt: "2026-07-08T00:00:00Z"
        }),
        review({
          state: "APPROVED",
          author: "codex",
          commit: "OLD",
          submittedAt: "2026-07-08T00:01:00Z"
        })
      ]
    })
  },
  {
    name: "fails missing current-head review in strict mode",
    expectedExit: 1,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [review({ state: "APPROVED", author: "codex", commit: "OLD" })]
    })
  },
  {
    name: "passes when stale requested changes are cleared on current head",
    expectedExit: 0,
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [
        review({
          state: "CHANGES_REQUESTED",
          author: "codex",
          commit: "OLD",
          submittedAt: "2026-07-08T00:00:00Z"
        }),
        review({
          state: "APPROVED",
          author: "codex",
          commit: "HEAD",
          submittedAt: "2026-07-08T00:01:00Z"
        })
      ]
    })
  },
  {
    name: "fails when expected head changes",
    expectedExit: 1,
    expectedHeadOid: "OTHER",
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [review({ state: "APPROVED", author: "codex", commit: "HEAD" })]
    })
  },
  {
    name: "fails when required author has not reviewed current head",
    expectedExit: 1,
    requiredReviewAuthor: "codex",
    fixture: reviewGraph({
      headRefOid: "HEAD",
      reviews: [review({ state: "APPROVED", author: "other-reviewer", commit: "HEAD" })]
    })
  }
];

for (const testCase of cases) {
  const fixturePath = path.join(fixtureDir, `${slug(testCase.name)}.json`);
  writeFileSync(fixturePath, `${JSON.stringify(testCase.fixture, null, 2)}\n`, "utf8");
  const result = runGateFixture(fixturePath, testCase);
  if (result.status !== testCase.expectedExit) {
    console.error(`Review-gate fixture failed: ${testCase.name}`);
    console.error(`Expected exit ${testCase.expectedExit}, got ${result.status}`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }
}

console.log(`Review-gate fixture checks passed for ${cases.length} scenarios`);

function runGateFixture(fixturePath, testCase) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        gateScript,
        "--repo",
        "ComplyEaze/complyeaze-public",
        "--pr",
        "1",
        "--fixture",
        fixturePath,
        "--strict-head-review",
        "--required-review-author",
        testCase.requiredReviewAuthor ?? "codex",
        "--expected-head-oid",
        testCase.expectedHeadOid ?? "HEAD"
      ],
      {
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH}` },
        stdio: ["ignore", "pipe", "pipe"]
      },
    );
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      status: error.status ?? 1,
      stdout: String(error.stdout ?? ""),
      stderr: String(error.stderr ?? "")
    };
  }
}

function reviewGraph({ headRefOid, threads = [], reviews = [] }) {
  return {
    data: {
      repository: {
        pullRequest: {
          headRefOid,
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: threads
          },
          reviews: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: reviews
          }
        }
      }
    }
  };
}

function review({
  state,
  author,
  commit,
  submittedAt = "2026-07-08T00:00:00Z"
}) {
  return {
    state,
    submittedAt,
    url: `https://example.test/reviews/${state.toLowerCase()}`,
    author: { login: author },
    commit: { oid: commit }
  };
}

function thread({ isResolved, isOutdated }) {
  return {
    id: "thread-1",
    isResolved,
    isOutdated,
    path: "src/example.mjs",
    line: 12,
    comments: {
      nodes: [
        {
          url: "https://example.test/thread-1",
          author: { login: "reviewer" }
        }
      ]
    }
  };
}

function slug(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}
