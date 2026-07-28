import { docs, productForSlug, type DocPage, type Locale } from "../content";
import { searchableContent } from "../document-search.mjs";
import { getSkillReferences } from "../skill-references";
import { siteBaseline } from "../site-baseline";

function markdownLinkLabel(value: string) {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function codeFence(value: string) {
  const longestRun = Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  return "`".repeat(Math.max(3, longestRun + 1));
}

function markdownForDoc(locale: Locale, doc: DocPage, skills: string[]) {
  const product = productForSlug(doc.slug);
  const lines = [
    `# ${doc.title}`,
    "",
    `> ${doc.description}`,
    "",
    `- Product: ${product}`,
    `- Locale: ${locale === "zh" ? "zh-CN" : "en"}`,
    `- Group: ${doc.group}`,
    `- Source reviewed: ${siteBaseline.reviewedAt}`,
  ];

  for (const section of doc.sections) {
    lines.push("", `## ${section.title}`, "");
    for (const paragraph of section.paragraphs ?? []) lines.push(paragraph, "");
    for (const bullet of section.bullets ?? []) lines.push(`- ${bullet}`);
    if (section.bullets?.length) lines.push("");
    for (const link of section.links ?? []) lines.push(`- [${link.label}](${link.href})`);
    if (section.links?.length) lines.push("");
    if (section.code) {
      const fence = codeFence(section.code.value);
      lines.push(`${fence}${section.code.language}`, section.code.value, fence, "");
    }
    if (section.note) lines.push(`> ${locale === "zh" ? "注意" : "Note"}: ${section.note}`, "");
  }

  if (skills.length) {
    lines.push("", `## ${locale === "zh" ? "Agent 工作流" : "Agent workflow"}`, "");
    lines.push(locale === "zh" ? "实现这篇指南时加载：" : "Load these Skills when implementing this guide:", "");
    for (const skill of skills) lines.push(`- \`$${skill}\``);
    lines.push("", `[${locale === "zh" ? "查看 Skills 目录" : "Open the Skills catalog"}](/${locale}/skills/docs/skills-catalog)`, "");
  }

  if (doc.relatedDocs?.length) {
    lines.push("", `## ${locale === "zh" ? "相关文档" : "Related documentation"}`, "");
    for (const related of doc.relatedDocs) {
      lines.push(`- [${markdownLinkLabel(related.label)}](/${locale}/${related.product}/docs/${related.docSlug})`);
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function entry(locale: Locale, doc: DocPage) {
  const product = productForSlug(doc.slug);
  const skills = getSkillReferences(doc.slug);
  const path = `/${locale}/${product}/docs/${doc.slug}`;
  const alternateLocale: Locale = locale === "zh" ? "en" : "zh";
  const relatedDocs = (doc.relatedDocs ?? []).map((related) => ({
    ...related,
    path: `/${locale}/${related.product}/docs/${related.docSlug}`,
  }));

  return {
    id: `${locale}:${product}:${doc.slug}`,
    locale,
    lang: locale === "zh" ? "zh-CN" : "en",
    product,
    kind: "doc",
    slug: doc.slug,
    path,
    alternatePath: `/${alternateLocale}/${product}/docs/${doc.slug}`,
    group: doc.group,
    title: doc.title,
    description: doc.description,
    headings: doc.sections.map((section) => ({ id: section.id, title: section.title })),
    skills,
    relatedDocs,
    reviewedAt: siteBaseline.reviewedAt,
    content: searchableContent(doc, [
      ...skills,
      ...relatedDocs.flatMap((related) => [related.label, related.path]),
    ]),
    markdown: markdownForDoc(locale, doc, skills),
  };
}

export function GET() {
  return Response.json({
    schemaVersion: 1,
    generatedFrom: {
      content: "typed DocPage model exported by app/content.ts and its imported content modules",
      agentWorkflows: "app/skill-references.ts",
    },
    baseline: siteBaseline,
    entries: (["zh", "en"] as const).flatMap((locale) => docs[locale].map((doc) => entry(locale, doc))),
  });
}
