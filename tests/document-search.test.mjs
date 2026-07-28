import assert from "node:assert/strict";
import test from "node:test";
import { searchDocuments, searchableContent, searchIndexEntries } from "../app/document-search.mjs";

const broadGuide = {
  title: "Host and plugin overview",
  description: "A broad host feature guide for plugin authors.",
  group: "Framework",
  eyebrow: "OVERVIEW",
  sections: [{ title: "Configuration", paragraphs: ["General runtime wiring and validation."] }],
};

const fieldContract = {
  title: "Host feature and plugin configuration field contract",
  description: "Actual defaults, validation, and runtime wiring for external plugins.",
  group: "Host Runtime",
  eyebrow: "HOST CONTRACT",
  sections: [{
    title: "plugin.* fields",
    code: { value: "plugin.loadTimeoutSeconds\n  runtime: declared/unwired" },
  }],
};

test("finds exact API and configuration identifiers inside code blocks", () => {
  assert.deepEqual(searchDocuments([broadGuide, fieldContract], "loadTimeoutSeconds"), [fieldContract]);
  assert.match(searchableContent(fieldContract), /plugin\.loadTimeoutSeconds/);
});

test("ranks exact title matches before earlier broad guides", () => {
  const filler = Array.from({ length: 8 }, (_, index) => ({
    ...broadGuide,
    title: `Broad host guide ${index}`,
    description: "Feature field overview for a modular runtime.",
    group: "Plugin contract",
  }));
  const results = searchDocuments([...filler, fieldContract], "configuration field contract");
  assert.equal(results[0], fieldContract);
  assert.equal(results.length, 6);
});

test("requires every normalized term and supports bilingual Unicode queries", () => {
  const chinese = {
    title: "宿主功能与插件配置字段合同",
    description: "真实默认值、校验与接线状态。",
    group: "宿主运行时",
    eyebrow: "HOST CONTRACT",
    sections: [{ title: "插件加载", paragraphs: ["加载超时当前只参与校验。"] }],
  };
  assert.deepEqual(searchDocuments([chinese, fieldContract], "加载 超时"), [chinese]);
  assert.deepEqual(searchDocuments([chinese, fieldContract], "加载 missing"), []);
});

test("keeps caller-provided product scope and honors the result limit", () => {
  assert.deepEqual(searchDocuments([broadGuide], "host plugin"), [broadGuide]);
  assert.equal(searchDocuments(Array(10).fill(broadGuide), "host", 3).length, 3);
  assert.deepEqual(searchDocuments([broadGuide], ""), []);
});

test("searches machine-index Skills and related-document metadata", () => {
  const entry = {
    title: "Validate access tokens",
    description: "Resource API integration.",
    group: "Identity",
    headings: [{ title: "JWT boundary" }],
    skills: ["identity-integration"],
    relatedDocs: [{ label: "Heimdall integration", path: "/en/heimdall/docs/heimdall-integration" }],
    content: "Audience and issuer validation",
  };
  assert.deepEqual(searchIndexEntries([entry], "identity-integration"), [entry]);
  assert.deepEqual(searchIndexEntries([entry], "Heimdall integration"), [entry]);
});
