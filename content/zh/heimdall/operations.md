---
title: 部署与运维 Heimdall
description: 准备 PostgreSQL、代理与签名配置，控制启动变更、维护任务、验收和回滚
order: 50
section: 部署运维
---

容器开始监听不代表部署已经可用。需要一起验证公开 Issuer、数据库结构、签名材料、管理登录、资源授权和恢复路径。

## 部署结构

仓库定义了两个镜像：

- `registry.cn-hangzhou.aliyuncs.com/benlampson/asgard.heimdall`：后端 OIDC、API、MCP 和 SCIM
- `registry.cn-hangzhou.aliyuncs.com/benlampson/asgard.heimdall.web`：Nginx 管理 SPA 及其 `/health` 端点

后端与 Web 必须来自同一源码提交，并部署同一不可变版本。记录两者解析后的镜像 digest；源码版本号或 Compose 默认值本身不能证明 Registry 中制品可用，也不能证明环境正在运行该版本。

随库 Compose 发布后端 `5000` 端口，在外部 `CoreServer` 网络暴露 Web `8080` 端口，以只读方式挂载后端 `app.yaml`、`plugin.yaml`，并挂载可写日志目录。它不会创建 PostgreSQL、Redis、RabbitMQ 或外部 Docker 网络。Web 镜像也不代理后端 API。

先准备这些依赖，把身份域名路由到后端，控制台域名路由到 Web 服务。检查后端发布端口的防火墙暴露范围，不能假定所有访问都经过反向代理。

`be/Docker/deploy.sh` 会拉取两个镜像并执行 Compose `up -d --remove-orphans`。应传入已经核实的明确版本：即使 Compose 有版本默认值，不带参数运行此脚本仍可能选择 `latest`。

### 为部署域名构建 Web 镜像

构建前，按[前端配置](/zh/heimdall/docs/configuration/)修改 `fe/config/config.prod.ts` 的全部七项：Authority、API Base URL、Public Origin、Client ID、登录回调、退出回调和 Scope。它们必须与后端 Issuer、注册的系统客户端、回调白名单和两类 CORS 一致。随库生产值使用仓库作者的域名和 Client ID。

当前 `fe/Dockerfile` 构建静态 `dist` 资源，再由 Nginx 提供服务，没有这些配置的运行时替换步骤。仅修改后端 YAML 或容器 `UMI_APP_*` 环境变量，会让旧值继续留在 bundle 中。必须从修改后的源码重新构建 Web 镜像，设置本次发布的不可变标签并部署该镜像；拉取未变化的上游 Web 镜像不会包含你的修改。

部署后，用新的浏览器会话检查 Network 请求：Discovery 应请求预期 Authority，管理 API 应请求预期 API Base，授权请求应携带预期 `client_id` 和精确的 `redirect_uri`。同时验证退出回调及实际请求的 Scope。平台登录与内置租户控制台登录要分别测试，两者的 Authority/Client 值不同。若仍出现旧主机或 Client ID，应先核对实际镜像 digest 和加载的 bundle，不要直接放宽后端认证策略。

## PostgreSQL 与启动边界

应用数据库以及使用时的数据库日志连接都应使用 PostgreSQL，它们是两个独立配置面。Heimdall 把应用 `DateTime` 和 `DateTimeOffset` 字段映射为 `timestamp(6) without time zone`，值按 UTC 处理。报表与维护脚本也要遵守该约定。

生产环境采用受控结构部署，并设置 `oidc.bootstrap.auto_sync_schema: false`。该开关禁用插件的 CodeFirst 表结构同步，**不代表启动只读**。启动仍会执行租户 CORS 回填、PostgreSQL 条件索引和数据兼容处理、运行时配置回填，以及内置 RBAC 和引导工作。

发布新可执行程序前：

1. 备份数据库并验证恢复方法
2. 对比目标实体、结构要求和当前真实数据库
3. 审查 `be/Database/Migrations` 下相关脚本，在启动前规划必要 DDL 和数据变化
4. 关闭自动同步时，预先创建所有必要表与列
5. 确认部署账号具有剩余启动操作所需权限
6. 在恢复副本上测试启动，检查迁移与引导日志

迁移目录提供针对性变更，不承诺某一个脚本能初始化空生产库的全部表。自动实体同步也不能替代语义数据迁移、兼容性检查和回滚计划。

### 运行时配置迁移

运行时配置迁移读取旧 `heimdall_system_settings`，把缺失的系统值写入 `heimdall_runtime_settings`，并记录 `heimdall_runtime_setting_history`。它使用分布式锁，跳过新存储中已经存在的配置值。

禁用同步时，必须先建好新表。遵循仓库 expand/contract 指南：兼容窗口内保留旧表，核对有效值和历史记录，所有节点及数据确认完成后再移除回滚路径。缺少表是发布阻塞，不能因此在生产库上随意打开自动同步。

### 管理员引导

默认管理员引导要求 Development 环境，或显式 `Oidc:Bootstrap:SeedDefaultAdmin=true`。创建尚不存在的管理员还需要提供密码。已有用户的引导会确保内置管理员角色，不会重置密码。

应把初次开通作为受控步骤，完成后移除引导 Secret。插件会捕获并记录管理员引导错误，所以进程成功启动不足以证明管理员可以登录。

## 反向代理、Issuer 与 Cookie

把 `oidc.issuer` 设置为公开 HTTPS Origin。从容器网络外部验证平台与租户 Discovery，`issuer` 和任何公布端点都不应泄漏内部主机名。

Authority 服务优先使用配置的 Issuer，缺失时使用请求的 scheme、host 和 path base。插件不会自行信任 forwarded headers；需要时在宿主配置可信代理和请求头处理，不能信任客户端任意提交的转发头。

身份 Cookie 使用 HttpOnly、SameSite `Lax`，其 `SecurePolicy=SameAsRequest`。配置 HTTPS Issuer 本身不会让 ASP.NET 收到的请求变成 HTTPS。必须通过部署后的代理检查真实 `Set-Cookie` 的 Secure 属性，并验证登录、同意和退出跳转。

## 签名密钥与维护任务

非 Development 环境需要系统 RSA 私钥。应持久保存、做好安全备份，并提供给预期实例。临时开发密钥会随重启变化，不适合稳定的令牌验证。

租户密钥轮换是独立机制。轮换作业读取以下运行时配置：

- `oidc.key_rotation.enabled`
- `oidc.key_rotation.retention_days`
- `oidc.key_rotation.interval_days`
- `oidc.key_rotation.rsa_key_size`

配置类型默认关闭轮换，旧密钥保留默认 30 天，周期回退为 7 天，生成 RSA 长度默认 2048 位。作业按激活后经过的时间判断周期，不能仅根据启动配置属性名 `rotate_before_expire_days` 把它理解成“临近到期才触发”。

激活新密钥后，旧租户密钥先进入退役保留期，再最终退役。保留期必须覆盖仍需旧公钥验证的令牌与验证端缓存；缩短前测试 JWKS 刷新行为。该作业不轮换系统签名密钥。

Token 清理与长期授权清理使用不同作业和启用开关。改变保留期前，用 `oidc.cleanup.dry_run` 检查命中数量。默认保留包括授权码过期后 1 天、Access Token 过期后 7 天、Refresh Token 终止后 30 天。确认调度器已启用且日志中确有作业执行，配置类本身不会启动任务。

## MCP 运维限制

`/mcp` 是经过认证的有状态管理端点。Bearer Token 必须属于内置管理应用；AK/SK 凭据属于用户，并受当前账号权限和凭据策略约束。AK/SK 不是绕过普通 REST API 权限的方式。

写工具先返回预览，再使用绑定调用者、工具与请求内容的一次性确认令牌。凭据 Secret 以及新生成的客户端、Webhook Secret 应直接进入密钥存储，不能写入审计日志。

当前注册使用 `InMemoryMcpTaskStore`：默认 TTL 为 24 小时，最长 7 天，全局任务上限 10,000，每会话上限 500。不能假定任务能跨进程重启恢复或在副本间共享。把横向扩容视为部署已支持能力之前，需要设计共享持久化任务存储，以及对应会话、限流和并发行为。

## 部署验收

在部署目录检查两个容器：

```bash
docker compose ps
docker inspect asgard-heimdall-starter --format '{{.Config.Image}} {{.State.Status}} {{.RestartCount}}'
docker inspect asgard-heimdall-web --format '{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}} {{.RestartCount}}'
```

随后检查：

- Web `/health` 和 SPA 资源；Web 健康检查不能证明后端或数据库就绪
- 公开的平台、租户 Discovery，精确 Issuer 和 JWKS
- 完整 PKCE 登录、当前账号 API、续期与退出
- 受保护 API 拒绝缺失 Token；错误 Audience、应用和租户也必须失败
- 清理和轮换策略、作业日志、签名密钥可用性，以及运行时配置有效值
- 真实下游服务能取得并使用绑定租户的令牌

仓库提供的验证命令包括：

```powershell
dotnet test --project be/Test/Asgard.Heimdall.Tests/Asgard.Heimdall.Tests.csproj -c Release
cd fe
npm run typecheck
npm run lint
npm run build
```

PostgreSQL 兼容性测试通过 `HEIMDALL_TEST_POSTGRES` 指向独立、可丢弃的测试数据库，绝不能指向生产。

## 回滚

发布前记录旧后端、Web 镜像 digest，以及配置、代理配置和数据库状态。应用回滚时同时恢复两套镜像，再重复公开协议与登录检查。

应用回滚不会撤销数据库迁移。切回旧程序前，要确认它能读取新结构和数据。如果 contract 迁移已经删除兼容数据，应通过经过审查的恢复方案补齐或还原，不能假定换回旧镜像就足够。

## 源码依据

- [生产前端配置](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/config/config.prod.ts)
- [静态 Web 镜像构建](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/Dockerfile)
- [控制台 Authority 与客户端解析](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/src/services/oidcConfig.ts)
- [Compose 拓扑](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Docker/docker-compose.yaml)
- [部署脚本](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Docker/deploy.sh)
- [容器部署与回滚](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Docker/README.md)
- [启动顺序与结构同步范围](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/OidcPlugin.cs)
- [PostgreSQL 时间映射](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Support/PostgreSqlEntityMapping.cs)
- [运行时配置迁移](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Platform/RuntimeSettingsMigrationService.cs)
- [运行时配置上线指南](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Database/Migrations/README.runtime-settings.md)
- [管理员引导](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/DefaultAdminBootstrapService.cs)
- [身份 Cookie 配置](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Infrastructure/OidcServerConfig.cs)
- [租户密钥轮换作业](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Jobs/RotateTenantOidcKeysJob.cs)
- [清理作业](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Jobs/OidcTokenCleanupJob.cs)
- [MCP 任务存储注册](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Extensions/HeimdallModuleRegistrationExtensions.cs)
- [MCP 认证与确认](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/mcp-management.md)
- [构建与测试命令](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/README.md)
