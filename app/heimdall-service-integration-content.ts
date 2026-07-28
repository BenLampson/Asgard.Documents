import type { DocPage } from "./content";

const tokenRequest = `POST /connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=<tenant-client-id>&
client_secret=<secret>&
scope=heimdall.directory.read heimdall.directory.write`;

const directoryRoutes = `READ · scope=heimdall.directory.read
GET    /api/backend/directory/users?page=1&size=100
GET    /api/backend/directory/users/{tenantUserId}
GET    /api/backend/directory/users/{tenantUserId}/permissions
GET    /api/backend/directory/groups?page=1&size=100
GET    /api/backend/directory/groups/{groupId}
GET    /api/backend/directory/groups/{groupId}/members?page=1&size=100
GET    /api/backend/directory/groups/{groupId}/members/{tenantUserId}

WRITE · scope=heimdall.directory.write
POST   /api/backend/directory/groups
PUT    /api/backend/directory/groups/{groupId}/members
DELETE /api/backend/directory/groups/{groupId}`;

const memberWrite = `PUT /api/backend/directory/groups/{groupId}/members
Authorization: Bearer <backend-service-access-token>
Content-Type: application/json

{
  "tenant_user_ids": ["<tenant-user-id>"]
}`;

const acceptanceFlow = `Client -> /connect/token
       -> verify aud / token_type / scope / tenant_id / application_id
       -> Backend Directory read or write API
       -> short-TTL cache + scheduled reconciliation

Heimdall identity transaction
       -> Outbox + signed Webhook
       -> downstream revoked_at watermark
       -> reject token.iat <= revoked_at`;

const zhPage: DocPage = {
  slug: "heimdall-service-integration",
  group: "应用接入",
  eyebrow: "HEIMDALL 5.3.19 · BACKEND SERVICES",
  title: "微服务目录与身份失效集成",
  description: "用 Tenant-bound BackendService Token、最小权限目录读写、身份失效 Webhook 与对账构成可验收的身份闭环。",
  sections: [
    { id: "contract", title: "v5.3.19 已发布合同", paragraphs: ["v5.3.19 / 0032070 保留用户、权限、组与成员读取，并发布租户组分页及最小权限写入。5.3.16 引入 heimdall.directory.write；5.3.17 固定 tenant_user_ids 请求字段并拒绝空白 ID；5.3.18 修复非空组/部门成员集合的事务内批量持久化。", "Client 生命周期级联撤销与 identity.subject.invalidated v1 Webhook 仍是同一接入闭环。发布制品存在不等于目标系统完成验收；必须固定后端镜像 digest，执行真实 Client → Token → Directory → Webhook 流程。"] },
    { id: "identity", title: "主体、Application 与 Tenant 不变量", bullets: ["TenantUser.Id = JWT sub = Webhook subject_id = 用户资源 id = tenant_user_id", "每个 Tenant 使用独立 Confidential Client；Token 的 tenant_id 是唯一租户来源", "5.3.x OIDC Client 还属于一个 Application；Token 的 application_id 与授权版本来自权威 Application/Tenant 快照", "任何无法确认 Client、Application、Tenant binding、Scope 或授权版本的情况都 Fail Closed", "下游不直查 Heimdall 数据库，也不信任浏览器提交的成员关系"] },
    { id: "token", title: "按动作申请最小 Scope", paragraphs: ["只读消费者只申请 heimdall.directory.read；需要受控同步组的集成才额外申请 heimdall.directory.write。两者使用同一固定资源 heimdall-directory-api，Token 必须同时满足 aud、token_type=BackendService、Scope 与可信 tenant_id。"], code: { language: "http", value: tokenRequest }, note: "Client Secret 只进入 Secret Manager 和取 Token 服务。日志可以记录 Tenant/Application/Client ID 与 Trace ID，不记录 Secret 或完整 Token。" },
    { id: "directory", title: "读写路由与隔离", paragraphs: ["读、写 Action 分别声明 Scope；Controller 只从已验证 Token 取得 Tenant，Route/Query/Body 都不能切换租户。page 从 1 开始，size 默认 10、最大 500；跨租户 ID 按不存在处理。"], code: { language: "http", value: directoryRoutes }, bullets: ["GET groups 返回每组未删除成员数，并避免逐组查询", "删除只允许空组；先显式替换成员为空，再执行删除", "用户权限快照用于高风险业务授权；状态不是 Active 或缺任一必需权限就拒绝", "401/403 是身份/授权错误，404 是 Token 租户内不存在；429/5xx/超时可有限重试但最终 Fail Closed"] },
    { id: "member-write", title: "成员替换是完整集合写入", paragraphs: ["PUT 是 delete-and-replace 语义并在事务内完成；字段名严格为 tenant_user_ids。null、空白 ID、跨租户用户或无效组必须受控失败，不能部分写入。5.3.18 使用 typed FreeSql insert builder 修复非空集合未持久化问题。"], code: { language: "http", value: memberWrite }, bullets: ["提交前规范化和去重用户 ID；不要把部分增量列表误当完整集合", "成功后立即 GET members 验证集合、数量、租户归属与 updated_at", "并发同步必须由调用方串行化或做读回校验；不要从一个 2xx 推断最终集合未被另一写覆盖", "部门成员替换应用同一持久化修复，但不属于 Backend Directory 公共写路由"] },
    { id: "state", title: "统一最终身份状态", paragraphs: ["TenantUser 最终启用要求用户未删除，并至少保留一条未删除、启用的登录记录。有效成员还要求成员关系存在、组未删除且启用。查询、登录、Refresh、Introspection、目录 API 与对账必须共享这一语义。", "目录缓存只能使用短 TTL。状态敏感操作绕过缓存；定时分页对账负责修复 Webhook 丢失、消费失败或短暂故障后的最终一致性。"] },
    { id: "webhook", title: "消费身份失效 Webhook", paragraphs: ["TenantUser 禁用、删除或管理员撤销时，Heimdall 在同一事务推进主体撤销水位、撤销相关协议状态并写 Outbox；Worker 以至少一次语义投递 HMAC 签名事件。", "接收方保留原始请求体，验证 Key ID、时间窗口和 HMAC，以 event_id 幂等，并只允许 revoked_at 前进。"], code: { language: "text", value: acceptanceFlow }, note: "JWKS 离线验签不会自动查询 Heimdall 状态；只有消费 Webhook 并在授权路径检查撤销水位，才可承诺旧 JWT 被及时拒绝。" },
    { id: "client-lifecycle", title: "轮换、停用与删除 Client", bullets: ["reset-secret 支持 0–1440 分钟宽限期；新 Secret 只返回一次，先安全保存再滚动切换并实际取 Token", "停用或删除 Client 后，新 Token 请求返回 invalid_client", "同一事务撤销该 Client 的 Access/Refresh Token、Authorization、Authorization Code、Device Code 与活动 Session", "Application 或 TenantApplication 停用也必须阻断签发/业务访问；重新启用不能复活既有撤销状态"] },
    { id: "acceptance", title: "真实交付验收", bullets: ["固定 v5.3.19 / 0032070、镜像 digest、OpenAPI 快照和迁移状态", "覆盖 read-only Client 对写路由 403、write Client 的创建/替换/删除空组，以及 tenant_user_ids 的 null/blank/跨租户负例", "写入非空成员集合后用独立读路径和数据库副本验证真实持久化；覆盖事务失败不留部分集合", "覆盖用户/权限/组/成员状态、分页、并发、缓存与 Heimdall 不可用时 Fail Closed", "覆盖 Webhook 签名/重放/乱序与 Client Secret 轮换、停用、删除和旧 Token 不复活"] },
  ],
  relatedDocs: [
    { product: "heimdall", docSlug: "heimdall-client-credentials", label: "Client Credentials" },
    { product: "heimdall", docSlug: "heimdall-management-api", label: "Application 与管理 API" },
    { product: "heimdall", docSlug: "heimdall-identity-webhooks", label: "身份失效 Webhook" },
  ],
};

const enPage: DocPage = {
  slug: "heimdall-service-integration",
  group: "Application integration",
  eyebrow: "HEIMDALL 5.3.19 · BACKEND SERVICES",
  title: "Service directory and identity invalidation",
  description: "Close the identity loop with tenant-bound BackendService tokens, least-privilege directory reads/writes, signed invalidation Webhooks, and reconciliation.",
  sections: [
    { id: "contract", title: "Released v5.3.19 contract", paragraphs: ["v5.3.19 / 0032070 retains user, permission, group, and membership reads and releases tenant group paging plus least-privilege writes. Version 5.3.16 introduces heimdall.directory.write; 5.3.17 fixes the request field as tenant_user_ids and rejects blanks; 5.3.18 fixes transactional persistence of non-empty group and department member sets.", "Client lifecycle revocation and identity.subject.invalidated v1 Webhooks remain part of the same integration loop. A shipped artifact is not completed target acceptance: pin the backend image digest and run a real Client → Token → Directory → Webhook flow."] },
    { id: "identity", title: "Subject, Application, and Tenant invariants", bullets: ["TenantUser.Id = JWT sub = Webhook subject_id = user resource id = tenant_user_id", "Use a separate confidential Client per Tenant; token tenant_id is the only Tenant source", "A 5.3.x OIDC Client also belongs to one Application; application_id and authorization versions come from an authoritative Application/Tenant snapshot", "Fail Closed whenever Client, Application, Tenant binding, Scope, or authorization version is uncertain", "Downstream never queries Heimdall storage or trusts browser-supplied membership"] },
    { id: "token", title: "Request the minimum Scope for each action", paragraphs: ["Read-only consumers request only heimdall.directory.read. An integration that must synchronize groups additionally requests heimdall.directory.write. Both use fixed resource heimdall-directory-api, and the token must satisfy aud, token_type=BackendService, Scope, and trusted tenant_id."], code: { language: "http", value: tokenRequest }, note: "Client Secret belongs only in a secret manager and token acquisition. Logs may carry Tenant/Application/Client IDs and Trace ID, never the Secret or complete token." },
    { id: "directory", title: "Read/write routes and isolation", paragraphs: ["Read and write actions declare separate Scopes. The Controller derives Tenant only from the validated token; Route, Query, and Body cannot switch it. page starts at 1, size defaults 10 and caps at 500, and cross-tenant IDs look absent."], code: { language: "http", value: directoryRoutes }, bullets: ["GET groups returns each non-deleted member count without per-group queries", "Delete permits only an empty group; explicitly replace members with empty before deleting", "Use the user-permission snapshot for high-risk business decisions; reject unless status is Active and every required permission exists", "401/403 is identity/authorization, 404 is absent inside token Tenant, and bounded retry for 429/5xx/timeouts still ends Fail Closed"] },
    { id: "member-write", title: "Member replacement writes the complete set", paragraphs: ["PUT has delete-and-replace semantics inside one transaction, with the exact field tenant_user_ids. Null/blank IDs, cross-tenant users, or an invalid group fail in a controlled way without partial writes. Version 5.3.18 uses the typed FreeSql insert builder to fix lost non-empty sets."], code: { language: "http", value: memberWrite }, bullets: ["Normalize and deduplicate IDs before submission; never mistake a delta list for the complete set", "Immediately GET members and verify set, count, Tenant ownership, and updated_at", "Callers must serialize synchronization or read back after concurrent writes; one 2xx does not prove another write did not supersede it", "Department replacement receives the same persistence fix but is not a public Backend Directory write route"] },
    { id: "state", title: "Use one effective identity state", paragraphs: ["A TenantUser is effective only when undeleted and backed by at least one enabled, undeleted login. Active membership also requires an existing relation and an enabled, undeleted group. Query, login, refresh, introspection, directory, and reconciliation share this meaning.", "Keep caches short-lived, bypass them for sensitive decisions, and use scheduled paging reconciliation to repair missed Webhooks and transient failures."] },
    { id: "webhook", title: "Consume identity invalidation Webhooks", paragraphs: ["On TenantUser disable, delete, or administrative revoke, Heimdall advances the subject watermark, revokes related protocol state, and writes the Outbox in one transaction. A worker delivers HMAC-signed events at least once.", "Preserve the raw body, validate Key ID, timestamp window, and HMAC, deduplicate event_id, and only advance revoked_at."], code: { language: "text", value: acceptanceFlow }, note: "JWKS-only validation never queries Heimdall state. Promise timely old-JWT rejection only after consuming Webhooks and enforcing the revocation watermark." },
    { id: "client-lifecycle", title: "Rotate, disable, and delete Clients", bullets: ["reset-secret supports 0–1440 minutes of overlap; store the one-time Secret, roll, and prove it at the token endpoint", "Disable/delete makes new token requests return invalid_client", "The transaction revokes Access/Refresh Tokens, Authorization, Authorization Codes, Device Codes, and active Sessions", "Disabling Application or TenantApplication also blocks issuing/business access; re-enable never revives revoked protocol state"] },
    { id: "acceptance", title: "Accept the real delivery", bullets: ["Pin v5.3.19 / 0032070, image digest, OpenAPI snapshot, and migration state", "Cover read-only Client write denial, write Client create/replace/delete-empty-group, and null/blank/cross-tenant tenant_user_ids", "After a non-empty write, verify real persistence through an independent read and database copy; transaction failure leaves no partial set", "Cover user/permission/group/member state, paging, concurrency, caching, and Fail Closed behavior during outage", "Cover Webhook signature/replay/reordering plus Secret rotation, Client disable/delete, and proof old tokens do not revive"] },
  ],
  relatedDocs: [
    { product: "heimdall", docSlug: "heimdall-client-credentials", label: "Client Credentials" },
    { product: "heimdall", docSlug: "heimdall-management-api", label: "Application and management APIs" },
    { product: "heimdall", docSlug: "heimdall-identity-webhooks", label: "Identity invalidation Webhooks" },
  ],
};

export const zhHeimdallServiceIntegrationDocs: DocPage[] = [zhPage];
export const enHeimdallServiceIntegrationDocs: DocPage[] = [enPage];
