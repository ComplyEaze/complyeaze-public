#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const resultsDir = path.join(root, "test-results", "hosted-routes");
const manifestPath = path.join(root, "test-results", "public-build", "route-manifest.json");

const baseUrlArg = readOption("--base-url");
const allowLocalhost = process.argv.includes("--allow-localhost");
const requestTimeoutMs = 15000;

if (!baseUrlArg) {
  fail("Pass --base-url <host> to verify hosted public routes.");
}

const baseUrl = normalizedBaseUrl(baseUrlArg);
assertSafeBaseUrl(baseUrl, allowLocalhost);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const routes = Array.isArray(manifest.routes)
  ? manifest.routes.filter((route) => route.app === "complyeaze")
  : [];
const manifestOrigin = routes[0]?.origin ?? "https://complyeaze.com";

if (routes.length === 0) {
  fail("Local release evidence has no ComplyEaze routes. Run pnpm build first.");
}

const checks = [];

async function main() {
  for (const route of routes) {
    const html = await fetchText(route.urlPath);
    const findings = html.error ? [html.error] : [];

    if (!html.error) {
      assertIncludes(html.text, `<title>${route.title}</title>`, "title", findings);
      assertIncludes(
        html.text,
        `name="description" content="${route.description}"`,
        "description",
        findings
      );
      assertIncludes(html.text, `rel="canonical" href="${route.canonical}"`, "canonical", findings);
      assertIncludes(html.text, `name="robots" content="${route.robots}"`, "robots directive", findings);
      assertIncludes(html.text, 'property="og:title"', "Open Graph title", findings);
      assertIncludes(html.text, "<main", "main landmark", findings);
    }

    checks.push({
      kind: "page",
      path: route.urlPath,
      status: html.status,
      redirected: html.redirected,
      ok: html.status === 200 && findings.length === 0,
      findings
    });
  }

  await checkRobots();
  await checkSitemap();
  writeEvidence();

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    const lines = failed.map((check) => {
      const detail = check.findings.length > 0 ? `: ${check.findings.join(", ")}` : "";
      return `${check.kind} ${check.path} status ${check.status}${detail}`;
    });
    fail(`Hosted route findings:\n${lines.join("\n")}`);
  }

  console.log(`Hosted route check passed for ${safeHostLabel(baseUrl)} (${checks.length} checks)`);
}

async function checkRobots() {
  const robots = await fetchText("/robots.txt");
  const findings = robots.error ? [robots.error] : [];
  if (!robots.error) {
    assertIncludes(robots.text, "User-agent: *", "robots user-agent", findings);
    if (/^\s*Disallow:\s*\/\s*$/m.test(robots.text)) findings.push("robots.txt still disallows crawling");
    assertIncludes(robots.text, `${manifestOrigin}/sitemap.xml`, "sitemap location", findings);
  }
  checks.push({
    kind: "resource",
    path: "/robots.txt",
    status: robots.status,
    redirected: robots.redirected,
    ok: robots.status === 200 && findings.length === 0,
    findings
  });
}

async function checkSitemap() {
  const sitemap = await fetchText("/sitemap.xml");
  const findings = sitemap.error ? [sitemap.error] : [];
  if (!sitemap.error) {
    for (const route of routes.filter(({ discoverability }) => discoverability === "indexed")) {
      assertIncludes(sitemap.text, `<loc>${route.canonical}</loc>`, `${route.urlPath} sitemap loc`, findings);
    }
    for (const route of routes.filter(({ discoverability }) => discoverability !== "indexed")) {
      if (sitemap.text.includes(`<loc>${route.canonical}</loc>`)) findings.push(`${route.urlPath} ${route.discoverability} route appears in sitemap`);
    }
  }
  checks.push({
    kind: "resource",
    path: "/sitemap.xml",
    status: sitemap.status,
    redirected: sitemap.redirected,
    ok: sitemap.status === 200 && findings.length === 0,
    findings
  });
}

async function fetchText(pathname) {
  const url = routeUrl(pathname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: "text/html,application/json,text/plain,*/*" },
      redirect: "follow",
      signal: controller.signal
    });
    return {
      status: response.status,
      redirected: response.redirected,
      text: await response.text(),
      error: ""
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: 0,
        redirected: false,
        text: "",
        error: `timed out after ${requestTimeoutMs}ms`
      };
    }
    return {
      status: 0,
      redirected: false,
      text: "",
      error: "request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

function routeUrl(pathname) {
  const baseHref = baseUrl.href.endsWith("/") ? baseUrl.href : `${baseUrl.href}/`;
  return new URL(pathname.replace(/^\//, ""), baseHref);
}

function normalizedBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`Invalid --base-url: ${value}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    fail("--base-url must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash) {
    fail("--base-url must not include credentials, query strings, or fragments.");
  }
  return url;
}

function assertSafeBaseUrl(url, localhostAllowed) {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (localHosts.has(url.hostname) && !localhostAllowed) {
    fail("Localhost checks require --allow-localhost so production evidence is explicit.");
  }
}

function assertIncludes(text, expected, label, findings) {
  if (!text.includes(expected)) {
    findings.push(`missing ${label}`);
  }
}

function writeEvidence() {
  mkdirSync(resultsDir, { recursive: true });
  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    host: safeHostLabel(baseUrl),
    manifestOrigin,
    evidenceScope: "hosted destination routes only",
    redirectEvidence: "not checked by this script",
    productionCutoverEvidence:
      baseUrl.origin === manifestOrigin
        ? "base URL matches manifest origin"
        : "preview host only; production custom-domain cutover is not proven",
    routeCount: routes.length,
    checks
  };
  writeFileSync(path.join(resultsDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(resultsDir, "summary.md"), markdownSummary(summary), "utf8");
}

function markdownSummary(summary) {
  const rows = summary.checks
    .map((check) => {
      const result = check.ok ? "pass" : "fail";
      const findings = check.findings.length > 0 ? check.findings.join("; ") : "-";
      return `| ${check.kind} | ${check.path} | ${check.status} | ${result} | ${findings} |`;
    })
    .join("\n");

  return `# Hosted Route Check

- Host: ${summary.host}
- Manifest origin: ${summary.manifestOrigin}
- Evidence scope: ${summary.evidenceScope}
- Redirect evidence: ${summary.redirectEvidence}
- Production cutover evidence: ${summary.productionCutoverEvidence}
- Route count: ${summary.routeCount}
- Generated: ${summary.generatedAt}

| Kind | Path | Status | Result | Findings |
| --- | --- | ---: | --- | --- |
${rows}
`;
}

function safeHostLabel(url) {
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.origin}${pathname}`;
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] ?? "";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
