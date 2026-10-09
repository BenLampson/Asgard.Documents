import GithubSlugger from "github-slugger";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { locales, products, type Locale, type Product } from "./products";
export {
  locales,
  products,
  brands,
  type Locale,
  type Product,
} from "./products";
export type Doc = {
  locale: Locale;
  product: Product;
  slug: string;
  title: string;
  description: string;
  section: string;
  order: number;
  body: string;
  url: string;
};
export function getDocs(locale?: Locale, product?: Product): Doc[] {
  const docs: Doc[] = [];
  for (const l of locale ? [locale] : locales)
    for (const p of product ? [product] : products) {
      const dir = path.join(process.cwd(), "content", l, p);
      if (!fs.existsSync(dir)) continue;
      for (const filename of fs
        .readdirSync(dir)
        .filter((x) => x.endsWith(".md"))) {
        const { data, content } = matter(
          fs.readFileSync(path.join(dir, filename), "utf8"),
        );
        const slug = filename.slice(0, -3);
        docs.push({
          locale: l,
          product: p,
          slug,
          title: String(data.title || slug),
          description: String(data.description || ""),
          section: String(
            data.section || (l === "zh" ? "文档" : "Documentation"),
          ),
          order: Number(data.order || 0),
          body: content,
          url: `/${l}/${p}/docs/${slug}/`,
        });
      }
    }
  return docs.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}
export function getDoc(l: Locale, p: Product, s: string) {
  return getDocs(l, p).find((d) => d.slug === s);
}

export function extractHeadings(body: string) {
  const slugger = new GithubSlugger();
  let inFence = false;
  const headings = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    const m = !inFence && line.match(/^(#{2,3})\s+(.+)$/);
    if (m)
      headings.push({
        id: slugger.slug(m[2]),
        text: m[2].replace(/[`*]/g, ""),
        level: m[1].length,
      });
  }
  return headings;
}
