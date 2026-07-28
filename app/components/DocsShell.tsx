import { getProductDocs, localeCopy, type DocPage, type Locale, type Product } from "../content";
import { getProductMetadata, productHomePath } from "../product-registry";
import { getSkillReferences } from "../skill-references";
import { siteBaseline } from "../site-baseline";
import { SiteHeader } from "./SiteHeader";
import { MermaidDiagram } from "./MermaidDiagram";

function Sidebar({ locale, current, product }: { locale: Locale; current: string; product: Product }) {
  const groups = new Map<string, DocPage[]>();
  getProductDocs(locale, product).forEach((doc) => groups.set(doc.group, [...(groups.get(doc.group) ?? []), doc]));
  return (
    <aside className="docs-sidebar">
      <div className="sidebar-inner">
        {[...groups].map(([group, pages]) => (
          <section key={group}><h2>{group}</h2>{pages.map((page) => (
            <a className={page.slug === current ? "active" : ""} href={`/${locale}/${product}/docs/${page.slug}`} key={page.slug}>{page.title}</a>
          ))}</section>
        ))}
      </div>
    </aside>
  );
}

function CodeBlock({ language, value, locale }: { language: string; value: string; locale: Locale }) {
  if (language.toLowerCase() === "mermaid") return <MermaidDiagram value={value} locale={locale} />;
  return <div className="code-block"><div><span>{language}</span><span>ASGARD</span></div><pre><code>{value}</code></pre></div>;
}

export function DocsShell({ locale, doc, product }: { locale: Locale; doc: DocPage; product: Product }) {
  const copy = localeCopy[locale];
  const productMetadata = getProductMetadata(product);
  const productDocs = getProductDocs(locale, product);
  const skillReferences = getSkillReferences(doc.slug);
  const index = productDocs.findIndex((item) => item.slug === doc.slug);
  const previous = index > 0 ? productDocs[index - 1] : null;
  const next = index < productDocs.length - 1 ? productDocs[index + 1] : null;

  return (
    <div className="docs-page">
      <SiteHeader locale={locale} pageSlug={doc.slug} product={product} />
      <div className="docs-layout">
        <Sidebar locale={locale} current={doc.slug} product={product} />
        <main className="doc-content">
          <div className="breadcrumbs"><a href={productHomePath(product, locale)}>{productMetadata.brandLabel}</a><span>/</span><span>{doc.group}</span><span>/</span><b>{doc.title}</b></div>
          <header className="doc-header"><p>{doc.eyebrow}</p><h1>{doc.title}</h1><div>{doc.description}</div></header>
          <div className="source-badge">
            <span className="status-dot" />{copy.editHint}<b>{siteBaseline.reviewedAt}</b>
            <a href={`/${locale}/${product}/docs/${doc.slug}/index.html.md`} target="_blank" rel="alternate">
              {locale === "zh" ? "查看 Markdown" : "View Markdown"} ↗
            </a>
          </div>
          <article>
            {doc.sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2><a href={`#${section.id}`}>#</a>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
                {section.links && <p className="doc-artifact-links">{section.links.map((link) => <a href={link.href} key={link.href}>{link.label} ↗</a>)}</p>}
                {section.code && <CodeBlock {...section.code} locale={locale} />}
                {section.note && <div className="doc-note"><b>{locale === "zh" ? "说明" : "Note"}</b><p>{section.note}</p></div>}
              </section>
            ))}
          </article>
          {skillReferences.length > 0 && (
            <nav className="agent-workflow" aria-label={locale === "zh" ? "Agent 工作流" : "Agent workflow"}>
              <div>
                <small>AGENT WORKFLOW</small>
                <b>{locale === "zh" ? "实现这篇指南时加载" : "Load for implementation"}</b>
              </div>
              <p>{skillReferences.map((skill) => <code key={skill}>{`$${skill}`}</code>)}</p>
              <a href={`/${locale}/skills/docs/skills-catalog`}>{locale === "zh" ? "查看 Skills 目录 →" : "Open Skills catalog →"}</a>
            </nav>
          )}
          {doc.relatedDocs && doc.relatedDocs.length > 0 && (
            <nav className="page-nav related-docs" aria-label={locale === "zh" ? "相关文档" : "Related documentation"}>
              {doc.relatedDocs.map((related) => (
                <a href={`/${locale}/${related.product}/docs/${related.docSlug}`} key={`${related.product}-${related.docSlug}`}>
                  <small>{locale === "zh" ? "跨产品接入" : "Cross-product integration"}</small>
                  <b>{related.label} →</b>
                </a>
              ))}
            </nav>
          )}
          <nav className="page-nav">
            {previous ? <a href={`/${locale}/${product}/docs/${previous.slug}`}><small>{copy.previous}</small><b>← {previous.title}</b></a> : <span />}
            {next ? <a className="next" href={`/${locale}/${product}/docs/${next.slug}`}><small>{copy.next}</small><b>{next.title} →</b></a> : <span />}
          </nav>
        </main>
        <aside className="toc"><div><h2>{copy.onThisPage}</h2>{doc.sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}<span /><a href={productHomePath(product, locale)}>{productMetadata.brandLabel} · {productMetadata.versionLabel(locale)}</a></div></aside>
      </div>
    </div>
  );
}
