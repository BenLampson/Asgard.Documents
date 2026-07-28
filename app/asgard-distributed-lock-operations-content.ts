import type { DocPage } from "./content";

type Locale = "zh" | "en";

const registrationCode = `var builder = YggdrasilHost.CreateBuilder("config/app.yaml")
    .UseBuiltInPlugin<MyPlugin>()
    .AfterServiceRegistration(services =>
    {
        _ = services.AddDistributedLock(options =>
        {
            options.KeyPrefix = "orders-lock:";
            options.DefaultLeaseTime = TimeSpan.FromSeconds(45);
            options.DefaultAcquireTimeout = TimeSpan.FromSeconds(5);
            options.RetryInterval = TimeSpan.FromMilliseconds(200);
        });
    });

var host = builder.Build();
await host.RunAsync();`;

const redisYaml = `caching:
  enabled: true
  memory:
    enabled: false
  redis:
    enabled: true
    connectionString: "\${env:ASGARD_REDIS_ENDPOINT}"
    password: "\${env:ASGARD_REDIS_PASSWORD}"
    ssl: true
    instanceName: "orders:prod:"
    database: 0
    defaultExpirationMinutes: 30`;

const tryAcquireCode = `public async Task<bool> TryRebuildIndexAsync(CancellationToken cancellationToken)
{
    var distributedLock = asgardContext.DistributedLock;
    if (distributedLock is null)
    {
        return false;
    }

    await using var handle = await distributedLock.TryAcquireAsync(
        "search:index:rebuild",
        new DistributedLockAcquireOptions
        {
            LeaseTime = TimeSpan.FromMinutes(2)
        },
        cancellationToken);

    if (handle is null)
    {
        return false;
    }

    await RebuildIndexAsync(cancellationToken);
    return true;
}`;

const waitAcquireCode = `await using var handle = await distributedLock.AcquireAsync(
    $"invoice:{tenantId:N}:{invoiceId:N}",
    new DistributedLockAcquireOptions
    {
        LeaseTime = TimeSpan.FromSeconds(20),
        AcquireTimeout = TimeSpan.FromSeconds(2),
        RetryInterval = TimeSpan.FromMilliseconds(100)
    },
    cancellationToken); // TimeoutException when the wait expires

await UpdateInvoiceAsync(tenantId, invoiceId, cancellationToken);`;

const acceptanceCommands = `# Unit tests: options validation, disabled Redis, null Context,
# contention branch, TimeoutException, cancellation, and idempotent business work.
dotnet test -c Release --filter "FullyQualifiedName~DistributedLocking"

# Real Redis contract tests: contention, timeout, release/reacquire,
# repeated release, lease expiry/reacquire, and independent keys.
dotnet test -c Release --filter "Category=RedisIntegration"`;

const sourceFiles = `Common/Asgard.Abstractions/DistributedLocking/IDistributedLock.cs
Common/Asgard.Abstractions/DistributedLocking/IDistributedLockHandle.cs
Common/Asgard.Abstractions/DistributedLocking/DistributedLockOptions.cs
Common/Asgard.Abstractions/DistributedLocking/DistributedLockAcquireOptions.cs
Common/Asgard.Core/DistributedLocking/DistributedLockServiceCollectionExtensions.cs
Common/Asgard.Core/DistributedLocking/RedisDistributedLock.cs
Common/Asgard.Core/DistributedLocking/RedisDistributedLockHandle.cs
Common/Asgard.Abstractions/AbsAsgardContext.cs
Common/Asgard.Core/AsgardContext.cs
Test/Asgard.Core.Tests/DistributedLocking/DistributedLockOptionsTests.cs
Test/Asgard.Core.Tests/DistributedLocking/DistributedLockServiceCollectionExtensionsTests.cs
Test/Asgard.Core.Tests/DistributedLocking/RedisDistributedLockIntegrationTests.cs`;

function makeDistributedLockPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "distributed-lock-operations",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: "ASGARD 5.1.3 · REDIS LOCK",
    title: zh ? "Redis 分布式锁运行手册" : "Redis distributed-lock operations",
    description: zh
      ? "显式注册并安全使用 Asgard 的 Redis 互斥能力，掌握租期、竞争、释放、故障和一致性边界。"
      : "Explicitly register and safely operate Asgard's Redis mutual-exclusion primitive, including lease, contention, release, failure, and consistency boundaries.",
    sections: [
      {
        id: "contract",
        title: zh ? "能力定位与成熟度" : "Positioning and maturity",
        paragraphs: zh
          ? [
              "Asgard 5.1.3 的 IDistributedLock 面向多实例任务防重和同一业务键串行化。当前实现使用一个逻辑 Redis，通过 SET NX + TTL 获取锁，并用带 owner token 比对的 Lua 脚本释放，防止过期旧句柄误删后来持有者的锁。",
              "它是通用工程互斥原语，不是金融级强一致协调器。Yggdrasil 宿主不会自动注册它；只有应用显式调用 AddDistributedLock 后，AbsAsgardContext.DistributedLock 才可能可用。",
            ]
          : [
              "Asgard 5.1.3 IDistributedLock targets multi-instance job de-duplication and serialization for one business key. The current implementation acquires with SET NX plus a TTL on one logical Redis and releases through a Lua owner-token comparison, so an expired old handle cannot delete a later owner's lock.",
              "This is a general engineering mutual-exclusion primitive, not a financial-grade strongly consistent coordinator. Yggdrasil does not register it automatically; AbsAsgardContext.DistributedLock can be available only after the application explicitly calls AddDistributedLock.",
            ],
      },
      {
        id: "prerequisites-registration",
        title: zh ? "前置条件与显式注册" : "Prerequisites and explicit registration",
        paragraphs: zh
          ? [
              "AddDistributedLock 复用 CacheConfig 的 caching.redis 连接信息，但拥有独立连接和独立注册入口。caching.redis.enabled 必须为 true；否则解析 IDistributedLock 时抛 InvalidOperationException。只启用 Memory 缓存不足以提供锁。",
              "DistributedLockOptions 没有 ConfigPath，也不是 app.yaml 节点。请在完整 Yggdrasil Builder 的 AfterServiceRegistration 中用代码注册；这样框架配置和服务已装配完毕，后续 Context 解析也能看到锁服务。",
            ]
          : [
              "AddDistributedLock reuses the caching.redis connection settings from CacheConfig, but owns a separate connection and registration entry point. caching.redis.enabled must be true or resolving IDistributedLock throws InvalidOperationException. Memory caching alone cannot provide the lock.",
              "DistributedLockOptions has no ConfigPath and is not an app.yaml node. Register it in code through the full Yggdrasil builder's AfterServiceRegistration hook, after framework configuration and services are assembled and before the Context is resolved.",
            ],
        code: { language: "csharp", value: registrationCode },
      },
      {
        id: "redis-configuration",
        title: zh ? "Redis 连接配置" : "Redis connection configuration",
        paragraphs: zh
          ? ["锁复用 Redis endpoint、password、SSL、database、timeout 与 instanceName。秘密从部署环境注入；不要把密码、连接串或 owner token 写入文档、日志或 Trace。"]
          : ["The lock reuses the Redis endpoint, password, SSL, database, timeout, and instanceName settings. Inject secrets from the deployment environment; never place passwords, connection strings, or owner tokens in documentation, logs, or Trace."],
        code: { language: "yaml", value: redisYaml },
      },
      {
        id: "defaults",
        title: zh ? "默认值与单次覆盖" : "Defaults and per-acquisition overrides",
        bullets: zh
          ? [
              "DistributedLockOptions.Enabled=true；设为 false 后解析服务会失败，而不是返回 no-op",
              "KeyPrefix=lock:；缺少结尾冒号时实现会自动补上",
              "DefaultLeaseTime=30 秒；DefaultAcquireTimeout=5 秒；RetryInterval=200 毫秒",
              "DistributedLockAcquireOptions 可为单次调用覆盖 LeaseTime、AcquireTimeout 和 RetryInterval；三个值必须大于零",
              "TryAcquireAsync 不使用 AcquireTimeout 或 RetryInterval，只做一次立即尝试",
            ]
          : [
              "DistributedLockOptions.Enabled=true; setting it false makes service resolution fail rather than returning a no-op",
              "KeyPrefix=lock:; the implementation adds a trailing colon when it is absent",
              "DefaultLeaseTime=30 seconds, DefaultAcquireTimeout=5 seconds, and RetryInterval=200 milliseconds",
              "DistributedLockAcquireOptions can override LeaseTime, AcquireTimeout, and RetryInterval for one call; all supplied values must be positive",
              "TryAcquireAsync ignores AcquireTimeout and RetryInterval because it performs one immediate attempt",
            ],
      },
      {
        id: "try-acquire",
        title: zh ? "不等待：TryAcquireAsync" : "No waiting: TryAcquireAsync",
        paragraphs: zh
          ? ["竞争成功返回句柄，当前键已被占用时返回 null。Context 合同本身可空；业务必须决定能力缺失与竞争失败分别如何降级。句柄用 await using 尽快释放。"]
          : ["A successful contender receives a handle; an occupied key returns null. The Context contract itself is nullable, so the application must define separate degradation behavior for a missing capability and lost contention. Use await using to release promptly."],
        code: { language: "csharp", value: tryAcquireCode },
      },
      {
        id: "wait-acquire",
        title: zh ? "限时等待：AcquireAsync" : "Bounded waiting: AcquireAsync",
        paragraphs: zh
          ? ["AcquireAsync 按 RetryInterval 轮询，等待超过 AcquireTimeout 后抛 TimeoutException；取消令牌会终止连接、轮询延迟或调用。不要捕获后无限重试，否则会绕过有界等待合同并制造 Redis 热点。"]
          : ["AcquireAsync polls at RetryInterval and throws TimeoutException after AcquireTimeout; cancellation can stop connection, delay, or call work. Do not catch and retry forever, which defeats bounded waiting and creates a Redis hot spot."],
        code: { language: "csharp", value: waitAcquireCode },
      },
      {
        id: "keys-tenancy",
        title: zh ? "实际键、租户与敏感信息" : "Physical keys, tenancy, and sensitive data",
        paragraphs: zh
          ? [
              "Redis 实际键是 caching.redis.instanceName + 规范化 KeyPrefix + 业务 key。例如 instanceName=orders:prod:、KeyPrefix=orders-lock:、业务键 invoice:{tenantId}:{invoiceId} 会组成 orders:prod:orders-lock:invoice:{tenantId}:{invoiceId}。",
              "框架不会自动加入 TenantId。多租户业务键必须显式包含稳定 tenantId，并包含环境、资源类型和所有影响互斥范围的维度。键中不要放令牌、密码、邮箱等敏感原值。",
            ]
          : [
              "The physical Redis key is caching.redis.instanceName + normalized KeyPrefix + business key. For example instanceName=orders:prod:, KeyPrefix=orders-lock:, and invoice:{tenantId}:{invoiceId} produce orders:prod:orders-lock:invoice:{tenantId}:{invoiceId}.",
              "The framework does not add TenantId. Multi-tenant keys must explicitly include a stable tenantId plus environment, resource type, and every dimension that defines the mutual-exclusion scope. Never put tokens, passwords, email addresses, or other sensitive raw values in a key.",
            ],
      },
      {
        id: "lease-release",
        title: zh ? "租期与释放语义" : "Lease and release semantics",
        bullets: zh
          ? [
              "没有自动续租；LeaseTime 必须覆盖正常执行时间、合理抖动与释放窗口",
              "租期过短时，旧工作仍在执行而新持有者已经进入，互斥会失效",
              "ReleaseAsync 只有 owner token 仍匹配时返回 true；重复释放、已经过期或已被替换返回 false",
              "ReleaseAsync 在访问 Redis 前即把当前句柄标记为已释放；首次释放若因取消或连接异常抛出，不能用同一句柄重试，只能依靠租期兜底并按业务状态恢复",
              "await using 会在退出作用域时释放；若显式 ReleaseAsync 已调用，DisposeAsync 的重复释放是安全的",
              "进程崩溃或网络中断时依靠 TTL 最终释放；这不是工作回滚或完成确认",
            ]
          : [
              "There is no automatic renewal; LeaseTime must cover normal execution, reasonable jitter, and the release window",
              "If the lease is too short, old work can still run after a new owner enters and mutual exclusion is lost",
              "ReleaseAsync returns true only while the owner token still matches; repeated, expired, or replaced release returns false",
              "ReleaseAsync marks the handle released before contacting Redis. If the first release throws on cancellation or connection failure, the same handle cannot retry; rely on lease expiry and recover from business state",
              "await using releases on scope exit; disposal after an explicit ReleaseAsync is safely idempotent",
              "A process crash or network loss relies on TTL for eventual release; that is neither work rollback nor completion acknowledgement",
            ],
      },
      {
        id: "non-guarantees",
        title: zh ? "明确不保证的能力" : "Explicit non-guarantees",
        paragraphs: zh
          ? ["当前实现不提供自动续租、可重入、公平排队、fencing token、Redlock quorum、多 Redis failover、跨网络分区强一致或 exactly-once。锁也不能替代数据库唯一约束、乐观锁、事务、幂等键和业务状态机。关键写入必须让权威数据层拒绝重复或过期持有者。"]
          : ["The current implementation provides no automatic renewal, reentrancy, fair queueing, fencing token, Redlock quorum, multi-Redis failover, strong consistency across partitions, or exactly-once semantics. A lock also does not replace database uniqueness, optimistic concurrency, transactions, idempotency keys, or a business state machine. Critical writes must let the authoritative data layer reject duplicates or stale owners."],
      },
      {
        id: "failure-recovery",
        title: zh ? "故障与恢复策略" : "Failure and recovery strategy",
        bullets: zh
          ? [
              "Redis 不可达、认证/TLS/timeout 错误：获取与释放异常向上传播；为业务明确 fail-closed 或安全跳过",
              "获取成功后连接中断：不能据此判断锁仍在、已过期还是已由别人持有；停止不可重复副作用并依赖权威状态恢复",
              "释放返回 false：记录业务键摘要、租期与耗时，检查是否执行超期；不要记录 owner token",
              "TimeoutException：视为正常竞争结果或受控失败，不要自动升级为无锁执行",
              "滚动发布：保持 KeyPrefix 和业务键 schema 兼容；需要改变互斥域时显式版本化并设计过渡期",
            ]
          : [
              "Redis unavailable or authentication/TLS/timeout failure: acquisition and release exceptions propagate; define fail-closed or safe-skip behavior for the domain",
              "Connection loss after acquisition: it cannot prove whether the lock remains, expired, or has a new owner; stop non-idempotent side effects and recover from authoritative state",
              "Release returns false: record a digest of the business key, lease, and elapsed time, then investigate overrun; do not log the owner token",
              "TimeoutException: treat it as normal contention or a controlled failure, never an automatic invitation to run unlocked",
              "Rolling release: keep KeyPrefix and business-key schema compatible; version deliberately and design a transition when the exclusion domain changes",
            ],
      },
      {
        id: "production-acceptance",
        title: zh ? "生产验收清单" : "Production acceptance checklist",
        paragraphs: zh
          ? ["源码的真实 Redis 测试已覆盖同键竞争、等待超时、释放后重获、重复释放、租期过期后重获和不同键互不阻塞。应用上线还必须证明自己的租期预算、租户键、失败策略、幂等落库、Redis 重启和两实例滚动发布。"]
          : ["The source's real-Redis suite covers same-key contention, wait timeout, reacquisition after release, repeated release, reacquisition after lease expiry, and independent keys. Application release acceptance must additionally prove its lease budget, tenant key, failure policy, idempotent persistence, Redis restart, and two-instance rolling deployment."],
        code: { language: "text", value: acceptanceCommands },
      },
      {
        id: "ai-ready-sources",
        title: zh ? "AI Ready 工作流与源码证据" : "AI Ready workflow and source evidence",
        paragraphs: zh
          ? [
              "让 Agent 接入分布式锁时先加载 asgard-context-usage 与 asgard-cache；涉及仓储写入、租户、审计或乐观锁时再用 asgard-backend-guard 复查。Agent 必须同时验证接口、实现、宿主注册路径和 Redis 集成测试，不能从 Context 属性或 Options 类型推断已经自动接线。",
              "维护本页时优先 diff 下列源码。注册方式、默认值、Redis key、owner-token Lua、连接复用、租期或测试矩阵变化时，中英文、docs-sources contract 与验收清单必须一起更新。",
            ]
          : [
              "When an agent integrates distributed locking, load asgard-context-usage and asgard-cache first; add asgard-backend-guard when repository writes, tenancy, audit, or optimistic concurrency are involved. Verify the interface, implementation, host registration path, and Redis integration tests together; a Context property or Options type does not prove automatic wiring.",
              "Diff the following files first when maintaining this page. Any registration, default, Redis-key, owner-token Lua, connection, lease, or test-matrix change must update both locales, the docs-sources contract, and acceptance checklist together.",
            ],
        code: { language: "text", value: sourceFiles },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "cache-operations", label: zh ? "缓存生产操作" : "Cache operations" },
      { product: "asgard", docSlug: "tenant-background-work", label: zh ? "后台租户隔离" : "Background tenant isolation" },
      { product: "asgard", docSlug: "job-operations", label: zh ? "作业生产操作" : "Job operations" },
    ],
  };
}

export const zhAsgardDistributedLockOperationsDocs: DocPage[] = [makeDistributedLockPage("zh")];
export const enAsgardDistributedLockOperationsDocs: DocPage[] = [makeDistributedLockPage("en")];
