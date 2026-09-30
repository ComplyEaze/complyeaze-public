import type { APIRoute } from "astro";
import rawManifest from "../../../../packages/public-content/src/complyeaze.routes.json";
import { definePublicRouteManifest } from "../../../../packages/public-content/src/schema.ts";

const manifest = definePublicRouteManifest(rawManifest);

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${manifest.origin}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
