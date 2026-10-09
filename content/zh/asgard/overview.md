---
title: "Asgard 概览"
description: "以插件组织业务，以统一宿主装配 .NET 应用能力"
order: 10
section: "入门"
---

Asgard 是基于 ASP.NET Core 的模块化应用框架。Yggdrasil 宿主负责配置、依赖注入、Web 管线及基础设施生命周期；插件负责业务能力。当前源码版本为 **6.0.2**，主项目使用 **.NET 10 / C# 14**；仓库开发 SDK 为 **10.0.401**。

## 从任务出发

- 创建第一个 API：从[快速开始](/zh/asgard/docs/quick-start/)运行不依赖数据库、Redis 或 RabbitMQ 的应用
- 组织正式项目：阅读[宿主与插件架构](/zh/asgard/docs/architecture/)，分离业务插件和部署入口
- 接入基础设施：按[配置](/zh/asgard/docs/configuration/)启用所需模块，再看[数据与异步任务](/zh/asgard/docs/infrastructure/)
- 接入身份平台：先明确 API 的 issuer、audience 和租户边界，再看[安全与身份](/zh/asgard/docs/security/)
- 使用 AI 辅助开发：安装[Asgard Skills](/zh/skills/docs/installation/)，按当前任务选择技能

## 框架提供什么

**宿主装配。** `YggdrasilHost.CreateBuilder(...)` 提供配置加载、服务注册和中间件钩子；`PluginWebAppDefaults.RunAsync<TPlugin>()` 提供内建插件的快捷启动路径。

**一致的 API。** Controller 继承 `BaseController`，使用 `Response<T>`、`PageResponse<T>`、`CursorResponse<T>` 统一输出。业务服务与仓储通过依赖注入组合。

**可选基础设施。** FreeSql 数据访问、Redis 业务缓存与分布式锁、RabbitMQ 消息以及 Quartz 作业按配置装配。启用开关不会替代外部服务的部署和权限配置。

**身份和可观测性。** 内建 JWT 资源服务器、租户上下文、AsgardAuth 权限检查、Serilog 日志和请求 Trace 为业务代码提供公共入口。

## 项目与包的职责

- `Asgard.Abstractions`：接口、实体、配置模型和公共契约
- `Asgard.Abstractions.AspNetCore`：Controller、响应模型、宿主与授权契约
- `Asgard.Core`：配置、插件、数据及基础设施实现
- `Asgard.AspNetCore.Core`：身份、租户、Trace 等 Web 实现
- `Asgard.Yggdrasil.AspNetCore`：应用宿主与启动编排
- `Asgard.PluginSdk`：插件开发依赖、约定和快捷启动
- `Asgard.TsGen`：从后端契约生成 TypeScript 客户端代码
- `Asgard.Analyzers`：构建期代码规范检查；分析器自身使用 `netstandard2.0` 以适配编译器宿主

这些是源码中的项目/包标识。选择发布包时仍需核对包源实际可用版本，避免把源码版本等同于所有包已经发布。

## 与 Heimdall、Skills 的关系

[Heimdall](/zh/heimdall/docs/overview/) 是独立演进的身份服务，负责租户、客户端和 OIDC/OAuth 流程；Asgard 可以作为业务资源 API 验证它签发的合适 JWT。两者独立管理依赖版本，不能因文档同站就假定框架版本相同。

[Skills](/zh/skills/docs/overview/) 把编码约束、场景流程与源码入口提供给 Agent。技能指引辅助实施，运行时源码和项目测试仍是判断 API 与行为的依据。

## 源码依据

以下链接指向对应实现；访问源码需要仓库权限。

- [Version and runtime](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Directory.Build.props)
- [SDK selection](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/global.json)
- [Framework entry points](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/README.md)
- [Plugin SDK dependencies](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Plugins/Asgard.PluginSdk/Asgard.PluginSdk.csproj)
