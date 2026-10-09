---
title: "开发与复查流程"
description: "按任务加载技能、核对真实接口、实施改动，并用测试和后端复查完成验证。"
order: 40
section: "使用指南"
---

一次可靠的 AI 开发任务需要同时做到：选对技能、读到目标源码、保留业务边界，并实际验证结果。技能安装成功只是起点。

## 1. 先确定任务和项目事实

先让助手确认目标仓库、要修改的项目、现有分层、依赖版本和相关测试。已有双项目结构时，应保留插件主体与 starter 的分工。

模块不明确时，先用 `asgard-framework-overview` 选择入口；问题已经明确属于缓存、数据库、身份或其他模块时，直接读取对应技能。

```text
使用 $asgard-framework-overview 分析本项目。
先读取项目包引用和构建配置，确认插件主体、starter 与当前任务所属模块。
列出需要读取的技能和源码入口，不要为了套用模板升级依赖。
```

不要只根据目录名推断版本。技能中的源码拷贝与目标项目不一致时，优先使用目标源码，并在结果中说明影响到的接口或行为。

## 2. 加载最小必要组合

从[完整目录](/zh/skills/docs/catalog/)选择入口后，读取该技能要求的参考文件。Asgard C# 使用 `asgard-dotnet-10-csharp-14`；目录组织使用 `asgard-plugin-structure`；具体业务行为继续由专项技能负责。

| 任务 | 技能组合 |
| --- | --- |
| 新建插件与 starter | 项目结构、插件开发、宿主项目、Asgard 编码规则 |
| 修改 CRUD API | API 开发、数据库、Asgard 编码规则；需要时加仓储/服务注册 |
| 增加授权条件 | 授权、用户信息；涉及登录链路时加身份集成 |
| 使用缓存或锁 | 缓存或分布式锁、上下文；核对目标项目注册与可用性 |
| 接入 Heimdall 微服务 | 服务集成、用户信息、授权；按需加载应用 RBAC |
| 修改管理页面 | 管理前端；协议设计加身份集成，后端改动加 API 开发 |

部分技能会明确要求先读完整契约。例如 `heimdall-application-rbac` 指向领域契约与复查清单，`heimdall-service-integration` 指向集成指南及各场景文档。不要只读取它们的简短 description 就开始生成实现。

## 3. 在真实边界内实现

后端实现应落实以下复查项：

- 业务 Controller 继承 `BaseController`，对外业务路由以 `/api` 开头
- 按 `Controller -> Service -> Repository -> Entity` 分层；Service 产出 DTO，Controller 映射为 VO 并包装统一响应
- 更新实体先查询数据库当前实体，再应用允许修改的字段；不能把 DTO 重建的实体直接交给乐观锁更新
- 不让前端输入覆盖租户归属、审计字段或持久化版本字段
- 身份模型与测试身份沿用 `AbsAsgardUserInfo` 和标准 claims 契约
- 授权特性不替代业务资源归属校验
- 使用可选基础设施前检查实际注册与关闭行为，不能假设所有 Context 能力始终可用

例如，明确要求助手完成一个更新操作时，可以这样描述：

```text
使用 $asgard-dotnet-10-csharp-14、$asgard-api-development 和 $asgard-database，
为当前业务实体实现更新接口，并沿用仓库现有目录和映射方式。
先查当前实体，只修改业务允许字段，保留租户、审计和乐观锁语义。
完成后使用 $asgard-backend-guard 复查，并运行相关测试。
```

这里的提示词是工作方式示例，实体、权限、允许字段和测试范围仍由实际任务决定。

## 4. 把身份与客户端边界单独验证

涉及身份时，不要把“Token 可解析”当作集成完成。按相关技能核对 issuer、audience、签名、有效期、`token_type`、scope、tenant 与业务授权边界，并测试错误身份或越权请求。

- 浏览器 OIDC 登录按 `identity-integration` 设计 Authorization Code + PKCE，不在浏览器嵌入 Client Secret
- API 使用 Access Token；ID Token 不作为 API 凭据
- 标准 claims 和测试身份由 `asgard-identity-userinfo` 约束
- `asgard-mini-jwt-issuer` 面向已有登录校验后的签发，不承担完整 OIDC、PKCE、刷新或会话撤销
- 管理前端沿用项目选定的共享 API 客户端方案；只有项目选择 TsGen 时才使用对应生成目录，并把生成目录保持为纯生成内容

这些是任务验收项。具体配置键、端点和运行行为要继续对照当前 Asgard 或 Heimdall 实现。

## 5. 实施后复查并运行测试

新增或修改 `Controller / Service / Repository / Entity / DTO / VO`，或涉及 `TenantId`、`Version`、删除与恢复、响应封装时，使用 `asgard-backend-guard`。

复查结果先列出 bug、风险、回归或缺失测试，并定位文件、方法及触发条件。真正影响数据或权限的问题应优先于风格建议。没有明确问题时，也应列出未验证范围。

测试任务加载 `dotnet-unit-testing`，按项目现有命令运行编译、单元测试及相关集成验证。该技能要求新测试使用 xUnit v3；修改现有测试项目时，应先确认其迁移规则与本次任务边界，不要把更换测试框架藏进无关改动。

建议按任务选择验证场景：

- 正常输入与错误输入
- 跨租户访问和权限不足
- 并发更新、删除或恢复冲突
- 依赖模块关闭或不可用
- 生成客户端重新生成后仍可编译

只改技能内容时运行 `python -X utf8 scripts/validate_skills.py`；改了应用代码还必须运行应用自己的检查。技能校验通过不能替代编译、测试或真实协议联调。

## 6. 交付可复核结果

让助手输出：

1. 改动了什么，涉及哪些文件和行为
2. 使用了哪些技能、接口与实际源码依据
3. 哪些命令执行成功，哪些失败或没有运行
4. 仍需验证的配置、外部依赖和风险
5. 若技能快照与实现有差异，说明采取了哪个实现以及原因

一次任务的完成依据是可检查的代码与验证结果，不是助手是否声称“已遵循全部规范”。安装排查见[安装与验证](/zh/skills/docs/installation/)。

## 源码依据

- [任务与版本选择](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
- [编码与更新规则](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-dotnet-10-csharp-14/SKILL.md)
- [后端复查与输出要求](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-backend-guard/SKILL.md)
- [身份集成边界](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/identity-integration/SKILL.md)
- [mini issuer 范围](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-mini-jwt-issuer/SKILL.md)
- [前端客户端策略](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-admin-frontend/SKILL.md)
- [测试规则](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/dotnet-unit-testing/SKILL.md)
- [Heimdall 服务集成阅读入口](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-service-integration/SKILL.md)
