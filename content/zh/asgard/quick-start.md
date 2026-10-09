---
title: "运行第一个 API"
description: "用当前源码创建含插件、服务、Controller 与统一响应的最小应用"
order: 20
section: "入门"
---

本例创建仅监听本机的 API，不连接数据库、Redis 或 RabbitMQ。需要 .NET SDK 10.0.401、Git，以及 Asgard 源码访问权限。使用项目引用，可以明确采用当前源码，而不预设 NuGet 发布状态。

## 1. 创建相邻项目

在空工作目录执行：

```bash
git clone https://github.com/BenLampson/Asgard.git
dotnet new web -n MyAsgardApp --framework net10.0
cd MyAsgardApp
dotnet add reference ../Asgard/src/Plugins/Asgard.PluginSdk/Asgard.PluginSdk.csproj
```

`Asgard` 与 `MyAsgardApp` 应位于同一父目录。已存在源码目录时直接创建应用并调整引用路径，不要覆盖自己的项目。

## 2. 添加配置

创建 `config/app.yaml`：

```yaml
host:
  application:
    name: MyAsgardApp
    environment: Development
    detailedErrors: true
  kestrel:
    endpoints:
      http:
        url: "http://127.0.0.1:5000"
  auth:
    enabled: false
  swagger:
    enabled: true
    title: My Asgard API
    version: v1
    routePrefix: swagger
  healthCheck:
    enabled: true
    path: /health
    readyPath: /health/ready
    livePath: /health/live
  staticFiles:
    enabled: false
plugin:
  enabled: true
  plugins: []
  scanDirectories: []
  enableHotReload: false
database:
  enabled: false
caching:
  enabled: false
messaging:
  enabled: false
job:
  enabled: false
logging:
  minimumLevel: Information
  console:
    enabled: true
  file:
    enabled: false
```

本例启用插件系统，但将外部插件列表与扫描目录设为空，仅装配代码中注册的内建插件。将以下节点加入 `MyAsgardApp.csproj` 的 `Project` 内，保证运行与发布目录都有配置：

```xml
<ItemGroup>
  <Content Include="config/app.yaml"
           CopyToOutputDirectory="PreserveNewest"
           CopyToPublishDirectory="PreserveNewest" />
</ItemGroup>
```

## 3. 添加插件与 API

替换 `Program.cs`，并按下面路径创建文件。每个业务类型单独放置，服务返回 DTO，Controller 映射对外 VO。

`Program.cs`:

```csharp
using Asgard.PluginSdk;

await PluginWebAppDefaults.RunAsync<MyAppPlugin>();
```

`MyAppPlugin.cs`:

```csharp
using Asgard.Abstractions.Plugin;
using Asgard.Core.Plugin;
using Microsoft.Extensions.DependencyInjection;

/// <summary>示例业务插件，注册状态查询服务。</summary>
public sealed class MyAppPlugin : PluginBase
{
    /// <inheritdoc />
    public override string Id => "my-app";
    /// <inheritdoc />
    public override string Name => "My App";
    /// <inheritdoc />
    public override Version Version => new(1, 0, 0);

    /// <summary>在容器构建前注册插件服务。</summary>
    protected override Task OnConfigureServicesAsync(
        IPluginServiceConfigurationContext context,
        CancellationToken cancellationToken)
    {
        _ = context.Services.AddScoped<StatusService>();
        return Task.CompletedTask;
    }
}
```

`Models/StatusDto.cs`:

```csharp
/// <summary>服务层返回的状态数据。</summary>
public sealed record StatusDto(string Message);
```

`Models/StatusVo.cs`:

```csharp
/// <summary>API 对外暴露的状态模型。</summary>
public sealed record StatusVo(string Message);
```

`Services/StatusService.cs`:

```csharp
/// <summary>提供应用状态查询。</summary>
public sealed class StatusService
{
    /// <summary>返回供控制器映射的业务数据。</summary>
    public StatusDto GetStatus() => new("Asgard is running");
}
```

`Controllers/StatusController.cs`:

```csharp
using Asgard.Abstractions;
using Asgard.Abstractions.AspNetCore.Controller;
using Asgard.Abstractions.AspNetCore.Model;
using Microsoft.AspNetCore.Mvc;

/// <summary>将业务状态映射为统一 API 响应。</summary>
[Route("api/status")]
public sealed class StatusController(
    AbsAsgardContext context,
    StatusService service) : BaseController(context)
{
    /// <summary>获取应用状态。</summary>
    [HttpGet]
    public ActionResult<Response<StatusVo>> Get()
    {
        var dto = service.GetStatus();
        return Success(new StatusVo(dto.Message));
    }
}
```

注意三个契约：插件版本是 `System.Version`；服务注册重写 `OnConfigureServicesAsync`；API 返回类型是 `ActionResult<Response<StatusVo>>`。Service 返回 DTO，Controller 转成对外 VO。

## 4. 注入本地密钥并运行

宿主总会注册安全服务，即使外部模块全部关闭，也必须提供有效 AES Key 与 IV。Key 解码后必须为 16、24 或 32 字节，IV 必须为 16 字节。以下命令在当前进程环境生成临时开发值，不要打印、提交或复制为生产配置。

Bash（需要 OpenSSL）：

```bash
export Asgard__Encryption__Key="$(openssl rand -base64 32)"
export Asgard__Encryption__Iv="$(openssl rand -base64 16)"
dotnet run --no-launch-profile
```

PowerShell 7：

```powershell
$env:Asgard__Encryption__Key = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:Asgard__Encryption__Iv = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
dotnet run --no-launch-profile
```

如果应用将加密数据持久化，应通过安全配置系统保留匹配的密钥；重新生成会影响旧数据解密。生产环境单独管理密钥和轮换。

## 5. 验证运行结果

- 打开 `http://127.0.0.1:5000/api/status`，确认返回成功包装及 `Asgard is running`
- 打开 `http://127.0.0.1:5000/swagger`，确认出现 `GET /api/status`
- 打开 `/health`、`/health/ready` 与 `/health/live`，确认端点可访问
- 用 Ctrl+C 停止应用，检查正常关闭而非直接杀死进程

快捷入口默认包含异常处理和 HTTPS 重定向。本例只配置本地 HTTP，未配置 HTTPS 端点时可能输出重定向端口诊断；生产部署须正确配置 HTTPS 或可信代理。

## 常见问题

- 配置找不到：检查工作目录及 `config/app.yaml` 是否已复制
- 启动报告加密配置无效：检查当前启动进程的两个环境变量、Base64 格式及解码长度
- Controller 没出现在 Swagger：确认 Controller 为公开类型、继承 `BaseController`，且内建插件已注册
- 想启用数据库：先配置数据库与仓储，再启用相关业务；不要只修改开关

下一步阅读[宿主与插件架构](/zh/asgard/docs/architecture/)和[配置](/zh/asgard/docs/configuration/)。

## 源码依据

以下链接指向对应实现；访问源码需要仓库权限。

- [PluginBase lifecycle and version](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Plugin/PluginBase.cs)
- [Plugin startup helper](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Plugins/Asgard.PluginSdk/PluginWebAppDefaults.cs)
- [Controller return contracts](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions.AspNetCore/Controller/BaseController.cs)
- [Security startup registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs)
- [Encryption validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs)
- [Configuration normalization](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/SystemConfig/AsgardConfigurationRoot.cs)
