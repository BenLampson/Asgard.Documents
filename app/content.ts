import { enInfrastructureDocs, zhInfrastructureDocs } from "./infrastructure-content";
import { enIdentitySecurityDocs, zhIdentitySecurityDocs } from "./identity-security-content";
import {
  enHeimdallOperationsDocs,
  enToolingDocs,
  zhHeimdallOperationsDocs,
  zhToolingDocs,
} from "./tooling-operations-content";
import { enHeimdallAdvancedDocs, zhHeimdallAdvancedDocs } from "./heimdall-advanced-content";
import { enHeimdallDisasterRecoveryDocs, zhHeimdallDisasterRecoveryDocs } from "./heimdall-disaster-recovery-content";
import { enHeimdallResourceServerRevocationDocs, zhHeimdallResourceServerRevocationDocs } from "./heimdall-resource-server-revocation-content";
import { enHeimdallReleaseDocs, zhHeimdallReleaseDocs } from "./heimdall-release-content";
import { enPackageDocs, zhPackageDocs } from "./package-content";
import {
  enAsgardIntegrationDocs,
  enHeimdallIntegrationDocs,
  zhAsgardIntegrationDocs,
  zhHeimdallIntegrationDocs,
} from "./integration-content";
import { enAiReadyDocs, zhAiReadyDocs } from "./ai-ready-content";
import {
  enAsgardLifecycleDocs,
  enHeimdallOperationsRunbooks,
  zhAsgardLifecycleDocs,
  zhHeimdallOperationsRunbooks,
} from "./lifecycle-operations-content";
import {
  enHeimdallTokenDocs,
  enRuntimeContractDocs,
  zhHeimdallTokenDocs,
  zhRuntimeContractDocs,
} from "./runtime-contract-content";
import { enConfigurationReferenceDocs, zhConfigurationReferenceDocs } from "./config-reference-content";
import { enConfigurationFieldReferenceDocs, zhConfigurationFieldReferenceDocs } from "./config-field-reference-content";
import {
  enInfrastructureConfigFieldDocs,
  zhInfrastructureConfigFieldDocs,
} from "./infrastructure-config-field-content";
import {
  enHostFeatureConfigFieldDocs,
  zhHostFeatureConfigFieldDocs,
} from "./host-feature-config-field-content";
import { enHeimdallManagementDocs, zhHeimdallManagementDocs } from "./heimdall-management-content";
import { enAsgardDeploymentDocs, zhAsgardDeploymentDocs } from "./asgard-deployment-content";
import {
  enAsgardExternalPluginOperationsDocs,
  zhAsgardExternalPluginOperationsDocs,
} from "./asgard-external-plugin-operations-content";
import {
  enAsgardKestrelTlsOperationsDocs,
  zhAsgardKestrelTlsOperationsDocs,
} from "./asgard-kestrel-tls-operations-content";
import { enHeimdallDeviceDocs, zhHeimdallDeviceDocs } from "./heimdall-device-content";
import { enApiContractDocs, zhApiContractDocs } from "./api-contract-content";
import {
  enHeimdallAccountSecurityDocs,
  zhHeimdallAccountSecurityDocs,
} from "./heimdall-account-security-content";
import {
  enHeimdallManagementApiDocs,
  zhHeimdallManagementApiDocs,
} from "./heimdall-management-api-content";
import { enAsgardCrudDocs, zhAsgardCrudDocs } from "./asgard-crud-content";
import { enTenantBackgroundDocs, zhTenantBackgroundDocs } from "./tenant-background-content";
import { enHeimdallCustomFrontendDocs, zhHeimdallCustomFrontendDocs } from "./heimdall-custom-frontend-content";
import {
  enAsgardObservabilityOperationsDocs,
  zhAsgardObservabilityOperationsDocs,
} from "./asgard-observability-operations-content";
import {
  enAsgardLoggingOperationsDocs,
  zhAsgardLoggingOperationsDocs,
} from "./asgard-logging-operations-content";
import { enHeimdallScimOperationsDocs, zhHeimdallScimOperationsDocs } from "./heimdall-scim-operations-content";
import {
  enHeimdallServiceIntegrationDocs,
  zhHeimdallServiceIntegrationDocs,
} from "./heimdall-service-integration-content";
import {
  enAsgardDatabaseOperationsDocs,
  zhAsgardDatabaseOperationsDocs,
} from "./asgard-database-operations-content";
import { enAsgardCacheOperationsDocs, zhAsgardCacheOperationsDocs } from "./asgard-cache-operations-content";
import {
  enAsgardDistributedLockOperationsDocs,
  zhAsgardDistributedLockOperationsDocs,
} from "./asgard-distributed-lock-operations-content";
import { enAsgardCorsOperationsDocs, zhAsgardCorsOperationsDocs } from "./asgard-cors-operations-content";
import {
  enAsgardMessagingOperationsDocs,
  zhAsgardMessagingOperationsDocs,
} from "./asgard-messaging-operations-content";
import { enAsgardJobOperationsDocs, zhAsgardJobOperationsDocs } from "./asgard-job-operations-content";
import {
  enAsgardSecurityOperationsDocs,
  zhAsgardSecurityOperationsDocs,
} from "./asgard-security-operations-content";
import { enAsgardTsGenOperationsDocs, zhAsgardTsGenOperationsDocs } from "./asgard-tsgen-operations-content";
import {
  enAsgardAnalyzersOperationsDocs,
  zhAsgardAnalyzersOperationsDocs,
} from "./asgard-analyzers-operations-content";
import {
  enAsgardIdentityAuthorizationOperationsDocs,
  zhAsgardIdentityAuthorizationOperationsDocs,
} from "./asgard-identity-authorization-operations-content";
import {
  enAsgardContextUsageDocs,
  zhAsgardContextUsageDocs,
} from "./asgard-context-usage-content";
import { enEcosystemOnboardingDocs, zhEcosystemOnboardingDocs } from "./ecosystem-onboarding-content";
import { enAsgardUpgradeDocs, zhAsgardUpgradeDocs } from "./asgard-upgrade-content";
import { enSkillsReleaseDocs, zhSkillsReleaseDocs } from "./skills-release-content";
import {
  enHeimdallApplicationRbacDocs,
  zhHeimdallApplicationRbacDocs,
} from "./heimdall-application-rbac-content";
import {
  enHeimdallQuickStartDocs,
  zhHeimdallQuickStartDocs,
} from "./heimdall-quick-start-content";
import { productForDocumentationSlug } from "../scripts/documentation-product.mjs";

export type Locale = "zh" | "en";
export type Product = "asgard" | "heimdall" | "skills";

export type DocSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: { label: string; href: string }[];
  code?: { language: string; value: string };
  note?: string;
};

export type DocPage = {
  slug: string;
  group: string;
  title: string;
  description: string;
  eyebrow: string;
  sections: DocSection[];
  relatedDocs?: { product: Product; docSlug: string; label: string }[];
};

const ecosystemArchitectureDiagram = `flowchart LR
  Portal["Ecosystem portal"] --> Asgard["Asgard framework"]
  Portal --> Heimdall["Heimdall OIDC"]
  Portal --> Skills["Asgard Skills"]
  Asgard --> Host["Yggdrasil host"]
  Host --> Plugins["Plugins"]
  Plugins --> API["Controller → Service → Repository"]
  Heimdall --> Tokens["Discovery / JWKS / Access Token"]
  Tokens --> API
  Skills -. "agent workflow" .-> Asgard
  Skills -. "agent workflow" .-> Heimdall`;

const asgardRuntimeDiagram = `flowchart TB
  App["Starter application"] --> Host["YggdrasilHost"]
  Host --> Pipeline["ASP.NET Core pipeline"]
  Pipeline --> Controller["BaseController"]
  Controller --> Service["Service / DTO"]
  Service --> Repository["Repository"]
  Repository --> Entity["Entity / database"]
  Host --> Context["AbsAsgardContext"]
  Context --> Infra["Cache · MQ · Jobs · Security · Trace"]`;

const heimdallIntegrationDiagram = `sequenceDiagram
  participant Browser as SPA / Browser
  participant H as Heimdall
  participant API as Asgard API
  Browser->>H: Authorization Code + PKCE
  H-->>Browser: Access Token
  Browser->>API: Bearer Access Token
  API->>H: Local Discovery / JWKS validation
  API-->>Browser: Unified Response<T>
  Note over API,H: API CORS and OIDC client CORS are separate boundaries`;

const quickStartProjectCode = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Asgard.PluginSdk" Version="5.1.3" />
  </ItemGroup>

  <ItemGroup>
    <None Update="app.yaml" CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
</Project>`;

const quickStartProgramCode = `using Asgard.PluginSdk;
using FirstAsgardApp;

await PluginWebAppDefaults.RunAsync<FirstAppPlugin>("app.yaml");`;

const quickStartPluginCode = `using Asgard.Core.Plugin;

namespace FirstAsgardApp;

/// <summary>
/// 第一个与宿主一同发布的内建插件。
/// </summary>
public sealed class FirstAppPlugin : PluginBase
{
    public override string Id => "first-asgard-app";
    public override string Name => "First Asgard App";
    public override Version Version => new(1, 0, 0);
}`;

const quickStartControllerCode = `using Asgard.Abstractions;
using Asgard.Abstractions.AspNetCore.Controller;
using Asgard.Abstractions.AspNetCore.Model;
using Microsoft.AspNetCore.Mvc;

namespace FirstAsgardApp.Controllers;

/// <summary>
/// 用于验证宿主、MVC 与统一响应契约。
/// </summary>
[Route("api/hello")]
public sealed class HelloController(AbsAsgardContext asgardContext)
    : BaseController(asgardContext)
{
    [HttpGet]
    public ActionResult<Response<string>> Get()
        => Success<string>("Hello from Asgard");
}`;

const quickStartYamlCode = `Asgard:
  Encryption:
    Key: "\${env:ASGARD_AES_KEY}"
    Iv: "\${env:ASGARD_AES_IV}"

plugin:
  enabled: true
  scanDirectories: []

logging:
  file:
    enabled: false

host:
  application:
    name: FirstAsgardApp
    version: 1.0.0
    environment: Development
  kestrel:
    endpoints:
      http:
        url: "http://127.0.0.1:5087"
  auth:
    enabled: false
  staticFiles:
    enabled: false
  swagger:
    enabled: true
    title: First Asgard App
    version: v1
    routePrefix: swagger
  healthCheck:
    enabled: true
    path: /health
    readyPath: /health/ready
    livePath: /health/live`;

const quickStartRunCode = `$key = [byte[]]::new(32)
$iv = [byte[]]::new(16)
[Security.Cryptography.RandomNumberGenerator]::Fill($key)
[Security.Cryptography.RandomNumberGenerator]::Fill($iv)
$env:ASGARD_AES_KEY = [Convert]::ToBase64String($key)
$env:ASGARD_AES_IV = [Convert]::ToBase64String($iv)

dotnet restore
dotnet run`;

const quickStartVerifyCode = `curl.exe http://127.0.0.1:5087/api/hello
curl.exe http://127.0.0.1:5087/health
curl.exe http://127.0.0.1:5087/swagger/v1/swagger.json`;

const hostCode = `var builder = YggdrasilHost.CreateBuilder("config/app.yaml")
    .UseBuiltInPlugin<MyPlugin>()
    .ConfigureMiddleware(app =>
    {
        _ = app.UseAsgardExceptionHandler()
            .UseHttpsRedirection();
    });

var host = builder.Build();
await host.RunAsync();`;

const pluginHostYamlCode = `plugin:
  enabled: true
  plugins:
    - id: orders-plugin
      path: "\${env:ORDERS_PLUGIN_DLL}"
      enabled: true
      dependencies: []
      autoScanRepositories: false
  scanDirectories:
    - path: plugins
      enabled: true
      recursive: false
      entryPointPattern: "*.Plugin.dll"
  enableHotReload: true
  loadTimeoutSeconds: 30
  enableIsolation: true
  dataDirectory: plugins-data
  excludePlugins: []`;

const pluginDefaultsCode = `plugin.enabled                                  false
plugin.plugins                                  []
plugin.plugins[].enabled                        true
plugin.plugins[].dependencies                   []
plugin.plugins[].autoScanRepositories           false
plugin.scanDirectories[0].path                  plugins
plugin.scanDirectories[0].enabled               true
plugin.scanDirectories[0].recursive             false
plugin.scanDirectories[0].entryPointPattern     *.Plugin.dll
plugin.enableHotReload                          true
plugin.loadTimeoutSeconds                       30
plugin.enableIsolation                          true
plugin.dataDirectory                            plugins-data
plugin.excludePlugins                           []`;

const builtInOnlyPluginYamlCode = `plugin:
  enabled: true
  scanDirectories: []`;

const controllerCode = `[Route("api/[controller]")]
public sealed class ProjectsController(ProjectService service) : BaseController
{
    [HttpGet("{id}")]
    public async Task<Response<ProjectVo>> GetAsync(string id)
    {
        var dto = await service.GetAsync(id);
        return Success(dto.ToVo());
    }
}`;

const configCode = `Database:
  Enabled: true
  Provider: PostgreSQL
  ConnectionString: "\${env:DATABASE_CONNECTION}"

Caching:
  Enabled: true
  Redis:
    Enabled: true
    ConnectionString: "\${env:REDIS_CONNECTION}"

host:
  swagger:
    enabled: true
    routePrefix: swagger
  healthCheck:
    enabled: true
    path: /health`;

export const docs: Record<Locale, DocPage[]> = {
  zh: [
    {
      slug: "overview", group: "开始", eyebrow: "ASGARD FRAMEWORK", title: "框架概览",
      description: "用统一宿主、插件模型和基础设施入口搭建模块化 ASP.NET Core 系统。",
      sections: [
        { id: "what", title: "Asgard 是什么", paragraphs: ["Asgard 是以 ASP.NET Core 为宿主的应用框架。它统一配置、插件、公共能力、认证授权、Swagger、静态资源与健康检查，让业务代码聚焦 API、服务、仓储和领域逻辑。", "当前框架版本为 5.1.3，目标框架是 .NET 10、语言基线是 C# 14，源码仓库通过 global.json 固定 SDK 10.0.302。核心入口是 YggdrasilHost、PluginBase、BaseController 与 AbsAsgardContext。"] },
        { id: "architecture", title: "生态架构", paragraphs: ["总览图把三个站点的职责和集成边界放在一起：Asgard 负责宿主与基础设施，Heimdall 负责标准身份，Skills 把工程规则交给 AI Agent。"], code: { language: "mermaid", value: ecosystemArchitectureDiagram } },
        { id: "modules", title: "核心组成", bullets: ["Asgard.Abstractions：跨宿主契约、配置模型与实体基类", "Asgard.Core：缓存、消息、任务、配置、安全与插件实现", "Asgard.AspNetCore.Core：Web、身份、租户与授权实现", "Asgard.Yggdrasil.AspNetCore：宿主编排入口", "Asgard.PluginSdk：插件开发与快速启动", "Asgard.TsGen / Analyzers：客户端生成与编译期规范"] },
        { id: "fit", title: "适合的系统", paragraphs: ["Asgard 适合需要标准 Web API、统一基础设施、多模块演进、租户与身份边界，以及希望让人类和 AI 使用同一套工程规则的 .NET 项目。它不是单一工具包，而是一套带宿主、上下文、插件和装配约定的开发框架。"] },
      ],
    },
    {
      slug: "quick-start", group: "开始", eyebrow: "5 MINUTES", title: "快速开始",
      description: "从空目录创建一个可编译、可启动、可通过 HTTP 验收的 Asgard 5.1.3 应用。",
      sections: [
        { id: "create", title: "创建项目", paragraphs: ["新建空目录并创建下列 FirstAsgardApp.csproj。快速路径只直接引用 Asgard.PluginSdk；它会传递宿主所需依赖。app.yaml 必须复制到输出目录。"], code: { language: "xml", value: quickStartProjectCode } },
        { id: "program", title: "启动内建插件", paragraphs: ["创建 Program.cs。RunAsync<TPlugin> 会创建 Yggdrasil 宿主、注册这个内建插件，并接入框架的推荐 Web 管道。它的默认配置路径是 config/app.yaml；本教程把文件放在项目根目录，因此显式传入 app.yaml。"], code: { language: "csharp", value: quickStartProgramCode } },
        { id: "plugin", title: "声明插件入口", paragraphs: ["创建 FirstAppPlugin.cs。最小 PluginBase 只需要稳定的 ID、显示名和版本；业务变复杂后再添加生命周期钩子。"], code: { language: "csharp", value: quickStartPluginCode } },
        { id: "controller", title: "添加第一个 API", paragraphs: ["创建 Controllers/HelloController.cs。Controller 继承 BaseController，并返回统一 Response<T>。字符串结果要显式调用 Success<string>(...)；Success(\"...\") 会被解释为只有 message 的无数据重载。"], code: { language: "csharp", value: quickStartControllerCode } },
        { id: "config", title: "写入最小安全配置", paragraphs: ["在项目根目录创建 app.yaml。Asgard 的加密服务会在标准宿主中无条件注册，因此 Key 与 Iv 不是可省略的演示项。示例只启用当前需要的 Swagger、健康检查和 HTTP 端点，清空外部插件扫描目录，并关闭默认文件日志以免教程在本地产生 logs 文件。"], code: { language: "yaml", value: quickStartYamlCode }, note: "不要把真实密钥提交到仓库。Key 必须是 Base64 编码的 16、24 或 32 字节；Iv 必须是 Base64 编码的 16 字节。不要写 host.cors.enabled: false：只要创建 cors 节点，当前验证器仍会校验 defaultPolicy；不用 CORS 时应完全省略 host.cors。" },
        { id: "run", title: "生成本地密钥并启动", paragraphs: ["在 PowerShell 中为当前进程生成一次性开发密钥，然后还原并运行。生产环境应由密钥管理服务或部署系统注入这两个环境变量。"], code: { language: "powershell", value: quickStartRunCode } },
        { id: "verify", title: "用 HTTP 验收", paragraphs: ["另开终端执行以下命令。/api/hello 应返回 code 200、message 操作成功和 data Hello from Asgard；/health 返回 Healthy；Swagger JSON 应包含 /api/hello。/health/ready 与 /health/live 也应返回 200。"], code: { language: "powershell", value: quickStartVerifyCode }, note: "PluginWebAppDefaults 当前固定启用 UseHttpsRedirection。只有 HTTP 端点时，首个请求会记录“Failed to determine the https port for redirect”警告，但不会阻止 HTTP 返回 200；生产环境应配置 HTTPS 终止方式。" },
        { id: "next", title: "下一步怎么选", bullets: ["继续单体模块：在插件内增加 Service、Repository、Entity 与配置", "需要第三方服务注册、生命周期钩子或精确中间件顺序：切换到 YggdrasilHost.CreateBuilder(...) 完整宿主", "接入基础设施前先阅读数据库、缓存、消息与作业专题，不要只打开 enabled", "接入 Heimdall 时使用 Authorization Code + PKCE，并让下游 API 校验 Access Token"] },
      ],
    },
    ...zhPackageDocs,
    {
      slug: "host-and-plugins", group: "框架", eyebrow: "RUNTIME", title: "宿主与插件",
      description: "理解 YggdrasilHost、内建插件、外部插件和生命周期边界。",
      sections: [
        { id: "host", title: "掌控宿主", paragraphs: ["YggdrasilHost 负责配置加载、框架服务注册、插件初始化和 Web 中间件编排。需要接入第三方 SDK、覆盖服务或精确控制管道时使用完整 Builder。"], code: { language: "csharp", value: hostCode } },
        { id: "plugin", title: "插件模型", bullets: ["内建插件与宿主一同编译，适合快速开发和强类型集成", "外部插件从配置路径或扫描目录加载，适合独立交付", "PluginBase 提供配置、日志、服务与 AsgardContext 的稳定入口", "外部程序集必须包含非抽象、可无参构造的 IPlugin 实现；同一程序集多个实现只会选择一个"] },
        { id: "configure", title: "在 app.yaml 配置外部插件", paragraphs: ["宿主的 plugin.* 只写在 Starter 的 app.yaml。插件自己的 plugin.yaml 保存插件强类型业务配置和 jobs，不要混放宿主发现规则。所有相对 path 都按进程当前工作目录解析。"], code: { language: "yaml", value: pluginHostYamlCode } },
        { id: "defaults", title: "完整字段与默认值", code: { language: "text", value: pluginDefaultsCode }, note: "即使根 plugin.enabled 或某个条目为 false，Validate() 仍会检查列表、超时、dataDirectory 与条目必填字段。它不验证文件存在、签名、哈希、重复 ID 或依赖闭环。" },
        { id: "discovery", title: "发现、依赖与注册", bullets: ["显式 plugins 先加载，并按完整路径去重；依赖图缺失、重复最终 ID 或循环会使构建失败", "扫描器检查 scanDirectories 下的一级子目录；recursive=true 表示在每个子目录内递归，不会发现扫描根目录直接放置的 DLL", "多个 entryPointPattern 匹配项选择顺序不稳定，应保证每个插件目录只有一个入口 DLL", "autoScanRepositories=true 只扫描 Repository 特性，不会扫描 Service；扫描目录条目没有该开关", "外部和内建程序集只在首次启动时加入 MVC ApplicationPart"] },
        { id: "built-in", title: "只使用内建插件时关闭意外扫描", paragraphs: ["UseBuiltInPlugin 会自动打开 plugin.enabled，但默认 scanDirectories 仍指向当前工作目录下的 plugins。若应用只交付内建插件，应显式清空扫描目录。"], code: { language: "yaml", value: builtInOnlyPluginYamlCode } },
        { id: "lifecycle", title: "生命周期真实边界", bullets: ["插件初始化与启动发生在 Build() 期间，不是 RunAsync 时；关闭按相反顺序执行", "ConfigureServices 或依赖图错误会阻止构建；Initialize/Start 失败会记录错误、跳过依赖插件，但宿主可以继续运行", "enableHotReload 当前没有文件监听接线，loadTimeoutSeconds 也没有施加真实超时", "ReloadAsync 不会重新执行 ConfigureServices、Start、plugin.yaml jobs、中间件、MVC ApplicationPart 或依赖图，不能描述为完整热更新", "enableIsolation 使用可回收 AssemblyLoadContext，但 DI、MVC 与描述符仍可能持有程序集引用；UnloadAsync 主要是逻辑停止/释放，不能保证物理卸载", "内建插件不支持 Reload"] },
        { id: "plugin-cors", title: "插件贡献默认 CORS Origin", paragraphs: ["当 host.cors.enabled=true 时，插件可在服务注册阶段注册 IPluginCorsContributor，把所需 Origin 追加到宿主默认策略。null、空串和纯空白项会忽略，完全相同的字符串会去重；命名策略不会被修改。该机制不会启用 CORS，也不会验证、规范化或 Trim Origin。", "插件因此能够扩大浏览器允许来源，应把贡献列表纳入受信任插件的发布审查。CORS 只约束浏览器跨源调用，不能替代认证、租户隔离与后端授权；默认策略已经 allowAnyOrigin 时，追加列表也不会收紧它。"] },
        { id: "trust", title: "外部 DLL 是受信任代码", paragraphs: ["当前加载器不校验签名或哈希。外部插件与宿主同进程运行，能够访问 DI、配置和进程权限；只加载来自受控发布链的 DLL，并在发布前固定哈希、最小化文件权限和完成回滚演练。"] },
        { id: "structure", title: "推荐项目结构", code: { language: "text", value: "MyApp.Plugin/\n  MyAppPlugin.cs\n  Controllers/ Services/ Repositories/ Entities/\n  plugin.yaml\n\nMyApp.Starter/\n  Program.cs\n  config/app.yaml" } },
      ],
    },
    {
      slug: "api-development", group: "框架", eyebrow: "WEB API", title: "API 开发",
      description: "按 Asgard 的分层、响应和授权约定编写稳定 API。",
      sections: [
        { id: "rules", title: "不可跳过的边界", bullets: ["Controller 必须继承 BaseController", "固定调用方向：Controller → Service → Repository → Entity", "Service 产出 DTO，Controller 映射为 VO", "返回 Response<T>、PageResponse<T> 或 CursorResponse<T>，不直接返回裸对象"] },
        { id: "example", title: "控制器示例", code: { language: "csharp", value: controllerCode } },
        { id: "authorization", title: "认证与授权", paragraphs: ["宿主通过 host.auth 接入 JWT Bearer。业务接口通过 AsgardAuth 属性与表达式组合角色、权限、Scope 和 token_type 条件；前端隐藏按钮只改善体验，后端授权才是安全边界。"] },
      ],
    },
    {
      slug: "infrastructure", group: "框架", eyebrow: "CAPABILITIES", title: "基础设施能力",
      description: "通过 AbsAsgardContext 统一访问缓存、分布式锁、数据库、消息、作业、安全与身份能力。",
      sections: [
        { id: "context", title: "统一上下文", paragraphs: ["Controller 可直接使用 AsgardContext，服务可注入 AbsAsgardContext，插件可在生命周期允许的阶段调用 GetAsgardContext()。能力由配置或显式 DI 注册启用；可选属性必须按能力不可用进行 null 安全处理。"] },
        { id: "capabilities", title: "能力清单", bullets: ["Cache：内存、Redis 与多级缓存", "DistributedLock：需显式注册的单逻辑 Redis 租约互斥", "Database：配置驱动的数据访问与仓储集成", "MessageQueue：RabbitMQ 基础发布订阅；重试、延迟与死信按消息专题的当前接线边界验收", "JobScheduler：简单触发器、Cron 与运行时任务", "Encryption / PasswordHasher / KeyGenerator：安全基础能力", "IdentityContext / TenantScopeFactory：身份快照与非 HTTP 租户作用域", "Trace：轻量链路、Notes、Tags 与错误快照"] },
        { id: "config", title: "配置示例", code: { language: "yaml", value: configCode }, note: "连接串和密钥应由环境变量或部署系统注入，不要提交真实凭据。" },
      ],
    },
    ...zhAsgardContextUsageDocs,
    ...zhInfrastructureDocs,
    ...zhAsgardLifecycleDocs,
    ...zhAsgardDeploymentDocs,
    ...zhAsgardExternalPluginOperationsDocs,
    ...zhAsgardKestrelTlsOperationsDocs,
    ...zhRuntimeContractDocs,
    ...zhApiContractDocs,
    ...zhAsgardCrudDocs,
    ...zhTenantBackgroundDocs,
    ...zhAsgardObservabilityOperationsDocs,
    ...zhAsgardLoggingOperationsDocs,
    ...zhAsgardDatabaseOperationsDocs,
    ...zhAsgardCacheOperationsDocs,
    ...zhAsgardDistributedLockOperationsDocs,
    ...zhAsgardCorsOperationsDocs,
    ...zhAsgardMessagingOperationsDocs,
    ...zhAsgardJobOperationsDocs,
    ...zhAsgardSecurityOperationsDocs,
    ...zhAsgardIdentityAuthorizationOperationsDocs,
    ...zhAsgardTsGenOperationsDocs,
    ...zhAsgardAnalyzersOperationsDocs,
    ...zhConfigurationReferenceDocs,
    ...zhConfigurationFieldReferenceDocs,
    ...zhInfrastructureConfigFieldDocs,
    ...zhHostFeatureConfigFieldDocs,
    ...zhAsgardIntegrationDocs,
    ...zhIdentitySecurityDocs,
    ...zhToolingDocs,
    ...zhAsgardUpgradeDocs,
    {
      slug: "heimdall", group: "生态", eyebrow: "IDENTITY PROVIDER", title: "Heimdall 身份平台",
      description: "基于 Asgard 的标准 OIDC/OAuth 2.0 身份提供者与多租户安全平台。",
      sections: [
        { id: "capabilities", title: "主要能力", bullets: ["OIDC Discovery、JWKS、Authorization Code + PKCE、Refresh Token、Client Credentials 与 Device Flow", "Application Manifest、Tenant Application、应用范围 RBAC/Grant 与版本化 Token Claims", "平台/租户用户、客户端、Scope、授权、同意与会话治理", "mini issuer 5.3.19：为已有登录逻辑的小项目签发 Asgard 兼容 JWT，并暴露 Discovery/JWKS", "5.3.x 完整受治理 MCP：OAuth/AK-SK、Tools、Resources、Prompts、Tasks、策略与两阶段写确认", "Tenant-bound Backend Directory 读写、身份失效 Webhook、SCIM、外部 OIDC、LDAP/AD、SAML、TOTP 与 Passkey", "安全事件生命周期、活动会话、SIEM 导出与 Asgard 链路追踪"], code: { language: "mermaid", value: heimdallIntegrationDiagram } },
        { id: "baseline", title: "运行边界", paragraphs: ["Heimdall 使用 .NET 10 / C# 14，生产主库仅支持 PostgreSQL，缓存使用 Redis，消息使用 RabbitMQ，数据访问使用 FreeSql。启动基础设施配置来自 YAML、环境变量或命令行；登录锁定等业务策略存储在数据库并可即时生效。"] },
        { id: "claims", title: "统一身份契约", bullets: ["sub / user_id / tenant_id", "roles / permissions / scope 使用 JSON 数组字符串", "userMetadatas / tenantMetadata 使用 JSON 对象字符串", "下游 Asgard 服务从 Access Token 恢复 AbsAsgardUserInfo"] },
      ],
    },
    ...zhHeimdallQuickStartDocs,
    ...zhHeimdallIntegrationDocs,
    ...zhHeimdallApplicationRbacDocs,
    ...zhHeimdallServiceIntegrationDocs,
    ...zhHeimdallCustomFrontendDocs,
    ...zhHeimdallOperationsDocs,
    ...zhHeimdallReleaseDocs,
    ...zhHeimdallOperationsRunbooks,
    ...zhHeimdallTokenDocs,
    ...zhHeimdallManagementDocs,
    ...zhHeimdallManagementApiDocs,
    ...zhHeimdallDeviceDocs,
    ...zhHeimdallAccountSecurityDocs,
    ...zhHeimdallAdvancedDocs,
    ...zhHeimdallDisasterRecoveryDocs,
    ...zhHeimdallResourceServerRevocationDocs,
    ...zhHeimdallScimOperationsDocs,
    ...zhAiReadyDocs,
    ...zhSkillsReleaseDocs,
    ...zhEcosystemOnboardingDocs,
    {
      slug: "release-notes", group: "资源", eyebrow: "VERSION 5.1.3", title: "版本与更新",
      description: "文档版本以源码为事实源；每次框架与生态库变化都要同步记录。",
      sections: [
        { id: "current", title: "当前基线", bullets: ["Asgard 5.1.3（clean source d1002d1；tag v5.1.3 / 90e8a8b）", "Asgard 8 个公开 NuGet 包已于 2026-07-28 从 NuGet V3 feed 验证，latest 均为 5.1.3", "Heimdall 5.3.19（tag v5.3.19 / clean main 0032070）；HEAD 与 tag 相同，没有 HEAD-only 差异", "Heimdall Directory.Build.props 与 OidcPlugin.Version 均为 5.3.19；mini issuer 两个包也随该统一版本构建", ".NET 10 / C# 14；Asgard 源码固定 SDK 10.0.302", "文档基线：2026-07-28", "Skills 使用其独立审计基线；每篇指南继续链接对应 Agent Workflow"] },
    { id: "asgard-changes", title: "Asgard 5.0.3 → 5.1.3", bullets: ["5.1.0：AbsAsgardUserInfo 与 AsgardClaimTypes 新增 application_id、application_manifest_version、application_authorization_version、tenant_authorization_version 的双向映射；这些版本是可空的不透明字符串，基类不会验证必填、新鲜度或大小关系", "5.1.1：TsGen 的 buildQueryParams 改为 T extends object，严格 TypeScript 下复杂 Query DTO 不再需要 Record<string, unknown> 索引签名，运行时仍展开为顶层查询参数", "5.1.2：TsGen SSE 输出改用 lint-safe for...of 与 waitForReconnect；源码测试覆盖 strict 编译、Umi ESLint、消息顺序、retry、Last-Event-ID、最大重连、终止错误与 abort", "5.1.3：版本线与依赖维护；Mapster 10.0.11、Quartz 3.19.1，并新增 global.json 固定 SDK 10.0.302", "未变化：本次 diff 没有新增/删除项目，也没有 host 配置键、路由、默认值或主运行时接线变化；既有 5.0.3 运维边界经源码 diff 复核后延续到 5.1.3"], links: [{ label: "执行 5.1 升级指南", href: "/zh/asgard/docs/upgrade-to-5-1" }] },
        { id: "policy", title: "更新策略", paragraphs: ["文档不猜测未来 API。新增或修改公开能力时，同一变更应更新中英文内容、示例、导航和版本说明；涉及 Heimdall 协议边界时，还要核对 Discovery、Swagger、claims 与部署说明。"] },
        { id: "status", title: "文档状态", paragraphs: ["当前站点以生态门户、Asgard、Heimdall 与 Asgard Skills 独立站点组织中英文对应主题；主题总数由路由清单和发布检查生成。Asgard 当前以 5.1.3 为 Release；身份文档覆盖应用授权上下文 claims，TsGen 文档覆盖严格 Query DTO 与 SSE 生成兼容性。Heimdall 当前以 5.3.19 为 Release，覆盖标准 OIDC/OAuth、多租户身份、Application-domain RBAC 与版本化 Claims、完整受治理 MCP、Backend Directory 读写与身份失效集成、双镜像部署、数据库增量迁移、反向代理/Secure Cookie、Client Credentials、Token 生命周期/撤销/Introspection、租户签名密钥轮换、mini JWT issuer、联合身份/MFA、SCIM 与 SIEM。只有真实 tag 后源码变化才会标为 HEAD-only；当前 0032070 正好是 v5.3.19。静态产物继续提供搜索、llms.txt、每篇规范文章的 Markdown 副本和完整 AI 上下文，npm run verify 核对源码、双语、路由、来源合同与 CDN 制品。"], note: "完整空库 baseline、内建 migration ledger/down scripts 与通用资源服务器 Introspection 仍不是 5.3.19 已发布合同。" },
      ],
    },
  ],
  en: [],
};

docs.en = [
  { slug: "overview", group: "Start", eyebrow: "ASGARD FRAMEWORK", title: "Framework overview", description: "Build modular ASP.NET Core systems with one host, plugin model, and infrastructure surface.", sections: [
    { id: "what", title: "What is Asgard?", paragraphs: ["Asgard is an ASP.NET Core application framework that unifies configuration, plugins, infrastructure, authentication, authorization, Swagger, static files, and health checks so application code can focus on APIs and domain logic.", "The current framework version is 5.1.3 targeting .NET 10 with C# 14; the source repository pins SDK 10.0.302 through global.json. Its stable entry points are YggdrasilHost, PluginBase, BaseController, and AbsAsgardContext."] },
    { id: "architecture", title: "Ecosystem architecture", paragraphs: ["The portal explains product boundaries: Asgard owns hosting and infrastructure, Heimdall owns standards-based identity, and Skills make those rules executable for AI agents."], code: { language: "mermaid", value: ecosystemArchitectureDiagram } },
    { id: "modules", title: "Core building blocks", bullets: ["Asgard.Abstractions: contracts, configuration models, and entity bases", "Asgard.Core: cache, messaging, jobs, configuration, security, and plugins", "Asgard.AspNetCore.Core: web, identity, tenancy, and authorization", "Asgard.Yggdrasil.AspNetCore: host orchestration", "Asgard.PluginSdk: plugin development and fast startup", "Asgard.TsGen / Analyzers: client generation and compile-time rules"] },
    { id: "fit", title: "Where it fits", paragraphs: ["Use Asgard for standardized Web APIs, shared infrastructure, evolving modules, tenant-aware identity boundaries, and teams that want humans and AI agents to follow the same engineering rules."] },
  ]},
  { slug: "quick-start", group: "Start", eyebrow: "5 MINUTES", title: "Quick start", description: "Create an Asgard 5.1.3 application that compiles, starts, and passes real HTTP checks from an empty directory.", sections: [
    { id: "create", title: "Create the project", paragraphs: ["Create an empty directory and add this FirstAsgardApp.csproj. The fast path directly references only Asgard.PluginSdk, which brings the host dependencies transitively. app.yaml must be copied to the output directory."], code: { language: "xml", value: quickStartProjectCode } },
    { id: "program", title: "Start a built-in plugin", paragraphs: ["Add Program.cs. RunAsync<TPlugin> creates the Yggdrasil host, registers the built-in plugin, and applies the recommended Asgard web pipeline. Its default configuration path is config/app.yaml; this tutorial keeps the file at the project root and therefore passes app.yaml explicitly."], code: { language: "csharp", value: quickStartProgramCode } },
    { id: "plugin", title: "Declare the plugin entry point", paragraphs: ["Add FirstAppPlugin.cs. A minimal PluginBase needs only a stable ID, display name, and version; add lifecycle hooks only when the application needs them."], code: { language: "csharp", value: quickStartPluginCode } },
    { id: "controller", title: "Add the first API", paragraphs: ["Add Controllers/HelloController.cs. Asgard controllers inherit BaseController and return the unified Response<T> envelope. Explicitly call Success<string>(...) for a string result: Success(\"...\") selects the no-data overload and treats the string as the message."], code: { language: "csharp", value: quickStartControllerCode } },
    { id: "config", title: "Add the minimum secure configuration", paragraphs: ["Create app.yaml at the project root. The standard host registers Asgard encryption unconditionally, so Key and Iv are not optional demo values. This configuration enables only Swagger, health checks, and one HTTP endpoint, disables accidental external-plugin scanning, and turns off default file logging so the tutorial does not create local logs files."], code: { language: "yaml", value: quickStartYamlCode }, note: "Never commit real secrets. Key must be Base64 for 16, 24, or 32 bytes; Iv must be Base64 for exactly 16 bytes. Do not add host.cors.enabled: false: once the cors node exists, the current validator still validates defaultPolicy. Omit host.cors entirely when it is unused." },
    { id: "run", title: "Generate local keys and run", paragraphs: ["In PowerShell, generate one-time development keys for the current process, then restore and run. Production should inject both variables from a secret manager or deployment system."], code: { language: "powershell", value: quickStartRunCode } },
    { id: "verify", title: "Verify over HTTP", paragraphs: ["Run these commands in another terminal. /api/hello should return code 200, message 操作成功, and data Hello from Asgard; /health returns Healthy; the Swagger document contains /api/hello. /health/ready and /health/live should also return 200."], code: { language: "powershell", value: quickStartVerifyCode }, note: "PluginWebAppDefaults currently always enables UseHttpsRedirection. With an HTTP-only endpoint, the first request logs a ‘Failed to determine the https port for redirect’ warning, but HTTP still returns 200. Configure TLS termination for production." },
    { id: "next", title: "Choose the next step", bullets: ["Keep one module: add Services, Repositories, Entities, and typed configuration inside the plugin", "Need third-party registration, lifecycle hooks, or exact middleware ordering: move to the full YggdrasilHost.CreateBuilder(...) path", "Read the database, cache, messaging, and job guides before enabling infrastructure", "When integrating Heimdall, use Authorization Code + PKCE and validate Access Tokens in downstream APIs"] },
  ]},
  ...enPackageDocs,
  { slug: "host-and-plugins", group: "Framework", eyebrow: "RUNTIME", title: "Host and plugins", description: "Understand YggdrasilHost, built-in and external plugins, and lifecycle boundaries.", sections: [
    { id: "host", title: "Control the host", paragraphs: ["YggdrasilHost coordinates configuration, framework services, plugin initialization, and the web pipeline. Use the full builder when you need third-party SDKs, service overrides, or exact middleware ordering."], code: { language: "csharp", value: hostCode } },
    { id: "plugin", title: "Plugin model", bullets: ["Built-in plugins compile with the host for fast, strongly typed integration", "External plugins load from configured paths or scan directories", "PluginBase exposes configuration, logging, services, and AsgardContext", "An external assembly needs a non-abstract, parameterless IPlugin implementation; only one is selected if several exist"] },
    { id: "configure", title: "Configure external plugins in app.yaml", paragraphs: ["Host plugin.* settings belong only in the Starter app.yaml. A plugin's own plugin.yaml contains its typed business configuration and jobs, not host discovery rules. Relative paths resolve from the process current working directory."], code: { language: "yaml", value: pluginHostYamlCode } },
    { id: "defaults", title: "Complete fields and defaults", code: { language: "text", value: pluginDefaultsCode }, note: "Validate() still checks lists, timeout, dataDirectory, and required entry fields when the root or item is disabled. It does not verify file existence, signatures, hashes, duplicate IDs, or dependency closure." },
    { id: "discovery", title: "Discovery, dependencies, and registration", bullets: ["Explicit plugins load first and deduplicate by full path; missing dependencies, duplicate final IDs, or cycles fail the build", "Directory scanning inspects first-level child directories; recursive=true searches inside each child and does not discover a DLL placed directly at the scan root", "Multiple entryPointPattern matches have unstable selection; keep one entry DLL per plugin directory", "autoScanRepositories=true scans Repository attributes only, not Service; scan-directory entries have no equivalent switch", "External and built-in assemblies become MVC ApplicationParts only during initial startup"] },
    { id: "built-in", title: "Disable accidental scanning for built-in-only hosts", paragraphs: ["UseBuiltInPlugin forces plugin.enabled=true, while the default scanDirectories still points at plugins under the current working directory. Explicitly clear it when the application ships built-in plugins only."], code: { language: "yaml", value: builtInOnlyPluginYamlCode } },
    { id: "lifecycle", title: "Actual lifecycle boundaries", bullets: ["Plugin initialization and start happen during Build(), not RunAsync; shutdown runs in reverse order", "ConfigureServices or dependency-graph failures stop the build; Initialize/Start failures are logged and dependent plugins are skipped while the host may continue", "enableHotReload has no file-watcher wiring today, and loadTimeoutSeconds does not impose a real timeout", "ReloadAsync does not rerun ConfigureServices, Start, plugin.yaml jobs, middleware, MVC ApplicationParts, or the dependency graph, so it is not complete hot reload", "enableIsolation uses a collectible AssemblyLoadContext, but DI, MVC, and descriptors can retain references; UnloadAsync is primarily logical stop/dispose and cannot guarantee physical unload", "Built-in plugins cannot Reload"] },
    { id: "plugin-cors", title: "Plugin-contributed default CORS origins", paragraphs: ["When host.cors.enabled=true, a plugin may register IPluginCorsContributor during service registration to append origins to the host default policy. Null, empty, and whitespace entries are ignored, and exact duplicate strings are skipped; named policies are not changed. This mechanism neither enables CORS nor validates, normalizes, or trims origins.", "Because a plugin can broaden browser access, review contributed origins as part of the trusted-plugin release boundary. CORS governs browser cross-origin calls only and never replaces authentication, tenant isolation, or backend authorization. If the default policy already allows any origin, appended entries do not narrow it."] },
    { id: "trust", title: "External DLLs are trusted code", paragraphs: ["The loader currently verifies neither signatures nor hashes. External plugins execute in-process with access to DI, configuration, and process privileges. Load only from a controlled release chain, pin hashes during deployment, minimize file permissions, and rehearse rollback."] },
    { id: "structure", title: "Recommended structure", code: { language: "text", value: "MyApp.Plugin/\n  MyAppPlugin.cs\n  Controllers/ Services/ Repositories/ Entities/\n  plugin.yaml\n\nMyApp.Starter/\n  Program.cs\n  config/app.yaml" } },
  ]},
  { slug: "api-development", group: "Framework", eyebrow: "WEB API", title: "API development", description: "Build stable APIs with Asgard layering, response, and authorization conventions.", sections: [
    { id: "rules", title: "Hard boundaries", bullets: ["Every controller inherits BaseController", "The dependency direction is Controller → Service → Repository → Entity", "Services return DTOs; controllers map DTOs to VOs", "Return Response<T>, PageResponse<T>, or CursorResponse<T>; never raw objects"], code: { language: "mermaid", value: asgardRuntimeDiagram } },
    { id: "example", title: "Controller example", code: { language: "csharp", value: controllerCode } },
    { id: "authorization", title: "Authentication and authorization", paragraphs: ["The host wires JWT Bearer through host.auth. AsgardAuth attributes and expressions combine roles, permissions, scopes, and token_type checks. UI visibility is never a security boundary; the backend always authorizes the request."] },
  ]},
  { slug: "infrastructure", group: "Framework", eyebrow: "CAPABILITIES", title: "Infrastructure", description: "Access cache, distributed locking, database, messaging, jobs, security, and identity through AbsAsgardContext.", sections: [
    { id: "context", title: "One context", paragraphs: ["Controllers use AsgardContext, services can inject AbsAsgardContext, and plugins use GetAsgardContext() at supported lifecycle stages. Capabilities are enabled by configuration or explicit DI registration and remain optional, so consumers must handle unavailable modules safely."] },
    { id: "capabilities", title: "Capability catalog", bullets: ["Cache: memory, Redis, and multi-level caching", "DistributedLock: an explicitly registered lease mutex over one logical Redis", "Database: configuration-driven access and repositories", "MessageQueue: core RabbitMQ publish/subscribe; verify retry, delay, and dead-letter behavior against the messaging guide's current wiring boundaries", "JobScheduler: simple triggers, cron, and runtime jobs", "Encryption / PasswordHasher / KeyGenerator", "IdentityContext / TenantScopeFactory", "Trace: notes, tags, persistence, and error snapshots"] },
    { id: "config", title: "Configuration example", code: { language: "yaml", value: configCode }, note: "Inject connection strings and keys through environment or deployment configuration. Never commit real credentials." },
  ]},
  ...enAsgardContextUsageDocs,
  ...enInfrastructureDocs,
  ...enAsgardLifecycleDocs,
  ...enAsgardDeploymentDocs,
  ...enAsgardExternalPluginOperationsDocs,
  ...enAsgardKestrelTlsOperationsDocs,
  ...enRuntimeContractDocs,
  ...enApiContractDocs,
  ...enAsgardCrudDocs,
  ...enTenantBackgroundDocs,
  ...enAsgardObservabilityOperationsDocs,
  ...enAsgardLoggingOperationsDocs,
  ...enAsgardDatabaseOperationsDocs,
  ...enAsgardCacheOperationsDocs,
  ...enAsgardDistributedLockOperationsDocs,
  ...enAsgardCorsOperationsDocs,
  ...enAsgardMessagingOperationsDocs,
  ...enAsgardJobOperationsDocs,
  ...enAsgardSecurityOperationsDocs,
  ...enAsgardIdentityAuthorizationOperationsDocs,
  ...enAsgardTsGenOperationsDocs,
  ...enAsgardAnalyzersOperationsDocs,
  ...enConfigurationReferenceDocs,
    ...enConfigurationFieldReferenceDocs,
    ...enInfrastructureConfigFieldDocs,
    ...enHostFeatureConfigFieldDocs,
  ...enAsgardIntegrationDocs,
  ...enIdentitySecurityDocs,
  ...enToolingDocs,
  ...enAsgardUpgradeDocs,
  { slug: "heimdall", group: "Ecosystem", eyebrow: "IDENTITY PROVIDER", title: "Heimdall identity platform", description: "A standards-based OIDC/OAuth 2.0 identity provider and multi-tenant security platform built on Asgard.", sections: [
    { id: "capabilities", title: "Capabilities", bullets: ["Discovery, JWKS, Authorization Code + PKCE, Refresh Token, Client Credentials, and Device Flow", "Application Manifests, Tenant Applications, application-scoped RBAC/Grants, and versioned token claims", "Platform and tenant users, clients, scopes, authorization, consent, and session governance", "Mini issuer 5.3.19 for applications that own login but need Asgard-compatible JWTs plus Discovery/JWKS", "Governed MCP in 5.3.x: OAuth/AK-SK, Tools, Resources, Prompts, Tasks, policy, and two-phase write confirmation", "Tenant-bound Backend Directory reads/writes, invalidation Webhooks, SCIM, external OIDC, LDAP/AD, SAML, TOTP, and Passkeys", "Security-event lifecycle, active sessions, SIEM export, and Asgard tracing"], code: { language: "mermaid", value: heimdallIntegrationDiagram } },
    { id: "baseline", title: "Runtime boundary", paragraphs: ["Heimdall runs on .NET 10 / C# 14. Production storage is PostgreSQL only, with Redis caching, RabbitMQ messaging, and FreeSql data access. Bootstrap configuration comes from YAML, environment variables, or command line; runtime security policies live in the database."] },
    { id: "claims", title: "Unified identity contract", bullets: ["sub / user_id / tenant_id", "roles / permissions / scope as JSON array strings", "userMetadatas / tenantMetadata as JSON object strings", "Downstream Asgard services restore AbsAsgardUserInfo from access-token claims"] },
  ]},
  ...enHeimdallQuickStartDocs,
  ...enHeimdallIntegrationDocs,
  ...enHeimdallApplicationRbacDocs,
  ...enHeimdallServiceIntegrationDocs,
  ...enHeimdallCustomFrontendDocs,
  ...enHeimdallOperationsDocs,
  ...enHeimdallReleaseDocs,
  ...enHeimdallOperationsRunbooks,
  ...enHeimdallTokenDocs,
  ...enHeimdallManagementDocs,
  ...enHeimdallManagementApiDocs,
  ...enHeimdallDeviceDocs,
  ...enHeimdallAccountSecurityDocs,
  ...enHeimdallAdvancedDocs,
  ...enHeimdallDisasterRecoveryDocs,
  ...enHeimdallResourceServerRevocationDocs,
  ...enHeimdallScimOperationsDocs,
  ...enAiReadyDocs,
  ...enSkillsReleaseDocs,
  ...enEcosystemOnboardingDocs,
  { slug: "release-notes", group: "Resources", eyebrow: "VERSION 5.1.3", title: "Versions and updates", description: "Source code is the documentation source of truth; framework and ecosystem changes are tracked together.", sections: [
    { id: "current", title: "Current baseline", bullets: ["Asgard 5.1.3 (clean source d1002d1; tag v5.1.3 / 90e8a8b)", "All eight public Asgard NuGet packages were verified against the NuGet V3 feed on 2026-07-28; 5.1.3 is latest for each", "Heimdall 5.3.19 (tag v5.3.19 / clean main 0032070); HEAD equals the tag with no HEAD-only delta", "Directory.Build.props and OidcPlugin.Version both report 5.3.19; the two mini-issuer packages now follow that unified version", ".NET 10 / C# 14; Asgard source pins SDK 10.0.302", "Documentation baseline: 2026-07-28", "Skills retains its independently audited baseline and each guide links its relevant Agent Workflow"] },
    { id: "asgard-changes", title: "Asgard 5.0.3 → 5.1.3", bullets: ["5.1.0: AbsAsgardUserInfo and AsgardClaimTypes add round-trip mappings for application_id, application_manifest_version, application_authorization_version, and tenant_authorization_version. The nullable opaque strings are carried by the base class but requiredness, freshness, and ordering are not enforced there", "5.1.1: TsGen makes buildQueryParams generic as T extends object, so a complex query DTO no longer needs a Record<string, unknown> index signature under strict TypeScript while runtime output remains top-level query parameters", "5.1.2: generated TsGen SSE uses lint-safe for...of plus waitForReconnect; source tests cover strict compilation, Umi ESLint, message order, retry, Last-Event-ID, maximum reconnects, terminal errors, and abort", "5.1.3: release and dependency maintenance adopts Mapster 10.0.11 and Quartz 3.19.1 and adds global.json pinning SDK 10.0.302", "Unchanged: the diff adds or removes no projects and changes no host configuration key, route, default, or primary runtime wiring. Existing 5.0.3 operational boundaries were rechecked and continue under 5.1.3"], links: [{ label: "Run the 5.1 upgrade guide", href: "/en/asgard/docs/upgrade-to-5-1" }] },
    { id: "policy", title: "Update policy", paragraphs: ["Documentation does not guess future APIs. A public capability change updates Chinese and English content, examples, navigation, and release notes together. Heimdall protocol changes also require verification against Discovery, Swagger, claims, and deployment guidance."] },
    { id: "status", title: "Documentation status", paragraphs: ["The ecosystem portal and dedicated Asgard, Heimdall, and Asgard Skills sites organize matched Chinese and English topics, with route counts derived by release checks. Asgard now uses 5.1.3 as Release; identity documentation covers application-authorization context claims and TsGen documentation covers strict query DTO and generated SSE compatibility. Heimdall uses 5.3.19 as Release and documents standard OIDC/OAuth, multi-tenant identity, Application-domain RBAC with versioned claims, governed MCP, Backend Directory reads/writes and invalidation integration, two-image deployment, incremental database migration, reverse proxy/Secure Cookie, Client Credentials, token lifecycle/revocation/introspection, tenant signing-key rotation, the mini issuer, federation/MFA, SCIM, and SIEM. Only a real post-tag source delta is labeled HEAD-only; current 0032070 is exactly v5.3.19. Static output continues to expose search, llms.txt, a Markdown companion for every canonical guide, and complete AI context, while npm run verify checks source, bilingual parity, routes, contracts, and CDN artifacts."], note: "A complete empty-database baseline, built-in migration ledger/down scripts, and general resource-server introspection are still not released 5.3.19 contracts." },
  ]},
];

export const localeCopy = {
  zh: {
    nav: ["指南", "框架", "Heimdall", "AI Ready"],
    search: "搜索文档…",
    github: "GitHub",
    version: "v5.1.3",
    heroKicker: "为人类，也为 AI Agent 而生",
    heroTitle: "用 Asgard 构建\n下一代 .NET 系统",
    heroDescription: "统一宿主、插件、基础设施与身份边界。框架知识同时交付给开发者和 AI，让每一次扩展都更快、更一致。",
    start: "开始使用",
    explore: "浏览 Heimdall",
    capabilities: "Build with Asgard",
    capabilitiesDesc: "从一个稳定入口获得应用框架、身份平台和 AI 工程知识。",
    popular: "推荐阅读",
    popularDesc: "沿着最短路径跑通框架，再深入到身份与智能协作。",
    footer: "Asgard is open source and AI ready.",
    onThisPage: "本页内容",
    editHint: "内容依据当前源码维护",
    previous: "上一篇",
    next: "下一篇",
  },
  en: {
    nav: ["Guides", "Framework", "Heimdall", "AI Ready"],
    search: "Search docs…",
    github: "GitHub",
    version: "v5.1.3",
    heroKicker: "Built for humans and AI agents",
    heroTitle: "Build the next generation\nof .NET systems",
    heroDescription: "One host, plugin model, infrastructure surface, and identity boundary. Give developers and AI the same framework knowledge so every extension is faster and more consistent.",
    start: "Get started",
    explore: "Explore Heimdall",
    capabilities: "Build with Asgard",
    capabilitiesDesc: "A stable entry point for the application framework, identity platform, and AI engineering knowledge.",
    popular: "Popular guides",
    popularDesc: "Take the shortest path to a running system, then go deeper into identity and agent collaboration.",
    footer: "Asgard is open source and AI ready.",
    onThisPage: "On this page",
    editHint: "Maintained against current source",
    previous: "Previous",
    next: "Next",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export function isLocale(value: string): value is Locale {
  return value === "zh" || value === "en";
}

export function findDoc(locale: Locale, slug: string) {
  return docs[locale].find((doc) => doc.slug === slug);
}

export function productForSlug(slug: string): Product {
  return productForDocumentationSlug(slug);
}

export function getProductDocs(locale: Locale, product: Product) {
  return docs[locale].filter((doc) => productForSlug(doc.slug) === product);
}

export function findProductDoc(locale: Locale, product: Product, slug: string) {
  return getProductDocs(locale, product).find((doc) => doc.slug === slug);
}
