import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDeployWorkflow } from "./public-checks/deploy-workflow.mjs";
import { parseWorkflowYaml } from "./public-checks/workflow-yaml.mjs";

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
  "a list-form command step in the deploy job": replaceOnce("      - name: Configure Pages", "      - run: echo hello\n      - name: Configure Pages"),
  "an extra action with two spaces after uses": replaceOnce("      - name: Configure Pages", "      - uses:  actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0\n      - name: Configure Pages"),
  "a container image used in the deploy job": replaceOnce("        uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d", "        uses: docker://alpine:3"),
  "a local action used in the deploy job": replaceOnce("        uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d", "        uses: ./.github/actions/anything"),
  "write-all permissions on the build job": replaceOnce("    permissions:\n      contents: read\n\n    steps:\n      - name: Checkout", "    permissions: write-all\n\n    steps:\n      - name: Checkout"),
  "contents write on the build job": replaceOnce("    permissions:\n      contents: read\n\n    steps:\n      - name: Checkout", "    permissions:\n      contents: write\n\n    steps:\n      - name: Checkout"),
  "an added pull_request_target trigger": replaceOnce("on:\n  workflow_dispatch:\n", "on:\n  pull_request_target:\n  workflow_dispatch:\n"),
  "an added schedule trigger": replaceOnce("on:\n  workflow_dispatch:\n", "on:\n  schedule:\n    - cron: \"0 0 * * *\"\n  workflow_dispatch:\n"),
  "the guard text moved into an environment value": replaceOnce("    needs: build\n    if: ${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}\n", "    needs: build\n    if: true\n    env:\n      NOTE: \"if: ${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}\"\n"),
  "an input on the deploy-pages step": replaceOnce("        uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "        uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128\n        with:\n          artifact_name: other"),
  "an environment variable on a deploy step": replaceOnce("        id: deployment\n", "        id: deployment\n        env:\n          X: y\n"),
  "a workflow-level environment": replaceOnce("concurrency:\n", "env:\n  X: y\n\nconcurrency:\n"),
  "a build step with a local action": replaceOnce("      - name: Install dependencies\n", "      - uses: ./.github/actions/anything\n      - name: Install dependencies\n"),
  "a build step using an unpinned third-party action": replaceOnce("pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271", "pnpm/action-setup@v4"),
  "a workflow that uses a YAML anchor": replaceOnce("      - name: Verify public site\n        run: pnpm verify\n", "      - name: Verify public site\n        run: &verify pnpm verify\n"),
  "a build job whose guard is loosened": replaceOnce("    if: ${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n\n    steps:", "    if: ${{ vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n\n    steps:"),
  "a deploy job whose guard is loosened": replaceOnce("    needs: build\n    if: ${{ github.ref == 'refs/heads/master' && vars.ENABLE_GITHUB_PAGES_DEPLOY == 'true' }}\n", "    needs: build\n    if: ${{ always() }}\n"),
  "a deploy job without the identity token": replaceOnce("      pages: write\n      id-token: write\n", "      pages: write\n"),
  "a deploy job with an extra write permission": replaceOnce("      pages: write\n      id-token: write\n", "      pages: write\n      id-token: write\n      contents: write\n").replace("    permissions:\n      contents: read\n      pages: write", "    permissions:\n      pages: write"),
  "a deploy environment with another url": replaceOnce("      url: ${{ steps.deployment.outputs.page_url }}", "      url: https://example.invalid/"),
  "a deploy environment with another name": replaceOnce("      name: github-pages", "      name: other"),
  "the two Pages actions in the other order": replaceOnce("      - name: Configure Pages\n        uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d\n\n      - name: Deploy Pages artifact\n        id: deployment\n        uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "      - name: Deploy Pages artifact\n        id: deployment\n        uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128\n\n      - name: Configure Pages\n        uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d"),
  "a container on the deploy job": replaceOnce("    needs: build\n", "    needs: build\n    container: alpine\n"),
  "services on the deploy job": replaceOnce("    needs: build\n", "    needs: build\n    services:\n      db:\n        image: postgres\n"),
  "defaults on the deploy job": replaceOnce("    needs: build\n", "    needs: build\n    defaults:\n      run:\n        shell: bash\n"),
  "environment variables on the deploy job": replaceOnce("    needs: build\n", "    needs: build\n    env:\n      X: y\n"),
  "a Pages action pinned to a short SHA": replaceOnce("actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d", "actions/configure-pages@45bfe01"),
  "a Pages action pinned to a tag": replaceOnce("actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "actions/deploy-pages@v5.0.0"),
  "a Pages action from another owner": replaceOnce("actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", "someone/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128"),
  "a self-hosted runner for the deploy job": original.replace(/(\n {2}deploy:[\s\S]*?\n {4}runs-on: )ubuntu-latest/, "$1self-hosted"),
  "a self-hosted runner for the build job": original.replace(/(\n {2}build:[\s\S]*?\n {4}runs-on: )ubuntu-latest/, "$1self-hosted"),
  "a runner label list for the deploy job": original.replace(/(\n {2}deploy:[\s\S]*?\n {4}runs-on: )ubuntu-latest/, "$1[ubuntu-latest, self-hosted]"),
  "the old single job": original.replace(/\n {2}deploy:[\s\S]*$/, "\n").replace("permissions:\n  contents: read\n\nconcurrency", "permissions:\n  contents: read\n  pages: write\n  id-token: write\n\nconcurrency"),
};
for (const [name, workflow] of Object.entries(variants)) {
  assert.notEqual(check(workflow), null, `refused: ${name}`);
}
// The reader refuses what it does not understand, so the check never reads a file it misread.
for (const [name, text] of Object.entries({
  "an anchor": "a: &x 1\n",
  "an alias": "a: *x\n",
  "a tag": "a: !!str 1\n",
  "a flow mapping": "a: {b: 1}\n",
  "a nested flow sequence": "a: [[1]]\n",
  "a tab": "a:\n\tb: 1\n",
  "a duplicate key": "a: 1\na: 2\n",
  "a second document": "a: 1\n---\nb: 2\n",
  "a merge key": "a:\n  <<: *x\n",
  "a line that is not a key": "a: 1\njust text\n",
})) {
  assert.throws(() => parseWorkflowYaml(text), /unsupported YAML|tab character/, name);
}
assert.deepEqual(parseWorkflowYaml("a: 1 # c\nb:\n  - x\n  - y: 2\n    z: '#not a comment'\nc: |\n  line1\n  line2\nd: >-\n  one\n  two\n"),
  { a: "1", b: ["x", { y: "2", z: "#not a comment" }], c: "line1\nline2\n", d: "one two" }, "the reader reads the supported subset");

console.log(`deploy workflow check: the real workflow passes and ${Object.keys(variants).length} weakened variants are refused and the reader refuses what it cannot read`);
