import type { DocPage } from "./content";

const jwtHostConfig = `host:
  auth:
    enabled: true
    jwt:
      issuerTemplate: "https://id.example.com/{tenant}/"
      audience: "orders-api"
      requireHttpsMetadata: true
      discoveryCacheMinutes: 60
      jwksCacheMinutes: 60`;

const selfIntrospection = `POST /{tenantId}/connect/introspect HTTP/1.1
Authorization: Basic <base64(token-owning-client-id:client-secret)>
Content-Type: application/x-www-form-urlencoded

token=<access-token>

# This is self-inspection by the token-owning confidential client.
# It is NOT a general resource-server credential.`;

const watermarkAlgorithm = `on identity.subject.invalidated(event):
  verify HMAC(timestamp + "." + rawBody)
  reject stale timestamp and duplicate event_id
  assert event.tenant_id matches the local partition
  revokedAt[event.tenant_id, event.subject_id] =
    max(currentWatermark, event.revoked_at)

on API request:
  validate JWT signature + issuer + audience + exp
  fail closed if identity state is unavailable by policy
  reject when token.iat <= revokedAt[tenant_id, sub]
  authorize scope/permission AND verify resource ownership`;

function makePage(locale: "zh" | "en"): DocPage {
  const zh = locale === "zh";
  return {
    slug: "heimdall-resource-server-revocation",
    group: zh ? "应用接入" : "Application Integration",
    eyebrow: "HEIMDALL 5.3.19 · RESOURCE SERVER",
    title: zh ? "资源服务器在线验证与撤销传播" : "Resource-server validation and revocation propagation",
    description: zh
      ? "正确选择离线 JWT、同 Client Introspection、身份失效 Webhook 与网关在线状态，避免把登出、JWKS 或 opaque Token 接成错误的安全承诺。"
      : "Choose offline JWT, same-client introspection, identity-invalidation webhooks, or gateway-held online state without turning logout, JWKS, or opaque tokens into false security promises.",
    sections: [
      {
        id: "decision-baseline",
        title: zh ? "先选验证模式" : "Choose a validation mode first",
        paragraphs: zh
          ? ["浏览器和服务调用 API 都携带 Access Token；ID Token、Refresh Token、Heimdall Cookie 都不是资源 API 凭据。Heimdall 5.3.19 可以签发 JWT 或 opaque Access Token，但 Asgard 5.1.3 内建 host.auth 只实现 tenant issuer 的 JWT Bearer + Discovery/JWKS 本地验证。", "生产默认选择短寿命 JWT + 本地 issuer/audience/signature/exp 校验。只有确实需要更短撤销窗口时，才增加身份失效 Webhook/水位、BFF/网关在线状态或自定义认证方案。不要把存在 /introspect 端点等同于已经提供通用资源服务器 Introspection。"]
          : ["Browsers and services call an API with an Access Token. ID Tokens, Refresh Tokens, and the Heimdall cookie are never resource-API credentials. Heimdall 5.3.19 can issue JWT or opaque Access Tokens, while Asgard 5.1.3 built-in host.auth implements only tenant-issuer JWT Bearer validation through Discovery/JWKS.", "The production default is a short-lived JWT with local issuer, audience, signature, and expiry validation. Add an identity-invalidation watermark, BFF/gateway online state, or custom authentication only when a shorter revocation window is required. The existence of /introspect does not mean a general resource-server introspection service has shipped."],
      },
      {
        id: "same-client-introspection",
        title: zh ? "5.3.19 Introspection 的精确所有权合同" : "Exact ownership contract of 5.3.19 introspection",
        paragraphs: zh
          ? ["平台使用 /connect/introspect，租户使用 /{tenantId}/connect/introspect。调用者必须以 confidential client 完成 client_secret_basic 或 client_secret_post 认证；路由 tenantId 必须与该 Client 的 TenantId 完全一致。端点只检查 Access Token。", "ValidateAccessTokenAsync 可以解析当前 Heimdall 的 JWT 或 opaque Access Token，但 active=true 还要求 token.client_id 等于已认证调用 Client 的 client_id，并且 Token TenantId 等于 Client TenantId。未知、过期、已撤销、错误路由或其他 Client 的 Token 都返回 HTTP 200 active=false，以避免泄露 Token 存在性。"]
          : ["Use /connect/introspect for the platform and /{tenantId}/connect/introspect for a tenant. The caller authenticates as a confidential client through client_secret_basic or client_secret_post, and the route tenantId must exactly match that client's TenantId. The endpoint inspects Access Tokens only.", "ValidateAccessTokenAsync can parse Heimdall JWT or opaque Access Tokens, but active=true additionally requires token.client_id to equal the authenticated caller client_id and the token TenantId to equal the client TenantId. Unknown, expired, revoked, route-mismatched, or foreign-client tokens return HTTP 200 active=false to avoid leaking token existence."],
        code: { language: "http", value: selfIntrospection },
        note: zh
          ? "同 Client + 同 Tenant 自查可以用于 Token 所有 Client 自身的后端会话治理或诊断；不能把 Consumer Client Secret 分发给独立资源 API，也不能让 API 用自己的 Client 凭据检查其他 Client 的 Token。"
          : "Same-client, same-tenant inspection can support the token-owning client's backend session governance or diagnostics. Never distribute a consumer Client Secret to an independent API, and an API's own client credential cannot inspect another client's token.",
      },
      {
        id: "acceptance-matrix",
        title: zh ? "Token、撤销与缓存接受矩阵" : "Token, revocation, and cache acceptance matrix",
        bullets: zh
          ? ["JWT + Asgard host.auth：本地验签；可接受正常请求延迟；登出/单 Token revoke/主体禁用不会通过 JWKS 查询即时传播，最坏窗口由 Access Token exp 或本地撤销水位决定", "opaque + Asgard host.auth：不支持，必须稳定返回 401；不要降级为仅 Base64/Claims 解析", "JWT/opaque + 同 Client 同 Tenant introspection：有效时 active=true；过期、已撤销、跨 Client、跨 Tenant 或错误路由为 active=false", "JWT/opaque + 独立 resource-server Client introspection：当前不支持通用场景；即使 audience 指向 API，token.client_id 仍属于原 Consumer Client", "JWKS cache：影响新 signing kid 的可见/刷新窗口，不携带 Token 或主体撤销状态；缓存 key 不能被描述为撤销列表", "Webhook 水位：异步、至少一次；只有签名验证、event_id 幂等、revoked_at 持久化并在请求路径 fail closed 后，才能承诺相应旧 JWT 被拒绝", "Backend Directory：用于主体/组/角色对账，不是每请求 Token active 查询；缓存 TTL 和对账周期必须作为陈旧窗口验收"]
          : ["JWT + Asgard host.auth: local validation and normal request latency; logout, single-token revoke, or subject disable does not propagate through JWKS immediately, so the worst-case window is Access Token expiry or a local revocation watermark", "Opaque + Asgard host.auth: unsupported and consistently returns 401; never degrade to Base64/claim parsing", "JWT/opaque + same-client same-tenant introspection: active=true while valid; expired, revoked, cross-client, cross-tenant, or wrong-route values are inactive", "JWT/opaque + independent resource-server client introspection: the general case is unsupported; even when audience names the API, token.client_id still belongs to the consumer client", "JWKS cache: controls visibility/refresh of a new signing kid and carries no token or subject revocation state; never describe cached keys as a deny list", "Webhook watermark: asynchronous and at-least-once; promise rejection of old JWTs only after signature validation, event_id deduplication, durable revoked_at state, and fail-closed request enforcement", "Backend Directory: reconciles subject/group/role state and is not a per-request token-active query; accept its cache TTL and reconciliation interval as a staleness window"],
      },
      {
        id: "offline-jwt-path",
        title: zh ? "Asgard 5.1.3 离线 JWT 主路径" : "Asgard 5.1.3 offline-JWT primary path",
        paragraphs: zh
          ? ["issuerTemplate 必须恰好包含一个 {tenant}，从 Token iss 恢复 tenant；单个 audience 必须精确命中 Token aud 集合中的一个值。Heimdall 中 API audience 来自租户自定义 Scope.Resources，Client 必须被允许并实际请求该 Scope，否则 aud 会回退为 client_id。", "JwtBearer 从匹配租户 Authority 的 Discovery/JWKS 取得 signing key，再校验签名、issuer、audience 与生命周期。AsgardAuth 随后判断 role/permission/scope/token_type；它不查询 Heimdall Token 记录、session、subject revocation 或资源归属。"]
          : ["issuerTemplate contains exactly one {tenant} and recovers the tenant from token iss. The configured single audience must exactly equal one token aud value. In Heimdall, an API audience comes from a custom tenant Scope.Resources value; the client must be allowed to request and actually request that scope, or aud falls back to client_id.", "JwtBearer obtains signing keys through Discovery/JWKS for the matching tenant Authority, then validates signature, issuer, audience, and lifetime. AsgardAuth subsequently evaluates role, permission, scope, and token_type. It does not query Heimdall token records, sessions, subject revocation, or resource ownership."],
        code: { language: "yaml", value: jwtHostConfig },
        bullets: zh
          ? ["Access Token TTL 按可接受暴露窗口设置；不要用过长 TTL 掩盖续期或可用性问题", "分别监控 Discovery/JWKS 失败、unknown kid、wrong issuer/audience、expired 和时钟偏差；认证失败默认关闭", "key rotation 同时验收新 kid 刷新与旧 Retiring kid 重叠；不要因 key cache 过期就认为旧 Token 已撤销", "401 表示认证 Token 失败；403 表示身份有效但授权/资源边界拒绝，日志与客户端不得混淆"]
          : ["Set Access Token TTL to the accepted exposure window; do not hide renewal or availability problems behind long lifetimes", "Monitor Discovery/JWKS failure, unknown kid, wrong issuer/audience, expiry, and clock skew separately; authentication failure closes by default", "Accept key rotation with new-kid refresh plus the old Retiring-kid overlap; key-cache expiry is not token revocation", "401 means token authentication failed; 403 means an authenticated identity failed authorization or resource ownership, and clients/logs keep them distinct"],
      },
      {
        id: "webhook-watermark-path",
        title: zh ? "Webhook 撤销水位路径" : "Webhook revocation-watermark path",
        paragraphs: zh
          ? ["自 5.1.2 起，Heimdall 对租户 Subject 的 disabled、deleted 或 admin_revoke 在事务中级联状态并写入 identity.subject.invalidated Outbox。HTTP Worker 用 HMAC 签名至少一次投递 event_id、tenant_id、subject_id、revoked_at、reason；网络重试、租约超时或响应丢失都可能重复。", "资源 API/网关只有在验证 HMAC 与时间戳、按 event_id 幂等、按 tenant+subject 单调保存最大 revoked_at，并在每次请求比较 Token iat 后，才能缩短 JWT 撤销窗口。Webhook 停止、状态库不可用或租户分区不一致时应按明确风险策略 fail closed，不能静默接受。"]
          : ["Since 5.1.2, disabling, deleting, or administratively revoking a tenant subject cascades state in a transaction and writes an identity.subject.invalidated Outbox event. The HTTP worker provides HMAC-signed, at-least-once delivery of event_id, tenant_id, subject_id, revoked_at, and reason. Network retries, lease expiry, or response loss can duplicate delivery.", "An API or gateway shortens the JWT revocation window only after validating HMAC and timestamp, deduplicating event_id, monotonically persisting the greatest revoked_at per tenant+subject, and comparing token iat on every request. If delivery stops, the state store fails, or tenant partitioning disagrees, follow an explicit fail-closed risk policy rather than silently accepting."],
        code: { language: "text", value: watermarkAlgorithm },
        note: zh
          ? "当前 Webhook 作用域是租户用户，不是平台 SysUser 的通用失效总线。不要把平台 Token、单 jti revoke、Client Secret 轮换或所有权限变更自动归入这个事件。"
          : "The current webhook scope is tenant users, not a general invalidation bus for platform SysUsers. Do not automatically map platform tokens, a single-jti revoke, Client Secret rotation, or every permission change into this event.",
      },
      {
        id: "gateway-and-custom-auth",
        title: zh ? "网关、BFF 与自定义认证责任" : "Gateway, BFF, and custom-auth responsibilities",
        paragraphs: zh
          ? ["需要 opaque Token、每请求在线状态或多个 issuer 的系统必须关闭/绕开 stock host.auth，并由自定义认证 handler、BFF 或网关生成经过验证的 ClaimsPrincipal，再让 Asgard tenant/identity/authorization 链路继续运行。该组件必须成为真正的安全边界，而不是只转发未验证 Claims 的 Header。", "自定义在线验证要定义凭据、连接池、timeout、重试/circuit breaker、active 响应缓存键、正/负缓存 TTL、撤销后的 cache invalidation、时钟、租户绑定、失败策略、限流和 Secret 轮换。5.3.19 没有提供可直接套用的 general resource-server Introspection Client 或中间件。"]
          : ["Systems requiring opaque tokens, per-request online state, or multiple issuers must bypass/disable stock host.auth and use a custom authentication handler, BFF, or gateway to create a validated ClaimsPrincipal before continuing through Asgard tenancy, identity, and authorization. That component becomes a real security boundary, not a header forwarder for unverified claims.", "Custom online validation defines credentials, pooling, timeout, retry/circuit breaker, active-cache keys, positive/negative TTLs, revocation invalidation, clocks, tenant binding, failure policy, rate limits, and secret rotation. Version 5.3.19 ships no drop-in general resource-server introspection client or middleware."],
        bullets: zh
          ? ["网关到 API 使用受认证的内部通道并防止公网伪造身份 Header；API 只信任明确代理身份", "active=true 也必须继续校验 API audience/scope、tenant 与资源归属；Introspection 不替代授权", "缓存 active 结果会重新引入撤销窗口；记录最大 TTL，并证明 revoke/Webhook 如何驱逐", "在线端点不可用时，高风险写操作默认失败关闭；任何 fail-open 必须由业务显式接受并隔离范围"]
          : ["Authenticate the gateway-to-API channel and prevent public spoofing of identity headers; the API trusts only an explicitly identified proxy", "active=true still requires API audience/scope, tenant, and resource ownership checks; introspection never replaces authorization", "Caching active responses reintroduces a revocation window; record the maximum TTL and prove how revoke/webhook evicts it", "High-risk writes fail closed when online state is unavailable; any fail-open behavior needs explicit business acceptance and a constrained scope"],
      },
      {
        id: "failure-and-observability",
        title: zh ? "故障、监控与安全响应" : "Failure, monitoring, and security response",
        bullets: zh
          ? ["分别统计 JWT 本地校验、Introspection、Webhook 消费、水位状态库、Directory 对账的延迟、错误率、陈旧时间与 fail-closed 次数", "Introspection invalid_client 与 active=false 分开告警；前者是调用方凭据/路由故障，后者可能是正常无效 Token，禁止记录 Token 原文或 Client Secret", "告警最老未消费 Webhook、pending/failed 数、签名/时间戳失败、重复 event_id、水位回退企图、未知 tenant/subject 与状态库不可用", "当 Webhook 丢失或状态损坏时，从 Backend Directory/管理状态做全量对账，再推进水位；不要把 Directory 快照当作 Token jti 列表", "安全事件响应同时评估 Access Token TTL、网关 active cache TTL、Webhook lag、JWKS refresh 与下游部署范围，给出最坏拒绝时间而不是宣称即时"]
          : ["Measure latency, error rate, staleness, and fail-closed counts separately for local JWT validation, introspection, webhook consumption, watermark storage, and directory reconciliation", "Alert separately on introspection invalid_client and active=false: the former is caller credential/routing failure while the latter can be a normal invalid token. Never log token plaintext or Client Secrets", "Alert on oldest undelivered webhook, pending/failed counts, signature/timestamp failure, duplicate event_id, attempted watermark rollback, unknown tenant/subject, and state-store outage", "After webhook loss or state corruption, reconcile against Backend Directory/management state before advancing watermarks; a directory snapshot is not a token-jti list", "Incident response combines Access Token TTL, gateway active-cache TTL, webhook lag, JWKS refresh, and downstream deployment scope to report the worst-case rejection time instead of claiming immediacy"],
      },
      {
        id: "production-acceptance",
        title: zh ? "真实生产接受矩阵" : "Real production acceptance matrix",
        bullets: zh
          ? ["同 confidential client + 同 tenant：分别用有效 JWT 与 opaque Access Token 得到 active=true；响应核对 scope/client_id/sub/exp/iat/token_type/tenant_id", "错误 Secret 返回客户端认证错误；缺 Token 返回 invalid_request；未知、过期、已 revoke、错误 tenant route、foreign client Token 均为 HTTP 200 active=false", "独立 API Client 尝试 introspect Consumer Token 必须 active=false，证明当前不是通用 RFC 7662 resource-server 模式", "stock Asgard host.auth 接受正确 tenant JWT，拒绝 opaque、platform root issuer、wrong issuer/audience/kid/exp 与混合 tenant；验证一个 aud 集合包含目标 audience 的 Token", "主体禁用/删除后测量：Heimdall 在线验证、同 Client introspection、JWKS-only API、Webhook 水位 API 各自在何时拒绝；结果不得用一个路径外推所有路径", "暂停 Webhook、重复/乱序投递、篡改签名、状态库故障、Backend Directory 对账和恢复，证明幂等、单调水位与失败策略", "网关若缓存 active，分别在 TTL 内/外撤销并验证驱逐；执行网关/IDP 超时、限流、重启和 Secret 轮换", "每个已认证请求继续覆盖 AsgardAuth 和 tenant/resource ownership 的 403 负向测试，避免 active=true 变成越权"]
          : ["With the same confidential client and tenant, introspect a valid JWT and opaque Access Token as active=true and verify scope/client_id/sub/exp/iat/token_type/tenant_id", "A wrong secret produces client-authentication error and a missing token produces invalid_request; unknown, expired, revoked, wrong-route, and foreign-client tokens return HTTP 200 active=false", "An independent API client introspecting a consumer token receives inactive, proving this is not a general RFC 7662 resource-server mode", "Stock Asgard host.auth accepts the correct tenant JWT and rejects opaque, platform-root issuer, wrong issuer/audience/kid/exp, and mixed-tenant tokens; also verify a token whose aud collection contains the target audience", "After subject disable/delete, measure when Heimdall online validation, same-client introspection, a JWKS-only API, and a webhook-watermark API each reject; never extrapolate one path to every path", "Pause webhook delivery, send duplicates/out-of-order events, tamper signatures, fail the state store, reconcile Backend Directory, and recover to prove idempotency, monotonic watermarks, and failure policy", "If a gateway caches active results, revoke inside/outside the TTL and prove eviction; inject gateway/IDP timeout, rate limiting, restart, and secret rotation", "For every authenticated path retain AsgardAuth plus tenant/resource-ownership 403 tests so active=true never becomes authorization"],
      },
      {
        id: "release-boundaries",
        title: zh ? "Release、HEAD 与未证明边界" : "Release, HEAD, and unproven boundaries",
        paragraphs: zh
          ? ["Release：Heimdall v5.3.19 / commit 0032070 提供 confidential-client Introspection、JWT/opaque Access Token 在线验证、Client+Tenant 所有权限制、Token/session/subject 撤销状态、租户身份失效 Webhook 与 Backend Directory；Asgard 5.1.3 commit d1002d1 提供 tenant issuer JWT + Discovery/JWKS 与 audience 精确校验。两者当前源码均未提供通用资源服务器 Introspection。", "未证明/未发布：独立资源服务器凭据或 resource indicator、可检查其他 Consumer Client Token 的通用 RFC 7662 Introspection、Asgard opaque handler、内建 deny-list/Webhook consumer、active cache、即时跨 API revoke、平台 SysUser 通用失效事件或网关/BFF 实现。"]
          : ["Release: Heimdall v5.3.19 / commit 0032070 provides confidential-client introspection, online JWT/opaque Access Token validation, client+tenant ownership checks, token/session/subject revocation state, tenant identity-invalidation webhooks, and Backend Directory. Asgard 5.1.3 commit d1002d1 provides tenant-issuer JWT Discovery/JWKS validation plus exact audience matching. Neither current source ships general resource-server introspection.", "Unproven/unshipped: independent resource-server credentials or resource indicators, general RFC 7662 introspection of another consumer client's token, an Asgard opaque handler, a built-in deny-list/webhook consumer, active-response cache, immediate cross-API revocation, a general platform-SysUser invalidation event, or a gateway/BFF implementation."],
      },
    ],
  };
}

export const zhHeimdallResourceServerRevocationDocs: DocPage[] = [makePage("zh")];
export const enHeimdallResourceServerRevocationDocs: DocPage[] = [makePage("en")];
