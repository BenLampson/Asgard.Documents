import type { DocPage } from "./content";

const loggingYaml = `logging:
  minimumLevel: Information
  console:
    enabled: true
    useColors: false
    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] {Message:lj}{NewLine}{Exception}"
  file:
    enabled: false
    path: "logs/app-.log"
    rollingInterval: Day
    retainedFileCountLimit: 7
    fileSizeLimitBytes: 104857600
  database:
    enabled: false`;

const acceptanceCommands = `# container/service mode: capture stdout and stderr through the platform collector
curl --fail --show-error "$BASE_URL/health/live"
curl --fail --show-error "$BASE_URL/api/diagnostics/log-probe?correlationId=$RELEASE_ID"

# file mode: run as the real service account, then verify creation and rollover directory
test -s logs/app-$(date +%Y%m%d).log
grep --fixed-strings "$RELEASE_ID" logs/app-*.log

# restart and rollback acceptance
# 1. stop gracefully; 2. confirm final marker; 3. start previous config/image;
# 4. confirm exactly one fresh marker reaches the chosen collector.`;

type Locale = "zh" | "en";

function createPage(locale: Locale): DocPage {
  const zh = locale === "zh";
  return {
    slug: "logging-operations",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: "SERILOG · PRODUCTION",
    title: zh ? "普通日志生产运维" : "Production application logging",
    description: zh
      ? "把 Asgard 5.1.3 的 Console/File Serilog 主路径接入生产采集，并验证权限、滚动、保留与失败边界。"
      : "Operate the Asgard 5.1.3 Console/File Serilog path with explicit collection, permissions, rollover, retention, and failure acceptance.",
    sections: [
      {
        id: "boundaries",
        title: zh ? "先分清三条观测链路" : "Separate the three observability paths",
        bullets: zh
          ? ["logging.console / logging.file：普通 Serilog 事件，本页范围", "logging.database：独立 FreeSql sink、异步队列和 asgard_logs，见 Trace/数据库日志 Runbook", "Trace.*：HTTP 链路与错误快照写入 asgard_trace，不由普通文件日志保留策略控制"]
          : ["logging.console / logging.file: ordinary Serilog events covered here", "logging.database: a separate FreeSql sink, asynchronous queue, and asgard_logs contract covered by the Trace/database-log runbook", "Trace.*: HTTP traces and error snapshots in asgard_trace, unaffected by ordinary file retention"],
        note: zh ? "三条链路可用 TraceId 关联，但启用其中一条不会自动启用、复制或保护另外两条。" : "A TraceId can correlate the paths, but enabling one neither enables, copies, nor protects the others.",
      },
      {
        id: "runtime-path",
        title: zh ? "标准宿主的真实注册路径" : "The standard host registration path",
        paragraphs: zh
          ? ["Yggdrasil 在引导阶段直接从主 app.yaml 创建 bootstrap logger；配置图建立后再次加载并 Validate LogConfig，服务注册阶段通过 AddAsgardSerilog(_logConfig) 提供 ILoggerFactory/ILogger<>。最低级别是全局阈值，没有命名空间 override 配置面。配置更改不会在源码主路径中动态重建 logger，按重启变更处理。"]
          : ["Yggdrasil creates a bootstrap logger directly from the main app.yaml, then reloads and validates LogConfig after building the configuration graph. Service registration calls AddAsgardSerilog(_logConfig) for ILoggerFactory/ILogger<>. MinimumLevel is one global threshold with no namespace-override surface. The primary path does not dynamically rebuild loggers after configuration edits; treat changes as restart-bound."],
      },
      {
        id: "defaults",
        title: zh ? "默认值会同时写 Console 与文件" : "Defaults write both Console and files",
        paragraphs: zh
          ? ["LogConfig 总是创建 Console、File、Database 子对象。默认 minimumLevel=Information、console.enabled=true、file.enabled=true、file.path=logs/log-.txt、Day 滚动、保留 7 个文件，database.enabled=false。省略 logging 并不代表只写标准输出；在容器或只读文件系统中应显式关闭 file，避免隐式本地状态和启动期目录权限风险。"]
          : ["LogConfig always creates Console, File, and Database child objects. Defaults are minimumLevel=Information, console.enabled=true, file.enabled=true, file.path=logs/log-.txt, Day rollover, seven retained files, and database.enabled=false. Omitting logging does not mean stdout-only. Explicitly disable file output in containers or read-only filesystems to avoid implicit local state and startup-time directory permission risk."],
        code: { language: "yaml", value: loggingYaml },
      },
      {
        id: "file-path",
        title: zh ? "路径、目录与服务账户" : "Path, directory, and service account",
        paragraphs: zh
          ? ["file.path 是相对当前工作目录解析的 Serilog 路径，不是相对 app.yaml 或 ContentRootPath 的显式 Asgard 合同。若路径已是目录，或 Path.GetFileName 为空，框架追加 log-.txt；父目录不存在时同步 Directory.CreateDirectory。目录创建失败会在 logger 构建阶段暴露。上线前必须用真实服务账户、工作目录和挂载方式做写入测试。"]
          : ["file.path follows the Serilog path relative to the process working directory; Asgard does not explicitly rebase it to app.yaml or ContentRootPath. If the path is an existing directory or Path.GetFileName is empty, the framework appends log-.txt. A missing parent is synchronously created with Directory.CreateDirectory, so permission failure surfaces while constructing a logger. Test the real service account, working directory, and mount before promotion."],
      },
      {
        id: "rolling-retention",
        title: zh ? "滚动、大小限制与保留不是归档系统" : "Rollover, size limits, and retention are not archival",
        paragraphs: zh
          ? ["Asgard 把 rollingInterval、retainedFileCountLimit 与 fileSizeLimitBytes 直接传给 Serilog File sink。null retainedFileCountLimit 表示不限制，容易耗尽磁盘；0 虽通过 Asgard 校验，但实际 sink 行为仍需目标版本验收。源码没有传 rollOnFileSizeLimit、shared、flushToDiskInterval 或生命周期钩子，因此不要承诺达到大小后一定滚出新文件、多进程安全共享或每条日志落盘。生产归档、压缩、上传和磁盘配额由外部采集平台负责。"]
          : ["Asgard passes rollingInterval, retainedFileCountLimit, and fileSizeLimitBytes directly to the Serilog File sink. A null retention limit is unbounded and can exhaust disk; zero passes Asgard validation but still requires target-version sink acceptance. Source does not pass rollOnFileSizeLimit, shared, flushToDiskInterval, or lifecycle hooks. Do not promise size rollover, safe multi-process sharing, or per-event durable flush. External collection owns archival, compression, upload, and disk quotas."],
      },
      {
        id: "format-structure",
        title: zh ? "文本模板不是结构化传输合同" : "A text template is not a structured transport contract",
        paragraphs: zh
          ? ["Console 与 File 都使用 outputTemplate 文本渲染；默认模板没有 {Properties}，也没有 JSON formatter 配置面。结构化 ILogger 参数仍可参与消息渲染，但不能据此承诺采集端会收到完整机器可查询属性。需要 JSON/OTLP 或固定字段 schema 时，应在外部采集层或经评审的自定义日志集成实现，并做端到端字段验收。"]
          : ["Console and File both render an outputTemplate. The default has no {Properties}, and there is no JSON formatter option. Structured ILogger arguments can participate in message rendering, but this does not guarantee that collectors receive a complete machine-queryable property set. JSON, OTLP, or a fixed field schema requires an externally collected or reviewed custom integration plus end-to-end field acceptance."],
      },
      {
        id: "colors",
        title: zh ? "useColors 在 5.1.3 不产生行为差异" : "useColors has no behavioral effect in 5.1.3",
        paragraphs: zh
          ? ["ConfigureConsoleSink 的 true/false 分支都调用同一个 WriteTo.Console(outputTemplate)，没有传不同 theme 或 formatter。不要文档化“关闭颜色即可保证无 ANSI”；把 useColors 当已声明但当前未接线字段，并以采集到的原始字节验收。"]
          : ["Both branches of ConfigureConsoleSink call the same WriteTo.Console(outputTemplate), with no distinct theme or formatter. Do not claim that disabling colors guarantees ANSI-free output. Treat useColors as declared but currently unwired and accept the raw bytes captured by the real collector."],
      },
      {
        id: "security",
        title: zh ? "日志不是秘密存储" : "Logs are not secret storage",
        bullets: zh
          ? ["不要记录 Authorization、Cookie、Access/Refresh Token、密码、连接字符串、密钥或完整用户输入", "普通 Console/File 主路径没有全局脱敏器；Trace 快照脱敏不自动覆盖业务 ILogger 调用", "异常对象可能包含 SQL、路径或第三方响应；在进入 logger 前裁剪敏感上下文", "文件目录权限、采集端权限、传输加密、保留和删除必须独立设计"]
          : ["Never log Authorization, Cookie, access/refresh tokens, passwords, connection strings, keys, or complete user input", "The ordinary Console/File path has no global redactor; Trace snapshot redaction does not cover business ILogger calls", "Exceptions may contain SQL, paths, or third-party responses; trim sensitive context before logging", "Design file permissions, collector authorization, transport encryption, retention, and deletion independently"],
      },
      {
        id: "multi-replica",
        title: zh ? "多副本优先 stdout" : "Prefer stdout for multiple replicas",
        paragraphs: zh
          ? ["多个实例写各自本地文件会产生分散时间线；多个进程共享同一路径也不是 Asgard 保证的安全模式。容器/编排环境优先 console → 平台 collector，并添加平台侧 instance/pod/release 元数据。若必须文件采集，每实例使用独立目录并由 sidecar/agent 采集，监控磁盘使用、文件句柄、采集 lag 与丢弃。"]
          : ["Per-instance local files fragment the timeline, while multiple processes sharing one path is not an Asgard-guaranteed safe mode. In orchestrated environments prefer console → platform collector and attach instance/pod/release metadata in the platform. If file collection is required, use a per-instance directory and sidecar/agent, monitoring disk, handles, collection lag, and drops."],
      },
      {
        id: "failure-diagnostics",
        title: zh ? "失败诊断" : "Failure diagnostics",
        bullets: zh
          ? ["启动早期无日志：bootstrap logger 也依赖主 app.yaml 的合法 logging 配置和可写文件目录", "平台看不到日志：确认 console.enabled、最低级别、stdout/stderr collector 与实际 outputTemplate", "文件不存在：确认进程工作目录、路径被自动补成 log-.txt、目录权限和服务账户", "日志突然停止或磁盘暴涨：核对 fileSizeLimitBytes、retention null/0、sink 真实行为与 collector lag", "字段无法检索：默认是文本模板，不是 JSON；检查实际行而不是假定结构化属性已输出", "颜色/控制字符污染：useColors 当前未接线，以原始采集结果决定 formatter 或外部清洗"]
          : ["No early startup logs: the bootstrap logger also needs valid logging config in the main app.yaml and a writable file directory", "Collector sees nothing: inspect console.enabled, minimum level, stdout/stderr capture, and the actual outputTemplate", "File absent: inspect process working directory, automatic log-.txt suffix, permissions, and service account", "Logging stops or disk grows: inspect fileSizeLimitBytes, null/zero retention, actual sink behavior, and collector lag", "Fields are not queryable: the default is a text template, not JSON; inspect emitted lines instead of assuming properties are present", "ANSI/control bytes pollute collection: useColors is unwired; choose a formatter or external cleanup from raw evidence"],
      },
      {
        id: "release-rollback",
        title: zh ? "发布、重启与回滚" : "Release, restart, and rollback",
        bullets: zh
          ? ["候选环境以真实服务账户启动，确认 bootstrap、运行期和停止标记全部进入目标 collector", "压测到滚动/保留边界，监控磁盘、写入延迟、CPU 与丢日志告警", "配置变更按重启发布；不要假设修改 YAML 会热更新现有 logger", "保留上一镜像与 logging 配置；回滚二者并验证没有双写、重复 provider 或旧文件权限问题", "变更 outputTemplate 前先兼容采集解析器；回滚时同步恢复 parser/schema"]
          : ["Start the candidate as the real service account and prove bootstrap, runtime, and shutdown markers reach the target collector", "Load through rollover/retention boundaries while monitoring disk, write latency, CPU, and drop alarms", "Deploy configuration changes with a restart; do not assume YAML edits hot-reload existing loggers", "Retain the previous image and logging config; roll both back and verify no double-write, duplicate provider, or stale file-permission problem", "Keep collector parsers compatible before changing outputTemplate; restore parser/schema with rollback"],
      },
      {
        id: "acceptance",
        title: zh ? "真实进程与采集端验收" : "Real-process and collector acceptance",
        bullets: zh
          ? ["用唯一 release/correlation marker 覆盖 Debug 以下过滤、Information、Warning、Error+Exception", "重启前后确认 marker 次数，排除 bootstrap/runtime provider 重复写入", "验证文件创建、日期滚动、大小边界、保留清理和磁盘告警；不要只看进程健康", "从最终采集端搜索 marker、时间戳、级别、异常多行和实例元数据", "发送含测试秘密的受控请求，确认业务代码与异常路径没有把秘密写入任何 sink", "优雅停止和强制终止分别验收可接受的尾部丢失边界" ]
          : ["Use a unique release/correlation marker across filtered Debug, Information, Warning, and Error+Exception events", "Count markers across restart to reject duplicate bootstrap/runtime provider writes", "Verify file creation, date rollover, size boundary, retention cleanup, and disk alerts—not just process health", "Search the final collector for marker, timestamp, level, multiline exception, and instance metadata", "Send a controlled request containing a test secret and prove no business or exception path writes it to any sink", "Accept tail-loss boundaries separately for graceful stop and forced termination"],
        code: { language: "bash", value: acceptanceCommands },
      },
      {
        id: "ai-ready-sources",
        title: zh ? "AI Ready 与源码证据" : "AI Ready and source evidence",
        paragraphs: zh
          ? ["Agent 维护本页先加载 asgard-tracing-observability、asgard-configuration 与 asgard-host-project；同时核对 LogConfig/FileSinkOptions/ConsoleSinkOptions、SerilogConfigurator、Yggdrasil bootstrap 与 AddAsgardSerilog 主路径。不要从 option 注释或 Serilog 默认值发明 JSON、颜色、热更新、持久 flush、多进程共享或零丢失保证。"]
          : ["Agents maintaining this page must load asgard-tracing-observability, asgard-configuration, and asgard-host-project, then inspect LogConfig/FileSinkOptions/ConsoleSinkOptions, SerilogConfigurator, Yggdrasil bootstrap, and the AddAsgardSerilog primary path. Never invent JSON, color, hot reload, durable flush, multi-process sharing, or zero-loss guarantees from option comments or Serilog defaults."],
      },
    ],
  };
}

export const zhAsgardLoggingOperationsDocs: DocPage[] = [createPage("zh")];
export const enAsgardLoggingOperationsDocs: DocPage[] = [createPage("en")];
