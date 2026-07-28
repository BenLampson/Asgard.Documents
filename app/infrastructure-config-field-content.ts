import type { DocPage, Locale } from "./content";
import {
  infrastructureConfigFieldBaseline,
  infrastructureConfigFields,
  type InfrastructureConfigField,
  type InfrastructureConfigModule,
  type InfrastructureFieldNote,
  type InfrastructureRuntimeStatus,
} from "./infrastructure-config-field-data";

const statusLabels: Record<InfrastructureRuntimeStatus, Record<Locale, string>> = {
  wired: { zh: "wired：主宿主路径存在运行时 consumer", en: "wired: consumed by the primary host path" },
  "partially-wired": { zh: "partially wired：只实现了字段语义的一部分", en: "partially wired: only part of the field contract is implemented" },
  "standalone-only": { zh: "standalone only：仅孤立 helper/显式扩展消费，未接入 Yggdrasil 主路径", en: "standalone only: consumed by an isolated helper/explicit extension, not the Yggdrasil path" },
  "validation-only": { zh: "validation only：会校验，但没有运行时行为", en: "validation only: validated without runtime behavior" },
  "declared-unwired": { zh: "declared/unwired：已声明，当前运行时未消费", en: "declared/unwired: declared but not consumed at runtime" },
};

const noteLabels: Record<InfrastructureFieldNote, Record<Locale, string>> = {
  "module-gate": { zh: "模块开关只控制对应管理器/存储初始化；子字段仍可能无条件校验。", en: "The module gate controls manager/store initialization; child fields may still validate unconditionally." },
  secret: { zh: "敏感：必须通过秘密注入，不得进入仓库、日志、搜索索引或 AI 上下文。", en: "Sensitive: inject as a secret; never place it in source, logs, search indexes, or AI context." },
  provider: { zh: "provider 在后续解析；配置校验通过不保证底层驱动已可用。", en: "The provider resolves later; passing configuration validation does not prove the backing driver is usable." },
  "l1-two-seconds": { zh: "Redis 开启时 L1 TTL 固定为 2 秒，不使用该 memory 默认值。", en: "When Redis is enabled, L1 TTL is fixed at two seconds and does not use this memory default." },
  "redis-retry-unwired": { zh: "当前没有 Redis 连接重试循环或对应客户端映射。", en: "No Redis connection retry loop or client mapping currently consumes this field." },
  "redis-fallback-not-fallback": { zh: "true 只映射 abortConnect=false；启动期连接/健康读失败仍会抛错，不是真正 memory fallback。", en: "true only maps abortConnect=false; startup connect/health failures still throw, so this is not a real memory fallback." },
  "memory-size-unit-mismatch": { zh: "注释称字节，但运行时 entry size 用序列化字符数/1024 估算；不要把它当严格字节合同。", en: "The comment says bytes, but entry size is estimated as serialized characters/1024; do not treat it as a strict byte contract." },
  "scan-zero-keeps-default": { zh: "0 或负数不会禁用扫描，只是不覆盖 Microsoft 默认值。", en: "Zero or a negative value does not disable scanning; it merely leaves the Microsoft default unchanged." },
  "rabbit-retry-unwired": { zh: "连接创建没有读取它们执行重试；自动恢复是另一个 RabbitMQ client 选项。", en: "Connection creation does not use these fields for retries; automatic recovery is a separate RabbitMQ client option." },
  "dlq-target-not-created": { zh: "只给主队列写 DLX/routing key 参数；框架不声明或绑定目标 DLQ。", en: "Only DLX/routing-key arguments are written on the main queue; the framework does not declare or bind the target DLQ." },
  "messaging-extension-only": { zh: "类型/helper 存在不等于已提供端到端消息能力；Yggdrasil 主路径未注册它。", en: "A type/helper does not equal an end-to-end feature; the Yggdrasil path does not register it." },
  "messaging-validation-always": { zh: "messaging 禁用时 tracing/retry/delayedMessage 仍会 Validate。", en: "tracing/retry/delayedMessage still validate when messaging is disabled." },
  "job-ram-only": { zh: "Quartz 当前固定 RAMJobStore；cluster、connectionString 与 dbProvider 不会启用持久化或集群。", en: "Quartz is fixed to RAMJobStore; cluster, connectionString, and dbProvider do not enable persistence or clustering." },
  "job-data-unwired": { zh: "字典不会复制到 Quartz JobDataMap；不要依赖它传参，并避免把秘密放进此字段。", en: "The dictionary is not copied into Quartz JobDataMap. Do not rely on it for arguments, and avoid placing secrets there." },
  "job-misfire-unwired": { zh: "QuartzTriggerFactory 当前不读取该值，不能承诺 misfire 策略。", en: "QuartzTriggerFactory does not read this value, so no misfire policy can be promised." },
  "logging-no-global-switch": { zh: "LogConfig 不存在 logging.enabled；console/file 默认启用，必须分别关闭。", en: "LogConfig has no logging.enabled; console and file default to enabled and must be disabled separately." },
  "console-colors-no-effect": { zh: "true/false 分支当前配置完全相同，字段名义上被读取但没有可观察差异。", en: "The true/false branches currently configure the same sink, so the read field has no observable effect." },
  "database-template-unwired": { zh: "数据库 sink 直接保存 RenderMessage/template/exception/properties JSON，不读取此模板。", en: "The database sink stores RenderMessage/template/exception/properties JSON directly and does not read this template." },
  "independent-store": { zh: "数据库日志使用独立 FreeSql、自动同步表结构，不复用业务 IFreeSql。", en: "Database logging uses an independent FreeSql instance and syncs its schema; it does not reuse the business IFreeSql." },
  "trace-errors-only-detail": { zh: "CaptureAllRequest 可扩大轻量持久化，但 headers/body/identity 仍只在异常或 HTTP >=500 时保存；4xx 不算错误。", en: "CaptureAllRequest expands lightweight persistence, while headers/body/identity remain limited to exceptions or HTTP >=500; 4xx is not treated as an error." },
  "trace-sensitive-capture": { zh: "高敏采集面：QueryString 原样保存；非 JSON、截断或解析失败的 body 可能未经脱敏即 Base64 入库。", en: "High-sensitivity capture: QueryString is stored verbatim; non-JSON, truncated, or unparseable bodies may be Base64-stored without masking." },
};

const moduleTitles: Record<InfrastructureConfigModule, Record<Locale, string>> = {
  database: { zh: "database · 业务数据库", en: "database · business data" },
  caching: { zh: "caching · Memory / Redis", en: "caching · memory / Redis" },
  messaging: { zh: "messaging · RabbitMQ 与声明能力", en: "messaging · RabbitMQ and declared capabilities" },
  job: { zh: "job · Quartz 调度", en: "job · Quartz scheduling" },
  logging: { zh: "logging · Console / File / Database", en: "logging · console / file / database" },
  trace: { zh: "Trace · 请求追踪持久化", en: "Trace · request-trace persistence" },
};

const fieldBlock = (item: InfrastructureConfigField, locale: Locale) => {
  const zh = locale === "zh";
  return [
    item.path,
    `  ${zh ? "类型/默认" : "type/default"}: ${item.type} / ${item.defaultValue}`,
    `  ${zh ? "校验" : "validation"}: ${item.validation}`,
    `  ${zh ? "运行期" : "runtime"}: ${statusLabels[item.status][locale]}`,
    `  ${zh ? "敏感" : "sensitive"}: ${item.sensitive ? "true · REDACT" : "false"}`,
    `  ${zh ? "源码" : "source"}: ${item.sourceMember}`,
    item.note ? `  ${zh ? "边界" : "boundary"}: ${noteLabels[item.note][locale]}` : undefined,
  ].filter(Boolean).join("\n");
};

const moduleCode = (module: InfrastructureConfigModule, locale: Locale) =>
  infrastructureConfigFields.filter((item) => item.module === module).map((item) => fieldBlock(item, locale)).join("\n\n");

const safeYaml = `database:
  enabled: true
  provider: PostgreSQL
  connectionString: "\${env:ASGARD_DATABASE_CONNECTION_STRING}"

caching:
  enabled: true
  memory:
    enabled: true
  redis:
    enabled: true
    connectionString: "\${env:ASGARD_REDIS_CONNECTION_STRING}"
    password: "\${env:ASGARD_REDIS_PASSWORD}"

messaging:
  enabled: true
  rabbitmq:
    hostName: rabbitmq.internal
    userName: "\${env:ASGARD_RABBITMQ_USERNAME}"
    password: "\${env:ASGARD_RABBITMQ_PASSWORD}"
    autoDeclare: true

job:
  enabled: true
  scheduler:
    threadPoolSize: 10
    instanceId: AUTO
  jobs: []

logging:
  minimumLevel: Information
  console:
    enabled: true
  file:
    enabled: false
  database:
    enabled: false

Trace:
  Enabled: false
  MaxBodyBytes: 65536`;

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";
  return {
    slug: "infrastructure-configuration-fields",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: `ASGARD ${infrastructureConfigFieldBaseline.frameworkVersion} · SOURCE CONTRACT`,
    title: zh ? "基础设施配置字段合同" : "Infrastructure configuration field contract",
    description: zh
      ? "数据库、缓存、消息、作业、日志与 Trace 的默认值、校验、敏感性和真实运行时接线状态。"
      : "Defaults, validation, sensitivity, and actual runtime wiring for database, cache, messaging, jobs, logging, and Trace.",
    sections: [
      {
        id: "scope",
        title: zh ? "这不是配置类抄写" : "This is not a configuration-class dump",
        paragraphs: [
          zh
            ? "本页把声明、Validate 与运行时 consumer 分开审计。字段出现在 Options 中，不代表 Yggdrasil 已经把它接进主路径；部分字段只有孤立 helper，部分只是校验，部分完全未消费。"
            : "This page audits declarations, Validate behavior, and runtime consumers separately. Presence in an Options type does not mean Yggdrasil wires the field into its primary path: some fields have only isolated helpers, some are validation-only, and some are entirely unconsumed.",
          `${infrastructureConfigFieldBaseline.inspectedOn} · Asgard ${infrastructureConfigFieldBaseline.frameworkVersion} · ${infrastructureConfigFieldBaseline.sourceCommit}`,
          zh
            ? "配置合并优先级仍是基础 app.yaml → app.{Environment}.yaml → 环境变量 → 命令行。嵌套环境变量使用双下划线，例如 Trace__Enabled、logging__database__enabled。"
            : "Merged precedence remains base app.yaml → app.{Environment}.yaml → environment variables → command line. Use double underscores for nested environment keys, for example Trace__Enabled and logging__database__enabled.",
        ],
        note: zh
          ? "字段路径绑定不区分大小写，但文档保留源码规范写法 Trace.*。logging.enabled 不存在，写入后会被忽略。"
          : "Path binding is case-insensitive, but this reference preserves the canonical source spelling Trace.*. logging.enabled does not exist and is ignored.",
      },
      ...(["database", "caching", "messaging", "job", "logging", "trace"] as InfrastructureConfigModule[]).map((module) => ({
        id: module,
        title: moduleTitles[module][locale],
        paragraphs: module === "messaging"
          ? [noteLabels["messaging-validation-always"][locale]]
          : module === "logging"
            ? [noteLabels["logging-no-global-switch"][locale]]
            : module === "trace"
              ? [zh ? "Trace persistence 与 database logging 都创建独立 FreeSql 和后台无界队列；框架只注册查询服务，不自带 Controller 或授权边界。" : "Trace persistence and database logging each create an independent FreeSql instance and an unbounded background queue. The framework registers query services but no controller or authorization boundary."]
              : undefined,
        code: { language: "text", value: moduleCode(module, locale) },
      })),
      {
        id: "safe-example",
        title: zh ? "最小安全组合示例" : "Minimal safe composition",
        paragraphs: [zh ? "示例只放秘密占位符，且没有假装启用未接线功能。上线前按真实依赖删掉不用的模块，不要把 localhost/guest 默认值带进生产。" : "The example uses secret placeholders and does not pretend to enable unwired features. Remove unused modules and never carry localhost/guest defaults into production."],
        code: { language: "yaml", value: safeYaml },
      },
      {
        id: "ai-ready",
        title: zh ? "AI Ready 变更工作流" : "AI Ready change workflow",
        bullets: zh
          ? [
              "Agent 先加载目标模块 Skill，再读 Options、Validate、宿主注册和最终 consumer；Skill 与源码冲突时以源码为准。",
              "任何新增字段都要记录 default、presence、Validate、敏感性、runtime status 和 source member，而不是只补 YAML 示例。",
              "从 declared-unwired 变为 wired，或 consumer 被移除时，必须同步本页、模块运行手册、docs-sources.json、版本说明和双语测试。",
              "生产验收必须验证真实外部依赖故障：Redis/RabbitMQ 不可达、数据库凭据错误、Quartz 注册失败、日志/Trace 存储写入失败。",
              "给 AI 的 Trace/日志必须再次脱敏；Base64 不是加密，query string、异常、notes/tags 与结构化日志属性都可能泄密。",
            ]
          : [
              "Load the target module Skill, then inspect Options, Validate, host registration, and the final consumer. Source wins when a Skill drifts.",
              "For every new field, record default, presence, Validate behavior, sensitivity, runtime status, and source member—not only a YAML example.",
              "When declared-unwired becomes wired, or a consumer disappears, update this page, the module runbook, docs-sources.json, release notes, and bilingual tests together.",
              "Production acceptance must exercise real dependency failures: unreachable Redis/RabbitMQ, invalid database credentials, Quartz registration failure, and logging/Trace-store write failure.",
              "Redact logs and Trace again before AI use. Base64 is not encryption; query strings, exceptions, notes/tags, and structured logging properties can leak secrets.",
            ],
      },
      {
        id: "acceptance",
        title: zh ? "发布验收清单" : "Release acceptance checklist",
        bullets: zh
          ? [
              "确认每个 enabled 模块都有相应基础设施、秘密与网络策略；不依赖开发默认值。",
              "逐项搜索 validation-only、declared/unwired、partially wired 和 standalone only；不得把它们写成完整能力。",
              "确认 logging.console/file 的显式状态；不存在 logging.enabled 总开关。",
              "确认 Quartz 仍是 RAMJobStore，RabbitMQ DLQ 由运维显式创建，Redis fallback 不被当成容灾。",
              "对 Trace/logging 数据库建立授权、保留、清理、脱敏和查询审计；不要直接公开查询服务。",
            ]
          : [
              "Give every enabled module its infrastructure, secrets, and network policy; do not rely on development defaults.",
              "Review every validation-only, declared/unwired, partially wired, and standalone-only field; never describe it as a complete capability.",
              "Set logging.console/file explicitly; no logging.enabled master switch exists.",
              "Remember that Quartz remains RAMJobStore, operations must create RabbitMQ DLQs, and Redis fallback is not failover.",
              "Put authorization, retention, cleanup, redaction, and query audit around Trace/logging databases; do not expose query services directly.",
            ],
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "configuration-fields", label: zh ? "核心配置字段合同" : "Core configuration field contract" },
      { product: "asgard", docSlug: "database-operations", label: zh ? "数据库运行手册" : "Database operations" },
      { product: "asgard", docSlug: "cache-operations", label: zh ? "缓存运行手册" : "Cache operations" },
      { product: "asgard", docSlug: "messaging-operations", label: zh ? "消息运行手册" : "Messaging operations" },
      { product: "asgard", docSlug: "job-operations", label: zh ? "作业运行手册" : "Job operations" },
      { product: "asgard", docSlug: "observability-operations", label: zh ? "可观测性运行手册" : "Observability operations" },
    ],
  };
};

export const zhInfrastructureConfigFieldDocs: DocPage[] = [makePage("zh")];
export const enInfrastructureConfigFieldDocs: DocPage[] = [makePage("en")];
