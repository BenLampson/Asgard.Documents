import type { DocPage } from "./content";

const releaseMatrix = `Surface                         Status          Evidence baseline
Heimdall server + Web          Release         5.3.19 · tag v5.3.19 · commit 0032070
Runtime                        Release         .NET 10 · C# 14 preview language
Application-domain RBAC        Release         Application/Manifest/Tenant binding + versioned claims
Governed MCP                   Release         5.3.0+ · Tools/Resources/Prompts/Tasks + OAuth/AK-SK
Backend Directory              Release         read + least-privilege write scopes through 5.3.18
Mini JWT issuer packages       Release         5.3.19 · version follows Directory.Build.props
Management Web supply chain    Release         5.3.19 · zero critical/high npm audit findings
PostgreSQL migration model     Limited         increments only; no baseline/ledger/down scripts`;

const releaseAcceptance = `1. Pin tag v5.3.19, commit 0032070, and matching backend + Web image digests.
2. Back up PostgreSQL; run the application-domain precheck/migrate/postcheck stages and the MCP policy increment under an approved plan.
3. Verify Application Manifest publication, Tenant enable/sync/disable, Application Grants, and application-scoped OIDC Clients.
4. Verify /mcp protected-resource discovery, OAuth and AK/SK policy boundaries, two-phase writes, audit, and task limits.
5. Verify Backend Directory read/write scopes, tenant isolation, group-member persistence, and negative cases.
6. Run root/tenant Discovery/JWKS, Authorization Code + PKCE, Refresh, UserInfo, logout, and API Bearer tests.
7. Deploy the backend and Web images from the same tag; inspect Secure cookies and browser/console behavior through the real proxy.`;

export const zhHeimdallReleaseDocs: DocPage[] = [
  {
    slug: "heimdall-release-notes",
    group: "资源",
    eyebrow: "HEIMDALL 5.3.19 · RELEASE STATUS",
    title: "版本、发布状态与升级基线",
    description: "以 v5.3.19 不可变 tag 为当前 Release，说明 Application 域、受治理 MCP、Backend Directory 与数据库升级边界。",
    sections: [
      {
        id: "purpose",
        title: "当前 Release 证据",
        paragraphs: [
          "本站于 2026-07-28 审阅 clean main 0032070；它正好是不可变 tag v5.3.19，be/Directory.Build.props 与 OidcPlugin.Version 均为 5.3.19。因此当前没有 tag 后 HEAD-only 差异，也不再沿用 5.1.2 的版本漂移告警。",
          "5.3.19 是从 5.1.2 跨越多个公开合同的功能升级，不应作为只换镜像的小补丁：Application-domain RBAC、完整 MCP 管理面、Backend Directory 写入、双镜像部署与前端依赖安全均需要独立验收。",
        ],
      },
      {
        id: "matrix",
        title: "当前版本矩阵",
        code: { language: "text", value: releaseMatrix },
        note: "Asgard.Heimdall.JwtSigning 两个项目已移除 0.2.0 项目级版本覆盖，当前随 Directory.Build.props 生成 5.3.19 包；升级前必须重新验证包 API 与 NuGet 可用性。",
      },
      {
        id: "application-domain",
        title: "Application-domain RBAC 与 Token 边界",
        bullets: [
          "新增 Application、不可变递增 Manifest、Application Permission/Role 模板、TenantApplication、Tenant 角色实例与 SystemUser Application Grant",
          "应用管理员必须同时满足 application-scoped 原生权限、有效 Application Grant 与 Tenant scope；平台超管旁路必须显式且可审计",
          "TenantApplication 停用保留数据但阻断签发与业务访问；重新启用恢复关系，不能删除后重新部署制造重复授权",
          "Access Token 只属于一个 application_id，并携带 Manifest/Application/Tenant 授权版本；业务应用 Token 不得聚合 platform.* 权限",
          "Application-level OIDC Client 使用 ApplicationId 且 TenantId 为 null；5.3.9–5.3.12 修复启动 RBAC 同步、nullable Tenant 查询与系统用户登录兼容性",
        ],
      },
      {
        id: "mcp",
        title: "5.3.x 受治理 MCP",
        bullets: [
          "5.3.0 将 /mcp 升级为有状态 Streamable HTTP 管理面，并提供平台/租户 Tools、Resources、Prompts 与有界 Tasks",
          "OAuth 客户端通过 /.well-known/oauth-protected-resource/mcp 发现资源；Bearer Token 必须由内建 Heimdall 管理 Application 签发",
          "AK/SK 策略支持工具、权限、CIDR、有效期、环境、每分钟额度与并发上限；空列表表示不额外收窄",
          "所有非只读工具执行两阶段确认；令牌绑定调用方、工具名与完整载荷，且只能使用一次",
          "受限凭据创建/更新另一凭据时只能委派自身工具与权限边界的子集；成功和失败调用均进入安全事件审计",
          "5.3.8–5.3.10 补齐平台 Application/OIDC Client 工具与 nullable Tenant 兼容；显式 allowedTools 的旧凭据不会自动获得新增工具",
        ],
      },
      {
        id: "directory-and-web",
        title: "Backend Directory 与管理 Web",
        bullets: [
          "5.3.14 新增租户组分页；5.3.16 增加 heimdall.directory.write，并提供创建组、替换成员、删除空组的 Tenant-bound BackendService 路由",
          "写请求仍只从已验证 Token 取得 Tenant；5.3.17 固定成员字段 tenant_user_ids 并拒绝空值，5.3.18 修复非空成员集合持久化",
          "5.3.7 起后端与 heimdall-web 是同 tag 的两个独立镜像；管理 origin 指向 Web 容器，OIDC/API/MCP/SCIM origin 指向后端",
          "5.3.19 更新 Umi/Axios 及多个传递依赖，发布审计为 0 critical / 0 high；这不是对剩余中低风险或运行时配置安全的豁免",
        ],
      },
      {
        id: "migration-boundary",
        title: "数据库迁移与兼容边界",
        bullets: [
          "5.3.19 仓库共有 12 个 PostgreSQL 增量 SQL；新增 Application 域的 precheck、migrate、postcheck、cleanup 四阶段脚本，以及 MCP credential policy 扩容脚本",
          "Application 迁移必须先处理重复业务键、孤儿关系、Client ApplicationId 回填和软删除历史，再收紧约束；cleanup 只能在回滚窗口结束后运行",
          "仓库仍没有完整空库 baseline、内建 migration ledger/checksum 或 down scripts；文件存在不等于可对任意历史库按目录顺序执行",
          "auto_sync_schema 默认 false。生产使用单独 migration runner、数据库备份/PITR 与真实起始版本演练，不能让多个副本并发改 schema",
        ],
      },
      {
        id: "remaining-boundaries",
        title: "仍需保持的安全边界",
        bullets: [
          "固定 HTTPS oidc.issuer 不会替应用恢复 Request.Scheme，也不会自动令 Asgard.Identity Cookie 带 Secure；受信代理与真实浏览器检查仍是部署责任",
          "Discovery/JWKS 离线验签不会逐请求查询 Heimdall 撤销状态；外部 API 要靠短 TTL、Webhook/撤销水位或另行验证的在线机制",
          "Introspection 仍按 confidential client 与 token client/tenant 归属收窄，不能描述成任意资源服务器可用的通用 RFC 7662 服务",
          "Tasks 当前使用适合单容器的内存 Store；横向扩容前需要共享持久化 Store 和多节点验收",
        ],
      },
      {
        id: "upgrade",
        title: "5.1.2 → 5.3.19 发布验收",
        paragraphs: [
          "把数据库、后端、Web、Application 授权、MCP 凭据策略与客户端生成物视为一个发布单元。先在生产备份克隆上完成迁移与回滚演练，再部署同一 tag 的双镜像；重新生成/编译前端或 SDK，并对权限收窄与新增工具执行负向测试。",
        ],
        code: { language: "text", value: releaseAcceptance },
      },
    ],
    relatedDocs: [
      { product: "heimdall", docSlug: "heimdall-quick-start", label: "从源码完成本地登录闭环" },
      { product: "heimdall", docSlug: "heimdall-application-rbac", label: "Application Manifest、Tenant 绑定与应用域 RBAC" },
      { product: "heimdall", docSlug: "heimdall-management-api", label: "管理 API 与 Application 边界" },
      { product: "heimdall", docSlug: "heimdall-mcp", label: "MCP 接入与治理" },
      { product: "heimdall", docSlug: "heimdall-service-integration", label: "BackendService 集成" },
      { product: "heimdall", docSlug: "heimdall-database-migrations", label: "数据库迁移与回滚" },
    ],
  },
];

export const enHeimdallReleaseDocs: DocPage[] = [
  {
    slug: "heimdall-release-notes",
    group: "Resources",
    eyebrow: "HEIMDALL 5.3.19 · RELEASE STATUS",
    title: "Versions, release status, and upgrade baseline",
    description: "Treat immutable v5.3.19 as Release and define the Application domain, governed MCP, Backend Directory, and database-upgrade boundaries.",
    sections: [
      {
        id: "purpose",
        title: "Current Release evidence",
        paragraphs: [
          "This site reviewed clean main 0032070 on 2026-07-28. It is exactly immutable tag v5.3.19, while be/Directory.Build.props and OidcPlugin.Version both report 5.3.19. There is therefore no current post-tag HEAD-only delta, and the old 5.1.2 version-drift warning no longer applies.",
          "Version 5.3.19 crosses several public contracts from 5.1.2 and is not a patch-only image swap. Application-domain RBAC, the complete MCP management plane, Backend Directory writes, two-image deployment, and frontend dependency security each require acceptance.",
        ],
      },
      {
        id: "matrix",
        title: "Current version matrix",
        code: { language: "text", value: releaseMatrix },
        note: "The two Asgard.Heimdall.JwtSigning projects removed their project-level 0.2.0 override and now produce 5.3.19 from Directory.Build.props. Re-verify package APIs and NuGet availability before upgrading.",
      },
      {
        id: "application-domain",
        title: "Application-domain RBAC and token boundary",
        bullets: [
          "Adds Application, monotonically versioned immutable Manifests, Application Permission/Role templates, TenantApplication, tenant role instances, and SystemUser Application Grants",
          "An application manager needs the application-scoped native permission, a valid Application Grant, and Tenant scope together; a platform-super-admin bypass stays explicit and auditable",
          "Disabling TenantApplication preserves data but blocks issuing and business access; re-enable the relationship rather than delete/redeploy duplicate authorization state",
          "Each Access Token belongs to one application_id and carries Manifest/Application/Tenant authorization versions; business-application tokens must not aggregate platform.* permissions",
          "Application-level OIDC Clients carry ApplicationId and a null TenantId; 5.3.9–5.3.12 fixed startup RBAC sync, nullable-Tenant querying, and system-user sign-in compatibility",
        ],
      },
      {
        id: "mcp",
        title: "Governed MCP in 5.3.x",
        bullets: [
          "Version 5.3.0 promotes /mcp to a stateful Streamable HTTP management plane with platform/tenant Tools, Resources, Prompts, and bounded Tasks",
          "OAuth clients discover /.well-known/oauth-protected-resource/mcp; Bearer tokens must be issued for the built-in Heimdall management Application",
          "AK/SK policy constrains tools, permissions, CIDRs, expiry, environment, per-minute rate, and concurrency; an empty list means no additional narrowing",
          "Every non-read-only tool uses two-phase confirmation with a single-use token bound to caller, tool name, and full payload",
          "A restricted credential may delegate only a subset of its own tool and permission boundary; successful and failed tool calls both enter security-event audit",
          "Versions 5.3.8–5.3.10 complete platform Application/OIDC Client tools and nullable-Tenant compatibility; old explicit allowedTools lists do not gain new tools automatically",
        ],
      },
      {
        id: "directory-and-web",
        title: "Backend Directory and management Web",
        bullets: [
          "Version 5.3.14 adds tenant group paging; 5.3.16 adds heimdall.directory.write and tenant-bound BackendService routes to create groups, replace members, and delete empty groups",
          "Writes still derive Tenant exclusively from the validated token. Version 5.3.17 fixes the member field as tenant_user_ids and rejects blanks; 5.3.18 fixes non-empty membership persistence",
          "Since 5.3.7, backend and heimdall-web are two separately deployed images from one tag: the management origin targets Web, while OIDC/API/MCP/SCIM target backend",
          "Version 5.3.19 upgrades Umi, Axios, and vulnerable transitives and reports zero critical/high audit findings; this does not waive remaining medium/low findings or runtime hardening",
        ],
      },
      {
        id: "migration-boundary",
        title: "Database migration and compatibility boundary",
        bullets: [
          "The 5.3.19 repository contains 12 PostgreSQL increment files, adding four Application-domain precheck/migrate/postcheck/cleanup stages plus the MCP credential-policy expansion",
          "Application migration handles duplicate business keys, orphan relations, Client ApplicationId backfill, and soft-deleted history before constraints; cleanup waits until the rollback window closes",
          "The repository still has no complete empty-database baseline, built-in migration ledger/checksum, or down scripts; file presence does not prove directory-order execution against any historical database",
          "auto_sync_schema defaults false. Production needs one migration runner, database backup/PITR, and rehearsal from the real source version—not multiple replicas changing schema",
        ],
      },
      {
        id: "remaining-boundaries",
        title: "Security boundaries that still apply",
        bullets: [
          "A fixed HTTPS oidc.issuer neither restores Request.Scheme nor automatically makes the Asgard.Identity cookie Secure; trusted-proxy setup and real-browser inspection remain deployment duties",
          "Discovery/JWKS offline validation does not query revocation per request; external APIs need short TTL plus Webhook/revocation watermarks or another proven online design",
          "Introspection remains restricted by confidential-client and token client/tenant ownership and is not a general RFC 7662 resource-server service",
          "Tasks currently use an in-memory Store suitable for one application container; horizontal scaling first needs a shared durable Store and multi-node acceptance",
        ],
      },
      {
        id: "upgrade",
        title: "5.1.2 → 5.3.19 release acceptance",
        paragraphs: [
          "Treat database, backend, Web, Application authorization, MCP credential policy, and generated clients as one release unit. Rehearse migration and restore on a production backup clone, deploy both images from one tag, regenerate/compile clients, and execute negative tests for narrowed permissions and newly added tools.",
        ],
        code: { language: "text", value: releaseAcceptance },
      },
    ],
    relatedDocs: [
      { product: "heimdall", docSlug: "heimdall-quick-start", label: "Complete the local source login loop" },
      { product: "heimdall", docSlug: "heimdall-application-rbac", label: "Application manifests, tenant bindings, and application-scoped RBAC" },
      { product: "heimdall", docSlug: "heimdall-management-api", label: "Management API and Application boundary" },
      { product: "heimdall", docSlug: "heimdall-mcp", label: "MCP integration and governance" },
      { product: "heimdall", docSlug: "heimdall-service-integration", label: "BackendService integration" },
      { product: "heimdall", docSlug: "heimdall-database-migrations", label: "Database migration and rollback" },
    ],
  },
];
