# Asgard Documents

Current, bilingual documentation for Asgard, Heimdall and Asgard Skills. The site is rebuilt from the active graphite/coral design in `asgardDocument.pen` and uses plain Markdown as its content source.

## Development

Node.js 22.13+ and npm:

```sh
npm ci
npm run dev
npm run verify
```

`npm run build` creates a fully static site in `out/`. Serve that directory with any static web server with directory index support. No Worker, database, API key or AI backend is required.

## Authoring

Write matching Markdown files in `content/zh/{product}/` and `content/en/{product}/`, using the same filename. Frontmatter fields: `title`, `description`, `section`, `order`. Canonical URL: `/{locale}/{product}/docs/{slug}/`. Keep code, package versions, default values and security claims grounded in current source. Source links are included in each guide; private repository links need GitHub access.

Development regenerates discovery assets when Markdown changes; refresh the page to read updated content.

Navigation, search, Markdown companions, `llms.txt`, `llms-full.txt` and sitemap are generated from those files. Use fenced Mermaid for source-verified diagrams and standard `> [!NOTE]`, `> [!WARNING]`, `> [!DANGER]`, or `> [!PREVIEW]` blocks for labeled callouts. Numbered guide headings become procedure steps, and Agent workflow/source sections receive consistent article treatments.

No historical version registry or documentation migration layer is maintained. Update the current product version in `lib/products.json` when changing the current documentation.

Search works locally over the generated content index. Agent context is assembled and copied locally, including the selected guide and optional task. It does not submit tasks to an AI service.

## Verification

`npm run verify` runs lint, TypeScript, content tests, static build and internal link/asset validation. `npm run test:browser` starts a local preview and tests Chromium (run `npx playwright install chromium` if needed). Browser checks cover both locales, all product surfaces, mobile overflow, search, copy and context-panel navigation. Never treat local export validation as proof of a public deployment.

## Design and source provenance

The active BRAND / NEW / DOCS frames in `asgardDocument.pen` define the visual system. Archived frames are not implementation requirements. Technical guide content follows the current source repositories linked from each article.

Artwork reconciled from `b5d50da1b2df1a87b5fac9413a327553c5c085c1`, which adds only `generated-2.png`; the Pen blob is unchanged. The original image is 1344 × 784 JPEG data despite its filename. The build copies its bytes unchanged to `public/generated-2.jpg`, ensuring a correct MIME type. Desktop cover, opacity and readability veils follow the active Pen frames; mobile adapts the crop and contrast. Faint guide lines and coordinate labels are baked into the supplied original, and have not been retouched.

Repository publication and hosting deployment are separate actions. The static build does not deploy or modify the production server.
