import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hasAuthoredClientScript } from "./static-json-ld.mjs";

const apps = [
  ["complyeaze", "@complyeaze-public/core", "https://complyeaze.com"],
  ["axal", "@complyeaze-public/axal", "https://axal.complyeaze.com"],
  ["pack", "@complyeaze-public/pack", "https://pack.complyeaze.com"],
];

const sharedPackages = [
  ["public-content", "@complyeaze-public/content"],
  ["public-shell", "@complyeaze-public/shell"],
];

const requiredRootScripts = [
  "dev:core",
  "dev:axal",
  "dev:pack",
  "build:apps",
  "build:evidence",
  "verify:fast",
  "verify:ui",
];

export function assertAstroWorkspace(root) {
  const findings = [];
  const workspace = read(root, "pnpm-workspace.yaml", findings);
  const rootManifest = readJson(root, "package.json", findings);
  const agents = read(root, "AGENTS.md", findings);
  const reviewPolicy = read(root, "docs/REVIEW_RECTIFY.md", findings);

  for (const glob of ['"apps/*"', '"packages/*"']) {
    if (!workspace.includes(glob)) {
      findings.push(`pnpm-workspace.yaml: missing ${glob}`);
    }
  }
  for (const catalogEntry of [
    '"@astrojs/check": "0.9.9"',
    'astro: "7.1.1"',
    'typescript: "6.0.3"',
  ]) {
    if (!workspace.includes(catalogEntry)) {
      findings.push(`pnpm-workspace.yaml: missing ${catalogEntry}`);
    }
  }

  for (const script of requiredRootScripts) {
    if (!rootManifest.scripts?.[script]) {
      findings.push(`package.json: missing ${script} script`);
    }
  }

  for (const [filePath, text] of [
    ["AGENTS.md", agents],
    ["docs/REVIEW_RECTIFY.md", reviewPolicy],
  ]) {
    for (const term of [
      "Before every commit",
      "current-head review",
      "Opus critic",
      "one repository and one open implementation PR",
    ]) {
      if (!text.includes(term)) {
        findings.push(`${filePath}: missing ${term}`);
      }
    }
  }

  for (const [directory, packageName, origin] of apps) {
    assertApp(root, directory, packageName, origin, findings);
  }

  for (const [directory, packageName] of sharedPackages) {
    assertSharedPackage(root, directory, packageName, findings);
  }

  if (findings.length > 0) {
    throw new Error(`Astro workspace findings:\n${findings.join("\n")}`);
  }
}

export function assertAstroBuildOutput(root) {
  const findings = [];
  for (const [directory] of apps) {
    const dist = path.join(root, "apps", directory, "dist");
    const indexPath = path.join(dist, "index.html");
    if (!existsSync(indexPath)) {
      findings.push(`apps/${directory}/dist/index.html: missing; run pnpm build`);
      continue;
    }
    const outputFiles = walkFiles(dist);
    const htmlFiles = outputFiles.filter((filePath) => filePath.endsWith(".html"));
    for (const htmlPath of htmlFiles) {
      if (hasAuthoredClientScript(readFileSync(htmlPath, "utf8"))) {
        findings.push(
          `apps/${directory}/dist/${path.relative(dist, htmlPath)}: unexpected script output`,
        );
      }
    }
    const scripts = outputFiles.filter((filePath) => /\.(?:js|mjs)$/i.test(filePath));
    if (scripts.length > 0) {
      findings.push(`apps/${directory}/dist: unexpected JavaScript ${scripts.join(", ")}`);
    }
  }
  if (findings.length > 0) {
    throw new Error(`Astro build-output findings:\n${findings.join("\n")}`);
  }
}

export function assertAstroBuildOutputFixtures() {
  const root = mkdtempSync(path.join(tmpdir(), "public-astro-output-"));
  for (const [directory] of apps) {
    const dist = path.join(root, "apps", directory, "dist");
    mkdirSync(dist, { recursive: true });
    writeFileSync(path.join(dist, "index.html"), "<main><h1>Safe</h1></main>", "utf8");
  }
  const structuredDataPage = path.join(root, "apps", "complyeaze", "dist", "structured", "index.html");
  mkdirSync(path.dirname(structuredDataPage), { recursive: true });
  writeFileSync(
    structuredDataPage,
    '<main><h1>Structured</h1></main><script type="application/ld+json">{"@context":"https://schema.org"}</script>',
    "utf8",
  );
  assertAstroBuildOutput(root);
  const nestedPage = path.join(root, "apps", "axal", "dist", "nested", "index.html");
  mkdirSync(path.dirname(nestedPage), { recursive: true });
  writeFileSync(nestedPage, "<main><h1>Unsafe</h1></main><script>unsafe()</script>", "utf8");
  let rejected = false;
  try {
    assertAstroBuildOutput(root);
  } catch (error) {
    rejected = String(error.message).includes("nested/index.html");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  if (!rejected) {
    throw new Error("Astro nested inline-script fixture did not fail");
  }
}

function assertApp(root, directory, packageName, origin, findings) {
  const base = `apps/${directory}`;
  const manifest = readJson(root, `${base}/package.json`, findings);
  const config = read(root, `${base}/astro.config.mjs`, findings);
  const page = read(root, `${base}/src/pages/index.astro`, findings);

  if (manifest.name !== packageName) {
    findings.push(`${base}/package.json: expected package name ${packageName}`);
  }
  if (manifest.private !== true) {
    findings.push(`${base}/package.json: package must stay private`);
  }
  if (manifest.engines?.node !== ">=24") {
    findings.push(`${base}/package.json: node engine must stay >=24`);
  }
  for (const script of ["dev", "build", "typecheck"]) {
    if (!manifest.scripts?.[script]) {
      findings.push(`${base}/package.json: missing ${script} script`);
    }
    if (!manifest.scripts?.[script]?.includes("ASTRO_TELEMETRY_DISABLED=1")) {
      findings.push(`${base}/package.json: ${script} must disable Astro telemetry`);
    }
  }
  if (!config.includes(`PUBLIC_SITE_ORIGIN ?? "${origin}"`)) {
    findings.push(`${base}/astro.config.mjs: missing preview-safe production site ${origin}`);
  }
  if (!config.includes("site,")) {
    findings.push(`${base}/astro.config.mjs: configured site is not passed to Astro`);
  }
  if (!config.includes('output: "static"')) {
    findings.push(`${base}/astro.config.mjs: output must be static`);
  }
  const ownsTypedCustomerRoot =
    (directory === "complyeaze" &&
      page.includes("definePublicRouteManifest") &&
      page.includes("PublicPageLayout")) ||
    (directory === "axal" &&
      page.includes("defineAxalRouteManifest") &&
      page.includes("AxalPageLayout")) ||
    (directory === "pack" && page.includes("definePackRouteManifest"));
  if (ownsTypedCustomerRoot) {
    const layoutName = directory === "axal" ? "AxalPageLayout.astro" : "PublicPageLayout.astro";
    const layout = directory === "pack" ? page : read(root, `${base}/src/layouts/${layoutName}`, findings);
    if (
      !layout.includes('name="robots" content={route.robots}') &&
      !layout.includes('name="robots" content="noindex, nofollow"')
    ) {
      const sourcePath = directory === "pack" ? "src/pages/index.astro" : `src/layouts/${layoutName}`;
      findings.push(`${base}/${sourcePath}: typed root must stay noindex`);
    }
  } else if (!page.includes('name="robots" content="noindex, nofollow"')) {
    findings.push(`${base}/src/pages/index.astro: foundation route must stay noindex`);
  }
  if (page.includes("client:")) {
    findings.push(`${base}/src/pages/index.astro: client directives are not allowed in P1a`);
  }
}

function walkFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const filePath = path.join(directory, name);
    return statSync(filePath).isDirectory() ? walkFiles(filePath) : [filePath];
  });
}

function assertSharedPackage(root, directory, packageName, findings) {
  const base = `packages/${directory}`;
  const manifest = readJson(root, `${base}/package.json`, findings);
  const boundary = read(root, `${base}/README.md`, findings);

  if (manifest.name !== packageName) {
    findings.push(`${base}/package.json: expected package name ${packageName}`);
  }
  if (manifest.private !== true) {
    findings.push(`${base}/package.json: package must stay private`);
  }
  for (const forbidden of ["auth", "tenant data", "design system"] ) {
    if (!boundary.toLowerCase().includes(forbidden)) {
      findings.push(`${base}/README.md: missing ${forbidden} boundary`);
    }
  }
}

function read(root, filePath, findings) {
  const absolutePath = path.join(root, filePath);
  if (!existsSync(absolutePath)) {
    findings.push(`${filePath}: missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function readJson(root, filePath, findings) {
  const text = read(root, filePath, findings);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    findings.push(`${filePath}: invalid JSON ${error.message}`);
    return {};
  }
}
