---
title: "Asgard.Skills 概览"
description: "把 Asgard 的模块约定、源码参考与复查流程交给 AI 编码助手。"
order: 10
section: "开始使用"
---

Asgard.Skills 是 Asgard 生态独立维护的 AI 技能仓库。它把框架约定、任务选择、源码参考和代码模板整理成可被编码助手读取的技能，覆盖 Asgard 后端、管理前端、Heimdall 身份集成和 .NET 测试。

当前仓库有 **30 个技能目录**。可以先[安装技能](/zh/skills/docs/installation/)，再从[完整目录](/zh/skills/docs/catalog/)中选择任务入口。

## 它解决什么问题

- 创建插件时，让助手知道插件主体、starter、配置与业务分层各自放在哪里
- 编写 API 时，把 `BaseController`、DTO/VO 转换、统一响应和授权边界纳入实现要求
- 接入基础设施时，先找到对应模块的配置、接口和使用注意事项
- 集成 Heimdall 时，区分登录协议、标准 claims、应用权限、微服务身份和 MCP 管理
- 修改后端后，使用专门的复查技能检查租户边界、审计字段和乐观锁更新

Skills 提供开发上下文与执行指导。安装它们不会安装 Asgard NuGet 包、运行宿主、配置身份提供方，也不会替你完成业务代码验证。

## 一个技能包含什么

每个技能的入口是 `skills/<name>/SKILL.md`。目录中的其他内容按该技能需要提供，并非每个目录都具备全部文件。

| 文件或目录 | 用途 |
| --- | --- |
| `SKILL.md` | 技能名称、简短用途、触发场景、核心约束与后续阅读入口 |
| `agents/openai.yaml` | 部分技能提供的显示信息和默认提示词 |
| `references/` | 详细说明、源码参考、协议契约或复查清单 |
| `templates/` | 按场景调整的代码或配置模板 |
| `assets/`、`examples/` 或目录内其他文件 | 个别技能提供的补充材料 |

按任务读取相关参考文件，避免把全部技能一次性塞进上下文。模板中的命名、版本、配置和依赖需要与目标项目核对，不能把参考文件当作当前运行库。

## 从哪里开始

| 当前任务 | 优先入口 |
| --- | --- |
| 不确定问题属于哪个模块 | `asgard-framework-overview` |
| 新建插件与 starter | `asgard-plugin-structure`，再选插件或宿主技能 |
| 编写 Asgard C# | `asgard-dotnet-10-csharp-14`，加对应模块技能 |
| 新增或修改业务 API | `asgard-api-development` |
| 接入登录、OIDC、PKCE 或 JWT 验签 | `identity-integration` |
| 接入已有登录后的轻量 JWT 签发 | `asgard-mini-jwt-issuer` |
| 复查后端改动 | `asgard-backend-guard` |
| 编写或修改 .NET 单元测试 | `dotnet-unit-testing` |

`dotnet-10-csharp-14` 是通用 .NET 技能。Asgard 的编码规则入口是 `asgard-dotnet-10-csharp-14`，两者的适用范围不能混淆。

## 与实际项目保持一致

先读取目标项目的包引用、中央包版本和构建配置，再选择适用的技能内容。**当前项目源码、配置类型和测试优先于技能中复制的源码快照**。发现差异时，指出具体接口或行为差异，再按目标实现完成任务；不要为套用模板自动升级依赖。

例如，缓存技能当前以 `IAsgardCache` 为入口，其目录也保留带有版本说明的参考材料。应继续核对实际项目中的缓存注册与关闭行为，而不是从旧参考文件复制接口。对消息重试、作业持久化、插件状态或中间件顺序等行为，也要追踪实际注册与执行路径。

静态校验能够检查技能文件结构、链接和部分 API 约束，不能证明助手已经加载技能、自动触发可靠，或生成的应用已经正确运行。完整闭环见[开发与复查流程](/zh/skills/docs/workflow/)。

## 源码依据

- [仓库说明](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/README.md)
- [任务选择与源码优先规则](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
- [Asgard 编码规则](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-dotnet-10-csharp-14/SKILL.md)
- [当前缓存入口](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-cache/SKILL.md)
- [静态校验器](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/validate_skills.py)
