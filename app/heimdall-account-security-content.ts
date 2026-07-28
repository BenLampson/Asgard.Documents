import type { DocPage } from "./content";

const profileRequest = `GET /api/account/me HTTP/1.1
Host: id.example.com
Authorization: Bearer <user-access-token>`;

const passwordRequest = `POST /api/account/me/password HTTP/1.1
Host: id.example.com
Authorization: Bearer <user-access-token>
Content-Type: application/json

{
  "currentPassword": "<current-password>",
  "newPassword": "<new-12-to-128-character-password>",
  "confirmPassword": "<same-new-password>"
}`;

const totpRequests = `GET  /api/account/me/totp
POST /api/account/me/totp/provision
POST /api/account/me/totp/confirm
     { "code": "123456" }
POST /api/account/me/totp/disable
     { "code": "123456" }`;

const recoveryCodeRequests = `GET  /api/account/me/mfa/recovery-codes
POST /api/account/me/mfa/recovery-codes/rotate
     { "code": "123456" }`;

const passkeyRequests = `GET    /api/account/me/passkeys
POST   /api/account/me/passkeys/registration/options
POST   /api/account/me/passkeys/registration/complete
DELETE /api/account/me/passkeys/{id}`;

const selfSessionRequests = `GET  /api/account/me/sessions
POST /api/account/me/sessions/{sessionId}/revoke
POST /api/account/me/sessions/revoke-others`;

const tenantSessionRequests = `GET  /api/tenants/{tenantId}/active-sessions?subjectId={subjectId}&clientId={clientId}
POST /api/tenants/{tenantId}/active-sessions/{sessionId}/revoke?subjectId={subjectId}
POST /api/tenants/{tenantId}/active-sessions/revoke-matching?subjectId={subjectId}&clientId={clientId}`;

export const zhHeimdallAccountSecurityDocs: DocPage[] = [
  {
    slug: "heimdall-account-security-sessions",
    group: "账户安全",
    eyebrow: "HEIMDALL 5.3.19 · ACCOUNT SECURITY",
    title: "账户安全与会话治理",
    description: "管理本人密码、TOTP、恢复码、Passkey 与设备会话，并安全执行租户级会话撤销。",
    sections: [
      {
        id: "contract",
        title: "5.3.19 当前发布合同",
        paragraphs: [
          "本页以 Heimdall v5.3.19 / commit 0032070 的 CurrentAccountController、PasskeyManagementController、TenantActiveSessionController、对应 Services、DTO/VO 与测试为当前权威。账户安全与会话接口自 5.1.2 引入后，在 5.3.19 范围内未发生合同变化；本人接口同时支持平台用户与租户用户，但身份归属和会话查询始终由服务端 Claims 与持久化记录决定。",
          "所有 API 凭据都使用 Access Token；ID Token 不能调用这些接口。浏览器 UI 的按钮隐藏不能替代后端 [Authorize]、本人资源归属或租户管理权限。",
        ],
      },
      {
        id: "profile",
        title: "读取当前账户资料",
        paragraphs: [
          "GET /api/account/me 返回当前业务账户的 subjectId、userId、tenantId、name、email、phone 与 isTenantUser。平台用户 tenantId 为空；租户用户还会校验数据库用户确实属于 Token 中的 tenant_id。",
          "这个接口适合账户中心展示。OIDC /userinfo 仍只承担标准资料边界，不能代替当前账户 API，也不能被当作完整角色、权限和 Scope 快照。",
        ],
        code: { language: "http", value: profileRequest },
      },
      {
        id: "password",
        title: "修改密码并撤销既有授权",
        paragraphs: [
          "修改密码需要验证任一启用的用户名、邮箱或手机号密码凭据。新密码长度必须为 12–128、两次输入一致且不能等于当前密码。服务用 IPasswordHasher 生成不可逆哈希，并把该账户的全部密码型登录凭据更新为同一新哈希。",
          "5.1.2 在写入新密码前按 subject 写撤销记录并撤销已持久化的 Access/Refresh Token，成功后 Controller 还会退出当前 Heimdall Cookie。源码没有把撤销与全部凭据更新包进一个显式数据库事务；若更新阶段失败，不要假设此前撤销会自动回滚，应让用户重新登录并由运维检查状态。",
        ],
        code: { language: "http", value: passwordRequest },
        note: "明文 currentPassword/newPassword/confirmPassword 只能存在于 TLS 请求内，不能进入日志、Trace、前端遥测、错误上报或提示词。",
      },
      {
        id: "totp",
        title: "绑定、确认与禁用 TOTP",
        paragraphs: [
          "先读取状态，再调用 provision。provision 生成新的 20 字节 Secret，返回 otpauth URI 与二维码 data URL，同时把 Secret 通过 Asgard Encryption 加密后保存为 Disabled/pending_confirmation；只有 confirm 的动态码通过后才正式启用。已启用的绑定不能被 provision 静默覆盖，必须先验证当前 TOTP 并禁用。",
          "clean 实现使用 30 秒步长、6 位码、前后各一个时间窗，并有 TOTP replay protection。禁用时先验证当前码，然后禁用绑定并撤销该账户全部恢复码。",
        ],
        code: { language: "http", value: totpRequests },
        note: "otpauth URI 和二维码包含 TOTP Secret，只能在绑定页短暂显示。不要缓存、截图上传、记录或写入客服工单。Asgard Encryption 密钥必须稳定、受 Secret Manager 管理并可恢复。",
      },
      {
        id: "recovery-codes",
        title: "一次性 MFA 恢复码",
        paragraphs: [
          "轮换恢复码前必须通过当前 TOTP。Heimdall 每次生成 10 个、每个来自 10 个随机字节的恢复码，替换旧批次，并只在该次响应返回明文。数据库保存标准化代码的 SHA-256 摘要；登录成功使用一个恢复码后会原子消费，不能再次使用。",
          "GET 状态接口只返回 remainingCount/available，不回显代码。禁用 TOTP 会撤销全部恢复码；再次启用 TOTP 后应生成并离线保存新批次。",
        ],
        code: { language: "http", value: recoveryCodeRequests },
        bullets: [
          "让用户在离线密码管理器或受控保险库中保存代码，并在确认保存后从页面内存清除。",
          "不要用低熵密码哈希思路替换当前高熵恢复码摘要；也不要在日志中记录明文或摘要。",
          "监控剩余数量，并在接近耗尽时提醒轮换；轮换会立即使旧批次失效。",
        ],
      },
      {
        id: "passkeys",
        title: "用最近认证保护 Passkey 注册",
        paragraphs: [
          "Passkey 列表只返回本人凭据摘要：id、name、AAGUID、备份能力/状态、最近使用与创建时间。开始注册要求 Access Token 的 auth_time 距当前不超过 10 分钟；缺失或过期时返回 recent_authentication_required，客户端应完成真正重新登录后再试，而不是刷新旧 Token。",
          "registration/options 创建 32 字节随机 transactionId，注册事务缓存 5 分钟并在 complete 时通过分布式锁一次性取走。WebAuthn 要求 user verification，attestation preference 为 none，名称长度 1–128，complete 请求体上限 256 KiB。生产环境必须配置固定 HTTPS oidc.issuer。",
        ],
        code: { language: "http", value: passkeyRequests },
        bullets: [
          "registration/complete 必须携带 options 返回的 transactionId、用户可识别名称与浏览器 Attestation。",
          "事务必须属于同一平台/租户用户；过期、重复消费或跨用户提交都会失败。",
          "删除只允许当前所有者的凭据。当前 delete 没有单独的 recent-auth 检查，产品可在前端增加确认，但不能把 UI 确认描述为后端强制保障。",
          "Passkey Controller 返回普通 JSON/HTTP 结果，不使用 CurrentAccountController 的 Asgard Response<T> 壳；共享客户端要分别处理。",
        ],
      },
      {
        id: "sessions",
        title: "本人设备会话",
        paragraphs: [
          "Heimdall 在 Token 签发/续期路径登记或 touch 活动会话。列表只返回当前 subject 下未撤销且未过期的记录，并按 lastActivityAt 倒序。字段包含 sessionId、clientId、认证方法、首次/最近时间、到期、最近 IP、解释性设备摘要与 isCurrent。DeviceSummary 只从 User-Agent 推断浏览器/系统，不是稳定设备指纹。",
          "撤销单个会话会严格校验它属于当前 subject；若撤销当前 sid，Controller 同时退出 Heimdall Cookie。revoke-others 要求当前 Token 有 sid，并保留当前会话。",
        ],
        code: { language: "http", value: selfSessionRequests },
        note: "lastActivityAt 表示 ActiveSessionService 被登记或 touch 的时间，不应被宣传为每一次业务 API 请求的完整活动审计。反向代理未正确传递并信任来源信息时，IpAddress 也可能只是代理地址。",
      },
      {
        id: "tenant-admin",
        title: "租户管理员会话治理",
        paragraphs: [
          "租户会话读取允许 platform.admin、platform.authorization.read、tenant.authorization.manage 或 tenant.security.manage；撤销改用 platform.authorization.revoke 或相同两项租户工作区权限。Controller 通过 ITenantResourceAccessGuard 强制租户身份只能访问自身 tenant_id，平台身份必须携带显式平台权限。管理员可以按 subjectId/clientId 查询最多 500 个未撤销、未过期会话，撤销单个会话，或按筛选条件批量撤销。",
        ],
        code: { language: "http", value: tenantSessionRequests },
        bullets: [
          "单会话撤销可同时传 subjectId，防止误撤销同租户内另一个主体的会话。",
          "revoke-matching 不传 subjectId 和 clientId 会撤销该租户全部活动会话；管理 UI 必须显示作用域、数量预览与高风险确认。",
          "批量操作逐会话执行，不是一个已证明的全有或全无事务；中途失败时重新查询并审计剩余会话。",
          "平台用户使用空 tenantId 的本人接口；TenantActiveSessionController 只面向显式租户工作区。",
        ],
      },
      {
        id: "revocation",
        title: "JWT 离线撤销边界",
        paragraphs: [
          "5.1.2 的会话撤销会写 OidcSubjectSessionRevocationEntity，并将该 session 的 Access Token、Refresh Token、Authorization、Authorization Code、Device Code 与 Active Session 标为撤销。密码变更的 subject 撤销会写 subject watermark，并标记该主体已有 Access/Refresh Token；租户主体失效路径还级联 Authorization、Code、Device Code、Consent 与活动会话。Heimdall 自身的在线校验路径会读取这些持久化状态。",
          "外部 Asgard API 的普通 JwtBearer + Discovery/JWKS 只离线验证签名、issuer、audience 与有效期，不会每次回查 Heimdall 数据库。因此撤销、密码变更或退出后，已经签发的 JWT 仍可能在外部 API 有效到 exp。使用短 Access Token TTL，并按架构增加 BFF/网关在线检查、可用的 introspection 适配或 deny-list；不要宣称 JWKS 会即时传播撤销。",
        ],
        bullets: [
          "刷新失败或 API 401：清除本地 OIDC 状态并重新登录，最多做一次受控续期，不要循环。",
          "API 403：是已认证但权限不足，不应通过反复刷新 Token 修复。",
          "资源 API 永远校验 Access Token；不要改用 ID Token 绕过撤销设计。",
        ],
      },
      {
        id: "audit-diagnostics",
        title: "审计与诊断",
        bullets: [
          "会话撤销记录 identity.session.revoked 安全事件，包含 reason 与 operatorId；恢复码轮换/撤销为 low，成功使用为 high，事件不含代码明文或摘要。",
          "5.1.2 的密码修改有结构化应用日志，但未看到独立 password.changed 安全事件；Passkey 管理创建/删除也未看到对应管理事件。不要把缺失事件描述成已审计。",
          "401/当前账户失败：检查 Access Token、sub、user_id、tenant_id 与 sid；平台身份 tenant_id 为空是合法状态。",
          "密码失败：区分当前密码错误、禁用凭据、12–128 长度、确认不一致和更新部分失败；任何日志都不得记录输入值。",
          "TOTP 失败：检查服务器与认证器时钟、旧绑定状态、replay protection 与加密密钥；不要扩大校验窗口作为首选修复。",
          "Passkey 403：检查 auth_time 是否缺失/超过 10 分钟，以及 reauthentication 是否真正产生新认证时间；生产同时检查 HTTPS issuer、RP ID/Origin 与 5 分钟事务。",
          "会话看不到或 IP 错误：确认 Token 签发路径包含 sid、会话尚未到期、代理转发配置正确，并理解列表不是全量请求审计。",
        ],
      },
      {
        id: "acceptance",
        title: "上线验收矩阵",
        bullets: [
          "分别用平台用户和租户用户读取 profile，验证 tenantId/isTenantUser 与数据库归属。",
          "覆盖密码错误、策略失败、成功更新全部登录凭据、当前 Cookie 退出、Refresh Token 失效与外部 JWT 延迟失效。",
          "覆盖 TOTP provision 未启用、confirm、重放拒绝、已启用禁止覆盖、禁用及恢复码同步撤销。",
          "覆盖恢复码只显示一次、旧批次轮换失效、单码一次消费、剩余数量与安全事件不泄露材料。",
          "覆盖 Passkey stale/missing/recent auth_time、5 分钟事务、重复/跨用户 complete、256 KiB 限制、列表与本人删除。",
          "覆盖本人单会话、当前会话、revoke-others、跨 subject 拒绝；管理员按 subject/client、空筛选全租户警告、部分失败后重查。",
          "用一个外部资源 API 验证撤销前 200、错误 Token 401、权限不足 403，并明确测量 JWT 在离线验证路径的剩余有效窗口。",
        ],
      },
      {
        id: "release-invalidation-boundary",
        title: "5.1.2 主体失效与 Webhook 边界",
        paragraphs: [
          "5.1.2 已发布租户用户禁用、删除和管理员 subject revoke 的统一失效路径：同一 FreeSql 事务写主体撤销水位，撤销 Access/Refresh Token、Authorization、Authorization Code、Device Code 与活动会话，软删除 Consent，并创建 identity.subject.invalidated Outbox 与每个启用订阅的 Delivery。无订阅时 Outbox 记录为 no_subscribers。",
          "主体有效性检查覆盖平台与租户用户：平台用户必须存在并至少保留一个启用且未删除的 Username、Email 或 Phone 凭据；租户用户还必须未删除、有启用凭据且不晚于 subject/session 撤销水位。authorize/consent/code/refresh/device exchange 会复查；旧 Cookie 会退出并重新 Challenge 或返回 login_required，交换路径返回 invalid_grant。重新启用不会复活水位之前的 Cookie 或授权。",
          "密码登录只接受 Username、Email 或 Phone；缺省 loginType 按该固定顺序查找，其他显式类型失败。登录记录必须关联存在且启用的业务用户，不再用孤立 login-info id 作为 subject。",
          "Webhook 是异步外部通知，不是外部资源 API 的同步撤销协议。事务提交只证明 Outbox/Delivery 已持久化；最终投递仍受端点校验、HMAC、超时、租约、指数退避和 max attempts 约束。普通密码变更与会话级 revoke 走 OIDC subject/session 撤销路径，并不自动创建租户 identity.subject.invalidated Webhook；不要扩大触发矩阵。",
        ],
      },
    ],
  },
];

export const enHeimdallAccountSecurityDocs: DocPage[] = [
  {
    slug: "heimdall-account-security-sessions",
    group: "Account Security",
    eyebrow: "HEIMDALL 5.3.19 · ACCOUNT SECURITY",
    title: "Account security and session governance",
    description: "Manage your password, TOTP, recovery codes, passkeys, and device sessions, including safe tenant-wide revocation.",
    sections: [
      {
        id: "contract",
        title: "Current 5.3.19 release contract",
        paragraphs: [
          "This page treats the CurrentAccountController, PasskeyManagementController, TenantActiveSessionController, related services, DTO/VO types, and tests at Heimdall v5.3.19 / commit 0032070 as current authority. The account-security and session APIs introduced in 5.1.2 have no contract change in the 5.3.19 scope. Self-service supports platform and tenant users, while server claims and persisted ownership determine account and session scope.",
          "Every API call uses an Access Token; an ID Token cannot authenticate these endpoints. Hidden UI controls never replace backend [Authorize], self-resource ownership, or tenant-management permission checks.",
        ],
      },
      {
        id: "profile",
        title: "Read the current account profile",
        paragraphs: [
          "GET /api/account/me returns subjectId, userId, tenantId, name, email, phone, and isTenantUser for the current business account. A platform user has no tenantId. For a tenant user, the service verifies that the database user belongs to the token tenant_id.",
          "Use this endpoint for the account center. OIDC /userinfo retains its standard-profile boundary and does not replace this API or provide a complete roles, permissions, and scopes snapshot.",
        ],
        code: { language: "http", value: profileRequest },
      },
      {
        id: "password",
        title: "Change the password and revoke existing authorization",
        paragraphs: [
          "Password change verifies an enabled username, email, or phone password credential. The new value must contain 12–128 characters, match confirmation, and differ from the current password. IPasswordHasher produces an irreversible hash, and every password-style login credential for the account receives that hash.",
          "Version 5.1.2 writes a subject revocation and revokes persisted Access/Refresh Tokens before updating the password. On success the controller also signs out the current Heimdall cookie. Source does not wrap revocation plus every credential update in one explicit database transaction. If the update fails, do not assume the earlier revocation rolled back; require reauthentication and inspect state operationally.",
        ],
        code: { language: "http", value: passwordRequest },
        note: "Plaintext currentPassword, newPassword, and confirmPassword belong only in the TLS request. Never put them in logs, traces, frontend telemetry, error reports, or prompts.",
      },
      {
        id: "totp",
        title: "Provision, confirm, and disable TOTP",
        paragraphs: [
          "Read status before provision. Provision generates a 20-byte secret, returns an otpauth URI and QR-code data URL, and stores the secret encrypted through Asgard Encryption in a Disabled/pending_confirmation record. Only a successful confirm enables it. An enabled binding cannot be silently overwritten; verify and disable it first.",
          "The clean implementation uses a 30-second step, six digits, one adjacent step on either side, and replay protection. Disable first verifies the current code, then disables TOTP and revokes every recovery code for that account.",
        ],
        code: { language: "http", value: totpRequests },
        note: "The otpauth URI and QR code contain the TOTP secret and should appear only briefly during enrollment. Never cache, upload, log, or attach them to support tickets. Keep the Asgard Encryption key stable, recoverable, and managed by a secret store.",
      },
      {
        id: "recovery-codes",
        title: "Single-use MFA recovery codes",
        paragraphs: [
          "Rotation requires the current TOTP. Heimdall creates ten codes from ten random bytes each, replaces the old batch, and returns plaintext only in that response. Persistence stores SHA-256 digests of normalized high-entropy codes. A successful login consumes one atomically, so it cannot be reused.",
          "The status API returns only remainingCount/available. Disabling TOTP revokes every recovery code; after re-enabling TOTP, generate and store a new batch offline.",
        ],
        code: { language: "http", value: recoveryCodeRequests },
        bullets: [
          "Ask users to store codes in an offline password manager or controlled vault and clear them from page memory after confirmation.",
          "Do not replace the current high-entropy digest design with low-entropy password assumptions, and never log plaintext or digest values.",
          "Monitor the remaining count and prompt rotation before exhaustion. Rotation invalidates the old batch immediately.",
        ],
      },
      {
        id: "passkeys",
        title: "Protect passkey enrollment with recent authentication",
        paragraphs: [
          "The passkey list exposes only an owned credential summary: id, name, AAGUID, backup eligibility/state, last use, and creation time. Starting enrollment requires access-token auth_time no more than ten minutes old. A missing or stale value returns recent_authentication_required; perform genuine reauthentication instead of merely refreshing the old token.",
          "registration/options creates a random 32-byte transactionId. The registration transaction lives in cache for five minutes and is consumed once under a distributed lock during complete. WebAuthn requires user verification, uses attestation preference none, accepts names of 1–128 characters, and caps the complete body at 256 KiB. Production requires a fixed HTTPS oidc.issuer.",
        ],
        code: { language: "http", value: passkeyRequests },
        bullets: [
          "registration/complete sends the options transactionId, a recognizable name, and the browser attestation.",
          "The transaction must belong to the same platform/tenant user. Expired, repeated, or cross-user completion fails.",
          "Delete is owner-scoped. The current delete endpoint has no separate recent-auth check; a frontend confirmation may improve UX but is not an enforced backend guarantee.",
          "The passkey controller returns ordinary JSON/HTTP results rather than the Asgard Response<T> envelope used by CurrentAccountController, so the shared client must handle both.",
        ],
      },
      {
        id: "sessions",
        title: "Your device sessions",
        paragraphs: [
          "Heimdall registers or touches an active session during token issue/renewal paths. The list includes only unrevoked, unexpired records for the current subject, ordered by lastActivityAt. Fields include sessionId, clientId, authentication methods, first/last timestamps, expiry, recent IP, an explanatory device summary, and isCurrent. DeviceSummary is inferred from User-Agent and is not a stable fingerprint.",
          "Single-session revoke verifies ownership by the current subject. Revoking the current sid also signs out the Heimdall cookie. revoke-others requires a current sid and preserves that session.",
        ],
        code: { language: "http", value: selfSessionRequests },
        note: "lastActivityAt records when ActiveSessionService registered or touched the session; do not advertise it as a complete audit of every business API request. Without correct trusted proxy forwarding, IpAddress may be the proxy address.",
      },
      {
        id: "tenant-admin",
        title: "Tenant-administrator session governance",
        paragraphs: [
          "Tenant session reads allow platform.admin, platform.authorization.read, tenant.authorization.manage, or tenant.security.manage; revocation uses platform.authorization.revoke or the same two tenant-workspace permissions. ITenantResourceAccessGuard restricts a tenant identity to its own tenant_id, while a platform identity must carry an explicit platform permission. An administrator can query up to 500 active unexpired sessions by subjectId/clientId, revoke one session, or revoke every session matching filters.",
        ],
        code: { language: "http", value: tenantSessionRequests },
        bullets: [
          "Single-session revoke can include subjectId to prevent targeting another subject's session by mistake.",
          "Calling revoke-matching without subjectId and clientId revokes every active session in the tenant. Management UI must display scope, preview the count, and require high-risk confirmation.",
          "Bulk processing revokes sessions one at a time and is not proven as an all-or-nothing transaction. Re-query and audit remaining sessions after a partial failure.",
          "Platform users use self-service with an empty tenantId; TenantActiveSessionController is for an explicit tenant workspace.",
        ],
      },
      {
        id: "revocation",
        title: "Offline JWT revocation boundary",
        paragraphs: [
          "Version 5.1.2 session revocation writes OidcSubjectSessionRevocationEntity and marks the session's Access Tokens, Refresh Tokens, Authorization, Authorization Codes, Device Codes, and Active Session revoked. Password-change subject revocation writes a subject watermark and marks existing Access/Refresh Tokens; tenant subject invalidation additionally cascades Authorizations, Codes, Device Codes, Consent, and active sessions. Heimdall's own online validation reads these persisted states.",
          "A normal external Asgard API using JwtBearer plus Discovery/JWKS validates signature, issuer, audience, and lifetime offline and does not query Heimdall on every request. A previously issued JWT may therefore remain valid at that API until exp after revoke, password change, or logout. Use short Access Token TTLs plus an architecture-appropriate BFF, gateway online check, usable introspection adapter, or deny list. Never claim JWKS propagates revocation immediately.",
        ],
        bullets: [
          "Refresh failure or API 401: clear local OIDC state and reauthenticate after at most one controlled renewal attempt.",
          "API 403 means authenticated but unauthorized; repeated token refresh is not a fix.",
          "Resource APIs always validate Access Tokens. Do not switch to an ID Token to evade the revocation design.",
        ],
      },
      {
        id: "audit-diagnostics",
        title: "Audit and diagnostics",
        bullets: [
          "Session revoke records an identity.session.revoked security event with reason and operatorId. Recovery-code rotation/revoke is low severity and successful use is high severity; events contain neither plaintext nor digest.",
          "Version 5.1.2 has structured application logging for password change but no dedicated password.changed security event found in source. Passkey management create/delete likewise has no corresponding management event. Do not describe absent events as audited.",
          "401/current-account failure: inspect the Access Token, sub, user_id, tenant_id, and sid. An empty tenant_id is valid for platform identity.",
          "Password failure: distinguish current-password mismatch, disabled credential, 12–128 policy, confirmation mismatch, and partial update failure without logging any input value.",
          "TOTP failure: check server/authenticator clocks, binding state, replay protection, and encryption key. Do not widen the verification window as the first fix.",
          "Passkey 403: inspect missing/stale auth_time and whether reauthentication really produced a new authentication time. In production also verify HTTPS issuer, RP ID/Origin, and the five-minute transaction.",
          "Missing sessions or wrong IP: confirm token issuance includes sid, the session is unexpired, proxy forwarding is correct, and the list is not a complete request audit.",
        ],
      },
      {
        id: "acceptance",
        title: "Go-live acceptance matrix",
        bullets: [
          "Read profile as both a platform and tenant user and verify tenantId/isTenantUser against database ownership.",
          "Cover wrong password, policy failures, successful update of every login credential, current-cookie sign-out, Refresh Token rejection, and delayed external-JWT invalidation.",
          "Cover TOTP provision-before-enable, confirm, replay rejection, no overwrite while enabled, disable, and recovery-code revocation.",
          "Cover one-time recovery-code display, old-batch invalidation, one-time consumption, remaining count, and events that leak no material.",
          "Cover passkey stale/missing/recent auth_time, five-minute transaction, repeated/cross-user complete, 256-KiB limit, list, and owner delete.",
          "Cover self single/current session, revoke-others, and cross-subject rejection; for administrators cover subject/client filters, empty-filter tenant-wide warning, and re-query after partial failure.",
          "Use an external resource API to verify 200 before revoke, 401 for an invalid token, 403 for insufficient permission, and explicitly measure the remaining JWT window on the offline-validation path.",
        ],
      },
      {
        id: "release-invalidation-boundary",
        title: "5.1.2 subject invalidation and webhook boundary",
        paragraphs: [
          "Version 5.1.2 ships a unified invalidation path for tenant-user disable, delete, and administrator subject revoke. One FreeSql transaction writes the subject revocation watermark; revokes Access/Refresh Tokens, Authorization, Authorization Codes, Device Codes, and active sessions; soft-deletes Consent; and creates the identity.subject.invalidated Outbox plus a Delivery for every enabled subscription. With no subscriber, the Outbox is retained as no_subscribers.",
          "Subject-state checks cover platform and tenant users. A platform user must exist and retain an enabled, undeleted Username, Email, or Phone credential. A tenant user must also be undeleted, have an enabled credential, and remain newer than subject/session revocation watermarks. Authorize, consent, code, refresh, and device exchange recheck state. A stale cookie is signed out and challenged or receives login_required; exchanges return invalid_grant. Re-enabling does not revive pre-watermark cookies or authorizations.",
          "Password login accepts only Username, Email, or Phone. An omitted loginType searches that fixed order; another explicit type fails. The login record must link to an existing enabled business user and no longer supplies an orphan login-info id as subject.",
          "A webhook is asynchronous external notification, not synchronous revocation at a resource API. Transaction commit proves only that Outbox/Delivery records are durable; final delivery remains subject to endpoint validation, HMAC, timeout, leases, exponential backoff, and max attempts. Ordinary password change and session-level revoke use OIDC subject/session revocation but do not automatically emit the tenant identity.subject.invalidated webhook; do not broaden the trigger matrix.",
        ],
      },
    ],
  },
];
