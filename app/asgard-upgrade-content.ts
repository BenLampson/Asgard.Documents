import type { DocPage } from "./content";

const packageVersionCode = `<PropertyGroup>
  <AsgardVersion>5.1.3</AsgardVersion>
</PropertyGroup>

<ItemGroup>
  <PackageVersion Include="Asgard.PluginSdk" Version="$(AsgardVersion)" />
  <PackageVersion Include="Asgard.Analyzers" Version="$(AsgardVersion)" />
</ItemGroup>`;

const upgradeChecksCode = `dotnet --version
dotnet restore --locked-mode
dotnet list package --include-transitive
dotnet build -c Release --no-restore
dotnet test -c Release --no-build

# If the application uses TsGen, regenerate instead of editing generated files.
npm run typecheck
npm run lint
npm run build`;

const claimsCode = `{
  "application_id": "orders",
  "application_manifest_version": "manifest-v12",
  "application_authorization_version": "application-auth-v7",
  "tenant_authorization_version": "tenant-auth-v35"
}`;

const rollbackCode = `# Restore the previous package baseline and its lock file together.
git revert <asgard-upgrade-commit>
dotnet restore --locked-mode
dotnet build -c Release --no-restore
dotnet test -c Release --no-build`;

const zhSections: DocPage["sections"] = [
  {
    id: "baseline",
    title: "升级范围与兼容性结论",
    paragraphs: [
      "本指南把 Asgard 5.0.3 升级到 5.1.3。5.1.x 没有新增或删除项目，也没有改变 host 配置键、路由、默认值或主运行时接线；主要变化集中在应用授权上下文 Claims、TsGen 生成代码兼容性、依赖版本与 SDK 固定。",
      "因此这不是数据库或宿主管线迁移，但也不能只改一个 PackageReference 就结束。使用身份快照或 TsGen 的项目必须重新生成、重新编译并执行针对性的协议与前端验收。",
    ],
    note: "源码基线：clean d1002d1；发布目标：tag v5.1.3 / 90e8a8b。升级起点低于 5.0.3 时，应先单独审核跨大版本变化。",
  },
  {
    id: "before",
    title: "升级前先建立可回滚基线",
    bullets: [
      "记录所有直接与传递 Asgard.* 包版本，确认当前没有 4.x/5.x 混用",
      "提交 packages.lock.json、中央包版本文件、生成的 TypeScript 客户端和当前配置模板",
      "保存当前镜像 digest、应用 smoke 结果、OIDC Claims 样本与前端 typecheck/lint/build 结果",
      "把应用数据库迁移与 Asgard 包升级分开；5.1.x 本身不提供或要求数据库迁移",
      "在升级分支完成整个验收矩阵，不在生产节点直接修改包版本或生成代码",
    ],
  },
  {
    id: "packages-sdk",
    title: "统一包版本并固定 SDK",
    paragraphs: [
      "把所有直接引用的 Asgard.* 包一次性升级到 5.1.3，不要只升级 PluginSdk 或在同一进程混用不同小版本。NuGet 会恢复框架的传递依赖；只有项目直接编译使用低层 API 时才保留显式低层引用。",
      "Asgard 5.1.3 源码用 global.json 将 SDK 精确固定为 10.0.302，rollForward=disable 且 allowPrerelease=false。消费项目不必复制这个策略，但 CI 与本地必须明确选择可用的 .NET 10 SDK，并把选择结果纳入构建证据。",
    ],
    code: { language: "xml", value: packageVersionCode },
  },
  {
    id: "identity",
    title: "5.1.0：审核应用授权上下文 Claims",
    paragraphs: [
      "AbsAsgardUserInfo 与 AsgardClaimTypes 新增 application_id、application_manifest_version、application_authorization_version、tenant_authorization_version，并在 InitFromClaims()/ToClaims() 中双向映射。四个属性均为可空字符串，框架基类只负责携带，不验证必填、新鲜度或版本大小。",
      "不使用应用域授权的旧 Token 可以继续解析；需要应用域授权的资源 API 则应由签发方产生权威值，并由自己的 Token Profile 以精确相等方式检查版本。不要把版本字符串解析为数字，也不要用 application_id 替代 iss、aud、exp 或签名校验。",
    ],
    code: { language: "json", value: claimsCode },
    bullets: [
      "用真实 Access Token 验证四个 Claim 能进入 AbsAsgardContext.IdentityContext",
      "验证旧 Token 的兼容策略与失败方式，而不是默认所有字段突然变成必填",
      "对租户应用 Token，确认 tenant_authorization_version 来自当前租户授权快照",
      "回归 roles、permissions、scope 与现有 AsgardAuth 表达式",
    ],
  },
  {
    id: "tsgen-query",
    title: "5.1.1：重新生成严格模式 Query 客户端",
    paragraphs: [
      "buildQueryParams 从 Record<string, unknown> 改为泛型 T extends object，复杂 Query DTO 不再需要索引签名；生成的 Controller 调用也不再强转 Record。运行时仍把 DTO 的顶层属性编码到 URLSearchParams，协议形状没有改变。",
      "删除旧生成目录后从 5.1.3 宿主重新生成，不要手工给 DTO 补索引签名，也不要把修复写进生成文件。然后用项目自己的严格 TypeScript 配置执行 typecheck，并用真实请求确认数组、日期、空值和参数别名仍符合 API 合同。",
    ],
  },
  {
    id: "tsgen-sse",
    title: "5.1.2：重新生成并回归 SSE 客户端",
    paragraphs: [
      "SSE 生成代码改用 lint-safe 的 for...of，并把重连等待封装为 waitForReconnect。行为合同仍包括消息顺序、retry、Last-Event-ID、最大重连次数、终止错误、AbortSignal 与 onClose。",
      "升级后必须重新生成客户端并运行 typecheck、Umi ESLint 与浏览器/Node 兼容性测试。重点验证断线后只按配置次数重连、服务端 retry 能改变延迟、最后事件 ID 能传入下一次请求，以及 abort 不触发额外重连或错误回调。",
    ],
  },
  {
    id: "acceptance",
    title: "发布验收矩阵",
    code: { language: "powershell", value: upgradeChecksCode },
    bullets: [
      "依赖：所有直接 Asgard.* 引用为 5.1.3，传递图中没有旧版本冲突",
      "后端：Release restore/build/test 通过；宿主启动、健康检查、Swagger 和关键 API smoke 通过",
      "身份：新旧 Token 策略、四个应用上下文 Claim、租户隔离和 AsgardAuth 负向用例通过",
      "TsGen Query：重新生成后 strict typecheck 通过，真实 URL 查询参数保持预期",
      "TsGen SSE：lint/build 通过，消息顺序、retry、Last-Event-ID、终止、最大重连和 abort 行为通过",
      "制品：镜像、配置模板、锁文件和生成客户端绑定同一 release ID，可追溯到 5.1.3",
    ],
  },
  {
    id: "rollout-rollback",
    title: "灰度与回滚",
    paragraphs: [
      "先发布单个 canary，比较认证失败、授权拒绝、前端 TypeScript 错误、SSE 重连次数和 API 错误率。身份签发方与资源 API 若分批发布，应提前定义旧 Token 和新 Claims 的兼容窗口。",
      "回滚要同时恢复上一版包、锁文件、生成客户端和镜像。5.1.x 没有框架数据库迁移，因此不应把业务数据库回滚伪装成框架升级的一部分；若业务同时迁移数据库，使用独立的 expand/contract 与回滚计划。",
    ],
    code: { language: "powershell", value: rollbackCode },
  },
  {
    id: "source",
    title: "源码证据与继续阅读",
    paragraphs: [
      "本页结论来自 v5.0.3→v5.1.3 的发布 diff、身份与 TsGen 单元/兼容性测试、Directory.Build.props、Directory.Packages.props 和 global.json。提交摘要只是定位线索，页面中的发布结论以源码、测试与已发布包交叉验证。",
    ],
    links: [
      { label: "版本与更新", href: "/zh/asgard/docs/release-notes" },
      { label: "包与安装", href: "/zh/asgard/docs/packages-and-installation" },
      { label: "身份与授权运维", href: "/zh/asgard/docs/identity-authorization-operations" },
      { label: "TsGen 生产运维", href: "/zh/asgard/docs/tsgen-operations" },
    ],
  },
];

const enSections: DocPage["sections"] = [
  {
    id: "baseline",
    title: "Upgrade scope and compatibility conclusion",
    paragraphs: [
      "This guide upgrades Asgard 5.0.3 to 5.1.3. The 5.1 line adds or removes no project and changes no host configuration key, route, default, or primary runtime wiring. Its material changes are application-authorization context claims, generated TsGen compatibility, dependency versions, and SDK pinning.",
      "This is therefore not a database or host-pipeline migration, but changing one PackageReference is still insufficient. Applications that use identity snapshots or TsGen must regenerate, rebuild, and run targeted protocol and frontend acceptance.",
    ],
    note: "Source baseline: clean d1002d1; release target: tag v5.1.3 / 90e8a8b. If the starting point predates 5.0.3, review that major-version delta separately.",
  },
  {
    id: "before",
    title: "Create a rollback baseline first",
    bullets: [
      "Record every direct and transitive Asgard.* version and confirm that 4.x and 5.x are not mixed",
      "Commit packages.lock.json, central package versions, generated TypeScript clients, and the current configuration templates",
      "Preserve the current image digest, application smoke results, OIDC claim samples, and frontend typecheck/lint/build evidence",
      "Keep application database migrations separate from the Asgard package upgrade; 5.1.x itself supplies and requires no database migration",
      "Complete the matrix on an upgrade branch instead of changing packages or generated code on a production node",
    ],
  },
  {
    id: "packages-sdk",
    title: "Align package versions and select the SDK",
    paragraphs: [
      "Upgrade every directly referenced Asgard.* package to 5.1.3 in one change. Do not upgrade only PluginSdk or mix minor versions in one process. NuGet restores framework transitive dependencies; retain a direct lower-layer reference only when the project compiles against that API.",
      "Asgard 5.1.3 source pins SDK 10.0.302 exactly with rollForward=disable and allowPrerelease=false. Consumer repositories need not copy that policy, but local and CI builds must deliberately select an available .NET 10 SDK and retain the selection as build evidence.",
    ],
    code: { language: "xml", value: packageVersionCode },
  },
  {
    id: "identity",
    title: "5.1.0: review application-authorization claims",
    paragraphs: [
      "AbsAsgardUserInfo and AsgardClaimTypes add application_id, application_manifest_version, application_authorization_version, and tenant_authorization_version with round-trip InitFromClaims()/ToClaims() mappings. All four properties are nullable strings; the base class carries them but does not enforce requiredness, freshness, or ordering.",
      "Existing tokens that do not use application-scoped authorization remain parseable. A resource API that does use it must obtain authoritative values from the issuer and enforce exact version equality in its token profile. Never parse these versions as numbers or substitute application_id for iss, aud, exp, or signature validation.",
    ],
    code: { language: "json", value: claimsCode },
    bullets: [
      "Use a real access token to prove that all four claims reach AbsAsgardContext.IdentityContext",
      "Define and test the compatibility or failure policy for older tokens instead of making every field implicitly mandatory",
      "For a tenant application token, confirm tenant_authorization_version comes from the current tenant authorization snapshot",
      "Regress roles, permissions, scope, and existing AsgardAuth expressions",
    ],
  },
  {
    id: "tsgen-query",
    title: "5.1.1: regenerate strict-mode query clients",
    paragraphs: [
      "buildQueryParams changes from Record<string, unknown> to generic T extends object, so a complex query DTO no longer needs an index signature. Generated controller calls also stop casting to Record. Runtime behavior still encodes the DTO's top-level properties into URLSearchParams, so the wire shape is unchanged.",
      "Delete the previous generated directories and regenerate from a 5.1.3 host. Do not add index signatures to DTOs or patch generated output. Run typecheck with the repository's strict TypeScript configuration, then use real requests to confirm arrays, dates, nulls, and parameter aliases still match the API contract.",
    ],
  },
  {
    id: "tsgen-sse",
    title: "5.1.2: regenerate and regress SSE clients",
    paragraphs: [
      "Generated SSE code moves to lint-safe for...of loops and isolates reconnect waiting in waitForReconnect. The behavioral contract still covers message order, retry, Last-Event-ID, maximum reconnects, terminal errors, AbortSignal, and onClose.",
      "Regenerate the client and run typecheck, Umi ESLint, and browser or Node compatibility tests. Prove that disconnects reconnect only within the configured limit, server retry changes delay, the last event ID reaches the next request, and abort causes neither another reconnect nor an error callback.",
    ],
  },
  {
    id: "acceptance",
    title: "Release acceptance matrix",
    code: { language: "powershell", value: upgradeChecksCode },
    bullets: [
      "Dependencies: every direct Asgard.* reference is 5.1.3 and the transitive graph contains no stale-version conflict",
      "Backend: Release restore/build/test passes; host startup, health, Swagger, and critical API smoke checks pass",
      "Identity: old/new token policy, four application-context claims, tenant isolation, and negative AsgardAuth cases pass",
      "TsGen query: regenerated output passes strict typecheck and produces the expected real URL query parameters",
      "TsGen SSE: lint/build and message-order, retry, Last-Event-ID, terminal, reconnect-limit, and abort cases pass",
      "Artifact: image, configuration templates, lock file, and generated client share one release ID traceable to 5.1.3",
    ],
  },
  {
    id: "rollout-rollback",
    title: "Canary and rollback",
    paragraphs: [
      "Release one canary first and compare authentication failures, authorization denials, frontend TypeScript errors, SSE reconnect counts, and API error rate. If issuers and resource APIs roll out separately, define the compatibility window for old tokens and new claims in advance.",
      "Rollback restores the previous packages, lock file, generated client, and image together. The 5.1 line has no framework database migration, so application database rollback must not be disguised as part of the framework upgrade. When both changes ship together, use a separate expand/contract and rollback plan.",
    ],
    code: { language: "powershell", value: rollbackCode },
  },
  {
    id: "source",
    title: "Source evidence and next reading",
    paragraphs: [
      "This guide is based on the v5.0.3→v5.1.3 release diff, identity and TsGen unit/compatibility tests, Directory.Build.props, Directory.Packages.props, and global.json. Commit subjects are navigation clues only; release conclusions are cross-checked against source, tests, and published packages.",
    ],
    links: [
      { label: "Versions and updates", href: "/en/asgard/docs/release-notes" },
      { label: "Packages and installation", href: "/en/asgard/docs/packages-and-installation" },
      { label: "Identity and authorization operations", href: "/en/asgard/docs/identity-authorization-operations" },
      { label: "TsGen production operations", href: "/en/asgard/docs/tsgen-operations" },
    ],
  },
];

export const zhAsgardUpgradeDocs: DocPage[] = [{
  slug: "upgrade-to-5-1",
  group: "资源",
  eyebrow: "ASGARD 5.0.3 → 5.1.3",
  title: "升级到 Asgard 5.1",
  description: "把包、身份 Claims、TsGen 生成代码、回归验收与回滚收敛为一次可执行的 5.1.3 升级。",
  sections: zhSections,
  relatedDocs: [
    { product: "heimdall", docSlug: "heimdall-service-integration", label: "Heimdall 服务集成与版本化 Claims" },
    { product: "skills", docSlug: "skills-catalog", label: "选择升级所需的 Agent Skills" },
  ],
}];

export const enAsgardUpgradeDocs: DocPage[] = [{
  slug: "upgrade-to-5-1",
  group: "Resources",
  eyebrow: "ASGARD 5.0.3 → 5.1.3",
  title: "Upgrade to Asgard 5.1",
  description: "Turn packages, identity claims, generated TsGen output, acceptance, and rollback into one executable 5.1.3 upgrade.",
  sections: enSections,
  relatedDocs: [
    { product: "heimdall", docSlug: "heimdall-service-integration", label: "Heimdall service integration and versioned claims" },
    { product: "skills", docSlug: "skills-catalog", label: "Select the Agent Skills for this upgrade" },
  ],
}];
