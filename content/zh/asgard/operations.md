---
title: "部署、观测与故障排查"
description: "把配置、健康检查、关闭语义与诊断落实到运行环境"
order: 70
section: "运行与维护"
---

上线前验证的是完整运行路径：配置加载、外部连接、插件初始化、第一条业务请求、后台工作和正常关闭。一个成功的编译或绿色自检端点不能替代这些检查。

## 发布与环境配置

以[快速开始](/zh/asgard/docs/quick-start/)的应用为例：

```bash
dotnet publish MyAsgardApp.csproj -c Release -o publish
cd publish
dotnet MyAsgardApp.dll
```

部署进程必须拥有所需环境变量和配置文件。发布前检查：

- `config/app.yaml` 与实际需要的环境配置包含在产物中，工作目录正确
- `ASPNETCORE_ENVIRONMENT` 或 `DOTNET_ENVIRONMENT` 指向预期环境，生产关闭详细错误
- AES Key/IV、数据库凭据、Redis 与 RabbitMQ 凭据从安全配置注入
- Kestrel 监听、TLS、代理转发和外部域名一致
- 私密数据不位于静态资源目录，Swagger 暴露范围符合部署策略
- 插件 DLL、依赖、配置和必要的数据目录随交付一起核对

不要把 Development 环境直接用于公网部署。`host.tsGen.enabled` 只在 Development 映射 `/asgard-tsgen`；生成的 TypeScript 文件视为产物，业务代码另放目录。

## 健康检查的含义

启用 `host.healthCheck` 后，默认提供总状态、ready 和 live 端点。宿主只内建一个带 `live`、`ready` 标签的 `self` 检查，其成功不证明外部服务可用。

为业务增加数据库、缓存或消息检查时，明确哪些故障应摘除就绪流量，哪些应重启进程。不要让一个短暂下游故障造成所有副本同时不断重启。部署验收还要执行一个具有真实依赖的业务请求。

## 日志与 Trace 分开配置

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

当前 `LogConfig` 没有总开关 `logging.enabled`，应分别配置输出目标。文件保留数不是磁盘容量上限，仍需监控空间和吞吐量。`logging.database` 控制普通日志入库；`Trace` 控制独立请求跟踪表，两者不是同一个开关。

- `Trace.Enabled: false`：不持久化 Trace，仍可创建请求内存上下文
- `Trace.Enabled: true` 且 `CaptureAllRequest: false`：写入错误及 5xx 请求
- `CaptureAllRequest: true`：正常请求也写轻量链路，但不采集正常请求体
- 仅识别出的请求头名称与可解析 JSON 字段会脱敏；查询字符串、非 JSON 请求体、无法解析或截断的 JSON 可能原样保存。必要时关闭请求体/请求头采集，URL 和自定义 note/tag 中永远不要传递秘密

排查请求时优先关联 Trace ID、路由、HTTP 方法、可信租户/主体、关键业务节点和异常。禁止把完整 token、密码或密钥贴入日志。

## Trace 投递不是可靠审计队列

当前持久化采用有界、尽力而为的后台投递：

- 等待队列最多 1,024 条；单个在途批次最多 1,024 条，实际批大小为 `min(Trace.BatchSize, 1024)`
- 请求入队不阻塞；队列满或已关闭时拒绝新记录并统计丢弃
- 每批最多写入三次，重试间隔为 50 毫秒、100 毫秒；耗尽后丢弃并继续消费后续批次
- 队列拒绝、重试、失败批次及清理失败等通过节流的 Serilog `SelfLog` 诊断报告
- 关闭时等待已接受记录写入或耗尽重试，再释放数据库资源

这些上限按记录数计，不是字节数；数据库调用本身若不结束，关闭仍会等待真实在途操作。队列饱和可能丢数据，提交结果不明确时重试可能重复。需要可靠审计时，应另行设计持久化队列、幂等性和保留策略。

## 正常关闭与异常启动

宿主的统一运行时所有者负责资源清理。先停止作业与插件，再释放作业、消息、缓存并最后排空 Trace；一个清理动作失败时仍尝试后续动作。保留足够的部署终止宽限期，并验证你的插件停止钩子不会无限等待。

`BuildAsync` 失败也会尝试释放已准备资源。不要为了“让服务先启动”吞掉配置、插件或调度器初始化失败；应保留原异常与清理异常用于诊断。

## 按症状定位

- 启动失败：先检查主 YAML、AES Key/IV、模块开关及外部连接，再查看插件服务注册异常
- API 返回 401：核对 Access Token、issuer 模板、audience、签名密钥、有效期与服务器时钟，再检查[Asgard 声明契约](/zh/asgard/docs/security/)：非空白 `sub`，后台服务令牌必须具有 `client_id` 且不能携带非空白 `user_id`，原始 `token_type` 精确为 `UserLogin` 时必须具有 `user_id`。JWT 的密码学验证通过后，仍可能因声明约定校验失败而拒绝认证
- API 返回 403：检查权限规则与数据租户范围，不通过放宽认证规避
- 返回 429：区分实例、IP、用户层，确认代理恢复的客户端 IP 正确
- 数据读取被拒：检查是否建立了显式租户范围，后台任务不能假设拥有平台访问权
- 消息停滞：检查未确认投递、confirm/unroutable 错误和实际死信目的队列；结合[基础设施指南](/zh/asgard/docs/infrastructure/)恢复连接/通道
- 作业没执行：确认宿主已 Start、触发器合法、依赖可解析；重启不会恢复动态内存作业
- 缺少 Trace：检查采集策略、队列拒绝与数据库写入诊断，不将缺记录等同于未发生请求

## 交付前检查

对当前部署候选运行编译、应用测试、身份与租户负向测试、真实依赖 smoke test 和正常关闭测试。记录实际执行的命令、结果及未验证项；不要把源码检查写成已运行的生产验证。

## 源码依据

以下链接指向对应实现；访问源码需要仓库权限。

- [JWT 验证后的令牌约定失败](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.AspNetCore.Core/Identity/AsgardTokenConventionValidator.cs)
- [Host runtime ownership](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/AsgardRuntimeLifetime.cs)
- [Host build cleanup](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs)
- [Health-check registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs)
- [Log configuration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Logging/LogConfig.cs)
- [Trace capture options](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Tracing/TraceOptions.cs)
- [Trace masking boundaries](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.AspNetCore.Core/Tracing/AsgardTraceQueueItemFactory.cs)
- [Trace delivery and shutdown behavior](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/24-日志与可观测性.md)
- [Development TsGen endpoint](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.TsGen.cs)
