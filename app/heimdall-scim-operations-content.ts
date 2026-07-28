import type { DocPage } from "./content";

const scimManagementCode = `GET  /api/TenantScim/tenant/{tenantId}
POST /api/TenantScim/tenant/{tenantId}/token/rotate
POST /api/TenantScim/tenant/{tenantId}/status
     { "enabled": true }

Required permission (any):
platform.admin | platform.tenant_directory.manage | tenant.scim.manage

tenant.scim.manage is restricted to the caller's current tenant by ITenantResourceAccessGuard.`;

const scimDiscoveryCode = `GET /scim/v2/{tenantId}/ServiceProviderConfig
GET /scim/v2/{tenantId}/ResourceTypes
GET /scim/v2/{tenantId}/Schemas
Authorization: Bearer hscim_<tenant-secret>
Accept: application/scim+json`;

const scimUserCode = `POST /scim/v2/{tenantId}/Users
Authorization: Bearer hscim_<tenant-secret>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "externalId": "directory-user-42",
  "userName": "ada.lovelace",
  "displayName": "Ada Lovelace",
  "active": true,
  "emails": [{ "value": "ada@example.com", "type": "work", "primary": true }],
  "phoneNumbers": [{ "value": "+44-20-0000-0000", "type": "work" }]
}`;

const scimQueryCode = `GET /scim/v2/{tenantId}/Users?filter=userName%20eq%20%22ada.lovelace%22&startIndex=1&count=100
GET /scim/v2/{tenantId}/Users?filter=externalId%20eq%20%22directory-user-42%22
GET /scim/v2/{tenantId}/Groups?filter=displayName%20eq%20%22Engineering%22
GET /scim/v2/{tenantId}/Groups?filter=externalId%20eq%20%22directory-group-7%22`;

const scimUserPatchCode = `PATCH /scim/v2/{tenantId}/Users/{id}
Authorization: Bearer hscim_<tenant-secret>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "active", "value": false },
    { "op": "replace", "path": "displayName", "value": "Ada L." }
  ]
}

PATCH /scim/v2/{tenantId}/Groups/{groupId}
Authorization: Bearer hscim_<tenant-secret>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "add", "path": "members", "value": [{ "value": "<heimdall-user-id>" }] },
    { "op": "remove", "path": "members[value eq \"<old-heimdall-user-id>\"]" }
  ]
}`;

const scimErrorCode = `HTTP/1.1 409 Conflict
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "409",
  "scimType": "uniqueness",
  "detail": "externalId already exists"
}`;

const providerSetupCode = `SCIM base URL: https://id.example.com/scim/v2/<tenantId>
Authentication: Bearer Token
Secret: hscim_<one-time-value>
User unique key: externalId
User lookup: filter=externalId eq "<provider-object-id>"
Group unique key: externalId
Group lookup: filter=externalId eq "<provider-object-id>"
Page start: startIndex=1
Page size: count=100 (maximum 200)`;

const acceptanceCode = `# A valid token and the same tenant must succeed.
curl -fsS \
  -H "Authorization: Bearer $SCIM_TOKEN" \
  -H "Accept: application/scim+json" \
  "$HEIMDALL/scim/v2/$TENANT_ID/ServiceProviderConfig"

# The old token must return 401 immediately after rotation.
curl -i \
  -H "Authorization: Bearer $OLD_SCIM_TOKEN" \
  "$HEIMDALL/scim/v2/$TENANT_ID/Users?count=1"`;

export const zhHeimdallScimOperationsDocs: DocPage[] = [
  {
    slug: "heimdall-scim-operations",
    group: "企业目录",
    eyebrow: "HEIMDALL 5.3.19 · SCIM OPERATIONS",
    title: "SCIM 2.0 供给与运维合同",
    description: "按 Heimdall 5.3.19 的真实协议边界接入企业目录，安全轮换租户凭据并验收 Users 与 Groups 同步。",
    sections: [
      {
        id: "baseline",
        title: "已发布源码基线",
        paragraphs: [
          "本页以 Heimdall v5.3.19 / commit 0032070 的 ScimController、TenantScimController、认证 Filter、供给 Services、Entities、Repositories 与测试为当前权威。它深化现有 SCIM 概览，重点覆盖生产接入、故障恢复和明确不支持的边界；对比 v5.1.2 到 v5.3.19，没有 SCIM 协议或管理 API 合同变化。",
          "SCIM 协议端点是标准协议表面，因此直接返回 application/scim+json，而不是 Asgard Response<T>。租户管理端点仍继承 BaseController、位于 /api 下并返回统一 Response<T>。",
          "5.1.2 自动化测试证明令牌只存摘要、启用与租户匹配、轮换后旧令牌失效、Controller 的 SCIM Filter/路由标记，以及 tenant.scim.manage 的工作区权限与 ITenantResourceAccessGuard 租户限制；仍没有 Users/Groups 供给 Service 的完整协议或真实 Provider 端到端测试。旧 4.1.9 的 CORS 源码括号问题已经在该 tag 修复，不再是当前警告。",
        ],
      },
      {
        id: "discovery",
        title: "Discovery 与 Service Provider Config",
        paragraphs: [
          "租户协议根路径是 /scim/v2/{tenantId}。ServiceProviderConfig、ResourceTypes 和 Schemas 也受同一租户 Bearer Token 保护，不是匿名探测端点。先读取 ServiceProviderConfig，让上游以服务器声明为准。",
          "5.1.2 声明 patch=true、filter=true、maxResults=200；bulk、changePassword、sort 和 etag 均为 false。ResourceTypes 只列出 User 与 Group；Schemas 只给出两个核心 Schema 的简要条目，不是完整的属性级 Schema 描述。",
        ],
        code: { language: "http", value: scimDiscoveryCode },
      },
      {
        id: "credentials",
        title: "Bearer 凭据生成与轮换边界",
        paragraphs: [
          "管理端先生成或轮换令牌，再显式启用 SCIM。令牌由 hscim_ 加 32 个随机字节的 Base64Url 值组成，明文只在 rotate 响应出现一次；数据库仅保存 SHA-256 摘要、可辨认前缀、轮换时间和最近使用时间，验证使用固定时间比较。",
          "轮换会直接替换唯一摘要，旧令牌立即失效，没有双令牌宽限期。安全做法是暂停上游任务、轮换、立即把新值写入上游 Secret Store、用 Discovery 冒烟，再恢复任务。若上游无法原子换密，安排维护窗口；不要把旧值重新写回数据库。",
        ],
        code: { language: "text", value: scimManagementCode },
        note: "管理 API 使用管理员 Access Token；平台权限可管理目标租户，tenant.scim.manage 只能管理当前身份租户，跨租户由 ITenantResourceAccessGuard 返回 403。SCIM 协议使用独立 hscim_ Bearer Token；它不是 OIDC Access Token、ID Token 或 Client Secret 的替代品。",
      },
      {
        id: "tenant-isolation",
        title: "租户隔离是路径与凭据的双重合同",
        paragraphs: [
          "认证 Filter 从路由读取 tenantId，再只读取该租户的启用配置并验证摘要。有效令牌放到另一个 tenantId 路径也会返回 SCIM 401，并带 WWW-Authenticate: Bearer realm=\"heimdall-scim\"。停用开关同样立即拒绝协议请求，但不会改动已同步资源。",
          "供给 Services 在详情、更新、删除和成员保存时继续检查实体 TenantId；组成员必须是同一租户的真实 Heimdall 用户。上游应为每个租户建立独立连接与 Secret，禁止共享 base URL、token、游标或对象映射表。",
        ],
      },
      {
        id: "users",
        title: "Users CRUD 与字段行为",
        paragraphs: [
          "Users 支持列表、详情、POST 创建、PUT 完整替换、PATCH 局部更新和 DELETE。创建要求非空 userName 与至少一个 email；主邮箱优先取 primary=true，否则取第一项。phoneNumbers 只消费第一项。displayName 为空时读取响应回退到 userName。",
          "POST 返回 201 与 Location；GET、PUT、PATCH 返回 200；DELETE 返回 204。externalId 是推荐的上游稳定键，并在每租户 User 范围内区分大小写地唯一。userName 和 email 还受 Heimdall 自身的租户内唯一规则约束；这些冲突统一成为 409 uniqueness。",
          "SCIM 请求不接受或设置密码。当前用户服务会创建 username/email/phone 登录标识，但没有密码输入就没有新密码哈希；生产登录应由已配置的联合身份链路或另行受控的凭据流程完成。",
        ],
        code: { language: "http", value: scimUserCode },
      },
      {
        id: "groups",
        title: "Groups CRUD 与成员合同",
        paragraphs: [
          "Groups 同样支持列表、详情、POST、PUT、PATCH 与 DELETE。displayName 必填；externalId 在每租户 Group 范围内唯一。内部目录 code 由 externalId（缺失时用 displayName）的 SHA-256 派生，冲突时增加随机后缀，调用方不应依赖或提交这个内部 code。",
          "members[].value 必须使用 Heimdall User 的 id，不是 userName、email 或上游 externalId；空值、重复值、未知用户或跨租户用户会失败。组是人员目录分组，不是授权 Role，成员同步不会自动授予 Heimdall 角色或 Permission。",
        ],
      },
      {
        id: "filter-pagination",
        title: "有限过滤与 1 基分页",
        paragraphs: [
          "User 过滤只支持 userName eq \"...\" 或 externalId eq \"...\"；Group 只支持 displayName eq \"...\" 或 externalId eq \"...\"。属性名与 eq 大小写不敏感；userName/displayName 的值比较不区分大小写，externalId 值比较区分大小写。其他运算符、复合表达式、逻辑运算和属性路径返回 400 invalidFilter。",
          "startIndex 从 1 开始，小于 1 会归一为 1；count 默认 100，并被截断到 0–200。响应使用 totalResults、startIndex、itemsPerPage 和大写 Resources。实现先加载租户全部用户或组再在内存过滤/分页，因此大目录需要压测内存、延迟与同步窗口，不能把 200 页大小误解为数据库级流式读取。",
        ],
        code: { language: "http", value: scimQueryCode },
      },
      {
        id: "schema-mapping",
        title: "Schema 与属性映射",
        bullets: [
          "User：id ← Heimdall 用户主键；externalId ↔ scim_external_id；userName ↔ Name；displayName ↔ DisplayName；active ↔ 登录信息 Status。",
          "User emails：写入时选 primary 或第一项并映射 Email；读取只返回最多一个元素。phoneNumbers 同样只保留第一项。type 等附加信息不持久化为多值目录。",
          "Group：id ← 目录组主键；externalId ↔ scim_external_id；displayName ↔ Name；members[].value ↔ Heimdall 用户主键。",
          "meta 只返回 resourceType、created、lastModified 和相对 location；没有 version。客户端提交的 id、meta、schemas、成员 display 与 $ref 不应当作权威写入字段。",
          "扩展企业用户 Schema、部门、经理、地址、locale、timezone、照片、entitlements、roles 与自定义扩展 URN 在 5.1.2 没有映射合同。",
        ],
      },
      {
        id: "patch",
        title: "PATCH 的实际子集",
        paragraphs: [
          "User 支持 add/replace 写 userName、displayName、externalId、active、emails、phoneNumbers；remove 只允许 externalId、displayName、phoneNumbers。无 path 且 value 为对象时会把上述 User 字段整体投影后走完整替换。不能 remove userName、active 或 emails。",
          "Group 支持 add/replace displayName、externalId、members；remove 支持 externalId、全部 members，或精确形式 members[value eq \"id\"]。无 path 的对象值可以替换 displayName、externalId、members。不要发送更复杂的 valuePath、子属性 Patch 或服务未声明的操作。",
        ],
        code: { language: "http", value: scimUserPatchCode },
      },
      {
        id: "idempotency-concurrency-errors",
        title: "幂等、并发与错误恢复",
        paragraphs: [
          "POST 没有 idempotency key；网络超时后先用 externalId eq 查询再决定是否重试。重复 externalId 会返回 409，而不是返回既有对象。PUT 与相同目标状态的 PATCH 可以用于收敛，但响应 meta.lastModified 仍可能变化，不能当作无副作用的幂等证明。DELETE 成功为 204，但 Controller 忽略 Service 的布尔结果，重复删除的 204/404 行为没有测试合同，客户端必须重新查询。",
          "协议声明 etag=false，没有 ETag、If-Match 或 SCIM version，因此两个写入者可能最后写入者覆盖。User 替换会依次更新用户主体、DisplayName/externalId 与状态；Group 替换会依次更新主体、externalId 与成员，源码没有为整个 SCIM 操作展示一个统一事务。任何超时或 5xx 后都 GET 对账并重放目标状态，不要盲目追加 PATCH。",
          "显式协议错误使用 SCIM Error：400 invalidFilter/invalidValue/invalidSyntax/invalidPath/mutability、401、404、409 uniqueness。Controller 会把任何逃出的 InvalidOperationException 都标成 409 uniqueness，因此未知/跨租户组成员等下游校验可能得到语义过宽的冲突错误。无效 JSON、ASP.NET 模型绑定错误和未捕获异常也没有统一转换的完整证明，客户端必须同时容忍非 SCIM 400/500，并保留状态、Content-Type 与脱敏 request ID。",
        ],
        code: { language: "http", value: scimErrorCode },
      },
      {
        id: "lifecycle",
        title: "停用、删除与登录会话边界",
        paragraphs: [
          "把 User active 设为 false 会禁用其受管登录信息，但保留用户资源，适合可逆离职流程；重新设 true 可恢复。DELETE 对 User 执行软删除，租户列表会排除它；但按 id 的 User 读取链路没有显式检查 Deleted，删除后详情与重复 DELETE 必须在目标构建中验收，不能先验承诺 404。Group DELETE 先清空成员，再软删除组并释放内部 code。停用整个 SCIM 连接只拒绝新请求，不会停用或删除任何 User/Group。",
          "5.1.2 的 SCIM 删除/停用路径没有证明会级联撤销该主体全部既有授权码、Token、Consent、Passkey 或外部资源 API 中仍有效的离线 JWT，也没有证明删除用户会清理所有目录组成员关系。高风险离职必须结合账户/会话治理、短 Access Token TTL 和资源服务器撤销设计，并在操作后查询验证。",
        ],
      },
      {
        id: "audit-security",
        title: "审计、安全与可观测性",
        bullets: [
          "SCIM 资源写入使用固定审计操作人 scim；配置轮换/启停使用当前管理员操作人。保留管理员身份、租户、上游作业 ID、资源类型、外部 ID、HTTP 状态和耗时，不记录完整资源正文。",
          "TokenPrefix 只用于辨认，不能认证；LastUsedAt 最多约每五分钟更新一次，而且观测写入失败不会推翻已完成认证，因此它不是逐请求审计。",
          "永远通过 HTTPS 发送 hscim_ 令牌；不要放进 URL、日志、Trace、浏览器存储、支持工单、CI 输出或提示词。上游 Secret Store 与 Heimdall 管理权限应分离。",
          "监控 401、400 invalidFilter/invalidPath、409 uniqueness、5xx、同步延迟、分页资源数突变和 LastUsedAt 长时间不更新；告警必须按 tenantId 隔离。",
          "PostgreSQL 启动路径会创建按 tenant_id + scim_external_id 且仅覆盖未删除非空值的条件唯一索引；其他数据库与未执行启动校验的环境必须单独验证唯一性和迁移结果。",
        ],
      },
      {
        id: "provider-setup",
        title: "企业目录 Provider 设置模板",
        paragraphs: [
          "无论上游是 Microsoft Entra ID、Okta、JumpCloud 还是自建同步器，都先选择 Generic SCIM 2.0 模式，并以它实际发出的 HTTP 为验收依据。把 tenantId 固定在 base URL，把本租户 hscim_ 值放进 Bearer Secret，使用 externalId 保存上游不可变对象 ID。",
          "若 Provider 强制调用 Bulk、sortBy、password、复杂 Filter、PATCH 子属性或完整属性级 /Schemas，5.1.2 无法满足该模板；关闭这些功能、改成逐资源 CRUD，或在受测适配器中降级。不要仅凭 Provider UI 显示“SCIM 2.0 compatible”就宣布兼容。",
        ],
        code: { language: "text", value: providerSetupCode },
        bullets: [
          "先同步两个测试 User，再创建一个 Group，并用响应 id 回填 members[].value。",
          "先运行按需/测试同步，确认 create → filter lookup → update → deactivate → delete 顺序，再开启全量周期任务。",
          "确认上游把 409 当作需重新查询的冲突，把 401 当作暂停任务并升级凭据，而不是无限重试。",
        ],
      },
      {
        id: "acceptance",
        title: "上线与轮换验收",
        code: { language: "bash", value: acceptanceCode },
        bullets: [
          "验证缺 Token、错误 Token、已停用 Token、跨 tenantId Token 都返回 401 + application/scim+json + WWW-Authenticate。",
          "验证 Discovery 精确声明 PATCH/Filter 支持与 Bulk/Sort/ETag/ChangePassword 不支持。",
          "覆盖 User/Group 的 201 + Location、GET、PUT、PATCH、204、404，以及 externalId/userName/email 冲突。",
          "覆盖唯一允许的四种 Filter、非法复合 Filter、startIndex 归一、count=0、count>200 与最后一页字段。",
          "覆盖 User 最少邮箱、主邮箱选择、单电话映射、active=false/true；覆盖 Group 未知/重复/跨租户成员。",
          "模拟 POST、PUT、PATCH 响应丢失和并发写，验证客户端用 externalId/GET 对账，而不是制造重复对象或盲目追加成员。",
          "轮换后确认旧令牌立即 401、新令牌成功；停用后资源仍存在；重新启用后同步可收敛。",
          "用真实 Provider 跑一轮测试同步，检查 Content-Type、URL 编码、Secret 脱敏、指标与审计，并记录确切版本。",
        ],
      },
      {
        id: "unsupported",
        title: "5.1.2 明确不承诺的能力",
        bullets: [
          "没有 /Bulk、排序、ETag/If-Match、ChangePassword、增量游标、删除墓碑或 SCIM 事件推送。",
          "没有完整 RFC 7643 属性目录、企业用户扩展、自定义 Schema 注册、多值 email/phone 原样往返或任意 Filter/PATCH 语法。",
          "没有 SCIM OAuth Client Credentials、OIDC Access Token 或每 Provider 多 Token；每租户只有一个当前 hscim_ 摘要。",
          "没有把目录 Group 自动映射成 Heimdall 授权 Role/Permission，也没有 SCIM 管理平台用户。",
          "没有证明一次 SCIM 写操作跨全部内部步骤原子提交，也没有通用客户端可见乐观并发控制。",
          "没有证明 SCIM 停用/删除会即时撤销外部 API 已离线验证的 JWT；不要把目录生命周期等同于全系统即时注销。",
        ],
      },
      {
        id: "agent-workflow",
        title: "Agent 工作流与复核门禁",
        paragraphs: [
          "让 Agent 修改 SCIM 接入或文档时，先加载 identity-integration 判断凭据、租户与登录边界，再用 asgard-security 复核令牌生成、摘要、固定时间比较和敏感材料处理；涉及 Controller、状态码与响应壳时加载 asgard-api-development。",
          "Agent 必须重新读取 5.1.2 tag 的 Controller、Service、Entity、Repository 与测试，逐项比对 Discovery 声明、路由、权限、字段和错误；不能从 RFC 或 Provider 宣传页反推实现。协议 Controller 直接返回 SCIM JSON 是刻意例外，不能为了套用 BaseController 而破坏协议合同。",
        ],
      },
    ],
  },
];

export const enHeimdallScimOperationsDocs: DocPage[] = [
  {
    slug: "heimdall-scim-operations",
    group: "Enterprise Directory",
    eyebrow: "HEIMDALL 5.3.19 · SCIM OPERATIONS",
    title: "SCIM 2.0 provisioning and operations contract",
    description: "Connect an enterprise directory to the actual Heimdall 5.3.19 protocol surface, rotate tenant credentials safely, and accept Users and Groups synchronization.",
    sections: [
      {
        id: "baseline",
        title: "Released source baseline",
        paragraphs: [
          "This page treats the ScimController, TenantScimController, authorization filter, provisioning services, entities, repositories, and tests from Heimdall v5.3.19 / commit 0032070 as current authority. It deepens the existing SCIM overview with production setup, recovery, and explicit unsupported boundaries. Comparing v5.1.2 through v5.3.19 shows no SCIM protocol or management-API contract change.",
          "SCIM endpoints are a protocol surface and therefore return application/scim+json directly rather than Asgard Response<T>. Tenant management endpoints still inherit BaseController, live under /api, and return the unified Response<T> envelope.",
          "The 5.1.2 tests prove digest-only token storage, enablement and tenant matching, immediate old-token invalidation, controller SCIM filter and route markers, plus tenant.scim.manage workspace permission and ITenantResourceAccessGuard tenant restriction. They still do not provide complete Users/Groups protocol or real-provider end-to-end coverage. The old 4.1.9 CORS source-brace defect is fixed in this tag and is no longer a current warning.",
        ],
      },
      {
        id: "discovery",
        title: "Discovery and Service Provider Config",
        paragraphs: [
          "The tenant protocol root is /scim/v2/{tenantId}. ServiceProviderConfig, ResourceTypes, and Schemas require the same tenant Bearer token; they are not anonymous probes. Read ServiceProviderConfig first and make the upstream follow the server declaration.",
          "Version 5.1.2 declares patch=true, filter=true, and maxResults=200. bulk, changePassword, sort, and etag are false. ResourceTypes contains only User and Group. Schemas returns summary entries for those two core schemas, not complete attribute-level schema definitions.",
        ],
        code: { language: "http", value: scimDiscoveryCode },
      },
      {
        id: "credentials",
        title: "Bearer credential provisioning and rotation boundary",
        paragraphs: [
          "An administrator first generates or rotates a token and then explicitly enables SCIM. The token is hscim_ plus 32 random Base64Url-encoded bytes. Plaintext appears only in the rotate response; persistence keeps a SHA-256 digest, display prefix, rotation time, and last-use time. Validation uses a fixed-time comparison.",
          "Rotation replaces the sole digest immediately; there is no dual-token grace period. Pause upstream jobs, rotate, store the new value in the provider secret store immediately, smoke-test Discovery, and resume. If the provider cannot switch atomically, schedule a maintenance window rather than restoring an old digest in the database.",
        ],
        code: { language: "text", value: scimManagementCode },
        note: "Management calls use an administrator Access Token. Platform permissions may target a tenant; tenant.scim.manage is limited to the identity's current tenant and cross-tenant access is rejected with 403 by ITenantResourceAccessGuard. SCIM calls use the independent hscim_ Bearer token, not an OIDC ID Token or client secret.",
      },
      {
        id: "tenant-isolation",
        title: "Tenant isolation binds both path and credential",
        paragraphs: [
          "The authorization filter reads tenantId from the route, loads only that tenant's enabled configuration, and validates its digest. A valid token sent to another tenantId path returns a SCIM 401 with WWW-Authenticate: Bearer realm=\"heimdall-scim\". Disabling the connection rejects calls immediately without changing provisioned resources.",
          "Provisioning services continue to verify entity TenantId on detail, mutation, deletion, and membership operations. Group members must be real Heimdall users in that tenant. Give every tenant a separate connection and secret; never share base URLs, tokens, cursors, or object-mapping state.",
        ],
      },
      {
        id: "users",
        title: "Users CRUD and field behavior",
        paragraphs: [
          "Users supports list, detail, POST create, PUT replace, PATCH, and DELETE. Create requires a non-empty userName and at least one email. The primary email wins, otherwise the first email is used. Only the first phoneNumber is consumed. A missing displayName reads back as userName.",
          "POST returns 201 plus Location; GET, PUT, and PATCH return 200; DELETE returns 204. externalId is the recommended upstream stable key and is case-sensitively unique per tenant within Users. userName and email also follow Heimdall's own tenant uniqueness rules. These conflicts become 409 uniqueness.",
          "SCIM does not accept or set a password. The current user service creates username, email, and phone login identifiers, but no new password hash exists without a password input. Production login therefore needs an already configured federation path or a separate controlled credential workflow.",
        ],
        code: { language: "http", value: scimUserCode },
      },
      {
        id: "groups",
        title: "Groups CRUD and membership contract",
        paragraphs: [
          "Groups also supports list, detail, POST, PUT, PATCH, and DELETE. displayName is required, and externalId is unique per tenant within Groups. The internal directory code derives from a SHA-256 hash of externalId, or displayName when absent, with a random suffix on collision. Clients must neither depend on nor submit that internal code.",
          "members[].value must be a Heimdall User id, not userName, email, or upstream externalId. Empty, duplicate, unknown, and cross-tenant member IDs fail. A directory group is an organizational grouping, not an authorization Role; syncing membership grants no Heimdall role or permission automatically.",
        ],
      },
      {
        id: "filter-pagination",
        title: "Restricted filtering and one-based paging",
        paragraphs: [
          "User filters support only userName eq \"...\" or externalId eq \"...\". Group filters support only displayName eq \"...\" or externalId eq \"...\". Attribute names and eq are case-insensitive. userName/displayName values compare case-insensitively, while externalId compares case-sensitively. Other operators, compound expressions, Boolean logic, and attribute paths return 400 invalidFilter.",
          "startIndex is one-based and values below one normalize to one. count defaults to 100 and clamps to 0–200. Responses contain totalResults, startIndex, itemsPerPage, and uppercase Resources. The implementation loads all tenant users or groups before filtering and paging in memory, so load-test large directories; a 200-item page is not database streaming.",
        ],
        code: { language: "http", value: scimQueryCode },
      },
      {
        id: "schema-mapping",
        title: "Schema and attribute mapping",
        bullets: [
          "User: id ← Heimdall user primary key; externalId ↔ scim_external_id; userName ↔ Name; displayName ↔ DisplayName; active ↔ managed login status.",
          "User emails: writes select primary or first and map it to Email; reads return at most one entry. phoneNumbers likewise preserves only the first value. type and other multi-value details are not round-tripped as a directory.",
          "Group: id ← directory-group primary key; externalId ↔ scim_external_id; displayName ↔ Name; members[].value ↔ Heimdall user primary key.",
          "meta returns only resourceType, created, lastModified, and relative location; it has no version. Client-supplied id, meta, schemas, member display, and $ref are not authoritative write fields.",
          "Enterprise User extensions, departments, manager, addresses, locale, timezone, photos, entitlements, roles, and custom extension URNs have no 5.1.2 mapping contract.",
        ],
      },
      {
        id: "patch",
        title: "The implemented PATCH subset",
        paragraphs: [
          "User allows add/replace for userName, displayName, externalId, active, emails, and phoneNumbers. remove is limited to externalId, displayName, and phoneNumbers. A pathless object value projects those User fields and then follows full replacement. userName, active, and emails cannot be removed.",
          "Group allows add/replace for displayName, externalId, and members. remove accepts externalId, all members, or the exact members[value eq \"id\"] form. A pathless object can replace displayName, externalId, and members. Do not send more complex value paths, sub-attribute patches, or undeclared operations.",
        ],
        code: { language: "http", value: scimUserPatchCode },
      },
      {
        id: "idempotency-concurrency-errors",
        title: "Idempotency, concurrency, and error recovery",
        paragraphs: [
          "POST has no idempotency key. After a network timeout, query by externalId before deciding whether to retry. A duplicate externalId returns 409 instead of the existing object. PUT and target-state PATCH can converge state, but meta.lastModified may still change and is not proof of side-effect-free idempotency. Successful DELETE returns 204, but the controller ignores the service Boolean result; repeated-delete 204/404 behavior has no test contract and must be reconciled with a read.",
          "etag=false means there is no ETag, If-Match, or SCIM version, so concurrent writers can overwrite each other. User replacement writes core fields, displayName/externalId, and status in multiple steps. Group replacement writes core fields, externalId, and members in multiple steps. Source does not show one encompassing transaction for either SCIM operation. After any timeout or 5xx, GET and reconcile the desired state instead of blindly appending another PATCH.",
          "Explicit protocol failures use SCIM Error: 400 invalidFilter/invalidValue/invalidSyntax/invalidPath/mutability, 401, 404, and 409 uniqueness. The controller labels every escaping InvalidOperationException as 409 uniqueness, so downstream validation such as an unknown or cross-tenant group member can receive an overly broad conflict type. It also does not prove complete SCIM conversion for malformed JSON, ASP.NET model binding failures, or unhandled exceptions. Clients must tolerate non-SCIM 400/500 responses and retain status, Content-Type, and a redacted request ID.",
        ],
        code: { language: "http", value: scimErrorCode },
      },
      {
        id: "lifecycle",
        title: "Deactivation, deletion, and session boundary",
        paragraphs: [
          "Setting User active=false disables managed login information while retaining the resource, making it the reversible offboarding operation; active=true restores it. DELETE soft-deletes a User and tenant lists exclude it. However, the by-id User read path does not explicitly test Deleted, so post-delete detail and repeated DELETE behavior must be accepted against the target build rather than promised as 404. Group DELETE first removes members, then soft-deletes the group and releases its internal code. Disabling the SCIM connection only blocks new calls and changes no User or Group.",
          "The 5.1.2 SCIM deactivate/delete path does not prove cascading revocation of every existing authorization code, token, consent, passkey, or offline JWT accepted by an external resource API. It also does not prove that deleting a user cleans every directory-group membership record. High-risk offboarding must combine account/session governance, short Access Token TTLs, and the resource-server revocation design, followed by explicit queries.",
        ],
      },
      {
        id: "audit-security",
        title: "Audit, security, and observability",
        bullets: [
          "SCIM resource writes use the fixed audit operator scim; configuration rotation and status changes use the current administrator. Record administrator identity, tenant, upstream job ID, resource type, external ID, HTTP status, and duration without logging full resource bodies.",
          "TokenPrefix is display-only. LastUsedAt is rate-limited to roughly one write per five minutes, and a failed observability write does not invalidate successful authentication, so it is not a per-request audit log.",
          "Send hscim_ only over HTTPS. Keep it out of URLs, logs, traces, browser storage, tickets, CI output, and prompts. Separate control of the upstream secret store from Heimdall management permission.",
          "Monitor 401, 400 invalidFilter/invalidPath, 409 uniqueness, 5xx, synchronization latency, abrupt page-count changes, and stale LastUsedAt. Partition alerts by tenantId.",
          "The PostgreSQL startup path creates partial unique indexes on tenant_id + non-empty scim_external_id for undeleted rows. Verify uniqueness and migration state independently for other databases or deployments that skipped this startup check.",
        ],
      },
      {
        id: "provider-setup",
        title: "Enterprise directory provider setup template",
        paragraphs: [
          "For Microsoft Entra ID, Okta, JumpCloud, or a custom synchronizer, start with a Generic SCIM 2.0 template and accept the actual HTTP it emits. Fix tenantId in the base URL, store this tenant's hscim_ value as the Bearer secret, and use externalId for the provider's immutable object ID.",
          "If a provider requires Bulk, sortBy, password provisioning, complex filters, PATCH sub-attributes, or complete attribute-level /Schemas, version 5.1.2 cannot satisfy that template. Disable those features, fall back to per-resource CRUD, or use a tested adapter. A UI label saying “SCIM 2.0 compatible” is not interoperability evidence.",
        ],
        code: { language: "text", value: providerSetupCode },
        bullets: [
          "Provision two test Users first, then a Group, and use returned User ids in members[].value.",
          "Run on-demand/test sync through create → filtered lookup → update → deactivate → delete before enabling scheduled full sync.",
          "Ensure the provider treats 409 as a reconcile/query condition and 401 as a reason to pause and escalate credentials, not retry forever.",
        ],
      },
      {
        id: "acceptance",
        title: "Go-live and rotation acceptance",
        code: { language: "bash", value: acceptanceCode },
        bullets: [
          "Verify missing, incorrect, disabled, and cross-tenant tokens return 401 plus application/scim+json and WWW-Authenticate.",
          "Verify Discovery declares PATCH/Filter and rejects any claim of Bulk/Sort/ETag/ChangePassword support.",
          "Cover User and Group 201 + Location, GET, PUT, PATCH, 204, 404, plus externalId/userName/email conflicts.",
          "Cover all four allowed filters, an invalid compound filter, normalized startIndex, count=0, count>200, and final-page metadata.",
          "Cover required User email, primary selection, single-phone mapping, active=false/true, plus unknown, duplicate, and cross-tenant Group members.",
          "Simulate lost POST/PUT/PATCH responses and concurrent writes. Prove the client reconciles with externalId/GET rather than creating duplicates or blindly appending members.",
          "After rotation, prove the old token immediately returns 401 and the new token succeeds. After disable, prove resources remain; after re-enable, prove sync converges.",
          "Run one real provider test sync and inspect Content-Type, URL encoding, secret redaction, metrics, and audit data. Record the exact provider version.",
        ],
      },
      {
        id: "unsupported",
        title: "Capabilities not promised by 5.1.2",
        bullets: [
          "No /Bulk, sorting, ETag/If-Match, ChangePassword, incremental cursor, deletion tombstone, or SCIM event push.",
          "No complete RFC 7643 attribute catalog, Enterprise User extension, custom schema registration, lossless multi-value email/phone round-trip, or arbitrary Filter/PATCH grammar.",
          "No SCIM OAuth Client Credentials, OIDC Access Token, or multiple provider tokens per tenant; each tenant has one current hscim_ digest.",
          "No automatic mapping from a directory Group to a Heimdall authorization Role/Permission, and no platform-user provisioning through SCIM.",
          "No proof that one SCIM mutation commits every internal step atomically, and no general client-visible optimistic concurrency control.",
          "No proof that SCIM deactivation/deletion immediately revokes JWTs already accepted offline by external APIs. Directory lifecycle is not global instant logout.",
        ],
      },
      {
        id: "agent-workflow",
        title: "Agent workflow and review gates",
        paragraphs: [
          "Before an agent changes this integration or its documentation, load identity-integration for credential, tenant, and login boundaries; use asgard-security to review token generation, digesting, fixed-time comparison, and sensitive material; load asgard-api-development for controllers, status codes, and response envelopes.",
          "The agent must reread the 5.1.2 tag controllers, services, entities, repositories, and tests, then compare every Discovery declaration, route, permission, field, and error. Never infer implementation from an RFC or provider marketing page. Direct SCIM JSON from the protocol controller is intentional and must not be replaced with BaseController envelopes.",
        ],
      },
    ],
  },
];
