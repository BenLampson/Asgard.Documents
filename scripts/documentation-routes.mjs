import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { documentationContentFiles } from "./documentation-content-files.mjs";
import { documentationProducts, productForDocumentationSlug } from "./documentation-product.mjs";

export const root = path.resolve(import.meta.dirname, "..");

function localeAlternates(suffix = "") {
  return {
    "zh-CN": `/zh${suffix}`,
    en: `/en${suffix}`,
    "x-default": `/zh${suffix}`,
  };
}

function routeEntry({ path: routePath, kind, locale = null, product = null, slug = null, canonicalPath = routePath, indexable = true, alternates }) {
  return {
    path: routePath,
    kind,
    locale,
    lang: locale === "en" ? "en" : "zh-CN",
    product,
    slug,
    canonicalPath,
    alternates,
    indexable,
  };
}

export async function getDocumentationRoutes() {
  const content = (await Promise.all(
    documentationContentFiles.map((file) => readFile(path.join(root, file), "utf8")),
  )).join("\n");
  const slugs = [...new Set(
    [...content.matchAll(/\bslug:\s*"([a-z0-9-]+)"/g)].map((match) => match[1]),
  )].sort();
  assert.ok(slugs.length > 0, "no documentation slugs found");

  const manifest = [routeEntry({
    path: "/",
    kind: "root",
    alternates: localeAlternates(),
  })];
  for (const locale of ["zh", "en"]) {
    manifest.push(routeEntry({
      path: `/${locale}`,
      kind: "portal",
      locale,
      alternates: localeAlternates(),
    }));
    for (const product of documentationProducts) {
      manifest.push(routeEntry({
        path: `/${locale}/${product}`,
        kind: "product",
        locale,
        product,
        alternates: localeAlternates(`/${product}`),
      }));
    }
    for (const slug of slugs) {
      const product = productForDocumentationSlug(slug);
      const canonicalPath = `/${locale}/${product}/docs/${slug}`;
      const alternates = localeAlternates(`/${product}/docs/${slug}`);
      manifest.push(routeEntry({
        path: canonicalPath,
        kind: "doc",
        locale,
        product,
        slug,
        alternates,
      }));
      manifest.push(routeEntry({
        path: `/${locale}/docs/${slug}`,
        kind: "legacy",
        locale,
        product,
        slug,
        canonicalPath,
        alternates,
        indexable: false,
      }));
    }
  }

  manifest.sort((left, right) => left.path.localeCompare(right.path));
  return { manifest, routes: manifest.map((entry) => entry.path), slugs };
}
