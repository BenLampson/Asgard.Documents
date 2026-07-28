import type { DocPage } from "./content";

type Locale = "zh" | "en";

const productionYaml = `caching:
  enabled: true
  memory:
    enabled: true
    defaultExpirationMinutes: 5
    sizeLimit: null
    compactOnMemoryPressure: 0.9
    expirationScanFrequencyMinutes: 1
  redis:
    enabled: true
    connectionString: "\${env:ASGARD_REDIS_ENDPOINT}"
    instanceName: "orders:prod:"
    defaultExpirationMinutes: 30
    connectTimeout: 5000
    syncTimeout: 5000
    asyncTimeout: 5000
    allowAdmin: false
    ssl: true
    password: "\${env:ASGARD_REDIS_PASSWORD}"
    database: 0
    retryCount: 3
    retryIntervalMilliseconds: 1000
    fallbackToMemoryCache: true`;

const cacheAsideCode = `public sealed class ProductQueryService(AbsAsgardContext asgardContext)
{
    public async Task<ProductDto?> GetAsync(
        Guid tenantId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        var cache = asgardContext.Cache;
        var key = $"catalog:v2:tenant:{tenantId:N}:product:{productId:N}";

        if (cache is not null)
        {
            var cached = await cache.GetAsync<ProductDto>(key, cancellationToken);
            if (cached is not null)
            {
                return cached;
            }
        }

        var value = await LoadAuthoritativeValueAsync(
            tenantId,
            productId,
            cancellationToken);

        if (value is not null && cache is not null)
        {
            await cache.SetAsync(
                key,
                value,
                TimeSpan.FromMinutes(10),
                cancellationToken);
        }

        return value;
    }
}`;

const invalidationCode = `public async Task UpdateAsync(
    Guid tenantId,
    UpdateProductInput input,
    CancellationToken cancellationToken)
{
    await repository.UpdateAsync(input, cancellationToken);

    var cache = asgardContext.Cache;
    if (cache is null)
    {
        return;
    }

    await cache.RemoveRangeAsync(
        [
            $"catalog:v2:tenant:{tenantId:N}:product:{input.Id:N}",
            $"catalog:v2:tenant:{tenantId:N}:product-list:active"
        ],
        cancellationToken);
}`;

const acceptanceCommands = `# Unit tests: no provider, memory only, simulated L2, invalid JSON,
# cancellation, Redis-write failure, and tenant key separation.
dotnet test -c Release --filter "FullyQualifiedName~Caching"

# Real Redis tests are explicitly categorized in the Asgard source tree.
dotnet test -c Release --filter "Category=RedisIntegration"

# Production smoke checks (use disposable, namespaced keys):
# 1. cold miss -> source -> SetAsync -> hot L1 hit
# 2. wait >2 seconds -> L2 hit -> L1 refill
# 3. update source -> remove every derived key -> fresh read
# 4. stop Redis -> verify the chosen fail-open/fail-closed policy
# 5. repeat with two tenants sharing the same entity id`;

const sourceFiles = `Common/Asgard.Abstractions/Caching/CacheConfig.cs
Common/Asgard.Abstractions/Caching/MemoryCacheOptions.cs
Common/Asgard.Abstractions/Caching/RedisCacheOptions.cs
Common/Asgard.Abstractions/Caching/IMultiLevelCache.cs
Common/Asgard.Abstractions/Serialization/JsonSerializerOptionsFactory.cs
Common/Asgard.Core/Caching/CacheManager.cs
Common/Asgard.Core/Caching/MultiLevelCache.cs
Common/Asgard.Core/Caching/MultiLevelCacheConfigurator.cs
Common/Asgard.Core/Caching/MultiLevelCacheServiceCollectionExtensions.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.Crud.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs
Test/Asgard.Core.Tests/Caching/MultiLevelCacheTests.cs
Test/Asgard.Core.Tests/Caching/RedisIntegrationTests.cs`;

const sectionIds = [
  "contract",
  "configuration",
  "topology",
  "disabled-noop",
  "cache-aside",
  "keys-tenancy",
  "serialization",
  "ttl",
  "invalidation",
  "failure-degradation",
  "observability",
  "testing",
  "ai-ready-sources",
] as const;

function makeCacheOperationsPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "cache-operations",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: "ASGARD 5.1.3 · CACHE OPERATIONS",
    title: zh ? "缓存生产操作指南" : "Cache operations in production",
    description: zh
      ? "以当前源码为合同，配置并运维 Asgard 的 Memory、Redis 与多级缓存，同时明确租户、失效和降级边界。"
      : "Configure and operate Asgard memory, Redis, and multi-level caching against the current source contract, with explicit tenancy, invalidation, and degradation boundaries.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "先明确缓存合同" : "Start with the cache contract",
        paragraphs: zh
          ? [
              "Asgard 5.1.3 暴露 IMultiLevelCache：GetAsync 依次查询进程内 Memory（L1）与 Redis IDistributedCache（L2），L2 命中后回填 L1；SetAsync 先写 L2，再写 L1；RemoveAsync 先删 L1，再删 L2。缓存只是可丢弃的派生数据，数据库或上游服务始终是真理之源。",
              "这套缓存实现提供 read-through 的两级读取原语，但 IMultiLevelCache 本身没有业务数据源回调、单航班合并、缓存击穿保护、跨实例 L1 广播失效、tag/pattern 删除或事务性写穿。框架另有需显式注册的 DistributedLock，缓存不会自动用它防击穿；应用仍须显式实现 cache-aside 与一致性策略。",
            ]
          : [
              "Asgard 5.1.3 exposes IMultiLevelCache. GetAsync checks in-process Memory (L1), then Redis IDistributedCache (L2), and refills L1 after an L2 hit. SetAsync writes L2 before L1. RemoveAsync removes L1 before L2. Cache data is disposable derived state; the database or upstream service remains authoritative.",
              "The cache implementation supplies two-level read-through primitives, but IMultiLevelCache itself has no application data-source callback, single-flight miss coalescing, stampede protection, cross-instance L1 invalidation broadcast, tag/pattern removal, or transactional write-through. The framework separately exposes an explicitly registered DistributedLock, but caching does not use it for stampede prevention automatically; applications must still implement cache-aside and consistency deliberately.",
            ],
      },
      {
        id: sectionIds[1],
        title: zh ? "配置、默认值与验证" : "Configuration, defaults, and validation",
        paragraphs: zh
          ? [
              "caching.enabled 默认 false；Memory 与 Redis 的 enabled 也都默认 false。启用总模块时至少要启用一个 provider。Memory 默认 TTL 5 分钟、SizeLimit=null、压缩比例 0.9、过期扫描 1 分钟；Redis 默认 endpoint localhost:6379、前缀 Asgard:、TTL 30 分钟、三个 timeout 均 5000ms、database 0、AllowAdmin=false、Ssl=false、Password=null、RetryCount=3、RetryIntervalMilliseconds=1000、FallbackToMemoryCache=true。",
              "Validate 会检查已启用 provider 的 TTL、Memory SizeLimit/压缩比例、Redis 连接串/timeout/database/retry 数值，以及至少一个 provider；当前不会拒绝负的 ExpirationScanFrequencyMinutes。秘密只能从 secret/env 注入。不要把真实密码合并进 connectionString 后写入日志、文档或 Agent 上下文。",
            ]
          : [
              "caching.enabled defaults to false, as do both provider enabled flags. Enabling the module requires at least one provider. Memory defaults are a 5-minute TTL, SizeLimit=null, compaction 0.9, and a 1-minute expiration scan. Redis defaults are localhost:6379, prefix Asgard:, a 30-minute TTL, 5000ms for all three timeouts, database 0, AllowAdmin=false, Ssl=false, Password=null, RetryCount=3, RetryIntervalMilliseconds=1000, and FallbackToMemoryCache=true.",
              "Validate checks enabled-provider TTLs, Memory SizeLimit/compaction, Redis connection string/timeouts/database/retry values, and the at-least-one-provider rule. It currently does not reject a negative ExpirationScanFrequencyMinutes. Inject secrets through a secret/env provider only. Never place a real password or composed connection string in logs, documentation, or agent context.",
            ],
        code: { language: "yaml", value: productionYaml },
        note: zh
          ? "RetryCount 与 RetryIntervalMilliseconds 当前只被验证，没有接入 CacheManager 或 MultiLevelCache 的重试循环。"
          : "RetryCount and RetryIntervalMilliseconds are currently validated but are not wired into a CacheManager or MultiLevelCache retry loop.",
      },
      {
        id: sectionIds[2],
        title: zh ? "Memory、Redis 与多级拓扑" : "Memory, Redis, and multi-level topology",
        bullets: zh
          ? [
              "Memory-only：值只在当前进程可见；显式 TTL 或默认 5 分钟直接成为 L1 TTL",
              "Redis-only：值以 JSON 字符串存入配置的 database，并由 InstanceName 加前缀；没有本地回填",
              "Memory + Redis：L1 是固定 2 秒热点层，业务/默认 TTL 只控制 L2；L2 命中后 L1 同样固定缓存 2 秒",
              "多实例部署中，每个实例有独立 L1；更新方删除自己的 L1 与共享 L2，其他实例的旧 L1 最多仍可存活其 2 秒 TTL",
              "SetAsync 不带 TTL 时，启用 Redis 就采用 Redis 默认 30 分钟，否则采用 Memory 默认 5 分钟",
            ]
          : [
              "Memory only: values are local to one process; the explicit TTL or default 5 minutes becomes the L1 TTL",
              "Redis only: JSON strings are stored in the configured database under InstanceName-prefixed keys; there is no local refill",
              "Memory + Redis: L1 is a fixed two-second hot layer, while the business/default TTL controls L2; an L2 hit also refills L1 for two seconds",
              "In a multi-instance deployment each process owns its L1. The updater removes its own L1 and shared L2, but another process may retain stale L1 data for the remainder of that two-second TTL",
              "SetAsync without an explicit TTL uses the Redis default (30 minutes) when Redis is enabled, otherwise the Memory default (5 minutes)",
            ],
      },
      {
        id: sectionIds[3],
        title: zh ? "关闭模块与 no-op 行为" : "Disabled module and no-op behavior",
        paragraphs: zh
          ? [
              "标准 Yggdrasil 宿主即使 caching.enabled=false，也会注册 MultiLevelCache(null, null, config) 作为可注入 no-op。读取返回 default、ExistsAsync 返回 false，写入和删除只做键校验与序列化而不持久化；因此继承仓储基类的构造函数仍能解析 IMultiLevelCache。",
              "AbsAsgardContext.Cache 的抽象合同仍是可空，非标准宿主或自定义注册可能没有缓存。业务服务通过 Context 访问时保持 null-safe；仓储按基类合同注入 IMultiLevelCache。禁用缓存是性能模式变化，不应改变业务正确性。",
            ]
          : [
              "The standard Yggdrasil host registers MultiLevelCache(null, null, config) as an injectable no-op even when caching.enabled=false. Reads return default, ExistsAsync returns false, and writes/removals only validate keys (writes also serialize) without persistence. Repository-base constructors can therefore still resolve IMultiLevelCache.",
              "The abstract AbsAsgardContext.Cache contract remains nullable; a nonstandard host or custom registration may provide no cache. Keep context-based service access null-safe, while repositories inject IMultiLevelCache as required by the base constructor. Disabling cache changes performance, never business correctness.",
            ],
      },
      {
        id: sectionIds[4],
        title: zh ? "安全的 cache-aside 用法" : "A safe cache-aside pattern",
        paragraphs: zh
          ? [
              "先读缓存，miss 后读取权威数据源，再把非空结果按明确 TTL 写回。当前 API 不缓存 miss，也不会调用数据源；若业务要做负缓存，必须使用可区分“未找到”与真实 default(T) 的显式 envelope，并给更短 TTL。",
              "并发 miss 会各自访问数据源。热点键必须在业务层评估有界 single-flight、队列或分布式锁，并单独验证异常、取消与锁超时；Asgard 缓存本身没有提供这些保证。",
            ]
          : [
              "Read cache first, load the authoritative source on a miss, then store a non-null result with an explicit TTL. The API neither caches misses nor invokes a data source. If the domain needs negative caching, use an explicit envelope that distinguishes ‘not found’ from a real default(T), with a shorter TTL.",
              "Concurrent misses each reach the data source. Evaluate bounded single-flight, queueing, or a distributed lock at the application layer for hot keys, and test exceptions, cancellation, and lock timeout separately; Asgard cache itself makes none of those guarantees.",
            ],
        code: { language: "csharp", value: cacheAsideCode },
      },
      {
        id: sectionIds[5],
        title: zh ? "键设计与租户隔离" : "Key design and tenant isolation",
        paragraphs: zh
          ? [
              "缓存不读取 FreeSql GlobalFilter，也不会自动加入 TenantId。生产键应至少包含产品/模块、schema 版本、tenantId、资源类型、稳定 ID 与影响结果的维度，例如 catalog:v2:tenant:{tenantId}:product:{id}。InstanceName 只隔离应用/环境前缀，不能替代租户段。",
              "AbsAsgardRepositoryBase 当前默认实体键是“实体类型小写:id”，列表键是“实体类型小写:list[:suffix]”，都不含租户。多租户仓储在覆盖并测试实体、列表与所有失效键之前，不应启用这套默认缓存。两个租户共享相同主键时会发生跨租户命中风险。",
            ]
          : [
              "Cache does not read the FreeSql GlobalFilter and does not add TenantId automatically. A production key should include at least product/module, schema version, tenantId, resource type, stable id, and every dimension that changes the result—for example catalog:v2:tenant:{tenantId}:product:{id}. InstanceName isolates an application/environment prefix; it does not replace the tenant segment.",
              "AbsAsgardRepositoryBase currently builds entity keys as lower-case entity type plus id and list keys as lower-case entity type plus list[:suffix]. Neither includes the tenant. Do not enable these defaults for a multi-tenant repository until entity, list, and every invalidation key are overridden and tested. Equal primary keys in two tenants can otherwise produce a cross-tenant hit.",
            ],
        note: zh
          ? "键不得包含令牌、密码、邮箱等敏感原值；需要关联时使用不可逆、带域隔离的摘要。"
          : "Never put tokens, passwords, email addresses, or other sensitive raw values in keys. Use an irreversible, domain-separated digest when correlation is required.",
      },
      {
        id: sectionIds[6],
        title: zh ? "序列化与兼容升级" : "Serialization and compatible upgrades",
        paragraphs: zh
          ? [
              "L1 保存对象实例；L2 使用 JsonSerializerOptionsFactory.Default 的 System.Text.Json 字符串。该配置忽略 null、属性名读取不区分大小写、日期为 yyyy-MM-dd HH:mm:ss、枚举默认按数字，并含 Guid/TimeSpan/nullable converter。读取相同 key 时请求的 T 必须与写入合同兼容；无效 JSON 或 converter 失败会直接抛异常。",
              "DTO 形状或 converter 变化时提升键中的 schema 版本，而不是期待旧 Redis payload 自动迁移。只缓存专用 DTO/record，不缓存 ORM 跟踪实体、请求作用域对象、secret 或不可重建状态。上线前用上一版本真实 payload 做向前/向后兼容测试。",
            ]
          : [
              "L1 retains the object instance; L2 stores a System.Text.Json string using JsonSerializerOptionsFactory.Default. It ignores nulls, reads property names case-insensitively, formats dates as yyyy-MM-dd HH:mm:ss, keeps enums numeric by default, and supplies Guid/TimeSpan/nullable converters. T requested for a key must remain compatible with the write contract; malformed JSON or converter failure propagates as an exception.",
              "When a DTO shape or converter changes, increment the schema version in the key instead of expecting old Redis payloads to migrate automatically. Cache dedicated DTOs/records, not ORM-tracked entities, request-scoped objects, secrets, or irreplaceable state. Test forward/backward compatibility with real payloads from the preceding release.",
            ],
      },
      {
        id: sectionIds[7],
        title: zh ? "TTL、容量与刷新语义" : "TTL, capacity, and refresh semantics",
        bullets: zh
          ? [
              "只使用 absolute expiration，没有 sliding expiration、TTL jitter 或 stale-while-revalidate",
              "Redis 启用时 L1 固定 2 秒，即使调用方传入更短 TTL；业务不要用缓存 TTL 作为授权、封禁或精确到期的安全边界",
              "RefreshAsync 只以 Redis 为准；L2 不存在会移除 L1，Memory-only 模式则返回 default，并不是延长 L1 TTL",
              "SizeLimit 被传给 MemoryCache，但条目 Size 由序列化字符长度/1024 估算；源码注释称配置单位为 bytes，与当前条目单位并不一致，生产容量上限必须实测，不能当精确字节预算",
              "没有内建 hit/miss 计数、逐键大小统计或驱逐原因事件；容量与 TTL 应由应用指标和 Redis 监控共同校验",
            ]
          : [
              "Only absolute expiration is used; there is no sliding expiration, TTL jitter, or stale-while-revalidate",
              "With Redis enabled, L1 is fixed at two seconds even when the caller supplies a shorter TTL. Do not use cache TTL as a security boundary for authorization, bans, or exact expiry",
              "RefreshAsync treats Redis as authoritative. An absent L2 value removes L1; in memory-only mode it returns default and does not extend L1 TTL",
              "SizeLimit is passed to MemoryCache, but entry Size is estimated as serialized character count divided by 1024. Source comments call the configured unit bytes, which does not match the current entry unit; benchmark production limits rather than treat this as an exact byte budget",
              "There are no built-in hit/miss counters, per-key size metrics, or eviction-reason events. Validate capacity and TTL through application instrumentation plus Redis monitoring",
            ],
      },
      {
        id: sectionIds[8],
        title: zh ? "失效、更新与 ClearAsync" : "Invalidation, updates, and ClearAsync",
        paragraphs: zh
          ? [
              "数据库提交与缓存失效不是同一个事务。通常先提交权威数据，再删除所有派生键；删除失败必须可观测并进入幂等修复流程。RemoveRangeAsync 只是逐键顺序调用 RemoveAsync，不是 Redis pipeline/bulk。RemoveAsync 先清 L1 再删 L2，L2 删除失败时后续读取可能把旧值重新回填。",
              "仓储基类更新/删除会删除实体键与一个列表基键；ClearListCacheAsync 调用的是精确 RemoveAsync(\"entity:list\")，不是前缀扫描，因此带 suffix 的列表键不会自动清理。应用必须维护明确的反向键集合、版本化列表键或逐键失效合同。",
              "ClearAsync 会 FLUSHDB，而不是只删除 InstanceName 前缀；默认 AllowAdmin=false 会使该操作抛异常。它可能清除共享 database 中其他应用的键，只允许在隔离 Redis/database、变更审批和恢复演练下使用，绝不能作为常规发布失效手段。",
            ]
          : [
              "A database commit and cache invalidation are not one transaction. Normally commit authoritative data first, then remove every derived key; make removal failures observable and repair them idempotently. RemoveRangeAsync loops over RemoveAsync sequentially—it is not a Redis pipeline or bulk command. RemoveAsync clears L1 before deleting L2, so an L2 deletion failure can allow a later read to refill stale data.",
              "Repository-base update/delete removes the entity key and one list base key. ClearListCacheAsync calls exact RemoveAsync(\"entity:list\"); it is not a prefix scan, so suffixed list keys are not cleared automatically. Maintain an explicit reverse-key set, versioned list keys, or a complete per-key invalidation contract.",
              "ClearAsync performs FLUSHDB, not deletion under InstanceName. It throws with the default AllowAdmin=false and can erase other applications in a shared database. Permit it only with an isolated Redis/database, change approval, and a rehearsed recovery path—never as routine release invalidation.",
            ],
        code: { language: "csharp", value: invalidationCode },
      },
      {
        id: sectionIds[9],
        title: zh ? "失败与降级必须由应用选择" : "Failure and degradation are application policy",
        paragraphs: zh
          ? [
              "Yggdrasil 在宿主构建 Phase 3 同步初始化 CacheManager。Redis 启用时会 ConnectAsync 并执行一次 __asgard_health_check__ 读取；失败会包装为 InvalidOperationException，中止启动。FallbackToMemoryCache=true 目前只向 StackExchange.Redis 添加 abortConnect=false，不会捕获启动探测、Get/Set/Remove、反序列化或超时异常并自动切换到 Memory。",
              "MultiLevelCache 不吞 Redis 异常：Set 先写 L2，失败时不更新 L1；Remove 先删 L1，L2 失败则向调用方抛出；Get 的 L2 失败也不会自动查询数据源。是否 fail open 必须由业务按数据敏感度决定，并限制捕获范围、记录结构化指标、避免把取消当故障。不要把 RetryCount=3 当作已实现的重试保证。",
            ]
          : [
              "Yggdrasil synchronously initializes CacheManager during host-build Phase 3. With Redis enabled it ConnectAsyncs and performs a __asgard_health_check__ read. Failure is wrapped in InvalidOperationException and aborts startup. FallbackToMemoryCache=true currently only adds abortConnect=false to StackExchange.Redis; it does not catch startup probes, Get/Set/Remove, deserialization, or timeout failures and switch automatically to Memory.",
              "MultiLevelCache does not swallow Redis exceptions. Set writes L2 first and does not update L1 after failure; Remove clears L1 before an L2 failure propagates; a Get L2 failure does not automatically query the data source. The business layer must choose fail-open policy by data sensitivity, catch narrowly, emit structured metrics, and preserve cancellation. Do not treat RetryCount=3 as an implemented retry guarantee.",
            ],
        note: zh
          ? "缓存失败绝不能绕过授权、租户归属或业务校验；安全决策应从权威来源计算。"
          : "A cache failure must never bypass authorization, tenant ownership, or domain validation. Compute security decisions from authoritative state.",
      },
      {
        id: sectionIds[10],
        title: zh ? "可观测性与生产 Runbook" : "Observability and the production runbook",
        bullets: zh
          ? [
              "指标：按 operation/provider/result 记录 hit、miss、latency、timeout、serialization error、fallback、invalidation failure；不要把完整 key 作为高基数标签",
              "容量：监控进程内存/GC、Redis used_memory、evictions、expired_keys、connected_clients、latency 与 error rate",
              "日志：记录 hash/受控 key family、tenantId、operation、elapsed 与 exception type；严禁记录 value、密码或完整连接串",
              "就绪：当前 Yggdrasil health endpoint 只注册 self，不包含 Redis readiness；CacheManager 只在启动时探测一次，运行期健康需要应用自行增加",
              "告警：持续 miss 激增、Redis 超时、反序列化异常、失效失败和内存驱逐必须有明确 owner、阈值与降级/恢复步骤",
              "恢复：先阻止脏写扩散，验证权威数据，再按 namespace/schema 版本失效；不要在共享库盲目 FLUSHDB",
            ]
          : [
              "Metrics: record hit, miss, latency, timeout, serialization error, fallback, and invalidation failure by operation/provider/result; never use full keys as high-cardinality labels",
              "Capacity: monitor process memory/GC plus Redis used_memory, evictions, expired_keys, connected_clients, latency, and error rate",
              "Logs: record a hash/controlled key family, tenantId, operation, elapsed time, and exception type; never log values, passwords, or full connection strings",
              "Readiness: the current Yggdrasil health endpoint registers only self, not Redis readiness. CacheManager probes once at startup; applications must add runtime health explicitly",
              "Alerts: sustained miss spikes, Redis timeouts, deserialization errors, invalidation failures, and memory eviction need an owner, threshold, and degradation/recovery procedure",
              "Recovery: stop stale-write propagation, validate authoritative data, then invalidate by namespace/schema version. Do not blindly FLUSHDB a shared database",
            ],
      },
      {
        id: sectionIds[11],
        title: zh ? "测试与上线验收" : "Testing and release acceptance",
        paragraphs: zh
          ? [
              "单元测试需要覆盖 no-op、Memory-only、模拟 L2、两级回填、显式/默认 TTL、空键、取消、无效 JSON、Redis 写删失败和跨租户相同 ID。真实 Redis 测试应使用一次性前缀、独立 database/容器，并证明 InstanceName、SSL/auth、timeout 与清理行为。",
              "源码的 RedisIntegration 类是显式 Category=RedisIntegration；常规内存替身测试不能证明网络、认证、TLS、Redis TTL 或 FLUSHDB。发布验收还要做滚动升级：旧新实例并存、DTO schema 变化、L1 两秒陈旧窗口、Redis 重启与重复失效。",
            ]
          : [
              "Unit tests should cover no-op, memory-only, simulated L2, two-level refill, explicit/default TTL, invalid keys, cancellation, malformed JSON, Redis write/remove failures, and equal ids across tenants. Real Redis tests need a disposable prefix, isolated database/container, and proof of InstanceName, SSL/auth, timeout, and cleanup behavior.",
              "The source RedisIntegration class is explicitly Category=RedisIntegration. In-memory substitutes do not prove networking, authentication, TLS, Redis TTL, or FLUSHDB. Release acceptance must also exercise rolling upgrades: old/new instances together, DTO schema changes, the two-second L1 stale window, Redis restart, and repeated invalidation.",
            ],
        code: { language: "text", value: acceptanceCommands },
      },
      {
        id: sectionIds[12],
        title: zh ? "AI Ready 工作流与源码证据" : "AI Ready workflow and source evidence",
        paragraphs: zh
          ? [
              "让 Agent 修改缓存代码或文档时，先加载 asgard-cache；涉及 Context 可空能力时再加载 asgard-context-usage，涉及租户键时加载 asgard-identity-userinfo/tenant 指南，最后用 asgard-backend-guard 复查仓储示例。Agent 必须从配置类型、运行实现、宿主装配和测试四层取证，不能把 option 名称、XML 注释或 Skill 文本单独当成已接通能力。",
              "维护本页时优先 diff 下列源码。任何 provider 顺序、固定 L1 TTL、序列化配置、默认键、失效顺序、启动探测、fallback/retry 或 no-op 注册变化，都要同步中英文、docs-sources contract 与生产验收矩阵。",
            ]
          : [
              "Before an agent changes cache code or documentation, load asgard-cache. Add asgard-context-usage for nullable context capabilities, identity/tenant guidance for tenant keys, and finish repository examples with asgard-backend-guard. Evidence must span configuration types, runtime implementation, host wiring, and tests; an option name, XML comment, or Skill text alone does not prove an end-to-end capability.",
              "Diff the files below first when maintaining this page. Any change in provider order, fixed L1 TTL, serialization options, default keys, invalidation order, startup probe, fallback/retry behavior, or no-op registration must update both locales, the docs-sources contract, and the production acceptance matrix.",
            ],
        code: { language: "text", value: sourceFiles },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "caching", label: zh ? "缓存模块基础" : "Cache module basics" },
      { product: "asgard", docSlug: "tenant-background-work", label: zh ? "后台租户隔离" : "Background tenant isolation" },
      { product: "asgard", docSlug: "configuration-fields", label: zh ? "配置字段参考" : "Configuration field reference" },
    ],
  };
}

export const zhAsgardCacheOperationsDocs: DocPage[] = [makeCacheOperationsPage("zh")];
export const enAsgardCacheOperationsDocs: DocPage[] = [makeCacheOperationsPage("en")];
