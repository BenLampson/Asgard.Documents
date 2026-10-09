---
title: "Run your first API"
description: "Create a minimal plugin, service, controller, and response using current source"
order: 20
section: "Getting started"
---

This application listens only on the local machine and needs no database, Redis, or RabbitMQ. Install .NET SDK 10.0.401 and Git, and obtain access to the Asgard repository. Project references use the current source without assuming NuGet publication status.

## 1. Create adjacent projects

Run in an empty working directory:

```bash
git clone https://github.com/BenLampson/Asgard.git
dotnet new web -n MyAsgardApp --framework net10.0
cd MyAsgardApp
dotnet add reference ../Asgard/src/Plugins/Asgard.PluginSdk/Asgard.PluginSdk.csproj
```

`Asgard` and `MyAsgardApp` should share a parent directory. If you already have a source checkout, create the application and adjust the reference instead of overwriting your work.

## 2. Add configuration

Create `config/app.yaml`:

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

This example enables the plugin system with empty external-plugin and scan-directory lists, composing only the built-in plugin registered in code. Add this item group inside `Project` in `MyAsgardApp.csproj` so the configuration reaches both build and publish output:

```xml
<ItemGroup>
  <Content Include="config/app.yaml"
           CopyToOutputDirectory="PreserveNewest"
           CopyToPublishDirectory="PreserveNewest" />
</ItemGroup>
```

## 3. Add the plugin and API

Replace `Program.cs` and create the files below. Each business type has its own file. The service returns a DTO and the controller maps it to a public VO.

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

Three signatures matter: the plugin version is `System.Version`; service registration overrides `OnConfigureServicesAsync`; the API returns `ActionResult<Response<StatusVo>>`. The service produces a DTO and the controller maps it to the public VO.

## 4. Inject local keys and run

The host always registers security services. A valid AES key and IV are required even when every external module is disabled. The decoded key must contain 16, 24, or 32 bytes; the IV must contain 16 bytes. These commands create temporary development values in the current process environment. Do not print, commit, or reuse them as production configuration.

Bash, with OpenSSL installed:

```bash
export Asgard__Encryption__Key="$(openssl rand -base64 32)"
export Asgard__Encryption__Iv="$(openssl rand -base64 16)"
dotnet run --no-launch-profile
```

PowerShell 7:

```powershell
$env:Asgard__Encryption__Key = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:Asgard__Encryption__Iv = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
dotnet run --no-launch-profile
```

If the application persists encrypted data, keep the matching key in a secure configuration system. Regenerating it affects decryption of existing data. Manage production keys and rotation separately.

## 5. Check the result

- Open `http://127.0.0.1:5000/api/status` and confirm the success wrapper contains `Asgard is running`
- Open `http://127.0.0.1:5000/swagger` and find `GET /api/status`
- Check `/health`, `/health/ready`, and `/health/live`
- Stop with Ctrl+C and inspect graceful shutdown rather than killing the process

The shortcut includes exception handling and HTTPS redirection. This local example configures HTTP only; without an HTTPS endpoint, the redirect middleware may log a port diagnostic. Production deployments need correct HTTPS or trusted-proxy configuration.

## Troubleshooting

- Configuration file not found: check the working directory and copied `config/app.yaml`
- Invalid encryption settings: check both variables in the actual launching process, their Base64 format, and decoded length
- Missing controller in Swagger: confirm the controller is public, inherits `BaseController`, and the built-in plugin is registered
- Adding a database: configure persistence and repositories before enabling dependent business features; changing the switch alone is insufficient

Continue with [host and plugin architecture](/en/asgard/docs/architecture/) and [configuration](/en/asgard/docs/configuration/).

## Source references

These links point to the implementation. Repository access is required to open the source.

- [PluginBase lifecycle and version](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Plugin/PluginBase.cs)
- [Plugin startup helper](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Plugins/Asgard.PluginSdk/PluginWebAppDefaults.cs)
- [Controller return contracts](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions.AspNetCore/Controller/BaseController.cs)
- [Security startup registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs)
- [Encryption validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs)
- [Configuration normalization](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/SystemConfig/AsgardConfigurationRoot.cs)
