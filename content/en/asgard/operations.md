---
title: "Deploy, observe, and troubleshoot"
description: "Turn configuration, health checks, shutdown, and diagnostics into an operational plan"
order: 70
section: "Operations"
---

Validate the complete runtime path before deployment: configuration loading, external connections, plugin initialization, the first business request, background work, and graceful shutdown. A successful compilation or green self-check does not cover all of these.

## Publish and configure the environment

Using the application from the [quick start](/en/asgard/docs/quick-start/):

```bash
dotnet publish MyAsgardApp.csproj -c Release -o publish
cd publish
dotnet MyAsgardApp.dll
```

The deployment process must receive its configuration files and environment variables. Check that:

- `config/app.yaml` and required environment files are present, with the correct working directory
- `ASPNETCORE_ENVIRONMENT` or `DOTNET_ENVIRONMENT` selects the intended environment; production disables detailed errors
- AES key/IV and database, Redis, and RabbitMQ credentials come from secure configuration
- Kestrel listening addresses, TLS, proxy forwarding, and external hostnames agree
- Private data is outside the static root, and Swagger exposure matches deployment policy
- Plugin DLLs, dependencies, configuration, and required data directories are included and checked

Do not expose a Development deployment directly to the public internet. `host.tsGen.enabled` maps `/asgard-tsgen` only in Development. Treat generated TypeScript as output and keep handwritten business code elsewhere.

## What health checks establish

When `host.healthCheck` is enabled, the default paths expose overall, ready, and live status. The host supplies only a `self` check tagged `live` and `ready`; success does not establish external-service health.

When adding database, cache, or messaging checks, decide which failures remove a replica from ready traffic and which require process restart. A transient downstream failure should not cause every replica to restart continuously. Acceptance also needs a business request exercising real dependencies.

## Configure logs and Trace separately

```yaml
logging:
  minimumLevel: Information
  console:
    enabled: true
  file:
    enabled: true
    path: "logs/app-.log"
    rollingInterval: Day
    retainedFileCountLimit: 7
  database:
    enabled: false
```

The current `LogConfig` has no overall `logging.enabled` switch; configure individual sinks. File retention count is not a disk-capacity limit, so monitor storage and throughput. `logging.database` stores ordinary logs, while `Trace` controls an independent request-trace table.

- `Trace.Enabled: false`: no Trace persistence, while request-local context remains available
- `Trace.Enabled: true` with `CaptureAllRequest: false`: persist errors and 5xx requests
- `CaptureAllRequest: true`: also persist lightweight normal-request traces without normal request bodies
- Masking covers recognized header names and parseable JSON properties only. Query strings, non-JSON bodies, and malformed or truncated JSON can remain raw. Disable body/header capture where necessary, and never put secrets in URLs or custom notes/tags

Correlate Trace ID, route, HTTP method, trusted tenant/subject, business milestones, and exceptions. Never put full tokens, passwords, or keys in logs.

## Trace delivery is not a durable audit queue

Current persistence uses bounded, best-effort background delivery:

- Up to 1,024 queued records and one in-flight batch of at most 1,024; actual batch size is `min(Trace.BatchSize, 1024)`
- Request enqueueing does not block; a full or closed queue rejects new records and counts drops
- Each batch gets at most three writes, with 50- and 100-millisecond retry delays; exhaustion drops the batch and continues consuming
- Queue rejection, retries, failed batches, and cleanup failures feed throttled Serilog `SelfLog` diagnostics
- Shutdown waits for accepted records to be written or exhaust retries before releasing database resources

Limits count records rather than bytes. If a database operation never completes, shutdown still waits for the real in-flight operation. Saturation can lose records, and uncertain commit outcomes can cause duplicates on retry. Durable auditing needs a separately designed persistent queue, idempotency, and retention policy.

## Graceful shutdown and failed startup

A unified runtime owner handles cleanup. Jobs and plugins stop before job, messaging, and cache resources are released; Trace is drained last. If one cleanup step fails, later steps are still attempted. Allow a suitable deployment termination grace period and verify that plugin stop hooks cannot wait forever.

`BuildAsync` failures also attempt to release prepared resources. Do not swallow configuration, plugin, or scheduler initialization errors merely to make the process start. Preserve the original and cleanup exceptions for diagnosis.

## Diagnose by symptom

- Startup failure: check main YAML, AES key/IV, enabled modules, external connections, then plugin-registration errors
- HTTP 401: check access token, issuer template, audience, signing keys, expiration, and server time; then check the [Asgard claim contract](/en/asgard/docs/security/): nonblank `sub`, backend-service `client_id` with no nonblank `user_id`, and `user_id` when raw `token_type` is exactly `UserLogin`. A cryptographically valid JWT can still fail convention validation
- HTTP 403: inspect permission rules and tenant data scope rather than weakening authentication
- HTTP 429: distinguish instance, IP, and user layers; verify the restored client IP behind a proxy
- Rejected data access: check explicit tenant scope; background work does not automatically receive platform access
- Stalled messages: inspect unacknowledged deliveries, confirm/unroutable failures, and the actual dead-letter destination; recover the connection/channel as described in [infrastructure](/en/asgard/docs/infrastructure/)
- Jobs not running: confirm host Start, valid triggers, and resolvable dependencies; restarting does not restore dynamic in-memory jobs
- Missing Trace: check capture policy, queue rejection, and database-write diagnostics rather than concluding that no request occurred

## Before handoff

Run compilation, application tests, negative identity/tenant tests, real-dependency smoke tests, and graceful shutdown against the deployment candidate. Record executed commands, results, and unverified items. Source inspection is not a production runtime test.

## Source references

These links point to the implementation. Repository access is required to open the source.

- [Token convention failures after JWT validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.AspNetCore.Core/Identity/AsgardTokenConventionValidator.cs)
- [Host runtime ownership](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/AsgardRuntimeLifetime.cs)
- [Host build cleanup](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs)
- [Health-check registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs)
- [Log configuration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Logging/LogConfig.cs)
- [Trace capture options](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Tracing/TraceOptions.cs)
- [Trace masking boundaries](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.AspNetCore.Core/Tracing/AsgardTraceQueueItemFactory.cs)
- [Trace delivery and shutdown behavior](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/24-日志与可观测性.md)
- [Development TsGen endpoint](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.TsGen.cs)
