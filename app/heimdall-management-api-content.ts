import type { DocPage } from "./content";

const zhPermissionMatrix = `域 / 路由前缀                               5.3.19 权限与资源边界
应用 /api/Application                       platform.admin | platform.application.manage
Manifest /api/Application/{id}/Manifest     发布仅 platform.admin；读取按 Application 资源守卫
应用 Grant /api/Application/{id}/SysUserGrant 仅 platform.admin
TenantApplication /api/Application/{id}/Tenant application-scoped 权限 + Application Grant + Tenant scope
应用 RBAC /api/Application/{id}/Tenant/{tenantId} tenant.application.* + Application/Tenant 归属守卫
平台概览 /api/PlatformOverview              platform.admin | platform.overview.read
租户 /api/Tenant                            读: platform.admin | platform.tenant.read；写: platform.admin | platform.tenant.manage
租户开通 /api/Tenant/onboarding             platform.admin | platform.tenant.manage
平台用户 /api/SysUser                       按 Action 使用 platform.sys_user.manage / platform.sys_rbac.manage
平台 RBAC /api/PlatformRole|Permission       platform.admin | platform.sys_rbac.manage
客户端 /api/TenantOidcClient                全局、Application-scoped 或 tenant.client.manage + 资源守卫
Scope /api/TenantOidcScope                   platform.admin | platform.oidc_scope.manage | tenant.scope.manage
签名密钥与日志 /api/TenantOidcKey*           platform.admin | platform.oidc_key.manage | tenant.key.manage
租户用户 /api/TenantUser                     platform.admin | platform.tenant_user.manage | tenant.user.manage
目录 /api/TenantDirectory                    platform.admin | platform.tenant_directory.manage | tenant.directory.manage
Profile /api/Tenant/{tenantId}/profile       平台租户权限 | tenant.branding.manage
Metadata /api/TenantMetadata                 平台租户权限 | tenant.metadata.manage
授权 /api/AuthorizationAdmin                 平台 read/revoke | tenant.authorization.manage
黑名单 /api/TokenBlacklist                   平台 read/revoke | tenant.authorization.manage（全局汇总仍仅平台）
身份 Webhook /api/IdentityWebhook            platform.admin | platform.security.manage | tenant.security.manage
系统日志 /api/SystemLog                      platform.admin | platform.system_log.read
Trace /api/TraceLog                           platform.admin | platform.trace_log.read`;

const enPermissionMatrix = `Domain / route prefix                         5.3.19 permission and resource boundary
Applications /api/Application                platform.admin | platform.application.manage
Manifest /api/Application/{id}/Manifest      publish: platform.admin only; reads use Application resource guards
Application Grant /api/Application/{id}/SysUserGrant platform.admin only
TenantApplication /api/Application/{id}/Tenant application-scoped permission + Application Grant + Tenant scope
Application RBAC /api/Application/{id}/Tenant/{tenantId} tenant.application.* + Application/Tenant ownership
Platform overview /api/PlatformOverview      platform.admin | platform.overview.read
Tenants /api/Tenant                           read: platform.admin | platform.tenant.read; write: platform.admin | platform.tenant.manage
Onboarding /api/Tenant/onboarding             platform.admin | platform.tenant.manage
System users /api/SysUser                     Action-specific platform.sys_user.manage / platform.sys_rbac.manage
Platform RBAC /api/PlatformRole|Permission    platform.admin | platform.sys_rbac.manage
Clients /api/TenantOidcClient                 global, Application-scoped, or tenant.client.manage plus resource guard
Scopes /api/TenantOidcScope                   platform.admin | platform.oidc_scope.manage | tenant.scope.manage
Signing keys and logs /api/TenantOidcKey*     platform.admin | platform.oidc_key.manage | tenant.key.manage
Tenant users /api/TenantUser                  platform.admin | platform.tenant_user.manage | tenant.user.manage
Directory /api/TenantDirectory                platform.admin | platform.tenant_directory.manage | tenant.directory.manage
Profile /api/Tenant/{tenantId}/profile        platform tenant permission | tenant.branding.manage
Metadata /api/TenantMetadata                  platform tenant permission | tenant.metadata.manage
Authorizations /api/AuthorizationAdmin        platform read/revoke | tenant.authorization.manage
Blacklist /api/TokenBlacklist                 platform read/revoke | tenant.authorization.manage (global summaries remain platform-only)
Identity Webhook /api/IdentityWebhook         platform.admin | platform.security.manage | tenant.security.manage
System logs /api/SystemLog                    platform.admin | platform.system_log.read
Traces /api/TraceLog                          platform.admin | platform.trace_log.read`;

const routeExamples = `GET    /api/Application?page=1&size=20
POST   /api/Application/{applicationId}/Manifest
POST   /api/Application/{applicationId}/Tenant/enable
POST   /api/Application/{applicationId}/Tenant/{tenantCode}/sync
GET    /api/Application/{applicationId}/Tenant/{tenantId}/Permission
GET    /api/Application/{applicationId}/Tenant/{tenantId}/Role
PUT    /api/Application/{applicationId}/Tenant/{tenantId}/User/{tenantUserId}/Role
GET    /api/Tenant?page=1&size=20
POST   /api/Tenant/onboarding
GET    /api/TenantOidcClient/tenant/{tenantId}?page=1&size=20
POST   /api/TenantOidcClient/{id}/reset-secret
GET    /api/IdentityWebhook/tenant/{tenantId}/subscriptions
GET    /api/backend/directory/users?page=1&size=20
POST   /api/mcp-credentials
GET    /api/TenantOidcScope/tenant/{tenantId}?page=1&size=20
GET    /api/TenantOidcKey/tenant/{tenantId}/current
POST   /api/TenantOidcKey/{id}/activate
GET    /api/TenantUser/tenant/{tenantId}?page=1&size=20
GET    /api/TenantDirectory/tenant/{tenantId}/departments
GET    /api/Tenant/{tenantId}/profile
GET    /api/TenantMetadata/tenant/{tenantId}/json
POST   /api/SystemLog/query
POST   /api/TraceLog/query`;

const acceptanceRequests = `# Use an Access Token issued for the management API audience.
curl -fsS -H "Authorization: Bearer $TOKEN" \
  "https://id.example.com/api/Tenant?page=1&size=20"

# A tenant workspace token must not be accepted for another tenant.
curl -i -H "Authorization: Bearer $TENANT_TOKEN" \
  "https://id.example.com/api/Tenant/another-tenant/profile"

# Capture this response once, store the secret, then redact it from logs.
curl -fsS -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gracePeriodMinutes":5}' \
  "https://id.example.com/api/TenantOidcClient/{id}/reset-secret"`;

export const zhHeimdallManagementApiDocs: DocPage[] = [
  {
    slug: "heimdall-management-api",
    group: "管理 API",
    eyebrow: "HEIMDALL 5.3.19 · COMMIT 0032070",
    title: "Heimdall 管理 API 总索引与权限矩阵",
    description: "按平台、Application 与 Tenant 三层边界查找 Heimdall 5.3.19 管理 Controller、统一响应、权限域和验收点。",
    sections: [
      {
        id: "baseline",
        title: "发布基线与索引范围",
        paragraphs: [
          "本页索引 clean tag v5.3.19 / commit 0032070 的 Controllers、DTOs、VOs 与测试。当前 HEAD 正好等于 tag，没有 HEAD-only 管理 API。管理 API 位于 /api/**；OIDC、SCIM 与 /mcp 协议面分别遵循自己的合同。",
          "从 5.1.2 升级时，最大的破坏性概念变化是原 TenantRole/TenantPermission 管理面被 Application-domain RBAC 取代。客户端、权限、角色、Tenant binding 与用户授权都必须携带 Application 资源上下文，不能继续调用已删除的 TenantRole/TenantPermission Controller。",
        ],
        note: "路由中的 [controller] 会展开为类名去掉 Controller，例如 TenantOidcClientController 对应 /api/TenantOidcClient。",
      },
      {
        id: "application-domain",
        title: "Application、Manifest、Tenant binding 与 Grant",
        paragraphs: [
          "ApplicationInfo 定义应用；Manifest 以单调递增版本发布 ApplicationPermission 与 ApplicationRole 模板。TenantApplication 保存实际成功应用的 Manifest 版本，并实例化内建 Tenant 角色；Tenant 自定义角色不被后续 Manifest 覆盖。",
          "应用管理员必须同时满足 application-scoped 原生权限、有效 SysUserApplicationGrant 与精确 Tenant scope；平台超管旁路必须显式。TenantApplication 只有启用/停用/恢复，不提供解绑或物理删除。",
        ],
        bullets: [
          "Manifest 发布仅允许平台超管；同 code Permission 恢复稳定记录，不能用 Deleted/状态扩展唯一键",
          "一枚业务 Access Token 只属于一个 application_id，并携带 application_manifest_version、application_authorization_version 与 tenant_authorization_version",
          "Application-level OIDC Client 的 TenantId 为 null；Tenant-level Client 必须与同 Application 的 Tenant binding 对齐",
          "应用、Client、Tenant binding、同步版本或 Grant 无法确认时 Fail Closed",
        ],
      },
      {
        id: "sysuser-release-contract",
        title: "5.1.2 SysUser 生命周期合同",
        paragraphs: [
          "5.1.2 的 /api/SysUser 请求、响应与生命周期已经改变。SysUserDto 与 SysUserVo 删除 description；升级会破坏依赖该字段的 OpenAPI/TsGen 客户端，必须重新生成并编译前端。内建超级管理员禁止改登录用户名、停用或删除。",
          "status 现在只接受 Enabled 或 Disabled，且 GET/list 的实际状态由 Username、Email、Phone 三类受管登录凭据计算：至少一个未删除且启用才为 Enabled。POST/PUT 在同一 FreeSql unit of work 中同步 openKey、密码哈希和状态；不提供新密码时复用已有哈希，新用户没有可复用哈希就不会创建缺失凭据，即使请求 Enabled，返回仍可能是 Disabled。",
          "DELETE 在事务内删除用户和全部登录信息，提交后再调用平台主体 RevokeSubjectAsync。后置撤销失败不会回滚已提交删除；平台禁用依靠后续登录、Cookie authorize 与 code/refresh/device exchange 状态检查，且两者都不会创建租户 identity.subject.invalidated Webhook。",
        ],
        bullets: [
          "Phone 清空会软删除 Phone 登录记录；Username、Email、Phone 改名会同步对应 openKey",
          "Password 只进入请求 DTO，不进入响应；新值只哈希一次并同步到三类受管密码凭据",
          "这些是 5.1.2 Release 行为。专项测试覆盖 PUT 同步 Username openKey、密码哈希、启用状态与乐观锁/创建审计保留，并覆盖内建管理员防锁死；创建缺失凭据、Phone 软删除和提交后撤销失败仍应通过数据库副本与真实登录/撤销验收补强",
        ],
      },
      {
        id: "boundaries",
        title: "平台管理与租户工作区不是同一授权面",
        bullets: [
          "平台管理 Token 使用 platform.* 权限；platform.admin 是多数管理 Action 的替代权限，不代表每个已认证用户都是平台管理员。",
          "5.1.2 为主要 Tenant* 资源 Action 接入对应 tenant.* 工作区权限，并统一注入 ITenantResourceAccessGuard。租户身份只能访问与自身 tenant_id 序数相等的资源；无 tenant_id 的平台身份还必须具备该 Action 明确列出的 platform.* 权限。",
          "无租户筛选的全局列表仍只开放平台权限；TenantUser 按租户批量删除也是平台级危险操作。用户角色分配要求 tenant.rbac.manage，不能用普通 tenant.user.manage 提权。",
          "TenantActiveSession 读取使用 authorization.read，撤销使用 authorization.revoke；租户工作区接受 tenant.authorization.manage 或 tenant.security.manage，不再复用普通用户管理权限。Controller 同样通过统一归属守卫拒绝跨租户。",
          "Access Token 必须面向管理 API 的正确 audience；ID Token 不是 API 凭据。前端隐藏按钮也不是授权边界。",
        ],
      },
      {
        id: "response-contract",
        title: "统一 Response 与分页合同",
        paragraphs: [
          "详情、创建、更新、删除和动作接口通常返回 Response<T>；页码列表与 query 接口返回 PageResponse<T>。目录成员、权限树、当前验证密钥和活动会话等有界集合使用 Response<List<T>>，不要强行按分页结构解析。",
          "PageResponse<T> 在统一状态字段之外携带 data、totalCount、page 与 size。客户端应按 OpenAPI 中每个 Action 的实际泛型消费，不能假设所有 404、验证错误或导出接口共享同一个 payload；SecurityEvent export 明确返回文件而不是 Response。",
        ],
        note: "Controller 的 200/404 ProducesResponseType 是生成契约的一部分；服务异常和验证失败仍需在目标部署上观察全局异常处理中间件的真实状态码与错误码。",
      },
      {
        id: "permission-matrix",
        title: "核心权限域矩阵",
        paragraphs: ["下表列的是 Controller 上的 AsgardAuthAnyPermission 任一满足语义。它是域级导航，不替代逐 Action OpenAPI/源码检查；同一 Controller 内的读、写、撤销和角色分配可能不同。"],
        code: { language: "text", value: zhPermissionMatrix },
        bullets: [
          "SystemSettings 的 security/runtime 读取可接受 security.manage 或 system_settings.manage，但写入主要要求 system_settings.manage。",
          "TenantProfile 读取接受 tenant.read，写入只接受 tenant.manage 或 tenant.branding.manage；AuthorizationAdmin 与 TokenBlacklist 都把 read 和 revoke 分开。",
          "TenantUser 的一般管理与角色分配并不完全相同；Platform SysUser 的查询也可能接受 sys_rbac.manage，而创建/更新仍偏向 sys_user.manage。",
        ],
      },
      {
        id: "resource-map",
        title: "资源、路由与能力地图",
        code: { language: "http", value: routeExamples },
        bullets: [
          "tenants：详情、分页、创建、更新、删除、状态、workspace 摘要、内建 RBAC 同步，以及带 Idempotency-Key 的原子开通",
          "clients / scopes：按租户分页、CRUD、状态；客户端另有复制、密钥重置、runtime/risk，Scope 另有 usage",
          "keys：生成、激活、完成 Retiring、当前/验证密钥、摘要、轮换建议、删除 Draft；TenantOidcKeyLog 提供租户、密钥和组合条件分页",
          "users / RBAC：租户用户 CRUD、导入、统计、状态与角色分配；租户和平台分别维护 role、permission、树/候选项与 assignment",
          "directory / profile / metadata：部门、组和成员；登录品牌资料；元数据分页、键值和 JSON 视图",
          "federation / SCIM：外部 OIDC、LDAP、SAML、外部组角色映射和租户 SCIM 配置属于 identity_provider.manage 或 tenant_directory.manage 域",
          "identity integration：IdentityWebhook 管订阅、一次性 HMAC Secret、投递查询与重试；Backend Directory 只从 BackendService Token 取 tenant_id；MCP 凭据由当前 UserLogin 主体自助管理且 SK 只返回一次",
          "logs / security：SystemLog、TraceLog、授权、黑名单、安全概览、Security Events 与活动会话各自使用独立读写权限。",
        ],
      },
      {
        id: "secrets-and-ownership",
        title: "Secret 一次返回与租户归属",
        bullets: [
          "POST /api/TenantOidcClient/{id}/reset-secret 返回 TenantOidcClientSecretResetVo.newClientSecret。普通 TenantOidcClientInfoVo 用 JsonIgnore 隐藏当前和上一版 Secret；调用方必须在成功响应中一次捕获并写入 Secret Manager。",
          "POST /api/TenantScim/tenant/{tenantId}/token/rotate 返回一次性明文 Bearer Token；后续配置读取不应恢复它。签名私钥、用户密码和对象存储 AccessKey Secret 也不会通过普通 VO 回显。",
          "带 tenantId 的 DTO、query 或 route 必须与目标资源归属一致。声明式权限只说明调用者拥有某类能力，不自动证明 path、body、id 查询到的实体属于同一租户。",
          "平台跨租户操作应显式使用平台身份与对应 platform.* 权限；租户工作区操作必须验证当前 tenant_id，尤其要为 Active Sessions 保留负向验收。",
        ],
      },
      {
        id: "openapi-tsgen",
        title: "OpenAPI 与 TsGen 消费方式",
        paragraphs: [
          "本页索引的 5.3.19 业务 Controllers 使用 AsgardTsGen，并通过 ProducesResponseType 描述主要成功/未找到响应。开启宿主 Swagger 后，以部署生成的 OpenAPI 核对最终 route、参数来源、DTO 必填项和响应泛型。",
          "TsGen 只为标记 Controller 生成客户端工件。生成目录必须视为可再生输出，不要手写业务逻辑；后端路由、DTO 或响应壳变化后重新生成，并让前端编译和 API 冒烟共同失败关闭。",
        ],
        note: "生成能力不等于调用权限。Swagger 可见、TypeScript 方法存在，都不能替代 Bearer 校验、permission 和租户归属检查。",
      },
      {
        id: "errors-concurrency-audit",
        title: "错误、并发与审计边界",
        bullets: [
          "404 只在部分详情 Action 明确声明；重复标识、状态迁移、密钥生命周期和业务校验错误可能由服务/全局异常处理产生。调用方按 status/code 分类，不用 message 文本驱动逻辑。",
          "不要假设所有 CRUD 都支持乐观锁。5.3.19 的 Application Manifest、TenantApplication/RBAC、对象存储与 runtime setting 各有自己的 Version/expectedVersion 语义；发生冲突时重新读取权威状态再人工决定是否重试。",
          "租户开通使用 Idempotency-Key；超时后只重放完全相同的请求与 key。普通 POST/动作接口没有因此自动变成幂等。",
          "多数写 Action 通过 AuditOperatorResolver 从身份上下文取 UserId，缺失时回退 system。生产审计必须验证 Token claim、操作人、tenantId、资源 ID 和 Trace，同时脱敏 Secret、Token、密码与私钥。",
          "删除、撤销、密钥激活和批量会话撤销属于高风险动作；前端确认框不是安全控制，应记录前后状态并执行最小权限审批。",
        ],
      },
      {
        id: "acceptance",
        title: "上线验收清单",
        code: { language: "bash", value: acceptanceRequests },
        bullets: [
          "用 platform.admin、每个专项 platform.* 权限、无权限 Token 分别验证 200/403，不要只测超级管理员。",
          "对 Profile 和 Active Sessions 使用本租户与另一个 tenantId 做正反测试；确认资源 ID 查询也不能绕过租户归属。",
          "验证一条 Response<T>、一条 PageResponse<T>、一个 404、一个验证失败、一个并发冲突和一个文件导出。",
          "重置客户端 Secret 与 SCIM Token 后确认明文只出现在当次响应、日志已脱敏、旧凭据按 grace/revoke 规则失效。",
          "从实际 OpenAPI 重新生成 TsGen 客户端并编译；对 tenants、clients、scopes、keys、users、RBAC、directory、profile、metadata、logs 各跑至少一条冒烟。",
          "保留 release commit 0032070、v5.3.19 后端与 Web 镜像摘要、配置、数据库迁移状态和验收结果；升级后重新 diff Controllers/DTOs/权限 Attribute，再同步中英文矩阵。",
        ],
      },
    ],
  },
];

export const enHeimdallManagementApiDocs: DocPage[] = [
  {
    slug: "heimdall-management-api",
    group: "Management API",
    eyebrow: "HEIMDALL 5.3.19 · COMMIT 0032070",
    title: "Heimdall management API index and permission matrix",
    description: "Find Heimdall 5.3.19 management controllers, envelopes, permission domains, and acceptance checks across platform, Application, and Tenant boundaries.",
    sections: [
      {
        id: "baseline",
        title: "Release baseline and index scope",
        paragraphs: [
          "This page indexes Controllers, DTOs, VOs, and tests at clean tag v5.3.19 / commit 0032070. Current HEAD equals that tag, so there is no HEAD-only management API. Management APIs live under /api/**, while OIDC, SCIM, and /mcp follow their separate protocol contracts.",
          "The largest conceptual break from 5.1.2 is replacement of the old TenantRole/TenantPermission management plane by Application-domain RBAC. Clients, permissions, roles, Tenant bindings, and user assignments now need Application resource context; consumers must stop calling the removed TenantRole/TenantPermission Controllers.",
        ],
        note: "The [controller] route token expands to the class name without Controller; TenantOidcClientController therefore maps to /api/TenantOidcClient.",
      },
      {
        id: "application-domain",
        title: "Application, Manifest, Tenant binding, and Grants",
        paragraphs: [
          "ApplicationInfo defines an application. A monotonically increasing Manifest publishes ApplicationPermission and ApplicationRole templates. TenantApplication records the version actually applied and instantiates built-in tenant roles, while later Manifest synchronization preserves custom tenant roles.",
          "An application manager needs the application-scoped native permission, a valid SysUserApplicationGrant, and exact Tenant scope together. The platform-super-admin bypass is explicit. TenantApplication supports enable, disable, and re-enable without unlinking or physical deletion.",
        ],
        bullets: [
          "Only platform administrators publish Manifests; restoring a Permission code reuses stable identity rather than extending a unique key with Deleted/status",
          "Each business Access Token belongs to one application_id and carries application_manifest_version, application_authorization_version, and tenant_authorization_version",
          "An Application-level OIDC Client has null TenantId; a Tenant-level Client aligns with a Tenant binding under the same Application",
          "Fail Closed when Application, Client, Tenant binding, sync version, or Grant cannot be established",
        ],
      },
      {
        id: "sysuser-release-contract",
        title: "5.1.2 SysUser lifecycle contract",
        paragraphs: [
          "Version 5.1.2 changes the /api/SysUser request, response, and lifecycle. SysUserDto and SysUserVo remove description, breaking OpenAPI/TsGen clients that consume the field; regenerate and compile the frontend during upgrade. The built-in administrator cannot have its login name changed, be disabled, or be deleted.",
          "status now accepts only Enabled or Disabled, and GET/list derives actual state from the managed Username, Email, and Phone credentials: at least one undeleted enabled credential means Enabled. POST/PUT synchronize open keys, password hash, and state in one FreeSql unit of work. An omitted new password reuses an existing hash; a new user with no reusable hash creates no missing credentials and may therefore return Disabled even when Enabled was requested.",
          "DELETE removes the user and all login information in a transaction, then calls platform-subject RevokeSubjectAsync after commit. A later revocation failure cannot roll back the committed deletion. Platform disable relies on later login, Cookie authorize, and code/refresh/device exchange state checks, and neither path creates a tenant identity.subject.invalidated Webhook.",
        ],
        bullets: [
          "Clearing Phone soft-deletes the Phone login record; renaming Username, Email, or Phone updates the corresponding openKey",
          "Password exists only on the request DTO; a new value is hashed once and synchronized to all three managed password credentials",
          "These are released 5.1.2 behaviors. Focused tests cover PUT synchronization of Username open key, password hash, enabled state, optimistic-lock/create-audit preservation, and built-in-administrator lockout protection. Missing-credential creation, Phone soft deletion, and post-commit revocation failure still deserve database-copy and real login/revocation acceptance",
        ],
      },
      {
        id: "boundaries",
        title: "Platform management and tenant workspaces are different authorization surfaces",
        bullets: [
          "Platform management tokens use platform.* permissions. platform.admin is an alternative on most management Actions; authentication alone does not make a caller a platform administrator.",
          "Version 5.1.2 wires the matching tenant.* workspace permission into major Tenant* resource Actions and injects ITenantResourceAccessGuard consistently. A tenant identity can access only a resource whose tenant_id matches ordinally; a platform identity without tenant_id must still carry the explicit platform.* permission listed by the Action.",
          "Unfiltered global lists remain platform-only, as does TenantUser bulk delete by tenant. Tenant-user role assignment requires tenant.rbac.manage and cannot be performed with ordinary tenant.user.manage.",
          "TenantActiveSession reads use authorization.read and revokes use authorization.revoke. Tenant-workspace callers use tenant.authorization.manage or tenant.security.manage rather than ordinary user management, and the shared ownership guard rejects cross-tenant access.",
          "The Access Token must target the management API audience. An ID Token is not an API credential, and hiding a frontend control is not authorization.",
        ],
      },
      {
        id: "response-contract",
        title: "Unified Response and pagination contracts",
        paragraphs: [
          "Detail, create, update, delete, and action endpoints normally return Response<T>; page and query endpoints return PageResponse<T>. Bounded collections such as directory members, permission trees, current validation keys, and active sessions use Response<List<T>>, so clients must not force them into a page shape.",
          "PageResponse<T> carries data, totalCount, page, and size alongside the unified status fields. Consume the actual generic declared by each Action in OpenAPI; not every 404, validation error, or export shares one payload. SecurityEvent export explicitly returns a file rather than Response.",
        ],
        note: "Controller 200/404 ProducesResponseType attributes are part of the generated contract. Observe the deployed global exception middleware for the actual status and error code of service and validation failures.",
      },
      {
        id: "permission-matrix",
        title: "Core permission-domain matrix",
        paragraphs: ["The table records AsgardAuthAnyPermission any-one semantics at controller level. It is a domain index, not a substitute for Action-level OpenAPI/source review: reads, writes, revocations, and role assignment can differ inside one controller."],
        code: { language: "text", value: enPermissionMatrix },
        bullets: [
          "SystemSettings security/runtime reads may accept security.manage or system_settings.manage, while writes primarily require system_settings.manage.",
          "TenantProfile reads accept tenant.read, but writes accept tenant.manage or tenant.branding.manage. AuthorizationAdmin and TokenBlacklist both separate read from revoke.",
          "General TenantUser management and role assignment are not identical. Platform SysUser queries may also accept sys_rbac.manage while create/update remain centered on sys_user.manage.",
        ],
      },
      {
        id: "resource-map",
        title: "Resource, route, and capability map",
        code: { language: "http", value: routeExamples },
        bullets: [
          "tenants: detail, pages, create, update, delete, status, workspace summary, built-in RBAC sync, and atomic onboarding with Idempotency-Key",
          "clients / scopes: tenant pages, CRUD, and status; clients add copy, secret reset, runtime/risk, while scopes add usage",
          "keys: generate, activate, complete Retiring, current/validation keys, summary, rotation suggestion, and Draft deletion; TenantOidcKeyLog pages by tenant, key, or combined filter",
          "users / RBAC: tenant-user CRUD, import, statistics, status, and role assignment; tenant and platform maintain separate roles, permissions, trees/candidates, and assignments",
          "directory / profile / metadata: departments, groups, and members; login branding; metadata pages plus key/value and JSON views",
          "federation / SCIM: external OIDC, LDAP, SAML, external-group role mappings, and tenant SCIM configuration belong to identity_provider.manage or tenant_directory.manage domains",
          "identity integration: IdentityWebhook manages subscriptions, one-time HMAC secrets, delivery queries, and retry; Backend Directory derives tenant_id only from its BackendService token; MCP credentials are self-managed by the current UserLogin subject and return SK only once",
          "logs / security: SystemLog, TraceLog, authorizations, blacklist, security overview, Security Events, and active sessions have separate read/write permissions.",
        ],
      },
      {
        id: "secrets-and-ownership",
        title: "One-time secrets and tenant ownership",
        bullets: [
          "POST /api/TenantOidcClient/{id}/reset-secret returns TenantOidcClientSecretResetVo.newClientSecret. Regular TenantOidcClientInfoVo hides current and previous secrets with JsonIgnore; capture the successful response once and write it directly to a secret manager.",
          "POST /api/TenantScim/tenant/{tenantId}/token/rotate returns a one-time plaintext Bearer token. Later configuration reads must not recover it. Signing private keys, user passwords, and object-storage AccessKey secrets are likewise absent from ordinary VOs.",
          "A tenantId in a DTO, query, or route must match the target resource ownership. Declarative permission proves eligibility for a capability, not that a path, body, or ID lookup belongs to the same tenant.",
          "Platform cross-tenant operations need an explicit platform identity and matching platform.* permission. Tenant-workspace operations must verify the current tenant_id, with a dedicated negative acceptance test for Active Sessions.",
        ],
      },
      {
        id: "openapi-tsgen",
        title: "Consuming OpenAPI and TsGen",
        paragraphs: [
          "The 5.3.19 business Controllers indexed here use AsgardTsGen and describe principal success/not-found responses with ProducesResponseType. With host Swagger enabled, use the deployed OpenAPI document to confirm final routes, parameter sources, required DTO fields, and response generics.",
          "TsGen generates client artifacts only for marked controllers. Treat generated directories as reproducible output with no handwritten business logic. Regenerate after backend route, DTO, or envelope changes, then fail closed through frontend compilation and API smoke tests.",
        ],
        note: "Generation is not authorization. Swagger visibility and a generated TypeScript method never replace Bearer validation, permission checks, or tenant ownership.",
      },
      {
        id: "errors-concurrency-audit",
        title: "Error, concurrency, and audit boundaries",
        bullets: [
          "Only some detail Actions explicitly declare 404. Duplicate identifiers, state transitions, key lifecycle, and business validation can fail through services/global exception handling. Branch on status/code, not localized message text.",
          "Do not assume every CRUD surface uses identical optimistic concurrency. Application Manifest, TenantApplication/RBAC, object storage, and runtime settings have their own Version/expectedVersion semantics in 5.3.19. On conflict, re-read authoritative state and require an explicit retry decision.",
          "Tenant onboarding uses Idempotency-Key; after a timeout, replay only the identical request with the original key. This does not make ordinary POST/action endpoints idempotent.",
          "Most write Actions resolve UserId through AuditOperatorResolver and fall back to system when identity is incomplete. Production audit must verify token claims, operator, tenantId, resource ID, and trace while redacting secrets, tokens, passwords, and private keys.",
          "Delete, revoke, key activation, and bulk session revocation are high-risk operations. A frontend confirmation dialog is not a security control; record before/after state and apply least-privilege approval.",
        ],
      },
      {
        id: "acceptance",
        title: "Go-live acceptance checklist",
        code: { language: "bash", value: acceptanceRequests },
        bullets: [
          "Test platform.admin, every scoped platform.* permission, and an unauthorized token for 200/403 behavior; do not test only the super administrator.",
          "For Profile and Active Sessions, use the caller tenant and another tenantId for positive and negative tests. Confirm resource-ID lookup cannot bypass ownership.",
          "Exercise one Response<T>, one PageResponse<T>, a 404, a validation failure, a concurrency conflict, and a file export.",
          "After rotating a client secret and SCIM token, confirm plaintext appears only in that response, logs are redacted, and old credentials expire according to grace/revoke behavior.",
          "Regenerate the TsGen client from actual OpenAPI and compile it. Smoke at least one route in tenants, clients, scopes, keys, users, RBAC, directory, profile, metadata, and logs.",
          "Record release commit 0032070 plus v5.3.19 backend and Web image digests, configuration, database migration state, and results. On upgrade, diff Controllers, DTOs, and permission attributes before synchronizing both locale matrices.",
        ],
      },
    ],
  },
];
