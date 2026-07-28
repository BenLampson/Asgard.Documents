import type { DocPage } from "./content";

type Locale = "zh" | "en";

const observabilityYaml = `Trace:
  Enabled: true
  CaptureAllRequest: false
  Provider: MySQL
  ConnectionString: "\${env:ASGARD_TRACE_DATABASE}"
  TableName: asgard_trace
  BatchSize: 100
  Period: 2
  RetentionDays: 7
  CleanupIntervalMinutes: 60
  MaxBodyBytes: 65536
  CaptureHeaders: true
  CaptureBody: true
  CaptureIdentity: true

logging:
  minimumLevel: Information
  database:
    enabled: true
    provider: MySQL
    connectionString: "\${env:ASGARD_LOG_DATABASE}"
    tableName: asgard_logs
    batchSize: 100
    period: 2
    retentionDays: 30
    cleanupIntervalMinutes: 60`;

const traceAnnotationCode = `public sealed class CheckoutService(AbsAsgardContext asgardContext)
{
    public async Task<CheckoutDto> CheckoutAsync(
        CheckoutInput input,
        CancellationToken cancellationToken)
    {
        asgardContext.Trace?.AddTag("OrderId", input.OrderId);
        asgardContext.Trace?.AddBranch("Payment", "AuthorizeBeforeCapture");
        asgardContext.Trace?.AddNote(
            "Inventory was reserved before payment authorization.");

        // Never add passwords, tokens, cookies, secrets, or full objects.
        return await ExecuteCheckoutAsync(input, cancellationToken);
    }
}`;

const structuredCorrelationCode = `var traceId = asgardContext.Trace?.TraceId;

logger.LogWarning(
    "Checkout compensation started for {OrderId}; TraceId={TraceId}",
    orderId,
    traceId);`;

const pluginQueryControllerCode = `[Route("api/observability")]
[AsgardAuthAnyPermission("observability.trace.read")]
public sealed class ObservabilityController(
    AbsAsgardContext asgardContext,
    ITraceQueryService traceQueryService)
    : BaseController(asgardContext)
{
    [HttpGet("traces")]
    [ProducesResponseType(
        typeof(PageResponse<TraceSummaryVo>),
        StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<TraceSummaryVo>>> QueryTracesAsync(
        [FromQuery] TraceQueryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await traceQueryService.QueryAsync(
            request,
            cancellationToken);
        var items = result.Items
            .Select(static item => new TraceSummaryVo(
                item.TraceId,
                item.Timestamp,
                item.Method,
                item.Path,
                item.StatusCode,
                item.DurationMs,
                item.TraceResult))
            .ToArray();

        return SuccessPage(
            items,
            result.TotalCount,
            result.Page,
            result.Size);
    }
}`;

const incidentReplayChecklist = `1. Freeze the incident window, deployment version, tenant, and machine.
2. Query asgard_trace for Error / 5xx candidates; select the exact TraceId.
3. Read the privileged trace detail and the matching AsgardTrace summary message.
4. Search asgard_logs by structured TraceId when present, or by message/time/machine.
5. Review and redact again before decoding request_body_base64.
6. Convert the snapshot into a local test fixture; replace identity and secrets.
7. Reproduce against an isolated database, never by replaying directly to production.
8. Add a regression test and retain only the minimum sanitized evidence.`;

const sourceAnchors = `Common/Asgard.Abstractions/Tracing/TraceOptions.cs
Common/Asgard.Abstractions/Tracing/IAsgardTraceContext.cs
Common/Asgard.Abstractions/Tracing/AsgardTraceParameterFormatter.cs
Common/Asgard.Abstractions/Observability/ITraceQueryService.cs
Common/Asgard.Abstractions/Observability/IDatabaseLogQueryService.cs
Common/Asgard.Core/Tracing/FreeSqlTraceStore.cs
Common/Asgard.Core/Tracing/TraceWorker.cs
Common/Asgard.Core/Tracing/FreeSqlTraceBatchWriter.cs
Common/Asgard.Core/Observability/TraceQueryService.cs
Common/Asgard.Core/Observability/DatabaseLogQueryService.cs
Common/Asgard.AspNetCore.Core/Tracing/AsgardRequestTraceMiddleware.cs
Common/Asgard.AspNetCore.Core/Tracing/AsgardTraceQueueItemFactory.cs
Common/Asgard.AspNetCore.Core/Tracing/AsgardTraceActionFilter.cs
Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.Trace.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Configurator.cs`;

function buildObservabilityOperationsPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "observability-operations",
    group: zh ? "可观测性" : "Observability",
    eyebrow: "TRACE OPERATIONS",
    title: zh ? "Trace、数据库日志与 AI 事件复现" : "Trace, database logs, and AI incident replay",
    description: zh
      ? "在 Asgard 5.1.3 中安全启用、查询和运维请求 Trace 与数据库日志，并把脱敏现场转成可验证的 AI 调试输入。"
      : "Safely enable, query, and operate request traces and database logs in Asgard 5.1.3, then turn sanitized evidence into verifiable AI debugging inputs.",
    sections: [
      {
        id: "operating-model",
        title: zh ? "先建立正确的运维模型" : "Start with the operating model",
        paragraphs: zh
          ? [
              "Yggdrasil 总是把 UseAsgardRequestTracing 放在静态文件之后、路由之前。每个进入它的 HTTP 请求都会创建 AsyncLocal 请求会话，结束时输出一条 AsgardTrace 汇总日志；Trace.Enabled 只控制独立数据库持久化，不会关闭内存会话或汇总日志。",
              "它是轻量诊断链路，不是全量审计、OpenTelemetry 替代品或 CLR 调用跟踪器。框架自动覆盖 MVC Action 与使用仓储基类追踪包装器的仓储入口；私有方法、自调用、第三方库内部和自定义数据访问不会自动出现。",
            ]
          : [
              "Yggdrasil always places UseAsgardRequestTracing after static files and before routing. Every HTTP request that reaches it gets an AsyncLocal request session and one AsgardTrace summary log at completion. Trace.Enabled controls only the independent database store; it does not disable the in-memory session or summary log.",
              "This is a lightweight diagnostic trail, not a full audit system, an OpenTelemetry replacement, or a CLR call tracer. The framework automatically covers MVC actions and repository entries that use the base repository tracing wrappers. Private methods, self-calls, third-party internals, and custom data access do not appear automatically.",
            ],
        bullets: zh
          ? [
              "静态文件会在 Trace 之前短路，因此完全不可见",
              "未处理异常或 HTTP 5xx 记为 Error；4xx 默认仍是非错误结果",
              "CaptureAllRequest=false 时，401、403、404 和其他非 5xx 不落 asgard_trace",
              "TraceId 默认取 HttpContext.TraceIdentifier，不要假设它等于 Activity.TraceId 或每条数据库日志的 TraceId 字段",
            ]
          : [
              "Static files short-circuit before Trace and are therefore invisible",
              "An unhandled exception or HTTP 5xx is classified as Error; a 4xx is not an error by default",
              "With CaptureAllRequest=false, 401, 403, 404, and other non-5xx responses are not stored in asgard_trace",
              "TraceId comes from HttpContext.TraceIdentifier by default; do not assume it equals Activity.TraceId or the TraceId column of every database log",
            ],
      },
      {
        id: "lifecycle",
        title: zh ? "请求、汇总与持久化生命周期" : "Request, summary, and persistence lifecycle",
        bullets: zh
          ? [
              "中间件创建会话并在需要采集请求体时启用可回读缓冲",
              "MVC 全局 Action Filter 记录参数摘要、耗时、结果类型与异常",
              "AbsAsgardRepositoryBase 的包装器记录 Repository 步骤；自定义仓储必须显式使用这些受保护包装器才有步骤",
              "业务代码只能追加 note、tag 与 branch，不能改写框架步骤",
              "finally 阶段补齐状态码、端点、耗时与异常，然后按规则构造队列项",
              "请求线程只 TryWrite 到内存 Channel；后台单消费者按 BatchSize 或 Period 批量写库",
              "无论是否落库，正常/4xx 写 Information 汇总，异常/5xx 写 Warning 汇总",
            ]
          : [
              "The middleware creates a session and enables request buffering when body capture may be needed",
              "The global MVC action filter records parameter summaries, duration, result type, and failures",
              "AbsAsgardRepositoryBase wrappers record Repository steps; custom repositories get a step only when they explicitly use those protected wrappers",
              "Application code may append notes, tags, and branches but cannot mutate framework steps",
              "The finally path completes status, endpoint, duration, and exception data, then creates a queue item when policy allows",
              "The request thread only TryWrites to an in-memory Channel; one background consumer batches by BatchSize or Period",
              "A summary is emitted even without persistence: Information for normal/4xx responses and Warning for exceptions/5xx",
            ],
      },
      {
        id: "configuration",
        title: zh ? "生产配置与两套独立存储" : "Production configuration and two independent stores",
        paragraphs: zh
          ? [
              "Trace 与 logging.database 使用各自的 Provider、ConnectionString、TableName、FreeSql 实例、队列、保留策略和查询连接。它们可以指向同一数据库，但不是业务 IFreeSql，也不会复用业务租户过滤器。启动时两者都会通过 CodeFirst 同步自己的表结构。",
              "Trace.Enabled=true 时 Provider、ConnectionString、TableName 必填；所有批量、周期、保留和清理数值即使关闭持久化也必须通过校验。连接字符串只通过 secret 系统注入，不进入仓库、文档、日志或 Agent 提示词。",
            ]
          : [
              "Trace and logging.database each own their Provider, ConnectionString, TableName, FreeSql instance, queue, retention policy, and query connection. They may target the same database, but neither is the business IFreeSql and neither inherits business tenant filters. Both run CodeFirst synchronization for their own table at startup.",
              "When Trace.Enabled=true, Provider, ConnectionString, and TableName are required. Batch, period, retention, and cleanup numbers must validate even when persistence is disabled. Inject connection strings only through a secret system; never place them in the repository, documentation, logs, or agent prompts.",
            ],
        code: { language: "yaml", value: observabilityYaml },
        note: zh
          ? "CaptureAllRequest=true 会显著增加容量与隐私风险；先用默认 false，只保存异常/5xx。"
          : "CaptureAllRequest=true materially increases capacity and privacy risk. Start with false so only exceptions/5xx are stored.",
      },
      {
        id: "annotations",
        title: zh ? "Notes、Tags 与 Branches" : "Notes, tags, and branches",
        paragraphs: zh
          ? [
              "通过 scoped AbsAsgardContext 访问 Trace，并始终使用可空调用。默认 Web 请求中通常存在 accessor，但后台任务或未接入 HTTP Trace 的宿主没有活动会话；此时追加调用不会产生记录。只记录稳定标识、业务决策和测试前置条件。",
              "这些用户输入不会经过请求快照脱敏器。AddTag、AddNote、AddBranch 的值会进入汇总日志，并在落库时原样进入 JSON，因此调用方必须在写入前完成数据最小化和脱敏。",
            ]
          : [
              "Access Trace through the scoped AbsAsgardContext and keep the null-safe call. The accessor normally exists in a standard web request, but a background job or host without active HTTP tracing has no request session; append calls then produce no record. Record only stable identifiers, business decisions, and test preconditions.",
              "These application-supplied values do not pass through the request snapshot sanitizer. AddTag, AddNote, and AddBranch values enter the summary log and their persisted JSON unchanged, so callers must minimize and redact data before writing it.",
            ],
        code: { language: "csharp", value: traceAnnotationCode },
      },
      {
        id: "capture-and-redaction",
        title: zh ? "采集边界与脱敏事实" : "Capture boundaries and redaction facts",
        bullets: zh
          ? [
              "请求快照只在 Trace 已启用且请求被判定为异常/5xx 时采集；正常请求即使 CaptureAllRequest=true 也不采集 headers、body 或 identity",
              "headers 按名称掩码 Authorization、Cookie、password、token、secret、key 等；未命中的自定义敏感头不会自动掩码",
              "只有 content type 含 json 的 body 才按 JSON 属性名递归掩码；非 JSON、解析失败或被截断成无效 JSON 的内容按原字节 Base64 保存",
              "query_string、exception_message、exception_stack、notes、tags、branches 不经过快照脱敏器",
              "identity snapshot 仅含 TenantId、UserId、Sub、ClientId、UserType、TokenType，不包含令牌本身",
              "MaxBodyBytes 限制读取/保存字节，但当前 DTO 没有 truncated 标志；RequestBodyLength 与解码长度只能作为线索，不能证明完整性",
              "参数格式化会按参数名隐藏 password/pwd/secret/token/authorization/cookie/key/credential；复杂对象只摘要类型与部分标识字段，但业务仍不得传入秘密",
            ]
          : [
              "A request snapshot is captured only when Trace is enabled and the request is an exception/5xx. A normal request does not capture headers, body, or identity even when CaptureAllRequest=true",
              "Headers are masked by names such as Authorization, Cookie, password, token, secret, and key. A custom sensitive header that does not match the rules remains visible",
              "Only a body whose content type contains json receives recursive JSON-property masking. Non-JSON, parse failures, and truncation that leaves invalid JSON are stored as Base64 of the raw captured bytes",
              "query_string, exception_message, exception_stack, notes, tags, and branches do not pass through the snapshot sanitizer",
              "The identity snapshot contains only TenantId, UserId, Sub, ClientId, UserType, and TokenType; it is not a token",
              "MaxBodyBytes limits captured bytes, but the current DTO has no truncated flag. RequestBodyLength versus decoded length is only a clue, not proof of completeness",
              "Parameter formatting masks password/pwd/secret/token/authorization/cookie/key/credential by parameter name and summarizes complex objects, but applications must still avoid passing secrets",
            ],
        note: zh
          ? "把敏感值放进 URL 查询参数尤其危险：当前 Trace 会原样保存 QueryString。"
          : "Putting sensitive values in URL query parameters is especially dangerous: the current Trace stores QueryString unchanged.",
      },
      {
        id: "storage-retention",
        title: zh ? "队列、保留与容量规划" : "Queueing, retention, and capacity planning",
        paragraphs: zh
          ? [
              "Trace 和数据库日志都使用进程内无界 Channel。它减少请求线程的即时阻塞，却没有容量上限、磁盘缓冲或生产者背压；数据库持续变慢时内存可以持续增长。BatchSize 与 Period 是吞吐/延迟旋钮，不是容量保护。",
              "清理只在一次非空批量写入成功之后、且清理间隔到期时执行。没有新写入时，过期记录不会按时主动删除。Trace 默认保留 7 天，数据库日志默认 30 天；应根据峰值 RPS、平均行大小、错误率、CaptureAllRequest、索引和副本数量做容量预算，并用数据库级监控验证。",
            ]
          : [
              "Trace and database logs both use an in-process unbounded Channel. This reduces immediate blocking on request threads, but supplies no capacity bound, disk spool, or producer backpressure; memory can keep growing while the database remains slow. BatchSize and Period tune throughput and latency, not capacity safety.",
              "Cleanup runs only after a non-empty batch has been inserted successfully and the cleanup interval is due. With no new writes, expired rows are not proactively removed on schedule. Trace defaults to 7 days and database logs to 30 days. Budget capacity from peak RPS, average row size, error rate, CaptureAllRequest, indexes, and replica count, then verify it with database monitoring.",
            ],
      },
      {
        id: "query-surfaces",
        title: zh ? "只读查询能力，不是自动管理 API" : "Read-only query services, not an automatic management API",
        paragraphs: zh
          ? [
              "标准 Yggdrasil 宿主注册 ITraceQueryService 与 IDatabaseLogQueryService，但框架不提供 Controller、路由、授权、字段裁剪或审计页面。Trace 查询支持 TraceId 精确值、路径关键字、Method、TraceResult、StatusCode、时间和 MachineName；详情按 TraceId 取最新记录。数据库日志支持 Level、消息关键字、TraceId、时间和 MachineName；详情按记录 ID。",
              "页码小于 1 归一为 1；size 小于 1 回退 20，最大 200。两个服务都是 singleton，并在首次查询时创建供查询实现使用的独立 FreeSql 连接；对应存储关闭时调用会抛 InvalidOperationException，而不是返回空列表。数据库账户是否只读仍由部署方控制。",
              "AsgardTrace 汇总消息内嵌请求 TraceId，但 asgard_logs.TraceId 来自结构化 TraceId 属性或 Activity.Current。框架当前没有证明二者自动相等。需要可靠关联时，在业务日志中显式写入当前 Asgard TraceId，并在预生产检查落库字段。",
            ]
          : [
              "The standard Yggdrasil host registers ITraceQueryService and IDatabaseLogQueryService, but the framework supplies no controller, route, authorization policy, field projection, or operations UI. Trace queries support exact TraceId, path keyword, Method, TraceResult, StatusCode, time, and MachineName; detail returns the newest row for a TraceId. Database-log queries support Level, message keyword, TraceId, time, and MachineName; detail is by record ID.",
              "A page below 1 normalizes to 1; a size below 1 falls back to 20 and the maximum is 200. Both services are singletons and lazily create a separate FreeSql connection used by the query implementation. Calling a service while its corresponding store is disabled throws InvalidOperationException rather than returning an empty result. Deployment still controls whether that database account is read-only.",
              "The AsgardTrace summary message embeds the request TraceId, while asgard_logs.TraceId comes from a structured TraceId property or Activity.Current. Current code does not prove those values are automatically equal. For reliable correlation, emit the current Asgard TraceId as a structured log property and verify the persisted field before production.",
            ],
        code: { language: "csharp", value: structuredCorrelationCode },
      },
      {
        id: "plugin-query-api",
        title: zh ? "插件拥有查询 API 的安全边界" : "The plugin owns the query API security boundary",
        paragraphs: zh
          ? [
              "在插件中创建 /api/... Controller，继承 BaseController，应用后端权限，并把查询 DTO 映射成最小 VO 后返回 PageResponse 或 Response。列表接口不要返回 request body、headers、identity、exception stack 或 PropertiesJson；详情接口应使用更高权限、租户/平台边界、访问审计和显式字段白名单。",
              "IDatabaseLogQueryService 的模式相同。不要把框架 DTO 直接当公网 VO，也不要假设 Trace 本身已经按租户隔离：查询服务没有自动租户过滤，平台级数据访问必须由插件定义。",
            ]
          : [
              "Create a plugin-owned /api/... controller, inherit BaseController, enforce backend permission, map query DTOs into minimal VOs, and return PageResponse or Response. A list endpoint must not expose request bodies, headers, identity, exception stacks, or PropertiesJson. Put detail behind a stronger permission, tenant/platform boundary, access audit, and an explicit field allowlist.",
              "Use the same pattern for IDatabaseLogQueryService. Do not expose framework DTOs directly as public VOs, and do not assume Trace is tenant-isolated: the query services apply no automatic tenant filter, so the plugin must define platform data access.",
            ],
        code: { language: "csharp", value: pluginQueryControllerCode },
      },
      {
        id: "failure-modes",
        title: zh ? "失败模式、背压与告警" : "Failure modes, backpressure, and alerting",
        bullets: zh
          ? [
              "连接或表同步失败会在启用存储的宿主启动阶段失败；把这类失败当作部署阻断",
              "批量插入没有重试、退避、断路器或持久化 spool；批次在写入前从内存列表清除，写失败可能丢失该批",
              "后台 worker 捕获写入异常、写入 Serilog SelfLog 后退出；剩余 Channel 不会由新的 worker 自动接管",
              "通道无界，数据库卡顿可能造成内存增长；当前没有队列深度、丢弃数或 worker 存活指标",
              "关闭时最多等待 worker 15 秒；超时只写 SelfLog，不能承诺尾批完整落库",
              "清理失败也只写 SelfLog，但当前批量写入已成功，后续 ingestion 可继续",
              "启用并采集 Serilog SelfLog，另外监控最后写入时间、表增长、进程内存、查询延迟和数据库错误；定期注入可识别的合成错误验证全链路",
            ]
          : [
              "Connection or table-synchronization failure fails host startup when a store is enabled; treat this as a deployment blocker",
              "Batch insertion has no retry, backoff, circuit breaker, or durable spool. The in-memory batch is cleared before writing, so a failed write can lose that batch",
              "The background worker catches a write failure, writes it to Serilog SelfLog, and exits; no replacement worker automatically takes over the remaining Channel",
              "The Channel is unbounded, so a stalled database can grow process memory. There is no current queue-depth, discard-count, or worker-liveness metric",
              "Shutdown waits at most 15 seconds for the worker. Timeout is only reported to SelfLog, so tail-batch durability is not guaranteed",
              "Cleanup failure is also reported only to SelfLog, but the current insertion has already succeeded and later ingestion can continue",
              "Enable and collect Serilog SelfLog, then monitor last-write time, table growth, process memory, query latency, and database errors. Regularly inject an identifiable synthetic failure to verify the entire path",
            ],
        note: zh
          ? "不要把“请求线程异步入队”描述成可靠投递；5.1.3 的实现是 best-effort 进程内遥测。"
          : "Do not describe asynchronous enqueueing as reliable delivery. In 5.1.3 it is best-effort, in-process telemetry.",
      },
      {
        id: "ai-incident-replay",
        title: zh ? "把事件现场转成 AI 可复现测试" : "Turn incident evidence into an AI-reproducible test",
        paragraphs: zh
          ? [
              "AI Ready 的价值是把最小、已审查的证据转成测试，而不是把生产数据库或原始请求快照交给模型。先固定版本、时间窗、MachineName 与租户，再从 Trace 列表缩小候选；详情、汇总日志和数据库日志共同解释入口、分支、仓储步骤与异常。",
              "request_body_base64 可能被截断、可能是非 JSON 原文，也不包含被掩码的认证信息。解码前再次执行人工/自动脱敏，把身份换成测试主体，把外部调用换成 fake，把数据库状态重建成最小 fixture。查询参数、堆栈、备注和标签尤其要复查。",
            ]
          : [
              "AI Ready means turning the smallest reviewed evidence into a test, not giving a model the production database or raw request snapshots. First freeze the version, time window, MachineName, and tenant, then narrow candidates in the trace list. Detail, summary logs, and database logs together explain the entry, branches, repository steps, and failure.",
              "request_body_base64 may be truncated, may contain raw non-JSON bytes, and does not restore masked authentication material. Redact it again before decoding, replace identity with a test principal, replace external calls with fakes, and reconstruct the minimum database fixture. Review query parameters, stacks, notes, and tags with particular care.",
            ],
        code: { language: "text", value: incidentReplayChecklist },
      },
      {
        id: "production-verification",
        title: zh ? "上线与持续验证清单" : "Production and continuous verification checklist",
        bullets: zh
          ? [
              "在预生产启动宿主，确认 asgard_trace 与 asgard_logs 由期望账户创建/升级，且业务数据库未被复用",
              "发送正常 200：出现一条汇总日志；CaptureAllRequest=false 时不产生 Trace 行",
              "发送可控 500：Trace 行出现，状态、路径、MachineName、步骤与异常正确",
              "用包含 Authorization、Cookie、嵌套 JSON password/token 的请求验证掩码；再验证 query string 与非 JSON body 的风险被部署策略阻断",
              "确认正常请求即使 CaptureAllRequest=true 也没有 body/header/identity snapshot",
              "用查询服务测试过滤、页码归一化、200 上限、详情不存在与存储关闭时异常",
              "用低权限账户证明列表只返回最小 VO、详情拒绝访问、跨租户读取被阻断；用高权限账户审计详情访问",
              "暂停数据库写入，观察 SelfLog、worker 停止与内存增长告警；恢复后确认没有虚假的可靠补发承诺",
              "等待超过保留期并触发一次成功写入，验证清理；没有新流量的系统另配数据库调度清理",
              "滚动关闭实例，验证 15 秒内尾批行为，并记录可接受的数据丢失预算",
            ]
          : [
              "Start the host in staging; confirm asgard_trace and asgard_logs are created/upgraded by the intended account and do not reuse the business database context",
              "Send a normal 200: one summary log appears, and with CaptureAllRequest=false no Trace row is created",
              "Send a controlled 500: a Trace row appears with the correct status, path, MachineName, steps, and exception",
              "Verify masking with Authorization, Cookie, and nested JSON password/token fields; separately prove deployment policy blocks sensitive query strings and non-JSON bodies",
              "Confirm a normal request has no body/header/identity snapshot even when CaptureAllRequest=true",
              "Exercise query filters, page normalization, the size cap of 200, missing detail, and disabled-store exceptions",
              "With a low-privilege account, prove list projection is minimal, detail is denied, and cross-tenant reads are blocked; audit detail access with a privileged account",
              "Pause database writes and observe SelfLog, worker-stopped, and memory-growth alerts. After recovery, do not claim reliable catch-up that the implementation does not provide",
              "Wait beyond retention and trigger a successful write to verify cleanup. Use a database-scheduled cleanup for systems that may have no new traffic",
              "Roll an instance down, verify tail-batch behavior within 15 seconds, and record the accepted telemetry-loss budget",
            ],
      },
      {
        id: "source-anchors",
        title: zh ? "Asgard 5.1.3 源码锚点" : "Asgard 5.1.3 source anchors",
        paragraphs: zh
          ? [
              "本页依据 clean Asgard 源码核对。修改配置、队列、脱敏、查询 DTO、中间件顺序或宿主注册后，必须同时复查本运行手册与双语内容。",
            ]
          : [
              "This page was checked against the clean Asgard source. Any change to configuration, queueing, redaction, query DTOs, middleware order, or host registration requires a review of this runbook in both locales.",
            ],
        code: { language: "text", value: sourceAnchors },
      },
    ],
  };
}

export const zhAsgardObservabilityOperationsDocs: DocPage[] = [
  buildObservabilityOperationsPage("zh"),
];

export const enAsgardObservabilityOperationsDocs: DocPage[] = [
  buildObservabilityOperationsPage("en"),
];
