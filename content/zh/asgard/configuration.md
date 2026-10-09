---
title: "配置应用与模块"
description: "配置优先级、模块开关与启动时校验"
order: 40
section: "开发指南"
---

`config/app.yaml` 是应用配置入口。先从[快速开始](/zh/asgard/docs/quick-start/)的无外部依赖配置运行，再逐个启用模块。配置示例是需要合并的片段，不要在同一 YAML 文档重复定义多个 `host` 根节点。

## 加载顺序

后加入的配置覆盖前面的值：

1. 指定的主 YAML，例如 `config/app.yaml`
2. 同目录环境文件，例如 `config/app.Production.yaml`，可不存在
3. 进程环境变量
4. 命令行参数

环境选择顺序为 `ASPNETCORE_ENVIRONMENT`、`DOTNET_ENVIRONMENT`，最后使用主 YAML 的 `host.application.environment`。配置路径支持点号、冒号与环境变量双下划线规范化，例如 `caching__redis__connectionString` 对应 `caching.redis.connectionString`。

Builder 在合并前就读取并验证主文件的 Host 与引导日志设置，因此主 YAML 本身必须存在且有效。不要依赖后续环境覆盖来修复一个无法通过初始验证的主文件。

## 配置根与作用

- `host`：应用信息、Kestrel、静态文件、CORS、JWT、Swagger、TsGen、限流与健康检查
- `plugin`：外部插件发现与加载；显式内建插件由代码注册
- `database`：FreeSql 提供程序与连接
- `caching`：Redis 业务缓存
- `distributedLock`：复用 Redis 连接的锁选项
- `messaging`：RabbitMQ 消息配置
- `job`：Quartz 调度与配置作业
- `logging`：Serilog 控制台、文件和数据库日志
- `Trace`：独立请求 Trace 持久化
- `asgard.encryption`：安全服务所需 AES Key 和 IV

是否缺少一个可选配置节点，与节点存在但字段采用默认值，是两种情况。对 `host.auth`、`host.swagger` 等可选节点，明确设置 `enabled`，不要凭类型里某个默认值推断宿主已开启功能。

## Redis 缓存

```yaml
caching:
  enabled: true
  redis:
    connectionString: "localhost:6379"
    instanceName: "MyApp:"
    database: 0
    defaultExpirationMinutes: 30
```

`caching.enabled` 是业务缓存的总开关。启用时连接字符串不能为空，默认 TTL 和超时必须为正数，数据库编号范围为 0–15。启用后必须能够连接 Redis；关闭时宿主提供空缓存实现。

分布式锁在缓存启用且没有自定义 `IDistributedLock` 注册时自动装配。默认 `keyPrefix` 为 `lock:`，租期 30 秒，获取超时 5 秒，重试间隔 200 毫秒，自动续租开启。长任务须响应锁丢失信号。

## JWT 资源服务器

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

`issuerTemplate` 必须恰好包含一个 `{tenant}`。`audience` 必须与 Access Token 的某个 `aud` 值精确匹配。示例域名和 audience 需要替换为你的身份平台及 API 配置。完整边界见[安全与身份](/zh/asgard/docs/security/)。

## 静态文件与 OpenAPI

- `host.staticFiles.webRootPath` 默认 `wwwroot`，`requestPath` 默认空字符串
- 静态文件默认启用；`enableDefaultFiles` 默认 `false`，需要首页映射时显式打开
- 静态资源在认证之前处理，不能存放私密文件或密钥
- Swagger 需要 `host.swagger.enabled: true`；建议保持 `routePrefix: swagger`
- 当前代码修改 Swagger UI 的 `routePrefix`，但未同步修改 JSON 默认路由模板；不要只改 UI 前缀就认为部署路径已完整切换

## 限流与健康检查

`host.rateLimiting` 的平面配置控制单实例总量，`ip` 和 `user` 提供附加分区。支持 `FixedWindow`、`SlidingWindow` 与 `TokenBucket`；任何一层超限均返回 429。IP 来源为 `RemoteIpAddress`，反向代理须正确还原可信客户端地址。用户层位于身份中间件之后；匿名或缺少稳定主体的请求仍受实例与 IP 层限制。

健康端点默认路径为 `/health`、`/health/ready`、`/health/live`。宿主内建 `self` 检查不代表数据库、Redis 或 RabbitMQ 已健康；按业务依赖追加检查。

## 密钥和配置验证

`asgard.encryption.key` 与 `asgard.encryption.iv` 必須是符合长度的 Base64 值。使用安全环境配置注入，而不是把真实值写入示例文件。应用自定义配置实现 `ISystemConfig`，使用 `[ConfigPath]` 绑定，并在 `Validate()` 中检查业务必需条件。

配置变更至少验证：启动成功、模块确实启用、错误输入明确失败、关闭模块后依赖方行为正确，以及配置文件确实包含在发布产物中。

## 源码依据

以下链接指向对应实现；访问源码需要仓库权限。

- [Configuration source order](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Configurator.cs)
- [Path normalization and merging](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/SystemConfig/AsgardConfigurationRoot.cs)
- [Host options](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs)
- [Cache validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Caching/CacheConfig.cs)
- [Distributed lock defaults](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/DistributedLocking/DistributedLockOptions.cs)
- [Encryption validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs)
