import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared brand uses the reference mark and title-case wordmark", async () => {
  const [brand, shell] = await Promise.all([
    read("components/Brand.tsx"),
    read("components/Shell.tsx"),
  ]);
  assert.match(brand, /src="\/asgard-mark\.svg"/);
  assert.match(brand, /alt=""/);
  assert.match(brand, /<strong>Asgard<\/strong>/);
  assert.equal((shell.match(/<Brand \/>/g) || []).length, 2);
  assert.doesNotMatch(shell, /<strong>ASGARD<\/strong>|阿斯加德/);
});

test("favicon and shared mark keep the same coral silhouette", async () => {
  const [mark, favicon] = await Promise.all([
    read("public/asgard-mark.svg"),
    read("public/favicon.svg"),
  ]);
  const path = /<path\s[^>]*\bd="([^"]+)"/;
  assert.ok(mark.match(path));
  assert.equal(mark.match(path)[1], favicon.match(path)[1]);
  for (const svg of [mark, favicon]) {
    assert.match(svg, /viewBox="0 0 52 52"/);
    assert.match(svg, /fill="#ff927b"/);
    assert.match(svg, /fill-rule="evenodd"/);
    assert.doesNotMatch(svg, /<image|<script|https?:\/\/(?!www\.w3\.org)/);
  }
});
