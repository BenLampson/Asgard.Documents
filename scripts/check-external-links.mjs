import { readdir, readFile, stat } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { getSiteOrigin } from "./site-origin.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticRoot = path.join(root, "dist", "static");
const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const offline = args.has("--offline") || !live;
const strict = args.has("--strict");

if (live && args.has("--offline")) {
  console.error("External-link check configuration error: choose either --offline or --live.");
  process.exitCode = 2;
} else {
  await main();
}

async function main() {
  const siteOrigin = getSiteOrigin();
  const htmlFiles = await listHtmlFiles(staticRoot).catch((error) => {
    if (error?.code === "ENOENT") {
      console.error("External-link check input error: dist/static does not exist; run npm run build:cdn first.");
      process.exitCode = 2;
      return null;
    }
    throw error;
  });
  if (!htmlFiles) return;

  const links = new Map();
  const deterministicFailures = [];
  const deterministicSkips = [];
  let referenceCount = 0;

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const route = routeForHtmlFile(file);
    for (const link of extractResources(html)) {
      referenceCount += 1;
      const href = decodeHtml(link.href).trim();
      if (!href || href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) continue;

      const scheme = getExplicitScheme(href);
      if (scheme === "javascript") {
        deterministicFailures.push({ href, route, reason: "javascript href is forbidden" });
        continue;
      }
      if (["mailto", "tel", "data"].includes(scheme)) {
        deterministicSkips.push({ href, route, reason: scheme });
        continue;
      }
      if (scheme && scheme !== "http" && scheme !== "https") {
        deterministicSkips.push({ href, route, reason: `unsupported scheme ${scheme}` });
        continue;
      }

      let url;
      try {
        url = new URL(href, new URL(route, `${siteOrigin}/`));
      } catch {
        deterministicFailures.push({ href, route, reason: "invalid URL" });
        continue;
      }
      if (!url.protocol.startsWith("http")) continue;

      const unsafeReason = unsafeClickableHostReason(url.hostname);
      if (link.tag === "a" || link.tag === "area") {
        if (unsafeReason) {
          deterministicFailures.push({ href, route, reason: unsafeReason });
          continue;
        }
      }

      if (url.origin === siteOrigin) {
        const localPath = await resolveLocalTarget(url.pathname);
        if (!localPath) {
          deterministicFailures.push({ href, route, reason: "same-origin target is missing from dist/static" });
        }
        continue;
      }

      const keyUrl = new URL(url);
      keyUrl.hash = "";
      const key = keyUrl.href;
      const existing = links.get(key) ?? { url: keyUrl, sources: new Set(), fragments: new Set() };
      existing.sources.add(route);
      if (url.hash) existing.fragments.add(url.hash);
      links.set(key, existing);
    }
  }

  for (const failure of deterministicFailures) {
    console.error(`[FAIL] ${failure.href} (${failure.reason}; ${failure.route})`);
  }
  for (const skip of dedupeSkips(deterministicSkips)) {
    console.log(`[SKIP] ${truncate(skip.href)} (${skip.reason})`);
  }

  let liveResults = [];
  if (offline) {
    for (const item of links.values()) {
      console.log(`[SKIP] ${item.url.href} (external; offline mode; ${item.sources.size} page${item.sources.size === 1 ? "" : "s"})`);
    }
  } else {
    liveResults = await mapConcurrent([...links.values()], 6, checkLiveLink);
    for (const result of liveResults) printLiveResult(result);
  }

  const hardLiveFailures = liveResults.filter((result) => strict && [404, 410].includes(result.status));
  const failures = deterministicFailures.length + hardLiveFailures.length;
  const liveOk = liveResults.filter((result) => result.kind === "ok").length;
  const liveWarnings = liveResults.length - liveOk - hardLiveFailures.length;
  console.log(
    `External-link check ${failures ? "FAILED" : "OK"}: ${htmlFiles.length} HTML files, ${referenceCount} URL references, ${links.size} unique external URLs, ${liveOk} live OK, ${liveWarnings} warnings, ${deterministicSkips.length} skipped schemes, ${failures} failures.`,
  );
  if (failures) process.exitCode = 1;
}

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listHtmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
  return files.sort();
}

function routeForHtmlFile(file) {
  const relative = path.relative(staticRoot, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/\/index\.html$/, "")}/`;
}

function extractResources(html) {
  const links = [];
  for (const tagMatch of html.matchAll(/<(a|area|link)\b[^>]*>/gi)) {
    const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tagMatch[0]);
    if (hrefMatch) links.push({ tag: tagMatch[1].toLowerCase(), href: hrefMatch[1] ?? hrefMatch[2] ?? "" });
  }
  for (const tagMatch of html.matchAll(/<(img|script|source)\b[^>]*>/gi)) {
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tagMatch[0]);
    if (srcMatch) links.push({ tag: tagMatch[1].toLowerCase(), href: srcMatch[1] ?? srcMatch[2] ?? "" });
  }
  for (const tagMatch of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\b(?:property|name)\s*=\s*["'](?:og:|twitter:)/i.test(tagMatch[0])) continue;
    const contentMatch = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tagMatch[0]);
    const value = contentMatch?.[1] ?? contentMatch?.[2] ?? "";
    if (/^(?:https?:)?\/\//i.test(value)) links.push({ tag: "meta", href: value });
  }
  return links;
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getExplicitScheme(value) {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  return match?.[1].toLowerCase();
}

async function resolveLocalTarget(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, "");
  const exact = path.resolve(staticRoot, relative);
  const index = path.resolve(staticRoot, relative, "index.html");
  if (!isInsideStaticRoot(exact) || !isInsideStaticRoot(index)) return null;
  if (await isFile(exact)) return exact;
  if (await isFile(index)) return index;
  return null;
}

function isInsideStaticRoot(target) {
  const relative = path.relative(staticRoot, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function isFile(target) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

function unsafeClickableHostReason(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return "clickable localhost URL is forbidden";
  if (isReservedExampleHost(host)) return "clickable reserved-example URL is forbidden";
  if (isPrivateAddress(host)) return "clickable private/local address is forbidden";
  return null;
}

function isReservedExampleHost(host) {
  return ["example.com", "example.org", "example.net"].some((name) => host === name || host.endsWith(`.${name}`))
    || host === "example" || host.endsWith(".example");
}

function isPrivateAddress(host) {
  const version = isIP(host);
  if (version === 4) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (version === 6) {
    const normalized = host.toLowerCase();
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fe8")
      || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")
      || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff");
  }
  return false;
}

async function checkLiveLink(item) {
  const started = Date.now();
  let last;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    last = await probe(item.url, "HEAD");
    if (last.networkError || last.status < 200 || last.status >= 400) {
      last = await probe(item.url, "GET");
    }
    last.attempts = attempt;
    if (!last.networkError && !isTransientStatus(last.status)) break;
    if (attempt < 3) await delay(250 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 100));
  }
  const result = { ...last, item, durationMs: Date.now() - started };
  if (result.networkError || isTransientStatus(result.status)) result.kind = "transient";
  else if (result.status >= 200 && result.status < 400) result.kind = "ok";
  else if ([401, 403].includes(result.status)) result.kind = "protected";
  else result.kind = "http-warning";
  return result;
}

async function probe(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Asgard-Docs-Link-Check/1.0",
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        ...(method === "GET" ? { range: "bytes=0-65535" } : {}),
      },
    });
    if (response.body) await response.body.cancel();
    return { status: response.status, method, finalUrl: response.url, networkError: null };
  } catch (error) {
    return { status: null, method, finalUrl: null, networkError: error?.name === "AbortError" ? "timeout" : error?.message ?? "network error" };
  } finally {
    clearTimeout(timeout);
  }
}

function isTransientStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function printLiveResult(result) {
  const target = result.item.url.href;
  const fragmentNote = result.item.fragments.size ? `; ${result.item.fragments.size} fragment${result.item.fragments.size === 1 ? "" : "s"} unchecked` : "";
  if (result.kind === "ok") {
    console.log(`[OK] ${target} (${result.status} ${result.method}, ${result.durationMs}ms${fragmentNote})`);
    return;
  }
  const strictFailure = strict && [404, 410].includes(result.status);
  const label = strictFailure ? "FAIL" : "WARN";
  const detail = result.networkError ?? `${result.status ?? "no status"} ${result.method}`;
  console[strictFailure ? "error" : "warn"](`[${label}] ${target} (${detail}, ${result.durationMs}ms${fragmentNote})`);
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function dedupeSkips(skips) {
  const seen = new Set();
  return skips.filter((item) => {
    const key = `${item.reason}\0${item.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncate(value, length = 100) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
