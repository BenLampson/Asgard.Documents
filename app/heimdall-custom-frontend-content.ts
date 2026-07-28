import type { DocPage } from "./content";

const authorityMatrix = `Platform application
Authority:  https://id.example.com
Discovery: https://id.example.com/.well-known/openid-configuration

Tenant application
Authority:  https://id.example.com/<tenant-id>
Discovery: https://id.example.com/<tenant-id>/.well-known/openid-configuration`;

const browserClientSettings = `import { UserManager } from "oidc-client-ts";

const oidc = new UserManager({
  authority: "https://id.example.com/<tenant-id>",
  client_id: "customer-console",
  redirect_uri: "https://console.example.com/callback",
  post_logout_redirect_uri: "https://console.example.com/logout-complete",
  response_type: "code",
  scope: "openid profile email offline_access",
  automaticSilentRenew: true,
});`;

const hostedInteractionEndpoints = `GET  /api/account/login-branding?returnUrl=<local-authorize-path>
POST /api/account/login?returnUrl=<local-authorize-path>
POST /api/account/login/mfa?returnUrl=<local-authorize-path>

POST /connect/consent
POST /<tenant-id>/connect/consent`;

const consentDecision = `POST /<tenant-id>/connect/consent HTTP/1.1
Host: id.example.com
Content-Type: application/json
Cookie: Asgard.Identity=<http-only-cookie>

{
  "returnUrl": "/<tenant-id>/connect/authorize?...",
  "approved": true
}`;

const bearerRequest = `GET /api/account/me HTTP/1.1
Host: id.example.com
Authorization: Bearer <access-token>
Accept: application/json`;

const responseHandling = `if (response.status === 401) {
  // Coordinate one renewal attempt; otherwise clear local OIDC state and sign in again.
}

if (response.status === 403) {
  // The authenticated identity is not allowed. Do not refresh in a loop.
}

// OIDC endpoints may return error and error_description.
// Asgard management APIs may return code, message, and data.`;

export const zhHeimdallCustomFrontendDocs: DocPage[] = [
  {
    slug: "heimdall-custom-frontend",
    group: "应用接入",
    eyebrow: "HEIMDALL 5.3.19 · CUSTOM FRONTEND",
    title: "为 Heimdall 构建自定义前端",
    description:
      "在不接管 OIDC 安全边界的前提下，自定义应用页面、管理后台与 hosted 登录体验，并正确处理 PKCE、Cookie、Consent、Token 和租户 Authority。",
    relatedDocs: [
      { product: "heimdall", docSlug: "heimdall-integration", label: "浏览器应用与资源 API 接入" },
      {
        product: "heimdall",
        docSlug: "heimdall-account-security-sessions",
        label: "账户安全与会话治理",
      },
      { product: "heimdall", docSlug: "heimdall-deployment", label: "生产部署与反向代理" },
    ],
    sections: [
      {
        id: "contract",
        title: "5.3.19 当前发布合同",
        paragraphs: [
          "本页以 Heimdall v5.3.19 / commit 0032070 的 AuthorizationController、AccountController、LogoutController、OIDC 服务、静态页面、指南与测试为当前依据。自定义前端不能绕过服务端对 Client、Redirect URI、PKCE、Scope、租户、Consent、Token 和 Logout 的校验。",
          "浏览器友好登出错误页、登录页 UTC 时间本地化与 favicon 已进入 5.3.19 正式制品：Accept 明确包含 text/html 的无效登出导航获得隐藏协议细节的 HTML 400，程序化调用仍获得 OIDC JSON 错误。tag 与当前 commit 一致，没有 HEAD-only 前端合同。",
        ],
      },
      {
        id: "ownership",
        title: "先分清两种前端所有权",
        bullets: [
          "应用前端拥有自己的登录入口、OIDC 回调、业务页面、菜单、API Client 与登出完成页。它通过浏览器重定向进入 Heimdall，不收集 Heimdall 密码，也不签发 Token。",
          "Heimdall hosted UI 拥有 /login.html、/consent.html 和默认 /logout-complete.html。登录密码、MFA、外部身份源和 Consent 决策在 Heimdall Origin 内完成，并使用 HttpOnly 的 Asgard.Identity Cookie。",
          "5.1.2 没有可配置的外部 hosted-login/consent URL。若要完全换皮，必须在部署中替换这些静态资产或修改后端；仍应保持同源路由与服务端校验，不能把协议上下文搬到不受信任的前端参数中。",
          "菜单和按钮权限只改善体验。最终资格由 Heimdall/资源 API 的授权策略判断，目标 tenantId、subject 和业务资源归属仍由后端校验。",
        ],
      },
      {
        id: "client-registration",
        title: "登记浏览器客户端",
        paragraphs: [
          "浏览器应用是 public client：允许 authorization_code，response type 使用 code，Redirect URI 与 Post Logout Redirect URI 精确登记，不配置或下发 Client Secret。若需要 Refresh Token，还要允许 refresh_token 和 offline_access，并在请求中实际申请 offline_access。",
          "public client 在 5.1.2 中始终强制 PKCE，即使管理字段试图关闭也不能降级。授权端只接受 S256；code_challenge 是 43 字符 base64url SHA-256 摘要，Token 端 code_verifier 必须为 43–128 个允许字符并以固定时间比较。",
        ],
        code: { language: "ts", value: browserClientSettings },
        note: "示例用成熟 OIDC Client 表达边界，不要求使用特定框架。不要自己实现 Discovery、PKCE、state、nonce 或授权码兑换，除非团队能承担完整协议安全测试。",
      },
      {
        id: "authority",
        title: "平台与租户 Authority 必须成套选择",
        paragraphs: [
          "平台客户端使用根 Issuer 和无前缀 /connect/**；租户客户端使用 /{tenantId} Issuer 与 /{tenantId}/connect/**。Discovery 会公布与当前 Issuer 对应的 authorize、token、userinfo、logout 和 JWKS 地址，前端应读取它们，不能把平台端点与租户端点拼在一起。",
          "tenantId 不是前端可切换身份的请求头。客户端登记、Authority、登录 Cookie 的 tenant_id、协议路由和目标资源必须一致；服务端会拒绝跨租户会话或 route tenant mismatch。",
        ],
        code: { language: "text", value: authorityMatrix },
      },
      {
        id: "authorize-flow",
        title: "Authorize、state、nonce 与 PKCE",
        paragraphs: [
          "应用前端让 OIDC Client 生成随机 code_verifier/code_challenge、state 和 nonce，再重定向到 Discovery 的 authorization_endpoint。state 关联发起请求与回调并承载不透明的应用状态；只在客户端成功校验 state 后恢复站内页面。nonce 应由库生成并在返回 ID Token 时校验；客户端配置 requireNonce 时，Heimdall 也会拒绝缺失 nonce 的授权请求。",
          "Heimdall 先验证 client_id、response_type、response_mode、精确 Redirect URI、S256 PKCE、prompt 与 Scope，再检查 Cookie。未登录会 Challenge 到 /login.html；prompt=none 在无会话或需要 Consent 时返回 login_required/consent_required，而不是显示交互 UI。",
          "5.1.2 已发布的主体检查覆盖平台与租户用户。平台用户必须仍存在且保留启用的 Username、Email 或 Phone 凭据；租户用户还要通过删除状态与撤销水位检查。失效的旧 Cookie 会先被 SignOut；交互请求随后 Challenge，prompt=none 返回 login_required。租户用户重新启用后，撤销水位之前的 Cookie 与授权仍不会复活，必须重新登录。",
        ],
        bullets: [
          "不要把 code_verifier、state、nonce、authorization code 或 Token 写入日志、埋点、错误上报、URL 分析服务或 AI 提示词。",
          "应用 return target 只保存站内相对路径，并在回调后再次验证；拒绝绝对 URL、//host 与 /\\host，避免开放重定向。",
          "当前 Discovery 只公布 response type code；不要启用 Implicit Flow，也不要接受前端构造的 ID Token 或 Access Token。",
        ],
      },
      {
        id: "hosted-login",
        title: "Hosted 登录页与认证 Cookie",
        paragraphs: [
          "Heimdall 的 Cookie Challenge 把完整本地 Authorize 请求作为 returnUrl 送到 /login.html。页面通过 /api/account/login 提交账号密码，必要时再通过 /api/account/login/mfa 完成 MFA；成功后服务端写入 30 分钟、滑动过期、HttpOnly、SameSite=Lax 的 Asgard.Identity Cookie，并只返回通过本地路径校验的跳转。",
          "自定义应用前端不应直接调用登录 API或读取 Cookie。若替换 hosted 登录资产，仍须部署在 Heimdall Origin、保留安全 returnUrl、MFA/外部身份源流程与无缓存品牌读取，并让密码只进入 TLS 请求。服务端使用 IPasswordHasher 校验密码；浏览器、日志和前端状态不得持久化明文。",
        ],
        code: { language: "http", value: hostedInteractionEndpoints },
        note: "固定 oidc.issuer 只影响生成的公开 URL，不会把内部 HTTP 请求改成 HTTPS，也不会自动令 Cookie 变为 Secure。Cookie.SecurePolicy 是 SameAsRequest；代理必须先可靠恢复真实 Request.Scheme。",
      },
      {
        id: "consent",
        title: "Consent 仍由 Heimdall 决策",
        paragraphs: [
          "显式 Consent 或 prompt=consent 会转到 /consent.html，携带本地 returnUrl、Client 名称、tenantId 与请求 Scope 供用户核对。提交时服务端重新解析原始 Authorize 请求，再次验证 Cookie、Client、Redirect URI、PKCE、Scope、nonce、租户路由和主体；页面显示的 query 参数不是授权事实。",
          "平台决策提交到 /connect/consent；租户决策必须提交到 /{tenantId}/connect/consent。5.1.2 tag 的 consent.html 仍硬编码根 /connect/consent，因此不能把租户显式 Consent 宣称为已通过端到端验证。自定义资产应按可信协议上下文选择租户路由，并在目标环境覆盖批准、拒绝与篡改测试。",
        ],
        code: { language: "http", value: consentDecision },
        note: "Consent API 依赖 Cookie 且 5.1.2 source 未声明 Antiforgery Token。保持页面同源、使用 JSON、限制 CORS/脚本来源，并把 returnUrl 与租户路由校验留在服务端；不要把 Approved 做成可跨站触发的 GET。",
      },
      {
        id: "callback",
        title: "回调只完成协议，不直接信任页面参数",
        paragraphs: [
          "应用回调路由必须与登记 Redirect URI 完全一致。OIDC Client 校验 state，使用原始 code_verifier 向 Token Endpoint 兑换 code，校验 Issuer、签名、audience、生命周期和 nonce，然后才建立应用登录状态。失败时显示安全的 error/error_description，不回显 code、state 或 Token。",
          "登录成功后只恢复经过站内路径校验的目标。回调刷新、重复打开、授权码重放、state 不匹配、code_verifier 错误和租户 Authority 混用都应失败并清理临时状态，而不是尝试猜测或修补请求。",
        ],
      },
      {
        id: "api-session",
        title: "Cookie 与 Access Token 是两条边界",
        paragraphs: [
          "Asgard.Identity Cookie 只维持 Heimdall 的交互登录/Consent 会话，并由浏览器在 Heimdall Origin 自动携带。应用调用 /api/** 或外部资源 API 时发送 Access Token 的 Authorization: Bearer；ID Token 只描述认证结果，不能作为 API 凭据。",
          "UserInfo 返回协议资料，不是完整管理身份快照。业务账户页可使用 GET /api/account/me；前端可读取 Token 中的权限改善菜单体验，但后端权限和资源归属仍是最终安全边界。Access Token 应尽量保存在内存或短生命周期会话存储；localStorage 会扩大 XSS 窃取窗口。",
        ],
        code: { language: "http", value: bearerRequest },
      },
      {
        id: "logout",
        title: "完整退出走 End Session",
        paragraphs: [
          "调用 Discovery 的 end_session_endpoint，而不是只删除浏览器 Token。5.1.2 会验证 id_token_hint/client_id、当前主体与 sid、租户路由以及精确登记的 post_logout_redirect_uri，撤销当前 session（缺少 sid 时按 subject），清除 Heimdall Cookie，并处理可用的上游联合登出。",
          "5.3.19 会按 Accept 协商无效登出请求：浏览器明确接受 text/html 时返回不暴露协议细节的友好 HTML 400，程序化客户端继续收到 error/error_description JSON。该行为已正式发布。",
          "应用随后清理自己的 OIDC 状态并落到登记的登出完成页。无合法回跳时 Heimdall 使用 /logout-complete.html。单纯清 localStorage 会保留 Heimdall Cookie，下一次 Authorize 可能直接复用登录会话。外部 API 的离线 JWT 验证不会因 Cookie 退出或 JWKS 查询而即时获知撤销。",
        ],
      },
      {
        id: "cors-cookie-proxy",
        title: "CORS、Cookie 与反向代理分开验收",
        bullets: [
          "host.cors.defaultPolicy 控制 /api/**；OIDC 客户端 allowed_cors_origins 控制浏览器可调用的 token、userinfo、revoke、device authorization、Discovery 与 JWKS。只配置一边会出现登录成功但 API 或 Token 兑换跨域失败。",
          "Origin 只包含 scheme、host 与 port，不是完整 callback URL。使用精确 HTTPS 白名单；不要用通配符配合凭据。登录/Consent 页面优先与 Heimdall 同源。",
          "生产 oidc.issuer 必须是外部公开 HTTPS 基地址；租户 Issuer 在其后追加 tenantId。验证 Discovery 每个 URL、Redirect、form_post 与 Logout 都没有容器主机名或内部 HTTP。",
          "旧 4.1.9 的 MultiTenantCorsPolicyProvider.cs 缺失右花括号告警已在 5.1.2 tag 42208f3 修复，不能继续把它列为当前发布阻塞项。仍要分别用真实浏览器验收 OIDC CORS 与 host API CORS；源码可编译不等于目标 Origin、凭据和预检配置正确。",
          "当前 stock source 没有文档化的 KnownProxies/KnownNetworks 配置面。必须在受信任网络边界恢复 X-Forwarded-Proto，并用真实浏览器确认 Asgard.Identity Cookie 带 Secure；固定 Issuer 本身不构成证明。",
        ],
      },
      {
        id: "errors",
        title: "统一错误与有限重试",
        paragraphs: [
          "OIDC 协议端点通常返回 error/error_description 或把错误安全地带回已登记 Redirect URI；管理 API 多数使用 Asgard code/message/data 响应壳，但并非所有身份端点都采用同一壳。共享 Client 应同时按 HTTP 状态和响应形状归一化，不在页面里复制判断。",
        ],
        code: { language: "ts", value: responseHandling },
        bullets: [
          "400：请求、Redirect URI、PKCE、Scope、租户或 Consent 上下文错误；修复输入，不盲重试。",
          "401：Cookie/Access Token 缺失或失效；最多协调一次续期，失败后清理状态并重新认证。",
          "403：身份已认证但无权限或资源归属不符；不循环刷新 Token。",
          "网络或 5xx：只对幂等读取使用有上限、带抖动的退避；登录、Consent、Token 与 Logout 必须按协议状态判断是否可安全重试。",
        ],
      },
      {
        id: "security",
        title: "反钓鱼、CSRF 与开放重定向清单",
        bullets: [
          "登录页始终展示可信 Heimdall 域名、租户品牌和目标 Client；不要在应用 Origin 仿造密码框，也不要把密码转发给业务后端。",
          "对 hosted 页面使用严格 CSP、输出编码、依赖审计与最小第三方脚本。任何 XSS 都可能窃取前端 Access Token 或批准用户未理解的操作。",
          "所有 Redirect URI、Post Logout Redirect URI 和 Origin 使用精确白名单；应用 state 中的回跳目标仍须是站内路径，服务端 returnUrl 也必须保持本地路径校验。",
          "Cookie 状态变更使用 POST、同源 JSON 与服务端上下文重验；不要因 SameSite=Lax 就宣布免疫 CSRF，也不要开放带凭据的任意 CORS。",
          "Client Secret、签名密钥、Cookie、授权码、code_verifier、Access/Refresh/ID Token、密码与 MFA 材料不得进入源码、浏览器构建变量、日志、截图、错误上报或提示词。",
          "高风险操作需要后端重新认证/MFA/授权。前端确认弹窗、隐藏按钮和解析 claims 都不能替代后端 AsgardAuth 与 tenant/resource ownership 校验。",
        ],
      },
      {
        id: "acceptance",
        title: "上线验收矩阵",
        bullets: [
          "平台与一个真实租户分别检查 Discovery、JWKS、Issuer、Authorize、Token、UserInfo 和 End Session；所有 URL 必须为外部 HTTPS 且 Authority 不混用。",
          "覆盖 public client 无 Secret、S256 PKCE 成功、缺少/错误 challenge、错误 verifier、state 不匹配、nonce 校验、重复 callback 和授权码重放。",
          "覆盖未登录 Challenge、密码错误、MFA、prompt=login、prompt=none、max_age，以及 Cookie 的 HttpOnly/SameSite/Secure/Domain/Path 实际属性。",
          "覆盖平台与租户 Consent 的批准、拒绝、篡改 returnUrl/client/scope、错误租户 Cookie，并特别验证租户页面提交到 /{tenantId}/connect/consent。",
          "从自定义 Origin 分别验证 OIDC CORS 与 /api CORS 的成功和拒绝；验证预检、无通配 Origin、无内部主机名以及可信代理 Scheme 恢复。",
          "用 Access Token 调 API 得到 200，缺失/无效 Token 得到 401，权限或资源归属不足得到 403；证明 ID Token 被 API 拒绝。",
          "覆盖 Refresh Token 可用/未授权、并发续期只发起一次、401 最多重试一次、403 不续期、完整 End Session、本地状态清理与非法登出回跳拒绝。",
          "在宽屏和窄屏用键盘完成登录、错误、Consent、回调和 Logout；检查无敏感日志、无开放重定向、无控制台错误，并完成一次反钓鱼文案评审。",
        ],
      },
      {
        id: "preview-boundary",
        title: "Release 与 Preview 边界",
        paragraphs: [
          "Release：v5.3.19 / commit 0032070 证明平台/租户协议路由、Authorization Code、public-client S256 PKCE、hosted 登录/MFA、主体状态检查、Consent 服务端重验、Access Token API、UserInfo、End Session、友好 HTML 登出错误、登录时间本地化与 favicon。",
          "未证明：把 hosted 认证页外置到独立 SPA。tenant consent 虽有服务端路由，但当前 consent.html 仍硬编码根 /connect/consent，阻止租户显式 Consent 的端到端发布声明。",
        ],
      },
    ],
  },
];

export const enHeimdallCustomFrontendDocs: DocPage[] = [
  {
    slug: "heimdall-custom-frontend",
    group: "Application Integration",
    eyebrow: "HEIMDALL 5.3.19 · CUSTOM FRONTEND",
    title: "Build a custom frontend for Heimdall",
    description:
      "Customize application pages, administration, and hosted sign-in without taking over the OIDC security boundary, while handling PKCE, cookies, consent, tokens, and tenant authorities correctly.",
    relatedDocs: [
      { product: "heimdall", docSlug: "heimdall-integration", label: "Browser application and resource API integration" },
      {
        product: "heimdall",
        docSlug: "heimdall-account-security-sessions",
        label: "Account security and session governance",
      },
      { product: "heimdall", docSlug: "heimdall-deployment", label: "Production deployment and reverse proxies" },
    ],
    sections: [
      {
        id: "contract",
        title: "Current 5.3.19 release contract",
        paragraphs: [
          "This page uses the AuthorizationController, AccountController, LogoutController, OIDC services, hosted assets, guide, and tests at Heimdall v5.3.19 / commit 0032070 as current authority. A custom frontend cannot bypass server validation of the client, redirect URI, PKCE, scopes, tenant, consent, tokens, or logout.",
          "The browser-friendly logout error page, UTC timestamp localization, and favicon are released in 5.3.19. Invalid logout navigation explicitly accepting text/html receives a detail-hiding HTML 400, while programmatic callers retain OIDC JSON errors. Tag and current commit match, with no HEAD-only frontend contract.",
        ],
      },
      {
        id: "ownership",
        title: "Separate the two frontend ownership models",
        bullets: [
          "The application frontend owns its sign-in entry, OIDC callback, business pages, menus, API client, and logout-complete page. It redirects the browser to Heimdall; it neither collects Heimdall passwords nor issues tokens.",
          "Heimdall hosted UI owns /login.html, /consent.html, and the default /logout-complete.html. Passwords, MFA, external identity providers, and consent decisions stay on the Heimdall origin and use the HttpOnly Asgard.Identity cookie.",
          "Version 5.1.2 has no configurable external hosted-login or consent URL. A complete reskin must replace those static assets in the deployment or change the backend. Preserve same-origin routes and server checks instead of moving protocol context into untrusted frontend parameters.",
          "Menu and button checks improve UX only. Heimdall or the resource API makes the final authorization decision, and the backend still validates target tenantId, subject, and business-resource ownership.",
        ],
      },
      {
        id: "client-registration",
        title: "Register a browser client",
        paragraphs: [
          "A browser application is a public client: allow authorization_code, use response type code, register exact Redirect and Post Logout Redirect URIs, and never configure or deliver a Client Secret. To obtain a Refresh Token, also allow refresh_token and offline_access and actually request offline_access.",
          "Public clients always require PKCE in 5.1.2; an administration field cannot downgrade that rule. The authorization endpoint accepts S256 only. code_challenge is a 43-character base64url SHA-256 digest, while the Token Endpoint requires a 43–128-character valid code_verifier and compares it in fixed time.",
        ],
        code: { language: "ts", value: browserClientSettings },
        note: "The example uses a mature OIDC client to express the boundary; no particular frontend framework is required. Do not implement Discovery, PKCE, state, nonce, or code exchange yourself unless the team can own complete protocol security testing.",
      },
      {
        id: "authority",
        title: "Choose platform or tenant Authority as a complete set",
        paragraphs: [
          "A platform client uses the root issuer and unprefixed /connect/** routes. A tenant client uses the /{tenantId} issuer and /{tenantId}/connect/** routes. Discovery publishes authorize, token, userinfo, logout, and JWKS URLs for that issuer; the frontend must read them instead of combining platform and tenant endpoints.",
          "tenantId is not a frontend-controlled identity-switch header. Client registration, Authority, the sign-in cookie's tenant_id, protocol route, and target resource must agree. The server rejects a cross-tenant session or route-tenant mismatch.",
        ],
        code: { language: "text", value: authorityMatrix },
      },
      {
        id: "authorize-flow",
        title: "Authorize, state, nonce, and PKCE",
        paragraphs: [
          "The application asks its OIDC client to generate a random code_verifier/code_challenge, state, and nonce, then redirects to the authorization_endpoint from Discovery. state correlates request and callback while carrying opaque application state; restore a page only after the client validates state. The library should generate nonce and verify it in a returned ID Token. Heimdall also rejects a missing nonce when client configuration requires one.",
          "Heimdall validates client_id, response_type, response_mode, exact Redirect URI, S256 PKCE, prompt, and scopes before inspecting the cookie. A signed-out user is challenged to /login.html. With prompt=none, a missing session or required consent returns login_required/consent_required instead of displaying interaction UI.",
          "The released 5.1.2 subject check covers both platform and tenant users. A platform user must still exist and retain an enabled Username, Email, or Phone credential; a tenant user must also pass deletion-state and revocation-watermark checks. An invalid stale cookie is signed out first; an interactive request is then challenged, while prompt=none returns login_required. Re-enabling a tenant user does not revive cookies or authorizations issued before the revocation watermark; the user must sign in again.",
        ],
        bullets: [
          "Never send code_verifier, state, nonce, an authorization code, or tokens to logs, analytics, error reporting, URL-inspection services, or AI prompts.",
          "Store only an internal relative return target in application state and validate it again after callback. Reject absolute URLs, //host, and /\\host to prevent open redirects.",
          "Current Discovery advertises response type code only. Do not enable Implicit Flow or accept an ID Token or Access Token constructed by frontend code.",
        ],
      },
      {
        id: "hosted-login",
        title: "Hosted sign-in and the authentication cookie",
        paragraphs: [
          "Heimdall's cookie challenge sends the complete local Authorize request to /login.html as returnUrl. The page submits credentials to /api/account/login and, when required, completes MFA through /api/account/login/mfa. The server then writes a 30-minute sliding, HttpOnly, SameSite=Lax Asgard.Identity cookie and returns only a redirect that passed the local-path check.",
          "A custom application frontend should neither call the login API directly nor read this cookie. If you replace the hosted asset, keep it on the Heimdall origin, preserve safe returnUrl, MFA/external-provider flows, and no-store branding reads, and send the password only in the TLS request. IPasswordHasher verifies it on the server; neither browser state nor logs may persist plaintext.",
        ],
        code: { language: "http", value: hostedInteractionEndpoints },
        note: "A fixed oidc.issuer changes generated public URLs but does not turn an internal HTTP request into HTTPS or make the cookie Secure. Cookie.SecurePolicy is SameAsRequest; the proxy must first restore the real Request.Scheme safely.",
      },
      {
        id: "consent",
        title: "Consent remains a Heimdall decision",
        paragraphs: [
          "Explicit consent or prompt=consent redirects to /consent.html with a local returnUrl, client display name, tenantId, and requested scopes for review. On submit, the server reparses the original Authorize request and revalidates the cookie, client, Redirect URI, PKCE, scopes, nonce, tenant route, and subject. Query values displayed by the page are not authorization facts.",
          "A platform decision posts to /connect/consent; a tenant decision must post to /{tenantId}/connect/consent. The consent.html asset at the 5.1.2 tag still hard-codes root /connect/consent, so tenant explicit consent cannot be advertised as end-to-end verified. A replacement asset must select the tenant route from trusted protocol context and test approval, denial, and tampering in the target environment.",
        ],
        code: { language: "http", value: consentDecision },
        note: "The consent API uses the cookie, and 5.1.2 source declares no antiforgery token. Keep the page same-origin, use JSON, constrain CORS/script sources, and retain server validation of returnUrl and tenant routing. Never turn Approved into a cross-site-triggerable GET.",
      },
      {
        id: "callback",
        title: "The callback completes protocol; it does not trust page parameters",
        paragraphs: [
          "The application callback route must exactly match a registered Redirect URI. The OIDC client validates state, exchanges the code at the Token Endpoint with the original code_verifier, validates issuer, signature, audience, lifetime, and nonce, and only then establishes application state. On failure, show a safe error/error_description without echoing code, state, or tokens.",
          "Restore only a validated internal destination after success. Refreshing or reopening the callback, authorization-code replay, state mismatch, a wrong code_verifier, and mixed tenant authorities must fail and clear transient state rather than guessing or patching the request.",
        ],
      },
      {
        id: "api-session",
        title: "Cookies and Access Tokens are separate boundaries",
        paragraphs: [
          "The Asgard.Identity cookie exists only for Heimdall's interactive sign-in/consent session and is carried automatically on the Heimdall origin. The application calls /api/** or an external resource API with an Access Token in Authorization: Bearer. An ID Token describes authentication and is never an API credential.",
          "UserInfo supplies protocol profile data, not a complete management identity snapshot. An account page can call GET /api/account/me. The frontend may use token permissions for menu UX, but backend permission and resource ownership remain the security boundary. Prefer memory or short-lived session storage for Access Tokens; localStorage widens the XSS theft window.",
        ],
        code: { language: "http", value: bearerRequest },
      },
      {
        id: "logout",
        title: "Use End Session for complete sign-out",
        paragraphs: [
          "Call the end_session_endpoint from Discovery instead of deleting browser tokens only. Version 5.1.2 validates id_token_hint/client_id, the current subject and sid, tenant route, and exact registered post_logout_redirect_uri; it revokes the current session (or the subject when sid is absent), clears the Heimdall cookie, and starts upstream federated logout when available.",
          "Version 5.3.19 negotiates invalid logout requests on Accept: a browser explicitly accepting text/html receives a friendly HTML 400 that hides protocol details, while programmatic callers retain error/error_description JSON. This behavior is released.",
          "The application then clears its own OIDC state and lands on the registered logout-complete page. Heimdall uses /logout-complete.html when no valid redirect applies. Clearing localStorage alone preserves the Heimdall cookie, so the next Authorize request may reuse the session. Offline JWT validation at an external API does not learn revocation immediately from cookie logout or JWKS.",
        ],
      },
      {
        id: "cors-cookie-proxy",
        title: "Accept CORS, cookies, and reverse proxies separately",
        bullets: [
          "host.cors.defaultPolicy controls /api/**. OIDC client allowed_cors_origins controls browser access to token, userinfo, revoke, device authorization, Discovery, and JWKS. Configuring only one side can allow sign-in while API calls or token exchange still fail cross-origin.",
          "An Origin contains only scheme, host, and port, not a full callback URL. Use exact HTTPS allowlists and never combine wildcard origins with credentials. Prefer the Heimdall origin for sign-in and consent pages.",
          "Production oidc.issuer must be the external public HTTPS base. Tenant issuers append tenantId. Verify every Discovery URL, redirect, form_post, and logout target contains neither a container hostname nor internal HTTP.",
          "The missing closing brace in MultiTenantCorsPolicyProvider.cs from 4.1.9 is fixed in 5.1.2 tag 42208f3 and is no longer a current release blocker. Still accept OIDC CORS and host API CORS independently in a real browser; compilable source does not prove correct target origins, credentials, or preflight behavior.",
          "Stock source exposes no documented KnownProxies/KnownNetworks configuration surface. Restore X-Forwarded-Proto only at a trusted network boundary and inspect the Asgard.Identity Secure attribute in a real browser. A fixed Issuer alone is not proof.",
        ],
      },
      {
        id: "errors",
        title: "Normalize errors and bound retries",
        paragraphs: [
          "OIDC protocol endpoints commonly return error/error_description or safely redirect an error to a registered Redirect URI. Most management APIs use the Asgard code/message/data envelope, but not every identity endpoint shares that shape. A shared client must normalize both HTTP status and response body instead of duplicating logic in pages.",
        ],
        code: { language: "ts", value: responseHandling },
        bullets: [
          "400: request, Redirect URI, PKCE, scope, tenant, or consent context is wrong. Correct the input; do not retry blindly.",
          "401: cookie or Access Token is missing/invalid. Coordinate at most one renewal, then clear state and reauthenticate.",
          "403: the identity is authenticated but lacks permission or resource ownership. Do not refresh in a loop.",
          "Network or 5xx: use bounded jittered backoff for idempotent reads only. For sign-in, consent, token, and logout, inspect protocol state before deciding whether a retry is safe.",
        ],
      },
      {
        id: "security",
        title: "Anti-phishing, CSRF, and open-redirect checklist",
        bullets: [
          "Always show the trusted Heimdall domain, tenant branding, and target client at sign-in. Do not imitate the password form on the application origin or relay passwords through a business backend.",
          "Apply a strict CSP, output encoding, dependency review, and minimal third-party scripts to hosted pages. Any XSS may steal a frontend Access Token or approve an action the user did not understand.",
          "Use exact allowlists for Redirect URI, Post Logout Redirect URI, and Origin. The return target inside application state must still be internal, while the server continues validating returnUrl as a local path.",
          "Use POST, same-origin JSON, and server-side context revalidation for cookie-backed mutations. SameSite=Lax is not a claim of CSRF immunity; do not enable arbitrary credentialed CORS.",
          "Client Secrets, signing keys, cookies, codes, code_verifier, Access/Refresh/ID Tokens, passwords, and MFA material never belong in source, browser build variables, logs, screenshots, error reports, or prompts.",
          "High-risk actions require backend reauthentication, MFA, and authorization. A frontend confirmation, hidden button, or parsed claims do not replace backend AsgardAuth and tenant/resource ownership checks.",
        ],
      },
      {
        id: "acceptance",
        title: "Go-live acceptance matrix",
        bullets: [
          "For both platform and one real tenant, inspect Discovery, JWKS, issuer, Authorize, Token, UserInfo, and End Session. Every URL must be external HTTPS and authorities must not mix.",
          "Cover a public client without a secret, successful S256 PKCE, missing/wrong challenge, wrong verifier, state mismatch, nonce validation, duplicate callback, and authorization-code replay.",
          "Cover signed-out challenge, wrong password, MFA, prompt=login, prompt=none, max_age, and actual HttpOnly/SameSite/Secure/Domain/Path cookie attributes.",
          "Cover platform and tenant consent approval, denial, tampered returnUrl/client/scope, and a wrong-tenant cookie. Explicitly prove that the tenant page posts to /{tenantId}/connect/consent.",
          "From the custom origin, independently prove allowed and denied OIDC CORS and /api CORS, preflight, no wildcard origin, no internal hostname, and trusted proxy scheme restoration.",
          "Call an API with an Access Token for 200, no/invalid token for 401, and insufficient permission or ownership for 403. Prove that the API rejects an ID Token.",
          "Cover Refresh Token allowed/not allowed, one coordinated concurrent renewal, one 401 retry maximum, no renewal on 403, complete End Session, local-state cleanup, and rejection of an unregistered logout redirect.",
          "Complete sign-in, errors, consent, callback, and logout by keyboard at wide and narrow widths. Check for no sensitive logs, open redirects, or console errors, and complete an anti-phishing copy review.",
        ],
      },
      {
        id: "preview-boundary",
        title: "Release and Preview boundary",
        paragraphs: [
          "Release: v5.3.19 / commit 0032070 proves platform/tenant routes, Authorization Code, public-client S256 PKCE, hosted sign-in/MFA, subject-state checks, server-side consent revalidation, Access Token APIs, UserInfo, End Session, friendly HTML logout errors, login timestamp localization, and favicon publication.",
          "Unproven: moving hosted authentication to a separate SPA. Tenant consent has a server route, but current consent.html still hard-codes root /connect/consent, preventing an end-to-end tenant explicit-consent release claim.",
        ],
      },
    ],
  },
];
