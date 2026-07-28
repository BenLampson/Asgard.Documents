import type { DocPage, Locale } from "./content";

const jobYaml = `job:
  enabled: true
  scheduler:
    threadPoolSize: 4
    instanceId: "\${env:ASGARD_INSTANCE_ID}"
  jobs:
    - name: ReconcileExpiredSessions
      group: identity-maintenance
      jobType: "MyApp.Jobs.ReconcileExpiredSessionsJob, MyApp"
      description: "Reconcile expired sessions idempotently"
      data:
        batchSize: 200
      triggers:
        - type: cron
          cron: "0 0/10 * * * ?"
          startNow: false
          priority: 5`;

const jobImplementation = `namespace MyApp.Jobs;

/// <summary>
/// 幂等地对账已过期会话。
/// </summary>
public sealed class ReconcileExpiredSessionsJob(
    IExpiredSessionReconciler reconciler,
    ILogger<ReconcileExpiredSessionsJob> logger) : IJob
{
    /// <summary>
    /// 执行一次会话对账。
    /// </summary>
    /// <param name="context">当前作业执行上下文。</param>
    public async Task ExecuteAsync(IJobExecutionContext context)
    {
        var batchSize = context.MergedJobData.GetValue<int>("batchSize");
        logger.LogInformation(
            "开始会话对账，作业: {JobKey}, 批量: {BatchSize}",
            context.JobKey,
            batchSize);

        await reconciler.ReconcileAsync(batchSize);

        logger.LogInformation("会话对账完成，作业: {JobKey}", context.JobKey);
    }
}`;

const dynamicRegistration = `protected override async Task OnInitializeAsync(
    CancellationToken cancellationToken)
{
    var scheduler = GetAsgardContext().JobScheduler
        ?? throw new InvalidOperationException("作业调度模块未启用。");

    var jobKey = new JobKey("ReconcileExpiredSessions", "identity-maintenance");
    var trigger = new TriggerOptions
    {
        Type = "cron",
        Cron = "0 0/10 * * * ?",
        StartNow = false,
        Priority = 5
    };

    await scheduler.ScheduleJobAsync<ReconcileExpiredSessionsJob>(
        jobKey,
        trigger,
        cancellationToken);
}`;

const acceptanceCommands = `# Start with a disposable environment and inspect startup logs.
dotnet run

# Acceptance evidence to collect:
# 1. the configured JobKey exists after startup
# 2. one manual trigger produces one durable business outcome
# 3. a duplicate trigger converges to the same outcome
# 4. an injected exception is visible outside process-local context.Result
# 5. two application replicas do not both mutate the same logical batch
# 6. shutdown/restart loses no accepted business command`;

const sectionIds = [
  "contract",
  "configuration",
  "implementation",
  "registration",
  "trigger-semantics",
  "runtime-api",
  "di-scope",
  "persistence-cluster",
  "failure-retry",
  "shutdown-cancellation",
  "acceptance",
  "sources",
] as const;

function makePage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "job-operations",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: "ASGARD 5.1.3 · QUARTZ OPERATIONS",
    title: zh ? "作业调度与生产运行合同" : "Job scheduling and production operations",
    description: zh
      ? "从配置、实现、注册到失败恢复，按当前 Quartz 运行路径部署可验收、可重放的 Asgard 作业。"
      : "Deploy observable and replay-safe Asgard jobs from configuration through execution and recovery, based on the current Quartz runtime path.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "先区分接口表面与已接通能力" : "Separate API surface from wired capability",
        paragraphs: [
          zh
            ? "本页以 Asgard 5.1.3 的 JobConfig、QuartzJobScheduler、QuartzTriggerFactory、QuartzJobFactory、AsgardJobAdapter 与 PluginBase 为合同。当前发布版提供 cron/simple 触发器、配置和运行时注册、暂停/恢复/立即触发、每次执行 DI scope，以及进程内 Quartz 调度。"
            : "This guide contracts against JobConfig, QuartzJobScheduler, QuartzTriggerFactory, QuartzJobFactory, AsgardJobAdapter, and PluginBase in Asgard 5.1.3. The released path provides cron/simple triggers, configuration and runtime registration, pause/resume/manual fire, a DI scope per execution, and in-process Quartz scheduling.",
          zh
            ? "配置类型还声明集群、数据库、批量和 misfire 字段，但当前主路径没有把它们全部接到 Quartz。文档只把源码实际消费的行为标为可用；类型或注释存在不等于生产能力已经完成。"
            : "Configuration types also declare cluster, database, batch, and misfire fields, but the current main path does not wire all of them into Quartz. This page marks only source-consumed behavior as available; a type or comment is not proof of an end-to-end production capability.",
        ],
      },
      {
        id: sectionIds[1],
        title: zh ? "最小有效配置" : "Minimum effective configuration",
        paragraphs: [
          zh
            ? "job.enabled 默认 false。启用后，JobConfig 要求每个作业有 name、jobType 和至少一个 trigger；cron 必须有表达式，simple 必须有 ISO 8601 duration，例如 PT5M。jobType 使用 Type.GetType 可解析的程序集限定名。"
            : "job.enabled defaults to false. Once enabled, JobConfig requires each job to have name, jobType, and at least one trigger. A cron trigger needs an expression; a simple trigger needs an ISO 8601 duration such as PT5M. jobType must be an assembly-qualified name resolvable by Type.GetType.",
          zh
            ? "生产示例只填写当前会生效的 threadPoolSize、instanceId、触发类型、cron/interval、repeatCount、priority、startNow、startTime 和 endTime。不要因为字段可绑定就认为 maxBatchSize、enableCluster、connectionString、dbProvider、jobFactoryType 或 misfireInstruction 已经改变运行时。"
            : "The production example fills only currently effective values: threadPoolSize, instanceId, trigger type, cron/interval, repeatCount, priority, startNow, startTime, and endTime. Do not assume maxBatchSize, enableCluster, connectionString, dbProvider, jobFactoryType, or misfireInstruction changes runtime merely because it binds.",
        ],
        code: { language: "yaml", value: jobYaml },
      },
      {
        id: sectionIds[2],
        title: zh ? "实现 IJob，并把幂等放进业务层" : "Implement IJob and keep idempotency in the domain",
        paragraphs: [
          zh
            ? "作业实现 Asgard.Abstractions.Job.IJob.ExecuteAsync(IJobExecutionContext)。MergedJobData 合并作业与触发数据；JobKey、TriggerKey 和 fire-time 元数据用于关联日志。当前接口不接收 CancellationToken，业务服务应以稳定幂等键、状态机、唯一约束或 outbox 保证重复执行收敛。"
            : "A job implements Asgard.Abstractions.Job.IJob.ExecuteAsync(IJobExecutionContext). MergedJobData combines job and trigger data; JobKey, TriggerKey, and fire-time metadata correlate logs. The current interface receives no CancellationToken, so business services need a stable idempotency key, state machine, unique constraint, or outbox to make replay converge.",
          zh
            ? "不要把长期状态保存在 Job 实例字段。QuartzJobFactory 每次触发创建新 DI scope 和 Job 实例；真正需要跨执行保存的游标、租约和结果必须进入可靠存储。"
            : "Do not keep durable state in job instance fields. QuartzJobFactory creates a new DI scope and job instance for every fire. Cursors, leases, and results that must survive executions belong in reliable storage.",
        ],
        code: { language: "csharp", value: jobImplementation },
      },
      {
        id: sectionIds[3],
        title: zh ? "三种注册路径及其边界" : "Three registration paths and their boundaries",
        bullets: zh
          ? [
              "app.yaml 的 job.jobs：宿主在基础设施初始化时读取，适合宿主级固定任务",
              "plugin.yaml 根节点 jobs：PluginBase.StartAsync 在 OnStartAsync 之后自动读取；仅当插件目录存在文件且 IJobManager 已注册时生效",
              "IJobScheduler 动态注册：在 OnInitializeAsync 或更晚阶段使用稳定 JobKey；实际 TriggerOptions 是属性对象，没有 WithCronSchedule 扩展 API",
              "PluginJobConfig.Validate 当前为空；插件作业不获得 JobConfig 同等级的启动期字段验证，必须在 CI 与启动验收中自行覆盖",
            ]
          : [
              "job.jobs in app.yaml: loaded during host infrastructure initialization for fixed host-level work",
              "root jobs in plugin.yaml: PluginBase.StartAsync reads it after OnStartAsync, only when the plugin directory contains the file and IJobManager is registered",
              "dynamic IJobScheduler registration: use a stable JobKey in OnInitializeAsync or later; the real TriggerOptions is a property object and has no WithCronSchedule extension API",
              "PluginJobConfig.Validate is currently empty, so plugin jobs do not receive JobConfig-equivalent startup field validation; cover this in CI and startup acceptance",
            ],
        code: { language: "csharp", value: dynamicRegistration },
      },
      {
        id: sectionIds[4],
        title: zh ? "触发器语义：实际消费了什么" : "Trigger semantics: what is actually consumed",
        paragraphs: [
          zh
            ? "cron 直接交给 Quartz WithCronSchedule；simple 的 interval 由 XmlConvert.ToTimeSpan 解析，repeatCount=-1 表示无限。priority 被传入 Quartz；startNow 优先于 startTime，endTime 会限制最终触发时间。"
            : "Cron goes directly to Quartz WithCronSchedule. A simple interval is parsed by XmlConvert.ToTimeSpan, and repeatCount=-1 repeats forever. Priority is passed to Quartz; startNow takes precedence over startTime, and endTime limits the final fire time.",
          zh
            ? "TriggerOptions.MisfireInstruction 当前没有被 QuartzTriggerFactory 读取，因此 SmartPolicy、FireNowPolicy 等字符串不会改变构建出的 schedule。时区也没有独立配置，Cron 使用 Quartz/进程默认时区；跨时区部署必须用可重复的 UTC 计划做真实验收。"
            : "QuartzTriggerFactory currently does not read TriggerOptions.MisfireInstruction, so strings such as SmartPolicy or FireNowPolicy do not alter the built schedule. There is no separate time-zone setting either: Cron follows Quartz/process defaults. Validate a reproducible UTC schedule in every deployment region.",
        ],
      },
      {
        id: sectionIds[5],
        title: zh ? "运行时管理 API 需要读后确认" : "Runtime management APIs require read-after-confirmation",
        paragraphs: [
          zh
            ? "IJobScheduler 暴露 Schedule/Add/Delete、Pause/Resume、Trigger、存在性与状态查询，以及监听器注册。调度器启动前，部分写操作会放入内存 pending 字典并按 Group:Name 去重；只读操作会直接拒绝。"
            : "IJobScheduler exposes Schedule/Add/Delete, Pause/Resume, Trigger, existence/status queries, and listener registration. Before startup, some writes enter an in-memory pending dictionary deduplicated by Group:Name, while reads reject the call.",
          zh
            ? "当前多个封装方法调用 Quartz 后丢弃返回 Task，再立即返回 Task.CompletedTask；Schedule、Pause、Resume、Trigger 和 Shutdown 的 await 并不总能证明底层动作已经完成。控制面必须用 CheckJobExistsAsync/CheckTriggerExistsAsync、状态读取和日志轮询做读后确认，不要把一次 200 或 await 当作完成凭证。"
            : "Several current wrappers discard the Task returned by Quartz and immediately return Task.CompletedTask. Awaiting Schedule, Pause, Resume, Trigger, or Shutdown therefore does not always prove the underlying action completed. A control plane must poll CheckJobExistsAsync/CheckTriggerExistsAsync, status, and logs for read-after-confirmation rather than treating one 200 or await as completion evidence.",
        ],
      },
      {
        id: sectionIds[6],
        title: zh ? "每次触发的 DI Scope 与启动竞态" : "Per-fire DI scope and startup race",
        paragraphs: [
          zh
            ? "QuartzJobFactory 每次触发创建 IServiceScope，从该 scope 解析最长公共构造函数的参数，并在 Adapter Dispose 时释放。缺失依赖会以 null 传给构造函数，最终通常在反射构造时失败；所有 Job 依赖都应在启动测试中验证可解析。"
            : "QuartzJobFactory creates an IServiceScope per fire, resolves parameters for the longest public constructor from that scope, and releases it when the adapter is disposed. A missing dependency is passed as null and usually fails during reflected construction. Verify every job dependency is resolvable in a startup test.",
          zh
            ? "Yggdrasil 当前在 WebApplication 构建前启动调度器，构建后才 SetServiceProvider(app.Services)。因此 startNow=true 或启动瞬间到期的配置 Job 可能先用 EmptyServiceProvider 创建。对有 DI 依赖的生产作业保持 startNow=false，并在宿主完全就绪后人工触发验收；该竞态修复前不要承诺零窗口启动。"
            : "Yggdrasil currently starts the scheduler before building WebApplication and calls SetServiceProvider(app.Services) only afterward. A configured job with startNow=true, or one due during startup, can therefore be created through EmptyServiceProvider. Keep startNow=false for DI-dependent production jobs and perform a manual fire after the host is ready; do not promise a zero-window startup until this race is fixed.",
        ],
      },
      {
        id: sectionIds[7],
        title: zh ? "当前是 RAMJobStore，不是集群调度" : "The current store is RAMJobStore, not clustering",
        paragraphs: [
          zh
            ? "QuartzJobScheduler 固定设置 Quartz.Simpl.RAMJobStore。enableCluster、connectionString 与 dbProvider 没有进入 StdSchedulerFactory properties；maxBatchSize 和 jobFactoryType 也未被消费。进程重启会丢失纯运行时注册和 Quartz 触发状态，多副本会各自运行同一配置任务。"
            : "QuartzJobScheduler hard-codes Quartz.Simpl.RAMJobStore. enableCluster, connectionString, and dbProvider never enter StdSchedulerFactory properties; maxBatchSize and jobFactoryType are also unused. Process restart loses runtime-only registration and Quartz trigger state, while every replica runs the same configured job independently.",
          zh
            ? "需要全局唯一执行时，优先使用外部调度器，或在业务写入前取得带 fencing token 的分布式租约并让数据库唯一约束兜底。不要把 Redis 锁、数据库连接字段或 DisallowConcurrentExecution 描述成跨进程 exactly-once。"
            : "For globally unique execution, prefer an external scheduler or acquire a distributed lease with a fencing token before business writes, backed by a database unique constraint. Never describe a Redis lock, declared database fields, or DisallowConcurrentExecution as cross-process exactly-once delivery.",
        ],
      },
      {
        id: sectionIds[8],
        title: zh ? "失败结果不会触发 Quartz 自动重试" : "Failure results do not trigger Quartz automatic retry",
        paragraphs: [
          zh
            ? "AsgardJobAdapter 捕获 OperationCanceledException 和所有其他异常，构造 JobExecutionResult 并写进 Quartz context.Result，但不重新抛出。Quartz 看到的是正常完成，因此不会基于业务异常 refire；IJob 注释里“根据配置重试”的表述当前没有运行路径证明。"
            : "AsgardJobAdapter catches OperationCanceledException and every other exception, creates a JobExecutionResult, writes it to Quartz context.Result, and does not rethrow. Quartz observes normal completion and does not refire on the business exception. The IJob comment about retry according to configuration is not proven by the runtime path.",
          zh
            ? "context.Result 只是进程内本次执行结果，没有内置持久查询、告警、死信或补偿队列。作业必须把 attempt、幂等键、业务状态、最后错误和 next-attempt 持久化，并由独立恢复流程重放；日志只用于诊断，不是重试账本。"
            : "context.Result is only the in-process result of that fire; there is no built-in durable query, alert, dead letter, or compensation queue. Persist attempt, idempotency key, business state, last error, and next-attempt, then replay through a separate recovery flow. Logs are diagnostics, not a retry ledger.",
        ],
      },
      {
        id: sectionIds[9],
        title: zh ? "关闭与取消不能作为已完成保证" : "Shutdown and cancellation are not completion guarantees",
        paragraphs: [
          zh
            ? "IJobExecutionContext.CancelRequested 当前恒为 false，IJob.ExecuteAsync 也没有 CancellationToken。AsgardRuntimeHostedService 调用 ShutdownAsync(waitForJobsToComplete:true)，但 QuartzJobScheduler 内部丢弃 Quartz Shutdown 返回 Task 并立即完成。"
            : "IJobExecutionContext.CancelRequested currently always returns false, and IJob.ExecuteAsync has no CancellationToken. AsgardRuntimeHostedService calls ShutdownAsync(waitForJobsToComplete:true), but QuartzJobScheduler discards the Task returned by Quartz Shutdown and completes immediately.",
          zh
            ? "因此编排器终止宽限期不能证明在途作业已结束。业务步骤要短、可提交检查点、可重复；发布前要实测 SIGTERM/容器停止、处理中断和重启对账。若必须保证接受后执行，先把命令写入持久队列或 outbox，再由可恢复消费者处理。"
            : "An orchestrator termination grace period therefore does not prove in-flight work finished. Keep business steps short, checkpointable, and replay-safe; test SIGTERM/container stop, mid-flight interruption, and restart reconciliation. If accepted work must run, first persist the command to a durable queue or outbox and process it with a recoverable consumer.",
        ],
      },
      {
        id: sectionIds[10],
        title: zh ? "生产验收清单" : "Production acceptance checklist",
        bullets: zh
          ? [
              "用当前发布包启动，确认每个配置 JobKey 与 TriggerKey 实际存在；故意写错 jobType、cron 和 ISO duration，证明部署会失败或被监控发现",
              "手工触发同一业务键两次，证明数据库状态收敛且外部副作用不重复",
              "注入业务异常，证明持久失败账本、告警和人工/自动重放路径都可用，而不只看到日志",
              "启动两个副本，证明租约或外部调度让同一逻辑批次只有一个有效写者；杀死持有者后验证 fencing",
              "在执行中终止进程并立即重启，证明检查点与对账恢复；不要用 await ShutdownAsync 的返回值代替该测试",
              "对 cron 做跨 DST/时区验收，对 simple 做 repeatCount、start/end 和长执行重叠验收",
            ]
          : [
              "Boot the released package and prove every configured JobKey and TriggerKey exists; inject an invalid jobType, cron, and ISO duration so deployment failure or monitoring is observable",
              "Manually fire the same business key twice and prove database state converges without duplicating external side effects",
              "Inject a business exception and prove the durable failure ledger, alert, and manual/automatic replay path work—not merely that a log exists",
              "Start two replicas and prove a lease or external scheduler permits only one effective writer for a logical batch; kill the holder and verify fencing",
              "Terminate mid-execution and restart immediately, proving checkpoint and reconciliation recovery; do not substitute the return from await ShutdownAsync for this test",
              "Test cron across DST/time zones and simple triggers across repeatCount, start/end, and long-running overlap",
            ],
        code: { language: "text", value: acceptanceCommands },
      },
      {
        id: sectionIds[11],
        title: zh ? "源码核验入口" : "Source verification anchors",
        paragraphs: [
          zh
            ? "维护本页时同时加载 asgard-job-scheduling 与 asgard-dotnet-10-csharp-14，并优先 diff 下列文件。RAMJobStore、Quartz Task 等待、DI 设置时机、异常传播、取消或配置字段消费任一变化，都要同步两种语言和验收清单。"
            : "When maintaining this page, load asgard-job-scheduling plus asgard-dotnet-10-csharp-14 and diff the files below first. Any change to RAMJobStore, Quartz Task awaiting, DI timing, exception propagation, cancellation, or configuration consumption must update both locales and the acceptance checklist.",
        ],
        code: {
          language: "text",
          value: `Common/Asgard.Core/Job/JobConfig.cs
Common/Asgard.Abstractions/Job/JobSchedulerOptions.cs
Common/Asgard.Abstractions/Job/TriggerOptions.cs
Common/Asgard.Core/Job/QuartzJobScheduler.cs
Common/Asgard.Core/Job/QuartzJobScheduler.JobManagement.cs
Common/Asgard.Core/Job/QuartzTriggerFactory.cs
Common/Asgard.Core/Job/QuartzJobFactory.cs
Common/Asgard.Core/Job/AsgardJobAdapter.cs
Common/Asgard.Core/Job/AsgardJobExecutionContext.cs
Common/Asgard.Core/Plugin/PluginBase.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs
Host/Asgard.Yggdrasil.AspNetCore/AsgardRuntimeHostedService.cs`,
        },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "job-scheduling", label: zh ? "作业调度概览" : "Job scheduling overview" },
      { product: "asgard", docSlug: "tenant-background-work", label: zh ? "后台任务租户隔离" : "Tenant isolation in background work" },
      { product: "asgard", docSlug: "observability-operations", label: zh ? "可观测性运维" : "Observability operations" },
    ],
  };
}

export const zhAsgardJobOperationsDocs: DocPage[] = [makePage("zh")];
export const enAsgardJobOperationsDocs: DocPage[] = [makePage("en")];
