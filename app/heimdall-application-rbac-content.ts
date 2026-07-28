import type { DocPage } from "./content";

const domainModel = `Application definition
ApplicationInfo
  ├─ ApplicationManifest (immutable version + payload hash)
  ├─ ApplicationPermission (stable application_id + code)
  └─ ApplicationRole template
       └─ ApplicationRolePermission

Tenant instance
TenantApplication (tenant_id + application_id)
  ├─ TenantApplicationRole (built-in or custom)
  ├─ TenantApplicationRolePermission -> ApplicationPermission
  └─ TenantUserApplicationRole

Management authorization
SysUserApplicationGrant
  └─ SysUserApplicationTenantGrant (ExplicitTenantList only)`;

const authorizationFormula = `Application manager → one Tenant resource

authenticated platform SystemUser
AND route-specific native permission
AND active SysUserApplicationGrant(application_id, application-level role)
AND (
  tenant_scope_type = AllApplicationTenants
  OR active SysUserApplicationTenantGrant(grant_id, application_id, tenant_id)
)
AND TenantApplication(application_id, tenant_id) exists

Platform super administrator:
  explicit platform.admin path, still operating on the requested resource

Tenant workspace administrator:
  token.tenant_id = route.tenant_id
  AND tenant.rbac.manage or tenant.workspace.admin
  AND TenantApplication(application_id, tenant_id) = Enabled`;

const manifestExample = `POST /api/Application/{applicationId}/Manifest
Authorization: Bearer <platform-admin-access-token>
Content-Type: application/json

{
  "version": 1,
  "permissions": [
    {
      "code": "orders.tenant.manage",
      "name": "Manage order tenants",
      "scopeLevel": 1,
      "lifecycle": 1,
      "sort": 10
    },
    {
      "code": "orders.order.read",
      "name": "Read orders",
      "scopeLevel": 2,
      "lifecycle": 1,
      "sort": 20
    }
  ],
  "roles": [
    {
      "code": "orders.application-admin",
      "name": "Orders application administrator",
      "scopeLevel": 1,
      "isDefault": false,
      "status": 1,
      "permissionCodes": ["orders.tenant.manage"]
    },
    {
      "code": "orders.viewer",
      "name": "Orders viewer",
      "scopeLevel": 2,
      "isDefault": true,
      "status": 1,
      "permissionCodes": ["orders.order.read"]
    }
  ]
}`;

const managementRoutes = `GET    /api/Application
GET    /api/Application/{applicationId}/Manifest
GET    /api/Application/{applicationId}/Manifest/current
POST   /api/Application/{applicationId}/Manifest

GET    /api/Application/{applicationId}/SysUserGrant
POST   /api/Application/{applicationId}/SysUserGrant
DELETE /api/Application/{applicationId}/SysUserGrant/{grantId}

GET    /api/Application/{applicationId}/Tenant
POST   /api/Application/{applicationId}/Tenant/enable
POST   /api/Application/{applicationId}/Tenant/{tenantCode}/disable
POST   /api/Application/{applicationId}/Tenant/{tenantCode}/sync

GET    /api/Application/{applicationId}/Tenant/{tenantId}/Permission
GET    /api/Application/{applicationId}/Tenant/{tenantId}/Role
PUT    /api/Application/{applicationId}/Tenant/{tenantId}/Role/{roleId}/permissions
GET    /api/Application/{applicationId}/Tenant/{tenantId}/User/{tenantUserId}/Role
PUT    /api/Application/{applicationId}/Tenant/{tenantId}/User/{tenantUserId}/Role`;

const tokenClaims = `{
  "sub": "tenant-user-001",
  "user_id": "tenant-user-001",
  "tenant_id": "tenant-001",
  "client_id": "orders-spa",
  "application_id": "orders-application-id",
  "application_manifest_version": "7",
  "application_authorization_version": "12",
  "tenant_authorization_version": "34",
  "token_type": "UserLogin",
  "roles": ["orders.viewer"],
  "permissions": ["orders.order.read"],
  "scope": ["openid", "profile", "orders-api"]
}`;

const migrationSequence = `00_precheck
  populate application_migration_catalog
  populate application_client_migration_map
  reject unmapped Clients, duplicate keys, inconsistent definitions, or orphans
        ↓
01_migrate
  create Application-domain tables
  backfill every OIDC Client, including soft-deleted history
  migrate legacy Heimdall Tenant RBAC and preserve IDs/lifecycle data
        ↓
02_postcheck
  prove built-in Application, ownership, counts, and cross-boundary integrity
        ↓
03_cleanup
  irreversibly drop the four legacy Tenant RBAC tables`;

const zhPage: DocPage = {
  slug: "heimdall-application-rbac",
  group: "应用治理",
  eyebrow: "HEIMDALL 5.3.19 · APPLICATION RBAC",
  title: "Application 域 RBAC：Manifest、Tenant 与 Token",
  description:
    "用三层数据模型、资源级授权公式和版本化 Token，把一个 Heimdall 实例安全地服务于多个业务应用与租户。",
  sections: [
    {
      id: "baseline",
      title: "v5.3.19 已发布基线",
      paragraphs: [
        "本页以 clean tag v5.3.19 / commit 0032070 为权威。Application 目录、不可变 Manifest 版本、TenantApplication、应用管理员 Grant、Tenant 应用角色、OIDC Client 应用归属和应用版本 Claims 均已进入该发布版，不是路线图预览。",
        "Heimdall 自身也是 Application，固定 ID 为 00000000-0000-0000-0000-000000000001、code 为 heimdall，并受到不可停用、不可删除保护。业务应用使用自己的稳定 code、权限命名空间、Manifest 和 Tenant 绑定。",
      ],
      note: "这里的 Application 是授权与 Client 的产品边界，不等同于 OAuth/OIDC 协议库内部的任意 application 对象。所有管理 API 使用 Access Token；ID Token 不是 API 凭据。",
    },
    {
      id: "mental-model",
      title: "先分清三个数据层",
      paragraphs: [
        "应用定义层只定义一次权威 Permission 和 Role Template；Tenant 实例层把 Tenant-scope 内置模板同步为角色实例，同时允许 Tenant 自定义角色引用同一组权威 Permission；管理授权层决定哪个平台 SystemUser 可以管理哪个 Application 和哪些 Tenant。",
        "三层都使用稳定 ID 和 application_id 连接。不能复制 permission code 后自行推断归属，不能让 Tenant 自定义角色改写 Manifest，也不能把 SysUser Grant 当成 Tenant 用户的业务角色。",
      ],
      code: { language: "text", value: domainModel },
    },
    {
      id: "authorization-formula",
      title: "授权是交集，不是一个角色名",
      paragraphs: [
        "标准应用管理员角色只应获得 platform.application.tenant.manage、platform.application.tenant_rbac.manage、platform.application.oidc_client.manage。每个入口还必须通过有效 Application Grant 和 Tenant scope；只有 platform.admin 使用显式超级管理员路径。",
        "源码也允许具备对应全局能力的管理身份进入其全局管理路径，例如 platform.tenant_rbac.manage 或 platform.oidc_client.manage。不要因此把这些公司级权限塞进应用管理员角色；那会扩大边界。",
      ],
      code: { language: "text", value: authorizationFormula },
      bullets: [
        "ApplicationGrant 的 Role 必须属于相同 Application、ScopeLevel=Application、启用且未删除。",
        "ExplicitTenantList 只与同一 Grant、同一 Application、已绑定 Tenant 做交集；跨 Application 或未绑定记录不能扩权。",
        "AllApplicationTenants 自动覆盖该 Application 未来新增的绑定，但绝不跨 Application。",
        "普通应用管理员不能通过目录或 Tenant 列表枚举未授权资源；未知身份、Application、Grant 或绑定一律 Fail Closed。",
      ],
    },
    {
      id: "manifest",
      title: "发布完整、单调递增的 Manifest",
      paragraphs: [
        "只有 platform.admin 可以发布 Manifest；platform.application.manage 可以维护普通应用目录，但不能发布安全边界或授予应用管理员。version 必须恰好等于 current_manifest_version + 1，服务在同一事务写入 payload JSON、SHA-256 摘要、Permission、Role Template 和关系，并把所有 Tenant 绑定的 desired version 标成新版本、sync status 标成 Pending。",
        "业务应用 Permission/Role code 必须使用 {application.code}. 前缀。Permission 和 Role 不能从后续完整 Manifest 中静默消失；Permission 生命周期只能 Enabled → Deprecated → Disabled，作用层级发布后不可改变。父权限必须同层且无环，Role 只能引用同层 Permission。",
      ],
      code: { language: "http", value: manifestExample },
      bullets: [
        "scopeLevel 1 是 Application，2 是 Tenant；lifecycle 1 是 Enabled；status 1 是 Enabled。",
        "唯一键是 (application_id, code)，不包含 Deleted 或状态。恢复沿用原 ID，不能用生命周期字段制造重复 code。",
        "Deprecated Permission 保留已有关系但不能新增引用；Disabled Permission 不再进入出票权限。",
        "Manifest 发布不会自动把所有 Tenant 同步完成；5.3.19 发布的是显式 sync API/MCP 动作，没有已证明的后台自动 fan-out worker。",
      ],
    },
    {
      id: "tenant-binding",
      title: "开通、同步与重新启用 Tenant",
      paragraphs: [
        "POST .../Tenant/enable 只接受准确 Tenant Code，并要求目标 Tenant 与 Application 都启用。新关系先写 Pending，再同步当前 Manifest；成功后才变为 Enabled。当前 Application 域 API 没有模糊 Tenant 搜索、邀请流或“创建新 Tenant 并开通”的组合入口；创建 Tenant 仍是独立平台能力并要求 platform.tenant.manage。",
        "Manifest 同步只覆盖内置 Tenant Role 及其 Permission 关系；Tenant 自定义角色保留。首次开通同步失败时关系保持 Pending/Failed 且 applied version 为 0；已启用 Tenant 升级失败时保留旧 applied version 和 Enabled 状态，避免把未成功版本冒充已应用版本。",
      ],
      code: { language: "http", value: managementRoutes },
      bullets: [
        "Disabled 保留绑定、配置、RBAC、Client 与审计数据；再次调用 enable 会复用原关系，重新经历 Pending → sync → Enabled。",
        "没有 unlink 或 TenantApplication 删除路由；历史软删除关系被视为需要修复的非法数据，不能创建第二行。",
        "并发 sync 通过实体 Version 抢占 Applying；禁用可以打断 Applying，旧同步不能把 Disabled 覆盖回 Enabled。",
        "发布新 Manifest 后，旧 Enabled Tenant 在成功同步前继续用旧 applied version；运维必须监控 Pending/Failed、sync_error 与 last_synced_at。",
      ],
    },
    {
      id: "grants",
      title: "Application Grant 与 Tenant scope",
      paragraphs: [
        "SysUserApplicationGrant 把平台 SystemUser 绑定到目标 Application 的 Application-level Role。TenantScopeType 的实际枚举名是 AllApplicationTenants 或 ExplicitTenantList；后者通过 SysUserApplicationTenantGrant 保存准确 Tenant Code。",
        "只有 platform.admin 可以查询、保存或撤销 Grant。保存、恢复、范围变更和撤销都会推进 application authorization version。应用管理员首次凭准确 Tenant Code 开通新绑定时，只把该 Tenant 加到实际授权此次动作的 ExplicitTenantList Grant，不能顺便扩展同一用户的其他 Grant。",
      ],
      bullets: [
        "AllApplicationTenants 不写一长串 Tenant ID，也不要把 all_tenants 或完整 Tenant 列表放进 JWT。",
        "撤销使用软删除；同 SysUser + Application + Role 再授权时恢复稳定业务行。",
        "Application Role 本身携带应用业务权限；platform.application.* 是进入 Heimdall 管理面的原生能力，两者缺一不可。",
        "Grant 查询失败、Role 停用、Application 停用或租户范围不匹配时拒绝，不回退到前端菜单或旧 Cookie 权限。",
      ],
    },
    {
      id: "tenant-rbac",
      title: "Tenant RBAC：内置模板与自治角色",
      paragraphs: [
        "Tenant Permission API 是 Manifest 权威 Permission 的只读投影，Tenant 不能自行创建、修改或删除 Permission。Tenant 可以创建自定义 TenantApplicationRole、配置它引用的同 Application/Tenant-scope Permission，并把角色分配给本 Tenant 用户。",
        "同步只改写 IsSystem=true 且 SourceRoleId 对应模板的内置实例；自定义角色不会被覆盖。若自定义角色抢占未来内置模板 code，同步会失败而不是静默改写。所有角色、关系和用户授权写入都会推进 tenant authorization version。",
      ],
      bullets: [
        "角色、Permission 关系和用户分配同时校验 application_id 与 tenant_id，资源 ID 不能绕过边界。",
        "自定义角色删除为软删除，code 永久保留；恢复复用原记录。内置角色不能走自定义角色修改/删除路径。",
        "Tenant 用户管理 RBAC 时，token tenant_id 必须与路由 tenantId 精确相等，并具有 tenant.rbac.manage 或 tenant.workspace.admin。",
        "外部身份源受管角色也按相同 Application/Tenant 边界进入最终角色集合，不能回读迁移前的全局 Tenant RBAC。",
      ],
    },
    {
      id: "oidc-token",
      title: "OIDC Client 决定一枚 Token 的 Application",
      paragraphs: [
        "每个非系统 OIDC Client 必须有 application_id；Tenant Client 还必须属于同一 Application 下已 Enabled 的 TenantApplication。TenantId 为空的是 Application-level Client。授权码、刷新、设备码和 Client Credentials 出票路径都会重新调用 ApplyApplicationContextAsync；Application、Client、绑定或授权解析失败就不签发。",
        "业务 Access Token 只属于一个 application_id。Tenant Token 使用 TenantApplication.applied_manifest_version，而非 Application 最新版本；Application-level Token 使用 current_manifest_version。application_authorization_version 来自 Application，Tenant 上下文再携带 tenant_authorization_version。",
      ],
      code: { language: "json", value: tokenClaims },
      bullets: [
        "系统用户访问业务 Application 必须有有效 Grant；登录 Cookie 中的 platform.* 会被目标 Application 的角色权限快照覆盖，不能泄漏到业务 Token。",
        "Tenant 用户的 roles/permissions 只来自同 Application、同 Tenant 的启用角色；Client Tenant 与身份 tenant_id 不一致时拒绝。",
        "BackendService Token 不把 client_id 当 TenantUserId，因此 roles/permissions 为空；机器权限继续由批准的 scope 表达。",
        "三个版本 Claim 是不透明字符串。资源服务器若采用版本失效策略，只做权威当前值的精确相等比较，不做大小比较。",
        "切换到另一个 Application 应为目标 Client 重新走 Authorization Code/Token 流程；SSO Cookie 可免再次输入凭据，但不能拿 A Token 任意兑换 B Token。",
      ],
      note: "application_id 和版本 Claims 不替代 iss、aud、签名、exp、token_type 与 Scope 校验。Access Token 才能调用 API；ID Token 只证明前端登录事件。",
    },
    {
      id: "lifecycle",
      title: "生命周期与即时失效边界",
      paragraphs: [
        "普通 Application 只有在停用、从未发布 Manifest、从未绑定 Tenant、没有 Client 且没有 Grant 时才允许软删除；相同 code 再创建会恢复原实体。Heimdall 内置 Application 不能停用或删除。停用 Application 会让后续 Client 应用上下文解析失败，但不会物理删除下游数据。",
        "禁用 TenantApplication 会阻断后续 Tenant Client 出票和需要 Enabled 绑定的 Tenant 访问，并保留全部数据用于恢复。然而 5.3.19 的 DisableAsync 本身没有级联撤销已签发 Token；外部 API 只做 JWT/JWKS 离线校验时，旧 Token 仍可能有效到 exp。",
      ],
      bullets: [
        "需要近实时失效时，资源方必须校验权威版本、接入已发布的撤销/失效机制或使用短 Access Token TTL；不要把状态写入数据库等同于全球即时失效。",
        "重新启用关系不会自动复活此前已撤销的协议对象，且必须先完成一次同步。",
        "Application 状态、TenantApplication 状态、Client 状态和 Permission/Role 状态是不同开关，运维排障时逐层检查。",
      ],
    },
    {
      id: "migration",
      title: "四阶段 PostgreSQL 迁移",
      paragraphs: [
        "v5.3.19 发布了 20260720_application_domain_00_precheck → 20260720_application_domain_01_migrate → 20260720_application_domain_02_postcheck → 20260720_application_domain_03_cleanup 四个脚本。先显式填写应用目录和每个 OIDC client_id 的 Application 映射；检查覆盖所有 Client，包括 Deleted 历史行，然后才把 application_id 收紧为 NOT NULL。",
        "迁移把旧 tenant_permission、tenant_role、关系和用户授权保留原 ID 地迁入受保护 Heimdall Application，并为现有业务 Client 建立 TenantApplication。postcheck 检查悬空、跨 Application/Tenant 关系和数量完整性；cleanup 最后删除四张旧 RBAC 表。",
      ],
      code: { language: "text", value: migrationSequence },
      bullets: [
        "ApplicationPermission 的稳定唯一键是 (application_id, code)，TenantApplication 的稳定唯一键是 (tenant_id, application_id)；Deleted、状态和其他生命周期字段都不能进入业务唯一键。",
        "先在生产快照副本运行，保存每阶段输出、行数、映射审阅人、备份与回滚点；任何 pre/postcheck 失败都停止。",
        "01 脚本负责逻辑完整性和唯一索引，发布脚本没有创建物理 FOREIGN KEY 约束；不要把 postcheck 误述为数据库 FK。",
        "这些脚本不是空 PostgreSQL 的完整 bootstrap、不是统一迁移 ledger，也没有 down scripts；03_cleanup 是破坏性边界。",
        "旧表只能在应用代码、Token 出票、管理 API、前后端与真实登录验收全部切换后清理，不能长期双写。",
      ],
    },
    {
      id: "failure-boundaries",
      title: "失败模式与恢复",
      bullets: [
        "Manifest 发布 409/业务冲突：重新读取 current version 和完整 definition，合并后发布恰好下一版；不要跳号或覆盖历史。",
        "Tenant sync Failed：首次开通保持 Pending；升级保留旧 Enabled/applied version。修复 code 冲突或数据完整性后显式重试 sync。",
        "403：核对原生 platform/tenant permission、Application Grant、Tenant scope 与绑定交集；不要通过扩大到 platform.admin 规避。",
        "Token 请求失败：依次核对 Client 状态与 application_id、Application 状态、TenantId、Enabled 绑定、Grant/角色和版本。无法确认时保持拒绝。",
        "版本不匹配：重新执行目标 Application 的 OIDC 流程获取新 Token；不要在资源方猜测版本大小或接受缺失版本。",
        "迁移中断：在 cleanup 前从备份/事务边界恢复并重跑 pre/postcheck；cleanup 后只能依赖经过验证的数据库恢复方案。",
      ],
    },
    {
      id: "acceptance",
      title: "发布验收矩阵",
      bullets: [
        "固定 v5.3.19 / 0032070、数据库备份、四阶段脚本摘要、后端与 Web 镜像 digest、OpenAPI 和验收时间。",
        "分别使用 platform.admin、Application 目录管理员、Application Tenant 管理员、Tenant 管理员和普通用户；覆盖 Application A/B、Tenant A/B、ExplicitTenantList 与 AllApplicationTenants。",
        "验证 Manifest 重复 code、错误命名空间、父权限环、跨层引用、跳版本、隐式删除和非法生命周期全部拒绝；成功发布后 Tenant 只进入 Pending。",
        "验证首次同步成功/失败、升级同步失败保留旧版本、并发 sync、同步中 disable、disable → enable，以及自定义角色不被模板覆盖。",
        "验证未绑定/Pending/Disabled Tenant 不出票，跨 Tenant Client 拒绝，业务 Token 无 platform.*，Tenant 使用 applied version，Application-level Token 无 tenant authorization version。",
        "验证 Grant 撤销、Role 停用、Explicit 越权、All 的未来新绑定，以及开通新 Tenant 只扩展实际 authorizing Grant。",
        "在外部资源 API 验证 iss/aud/exp、单 application_id、裁剪后的 roles/permissions 和版本精确比较；另测 Disabled 后旧离线 JWT 的真实生存期。",
        "在生产副本执行 00→01→02，逐表对账所有活跃/停用/软删除行；只有业务与回滚演练通过后才批准 03_cleanup。",
      ],
    },
    {
      id: "release-boundaries",
      title: "已发布与尚未证明的边界",
      bullets: [
        "已发布：Application/Manifest/TenantApplication/Grant 实体与 API、资源守卫、Tenant RBAC、OIDC Client 应用归属、裁剪 Claims、版本推进、四阶段 PostgreSQL 脚本及聚焦测试。",
        "尚未提供：Application 域的一站式创建新 Tenant/邀请流程、解绑 TenantApplication、后台自动批量同步 Manifest、完整数据库 bootstrap/统一 ledger/down scripts。",
        "尚未由状态切换单独证明：已签发外部 JWT 的即时撤销。资源方若没有版本或在线失效检查，只能依赖 exp。",
        "当前测试覆盖服务、内存数据库、授权边界和 SQL 文本合同；生产发布仍要完成真实 PostgreSQL、反向代理、OIDC 浏览器流与外部资源 API 验收。",
      ],
    },
  ],
  relatedDocs: [
    {
      product: "heimdall",
      docSlug: "heimdall-management-api",
      label: "Heimdall 管理 API 与权限矩阵",
    },
    {
      product: "heimdall",
      docSlug: "heimdall-integration",
      label: "SPA、API 与 OIDC 接入",
    },
    {
      product: "heimdall",
      docSlug: "heimdall-client-credentials",
      label: "Client Credentials 与 BackendService",
    },
    {
      product: "heimdall",
      docSlug: "heimdall-database-migrations",
      label: "数据库迁移与升级边界",
    },
  ],
};

const enPage: DocPage = {
  slug: "heimdall-application-rbac",
  group: "Application governance",
  eyebrow: "HEIMDALL 5.3.19 · APPLICATION RBAC",
  title: "Application-domain RBAC: Manifest, Tenant, and Token",
  description:
    "Use a three-layer data model, resource-level authorization formula, and versioned tokens to serve multiple business applications and tenants safely from one Heimdall instance.",
  sections: [
    {
      id: "baseline",
      title: "Released v5.3.19 baseline",
      paragraphs: [
        "This page is anchored to clean tag v5.3.19 / commit 0032070. The Application catalog, immutable Manifest versions, TenantApplication, application-manager Grants, Tenant application roles, OIDC Client Application ownership, and Application version claims are released capabilities, not roadmap previews.",
        "Heimdall is itself an Application with fixed ID 00000000-0000-0000-0000-000000000001 and code heimdall, protected from disable and delete. Each business application has its own stable code, permission namespace, Manifest, and Tenant bindings.",
      ],
      note: "Application here is the product boundary for authorization and Clients, not an arbitrary internal OAuth/OIDC library object. Every management API uses an Access Token; an ID Token is not an API credential.",
    },
    {
      id: "mental-model",
      title: "Separate the three data layers first",
      paragraphs: [
        "The definition layer declares authoritative Permissions and Role Templates once. The Tenant instance layer synchronizes Tenant-scope built-in templates into role instances while allowing Tenant-owned custom roles to reference the same authoritative Permissions. The management-authorization layer decides which platform SystemUser may manage which Application and Tenants.",
        "All three layers join through stable IDs and application_id. Never infer ownership from a copied permission code, let a Tenant custom role rewrite the Manifest, or treat a SysUser Grant as a Tenant user's business role.",
      ],
      code: { language: "text", value: domainModel },
    },
    {
      id: "authorization-formula",
      title: "Authorization is an intersection, not one role name",
      paragraphs: [
        "The standard application-manager role should contain only platform.application.tenant.manage, platform.application.tenant_rbac.manage, and platform.application.oidc_client.manage. Every endpoint must also pass an active Application Grant and Tenant scope; only platform.admin uses the explicit super-administrator path.",
        "Source also admits identities with the corresponding global capability into global management paths, such as platform.tenant_rbac.manage or platform.oidc_client.manage. Do not therefore add company-wide permissions to an application-manager role; that expands the boundary.",
      ],
      code: { language: "text", value: authorizationFormula },
      bullets: [
        "The Grant Role must belong to the same Application, have ScopeLevel=Application, and be enabled and undeleted.",
        "ExplicitTenantList intersects the same Grant and Application with an existing Tenant binding; cross-Application or unbound rows never expand access.",
        "AllApplicationTenants automatically covers future bindings of this Application, never another Application.",
        "An ordinary application manager cannot enumerate unauthorized Applications or Tenants through catalog APIs. Unknown identity, Application, Grant, or binding fails closed.",
      ],
    },
    {
      id: "manifest",
      title: "Publish a complete, monotonically increasing Manifest",
      paragraphs: [
        "Only platform.admin can publish a Manifest. platform.application.manage may maintain an ordinary Application catalog entry, but cannot publish the security boundary or grant application managers. version must equal current_manifest_version + 1. One transaction writes the payload JSON, SHA-256 hash, Permissions, Role Templates, and relations, then marks every Tenant binding's desired version and sync status Pending.",
        "Business Permission and Role codes must use the {application.code}. prefix. A later complete Manifest cannot silently omit an existing Permission or Role. Permission lifecycle is one-way Enabled → Deprecated → Disabled, and scope level cannot change after publication. Parent Permissions must share scope and be acyclic; a Role may reference only Permissions at the same scope.",
      ],
      code: { language: "http", value: manifestExample },
      bullets: [
        "scopeLevel 1 is Application and 2 is Tenant; lifecycle 1 is Enabled; status 1 is Enabled.",
        "The unique business key is (application_id, code), without Deleted or status. Restore preserves identity instead of manufacturing duplicate codes.",
        "A Deprecated Permission preserves existing relations but rejects new references. A Disabled Permission is excluded from token permissions.",
        "Manifest publication does not prove every Tenant synchronized. v5.3.19 releases explicit sync API/MCP actions, not a proven background auto-fan-out worker.",
      ],
    },
    {
      id: "tenant-binding",
      title: "Enable, synchronize, and re-enable a Tenant",
      paragraphs: [
        "POST .../Tenant/enable accepts an exact Tenant Code and requires both Tenant and Application to be enabled. A new relation is first Pending, synchronizes the current Manifest, and becomes Enabled only on success. The current Application API provides no fuzzy Tenant search, invitation flow, or combined create-new-Tenant operation. Tenant creation remains a separate platform capability requiring platform.tenant.manage.",
        "Manifest synchronization updates only built-in Tenant Roles and their Permission relations; Tenant custom roles survive. A first-enable failure leaves Pending/Failed with applied version 0. An upgrade failure preserves the previous applied version and Enabled state, so an uncommitted target version is never advertised as applied.",
      ],
      code: { language: "http", value: managementRoutes },
      bullets: [
        "Disabled preserves the binding, configuration, RBAC, Clients, and audit data. Calling enable again reuses the same relation and repeats Pending → sync → Enabled.",
        "There is no unlink or TenantApplication delete route. A historical soft-deleted binding is treated as corrupt data to repair, not permission to create a second row.",
        "Concurrent sync uses entity Version while acquiring Applying. Disable interrupts Applying, and a stale sync cannot overwrite Disabled back to Enabled.",
        "After a new Manifest, an old Enabled Tenant continues using its old applied version until sync succeeds. Monitor Pending/Failed, sync_error, and last_synced_at.",
      ],
    },
    {
      id: "grants",
      title: "Application Grant and Tenant scope",
      paragraphs: [
        "SysUserApplicationGrant binds a platform SystemUser to an Application-level Role in one target Application. The released TenantScopeType names are AllApplicationTenants and ExplicitTenantList; the latter stores exact Tenant Codes in SysUserApplicationTenantGrant.",
        "Only platform.admin may list, save, or revoke Grants. Save, restore, scope changes, and revoke advance the Application authorization version. When an application manager enables a new binding by exact Tenant Code, Heimdall adds only that Tenant to the ExplicitTenantList Grant that actually authorized the operation, never every Grant held by the user.",
      ],
      bullets: [
        "AllApplicationTenants does not materialize a long Tenant-ID list. Never put all_tenants or the manager's full Tenant set in a JWT.",
        "Revoke is a soft delete. Re-granting the same SystemUser + Application + Role restores the stable business row.",
        "The Application Role carries application-business permissions. platform.application.* is the native capability for entering Heimdall's management plane; both layers are required.",
        "A failed Grant lookup, disabled Role, disabled Application, or mismatched Tenant scope rejects the request rather than falling back to frontend navigation or stale Cookie permissions.",
      ],
    },
    {
      id: "tenant-rbac",
      title: "Tenant RBAC: built-in templates and autonomous roles",
      paragraphs: [
        "The Tenant Permission API is a read-only projection of authoritative Manifest Permissions. A Tenant cannot create, edit, or delete a Permission. A Tenant may create a custom TenantApplicationRole, point it at Tenant-scope Permissions in the same Application, and assign that role to users of this Tenant.",
        "Synchronization rewrites only IsSystem=true built-in instances whose SourceRoleId maps to a template; it never overwrites custom roles. If a custom role occupies a future built-in code, sync fails instead of silently changing ownership. Every role, relation, and user-assignment mutation advances the Tenant authorization version.",
      ],
      bullets: [
        "Role, Permission relation, and user assignment checks include both application_id and tenant_id; lookup by resource ID cannot bypass the boundary.",
        "Deleting a custom role is soft delete and permanently reserves its code; restore reuses the row. Built-in roles cannot use custom-role mutation/delete paths.",
        "A Tenant user managing RBAC needs token tenant_id equal to route tenantId plus tenant.rbac.manage or tenant.workspace.admin.",
        "Externally managed identity-provider roles enter the final role set under the same Application/Tenant boundary; they cannot read the pre-migration global Tenant RBAC.",
      ],
    },
    {
      id: "oidc-token",
      title: "The OIDC Client selects one Token Application",
      paragraphs: [
        "Every non-system OIDC Client must have application_id. A Tenant Client also requires an Enabled TenantApplication in the same Application; a null TenantId denotes an Application-level Client. Authorization-code, refresh, device-code, and Client Credentials issuance paths re-run ApplyApplicationContextAsync. An unresolved Application, Client, binding, or authorization refuses issuance.",
        "A business Access Token belongs to exactly one application_id. A Tenant token uses TenantApplication.applied_manifest_version rather than the latest Application version; an Application-level token uses current_manifest_version. application_authorization_version comes from Application, and Tenant context adds tenant_authorization_version.",
      ],
      code: { language: "json", value: tokenClaims },
      bullets: [
        "A SystemUser entering a business Application needs an active Grant. platform.* values from the login Cookie are replaced by the target Application snapshot and cannot leak into the business token.",
        "Tenant-user roles and permissions come only from enabled roles in the same Application and Tenant. A mismatch between Client Tenant and identity tenant_id rejects issuance.",
        "A BackendService token never interprets client_id as TenantUserId, so roles/permissions are empty; approved scopes remain the machine-authorization surface.",
        "The three version claims are opaque strings. A resource server adopting version invalidation compares against authoritative current values for exact equality, never ordering.",
        "Switching Application means running the target Client's Authorization Code/Token flow again. A valid SSO Cookie may avoid another credential prompt, but an A token cannot be exchanged arbitrarily for a B token.",
      ],
      note: "application_id and version claims do not replace iss, aud, signature, exp, token_type, or Scope validation. APIs accept Access Tokens; an ID Token only describes the frontend authentication event.",
    },
    {
      id: "lifecycle",
      title: "Lifecycle and immediate-invalidation boundary",
      paragraphs: [
        "An ordinary Application can be soft-deleted only after disable and only if it never published a Manifest, bound a Tenant, owned a Client, or held a Grant. Recreating the same code restores its original entity. The built-in Heimdall Application cannot be disabled or deleted. Disabling an Application causes subsequent Client application-context resolution to fail without physically deleting downstream data.",
        "Disabling TenantApplication blocks subsequent Tenant Client issuance and Tenant paths that require an Enabled binding while preserving all data for recovery. But v5.3.19 DisableAsync does not itself cascade-revoke already issued tokens. An external API performing only offline JWT/JWKS validation may accept an old token until exp.",
      ],
      bullets: [
        "For near-real-time invalidation, the resource must enforce an authoritative version, integrate a released invalidation/revocation path, or use short Access Token TTL. A database status write is not proof of global instant revocation.",
        "Re-enable does not resurrect previously revoked protocol objects and must complete a fresh synchronization first.",
        "Application state, TenantApplication state, Client state, and Permission/Role state are separate switches; inspect each during operations.",
      ],
    },
    {
      id: "migration",
      title: "Four-stage PostgreSQL migration",
      paragraphs: [
        "v5.3.19 ships 20260720_application_domain_00_precheck → 20260720_application_domain_01_migrate → 20260720_application_domain_02_postcheck → 20260720_application_domain_03_cleanup. Populate the Application catalog and an explicit Application mapping for every OIDC client_id first. Checks cover all Clients, including Deleted history, before application_id becomes NOT NULL.",
        "Migration moves legacy tenant_permission, tenant_role, relations, and user grants into the protected Heimdall Application while preserving row IDs, and creates TenantApplication for existing business Clients. postcheck rejects orphans, cross-Application/Tenant relations, and incomplete counts. cleanup finally drops the four legacy RBAC tables.",
      ],
      code: { language: "text", value: migrationSequence },
      bullets: [
        "ApplicationPermission uses stable unique key (application_id, code), while TenantApplication uses (tenant_id, application_id). Deleted, status, and other lifecycle fields never belong in either business key.",
        "Run on a production snapshot first. Record each stage's output, row counts, mapping reviewer, backup, and rollback point; stop on any pre/postcheck failure.",
        "The 01 script provides logical checks and unique indexes but does not create physical FOREIGN KEY constraints. Do not describe postcheck as a database FK.",
        "These scripts are not an empty-PostgreSQL bootstrap, unified migration ledger, or down migration set. 03_cleanup is the destructive boundary.",
        "Drop legacy tables only after application code, token issuance, APIs, frontend, and real login acceptance have all moved. Do not maintain indefinite dual writes.",
      ],
    },
    {
      id: "failure-boundaries",
      title: "Failure modes and recovery",
      bullets: [
        "Manifest conflict: re-read current version and full definition, merge, and publish exactly the next version. Never skip or overwrite history.",
        "Tenant sync Failed: first enable remains Pending; an upgrade retains its old Enabled/applied version. Repair code collision or integrity data, then retry sync explicitly.",
        "403: inspect native platform/tenant permission, Application Grant, Tenant scope, and binding intersection. Do not solve it by broadening everyone to platform.admin.",
        "Token request rejected: inspect Client state/application_id, Application state, TenantId, Enabled binding, Grant/Role, and versions in order. Stay fail closed when uncertain.",
        "Version mismatch: run the target Application OIDC flow for a fresh token. Never order version strings or accept a missing version.",
        "Migration interruption: before cleanup, recover at the backup/transaction boundary and rerun pre/postcheck. After cleanup, recovery depends on a tested database-restore procedure.",
      ],
    },
    {
      id: "acceptance",
      title: "Release acceptance matrix",
      bullets: [
        "Pin v5.3.19 / 0032070, database backup, hashes of all four scripts, backend/Web image digests, OpenAPI, and acceptance timestamp.",
        "Exercise platform.admin, Application catalog manager, Application Tenant manager, Tenant administrator, and ordinary user across Application A/B, Tenant A/B, ExplicitTenantList, and AllApplicationTenants.",
        "Reject duplicate Manifest codes, bad namespace, parent cycles, cross-scope references, skipped version, implicit deletion, and illegal lifecycle. A successful publish leaves Tenants Pending.",
        "Cover first sync success/failure, upgrade failure retaining the old version, concurrent sync, disable during sync, disable → enable, and preservation of custom roles.",
        "Reject unbound/Pending/Disabled Tenant issuance and cross-Tenant Client use. Prove a business token has no platform.*, Tenant uses applied version, and Application-level token omits Tenant authorization version.",
        "Cover Grant revoke, Role disable, Explicit overreach, future bindings under All, and proof that enabling a new Tenant extends only the authorizing Grant.",
        "At an external resource API, verify iss/aud/exp, one application_id, scoped roles/permissions, and exact version matching. Separately measure the real lifetime of an offline JWT after disable.",
        "Run 00→01→02 on a production copy and reconcile active, disabled, and soft-deleted rows table by table. Approve 03_cleanup only after business and rollback drills pass.",
      ],
    },
    {
      id: "release-boundaries",
      title: "Released versus not yet proven",
      bullets: [
        "Released: Application/Manifest/TenantApplication/Grant entities and APIs, resource guards, Tenant RBAC, OIDC Client Application ownership, scoped claims, version advancement, four-stage PostgreSQL scripts, and focused tests.",
        "Not provided: one Application-domain create-Tenant/invitation workflow, TenantApplication unlink, automatic background bulk Manifest synchronization, complete database bootstrap/unified ledger/down scripts.",
        "Not proven by a state transition alone: immediate revocation of already issued external JWTs. Without resource-side version or online invalidation checks, exp remains the boundary.",
        "Current tests cover services, in-memory databases, authorization boundaries, and SQL text contracts. Production still requires real PostgreSQL, reverse-proxy, browser OIDC, and external resource API acceptance.",
      ],
    },
  ],
  relatedDocs: [
    {
      product: "heimdall",
      docSlug: "heimdall-management-api",
      label: "Heimdall management API and permission matrix",
    },
    {
      product: "heimdall",
      docSlug: "heimdall-integration",
      label: "SPA, API, and OIDC integration",
    },
    {
      product: "heimdall",
      docSlug: "heimdall-client-credentials",
      label: "Client Credentials and BackendService",
    },
    {
      product: "heimdall",
      docSlug: "heimdall-database-migrations",
      label: "Database migration and upgrade boundaries",
    },
  ],
};

export const zhHeimdallApplicationRbacDocs: DocPage[] = [zhPage];
export const enHeimdallApplicationRbacDocs: DocPage[] = [enPage];
