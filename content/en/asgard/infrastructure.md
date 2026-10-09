---
title: "Data, caching, and background work"
description: "Use Redis, RabbitMQ, and Quartz with explicit tenant and delivery boundaries"
order: 50
section: "Development"
---

Define durability, idempotency, and tenant scope before choosing infrastructure. Shared interfaces reduce wiring, but database transactions, caching, message delivery, and job state retain separate boundaries.

## Persistence layers

Configure FreeSql through `database.enabled`, `database.provider`, and `database.connectionString`. Select a provider actually referenced and tested by your project; names mentioned by a configuration type do not prove every driver is installed in your deployment.

- Access data through repositories rather than ORM calls in controllers
- Use `AbsAsgardRepositoryBase<TEntity, TKey>` for shared CRUD, caching, and tenant checks; verify constructor signatures in source
- Mark convention-based registrations with `[Repository]` and `[Service]`, and ensure the corresponding scan or plugin convention actually runs
- Choose the appropriate base for ordinary, tenant-owned, or tenant-user data
- Direct ORM writes, bulk SQL, and writes from another application need their own cache-invalidation and business-rule handling

Do not resolve database-dependent services when the module is disabled. Test invalid settings and missing connections; a running process is not evidence that the database is usable.

## Redis business cache

The current business-cache contract is `IAsgardCache`, exposed by the standard host through `AbsAsgardContext.Cache`. Enabled caching uses Redis. Disabled caching uses a null implementation, so application behavior must still work from its real data source.

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

Here `context` is an injected `AbsAsgardContext`. A miss returns the default value. Omitting TTL uses the configured default; an explicit TTL must be positive. Redis failures propagate exceptions, so define the application's failure strategy rather than silently treating an error as valid data.

`RemoveByPrefixAsync` scans and deletes by a literal prefix within the current `InstanceName` namespace; it does not execute FLUSHDB. It is not atomic, so account for concurrent repopulation when invalidating lists.

## Shared entity cache and tenant checks

The repository identifies a single cached entity by its full entity type, fixed table, and primary key. Platform and owning-tenant paths can share a data snapshot. Shared storage does not grant shared permission: each hit still validates the current explicit tenant scope, and reads return independent snapshots.

Tenant-entity access fails closed without an explicit scope. An empty tenant ID or platform user type does not grant cross-tenant access. Jobs and message consumers establish a scope with `ITenantScopeFactory.CreateScope(authorizedTenantId)`. Cross-tenant work requires a server-side `ICrossTenantScopeAuthorizer` and authorization through `CreateCrossTenantScope()`.

### Supported mappings

Shared entity caching requires a fixed entity type and physical table, with exactly one mapped primary-key property whose value matches `TKey`. Composite keys are rejected when the enabled-cache repository is constructed. Dynamic `AsTable`/`AsType` mappings, split-table mappings, and a changed physical table are rejected by the cache read/write guards; they do not silently fall back to a cache miss.

If your data model needs these mappings, disable shared caching for the entire data source or implement a dedicated cache with the correct data identity and invalidation lifecycle. Disabling it only on a writer while other repositories or application instances still cache the same data leaves stale readers.

### Transactions and post-commit invalidation

For the supported repository path, attach the repository to the FreeSql `UnitOfWork` that owns the write. When that unit of work has a transaction, entity-cache invalidation registers with its `EntityChangeReport.OnChange` commit callback. A successful commit invalidates the reported entities, including previous keys where available; reports without an entity instance, such as predicate deletes, invalidate the entity-type prefix. Rollback does not trigger that post-commit invalidation. Existing change callbacks are preserved.

Single-entity cache reads bypass both cache lookup and cache population whenever the repository has a `UnitOfWork`, either original/wrapped ADO reports a current-thread transaction, or `System.Transactions.Transaction.Current` is present. This avoids reading a transaction-external snapshot or publishing uncommitted data; tenant-scope and mapping checks still apply.

With shared caching enabled, repository writes inside unmanaged ADO or ambient transactions throw `NotSupportedException`: those paths have no supported post-commit invalidation hook. Use the FreeSql `UnitOfWork` path, or disable shared caching data-source-wide. Do not catch this rejection and retry the same write outside its required transaction.

If a commit callback throws because cache invalidation fails, the database has **already committed**. The combined callback attempts all registered invalidators and the existing callback, then reports an `AggregateException`. Repair/retry cache invalidation; do not blindly repeat the database transaction.

These guarantees apply to the shared single-entity cache through the Asgard repository overrides. List/custom caches, direct ORM or SQL writes, and writers in other applications need their own verified invalidation strategy. Test commit, rollback, post-commit cache failure, and concurrent repopulation separately.

## RabbitMQ delivery boundaries

Configure `messaging.enabled` and `messaging.rabbitMQ`, then publish, subscribe, or pull through `AbsAsgardContext.MessageQueue` or `IMessageQueue`. Provision the broker, vhost, account permissions, and topology first.

With `AutoAck=false`, a successful handler must explicitly call `MessageContext.AcknowledgeAsync()`; returning normally does not acknowledge the delivery.

The current manual-acknowledgement automatic failure path is:

1. Handler or deserialization failures increment `X-Asgard-Retry-Count`; the default permits 3 attempts after the initial delivery
2. Retry forwards to the exact source queue while preserving the body, MessageId, and AMQP properties
3. Forwarding uses publisher confirms and `mandatory=true`; the original delivery is acknowledged only after successful confirmation without an unroutable return
4. Exhausted retries forward to the dead-letter destination; with dead-lettering disabled, the original is explicitly acknowledged and discarded

Forwarding and acknowledging the original are not atomic. Recovery or lost confirmation can cause duplicate processing, so consumers must be idempotent. A failed confirmation wait leaves the original unacknowledged and requires connection recovery or channel recreation. Cancelling a subscription alone does not release unacknowledged messages on its old channel.

With `AutoDeclare=false`, the framework creates no exchanges, queues, or bindings. Operators must pre-create source and required dead-letter queues and verify permissions. Explicit `RejectAsync(true)` directly requeues at the broker without increasing the automatic retry count; it is not bounded retry. `AutoAck=true` also lacks the manual-acknowledgement failure-forwarding guarantees.

## Quartz jobs

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

The current implementation uses a single-process `RAMJobStore`. Dynamically registered jobs and state do not automatically survive a restart; register them again during startup. Configuration validation enforces these limits:

- `threadPoolSize` is positive and `instanceId` is nonempty
- `maxBatchSize` accepts only the default value 100
- `enableCluster` supports only `false`
- `connectionString`, `dbProvider`, and `jobFactoryType` must be absent or empty

Jobs implement `Asgard.Abstractions.Job.IJob.ExecuteAsync(IJobExecutionContext)`, return `Task`, and respond to `CancelRequested`. Quartz Cron expressions include seconds; simple-trigger `Interval` uses ISO 8601 durations such as `PT1M`.

The host prepares the scheduler, builds the container, and initializes plugins before starting triggers in the hosted Start lifecycle. Each execution creates an independent DI scope. Do not capture scoped services in singleton jobs. Recording a failed execution is not automatic business retry; design idempotency and compensation explicitly.

## Verification checklist

- Cache: misses, Redis failure, invalidation after writes, concurrent repopulation, and cross-tenant cache hits
- Messaging: successful acknowledgement, duplicates, poison messages, unroutable dead letters, and recovery after broker disconnection
- Jobs: no triggering before startup, correct dependency scopes, cancellation and disposal, and an explicit restart-registration strategy
- Transactions: test both commit and rollback, and handle the non-atomic database/message boundary explicitly

Relevant skills are `asgard-database`, `asgard-cache`, `asgard-messaging`, `asgard-job-scheduling`, and `asgard-identity-userinfo`; see the [catalog](/en/skills/docs/catalog/).

## Source references

These links point to the implementation. Repository access is required to open the source.

- [Data registration and tenant filtering](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Data/DatabaseServiceCollectionExtensions.cs)
- [Cache contract](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Caching/IAsgardCache.cs)
- [Entity cache implementation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.EntityCache.cs)
- [Repository mapping and invalidation registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.cs)
- [Post-commit invalidation callback](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/EntityCacheCommitInvalidation.cs)
- [Predicate-delete invalidation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.PredicateDelete.cs)
- [Single-entity cache reads and writes](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/AbsAsgardRepositoryBase.Crud.cs)
- [Explicit tenant scopes](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/ITenantScopeFactory.cs)
- [Current messaging behavior](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/18-消息队列.md)
- [Current job behavior and supported settings](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/19-作业调度.md)
