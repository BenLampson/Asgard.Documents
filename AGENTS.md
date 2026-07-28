# Asgard Documentation Site — Agent Guide

This repository is the long-lived bilingual documentation site for the Asgard ecosystem. Treat it as a product documentation source, not a one-off landing page.

## Mission

- Explain what each Asgard ecosystem library does, how to use it, and how it integrates with the rest of the ecosystem.
- Keep Chinese and English documentation aligned.
- Make the ecosystem explicitly AI ready: document both human-facing APIs and the matching Asgard Skills/agent workflows.
- Produce a build that the maintainer can package and publish to a CDN.
- Keep documentation current as Asgard, Heimdall, Skills, and future ecosystem repositories evolve.

## Authoritative source repositories

Use these local repositories as the current sources of truth:

| Subject | Source |
| --- | --- |
| Asgard framework | `D:\Codes\AsgardV3\src` |
| Asgard framework user docs | `D:\Codes\AsgardV3\src\doc` |
| Heimdall OIDC/IDP | `D:\Codes\github\Asgard.Heimdall` |
| AI-ready Skills | `C:\Users\benla\Documents\GitHub\Asgard.Skills` |
| Asgard StoryMaker (candidate; not yet published in this site) | `D:\Codes\github\Asgard.StoryMaker` |
| Public Asgard repository | `https://github.com/BenLampson/Asgard` |

Future ecosystem repositories must be added to this table before their documentation is published.

## Source-of-truth order

When sources disagree, resolve facts in this order:

1. Current public code, configuration types, route definitions, tests, and project files.
2. Repository-local `AGENTS.md` and the Asgard Skill relevant to the module.
3. Repository README and module documentation.
4. Existing content in this site.

Never preserve an existing page merely because it is already translated. Update the content to match implementation, then update both languages.

## Required workflow for every documentation update

1. Read this file and inspect the current worktree. Preserve unrelated user changes.
2. Identify the owning repository and load the relevant Asgard Skill(s) before interpreting specialized framework behavior.
3. Verify every API name, route, configuration key, version, claim, package name, and code sample against the current source.
4. Update Chinese and English content in the same change. Do not leave one locale knowingly stale.
5. Update navigation and search data when adding, renaming, or removing a page.
6. Update the version page when a public capability, integration boundary, runtime baseline, or compatibility statement changes.
7. Update `docs-sources.json` with the inspected date, commit, version, dirty-worktree state, and generated dirty fingerprint for every source used. Never hand-edit a fingerprint; generate it with `node scripts/source-fingerprint.mjs <repository>`.
8. Update `data/source-project-coverage.json` whenever either source repository adds, removes, or renames a `.csproj` or project-level `package.json`; classify every backend/frontend project and link it to at least one canonical guide. The coverage gate must fail closed on an unclassified project.
9. Run the site build and tests. For meaningful UI changes, verify the home page, one Chinese article, one English article, and a narrow viewport.
10. Report which source repositories and versions/commits were used. Call out any unresolved ambiguity instead of inventing behavior.

## Git hygiene and delivery history

- Treat Git history as part of the documentation deliverable. Do not leave multiple unrelated documentation topics accumulated in one opaque worktree.
- Commit after each coherent, verified documentation slice: for example one guide plus its bilingual counterpart, source contract, navigation/search integration, and focused tests.
- Use concise commit subjects that name the delivered capability. Keep unrelated content, tooling, deployment, and cleanup changes in separate commits.
- Before starting the next topic, confirm the previous commit is reproducible and the worktree contains only intentional follow-up changes.
- Push verified commits promptly when the maintainer has authorized pushing for the active task. Confirm the local commit and remote branch resolve to the same commit after push.
- Never commit generated `dist/` output, release archives, local caches, `.env` files, credentials, private keys, or source-repository dirty state.

## Content requirements

Each library or major module should eventually have:

- Overview: purpose, scope, current maturity, runtime baseline, and dependencies.
- Capabilities: concrete, implementation-backed features.
- Quick start: the shortest safe path to a working result.
- Concepts: stable mental model and boundaries.
- Configuration: keys, defaults, precedence, security notes, and examples.
- How-to guides: common end-to-end tasks.
- Integration: upstream/downstream contracts, auth, claims, protocols, routes, CORS, and failure behavior.
- API/reference: stable entry points and links to generated or source-level details.
- Operations: deployment, health, observability, migrations, and troubleshooting.
- AI Ready: relevant Skills, when agents must load them, hard rules, and review workflows.
- Release notes: additions, changes, deprecations, migrations, and documentation baseline.

Label roadmap items clearly. Do not present planned work as shipped capability.

## Bilingual policy

- Chinese is the primary authoring language unless a task specifies otherwise; English must express the same technical meaning naturally.
- Keep product names, code identifiers, routes, configuration keys, claims, protocol terms, and package names unchanged across locales.
- Do not machine-transliterate identifiers or invent different English API terminology.
- When a source exists only in Chinese, verify technical identifiers in code before translating.
- A page is complete only when `/zh/...` and `/en/...` both work and cross-language links resolve to the equivalent slug.
- Static CDN output must declare `lang="zh-CN"` or `lang="en"` correctly and expose canonical plus `zh-CN`/`en`/`x-default` alternates. Legacy routes canonicalize to the product-scoped route.

## Version and freshness policy

- Read Asgard version values from `D:\Codes\AsgardV3\src\Directory.Build.props`; do not hard-code a new version from memory.
- Read runtime baselines from project files and repository props.
- Treat Heimdall and Skills as independently versioned repositories. Read Heimdall from `be\Directory.Build.props`; record the inspected commit or working-tree date when a formal version is unavailable.
- Use exact dates (`YYYY-MM-DD`) for documentation baselines.
- Any change to public routes, configuration, claims, middleware defaults, package layout, supported providers, or security behavior requires a documentation freshness review.
- Configuration reference anchors and their owning C# files are recorded in `docs-sources.json`. When a `ConfigPath`, default, validation rule, or optional host node changes, update both languages and the recorded anchors together.
- Remove or clearly mark content that no longer matches source. Do not silently retain historical examples as current guidance.

## Asgard-specific hard rules to preserve in examples

- Asgard Controllers inherit `BaseController`.
- The backend dependency direction is `Controller -> Service -> Repository -> Entity`.
- Services produce DTOs; Controllers map DTOs to VOs and return unified `Response<T>`, `PageResponse<T>`, or `CursorResponse<T>` wrappers.
- Identity models build on `AbsAsgardUserInfo` and use the standard Asgard claim contract.
- Infrastructure capabilities obtained from `AbsAsgardContext` may be optional when their module is disabled; examples must be null-safe where appropriate. The standard Yggdrasil host is an explicit exception for cache: it registers a no-op `IMultiLevelCache` when caching is disabled.
- Treat a public option or helper type as a configuration/API surface, not proof of an end-to-end capability. Verify manager registration and the primary runtime path before claiming retry, failover, tracing, delayed delivery, dead-letter routing, clustering, listeners, or persistence as working behavior.
- If TsGen is chosen, generated directories are generated artifacts and must not contain handwritten business logic.
- Use `asgard-backend-guard` when reviewing changed backend examples with CRUD, tenant, audit, optimistic-lock, DTO mapping, or response-wrapper behavior.

## Heimdall security documentation rules

- Browser apps use Authorization Code + PKCE and never embed a Client Secret.
- Access Tokens, not ID Tokens, authenticate API requests.
- Platform and tenant Authorities/routes must remain distinct.
- Host API CORS and OIDC client CORS are separate configuration boundaries.
- Frontend permission checks improve UX only; backend authorization remains the security boundary.
- Do not publish real credentials, signing material, database strings, tokens, or secrets copied from local examples.
- Verify Discovery, JWKS, claims, UserInfo boundaries, Swagger/OpenAPI, logout, and reverse-proxy Issuer guidance when Heimdall protocol behavior changes.

## Site architecture and design

- Treat the information architecture as four related sites: `/{locale}` is the ecosystem portal, `/{locale}/asgard` is the framework product site, `/{locale}/heimdall` is the identity product site, and `/{locale}/skills` is the shared AI Ready engineering site.
- Keep product-facing brand, repository, version/status label, home path, and release path metadata in `app/product-registry.ts`. Header, document shell, landing pages, and future library surfaces must consume that registry instead of reintroducing product-specific URL/version conditionals. A new library is not integrated until both this registry and the route/discovery registry know it.
- Product documentation uses `/{locale}/{product}/docs/{slug}`. Keep sidebar navigation, search, previous/next links, version labels, and language switching inside the current product scope.
- `scripts/documentation-product.mjs` is the single slug-to-site registry used by runtime links, route discovery, static canonical generation, and tests. Add future libraries there before creating their scoped route and landing page; do not reintroduce local `startsWith(...)` product heuristics.
- `scripts/documentation-routes.mjs` is the single route/discovery manifest. Static HTML, canonical/hreflang metadata, sitemap, robots, machine-readable search data, `llms.txt`, and per-guide Markdown companions must derive from it. Legacy routes stay renderable but must remain `indexable: false` and must never enter sitemap, search, or AI discovery data.
- Browser search must consume `/search-index.json` instead of rebuilding a second client-side corpus. Keep code blocks, headings, Skills, and related-document metadata searchable; apply stable relevance ranking before the six-result display limit, and preserve keyboard/combobox behavior plus a visible narrow-viewport entry point.
- The ecosystem portal owns the architecture story, package map, installation entry points, shared AI Ready value proposition, and product selection. It must not duplicate the full product sidebars.
- Asgard, Heimdall, and Skills require distinct landing-page copy and emphasis. Asgard sells host/plugin/infrastructure engineering; Heimdall sells standards-based identity, federation, credentials, and security operations; Skills sells executable agent knowledge, selection, installation, verification, and review workflows.
- Keep the Heimdall version pill scoped to `/{locale}/heimdall/docs/heimdall-release-notes`. That page is the authoritative Release/Preview status index and must be updated whenever the Heimdall build version, dirty-preview set, migration boundary, or known compatibility warning changes.
- Preserve the legacy `/{locale}/docs/{slug}` route for existing bookmarks until the CDN redirect/static-shim contract is explicitly defined.
- Preserve the documentation-first visual direction: compact fixed header, clear product navigation, strong search, high-readability content, left documentation tree, and right page table of contents.
- The design is inspired by modern developer portals such as Dyte Docs, but Asgard branding, copy, code, and assets must remain original.
- Use Mermaid for source-verified architecture, protocol, and lifecycle diagrams when a visual materially improves comprehension. Keep the same diagram meaning and section ID in both locales, expose the Mermaid source as an accessible fallback, and never draw an option or roadmap item as a shipped runtime capability without source and test evidence.
- Keep pages responsive and keyboard accessible. Respect `prefers-reduced-motion`.
- Prefer semantic HTML and CSS. Avoid decorative dependencies and unnecessary client state.
- Store shared localized content and navigation in `app/content.ts` until scale justifies a generated content pipeline.
- Store source-heavy cross-product identity guides in `app/integration-content.ts`. Keep Chinese and English section IDs identical, and expose an actual related-doc link in both directions so the rendered-link gate verifies the handoff between product sites.
- Store AI Ready and catalog content in `app/ai-ready-content.ts`. Every skill directory under Asgard.Skills must appear in both locales, and `skillsContract.expectedSkills` must equal the actual directory set.
- Store the future-library onboarding contract in `app/ecosystem-onboarding-content.ts`. Before publishing another ecosystem library, follow that guide and update both `app/product-registry.ts` and `scripts/documentation-product.mjs`; a portal card or an unscoped guide alone is not an integrated product site.
- Store source-contracted host lifecycle and Heimdall operations runbooks in `app/lifecycle-operations-content.ts`; keep their source anchors in the matching Asgard `moduleContracts` or `heimdallContracts` entry.
- Store source-contracted dependency registration, static-file, Swagger/OpenAPI, and Heimdall token-lifecycle guides in `app/runtime-contract-content.ts`; keep source anchors synchronized with both contracts in `docs-sources.json`.
- Store the Asgard response/error contract in `app/api-contract-content.ts`, full CRUD vertical slice in `app/asgard-crud-content.ts`, Heimdall account/session contract in `app/heimdall-account-security-content.ts`, and the released management API index in `app/heimdall-management-api-content.ts`. Each page must retain bilingual section-ID parity, an Agent workflow mapping, and a matching source contract in `docs-sources.json`.
- Store the non-HTTP tenant-isolation runbook in `app/tenant-background-content.ts`, the Trace/database-log runbook in `app/asgard-observability-operations-content.ts`, the hosted-login replacement guide in `app/heimdall-custom-frontend-content.ts`, and the SCIM provider runbook in `app/heimdall-scim-operations-content.ts`. Preserve bilingual section-ID parity and keep every implementation claim guarded by the corresponding `moduleContracts` or `heimdallContracts` entry.
- Store the production database, cache, messaging, job, security, identity/authorization, TsGen, and analyzer runbooks in their dedicated `app/asgard-*-operations-content.ts` files. Each must distinguish declared options from the primary runtime path, include failure/recovery or adoption acceptance, preserve bilingual section-ID parity, and retain a matching `moduleContracts` source contract.
- Keep the runtime configuration-root contract in `app/config-reference-data.ts` and its bilingual guide in `app/config-reference-content.ts`. Field-level generation must recursively traverse an explicit allowlist of loaded configuration types and then apply a manually reviewed runtime/validation overlay. Never regex the whole source tree and present the matches as an exhaustive reference; distinguish an absent node from a present object whose fields use defaults, and exclude types that the host does not load.
- Keep the first field-level configuration contracts in `app/config-field-reference-data.ts` and bilingual presentation in `app/config-field-reference-content.ts`. Technical paths, attribute/CLR/effective defaults, presence, validation, sensitivity, consumer status, and source symbols live once in the data file; locale copy must not fork those facts. The current dataset is manually source-reviewed and must not be described as an automatic reflection generator until that generator and its regression tests actually exist.
- Keep the database, cache, messaging, job, logging, and Trace field contracts in `app/infrastructure-config-field-data.ts` and their bilingual presentation in `app/infrastructure-config-field-content.ts`. Every field must retain a runtime status (`wired`, `partially-wired`, `standalone-only`, `validation-only`, or `declared-unwired`) based on a verified consumer; never promote an Options/helper declaration to a shipped capability.
- Keep static files, CORS, default JWT, Swagger, TsGen, rate limiting, health checks, and external-plugin host fields in `app/host-feature-config-field-data.ts` with bilingual presentation in `app/host-feature-config-field-content.ts`. Preserve nullable-parent versus always-created semantics, disabled-node validation traps, request-time failures, public endpoint/file boundaries, and runtime wiring status.
- `app/site-baseline.ts` is the runtime/AI-output baseline for framework, Heimdall, runtime versions, review date, and Preview policy. Keep it synchronized with `docs-sources.json` and the release-notes page; static checks must fail when those sources diverge.
- Keep per-guide Agent workflow mappings in `app/skill-references.ts`. Every referenced name must exist in the Skills catalog; key API, configuration, identity, infrastructure, and Heimdall guides must link to the scoped Skills catalog instead of merely mentioning AI Ready in marketing copy.
- Every canonical guide must expose a visible link to its generated `index.html.md` companion in addition to the machine-only `<link type="text/markdown">`. The ecosystem portal must keep direct human-visible entry points for `/llms.txt` and `/search-index.json` so AI Ready remains an inspectable workflow rather than only marketing copy.
- Do not advertise Asgard.Skills `main`/HEAD as a stable bundle while compatibility warnings remain. Pin an audited ref, distinguish checkout from consumer installation, and document that the Codex installer aborts when a destination directory already exists.
- When a known upstream Skill contradicts the current Asgard release, preserve a source anchor plus a visible compatibility warning until the upstream source is fixed; then remove both in the same documentation change.
- Current verified Skill drift also includes `host.staticFiles.enableDefaultFiles` (5.1.3 source defaults false), the complete PluginState diagram (most states are not written by the current main path), and claims that host middleware hooks have arbitrary placement or that BeforeServiceRegistration reliably overrides later framework registrations. Follow source until those Skills are corrected.
- Reuse the same slug across locales so language switching remains deterministic.

### Heimdall and Asgard resource API contract

- Asgard 5.1.3 built-in `host.auth` is a tenant-issuer JWT resource-server path: `issuerTemplate` must contain exactly one `{tenant}`, and the configured single audience must match one token `aud` value exactly.
- In Heimdall, an API audience comes from a custom tenant Scope `Resources` value. The client must be allowed to request that Scope and must actually request it; otherwise the token audience falls back to `client_id`.
- Never present an ID Token as an API credential. Never present an opaque Heimdall access token, a platform root issuer, or simultaneous platform-and-tenant issuers as supported by the built-in Asgard 5.1.3 `host.auth`; those require an external authentication/introspection design.
- Keep SPA registration, PKCE, callbacks, logout, UserInfo, refresh, OIDC CORS, API CORS, audience, JWT validation, claims, AsgardAuth, and tenant resource ownership as separate documented responsibilities.
- Local Discovery/JWKS validation does not query Heimdall revocation state per request. Do not promise immediate logout/revoke propagation to external APIs unless a released deny-list, introspection, or invalidation integration proves it.
- Heimdall introspection currently accepts confidential clients but only returns active for an access token owned by that same client and tenant. Do not describe it as general RFC 7662 resource-server introspection. Refresh-token revocation currently requires `token_type_hint=refresh_token`; omitting it returns success without revoking that token.
- Asgard 5.1.3 static files are public and run before Trace, limiting, authentication, tenancy, and authorization. `enableDefaultFiles` defaults to false. Never put protected content in `webRootPath`.
- Asgard 5.1.3 custom Swagger `routePrefix` changes the UI without changing the JSON route template. Keep it at `swagger` in published guidance until source and end-to-end tests prove another value.
- Heimdall 5.3.19 clean `main` and tag `v5.3.19` resolve to `0032070`; `MultiTenantCorsPolicyProvider.cs` is part of that clean release. Current CORS guidance must use this clean released source and must not reintroduce the resolved dirty-worktree caveat.
- Heimdall 5.3.19 still does not provide a complete empty-PostgreSQL baseline, one unified migration ledger, or down scripts. The four `20260720_application_domain_00_precheck` → `01_migrate` → `02_postcheck` → `03_cleanup` PostgreSQL scripts are a controlled, contract-tested application-domain upgrade sequence, not a complete database bootstrap or general migration framework. Treat every other SQL file as a separately reviewed increment and record operator execution outside Heimdall where no built-in ledger exists.
- A fixed HTTPS `oidc.issuer` does not change `Request.Scheme` or force the `Asgard.Identity` cookie Secure. Require a verified trusted-proxy scheme restoration and real-browser cookie inspection; current stock source has no documented `KnownProxies`/`KnownNetworks` configuration surface.

## Build and CDN handoff

- Use the repository package manager and lockfile.
- The required release gate is `npm run verify`. Do not substitute a narrower green check when preparing a CDN handoff.
- `npm run links:check` renders the ecosystem portals, all three scoped sites, every canonical bilingual topic, every legacy compatibility route, all discovered internal links, and all same-page anchors. It requires a current `dist/` build.
- `npm run docs:check` enforces bilingual slug parity and compares the advertised Asgard version with local source when available. Use `node scripts/check-docs-freshness.mjs --strict-source` when source presence is mandatory.
- Run `npm run docs:check:live` whenever package installation, package selection, upgrade guidance, or the advertised public Asgard release changes. It verifies all recorded package IDs against the NuGet V3 feed.
- `npm run build` produces a Worker-compatible server plus client assets under `dist/server/` and `dist/client/`; deploy both for Worker runtimes.
- `npm run build:cdn` additionally generates a plain static object-CDN artifact under `dist/static/`. Upload its contents, not the parent folder, and configure directory-index resolution to `index.html`.
- `npm run static:check` must prove that every canonical/legacy route has HTML, every referenced asset exists, and no build-machine file URL leaked into the artifact. The static export must not require `dist/server/index.js` at runtime.
- The static artifact must include `sitemap.xml`, `robots.txt`, `search-index.json`, `llms.txt`, `llms-full.txt`, and one `index.html.md` companion for every canonical localized guide. Sitemap, search, and AI-document entries must exactly match indexable canonical routes, use reciprocal locale alternates, omit legacy routes, and must not invent `lastmod` timestamps. Markdown is generated from the same typed content as HTML rather than scraped from rendered pages. `DOCS_SITE_ORIGIN` defaults to the declared public origin and may only be overridden with an absolute HTTPS origin.
- AI Markdown must retain the page review date, Agent workflow Skills, related cross-product documentation, Release/Preview wording, notes, and code blocks. Choose a code fence longer than any backtick run in the source. `llms.txt` keeps complete-corpus assets under `## Optional`, while `## Start here` stays a small curated Markdown set.
- CDN metadata must serve AI assets as readable UTF-8 text: `llms*.txt` as `text/plain` (or compatible Markdown text), `index.html.md` as `text/markdown` or `text/plain`, and `search-index.json` as `application/json`. A release handoff must use real HTTPS GET checks for status, MIME, and advertised links after upload; local static validation does not prove the public hostname is live.
- `npm run links:external:offline` is part of the release gate and deterministically validates external URL syntax plus same-origin artifact targets. Run the separate live report for network status; treat authentication/rate-limit/transient failures as diagnostics and use strict mode only to gate confirmed `404`/`410` responses.
- After meaningful routing, navigation, search, responsive-layout, or shell changes, use a real browser to open the ecosystem portal, one Asgard page, one Heimdall page, one Skills page, both locales, and a narrow viewport. Confirm navigation, language switching, horizontal overflow, and browser-console errors.
- Do not deploy, upload, or modify CDN state unless the user explicitly asks. The maintainer currently owns packaging and CDN publication.
- Never commit `.env`, deployment credentials, generated local state, or real infrastructure secrets.

## Documentation backlog

The first site release establishes the information architecture. The bilingual Quick Start is a source-contracted, public-NuGet-compiled first application with HTTP smoke results; keep it runnable whenever host, plugin, controller, encryption, Swagger, or health-check contracts change. Continue expanding, in roughly this order:

1. Keep database, cache, messaging, jobs, plugin host, logging, Trace, and security field-level references synchronized through `moduleContracts`.
2. Expand the current database, cache, messaging, jobs, security, identity, tenancy, authorization, tracing, TsGen, and analyzer guides with operational diagnostics and migration guidance.
3. Expand the current Heimdall deployment, account/session governance, released management API index, mini JWT issuer, MCP, identity webhook/invalidation, federation/MFA, SCIM, and SIEM guides with deeper operations guidance. Keep dirty-worktree capabilities labeled preview until a release commit proves shipment.
4. Expand the source-contracted Asgard host lifecycle, exact middleware order, health/rate-limiting, and plugin lifecycle guides; add dedicated dependency-registration and static/OpenAPI runtime guides.
5. Expand the Heimdall database migration, reverse-proxy/Secure Cookie, Client Credentials, token-lifecycle/introspection, and tenant key-rotation runbooks; add a general resource-server introspection contract and released-baseline migration manifests only when source supplies them.
6. Publish an audited Asgard.Skills compatibility release, then add machine-readable bundles/dependencies, installed locks, staged upgrades, rollback, and per-page Agent workflow links.
7. Continue expanding generated field/API reference coverage; sitemap/search indexing, external-link monitoring, and AI discovery files are now part of the release artifact.
8. Per-release migration guides and a reliable changelog ingestion workflow.

## Definition of done

A documentation change is done when it is source-verified, bilingual, linked from the right navigation surface, safe to publish, responsive, buildable, tested, and reflected in release/freshness notes when applicable.
