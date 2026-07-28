import type { DocPage } from "./content";

const configClassCode = `public sealed class BillingConfig : ISystemConfig
{
    [ConfigPath("billing.enabled", DefaultValue = false)]
    public bool Enabled { get; set; }

    [ConfigPath("billing.endpoint", DefaultValue = "")]
    public string Endpoint { get; set; } = string.Empty;

    public void Validate()
    {
        if (Enabled && string.IsNullOrWhiteSpace(Endpoint))
        {
            throw new InvalidOperationException(
                "billing.endpoint is required when billing is enabled.");
        }
    }
}`;

const configYamlCode = `database:
  enabled: true
  provider: postgresql
  connectionString: "\${env:ASGARD_DATABASE}"

app:
  publicBaseUrl: "https://api.example.com"
  healthUrl: "\${app.publicBaseUrl}/health"

host:
  kestrel:
    endpoints:
      http:
        url: "http://127.0.0.1:5000"`;

const hostReferenceYamlCode = `host:
  application:
    name: "MyApp"
    version: "1.0.0"
    environment: "Production"
    detailedErrors: false
  kestrel:
    endpoints:
      http:
        url: "http://0.0.0.0:8080"
    limits:
      maxRequestBodySize: 104857600
      maxConcurrentConnections: 1000
      requestHeadersTimeoutSeconds: 30
  staticFiles:
    enabled: true
    webRootPath: "wwwroot"
    requestPath: ""
    enableDefaultFiles: false
    defaultFiles: ["index.html"]
  cors:
    enabled: true
    defaultPolicy:
      allowAnyOrigin: false
      allowedOrigins: ["https://app.example.com"]
      allowAnyMethod: true
      allowAnyHeader: true
      allowCredentials: false
      preflightMaxAgeSeconds: 600
  auth:
    enabled: true
    jwt:
      issuerTemplate: "https://id.example.com/{tenant}"
      audience: "Asgard.Users"
      requireHttpsMetadata: true
      discoveryCacheMinutes: 60
      jwksCacheMinutes: 15
  swagger:
    enabled: true
    title: "MyApp API"
    description: "MyApp public API"
    version: "v1"
    routePrefix: "swagger"
  tsGen:
    enabled: false
  rateLimiting:
    enabled: true
    policy: "FixedWindow"
    permitLimit: 100
    windowSeconds: 60
    segmentsPerWindow: 10
    queueLimit: 0
  healthCheck:
    enabled: true
    path: "/health"
    readyPath: "/health/ready"
    livePath: "/health/live"
    timeoutSeconds: 30`;

const infrastructureRootsCode = `host.staticFiles.enableDefaultFiles  static index-file behavior
host.cors                           API cross-origin policies
host.auth.jwt.issuerTemplate        OIDC issuer pattern with {tenant}
host.auth.jwt.jwksCacheMinutes      JWKS cache lifetime
host.swagger.routePrefix            Swagger UI path
host.tsGen.enabled                  development client export
host.rateLimiting.policy            global limiter algorithm
host.healthCheck.readyPath          readiness probe path
database.enabled    relational database and repositories
caching.enabled     memory / Redis multi-level cache
messaging.enabled   RabbitMQ, tracing, retry, delay, dead letters
job.enabled         scheduler and configured job definitions
plugin.enabled      external plugin loading and isolation
logging.minimumLevel console, file, and independent database sink
Trace.Enabled       request trace persistence and capture policy
Asgard.Encryption   encryption material (inject secrets externally)`;

const hostDefaultsCode = `host.application.name                    Asgard.Yggdrasil
host.application.version                 1.0.0
host.application.environment             Development
host.application.detailedErrors          false
host.kestrel.endpoints.Http.url           http://localhost:5000
host.staticFiles.enabled                  true
host.staticFiles.enableDefaultFiles       false
host.auth.jwt.audience                    Asgard.Users
host.auth.jwt.discoveryCacheMinutes       60
host.auth.jwt.jwksCacheMinutes            15
host.swagger.routePrefix                  swagger
host.tsGen.enabled                        false
host.healthCheck.path                     /health
host.healthCheck.readyPath                /health/ready
host.healthCheck.livePath                 /health/live`;

const repositoryCode = `[Repository]
public sealed class CityRepository(
    IFreeSql fsql,
    IMultiLevelCache cache,
    ILogger<CityRepository> logger,
    IAsgardRepositoryContext repositoryContext)
    : AbsAsgardRepositoryBase<City, string>(
        fsql, cache, logger, repositoryContext), ICityRepository
{
}`;

const updateCode = `var city = await repository.GetByIdAsync(id)
    ?? throw new InvalidOperationException($"City not found: {id}");

city.Rename(dto.Name);
await repository.UpdateAsync(city);`;

const databaseYamlCode = `database:
  enabled: true
  provider: mysql
  connectionString: "\${env:ASGARD_DATABASE}"`;

const databaseDefaultsCode = `database.enabled             false
database.provider            MySQL
database.connectionString    ""`;

const databaseProvidersCode = `provider aliases (case-insensitive)
sqlserver
postgresql
mysql
sqlite
oracle
dm / 达梦
kingbase / 人大金仓

bundled by Asgard.Core 5.1.3
FreeSql.Provider.MySql`;

const cacheYamlCode = `caching:
  enabled: true
  memory:
    enabled: true
    defaultExpirationMinutes: 5
    sizeLimit: 104857600
    compactOnMemoryPressure: 0.9
    expirationScanFrequencyMinutes: 1
  redis:
    enabled: true
    connectionString: "\${env:ASGARD_REDIS}"
    instanceName: "Asgard:"
    defaultExpirationMinutes: 30
    connectTimeout: 5000
    syncTimeout: 5000
    asyncTimeout: 5000
    allowAdmin: false
    ssl: false
    password: "\${env:ASGARD_REDIS_PASSWORD}"
    database: 0
    retryCount: 3
    retryIntervalMilliseconds: 1000
    fallbackToMemoryCache: true`;

const cacheDefaultsCode = `caching.enabled                                  false
caching.memory.enabled                           false
caching.memory.defaultExpirationMinutes          5
caching.memory.sizeLimit                         null
caching.memory.compactOnMemoryPressure            0.9
caching.memory.expirationScanFrequencyMinutes     1
caching.redis.enabled                            false
caching.redis.connectionString                   localhost:6379
caching.redis.instanceName                       Asgard:
caching.redis.defaultExpirationMinutes            30
caching.redis.connectTimeout                      5000
caching.redis.syncTimeout                         5000
caching.redis.asyncTimeout                        5000
caching.redis.allowAdmin                          false
caching.redis.ssl                                 false
caching.redis.password                            null
caching.redis.database                            0
caching.redis.retryCount                          3
caching.redis.retryIntervalMilliseconds           1000
caching.redis.fallbackToMemoryCache                true`;

const cacheApiCode = `GetAsync<T>(key, cancellationToken)
SetAsync<T>(key, value, expiration, cancellationToken)
SetAsync<T>(key, value, cancellationToken)
RemoveAsync(key, cancellationToken)
ExistsAsync(key, cancellationToken)
RefreshAsync<T>(key, cancellationToken)
RemoveRangeAsync(keys, cancellationToken)
ClearAsync(cancellationToken)`;

const cacheCode = `public async Task<CityDto?> GetAsync(string id)
{
    var key = $"cities:city:{id}";
    var cache = AsgardContext.Cache;

    if (cache is not null)
    {
        var cached = await cache.GetAsync<CityDto>(key);
        if (cached is not null)
        {
            return cached;
        }
    }

    var city = await repository.GetByIdAsync(id);
    var result = city?.ToDto();

    if (result is not null && cache is not null)
    {
        await cache.SetAsync(key, result);
    }

    return result;
}`;

const messagingYamlCode = `messaging:
  enabled: true
  rabbitmq:
    enabled: true
    hostName: "rabbitmq"
    port: 5672
    userName: "\${env:RABBITMQ_USER}"
    password: "\${env:RABBITMQ_PASSWORD}"
    virtualHost: "/"
    exchangeName: "asgard.exchange"
    exchangeType: "topic"
    queuePrefix: "asgard."
    automaticRecovery: true
    requestedHeartbeat: 60
    prefetchCount: 10
    requestedConnectionTimeout: 5000
    retryCount: 3
    retryIntervalMilliseconds: 1000
    ssl: false
    persistentMessages: true
    durableQueues: true
    autoDeclare: true
  tracing:
    enabled: false
    storeType: Memory
    sampleRate: 1.0
    retentionDays: 7
    includePayload: false
    maxPayloadSize: 1024
    includeErrorStack: true
    maxMemoryRecords: 10000
    enablePropagation: true
  retry:
    policyType: ExponentialBackoff
    maxRetryCount: 3
    initialDelayMilliseconds: 1000
    maxDelayMilliseconds: 60000
    multiplier: 2.0
    jitter: true
    jitterRange: 0.1
    skipNonRetriableExceptions: true
  delayedMessage:
    enabled: false
    mode: TTL
    maxDelayMilliseconds: 86400000
    delayedExchangePrefix: "delayed."
    delayedQueuePrefix: "delayed."
    maxMemoryQueueSize: 10000
    pollingIntervalMilliseconds: 100
  enableDeadLetterQueue: true
  deadLetterQueueSuffix: ".dlq"`;

const messagingDefaultsCode = `messaging.enabled                                  false
messaging.rabbitmq.enabled                         true
messaging.rabbitmq.hostName                        localhost
messaging.rabbitmq.port                            5672
messaging.rabbitmq.exchangeName                    asgard.exchange
messaging.rabbitmq.exchangeType                    topic
messaging.rabbitmq.queuePrefix                     asgard.
messaging.rabbitmq.requestedHeartbeat              60
messaging.rabbitmq.prefetchCount                   10
messaging.rabbitmq.requestedConnectionTimeout      5000
messaging.tracing.enabled                          false
messaging.retry.policyType                         ExponentialBackoff
messaging.retry.maxRetryCount                      3
messaging.delayedMessage.enabled                   false
messaging.delayedMessage.mode                      TTL
messaging.delayedMessage.maxDelayMilliseconds      86400000
messaging.delayedMessage.delayedExchangePrefix     delayed.
messaging.delayedMessage.delayedQueuePrefix        delayed.
messaging.enableDeadLetterQueue                    true
messaging.deadLetterQueueSuffix                    .dlq`;

const messagingApiCode = `PublishAsync<T>(topic, value, options, cancellationToken)
PublishAsync<T>(topic, Message<T>, cancellationToken)
SubscribeAsync<T>(topic, handler, options, cancellationToken)
UnsubscribeAsync(subscriptionId, cancellationToken)
PullAsync<T>(topic, cancellationToken)
PublishBatchAsync<T>(topic, messages, cancellationToken)
IsHealthyAsync(cancellationToken)`;

const publishCode = `var queue = AsgardContext.MessageQueue;
if (queue is null)
{
    // Explicit fallback: persist an outbox record or run synchronously.
    return;
}

await queue.PublishAsync(
    "orders.created",
    new OrderCreated(order.Id, order.TenantId),
    new PublishOptions
    {
        Key = order.Id,
        Headers = new Dictionary<string, string>
        {
            ["tenant_id"] = order.TenantId
        }
    },
    cancellationToken);`;

const subscribeCode = `protected override async Task OnInitializeAsync(
    CancellationToken cancellationToken)
{
    var queue = GetAsgardContext().MessageQueue;
    if (queue is null)
    {
        return;
    }

    _ = await queue.SubscribeAsync<OrderCreated>(
        "orders.created",
        async (message, context) =>
        {
            await orderProjection.ApplyAsync(
                message.Value!, cancellationToken);
            await context.AcknowledgeAsync();
        },
        new SubscribeOptions { AutoAck = false },
        cancellationToken);
}`;

const jobYamlCode = `job:
  enabled: true
  scheduler:
    threadPoolSize: 10
    instanceId: "AUTO"
  jobs:
    - name: "prune-expired-sessions"
      group: "heimdall"
      jobType: "MyApp.Jobs.PruneSessionsJob, MyApp.Plugin"
      description: "Remove expired sessions"
      triggers:
        - type: cron
          cron: "0 0/5 * * * ?"
          description: "prune-expired-sessions-cron"
          priority: 5
          startNow: false
    - name: "refresh-projection"
      group: "maintenance"
      jobType: "MyApp.Jobs.RefreshProjectionJob, MyApp.Plugin"
      triggers:
        - type: simple
          interval: "PT5M"
          repeatCount: -1
          description: "refresh-projection-every-five-minutes"
          startNow: true`;

const pluginJobYamlCode = `jobs:
  - name: "cleanup-plugin-data"
    group: "my-plugin"
    jobType: "MyPlugin.Jobs.CleanupPluginDataJob, MyPlugin"
    description: "Clean expired plugin data"
    triggers:
      - type: cron
        cron: "0 0 2 * * ?"
        description: "cleanup-plugin-data-nightly"
        startNow: false`;

const jobDefaultsCode = `job.enabled                                  false
job.scheduler.threadPoolSize                 10        wired
job.scheduler.instanceId                     AUTO      wired
job.scheduler.maxBatchSize                   100       reserved
job.scheduler.enableCluster                  false     reserved
job.scheduler.jobFactoryType                 null      reserved
job.scheduler.connectionString               null      reserved
job.scheduler.dbProvider                     null      reserved
job.jobs[].group                              DEFAULT
job.jobs[].triggers[].type                    simple
job.jobs[].triggers[].repeatCount             -1
job.jobs[].triggers[].priority                5
job.jobs[].triggers[].startNow                false
job.jobs[].triggers[].misfireInstruction      SmartPolicy (reserved)`;

const jobCode = `protected override async Task OnInitializeAsync(
    CancellationToken cancellationToken)
{
    var scheduler = GetAsgardContext().JobScheduler;
    if (scheduler is null)
    {
        return;
    }

    await scheduler.ScheduleJobAsync<PruneSessionsJob>(
        new JobKey("prune-expired-sessions", "heimdall"),
        trigger =>
        {
            trigger.Type = "cron";
            trigger.Cron = "0 0/5 * * * ?";
            trigger.Description = "prune-expired-sessions-cron";
        },
        cancellationToken);
}`;

export const zhInfrastructureDocs: DocPage[] = [
  {
    slug: "configuration",
    group: "基础设施",
    eyebrow: "CONFIGURATION",
    title: "配置系统",
    description: "用 YAML、环境变量、命令行和强类型配置统一宿主与插件的运行参数。",
    sections: [
      {
        id: "sources",
        title: "配置来源与优先级",
        paragraphs: [
          "Asgard 按 YAML → 环境变量 → 命令行的顺序合并配置，后加载的来源覆盖先加载来源。排查配置问题时必须检查完整覆盖链，而不能只盯着 app.yaml。",
          "新 starter 推荐把 app.yaml 放在启动项目根目录；如果现有项目使用 config/app.yaml，只要在 YggdrasilHost.CreateBuilder(...) 中传入准确路径即可继续使用。plugin.yaml 属于插件主体，不应与宿主配置重复维护同一份业务参数。",
        ],
      },
      {
        id: "placeholders",
        title: "占位符与敏感配置",
        paragraphs: [
          "${env:NAME} 从进程环境读取敏感值；${path.to.value} 引用合并配置图中的另一个值。环境变量占位符缺失时加载直接失败，配置路径未命中则保留原文本，便于发现错误。",
        ],
        code: { language: "yaml", value: configYamlCode },
        note: "宿主端口使用 host.kestrel.endpoints.*.url；当前实现不读取 host.port。",
      },
      {
        id: "typed",
        title: "强类型配置",
        paragraphs: [
          "框架配置类实现 ISystemConfig，每个属性用 ConfigPath 绑定明确路径，并在 Validate() 中校验“启用后必需”的字段。非法配置应在启动阶段失败。",
        ],
        code: { language: "csharp", value: configClassCode },
      },
      {
        id: "plugin",
        title: "插件配置边界",
        bullets: [
          "app.yaml：宿主监听、认证、Swagger 与共享基础设施",
          "plugin.yaml：插件自身元数据和独立业务配置",
          "AddPluginConventions<TPlugin,TConfig>()：加载插件配置并按约定注册模块",
          "不要在两个文件中维护同一个配置键的不同副本",
        ],
      },
      {
        id: "host-reference",
        title: "完整宿主配置骨架",
        paragraphs: ["host.application 与 host.kestrel 是宿主根配置；CORS、认证、Swagger、TsGen、限流和健康检查是可选节点，只有节点存在且 enabled 为 true 时才接线。host.staticFiles 始终有默认对象，并默认映射 wwwroot，但默认文件解析默认关闭。"],
        code: { language: "yaml", value: hostReferenceYamlCode },
      },
      {
        id: "host-defaults",
        title: "关键默认值",
        paragraphs: ["以下值直接来自 5.1.3 强类型配置。可选宿主节点未写入 YAML 时整体为 null，不应把节点内部的 enabled 默认值误解为“功能无条件开启”。"],
        code: { language: "text", value: hostDefaultsCode },
      },
      {
        id: "host-boundaries",
        title: "宿主功能边界",
        bullets: [
          "CORS：allowAnyOrigin=true 不能同时 allowCredentials=true；关闭任意来源时必须提供 allowedOrigins",
          "认证：issuerTemplate 必须是绝对 URI，并且必须且只能使用 {tenant} 租户片段；生产保持 requireHttpsMetadata=true",
          "认证关闭：host.auth.enabled=false 只关闭宿主默认 JWT Bearer，不移除 AsgardAuth、租户或授权管道",
          "TsGen：只有 host.tsGen.enabled=true 且环境为 Development 才映射 /asgard-tsgen",
          "限流：policy 支持 FixedWindow、SlidingWindow、TokenBucket；TokenBucket 还必须提供 tokenLimit 与 tokensPerSecond",
          "健康检查：映射 path、readyPath、livePath 三个端点；键名不是 endpoint",
          "静态文件：requestPath 为空或以 / 开头；enableDefaultFiles=true 时 defaultFiles 不能为空",
        ],
      },
      {
        id: "module-roots",
        title: "基础设施配置根",
        paragraphs: ["共享基础设施与宿主配置并列存在于 app.yaml。大多数模块默认关闭；启用后必须满足各自 Validate() 约束。详细字段和运行语义由数据库、缓存、消息、作业、安全和可观测性专题继续展开。"],
        code: { language: "text", value: infrastructureRootsCode },
      },
      {
        id: "production-checklist",
        title: "生产配置检查",
        bullets: ["连接串、密码、证书口令与加密材料使用 ${env:NAME} 注入", "固定公开监听地址，并在反向代理后校验外部 Issuer、HTTPS 和 Forwarded Headers", "生产 CORS 只列可信来源，不使用任意来源兜底", "关闭 detailedErrors 与开发专用 TsGen", "分别验收 /health、/health/ready、/health/live", "启动失败时先读取配置校验异常，再检查环境变量和命令行覆盖"],
      },
    ],
  },
  {
    slug: "database",
    group: "基础设施",
    eyebrow: "FREESQL + REPOSITORIES",
    title: "数据库与仓储",
    description: "配置 FreeSql 数据访问，使用统一仓储、租户过滤、审计字段和乐观锁更新。",
    sections: [
      {
        id: "enable",
        title: "启用数据库",
        paragraphs: [
          "database.enabled 打开业务数据库模块。标准 Yggdrasil 宿主把 IFreeSql 注册为延迟创建的单例；关闭时不会注册 IFreeSql，也没有空实现。框架不会在启动时主动探测连接、迁移结构或启用 AutoSync。",
        ],
        code: { language: "yaml", value: databaseYamlCode },
        note: "业务主库与 logging.database 是两套独立 FreeSql 连接；日志库不复用业务仓储、租户过滤或业务实体。",
      },
      { id: "defaults", title: "完整字段与默认值", paragraphs: ["DatabaseConfig 当前只有三个字段。enabled=true 时 connectionString 不能为空，但 provider 是否可用会延迟到 FreeSql 创建时才发现。"], code: { language: "text", value: databaseDefaultsCode } },
      { id: "providers", title: "Provider 映射与包边界", paragraphs: ["解析器认识下列 provider 名称，但 Asgard.Core 5.1.3 只随包引用 FreeSql.Provider.MySql。因此 MySQL/MariaDB 有随框架交付的 provider 证据；选择 PostgreSQL、SQL Server 等其他数据库时，应用必须显式安装对应 FreeSql provider 并做集成测试。Heimdall 的生产主库策略仍是 PostgreSQL。"], code: { language: "text", value: databaseProvidersCode } },
      {
        id: "repository",
        title: "标准仓储",
        paragraphs: [
          "仓储实现统一继承 AbsAsgardRepositoryBase<TEntity,TKey>，使用 Repository 特性参与扫描，并注入 IFreeSql、IMultiLevelCache、ILogger 与 IAsgardRepositoryContext。即使缓存模块关闭，宿主也会提供可注入的空缓存实现。",
        ],
        code: { language: "csharp", value: repositoryCode },
      },
      {
        id: "tenant",
        title: "租户与作用域",
        bullets: [
          "租户实体继承 AbsAsgardTenantEntity",
          "HTTP 请求由 UseAsgardTenant() 建立当前租户身份",
          "FreeSql GlobalFilter 自动为查询、更新和删除附加租户条件",
          "后台任务使用 ITenantScopeFactory.CreateScope(tenantId)",
          "平台级上下文没有租户时，不自动附加租户过滤",
        ],
      },
      { id: "tenant-safety", title: "当前租户与缓存安全边界", bullets: ["仓储缓存键当前不包含 TenantId，而 Get/GetAsync 会先读缓存再访问带 GlobalFilter 的数据库；多租户实体必须自行使用 tenant-aware key 或禁用这层实体缓存，否则已知 ID 可能造成跨租户缓存读取", "Guid.Empty 会关闭租户过滤，只能用于受保护的平台级流程，不能视为拒绝访问", "实体已经带 TenantId 时仓储会保留该值，不会校验其等于当前租户；写入前必须验证", "租户填充、缓存清理与 Trace 包装依赖标准仓储入口；转换为基类或直接使用 FreeSql 可能绕过这些行为", "Deleted 字段目前没有全局软删除过滤，Delete 也不会自动改成逻辑删除", "数据库提交与缓存失效不是原子事务；缓存清理失败时必须依靠短 TTL、重试或显式补偿"], note: "租户隔离是安全边界。上线前必须用两个租户、相同实体 ID 和冷热缓存路径做穿透测试。" },
      {
        id: "updates",
        title: "乐观锁更新",
        paragraphs: [
          "带 Version 的实体必须先查后改，在数据库当前实体上应用允许修改的字段。不要在更新路径调用 dto.ToEntity() 再直接 UpdateAsync；这会丢失当前 Version，并可能覆盖 TenantId、CreateTime、Deleted 等持久化字段。",
        ],
        code: { language: "csharp", value: updateCode },
      },
      {
        id: "schema",
        title: "结构约定",
        bullets: [
          "表与列使用小写 snake_case；主键统一为 id",
          "租户、审计与并发列使用 tenant_id、create_time、update_time、create_by、update_by、deleted、version",
          "逻辑关联仅保留 {entity}_id 与必要索引",
          "不创建数据库外键、级联删除或级联更新",
        ],
      },
    ],
  },
  {
    slug: "caching",
    group: "基础设施",
    eyebrow: "MEMORY + REDIS",
    title: "多级缓存",
    description: "组合进程内缓存与 Redis，并在模块关闭或缓存未命中时安全降级。",
    sections: [
      {
        id: "strategy",
        title: "缓存策略",
        paragraphs: [
          "Asgard 的多级缓存先读内存，再读 Redis；Redis 命中后回填内存。写入顺序是 Redis → 内存，Redis 写入失败时不会继续写内存。删除会处理所有已启用的层。缓存只是加速层，数据源始终是真理之源。",
          "双层模式下，只要 Redis 实例存在，一级内存缓存 TTL 当前固定为 2 秒，用来限制跨节点陈旧窗口；memory.defaultExpirationMinutes 只决定纯内存模式的默认 TTL。当前没有 Redis Pub/Sub 主动失效。",
        ],
      },
      {
        id: "configure",
        title: "启用与配置",
        code: { language: "yaml", value: cacheYamlCode },
        bullets: [
          "caching.enabled 打开模块",
          "memory.enabled 与 redis.enabled 至少启用一种",
          "Redis 启用时 connectionString 必填",
          "instanceName 用于隔离不同应用的键空间",
        ],
      },
      {
        id: "defaults",
        title: "完整字段与默认值",
        paragraphs: [
          "以下默认值来自 CacheConfig、MemoryCacheOptions 与 RedisCacheOptions。Redis 密码和连接串应通过环境变量注入。",
        ],
        code: { language: "text", value: cacheDefaultsCode },
      },
      {
        id: "use",
        title: "读取、回源与写入",
        paragraphs: [
          "业务服务从 AbsAsgardContext.Cache 获取缓存。标准 Yggdrasil 在 caching.enabled=false 时仍注册 no-op IMultiLevelCache，因此默认宿主中该入口通常非 null；示例继续保持 null-safe，以兼容自定义宿主。未命中时回源仓储，成功读取后再回填缓存。",
        ],
        code: { language: "csharp", value: cacheCode },
      },
      {
        id: "api",
        title: "缓存 API",
        paragraphs: ["IMultiLevelCache 除了常用的 Get/Set/Remove，还提供刷新、批量删除和全库清理。"],
        code: { language: "text", value: cacheApiCode },
      },
      {
        id: "consistency",
        title: "一致性规则",
        bullets: [
          "键名采用 模块:实体:标识，例如 cities:city:42",
          "更新或删除成功后立即 RemoveAsync 失效相关键",
          "不要把未命中直接解释为业务数据不存在",
          "不要让缓存成为唯一数据源",
          "仓储基类依赖 IMultiLevelCache；业务服务通常使用 AsgardContext.Cache",
        ],
      },
      {
        id: "runtime-boundaries",
        title: "当前运行边界",
        bullets: [
          "fallbackToMemoryCache=true 当前不保证 Redis 启动降级；Yggdrasil 会连接并健康读 Redis，失败会终止宿主构建",
          "retryCount 与 retryIntervalMilliseconds 当前只参与配置校验，尚未接入显式重试循环",
          "RefreshAsync 只从 Redis 刷新；纯内存模式下返回默认值",
          "RemoveRangeAsync 当前逐键顺序删除，不是 Redis pipeline",
          "ClearAsync 会执行整个 Redis database 的 FLUSHDB，不按 instanceName 前缀清理；需要 allowAdmin=true，生产环境慎用",
          "sizeLimit 的声明单位与当前条目 Size 估算存在偏差，不应把它当成精确字节上限",
          "expirationScanFrequencyMinutes=0 只是不覆盖 MemoryCache 默认扫描频率，不等于保证禁用扫描",
        ],
        note: "RedisCacheOptions.FallbackToMemoryCache 是当前配置表面，不应把它解释为已经验证过的运行时故障转移。",
      },
    ],
  },
  {
    slug: "messaging",
    group: "基础设施",
    eyebrow: "RABBITMQ",
    title: "消息队列",
    description: "通过 RabbitMQ 发布订阅，并准确理解追踪、重试、延迟消息与死信配置的当前接线边界。",
    sections: [
      {
        id: "configure",
        title: "配置 RabbitMQ",
        paragraphs: [
          "当前消息模块统一基于 RabbitMQ，不再需要 provider 切换。配置类型声明了追踪、重试、延迟消息与死信选项，但其中若干高级链路尚未接入主 IMessageQueue，下面会明确区分配置表面与实际运行能力。",
        ],
        code: { language: "yaml", value: messagingYamlCode },
      },
      {
        id: "defaults",
        title: "关键默认值",
        code: { language: "text", value: messagingDefaultsCode },
        note: "messaging.enabled=true 时，Yggdrasil 会在启动阶段连接 RabbitMQ 并执行健康检查；连接失败会终止宿主启动。",
      },
      {
        id: "publish",
        title: "发布消息",
        paragraphs: [
          "从 AbsAsgardContext.MessageQueue 获取统一入口。模块关闭时入口为 null，业务必须明确选择同步执行、Outbox 或跳过等降级策略。topic、routing key 和 header 契约应稳定且可版本化。当前主 PublishAsync 不读取 DelayMilliseconds。",
        ],
        code: { language: "csharp", value: publishCode },
      },
      {
        id: "subscribe",
        title: "订阅与确认",
        paragraphs: [
          "订阅在插件 OnInitializeAsync 阶段建立。推荐保持 AutoAck=false，并且只在业务处理成功后调用 AcknowledgeAsync。当前消费异常会由 RabbitMQ 实现捕获并 Nack；由于 RetryCount 尚未正确递增，不能把它描述为可靠的“固定次数指数退避后死信”。",
        ],
        code: { language: "csharp", value: subscribeCode },
      },
      {
        id: "api",
        title: "真实公开 API",
        code: { language: "text", value: messagingApiCode },
        note: "PublishBatchAsync 当前逐条 await 发布，并不是 broker 原生批处理。",
      },
      {
        id: "operations",
        title: "运行规则",
        bullets: [
          "消费者 handler 保持轻量，复杂逻辑下沉到 Service",
          "消费逻辑需要幂等，避免重试造成重复副作用",
          "消费者异常路径需要结合当前 Nack/requeue 行为压测，避免无限重复副作用",
          "不要忘记确认消息，否则消息会保持未完成状态",
          "监控连接健康、重试量、积压与死信队列",
        ],
      },
      {
        id: "advanced-boundaries",
        title: "高级能力的当前边界",
        bullets: [
          "messaging.retry.* 的策略对象尚未接入 SubscribeAsync 消费管道；不能承诺指数退避和固定次数终止",
          "messaging.delayedMessage.* 尚未接入主 PublishAsync；DelayMilliseconds 当前被忽略",
          "enableDeadLetterQueue 只给业务队列写 DLX 参数，不会自动声明和绑定真正的 .dlq 队列；需要运维侧预配并验证路由",
          "messaging.tracing.enabled 当前只附加随机 X-Trace-Id 等消息头，不传播当前 HTTP Trace；采样、存储、payload 与 retention 选项尚未自动接线",
          "rabbitmq.retryCount/retryIntervalMilliseconds 只校验配置，初次连接没有显式重试循环；AutomaticRecovery 处理的是已建立连接后的恢复",
          "AutoAck=true 当前存在成功路径重复确认风险，文档示例统一使用 AutoAck=false",
        ],
        note: "这些字段是源码中存在的配置表面，不等于整条运行链路已经完整交付。",
      },
    ],
  },
  {
    slug: "job-scheduling",
    group: "基础设施",
    eyebrow: "QUARTZ.NET",
    title: "作业调度",
    description: "使用 Quartz Cron、简单间隔、静态配置和运行时注册调度后台任务。",
    sections: [
      {
        id: "choose",
        title: "静态还是动态",
        bullets: [
          "宿主级固定作业：写入 app.yaml 的 job.jobs",
          "插件随包交付的作业：写入 plugin.yaml 并自动加载",
          "依赖运行时条件的作业：在插件 OnInitializeAsync 动态注册",
          "暂停、恢复、立即触发和删除：通过 AbsAsgardContext.JobScheduler",
        ],
      },
      {
        id: "configure",
        title: "Cron 配置",
        code: { language: "yaml", value: jobYamlCode },
        note: "Cron 使用 Quartz 语法；0 0/5 * * * ? 表示每 5 分钟执行。simple interval 必须使用 XML/ISO 8601 duration，例如 PT5M。",
      },
      {
        id: "defaults",
        title: "字段默认值与接线状态",
        code: { language: "text", value: jobDefaultsCode },
        note: "当前调度器固定使用 SimpleThreadPool + RAMJobStore；只有 threadPoolSize 与 instanceId 进入 Quartz 初始化。",
      },
      {
        id: "plugin-jobs",
        title: "插件自带作业",
        paragraphs: [
          "plugin.yaml 使用根节点 jobs，字段结构与 job.jobs[] 相同。自动注册要求宿主已经设置 job.enabled=true；插件没有独立的 Job 开关。",
        ],
        code: { language: "yaml", value: pluginJobYamlCode },
      },
      {
        id: "register",
        title: "动态注册",
        paragraphs: [
          "动态注册应发生在 PluginBase.OnInitializeAsync，而不是 ConfigureServices。回调参数是 Asgard TriggerOptions，不是 Quartz TriggerBuilder。使用稳定的 JobKey 和唯一 Trigger description，避免重复或键冲突。",
        ],
        code: { language: "csharp", value: jobCode },
      },
      {
        id: "runtime",
        title: "运行时操作",
        bullets: [
          "ScheduleJobAsync / AddJobAsync：新增或调度作业",
          "PauseJobAsync / ResumeJobAsync：暂停与恢复",
          "TriggerJobAsync：立即触发一次",
          "GetJobStatusAsync / CheckJobExistsAsync：查询状态",
          "DeleteJobAsync：删除作业",
        ],
        note: "JobScheduler 在模块关闭时为 null；调用前必须检查并提供业务可接受的降级行为。",
      },
      {
        id: "runtime-boundaries",
        title: "当前运行边界",
        bullets: [
          "maxBatchSize、enableCluster、jobFactoryType、connectionString 与 dbProvider 当前未被调度器读取；设置 enableCluster=true 仍是 RAMJobStore",
          "JobDefinitionOptions.Data 与 TriggerOptions.MisfireInstruction 当前没有传入 Quartz",
          "Job 实现 Asgard.Abstractions.Job.IJob.ExecuteAsync(IJobExecutionContext)，不是 Quartz IJob",
          "同一作业的多个 Trigger 必须提供唯一 description；当前实现会把它用作 Trigger Key",
          "监听器注册方法目前是 no-op；不要依赖它们做审计或告警",
          "作业异常由 Adapter 记录但不重新抛给 Quartz，当前不能宣传自动失败重试",
        ],
      },
    ],
  },
];

export const enInfrastructureDocs: DocPage[] = [
  {
    slug: "configuration",
    group: "Infrastructure",
    eyebrow: "CONFIGURATION",
    title: "Configuration",
    description: "Unify host and plugin settings with YAML, environment variables, command line, and typed configuration.",
    sections: [
      { id: "sources", title: "Sources and precedence", paragraphs: ["Asgard merges YAML, environment variables, then command-line arguments. Later sources override earlier sources, so troubleshooting must inspect the complete override chain.", "New starters should keep app.yaml at the host project root. Existing projects that use config/app.yaml remain valid when that exact path is passed to YggdrasilHost.CreateBuilder(...). plugin.yaml belongs to the plugin implementation and should not duplicate host settings."] },
      { id: "placeholders", title: "Placeholders and secrets", paragraphs: ["${env:NAME} reads a process environment variable; ${path.to.value} references another value in the merged configuration graph. A missing environment variable fails loading, while an unresolved configuration path remains visible as its original placeholder."], code: { language: "yaml", value: configYamlCode }, note: "Configure host listeners with host.kestrel.endpoints.*.url. The current implementation does not read host.port." },
      { id: "typed", title: "Typed configuration", paragraphs: ["Framework configuration types implement ISystemConfig, bind every property through ConfigPath, and validate fields that become mandatory when the module is enabled. Invalid configuration should fail during startup."], code: { language: "csharp", value: configClassCode } },
      { id: "plugin", title: "Plugin boundary", bullets: ["app.yaml: listeners, authentication, Swagger, and shared infrastructure", "plugin.yaml: plugin metadata and plugin-owned business settings", "AddPluginConventions<TPlugin,TConfig> loads configuration and convention-based registrations", "Never maintain conflicting copies of the same setting in both files"] },
      { id: "host-reference", title: "Complete host skeleton", paragraphs: ["host.application and host.kestrel are root host settings. CORS, authentication, Swagger, TsGen, rate limiting, and health checks are optional nodes and are wired only when the node exists and enabled is true. host.staticFiles always has a default object and maps wwwroot by default, while default-file resolution starts disabled."], code: { language: "yaml", value: hostReferenceYamlCode } },
      { id: "host-defaults", title: "Key defaults", paragraphs: ["These values come directly from the 5.1.3 typed configuration. An omitted optional host node is null; do not interpret the nested enabled default as a feature being unconditionally active."], code: { language: "text", value: hostDefaultsCode } },
      { id: "host-boundaries", title: "Host feature boundaries", bullets: ["CORS: allowAnyOrigin=true cannot be combined with allowCredentials=true; an explicit origin list is mandatory otherwise", "Authentication: issuerTemplate must be an absolute URI and use the {tenant} segment; keep requireHttpsMetadata=true in production", "Disabling host auth only removes the default JWT Bearer wiring; it does not remove AsgardAuth, tenancy, or authorization", "TsGen maps /asgard-tsgen only when enabled and the environment is Development", "Rate limiting supports FixedWindow, SlidingWindow, and TokenBucket; TokenBucket also requires tokenLimit and tokensPerSecond", "Health checks map path, readyPath, and livePath; the key is not endpoint", "Static requestPath is empty or begins with /; defaultFiles cannot be empty when enableDefaultFiles=true"] },
      { id: "module-roots", title: "Infrastructure configuration roots", paragraphs: ["Shared infrastructure sits beside host configuration in app.yaml. Most modules start disabled and must satisfy their Validate() constraints after activation. The database, cache, messaging, jobs, security, and observability guides provide field-level runtime behavior."], code: { language: "text", value: infrastructureRootsCode } },
      { id: "production-checklist", title: "Production checklist", bullets: ["Inject connection strings, passwords, certificate secrets, and encryption material through ${env:NAME}", "Pin listener addresses and verify the public issuer, HTTPS, and forwarded headers behind the reverse proxy", "Allow only trusted production CORS origins", "Disable detailedErrors and development-only TsGen", "Verify /health, /health/ready, and /health/live independently", "On startup failure, read the validation exception before checking environment and command-line overrides"] },
    ],
  },
  {
    slug: "database",
    group: "Infrastructure",
    eyebrow: "FREESQL + REPOSITORIES",
    title: "Database and repositories",
    description: "Configure FreeSql and use standard repositories, tenant filters, audit fields, and optimistic concurrency.",
    sections: [
      { id: "enable", title: "Enable the database", paragraphs: ["database.enabled activates the application database module. The standard Yggdrasil host registers IFreeSql as a lazy singleton. Disabled means no IFreeSql registration and no no-op implementation. The framework performs no startup connection probe, migration, or AutoSync for the application database."], code: { language: "yaml", value: databaseYamlCode }, note: "The application database and logging.database use independent FreeSql connections. Database logging does not reuse business repositories, tenant filters, or entities." },
      { id: "defaults", title: "Complete fields and defaults", paragraphs: ["DatabaseConfig currently has only three fields. An enabled module requires a non-empty connectionString, while provider availability is discovered only when FreeSql is created."], code: { language: "text", value: databaseDefaultsCode } },
      { id: "providers", title: "Provider mapping and package boundary", paragraphs: ["The resolver recognizes the names below, but Asgard.Core 5.1.3 bundles only FreeSql.Provider.MySql. MySQL/MariaDB therefore has bundled-provider evidence. For PostgreSQL, SQL Server, and every other mapped database, the application must install the corresponding FreeSql provider and run integration tests. Heimdall separately narrows its production database policy to PostgreSQL."], code: { language: "text", value: databaseProvidersCode } },
      { id: "repository", title: "Standard repository", paragraphs: ["Repository implementations inherit AbsAsgardRepositoryBase<TEntity,TKey>, carry the Repository attribute, and inject IFreeSql, IMultiLevelCache, ILogger, and IAsgardRepositoryContext. The host provides an injectable no-op cache even when caching is disabled."], code: { language: "csharp", value: repositoryCode } },
      { id: "tenant", title: "Tenant scope", bullets: ["Tenant entities inherit AbsAsgardTenantEntity", "UseAsgardTenant() establishes request identity", "FreeSql GlobalFilter applies tenant conditions to query, update, and delete", "Background work uses ITenantScopeFactory.CreateScope(tenantId)", "Platform contexts without a tenant do not receive an automatic tenant filter"] },
      { id: "tenant-safety", title: "Current tenant and cache safety boundaries", bullets: ["Repository cache keys currently omit TenantId, and Get/GetAsync reads cache before the tenant-filtered database; tenant entities need tenant-aware keys or this entity cache disabled, otherwise a known ID can cross tenant boundaries", "Guid.Empty disables the tenant filter and is reserved for protected platform workflows; it is not deny-by-default", "A prefilled entity TenantId is preserved and is not checked against the current tenant; validate it before writes", "Tenant filling, cache invalidation, and tracing wrap the standard repository entry points; base-type or direct FreeSql calls can bypass them", "Deleted has no global soft-delete filter and Delete is not automatically logical", "Database commit and cache invalidation are not atomic; use bounded TTL, retries, or explicit compensation"], note: "Tenant isolation is a security boundary. Test two tenants with the same entity ID across both cold and warm cache paths before production." },
      { id: "updates", title: "Optimistic updates", paragraphs: ["Versioned entities use read-modify-write. Load the current entity and apply only allowed changes. Do not map an update DTO to a fresh entity and call UpdateAsync; that loses the current Version and can overwrite TenantId, CreateTime, Deleted, and other persisted fields."], code: { language: "csharp", value: updateCode } },
      { id: "schema", title: "Schema conventions", bullets: ["Lowercase snake_case tables and columns; primary key id", "tenant_id, create_time, update_time, create_by, update_by, deleted, and version", "Logical relations use {entity}_id columns plus required indexes", "No database foreign keys, cascade deletes, or cascade updates"] },
    ],
  },
  {
    slug: "caching",
    group: "Infrastructure",
    eyebrow: "MEMORY + REDIS",
    title: "Multi-level caching",
    description: "Combine in-process memory and Redis while degrading safely when caching is disabled or misses.",
    sections: [
      { id: "strategy", title: "Caching strategy", paragraphs: ["Asgard reads memory first, then Redis, and fills memory after a Redis hit. Writes go to Redis before memory, so a Redis write failure prevents the L1 write. Removals cover every enabled level. Cache remains an acceleration layer—the data source is authoritative.", "Whenever a Redis instance exists, the L1 TTL is currently fixed at two seconds to bound cross-node staleness. memory.defaultExpirationMinutes controls the memory-only default, not L1 in the two-level mode. There is no Redis Pub/Sub invalidation today."] },
      { id: "configure", title: "Enable and configure", code: { language: "yaml", value: cacheYamlCode }, bullets: ["caching.enabled activates the module", "Enable at least one of memory or Redis", "Redis connectionString is mandatory when Redis is enabled", "instanceName isolates key spaces between applications"] },
      { id: "defaults", title: "Complete fields and defaults", paragraphs: ["These defaults come from CacheConfig, MemoryCacheOptions, and RedisCacheOptions. Inject Redis credentials through environment variables."], code: { language: "text", value: cacheDefaultsCode } },
      { id: "use", title: "Read, fall back, and fill", paragraphs: ["The standard Yggdrasil host registers a no-op IMultiLevelCache when caching.enabled=false, so AbsAsgardContext.Cache is normally non-null there. The example remains null-safe for custom hosts. A miss falls back to the repository and fills cache only after a successful read."], code: { language: "csharp", value: cacheCode } },
      { id: "api", title: "Cache API", paragraphs: ["IMultiLevelCache also exposes refresh, range removal, and full-store clearing in addition to Get/Set/Remove."], code: { language: "text", value: cacheApiCode } },
      { id: "consistency", title: "Consistency rules", bullets: ["Use module:entity:id keys such as cities:city:42", "Remove affected keys after a successful update or delete", "Do not interpret a cache miss as proof that business data does not exist", "Never make cache the only source of truth", "Repository bases inject IMultiLevelCache; application services normally use AsgardContext.Cache"] },
      { id: "runtime-boundaries", title: "Current runtime boundaries", bullets: ["fallbackToMemoryCache=true does not currently guarantee startup degradation; Yggdrasil connects to and health-reads Redis, and failure aborts host construction", "retryCount and retryIntervalMilliseconds are currently validated but are not wired to an explicit retry loop", "RefreshAsync refreshes only from Redis and returns default in memory-only mode", "RemoveRangeAsync removes keys sequentially rather than using a Redis pipeline", "ClearAsync issues FLUSHDB for the whole Redis database, not the instanceName prefix; it requires allowAdmin=true and is dangerous in production", "The declared sizeLimit unit and the current entry-size estimate do not align, so it is not an exact byte ceiling", "expirationScanFrequencyMinutes=0 leaves the underlying MemoryCache default rather than guaranteeing that scans are disabled"], note: "RedisCacheOptions.FallbackToMemoryCache is part of the configuration surface; do not describe it as proven runtime failover." },
    ],
  },
  {
    slug: "messaging",
    group: "Infrastructure",
    eyebrow: "RABBITMQ",
    title: "Messaging",
    description: "Publish and subscribe through RabbitMQ while understanding the current wiring boundaries of tracing, retry, delay, and dead-letter settings.",
    sections: [
      { id: "configure", title: "Configure RabbitMQ", paragraphs: ["The current messaging module is RabbitMQ-only; there is no provider switch. The configuration types declare tracing, retry, delay, and dead-letter options, but several advanced paths are not wired into the primary IMessageQueue. The sections below separate configuration surface from runtime behavior."], code: { language: "yaml", value: messagingYamlCode } },
      { id: "defaults", title: "Key defaults", code: { language: "text", value: messagingDefaultsCode }, note: "With messaging.enabled=true, Yggdrasil connects to RabbitMQ and performs a health check during startup. A failed connection aborts host startup." },
      { id: "publish", title: "Publish", paragraphs: ["Use AbsAsgardContext.MessageQueue. The property is null when messaging is disabled, so the application must choose an explicit fallback such as synchronous processing, an outbox record, or a safe no-op. Version topic, routing-key, and header contracts deliberately. The primary PublishAsync currently ignores DelayMilliseconds."], code: { language: "csharp", value: publishCode } },
      { id: "subscribe", title: "Subscribe and acknowledge", paragraphs: ["Create subscriptions during plugin OnInitializeAsync. Keep AutoAck=false and acknowledge only after application processing succeeds. The RabbitMQ implementation catches failures and Nacks them; because RetryCount is not currently advanced correctly, this is not a reliable fixed-count exponential-backoff-to-DLQ flow."], code: { language: "csharp", value: subscribeCode } },
      { id: "api", title: "Actual public API", code: { language: "text", value: messagingApiCode }, note: "PublishBatchAsync currently awaits individual publishes; it is not a broker-native batch." },
      { id: "operations", title: "Operational rules", bullets: ["Keep handlers thin and delegate complex logic to a service", "Make consumers idempotent to tolerate redelivery", "Load-test the current Nack/requeue path to avoid endless duplicate side effects", "Do not forget acknowledgement", "Monitor connectivity, redelivery, queue depth, and dead letters"] },
      { id: "advanced-boundaries", title: "Current advanced-feature boundaries", bullets: ["messaging.retry.* is not wired into SubscribeAsync; do not promise exponential backoff or a fixed terminal attempt", "messaging.delayedMessage.* is not wired into the primary PublishAsync and DelayMilliseconds is ignored", "enableDeadLetterQueue writes DLX arguments but does not declare and bind a real .dlq queue; operations must pre-provision and verify the route", "messaging.tracing.enabled adds random X-Trace-Id-style headers but does not propagate the current HTTP trace; sampling, storage, payload, and retention are not wired automatically", "rabbitmq.retryCount/retryIntervalMilliseconds are validated but there is no explicit initial-connection retry loop; AutomaticRecovery covers recovery after a connection exists", "AutoAck=true currently risks a duplicate acknowledgement, so all documentation examples use AutoAck=false"], note: "These fields exist in source configuration; that does not mean the complete runtime path has shipped." },
    ],
  },
  {
    slug: "job-scheduling",
    group: "Infrastructure",
    eyebrow: "QUARTZ.NET",
    title: "Job scheduling",
    description: "Schedule background work with Quartz cron, simple intervals, static configuration, and runtime registration.",
    sections: [
      { id: "choose", title: "Static or dynamic", bullets: ["Fixed host jobs: job.jobs in app.yaml", "Jobs shipped by a plugin: plugin.yaml with automatic loading", "Jobs that depend on runtime conditions: register during plugin OnInitializeAsync", "Pause, resume, trigger, and delete through AbsAsgardContext.JobScheduler"] },
      { id: "configure", title: "Cron and simple configuration", code: { language: "yaml", value: jobYamlCode }, note: "Cron uses Quartz syntax; 0 0/5 * * * ? runs every five minutes. Simple interval must be an XML/ISO 8601 duration such as PT5M." },
      { id: "defaults", title: "Defaults and wiring status", code: { language: "text", value: jobDefaultsCode }, note: "The current scheduler always uses SimpleThreadPool + RAMJobStore. Only threadPoolSize and instanceId enter Quartz initialization." },
      { id: "plugin-jobs", title: "Plugin-owned jobs", paragraphs: ["plugin.yaml uses a root jobs node with the same member shape as job.jobs[]. Automatic registration requires the host-level job.enabled=true; a plugin has no independent job switch."], code: { language: "yaml", value: pluginJobYamlCode } },
      { id: "register", title: "Runtime registration", paragraphs: ["Register dynamic jobs in PluginBase.OnInitializeAsync, never ConfigureServices. The callback receives Asgard TriggerOptions, not a Quartz TriggerBuilder. Use a stable JobKey and a unique Trigger description to avoid duplicate or conflicting keys."], code: { language: "csharp", value: jobCode } },
      { id: "runtime", title: "Runtime operations", bullets: ["ScheduleJobAsync / AddJobAsync: create and schedule", "PauseJobAsync / ResumeJobAsync: suspend and resume", "TriggerJobAsync: run immediately", "GetJobStatusAsync / CheckJobExistsAsync: inspect state", "DeleteJobAsync: remove a job"], note: "JobScheduler is null when the module is disabled. Check it and define an application-appropriate fallback." },
      { id: "runtime-boundaries", title: "Current runtime boundaries", bullets: ["maxBatchSize, enableCluster, jobFactoryType, connectionString, and dbProvider are not currently read; enableCluster=true still uses RAMJobStore", "JobDefinitionOptions.Data and TriggerOptions.MisfireInstruction are not passed into Quartz", "Jobs implement Asgard.Abstractions.Job.IJob.ExecuteAsync(IJobExecutionContext), not Quartz IJob", "Multiple triggers for one job need unique descriptions because the implementation uses description as the Trigger Key", "Listener registration methods are currently no-ops; do not rely on them for audit or alerting", "The adapter records job failures without rethrowing to Quartz, so automatic failure retry is not a shipped capability"] },
    ],
  },
];
