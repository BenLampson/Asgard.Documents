import type { DocPage } from "./content";

const clientConfiguration = `POST /api/TenantOidcClient HTTP/1.1
Host: id.example.com
Authorization: Bearer <management-access-token>
Content-Type: application/json

{
  "tenantId": "<tenant-id>",
  "clientName": "warehouse-cli",
  "clientDescription": "Warehouse command-line client",
  "clientType": "public",
  "applicationType": "native",
  "grantTypes": "urn:ietf:params:oauth:grant-type:device_code,refresh_token",
  "scopes": "openid,profile,email,offline_access,orders.read",
  "defaultScopes": "openid,profile,email,orders.read",
  "tokenEndpointAuthMethods": "none",
  "allowOfflineAccess": true,
  "allowDeviceCode": true,
  "deviceCodeLifetime": 600,
  "deviceCodePollingInterval": 5,
  "accessTokenFormat": "jwt",
  "allowAccessTokensViaBrowser": false,
  "status": 1
}`;

const authorizationRequest = `POST /<tenant-id>/connect/device_authorization HTTP/1.1
Host: id.example.com
Content-Type: application/x-www-form-urlencoded

client_id=<client-id>&scope=openid%20profile%20email%20offline_access%20orders.read`;

const authorizationResponse = `{
  "device_code": "<high-entropy-device-code>",
  "user_code": "ABCD-1234",
  "verification_uri": "https://id.example.com/device.html",
  "verification_uri_complete": "https://id.example.com/device.html?user_code=ABCD-1234",
  "expires_in": 600,
  "interval": 5
}`;

const tokenPollingRequest = `POST /<tenant-id>/connect/token HTTP/1.1
Host: id.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
&device_code=<high-entropy-device-code>
&client_id=<client-id>`;

const tokenSuccessResponse = `{
  "access_token": "<access-token>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email offline_access orders.read",
  "id_token": "<id-token>",
  "refresh_token": "<refresh-token>"
}`;

const discoveryChecks = `GET /.well-known/openid-configuration
GET /<tenant-id>/.well-known/openid-configuration
GET /<tenant-id>/.well-known/jwks`;

export const zhHeimdallDeviceDocs: DocPage[] = [
  {
    slug: "heimdall-device-authorization",
    group: "应用接入",
    eyebrow: "HEIMDALL 5.3.19 · DEVICE FLOW",
    title: "接入 Device Authorization Grant",
    description: "让 CLI、电视与输入受限设备在另一台浏览器上完成用户授权，并安全轮询 Heimdall 获取 Access Token。",
    relatedDocs: [
      { product: "heimdall", docSlug: "heimdall-integration", label: "浏览器应用与资源 API 接入" },
      { product: "heimdall", docSlug: "heimdall-client-credentials", label: "Client Credentials 与后端服务身份" },
      { product: "heimdall", docSlug: "heimdall-token-lifecycle", label: "Token 生命周期、撤销与 Introspection" },
    ],
    sections: [
      {
        id: "contract",
        title: "5.3.19 当前发布合同",
        paragraphs: [
          "本页依据 Heimdall v5.3.19 / commit 0032070 的 TokenManagementController、IdentityTokenManagementApplicationService、协议存储、客户端 DTO 与测试编写。Device Authorization Grant 已同时存在于平台与租户协议路由，并由 Discovery 公布 device_authorization_endpoint。",
          "租户主体状态与撤销水位检查自 5.1.2 起接入设备页上下文、批准和拒绝路径，会话撤销也会撤销关联 device code。对比 v5.1.2 到 v5.3.19 的相关源码与测试，没有 Device Flow 协议合同变化。",
        ],
      },
      {
        id: "when-to-use",
        title: "什么时候使用 Device Flow",
        paragraphs: [
          "Device Flow 适合无法方便打开浏览器或输入账号密码的 CLI、电视、终端、设备与受控 Agent。设备只显示 user_code 与 verification_uri，用户在另一台可信浏览器中登录 Heimdall、核对客户端和 Scope，再批准或拒绝。",
        ],
        bullets: [
          "普通浏览器 SPA 继续使用 Authorization Code + PKCE；不要因为 Device Flow 可用就降级 SPA 登录。",
          "纯服务到服务调用使用 Client Credentials 与 BackendService 身份，不要借 Device Flow 伪装用户。",
          "设备最终用 Access Token 调 API；ID Token 只表达登录结果，不能作为 API Bearer 凭据。",
          "Device Flow 需要用户在线确认，不适合无人值守任务或批量后台作业。",
        ],
      },
      {
        id: "client",
        title: "登记 Device 客户端",
        paragraphs: [
          "租户管理员使用 /api/TenantOidcClient 创建客户端，需要 platform.admin 或 oidc.client.manage。服务端生成 clientId；设备应用必须把它当公开标识，而不是 Secret。下面示例是推荐的 public native client。",
          "GrantTypes 必须包含完整 URN urn:ietf:params:oauth:grant-type:device_code，并显式设置 allowDeviceCode=true。若要签发和后续使用 Refresh Token，还要同时允许 refresh_token、offline_access，并在请求中实际申请 offline_access。",
        ],
        code: { language: "http", value: clientConfiguration },
        note: "deviceCodeLifetime 与 deviceCodePollingInterval 当前默认分别为 600 秒和 5 秒。源码没有为这两个管理字段提供明确范围校验；生产应采用保守正值并通过目标环境测试。",
      },
      {
        id: "authorization-request",
        title: "请求 device_code 与 user_code",
        paragraphs: [
          "从当前 Authority 的 Discovery 读取 device_authorization_endpoint，不要手工把内部 Host 或 Scheme 拼进客户端。public client 只发送 client_id 与获准的 Scope，不发送 client_secret。Heimdall 会校验客户端已启用 device_code、路由租户匹配以及每个请求 Scope 都在客户端允许范围内。",
        ],
        code: { language: "http", value: authorizationRequest },
      },
      {
        id: "authorization-response",
        title: "处理授权响应",
        paragraphs: [
          "device_code 是设备随后向 Token Endpoint 轮询的高熵凭据；user_code 是给用户输入或核对的短码。客户端优先展示 verification_uri_complete，也同时展示 user_code 和基础 verification_uri，方便用户换设备输入。",
          "expires_in 与 interval 来自当前客户端配置。到期后必须重新发起流程；不要复用旧 device_code。",
        ],
        code: { language: "json", value: authorizationResponse },
        note: "不要把 device_code、Token 或完整响应写入日志、遥测、URL、二维码分析服务或提示词。user_code 也应按短期敏感数据处理。",
      },
      {
        id: "user-verification",
        title: "用户在可信浏览器中验证",
        paragraphs: [
          "Heimdall 5.1.2 返回站点根路径 /device.html。页面读取或让用户输入 user_code，再通过 /connect/device/context 展示 client_name、tenant_id、Scopes、到期时间和当前状态。user_code 会去除非字母数字字符、转为大写并规范化为带连字符的格式。",
          "批准和拒绝端点要求 Heimdall 登录 Cookie。已登录主体的 tenant_id 必须与设备客户端租户完全一致；平台客户端要求平台身份，租户客户端要求目标租户身份。对租户 Cookie，主体状态服务缺失或用户、会话、撤销水位无效都会失败关闭并清除 Cookie；旧 Cookie 不能批准设备。",
        ],
        bullets: [
          "verification_uri_complete 只负责预填代码，不能自动批准。",
          "未登录时由页面引导到 /login.html，并把设备页作为站内 returnUrl。",
          "租户不匹配时 can_approve/can_reject 为 false；API 直接操作也会拒绝。",
          "代码过期、已拒绝或已完成后不能再次批准或拒绝。",
        ],
      },
      {
        id: "polling",
        title: "按状态机轮询 Token Endpoint",
        paragraphs: [
          "设备从收到响应后开始计时，但至少等待 interval 秒再首次请求。每次使用同一 Authority、client_id 与 device_code 调用 Token Endpoint。成功后立即停止轮询，并把 Access Token 只发送给目标资源 API。",
        ],
        code: { language: "http", value: tokenPollingRequest },
        bullets: [
          "authorization_pending：用户尚未批准；继续等待至少 interval 后再试。服务器会更新最后一次有效轮询时间。",
          "slow_down：请求早于已记录的间隔；进一步延长客户端等待时间。5.1.2 返回错误但不下发新的 interval，也不自动替客户端调整节奏。",
          "access_denied：用户已拒绝；立即终止并清理 device_code。",
          "invalid_grant：device_code 未找到、已过期或不属于当前 client_id；终止并重新开始，不要无限重试。",
          "unauthorized_client / invalid_client / invalid_request / invalid_scope：属于客户端登记、认证、路由或 Scope 配置错误，修复配置后重新开始。",
          "网络或 5xx：使用有上限且带抖动的退避；不要让传输重试突破协议 interval。",
        ],
      },
      {
        id: "token-response",
        title: "使用成功响应",
        paragraphs: [
          "首次成功兑换会把 device code 标记为 Redeemed，并返回 Bearer Access Token、有效期和实际 Scope。openid 被授予且存在用户主体时还会返回 ID Token；只有 offline_access 被授予且客户端允许 refresh_token 时才会返回 Refresh Token。",
          "Access Token 的 audience 来自获准 Scope 的 Resources；若没有资源则回退为 client_id。资源 API 必须验证签名、iss、aud、生命周期与所需 Scope/权限，不能只解析 Token。",
        ],
        code: { language: "json", value: tokenSuccessResponse },
        note: "示例展示可能出现的完整字段，不表示每个请求都一定获得 ID Token 或 Refresh Token。成功后不要再次兑换同一 device_code。",
      },
      {
        id: "authority",
        title: "平台与租户 Authority 不可混用",
        paragraphs: [
          "平台客户端使用根 Discovery 与 /connect/device_authorization、/connect/token；租户客户端使用 /{tenantId}/.well-known/openid-configuration 与 /{tenantId}/connect/device_authorization、/{tenantId}/connect/token。device authorization 和 token exchange 都校验 URL 中 tenantId 与客户端真实租户一致。",
          "verification_uri 是由公开 Issuer 构造的根 /device.html。5.1.2 测试证明显式 oidc.issuer=https://idp.mudou.tech 时，即使内部请求是 http://internal-heimdall:5000，也返回外部 HTTPS 验证地址。生产必须固定正确 Issuer 并验证代理后的所有 Discovery URL。",
        ],
        code: { language: "http", value: discoveryChecks },
      },
      {
        id: "credentials",
        title: "客户端密钥边界",
        bullets: [
          "CLI、电视和分发到用户手中的设备通常无法保护长期 Secret，应登记 public client，tokenEndpointAuthMethods=none，并只发送 client_id。",
          "public client 提交任何 Client Secret 都会被拒绝；从 confidential 切换到 public 时服务会清除历史 Secret。",
          "5.1.2 也支持 confidential device client，但必须使用已登记的 client_secret_basic 或 client_secret_post，并校验当前或宽限期内的上一版哈希。只在真实受控、能保护 Secret 的执行环境选择它。",
          "不要把 Client Secret 烧录进可提取固件、桌面包、移动应用、脚本、Agent 配置示例或公开 CI 变量。Device Flow 不会让嵌入式 Secret 变安全。",
        ],
      },
      {
        id: "operations",
        title: "清理、诊断与上线验收",
        paragraphs: [
          "OidcTokenCleanupJob 默认启用并清理过期后的设备码记录。oidc.cleanup.device_code_retention_days 默认 7，batch_size 默认 1000，dry_run 默认 false；Runtime Settings 可覆盖设备码保留期、批大小与 dry-run。保留期是过期后的运维数据窗口，不是 device_code 有效期。",
        ],
        bullets: [
          "诊断 unauthorized_client：核对 grantTypes 完整 URN、allowDeviceCode、客户端状态与生成后的 clientId。",
          "诊断 invalid_scope：核对客户端允许 Scope、租户 Scope 是否存在、offline_access 是否允许，以及业务 Scope Resources。",
          "诊断 invalid_client：public client 不带 Secret；confidential client 只用一种已登记认证方法，不能同时发 Basic 和 body secret。",
          "诊断 tenant mismatch 或 login_required：从对应 Discovery 获取两个 Endpoint，确保客户端、用户 Cookie 与 URL tenantId 属于同一 Authority，并检查租户用户状态、session 与撤销水位；身份状态服务缺失时 5.1.2 会失败关闭。",
          "诊断错误 verification_uri：核对公开 oidc.issuer、TLS 终止与反向代理 Scheme；不要接受内部容器地址。",
          "监控发码数、批准/拒绝/过期比例、authorization_pending 时长、slow_down、invalid_grant、Token 成功率与 cleanup 删除量，但不记录代码和 Token。",
          "上线冒烟覆盖平台与一个租户：Discovery、发码、错误租户、用户批准与拒绝、interval/slow_down、过期、成功 Token、JWKS kid、API 200/401/403，以及 Refresh Token 有/无两种配置。",
        ],
        note: "5.1.2 测试覆盖公开 Issuer 生成的 verification_uri、平台/租户 Discovery、主体状态失败关闭、会话撤销关联 device code 以及 cleanup 行为；仍应在自己的数据库、代理、浏览器和真实设备客户端上完成端到端验收。",
      },
    ],
  },
];

export const enHeimdallDeviceDocs: DocPage[] = [
  {
    slug: "heimdall-device-authorization",
    group: "Application Integration",
    eyebrow: "HEIMDALL 5.3.19 · DEVICE FLOW",
    title: "Integrate the Device Authorization Grant",
    description: "Let CLIs, TVs, and input-constrained devices obtain an access token after the user authorizes in a separate browser.",
    relatedDocs: [
      { product: "heimdall", docSlug: "heimdall-integration", label: "Browser application and resource API integration" },
      { product: "heimdall", docSlug: "heimdall-client-credentials", label: "Client Credentials and backend-service identity" },
      { product: "heimdall", docSlug: "heimdall-token-lifecycle", label: "Token lifecycle, revocation, and introspection" },
    ],
    sections: [
      {
        id: "contract",
        title: "Current 5.3.19 release contract",
        paragraphs: [
          "This page is based on the TokenManagementController, IdentityTokenManagementApplicationService, protocol store, client DTOs, and tests at Heimdall v5.3.19 / commit 0032070. The Device Authorization Grant exists on both platform and tenant protocol routes, and Discovery publishes device_authorization_endpoint.",
          "Tenant subject-state and revocation-watermark checks have been wired into device context, approval, and denial since 5.1.2, and session revocation also revokes the related device code. Comparing the relevant source and tests from v5.1.2 through v5.3.19 shows no Device Flow protocol-contract change.",
        ],
      },
      {
        id: "when-to-use",
        title: "When to use Device Flow",
        paragraphs: [
          "Device Flow serves CLIs, TVs, terminals, appliances, and controlled agents that cannot conveniently open a browser or accept credentials. The device shows a user_code and verification_uri; the user signs in to Heimdall in another trusted browser, reviews the client and scopes, then approves or denies.",
        ],
        bullets: [
          "A normal browser SPA should continue using Authorization Code + PKCE; Device Flow is not a reason to downgrade SPA sign-in.",
          "Pure service-to-service calls use Client Credentials and BackendService identity, not Device Flow impersonation.",
          "The device calls APIs with the Access Token. An ID Token describes authentication and is not an API Bearer credential.",
          "Device Flow requires interactive user approval and does not suit unattended or batch jobs.",
        ],
      },
      {
        id: "client",
        title: "Register a device client",
        paragraphs: [
          "A tenant administrator creates the client through /api/TenantOidcClient with platform.admin or oidc.client.manage. The server generates clientId; the device treats it as a public identifier, not a secret. This example is the recommended public native client.",
          "GrantTypes must contain the full urn:ietf:params:oauth:grant-type:device_code value and allowDeviceCode must be true. To issue and later use a Refresh Token, also allow refresh_token and offline_access, and actually request offline_access.",
        ],
        code: { language: "http", value: clientConfiguration },
        note: "deviceCodeLifetime and deviceCodePollingInterval currently default to 600 and 5 seconds. The management fields have no explicit range validation in source; use conservative positive values and test the target deployment.",
      },
      {
        id: "authorization-request",
        title: "Request device_code and user_code",
        paragraphs: [
          "Read device_authorization_endpoint from the current Authority's Discovery document instead of constructing it from an internal host or scheme. A public client sends only client_id and allowed scopes, never client_secret. Heimdall checks that device_code is enabled, the route tenant matches, and every requested scope is allowed for the client.",
        ],
        code: { language: "http", value: authorizationRequest },
      },
      {
        id: "authorization-response",
        title: "Handle the authorization response",
        paragraphs: [
          "device_code is the high-entropy credential used by the device to poll the Token Endpoint. user_code is the short value the user enters or compares. Prefer showing verification_uri_complete while also displaying user_code and the base verification_uri for cross-device entry.",
          "expires_in and interval come from the current client configuration. Start a new flow after expiry; never reuse the old device_code.",
        ],
        code: { language: "json", value: authorizationResponse },
        note: "Never send device_code, tokens, or the complete response to logs, telemetry, URL analytics, QR-code services, or prompts. Treat user_code as short-lived sensitive data too.",
      },
      {
        id: "user-verification",
        title: "Verify in a trusted browser",
        paragraphs: [
          "Heimdall 5.1.2 returns the root /device.html page. It reads or prompts for user_code, then uses /connect/device/context to show client_name, tenant_id, scopes, expiry, and state. The code is normalized by removing non-alphanumeric characters, uppercasing, and inserting the display hyphen.",
          "Approve and reject require the Heimdall login cookie. The signed-in principal tenant_id must exactly match the device client tenant: a platform client requires platform identity, while a tenant client requires an identity from that tenant. For tenant cookies, a missing subject-state service or an invalid user, session, or revocation watermark fails closed and clears the cookie; an old cookie cannot approve a device.",
        ],
        bullets: [
          "verification_uri_complete only pre-fills the code; it never approves automatically.",
          "When signed out, the page links to /login.html with the device page as a local returnUrl.",
          "A tenant mismatch makes can_approve and can_reject false; direct API calls are rejected as well.",
          "An expired, rejected, or completed code cannot be approved or denied again.",
        ],
      },
      {
        id: "polling",
        title: "Poll the Token Endpoint as a state machine",
        paragraphs: [
          "Start timing when the response arrives, but wait at least interval seconds before the first request. Use the same Authority, client_id, and device_code for each Token Endpoint call. Stop immediately on success and send the Access Token only to its target resource API.",
        ],
        code: { language: "http", value: tokenPollingRequest },
        bullets: [
          "authorization_pending: the user has not approved yet; wait at least interval before retrying. The server updates the last accepted poll time.",
          "slow_down: the request arrived before the stored interval; lengthen the client-side delay. Version 5.1.2 returns the error without a new interval and does not adjust the client schedule for you.",
          "access_denied: the user rejected the request; stop and erase the device_code.",
          "invalid_grant: the device_code is missing, expired, or owned by another client_id; stop and start a new flow rather than retrying forever.",
          "unauthorized_client / invalid_client / invalid_request / invalid_scope: fix client registration, authentication, route, or scope configuration before starting again.",
          "Network or 5xx failure: use capped jittered backoff and never let transport retries violate the protocol interval.",
        ],
      },
      {
        id: "token-response",
        title: "Use the successful response",
        paragraphs: [
          "The first successful exchange marks the device code Redeemed and returns a Bearer Access Token, lifetime, and granted scopes. It also returns an ID Token when openid is granted to a user subject. A Refresh Token appears only when offline_access is granted and the client allows refresh_token.",
          "The Access Token audience comes from the granted scopes' Resources, falling back to client_id when no resource exists. The resource API must validate signature, iss, aud, lifetime, and required scope/permission rather than merely decoding the token.",
        ],
        code: { language: "json", value: tokenSuccessResponse },
        note: "The example shows all fields that may appear; it does not promise an ID Token or Refresh Token for every request. Never exchange the same device_code again after success.",
      },
      {
        id: "authority",
        title: "Do not mix platform and tenant Authorities",
        paragraphs: [
          "A platform client uses root Discovery plus /connect/device_authorization and /connect/token. A tenant client uses /{tenantId}/.well-known/openid-configuration plus /{tenantId}/connect/device_authorization and /{tenantId}/connect/token. Both device authorization and token exchange require the route tenant to match the client's stored tenant.",
          "verification_uri is root /device.html under the public issuer. A 5.1.2 test proves that explicit oidc.issuer=https://idp.mudou.tech yields the external HTTPS verification address even when the internal request is http://internal-heimdall:5000. Pin the correct issuer in production and validate every proxy-facing Discovery URL.",
        ],
        code: { language: "http", value: discoveryChecks },
      },
      {
        id: "credentials",
        title: "Client-secret boundary",
        bullets: [
          "CLIs, TVs, and devices distributed to users normally cannot protect a long-lived secret. Register a public client with tokenEndpointAuthMethods=none and send only client_id.",
          "A public client carrying any Client Secret is rejected. Switching a stored client from confidential to public also clears its historical secret.",
          "Version 5.1.2 supports confidential device clients too, but they must use an allowed client_secret_basic or client_secret_post method and validate the current or grace-period previous hash. Choose this only in a genuinely controlled execution environment that can protect the secret.",
          "Never embed a Client Secret in extractable firmware, desktop bundles, mobile apps, scripts, agent examples, or public CI variables. Device Flow does not make an embedded secret safe.",
        ],
      },
      {
        id: "operations",
        title: "Cleanup, diagnostics, and acceptance",
        paragraphs: [
          "OidcTokenCleanupJob is enabled by default and removes expired device-code records. oidc.cleanup.device_code_retention_days defaults to 7, batch_size to 1000, and dry_run to false. Runtime Settings can override device-code retention, batch size, and dry-run. Retention is an operational window after expiry, not device-code lifetime.",
        ],
        bullets: [
          "Diagnose unauthorized_client by checking the full grant-type URN, allowDeviceCode, client status, and generated clientId.",
          "Diagnose invalid_scope by checking allowed client scopes, tenant scope existence, offline_access policy, and business-scope Resources.",
          "Diagnose invalid_client by omitting a secret for public clients. Confidential clients must use exactly one allowed method, never both Basic and a body secret.",
          "Diagnose tenant mismatch or login_required by obtaining both endpoints from the matching Discovery document, aligning the client, user cookie, and URL tenantId under one Authority, then checking tenant-user state, session, and revocation watermark. Version 5.1.2 fails closed when the identity-state service is absent.",
          "Diagnose a wrong verification_uri by checking the public oidc.issuer, TLS termination, and proxy scheme. Never accept an internal container address.",
          "Monitor issuance, approve/deny/expiry ratios, authorization_pending duration, slow_down, invalid_grant, token success, and cleanup deletion counts without recording codes or tokens.",
          "Acceptance should cover the platform and one tenant: Discovery, issuance, wrong tenant, approve and deny, interval/slow_down, expiry, successful token, JWKS kid, API 200/401/403, and configurations with and without Refresh Tokens.",
        ],
        note: "The 5.1.2 tests cover public-issuer verification_uri construction, platform/tenant Discovery, subject-state fail-closed behavior, session revocation of a related device code, and cleanup. Still run end-to-end acceptance against your database, proxy, browser, and real device client.",
      },
    ],
  },
];
