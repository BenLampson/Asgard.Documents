---
title: 本地启动 Heimdall
description: 启动身份服务和控制台，验证 Discovery、PKCE 登录、API 访问、续期与退出
order: 20
section: 开始使用
---

本指南使用有权访问的 `Asgard.Heimdall` 源码和可丢弃的本地环境。后端地址为 `http://localhost:5000`，控制台地址为 `http://localhost:3000`。

## 1. 准备依赖

- 安装仓库 `global.json` 选择的 .NET SDK：`10.0.401`，补丁滚动策略为 `latestPatch`
- 安装与控制台包依赖兼容的 Node.js 和 npm
- 准备 PostgreSQL、Redis 和 RabbitMQ；本地指南使用端口 `5432`、`6379` 和 `5672`
- 使用独立的本地 PostgreSQL 数据库，不能连接生产库

服务启动前基础设施必须已经就绪。后面的启动命令不会自动创建这些依赖。

## 2. 检查本地配置

插件项目包含 `be/Asgard.Heimdall/app.yaml` 和 `be/Asgard.Heimdall/plugin.yaml`，构建时会复制到输出目录。Starter 会把工作目录切换到输出目录；第一个启动参数可以指定宿主配置路径，未指定时使用可执行文件旁的 `app.yaml`。

启动前完成以下配置：

1. 数据库 provider 使用 `PostgreSQL`，提供本地连接、加密材料和可写日志路径
2. `oidc.issuer` 设置为 `http://localhost:5000`
3. 使用 public 类型的系统客户端 `asgard_default`，不配置 Client Secret
4. 注册 `http://localhost:3000/callback` 和 `http://localhost:3000/logout-complete`
5. 在宿主 API CORS 与系统客户端 OIDC CORS 中分别允许 `http://localhost:3000`
6. 仅对这个可丢弃的本地数据库启用 `oidc.bootstrap.auto_sync_schema`

随库开发 YAML 启用了表结构同步，并包含示例签名与配置材料，不要复制到生产。配置类型中表结构同步的默认值为 `false`，开发文件显式覆盖了它。

## 3. 引导创建本地管理员

默认管理员引导只在 Development 环境，或 `Oidc:Bootstrap:SeedDefaultAdmin` 显式为 `true` 时运行。管理员尚不存在且未提供密码时，会跳过创建。默认用户名为 `asgard`。

在 PowerShell 中交互输入初始密码，然后启动宿主：

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Oidc__Bootstrap__SeedDefaultAdmin = 'true'
$password = Read-Host 'Local bootstrap password' -AsSecureString
$env:Oidc__Bootstrap__DefaultAdminPassword = [System.Net.NetworkCredential]::new('', $password).Password

dotnet run --project be/Asgard.Heimdall.Starter/Asgard.Heimdall.Starter.csproj
```

密码会进入后端进程环境，因此只在可信本机使用。首次创建成功并停止宿主后，清除引导变量再进行后续启动：

```powershell
Remove-Item Env:Oidc__Bootstrap__DefaultAdminPassword
Remove-Item Env:Oidc__Bootstrap__SeedDefaultAdmin
Remove-Variable password
```

引导不是密码重置功能。已存在的管理员不会按本次提供的密码重新创建。

## 4. 启动控制台

在仓库根目录另开终端：

```powershell
cd fe
npm install
npm run dev
```

必须使用 `npm run dev`。它固定使用 **3000** 端口，占用时会明确失败。不要自动切到其他端口，注册回调和环境变量必须保持一致。停止进程前先确认它属于哪个项目。

打开 `http://localhost:3000/test-lab`。

## 5. 验证完整身份链路

1. 打开 `http://localhost:5000/.well-known/openid-configuration`，确认 `issuer` 精确等于本地 Authority，端点指向后端
2. 打开 `http://localhost:5000/.well-known/jwks`，确认可获取公开签名密钥
3. 在测试台检查公开端点，并使用引导管理员发起登录
4. 确认 Authorization Code + PKCE 回到 `/callback` 并完成令牌兑换
5. 检查 UserInfo、Bearer 当前账号 API 和活动会话
6. 测试续期；请求 `offline_access`，并为客户端配置 Refresh Token 能力
7. 执行完整退出，确认回到注册的 `/logout-complete` 地址

随库宿主配置在 `/swagger` 提供 Swagger。受保护 API 必须使用 **Access Token**。不要把令牌粘贴到问题报告、截图或第三方解码网站。

## 接入第一个业务应用

租户应用需要先创建或启用应用绑定，再在租户内注册 public OIDC client。登记精确回调地址和前端 Origin。在 OIDC 客户端库中配置租户 Authority、已注册的 Client ID、`response_type: 'code'` 和所需 Scope，由库处理 Discovery、S256 PKCE、`state` 和回调校验。

租户客户端使用 `https://idp.example.com/{tenantId}`，不能沿用平台 Authority。应用需要调用独立 API 时，先完成[资源 Audience 配置](/zh/heimdall/docs/security/)，不能仅以登录成功判断 API 接入完成。

## 启动或登录失败时

- 没有管理员：检查引导环境和密码，再检查引导日志；端口已监听不代表管理员已创建
- 缺少数据表：检查实际选中的数据库与本地表结构同步配置
- Discovery 请求发到前端：检查 `UMI_APP_OIDC_AUTHORITY` / `UMI_APP_API_BASE_URL`，然后重启前端
- Token 兑换被 CORS 拒绝：检查客户端协议 Origin 列表
- `/api/**` 被 CORS 拒绝：检查宿主 API Origin 列表
- 登录后立即 `401`：检查是否使用 Access Token，以及 Issuer、Audience、有效期和系统时间
- 返回 `403`：检查权限与应用、租户关系，反复续期不能修复权限问题

继续阅读[配置指南](/zh/heimdall/docs/configuration/)与[生产运维指南](/zh/heimdall/docs/operations/)。

## 源码依据

- [本地启动与验收](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/local-manual-testing.md)
- [本地端口约定](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/AGENTS.md)
- [Starter 配置加载](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall.Starter/Program.cs)
- [配置复制规则](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Asgard.Heimdall.csproj)
- [管理员引导条件](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/DefaultAdminBootstrapService.cs)
- [OIDC 配置默认值](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Config/PluginConfigs/OidcPluginConfig.cs)
- [控制台 OIDC 配置](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/src/services/oidcConfig.ts)
- [SDK 选择](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/global.json)
