import type { DocPage, Locale } from "./content";

const controllerExample = `using Asgard.Abstractions.CodeGeneration;

namespace MyPlugin.Controllers;

/// <summary>
/// 提供订单查询接口。
/// </summary>
[ApiController]
[Route("api/orders")]
[AsgardTsGen]
public sealed class OrderController(IOrderService orderService) : BaseController
{
    /// <summary>
    /// 查询单个订单。
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<Response<OrderVo>> GetAsync(long id)
    {
        var dto = await orderService.GetAsync(id);
        return Success(dto.ToVo());
    }
}`;

const runnerExample = `using Asgard.TsGen;

var outputDirectory = args.Length > 0
    ? args[0]
    : throw new ArgumentException("Expected an explicit output directory.");

var result = await new TsGenerationService().GenerateAsync(
    new TsGenOptions
    {
        Assembly = typeof(MyPlugin.Controllers.OrderController).Assembly,
        OutputDirectory = outputDirectory,
        RequestImportPath = "@/services/request"
    });

Console.WriteLine(
    $"Generated {result.ControllerCount} controllers into {result.OutputDirectory}");`;

const hostExport = `host:
  tsGen:
    enabled: true

# Development only; use the URL printed by the running host.
curl --fail --output asgard-tsgen.zip \
  http://127.0.0.1:5000/asgard-tsgen`;

const ciCommands = `# Run the repository-owned runner into the committed client root.
dotnet run --project tools/TsGenExport -- frontend/src/services

# Formatting may be applied, but never hand-edit generated business behavior.
npm --prefix frontend run typecheck
npm --prefix frontend run lint
git diff --exit-code -- frontend/src/services/common \
  frontend/src/services/controller frontend/src/services/models`;

const sourceFiles = `Common/Asgard.TsGen/Asgard.TsGen.csproj
Common/Asgard.TsGen/README.md
Common/Asgard.TsGen/TsGenOptions.cs
Common/Asgard.TsGen/TsGenerationService.cs
Common/Asgard.TsGen/ControllerMetadataExtractor.cs
Common/Asgard.TsGen/TypeScriptEmitter.CommonContent.cs
Common/Asgard.TsGen/TypeScriptEmitter.Helpers.cs
Common/Asgard.TsGen/TypeScriptTypeMapper.cs
Common/Asgard.TsGen/TypeScriptFileWriter.cs
Common/Asgard.Abstractions/CodeGeneration/AsgardTsGenAttribute.cs
Common/Asgard.Abstractions.AspNetCore/Host/TsGenHostOptions.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.TsGen.cs
Host/Asgard.Yggdrasil.AspNetCore/AsgardTsGenControllerSource.cs
Host/Asgard.Yggdrasil.AspNetCore/AsgardTsGenArchiveService.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.PluginIntegration.cs
Test/Asgard.TsGen.Tests/Generation/TsGenerationServiceTests.cs
Test/Asgard.TsGen.Tests/Generation/TsGenerationEdgeCaseTests.cs
Test/Asgard.TsGen.Tests/Generation/TsGenerationSseCompatibilityTests.cs
Test/Asgard.TsGen.Tests/Generation/TsGenerationTypeScriptCompatibilityTests.cs
Test/Asgard.Yggdrasil.AspNetCore.Tests/TsGenDevelopmentEndpointTests.cs`;

const sectionIds = [
  "contract",
  "opt-in",
  "controller-contract",
  "library-cli-path",
  "host-export-path",
  "discovery-boundary",
  "output-snapshot",
  "type-contract",
  "ci-drift",
  "frontend-integration",
  "troubleshooting",
  "acceptance",
  "ai-ready-sources",
] as const;

function makeTsGenOperationsPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "tsgen-operations",
    group: zh ? "开发工具" : "Developer tooling",
    eyebrow: "ASGARD 5.1.3 · OPTIONAL TSGEN",
    title: zh ? "TsGen 团队生成与生产交付指南" : "TsGen team generation and delivery guide",
    description: zh
      ? "以源码为合同选择 TsGen、导出已发布 API、控制生成快照漂移，并把纯生成客户端安全接入前端。"
      : "Adopt TsGen from its source contract, export released APIs, control generated-snapshot drift, and integrate the generated client safely into a frontend.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "当前能力与边界" : "Current capability and boundary",
        paragraphs: zh
          ? [
              "Asgard.TsGen 是可选的 .NET 10 类库，不是 Asgard 前端的强制依赖。它从显式选择的 ASP.NET Core Controller 生成 common、controller 和 models TypeScript 快照，覆盖路由、path/query/header/body/form 参数、文件与 SSE，以及 Asgard 统一响应合同。项目也可以明确选择 OpenAPI 或共享手写客户端。",
              "当前 5.1.3 源码有两种可维护接入：仓库自有 runner 调用 TsGenerationService，或从 Yggdrasil 开发宿主下载 ZIP。Asgard.TsGen.csproj 的 OutputType 是 Library，仓库没有 Program/Main、--assembly 参数解析或已安装的 asgard-tsgen 命令；不要把旧 Skill 中的 dotnet run Asgard.TsGen.csproj 命令描述为已发布 CLI。",
            ]
          : [
              "Asgard.TsGen is an optional .NET 10 library, not a mandatory dependency for an Asgard frontend. It generates common, controller, and models TypeScript snapshots from explicitly selected ASP.NET Core controllers, covering routes, path/query/header/body/form parameters, files and SSE, plus Asgard response contracts. A project may instead select OpenAPI or a shared handwritten client.",
              "The current 5.1.3 source supports two maintainable integration paths: a repository-owned runner that calls TsGenerationService, or a ZIP downloaded from a Yggdrasil development host. Asgard.TsGen.csproj has OutputType Library and the repository contains no Program/Main, --assembly parser, or installed asgard-tsgen command. Do not present the stale dotnet-run command from older Skill text as a released CLI.",
            ],
        note: zh
          ? "生成器是开发期合同同步工具；不要在生产请求路径中即时生成或开放导出端点。"
          : "The generator is a development-time contract synchronization tool. Do not generate on a production request path or expose the export endpoint there.",
      },
      {
        id: sectionIds[1],
        title: zh ? "先做项目级 opt-in 决策" : "Make an explicit project-level opt-in",
        bullets: zh
          ? [
              "适合：前后端同仓或有明确快照交付流程、Controller 合同是权威来源、团队愿意在 CI 检查生成漂移",
              "不一定适合：多语言 SDK、第三方公共 API、必须从标准 OpenAPI 生态生成，或前端已有稳定共享客户端",
              "选用后，把生成根目录、RequestImportPath、runner 版本、格式化步骤和审查责任写进仓库；不要让每位开发者各自决定路径",
              "未选用时不需要 [AsgardTsGen]、host.tsGen 或生成目录；AI Agent 也不得因为项目使用 Asgard 就自动引入 TsGen",
            ]
          : [
              "Good fit: frontend and backend share a repository or a defined snapshot handoff, controllers are authoritative, and CI checks generated drift",
              "Potentially poor fit: multi-language SDKs, third-party public APIs, a standards-based OpenAPI toolchain, or an established shared frontend client",
              "After opting in, record the output root, RequestImportPath, runner version, formatting step, and review ownership in the repository; do not let every developer choose different paths",
              "Without opt-in, [AsgardTsGen], host.tsGen, and generated folders are unnecessary. An AI agent must not introduce TsGen merely because a project uses Asgard",
            ],
      },
      {
        id: sectionIds[2],
        title: zh ? "Controller 必须明确允许生成" : "Controllers must explicitly allow generation",
        paragraphs: zh
          ? [
              "生成器只接受继承 ControllerBase、显式标记 [AsgardTsGen] 且至少包含一个受支持 HTTP Action 的类型。特性 Inherited=false，因此不能只标在基类上。被 [NonAction]、ApiExplorerSettings(IgnoreApi=true) 排除的方法，或没有 HttpMethodAttribute 的方法不会生成。",
              "继续遵守 Asgard 后端合同：Controller 继承 BaseController，调用 Service，并把 DTO 映射为 VO 后返回 Response<T>、PageResponse<T> 或 CursorResponse<T>。特性只表示允许生成，不代表路由已被 MVC 发布、授权已配置或前端可以绕过后端安全检查。",
            ]
          : [
              "The generator accepts only types derived from ControllerBase, explicitly decorated with [AsgardTsGen], and containing at least one supported HTTP action. The attribute has Inherited=false, so placing it only on a base class is insufficient. Methods excluded by [NonAction] or ApiExplorerSettings(IgnoreApi=true), and methods without an HttpMethodAttribute, are not generated.",
              "Keep the Asgard backend contract: a controller derives from BaseController, calls a service, maps DTOs to VOs, and returns Response<T>, PageResponse<T>, or CursorResponse<T>. The attribute only opts into generation; it does not prove MVC published the route, authorization is configured, or the frontend may bypass backend security.",
            ],
        code: { language: "csharp", value: controllerExample },
      },
      {
        id: sectionIds[3],
        title: zh ? "CLI/CI 路径：仓库自有 runner" : "CLI/CI path: a repository-owned runner",
        paragraphs: zh
          ? [
              "当前包公开 ITsGenerationService、TsGenerationService 和 TsGenOptions，团队可在自己的 console tool、构建任务或测试中调用。Assembly 会扫描程序集全部类型；ControllerTypes 非 null 时则只处理明确集合。这个路径不经过 MVC ApplicationPart，所以必须用集成测试另行证明生成的 Controller 确实由目标宿主发现。",
              "runner 应固定引用的 Asgard.TsGen 版本、目标程序集、绝对可审计输出目录和 RequestImportPath，并在生成失败时让进程非零退出。下面是 runner 核心，不是当前包内置命令；团队要把它作为自己的可执行项目提交并锁定。",
            ]
          : [
              "The current package exposes ITsGenerationService, TsGenerationService, and TsGenOptions for a team-owned console tool, build task, or test. Assembly scans every type in that assembly; a non-null ControllerTypes collection restricts processing to that explicit set. This path does not pass through MVC ApplicationPart, so integration tests must separately prove the generated controllers are discovered by the target host.",
              "The runner should pin its Asgard.TsGen version, target assembly, explicit auditable output directory, and RequestImportPath, and exit non-zero on generation failure. The code below is runner core, not a command built into the current package; commit and version the executable project as team-owned tooling.",
            ],
        code: { language: "csharp", value: runnerExample },
      },
      {
        id: sectionIds[4],
        title: zh ? "宿主路径：Development ZIP 导出" : "Host path: Development ZIP export",
        paragraphs: zh
          ? [
              "host.tsGen.enabled 默认 false。只有显式为 true 且 ASPNETCORE_ENVIRONMENT=Development 时才映射 GET /asgard-tsgen；Production 返回 404。启动日志会打印实际 URL，请从受信开发网络下载 application/zip，不要把该端点暴露到公网或当成生产 API。",
              "导出服务使用固定 RequestImportPath @/services/request，在临时目录生成 asgard-tsgen.zip 并在请求结束后清理。需要不同导入路径时使用仓库 runner；不要解压后手改生成 controller 来补路径或业务逻辑。",
            ]
          : [
              "host.tsGen.enabled defaults to false. GET /asgard-tsgen is mapped only when it is explicitly true and ASPNETCORE_ENVIRONMENT=Development; Production returns 404. The startup log prints the actual URL. Download the application/zip from a trusted development network, never expose the endpoint publicly or treat it as a production API.",
              "The archive service uses the fixed RequestImportPath @/services/request, generates asgard-tsgen.zip in a temporary directory, and cleans it after the request. Use a repository runner when a different import path is required; do not patch generated controllers after extraction to add paths or business behavior.",
            ],
        code: { language: "text", value: hostExport },
      },
      {
        id: sectionIds[5],
        title: zh ? "插件、MVC 与宿主 Controller 边界" : "Plugin, MVC, and host-controller boundary",
        paragraphs: zh
          ? [
              "Yggdrasil 导出不是全进程程序集扫描。它先记录当前成功加载的插件程序集名称，再从 ApplicationPartManager 的 ControllerFeature 取 MVC 真正发现的 Controller，最后同时按插件程序集成员关系与 [AsgardTsGen] 过滤。因此插件必须启用、成功加载，并通过 AddApplicationPart 进入 MVC。",
              "当前主路径明确不会导出宿主自身 Controller、未加载插件、没有进入 MVC ApplicationPart 的类型或未标记类型。集成测试也断言插件 TestTsGenController 存在，而宿主 OidcTestController 与未标记 TestIgnoredController 不存在。需要宿主 Controller 时，使用显式 ControllerTypes 的团队 runner，且另外验证真实路由；不要夸大 /asgard-tsgen 的范围。",
            ]
          : [
              "Yggdrasil export is not a process-wide assembly scan. It records assemblies for successfully loaded plugins, obtains controllers actually discovered by MVC from ApplicationPartManager's ControllerFeature, then filters by both plugin-assembly membership and [AsgardTsGen]. The plugin system must be enabled, the plugin must load successfully, and AddApplicationPart must expose its assembly to MVC.",
              "The current main path explicitly excludes host-owned controllers, unloaded plugins, types absent from MVC ApplicationPart, and unmarked types. Integration tests assert that plugin TestTsGenController is present while host OidcTestController and unmarked TestIgnoredController are absent. For a host controller, use explicit ControllerTypes in a team runner and separately verify the real route; do not overstate /asgard-tsgen coverage.",
            ],
      },
      {
        id: sectionIds[6],
        title: zh ? "输出是破坏性重建的纯生成快照" : "Output is a destructively rebuilt generated snapshot",
        paragraphs: zh
          ? [
              "OutputDirectory 默认是命令执行时的当前目录。每次 GenerateAsync 会先递归删除输出根下 common/、controller/、models/，即使同名位置是文件也会删除，再写 UTF-8 无 BOM、CRLF 的新快照；输出根的其他文件保留。必须先切到专用客户端根或传显式目录，绝不能对含手写同名目录的路径运行。",
              "零个命中 Controller 仍会成功并只生成 common；旧 controller/models 会被删除。这不是健康信号。CI 必须断言预期 ControllerCount/关键文件清单，解压 ZIP 时也要用临时目录校验后原子替换，避免把不完整下载直接覆盖工作树。",
            ]
          : [
              "OutputDirectory defaults to the current working directory. Every GenerateAsync recursively deletes common/, controller/, and models/ under the output root—even same-named files—before writing a fresh UTF-8-without-BOM, CRLF snapshot. Other files at the output root remain. Enter a dedicated client root or pass an explicit path; never run against a location whose same-named folders contain handwritten work.",
              "Zero selected controllers is still successful and emits common only; stale controller/models folders are removed. That is not a health signal. CI must assert the expected ControllerCount or key-file manifest. Extract a ZIP to staging, validate it, then replace atomically rather than overwriting the worktree with a partial download.",
            ],
      },
      {
        id: sectionIds[7],
        title: zh ? "类型合同与 long/ulong 精度" : "Type contracts and long/ulong precision",
        paragraphs: zh
          ? [
              "类型映射跟随反射和 JSON 特性：Guid、日期时间、Uri、Version、byte[] 映射 string；bool 映射 boolean；动态 JSON 映射 unknown；集合与字符串键字典映射数组/Record。属性级 LongToStringConverter 或 ULongToStringConverter 才会把 long/ulong 映射为 string（可空时 string | null）。",
              "普通 long/ulong 属于 primitive，会生成 number；超过 JavaScript Number.MAX_SAFE_INTEGER 时可能丢精度。公开 ID、游标、版本号等必须让真实 JSON 序列化为 string，并在 DTO/VO 属性使用受支持转换器或直接使用 string。TsGen 只识别属性级转换器，不能因为 C# 类型叫 long 就假设前端获得字符串；CI 要用边界值做 JSON 与生成类型联合测试。",
              "5.1.1 把 buildQueryParams 改成 T extends object 泛型，并移除了单个复杂 Query DTO 上强制转换为 Record<string, unknown> 的生成代码。没有字符串索引签名的严格 TypeScript 查询接口现在可直接编译，同时运行时仍递归展开为 page=1&size=20 这类顶层查询参数。该修复只改变生成客户端的类型兼容性，不改变后端模型绑定或公开 HTTP 路由。",
              "5.1.2 将生成的 SSE 消息分派改为 for...of，并提取 waitForReconnect；源码测试同时执行 TypeScript strict 编译、Umi ESLint 和 Node 运行时行为，验证消息顺序、retry 延迟、Last-Event-ID、最大重连次数、终止错误与 AbortSignal。它是生成代码兼容性修复，不等于为业务自动选择幂等、断线补偿或无限重试策略。",
            ]
          : [
              "Type mapping follows reflection and JSON attributes: Guid, date/time types, Uri, Version, and byte[] map to string; bool maps to boolean; dynamic JSON maps to unknown; collections and string-key dictionaries map to arrays and Record. Only a property-level LongToStringConverter or ULongToStringConverter maps long/ulong to string (or string | null when nullable).",
              "A plain long/ulong is primitive and generates number, which can lose precision above JavaScript Number.MAX_SAFE_INTEGER. Public ids, cursors, and versions must actually serialize as strings, using a supported converter on the DTO/VO property or a string property. TsGen recognizes the property-level converter; never assume a C# long becomes a frontend string. Exercise boundary values in combined JSON-serialization and generated-type tests.",
              "Version 5.1.1 made buildQueryParams generic as T extends object and removed the generated cast of a single complex query DTO to Record<string, unknown>. Strict TypeScript query interfaces without a string index signature now compile directly, while runtime serialization still flattens the DTO into top-level parameters such as page=1&size=20. This changes generated-client type compatibility, not backend model binding or the public HTTP route.",
              "Version 5.1.2 changed generated SSE message dispatch to for...of and extracted waitForReconnect. Source tests run strict TypeScript compilation, Umi ESLint, and Node runtime behavior for message order, retry delay, Last-Event-ID, maximum reconnect attempts, terminal errors, and AbortSignal. This is a generated-code compatibility fix; it does not choose application idempotency, missed-event recovery, or an unlimited-retry policy.",
            ],
      },
      {
        id: sectionIds[8],
        title: zh ? "把生成漂移变成 CI 失败" : "Turn generated drift into a CI failure",
        paragraphs: zh
          ? [
              "后端路由、参数来源或别名、DTO/VO、JSON 特性、返回包装、文件/SSE 合同、[AsgardTsGen] 或插件装配变化后必须重新生成。CI 在干净 checkout 中构建目标程序集，用唯一 runner 生成到固定目录，运行前端 typecheck/lint，然后用 git diff --exit-code 拒绝未提交快照。",
              "生成环境必须锁定 .NET SDK、Asgard/TsGen 包和前端工具链。不要用格式化噪声掩盖 API 删除；审查重点是 route、method、参数必填性、序列化字段、响应类型和删除文件。对于 ZIP 路径，记录宿主 commit/config 与期望插件列表，避免从错误进程取得一个合法但不相关的快照。",
            ]
          : [
              "Regenerate after changes to backend routes, parameter sources or aliases, DTO/VOs, JSON attributes, response wrappers, file/SSE contracts, [AsgardTsGen], or plugin wiring. In a clean checkout, CI builds the target assembly, runs one canonical runner into a fixed directory, executes frontend typecheck/lint, then rejects uncommitted snapshots with git diff --exit-code.",
              "Pin the .NET SDK, Asgard/TsGen package, and frontend toolchain. Do not hide API deletion in formatting noise; review routes, methods, parameter requiredness, serialized fields, response types, and removed files. For ZIP export, record the host commit/config and expected plugin set so a valid snapshot from the wrong process cannot pass unnoticed.",
            ],
        code: { language: "powershell", value: ciCommands },
      },
      {
        id: sectionIds[9],
        title: zh ? "前端接入保持生成与业务分层" : "Keep generated and business layers separate",
        paragraphs: zh
          ? [
              "把 common、controller、models 视为不可手改产物。页面或 DVA effect 调用 generated controller 方法并复用 models 类型；共享 request 实例负责 base URL、Bearer token、401 renew/登录跳转，统一 helper 解包 Response、PageResponse 和 CursorResponse。不要在页面重复声明 DTO、拼 URL 或逐页解析 code/message/data。",
              "生成器不会替你实现产品级错误策略、租户路由来源、权限 UI、重试、缓存或业务状态。租户页面仍须从路由取得 tenantId 并显式传入；前端权限只改善 UX，后端 AsgardAuth 与资源归属仍是安全边界。特殊流式或浏览器原生 API 若不采用生成客户端，要在架构记录中明确例外。",
            ]
          : [
              "Treat common, controller, and models as non-editable output. Pages or DVA effects call generated controller methods and reuse generated model types; the shared request instance owns base URL, Bearer tokens, and 401 renewal/login redirect, while shared helpers unwrap Response, PageResponse, and CursorResponse. Do not redeclare DTOs in pages, concatenate URLs, or parse code/message/data repeatedly.",
              "Generation does not implement product error policy, tenant-route ownership, permission UX, retries, caching, or domain state. Tenant pages still obtain tenantId from the route and pass it explicitly. Frontend permission checks only improve UX; backend AsgardAuth and resource ownership remain the security boundary. Record an explicit architecture exception for streaming or browser-native APIs that do not use the generated client.",
            ],
      },
      {
        id: sectionIds[10],
        title: zh ? "故障诊断顺序" : "Troubleshooting order",
        bullets: zh
          ? [
              "端点 404：同时检查 host.tsGen.enabled=true 与 Development；以启动日志的实际监听 URL 为准",
              "端点 500：检查插件系统是否启用、插件加载异常、生成器不支持的返回合同，并查看结构化异常日志",
              "只有 common：检查插件描述是否存在、程序集是否进入 ApplicationPart、MVC ControllerFeature 是否发现、[AsgardTsGen] 是否直接标在类上；零 Controller 本身不会让生成失败",
              "runner 缺 Controller：确认传入的是定义 Controller 的 Assembly，而非宿主 Assembly；若设置 ControllerTypes，确认集合没有漏项",
              "前端导入失败：宿主 ZIP 固定 @/services/request；确认别名、解压根与 models/<Controller>/index.ts 路径，不要在生成文件中修 import",
              "运行 API 404/401/403：生成成功只证明静态合同提取；另查真实宿主路由、认证、租户、授权与 API CORS",
              "类型错误或精度损失：对照实际 JSON、JsonPropertyName/JsonIgnore/JsonConverter；普通 long/ulong 是 number，不是安全字符串",
            ]
          : [
              "Endpoint 404: require both host.tsGen.enabled=true and Development, and use the actual listening URL from startup logs",
              "Endpoint 500: inspect plugin-system enablement, plugin load failures, unsupported response contracts, and the structured exception log",
              "Common only: check for a plugin descriptor, ApplicationPart registration, MVC ControllerFeature discovery, and [AsgardTsGen] directly on the class. Zero controllers does not itself fail generation",
              "Runner misses a controller: pass the assembly that defines the controller, not merely the host assembly; when ControllerTypes is set, verify the explicit collection",
              "Frontend import failure: host ZIP fixes @/services/request. Verify aliases, extraction root, and models/<Controller>/index.ts; never repair imports inside generated files",
              "Runtime API 404/401/403: successful generation proves only static extraction. Verify actual host routing, authentication, tenancy, authorization, and API CORS separately",
              "Type errors or precision loss: compare actual JSON and JsonPropertyName/JsonIgnore/JsonConverter. A plain long/ulong is number, not a safe string",
            ],
      },
      {
        id: sectionIds[11],
        title: zh ? "团队上线验收" : "Team release acceptance",
        bullets: zh
          ? [
              "在干净环境生成两次并比较字节/清单，证明输出稳定；同时证明 common/controller/models 的旧文件会消失、根目录其他文件保留",
              "断言预期 ControllerCount、关键 Controller 文件和禁止出现的宿主/未标记 Controller，不接受“ZIP 能下载”作为完整覆盖证明",
              "对每类 path/query/header/body/form、分页/游标、文件、SSE 与不支持返回类型运行生成器测试；失败必须阻断发布",
              "用没有索引签名的复杂 Query DTO 运行 strict TypeScript 编译和 page=1&size=20 运行时序列化测试",
              "对 SSE 生成结果运行 Umi ESLint 与真实 Node 行为测试，覆盖 retry、Last-Event-ID、最大重连、终止错误和 abort",
              "用超过 2^53-1 的 long/ulong 做后端 JSON、生成声明与浏览器读取联合测试，证明 ID 不变",
              "前端运行 typecheck、lint、build，并通过共享 request 完成一次认证、租户作用域、错误响应与分页真实调用",
              "把后台合同改动但未重新生成作为 CI 红灯；回滚时后端 commit、生成快照和前端消费必须一起回滚",
            ]
          : [
              "Generate twice in a clean environment and compare bytes/manifests for stability; also prove stale common/controller/models files disappear while other root files remain",
              "Assert expected ControllerCount, required controller files, and forbidden host/unmarked controllers. A downloadable ZIP is not proof of complete coverage",
              "Exercise path/query/header/body/form, page/cursor, file, SSE, and unsupported-return cases; generation failure must block release",
              "Compile a complex query DTO with no index signature under strict TypeScript and assert runtime serialization such as page=1&size=20",
              "Run Umi ESLint and real Node behavior against generated SSE code, covering retry, Last-Event-ID, maximum reconnects, terminal errors, and abort",
              "Use long/ulong values above 2^53-1 in a combined backend JSON, generated declaration, and browser-read test to prove ids remain unchanged",
              "Run frontend typecheck, lint, and build, then make authenticated, tenant-scoped, error-response, and paginated calls through the shared request layer",
              "Make an unregenerated backend contract change fail CI. Roll back the backend commit, generated snapshot, and frontend consumer together",
            ],
      },
      {
        id: sectionIds[12],
        title: zh ? "AI Ready 工作流与源码证据" : "AI Ready workflow and source evidence",
        paragraphs: zh
          ? [
              "让 Agent 选择或接入 TsGen 时先加载 asgard-admin-frontend；核对 host.tsGen 和插件导出时加载 asgard-host-features；修改 C# Controller/模型时加载 asgard-dotnet-10-csharp-14，并按任务补 asgard-api-development 与 asgard-backend-guard。Agent 必须先确认项目已 opt in，禁止把生成目录当手写实现区。",
              "维护本页时逐层检查项目类型、公开选项、提取器/类型映射、文件写入器、宿主筛选/归档、MVC 插件装配和测试。若未来源码真正增加官方 CLI，必须以可执行项目、参数解析与测试为证据，同步删除本页的 Library-only 警告；Skill 与源码冲突时继续以源码为准。",
            ]
          : [
              "Before an agent selects or integrates TsGen, load asgard-admin-frontend. Load asgard-host-features for host.tsGen and plugin export, and asgard-dotnet-10-csharp-14 when changing C# controllers or models; add asgard-api-development and asgard-backend-guard as the task requires. Confirm project opt-in first and never treat generated folders as a handwritten implementation area.",
              "Maintain this page by checking the project type, public options, extractor/type mapper, file writer, host filtering/archive, MVC plugin wiring, and tests. If source later ships an official CLI, require an executable project, argument parser, and tests as evidence before removing the Library-only warning. Source remains authoritative when a Skill conflicts with it.",
            ],
        code: { language: "text", value: sourceFiles },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "api-contracts-and-errors", label: zh ? "API 与错误合同" : "API and error contracts" },
      { product: "asgard", docSlug: "host-and-plugins", label: zh ? "宿主与插件" : "Host and plugins" },
      { product: "skills", docSlug: "skills-catalog", label: zh ? "Skills 目录" : "Skills catalog" },
    ],
  };
}

export const zhAsgardTsGenOperationsDocs: DocPage[] = [makeTsGenOperationsPage("zh")];
export const enAsgardTsGenOperationsDocs: DocPage[] = [makeTsGenOperationsPage("en")];
