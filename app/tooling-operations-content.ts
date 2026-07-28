import type { DocPage } from "./content";

const tsGenControllerCode = `[AsgardTsGen]
[Route("api/[controller]")]
public sealed class OrdersController(OrderService service) : BaseController
{
    [HttpGet("{id}")]
    public async Task<Response<OrderVo>> GetAsync(string id)
    {
        var dto = await service.GetAsync(id);
        return Success(dto.ToVo());
    }
}`;

const tsGenYamlCode = `host:
  tsGen:
    enabled: true`;

const tsGenProgrammaticCode = `var generator = new TsGenerationService();

await generator.GenerateAsync(
    new TsGenOptions
    {
        Assembly = typeof(Program).Assembly,
        OutputDirectory = "./generated/ts",
        RequestImportPath = "@/services/request"
    },
    cancellationToken);`;

const analyzerReferenceCode = `<ProjectReference Include="..\\Common\\Asgard.Analyzers\\Asgard.Analyzers.csproj"
                  OutputItemType="Analyzer"
                  ReferenceOutputAssembly="false"
                  PrivateAssets="all" />`;

const analyzerPackageCode = `<PackageReference Include="Asgard.Analyzers"
                  Version="$(AsgardVersion)"
                  PrivateAssets="all" />`;

const deploymentAppYamlCode = `Database:
  Enabled: true
  Provider: PostgreSQL
  ConnectionString: "\${env:HEIMDALL_DATABASE}"

host:
  application:
    environment: Production
  kestrel:
    endpoints:
      http:
        url: "http://0.0.0.0:5000"
  swagger:
    enabled: false
  healthCheck:
    enabled: true
    path: "/health"`;

const deploymentPluginYamlCode = `oidc:
  bootstrap:
    auto_sync_schema: false
  issuer: "https://id.example.com"
  system_client:
    client_id: "admin_console"
    client_secret: ""
    redirect_uris:
      - "https://console.example.com/callback"
    post_logout_redirect_uris:
      - "https://console.example.com/logout-complete"
    allowed_cors_origins:
      - "https://console.example.com"
    scopes: [openid, profile, email, offline_access]
    grant_types: [authorization_code, refresh_token]

  # Generate and inject signing.rsa_public_key and
  # signing.rsa_private_key as protected deployment secrets.`;

const composeCode = `services:
  heimdall:
    image: registry.example.com/asgard/heimdall:5.3.19@sha256:<immutable-backend-digest>
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./app.yaml:/app/app.yaml:ro
      - ./plugin.yaml:/app/plugin.yaml:ro
      - ./logs:/app/logs:rw
    networks:
      - CoreServer

  heimdall-web:
    image: registry.example.com/asgard/heimdall-web:5.3.19@sha256:<immutable-web-digest>
    restart: unless-stopped
    expose:
      - "8080"
    networks:
      - CoreServer`;

export const zhToolingDocs: DocPage[] = [
  {
    slug: "typescript-generation",
    group: "开发工具",
    eyebrow: "ASGARD.TSGEN",
    title: "TypeScript 客户端生成",
    description: "从显式标记的 Asgard Controller 生成请求方法、响应模型和 DTO 类型。",
    sections: [
      { id: "purpose", title: "什么时候使用 TsGen", paragraphs: ["Asgard.TsGen 是可选的 TypeScript 客户端生成器。它扫描带 [AsgardTsGen] 的 ASP.NET Core Controller，把真实路由、参数和 Asgard 统一响应契约转换为前端材料。对外 API 仍可使用 OpenAPI；TsGen 更适合插件前端和同仓协作。", "当前生成器支持路由、Query、Header、表单别名、多文件上传、文件下载、SSE、Task/ValueTask、Response、PageResponse 与 CursorResponse，并会对重名 Controller 和模型稳定消歧。"] },
      { id: "mark", title: "显式选择 Controller", paragraphs: ["只有已被运行宿主的 MVC 发现、来自已加载插件程序集，并显式添加 [AsgardTsGen] 的 Controller 才会进入宿主导出包。未标记接口不会被意外公开到生成结果。"], code: { language: "csharp", value: tsGenControllerCode } },
      { id: "endpoint", title: "开发环境导出", paragraphs: ["启用 host.tsGen 后，Yggdrasil 仅在 Development 环境映射 GET /asgard-tsgen，返回 asgard-tsgen.zip。宿主必须启用插件系统；Production 或功能关闭时端点不映射。"], code: { language: "yaml", value: tsGenYamlCode }, note: "不要把 /asgard-tsgen 暴露到生产公网。它是开发期同步工具，不是运行时业务 API。" },
      { id: "output", title: "生成包结构", bullets: ["common/request.ts：共享请求器导入入口", "common/response.ts：统一响应类型", "controller/*.ts：按 Controller 拆分的请求方法", "models/<ControllerName>/index.ts：关联 DTO、VO 与请求类型", "生成遇到不支持的契约会明确失败，不输出猜测客户端"] },
      { id: "programmatic", title: "本地或 CI 调用", paragraphs: ["不需要 HTTP 导出时可直接调用 ITsGenerationService/TsGenerationService，选择 Assembly 或显式 ControllerTypes。Assembly 与 ControllerTypes 二选一时，显式集合优先。"], code: { language: "csharp", value: tsGenProgrammaticCode } },
      { id: "frontend", title: "前端接入规则", bullets: ["每次生成完整重建 common、controller、models 三个目录", "这些目录只存生成代码，不写业务逻辑或手工补丁", "所有请求继续经过共享 Bearer request 实例", "统一使用 unwrapResponse / unwrapPageResponse / unwrapCursorResponse", "后端路由、参数、DTO 或 VO 变化后重新生成并运行前端 typecheck"] },
    ],
  },
  {
    slug: "analyzers",
    group: "开发工具",
    eyebrow: "ASGARD.ANALYZERS",
    title: "Roslyn 代码守卫",
    description: "把 Asgard 的仓库约定变成 IDE 与构建期诊断，让人类和 AI 接受同一套检查。",
    sections: [
      { id: "role", title: "Analyzer 的职责", paragraphs: ["Asgard.Analyzers 以 Roslyn Analyzer 包交付，不产生运行时依赖。它负责发现可机械验证的结构和风格偏差；单元测试、集成测试、后端复查与安全评审仍然不可替代。", "当前源码基线包含 ASG0001–ASG0008，默认严重级别均为 Error。生成目录、bin、obj、.codex-build 和 Analyzer 自身会跳过；测试目录只豁免 80% 注释覆盖率检查。"] },
      { id: "rules", title: "当前八条规则", bullets: ["ASG0001：禁止文件级 using，改用 GlobalUsings", "ASG0002：文件名禁止 {T} 等大括号占位符", "ASG0003：源码注释必须包含中文", "ASG0004：参数空值校验使用 ArgumentNullException.ThrowIfNull", "ASG0005：单个 .cs 文件只允许一个顶层类型", "ASG0006：非测试代码顶层声明注释覆盖率至少 80%", "ASG0007：单个 .cs 文件不超过 400 行", "ASG0008：忽略有结果的调用、对象创建或任务时显式写 _ ="] },
      { id: "source", title: "源码仓库接入", paragraphs: ["在同一源码树中使用 Analyzer ProjectReference，并声明 OutputItemType=Analyzer、ReferenceOutputAssembly=false，避免把分析器当成普通运行时程序集。"], code: { language: "xml", value: analyzerReferenceCode } },
      { id: "package", title: "NuGet 接入", paragraphs: ["跨仓库使用 PackageReference，并用 PrivateAssets=all 阻止分析器依赖传递给下游。版本应绑定到项目选择的 Asgard 发布线；截至 2026-07-28，Asgard.Analyzers 5.1.3 已在 NuGet V3 feed 可用。"], code: { language: "xml", value: analyzerPackageCode } },
      { id: "ci", title: "在 CI 中执行", bullets: ["保持 RunAnalyzersDuringBuild=true", "核心项目可启用 EnforceCodeStyleInBuild 和 TreatWarningsAsErrors", "迁移旧项目时逐条修复，不要长期全局禁用规则", "必要的局部抑制必须注明原因和清理条件", "规则、AGENTS.md 与 Asgard Skills 变更时同步更新文档"] },
    ],
  },
];

export const zhHeimdallOperationsDocs: DocPage[] = [
  {
    slug: "heimdall-deployment",
    group: "生态",
    eyebrow: "HEIMDALL 5.3.19",
    title: "部署与上线 Heimdall",
    description: "用 PostgreSQL、受保护配置和不可变容器标签部署 Heimdall，并验证完整 OIDC 公网边界。",
    sections: [
      { id: "baseline", title: "生产基线", bullets: ["clean tag v5.3.19 / commit 0032070，.NET 10 / C# 14 preview language", "业务主库仅支持 PostgreSQL，应用按 UTC 解释时间", "Redis 用于缓存，RabbitMQ 用于消息能力", "后端容器监听 http://0.0.0.0:5000，Web 镜像提供 8080，由外层代理终止 HTTPS", "app.yaml 管宿主与基础设施，plugin.yaml 管 OIDC Issuer、system client、签名材料、插件作业、identity_webhook 与 security-event lifecycle"] },
      { id: "config", title: "生成并保护配置", paragraphs: ["be/Docker/generate-config.ps1 可以交互生成两份生产配置。生成文件包含数据库口令、AES Key/IV、system client secret 与 RSA 私钥，必须进入 Secret 管理和备份流程，绝不能提交。生产建议关闭 Swagger 和自动建表，显式执行已审查的 PostgreSQL 迁移。", "v5.3.19 生成器仍输出 host.healthCheck.endpoint，但 Asgard 5.1.3 实际读取 host.healthCheck.path；下面使用正确的 path。生成配置后必须人工修正并通过 GET /health 验收，不能把生成器输出直接视为运行时合同。"], code: { language: "yaml", value: deploymentAppYamlCode } },
      { id: "issuer", title: "公网 Issuer 是单一事实源", paragraphs: ["oidc.issuer 必须是客户端真正访问的 HTTPS Authority。它决定 Discovery、Token iss、登录/同意跳转和设备验证地址；租户 Issuer 在此基础上追加 /{tenantId}。生产不要填写容器内部主机名。", "代理仍应传递 X-Forwarded-Proto 与 X-Forwarded-Host；如果要从请求推导 Authority，必须在受信任宿主层配置 Forwarded Headers。最稳妥的生产方式是显式设置公网 issuer。"], code: { language: "yaml", value: deploymentPluginYamlCode } },
      { id: "container", title: "容器与不可变标签", paragraphs: ["官方部署目录把 app.yaml 与 plugin.yaml 只读挂载到 /app，把日志目录读写挂载，并加入外部 CoreServer 网络。生产固定带构建标识的不可变镜像标签；latest 只适合明确接受漂移的环境。"], code: { language: "yaml", value: composeCode } },
      { id: "verify", title: "上线验收", bullets: ["容器为 running，RestartCount 为 0", "GET /.well-known/openid-configuration 返回 200，issuer 与公网 Authority 完全一致", "GET /.well-known/jwks 返回 200，且当前签名 kid 可用", "GET /health 返回 200（启用 host.healthCheck 时）", "完成一次 Authorization Code + PKCE、UserInfo、Bearer API、Refresh Token 与 End Session", "再验证一个租户 Authority 的 Discovery 与登录，确保平台/租户路由没有混用"] },
      { id: "operations", title: "发布、备份与回滚", bullets: ["发布前备份 app.yaml、plugin.yaml、当前后端/Web 镜像 digest 与数据库迁移状态", "签名私钥、AES Key/IV 和 system client secret 不可在普通发布中重新生成", "5.1.2 首次发布 identity webhook、MCP、security-event lifecycle 与 sys_user_profile 增量；v5.3.19 当前共有 12 个 PostgreSQL 增量，但仍没有完整空库 baseline、迁移 ledger 或 down scripts", "先执行数据库兼容性评估和迁移，再以同一 tag 切换后端与 Web 镜像", "当前 deploy.sh 会 pull 后执行 up -d --remove-orphans，并显示 Compose 服务状态；它不验证或 reload Nginx，也不做 HTTP/健康检查", "脚本任一步失败都不会自动恢复已经切换的应用，因此发布不是事务性的；外部代理配置必须另行执行 nginx -t/reload 或等价门禁", "回滚同时恢复匹配的配置和不可变镜像 digest；数据库已发生不兼容变化时不能只回滚容器", "部署后监控登录失败、5xx、Trace、Redis/RabbitMQ 可用性、Webhook 积压、密钥轮换与容器重启"] },
    ],
  },
];

export const enToolingDocs: DocPage[] = [
  {
    slug: "typescript-generation", group: "Developer Tools", eyebrow: "ASGARD.TSGEN", title: "TypeScript client generation", description: "Generate request methods, response models, and DTO types from explicitly selected Asgard controllers.", sections: [
      { id: "purpose", title: "When to use TsGen", paragraphs: ["Asgard.TsGen is an optional TypeScript client generator. It scans ASP.NET Core controllers marked with [AsgardTsGen] and converts real routes, parameters, and Asgard response contracts into frontend material. Public APIs can continue to use OpenAPI; TsGen is optimized for plugin frontends and close repository collaboration.", "The current generator supports routes, query/header/form aliases, multiple file fields, uploads, downloads, SSE, Task/ValueTask, Response, PageResponse, and CursorResponse, with stable disambiguation for duplicate controller and model names."] },
      { id: "mark", title: "Select controllers explicitly", paragraphs: ["A controller enters the host archive only when it is discovered by MVC in the running host, belongs to a loaded plugin assembly, and explicitly carries [AsgardTsGen]. Unmarked endpoints are not accidentally added to generated output."], code: { language: "csharp", value: tsGenControllerCode } },
      { id: "endpoint", title: "Development export", paragraphs: ["After enabling host.tsGen, Yggdrasil maps GET /asgard-tsgen only in Development and returns asgard-tsgen.zip. The plugin system must be enabled. Production or a disabled feature does not map the endpoint."], code: { language: "yaml", value: tsGenYamlCode }, note: "Never expose /asgard-tsgen to the production internet. It is a development synchronization tool, not a runtime business API." },
      { id: "output", title: "Archive layout", bullets: ["common/request.ts: shared request import entry", "common/response.ts: unified response types", "controller/*.ts: request methods grouped by controller", "models/<ControllerName>/index.ts: related DTO, VO, and request types", "Unsupported contracts fail generation explicitly instead of emitting guessed clients"] },
      { id: "programmatic", title: "Local or CI generation", paragraphs: ["Call ITsGenerationService/TsGenerationService directly when an HTTP export is unnecessary. Select an Assembly or an explicit ControllerTypes collection; the explicit collection wins when provided."], code: { language: "csharp", value: tsGenProgrammaticCode } },
      { id: "frontend", title: "Frontend integration rules", bullets: ["Every generation fully rebuilds common, controller, and models", "Keep those directories purely generated; never add business patches", "Route every call through the shared Bearer request instance", "Use shared unwrapResponse / unwrapPageResponse / unwrapCursorResponse helpers", "Regenerate after route, parameter, DTO, or VO changes and run frontend typecheck"] },
    ],
  },
  {
    slug: "analyzers", group: "Developer Tools", eyebrow: "ASGARD.ANALYZERS", title: "Roslyn code guards", description: "Turn Asgard repository conventions into IDE and build diagnostics shared by humans and AI agents.", sections: [
      { id: "role", title: "What the analyzer owns", paragraphs: ["Asgard.Analyzers ships as a Roslyn analyzer and adds no runtime dependency. It catches mechanically verifiable structure and style drift; unit tests, integration tests, backend review, and security review remain necessary.", "The current source baseline contains ASG0001–ASG0008, all Error by default. Generated paths, bin, obj, .codex-build, and the analyzer itself are skipped. Test directories are exempt only from the 80% comment-coverage rule."] },
      { id: "rules", title: "The eight current rules", bullets: ["ASG0001: no file-level using; use GlobalUsings", "ASG0002: no brace placeholders such as {T} in file names", "ASG0003: source comments must contain Chinese", "ASG0004: use ArgumentNullException.ThrowIfNull for null arguments", "ASG0005: one top-level type per .cs file", "ASG0006: at least 80% top-level declaration comment coverage outside tests", "ASG0007: no more than 400 physical lines per .cs file", "ASG0008: explicitly assign ignored result-bearing calls, creations, or tasks to _ ="] },
      { id: "source", title: "Source-tree reference", paragraphs: ["Within the same source tree, reference the analyzer project with OutputItemType=Analyzer and ReferenceOutputAssembly=false so it is not treated as a runtime assembly."], code: { language: "xml", value: analyzerReferenceCode } },
      { id: "package", title: "NuGet reference", paragraphs: ["Across repositories, use PackageReference with PrivateAssets=all to prevent analyzer flow into downstream packages. Bind the version to the selected Asgard release line. As of 2026-07-28, Asgard.Analyzers 5.1.3 is available from the NuGet V3 feed."], code: { language: "xml", value: analyzerPackageCode } },
      { id: "ci", title: "Run it in CI", bullets: ["Keep RunAnalyzersDuringBuild=true", "Core projects can enable EnforceCodeStyleInBuild and TreatWarningsAsErrors", "Migrate old code rule by rule instead of disabling the analyzer globally", "Any local suppression needs a reason and removal condition", "Update documentation when rules, AGENTS.md, or Asgard Skills change"] },
    ],
  },
];

export const enHeimdallOperationsDocs: DocPage[] = [
  {
    slug: "heimdall-deployment", group: "Ecosystem", eyebrow: "HEIMDALL 5.3.19", title: "Deploy Heimdall", description: "Deploy Heimdall with PostgreSQL, protected configuration, and immutable container digests, then validate its public OIDC boundary.", sections: [
      { id: "baseline", title: "Production baseline", bullets: ["Clean tag v5.3.19 at commit 0032070 on .NET 10 / C# 14 preview language", "PostgreSQL-only application storage with UTC application semantics", "Redis for caching and RabbitMQ for messaging", "The backend listens on http://0.0.0.0:5000 and the Web image serves 8080 behind an HTTPS-terminating proxy", "app.yaml owns host/infrastructure; plugin.yaml owns OIDC issuer, system client, signing material, plugin jobs, identity_webhook, and security-event lifecycle"] },
      { id: "config", title: "Generate and protect configuration", paragraphs: ["be/Docker/generate-config.ps1 can generate both production files interactively. They contain database credentials, AES Key/IV, a system-client secret, and an RSA private key. Put them under secret management and backup; never commit them. Production should disable Swagger and automatic schema sync and run reviewed PostgreSQL migrations explicitly.", "The v5.3.19 generator still emits host.healthCheck.endpoint, but Asgard 5.1.3 reads host.healthCheck.path. The example below uses the correct path key. Correct generated configuration manually and accept it with GET /health; generator output is not the runtime contract."], code: { language: "yaml", value: deploymentAppYamlCode } },
      { id: "issuer", title: "Public issuer is the source of truth", paragraphs: ["oidc.issuer must be the HTTPS authority clients actually reach. It controls Discovery, token iss, login/consent redirects, and device verification URLs. Tenant issuers append /{tenantId}. Never use an internal container hostname in production.", "The proxy should still send X-Forwarded-Proto and X-Forwarded-Host. Request-derived authority requires trusted-host Forwarded Headers configuration. Explicitly setting the public issuer is the safest production path."], code: { language: "yaml", value: deploymentPluginYamlCode } },
      { id: "container", title: "Container and immutable tags", paragraphs: ["The supplied deployment mounts app.yaml and plugin.yaml read-only at /app, mounts logs read-write, and joins the external CoreServer network. Pin an immutable build tag in production; latest is only for environments that explicitly accept drift."], code: { language: "yaml", value: composeCode } },
      { id: "verify", title: "Go-live verification", bullets: ["Container is running and RestartCount is zero", "GET /.well-known/openid-configuration returns 200 and issuer exactly matches the public authority", "GET /.well-known/jwks returns 200 and exposes the current signing kid", "GET /health returns 200 when host.healthCheck is enabled", "Complete Authorization Code + PKCE, UserInfo, Bearer API, Refresh Token, and End Session flows", "Repeat Discovery and login against one tenant authority to catch platform/tenant route mixing"] },
      { id: "operations", title: "Release, backup, and rollback", bullets: ["Back up app.yaml, plugin.yaml, the current backend/Web image digests, and migration state before release", "Do not regenerate signing keys, AES Key/IV, or the system-client secret during a normal release", "Version 5.1.2 first shipped the identity-webhook, MCP, security-event-lifecycle, and sys_user_profile increments. Version 5.3.19 now contains twelve PostgreSQL increments but still has no complete empty-database baseline, migration ledger, or down scripts", "Assess and apply database compatibility/migrations before switching the matching backend and Web images", "The current deploy.sh pulls and runs up -d --remove-orphans, then prints Compose service status. It does not validate or reload Nginx and performs no HTTP or health check", "A failure at any script step does not restore an already switched application, so the release is not transactional. Run nginx -t/reload or an equivalent gate separately for the external proxy", "Rollback matching configuration and immutable image digests together; a database-incompatible release cannot be rolled back by changing only the containers", "Monitor login failures, 5xx, traces, Redis/RabbitMQ health, Webhook backlog, key rotation, and container restarts"] },
    ],
  },
];
