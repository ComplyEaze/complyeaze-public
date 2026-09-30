import type { APIRoute } from "astro";
import rawManifest from "../../../../packages/public-content/src/complyeaze.routes.json";
import { definePublicRouteManifest } from "../../../../packages/public-content/src/schema.ts";

const manifest = definePublicRouteManifest(rawManifest);

export const prerender = true;

export const GET: APIRoute = () => {
  const urls = manifest.routes
    .filter((route) => route.discoverability === "indexed")
    .map((route) => `  <url><loc>${new URL(route.urlPath, manifest.origin).href}</loc></url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
