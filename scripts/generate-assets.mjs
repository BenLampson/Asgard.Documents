import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
const brands = JSON.parse(
  fs.readFileSync(new URL("../lib/products.json", import.meta.url), "utf8"),
);
const origin = "https://asgard.benlampson.cn";
export function readDocs() {
  const result = [];
  for (const locale of ["zh", "en"])
    for (const product of ["asgard", "heimdall", "skills"]) {
      const dir = path.join("content", locale, product);
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".md"))) {
        const raw = fs.readFileSync(path.join(dir, name), "utf8"),
          { data, content } = matter(raw);
        const slug = name.slice(0, -3);
        result.push({
          locale,
          product,
          version: brands[product].version,
          slug,
          title: data.title,
          description: data.description,
          section: data.section,
          order: data.order,
          body: content,
          url: `/${locale}/${product}/docs/${slug}/`,
        });
      }
    }
  return result;
}
export function generateAssets() {
  const docs = readDocs();
  for (const locale of ["zh", "en"])
    fs.rmSync(path.join("public", locale), { recursive: true, force: true });
  fs.mkdirSync("public", { recursive: true });
  // The design asset is JPEG encoded despite its upstream .png filename.
  // Keep its original bytes and use the correct public extension / MIME.
  fs.copyFileSync("generated-2.png", "public/generated-2.jpg");
  for (const d of docs) {
    const dest = path.join("public", d.url, "index.html.md");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(
      dest,
      `# ${d.title}\n\n${d.description}\n\nProduct: ${brands[d.product].name} ${d.version}\nGuide: ${origin}${d.url}\n\n${d.body}`,
    );
  }
  fs.writeFileSync("public/search-index.json", JSON.stringify(docs));
  fs.writeFileSync(
    "public/llms.txt",
    `# Asgard\n\nCurrent documentation for Asgard, Heimdall and Skills. Source evidence and limits are included in each guide.\n\n## Start here\n${docs
      .filter((d) => ["overview", "quick-start", "workflow"].includes(d.slug))
      .map(
        (d) =>
          `- [${d.title} (${d.locale})](${origin}${d.url}index.html.md): ${d.description}`,
      )
      .join(
        "\n",
      )}\n\n## Optional\n- [Complete documentation](${origin}/llms-full.txt)\n- [Search index](${origin}/search-index.json)\n`,
  );
  fs.writeFileSync(
    "public/llms-full.txt",
    docs
      .map(
        (d) =>
          `# ${d.title}\n\nProduct: ${brands[d.product].name} ${d.version}\n${origin}${d.url}\n\n${d.description}\n\n${d.body}`,
      )
      .join("\n\n---\n\n"),
  );
  const urls = [
    "/zh/",
    "/en/",
    ...["zh", "en"].flatMap((l) =>
      ["asgard", "heimdall", "skills"].map((p) => `/${l}/${p}/`),
    ),
    ...docs.map((d) => d.url),
  ];
  fs.writeFileSync(
    "public/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${origin}${u}</loc></url>`).join("")}</urlset>\n`,
  );
  fs.writeFileSync(
    "public/robots.txt",
    `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
  );
  console.log(
    `Generated ${docs.length} Markdown companions and one shared search / AI corpus`,
  );
}
if (process.argv[1]?.endsWith("generate-assets.mjs")) generateAssets();
