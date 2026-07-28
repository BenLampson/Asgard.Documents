# Asgard Documentation

The bilingual documentation site for the Asgard ecosystem: the Asgard application framework, Heimdall identity provider, AI-ready Skills, and future libraries.

## Local development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Chinese content is available at `/zh` and English content at `/en`.

The site is organized as three connected documentation surfaces:

- `/{locale}` — ecosystem architecture, package map, installation entry points, and AI Ready story
- `/{locale}/asgard` — the Asgard framework product site and scoped documentation
- `/{locale}/heimdall` — the Heimdall identity product site and scoped documentation
- `/{locale}/skills` — the shared AI Ready / Asgard Skills site, installation guidance, and catalog

Canonical articles use `/{locale}/{product}/docs/{slug}`. The older `/{locale}/docs/{slug}` route remains available for bookmark compatibility.

## Validation and packaging

```powershell
npm run build
npm run build:cdn
npm test
npm run docs:check:live
npm run links:external
npm run verify
```

The deployment build is written to `dist/`. See `AGENTS.md` for source-of-truth repositories, bilingual policy, version maintenance, content requirements, and CDN handoff rules.

`npm test` verifies that every topic exists once in each locale and compares documented versions, commits, clean/dirty state, and dirty-worktree fingerprints with local source. `npm run docs:check:live` additionally verifies every recorded Asgard package against the live NuGet V3 feed. Source and package review state is recorded in `docs-sources.json`.

`npm run verify` is the release gate. It checks live source/package freshness, builds the site, runs lint and content tests, renders every canonical and legacy route, verifies internal links and page anchors, and performs a deterministic offline audit of external-link syntax and same-origin resources. Run `npm run links:external` for a non-blocking live network report or `npm run links:external:strict` when confirmed `404`/`410` responses should fail a release review.

`npm run build` produces the Worker-compatible application in `dist/server/` plus `dist/client/`. After building, `npm start` runs that exact Worker bundle through Wrangler, including its `ASSETS` binding. `npm run build:cdn` additionally renders every canonical and legacy route to a plain static site in `dist/static/`.

For a static object CDN, upload the **contents** of `dist/static/` and configure directory-index resolution to serve `index.html`. The artifact also contains `sitemap.xml`, `robots.txt`, a versioned `search-index.json`, `llms.txt`, `llms-full.txt`, an audited `skills-manifest.json`, its derived `asgard-skills.lock.json`, and one `index.html.md` companion for every canonical localized guide. The sitemap/search/AI discovery surfaces include only product-scoped canonical pages; legacy bookmark routes remain in the artifact but are deliberately excluded from discovery. `npm run static:check` validates these files against the shared route manifest and shared document content, in addition to route completeness, language/canonical metadata, referenced assets, and the absence of Worker or build-machine file dependencies. For a Worker-compatible runtime, deploy `dist/server/` and `dist/client/` together instead.

Public URLs default to `https://asgard.benlampson.cn`. Set `DOCS_SITE_ORIGIN` to a different absolute HTTPS origin before `npm run build:cdn` and all static checks when packaging for another hostname; paths, credentials, query strings, and fragments are rejected.

Configure CDN metadata so `llms.txt` and `llms-full.txt` are served as UTF-8 `text/plain` (or Markdown-compatible text), every `index.html.md` as UTF-8 `text/markdown` or `text/plain`, and `search-index.json`, `skills-manifest.json`, and `asgard-skills.lock.json` as `application/json`. Before switching traffic, verify real HTTPS `GET` responses, content types, and the links advertised by `llms.txt`; local file existence alone is not a production availability check.

`npm run verify` builds and validates both delivery formats. The maintainer remains responsible for uploading the selected artifact and configuring CDN cache/rollback policy.

## Current documentation baseline

- Matched Chinese/English topic counts are derived by the route manifest and exposed in `release-readiness-report.json`; they are not hand-maintained here
- Asgard `5.1.3`
- Heimdall `5.3.19`（clean `main` 与 tag `v5.3.19` 均为 `0032070`，当前没有 HEAD-only 差异）
- Public Asgard core package line `5.1.3` (verified against the NuGet V3 feed)
- .NET `10` / C# `14`
- Source review date: `2026-07-28`

## License

MIT
