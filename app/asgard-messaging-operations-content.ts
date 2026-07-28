import type { DocPage } from "./content";

type Locale = "zh" | "en";

const productionYaml = `messaging:
  enabled: true
  rabbitmq:
    enabled: true
    hostName: "rabbitmq.internal"
    port: 5671
    userName: "asgard_app"
    password: "\${env:ASGARD_RABBITMQ_PASSWORD}"
    virtualHost: "/asgard-production"
    exchangeName: "asgard.events"
    exchangeType: "topic"
    queuePrefix: "asgard.production."
    automaticRecovery: true
    requestedHeartbeat: 60
    prefetchCount: 10
    requestedConnectionTimeout: 5000
    retryCount: 3
    retryIntervalMilliseconds: 1000
    ssl: true
    sslServerName: "rabbitmq.internal"
    persistentMessages: true
    durableQueues: true
    autoDeclare: true
  tracing:
    enabled: false
  retry:
    policyType: ExponentialBackoff
    maxRetryCount: 3
    initialDelayMilliseconds: 1000
    maxDelayMilliseconds: 60000
    multiplier: 2
    jitter: true
    jitterRange: 0.1
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

const publishCode = `public sealed class OrderService(AbsAsgardContext asgardContext)
{
    public async Task PublishCreatedAsync(
        OrderCreated message,
        CancellationToken cancellationToken)
    {
        var queue = asgardContext.MessageQueue;
        if (queue is null)
        {
            throw new InvalidOperationException(
                "Messaging is required for OrderCreated.");
        }

        await queue.PublishAsync(
            "orders.created.v1",
            message,
            new PublishOptions
            {
                MessageId = message.EventId.ToString(),
                Key = message.OrderId.ToString(),
                Headers = new Dictionary<string, string>
                {
                    ["schema-version"] = "1",
                    ["tenant-id"] = message.TenantId.ToString()
                }
            },
            cancellationToken);
    }
}`;

const subscribeCode = `public sealed class OrderCreatedSubscription(
    IMessageQueue messageQueue,
    IServiceScopeFactory scopeFactory,
    ILogger<OrderCreatedSubscription> logger) : BackgroundService
{
    private string? _subscriptionId;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _subscriptionId = await messageQueue.SubscribeAsync<OrderCreated>(
            "orders.created.v1",
            async (message, context) =>
            {
                if (message.Value is null)
                {
                    throw new InvalidOperationException("Message body is null.");
                }

                await using var scope = scopeFactory.CreateAsyncScope();
                var handler = scope.ServiceProvider
                    .GetRequiredService<OrderCreatedHandler>();

                await handler.HandleAsync(message.Value, stoppingToken);
                await context.AcknowledgeAsync();
            },
            new SubscribeOptions
            {
                AutoAck = false,
                PrefetchCount = 10,
                ConsumerTag = "orders-created-v1"
            },
            stoppingToken);

        try
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("Order subscription is stopping.");
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_subscriptionId is not null)
        {
            await messageQueue.UnsubscribeAsync(_subscriptionId, cancellationToken);
        }

        await base.StopAsync(cancellationToken);
    }
}`;

const tenantHandlerCode = `public sealed class OrderCreatedHandler(
    AbsAsgardContext asgardContext,
    IProcessedMessageRepository processedMessages,
    IOrderProjectionService projectionService)
{
    public async Task HandleAsync(
        OrderCreated message,
        CancellationToken cancellationToken)
    {
        var tenantScopes = asgardContext.TenantScopeFactory
            ?? throw new InvalidOperationException("Tenant scope is required.");

        using var tenantScope = tenantScopes.CreateScope(message.TenantId);

        if (await processedMessages.ExistsAsync(
                message.EventId,
                cancellationToken))
        {
            return;
        }

        await projectionService.ApplyAsync(message, cancellationToken);
        await processedMessages.AddAsync(message.EventId, cancellationToken);
    }
}`;

const acceptanceChecklist = `1. Start RabbitMQ with the production exchange, vhost, account, TLS, and permissions.
2. Start the host and prove startup fails when RabbitMQ is unreachable.
3. Publish one versioned event and inspect exchange, routing key, message ID, headers, durability, and JSON bytes.
4. Consume it with AutoAck=false; prove the business transaction completes before ACK.
5. Deliver the same MessageId twice and prove the handler is idempotent.
6. Send malformed and schema-incompatible JSON; observe the actual broker disposition.
7. Kill the broker and the application at publish, consume, ACK, and shutdown boundaries.
8. Prove tenant scope is established from validated message data and restored after handling.
9. Prove no token, cookie, password, or full identity snapshot enters payloads, headers, or logs.
10. Inspect broker queues after rejection; do not sign off retry, delay, or DLQ until the intended topology and finite policy pass end-to-end tests.`;

const sourceAnchors = `Common/Asgard.Abstractions/Messaging/MQConfig.cs
Common/Asgard.Abstractions/Messaging/RabbitMQOptions.cs
Common/Asgard.Abstractions/Messaging/RetryOptions.cs
Common/Asgard.Abstractions/Messaging/DelayedMessageOptions.cs
Common/Asgard.Abstractions/Messaging/TracingOptions.cs
Common/Asgard.Abstractions/Messaging/IMessageQueue.cs
Common/Asgard.Abstractions/Messaging/Message.cs
Common/Asgard.Abstractions/Messaging/MessageContext.cs
Common/Asgard.Abstractions/Messaging/PublishOptions.cs
Common/Asgard.Abstractions/Messaging/SubscribeOptions.cs
Common/Asgard.Abstractions/Messaging/IMessageConsumer.cs
Common/Asgard.Core/Messaging/MQManager.cs
Common/Asgard.Core/Messaging/MessageQueue.cs
Common/Asgard.Core/Messaging/MQServiceCollectionExtensions.cs
Common/Asgard.Core/Messaging/RabbitMQ/RabbitMQMessageQueue.cs
Common/Asgard.Core/Messaging/RabbitMQ/RabbitMQConfigurator.cs
Common/Asgard.Core/Messaging/RabbitMQ/RabbitMQMessageFactory.cs
Common/Asgard.Core/Messaging/Retry/RetryPolicyFactory.cs
Common/Asgard.Core/Messaging/Delayed/RabbitMQDelayedMessage.cs
Common/Asgard.Core/Messaging/DeadLetter/DeadLetterHandler.cs
Common/Asgard.Core/Messaging/Tracing/MessageTracer.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs`;

function buildMessagingOperationsPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "messaging-operations",
    group: zh ? "基础设施" : "Infrastructure",
    eyebrow: "MESSAGING OPERATIONS",
    title: zh ? "RabbitMQ 消息生产与运维" : "RabbitMQ messaging in production",
    description: zh
      ? "以 Asgard 5.1.3 的真实运行路径发布、订阅和运维 RabbitMQ 消息，并明确追踪、重试、延迟与死信能力尚未自动接入的边界。"
      : "Publish, consume, and operate RabbitMQ messages against the real Asgard 5.1.3 runtime path, with explicit boundaries where tracing, retry, delay, and dead-letter helpers are not wired automatically.",
    sections: [
      {
        id: "runtime-contract",
        title: zh ? "先确认已交付的运行契约" : "Start with the shipped runtime contract",
        paragraphs: zh
          ? [
              "Asgard 5.1.3 的统一 IMessageQueue 只有 RabbitMQ 实现。messaging.enabled 控制 Yggdrasil 是否创建 MQManager；启用时，构建宿主会立即创建连接并执行健康检查，失败会阻断启动。随后宿主把 IMQManager 与同一个 IMessageQueue 作为 singleton 注入，scoped AbsAsgardContext.MessageQueue 才能访问它。",
              "当前没有 provider 配置键，也没有 Kafka、Azure Service Bus 或内存 provider 选择器。messaging.rabbitmq.enabled 在模块启用时必须为 true；把配置对象中存在的选项或辅助类型当作端到端能力之前，必须继续验证主运行路径。",
            ]
          : [
              "Asgard 5.1.3 has one IMessageQueue implementation: RabbitMQ. messaging.enabled determines whether Yggdrasil creates MQManager. When enabled, host construction opens a connection and performs a health check immediately; failure blocks startup. The host then registers IMQManager and that same IMessageQueue as singletons, making it available through the scoped AbsAsgardContext.MessageQueue.",
              "There is no provider configuration key and no Kafka, Azure Service Bus, or in-memory provider selector. messaging.rabbitmq.enabled must be true when the module is enabled. Before treating an option or helper type as an end-to-end feature, keep following it into the primary runtime path.",
            ],
        bullets: zh
          ? [
              "模块默认关闭：messaging.enabled=false",
              "RabbitMQ 配置对象默认 enabled=true，但不能替代根开关",
              "禁用模块时 MessageQueue 可以为 null；业务必须选择明确降级或 fail closed",
              "标准宿主启用后在启动阶段 fail fast，不是首次发布时才验证连接",
            ]
          : [
              "The module defaults off: messaging.enabled=false",
              "The RabbitMQ object defaults enabled=true, but it does not replace the root switch",
              "MessageQueue can be null while the module is disabled; applications must choose an explicit fallback or fail closed",
              "The standard host fails fast during startup when enabled instead of waiting for the first publish",
            ],
      },
      {
        id: "configuration",
        title: zh ? "生产配置与安全基线" : "Production configuration and security baseline",
        paragraphs: zh
          ? [
              "下面的 YAML 展示当前配置对象能够加载的完整生产基线。密码必须来自 secret 注入，不进入仓库、日志或 Agent 上下文。使用专用 vhost 与最小权限账户，生产环境启用 TLS，并让 sslServerName 与证书名称一致。exchangeName、exchangeType、queuePrefix 与 topic 都是跨服务协议的一部分，变更前先做兼容迁移。",
              "校验会检查 host、port、userName、heartbeat、connection timeout 和数值范围，但不会验证交换机类型、证书信任、vhost 权限或拓扑兼容性。rabbitmq.retryCount 与 retryIntervalMilliseconds 当前只被校验，CreateConnectionFactory 和 MQManager 的启动连接路径并未使用它们执行连接重试。",
            ]
          : [
              "The YAML below shows the complete production baseline exposed by the current option objects. Inject the password from a secret store; never place it in source, logs, or agent context. Use a dedicated vhost and least-privilege account, enable TLS in production, and match sslServerName to the certificate. exchangeName, exchangeType, queuePrefix, and topics are cross-service protocol contracts; migrate them compatibly.",
              "Validation checks host, port, userName, heartbeat, connection timeout, and numeric ranges, but not exchange-type validity, certificate trust, vhost permissions, or topology compatibility. rabbitmq.retryCount and retryIntervalMilliseconds are currently validated only: CreateConnectionFactory and MQManager do not use them to retry the startup connection.",
            ],
        code: { language: "yaml", value: productionYaml },
        note: zh
          ? "配置中出现 retry、delayedMessage、tracing 和 DLQ 字段，不代表 IMessageQueue 主路径已经消费它们；对应边界见后文。"
          : "The presence of retry, delayedMessage, tracing, and DLQ fields does not mean the primary IMessageQueue path consumes them; the boundaries are documented below.",
      },
      {
        id: "topology-and-routing",
        title: zh ? "交换机、队列与路由" : "Exchanges, queues, and routing",
        paragraphs: zh
          ? [
              "发布默认把 topic 作为 routing key，PublishOptions.RoutingKey 可以覆盖它；Key 只是写入 x-asgard-message-key 头的业务幂等键，不改变路由。AutoDeclare=true 时发布仅声明交换机；订阅才声明 queuePrefix + topic 队列，并以 topic 绑定到 exchange。空 exchangeName 会使用 RabbitMQ 默认交换机，但订阅绑定步骤会跳过，必须自行证明队列路由成立。",
              "SubscribeOptions 没有 QueueName；同一 topic 在同一 queuePrefix 下映射到同一个队列，多实例是 competing consumers，不是每实例广播。GroupId、FromBeginning、Exclusive、ProcessingTimeout、RetryIntervals、DeadLetterQueue 与 EnableDeadLetter 等声明型属性目前不参与 RabbitMQMessageQueue 的消费路径。",
            ]
          : [
              "Publishing uses topic as the routing key unless PublishOptions.RoutingKey overrides it. Key is a business idempotency value stored in the x-asgard-message-key header; it does not control routing. With AutoDeclare=true, publishing declares only the exchange. Subscribing declares the queue as queuePrefix + topic and binds it to the exchange with topic. An empty exchangeName uses RabbitMQ's default exchange, but subscription binding is skipped, so the resulting route must be proven separately.",
              "SubscribeOptions has no QueueName. A topic under one queuePrefix maps to one queue, so multiple instances are competing consumers rather than per-instance fan-out. Declared properties such as FromBeginning, Exclusive, ProcessingTimeout, RetryIntervals, DeadLetterQueue, and EnableDeadLetter do not currently participate in RabbitMQMessageQueue's consumption path.",
            ],
        bullets: zh
          ? [
              "保持 topic、schema version、exchange 与 queue prefix 稳定",
              "需要广播时显式设计多个队列与绑定；当前 SubscribeAsync 不提供独立队列名",
              "AutoDeclare=false 时由 IaC/运维预先创建完全匹配的交换机、队列和绑定",
              "BasicPublish 使用 mandatory=false，未路由消息不会由当前 API 返回",
            ]
          : [
              "Keep topic, schema version, exchange, and queue prefix stable",
              "For fan-out, design multiple queues and bindings explicitly; current SubscribeAsync does not accept an independent queue name",
              "With AutoDeclare=false, provision an exactly matching exchange, queue, and binding through infrastructure automation",
              "BasicPublish uses mandatory=false, so the current API does not report an unroutable message",
            ],
      },
      {
        id: "publishing",
        title: zh ? "发布：把成功语义说清楚" : "Publishing: define what success means",
        paragraphs: zh
          ? [
              "通过 AbsAsgardContext.MessageQueue 发布时先处理 null。对必须投递的领域事件，应 fail closed 或使用业务 outbox；静默跳过会造成状态与事件分叉。对可选通知才可显式降级。MessageId 用稳定事件 ID，Key 用聚合 ID，payload 带 schema version 与 TenantId，消费者必须幂等。",
              "PublishAsync 成功表示客户端 BasicPublishAsync 调用完成，不等于消息已路由、落盘或被消费。当前通道未开启 publisher confirms，mandatory=false，也没有事务 outbox。Persistent 标志与 durable queue 可以降低 broker 重启风险，但不能弥补数据库提交与发布之间的双写窗口。PublishBatchAsync 只是逐条 await 发布，不是 broker 批次或原子事务。",
            ]
          : [
              "When publishing through AbsAsgardContext.MessageQueue, handle null first. A required domain event should fail closed or use an application-owned outbox; silently skipping it splits state from events. Only optional notifications should degrade explicitly. Use a stable event ID for MessageId, an aggregate ID for Key, and put schema version and TenantId in the payload; consumers must be idempotent.",
              "A successful PublishAsync means the client BasicPublishAsync call completed, not that the message was routed, persisted, or consumed. The current channel does not enable publisher confirms, uses mandatory=false, and provides no transactional outbox. Persistent delivery plus durable queues reduces broker-restart exposure but does not close the database-commit/publish dual-write window. PublishBatchAsync simply awaits each message in a loop; it is neither a broker batch nor an atomic transaction.",
            ],
        code: { language: "csharp", value: publishCode },
      },
      {
        id: "subscription-lifecycle",
        title: zh ? "订阅与处理器发现的真实边界" : "Subscription lifecycle and the discovery boundary",
        paragraphs: zh
          ? [
              "当前 AddMessageConsumer<T,TConsumer> 只把 IMessageConsumer<T> 注册成 singleton。源码没有扫描这些消费者、没有 hosted service 读取它们，也不会自动调用 SubscribeAsync；接口注释中的“自动开始消费”尚未由主运行路径证明。生产应用必须在明确的宿主生命周期中手工订阅，保存 subscriptionId，并在停止时 UnsubscribeAsync。",
              "IMessageQueue 是 singleton。不要把 scoped Repository/Service 直接捕获到长生命周期 handler；每次投递创建 DI scope，再解析业务 handler。下面示例采用 AutoAck=false，业务成功后才显式 ACK。handler 抛出时 RabbitMQMessageQueue 捕获异常并 NACK；应用日志与指标必须在抛出前记录足够但不敏感的诊断信息。",
            ]
          : [
              "AddMessageConsumer<T,TConsumer> currently registers only a singleton IMessageConsumer<T>. No source path scans those consumers, no hosted service resolves them, and nothing automatically calls SubscribeAsync; the interface comment that consumption starts automatically is not proven by the primary runtime path. Production applications must subscribe in an explicit host lifecycle, retain the subscriptionId, and call UnsubscribeAsync during shutdown.",
              "IMessageQueue is a singleton. Do not capture scoped repositories or services in a long-lived callback. Create a DI scope per delivery and resolve the business handler from it. The example uses AutoAck=false and acknowledges only after business work succeeds. When the handler throws, RabbitMQMessageQueue catches it and NACKs; emit sufficient non-sensitive logs and metrics before rethrowing.",
            ],
        code: { language: "csharp", value: subscribeCode },
      },
      {
        id: "acknowledgement-and-retry",
        title: zh ? "ACK、重投与重试边界" : "Acknowledgement, redelivery, and retry boundaries",
        paragraphs: zh
          ? [
              "AutoAck=true 会把 autoAck=true 交给 RabbitMQ，broker 在处理器完成前即可确认；它不是“处理成功后自动 ACK”，生产业务消费者通常应保持 false。AutoAck=false 时处理器必须成功后调用 AcknowledgeAsync；异常路径由外层 catch 执行 BasicNack。不要在处理器里先 RejectAsync 再抛出，否则可能对同一 delivery tag 二次 NACK。",
              "当前失败判断使用 message.RetryCount < SubscribeOptions.MaxRetryCount 决定 requeue，但发布只序列化 Value，消费反序列化时 RetryCount 初始化为 0，NACK/requeue 也不会增加或持久化它。因此默认 MaxRetryCount=3 不能形成有限三次重试，毒消息可能无限快速重投。messaging.retry 的 IRetryPolicy 工厂和退避参数没有接入 SubscribeAsync；不要宣称指数退避、jitter、不可重试异常分类或有限重试已生效。",
            ]
          : [
              "AutoAck=true passes autoAck=true to RabbitMQ, so the broker may acknowledge before the handler completes; it does not mean 'ACK automatically after successful processing.' Production business consumers should normally keep it false. With AutoAck=false, the handler must call AcknowledgeAsync after success; the outer catch issues BasicNack on failure. Do not call RejectAsync and then throw, which can NACK the same delivery tag twice.",
              "The current failure path compares message.RetryCount with SubscribeOptions.MaxRetryCount to choose requeue. Publishing serializes only Value, consumption initializes RetryCount to 0, and NACK/requeue neither increments nor persists it. The default MaxRetryCount=3 therefore does not create a finite three-attempt policy; a poison message can be redelivered indefinitely and immediately. The IRetryPolicy factory and messaging.retry backoff settings are not wired into SubscribeAsync. Do not claim exponential backoff, jitter, non-retriable classification, or bounded retry is active.",
            ],
        note: zh
          ? "在修复并通过真实 RabbitMQ 测试前，应用应自己建立有限尝试计数、退避、隔离队列和人工处置流程，或使用已验证的外部拓扑。"
          : "Until source is fixed and proven against real RabbitMQ, the application must own bounded attempts, backoff, quarantine, and operator disposition, or use an externally verified topology.",
      },
      {
        id: "delay-and-dead-letter",
        title: zh ? "延迟消息与死信不是自动能力" : "Delay and dead-lettering are not automatic capabilities",
        paragraphs: zh
          ? [
              "PublishOptions.DelayMilliseconds 当前未被 RabbitMQMessageQueue.CreateBasicProperties 或 PublishAsync 读取。DelayedMessageOptions 会被校验，仓库也存在 RabbitMQDelayedMessage、TTL、插件和内存辅助实现，但标准宿主不注册它们，IMessageQueue 也没有 PublishDelayedAsync。因此只设置 delayedMessage.enabled=true 不会让普通 PublishAsync 延迟。",
              "EnableDeadLetterQueue=true 会在自动声明主队列时写入 x-dead-letter-exchange 与 x-dead-letter-routing-key，后者是完整队列名加 .dlq；但代码不会声明或绑定该 DLQ。SubscribeOptions.DeadLetterQueue/EnableDeadLetter 未被读取，DeadLetterHandler 也不会自动订阅。NACK requeue=false 只有在运维已建立匹配的 DLQ 绑定时才可能到达它，否则可能丢失。",
            ]
          : [
              "RabbitMQMessageQueue.CreateBasicProperties and PublishAsync do not currently read PublishOptions.DelayMilliseconds. DelayedMessageOptions is validated, and the repository contains RabbitMQDelayedMessage plus TTL, plugin, and memory helpers, but the standard host does not register them and IMessageQueue has no PublishDelayedAsync method. Setting delayedMessage.enabled=true therefore does not delay a normal PublishAsync call.",
              "EnableDeadLetterQueue=true adds x-dead-letter-exchange and x-dead-letter-routing-key when auto-declaring the main queue; the routing key is the full queue name plus .dlq. Code does not declare or bind that DLQ. SubscribeOptions.DeadLetterQueue/EnableDeadLetter are not read, and DeadLetterHandler is not subscribed automatically. A NACK with requeue=false reaches a DLQ only when operations provisioned a matching binding; otherwise the message may be lost.",
            ],
        bullets: zh
          ? [
              "把延迟与 DLQ 拓扑写入 IaC，并用 RabbitMQ Management API/CLI 验证",
              "插件模式必须先安装并验证 rabbitmq_delayed_message_exchange",
              "TTL 队列的粒度、顺序、容量与过期行为必须压测",
              "为 quarantine/replay 定义权限、审计、幂等与 schema 升级策略",
            ]
          : [
              "Declare delay and DLQ topology in infrastructure as code and verify it through RabbitMQ management APIs or CLI",
              "Plugin mode requires an installed and verified rabbitmq_delayed_message_exchange plugin",
              "Load-test TTL queue granularity, ordering, capacity, and expiration behavior",
              "Define authorization, audit, idempotency, and schema-upgrade rules for quarantine and replay",
            ],
      },
      {
        id: "serialization-contract",
        title: zh ? "序列化、版本与兼容性" : "Serialization, versioning, and compatibility",
        paragraphs: zh
          ? [
              "RabbitMQ 主路径使用 JsonSerializerOptionsFactory.Default 把 T 直接序列化为 UTF-8 JSON；Message<T> 重载也只发送 Value，并把 Id、Key 与 string headers 转成 AMQP 属性。Message.Timestamp 与 RetryCount 不会传输，消费时间戳在 AMQP timestamp 缺失时取当前 UTC。消费者使用同一选项反序列化为目标 T，失败发生在用户 handler 之前。",
              "发布契约应使用只含数据的 DTO，保持字段增量兼容，topic 或 header 明确 schema version，并保留可重复的 contract tests。不要发送 EF Entity、异常、服务对象、Access Token、Cookie、密码或完整身份快照。当前反序列化失败位于 ReceivedAsync 回调构造 message 的 try/catch 之外，源码没有证明它会执行应用预期的 NACK/DLQ 路径；必须用真实 broker 验证。",
            ]
          : [
              "The RabbitMQ path serializes T directly to UTF-8 JSON with JsonSerializerOptionsFactory.Default. The Message<T> overload still sends only Value while mapping Id, Key, and string headers into AMQP properties. Message.Timestamp and RetryCount are not transmitted; when the AMQP timestamp is absent, the consumer assigns current UTC. Consumers deserialize into the requested T with the same options, before invoking the user handler.",
              "Use data-only event DTOs, evolve fields additively, expose a schema version in the topic or header, and retain repeatable contract tests. Never send EF entities, exceptions, service objects, access tokens, cookies, passwords, or full identity snapshots. Deserialization currently occurs before the ReceivedAsync handler's try/catch constructs the user callback path, so source does not prove malformed JSON follows the intended NACK/DLQ behavior; test it with a real broker.",
            ],
      },
      {
        id: "trace-propagation",
        title: zh ? "追踪头不等于分布式 Trace" : "Trace headers are not distributed tracing",
        paragraphs: zh
          ? [
              "messaging.tracing.enabled=true 只使 RabbitMQConfigurator 在发布属性中加入新的随机 X-Trace-Id、固定 X-Source=Asgard 与 X-Timestamp。它不会读取 Activity.Current、Asgard HTTP TraceId 或调用方已有的上游 trace，也没有在消费端创建 Activity/Asgard Trace scope。EnablePropagation、SampleRate、StoreType、RetentionDays 等 TracingOptions 没有接入 RabbitMQMessageQueue。",
              "MessageTracer 与内存 store 是可单独注册的辅助实现，但标准 Yggdrasil 消息路径没有自动调用它们。若要端到端关联，应用应显式传入经过允许的 correlation ID/trace context，消费时验证格式并建立本地日志 scope；在 W3C Trace Context、安全与采样策略通过集成测试前，不要把 X-Trace-Id 描述为 OpenTelemetry 链路传播。",
            ]
          : [
              "messaging.tracing.enabled=true only makes RabbitMQConfigurator add a new random X-Trace-Id, fixed X-Source=Asgard, and X-Timestamp to published AMQP properties. It does not read Activity.Current, the Asgard HTTP TraceId, or an existing upstream trace, and the consumer creates no Activity or Asgard Trace scope. TracingOptions such as EnablePropagation, SampleRate, StoreType, and RetentionDays are not wired into RabbitMQMessageQueue.",
              "MessageTracer and its in-memory store are separately registrable helpers, but the standard Yggdrasil messaging path does not call them automatically. For end-to-end correlation, explicitly publish an allowed correlation ID or trace context, validate it on consumption, and create a local logging scope. Do not describe X-Trace-Id as OpenTelemetry propagation until W3C Trace Context, security, and sampling behavior pass integration tests.",
            ],
      },
      {
        id: "tenant-and-identity",
        title: zh ? "租户与身份必须显式重建" : "Tenant and identity must be reconstructed explicitly",
        paragraphs: zh
          ? [
              "消息消费不在 HTTP 请求中运行，不会自动携带 IAsgardIdentityContext、TenantId、用户 claims 或授权结果。把 TenantId 与最小 actor/service 标识作为受版本控制的业务字段；不要信任任意 header 即可切换租户。消费者应验证消息来源与目标租户，在每条投递自己的 DI scope 内建立 TenantScope，并在 scope 释放时恢复身份快照。",
              "后台服务 token、用户 token 和权限集合不应放进消息。若动作需要授权决策，生产者记录已经验证的不可变业务意图，消费者再用服务身份与当前策略执行；敏感操作保留审计 actor、tenant、MessageId 和 outcome。幂等记录与业务变更最好同事务提交，否则 ACK 边界仍可能形成重复副作用。",
            ]
          : [
              "Message consumption runs outside an HTTP request and does not automatically carry IAsgardIdentityContext, TenantId, user claims, or an authorization result. Put TenantId and the minimum actor/service identifier in a versioned business contract; do not trust an arbitrary header as authority to switch tenants. Validate source and target tenant, establish TenantScope inside a per-delivery DI scope, and let disposal restore the previous identity snapshot.",
              "Do not place backend tokens, user tokens, or permission sets in messages. When an action needs authorization, publish an immutable business intent that was already validated, then execute under a service identity and current policy. Audit actor, tenant, MessageId, and outcome for sensitive actions. Commit the idempotency record and business mutation in one transaction where possible, or the ACK boundary can still produce duplicate side effects.",
            ],
        code: { language: "csharp", value: tenantHandlerCode },
      },
      {
        id: "failure-and-recovery",
        title: zh ? "失败、恢复与可观测性" : "Failure, recovery, and observability",
        bullets: zh
          ? [
              "启动连接或健康检查失败会阻断标准宿主构建；发布/订阅时的后续异常由调用方处理",
              "AutomaticRecoveryEnabled 会交给 RabbitMQ 客户端，但当前应用没有发布确认、未路由回调或恢复状态指标，不能单独证明零丢失",
              "连接与所有订阅共享一个缓存 channel；每次订阅会在同一 channel 上重设 BasicQos，最后一次设置可能影响同 channel 消费者",
              "订阅回调吞掉用户 handler 异常并尝试 NACK；框架不记录异常，应用 handler 必须记录结构化 MessageId/topic/tenant/outcome",
              "UnsubscribeAsync 与 DisposeAsync 的 BasicCancel/Close 异常被部分吞掉；滚动发布要观察未确认消息与重新投递",
              "IsHealthyAsync 只检查连接 IsOpen，不证明 exchange、queue、binding、发布路由、消费或 DLQ 可用",
              "监控连接/通道、consumer 数、ready/unacked、redelivery rate、消息 age、发布与处理延迟、异常率、毒消息和 DLQ 深度",
            ]
          : [
              "Startup connection or health-check failure blocks standard host construction; callers own later publish and subscription exceptions",
              "AutomaticRecoveryEnabled is passed to the RabbitMQ client, but the application has no publisher confirms, unroutable-return handling, or recovery-state metrics, so it does not prove zero loss",
              "One cached channel is shared by publishing and every subscription; each subscription resets BasicQos on that channel, so the last setting may affect other consumers on it",
              "The subscription callback swallows user-handler exceptions after attempting NACK; the framework does not log them, so handlers must emit structured MessageId/topic/tenant/outcome diagnostics",
              "UnsubscribeAsync and DisposeAsync swallow some BasicCancel/Close errors; observe unacknowledged messages and redelivery during rolling deployment",
              "IsHealthyAsync checks only connection IsOpen, not exchange, queue, binding, publish routing, consumption, or DLQ availability",
              "Monitor connection/channel state, consumer count, ready/unacked depth, redelivery rate, message age, publish and processing latency, failures, poison messages, and DLQ depth",
            ],
      },
      {
        id: "testing-and-acceptance",
        title: zh ? "测试与生产验收" : "Testing and production acceptance",
        paragraphs: zh
          ? [
              "单元测试可以 fake IMessageQueue，验证 topic、options、null 降级、幂等和租户校验；但它不能证明 RabbitMQ 拓扑、ACK、重投、序列化、恢复与停机行为。集成测试必须使用与生产相同主版本的真实 RabbitMQ，并检查管理面状态。",
              "把每一项声称的可靠性能力转成故障注入：断开 broker、制造未路由 key、崩溃于数据库提交前后、ACK 前后重复投递、发送毒 JSON、滚动关闭实例。只有在真实路径中观察到期望 broker 状态、业务状态与告警后才签字。",
            ]
          : [
              "Unit tests can fake IMessageQueue to verify topics, options, null fallback, idempotency, and tenant checks, but they cannot prove RabbitMQ topology, ACK, redelivery, serialization, recovery, or shutdown behavior. Integration tests must use a real RabbitMQ of the production major version and inspect management-plane state.",
              "Turn each reliability claim into a fault injection: disconnect the broker, publish an unroutable key, crash before and after database commit, duplicate delivery around ACK, send poison JSON, and roll an instance down. Sign off only after the real path produces the intended broker state, business state, and alert.",
            ],
        code: { language: "text", value: acceptanceChecklist },
      },
      {
        id: "ai-ready-workflow",
        title: zh ? "AI Ready 工作流" : "AI Ready workflow",
        paragraphs: zh
          ? [
              "让 Agent 先加载 asgard-messaging；涉及 TenantScope、身份、宿主生命周期或后端业务变更时，再加载 asgard-context-usage、asgard-identity-userinfo、asgard-host-project 与 asgard-backend-guard。要求 Agent 沿配置字段追到 manager 注册、RabbitMQMessageQueue 和真实测试，不能依据 XML 注释、option 类型或独立 helper 宣称能力已接通。",
              "把 topic/schema 清单、RabbitMQ 拓扑导出、脱敏日志、MessageId、测试夹具和故障注入结果作为可复现输入；删除 credentials、payload 中的个人信息和生产 token。Agent 生成的消费者必须经过人工审查：DI scope、TenantScope、幂等事务、ACK 顺序、有限失败策略和停机清理缺一不可。",
            ]
          : [
              "Have an agent load asgard-messaging first. Add asgard-context-usage, asgard-identity-userinfo, asgard-host-project, and asgard-backend-guard when TenantScope, identity, host lifecycle, or backend business changes are involved. Require it to follow configuration into manager registration, RabbitMQMessageQueue, and real tests; an XML comment, option type, or standalone helper is not proof that a feature is connected.",
              "Provide a topic/schema inventory, exported RabbitMQ topology, redacted logs, MessageIds, test fixtures, and fault-injection results as reproducible inputs. Remove credentials, personal payload data, and production tokens. Human-review every generated consumer for DI scope, TenantScope, idempotent transaction, ACK ordering, bounded failure policy, and shutdown cleanup.",
            ],
      },
      {
        id: "source-evidence",
        title: zh ? "Asgard 5.1.3 源码证据" : "Asgard 5.1.3 source evidence",
        paragraphs: zh
          ? [
              "本页依据 clean Asgard 5.1.3 commit d1002d1 核对。修改 MQConfig、RabbitMQMessageQueue、拓扑声明、序列化、manager 注册或宿主生命周期后，必须同步复查双语文档。尤其在有限重试、延迟、DLQ 自动声明、handler 自动发现、Trace 传播或 publisher confirms 真正接入主路径后，才能移除对应 Preview/未证明警告。",
            ]
          : [
              "This page was checked against clean Asgard 5.1.3 commit d1002d1. Any change to MQConfig, RabbitMQMessageQueue, topology declaration, serialization, manager registration, or host lifecycle requires a synchronized bilingual review. Remove the relevant Preview/not-proven warning only after bounded retry, delay, automatic DLQ declaration, handler discovery, trace propagation, or publisher confirms are wired into the primary path and tested.",
            ],
        code: { language: "text", value: sourceAnchors },
      },
    ],
  };
}

export const zhAsgardMessagingOperationsDocs: DocPage[] = [
  buildMessagingOperationsPage("zh"),
];

export const enAsgardMessagingOperationsDocs: DocPage[] = [
  buildMessagingOperationsPage("en"),
];
