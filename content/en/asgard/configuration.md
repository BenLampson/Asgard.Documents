---
title: "Configure the application and modules"
description: "Configuration precedence, module switches, and startup validation"
order: 40
section: "Development"
---

`config/app.yaml` is the application configuration entry point. Start with the dependency-free [quick start](/en/asgard/docs/quick-start/), then enable one module at a time. The examples here are fragments to merge; do not repeat the `host` root in one YAML document.

## Loading order

Later sources override earlier values:

1. The specified main YAML, such as `config/app.yaml`
2. An optional environment file beside it, such as `config/app.Production.yaml`
3. Process environment variables
4. Command-line arguments

Environment selection checks `ASPNETCORE_ENVIRONMENT`, then `DOTNET_ENVIRONMENT`, then `host.application.environment` in the main YAML. Paths normalize dots, colons, and double underscores: `caching__redis__connectionString` maps to `caching.redis.connectionString`.

The builder reads and validates host and bootstrap-log settings before the merged configuration exists. The main file must therefore exist and be valid on its own. A later environment override cannot repair a main file that fails this initial validation.

## Configuration roots

- `host`: application details, Kestrel, static files, CORS, JWT, Swagger, TsGen, rate limiting, and health checks
- `plugin`: external plugin discovery and loading; code registers explicit built-in plugins
- `database`: FreeSql provider and connection
- `caching`: Redis business cache
- `distributedLock`: lock settings using the shared Redis connection
- `messaging`: RabbitMQ messaging
- `job`: Quartz scheduling and configured jobs
- `logging`: Serilog console, file, and database output
- `Trace`: independent request Trace persistence
- `asgard.encryption`: AES key and IV required by security services

An absent optional node differs from an existing node whose fields use defaults. Set `enabled` explicitly for optional host nodes such as `host.auth` and `host.swagger`; a default on a property type does not prove the host enabled that feature.

## Redis cache

```yaml
caching:
  enabled: true
  redis:
    connectionString: "localhost:6379"
    instanceName: "MyApp:"
    database: 0
    defaultExpirationMinutes: 30
```

`caching.enabled` is the business-cache switch. When enabled, the connection string is required, default TTL and timeouts must be positive, and the database index must be within 0–15. Redis must be reachable when enabled. The disabled host path supplies a null cache implementation.

When caching is enabled and no custom `IDistributedLock` is registered, the host also composes distributed locking. Defaults are `lock:` as the key prefix, a 30-second lease, a 5-second acquire timeout, a 200-millisecond retry interval, and automatic renewal. Long-running work must respond to lock-loss signals.

## JWT resource server

```yaml
host:
  auth:
    enabled: true
    jwt:
      issuerTemplate: "https://id.example.com/{tenant}/"
      audience: "orders-api"
      requireHttpsMetadata: true
      discoveryCacheMinutes: 60
      jwksCacheMinutes: 15
```

`issuerTemplate` must contain exactly one `{tenant}`. `audience` must exactly match one `aud` value in the access token. Replace the example domain and audience with your identity-provider and API configuration. See [security and identity](/en/asgard/docs/security/) for the full boundary.

## Static files and OpenAPI

- `host.staticFiles.webRootPath` defaults to `wwwroot`; `requestPath` defaults to an empty string
- Static files are enabled by default; `enableDefaultFiles` defaults to `false`, so enable it explicitly for index-file mapping
- Static assets are handled before authentication; never place private files or secrets there
- Swagger requires `host.swagger.enabled: true`; keep `routePrefix: swagger`
- The current code changes the Swagger UI prefix without changing the default JSON route template; changing only the UI prefix is not a complete path relocation

## Rate limiting and health checks

Flat `host.rateLimiting` fields govern instance-wide capacity; `ip` and `user` add partitioned limits. Supported policies are `FixedWindow`, `SlidingWindow`, and `TokenBucket`. Rejection by any layer returns 429. IP partitions use `RemoteIpAddress`, so a reverse proxy must restore the trusted client address correctly. User limiting runs after identity middleware; anonymous requests or requests without a stable subject still pass through instance and IP limits.

Default health paths are `/health`, `/health/ready`, and `/health/live`. The built-in `self` check does not establish database, Redis, or RabbitMQ health. Register checks for dependencies your application requires.

## Secrets and validation

`asgard.encryption.key` and `asgard.encryption.iv` must be Base64 values of valid decoded lengths. Inject them through secure environment configuration rather than committed examples. Application configuration types implement `ISystemConfig`, bind through `[ConfigPath]`, and validate business requirements in `Validate()`.

For a configuration change, verify startup, actual module activation, explicit rejection of invalid input, behavior when the module is disabled, and inclusion of configuration files in publish output.

## Source references

These links point to the implementation. Repository access is required to open the source.

- [Configuration source order](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Configurator.cs)
- [Path normalization and merging](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/SystemConfig/AsgardConfigurationRoot.cs)
- [Host options](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs)
- [Cache validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Caching/CacheConfig.cs)
- [Distributed lock defaults](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/DistributedLocking/DistributedLockOptions.cs)
- [Encryption validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs)
