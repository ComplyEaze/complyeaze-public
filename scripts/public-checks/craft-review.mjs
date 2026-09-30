import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { appDistPath, publicRouteRegistry } from "../public-route-registry.mjs";
import { hasAuthoredClientScript } from "./static-json-ld.mjs";

const requiredFiles = [
  "packages/public-content/src/craft-review-schema.ts",
  "packages/public-content/src/craft-review-types.ts",
  "apps/complyeaze/src/components/PublicCraftReviewPage.astro",
  "apps/axal/src/components/AxalCraftReviewPage.astro",
  "apps/axal/src/pages/review/craft.astro",
  "apps/pack/src/components/PackCraftReviewPage.astro",
  "apps/pack/src/pages/review/craft.astro",
];

const requiredCompositions = {
  complyeaze: ["PublicHero", "ProductRouteMap", "ProofStrip", "ReviewDeskPreview", "EvidencePanel", "HumanReviewCheckpoint"],
  axal: ["ReviewDeskPreview", "WorkQueueRow", "EvidencePanel", "HumanReviewCheckpoint", "AuditTrailPreview", "PricingBlock", "FAQAccordion"],
  pack: ["LocalArtifactFlow", "CustodyBoundary", "PermissionExplainer", "SourceProvenanceStrip", "ReleaseStatusBanner"],
};

export async function assertCraftReviewSources(root) {
  const findings = requiredFiles
    .filter((filePath) => !existsSync(path.join(root, filePath)))
    .map((filePath) => `${filePath}: missing`);
  if (publicRouteRegistry.length !== 25) {
    findings.push(`canonical registry must contain 25 routes, found ${publicRouteRegistry.length}`);
  }
  for (const app of Object.keys(requiredCompositions)) {
    const routes = publicRouteRegistry.filter((route) => route.app === app && route.urlPath === "/review/craft/");
    if (routes.length !== 1) {
      findings.push(`${app}: expected exactly one /review/craft/ route`);
      continue;
    }
    const [route] = routes;
    if (route.robots !== "noindex, nofollow" || route.discoverability !== "review-only") {
      findings.push(`${app}: craft route must be noindex and review-only`);
    }
  }
  if (findings.length > 0) throw new Error(`Craft review findings:\n${findings.join("\n")}`);

  const { defineCraftReviewEvidence } = await import("../../packages/public-content/src/craft-review-schema.ts");
  for (const app of Object.keys(requiredCompositions)) {
    const manifest = JSON.parse(readFileSync(path.join(root, `packages/public-content/src/${app}.routes.json`), "utf8"));
    const craft = manifest.routes.find((route) => route.urlPath === "/review/craft/");
    defineCraftReviewEvidence(craft.reviewEvidence, requiredCompositions[app]);
    const kindPrefix = app === "complyeaze" ? "public" : app;
    if (craft.kind !== `${kindPrefix}-craft-review`) throw new Error(`${app}: unexpected craft route kind ${craft.kind}`);
    const componentPath = path.join(root, `apps/${app}/src/components/${app === "complyeaze" ? "Public" : app === "axal" ? "Axal" : "Pack"}CraftReviewPage.astro`);
    const component = readFileSync(componentPath, "utf8");
    if (!component.includes("patternClassName")) throw new Error(`${app}: craft page must use the public Sanchika API`);
    if (component.includes("Pending browser evidence")) {
      throw new Error(`${app}: craft page must ship measured evidence, not placeholders`);
    }
    for (const marker of [
      "noindex · review-only",
      "Acceptance contract",
      "Not embedded · see exact-head visual artifact",
      'data-review-status',
      'data-craft-measurement="javascript"',
      'data-craft-measurement="css"',
      'data-craft-measurement="fonts"',
      'data-craft-measurement="cls"',
      "/review/craft/",
    ]) {
      if (!component.includes(marker)) throw new Error(`${app}: craft page is missing visible review evidence ${marker}`);
    }
    for (const composition of requiredCompositions[app]) {
      if (!component.includes(`"${composition}"`)) throw new Error(`${app}: craft page is missing ${composition}`);
    }
  }

  const packComponent = readFileSync(
    path.join(root, "apps/pack/src/components/PackCraftReviewPage.astro"),
    "utf8",
  );
  for (const marker of ["<dt>Verification</dt>", "https://github.com/lamemustafa/pack/issues"]) {
    if (!packComponent.includes(marker)) throw new Error(`pack: craft page is missing ${marker}`);
  }

  const axalComponent = readFileSync(
    path.join(root, "apps/axal/src/components/AxalCraftReviewPage.astro"),
    "utf8",
  );
  for (const state of ["Missing", "Disputed", "Held", "Approved", "Returned", "Blocked"]) {
    if (!axalComponent.includes(state)) throw new Error(`axal: craft page is missing review state ${state}`);
  }
  const axalReviewPage = readFileSync(
    path.join(root, "apps/axal/src/pages/review/craft.astro"),
    "utf8",
  );
  if (!axalReviewPage.includes("reviewOnly")) {
    throw new Error("axal: craft route must request the review-safe layout mode");
  }
  const axalLayout = readFileSync(
    path.join(root, "apps/axal/src/layouts/AxalPageLayout.astro"),
    "utf8",
  );
  if (!axalLayout.includes("reviewOnly") || !axalLayout.includes("{!reviewOnly &&")) {
    throw new Error("axal: layout must suppress live account actions in review-only mode");
  }
  for (const app of Object.keys(requiredCompositions)) {
    const css = readFileSync(path.join(root, `apps/${app}/src/styles/craft-review.css`), "utf8");
    if (!css.includes("[data-review-status]")) {
      throw new Error(`${app}: forced-colors review-status boundary is missing`);
    }
  }

  const sitemap = readFileSync(path.join(root, "apps/complyeaze/src/pages/sitemap.xml.ts"), "utf8");
  if (!sitemap.includes('route.discoverability === "indexed"')) throw new Error("ComplyEaze sitemap must exclude craft review routes");
  for (const layoutPath of ["apps/complyeaze/src/layouts/PublicPageLayout.astro", "apps/axal/src/layouts/AxalPageLayout.astro"]) {
    if (readFileSync(path.join(root, layoutPath), "utf8").includes('/review/craft/')) throw new Error(`${layoutPath}: primary navigation exposes craft review`);
  }

  const fixture = {
    accessibility: ["axe", "keyboard", "reduced-motion", "forced-colors"],
    budgets: { authoredJavaScriptBytes: 0, criticalFonts: 2, cssGzipBytes: 61440, maxCls: 0.05 },
    compositions: ["PublicHero"], contentMode: "synthetic", interactionMode: "zero-js",
    measurementCeilings: {
      authoredJavaScriptBytes: 0,
      cls: { desktop: 0.001, tablet: 0, mobile: 0 },
      criticalFonts: 0,
      cssGzipBytes: 12000,
      maxCls: 0.001,
      viewports: ["desktop", "tablet", "mobile"],
    },
    reviewStatus: "C3 human craft approval pending", sanchikaRelease: "v0.1.1",
  };
  for (const mutate of [
    (value) => value.compositions.pop(),
    (value) => { value.contentMode = "live"; },
    (value) => { value.reviewStatus = "C3 approved"; },
    (value) => { value.budgets.authoredJavaScriptBytes = 1; },
    (value) => { value.measurementCeilings.cssGzipBytes = 70000; },
    (value) => { value.measurementCeilings.cls.mobile = 0.002; },
  ]) {
    const invalid = structuredClone(fixture);
    mutate(invalid);
    assertRejected(() => defineCraftReviewEvidence(invalid, ["PublicHero"]));
  }
}

export function assertCraftReviewBuild(root) {
  const findings = [];
  for (const route of publicRouteRegistry.filter(({ discoverability }) => discoverability === "review-only")) {
    const html = readFileSync(path.join(root, appDistPath(route)), "utf8");
    for (const marker of ['data-craft-review="synthetic"', "C3 human craft approval pending", 'name="robots" content="noindex, nofollow"']) {
      if (!html.includes(marker)) findings.push(`${route.app}: built craft route is missing ${marker}`);
    }
    if (html.includes("Pending browser evidence")) {
      findings.push(`${route.app}: built craft route contains placeholder measurements`);
    }
    for (const marker of [
      "Acceptance contract",
      "Not embedded · see exact-head visual artifact",
    ]) {
      if (!html.includes(marker)) findings.push(`${route.app}: built craft route is missing ${marker}`);
    }
    const ceilings = route.reviewEvidence?.measurementCeilings;
    for (const marker of ceilings ? [
      `data-craft-measurement="javascript">≤ ${ceilings.authoredJavaScriptBytes} B</dd>`,
      `data-craft-measurement="css">≤ ${ceilings.cssGzipBytes} B gzip</dd>`,
      `data-craft-measurement="fonts">≤ ${ceilings.criticalFonts}</dd>`,
      `data-craft-measurement="cls">≤ ${ceilings.maxCls} · desktop, tablet, mobile</dd>`,
    ] : []) {
      if (!html.includes(marker)) findings.push(`${route.app}: built craft route is missing ${marker}`);
    }
    if (hasAuthoredClientScript(html)) findings.push(`${route.app}: built craft route contains authored client JavaScript`);
  }
  const sitemap = readFileSync(path.join(root, "apps/complyeaze/dist/sitemap.xml"), "utf8");
  if (sitemap.includes("/review/craft/")) findings.push("built sitemap exposes /review/craft/");
  if (findings.length > 0) throw new Error(`Craft review build findings:\n${findings.join("\n")}`);
}

function assertRejected(callback) {
  try { callback(); } catch { return; }
  throw new Error("Craft review schema accepted an invalid fixture");
}
