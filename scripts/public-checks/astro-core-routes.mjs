import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { definePublicRouteManifest } from "../../packages/public-content/src/schema.ts";
import { canonicalUrl } from "../../packages/public-shell/src/metadata.ts";
import { createReleaseEvidenceFromBuild } from "../release-evidence.mjs";
import { publicRouteRegistry } from "../public-route-registry.mjs";

const requiredFiles = [
  "packages/public-content/src/complyeaze.routes.json",
  "packages/public-content/src/schema.ts",
  "packages/public-shell/src/metadata.ts",
  "apps/complyeaze/src/components/PublicEvidencePage.astro",
  "apps/complyeaze/src/components/PublicGatewayPage.astro",
  "apps/complyeaze/src/components/PublicHomePage.astro",
  "apps/complyeaze/src/components/PublicMigrationLedger.astro",
  "apps/complyeaze/src/components/PublicMigrationPage.astro",
  "apps/complyeaze/src/components/PublicPolicyPage.astro",
  "apps/complyeaze/src/components/PublicProductsPage.astro",
  "apps/complyeaze/src/components/PublicResourcePage.astro",
  "apps/complyeaze/src/components/PublicSanchikaAdoptionPage.astro",
  "apps/complyeaze/src/layouts/PublicPageLayout.astro",
  "apps/complyeaze/src/pages/[...slug].astro",
  "apps/complyeaze/src/pages/index.astro",
  "apps/complyeaze/src/pages/robots.txt.ts",
  "apps/complyeaze/src/pages/sitemap.xml.ts",
];

const requiredRoutes = [
  "/", "/products/", "/products/pack/", "/products/tools/", "/trust/", "/docs/",
  "/migration/", "/about/", "/contact/", "/privacy/", "/terms/", "/status/",
  "/changelog/", "/release-evidence/", "/sanchika/",
  "/review/craft/",
];

export function assertAstroCoreRouteSources(root) {
  const findings = requiredFiles
    .filter((filePath) => !existsSync(path.join(root, filePath)))
    .map((filePath) => `${filePath}: missing`);
  const routes = publicRouteRegistry.filter((route) => route.app === "complyeaze");
  if (routes.length !== 16) findings.push(`expected 16 ComplyEaze routes, found ${routes.length}`);
  for (const routePath of requiredRoutes) {
    if (!routes.some((route) => route.urlPath === routePath)) findings.push(`missing ${routePath}`);
  }
  const manifest = definePublicRouteManifest(JSON.parse(
    readFileSync(path.join(root, "packages/public-content/src/complyeaze.routes.json"), "utf8"),
  ));
  const statusRoute = manifest.routes.find((route) => route.urlPath === "/status/");
  if (!statusRoute?.sections.some((section) => section.body.includes(`${routes.length} ComplyEaze routes`))) {
    findings.push("status migration posture must match the canonical ComplyEaze route count");
  }
  const approvedIndexedPaths = [
    "/", "/products/", "/products/pack/", "/products/tools/", "/about/", "/contact/", "/trust/", "/privacy/", "/terms/",
  ];
  const indexedRoutes = manifest.routes.filter((route) => route.discoverability === "indexed");
  if (indexedRoutes.map((route) => route.urlPath).sort().join(" ") !== [...approvedIndexedPaths].sort().join(" ")) {
    findings.push("indexed routes must match the owner-approved set in docs/HOSTING_CUTOVER.md");
  }
  for (const route of indexedRoutes) {
    if (/https:\/\/(?:axal|pack|tools)\.complyeaze\.com/.test(JSON.stringify(route))) {
      findings.push(`${route.urlPath}: indexed routes must not link hosts that are not served from this repository`);
    }
  }
  if (findings.length === 0) {
    const index = readFileSync(path.join(root, "apps/complyeaze/src/pages/index.astro"), "utf8");
    const catchAll = readFileSync(path.join(root, "apps/complyeaze/src/pages/[...slug].astro"), "utf8");
    const layout = readFileSync(path.join(root, "apps/complyeaze/src/layouts/PublicPageLayout.astro"), "utf8");
    const robots = readFileSync(path.join(root, "apps/complyeaze/src/pages/robots.txt.ts"), "utf8");
    const sitemap = readFileSync(path.join(root, "apps/complyeaze/src/pages/sitemap.xml.ts"), "utf8");
    if (!index.includes("definePublicRouteManifest") || !index.includes("PublicHomePage")) {
      findings.push("ComplyEaze root must render the canonical home route");
    }
    for (const kind of ["resource", "policy", "evidence", "gateway", "products", "migration", "adoption", "public-craft-review"]) {
      if (!catchAll.includes(`route.kind === "${kind}"`)) findings.push(`catch-all missing ${kind} branch`);
    }
    if (!catchAll.includes("assertNever(route)")) findings.push("catch-all rendering is not exhaustive");
    if (!layout.includes('aria-label="Primary navigation"')) findings.push("customer navigation missing");
    if (/href="\/(?:migration|status|docs)\/"/.test(layout)) findings.push("customer nav exposes methodology");
    if (/^\s*Disallow:\s*\/\s*$/m.test(robots) || !robots.includes("Allow: /") || !robots.includes("/sitemap.xml")) {
      findings.push("ComplyEaze robots resource must allow crawling and point to the sitemap");
    }
    if (!sitemap.includes("definePublicRouteManifest") || !sitemap.includes("route.urlPath")) {
      findings.push("ComplyEaze sitemap must derive routes from the typed manifest");
    }
    if (!sitemap.includes('route.discoverability === "indexed"')) {
      findings.push("ComplyEaze sitemap must list only indexed routes");
    }
  }
  if (findings.length > 0) throw new Error(`Astro core-route source findings:\n${findings.join("\n")}`);
}

export function assertAstroCoreRouteFixtures() {
  if (canonicalUrl("https://complyeaze.com", "/products/") !== "https://complyeaze.com/products/") {
    throw new Error("canonical helper did not preserve the clean route");
  }
  const fixture = {
    app: "fixture",
    origin: "https://fixture.example",
    routes: [{
      description: "Fixture description", discoverability: "review-only", eyebrow: "Fixture", heading: "Fixture heading",
      kind: "resource", primaryAction: { href: "/", label: "Home" },
      proof: ["Evidence"], robots: "noindex, nofollow",
      sections: [{ body: "Fixture body", title: "Fixture" }],
      secondaryAction: { href: "https://example.com", label: "Evidence" },
      signalTerms: ["fixture"], slug: "fixture", summary: "Fixture summary",
      title: "Fixture title", urlPath: "/fixture/",
    }],
    schemaVersion: 1,
  };
  definePublicRouteManifest(fixture);
  const invalid = structuredClone(fixture);
  invalid.routes[0].robots = "index, follow";
  let rejected = false;
  try { definePublicRouteManifest(invalid); } catch { rejected = true; }
  if (!rejected) throw new Error("public route fixture accepted a robots value that contradicts discoverability");
  const indexable = structuredClone(fixture);
  indexable.routes[0].discoverability = "indexed";
  indexable.routes[0].robots = "index, follow";
  definePublicRouteManifest(indexable);
  const indexableCraft = { ...structuredClone(fixture.routes[0]), kind: "public-craft-review", slug: "review/craft", urlPath: "/review/craft/", discoverability: "indexed", robots: "index, follow" };
  rejected = false;
  try { definePublicRouteManifest({ ...fixture, routes: [indexableCraft] }); } catch { rejected = true; }
  if (!rejected) throw new Error("public route fixture accepted an indexable craft review route");
}

export function assertAstroCoreRouteBuild(root) {
  const evidence = createReleaseEvidenceFromBuild(root, publicRouteRegistry);
  if (evidence.pageCount !== 25) throw new Error(`expected 25 Astro outputs, found ${evidence.pageCount}`);
  const complyeazeDist = path.join(root, "apps/complyeaze/dist");
  const robots = readFileSync(path.join(complyeazeDist, "robots.txt"), "utf8");
  const sitemap = readFileSync(path.join(complyeazeDist, "sitemap.xml"), "utf8");
  if (/^\s*Disallow:\s*\/\s*$/m.test(robots) || !robots.includes("Allow: /") || !robots.includes("https://complyeaze.com/sitemap.xml")) {
    throw new Error("built ComplyEaze robots resource must allow crawling and point to the sitemap");
  }
  for (const route of publicRouteRegistry.filter((entry) => entry.app === "complyeaze")) {
    const listed = sitemap.includes(`<loc>${route.origin}${route.urlPath}</loc>`);
    if (route.discoverability === "indexed" && !listed) {
      throw new Error(`built ComplyEaze sitemap is missing ${route.urlPath}`);
    }
    if (route.discoverability !== "indexed" && listed) {
      throw new Error(`built ComplyEaze sitemap lists non-indexed route ${route.urlPath}`);
    }
  }
}
