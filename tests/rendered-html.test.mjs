import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getDocumentationRoutes } from "../scripts/documentation-routes.mjs";
import { productForDocumentationSlug } from "../scripts/documentation-product.mjs";
import { searchIndexEntries } from "../app/document-search.mjs";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the ecosystem documentation home", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /一个生态，两个产品/);
  assert.match(html, /AI Ready/);
  assert.match(html, /Heimdall Identity Platform/);
  assert.match(html, /按你现在要完成的任务选择入口/);
  assert.match(html, /href="\/zh\/heimdall\/docs\/heimdall-deployment"/);
  assert.match(html, /href="\/zh\/heimdall\/docs\/heimdall-jwt-signing"/);
  assert.match(html, /href="\/zh\/skills\/docs\/skills-installation"/);
  assert.match(html, /href="\/llms\.txt"/);
  assert.match(html, /href="\/search-index\.json"/);
  assert.match(html, /href="\/skills-manifest\.json"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("renders matching Chinese and English documentation routes", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-integration"),
    render("/en/heimdall/docs/heimdall-integration"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  assert.match(await zhResponse.text(), /接入 Heimdall/);
  assert.match(await enResponse.text(), /Integrate Heimdall/);
});

test("renders the bilingual Heimdall 5.3.19 release with tag-equal HEAD", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-release-notes"),
    render("/en/heimdall/docs/heimdall-release-notes"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /0032070/);
    assert.match(html, /5\.3\.19/);
    assert.match(html, /HEAD.*tag|tag.*HEAD/s);
    assert.match(html, /12 (?:个 )?PostgreSQL|12 PostgreSQL/);
    assert.match(html, /Application-domain|Application 域/);
    assert.match(html, /MCP credential-policy|MCP credential policy|MCP 凭据策略/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(zh, /版本、发布状态与升级基线/);
  assert.match(en, /Versions, release status, and upgrade baseline/);
});

test("keeps browser search aligned with the canonical machine index", async () => {
  const response = await render("/search-index.json");
  assert.equal(response.status, 200);
  const payload = await response.json();
  const asgardEnglish = payload.entries.filter((entry) => entry.locale === "en" && entry.product === "asgard");
  const asgardChinese = payload.entries.filter((entry) => entry.locale === "zh" && entry.product === "asgard");

  const englishFields = searchIndexEntries(asgardEnglish, "declared unwired loadTimeoutSeconds");
  const chineseFields = searchIndexEntries(asgardChinese, "加载 超时");
  assert.equal(englishFields[0]?.slug, "host-configuration-fields");
  assert.ok(chineseFields.some((entry) => entry.slug === "host-configuration-fields"));
  assert.match(englishFields[0]?.content ?? "", /plugin\.loadTimeoutSeconds/);

  const skillResults = searchIndexEntries(asgardEnglish, "identity-integration");
  assert.ok(skillResults.some((entry) => entry.skills.includes("identity-integration")));
  assert.ok(skillResults.every((entry) => entry.locale === "en" && entry.product === "asgard"));

  const contextResults = searchIndexEntries(asgardEnglish, "GetAsgardContext TenantScopeFactory no-op");
  assert.equal(contextResults[0]?.slug, "context-usage");
  assert.match(contextResults[0]?.content ?? "", /MultiLevelCache\(null, null, cacheConfig\)/);
});

test("renders distinct Asgard, Heimdall, and Skills sites", async () => {
  const [asgard, heimdall, skills] = await Promise.all([
    render("/zh/asgard"),
    render("/zh/heimdall"),
    render("/zh/skills"),
  ]);
  assert.equal(asgard.status, 200);
  assert.equal(heimdall.status, 200);
  assert.equal(skills.status, 200);
  const [asgardHtml, heimdallHtml, skillsHtml] = await Promise.all([asgard.text(), heimdall.text(), skills.text()]);
  assert.match(asgardHtml, /把复杂后端/);
  assert.match(asgardHtml, /\/zh\/asgard\/docs\/packages-and-installation/);
  assert.match(asgardHtml, /\/zh\/asgard\/docs\/resource-api-authentication/);
  assert.match(heimdallHtml, /身份基础设施/);
  assert.match(heimdallHtml, /\/zh\/heimdall\/docs\/heimdall-deployment/);
  assert.match(heimdallHtml, /href="\/zh\/heimdall\/docs\/heimdall-release-notes"/);
  assert.match(heimdallHtml, /href="https:\/\/github\.com\/BenLampson\/Asgard\.Heimdall"/);
  assert.match(skillsHtml, /让 Agent 真正懂 Asgard/);
  assert.match(skillsHtml, /\/zh\/skills\/docs\/skills-installation/);
  assert.match(skillsHtml, /\/zh\/skills\/docs\/skills-catalog/);
  assert.match(asgardHtml, /\/zh\/skills\/docs\/ai-ready/);
});

test("renders the source-verified NuGet package guide", async () => {
  const response = await render("/en/asgard/docs/packages-and-installation");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Asgard\.PluginSdk --version 5\.1\.3/);
  assert.match(html, /Asgard\.Yggdrasil\.AspNetCore/);
  assert.match(html, /Asgard\.Analyzers/);
  assert.match(html, /plugin implementation from its starter\/host/);
  assert.match(html, /Minimum entry point by scenario/);
  assert.match(html, /PluginSdk → Yggdrasil/);
  assert.match(html, /FreeSql and FreeSql\.DbContext/);
  assert.match(html, /source directory, \.csproj, or namespace is not proof of publication/);
  assert.match(html, /ManagePackageVersionsCentrally/);
  assert.match(html, /PrivateAssets=&quot;all&quot;/);
  assert.match(html, /dotnet list package --include-transitive/);
  assert.match(html, /git revert &lt;upgrade-commit&gt;/);
});

test("renders the compiled and HTTP-smoke-tested Asgard first application", async () => {
  const response = await render("/en/asgard/docs/quick-start");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Asgard\.PluginSdk/);
  assert.match(html, /Version=&quot;5\.1\.3&quot;/);
  assert.match(html, /RunAsync&lt;FirstAppPlugin&gt;\(&quot;app\.yaml&quot;\)/);
  assert.match(html, /Success&lt;string&gt;\(&quot;Hello from Asgard&quot;\)/);
  assert.match(html, /ASGARD_AES_KEY/);
  assert.match(html, /scanDirectories: \[\]/);
  assert.match(html, /host\.cors\.enabled: false/);
  assert.match(html, /http:\/\/127\.0\.0\.1:5087\/api\/hello/);
  assert.match(html, /swagger\/v1\/swagger\.json/);
  assert.match(html, /Failed to determine the https port for redirect/);
});

test("renders the bilingual Asgard 5.1.3 release delta", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/release-notes"),
    render("/en/asgard/docs/release-notes"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /5\.1\.3/);
    assert.match(html, /d1002d1/);
    assert.match(html, /90e8a8b/);
    assert.match(html, /application_manifest_version/);
    assert.match(html, /T extends object/);
    assert.match(html, /waitForReconnect/);
    assert.match(html, /Mapster/);
    assert.match(html, /Quartz/);
    assert.match(html, /10\.0\.302/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

const { slugs: documentationSlugs } = await getDocumentationRoutes();

test("keeps every documentation topic available in both locales", async () => {
  for (const slug of documentationSlugs) {
    const product = productForDocumentationSlug(slug);
    const [zhResponse, enResponse] = await Promise.all([
      render(`/zh/${product}/docs/${slug}`),
      render(`/en/${product}/docs/${slug}`),
    ]);

    assert.equal(zhResponse.status, 200, `missing Chinese route for ${slug}`);
    assert.equal(enResponse.status, 200, `missing English route for ${slug}`);

    const [zhHtml, enHtml] = await Promise.all([
      zhResponse.text(),
      enResponse.text(),
    ]);
    assert.match(zhHtml, new RegExp(`href="/en/${product}/docs/${slug}"`));
    assert.match(enHtml, new RegExp(`href="/zh/${product}/docs/${slug}"`));
  }
});

test("renders a bilingual source-contracted Asgard Skills site", async () => {
  const [zhInstall, enInstall, zhCatalog, enCatalog] = await Promise.all([
    render("/zh/skills/docs/skills-installation"),
    render("/en/skills/docs/skills-installation"),
    render("/zh/skills/docs/skills-catalog"),
    render("/en/skills/docs/skills-catalog"),
  ]);
  for (const response of [zhInstall, enInstall, zhCatalog, enCatalog]) assert.equal(response.status, 200);

  const [zhInstallHtml, enInstallHtml, zhCatalogHtml, enCatalogHtml] = await Promise.all([
    zhInstall.text(), enInstall.text(), zhCatalog.text(), enCatalog.text(),
  ]);
  for (const html of [zhInstallHtml, enInstallHtml]) {
    assert.match(html, /install-skill-from-github\.py/);
    assert.match(html, /--ref/);
    assert.match(html, /7b26856/);
    assert.match(html, /5\.0\.1/);
    assert.match(html, /\{tenant\}/);
    assert.match(html, /EF Core/);
    assert.match(html, /7b26856ae6a3266f9d33be44c8880ee8863888d3/);
    assert.match(html, /7839e3a/);
    assert.match(html, /heimdall-application-rbac/);
    assert.match(html, /heimdall-mcp-management/);
    assert.match(html, /removed: none|删除：无/);
    assert.match(html, /renamed: none|改名：无/);
    assert.match(html, /ten compatibility warnings|10 条兼容性告警/);
    assert.match(html, /not transactional|不是事务/);
    assert.match(html, /no transitive Skill dependencies|不解析 Skill 之间的传递依赖/);
    assert.match(html, /skills\/asgard-plugin-structure/);
    assert.match(html, /\{tenantId\}/);
    assert.match(html, /fails configuration validation|配置校验阶段失败/);
    assert.match(html, /host\.staticFiles\.enableDefaultFiles/);
    assert.match(html, /host\.healthCheck\.path/);
    assert.match(html, /arbitrary placement|任意位置/);
    assert.match(html, /transient states|瞬态状态/);
    assert.match(html, /href="\/skills-manifest\.json"/);
    assert.match(html, /href="\/asgard-skills\.lock\.json"/);
    assert.match(html, /audited-snapshot/);
    assert.match(html, /explicitly reviewed set|审核过的显式集合/);
    assert.match(html, /href="\/verify-skills-installation\.mjs"/);
    assert.match(html, /staging directory|staging 目录/);
    assert.match(html, /extra directory|额外目录/);
    assert.match(html, /href="\/skills-compatibility-report\.json"/);
    assert.match(html, /stableEligible|stable bundle|stable bundle|stable/);
  }

  const manifest = JSON.parse(await readFile(new URL("../docs-sources.json", import.meta.url), "utf8"));
  assert.equal(manifest.skillsContract.expectedSkills.length, 29);
  assert.ok(manifest.skillsContract.expectedSkills.includes("heimdall-application-rbac"));
  assert.ok(manifest.skillsContract.expectedSkills.includes("heimdall-mcp-management"));
  assert.ok(manifest.skillsContract.expectedSkills.includes("heimdall-service-integration"));
  for (const skillName of manifest.skillsContract.expectedSkills) {
    assert.match(zhCatalogHtml, new RegExp(skillName));
    assert.match(enCatalogHtml, new RegExp(skillName));
  }
  for (const html of [zhCatalogHtml, enCatalogHtml]) {
    assert.match(html, /tenant-bound BackendService|租户绑定 BackendService/);
    assert.match(html, /read-only directory|只读目录/);
    assert.match(html, /invalidation Webhooks|身份失效 Webhook/);
    assert.match(html, /revocation watermarks|撤销水位/);
    assert.match(html, /secret rotation|Secret 轮换/);
    assert.match(html, /end-to-end acceptance|端到端验收/);
    assert.match(html, /Application Manifest/);
    assert.match(html, /two-phase write confirmation|二阶段写确认/);
    assert.match(html, /OAuth.*AK\/SK|OAuth\/AK-SK/);
  }

  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zhInstallHtml), sectionIds(enInstallHtml));
  assert.deepEqual(sectionIds(zhCatalogHtml), sectionIds(enCatalogHtml));
});

test("renders the bilingual Skills audited-snapshot release and compatibility index", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/skills/docs/skills-release-notes"),
    render("/en/skills/docs/skills-release-notes"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /v4\.0\.0/);
    assert.match(html, /7b26856ae6a3266f9d33be44c8880ee8863888d3/);
    assert.match(html, /audited-snapshot/);
    assert.match(html, /skills: 29/);
    assert.match(html, /explicitBundles: 4/);
    assert.match(html, /openWarnings: 10/);
    assert.match(html, /stableEligible: false/);
    assert.match(html, /all-reviewed/);
    assert.match(html, /identity-integration/);
    assert.match(html, /stale-asgard-release-baseline/);
    assert.match(html, /skills-compatibility-report\.json/);
    assert.match(html, /asgard-skills\.lock\.json/);
    assert.match(html, /verify-skills-installation\.mjs/);
    assert.match(html, /index\.html\.md/);
    assert.match(html, /class="version-pill" href="\/(?:zh|en)\/skills\/docs\/skills-release-notes"/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual future ecosystem-library onboarding contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/skills/docs/skills-ecosystem-onboarding"),
    render("/en/skills/docs/skills-ecosystem-onboarding"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);

  for (const html of [zh, en]) {
    assert.match(html, /app\/product-registry\.ts/);
    assert.match(html, /scripts\/documentation-product\.mjs/);
    assert.match(html, /docs-sources\.json/);
    assert.match(html, /data\/source-project-coverage\.json/);
    assert.match(html, /npm run verify/);
    assert.match(html, /index\.html\.md/);
    assert.match(html, /Agent workflow/i);
  }

  assert.match(zh, /新增生态库与独立文档站/);
  assert.match(en, /Onboard an ecosystem library and product site/);
});

test("renders bilingual fail-closed Agent workflow coverage", async () => {
  const responses = await Promise.all([render("/zh/skills/docs/ai-ready"), render("/en/skills/docs/ai-ready")]);
  const html = await Promise.all(responses.map(async (response) => { assert.equal(response.status, 200); return response.text(); }));
  for (const page of html) {
    assert.match(page, /href="\/agent-workflow-coverage\.json"/);
    assert.match(page, /href="\/verify-agent-workflow-coverage\.mjs"/);
    assert.match(page, /projectFileCoverageOutOfScope|不检查 csproj|excludes csproj/);
    assert.match(page, /fail closed/i);
  }
  const ids = (page) => [...new Set([...page.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(ids(html[0]), ids(html[1]));
});

test("renders the bilingual changelog review workflow without promoting commit subjects", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/skills/docs/skills-changelog-review"),
    render("/en/skills/docs/skills-changelog-review"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /update-changelog-review\.mjs/);
    assert.match(html, /changelog-review-report\.json/);
    assert.match(html, /evidenceOnly/);
    assert.match(html, /requiresReview/);
    assert.match(html, /source-fingerprint\.mjs/);
    assert.match(html, /history-diverged/);
    assert.match(html, /href="\/changelog-review-report\.json"/);
    assert.match(html, /href="\/release-documentation-plan\.json"/);
    assert.match(html, /href="\/verify-release-documentation-plan\.mjs"/);
    assert.match(html, /unresolvedEvidenceFailsClosed|fail closed/i);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual release handoff without claiming verify or CDN success", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/skills/docs/skills-release-handoff"),
    render("/en/skills/docs/skills-release-handoff"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /release-readiness-report\.json/);
    assert.match(html, /required-not-attested/);
    assert.match(html, /not-performed/);
    assert.match(html, /operator-gates-required/);
    assert.match(html, /public hostname(?: is)? live|public hostname live/);
    assert.match(html, /href="\/release-readiness-report\.json"/);
    assert.match(html, /href="\/artifact-manifest\.json"/);
    assert.match(html, /href="\/verify-static-artifact\.mjs"/);
    assert.match(html, /href="\/plan-static-rollback\.mjs"/);
    assert.match(html, /aggregateSha256/);
    assert.match(html, /addFromTarget/);
    assert.match(html, /never copies, deletes, uploads, deploys, or switches traffic|不复制、删除、上传、部署或切换流量/);
    assert.match(html, /self-hash cycle|自哈希循环/);
    assert.doesNotMatch(html, /npm run verify (?:passed|succeeded|is green)/i);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("connects technical guides to their Agent workflow Skills", async () => {
  const [api, configuration, heimdall, distributedLock] = await Promise.all([
    render("/en/asgard/docs/api-development"),
    render("/en/asgard/docs/configuration"),
    render("/en/heimdall/docs/heimdall-integration"),
    render("/en/asgard/docs/distributed-lock-operations"),
  ]);
  const [apiHtml, configurationHtml, heimdallHtml, distributedLockHtml] = await Promise.all([
    api.text(), configuration.text(), heimdall.text(), distributedLock.text(),
  ]);
  assert.match(apiHtml, /\$asgard-api-development/);
  assert.match(apiHtml, /\$asgard-dotnet-10-csharp-14/);
  assert.match(apiHtml, /\$asgard-backend-guard/);
  assert.match(configurationHtml, /\$asgard-configuration/);
  assert.match(configurationHtml, /\$asgard-host-features/);
  assert.match(heimdallHtml, /\$identity-integration/);
  assert.match(distributedLockHtml, /\$asgard-dotnet-10-csharp-14/);
  for (const html of [apiHtml, configurationHtml, heimdallHtml, distributedLockHtml]) {
    assert.match(html, /href="\/en\/skills\/docs\/skills-catalog"/);
  }
});

test("renders source-contracted lifecycle and operations runbooks", async () => {
  const paths = [
    "/en/asgard/docs/host-lifecycle",
    "/en/asgard/docs/middleware-pipeline",
    "/en/asgard/docs/health-and-rate-limiting",
    "/en/asgard/docs/plugin-lifecycle",
    "/en/heimdall/docs/heimdall-database-migrations",
    "/en/heimdall/docs/heimdall-reverse-proxy",
    "/en/heimdall/docs/heimdall-client-credentials",
    "/en/heimdall/docs/heimdall-tenant-signing-key-rotation",
  ];
  const responses = await Promise.all(paths.map(render));
  for (const response of responses) assert.equal(response.status, 200);
  const html = await Promise.all(responses.map((response) => response.text()));

  assert.match(html[0], /BeforeConfigurationLoad/);
  assert.match(html[1], /UseAsgardTenant/);
  assert.match(html[2], /timeoutSeconds.*not an execution bound/s);
  assert.match(html[3], /Non-Running plugins can still attach to the Web pipeline/);
  assert.match(html[4], /no complete empty-PostgreSQL baseline/);
  assert.match(html[4], /v5\.3\.19 \/ commit 0032070/);
  assert.match(html[4], /twelve PostgreSQL increments/);
  assert.match(html[4], /identity_webhook.*mcp_credentials.*security_event_lifecycle.*sys_user_profile.*20260720_application_domain/s);
  assert.match(html[4], /no complete empty-PostgreSQL baseline, built-in version\/checksum\/success ledger, or down scripts/);
  assert.match(html[5], /SecurePolicy=SameAsRequest/);
  assert.match(html[6], /token_type=BackendService/);
  assert.match(html[7], /five-minute internal cache/);
  assert.match(html[7], /at-most-five/);
  assert.match(html[7], /uk_tenant_oidc_key_tenant_kid/);
  assert.match(html[7], /TenantResourceAccessGuard/);
  for (const page of html) assert.match(page, /AGENT WORKFLOW/);
});

test("renders the bilingual plugin lifecycle production failure runbook", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/plugin-lifecycle"),
    render("/zh/asgard/docs/plugin-lifecycle"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /ConfigureServicesAsync/);
    assert.match(page, /ConfigureMiddlewareAsync/);
    assert.match(page, /Plugin system ready \(N running\)/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /without checking State/);
  assert.match(html, /LoadTimeoutSeconds is not wired/);
  assert.match(html, /does not Stop\/Dispose it/);
  assert.match(html, /does not call ConfigureServices, Start/);
  assert.match(html, /restore the previous complete host\+plugin\+config set/);
  assert.match(zhHtml, /非 Running 插件仍可能装配 Web 管线/);
  assert.match(zhHtml, /没有生命周期超时托底/);
});

test("renders the bilingual Heimdall reverse proxy and secure-cookie contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/heimdall/docs/heimdall-reverse-proxy"),
    render("/zh/heimdall/docs/heimdall-reverse-proxy"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [enHtml, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);

  for (const html of [enHtml, zhHtml]) {
    assert.match(html, /SecurePolicy=SameAsRequest/);
    assert.match(html, /Request\.Scheme/);
    assert.match(html, /KnownProxies/);
    assert.match(html, /X-Forwarded-Prefix/);
    assert.match(html, /\/mcp/);
    assert.match(html, /0032070/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(enHtml, /does not rewrite an internally HTTP Request\.Scheme/);
  assert.match(enHtml, /no released protocol endpoint requiring WebSocket Upgrade/);
  assert.match(zhHtml, /不会.*Request\.Scheme/);
  assert.match(zhHtml, /没有需要 WebSocket Upgrade/);

  const sectionIds = (html) => [...html.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionIds(enHtml), sectionIds(zhHtml));
});

test("renders the bilingual Heimdall tenant signing-key rotation contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/heimdall/docs/heimdall-tenant-signing-key-rotation"),
    render("/zh/heimdall/docs/heimdall-tenant-signing-key-rotation"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [enHtml, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);

  for (const html of [enHtml, zhHtml]) {
    assert.match(html, /oidc\.signing\.rsa_private_key/);
    assert.match(html, /tenant_oidc_key/);
    assert.match(html, /RetireAt=ActivateAt\+retentionDays/);
    assert.match(html, /complete-retirement/);
    assert.match(html, /five-minute|5 分钟/);
    assert.match(html, /0032070/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(enHtml, /no distributed lock verified/);
  assert.match(enHtml, /Real multi-replica acceptance gate/);
  assert.match(enHtml, /Restoring the database without the encryption master key/);
  assert.match(zhHtml, /没有已验证.*分布式锁/);
  assert.match(zhHtml, /真实多副本验收门槛/);
  assert.match(zhHtml, /只恢复数据库但丢失加密主密钥/);

  const sectionIds = (html) => [...html.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionIds(enHtml), sectionIds(zhHtml));
});

test("renders the bilingual Heimdall 5.3.19 database migration contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/heimdall/docs/heimdall-database-migrations"),
    render("/zh/heimdall/docs/heimdall-database-migrations"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [enHtml, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);

  for (const html of [enHtml, zhHtml]) {
    assert.match(html, /identity_webhook/);
    assert.match(html, /sys_user_profile/);
    assert.match(html, /auto_sync_schema/);
    assert.match(html, /SyncStructure/);
    assert.match(html, /PITR/);
    assert.match(html, /0032070/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(enHtml, /twelve PostgreSQL increments/);
  assert.match(enHtml, /no complete empty-PostgreSQL baseline/);
  assert.match(enHtml, /Application precheck → migrate → postcheck/);
  assert.match(enHtml, /Multi-instance startup gate/);
  assert.match(zhHtml, /12 个发布增量|12 个 PostgreSQL 增量/);
  assert.match(zhHtml, /没有从空 PostgreSQL 重建完整 schema 的 baseline SQL/);
  assert.match(zhHtml, /precheck → migrate → postcheck/);
  assert.match(zhHtml, /多副本启动门槛/);

  const sectionIds = (html) => [...html.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionIds(enHtml), sectionIds(zhHtml));
});

test("renders the bilingual Heimdall Client Credentials production contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/heimdall/docs/heimdall-client-credentials"),
    render("/zh/heimdall/docs/heimdall-client-credentials"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [enHtml, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);

  for (const html of [enHtml, zhHtml]) {
    assert.match(html, /client_secret_basic/);
    assert.match(html, /client_secret_post/);
    assert.match(html, /BackendService/);
    assert.match(html, /PreviousClientSecretExpiresAt/);
    assert.match(html, /host\.auth\.jwt\.issuerTemplate/);
    assert.match(html, /0032070/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(enHtml, /Scope.*Resources.*audience/s);
  assert.match(enHtml, /does not revoke issued access tokens/);
  assert.match(enHtml, /not general resource-server RFC 7662/);
  assert.match(zhHtml, /Scope.*Resources.*audience/s);
  assert.match(zhHtml, /不撤销已经签发的 Access Token/);
  assert.match(zhHtml, /不是通用资源服务器 RFC 7662/);

  const sectionIds = (html) => [...html.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionIds(enHtml), sectionIds(zhHtml));
});

test("renders the production health-readiness and global-limiting contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/health-and-rate-limiting"),
    render("/zh/asgard/docs/health-and-rate-limiting"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /AfterServiceRegistration/);
    assert.match(page, /maxConcurrentConnections/);
    assert.match(page, /OldestFirst/);
    assert.match(page, /Retry-After/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /is not passed to MapHealthChecks/);
  assert.match(html, /fixed key global/);
  assert.match(html, /Static files run before limiting/);
  assert.match(html, /no endpoint exclusion/);
  assert.match(html, /one bucket per process/);
  assert.match(zhHtml, /生产验收矩阵/);
});

test("renders the bilingual external-plugin production operations contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/external-plugin-operations"),
    render("/zh/asgard/docs/external-plugin-operations"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /PluginInfo\.Id/);
    assert.match(page, /Plugin system ready/);
    assert.match(page, /enableHotReload/);
    assert.match(page, /loadTimeoutSeconds/);
    assert.match(page, /ReloadAsync/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /unspecified first item/);
  assert.match(html, /not validation of the expected plugin set/);
  assert.match(html, /whole-process rolling replacement/);
  assert.match(zhHtml, /外部插件生产交付、发现与升级/);
});

test("renders the bilingual Asgard Kestrel and TLS operations contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/kestrel-tls-operations"),
    render("/zh/asgard/docs/kestrel-tls-operations"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /maxConcurrentUpgradedConnections/);
    assert.match(page, /ListenAnyIP/);
    assert.match(page, /UseHttps/);
    assert.match(page, /openssl s_client/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /When limits is absent/);
  assert.match(html, /silently falls back to ListenAnyIP/);
  assert.match(html, /neither resolves DNS nor binds a Host header/);
  assert.match(html, /PFX validity.*password correctness.*hostname match/s);
  assert.match(zhHtml, /节点缺失与节点存在不是一回事/);
});

test("renders source-contracted registration, public surfaces, and token lifecycle", async () => {
  const paths = [
    "/en/asgard/docs/dependency-registration",
    "/en/asgard/docs/static-files",
    "/en/asgard/docs/swagger-openapi",
    "/en/heimdall/docs/heimdall-token-lifecycle",
  ];
  const responses = await Promise.all(paths.map(render));
  for (const response of responses) assert.equal(response.status, 200);
  const html = await Promise.all(responses.map((response) => response.text()));

  assert.match(html[0], /AddPluginConventions/);
  assert.match(html[0], /does not.*call TConfig\.Validate\(\)/s);
  assert.match(html[1], /enableDefaultFiles=false/);
  assert.match(html[1], /before Trace/);
  assert.match(html[2], /Keep routePrefix=swagger/);
  assert.match(html[2], /does not add RequireAuthorization/);
  assert.match(html[3], /RefreshTokenUsage=0/);
  assert.match(html[3], /token_type_hint=refresh_token/);
  assert.match(html[3], /general resource server cannot inspect/);
  assert.match(html[3], /invalid_grant/);
  assert.match(html[3], /login_required/);
  assert.match(html[3], /revocation watermark/);
  assert.match(html[3], /Heimdall 5\.1\.2 introduced subject-state checks.*clean 5\.3\.19 re-verification confirms they remain present/s);
  assert.match(html[3], /Username → Email → Phone/);
  assert.match(html[3], /existing enabled business user/);
  assert.match(html[3], /identity\.subject\.invalidated Outbox/);
  for (const page of html) assert.match(page, /AGENT WORKFLOW/);
});

test("renders the bilingual dependency registration and resolution runbook", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/dependency-registration"),
    render("/zh/asgard/docs/dependency-registration"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /AddPluginConventions/);
    assert.match(page, /autoScanRepositories/);
    assert.match(page, /ReflectionTypeLoadException/);
    assert.match(page, /ReferenceEquals/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /Assembly\.GetTypes\(\) is unsorted/);
  assert.match(html, /Scoped caches per descriptor/);
  assert.match(html, /no stable winner contract/);
  assert.match(html, /does not explicitly enable ValidateOnBuild\/ValidateScopes/);
  assert.match(html, /declares no trimming\/AOT preservation contract/);
  assert.match(html, /Rollback restores plugin DLL, dependencies, plugin\.yaml, and host version together/);
  assert.match(zhHtml, /重复入口会静默叠加/);
  assert.match(zhHtml, /反射发现需要发布形态验收/);
});

test("renders the bilingual Swagger and OpenAPI production runbook", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/swagger-openapi"),
    render("/zh/asgard/docs/swagger-openapi"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /routePrefix=swagger/);
    assert.match(page, /PathBase/);
    assert.match(page, /openapi-diff/);
    assert.match(page, /Private|Bearer|Bearer scheme/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /no RouteTemplate override/);
  assert.match(html, /does not add RequireAuthorization/);
  assert.match(html, /Do not describe this as scanning all loaded assemblies/);
  assert.match(html, /runtime plugin additions or hot reload/);
  assert.match(html, /roll them back together/);
  assert.match(zhHtml, /只可靠支持默认前缀/);
  assert.match(zhHtml, /不要宣称会扫描所有 loaded assemblies/);
});

test("renders the bilingual static-file production and public-security contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/static-files"),
    render("/zh/asgard/docs/static-files"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /PhysicalFileProvider/);
    assert.match(page, /Directory\.CreateDirectory/);
    assert.match(page, /appsettings/);
    assert.match(page, /symlink/);
    assert.match(page, /curl --include --range/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /Omitting host\.staticFiles does not disable/);
  assert.match(html, /public-before-security is a release blocker/);
  assert.match(html, /unknown MIME.*current ASP\.NET Core/is);
  assert.match(html, /Do not promise.*symlinks/s);
  assert.match(html, /Rollback requires the previous HTML/);
  assert.match(zhHtml, /省略节点仍会公开默认目录/);
});

test("renders the Asgard API response and error contract", async () => {
  const response = await render("/en/asgard/docs/api-contracts-and-errors");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Success&lt;string&gt;/);
  assert.match(html, /InvalidModelStateResponseFactory/);
  assert.match(html, /does not add it automatically and must opt in/);
  assert.match(html, /CursorResponse/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the source-contracted Asgard CRUD vertical slice", async () => {
  const response = await render("/en/asgard/docs/crud-vertical-slice");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AbsAsgardTenantEntity/);
  assert.match(html, /ExpectedVersion/);
  assert.match(html, /MarkAsDeleted/);
  assert.match(html, /physical deletion/);
  assert.match(html, /caching\.enabled=false/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders tenant-safe Asgard background work guidance", async () => {
  const response = await render("/en/asgard/docs/tenant-background-work");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /TenantScope overrides only snapshot TenantId/);
  assert.match(html, /CreateScope\(Guid\.Empty\)/);
  assert.match(html, /one service scope per tenant/);
  assert.match(html, /does not rethrow/);
  assert.match(html, /caching\.enabled=false/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the Asgard observability operations runbook", async () => {
  const response = await render("/en/asgard/docs/observability-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /QueryString unchanged/);
  assert.match(html, /unbounded Channel/);
  assert.match(html, /no controller, route, authorization policy/);
  assert.match(html, /no replacement worker/);
  assert.match(html, /AI incident replay/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the bilingual Asgard application logging production runbook", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/logging-operations"),
    render("/zh/asgard/docs/logging-operations"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  for (const page of [html, zhHtml]) {
    assert.match(page, /fileSizeLimitBytes/);
    assert.match(page, /useColors/);
    assert.match(page, /TraceId/);
    assert.match(page, /AGENT WORKFLOW/);
  }
  assert.match(html, /Defaults write both Console and files/);
  assert.match(html, /no namespace-override surface/);
  assert.match(html, /does not pass rollOnFileSizeLimit/);
  assert.match(html, /no global redactor/);
  assert.match(html, /configuration changes with a restart/);
  assert.match(zhHtml, /默认值会同时写 Console 与文件/);
  assert.match(zhHtml, /useColors 在 5\.1\.3 不产生行为差异/);
});

test("renders the Asgard database production operations contract", async () => {
  const response = await render("/en/asgard/docs/database-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /only FreeSql\.Provider\.MySql 3\.5\.310/);
  assert.match(html, /registers IFreeSql as a singleton/);
  assert.match(html, /\{entity\}:\{id\}/);
  assert.match(html, /after the database write/);
  assert.match(html, /reports self only/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the Asgard cache production operations contract", async () => {
  const response = await render("/en/asgard/docs/cache-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /fixed two-second hot layer/);
  assert.match(html, /injectable no-op/);
  assert.match(html, /only adds abortConnect=false/);
  assert.match(html, /loops over RemoveAsync sequentially/);
  assert.match(html, /FLUSHDB/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the bilingual Asgard Context usage contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/context-usage"),
    render("/en/asgard/docs/context-usage"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);

  for (const html of [zh, en]) {
    assert.match(html, /AbsAsgardContext/);
    assert.match(html, /BaseController/);
    assert.match(html, /GetAsgardContext/);
    assert.match(html, /IMultiLevelCache/);
    assert.match(html, /Scoped/);
    assert.match(html, /MultiLevelCache\(null, null, cacheConfig\)/);
    assert.match(html, /AGENT WORKFLOW/);
    assert.match(html, /skills\/docs\/skills-catalog/);
  }
  assert.match(zh, /统一上下文与能力消费/);
  assert.match(en, /Unified context and capability consumption/);
  assert.match(en, /not an enabled-state check/);
  assert.match(en, /not present call order as a hard runtime-correctness requirement/);
});

test("renders the Asgard Redis distributed lock operations contract", async () => {
  const response = await render("/en/asgard/docs/distributed-lock-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /explicitly calls AddDistributedLock/);
  assert.match(html, /caching\.redis\.enabled must be true/);
  assert.match(html, /TryAcquireAsync ignores AcquireTimeout/);
  assert.match(html, /throws TimeoutException/);
  assert.match(html, /SET NX plus a TTL/);
  assert.match(html, /owner-token comparison/);
  assert.match(html, /no automatic renewal/);
  assert.match(html, /fencing token/);
  assert.match(html, /Redlock quorum/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the Asgard host CORS operations contract", async () => {
  const [enResponse, zhResponse] = await Promise.all([
    render("/en/asgard/docs/cors-operations"),
    render("/zh/asgard/docs/cors-operations"),
  ]);
  assert.equal(enResponse.status, 200);
  assert.equal(zhResponse.status, 200);
  const [html, zhHtml] = await Promise.all([enResponse.text(), zhResponse.text()]);
  assert.match(html, /enabled:false cannot bypass/);
  assert.match(html, /no allowedMethods or allowedHeaders/);
  assert.match(html, /parameterless UseCors\(\)/);
  assert.match(html, /Static files and request Trace run before CORS/);
  assert.match(html, /IPluginCorsContributor/);
  assert.match(html, /separate CORS boundaries/);
  assert.match(html, /real browser/);
  assert.match(html, /\$asgard-host-features/);
  assert.match(html, /\$identity-integration/);
  assert.match(html, /href="\/en\/heimdall\/docs\/heimdall-integration"/);
  assert.match(zhHtml, /宿主 CORS 运行手册/);
  assert.match(zhHtml, /href="\/zh\/heimdall\/docs\/heimdall-integration"/);
  for (const page of [html, zhHtml]) assert.match(page, /AGENT WORKFLOW/);
});

test("renders the Asgard messaging production operations contract", async () => {
  const response = await render("/en/asgard/docs/messaging-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /registers only a singleton/);
  assert.match(html, /mandatory=false/);
  assert.match(html, /does not create a finite three-attempt policy/);
  assert.match(html, /does not declare or bind that DLQ/);
  assert.match(html, /new random X-Trace-Id/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the Asgard job production operations contract", async () => {
  const response = await render("/en/asgard/docs/job-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /hard-codes Quartz\.Simpl\.RAMJobStore/);
  assert.match(html, /PluginJobConfig\.Validate is currently empty/);
  assert.match(html, /SetServiceProvider\(app\.Services\)/);
  assert.match(html, /does not rethrow/);
  assert.match(html, /always returns false/);
  assert.match(html, /discards the Task returned by Quartz Shutdown/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders Heimdall account security and management API contracts", async () => {
  const [account, management] = await Promise.all([
    render("/en/heimdall/docs/heimdall-account-security-sessions"),
    render("/en/heimdall/docs/heimdall-management-api"),
  ]);
  assert.equal(account.status, 200);
  assert.equal(management.status, 200);
  const [accountHtml, managementHtml] = await Promise.all([account.text(), management.text()]);
  assert.match(accountHtml, /recent-auth check/);
  assert.match(accountHtml, /5\.1\.2 subject invalidation and webhook boundary/);
  assert.match(accountHtml, /pre-watermark cookies or authorizations/);
  assert.match(accountHtml, /Subject-state checks cover platform and tenant users/);
  assert.match(accountHtml, /accepts only Username, Email, or Phone/);
  assert.match(accountHtml, /Outbox\/Delivery records are durable/);
  assert.match(accountHtml, /do not automatically emit the tenant identity\.subject\.invalidated webhook/);
  assert.match(managementHtml, /PageResponse/);
  assert.match(managementHtml, /expectedVersion/);
  assert.match(managementHtml, /negative acceptance test for Active Sessions/);
  assert.match(managementHtml, /HEIMDALL 5\.3\.19/);
  assert.match(managementHtml, /MCP/);
  assert.match(managementHtml, /IdentityWebhook/);
  assert.match(managementHtml, /Backend Directory/);
  assert.match(managementHtml, /5\.1\.2 SysUser lifecycle contract/);
  assert.match(managementHtml, /remove description/);
  assert.match(managementHtml, /after commit/);
  assert.match(managementHtml, /ITenantResourceAccessGuard/);
  assert.match(managementHtml, /Unfiltered global lists remain platform-only/);
  for (const html of [accountHtml, managementHtml]) assert.match(html, /AGENT WORKFLOW/);
});

test("renders the released Heimdall custom-frontend boundary", async () => {
  const response = await render("/en/heimdall/docs/heimdall-custom-frontend");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /public client.*PKCE/s);
  assert.match(html, /hard-codes root \/connect\/consent/);
  assert.match(html, /Asgard\.Identity/);
  assert.match(html, /v5\.3\.19 \/ commit 0032070/);
  assert.match(html, /friendly HTML 400/);
  assert.match(html, /missing closing brace.*is fixed/s);
  assert.match(html, /Release and Preview boundary|Current 5\.3\.19 release contract/);
  assert.match(html, /signed out first/);
  assert.match(html, /revocation watermark/);
  assert.match(html, /both platform and tenant users/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the source-contracted Heimdall SCIM operations guide", async () => {
  const response = await render("/en/heimdall/docs/heimdall-scim-operations");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /maxResults=200/);
  assert.match(html, /loads all tenant users or groups/);
  assert.match(html, /No \/Bulk, sorting, ETag/);
  assert.match(html, /does not explicitly test Deleted/);
  assert.match(html, /platform\.tenant_directory\.manage/);
  assert.match(html, /tenant\.scim\.manage/);
  assert.match(html, /ITenantResourceAccessGuard/);
  assert.match(html, /v5\.3\.19 \/ commit 0032070/);
  assert.match(html, /no SCIM protocol or management-API contract change/);
  assert.match(html, /AGENT WORKFLOW/);
});

test("renders the bilingual Heimdall disaster-recovery contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-disaster-recovery"),
    render("/en/heimdall/docs/heimdall-disaster-recovery"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /PostgreSQL/);
    assert.match(html, /AES Key\/IV/);
    assert.match(html, /identity.subject.invalidated/);
    assert.match(html, /RPO\/RTO/);
    assert.match(html, /0032070/);
    assert.match(html, /20260720/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(zh, /没有完整空库 baseline/);
  assert.match(en, /no complete empty-database baseline/);
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual resource-server revocation contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-resource-server-revocation"),
    render("/en/heimdall/docs/heimdall-resource-server-revocation"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /active=false/);
    assert.match(html, /opaque Access Token/);
    assert.match(html, /identity\.subject\.invalidated/);
    assert.match(html, /Backend Directory/);
    assert.match(html, /0032070/);
    assert.match(html, /5\.1\.3/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(zh, /不是通用 RFC 7662/);
  assert.match(en, /not a general RFC 7662/);
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders source-verified infrastructure guidance", async () => {
  const [database, cache, messaging, jobs] = await Promise.all([
    render("/en/asgard/docs/database"),
    render("/en/asgard/docs/caching"),
    render("/en/asgard/docs/messaging"),
    render("/en/asgard/docs/job-scheduling"),
  ]);

  const databaseHtml = await database.text();
  assert.match(databaseHtml, /AbsAsgardRepositoryBase/);
  assert.match(databaseHtml, /FreeSql\.Provider\.MySql/);
  assert.match(databaseHtml, /tenant-aware keys/);
  assert.match(databaseHtml, /no global soft-delete filter/);

  const cacheHtml = await cache.text();
  assert.match(cacheHtml, /AsgardContext\.Cache/);
  assert.match(cacheHtml, /fixed at two seconds/);
  assert.match(cacheHtml, /FLUSHDB/);
  assert.match(cacheHtml, /fallbackToMemoryCache/);

  const messagingHtml = await messaging.text();
  assert.match(messagingHtml, /AcknowledgeAsync/);
  assert.match(messagingHtml, /delayedExchangePrefix/);
  assert.match(messagingHtml, /DelayMilliseconds is ignored/);
  assert.match(messagingHtml, /does not declare and bind a real \.dlq queue/);

  const jobsHtml = await jobs.text();
  assert.match(jobsHtml, /OnInitializeAsync/);
  assert.match(jobsHtml, /PT5M/);
  assert.match(jobsHtml, /RAMJobStore/);
  assert.match(jobsHtml, /ExecuteAsync\(IJobExecutionContext\)/);
});

test("uses the source-supported env placeholder syntax in infrastructure examples", async () => {
  const response = await render("/en/asgard/docs/infrastructure");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /\$\{env:DATABASE_CONNECTION\}/);
  assert.match(html, /\$\{env:REDIS_CONNECTION\}/);
  assert.doesNotMatch(html, /\$\{DATABASE_CONNECTION\}|\$\{REDIS_CONNECTION\}/);
});

test("renders source-verified host configuration defaults", async () => {
  const response = await render("/en/asgard/docs/configuration");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /issuerTemplate/);
  assert.match(html, /\{tenant\}/);
  assert.match(html, /jwksCacheMinutes/);
  assert.match(html, /jwksCacheMinutes:[\s\S]{0,40}15/);
  assert.match(html, /readyPath/);
  assert.match(html, /enableDefaultFiles/);
  assert.match(html, /feature being unconditionally active/);
});

test("renders source-verified plugin host boundaries", async () => {
  const response = await render("/en/asgard/docs/host-and-plugins");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /plugin\.enableHotReload/);
  assert.match(html, /scanDirectories: \[\]/);
  assert.match(html, /not complete hot reload/);
  assert.match(html, /AssemblyLoadContext/);
  assert.match(html, /IPluginCorsContributor/);
  assert.match(html, /named policies are not changed/);
  assert.match(html, /never replaces authentication/);
  assert.match(html, /trusted code/);
});

test("renders source-verified identity and security guidance", async () => {
  const [identity, authorization, security, observability] = await Promise.all([
    render("/en/asgard/docs/identity-and-tenancy"),
    render("/en/asgard/docs/authorization"),
    render("/en/asgard/docs/security"),
    render("/en/asgard/docs/observability"),
  ]);

  assert.match(await identity.text(), /TenantScopeFactory/);
  assert.match(await authorization.text(), /AsgardAuthMatch/);
  const securityHtml = await security.text();
  assert.match(securityHtml, /PasswordHasher/);
  assert.match(securityHtml, /no enabled flag/);
  assert.match(securityHtml, /default work factor is 11/);
  assert.match(securityHtml, /one configured IV/);
  assert.match(securityHtml, /not modern AEAD/);
  assert.match(securityHtml, /CreateRandomKey/);
  assert.match(securityHtml, /1024 bytes/);
  const observabilityHtml = await observability.text();
  assert.match(observabilityHtml, /ITraceQueryService/);
  assert.match(observabilityHtml, /has no logging\.enabled field/);
  assert.match(observabilityHtml, /QueryString is stored verbatim/);
  assert.match(observabilityHtml, /unbounded Channel/);
  assert.match(observabilityHtml, /Trace\.Enabled controls independent database persistence only/);
});

test("renders source-verified tooling and deployment guidance", async () => {
  const [tsGen, analyzers, deployment] = await Promise.all([
    render("/en/asgard/docs/typescript-generation"),
    render("/en/asgard/docs/analyzers"),
    render("/en/heimdall/docs/heimdall-deployment"),
  ]);

  const [tsGenHtml, analyzersHtml, deploymentHtml] = await Promise.all([
    tsGen.text(),
    analyzers.text(),
    deployment.text(),
  ]);

  assert.match(tsGenHtml, /\/asgard-tsgen/);
  assert.match(analyzersHtml, /ASG0008/);
  assert.match(deploymentHtml, /Version 5\.3\.19/);
  assert.match(deploymentHtml, /openid-configuration/);
  assert.match(deploymentHtml, /host\.healthCheck\.path/);
  assert.match(deploymentHtml, /host\.healthCheck\.endpoint/);
  assert.match(deploymentHtml, /does not restore an already switched application/);
  assert.match(deploymentHtml, /no HTTP or health check/);
  assert.match(deploymentHtml, /nginx -t\/reload/);
});

test("renders the governed Heimdall 5.3.19 MCP boundary", async () => {
  const response = await render("/en/heimdall/docs/heimdall-mcp");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /v5\.3\.19 Release contract/);
  assert.match(html, /0032070/);
  assert.match(html, /rateLimitPerMinute/);
  assert.match(html, /one Heimdall application container/);
  assert.match(html, /two-phase confirmation/);
  assert.match(html, /mcp\.tool\.invoked/);
});

test("renders the bilingual production Heimdall mini JWT issuer runbook", async () => {
  const responses = await Promise.all([
    render("/zh/heimdall/docs/heimdall-jwt-signing"),
    render("/en/heimdall/docs/heimdall-jwt-signing"),
  ]);
  for (const response of responses) assert.equal(response.status, 200);
  const [zh, en] = await Promise.all(responses.map((response) => response.text()));
  for (const html of [zh, en]) {
    assert.match(html, /Asgard\.Heimdall\.JwtSigning --version 5\.3\.19/);
    assert.match(html, /0032070/);
    assert.match(html, /symmetric key|对称密钥/);
    assert.match(html, /DiscoveryPathPrefix/);
    assert.match(html, /JwksUriOverride/);
    assert.match(html, /BackendService/);
    assert.match(html, /issuerTemplate:[\s\S]{0,100}\{tenant\}/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(zh, /公开 Discovery\/JWKS 强制 RSA/);
  assert.match(zh, /不会自动拼接 DiscoveryPathPrefix/);
  assert.match(en, /Core symmetric signing remains possible/);
  assert.match(en, /does not use DiscoveryPathPrefix/);
  assert.match(en, /one current instance cannot overlap/);
});

test("renders a bilingual end-to-end Heimdall and Asgard resource API integration", async () => {
  const [asgardZh, asgardEn, heimdallZh, heimdallEn] = await Promise.all([
    render("/zh/asgard/docs/resource-api-authentication"),
    render("/en/asgard/docs/resource-api-authentication"),
    render("/zh/heimdall/docs/heimdall-integration"),
    render("/en/heimdall/docs/heimdall-integration"),
  ]);

  for (const response of [asgardZh, asgardEn, heimdallZh, heimdallEn]) {
    assert.equal(response.status, 200);
  }

  const [asgardZhHtml, asgardEnHtml, heimdallZhHtml, heimdallEnHtml] = await Promise.all([
    asgardZh.text(),
    asgardEn.text(),
    heimdallZh.text(),
    heimdallEn.text(),
  ]);

  for (const html of [asgardZhHtml, asgardEnHtml]) {
    assert.match(html, /issuerTemplate/);
    assert.match(html, /\{tenant\}/);
    assert.match(html, /orders-api/);
    assert.match(html, /Discovery/);
    assert.match(html, /JWKS/);
    assert.match(html, /opaque/);
    assert.match(html, /Access Token|access token/);
    assert.match(html, /401/);
    assert.match(html, /403/);
    assert.match(html, /5\.1\.2.*5\.3\.19/s);
  }
  assert.match(asgardZhHtml, /href="\/zh\/heimdall\/docs\/heimdall-integration"/);
  assert.match(asgardEnHtml, /href="\/en\/heimdall\/docs\/heimdall-integration"/);

  for (const html of [heimdallZhHtml, heimdallEnHtml]) {
    assert.match(html, /authorization_code/);
    assert.match(html, /PKCE S256/);
    assert.match(html, /allowedCorsOrigins/);
    assert.match(html, /UserInfo/);
    assert.match(html, /end_session_endpoint/);
    assert.match(html, /updateAccessTokenClaimsOnRefresh/);
    assert.match(html, /orders-api/);
  }
  assert.match(heimdallZhHtml, /href="\/zh\/asgard\/docs\/resource-api-authentication"/);
  assert.match(heimdallEnHtml, /href="\/en\/asgard\/docs\/resource-api-authentication"/);

  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(asgardZhHtml), sectionIds(asgardEnHtml));
  assert.deepEqual(sectionIds(heimdallZhHtml), sectionIds(heimdallEnHtml));
});

test("renders the bilingual Heimdall BackendService identity loop", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-service-integration"),
    render("/en/heimdall/docs/heimdall-service-integration"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /heimdall\.directory\.read/);
    assert.match(html, /heimdall-directory-api/);
    assert.match(html, /token_type=BackendService/);
    assert.match(html, /api\/backend\/directory\/users/);
    assert.match(html, /identity\.subject\.invalidated/);
    assert.match(html, /revoked_at/);
    assert.match(html, /Fail Closed/);
    assert.match(html, /OpenAPI (?:快照|snapshot)/);
    assert.match(html, /heimdall-service-integration/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the released Heimdall 5.1.2 identity webhook contract", async () => {
  const response = await render("/en/heimdall/docs/heimdall-identity-webhooks");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /identity\.subject\.invalidated/);
  assert.match(html, /X-Heimdall-Signature/);
  assert.match(html, /platform\.security\.manage/);
  assert.match(html, /at-least-once/);
  assert.match(html, /DNS-rebinding\/TOCTOU gaps/);
  assert.match(html, /20260715_identity_webhook\.postgresql\.sql/);
  assert.match(html, /requires a nonblank idempotencyKey/);
  assert.match(html, /missing or blank input returns 400/);
  assert.match(html, /platform administration surface/);
  assert.match(html, /creates no identity\.subject\.invalidated Outbox/);
  assert.match(html, /after the user\/login-info transaction commits/);
});

test("renders the released Heimdall 5.1.2 security-event lifecycle", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-siem"),
    render("/en/heimdall/docs/heimdall-siem"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /security-events\/summary/);
    assert.match(html, /actionableOnly/);
    assert.match(html, /correlationKey/);
    assert.match(html, /automatic.*identity\.login\.failed.*low\/medium.*open/);
    assert.match(html, /schemaVersion.*1\.1/);
    assert.match(html, /ProtectionKey/);
    assert.match(html, /5\.1\.2/);
    assert.match(html, /at-least-once/);
    assert.match(html, /X-Heimdall-Event-Count/);
    assert.match(html, /CEF.*(?:hard-codes product version|固定输出产品版本).*4\.1/);
    assert.match(html, /DisallowConcurrentExecution/);
    assert.match(html, /PITR|checkpoint/);
    assert.match(html, /0032070/);
    assert.match(html, /AGENT WORKFLOW/);
  }
  assert.match(en, /no per-consumer checkpoint/);
  assert.match(en, /not proof of a cross-node lifecycle singleton/);
  assert.match(en, /key-name defense, not content inspection/);
  assert.match(zh, /不保存每个 SIEM 消费者的 checkpoint/);
  assert.match(zh, /不等于已证明的跨节点 lifecycle 单例/);
  assert.match(zh, /key-name based 防线/);
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual field-level configuration contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/configuration-fields"),
    render("/en/asgard/docs/configuration-fields"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /host\.application\.environment/);
    assert.match(html, /bootstrap-only/);
    assert.match(html, /limits: \{\}/);
    assert.match(html, /maxConcurrentUpgradedConnections/);
    assert.match(html, /Asgard\.Encryption\.Key/);
    assert.match(html, /redact=true/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual infrastructure field-level configuration contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/infrastructure-configuration-fields"),
    render("/en/asgard/docs/infrastructure-configuration-fields"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /database\.connectionString/);
    assert.match(html, /caching\.redis\.fallbackToMemoryCache/);
    assert.match(html, /abortConnect=false/);
    assert.match(html, /messaging\.rabbitmq\.retryIntervalMilliseconds/);
    assert.match(html, /target DLQ|目标 DLQ/);
    assert.match(html, /RAMJobStore/);
    assert.match(html, /logging\.enabled/);
    assert.match(html, /Trace\.CaptureAllRequest/);
    assert.match(html, /declared\/unwired/);
    assert.match(html, /standalone only/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual host feature and plugin field contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/host-configuration-fields"),
    render("/en/asgard/docs/host-configuration-fields"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /host\.staticFiles\.enableDefaultFiles/);
    assert.match(html, /host\.cors\.defaultPolicy/);
    assert.match(html, /exactly one \{tenant\}|恰好一个 \{tenant\}/);
    assert.match(html, /host\.swagger\.routePrefix/);
    assert.match(html, /GET \/asgard-tsgen/);
    assert.match(html, /partition key|partition key 固定/);
    assert.match(html, /host\.healthCheck\.timeoutSeconds/);
    assert.match(html, /plugin\.enableHotReload/);
    assert.match(html, /declared\/unwired/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the committed Heimdall atomic tenant-onboarding API contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-tenant-onboarding-api"),
    render("/en/heimdall/docs/heimdall-tenant-onboarding-api"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /POST \/api\/Tenant\/onboarding/);
    assert.match(html, /Idempotency-Key/);
    assert.match(html, /application\.manage/);
    assert.match(html, /applicationId/);
    assert.match(html, /authorization_code/);
    assert.match(html, /orders-api/);
    assert.match(html, /JWKS/);
    assert.match(html, /same transaction|同一事务/);
    assert.match(html, /specific conflict HTTP status|固定冲突 HTTP 状态/);
    assert.match(html, /v5\.3\.19.*0032070/s);
    assert.match(html, /TenantApplication/);
    assert.match(html, /precheck.*migrate.*postcheck.*cleanup/s);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual Asgard production deployment runbook", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/deployment"),
    render("/en/asgard/docs/deployment"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /dotnet publish/);
    assert.match(html, /ASPNETCORE_ENVIRONMENT/);
    assert.match(html, /UseForwardedHeaders/);
    assert.match(html, /built-in self check|框架内置 self 检查/);
    assert.match(html, /SIGTERM/);
    assert.match(html, /canary/i);
    assert.match(html, /index\.html\.md/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the committed Heimdall Device Authorization Grant", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-device-authorization"),
    render("/en/heimdall/docs/heimdall-device-authorization"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /device_authorization_endpoint/);
    assert.match(html, /urn:ietf:params:oauth:grant-type:device_code/);
    assert.match(html, /verification_uri_complete/);
    assert.match(html, /authorization_pending/);
    assert.match(html, /slow_down/);
    assert.match(html, /access_denied/);
    assert.match(html, /offline_access/);
    assert.match(html, /Access Token/);
    assert.match(html, /Asgard\.Heimdall/);
    assert.match(html, /5\.3\.19/);
    assert.match(html, /0032070/);
    assert.match(html, /no Device Flow protocol-contract change|没有 Device Flow 协议合同变化/);
    assert.match(html, /fail(?:s|ure)? closed|失败关闭/);
    assert.match(html, /revokes the related device code|撤销关联 device code/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual Asgard security operations contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/security-operations"),
    render("/en/asgard/docs/security-operations"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /Asgard:Encryption/);
    assert.match(html, /BCrypt/);
    assert.match(html, /1–1024/);
    assert.match(html, /index\.html\.md/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual identity tenant and authorization operations contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/identity-authorization-operations"),
    render("/en/asgard/docs/identity-authorization-operations"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /MapInboundClaims/);
    assert.match(html, /Guid\.Empty/);
    assert.match(html, /BackendService/);
    assert.match(html, /GlobalFilter/);
    assert.match(html, /application_id/);
    assert.match(html, /application_manifest_version/);
    assert.match(html, /application_authorization_version/);
    assert.match(html, /tenant_authorization_version/);
    assert.match(html, /d1002d1/);
    assert.match(html, /90e8a8b/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual TsGen production operations contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/tsgen-operations"),
    render("/en/asgard/docs/tsgen-operations"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /OutputType/);
    assert.match(html, /\/asgard-tsgen/);
    assert.match(html, /ControllerFeature/);
    assert.match(html, /LongToStringConverter/);
    assert.match(html, /T extends object/);
    assert.match(html, /page=1&amp;size=20/);
    assert.match(html, /waitForReconnect/);
    assert.match(html, /Last-Event-ID/);
    assert.match(html, /Umi ESLint/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual Asgard 5.1 upgrade and rollback guide", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/upgrade-to-5-1"),
    render("/en/asgard/docs/upgrade-to-5-1"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /5\.0\.3/);
    assert.match(html, /5\.1\.3/);
    assert.match(html, /rollForward=disable/);
    assert.match(html, /application_id/);
    assert.match(html, /application_manifest_version/);
    assert.match(html, /application_authorization_version/);
    assert.match(html, /tenant_authorization_version/);
    assert.match(html, /T extends object/);
    assert.match(html, /waitForReconnect/);
    assert.match(html, /Last-Event-ID/);
    assert.match(html, /restore --locked-mode/);
    assert.match(html, /canary/i);
    assert.match(html, /index\.html\.md/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual analyzer and CI operations contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/asgard/docs/analyzers-operations"),
    render("/en/asgard/docs/analyzers-operations"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /ASG0008/);
    assert.match(html, /CodeFixProvider/);
    assert.match(html, /RunAnalyzersDuringBuild/);
    assert.match(html, /asgard-backend-guard/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders the bilingual Heimdall federation and MFA production contract", async () => {
  const [zhResponse, enResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-federation-mfa"),
    render("/en/heimdall/docs/heimdall-federation-mfa"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  const [zh, en] = await Promise.all([zhResponse.text(), enResponse.text()]);
  for (const html of [zh, en]) {
    assert.match(html, /tenant_external_oidc_provider/);
    assert.match(html, /tenant_ldap_provider/);
    assert.match(html, /tenant_saml_provider/);
    assert.match(html, /passkey_credential/);
    assert.match(html, /mfa_recovery_code/);
    assert.match(html, /ReferralChasing=None|referral chasing/i);
    assert.match(html, /256 KiB/);
    assert.match(html, /auth_time/);
    assert.match(html, /0032070/);
    assert.match(html, /identity-integration/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));
});

test("renders and indexes the bilingual Heimdall Application-domain RBAC contract", async () => {
  const [zhResponse, enResponse, searchResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-application-rbac"),
    render("/en/heimdall/docs/heimdall-application-rbac"),
    render("/search-index.json"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  assert.equal(searchResponse.status, 200);
  const [zh, en, search] = await Promise.all([
    zhResponse.text(),
    enResponse.text(),
    searchResponse.json(),
  ]);
  for (const html of [zh, en]) {
    assert.match(html, /5\.3\.19/);
    assert.match(html, /0032070/);
    assert.match(html, /ApplicationInfo/);
    assert.match(html, /TenantApplication/);
    assert.match(html, /SysUserApplicationGrant/);
    assert.match(html, /AllApplicationTenants/);
    assert.match(html, /ExplicitTenantList/);
    assert.match(html, /platform\.application\.tenant\.manage/);
    assert.match(html, /platform\.application\.tenant_rbac\.manage/);
    assert.match(html, /platform\.application\.oidc_client\.manage/);
    assert.match(html, /current_manifest_version \+ 1/);
    assert.match(html, /applied_manifest_version/);
    assert.match(html, /application_id/);
    assert.match(html, /application_manifest_version/);
    assert.match(html, /application_authorization_version/);
    assert.match(html, /tenant_authorization_version/);
    assert.match(html, /application_migration_catalog/);
    assert.match(html, /\(tenant_id, application_id\)/);
    assert.match(html, /20260720_application_domain_03_cleanup/);
    assert.match(html, /heimdall-application-rbac/);
    assert.match(html, /asgard-identity-userinfo/);
    assert.match(html, /heimdall-management-api/);
    assert.match(html, /index\.html\.md/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));

  const entries = search.entries.filter((entry) => entry.slug === "heimdall-application-rbac");
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((entry) => entry.locale).sort(), ["en", "zh"]);
  for (const entry of entries) {
    assert.equal(entry.product, "heimdall");
    assert.match(entry.path, /^\/(?:zh|en)\/heimdall\/docs\/heimdall-application-rbac$/);
    assert.match(entry.alternatePath, /^\/(?:zh|en)\/heimdall\/docs\/heimdall-application-rbac$/);
    assert.ok(entry.skills.includes("heimdall-application-rbac"));
    assert.ok(entry.skills.includes("asgard-identity-userinfo"));
  }
});

test("renders and indexes the bilingual Heimdall local quick start", async () => {
  const [zhResponse, enResponse, searchResponse] = await Promise.all([
    render("/zh/heimdall/docs/heimdall-quick-start"),
    render("/en/heimdall/docs/heimdall-quick-start"),
    render("/search-index.json"),
  ]);
  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);
  assert.equal(searchResponse.status, 200);
  const [zh, en, search] = await Promise.all([
    zhResponse.text(),
    enResponse.text(),
    searchResponse.json(),
  ]);
  for (const html of [zh, en]) {
    assert.match(html, /5\.3\.19/);
    assert.match(html, /0032070/);
    assert.match(html, /DOTNET_ENVIRONMENT/);
    assert.match(html, /Oidc__Bootstrap__DefaultAdminPassword/);
    assert.match(html, /oidc\.bootstrap\.auto_sync_schema/);
    assert.match(html, /默认值仍是 false|defaults to false/);
    assert.match(html, /Authorization Code \+ PKCE/);
    assert.match(html, /access_token/);
    assert.match(html, /id_token/);
    assert.match(html, /localhost:5000\/\.well-known\/openid-configuration/);
    assert.match(html, /localhost:3001\/test-lab/);
    assert.match(html, /complete empty-PostgreSQL baseline|完整空 PostgreSQL baseline/);
    assert.match(html, /identity-integration/);
    assert.match(html, /index\.html\.md/);
  }
  const sectionIds = (html) => [...new Set([...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(sectionIds(zh), sectionIds(en));

  const entries = search.entries.filter((entry) => entry.slug === "heimdall-quick-start");
  assert.equal(entries.length, 2);
  for (const entry of entries) {
    assert.equal(entry.product, "heimdall");
    assert.ok(entry.skills.includes("identity-integration"));
    assert.ok(entry.skills.includes("asgard-security"));
  }
});
