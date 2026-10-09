import fs from "node:fs";
import path from "node:path";
import { readDocs } from "./generate-assets.mjs";
const errors = [];
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
}
walk("out");
for (const doc of readDocs()) {
  for (const n of ["index.html", "index.html.md"])
    if (!fs.existsSync(path.join("out", doc.url, n)))
      errors.push(`Missing ${doc.url}${n}`);
  const html = fs.readFileSync(path.join("out", doc.url, "index.html"), "utf8");
  if (!html.includes(`lang="${doc.locale === "zh" ? "zh-CN" : "en"}"`))
    errors.push(`Wrong language ${doc.url}`);
}
for (const file of files.filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\bid="([^"<>]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) errors.push(`${file}: duplicate IDs`);
  for (const m of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    const href = m[1].replace(/&amp;/g, "&");
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
    const relative = file.slice(3).replace(/index\.html$/, "");
    const targetUrl = new URL(href, "https://local.test" + relative);
    const fragment = decodeURIComponent(targetUrl.hash.slice(1));
    const target = path.join("out", decodeURIComponent(targetUrl.pathname));
    const resolved =
      fs.existsSync(target) && fs.statSync(target).isDirectory()
        ? path.join(target, "index.html")
        : target;
    if (!fs.existsSync(resolved)) {
      errors.push(`${file}: ${href}`);
      continue;
    }
    if (fragment && resolved.endsWith(".html")) {
      const targetHtml = fs.readFileSync(resolved, "utf8");
      if (!targetHtml.includes(`id="${fragment}"`))
        errors.push(`${file}: missing anchor ${href}`);
    }
  }
  if (/file:\/\/|\/workspace\/|\/home\/agent\//.test(html))
    errors.push(`${file}: local path leak`);
}
for (const required of [
  "llms.txt",
  "llms-full.txt",
  "search-index.json",
  "sitemap.xml",
  "robots.txt",
])
  if (!fs.existsSync(path.join("out", required)))
    errors.push(`Missing ${required}`);
if (
  !fs
    .readFileSync("generated-2.png")
    .equals(fs.readFileSync("out/generated-2.jpg"))
)
  errors.push("Exported artwork differs from original bytes");
if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log(
  `Static export: ${files.filter((f) => f.endsWith(".html")).length} HTML pages, all internal links and assets verified`,
);
