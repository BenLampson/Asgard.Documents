import type { DocPage, Locale } from "./content";

const tenantJobCode = `using Asgard.Abstractions;
using Asgard.Abstractions.Job;

public sealed class RebuildTenantProjectionJob(
    AbsAsgardContext asgardContext,
    ITenantCatalog tenantCatalog,
    IProjectionService projectionService,
    ILogger<RebuildTenantProjectionJob> logger) : IJob
{
    public async Task ExecuteAsync(IJobExecutionContext context)
    {
        var tenantScopeFactory = asgardContext.TenantScopeFactory
            ?? throw new InvalidOperationException(
                "Tenant scope support is required for this job.");

        var tenantIds = await tenantCatalog.GetActiveTenantIdsAsync();
        foreach (var tenantId in tenantIds)
        {
            if (context.CancelRequested)
            {
                throw new OperationCanceledException();
            }

            if (tenantId == Guid.Empty)
            {
                logger.LogError("Skipped an empty tenant id.");
                continue;
            }

            using var tenantScope = tenantScopeFactory.CreateScope(tenantId);
            await projectionService.RebuildAsync(
                tenantId,
                actorId: "system:projection-job");
        }
    }
}`;

const safeRepositoryCode = `public async Task RebuildAsync(Guid tenantId, string actorId)
{
    var currentTenantId = asgardContext.IdentityContext?.GetCurrentTenantId()
        ?? Guid.Empty;

    if (currentTenantId == Guid.Empty || currentTenantId != tenantId)
    {
        throw new InvalidOperationException("Tenant scope is missing or mismatched.");
    }

    // The FreeSql GlobalFilter now limits AbsAsgardTenantEntity reads.
    var rows = await projectionRepository.GetPendingAsync();
    foreach (var row in rows)
    {
        row.Rebuild(actorId);
        await projectionRepository.UpdateAsync(row);
    }
}`;

const jobYaml = `job:
  enabled: true
  scheduler:
    threadPoolSize: 4
    maxBatchSize: 20
    enableCluster: false
    instanceId: "\${env:ASGARD_INSTANCE_ID}"
  jobs:
    - name: RebuildTenantProjection
      group: maintenance
      jobType: "MyApp.Jobs.RebuildTenantProjectionJob, MyApp"
      triggers:
        - type: cron
          cron: "0 0/15 * * * ?"
          startNow: false`;

const parallelPattern = `await Parallel.ForEachAsync(
    tenantIds,
    new ParallelOptions { MaxDegreeOfParallelism = 4 },
    async (tenantId, cancellationToken) =>
    {
        await using var serviceScope = serviceScopeFactory.CreateAsyncScope();
        var context = serviceScope.ServiceProvider
            .GetRequiredService<AbsAsgardContext>();
        var service = serviceScope.ServiceProvider
            .GetRequiredService<IProjectionService>();
        var factory = context.TenantScopeFactory
            ?? throw new InvalidOperationException("Tenant scope is unavailable.");

        using var tenantScope = factory.CreateScope(tenantId);
        await service.RebuildAsync(tenantId, "system:projection-job");
    });`;

const acceptanceCode = `# Run against a real database with two tenants that share one entity id.
dotnet test -c Release --filter TenantBackgroundIsolation

# Trigger the configured job and inspect its JobExecutionResult/log record.
# Then verify:
# - tenant A changed only tenant A rows
# - tenant B changed only tenant B rows
# - Guid.Empty and missing scope performed no database mutation
# - a thrown tenant failure is visible to operations
# - nested scopes restored the previous tenant`;

const sectionIds = [
  "contract",
  "execution-scope",
  "identity-snapshot",
  "create-scope",
  "repository-filter",
  "audit",
  "fanout",
  "cache",
  "scheduler",
  "failure",
  "acceptance",
  "sources",
] as const;

function makePage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "tenant-background-work",
    group: zh ? "身份与租户" : "Identity & tenancy",
    eyebrow: "ASGARD 5.1.3 · NON-HTTP TENANCY",
    title: zh ? "后台任务与非 HTTP 租户隔离" : "Tenant isolation outside HTTP requests",
    description: zh
      ? "在 Job、Worker 与消息消费中显式建立租户身份快照，让仓储过滤、写入归属和审计保持可验证。"
      : "Establish an explicit tenant snapshot in jobs, workers, and consumers so repository filtering, ownership, and audit remain verifiable.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "源码合同与安全目标" : "Source contract and security objective",
        paragraphs: [
          zh
            ? "本页以 Asgard 5.1.3 clean source 的 ITenantScopeFactory、AsgardIdentityContextAccessor、TenantScopeFactory、DatabaseServiceCollectionExtensions、AbsAsgardRepositoryBase 与 QuartzJobFactory 为准。目标不是方便地传一个 tenantId，而是让同一执行流中的身份快照、FreeSql GlobalFilter、仓储自动回填和业务审计彼此一致。"
            : "This guide is contracted against ITenantScopeFactory, AsgardIdentityContextAccessor, TenantScopeFactory, DatabaseServiceCollectionExtensions, AbsAsgardRepositoryBase, and QuartzJobFactory in clean Asgard 5.1.3 source. The goal is not merely passing a tenantId: the ambient identity snapshot, FreeSql GlobalFilter, repository ownership fill, and business audit must agree.",
          zh
            ? "HTTP 请求由认证与 UseAsgardTenant 建立快照；Quartz Job、队列消费者、HostedService 和手工 Task 没有请求中间件，必须自己进入租户作用域。租户作用域不可用时，租户写任务应失败关闭，绝不能降级为无过滤查询。"
            : "Authentication plus UseAsgardTenant establishes the HTTP snapshot. Quartz jobs, queue consumers, hosted services, and ad-hoc tasks have no request middleware and must enter a tenant scope themselves. A tenant-writing process must fail closed when tenant scope support is unavailable; an unfiltered fallback is unsafe.",
        ],
      },
      {
        id: sectionIds[1],
        title: zh ? "每次 Job 触发都有 DI Scope" : "Each job fire receives a DI scope",
        paragraphs: [
          zh
            ? "QuartzJobFactory 在每次触发时创建 IServiceScope，从该作用域解析 Job 构造函数依赖，并在 AsgardJobAdapter.Dispose 时释放；因此 Job 可以安全注入 scoped 的 AbsAsgardContext、Service 与 Repository。不要把这些 scoped 对象保存到静态字段或单例协调器。"
            : "QuartzJobFactory creates an IServiceScope for each fire, resolves constructor dependencies from it, and releases it through AsgardJobAdapter.Dispose. A job can therefore inject scoped AbsAsgardContext, services, and repositories. Never retain those scoped objects in static fields or singleton coordinators.",
          zh
            ? "IFreeSql 与 TenantScopeFactory 是单例，但它们读取的 IAsgardIdentityContext 使用 AsyncLocal 环境快照；隔离的边界是执行流和正确释放的作用域，不是为每个租户创建一个数据库实例。"
            : "IFreeSql and TenantScopeFactory are singletons, while the IAsgardIdentityContext they read uses an AsyncLocal ambient snapshot. Isolation comes from the execution flow and correctly disposed scope, not from one database instance per tenant.",
        ],
      },
      {
        id: sectionIds[2],
        title: zh ? "TenantScope 只覆盖快照 TenantId" : "TenantScope overrides only snapshot TenantId",
        paragraphs: [
          zh
            ? "TenantScopeFactory 以当前 AsgardIdentitySnapshot 为基础，仅用 with { TenantId = tenantId } 覆盖快照租户，并在 Dispose 时恢复原快照。它不会改写 UserInfo.TenantId、UserId、角色、权限或 token_type。仓储过滤读取 GetCurrentTenantId，因此隔离生效；但后台审计不能假装成某个 HTTP 用户。"
            : "TenantScopeFactory starts from the current AsgardIdentitySnapshot and changes only TenantId with a record copy, restoring the previous snapshot on Dispose. It does not rewrite UserInfo.TenantId, UserId, roles, permissions, or token_type. Repository filtering reads GetCurrentTenantId and therefore works, but background audit must not impersonate an HTTP user.",
          zh
            ? "CreateScope(Guid.Empty) 会让 GlobalFilter 的 ApplyIf 条件为 false，相当于不启用租户过滤。调用前必须拒绝空 Guid；平台级跨租户流程也应使用独立、受审计的管理路径，而不是把 Empty 当万能租户。"
            : "CreateScope(Guid.Empty) makes the GlobalFilter ApplyIf predicate false, which disables tenant filtering. Reject an empty Guid before entering the scope. Platform-wide work needs a separate audited administration path, not an empty ‘universal tenant.’",
        ],
      },
      {
        id: sectionIds[3],
        title: zh ? "顺序遍历是最安全基线" : "Sequential iteration is the safe baseline",
        paragraphs: [
          zh
            ? "先从平台级目录取得明确的 tenantId 列表，再为每个租户在调用业务服务前创建作用域。using 必须包住全部仓储调用并按 LIFO 释放；不要在作用域外延迟枚举 IQueryable，也不要把实体或回调带到下一个租户。"
            : "First obtain an explicit tenantId list from a platform catalog, then enter one tenant scope before calling business services. The using block must contain every repository operation and unwind in LIFO order. Do not defer an IQueryable outside the scope or carry entities/callbacks into the next tenant.",
        ],
        code: { language: "csharp", value: tenantJobCode },
      },
      {
        id: sectionIds[4],
        title: zh ? "GlobalFilter 与仓储回填边界" : "GlobalFilter and repository ownership boundaries",
        paragraphs: [
          zh
            ? "AddDatabase 注册的单例 IFreeSql 为 AbsAsgardTenantEntity 加动态 AsgardTenantFilter：当前租户非空时才追加 entity.TenantId == currentTenantId。仓储 Insert/Update 前还会在实体 TenantId 为空时从同一身份上下文回填。"
            : "AddDatabase attaches a dynamic AsgardTenantFilter to the singleton IFreeSql for AbsAsgardTenantEntity. It adds entity.TenantId == currentTenantId only when the current tenant is non-empty. Before Insert/Update, the repository also fills an empty entity TenantId from the same identity context.",
          zh
            ? "GlobalFilter 是纵深防御，不替代业务资源归属检查。服务入口同时比较显式 tenantId 与当前快照，并保持 Deleted、Version、权限和领域约束；原生 SQL、其他 FreeSql 实例、非租户实体或显式禁用过滤的查询都不受这个合同保护。"
            : "The GlobalFilter is defense in depth, not a replacement for resource ownership checks. Service entry points should compare the explicit tenantId with the ambient snapshot and preserve Deleted, Version, permission, and domain rules. Raw SQL, another FreeSql instance, non-tenant entities, or explicitly disabled filters sit outside this contract.",
        ],
        code: { language: "csharp", value: safeRepositoryCode },
      },
      {
        id: sectionIds[5],
        title: zh ? "后台审计使用显式系统 Actor" : "Use an explicit system actor for background audit",
        bullets: zh
          ? [
              "TenantScope 不会制造 UserId；CreateBy/UpdateBy 应由业务服务接受稳定的 system:* actor，或使用专门的作业执行身份合同",
              "不要从可能为空或继承自外层请求的 UserInfo 猜审计人；尤其不要把触发 Job 的管理员自动记成所有租户数据的操作者",
              "记录 job key、fire time、tenantId、actor、输入版本和结果摘要；不要记录令牌、连接串或完整业务对象",
              "需要用户授权语义的异步命令应在入队时冻结最小授权/主体合同，并在消费时重新验证，不要只传 tenantId",
            ]
          : [
              "TenantScope does not create a UserId. Let the business service accept a stable system:* actor or define a dedicated job-execution identity contract for CreateBy/UpdateBy",
              "Do not infer the actor from UserInfo that may be empty or inherited from an outer request; especially do not attribute every tenant mutation to the administrator who triggered the job",
              "Record job key, fire time, tenantId, actor, input version, and a result summary; never record tokens, connection strings, or whole business objects",
              "An async command that depends on user authorization should freeze a minimal subject/authorization contract at enqueue time and revalidate it on consumption, not carry only tenantId",
            ],
      },
      {
        id: sectionIds[6],
        title: zh ? "并行 Fan-out 必须每租户建服务作用域" : "Parallel fan-out needs one service scope per tenant",
        paragraphs: [
          zh
            ? "不要在一个 Job 的 scoped Repository/Service 上直接 Parallel.ForEach。若顺序处理无法满足时限，每个并行分支都应在分支内部创建独立 Async DI scope，再从该 scope 解析 AbsAsgardContext 与业务服务，并在分支内部创建/释放 TenantScope。设置有界并发并用真实数据库做串租户压力测试。"
            : "Do not run Parallel.ForEach directly over one job's scoped repositories and services. When sequential processing cannot meet the deadline, create an independent async DI scope inside each branch, resolve AbsAsgardContext and business services there, then create and dispose TenantScope inside that branch. Bound concurrency and stress-test tenant isolation against a real database.",
          zh
            ? "AsyncLocal 会沿 ExecutionContext 流动，所以不要先在父流程打开某个租户作用域再启动多个 tenant Task；每个分支必须从自己的租户边界开始。"
            : "AsyncLocal flows with ExecutionContext, so never open one tenant scope in the parent and then start tasks for several tenants. Each branch must establish its own tenant boundary.",
        ],
        code: { language: "csharp", value: parallelPattern },
      },
      {
        id: sectionIds[7],
        title: zh ? "缓存键不会自动继承租户隔离" : "Cache keys do not inherit database isolation",
        paragraphs: [
          zh
            ? "FreeSql GlobalFilter 只保护数据库查询。AbsAsgardRepositoryBase 当前默认实体缓存键是 {entity}:{id}，列表键也是全局前缀，不包含 TenantId；在多租户后台任务中，默认缓存可能把一个租户实体提供给另一个租户。"
            : "The FreeSql GlobalFilter protects database queries only. AbsAsgardRepositoryBase currently uses {entity}:{id} for entity cache keys and a global list prefix, without TenantId. In a multi-tenant background process, default caching can therefore return another tenant's entity.",
          zh
            ? "在仓储覆盖并验证 tenant-aware key 之前保持 caching.enabled=false，或在业务仓储中把 currentTenantId 纳入所有实体、列表和失效键。数据库写入与缓存失效也不是一个原子事务。"
            : "Keep caching.enabled=false until repositories override and verify every entity, list, and invalidation key with currentTenantId. Database writes and cache invalidation are not one atomic transaction either.",
        ],
      },
      {
        id: sectionIds[8],
        title: zh ? "调度配置与集群边界" : "Scheduler configuration and cluster boundary",
        paragraphs: [
          zh
            ? "作业实现 IJob.ExecuteAsync(IJobExecutionContext)，取消只能读取 context.CancelRequested。当前 QuartzJobAdapter 标记 DisallowConcurrentExecution，限制同一 JobDetail 的并发执行；enableCluster 配置并不证明持久化集群调度已经接通，当前调度器仍使用 RAMJobStore。多实例唯一执行需要应用级分布式锁或外部调度。"
            : "Jobs implement IJob.ExecuteAsync(IJobExecutionContext), and cancellation is exposed as context.CancelRequested. AsgardJobAdapter has DisallowConcurrentExecution, which limits concurrent fires of the same JobDetail. enableCluster does not prove persistent clustered scheduling is wired; the current scheduler still uses RAMJobStore. Use an application-level distributed lock or an external scheduler for one execution across instances.",
        ],
        code: { language: "yaml", value: jobYaml },
      },
      {
        id: sectionIds[9],
        title: zh ? "失败不会自动重试" : "Failures are not automatic retries",
        paragraphs: [
          zh
            ? "AsgardJobAdapter 捕获 OperationCanceledException 和其他异常，把结果写入 Quartz context.Result，并不重新抛出。不要假设 Quartz 会因为业务异常自动重试、进入死信或触发告警；当前需要应用自己记录失败、建立可查询状态，并显式设计幂等重试。"
            : "AsgardJobAdapter catches OperationCanceledException and every other exception, writes a result to Quartz context.Result, and does not rethrow. Do not assume Quartz automatically retries, dead-letters, or alerts on a business exception. The application must persist/query failure state and design an explicit idempotent retry path.",
          zh
            ? "一个租户失败后是停止全批次还是继续下一个租户，必须在业务层明确选择。若继续，逐租户捕获并记录失败；若失败关闭，让异常到达 Adapter。两种策略都要保证重复执行不会产生重复副作用。"
            : "Choose explicitly whether one tenant failure stops the batch or allows later tenants to continue. For continue-on-error, catch and record per tenant; for fail-closed, let the exception reach the adapter. Both strategies require idempotent behavior under replay.",
        ],
      },
      {
        id: sectionIds[10],
        title: zh ? "生产验收矩阵" : "Production acceptance matrix",
        bullets: zh
          ? [
              "两租户使用相同实体 ID，分别执行冷缓存读取、更新、软删除，证明结果与影响行严格隔离",
              "无 TenantScope、Guid.Empty、错误 tenantId 和 scope 已释放后的调用全部失败关闭且不产生写入",
              "嵌套 A→B→Dispose 恢复 A，最终 Dispose 恢复 Empty；异常路径也执行相同恢复",
              "顺序与有界并行两种实现都做 1000+ 次压力测试，并检查缓存、Trace、日志和审计 actor",
              "模拟一个租户异常、进程重启和重复触发，证明失败可见且重试幂等",
            ]
          : [
              "Use the same entity id in two tenants; cold-read, update, and soft-delete each, proving isolated results and affected rows",
              "Calls with no TenantScope, Guid.Empty, a mismatched tenantId, or a disposed scope fail closed and write nothing",
              "Nested A→B→Dispose restores A and final Dispose restores Empty, including exception paths",
              "Stress both sequential and bounded-parallel implementations for 1,000+ runs while inspecting cache, Trace, logs, and audit actor",
              "Inject one tenant failure, process restart, and duplicate fire to prove visible failure and idempotent replay",
            ],
        code: { language: "text", value: acceptanceCode },
      },
      {
        id: sectionIds[11],
        title: zh ? "源码核验入口" : "Source verification anchors",
        paragraphs: [
          zh
            ? "维护本页时优先 diff 下列文件；TenantScope、身份快照、GlobalFilter、Job DI scope、Adapter 异常语义或仓储缓存键任一变化，都要同步中英文示例与验收矩阵。"
            : "When maintaining this page, diff the following files first. Any change to TenantScope, ambient identity, GlobalFilter, job DI scope, adapter failure behavior, or repository cache keys must update both locales and the acceptance matrix.",
        ],
        code: {
          language: "text",
          value: `Common/Asgard.Abstractions/Data/ITenantScopeFactory.cs
Common/Asgard.AspNetCore.Core/Data/TenantScopeFactory.cs
Common/Asgard.AspNetCore.Core/Data/AsgardTenantScope.cs
Common/Asgard.AspNetCore.Core/Identity/AsgardIdentityContextAccessor.cs
Common/Asgard.Core/Data/DatabaseServiceCollectionExtensions.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.cs
Common/Asgard.Core/Job/QuartzJobFactory.cs
Common/Asgard.Core/Job/AsgardJobAdapter.cs`,
        },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "database", label: zh ? "数据库与仓储" : "Database and repositories" },
      { product: "asgard", docSlug: "job-scheduling", label: zh ? "作业调度" : "Job scheduling" },
      { product: "asgard", docSlug: "crud-vertical-slice", label: zh ? "CRUD 纵向切片" : "CRUD vertical slice" },
    ],
  };
}

export const zhTenantBackgroundDocs: DocPage[] = [makePage("zh")];
export const enTenantBackgroundDocs: DocPage[] = [makePage("en")];
