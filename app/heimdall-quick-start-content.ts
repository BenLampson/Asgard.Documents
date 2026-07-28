import type { DocPage } from "./content";

const dependencies = `PostgreSQL  127.0.0.1:5432  database: heimdall
Redis       127.0.0.1:6379
RabbitMQ    127.0.0.1:5672  virtual host: /

# Use local containers, a disposable development environment, or SSH tunnels.
# Keep real credentials and connection strings outside the repository.`;

const startBackend = `$env:DOTNET_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://127.0.0.1:5000"
$env:Database__ConnectionString = "Host=127.0.0.1;Port=5432;Database=heimdall;Username=<local-user>;Password=<local-password>;Timezone=UTC"
$env:Caching__Redis__ConnectionString = "127.0.0.1:6379"
$env:Messaging__RabbitMQ__HostName = "127.0.0.1"
$env:Messaging__RabbitMQ__Port = "5672"
$env:Messaging__RabbitMQ__UserName = "<local-user>"
$env:Messaging__RabbitMQ__Password = "<local-password>"
$env:Oidc__Issuer = "http://localhost:5000"
$env:Oidc__Bootstrap__DefaultAdminPassword = "<local-strong-password>"

dotnet run --project be/Asgard.Heimdall.Starter/Asgard.Heimdall.Starter.csproj`;

const smoke = `$discovery = Invoke-RestMethod http://localhost:5000/.well-known/openid-configuration
$jwks = Invoke-RestMethod http://localhost:5000/.well-known/jwks

$discovery.issuer
$discovery.authorization_endpoint
$discovery.token_endpoint
$discovery.jwks_uri
$jwks.keys.Count

Start-Process http://localhost:5000/swagger`;

const startFrontend = `cd fe
npm install
npm run dev

# Open http://localhost:3001/test-lab`;

const acceptance = `PUBLIC ENDPOINTS
[ ] Discovery issuer is exactly http://localhost:5000
[ ] authorization_endpoint, token_endpoint, and jwks_uri share that authority
[ ] JWKS contains at least one signing key

BROWSER LOGIN
[ ] Sign in as local user "asgard" through Authorization Code + PKCE
[ ] Callback returns to http://localhost:3001
[ ] UserInfo and the authenticated current-account API succeed
[ ] Refresh succeeds only when offline_access is granted
[ ] Full logout returns to /logout-complete

TOKEN BOUNDARY
[ ] The SPA sends access_token, never id_token, to APIs
[ ] No client secret exists in browser code
[ ] Renew and replay a 401 at most once; never refresh-loop a 403`;

const productionBoundary = `LOCAL QUICK START                         PRODUCTION
Development environment                   Explicit production environment
auto_sync_schema may be enabled            Reviewed SQL increments before startup
HTTP localhost issuer                      Fixed public HTTPS oidc.issuer
Bootstrap password in process environment  One-time secret injection, then remove it
Direct Kestrel access                      Trusted proxy restores request scheme
Test-lab callback/origin                    Exact callbacks and both CORS boundaries
Mutable local dependencies                 Pinned images/digests, backup, rollback, monitoring`;

export const zhHeimdallQuickStartDocs: DocPage[] = [{
  slug: "heimdall-quick-start",
  group: "开始",
  eyebrow: "LOCAL QUICK START · 5.3.19",
  title: "Heimdall 快速开始",
  description: "从 clean 5.3.19 源码启动本地身份服务，验证 Discovery/JWKS，并用管理前端完成一次 Authorization Code + PKCE 登录闭环。",
  relatedDocs: [
    { product: "heimdall", docSlug: "heimdall-integration", label: "注册业务 SPA 与 API audience" },
    { product: "heimdall", docSlug: "heimdall-database-migrations", label: "生产数据库迁移与回滚" },
    { product: "asgard", docSlug: "resource-api-authentication", label: "让 Asgard API 验证 Access Token" },
  ],
  sections: [
    {
      id: "outcome",
      title: "这条路径会得到什么",
      paragraphs: ["本页针对仓库源码的本地开发闭环，不是生产部署模板。完成后会得到监听 5000 的 Heimdall 后端、监听 3001 的管理前端、可读取的 Discovery/JWKS，以及一次真实的 Authorization Code + PKCE 登录、刷新与退出验收。"],
      bullets: ["已验证源码：Heimdall v5.3.19 / clean commit 0032070", "运行时：.NET 10 / C# 14；前端使用仓库 lockfile", "Starter 已在 2026-07-28 以 Release 模式编译，0 warning、0 error"],
      note: "仓库 README 的展示版本可能滞后；版本事实以 be/Directory.Build.props、tag v5.3.19 和当前源码为准。",
    },
    {
      id: "prerequisites",
      title: "准备三个基础设施依赖",
      paragraphs: ["Heimdall 生产主库仅支持 PostgreSQL，同时需要 Redis 与 RabbitMQ。可以使用本地容器、可丢弃开发环境或 SSH 隧道，再把环境变量指向实际本地端口。仓库 be/Docker/docker-compose.yaml 只启动 Heimdall 两个镜像并依赖外部 CoreServer 网络，不会创建这三个服务。"],
      code: { language: "text", value: dependencies },
      note: "不要把真实密码、数据库字符串、RabbitMQ 凭据、签名私钥或 Encryption Key 写进文档、Git 或聊天记录。",
    },
    {
      id: "backend",
      title: "启动后端与一次性管理员",
      paragraphs: ["从 Heimdall 仓库根目录设置本机环境变量并启动 Starter。Development 环境允许默认管理员引导；用户名默认是 asgard，密码只从 Oidc:Bootstrap:DefaultAdminPassword 读取。用户存在后，启动逻辑只补齐内置标记与平台超级管理员角色，不会用该变量覆盖密码。"],
      code: { language: "powershell", value: startBackend },
      bullets: ["plugin.yaml 当前为本地开发显式启用 oidc.bootstrap.auto_sync_schema=true", "配置类型默认值仍是 false；生产关闭自动同步并在启动前执行审核过的 SQL 增量", "看到 Now listening on: http://127.0.0.1:5000 后再继续"],
      note: "SeedDefaultAdmin 在非 Development 环境默认跳过；若必须生产引导，要短时设置 Oidc__Bootstrap__SeedDefaultAdmin=true，并在成功后移除引导密码与开关。",
    },
    {
      id: "protocol-smoke",
      title: "先验证 Discovery、JWKS 与 Swagger",
      paragraphs: ["不要猜协议端点。读取 Discovery，确认 issuer 与配置完全一致，再使用它发布的 authorization_endpoint、token_endpoint 和 jwks_uri。JWKS 至少应暴露一个当前签名 token 可使用的 key。"],
      code: { language: "powershell", value: smoke },
      note: "本地可使用 HTTP；生产 oidc.issuer 必须固定为真实外部 HTTPS Authority。固定 Issuer 不会自动恢复反向代理后的 Request.Scheme，也不会自动把 Asgard.Identity Cookie 变为 Secure。",
    },
    {
      id: "frontend",
      title: "启动管理前端与测试台",
      paragraphs: ["另开终端启动前端。fe/.env.development 已把 API、OIDC Authority、public origin 和 asgard_default 系统客户端对齐到 localhost:5000/3001。"],
      code: { language: "powershell", value: startFrontend },
      bullets: ["先点“检查公开端点”", "再点“发起登录”，使用本地 asgard 管理员", "继续检查认证链路、Refresh Token 与完整登出"],
    },
    {
      id: "acceptance",
      title: "按协议边界验收",
      paragraphs: ["浏览器应用是 public client：必须使用 Authorization Code + PKCE，不能包含 Client Secret。调用业务 API 的凭据是 Access Token，不是 ID Token。"],
      code: { language: "text", value: acceptance },
    },
    {
      id: "next",
      title: "从平台登录进入业务租户接入",
      bullets: ["按 Application 域 RBAC 指南创建 Manifest、TenantApplication 与应用管理员 Grant", "按“接入 Heimdall”创建 tenant custom Scope，并用 Resources 写入 API audience", "分别注册 redirectUris、postLogoutRedirectUris 与 allowedCorsOrigins，三者不能混用", "让 Asgard 5.1.3 host.auth 使用单个 {tenant} issuerTemplate 和完全一致的 audience", "生产前完成数据库、反向代理、Secure Cookie、签名密钥、备份与回滚 Runbook"],
    },
    {
      id: "production-boundary",
      title: "不要把 Quick Start 原样搬到生产",
      code: { language: "text", value: productionBoundary },
      paragraphs: ["Heimdall 5.3.19 的四个 application-domain SQL 脚本是受控升级序列，不是完整空 PostgreSQL baseline、统一 migration ledger 或 down-script framework。每个其他 SQL 增量仍要单独审核，执行记录由运维侧保存。"],
    },
  ],
}];

export const enHeimdallQuickStartDocs: DocPage[] = [{
  slug: "heimdall-quick-start",
  group: "Start",
  eyebrow: "LOCAL QUICK START · 5.3.19",
  title: "Heimdall quick start",
  description: "Start the identity service from clean 5.3.19 source, verify Discovery and JWKS, and complete one Authorization Code + PKCE login through the management frontend.",
  relatedDocs: [
    { product: "heimdall", docSlug: "heimdall-integration", label: "Register a business SPA and API audience" },
    { product: "heimdall", docSlug: "heimdall-database-migrations", label: "Production database migration and rollback" },
    { product: "asgard", docSlug: "resource-api-authentication", label: "Validate the access token in an Asgard API" },
  ],
  sections: [
    {
      id: "outcome",
      title: "What this path delivers",
      paragraphs: ["This is a local development loop for repository source, not a production deployment template. It delivers a Heimdall backend on port 5000, the management frontend on port 3001, readable Discovery and JWKS documents, and a real Authorization Code + PKCE sign-in, refresh, and logout flow."],
      bullets: ["Verified source: Heimdall v5.3.19 / clean commit 0032070", "Runtime: .NET 10 / C# 14; the frontend uses the repository lockfile", "The Starter compiled in Release mode on 2026-07-28 with zero warnings and zero errors"],
      note: "Display versions in the repository README may lag. Treat be/Directory.Build.props, tag v5.3.19, and current source as authoritative.",
    },
    {
      id: "prerequisites",
      title: "Prepare the three infrastructure dependencies",
      paragraphs: ["Heimdall supports PostgreSQL as its production database and also requires Redis and RabbitMQ. Use local containers, a disposable development environment, or SSH tunnels, then point environment variables at the actual local ports. The repository be/Docker/docker-compose.yaml starts only the two Heimdall images and depends on an external CoreServer network; it does not create these services."],
      code: { language: "text", value: dependencies },
      note: "Never put real passwords, database strings, RabbitMQ credentials, signing private keys, or Encryption Keys in documentation, Git, or chat.",
    },
    {
      id: "backend",
      title: "Start the backend and one-time administrator",
      paragraphs: ["From the Heimdall repository root, set local environment variables and start the Starter. Development permits default-administrator bootstrap. The username defaults to asgard and the password is read only from Oidc:Bootstrap:DefaultAdminPassword. Once the user exists, startup restores the built-in marker and platform-super-administrator role; it does not replace the password from this variable."],
      code: { language: "powershell", value: startBackend },
      bullets: ["The committed plugin.yaml explicitly sets oidc.bootstrap.auto_sync_schema=true for local development", "The configuration type still defaults to false; production disables automatic sync and applies reviewed SQL increments before startup", "Continue after the log reports Now listening on: http://127.0.0.1:5000"],
      note: "SeedDefaultAdmin is skipped outside Development by default. If production bootstrap is unavoidable, set Oidc__Bootstrap__SeedDefaultAdmin=true briefly, then remove both the bootstrap password and switch.",
    },
    {
      id: "protocol-smoke",
      title: "Verify Discovery, JWKS, and Swagger first",
      paragraphs: ["Do not guess protocol endpoints. Read Discovery, confirm that issuer exactly matches configuration, and consume its authorization_endpoint, token_endpoint, and jwks_uri. JWKS must expose at least one key usable by the current signing token."],
      code: { language: "powershell", value: smoke },
      note: "HTTP is acceptable locally. Production oidc.issuer must be the real public HTTPS authority. A fixed issuer does not restore Request.Scheme behind a proxy or force the Asgard.Identity cookie to Secure.",
    },
    {
      id: "frontend",
      title: "Start the management frontend and test lab",
      paragraphs: ["Start the frontend in another terminal. fe/.env.development aligns the API, OIDC authority, public origin, and asgard_default system client with localhost ports 5000 and 3001."],
      code: { language: "powershell", value: startFrontend },
      bullets: ["Run Check public endpoints first", "Run Sign in and authenticate as the local asgard administrator", "Then verify the authenticated chain, refresh token, and full logout"],
    },
    {
      id: "acceptance",
      title: "Accept against the protocol boundary",
      paragraphs: ["A browser application is a public client: it uses Authorization Code + PKCE and carries no Client Secret. The credential sent to a business API is the Access Token, never the ID Token."],
      code: { language: "text", value: acceptance },
    },
    {
      id: "next",
      title: "Move from platform login to a tenant application",
      bullets: ["Create a Manifest, TenantApplication, and application-manager grant through the Application-domain RBAC guide", "Create a tenant custom Scope whose Resources value becomes the API audience through Integrate Heimdall", "Register redirectUris, postLogoutRedirectUris, and allowedCorsOrigins as separate boundaries", "Configure Asgard 5.1.3 host.auth with one {tenant} issuerTemplate and an exactly matching audience", "Before production, complete the database, reverse-proxy, Secure Cookie, signing-key, backup, and rollback runbooks"],
    },
    {
      id: "production-boundary",
      title: "Do not copy the quick start unchanged into production",
      code: { language: "text", value: productionBoundary },
      paragraphs: ["The four Heimdall 5.3.19 application-domain SQL scripts form a controlled upgrade sequence. They are not a complete empty-PostgreSQL baseline, unified migration ledger, or down-script framework. Review every other SQL increment separately and retain operator execution records outside Heimdall."],
    },
  ],
}];
