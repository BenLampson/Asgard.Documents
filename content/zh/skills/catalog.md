---
title: "完整技能目录"
description: "按任务查找全部 30 个 Asgard、Heimdall 与 .NET 技能及其职责边界。"
order: 30
section: "使用指南"
---

以下 **30 个技能**对应仓库中实际存在的全部 `skills/<name>/SKILL.md`。点击名称可直接阅读该技能的源码入口。按当前任务选择必要技能，再按入口中的说明读取参考文件。

目录说明的是技能的适用范围，不代表其中每个源码快照都与目标应用版本一致。接口、默认值与运行行为仍以目标项目的实际源码和测试为准。

## 框架入口与项目组织

| 技能 | 何时使用 |
| --- | --- |
| [asgard-framework-overview](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md) | 跨模块任务选择、宿主/插件/基础设施职责。模块已明确时直接读取专项技能。 |
| [asgard-dotnet-10-csharp-14](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-dotnet-10-csharp-14/SKILL.md) | Asgard C# 编码规则权威：文件规范、注释、DI 与更新规则。 |
| [asgard-plugin-structure](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-plugin-structure/SKILL.md) | 插件与 starter 的目录、项目依赖、GlobalUsings、模型与 Mapper 放置。 |
| [asgard-host-project](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-host-project/SKILL.md) | Program.cs、YggdrasilHost 启动、宿主钩子与内建插件承载。 |
| [asgard-plugin-development](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-plugin-development/SKILL.md) | PluginBase、内建插件入口、AddPluginConventions 与 plugin.yaml 装配。 |
| [asgard-plugin-lifecycle](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-plugin-lifecycle/SKILL.md) | 插件阶段、启动关闭顺序、状态与各阶段服务可用性；行为需核对实际主路径。 |
| [asgard-base-types](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-base-types/SKILL.md) | BaseController、Response、PluginBase、上下文、身份与审计实体的继承和字段。 |

## API、数据与配置

| 技能 | 何时使用 |
| --- | --- |
| [asgard-api-development](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-api-development/SKILL.md) | 业务 Controller、/api 路由、VO、统一响应与分页；授权表达式另用授权技能。 |
| [asgard-database](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-database/SKILL.md) | 数据库配置、FreeSql 实体与仓储、租户过滤、审计、软删除和乐观锁。 |
| [asgard-repository-service-registration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-repository-service-registration/SKILL.md) | RepositoryAttribute、程序集扫描、AddRepositories 与 PluginConventions 的 DI 注册。 |
| [asgard-configuration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-configuration/SKILL.md) | app.yaml、plugin.yaml、ConfigPath、强类型配置、占位符与加载优先级。 |
| [asgard-context-usage](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-context-usage/SKILL.md) | AbsAsgardContext 能力获取、可空性、生命周期、租户作用域与 Trace 备注。 |
| [asgard-host-features](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-host-features/SKILL.md) | host.* 的认证接线、中间件、CORS、Swagger、TsGen、限流与健康检查。 |

## 基础设施与可观测性

| 技能 | 何时使用 |
| --- | --- |
| [asgard-cache](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-cache/SKILL.md) | Redis 业务缓存 IAsgardCache、TTL、失效与关闭行为；不负责 OIDC/JWKS 内部缓存。 |
| [asgard-distributed-lock](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-distributed-lock/SKILL.md) | Redis IDistributedLock 装配、续租、LockLostToken 和安全释放。 |
| [asgard-messaging](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-messaging/SKILL.md) | RabbitMQ、MQConfig、发布订阅及交付相关指导；高级选项应核对实际实现。 |
| [asgard-job-scheduling](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-job-scheduling/SKILL.md) | JobConfig、cron/simple 触发器、运行时注册、插件作业装配和 Context 调用。 |
| [asgard-security](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-security/SKILL.md) | Encryption、PasswordHasher 与 KeyGenerator 的加密、密码哈希和密钥生成。 |
| [asgard-tracing-observability](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-tracing-observability/SKILL.md) | 请求 Trace、追踪持久化、数据库日志、查询服务与脱敏故障快照。 |

## 身份、权限与 Heimdall

| 技能 | 何时使用 |
| --- | --- |
| [identity-integration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/identity-integration/SKILL.md) | Web 登录、OIDC/PKCE、JWT 验签、前后端边界与 /userinfo 使用范围。 |
| [asgard-identity-userinfo](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-identity-userinfo/SKILL.md) | AbsAsgardUserInfo、标准 claims、身份快照、应用/租户字段和测试身份。 |
| [asgard-auth-authorization](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-auth-authorization/SKILL.md) | AsgardAuth 特性、DSL、角色、权限、scope 与 token_type；资源归属仍由业务校验。 |
| [asgard-mini-jwt-issuer](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-mini-jwt-issuer/SKILL.md) | 已有登录校验后的轻量 JWT 签发和 discovery/JWKS；不替代完整 OIDC、PKCE 或会话治理。 |
| [heimdall-service-integration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-service-integration/SKILL.md) | BackendService、client_credentials、只读目录、身份失效 Webhook 与撤销对账。 |
| [heimdall-application-rbac](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-application-rbac/SKILL.md) | Application Manifest、TenantApplication、应用管理员授权、应用域 RBAC 与版本 claims。 |
| [heimdall-mcp-management](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-mcp-management/SKILL.md) | /mcp、OAuth/AK-SK、工具/资源/任务、二阶段写确认、凭据策略与租户审计。 |

## 前端、测试与复查

| 技能 | 何时使用 |
| --- | --- |
| [asgard-admin-frontend](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-admin-frontend/SKILL.md) | Umi、Ant Design Pro、页面路由、DVA 和共享 API 调用；登录协议另用身份集成技能。 |
| [dotnet-unit-testing](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/dotnet-unit-testing/SKILL.md) | .NET/C# 单元测试、xUnit v3、fixtures、断言、mock 与测试命令。 |
| [asgard-backend-guard](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-backend-guard/SKILL.md) | 实现后的分层、响应、租户、审计与乐观锁复查；不替代模块开发技能。 |

## 通用 .NET 参考

| 技能 | 何时使用 |
| --- | --- |
| [dotnet-10-csharp-14](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/dotnet-10-csharp-14/SKILL.md) | 非 Asgard 的 .NET 10/C# 14 应用、Minimal API 和通用基础设施参考。 |

## 如何组合

- **CRUD API**：编码规则 + API 开发 + 数据库；涉及注册时加仓储/服务注册，完成后用后端复查
- **插件骨架**：项目结构 + 插件开发 + 宿主项目；需要启动阶段细节时加生命周期
- **SPA 登录**：身份集成 + 用户信息 + 宿主功能；管理页面实现再加前端技能
- **微服务身份**：Heimdall 服务集成 + 用户信息 + 授权；有应用域授权时加应用 RBAC
- **测试与交付**：对应模块 + 单元测试 + 后端复查，并实际运行目标项目检查

源码中的某些说明可能提到仓库外的专用技能，例如 `heimdall-production-release`。它不在上述 30 个目录中，也不会由本仓库安装器安装。

安装入口见[安装与验证](/zh/skills/docs/installation/)，完整执行步骤见[开发与复查流程](/zh/skills/docs/workflow/)。

## 源码依据

- [全部技能目录](https://github.com/BenLampson/Asgard.Skills/tree/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills)
- [模块选择](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
- [仓库外技能引用的校验边界](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/validate_skills.py)
