export type InfrastructureConfigModule =
  | "database"
  | "caching"
  | "messaging"
  | "job"
  | "logging"
  | "trace";

export type InfrastructureRuntimeStatus =
  | "wired"
  | "partially-wired"
  | "standalone-only"
  | "validation-only"
  | "declared-unwired";

export type InfrastructureFieldNote =
  | "module-gate"
  | "secret"
  | "provider"
  | "l1-two-seconds"
  | "redis-retry-unwired"
  | "redis-fallback-not-fallback"
  | "memory-size-unit-mismatch"
  | "scan-zero-keeps-default"
  | "rabbit-retry-unwired"
  | "dlq-target-not-created"
  | "messaging-extension-only"
  | "messaging-validation-always"
  | "job-ram-only"
  | "job-data-unwired"
  | "job-misfire-unwired"
  | "logging-no-global-switch"
  | "console-colors-no-effect"
  | "database-template-unwired"
  | "independent-store"
  | "trace-errors-only-detail"
  | "trace-sensitive-capture";

export type InfrastructureConfigField = {
  module: InfrastructureConfigModule;
  path: string;
  type: string;
  defaultValue: string;
  validation: string;
  status: InfrastructureRuntimeStatus;
  sourceMember: string;
  sensitive?: boolean;
  note?: InfrastructureFieldNote;
};

const field = (
  module: InfrastructureConfigModule,
  path: string,
  type: string,
  defaultValue: string,
  validation: string,
  status: InfrastructureRuntimeStatus,
  sourceMember: string,
  options: Pick<InfrastructureConfigField, "sensitive" | "note"> = {},
): InfrastructureConfigField => ({ module, path, type, defaultValue, validation, status, sourceMember, ...options });

const propertyName = (path: string) => {
  const name = path.split(".").at(-1) ?? path;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
};

export const infrastructureConfigFieldBaseline = {
  frameworkVersion: "5.1.3",
  sourceCommit: "d1002d1af5478e74669a3f0128ed9d4e43465dc2",
  inspectedOn: "2026-07-28",
} as const;

export const infrastructureConfigFields: InfrastructureConfigField[] = [
  field("database", "database.enabled", "bool", "false", "—", "wired", "DatabaseConfig.Enabled", { note: "module-gate" }),
  field("database", "database.provider", "string", "MySQL", "nonempty when enabled; provider resolved later", "wired", "DatabaseConfig.Provider / FreeSqlDataTypeResolver.GetDataType", { note: "provider" }),
  field("database", "database.connectionString", "string", '""', "nonempty when enabled", "wired", "DatabaseConfig.ConnectionString / AddDatabase", { sensitive: true, note: "secret" }),

  field("caching", "caching.enabled", "bool", "false", "at least one provider when true", "wired", "CacheConfig.Enabled", { note: "module-gate" }),
  field("caching", "caching.memory.enabled", "bool", "false", "participates in provider check", "wired", "MemoryCacheOptions.Enabled"),
  field("caching", "caching.memory.defaultExpirationMinutes", "int", "5", "> 0 when memory enabled", "wired", "MemoryCacheOptions.DefaultExpirationMinutes / ResolveMemoryCacheExpiration", { note: "l1-two-seconds" }),
  field("caching", "caching.memory.sizeLimit", "long?", "null", "> 0 when set and memory enabled", "wired", "MemoryCacheOptions.SizeLimit / CreateMemoryCache", { note: "memory-size-unit-mismatch" }),
  field("caching", "caching.memory.compactOnMemoryPressure", "double", "0.9", "0 < value <= 1 when memory enabled", "wired", "MemoryCacheOptions.CompactOnMemoryPressure / CreateMemoryCache"),
  field("caching", "caching.memory.expirationScanFrequencyMinutes", "int", "1", "no Validate rule", "partially-wired", "MemoryCacheOptions.ExpirationScanFrequencyMinutes / CreateMemoryCache", { note: "scan-zero-keeps-default" }),
  field("caching", "caching.redis.enabled", "bool", "false", "participates in provider check", "wired", "RedisCacheOptions.Enabled"),
  field("caching", "caching.redis.connectionString", "string", "localhost:6379", "nonblank when redis enabled", "wired", "RedisCacheOptions.ConnectionString / BuildRedisConfiguration", { sensitive: true, note: "secret" }),
  field("caching", "caching.redis.instanceName", "string", "Asgard:", "—", "wired", "RedisCacheOptions.InstanceName / CreateRedisCacheOptions"),
  field("caching", "caching.redis.defaultExpirationMinutes", "int", "30", "> 0 when redis enabled", "wired", "RedisCacheOptions.DefaultExpirationMinutes / GetRedisCacheDefaultExpiration"),
  field("caching", "caching.redis.connectTimeout", "int ms", "5000", "> 0 when redis enabled", "wired", "RedisCacheOptions.ConnectTimeout / BuildRedisConfiguration"),
  field("caching", "caching.redis.syncTimeout", "int ms", "5000", "> 0 when redis enabled", "wired", "RedisCacheOptions.SyncTimeout / BuildRedisConfiguration"),
  field("caching", "caching.redis.asyncTimeout", "int ms", "5000", "> 0 when redis enabled", "wired", "RedisCacheOptions.AsyncTimeout / BuildRedisConfiguration"),
  field("caching", "caching.redis.allowAdmin", "bool", "false", "—", "wired", "RedisCacheOptions.AllowAdmin / BuildRedisConfiguration"),
  field("caching", "caching.redis.ssl", "bool", "false", "—", "wired", "RedisCacheOptions.Ssl / BuildRedisConfiguration"),
  field("caching", "caching.redis.password", "string?", "null", "—", "wired", "RedisCacheOptions.Password / BuildRedisConfiguration", { sensitive: true, note: "secret" }),
  field("caching", "caching.redis.database", "int", "0", "0..15 when redis enabled", "wired", "RedisCacheOptions.Database / BuildRedisConfiguration"),
  field("caching", "caching.redis.retryCount", "int", "3", ">= 0 when redis enabled", "validation-only", "RedisCacheOptions.RetryCount / Validate", { note: "redis-retry-unwired" }),
  field("caching", "caching.redis.retryIntervalMilliseconds", "int ms", "1000", "> 0 when redis enabled", "validation-only", "RedisCacheOptions.RetryIntervalMilliseconds / Validate", { note: "redis-retry-unwired" }),
  field("caching", "caching.redis.fallbackToMemoryCache", "bool", "true", "—", "partially-wired", "RedisCacheOptions.FallbackToMemoryCache / BuildRedisConfiguration", { note: "redis-fallback-not-fallback" }),

  field("messaging", "messaging.enabled", "bool", "false", "—", "wired", "MQConfig.Enabled", { note: "module-gate" }),
  field("messaging", "messaging.enableDeadLetterQueue", "bool", "true", "—", "partially-wired", "MQConfig.EnableDeadLetterQueue / RabbitMQMessageQueue", { note: "dlq-target-not-created" }),
  field("messaging", "messaging.deadLetterQueueSuffix", "string", ".dlq", "—", "partially-wired", "MQConfig.DeadLetterQueueSuffix / RabbitMQMessageQueue", { note: "dlq-target-not-created" }),
  field("messaging", "messaging.rabbitmq.enabled", "bool", "true", "must be true when messaging enabled", "wired", "RabbitMQOptions.Enabled"),
  field("messaging", "messaging.rabbitmq.hostName", "string", "localhost", "nonblank when messaging enabled", "wired", "RabbitMQOptions.HostName / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.port", "int", "5672", "1..65535", "wired", "RabbitMQOptions.Port / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.userName", "string", "guest", "nonblank when messaging enabled", "wired", "RabbitMQOptions.UserName / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.password", "string", "guest", "—", "wired", "RabbitMQOptions.Password / RabbitMQConfigurator", { sensitive: true, note: "secret" }),
  field("messaging", "messaging.rabbitmq.virtualHost", "string", "/", "—", "wired", "RabbitMQOptions.VirtualHost / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.exchangeName", "string", "asgard.exchange", "—", "wired", "RabbitMQOptions.ExchangeName / RabbitMQMessageQueue"),
  field("messaging", "messaging.rabbitmq.exchangeType", "string", "topic", "broker validates", "wired", "RabbitMQOptions.ExchangeType / RabbitMQMessageQueue"),
  field("messaging", "messaging.rabbitmq.queuePrefix", "string", "asgard.", "—", "wired", "RabbitMQOptions.QueuePrefix / RabbitMQMessageQueue"),
  field("messaging", "messaging.rabbitmq.automaticRecovery", "bool", "true", "—", "wired", "RabbitMQOptions.AutomaticRecovery / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.requestedHeartbeat", "int s", "60", "0 or >= 10", "wired", "RabbitMQOptions.RequestedHeartbeat / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.prefetchCount", "ushort", "10", "—", "wired", "RabbitMQOptions.PrefetchCount / SubscribeAsync"),
  field("messaging", "messaging.rabbitmq.requestedConnectionTimeout", "int ms", "5000", "> 0", "wired", "RabbitMQOptions.RequestedConnectionTimeout / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.retryCount", "int", "3", ">= 0", "validation-only", "RabbitMQOptions.RetryCount / Validate", { note: "rabbit-retry-unwired" }),
  field("messaging", "messaging.rabbitmq.retryIntervalMilliseconds", "int ms", "1000", "> 0", "validation-only", "RabbitMQOptions.RetryIntervalMilliseconds / Validate", { note: "rabbit-retry-unwired" }),
  field("messaging", "messaging.rabbitmq.ssl", "bool", "false", "—", "wired", "RabbitMQOptions.Ssl / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.sslServerName", "string?", "null -> hostName", "—", "wired", "RabbitMQOptions.SslServerName / RabbitMQConfigurator"),
  field("messaging", "messaging.rabbitmq.persistentMessages", "bool", "true", "—", "wired", "RabbitMQOptions.PersistentMessages / PublishAsync"),
  field("messaging", "messaging.rabbitmq.durableQueues", "bool", "true", "—", "wired", "RabbitMQOptions.DurableQueues / RabbitMQMessageQueue"),
  field("messaging", "messaging.rabbitmq.autoDeclare", "bool", "true", "—", "wired", "RabbitMQOptions.AutoDeclare / RabbitMQMessageQueue"),
  ...[
    ["messaging.tracing.enabled", "bool", "false", "—"],
    ["messaging.tracing.storeType", "enum", "Memory", "—"],
    ["messaging.tracing.sampleRate", "double", "1", "0..1"],
    ["messaging.tracing.retentionDays", "int days", "7", "> 0"],
    ["messaging.tracing.includePayload", "bool", "false", "—"],
    ["messaging.tracing.maxPayloadSize", "int", "1024", "> 0"],
    ["messaging.tracing.serviceName", "string?", "null", "—"],
    ["messaging.tracing.includeErrorStack", "bool", "true", "—"],
    ["messaging.tracing.maxMemoryRecords", "int", "10000", "> 0"],
    ["messaging.tracing.enablePropagation", "bool", "true", "—"],
  ].map(([path, type, defaultValue, validation]) => field("messaging", path, type, defaultValue, validation, "standalone-only", `TracingOptions.${propertyName(path)}`, { note: "messaging-extension-only" })),
  ...[
    ["messaging.retry.policyType", "enum", "ExponentialBackoff", "enum binding"],
    ["messaging.retry.maxRetryCount", "int", "3", ">= 0"],
    ["messaging.retry.initialDelayMilliseconds", "int ms", "1000", "> 0"],
    ["messaging.retry.maxDelayMilliseconds", "int ms", "60000", "> 0"],
    ["messaging.retry.multiplier", "double", "2", "> 1"],
    ["messaging.retry.jitter", "bool", "true", "—"],
    ["messaging.retry.jitterRange", "double", "0.1", "0..1"],
    ["messaging.retry.customIntervals", "int[]?", "null", "every item > 0"],
    ["messaging.retry.skipNonRetriableExceptions", "bool", "true", "—"],
    ["messaging.retry.nonRetriableExceptionTypes", "string[]?", "null", "—"],
  ].map(([path, type, defaultValue, validation]) => field("messaging", path, type, defaultValue, validation, path.endsWith("skipNonRetriableExceptions") || path.endsWith("nonRetriableExceptionTypes") ? "declared-unwired" : "standalone-only", `RetryOptions.${propertyName(path)}`, { note: "messaging-extension-only" })),
  ...[
    ["messaging.delayedMessage.enabled", "bool", "false", "—"],
    ["messaging.delayedMessage.mode", "enum", "TTL", "enum binding"],
    ["messaging.delayedMessage.maxDelayMilliseconds", "int ms", "86400000", "> 0"],
    ["messaging.delayedMessage.delayedExchangePrefix", "string", "delayed.", "nonempty"],
    ["messaging.delayedMessage.delayedQueuePrefix", "string", "delayed.", "nonempty"],
    ["messaging.delayedMessage.delayLevels", "int[]?", "null", "every item > 0"],
    ["messaging.delayedMessage.maxMemoryQueueSize", "int", "10000", "> 0"],
    ["messaging.delayedMessage.pollingIntervalMilliseconds", "int ms", "100", "> 0"],
  ].map(([path, type, defaultValue, validation]) => field("messaging", path, type, defaultValue, validation, "standalone-only", `DelayedMessageOptions.${propertyName(path)}`, { note: "messaging-extension-only" })),

  field("job", "job.enabled", "bool", "false", "—", "wired", "JobConfig.Enabled", { note: "module-gate" }),
  field("job", "job.scheduler.threadPoolSize", "int", "10", "no range validation", "wired", "JobSchedulerOptions.ThreadPoolSize / QuartzJobScheduler"),
  field("job", "job.scheduler.maxBatchSize", "int", "100", "—", "declared-unwired", "JobSchedulerOptions.MaxBatchSize"),
  field("job", "job.scheduler.enableCluster", "bool", "false", "—", "declared-unwired", "JobSchedulerOptions.EnableCluster", { note: "job-ram-only" }),
  field("job", "job.scheduler.instanceId", "string", "AUTO", "—", "wired", "JobSchedulerOptions.InstanceId / QuartzJobScheduler"),
  field("job", "job.scheduler.jobFactoryType", "string?", "null", "—", "declared-unwired", "JobSchedulerOptions.JobFactoryType"),
  field("job", "job.scheduler.connectionString", "string?", "null", "—", "declared-unwired", "JobSchedulerOptions.ConnectionString", { sensitive: true, note: "job-ram-only" }),
  field("job", "job.scheduler.dbProvider", "string?", "null", "—", "declared-unwired", "JobSchedulerOptions.DbProvider", { note: "job-ram-only" }),
  field("job", "job.jobs[].name", "string", '""', "nonblank when job enabled", "wired", "JobDefinitionOptions.Name / QuartzJobRegistrar"),
  field("job", "job.jobs[].group", "string", "DEFAULT", "—", "wired", "JobDefinitionOptions.Group / QuartzJobRegistrar"),
  field("job", "job.jobs[].jobType", "string", '""', "nonblank when job enabled", "wired", "JobDefinitionOptions.JobType / QuartzJobRegistrar"),
  field("job", "job.jobs[].description", "string?", "null", "—", "wired", "JobDefinitionOptions.Description / QuartzJobRegistrar"),
  field("job", "job.jobs[].data", "Dictionary", "{}", "—", "declared-unwired", "JobDefinitionOptions.Data", { sensitive: true, note: "job-data-unwired" }),
  field("job", "job.jobs[].triggers", "list", "[]", "at least one per configured job", "wired", "JobDefinitionOptions.Triggers / Validate"),
  field("job", "job.jobs[].triggers[].type", "string", "simple", "cron or simple", "wired", "TriggerOptions.Type / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].cron", "string?", "null", "nonblank for cron; syntax parsed later", "wired", "TriggerOptions.Cron / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].interval", "string?", "null", "nonblank for simple; XML duration parsed later", "wired", "TriggerOptions.Interval / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].repeatCount", "int", "-1", "—", "wired", "TriggerOptions.RepeatCount / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].description", "string?", "null", "—", "wired", "TriggerOptions.Description / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].priority", "int", "5", "—", "wired", "TriggerOptions.Priority / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].startNow", "bool", "false", "—", "wired", "TriggerOptions.StartNow / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].startTime", "string?", "null", "DateTimeOffset parsed later", "wired", "TriggerOptions.StartTime / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].endTime", "string?", "null", "DateTimeOffset parsed later", "wired", "TriggerOptions.EndTime / QuartzTriggerFactory"),
  field("job", "job.jobs[].triggers[].misfireInstruction", "string", "SmartPolicy", "—", "declared-unwired", "TriggerOptions.MisfireInstruction", { note: "job-misfire-unwired" }),

  field("logging", "logging.minimumLevel", "enum", "Information", "Verbose..Fatal", "wired", "LogConfig.MinimumLevel / SerilogConfigurator"),
  field("logging", "logging.console.enabled", "bool", "true", "—", "wired", "ConsoleSinkOptions.Enabled / ConfigureConsoleSink", { note: "logging-no-global-switch" }),
  field("logging", "logging.console.outputTemplate", "string", "Serilog default template", "—", "wired", "ConsoleSinkOptions.OutputTemplate / ConfigureConsoleSink"),
  field("logging", "logging.console.useColors", "bool", "true", "—", "partially-wired", "ConsoleSinkOptions.UseColors / ConfigureConsoleSink", { note: "console-colors-no-effect" }),
  field("logging", "logging.file.enabled", "bool", "true", "—", "wired", "FileSinkOptions.Enabled / ConfigureFileSink", { note: "logging-no-global-switch" }),
  field("logging", "logging.file.path", "string", "logs/log-.txt", "nonblank when enabled", "wired", "FileSinkOptions.Path / ConfigureFileSink"),
  field("logging", "logging.file.rollingInterval", "enum", "Day", "Infinite..Minute", "wired", "FileSinkOptions.RollingInterval / ConfigureFileSink"),
  field("logging", "logging.file.retainedFileCountLimit", "int?", "7", ">= 0 when set", "wired", "FileSinkOptions.RetainedFileCountLimit / ConfigureFileSink"),
  field("logging", "logging.file.outputTemplate", "string", "Serilog default template", "—", "wired", "FileSinkOptions.OutputTemplate / ConfigureFileSink"),
  field("logging", "logging.file.fileSizeLimitBytes", "long?", "null", "> 0 when set", "wired", "FileSinkOptions.FileSizeLimitBytes / ConfigureFileSink"),
  field("logging", "logging.database.enabled", "bool", "false", "—", "wired", "DatabaseSinkOptions.Enabled / ConfigureDatabaseSink", { note: "independent-store" }),
  field("logging", "logging.database.provider", "string", "MySQL", "nonblank when enabled", "wired", "DatabaseSinkOptions.Provider / FreeSqlDataTypeResolver", { note: "provider" }),
  field("logging", "logging.database.connectionString", "string", '""', "nonblank when enabled", "wired", "DatabaseSinkOptions.ConnectionString / FreeSqlDatabaseLogSink", { sensitive: true, note: "secret" }),
  field("logging", "logging.database.tableName", "string", "asgard_logs", "no identifier validation", "wired", "DatabaseSinkOptions.TableName / FreeSqlDatabaseLogSink"),
  field("logging", "logging.database.batchSize", "int", "100", ">= 1 even when disabled", "wired", "DatabaseSinkOptions.BatchSize / FreeSqlDatabaseLogSink"),
  field("logging", "logging.database.period", "int s", "2", ">= 1 even when disabled", "wired", "DatabaseSinkOptions.Period / FreeSqlDatabaseLogSink"),
  field("logging", "logging.database.retentionDays", "int days", "30", ">= 1 even when disabled", "wired", "DatabaseSinkOptions.RetentionDays / FreeSqlDatabaseLogBatchWriter"),
  field("logging", "logging.database.cleanupIntervalMinutes", "int min", "60", ">= 1 even when disabled", "wired", "DatabaseSinkOptions.CleanupIntervalMinutes / FreeSqlDatabaseLogBatchWriter"),
  field("logging", "logging.database.outputTemplate", "string", "Serilog default template", "—", "declared-unwired", "DatabaseSinkOptions.OutputTemplate", { note: "database-template-unwired" }),

  field("trace", "Trace.Enabled", "bool", "false", "—", "wired", "TraceOptions.Enabled / FreeSqlTraceStore", { note: "module-gate" }),
  field("trace", "Trace.CaptureAllRequest", "bool", "false", "—", "wired", "TraceOptions.CaptureAllRequest / ShouldPersist", { note: "trace-errors-only-detail" }),
  field("trace", "Trace.Provider", "string", "MySQL", "nonblank when enabled", "wired", "TraceOptions.Provider / FreeSqlDataTypeResolver", { note: "provider" }),
  field("trace", "Trace.ConnectionString", "string", '""', "nonblank when enabled", "wired", "TraceOptions.ConnectionString / FreeSqlTraceStore", { sensitive: true, note: "secret" }),
  field("trace", "Trace.TableName", "string", "asgard_trace", "nonblank when enabled", "wired", "TraceOptions.TableName / FreeSqlTraceStore"),
  field("trace", "Trace.BatchSize", "int", "100", ">= 1 even when disabled", "wired", "TraceOptions.BatchSize / FreeSqlTraceStore"),
  field("trace", "Trace.Period", "int s", "2", ">= 1 even when disabled", "wired", "TraceOptions.Period / FreeSqlTraceStore"),
  field("trace", "Trace.RetentionDays", "int days", "7", ">= 1 even when disabled", "wired", "TraceOptions.RetentionDays / FreeSqlTraceStore", { note: "trace-sensitive-capture" }),
  field("trace", "Trace.CleanupIntervalMinutes", "int min", "60", ">= 1 even when disabled", "wired", "TraceOptions.CleanupIntervalMinutes / FreeSqlTraceStore"),
  field("trace", "Trace.MaxBodyBytes", "int bytes", "65536", ">= 0 even when disabled", "wired", "TraceOptions.MaxBodyBytes / CaptureBodyAsync", { note: "trace-sensitive-capture" }),
  field("trace", "Trace.CaptureHeaders", "bool", "true", "—", "wired", "TraceOptions.CaptureHeaders / CaptureHeaders", { note: "trace-sensitive-capture" }),
  field("trace", "Trace.CaptureBody", "bool", "true", "—", "wired", "TraceOptions.CaptureBody / CaptureBodyAsync", { note: "trace-sensitive-capture" }),
  field("trace", "Trace.CaptureIdentity", "bool", "true", "—", "wired", "TraceOptions.CaptureIdentity / CaptureIdentity", { note: "trace-sensitive-capture" }),
];
