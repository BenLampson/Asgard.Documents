import type { DocPage } from "./content";

const onboardingRequest = `POST /api/Tenant/onboarding HTTP/1.1
Host: id.example.com
Authorization: Bearer <platform-access-token>
Idempotency-Key: tenant-acme-20260716-01
Content-Type: application/json

{
  "tenant": {
    "name": "acme",
    "domain": "acme.example.com"
  },
  "profile": {
    "description": "Acme production tenant",
    "website": "https://www.example.com",
    "contactName": "Identity Operations",
    "contactEmail": "identity-ops@example.com",
    "brandColor": "#1677ff",
    "loginBrandName": "Acme Identity",
    "loginBrowserTitle": "Sign in to Acme",
    "loginHeading": "Welcome back",
    "loginDescription": "Use your Acme account to continue.",
    "loginPanelTitle": "Sign in",
    "locale": "en-US",
    "timezone": "UTC"
  },
  "client": {
    "applicationId": "heimdall",
    "clientName": "acme-spa",
    "clientDescription": "Acme browser application",
    "clientType": "public",
    "applicationType": "web",
    "grantTypes": "authorization_code",
    "redirectUris": "https://app.example.com/auth/callback",
    "postLogoutRedirectUris": "https://app.example.com/signed-out",
    "allowedCorsOrigins": "https://app.example.com",
    "scopes": "openid,profile,email",
    "defaultScopes": "openid,profile,email",
    "responseTypes": "code",
    "responseModes": "query",
    "tokenEndpointAuthMethods": "none",
    "requirePkce": true,
    "requireAuthorizationConsent": false,
    "allowOfflineAccess": false,
    "allowAccessTokensViaBrowser": false,
    "accessTokenFormat": "jwt",
    "status": 1
  },
  "businessScope": {
    "tenantId": "",
    "name": "orders.read",
    "displayName": "Read orders",
    "description": "Read order data from the Orders API",
    "resources": "orders-api",
    "claims": "tenant_id,user_id",
    "required": false,
    "isSystem": false,
    "status": 1
  },
  "keySize": 2048,
  "administrator": {
    "tenantId": "",
    "name": "tenant-admin",
    "displayName": "Tenant administrator",
    "email": "tenant-admin@example.com",
    "password": "<12-to-128-character-bootstrap-password>",
    "status": 1
  },
  "enableTenant": true
}`;

const verificationRequests = `GET /api/Tenant/{tenantId}
GET /api/Tenant/{tenantId}/profile
GET /api/TenantOidcClient/tenant/{tenantId}
GET /api/TenantOidcKey/tenant/{tenantId}/current
GET /api/TenantUser/tenant/{tenantId}/username/tenant-admin

GET /{tenantId}/.well-known/openid-configuration
GET /{tenantId}/.well-known/jwks`;

export const zhHeimdallManagementDocs: DocPage[] = [
  {
    slug: "heimdall-tenant-onboarding-api",
    group: "管理 API",
    eyebrow: "HEIMDALL 5.3.19 · ATOMIC ONBOARDING",
    title: "通过管理 API 原子化开通租户",
    description: "用一个受保护、可幂等重试的请求创建租户、OIDC public SPA、业务 Scope、签名密钥与首位管理员。",
    sections: [
      {
        id: "contract",
        title: "5.3.19 当前发布合同",
        paragraphs: [
          "Heimdall v5.3.19 / commit 0032070 提供 POST /api/Tenant/onboarding。它是后台管理接口，返回 Asgard Response<TenantOnboardingResultVo>，不是公开的 OIDC 协议端点，也不应由租户注册页直接匿名调用。",
          "5.1.2 首次发布了原子化 onboarding；5.3.19 已将它迁移到 Application 域：请求必须选择已启用的 applicationId，调用者必须拥有该应用的管理权，事务会绑定 TenantApplication、复制应用角色/权限模板，并把首位管理员分配到唯一启用的默认租户管理员角色。本页不宣称空 PostgreSQL 初始化或目标环境生产 E2E 已被单页证明。",
        ],
      },
      {
        id: "authorization",
        title: "认证与权限",
        paragraphs: [
          "请求必须携带已校验的 Bearer Access Token。Controller 通过 IApplicationResourceAccessGuard 检查调用者是否可管理 client.applicationId；平台超级管理员可管理，其他系统用户必须具有 application.manage 或 application.tenant.manage，并持有该应用的授权 Grant。ID Token 不能用于调用管理 API；前端判断只改善体验，后端资源授权才是安全边界。",
        ],
        bullets: [
          "只从受信任的运维后端、管理后台或受控自动化调用，并全程使用 HTTPS。",
          "调用者必须能解析出非空 operatorId；它会写入新资源的审计字段。",
          "不要把平台管理 Token、管理员初始密码或任何密钥写入日志、提示词、仓库与前端构建产物。",
        ],
      },
      {
        id: "idempotency",
        title: "Idempotency-Key 合同",
        paragraphs: [
          "Idempotency-Key Header 必填、不可为空且最长 128 字符。Heimdall 保存该 Key、请求 DTO 的 SHA-256 摘要与成功结果；顺序重试同一 Key 和同一请求会恢复原结果，不会再创建一套租户。",
          "同一 Key 不允许提交不同内容。网络超时且结果未知时，保留原 Key 并原样重发请求体；不要生成新 Key，也不要修改默认值、字段或业务 Scope。并发重复仍可能由数据库唯一约束拒绝其中一次，待首个事务结束后再按同一 Key 重试。不要依赖某个固定冲突 HTTP 状态。",
        ],
      },
      {
        id: "request",
        title: "完整 public SPA 与业务 Scope 请求",
        paragraphs: [
          "下面选择已启用的 Heimdall 应用并创建 public browser client：Authorization Code、PKCE、token_endpoint_auth_method=none，不提供 Client Secret。applicationId 必须指向已发布且正好包含一个启用默认租户管理员角色的应用；业务 Scope 会自动并入客户端的 Scopes 与 DefaultScopes。",
          "TenantUserDto 当前把 administrator.tenantId 声明为 required，但服务会用新生成的租户 ID 覆盖它；为兼容当前 DTO，请保留空字符串。BusinessScope 的 tenantId 同样不参与最终归属，服务会写入新租户 ID。",
        ],
        code: { language: "http", value: onboardingRequest },
        note: "管理员密码长度必须为 12–128；keySize 只接受 2048、3072 或 4096。public SPA 永远不要增加 clientSecret。",
      },
      {
        id: "transaction",
        title: "一个事务内发生什么",
        bullets: [
          "校验 Header、操作人、租户名、客户端、RSA 长度与管理员字段，并在事务前检查已完成的幂等请求。",
          "创建 Disabled 租户，初始化内建 OIDC Scopes；从所选应用复制 tenant-scope 角色与权限模板，建立 TenantApplication 绑定。",
          "写入租户 Profile；如提供 BusinessScope，则写入启用的非系统 Scope。",
          "生成服务端 ClientId，写入 OIDC 客户端，并把业务 Scope 合并进客户端 Scope 列表。",
          "生成 RSA 密钥、加密私钥、立即激活首把签名密钥，并写入 onboarding_activate 密钥日志。",
          "创建管理员、用户名/邮箱登录信息，将密码哈希，并分配所选应用唯一启用的默认租户管理员角色。",
          "enableTenant=true 时启用租户，最后在同一事务写入幂等结果记录；任何后续写入失败都会回滚此前数据库写入。",
        ],
      },
      {
        id: "response",
        title: "响应与 Secret 边界",
        paragraphs: [
          "成功响应的 data 包含 requestId、tenant、profile、client、key、administrator 与 enabled。租户 ID、ClientId、Key ID/kid 和管理员 ID 由服务端生成；持久化的幂等快照用于后续相同请求恢复。",
        ],
        bullets: [
          "客户端响应模型用 JsonIgnore 排除 ClientSecret；public SPA 本来也不应提交或获得 Secret。confidential client 即使提交 Secret，服务也只保存哈希且 onboarding 响应不会回显明文。",
          "签名私钥先由 Asgard Encryption 加密再持久化，并通过 JsonIgnore 排除；响应只暴露公钥与运行时状态。",
          "管理员密码只用于生成登录哈希，不会出现在 TenantUserVo。",
          "响应 Profile 会清空 LogoBase64；Logo 元数据可返回，但不要把 Base64 响应当对象存储交付合同。",
        ],
      },
      {
        id: "verification",
        title: "从管理面与协议面验收",
        paragraphs: [
          "先从 onboarding 响应读取 tenant.id、client.clientId 与 key.kid，再分别验证管理资源和公开 OIDC 元数据。管理查询拥有各自权限：tenant.read、oidc.client.manage、oidc.key.manage 或 tenant.user.read 等，onboarding 权限不会自动代表调用者具备全部查询权限。",
        ],
        code: { language: "http", value: verificationRequests },
        bullets: [
          "Discovery 的 issuer 与所有公开端点必须使用预期 HTTPS 外部地址；不要只验证 200。",
          "JWKS 必须包含 onboarding 响应中的 kid，且只公开验证所需公钥材料。",
          "用 SPA 执行 Authorization Code + PKCE，再以 Access Token 调用目标 API；验证 iss、aud、生命周期和业务 Scope。",
          "Host API CORS 与 OIDC Client allowedCorsOrigins 是两个独立边界，两边都按实际浏览器 Origin 验证。",
        ],
      },
      {
        id: "retry",
        title: "错误处理与安全重试",
        bullets: [
          "本地校验错误：修正请求后使用新的 Idempotency-Key，因为内容已经变化。",
          "超时、连接中断或响应丢失：用原 Key 与完全相同的请求重试；成功时会返回原快照。",
          "同 Key 不同内容：停止自动重试，核对调用方的 Key 持久化与请求序列化，不要猜测具体 HTTP 冲突状态。",
          "租户名、Scope 或其他唯一约束冲突：选择新的业务标识并使用新 Key；事务应保持无部分开通记录。",
          "返回后协议验收失败：不要盲目重复 onboarding；保存 requestId、tenantId 与安全日志，检查 Issuer、代理 Scheme、CORS、客户端配置和密钥状态。",
        ],
      },
      {
        id: "operations",
        title: "生产运维清单",
        bullets: [
          "上线前确认数据库已经具备 onboarding 涉及的全部表、索引与内建种子所需结构，尤其 tenant_onboarding_request 唯一索引。5.1.2 发布制品仍没有一份可据此宣称覆盖空 PostgreSQL 的完整 baseline SQL。",
          "若 oidc.bootstrap.auto_sync_schema=false，不要期待运行时自动补齐缺失结构；先在目标版本和备份策略下验证迁移。",
          "确保 Asgard Encryption 的生产密钥稳定、受 Secret Manager 管理并可恢复；否则新生成的 OIDC 私钥可能无法解密。",
          "监控失败率、事务时长、幂等重放、唯一约束异常与密钥生成耗时；日志保留 requestId 和生成资源 ID，但对 Token、密码、私钥和请求敏感字段脱敏。",
          "把 onboarding 纳入备份恢复、灾难演练、权限复核和密钥轮换 Runbook；开通完成后撤销一次性初始密码并按组织策略配置 MFA。",
        ],
      },
      {
        id: "preview-boundary",
        title: "onboarding 与其他已发布能力的边界",
        paragraphs: [
          "MCP、identity.subject.invalidated Webhook、subject invalidation、Backend Directory 与 security-event lifecycle 自 5.1.2 起已发布；5.3.19 的 onboarding 另新增 Application 域资源授权、租户应用绑定和应用角色模板复制。",
          "MCP、Webhook 等能力仍不是 onboarding 的隐含步骤。Application 域的 20260720 迁移必须按 precheck → migrate → postcheck → cleanup 的受审顺序执行。",
          "v5.3.19 tag 与当前 commit 同为 0032070，没有额外 HEAD-only onboarding 差异。未来若合同改变，必须按新的 tag/commit 重新核对并同步两种语言。",
        ],
      },
    ],
  },
];

export const enHeimdallManagementDocs: DocPage[] = [
  {
    slug: "heimdall-tenant-onboarding-api",
    group: "Management API",
    eyebrow: "HEIMDALL 5.3.19 · ATOMIC ONBOARDING",
    title: "Provision a tenant atomically through the management API",
    description: "Create a tenant, public OIDC SPA, business scope, signing key, and first administrator with one protected, safely retryable request.",
    sections: [
      {
        id: "contract",
        title: "Current 5.3.19 release contract",
        paragraphs: [
          "Heimdall v5.3.19 / commit 0032070 provides POST /api/Tenant/onboarding. This is a back-office management API returning Asgard Response<TenantOnboardingResultVo>, not a public OIDC protocol endpoint or an anonymous tenant-signup route.",
          "Version 5.1.2 first released atomic onboarding; 5.3.19 moves it into the Application domain. The request must select an enabled applicationId, the caller must be allowed to manage it, and the transaction binds TenantApplication, copies application role/permission templates, and assigns the first administrator to the single enabled default tenant-admin role.",
        ],
      },
      {
        id: "authorization",
        title: "Authentication and permissions",
        paragraphs: [
          "The request must carry a validated Bearer Access Token. The controller uses IApplicationResourceAccessGuard for client.applicationId: a platform super-admin is allowed, while another system user needs application.manage or application.tenant.manage plus a grant for that application. An ID Token cannot authenticate this API; backend resource authorization is the security boundary.",
        ],
        bullets: [
          "Call only from a trusted operations backend, management console, or controlled automation over HTTPS.",
          "The caller must resolve to a non-empty operatorId, which is written to audit fields on the new resources.",
          "Never place a platform management token, bootstrap administrator password, or key material in logs, prompts, repositories, or frontend bundles.",
        ],
      },
      {
        id: "idempotency",
        title: "Idempotency-Key contract",
        paragraphs: [
          "The Idempotency-Key header is required, non-blank, and at most 128 characters. Heimdall stores the key, a SHA-256 hash of the request DTO, and the successful result. A sequential retry with the same key and request restores the original result instead of creating another tenant.",
          "The same key cannot carry different content. If a network failure leaves the outcome unknown, preserve the key and replay the body exactly; do not generate a new key or alter defaults, fields, or the business scope. Concurrent duplicates can still make one request lose to the database unique constraint; retry with the same key after the first transaction settles. Do not depend on a specific conflict HTTP status.",
        ],
      },
      {
        id: "request",
        title: "Complete public SPA and business-scope request",
        paragraphs: [
          "This request selects the enabled Heimdall application and creates a public browser client using Authorization Code, PKCE, and token_endpoint_auth_method=none, without a Client Secret. applicationId must identify a published application with exactly one enabled default tenant-admin role.",
          "TenantUserDto currently declares administrator.tenantId as required, while the service overwrites it with the generated tenant ID. Keep the empty string for compatibility with the current DTO. BusinessScope tenantId likewise does not determine ownership; the service writes the generated tenant ID.",
        ],
        code: { language: "http", value: onboardingRequest },
        note: "The administrator password must contain 12–128 characters; keySize accepts only 2048, 3072, or 4096. Never add clientSecret to a public SPA.",
      },
      {
        id: "transaction",
        title: "What happens in the transaction",
        bullets: [
          "Validate the header, operator, tenant name, client, RSA size, and administrator fields, then check for a completed idempotent request before entering the transaction.",
          "Create the tenant as Disabled, seed built-in OIDC scopes, copy tenant-scope role and permission templates from the selected application, and bind TenantApplication.",
          "Write the tenant profile and, when supplied, an enabled non-system business scope.",
          "Generate the server-side ClientId, write the OIDC client, and merge the business scope into the client scope lists.",
          "Generate an RSA key, encrypt its private key, activate the first signing key immediately, and write the onboarding_activate key log.",
          "Create the administrator and username/email login records, hash the password, and assign the selected application's single enabled default tenant-admin role.",
          "When enableTenant=true, enable the tenant, then write the idempotent result record in the same transaction. A failure in any later write rolls back the preceding database writes.",
        ],
      },
      {
        id: "response",
        title: "Response and secret boundaries",
        paragraphs: [
          "The successful data payload contains requestId, tenant, profile, client, key, administrator, and enabled. The server generates the tenant ID, ClientId, key ID/kid, and administrator ID. The persisted idempotency snapshot restores subsequent matching requests.",
        ],
        bullets: [
          "The client response model excludes ClientSecret with JsonIgnore. A public SPA should neither submit nor receive one. Even if a confidential client submits a secret, the service stores only a hash and onboarding does not echo the plaintext.",
          "The signing private key is encrypted through Asgard Encryption before persistence and excluded with JsonIgnore; the response exposes only public verification material and runtime state.",
          "The administrator password is used to produce login hashes and is absent from TenantUserVo.",
          "The response profile clears LogoBase64. Logo metadata may be returned, but do not treat the Base64 response as an object-storage delivery contract.",
        ],
      },
      {
        id: "verification",
        title: "Verify management and protocol surfaces",
        paragraphs: [
          "Read tenant.id, client.clientId, and key.kid from the onboarding response, then verify both management resources and public OIDC metadata. Management reads have their own permissions, such as tenant.read, oidc.client.manage, oidc.key.manage, and tenant.user.read; onboarding permission does not imply every follow-up read permission.",
        ],
        code: { language: "http", value: verificationRequests },
        bullets: [
          "Discovery issuer and public endpoints must use the expected external HTTPS origin; a 200 response alone is insufficient.",
          "JWKS must contain the onboarding response kid and expose only public verification material.",
          "Run Authorization Code + PKCE from the SPA, then call the target API with the Access Token and verify iss, aud, lifetime, and business scope.",
          "Host API CORS and OIDC client allowedCorsOrigins are separate boundaries; validate both against the real browser Origin.",
        ],
      },
      {
        id: "retry",
        title: "Errors and safe retries",
        bullets: [
          "Local validation failure: correct the request and use a new Idempotency-Key because the content changed.",
          "Timeout, disconnect, or lost response: replay the exact request with the original key; a committed operation restores its snapshot.",
          "Same key with different content: stop automatic retries and inspect key persistence and request serialization. Do not assume a particular HTTP conflict status.",
          "Tenant-name, scope, or other uniqueness conflict: choose a new business identifier and new key. The transaction should leave no partially provisioned tenant.",
          "Protocol verification failure after a response: do not blindly rerun onboarding. Retain requestId, tenantId, and safe logs, then inspect issuer, proxy scheme, CORS, client settings, and key state.",
        ],
      },
      {
        id: "operations",
        title: "Production operations checklist",
        bullets: [
          "Before rollout, confirm the database contains every table, index, and seed dependency used by onboarding, especially the unique index on tenant_onboarding_request. The 5.1.2 release still provides no complete baseline SQL that proves an empty PostgreSQL bootstrap.",
          "With oidc.bootstrap.auto_sync_schema=false, do not expect runtime schema creation to fill gaps. Validate migrations against the target version and backup policy first.",
          "Keep the production Asgard Encryption key stable, recoverable, and managed in a secret store; otherwise newly generated OIDC private keys may become undecryptable.",
          "Monitor failure rate, transaction duration, idempotent replays, unique-constraint failures, and key-generation latency. Log requestId and generated resource IDs while redacting tokens, passwords, private keys, and sensitive body fields.",
          "Include onboarding in backup/restore, disaster recovery, permission review, and key-rotation runbooks. Retire the one-time bootstrap password and configure MFA according to organizational policy.",
        ],
      },
      {
        id: "preview-boundary",
        title: "Boundary between onboarding and other released capabilities",
        paragraphs: [
          "MCP, identity.subject.invalidated Webhook, subject invalidation, Backend Directory, and the security-event lifecycle have been released since 5.1.2. Version 5.3.19 separately adds Application-domain resource authorization, tenant-application binding, and role-template copying to onboarding.",
          "MCP and Webhook capabilities remain separate from onboarding. Apply the 20260720 Application-domain migrations in their reviewed precheck → migrate → postcheck → cleanup order.",
          "The v5.3.19 tag and current commit are both 0032070, with no additional HEAD-only onboarding delta. Re-audit any later tag that changes the contract.",
        ],
      },
    ],
  },
];
