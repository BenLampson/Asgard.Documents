import type { DocPage } from "./content";

const installCode = `dotnet new web -n MyApp.Starter -f net10.0
cd MyApp.Starter
dotnet add package Asgard.PluginSdk --version 5.1.3`;

const minimalStarterCode = `using Asgard.PluginSdk;

await PluginWebAppDefaults.RunAsync<MyPlugin>("app.yaml");`;

const fullHostCode = `using Asgard.Yggdrasil.AspNetCore;

var builder = YggdrasilHost.CreateBuilder("app.yaml")
    .UseBuiltInPlugin<MyPlugin>()
    .ConfigureMiddleware(app =>
    {
        _ = app.UseAsgardExceptionHandler()
            .UseHttpsRedirection();
    });

var app = builder.Build();
await app.RunAsync();`;

const packageLayers = `Asgard.PluginSdk                 plugin SDK + fast startup
  └─ Asgard.Yggdrasil.AspNetCore full ASP.NET Core host
      ├─ Asgard.AspNetCore.Core   web runtime, identity, tenancy
      ├─ Asgard.Core              infrastructure implementations
      └─ Asgard.TsGen             TypeScript client generation
          ├─ Asgard.Abstractions.AspNetCore
          └─ Asgard.Abstractions  shared contracts and base types

Asgard.Analyzers                 compile-time rules (development only)`;

const centralVersions = `<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Asgard.PluginSdk" Version="5.1.3" />
    <PackageVersion Include="Asgard.Analyzers" Version="5.1.3" />
  </ItemGroup>
</Project>`;

const analyzerReference = `<PackageReference Include="Asgard.Analyzers"
                  PrivateAssets="all"
                  IncludeAssets="runtime; build; native; contentfiles; analyzers; buildtransitive" />`;

const rollbackCommands = `dotnet restore --locked-mode
dotnet build --no-restore
dotnet test --no-build

# rollback: restore the previous lock/central-version commit
git revert <upgrade-commit>
dotnet restore --locked-mode`;

export const zhPackageDocs: DocPage[] = [
  {
    slug: "packages-and-installation",
    group: "开始",
    eyebrow: "NUGET · 5.1.3",
    title: "NuGet 包与安装选择",
    description: "看懂 Asgard 的包层级，选择正确入口，并建立插件主体与 starter/host 的推荐项目结构。",
    sections: [
      {
        id: "release-line",
        title: "当前可安装版本",
        paragraphs: ["截至 2026-07-28，NuGet V3 feed 已实时确认 8 个公开 Asgard 包的最新版本均为 5.1.3；源码中的 PackageId、IsPackable 与已发布 .nuspec 依赖也已交叉核对。框架基线是 .NET 10 / C# 14，源码仓库通过 global.json 固定 SDK 10.0.302。"],
        code: { language: "powershell", value: installCode },
        note: "生产项目应固定明确版本，并在一次升级中保持所有 Asgard.* 包版本一致。不要根据本地目录名推断版本。",
      },
      {
        id: "scenario-matrix",
        title: "按场景选择最小入口",
        bullets: [
          "可运行的单插件 API / starter：只直接引用 Asgard.PluginSdk；它传递引入 Yggdrasil、Web 运行时、基础设施、TsGen 与契约层",
          "自定义完整 ASP.NET Core host：直接引用 Asgard.Yggdrasil.AspNetCore；适合自行控制 Program.cs、宿主钩子与中间件顺序",
          "只编写可复用插件类库：通常引用 Asgard.PluginSdk；运行入口仍放在单独 starter 中，不要把 app.yaml 和部署职责塞进插件类库",
          "共享领域模型、DTO 和基础契约：引用 Asgard.Abstractions；共享 Controller/Web 契约再选 Asgard.Abstractions.AspNetCore",
          "自建编排但需要默认缓存、消息、作业、配置和安全实现：引用 Asgard.Core；需要身份、租户和 ASP.NET Core 注册时改选 Asgard.AspNetCore.Core",
          "独立使用 Controller→TypeScript 生成能力：引用 Asgard.TsGen；使用 Yggdrasil 或 PluginSdk 时它已经是传递依赖",
          "只增加编译期规则：引用 Asgard.Analyzers，并使用 PrivateAssets=all；它不是运行时依赖",
        ],
        note: "“最小”指最少的直接 PackageReference，而不是手工排除入口包声明的传递依赖。若应用最终需要完整宿主，不要为了看起来轻量而拼装底层包。",
      },
      {
        id: "choose",
        title: "先选最高层入口",
        bullets: [
          "Asgard.PluginSdk：插件开发和单插件快速启动的首选；包含 Yggdrasil 宿主与常用便利 API",
          "Asgard.Yggdrasil.AspNetCore：应用团队保留完整 Program.cs、中间件和宿主钩子控制时的推荐入口",
          "Asgard.AspNetCore.Core：只需要 Web 运行时、身份、租户和服务注册，不需要完整宿主编排",
          "Asgard.Core：只需要缓存、消息、作业、配置、安全和插件等默认基础设施实现",
          "Asgard.Abstractions / Asgard.Abstractions.AspNetCore：只依赖稳定契约、基础类型或 Web 契约",
          "Asgard.TsGen：从 Controller 生成 TypeScript 客户端；Asgard.Analyzers：在构建期执行 Asgard 代码边界",
        ],
        note: "通常只安装一个符合需求的最高层包，让 NuGet 解析其传递依赖；不要把所有包逐个重复加入项目。",
      },
      { id: "layers", title: "包依赖层级", paragraphs: ["Asgard 的包从契约、运行时、Web 集成一路组合到宿主和插件 SDK。高层入口负责装配，低层包允许高级用户按需复用。"], code: { language: "text", value: packageLayers } },
      {
        id: "transitivity",
        title: "传递依赖与显式引用",
        paragraphs: ["已发布 5.1.3 元数据表明：PluginSdk → Yggdrasil；Yggdrasil → AspNetCore.Core、Core、TsGen；AspNetCore.Core → Abstractions.AspNetCore、Abstractions、Core。NuGet 会恢复这些依赖，无需在 starter 中重复声明。只有当项目直接编译使用某个低层包的 API、需要独立控制其版本，或要表达清晰的架构边界时，才增加显式引用。"],
        note: "Asgard.Abstractions 本身仍传递依赖 FreeSql 与 FreeSql.DbContext；“契约层”描述的是 Asgard 架构职责，不等于零第三方依赖。",
      },
      {
        id: "publication-boundary",
        title: "公开包边界",
        paragraphs: ["可供消费者选择的公开集合就是本页列出的 8 个 PackageId。源码目录、.csproj 或命名空间的存在不证明它已发布；不要引用本地源码树中的测试、示例、生成器工具或其他未出现在 NuGet V3 feed 的项目作为生产依赖。源码开发可使用 ProjectReference，但对外发布的应用与插件应验证最终 PackageReference 图。"],
      },
      {
        id: "project-layout",
        title: "推荐项目结构",
        paragraphs: ["正式项目优先拆成插件主体和 starter/host。插件主体承载 PluginBase、业务分层与 plugin.yaml；starter 引用插件项目，承载 Program.cs、app.yaml 和部署入口。单项目只适合快速验证。"],
        code: { language: "text", value: "MyApp.Plugin/\n  MyAppPlugin.cs\n  Controllers/ Services/ Repositories/ Entities/\n  plugin.yaml\n\nMyApp.Starter/\n  Program.cs\n  app.yaml\n  ProjectReference → MyApp.Plugin" },
      },
      { id: "fast-start", title: "最短启动路径", paragraphs: ["单插件调试或小型服务可以在 starter 中使用 PluginWebAppDefaults。默认链路会加载配置、注册宿主能力并托底授权中间件，不需要机械重复 UseAuthorization()."], code: { language: "csharp", value: minimalStarterCode } },
      { id: "full-host", title: "完整宿主路径", paragraphs: ["需要多个内建插件、自定义服务钩子或精确中间件顺序时，改用 YggdrasilHost。app.yaml 仍由 starter/host 负责加载。"], code: { language: "csharp", value: fullHostCode } },
      { id: "central-versions", title: "统一版本与分析器", paragraphs: ["多项目仓库建议用 Directory.Packages.props 统一版本。业务项目中的 PackageReference 不再写 Version；分析器应作为仅开发期资产，避免传递给下游消费者。"], code: { language: "xml", value: centralVersions }, note: analyzerReference },
      {
        id: "upgrade",
        title: "版本与升级纪律",
        bullets: ["统一升级所有直接引用的 Asgard.* 包，不混用 4.x 与 5.x", "提交 packages.lock.json 或等价锁文件，先在分支更新中央版本，再恢复、构建、测试与运行关键 smoke test", "检查 dotnet list package --include-transitive，确认没有旧 Asgard 版本或意外的底层直接引用", "回滚应恢复上一份中央版本与锁文件，而不是在单个项目临时降级", "源码工作树版本不等于已发布版本；安装文档必须同时核对 NuGet V3 feed"],
        code: { language: "powershell", value: rollbackCommands },
      },
    ],
  },
];

export const enPackageDocs: DocPage[] = [
  {
    slug: "packages-and-installation",
    group: "Start",
    eyebrow: "NUGET · 5.1.3",
    title: "NuGet packages and installation",
    description: "Understand the Asgard package layers, select the right entry point, and separate the plugin from its starter/host.",
    sections: [
      {
        id: "release-line",
        title: "Current installable release",
        paragraphs: ["As of 2026-07-28, a live NuGet V3 feed check confirms that 5.1.3 is the latest version of all eight public Asgard packages. Source PackageId and IsPackable values were cross-checked with the published .nuspec dependency graph. The framework baseline is .NET 10 / C# 14, and the source repository pins SDK 10.0.302 through global.json."],
        code: { language: "powershell", value: installCode },
        note: "Pin an explicit version in production and keep every Asgard.* package on the same release in one upgrade. Never infer a version from a local directory name.",
      },
      {
        id: "scenario-matrix",
        title: "Minimum entry point by scenario",
        bullets: [
          "Runnable single-plugin API or starter: reference only Asgard.PluginSdk directly; it brings Yggdrasil, the web runtime, infrastructure, TsGen, and contracts transitively",
          "Custom full ASP.NET Core host: reference Asgard.Yggdrasil.AspNetCore when the application owns Program.cs, host hooks, and middleware ordering",
          "Reusable plugin library: normally reference Asgard.PluginSdk; keep app.yaml and deployment ownership in a separate starter",
          "Shared domain models, DTOs, and base contracts: reference Asgard.Abstractions; add Asgard.Abstractions.AspNetCore for shared controllers or web contracts",
          "Custom orchestration with default cache, messaging, jobs, configuration, and security implementations: reference Asgard.Core; select Asgard.AspNetCore.Core when identity, tenancy, and ASP.NET Core registration are also required",
          "Standalone Controller-to-TypeScript generation: reference Asgard.TsGen; Yggdrasil and PluginSdk already include it transitively",
          "Compile-time rules only: reference Asgard.Analyzers with PrivateAssets=all; it is not a runtime dependency",
        ],
        note: "Minimum means the fewest direct PackageReference items, not manually excluding dependencies declared by an entry package. Do not reconstruct a full host from low-level packages merely to make the project file look smaller.",
      },
      {
        id: "choose",
        title: "Choose the highest useful layer",
        bullets: [
          "Asgard.PluginSdk: the preferred plugin-development and single-plugin fast path; includes the Yggdrasil host and convenience APIs",
          "Asgard.Yggdrasil.AspNetCore: the recommended application entry when the team owns Program.cs, middleware, and host hooks",
          "Asgard.AspNetCore.Core: web runtime, identity, tenancy, and service registration without full host orchestration",
          "Asgard.Core: default infrastructure implementations for cache, messaging, jobs, configuration, security, and plugins",
          "Asgard.Abstractions / Asgard.Abstractions.AspNetCore: stable contracts, shared base types, and web-facing contracts only",
          "Asgard.TsGen generates TypeScript clients; Asgard.Analyzers enforces Asgard boundaries during builds",
        ],
        note: "Normally install one top-level package that matches the required control and let NuGet resolve its transitive dependencies. Do not add every layer manually.",
      },
      { id: "layers", title: "Package dependency layers", paragraphs: ["Asgard composes contracts, runtime implementations, web integration, the host, and finally the plugin SDK. High-level packages assemble the system while lower layers remain available for specialized integrations."], code: { language: "text", value: packageLayers } },
      {
        id: "transitivity",
        title: "Transitive versus direct references",
        paragraphs: ["Published 5.1.3 metadata establishes PluginSdk → Yggdrasil; Yggdrasil → AspNetCore.Core, Core, and TsGen; and AspNetCore.Core → Abstractions.AspNetCore, Abstractions, and Core. NuGet restores that graph, so a starter should not repeat every layer. Add a direct lower-layer reference only when that project compiles against its API, independently controls its version, or intentionally exposes the architectural boundary."],
        note: "Asgard.Abstractions itself depends on FreeSql and FreeSql.DbContext. Contract layer describes its Asgard responsibility; it does not mean zero third-party dependencies.",
      },
      {
        id: "publication-boundary",
        title: "Public package boundary",
        paragraphs: ["The consumer-facing set is the eight PackageId values listed on this page. A source directory, .csproj, or namespace is not proof of publication. Do not make production dependencies on tests, samples, generator tools, or other projects absent from the NuGet V3 feed. Source contributors may use ProjectReference; published applications and plugins should verify their final PackageReference graph."],
      },
      {
        id: "project-layout",
        title: "Recommended project layout",
        paragraphs: ["Production applications should separate the plugin implementation from its starter/host. The plugin owns PluginBase, business layers, and plugin.yaml. The starter references that project and owns Program.cs, app.yaml, and the deployment entry point. Keep the single-project shape for quick validation."],
        code: { language: "text", value: "MyApp.Plugin/\n  MyAppPlugin.cs\n  Controllers/ Services/ Repositories/ Entities/\n  plugin.yaml\n\nMyApp.Starter/\n  Program.cs\n  app.yaml\n  ProjectReference → MyApp.Plugin" },
      },
      { id: "fast-start", title: "Fast startup path", paragraphs: ["For one-plugin debugging or a small service, use PluginWebAppDefaults in the starter. The default pipeline loads configuration, registers host capabilities, and provides the authorization middleware baseline, so new projects should not mechanically repeat UseAuthorization()."], code: { language: "csharp", value: minimalStarterCode } },
      { id: "full-host", title: "Full host path", paragraphs: ["Use YggdrasilHost when the application needs multiple built-in plugins, custom service hooks, or exact middleware ordering. The starter/host remains responsible for loading app.yaml."], code: { language: "csharp", value: fullHostCode } },
      { id: "central-versions", title: "Unified versions and analyzers", paragraphs: ["Use Directory.Packages.props to keep a multi-project repository on one version. PackageReference items in projects then omit Version. Treat the analyzer as a development-only asset so it does not flow to downstream consumers."], code: { language: "xml", value: centralVersions }, note: analyzerReference },
      {
        id: "upgrade",
        title: "Version and upgrade discipline",
        bullets: ["Upgrade all directly referenced Asgard.* packages together; do not mix 4.x and 5.x", "Commit packages.lock.json or an equivalent lock, update the central version on a branch, then restore, build, test, and run critical smoke tests", "Inspect dotnet list package --include-transitive for an old Asgard version or accidental direct low-level references", "Rollback restores the previous central-version and lock-file revision instead of downgrading one project ad hoc", "A source worktree version is not proof of publication; installation docs must also verify the NuGet V3 feed"],
        code: { language: "powershell", value: rollbackCommands },
      },
    ],
  },
];
