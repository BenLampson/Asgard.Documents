import type { DocPage, Locale } from "./content";

const databaseYaml = `database:
  enabled: true
  provider: mysql
  connectionString: "\${env:ASGARD_DATABASE_CONNECTION_STRING}"

caching:
  # Keep disabled for tenant entities until every cache key is tenant-aware.
  enabled: false`;

const repositoryCode = `[Repository]
public sealed class OrderRepository(
    IFreeSql fsql,
    IMultiLevelCache cache,
    ILogger<OrderRepository> logger,
    IAsgardRepositoryContext repositoryContext)
    : AbsAsgardRepositoryBase<Order, string>(
        fsql,
        cache,
        logger,
        repositoryContext),
      IOrderRepository;

// Service update path: preserve database-owned fields and Version.
var order = await orderRepository.GetAsync(id, cancellationToken)
    ?? throw new InvalidOperationException($"Order not found: {id}");

order.Rename(request.Name);
order.MarkAsUpdated();

var affected = await orderRepository.UpdateAsync(order, cancellationToken);
if (affected != 1)
{
    throw new InvalidOperationException("The order changed concurrently.");
}`;

const acceptanceCommands = `# Configuration and DI smoke test
dotnet run --configuration Release

# Run database integration tests against an isolated production-engine database.
dotnet test --configuration Release --filter DatabaseOperations

# Required destructive rehearsal (staging only):
# 1. apply the forward migration to an empty database
# 2. apply it again to the previous released schema
# 3. start two instances simultaneously
# 4. exercise rollback/restore from backup
# 5. verify tenant, optimistic-lock, cache, and outage cases`;

const sectionIds = [
  "contract",
  "configuration",
  "providers",
  "registration",
  "repositories",
  "tenancy",
  "transactions",
  "concurrency",
  "cache",
  "schema-migrations",
  "failure-operations",
  "acceptance",
  "ai-ready",
  "sources",
] as const;

function makePage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "database-operations",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: "ASGARD 5.1.3 · DATABASE OPERATIONS",
    title: zh ? "数据库接入与生产操作" : "Database integration and production operations",
    description: zh
      ? "从连接配置、仓储与租户隔离，到事务、乐观锁、迁移、缓存一致性和生产验收的源码合同。"
      : "A source-contracted path from connection configuration and tenant-aware repositories to transactions, optimistic concurrency, migrations, cache consistency, and production acceptance.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "发布合同与责任边界" : "Released contract and responsibility boundary",
        paragraphs: [
          zh
            ? "本页以 Asgard 5.1.3 clean commit d1002d1 的 DatabaseConfig、DatabaseServiceCollectionExtensions、FreeSqlDataTypeResolver、AbsAsgardRepositoryBase 与实体基类为准。已发布的框架合同是：从 database 配置创建一个单例 IFreeSql、为租户实体挂载动态 GlobalFilter，并提供带缓存辅助、Trace 包装和租户回填的仓储基类。"
            : "This guide is contracted against DatabaseConfig, DatabaseServiceCollectionExtensions, FreeSqlDataTypeResolver, AbsAsgardRepositoryBase, and the entity base classes at clean Asgard 5.1.3 commit d1002d1. The released framework contract creates one singleton IFreeSql from database configuration, attaches a dynamic GlobalFilter to tenant entities, and supplies a repository base with cache helpers, Trace wrapping, and tenant fill.",
          zh
            ? "这不是托管数据库平台。当前主数据库路径没有自动迁移、建库/建表、连接重试、读写分离、故障转移、事务编排、数据库健康探针或备份恢复管理器；这些生产职责必须由应用与运维显式实现并验收。"
            : "This is not a managed database platform. The current primary-database path does not provide automatic migrations, database/table creation, connection retry, read/write splitting, failover, transaction orchestration, a database health probe, or backup/restore management. Applications and operators must implement and accept those responsibilities explicitly.",
        ],
        note: zh
          ? "Release：MySQL 主路径有包引用和源码测试证据。Preview/未证明：仅由枚举映射出现的其他 provider，不等于可直接运行。"
          : "Release: the MySQL primary path has package and source-test evidence. Preview/unproven: a provider appearing only in the resolver map is not proof that it runs out of the box.",
      },
      {
        id: sectionIds[1],
        title: zh ? "配置、密钥与启动失败" : "Configuration, secrets, and startup failure",
        paragraphs: [
          zh
            ? "DatabaseConfig 公开且只公开 database.enabled、database.provider、database.connectionString。enabled 默认 false，provider 的 CLR/属性默认值是 MySQL，connectionString 默认空字符串；启用时 provider 或连接串为空会由 Validate 抛出 InvalidOperationException。字符串只做 IsNullOrEmpty 校验，纯空白不是有效配置，却可能直到 provider 解析或首次连接才失败。"
            : "DatabaseConfig exposes exactly database.enabled, database.provider, and database.connectionString. enabled defaults to false, the CLR/attribute default for provider is MySQL, and connectionString defaults to an empty string. When enabled, an empty provider or connection string causes Validate to throw InvalidOperationException. Validation uses IsNullOrEmpty, so whitespace is not a usable value even though it may fail later during provider resolution or first connection.",
          zh
            ? "连接串必须从环境变量或秘密存储注入；不要提交 app.yaml 明文、在 Trace/日志中输出配置对象，或把带真实凭据的连接串放入异常消息。为运行身份授予最小数据库权限，并把迁移身份与应用运行身份分离。"
            : "Inject the connection string from an environment or secret store. Never commit plaintext app.yaml credentials, serialize the configuration object into Trace/logs, or include a credential-bearing connection string in an exception. Grant the runtime identity least privilege and separate the migration identity from the application identity.",
        ],
        code: { language: "yaml", value: databaseYaml },
      },
      {
        id: sectionIds[2],
        title: zh ? "Provider 映射不等于运行支持" : "Provider mapping is not runtime support",
        paragraphs: [
          zh
            ? "FreeSqlDataTypeResolver 会 Trim 后按大小写不敏感方式识别 sqlserver、postgresql、mysql、sqlite、oracle、dm/达梦、kingbase/人大金仓。但 Asgard.Core.csproj 当前只引用 FreeSql.Provider.MySql 3.5.310；因此库存包可以宣称并验证的是 MySQL 主路径。"
            : "FreeSqlDataTypeResolver trims and case-folds sqlserver, postgresql, mysql, sqlite, oracle, dm/达梦, and kingbase/人大金仓. However, Asgard.Core.csproj currently references only FreeSql.Provider.MySql 3.5.310. The stock package can therefore claim and verify the MySQL primary path, not every mapped name.",
          zh
            ? "选择其他数据库前，应用必须引入与 FreeSql 3.5.310 兼容的对应 provider 包，并用真实引擎验证连接、参数、DDL、事务、Version 并发和异常映射。未知名称在构造 IFreeSql 时抛 NotSupportedException；AddDatabase 不会提前建立连接，因此 DI 注册成功不等于数据库可用。"
            : "Before selecting another engine, the application must add its matching provider package compatible with FreeSql 3.5.310 and validate connection behavior, parameters, DDL, transactions, Version concurrency, and exception mapping against the real engine. An unknown name throws NotSupportedException while constructing IFreeSql. AddDatabase does not open a connection eagerly, so successful DI registration is not a readiness signal.",
        ],
      },
      {
        id: sectionIds[3],
        title: zh ? "Yggdrasil 注册与生命周期" : "Yggdrasil registration and lifetime",
        paragraphs: [
          zh
            ? "Yggdrasil 从配置加载并 Validate DatabaseConfig，仅在 enabled=true 时调用 AddDatabase。该扩展通过工厂延迟构造并以 Singleton 注册 IFreeSql；数据库关闭时不会注册 IFreeSql，任何必需注入它的仓储也就不能被解析。功能可选的插件必须在启动能力检查处失败清楚，或在数据库关闭时完全不注册数据库仓储。"
            : "Yggdrasil loads and validates DatabaseConfig, calling AddDatabase only when enabled=true. The extension lazily constructs and registers IFreeSql as a singleton. When the database is disabled, IFreeSql is absent and repositories that require it cannot resolve. An optional plugin must fail clearly during capability validation or avoid registering database repositories when the module is disabled.",
          zh
            ? "标准 Yggdrasil 即使 caching.enabled=false 也注册空 IMultiLevelCache，所以仓储构造函数仍保持一致；AddAsgardContext 以 Scoped 注册 IAsgardRepositoryContext。不要把 Scoped Repository/Service 捕获进单例或跨请求保存。"
            : "Standard Yggdrasil registers a no-op IMultiLevelCache even when caching.enabled=false, so repository constructors stay uniform. AddAsgardContext registers IAsgardRepositoryContext as scoped. Never capture a scoped repository or service in a singleton or retain it across requests.",
        ],
      },
      {
        id: sectionIds[4],
        title: zh ? "仓储、服务与写入路径" : "Repositories, services, and write paths",
        paragraphs: [
          zh
            ? "仓储实现加 [Repository]，继承 AbsAsgardRepositoryBase<TEntity,TKey>，并注入 IFreeSql、IMultiLevelCache、ILogger 与 IAsgardRepositoryContext。AddRepositories 扫描程序集后把实现类型及其全部接口注册为 Scoped；插件也可通过 conventions 完成扫描。控制器只调用服务，服务编排仓储并产出 DTO。"
            : "Mark repository implementations with [Repository], derive from AbsAsgardRepositoryBase<TEntity,TKey>, and inject IFreeSql, IMultiLevelCache, ILogger, and IAsgardRepositoryContext. AddRepositories scans assemblies and registers each implementation plus all its interfaces as scoped; plugin conventions can perform the same scan. Controllers call services only, while services orchestrate repositories and produce DTOs.",
          zh
            ? "基类只包装它自己 new 出来的 Get/Insert/Update/Delete 方法。直接使用 Select、IFreeSql、原生 SQL或 FreeSql 的其他重载会绕过部分租户回填、Trace 和缓存失效合同；每个自定义仓储入口都必须审查这些横切责任。"
            : "The base class wraps only its own new Get/Insert/Update/Delete methods. Direct Select, IFreeSql, raw SQL, or other FreeSql overloads may bypass tenant fill, Trace, and cache-invalidation parts of the contract. Review those cross-cutting responsibilities for every custom repository entry point.",
        ],
        code: { language: "csharp", value: repositoryCode },
      },
      {
        id: sectionIds[5],
        title: zh ? "租户过滤必须失败关闭" : "Tenant filtering must fail closed",
        paragraphs: [
          zh
            ? "AddDatabase 仅在能解析 IAsgardIdentityContext 时为 AbsAsgardTenantEntity 注册 AsgardTenantFilter；当前 tenantId 非 Guid.Empty 时，过滤条件为 entity.TenantId == currentTenantId.ToString()。Insert/Update 仅在实体 TenantId 为空时回填当前租户，显式提供的 TenantId 不会被覆盖。"
            : "AddDatabase registers AsgardTenantFilter for AbsAsgardTenantEntity only when IAsgardIdentityContext can be resolved. When the current tenant is not Guid.Empty, the predicate is entity.TenantId == currentTenantId.ToString(). Insert/Update fills the ambient tenant only when the entity TenantId is empty; an explicit TenantId is not overwritten.",
          zh
            ? "因此身份上下文缺失、Guid.Empty、非租户实体、原生 SQL或另建 IFreeSql 都可能无过滤。租户业务入口必须验证当前租户非空且与显式资源归属一致；后台任务使用 ITenantScopeFactory。不要把 GlobalFilter 当授权，也不要用 Guid.Empty 实现跨租户管理。"
            : "Consequently, a missing identity context, Guid.Empty, a non-tenant entity, raw SQL, or a separately constructed IFreeSql can be unfiltered. Tenant business entry points must require a non-empty ambient tenant matching explicit resource ownership, and background work must use ITenantScopeFactory. GlobalFilter is not authorization, and Guid.Empty is not a cross-tenant administration mechanism.",
          zh
            ? "AbsAsgardBaseEntity 虽有 Deleted 和 MarkAsDeleted，但当前数据库注册没有 Deleted == false 的全局过滤。所有正常读取必须显式排除 Deleted，恢复/审计路径则要使用专门查询；不要根据实体注释宣称软删除已自动隐藏。"
            : "AbsAsgardBaseEntity has Deleted and MarkAsDeleted, but current database registration does not install a Deleted == false global filter. Normal reads must exclude Deleted explicitly, while restore/audit paths need dedicated queries. Do not infer automatic soft-delete hiding from entity comments.",
        ],
      },
      {
        id: sectionIds[6],
        title: zh ? "事务由应用显式拥有" : "Transactions are application-owned",
        paragraphs: [
          zh
            ? "当前 Asgard 主数据库代码没有注册 IUnitOfWork，也没有在仓储 CRUD 外包事务。单次仓储调用不能证明多个写入原子；跨仓储业务应在 Service 建立一个明确的 FreeSql 事务边界，并对选定 provider 做提交、回滚、超时、取消和嵌套行为测试。不要把 Controller 作为事务所有者。"
            : "The current Asgard primary-database code neither registers IUnitOfWork nor wraps repository CRUD in a transaction. One repository call does not make several writes atomic. A cross-repository workflow must establish an explicit FreeSql transaction boundary in the service and test commit, rollback, timeout, cancellation, and nesting against the selected provider. Controllers must not own transactions.",
          zh
            ? "数据库提交、缓存失效、消息发布与外部 HTTP 调用不是一个原子事务。需要可靠事件时采用应用级 outbox/幂等消费者，并在同一个数据库事务中写业务行与 outbox 行；当前框架没有发布已验证的 outbox 管理器，不能把该模式写成开箱即用能力。"
            : "Database commit, cache invalidation, message publication, and external HTTP calls are not one atomic transaction. Reliable events require an application-owned outbox and idempotent consumer, with business and outbox rows written in one database transaction. The current framework does not ship a verified outbox manager, so this pattern is not an out-of-box Asgard capability.",
        ],
      },
      {
        id: sectionIds[7],
        title: zh ? "乐观锁：先查后改" : "Optimistic concurrency: load then mutate",
        paragraphs: [
          zh
            ? "AbsAsgardBaseEntity.Version 标记 [Column(Name = \"version\", IsVersion = true)]。更新必须先从数据库读取当前实体，在原对象上只修改允许字段，再调用 UpdateAsync；禁止 dto.ToEntity() 后直接更新，因为它会丢失数据库当前 Version，并可能覆盖 TenantId、Deleted、CreateBy/CreateTime 等持久化字段。"
            : "AbsAsgardBaseEntity.Version carries [Column(Name = \"version\", IsVersion = true)]. An update must load the current entity, mutate only allowed fields on that object, then call UpdateAsync. Never update dto.ToEntity() directly: it loses the database Version and can overwrite TenantId, Deleted, CreateBy/CreateTime, and other persisted fields.",
          zh
            ? "把受影响行数不是 1 视为并发冲突或资源状态变化，不要静默成功；向 API 映射稳定错误并让客户端重新读取。并发语义属于 provider 验收范围，尤其是非 MySQL 路径。"
            : "Treat an affected-row count other than one as a concurrency conflict or state change; never report silent success. Map it to a stable API error and make the client reload. Provider acceptance must cover concurrency semantics, especially outside the MySQL path.",
        ],
      },
      {
        id: sectionIds[8],
        title: zh ? "缓存一致性与租户键" : "Cache consistency and tenant keys",
        paragraphs: [
          zh
            ? "Get/GetAsync 先读缓存，未命中再查数据库并回填；Insert 清列表键，Update/Delete 清实体键和列表键。但默认实体键是 {entity}:{id}，列表前缀是 {entity}:list，均不含 TenantId。租户实体在 ID 可能跨租户重复时会串读；上线前必须覆盖所有实体、列表和失效键以加入 tenantId，或保持 caching.enabled=false。"
            : "Get/GetAsync checks cache first, then loads and fills on a miss. Insert clears the list key; Update/Delete clear entity and list keys. Default entity keys are {entity}:{id} and list prefixes are {entity}:list, neither containing TenantId. Tenant entities can leak across tenants when IDs overlap. Override and test every entity, list, and invalidation key with tenantId before enabling caching, or keep caching.enabled=false.",
          zh
            ? "写库成功后才执行缓存删除；两者没有事务。缓存删除异常可能使调用方看到失败而数据库已经提交，删除成功也不保证并发读者没有回填旧值。生产方案要定义版本化键、短 TTL、重试/告警和幂等写入，并注入缓存故障验证恢复。"
            : "Cache deletion runs after the database write and is not transactional with it. A deletion failure can make the caller observe failure after the database committed, while successful deletion does not prevent a concurrent reader from refilling stale data. Define versioned keys, short TTLs, retry/alerting, and idempotent writes, then inject cache failures to verify recovery.",
        ],
      },
      {
        id: sectionIds[9],
        title: zh ? "建表、迁移与回滚边界" : "Schema, migration, and rollback boundary",
        paragraphs: [
          zh
            ? "主 AddDatabase 只调用 FreeSqlBuilder.UseConnectionString(...).Build()，不调用 CodeFirst.SyncStructure。Trace 与数据库日志各自的独立存储会为自己的表调用 SyncStructure，但这不是业务表迁移机制。业务模块必须维护有顺序、有版本、有审计记录的迁移，并在进程启动前或独立迁移作业中执行。"
            : "Primary AddDatabase calls only FreeSqlBuilder.UseConnectionString(...).Build(); it does not call CodeFirst.SyncStructure. The independent Trace and database-log stores call SyncStructure for their own tables, but that is not a business-schema migration system. Business modules must own ordered, versioned, audited migrations executed before application startup or in a separate migration job.",
          zh
            ? "当前仓库没有发布通用迁移 ledger、分布式迁移锁、down 脚本或零停机编排。采用 expand → 双读/双写（仅在需要时）→ backfill → contract，先证明旧版与新版兼容，再删除字段。生产应用身份不要有 DDL 权限；迁移前备份并实际演练恢复。"
            : "The current repository does not ship a general migration ledger, distributed migration lock, down scripts, or zero-downtime orchestration. Use expand → dual read/write only when required → backfill → contract, proving old/new compatibility before removing fields. The production runtime identity should not have DDL rights. Back up and rehearse restore before migration.",
          zh
            ? "实体/DDL 默认使用小写 snake_case，主键 id，租户列 tenant_id，审计/并发列 create_time、update_time、create_by、update_by、deleted、version；逻辑关联只保留 {entity}_id 与索引，不创建 FOREIGN KEY、REFERENCES 或级联。"
            : "Entity/DDL conventions use lowercase snake_case, primary key id, tenant_id, and audit/concurrency columns create_time, update_time, create_by, update_by, deleted, and version. Keep logical relations as {entity}_id plus indexes; do not add FOREIGN KEY, REFERENCES, or cascades.",
        ],
      },
      {
        id: sectionIds[10],
        title: zh ? "故障检测、可观测与恢复" : "Failure detection, observability, and recovery",
        bullets: zh
          ? [
              "启动 readiness 必须执行低成本真实数据库探测；Yggdrasil 内建 health check 当前只有 self，不证明数据库可达",
              "为连接耗尽、慢查询、死锁、锁等待、事务回滚、Version 冲突和缓存失效失败建立指标与结构化日志，但脱敏 SQL 参数和连接串",
              "按 provider 设置合理连接池与命令超时；当前 DatabaseConfig 没有独立 timeout/retry 字段，需在连接串或应用 FreeSql 配置中实现并做源码级评审",
              "只对已证明瞬态且幂等的操作重试；不要把唯一键冲突、乐观锁冲突、权限错误或语法错误当瞬态故障",
              "恢复流程必须覆盖 PITR/备份校验、迁移版本核对、缓存清空或版本切换、积压事件重放和租户隔离抽查",
            ]
          : [
              "Readiness must execute a cheap real database probe; Yggdrasil's built-in health check currently reports self only and does not prove database reachability",
              "Create metrics and structured logs for pool exhaustion, slow queries, deadlocks, lock waits, transaction rollback, Version conflicts, and cache-invalidation failure, while redacting SQL parameters and connection strings",
              "Set provider-appropriate pool and command timeouts; DatabaseConfig has no separate timeout/retry fields, so implement them in the connection string or application FreeSql setup and review that code path",
              "Retry only proven transient, idempotent operations; uniqueness conflicts, optimistic conflicts, permission failures, and syntax errors are not transient",
              "Recovery must cover PITR/backup validation, migration-version reconciliation, cache flush/version switch, queued-event replay, and tenant-isolation sampling",
            ],
      },
      {
        id: sectionIds[11],
        title: zh ? "生产验收矩阵" : "Production acceptance matrix",
        bullets: zh
          ? [
              "空库与上一发布版本分别执行迁移，校验 schema、索引、默认值、回填和重复执行行为",
              "使用真实目标引擎验证连接失败、凭据轮换、连接池耗尽、超时、死锁和进程中止后的事务回滚",
              "两租户使用相同 ID 做冷/热缓存读写、软删除、恢复、分页和原生 SQL测试；无租户上下文必须失败关闭",
              "两个并发请求更新同一 Version，仅一个成功，另一个得到稳定冲突；DTO 不能改写归属与审计字段",
              "数据库提交后注入缓存删除失败、进程退出与重复请求，证明恢复路径不会丢写或产生不可见陈旧数据",
              "备份恢复到隔离环境，核对迁移 ledger、关键行数、租户抽样和应用 readiness 后才允许切流",
            ]
          : [
              "Migrate both an empty database and the previous release, checking schema, indexes, defaults, backfill, and repeat-run behavior",
              "Against the real target engine, test connection failure, credential rotation, pool exhaustion, timeout, deadlock, and transaction rollback after process termination",
              "Use identical IDs in two tenants for cold/hot cache reads and writes, soft delete, restore, paging, and raw SQL; missing tenant context must fail closed",
              "Race two updates against one Version: exactly one succeeds and the other returns a stable conflict; DTO input cannot rewrite ownership or audit fields",
              "After a database commit, inject cache-deletion failure, process exit, and duplicate request, proving recovery neither loses writes nor hides stale data indefinitely",
              "Restore backup into isolation and verify migration ledger, critical row counts, tenant samples, and application readiness before traffic cutover",
            ],
        code: { language: "text", value: acceptanceCommands },
      },
      {
        id: sectionIds[12],
        title: zh ? "AI Ready：Agent 工作流" : "AI Ready: Agent workflow",
        paragraphs: [
          zh
            ? "让 Agent 修改数据库代码前先加载 asgard-database；涉及实体、仓储、Service、租户、审计、Version、DTO 映射或响应包装时，再加载 asgard-backend-guard 做复查。写任何 Asgard C# 代码还必须加载 asgard-dotnet-10-csharp-14；新增插件结构时加载 asgard-plugin-structure。"
            : "Before an agent changes database code, load asgard-database. When entities, repositories, services, tenancy, audit, Version, DTO mapping, or response wrappers are involved, also load asgard-backend-guard for review. Any Asgard C# work must load asgard-dotnet-10-csharp-14, and new plugin layout work should load asgard-plugin-structure.",
          zh
            ? "审查提示应要求 Agent 给出源码证据、受影响迁移、事务所有者、租户失败关闭证明、乐观锁路径、缓存键/失效策略、真实 provider 集成测试和回滚演练。禁止 Agent 因配置类型或 FreeSql API 存在就宣称重试、故障转移、自动迁移或多 provider 已端到端交付。"
            : "The review prompt should require source evidence, affected migrations, transaction ownership, tenant fail-closed proof, optimistic-lock paths, cache key/invalidation strategy, real-provider integration tests, and rollback rehearsal. An agent must not claim retry, failover, automatic migration, or end-to-end multi-provider delivery merely because a configuration type or FreeSql API exists.",
        ],
      },
      {
        id: sectionIds[13],
        title: zh ? "源码核验入口" : "Source verification anchors",
        paragraphs: [
          zh
            ? "维护本页时先 diff 下列源码与包引用。配置字段、provider 包、GlobalFilter、仓储 CRUD/缓存键、实体 Version/Deleted 或宿主 health/注册顺序任一变化，都要同步两种语言、生产边界和验收矩阵。"
            : "When maintaining this page, diff these sources and package references first. Any change to configuration fields, provider packages, GlobalFilter, repository CRUD/cache keys, entity Version/Deleted, or host health/registration order must update both locales, production boundaries, and the acceptance matrix.",
        ],
        code: {
          language: "text",
          value: `Common/Asgard.Abstractions/Data/DatabaseConfig.cs
Common/Asgard.Core/Data/DatabaseServiceCollectionExtensions.cs
Common/Asgard.Core/Data/FreeSqlDataTypeResolver.cs
Common/Asgard.Core/Asgard.Core.csproj
Directory.Packages.props
Common/Asgard.Abstractions/Data/IAsgardRepositoryContext.cs
Common/Asgard.Core/Data/AsgardRepositoryContext.cs
Common/Asgard.Core/Data/RepositoryServiceCollectionExtensions.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.Crud.cs
Common/Asgard.Abstractions/Data/Entities/AbsAsgardBaseEntity.cs
Common/Asgard.Abstractions/Data/Entities/AbsAsgardTenantEntity.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs
Test/Asgard.Core.Tests/Data/DatabaseTenantIntegrationTests.cs`,
        },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "database", label: zh ? "数据库与仓储概览" : "Database and repositories overview" },
      { product: "asgard", docSlug: "configuration-fields", label: zh ? "字段级配置参考" : "Field-level configuration reference" },
      { product: "asgard", docSlug: "tenant-background-work", label: zh ? "后台任务租户隔离" : "Background tenant isolation" },
      { product: "asgard", docSlug: "crud-vertical-slice", label: zh ? "CRUD 纵向切片" : "CRUD vertical slice" },
    ],
  };
}

export const zhAsgardDatabaseOperationsDocs: DocPage[] = [makePage("zh")];
export const enAsgardDatabaseOperationsDocs: DocPage[] = [makePage("en")];
