import assert from "node:assert/strict";
import { getDocumentationRoutes } from "./documentation-routes.mjs";

const { routes: expectedRoutes, slugs } = await getDocumentationRoutes();

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("link-check", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };

async function render(pathname) {
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    env,
    context,
  );
}

function decodeHref(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"');
}

function normalizeInternalHref(href) {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/assets/")) return null;
  const url = new URL(href, "http://localhost");
  // Per-guide Markdown is a static CDN companion generated after the Worker
  // render. Its existence and MIME-facing path are validated by static:check.
  if (url.pathname.endsWith("/index.html.md") || ["/llms.txt", "/llms-full.txt", "/skills-manifest.json", "/asgard-skills.lock.json", "/verify-skills-installation.mjs", "/agent-workflow-coverage.json", "/verify-agent-workflow-coverage.mjs", "/skills-compatibility-report.json", "/changelog-review-report.json", "/release-documentation-plan.json", "/verify-release-documentation-plan.mjs", "/release-readiness-report.json", "/artifact-manifest.json", "/verify-static-artifact.mjs", "/plan-static-rollback.mjs"].includes(url.pathname)) return null;
  return url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : "/";
}

const linkedRoutes = new Set();
let checkedAnchors = 0;
let checkedPages = 0;

for (const route of expectedRoutes) {
  const response = await render(route);
  assert.equal(response.status, 200, `${route} returned ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i, `${route} did not return HTML`);
  const html = await response.text();
  assert.match(html, /<html\b/i, `${route} has no html element`);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/, `${route} contains starter artifacts`);
  checkedPages += 1;

  for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = decodeHref(match[1]);
    if (href.startsWith("#")) {
      const id = decodeURIComponent(href.slice(1));
      assert.match(html, new RegExp(`\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${route} links to missing #${id}`);
      checkedAnchors += 1;
      continue;
    }
    const internalRoute = normalizeInternalHref(href);
    if (internalRoute) linkedRoutes.add(internalRoute);
  }
}

for (const route of [...linkedRoutes].sort()) {
  const response = await render(route);
  assert.equal(response.status, 200, `internal link ${route} returned ${response.status}`);
}

console.log(`Rendered-link check OK: ${checkedPages} routes, ${linkedRoutes.size} unique internal links, ${checkedAnchors} page anchors, ${slugs.length} bilingual topics.`);
