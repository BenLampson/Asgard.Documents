import test from "node:test";
import assert from "node:assert/strict";
import { readDocs } from "../scripts/generate-assets.mjs";
const docs = readDocs();
test("current content exists for every product and locale", () => {
  for (const locale of ["zh", "en"])
    for (const product of ["asgard", "heimdall", "skills"])
      assert.ok(
        docs.filter((d) => d.locale === locale && d.product === product)
          .length >= 3,
        `${locale}/${product}`,
      );
});
test("every guide has a translated counterpart and valid metadata", () => {
  for (const d of docs) {
    assert.ok(d.title && d.description && d.section, `${d.url}: metadata`);
    assert.ok(Number.isFinite(d.order), `${d.url}: order`);
    assert.ok(
      docs.some(
        (other) =>
          other.locale !== d.locale &&
          other.product === d.product &&
          other.slug === d.slug,
      ),
      d.url,
    );
    assert.ok(
      d.body.includes("https://github.com/BenLampson/"),
      `${d.url}: source evidence`,
    );
    assert.ok(
      !/^#\s/m.test(d.body.replace(/```[\s\S]*?```/g, "")),
      `${d.url}: title comes from frontmatter`,
    );
  }
});
test("internal documentation links resolve", () => {
  const urls = new Set(docs.map((d) => d.url));
  for (const d of docs)
    for (const m of d.body.matchAll(/\]\((\/[^)#\s]+)(?:#[^)]*)?\)/g)) {
      const u = m[1];
      if (u.includes("/docs/"))
        assert.ok(urls.has(u.endsWith("/") ? u : u + "/"), `${d.url}: ${u}`);
    }
});

test("translated guides preserve heading structure for shared section anchors", () => {
  const headings = (body) =>
    body
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .filter((l) => /^#{2,3}\s/.test(l))
      .map((l) => l.match(/^#+/)[0].length);
  for (const d of docs.filter((d) => d.locale === "zh")) {
    const en = docs.find(
      (x) => x.locale === "en" && x.product === d.product && x.slug === d.slug,
    );
    assert.deepEqual(headings(d.body), headings(en.body), d.url);
  }
});
