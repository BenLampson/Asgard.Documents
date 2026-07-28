import type { DocPage, Locale } from "./content";

const userTokenProfile = `{
  "sub": "user-sub-001",
  "user_id": "user-001",
  "tenant_id": "11111111-2222-3333-4444-555555555555",
  "application_id": "orders-console",
  "application_manifest_version": "manifest-v12",
  "application_authorization_version": "application-auth-v7",
  "tenant_authorization_version": "tenant-auth-v35",
  "token_type": "UserLogin",
  "roles": ["operator"],
  "permissions": ["orders.read"],
  "scope": ["orders-api"],
  "userMetadatas": { "department": "operations" },
  "tenantMetadata": { "region": "CN" }
}`;

const serviceTokenProfile = `{
  "sub": "service:order-projector",
  "client_id": "order-projector",
  "tenant_id": "11111111-2222-3333-4444-555555555555",
  "token_type": "BackendService",
  "scope": ["jobs.execute"]
}`;

const authorizationExamples = `[AsgardAuthMatch(
    "token_type = 'UserLogin' and permission = 'orders.read'")]

[AsgardAuthMatch(
    "token_type = 'BackendService' and scope = 'jobs.execute'")]

[AsgardAuthAnyRole("admin", "ops")]
[AsgardAuthAllPermission("orders.read", "orders.audit")]`;

const ownershipDecision = `1. Require an authenticated Access Token.
2. Require the endpoint role / permission / scope / token_type policy.
3. Reject Guid.Empty for a tenant-owned operation.
4. Compare route tenantId with IdentityContext.Current.TenantId.
5. Load the resource through the tenant-aware repository.
6. Compare the resource TenantId again before mutation.
7. Derive TenantId and audit actor from trusted identity, never request input.
8. Return a stable forbidden/not-found contract without leaking another tenant's data.`;

const acceptanceCommands = `# Run identity, authorization, tenancy, and bearer integration suites.
dotnet test -c Release --filter "Identity|Authorization|Tenant|Bearer"

# Production acceptance must also exercise the deployed issuer and API:
# - valid and invalid signature, issuer, audience, expiry, and key rotation
# - missing, malformed, repeated, and JSON-array claims
# - application-context claim round-trip, missing/stale versions, and one application_id per token
# - issuer tenant versus supplied tenant_id mismatch
# - UserLogin versus BackendService token profiles
# - same resource id in two tenants, platform access, and Guid.Empty
# - HTTP request, job, worker, and message-consumer paths
# - logout/revocation before and after access-token expiry`;

const sourceAnchors = `Directory.Build.props
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Authentication.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Configurator.cs
Common/Asgard.Abstractions/Identity/AsgardClaimTypes.cs
Common/Asgard.Abstractions/Identity/AsgardTokenProfiles.cs
Common/Asgard.Abstractions/Identity/AbsAsgardUserInfo.cs
Common/Asgard.Abstractions/Identity/AsgardIdentitySnapshot.cs
Common/Asgard.AspNetCore.Core/Identity/AsgardTokenConventionValidator.cs
Common/Asgard.AspNetCore.Core/Identity/DefaultAsgardIdentityContextResolver.cs
Common/Asgard.AspNetCore.Core/Identity/AsgardIdentityContextAccessor.cs
Common/Asgard.AspNetCore.Core/Data/AsgardTenantMiddleware.cs
Common/Asgard.AspNetCore.Core/Data/TenantScopeFactory.cs
Common/Asgard.AspNetCore.Core/Data/AsgardTenantScope.cs
Common/Asgard.Core/Data/DatabaseServiceCollectionExtensions.cs
Common/Asgard.AspNetCore.Core/ServiceCollectionExtensions.cs
Common/Asgard.AspNetCore.Core/Authorization/AsgardAuthHandler.cs
Common/Asgard.AspNetCore.Core/Authorization/AsgardAuthExpressionParser.Parser.cs
Common/Asgard.AspNetCore.Core/Authorization/AsgardAuthEvaluator.Resolution.cs
Test/Asgard.Yggdrasil.AspNetCore.Tests/BearerPermissionAuthorizationTests.cs
Test/Asgard.AspNetCore.Core.Authorization.Tests/Authorization/AsgardAuthTokenTypeEvaluationTests.cs
Test/Asgard.Core.Tests/Identity/AbsAsgardUserInfoTests.cs
Test/Asgard.Core.Tests/Data/DatabaseTenantIntegrationTests.cs`;

const sectionIds = [
  "contract",
  "request-pipeline",
  "claims-contract",
  "token-profiles",
  "identity-snapshot",
  "tenant-boundary",
  "authorization-policy",
  "authorization-dsl",
  "resource-ownership",
  "platform-access",
  "non-http",
  "revocation",
  "failure-operations",
  "acceptance",
  "ai-ready",
  "sources",
] as const;

function makePage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "identity-authorization-operations",
    group: zh ? "身份与租户" : "Identity & tenancy",
    eyebrow: "ASGARD 5.1.3 · IDENTITY OPERATIONS",
    title: zh ? "身份、租户与授权生产操作" : "Identity, tenancy, and authorization operations",
    description: zh
      ? "从 Access Token 验证、身份快照与租户过滤，到 AsgardAuth、资源归属、后台执行和撤销传播的生产安全合同。"
      : "A production security contract from Access Token validation, identity snapshots, and tenant filtering through AsgardAuth, resource ownership, background execution, and revocation propagation.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "发布合同与防线分层" : "Released contract and layered defenses",
        paragraphs: [
          zh
            ? "本页以 2026-07-28 检查的 Asgard 5.1.3 clean source commit d1002d1（发布 tag v5.1.3 / 90e8a8b）为准。内建 Yggdrasil 路径提供租户 issuer JWT Bearer 验证、Asgard claim 规范化、AsyncLocal 身份快照、FreeSql 租户过滤和 AsgardAuth 端点资格判断。每层只解决自己的问题，任何一层都不能代替资源归属校验。"
            : "This guide is contracted against clean Asgard 5.1.3 source commit d1002d1, reviewed on 2026-07-28 and released by tag v5.1.3 / 90e8a8b. The built-in Yggdrasil path supplies tenant-issuer JWT Bearer validation, Asgard claim normalization, an AsyncLocal identity snapshot, FreeSql tenant filtering, and AsgardAuth endpoint qualification. Each layer solves only its own problem; none replaces resource-ownership checks.",
          zh
            ? "生产安全链必须同时成立：只接受 Access Token；验证签名、issuer、audience 与生命周期；建立可信 snapshot；执行后端授权；验证路由、身份与实体归属一致；写入审计。前端隐藏按钮只是体验优化，ID Token 不是 API 凭据，GlobalFilter 也不是授权策略。"
            : "The production chain requires every layer: accept an Access Token, validate signature/issuer/audience/lifetime, establish a trusted snapshot, run backend authorization, prove route/identity/entity ownership, and write audit evidence. Hiding a frontend button is UX only, an ID Token is not an API credential, and GlobalFilter is not an authorization policy.",
        ],
        note: zh
          ? "Release：上述本地 JWT 与授权链路有源码和集成测试证据。未发布：按请求 introspection、通用 deny-list、即时撤销传播或自动资源归属授权。"
          : "Release: the local JWT and authorization path above has source and integration-test evidence. Not shipped: per-request introspection, a general deny-list, immediate revocation propagation, or automatic resource-ownership authorization.",
      },
      {
        id: sectionIds[1],
        title: zh ? "Access Token 到 snapshot 的实际顺序" : "The actual Access Token-to-snapshot order",
        bullets: zh
          ? [
              "UseRouting 后进入 CORS/限流；host.auth.enabled=true 时再执行 UseAuthentication",
              "JWT Bearer 使用 MapInboundClaims=false，并验证签名、恰好一个 {tenant} 的 issuerTemplate、精确 audience、有效期与零 ClockSkew",
              "OnTokenValidated 在 tenant_id 缺失时从匹配的 issuer 补入租户，然后运行 AsgardTokenConventionValidator",
              "UseAsgardTenant 把 ClaimsPrincipal 解析成 AsgardIdentitySnapshot，并通过 Push 在请求结束时恢复此前环境值",
              "宿主扩展中间件与插件中间件之后才统一执行 UseAuthorization，然后映射 Controller",
            ]
          : [
              "After UseRouting, the request passes CORS/rate limiting, then UseAuthentication when host.auth.enabled=true",
              "JWT Bearer uses MapInboundClaims=false and validates signature, an issuerTemplate containing exactly one {tenant}, exact audience membership, lifetime, and zero ClockSkew",
              "OnTokenValidated fills a missing tenant_id from the matched issuer, then runs AsgardTokenConventionValidator",
              "UseAsgardTenant resolves ClaimsPrincipal into AsgardIdentitySnapshot and Push restores the previous ambient value after the request",
              "Yggdrasil runs extension/plugin middleware before the shared UseAuthorization, then maps controllers",
            ],
        note: zh
          ? "当前 OnTokenValidated 只在 tenant_id 缺失时补值；已有 tenant_id 不会在该路径与 issuer 中的租户再次比对。IDP 必须保证二者一致，资源 API 还应增加不一致拒绝测试；不要把“来自已验签 token”误写成“框架已证明租户一致”。"
          : "OnTokenValidated currently fills tenant_id only when absent; this path does not cross-check an existing tenant_id against the tenant encoded in issuer. The IDP must guarantee consistency and the resource API should add a mismatch rejection test. Do not turn ‘came from a signed token’ into ‘the framework proved tenant consistency.’",
      },
      {
        id: sectionIds[2],
        title: zh ? "标准 claims 与编码合同" : "Standard claims and encoding contract",
        paragraphs: [
          zh
            ? "框架 claim 名区分大小写：sub、user_id、tenant_id、client_id、application_id、application_manifest_version、application_authorization_version、tenant_authorization_version、token_type、roles、permissions、scope、userMetadatas、tenantMetadata。5.1.0 起 AbsAsgardUserInfo 会把四个应用授权上下文字段作为可空、不透明字符串双向映射；基类只负责携带，不会验证它们是否必填、是否新鲜，也不会比较版本大小。签发方与资源 API 的 Token Profile 必须负责这些约束。"
            : "Framework claim names are case-sensitive: sub, user_id, tenant_id, client_id, application_id, application_manifest_version, application_authorization_version, tenant_authorization_version, token_type, roles, permissions, scope, userMetadatas, and tenantMetadata. Since 5.1.0, AbsAsgardUserInfo round-trips the four application-authorization context fields as nullable opaque strings. The base class carries them but does not enforce requiredness or freshness and never orders the versions; the issuer and resource API Token Profile own those checks.",
          zh
            ? "AbsAsgardUserInfo.ToClaims 会把列表写为 JSON 数组、字典写为 JSON 对象；当前 InitFromClaims 同时兼容 JSON 数组和 JWT handler 展开的多个同名单值列表 claim。字典仍必须是 JSON 对象。应用访问 Token 应只包含一个 application_id；roles/permissions 必须已按该应用与当前租户裁剪，application_manifest_version 应表示租户实际应用成功的版本，而不是未经部署的最新版本。"
            : "AbsAsgardUserInfo.ToClaims writes lists as JSON arrays and dictionaries as JSON objects. Current InitFromClaims accepts both JSON arrays and repeated scalar list claims produced by a JWT handler; dictionaries still require JSON objects. An application access token should carry one application_id; roles and permissions must already be scoped to that application and tenant, and application_manifest_version must describe the version actually applied for the tenant rather than an undeployed latest version.",
          zh
            ? "无效列表 JSON 会被忽略，无效字典 JSON 会变成空字典，而不是在 snapshot 解析时抛错；这通常导致 AsgardAuth 失败但不会说明上游编码错在哪里。生产 IDP 应固定一种编码、在签发前做 schema 校验，并用完整 Bearer 集成测试观察最终 snapshot。"
            : "Invalid list JSON is skipped and invalid dictionary JSON becomes an empty dictionary rather than throwing during snapshot resolution. Authorization usually fails afterward without identifying the upstream encoding error. A production issuer should pin one encoding, schema-validate before issuance, and inspect the final snapshot in a full Bearer integration test.",
        ],
        code: { language: "json", value: userTokenProfile },
      },
      {
        id: sectionIds[3],
        title: zh ? "UserLogin 与 BackendService Profile" : "UserLogin and BackendService profiles",
        paragraphs: [
          zh
            ? "官方 UserLogin Profile 要求 sub、user_id，推荐 tenant_id、roles、permissions、scope、token_type。BackendService 要求 sub、client_id、token_type，推荐 tenant_id、scope，并禁止 user_id。服务令牌不要伪装用户，也不要用用户角色代替窄 scope。"
            : "The official UserLogin profile requires sub and user_id and recommends tenant_id, roles, permissions, scope, and token_type. BackendService requires sub, client_id, and token_type, recommends tenant_id and scope, and forbids user_id. A service token must not impersonate a user or replace narrow scopes with user roles.",
          zh
            ? "运行时总是要求 sub；显式且精确写为 UserLogin 时才执行 user_id 最小校验，BackendService 会要求 client_id 并拒绝 user_id。缺失或无法识别的 token_type 会根据 client_id/user_id 推断，而不是统一拒绝。因此签发端必须输出精确的 UserLogin/BackendService；高保证 API 应在自己的入口或认证事件中拒绝缺失、未知及大小写变体，不能把 AsgardTokenProfiles 类型存在当成全部规则已强制执行。"
            : "Runtime always requires sub. It applies the minimum user_id check when token_type is explicitly and exactly UserLogin; BackendService requires client_id and rejects user_id. Missing or unrecognized token_type falls back to inference from client_id/user_id instead of being rejected universally. Issuers must emit exact UserLogin/BackendService values, and high-assurance APIs should reject missing, unknown, and case variants in their own authentication boundary. The existence of AsgardTokenProfiles is not proof that every profile rule is enforced.",
        ],
        code: { language: "json", value: serviceTokenProfile },
      },
      {
        id: sectionIds[4],
        title: zh ? "snapshot 是运行时身份唯一入口" : "The snapshot is the runtime identity entry point",
        paragraphs: [
          zh
            ? "DefaultAsgardIdentityContextResolver 从 ClaimsPrincipal 构造 DefaultAsgardUserInfo。tenant_id 能解析为非空 Guid 时，snapshot.TenantId 为该值且 UserType=Tenant；缺失、非法或 Guid.Empty 时得到平台身份。token_type 优先按枚举名大小写不敏感解析，否则依据 client_id 存在且 user_id 为空推断 BackendService。"
            : "DefaultAsgardIdentityContextResolver builds DefaultAsgardUserInfo from ClaimsPrincipal. A tenant_id that parses to a non-empty Guid becomes snapshot.TenantId with UserType=Tenant; a missing, malformed, or empty Guid produces a platform identity. token_type is first parsed case-insensitively as an enum name, then inferred as BackendService when client_id exists and user_id is empty.",
          zh
            ? "Controller、Service、Repository 与审计代码应读取 IAsgardIdentityContext 或 AbsAsgardContext.IdentityContext，不要重复解析 ClaimsPrincipal。IdentityContext 在完全自定义宿主中可以为 null；租户写入场景必须失败关闭，而不是降级成平台或匿名操作。"
            : "Controllers, services, repositories, and audit code should consume IAsgardIdentityContext or AbsAsgardContext.IdentityContext rather than reparsing ClaimsPrincipal. IdentityContext can be null in a fully custom host. Tenant writes must fail closed instead of degrading to a platform or anonymous operation.",
        ],
      },
      {
        id: sectionIds[5],
        title: zh ? "租户过滤的能力与危险空档" : "Tenant-filter capability and dangerous gaps",
        paragraphs: [
          zh
            ? "AddDatabase 在 IAsgardIdentityContext 存在时为 AbsAsgardTenantEntity 注册动态 FreeSql GlobalFilter。当前 snapshot.TenantId 非 Guid.Empty 时，查询条件是 entity.TenantId == currentTenantId.ToString()；仓储写入只会在实体 TenantId 为空时回填当前租户，显式输入的 TenantId 不会被覆盖。"
            : "AddDatabase installs a dynamic FreeSql GlobalFilter for AbsAsgardTenantEntity when IAsgardIdentityContext is available. With a non-empty snapshot tenant, it filters entity.TenantId == currentTenantId.ToString(). Repository writes fill the ambient tenant only when entity.TenantId is empty; they do not overwrite an explicitly supplied TenantId.",
          zh
            ? "因此 Guid.Empty、缺失 IdentityContext、非租户实体、原生 SQL、另建 IFreeSql 和调用方预填 TenantId 都是安全审查点。租户 Service 必须先拒绝空 snapshot，再校验路由 tenantId、实体 TenantId 与 snapshot 一致，并禁止 DTO 决定归属。"
            : "Guid.Empty, missing IdentityContext, non-tenant entities, raw SQL, a separately built IFreeSql, and caller-prefilled TenantId are therefore security review points. A tenant service must reject an empty snapshot first, compare route tenantId and entity TenantId with the snapshot, and prevent DTO input from choosing ownership.",
        ],
      },
      {
        id: sectionIds[6],
        title: zh ? "AsgardAuth policy 与 401/403" : "AsgardAuth policy and 401/403",
        paragraphs: [
          zh
            ? "所有 AsgardAuth* 特性都绑定名为 AsgardAuth 的 policy；AddAsgardAspNetCore 注册 RequireAuthenticatedUser、共享 requirement、handler、解析器与求值器。没有认证身份会触发 challenge（通常 401）；认证成功但表达式为 false 时不 Succeed，授权中间件返回 forbidden（通常 403）。"
            : "Every AsgardAuth* attribute binds the AsgardAuth policy. AddAsgardAspNetCore registers RequireAuthenticatedUser, the shared requirement, handler, parser, and evaluator. A missing authenticated identity triggers a challenge (normally 401); an authenticated identity whose expression evaluates false does not succeed and authorization returns forbidden (normally 403).",
          zh
            ? "内置 Any/All 特性覆盖 role、permission、scope、用户元数据、租户元数据与 name。值比较大小写不敏感；空期望集、空实际集或无法解析的字段会失败。默认 IAsgardAuthDataResolver 返回 null，只有应用显式替换它时才会从外部补数据；外部补全必须有超时、缓存、故障和审计策略。"
            : "Built-in Any/All attributes cover role, permission, scope, user metadata, tenant metadata, and name. Value comparison is case-insensitive; empty expected/actual sets and unresolved fields fail. The default IAsgardAuthDataResolver returns null, so external enrichment occurs only when the application replaces it. Such enrichment needs explicit timeout, caching, failure, and audit policy.",
        ],
      },
      {
        id: sectionIds[7],
        title: zh ? "DSL：只使用已发布字段" : "DSL: use only released fields",
        paragraphs: [
          zh
            ? "AsgardAuthMatch 当前字段白名单是 role、permission、scope、token_type、name、metadata.xxx 与 tenant.xxx。token_type 直接读取 snapshot.TokenType 并输出枚举名；不要复制到 metadata。解析器支持 and、or、not、括号、=、!=、in、like、顺序比较和已注册函数。未知字段或语法错误会抛 InvalidOperationException，应在启动/测试阶段发现，而不是在线上第一次请求才发现。"
            : "The current AsgardAuthMatch field allowlist is role, permission, scope, token_type, name, metadata.xxx, and tenant.xxx. token_type reads snapshot.TokenType directly and exposes its enum name; do not duplicate it into metadata. The parser supports and, or, not, parentheses, =, !=, in, like, ordered comparisons, and registered functions. Unknown fields and syntax errors throw InvalidOperationException and should be found during startup/testing, not on the first production request.",
          zh
            ? "多个 AsgardAuth 特性按端点 metadata 顺序线性组装，缺省连接符是 and；AsgardAuthAnd/Or 只连接相邻条件。复杂优先级应集中在一个 AsgardAuthMatch 中显式加括号，避免依赖 Attribute 排序形成难审计策略。"
            : "Multiple AsgardAuth attributes are assembled linearly in endpoint metadata order, with and as the default connector; AsgardAuthAnd/Or connects neighboring conditions. Put complex precedence in one parenthesized AsgardAuthMatch rather than relying on attribute ordering for a policy that is difficult to audit.",
        ],
        code: { language: "csharp", value: authorizationExamples },
      },
      {
        id: sectionIds[8],
        title: zh ? "资源归属是第二次后端授权" : "Resource ownership is a second backend authorization",
        paragraphs: [
          zh
            ? "AsgardAuth 证明调用方具备进入端点的资格，不知道订单、文件或项目属于谁。Service 必须把受信任 snapshot、路由 tenantId、资源 TenantId/OwnerId 和操作类型放进同一个决策；Repository 的 GlobalFilter 只能缩小数据库候选集，不能表达平台委托、共享资源或用户级 ownership。"
            : "AsgardAuth proves that a caller qualifies for an endpoint; it does not know who owns an order, file, or project. The service must evaluate the trusted snapshot, route tenantId, resource TenantId/OwnerId, and operation together. Repository GlobalFilter only narrows database candidates; it cannot express platform delegation, shared resources, or user-level ownership.",
          zh
            ? "更新时先查询数据库实体，再修改允许字段；不要从 VO/DTO 重建实体，也不要让前端提交 TenantId、OwnerId、CreateBy、UpdateBy 或 Version 作为可信值。跨租户不存在与无权访问可使用统一外部响应以减少枚举，但内部日志要保留非敏感拒绝原因、traceId、subject 和目标 tenantId。"
            : "For updates, load the persisted entity first and mutate allowed fields. Never rebuild it from a VO/DTO or trust frontend TenantId, OwnerId, CreateBy, UpdateBy, or Version. Cross-tenant absence and denial may share one external response to reduce enumeration, while internal logs retain a non-sensitive denial reason, traceId, subject, and target tenantId.",
        ],
        code: { language: "text", value: ownershipDecision },
      },
      {
        id: sectionIds[9],
        title: zh ? "平台访问必须走专门路径" : "Platform access needs a dedicated path",
        paragraphs: [
          zh
            ? "tenant_id 缺失或无效会得到 UserType.Platform 与 Guid.Empty，FreeSql 租户过滤随之关闭。这是平台上下文的技术行为，不是自动授予跨租户权限。普通租户端点应在任何查询前拒绝 Guid.Empty。"
            : "A missing or invalid tenant_id yields UserType.Platform and Guid.Empty, disabling the FreeSql tenant filter. This is a platform-context behavior, not automatic cross-tenant authority. Ordinary tenant endpoints must reject Guid.Empty before any query.",
          zh
            ? "确需跨租户的运营接口应使用独立路由、平台专用 permission/scope、BackendService/UserLogin 限制、强制 reason、目标租户 allowlist、分页/导出上限和不可抵赖审计。先解析明确目标租户，再进入受控 TenantScope；不要在无过滤 IFreeSql 上先拉全表后在内存筛选。"
            : "A necessary cross-tenant operation should use a separate route, platform-only permission/scope, an explicit BackendService/UserLogin rule, mandatory reason, target-tenant allowlist, paging/export limits, and durable audit. Resolve an explicit target tenant and enter a controlled TenantScope before data access; never load an unfiltered table and filter it in memory.",
        ],
      },
      {
        id: sectionIds[10],
        title: zh ? "Job、Worker 与消息消费" : "Jobs, workers, and message consumers",
        paragraphs: [
          zh
            ? "非 HTTP 执行没有 UseAuthentication、UseAsgardTenant 或端点 AsgardAuth。每个消息/作业必须携带可验证的 tenantId 与调用目的，在自己的 DI scope 中取得 AbsAsgardContext，确认 TenantScopeFactory 可用且 tenantId 非空，再用 CreateScope 包住全部仓储调用；缺失能力必须失败关闭并进入重试/死信或人工处置。"
            : "Non-HTTP execution has no UseAuthentication, UseAsgardTenant, or endpoint AsgardAuth. Every message/job needs a verifiable tenantId and purpose. Within its own DI scope, resolve AbsAsgardContext, require TenantScopeFactory and a non-empty tenantId, then wrap every repository operation in CreateScope. Missing capability must fail closed into retry/dead-letter or operator handling.",
          zh
            ? "TenantScopeFactory 只通过 record copy 替换 snapshot.TenantId，并在 Dispose 时恢复；它不会改写 UserInfo.TenantId、角色、权限、用户或 token_type，也不会执行 AsgardAuth。后台业务必须使用明确的 system actor 和独立应用授权；并行处理时每个分支创建自己的 DI scope 与租户 scope。"
            : "TenantScopeFactory changes only snapshot.TenantId through a record copy and restores it on Dispose. It does not rewrite UserInfo.TenantId, roles, permissions, user, or token_type, and it does not run AsgardAuth. Background work needs an explicit system actor and application authorization. Each parallel branch needs its own DI scope and tenant scope.",
        ],
      },
      {
        id: sectionIds[11],
        title: zh ? "撤销、登出与 key 轮换边界" : "Revocation, logout, and key-rotation boundary",
        paragraphs: [
          zh
            ? "内建 resource-server 路径本地校验 JWT 签名、issuer、audience 与 exp，并从 Discovery/JWKS 取 key；它不会每次请求查询 Heimdall session、logout、token revocation 或 introspection。因此用户登出、管理员撤销、权限移除与租户禁用不会让已签发 Access Token 立即失效，除非另有已发布的 deny-list/introspection/invalidation 集成。"
            : "The built-in resource-server path validates JWT signature, issuer, audience, and exp locally and obtains keys through Discovery/JWKS. It does not query Heimdall session, logout, token revocation, or introspection on every request. User logout, administrative revocation, permission removal, and tenant disable therefore do not invalidate an issued Access Token immediately unless a separately released deny-list/introspection/invalidation integration exists.",
          zh
            ? "生产设计要用短 Access Token TTL 限制暴露窗口，定义 JWKS 缓存与 key 轮换重叠期，监控未知 kid/Discovery 失败，并明确紧急处置方案。不要用刷新令牌访问 API，也不要承诺登出后外部 API 即时拒绝。"
            : "Use a short Access Token TTL to bound exposure, define JWKS-cache and key-rotation overlap, monitor unknown kid and Discovery failures, and document emergency response. Never call an API with a refresh token, and never promise immediate external-API rejection after logout.",
        ],
      },
      {
        id: sectionIds[12],
        title: zh ? "故障检测与安全响应" : "Failure detection and security response",
        bullets: zh
          ? [
              "401 按签名、kid/JWKS、issuerTemplate、audience、exp/时钟和 token convention 顺序排查；不要先放宽验证",
              "403 对照最终 snapshot 的 roles/permissions/scope/token_type、端点 metadata 顺序、DSL 与资源归属；不要只看原始 JWT 文本",
              "记录 traceId、结果、策略名、subject/client_id、tenantId 与目标资源摘要；禁止记录完整 token、metadata 中的个人数据或敏感 claim",
              "对无效 tenant_id、issuer/tenant 不一致、Guid.Empty 租户写入、显式跨租户实体和缺少后台 scope 建立告警",
              "Discovery/JWKS 故障应默认拒绝新认证；是否短暂使用缓存 key 必须有明确 TTL、轮换和事故手册，不能静默跳过验签",
              "授权数据解析器故障应失败关闭；不能因数据库、缓存或远程权限服务不可用而自动放行",
            ]
          : [
              "For 401, inspect signature, kid/JWKS, issuerTemplate, audience, exp/clock, then token convention; never begin by weakening validation",
              "For 403, compare final snapshot roles/permissions/scope/token_type, endpoint metadata order, DSL, and resource ownership; the raw JWT text alone is insufficient",
              "Log traceId, outcome, policy, subject/client_id, tenantId, and a target-resource summary; never log full tokens, personal metadata, or sensitive claims",
              "Alert on invalid tenant_id, issuer/tenant mismatch, tenant writes under Guid.Empty, explicit cross-tenant entities, and missing background scope",
              "Discovery/JWKS failure must reject new authentication by default; cached-key behavior needs explicit TTL, rotation, and incident policy and must never silently skip signature validation",
              "Authorization data-resolver failure must fail closed; database, cache, or remote permission outages cannot become automatic access",
            ],
      },
      {
        id: sectionIds[13],
        title: zh ? "生产验收矩阵" : "Production acceptance matrix",
        bullets: zh
          ? [
              "真实 issuer：正确/错误签名、未知 kid、错误 issuer/audience、过期、零 ClockSkew、Discovery/JWKS 缓存与轮换",
              "claims：JSON 数组、多个同名单值、空数组、畸形 JSON、大小写错误、未知 token_type、缺 sub/user_id/client_id",
              "应用上下文：四个 application/version claim 双向一致；资源 Profile 对缺失、陈旧和跨应用混合失败关闭",
              "租户：缺 tenant_id 自动补值、显式 tenant_id 与 issuer 不一致、非法/Empty Guid、两个租户共享同一资源 ID",
              "授权：未认证得到 401；认证但角色/权限/scope/token_type 不匹配得到 403；每个 DSL 分支和 metadata 顺序都有正反例",
              "归属：路由 tenantId、snapshot、实体归属与审计 actor 任一不一致都在写库前拒绝，DTO 不能越权改写",
              "平台：普通租户 API 拒绝 Guid.Empty；专用跨租户 API 验证 permission、目标 allowlist、reason、上限和审计",
              "非 HTTP：逐租户、嵌套 scope、异常释放、并行 scope、重试/重复消息和缺少 TenantScopeFactory 都有失败关闭测试",
              "撤销：实测 logout/revoke 后旧 Access Token 在到期前的真实行为，并让运行手册与用户承诺一致",
            ]
          : [
              "Real issuer: valid/invalid signature, unknown kid, wrong issuer/audience, expiry, zero ClockSkew, Discovery/JWKS caching, and rotation",
              "Claims: JSON arrays, repeated scalars, empty arrays, malformed JSON, wrong case, unknown token_type, and missing sub/user_id/client_id",
              "Application context: all four application/version claims round-trip exactly, while the resource profile fails closed on missing, stale, or cross-application mixtures",
              "Tenancy: fill missing tenant_id, supplied tenant_id versus issuer mismatch, malformed/empty Guid, and identical resource IDs in two tenants",
              "Authorization: unauthenticated is 401; authenticated role/permission/scope/token_type mismatch is 403; every DSL branch and metadata ordering has positive/negative cases",
              "Ownership: any route tenantId, snapshot, entity owner, or audit-actor mismatch is rejected before persistence; DTO input cannot rewrite ownership",
              "Platform: normal tenant APIs reject Guid.Empty; dedicated cross-tenant APIs verify permission, target allowlist, reason, limits, and audit",
              "Non-HTTP: per-tenant, nested scope, exceptional disposal, parallel scope, retry/duplicate message, and missing TenantScopeFactory all have fail-closed tests",
              "Revocation: measure the real old-Access-Token behavior after logout/revoke and align runbooks and user promises with that evidence",
            ],
        code: { language: "text", value: acceptanceCommands },
      },
      {
        id: sectionIds[14],
        title: zh ? "AI Ready：Agent 守门工作流" : "AI Ready: agent gate workflow",
        paragraphs: [
          zh
            ? "修改身份模型、claims、测试登录态或审计 actor 前加载 asgard-identity-userinfo；修改 AsgardAuth 属性或 DSL 前加载 asgard-auth-authorization；读取 snapshot 或创建后台租户 scope 前加载 asgard-context-usage。涉及 C# 时必须再加载 asgard-dotnet-10-csharp-14；涉及 Controller/Service/Repository、租户字段、DTO、Version 与响应包装时用 asgard-backend-guard 复查。"
            : "Load asgard-identity-userinfo before changing identity models, claims, test principals, or audit actors; asgard-auth-authorization before changing AsgardAuth attributes or DSL; and asgard-context-usage before reading snapshots or creating background tenant scopes. C# work also requires asgard-dotnet-10-csharp-14. Use asgard-backend-guard to review Controller/Service/Repository flow, tenant fields, DTOs, Version, and response wrappers.",
          zh
            ? "Agent 必须给出 Access Token→principal→snapshot→policy→ownership→repository 的逐层证据，并生成正反测试矩阵。出现“前端已隐藏”“JWT 已验签”“有 GlobalFilter”“logout 已成功”时都要继续追问后端资源归属、issuer/tenant 一致性、平台 Guid.Empty 与撤销传播；禁止把这些局部事实扩写成端到端安全保证。"
            : "An agent must show evidence for each Access Token → principal → snapshot → policy → ownership → repository layer and produce positive and negative tests. ‘The frontend hides it,’ ‘JWT was signed,’ ‘GlobalFilter exists,’ and ‘logout succeeded’ all require follow-up on backend ownership, issuer/tenant consistency, platform Guid.Empty, and revocation propagation. Never expand a local fact into an end-to-end security guarantee.",
        ],
      },
      {
        id: sectionIds[15],
        title: zh ? "源码核验入口" : "Source verification anchors",
        paragraphs: [
          zh
            ? "维护本页时先 diff 下列源码与测试。认证配置、OnTokenValidated、claim 解析、Token Profile、snapshot、TenantScope、GlobalFilter、AsgardAuth 字段/求值或中间件顺序任一变化，都必须同步两种语言、失败边界和验收矩阵。"
            : "When maintaining this guide, diff the following source and tests first. Any change to authentication configuration, OnTokenValidated, claim parsing, token profiles, snapshots, TenantScope, GlobalFilter, AsgardAuth fields/evaluation, or middleware order must update both locales, failure boundaries, and the acceptance matrix.",
        ],
        code: { language: "text", value: sourceAnchors },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "identity-and-tenancy", label: zh ? "身份与租户概念" : "Identity and tenancy concepts" },
      { product: "asgard", docSlug: "authorization", label: zh ? "AsgardAuth 表达式" : "AsgardAuth expressions" },
      { product: "asgard", docSlug: "resource-api-authentication", label: zh ? "Heimdall 资源 API 对接" : "Heimdall resource API integration" },
      { product: "asgard", docSlug: "tenant-background-work", label: zh ? "后台任务租户隔离" : "Background tenant isolation" },
    ],
  };
}

export const zhAsgardIdentityAuthorizationOperationsDocs: DocPage[] = [makePage("zh")];
export const enAsgardIdentityAuthorizationOperationsDocs: DocPage[] = [makePage("en")];
