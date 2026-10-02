import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDeployWorkflow } from "./public-checks/deploy-workflow.mjs";

// The Pages workflow must give the identity token and the Pages permission to the deploy job alone, and
// the deploy job must run only the Pages actions. Each variant below weakens that one way and must be refused.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = ".github/workflows/pages-deploy.yml";
const original = readFileSync(path.join(root, workflowPath), "utf8");

function check(workflow) {
  const dir = mkdtempSync(path.join(tmpdir(), "deploy-workflow-"));
  try {
    for (const file of ["docs/RELEASE_GATES.md", "docs/REPOSITORY_SETTINGS.md"]) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(dir, file));
    }
    mkdirSync(path.join(dir, ".github/workflows"), { recursive: true });
    writeFileSync(path.join(dir, workflowPath), workflow);
    assertDeployWorkflow(dir);
    return null;
  } catch (error) {
    return error.message;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

assert.equal(check(original), null, "the real workflow passes");

const replaceOnce = (from, to) => {
  assert.equal(original.split(from).length, 2, `the variant's anchor appears once: ${from}`);
  return original.replace(from, to);
};
const variants = {
  "identity token at workflow level": replaceOnce("permissions:\n  contents: read\n\nconcurrency", "permissions:\n  contents: read\n  id-token: write\n\nconcurrency"),
  "Pages write at workflow level": replaceOnce("permissions:\n  contents: read\n\nconcurrency", "permissions:\n  contents: read\n  pages: write\n\nconcurrency"),
  "no workflow-level permissions": replaceOnce("permissions:\n  contents: read\n\nconcurrency", "concurrency"),
  "identity token on the build job": replaceOnce("    permissions:\n      contents: read\n\n    steps:\n      - name: Checkout", "    permissions:\n      contents: read\n      id-token: write\n\n    steps:\n      - name: Checkout"),
  "the build job with an environment": replaceOnce("    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n\n    steps:\n      - name: Checkout", "    runs-on: ubuntu-latest\n    environment: github-pages\n    permissions:\n      contents: read\n\n    steps:\n      - name: Checkout"),
  "a shell step in the deploy job": replaceOnce("      - name: Configure Pages", "      - name: Run a command\n        run: echo hello\n\n      - name: Configure Pages"),
  "a checkout in the deploy job": replaceOnce("      - name: Configure Pages", "      - name: Checkout\n        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0\n\n      - name: Configure Pages"),
  "a third job": `${original.trimEnd()}\n\n  extra:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n`,
  "a deploy job that does not need the build": replaceOnce("    needs: build\n", ""),
  "an unpinned Pages action": replaceOnce("actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "actions/deploy-pages@v4"),
  "a deploy job without the guard": replaceOnce("    needs: build\n    if: ${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}\n", "    needs: build\n"),
  "the verify step dropped": replaceOnce("      - name: Verify public site\n        run: pnpm verify\n\n", ""),
  "the old single job": original.replace(/\n {2}deploy:[\s\S]*$/, "\n").replace("permissions:\n  contents: read\n\nconcurrency", "permissions:\n  contents: read\n  pages: write\n  id-token: write\n\nconcurrency"),
};
for (const [name, workflow] of Object.entries(variants)) {
  assert.notEqual(check(workflow), null, `refused: ${name}`);
}
console.log(`deploy workflow check: the real workflow passes and ${Object.keys(variants).length} weakened variants are refused`);
