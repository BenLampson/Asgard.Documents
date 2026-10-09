---
title: "数据、缓存与异步任务"
description: "建立明确的租户边界，正确使用 Redis、RabbitMQ 和 Quartz"
order: 50
section: "开发指南"
---

先确定业务需要的持久性、幂等性和租户范围，再选择模块。统一接口减少接线工作，但数据库事务、缓存、消息投递和作业状态仍有各自的边界。

## 数据访问分层

通过 `database.enabled`、`database.provider` 与 `database.connectionString` 配置 FreeSql。只选择当前项目实际引用并验证的提供程序；配置类型列出的名称不等于你的部署已经安装所有驱动。

- 数据通过 Repository 访问，Controller 不直接操作 ORM
- 需要统一 CRUD、缓存和租户检查时使用 `AbsAsgardRepositoryBase<TEntity, TKey>`，构造签名以源码为准
- 用 `[Repository]`、`[Service]` 标记约定注册目标，并确认实际执行了对应扫描或插件约定
- 普通实体、租户实体与租户用户数据实体分别使用合适的基类
- ORM 的直接写入、批量 SQL 或其他应用写入，必须自行处理相应缓存失效与业务规则

数据库模块关闭时，不要解析依赖数据库的服务。以错误输入和缺失连接测试启动路径，不能把“进程已运行”当作数据库可用证明。

## Redis 业务缓存

当前业务缓存契约为 `IAsgardCache`，标准宿主通过 `AbsAsgardContext.Cache` 暴露它。启用时只使用 Redis；关闭时注册空缓存，业务必须仍能从真实数据源获得结果。

```csharp
var cache = context.Cache;
if (cache is not null)
{
    var cached = await cache.GetAsync<string>("catalog:item:42", cancellationToken);
    await cache.SetAsync(
        "catalog:item:42", "value", TimeSpan.FromMinutes(5), cancellationToken);
    await cache.RemoveAsync("catalog:item:42", cancellationToken);
}
```

示例中的 `context` 为已注入的 `AbsAsgardContext`。未命中返回默认值；未传 TTL 时使用配置默认过期时间；显式 TTL 必须为正数。Redis 操作失败会传播异常，业务需明确故障策略，不应把异常静默当作有效数据。

`RemoveByPrefixAsync` 在当前 `InstanceName` 命名空间内按字面前缀扫描删除，不执行 FLUSHDB。它不是原子操作，设计列表失效时要考虑并发回填。

## 单实体共享缓存与租户检查

仓储单实体缓存以完整实体类型、固定表和主键识别实体，平台与所属租户可以共享同一份数据快照。共享存储不等于共享访问权限：每次命中仍验证当前显式租户范围，读取返回独立快照。

无明确租户范围时，租户实体访问默认拒绝。空租户 ID 或平台用户类型不自动授予跨租户权限。后台作业与消息处理通过 `ITenantScopeFactory.CreateScope(authorizedTenantId)` 创建范围；跨租户操作需要服务端实现 `ICrossTenantScopeAuthorizer` 并通过 `CreateCrossTenantScope()` 授权。

### 支持的映射范围

单实体共享缓存要求固定实体类型、固定物理表，以及唯一的已映射主键属性，其值类型必须与 `TKey` 一致。启用缓存时，复合主键会在构造仓储时被拒绝。动态 `AsTable`/`AsType`、分表映射及物理表变化会被缓存读写边界检查拒绝，不会静默退化成缓存未命中。

数据模型需要这些映射时，应对整个数据源禁用共享缓存，或实现具有正确数据身份及失效生命周期的专用缓存。不能只在写入方关闭缓存，而让其他仓储或应用实例继续缓存同一数据，否则读取方可能保留旧值。

### 事务与提交后失效

使用受支持的仓储路径时，应把仓储关联到负责此次写入的 FreeSql `UnitOfWork`。该工作单元存在事务时，实体缓存失效注册到其 `EntityChangeReport.OnChange` 提交回调。成功提交后，按实际变更报告失效实体，存在旧主键时也会失效旧键；谓词删除等不包含实体实例的报告，会失效实体类型前缀。回滚不会触发这套提交后失效，已有变更回调会被保留。

仓储关联了 `UnitOfWork`、原始或包装后的 ADO 存在当前线程事务，或存在 `System.Transactions.Transaction.Current` 时，单实体读取同时跳过缓存查询与回填。这避免读取事务外快照或发布未提交数据；租户范围和映射检查仍然生效。

启用共享缓存时，非托管 ADO 或环境事务中的仓储写入会抛出 `NotSupportedException`，因为这些路径没有受支持的提交后失效钩子。应改用 FreeSql `UnitOfWork` 路径，或对整个数据源禁用共享缓存。不要捕获拒绝后，把本来要求事务的同一写入改到事务外重试。

若提交回调因缓存失效失败而抛错，数据库此时**已经提交**。组合回调会尝试所有已注册失效器及原有回调，最后报告 `AggregateException`。应修复或重试缓存失效，不能盲目重放数据库事务。

以上保证只覆盖经过 Asgard 仓储重写方法的单实体共享缓存。列表/自定义缓存、直接 ORM 或 SQL 写入及其他应用写入，需要各自验证过的失效策略。分别测试提交、回滚、提交后缓存故障与并发回填。

## RabbitMQ 投递边界

通过 `messaging.enabled` 和 `messaging.rabbitMQ` 配置模块，经 `AbsAsgardContext.MessageQueue` 或 `IMessageQueue` 发布、订阅或拉取。启用前准备 broker、vhost、账户权限和拓扑。

`AutoAck=false` 时，成功处理后也需要处理器显式调用 `MessageContext.AcknowledgeAsync()`；仅正常返回不会自动确认。

当前手动确认的自动失败路径：

1. 处理或反序列化异常增加 `X-Asgard-Retry-Count`；默认允许初次投递后再尝试 3 次
2. 重试精确转发到源队列，保留消息体、MessageId 与 AMQP 属性
3. 转发使用 publisher confirms 与 `mandatory=true`；确认成功且未不可路由返回后才 ACK 原投递
4. 重试耗尽时转发到死信目的队列；死信关闭则明确 ACK 丢弃

转发和原消息确认不是原子事务，恢复或确认丢失可能导致重复处理，消费者必须幂等。确认等待失败时原消息保持未确认，需要恢复连接或重建通道；仅取消订阅并不会释放旧通道上的未确认消息。

`AutoDeclare=false` 时框架不创建交换机、队列或绑定。部署方要预建源队列与需要的死信队列，并验证权限。显式 `RejectAsync(true)` 是 broker 直接重新入队，不增加自动重试计数；不要把它当作有界重试。`AutoAck=true` 也不能获得手动确认的失败转发保障。

## Quartz 作业

```yaml
job:
  enabled: true
  scheduler:
    threadPoolSize: 10
    maxBatchSize: 100
    enableCluster: false
    instanceId: AUTO
  jobs: []
```

当前实现使用单进程 `RAMJobStore`。动态注册的作业和状态不会在重启后自动恢复；需要在启动流程重新注册。以下配置限制会明确校验：

- `threadPoolSize` 必须大于零，`instanceId` 不为空
- `maxBatchSize` 仅接受默认值 100
- `enableCluster` 仅支持 `false`
- `connectionString`、`dbProvider`、`jobFactoryType` 只能未配置或为空

作业实现 `Asgard.Abstractions.Job.IJob.ExecuteAsync(IJobExecutionContext)`，返回 `Task`，并响应 `CancelRequested`。Quartz Cron 使用含秒字段的格式；simple trigger 的 `Interval` 使用 ISO 8601 时长，例如 `PT1M`。

宿主先准备调度器、构建容器并完成插件初始化，在 Start 生命周期中才启动触发器。每次触发建立独立 DI 作用域；不要在单例作业捕获 scoped 服务。业务失败记录不等于自动业务重试，仍需设计幂等性与补偿。

## 验证清单

- 缓存：未命中、Redis 不可用、更新后失效、并发回填与跨租户缓存命中
- 消息：成功确认、重复投递、毒消息、死信不可路由、broker 断线后恢复
- 作业：启动前不触发、依赖作用域正确、取消与释放正常、重启后的注册策略明确
- 事务：提交和回滚分别测试，数据库与消息之间的非原子边界显式处理

相关技能：`asgard-database`、`asgard-cache`、`asgard-messaging`、`asgard-job-scheduling` 与 `asgard-identity-userinfo`，见[目录](/zh/skills/docs/catalog/)。

## 源码依据

以下链接指向对应实现；访问源码需要仓库权限。

- [Data registration and tenant filtering](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Data/DatabaseServiceCollectionExtensions.cs)
- [Cache contract](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Caching/IAsgardCache.cs)
- [Entity cache implementation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.EntityCache.cs)
- [仓储映射与失效注册](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.cs)
- [提交后失效回调](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/EntityCacheCommitInvalidation.cs)
- [谓词删除失效](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.PredicateDelete.cs)
- [单实体缓存读写](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.Crud.cs)
- [Explicit tenant scopes](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/ITenantScopeFactory.cs)
- [Current messaging behavior](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/18-消息队列.md)
- [Current job behavior and supported settings](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/19-作业调度.md)
