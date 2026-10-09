import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isValidElement } from "react";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { articleComponents, stableHeadingIds } from "@/lib/headings";
import { Header } from "@/components/Shell";
import { Reader, CodeBlock } from "@/components/Reader";
import {
  getDocs,
  getDoc,
  extractHeadings,
  brands,
  type Locale,
  type Product,
} from "@/lib/content";
export const dynamicParams = false;
export function generateStaticParams() {
  return getDocs().map(({ locale, product, slug }) => ({
    locale,
    product,
    slug,
  }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; product: Product; slug: string }>;
}) {
  const { locale, product, slug } = await params;
  const d = getDoc(locale, product, slug);
  if (!d) return {};
  return {
    title: d.title,
    description: d.description,
    alternates: {
      canonical: `https://asgard.benlampson.cn${d.url}`,
      languages: {
        "zh-CN": `https://asgard.benlampson.cn/zh/${product}/docs/${slug}/`,
        en: `https://asgard.benlampson.cn/en/${product}/docs/${slug}/`,
      },
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale; product: Product; slug: string }>;
}) {
  const { locale, product, slug } = await params;
  const doc = getDoc(locale, product, slug);
  if (!doc) notFound();
  const brand = brands[product],
    headings = extractHeadings(doc.body);
  const canonicalHeadings = extractHeadings(
    getDoc("en", product, slug)?.body || doc.body,
  );
  headings.forEach((heading, index) => {
    heading.id = canonicalHeadings[index]?.id || heading.id;
  });
  return (
    <>
      <Header locale={locale} product={product} />
      <div className="doc-product-bar">
        <Link href={`/${locale}/${product}/`}>
          <strong>{brand.name}</strong>
        </Link>
        <span>{brand.version}</span>
        <p>
          {locale === "zh" ? "文档" : "Documentation"} / {doc.section} /{" "}
          {doc.title}
        </p>
        <a href={`https://github.com/BenLampson/${brand.repo}`}>GitHub ↗</a>
      </div>
      <Reader
        doc={doc}
        docs={getDocs(locale, product).map(({ url, title, section, slug }) => ({
          url,
          title,
          section,
          slug,
        }))}
        headings={headings}
        version={brand.version}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            [stableHeadingIds, headings.map((heading) => heading.id)],
            articleComponents,
          ]}
          components={{
            pre: ({ children, ...props }) => {
              if (
                isValidElement<{
                  className?: string;
                  children?: React.ReactNode;
                }>(children) &&
                children.props.className === "language-mermaid"
              )
                return (
                  <MermaidDiagram
                    source={String(children.props.children)}
                    locale={locale}
                  />
                );
              return (
                <CodeBlock
                  {...props}
                  language={
                    isValidElement<{ className?: string }>(children)
                      ? children.props.className?.replace("language-", "")
                      : "code"
                  }
                >
                  {children}
                </CodeBlock>
              );
            },
            table: ({ children }) => (
              <div className="table-scroll">
                <table>{children}</table>
              </div>
            ),
            h1: ({ children }) => <h2>{children}</h2>,
          }}
        >
          {doc.body}
        </ReactMarkdown>
      </Reader>
    </>
  );
}
