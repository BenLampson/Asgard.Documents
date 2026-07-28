import type { DocPage } from "./content";

type Locale = "zh" | "en";

const publishCode = `dotnet restore MyApp.sln
dotnet publish src/MyApp.Starter/MyApp.Starter.csproj \\
  -c Release \\
  --no-restore \\
  --no-self-contained \\
  -o artifacts/publish

# Smoke the exact artifact before building an image.
cd artifacts/publish
dotnet MyApp.Starter.dll`;

const publishItemsCode = `<ItemGroup>
  <None Update="app.yaml"
        CopyToOutputDirectory="PreserveNewest"
        CopyToPublishDirectory="PreserveNewest" />

  <!-- One built-in plugin: publish its manifest beside the plugin assembly. -->
  <Content Include="..\\MyApp.Plugin\\plugin.yaml"
           Link="plugin.yaml"
           CopyToOutputDirectory="PreserveNewest"
           CopyToPublishDirectory="PreserveNewest" />
</ItemGroup>`;

const dockerfileCode = `FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY artifacts/publish/ ./
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.Starter.dll"]`;

const publishBundleCode = `${publishCode}

# MyApp.Starter.csproj — publish manifests with the host
${publishItemsCode}

# Dockerfile — copy the already verified publish directory
${dockerfileCode}`;

const productionYamlCode = `Asgard:
  Encryption:
    Key: "\${env:ASGARD_AES_KEY}"
    Iv: "\${env:ASGARD_AES_IV}"

plugin:
  enabled: true
  # A built-in-only host should not scan an accidental working-directory folder.
  scanDirectories: []

logging:
  minimumLevel: Information
  console:
    enabled: true
  file:
    enabled: true
    path: /var/log/asgard/app-.log
    rollingInterval: Day
    retainedFileCountLimit: 7

host:
  application:
    name: MyApp
    version: 1.0.0
    environment: Production
  kestrel:
    endpoints:
      http:
        url: http://0.0.0.0:8080
  staticFiles:
    enabled: false
  healthCheck:
    enabled: true
    path: /health
    readyPath: /health/ready
    livePath: /health/live`;

const containerRunCode = `docker build -t registry.example.com/myapp:<immutable-version> .

docker run --rm \\
  --name myapp \\
  -p 127.0.0.1:8080:8080 \\
  -e ASPNETCORE_ENVIRONMENT=Production \\
  -e ASGARD_AES_KEY \\
  -e ASGARD_AES_IV \\
  -v myapp-logs:/var/log/asgard \\
  registry.example.com/myapp:<immutable-version>`;

const proxyCode = `location / {
    proxy_pass http://myapp:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}`;

const readinessCode = `var builder = YggdrasilHost.CreateBuilder("app.yaml")
    .UseBuiltInPlugin<MyPlugin>()
    .AfterServiceRegistration(services =>
    {
        _ = services.AddHealthChecks()
            .AddCheck<MyDatabaseHealthCheck>(
                "database",
                tags: ["ready"]);
    });

var app = builder.Build();
await app.RunAsync();`;

const acceptanceCode = `IMAGE=registry.example.com/myapp:<immutable-version>
docker inspect "$IMAGE" --format '{{json .RepoDigests}}'

curl --fail --silent http://127.0.0.1:8080/health/live
curl --fail --silent http://127.0.0.1:8080/health/ready
curl --fail --silent https://api.example.com/health
curl --fail --silent https://api.example.com/api/<authenticated-smoke-route>

# Also inspect startup/shutdown logs and test one SIGTERM drain.
docker stop --time 30 myapp`;

const sourceAnchors = `Asgard 5.1.3 clean source
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHost.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Configurator.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.HostConfiguration.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs
Host/Asgard.Yggdrasil.AspNetCore/AsgardRuntimeHostedService.cs
Common/Asgard.Abstractions.AspNetCore/Host/HealthCheckOptions.cs
Common/Asgard.Abstractions/Plugin/PluginConfig.cs
Common/Asgard.Core/Plugin/PluginBase.cs
Common/Asgard.Abstractions/Logging/LogConfig.cs`;

const sectionIds = [
  "baseline",
  "publish",
  "configuration",
  "network",
  "health",
  "observability",
  "shutdown",
  "rollout",
  "acceptance",
  "sources",
] as const;

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";

  return {
    slug: "deployment",
    group: zh ? "部署与运维" : "Deployment & Operations",
    eyebrow: "ASGARD 5.1.3",
    title: zh ? "生产部署与上线 Runbook" : "Production deployment and go-live runbook",
    description: zh
      ? "把 Asgard starter、插件、配置与可观测性打成不可变发布物，并用真实健康、停机和回滚验收安全上线。"
      : "Package the Asgard starter, plugins, configuration, and observability as an immutable release, then verify health, shutdown, and rollback before go-live.",
    relatedDocs: [
      { product: "asgard", docSlug: "configuration-reference", label: zh ? "配置根合同" : "Configuration root contract" },
      { product: "asgard", docSlug: "health-and-rate-limiting", label: zh ? "健康检查与全局限流" : "Health checks and global rate limiting" },
      { product: "asgard", docSlug: "observability", label: zh ? "追踪与可观测性" : "Tracing and observability" },
    ],
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "发布边界" : "Release boundary",
        paragraphs: [
          zh
            ? "生产发布单元是 starter/host，而不是单独的插件项目。starter 拥有 Program.cs、YggdrasilHost 或 PluginWebAppDefaults 入口、app.yaml 与最终进程；插件主体拥有 PluginBase、业务程序集与 plugin.yaml。"
            : "The production release unit is the starter/host, not a plugin project by itself. The starter owns Program.cs, the YggdrasilHost or PluginWebAppDefaults entry point, app.yaml, and the final process. The plugin owns PluginBase, business assemblies, and plugin.yaml.",
          zh
            ? "固定 Asgard.* 5.1.3 与 .NET 10，提交依赖锁定材料，并为每次发布生成不可变版本或镜像 digest。不要从 latest、工作目录名或未发布源码版本推断生产版本。"
            : "Pin Asgard.* 5.1.3 and .NET 10, commit the repository's dependency-locking material, and assign every release an immutable version or image digest. Never infer production identity from latest, a worktree name, or an unpublished source version.",
        ],
      },
      {
        id: sectionIds[1],
        title: zh ? "发布并容器化精确产物" : "Publish and containerize the exact artifact",
        paragraphs: [
          zh
            ? "在干净检出中 restore、测试、publish，然后直接启动 publish 目录做一次 smoke。镜像只复制这个已经验收的目录，不在 runtime 层重新 restore 或编译。"
            : "Restore, test, and publish from a clean checkout, then start the publish directory directly for a smoke test. Copy that verified directory into the image; do not restore or compile again in the runtime layer.",
          zh
            ? "app.yaml 必须进入 starter 的 publish 输出。单个内建插件可把 plugin.yaml 链接到插件程序集旁；多个插件或外部插件必须给每个插件保留独立目录并逐一验证清单位置，不能让多个同名 plugin.yaml 在扁平输出中互相覆盖。"
            : "app.yaml must enter the starter publish output. A single built-in plugin can link plugin.yaml beside its assembly. Multiple or external plugins need separate verified directories; never let same-name plugin.yaml files overwrite one another in a flat output.",
        ],
        code: { language: "text", value: publishBundleCode },
        note: zh
          ? "下面的 MSBuild 与 Dockerfile 是单内建插件基线。镜像还应按你的平台策略使用非 root 用户、只读根文件系统和明确资源限制。"
          : "The MSBuild and Dockerfile snippets are a single-built-in-plugin baseline. Apply the platform's non-root user, read-only root filesystem, and resource-limit policy before production.",
      },
      {
        id: sectionIds[2],
        title: zh ? "配置、清单与秘密" : "Configuration, manifests, and secrets",
        paragraphs: [
          zh
            ? "app.yaml 由 starter 通过传给 YggdrasilHost.CreateBuilder(...) 的精确路径加载；plugin.yaml 属于插件。不要在两个文件中复制同一业务参数。相对插件路径、扫描目录和数据目录依赖进程工作目录，容器必须固定 WORKDIR。"
            : "The starter loads app.yaml from the exact path passed to YggdrasilHost.CreateBuilder(...); plugin.yaml belongs to the plugin. Do not duplicate one business setting across both files. Relative plugin, scan, and data paths depend on the process working directory, so the container must fix WORKDIR.",
          zh
            ? "合并优先级是基础 YAML、环境 YAML、环境变量、命令行。Key、Iv、数据库连接串、Redis/RabbitMQ 凭据和证书密码只通过 Secret 系统注入。${env:NAME} 缺失会在加载期失败，这是正确的 fail-fast。"
            : "Merged precedence is base YAML, environment YAML, environment variables, then command line. Inject Key, Iv, database strings, Redis/RabbitMQ credentials, and certificate passwords only through a secret system. A missing ${env:NAME} fails during loading, which is the intended fail-fast behavior.",
          zh
            ? "注意启动分界：构造 YggdrasilHostBuilder 时会先从基础 app.yaml 直接读取并校验 HostConfig 与 LogConfig；基础文件必须独立满足这两组最低合同，不能指望后续环境文件修复已经发生的构造期失败。"
            : "Observe the bootstrap boundary: constructing YggdrasilHostBuilder directly reads and validates HostConfig and LogConfig from base app.yaml. The base file must satisfy those minimum contracts by itself; a later environment file cannot repair an earlier constructor failure.",
        ],
        code: { language: "yaml", value: productionYamlCode },
        note: zh
          ? "Production 环境由 ASPNETCORE_ENVIRONMENT、DOTNET_ENVIRONMENT、基础 app.yaml 的 host.application.environment 依次选择。异常中间件是否回传详细栈看 IWebHostEnvironment.IsDevelopment()，不要把 detailedErrors 当成已接线开关。"
          : "Environment selection checks ASPNETCORE_ENVIRONMENT, DOTNET_ENVIRONMENT, then host.application.environment from base app.yaml. Exception stack disclosure follows IWebHostEnvironment.IsDevelopment(); do not treat detailedErrors as a wired switch.",
      },
      {
        id: sectionIds[3],
        title: zh ? "Kestrel、TLS 与反向代理真实边界" : "Kestrel, TLS, and the real reverse-proxy boundary",
        paragraphs: [
          zh
            ? "host.kestrel.endpoints.*.url 是 Asgard 5.1.3 的监听事实源；不存在 host.port。示例让 Kestrel 在容器网络监听 HTTP 8080，由唯一可信代理终止 TLS。若端到端 TLS 在 Kestrel 终止，则 HTTPS endpoint 必须提供 PFX path，password 仍应由 Secret 注入。"
            : "host.kestrel.endpoints.*.url is the Asgard 5.1.3 listener source of truth; host.port does not exist. The example listens on container-network HTTP 8080 and terminates TLS at the sole trusted proxy. For end-to-end Kestrel TLS, configure an HTTPS endpoint with a PFX path and inject its password as a secret.",
          zh
            ? "代理发送 X-Forwarded-* 不等于应用已经安全消费它们。当前 clean source 没有 UseForwardedHeaders、KnownProxies 或 KnownNetworks 接线，ConfigureMiddleware 扩展点又位于认证与租户之后，不能用它补一个需要更早执行的可信代理边界。"
            : "A proxy sending X-Forwarded-* does not prove that the application consumes them safely. The current clean source has no UseForwardedHeaders, KnownProxies, or KnownNetworks wiring, and ConfigureMiddleware runs after authentication and tenancy, too late to establish that trusted boundary.",
          zh
            ? "因此 stock host 后的应用不得依赖 forwarded scheme/host 产生安全决策。需要代理感知 Cookie、重定向或绝对 URL 时，应修改/定制宿主，在安全中间件之前建立并限制可信代理，或使用已经证明等价行为的平台；同时让 Kestrel 端口只对代理网络可达。"
            : "Therefore an application behind the stock host must not base security decisions on forwarded scheme or host. Proxy-aware cookies, redirects, or absolute URLs require a changed/custom host that establishes restricted trusted proxies before security middleware, or a platform with verified equivalent behavior. Keep Kestrel reachable only from the proxy network.",
        ],
        code: { language: "nginx", value: proxyCode },
        note: zh
          ? "这段代理配置只负责覆盖并发送头，不是 Asgard 已消费这些头的证明。"
          : "This proxy snippet overwrites and sends headers; it is not proof that Asgard consumes them.",
      },
      {
        id: sectionIds[4],
        title: zh ? "存活、就绪与依赖检查" : "Liveness, readiness, and dependency checks",
        paragraphs: [
          zh
            ? "/health 执行全部注册检查；/health/ready 只执行 ready 标签；/health/live 只执行 live 标签。框架内置 self 检查同时标记 live 与 ready，但它只能证明进程健康检查管线可响应，不能证明数据库、Redis、RabbitMQ 或下游服务可用。"
            : "/health runs every registered check, /health/ready selects the ready tag, and /health/live selects live. The built-in self check carries both tags, but proves only that the process health pipeline responds—not that the database, Redis, RabbitMQ, or downstream services work.",
          zh
            ? "通过 AfterServiceRegistration 追加依赖检查并标 ready；live 保持为进程级检查。滚动发布先等 ready 成功再接流量，依赖短暂故障应让 ready 失败而不是让编排器反复杀死仍可恢复的进程。timeoutSeconds 当前只被校验，没有接入 endpoint 执行超时。"
            : "Add dependency checks through AfterServiceRegistration and tag them ready; keep live process-only. Wait for ready before routing traffic. A transient dependency failure should fail readiness rather than cause an orchestrator to repeatedly kill a recoverable process. timeoutSeconds is currently validated but is not wired as endpoint execution timeout.",
        ],
        code: { language: "csharp", value: readinessCode },
      },
      {
        id: sectionIds[5],
        title: zh ? "日志与可观测性" : "Logging and observability",
        bullets: zh
          ? [
              "Console 与 File 默认启用；容器优先采集 stdout，若保留文件 sink，挂载可写卷并验证滚动、配额与保留期",
              "启动日志必须出现五阶段构建结果、基础设施初始化状态和运行插件数量；把启动校验异常视为发布失败",
              "分别监控 live、ready、HTTP 5xx/429、延迟、进程重启、作业失败、RabbitMQ redelivery、Redis 与数据库连接",
              "Trace 与 database logging 使用独立存储/队列，不是可靠审计总线；关键审计事件进入专用可靠系统",
              "不得把 Key、Iv、连接串、Token、Cookie、PFX 密码或原始敏感请求写进日志、Trace notes/tags 或 AI 回放材料",
            ]
          : [
              "Console and File are enabled by default. Prefer stdout collection in containers; if File remains enabled, mount writable storage and verify rotation, quota, and retention",
              "Startup logs must show the five build phases, infrastructure status, and running-plugin count; treat any startup validation exception as a failed release",
              "Monitor live, ready, HTTP 5xx/429, latency, restarts, job failures, RabbitMQ redelivery, Redis, and database connectivity separately",
              "Trace and database logging use independent stores and queues; they are not reliable audit buses, so route critical audit events to a dedicated reliable system",
              "Never place Key, Iv, connection strings, tokens, cookies, PFX passwords, or raw sensitive requests in logs, Trace notes/tags, or AI replay material",
            ],
        code: { language: "bash", value: containerRunCode },
      },
      {
        id: sectionIds[6],
        title: zh ? "优雅停机与排空" : "Graceful shutdown and draining",
        paragraphs: [
          zh
            ? "SIGTERM 进入 ASP.NET Core 停机流程后，AsgardRuntimeHostedService 先关闭已启动的 JobManager，再释放 PluginManager。PluginManager 会停止并释放插件；插件自己的 OnStopAsync 与后台循环仍必须响应 CancellationToken、可重复执行，并在平台终止宽限期内完成。"
            : "After SIGTERM enters ASP.NET Core shutdown, AsgardRuntimeHostedService first shuts down an active JobManager and then disposes PluginManager. PluginManager stops and disposes plugins, but plugin OnStopAsync methods and background loops must still observe CancellationToken, be idempotent, and finish within the platform termination grace period.",
          zh
            ? "先从负载均衡摘除实例并让 ready 失败，再等待在途请求、消费者确认和插件清理；之后才发送最终强杀。每个版本都要实测 SIGTERM，确认没有新任务进入、没有未确认消息被误报成功，并检查尾批日志/Trace 是否满足业务要求。"
            : "Remove the instance from traffic and fail readiness before waiting for in-flight requests, consumer acknowledgements, and plugin cleanup; only then allow a final forced kill. Test SIGTERM for every release, verify no new work enters, no unacknowledged message is reported as success, and tail logs/Trace meet the application's requirements.",
        ],
      },
      {
        id: sectionIds[7],
        title: zh ? "Canary、迁移与回滚" : "Canary, migrations, and rollback",
        bullets: zh
          ? [
              "镜像、app.yaml 模板、插件集合与数据库迁移绑定同一 release ID；记录 Asgard 版本和镜像 digest",
              "数据库先做向前兼容的 expand，再发布同时兼容旧/新 schema 的应用，最后 contract；不要把框架数据库模块当迁移器，它不会自动 migration 或 AutoSync",
              "先在隔离环境启动精确镜像并验收配置，再发布一个 canary；ready 成功且关键业务 smoke、错误率和延迟稳定后才扩大流量",
              "外部插件是进程内可信代码。生产升级采用不可变进程滚动替换，不依赖当前不完整的热重载路径",
              "回滚必须恢复上一镜像、匹配的插件与兼容配置；不可逆数据库变更需要前滚修复或预先验证的恢复方案",
            ]
          : [
              "Bind the image, app.yaml template, plugin set, and database migrations to one release ID; record the Asgard version and image digest",
              "Expand the database compatibly, deploy an application that supports old and new schema, then contract. The framework database module is not a migrator and performs no automatic migration or AutoSync",
              "Start the exact image in isolation and validate configuration before one canary. Expand traffic only after ready, critical business smoke, error rate, and latency remain healthy",
              "External plugins are trusted in-process code. Upgrade production through rolling replacement of immutable processes, not the current incomplete hot-reload path",
              "Rollback restores the previous image, matching plugins, and compatible configuration. Irreversible database changes require roll-forward repair or a pre-verified restore plan",
            ],
      },
      {
        id: sectionIds[8],
        title: zh ? "发布验收门" : "Release acceptance gate",
        bullets: zh
          ? [
              "发布物来自干净 commit；所有直接 Asgard.* 引用均为 5.1.3，镜像使用不可变 digest",
              "容器中 app.yaml 与每个 plugin.yaml 位置正确；真实 secrets 未进入镜像层、仓库、日志或诊断包",
              "公网只能到 TLS 入口，Kestrel 端口只对代理/容器网络开放；伪造 X-Forwarded-* 不能改变安全结果",
              "live、ready、全部 health 以及一个带认证的关键 API 在容器内和公网路径分别通过",
              "依赖故障会使 ready 失败但不会错误报告业务可用；恢复后实例可重新接流量",
              "SIGTERM 在宽限期内停止作业和插件；重复请求、消息 redelivery 与幂等性已演练",
              "canary 指标稳定，上一版本回滚命令、配置与数据库兼容路径已实际验证",
            ]
          : [
              "The artifact comes from a clean commit; every direct Asgard.* reference is 5.1.3 and the image uses an immutable digest",
              "app.yaml and every plugin.yaml occupy the expected container paths; real secrets are absent from image layers, source, logs, and diagnostic bundles",
              "Only the TLS entry point is public and Kestrel is limited to the proxy/container network; forged X-Forwarded-* values cannot change a security result",
              "live, ready, aggregate health, and one authenticated critical API pass through both container-local and public paths",
              "A dependency failure makes ready fail without falsely reporting business availability, and the instance can rejoin after recovery",
              "SIGTERM stops jobs and plugins within the grace period; retries, message redelivery, and idempotency have been rehearsed",
              "Canary metrics are stable and the previous-version rollback command, configuration, and database compatibility path have been exercised",
            ],
        code: { language: "bash", value: acceptanceCode },
      },
      {
        id: sectionIds[9],
        title: zh ? "源码核验锚点" : "Source verification anchors",
        paragraphs: [
          zh
            ? "本页的 Asgard 行为以 5.1.3 clean source 为准；容器、canary 与回滚部分是明确标注的部署操作策略，不是框架自动提供的控制面。"
            : "Asgard behavior on this page is contracted against clean 5.1.3 source. Container, canary, and rollback guidance is an explicit deployment strategy, not a framework-provided control plane.",
        ],
        code: { language: "text", value: sourceAnchors },
      },
    ],
  };
};

export const zhAsgardDeploymentDocs: DocPage[] = [makePage("zh")];
export const enAsgardDeploymentDocs: DocPage[] = [makePage("en")];
export const zhAsgardDeploymentPage = zhAsgardDeploymentDocs[0];
export const enAsgardDeploymentPage = enAsgardDeploymentDocs[0];
