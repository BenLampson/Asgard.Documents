import type { DocPage } from "./content";

const conventionCode = `[Repository]
public sealed class OrderRepository(
    IFreeSql fsql,
    IMultiLevelCache cache,
    ILogger<OrderRepository> logger,
    IAsgardRepositoryContext repositoryContext)
    : AbsAsgardRepositoryBase<Order, Guid>(fsql, cache, logger, repositoryContext),
      IOrderRepository;

[Service]
public sealed class OrderService(IOrderRepository repository) : IOrderService;

protected override Task OnConfigureServicesAsync(
    IPluginServiceConfigurationContext context,
    CancellationToken cancellationToken)
{
    var config = context.AddPluginConventions<OrdersPlugin, OrdersConfig>();
    config.Validate();
    return Task.CompletedTask;
}`;

const registrationAcceptance = `await using var scope = app.Services.CreateAsyncScope();
var services = scope.ServiceProvider;

_ = services.GetRequiredService<IOrderRepository>();
_ = services.GetRequiredService<IOrderService>();

var repositoryCount = services.GetServices<IOrderRepository>().Count();
var serviceCount = services.GetServices<IOrderService>().Count();
if (repositoryCount != 1 || serviceCount != 1)
{
    throw new InvalidOperationException(
        $"Unexpected registrations: repositories={repositoryCount}, services={serviceCount}");
}`;

const staticAssetsYaml = `host:
  staticFiles:
    enabled: true
    webRootPath: "wwwroot"
    requestPath: "/assets"
    enableDefaultFiles: false`;

const staticIndexYaml = `host:
  staticFiles:
    enabled: true
    webRootPath: "wwwroot"
    requestPath: ""
    enableDefaultFiles: true
    defaultFiles:
      - "index.html"`;

const staticPublishItems = `<ItemGroup>
  <Content Include="wwwroot\\**\\*"
           CopyToPublishDirectory="PreserveNewest" />
</ItemGroup>`;

const staticAcceptance = `# A known immutable asset: status, type, length/range and cache headers.
curl --fail --include https://api.example.com/assets/app.3f2a1c.js
curl --fail --head https://api.example.com/assets/app.3f2a1c.js
curl --include --range 0-15 https://api.example.com/assets/app.3f2a1c.js

# A miss must not reveal a directory listing or a protected file.
curl --include https://api.example.com/assets/missing.js
curl --include https://api.example.com/assets/
curl --include https://api.example.com/assets/appsettings.json

# Verify the same URLs in a real browser: MIME, console, cache and no secret files.`;

const swaggerYaml = `host:
  swagger:
    enabled: true
    title: "Order API"
    version: "v1"
    description: "Order service API"
    routePrefix: "swagger" # keep the current 5.1.3 default`;

const swaggerAcceptance = `BASE_URL="https://api.example.com"

# Both endpoints are public unless the proxy adds a separate policy.
curl --fail --show-error --dump-header swagger.headers \
  --output openapi.json "$BASE_URL/swagger/v1/swagger.json"
curl --fail --show-error --head "$BASE_URL/swagger/index.html"

# Preserve the accepted contract and compare it before promotion.
cp openapi.json "artifacts/openapi-v1-$RELEASE_ID.json"
# Run the team's semantic OpenAPI diff against the previous accepted file.
openapi-diff artifacts/openapi-v1-$PREVIOUS_RELEASE.json \
  "artifacts/openapi-v1-$RELEASE_ID.json"`;

const swaggerProxyExample = `# Keep the public upstream at the site root for Asgard 5.1.3.
location /swagger/ {
    proxy_pass http://asgard_upstream/swagger/;
    # Apply authentication / VPN / allowlist policy here.
}

# If the external URL is /platform/swagger/, explicitly rewrite both
# /platform/swagger/* and the UI's absolute /swagger/v1/swagger.json request.`;

const tokenExchangeCode = `curl --request POST \\
  --url "$AUTHORITY/connect/token" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --header "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "grant_type=authorization_code" \\
  --data-urlencode "code=$CODE" \\
  --data-urlencode "redirect_uri=$REDIRECT_URI" \\
  --data-urlencode "code_verifier=$CODE_VERIFIER"`;

const refreshCode = `curl --request POST \\
  --url "$AUTHORITY/connect/token" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --header "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "grant_type=refresh_token" \\
  --data-urlencode "refresh_token=$REFRESH_TOKEN" \\
  --data-urlencode "scope=openid api.read"`;

const introspectCode = `curl --request POST \\
  --url "$AUTHORITY/connect/introspect" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --header "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "token=$ACCESS_TOKEN"`;

const revokeCode = `# Access token
curl --request POST --url "$AUTHORITY/connect/revoke" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --data-urlencode "token=$ACCESS_TOKEN" \\
  --data-urlencode "token_type_hint=access_token"

# Refresh token: this hint is required by the current implementation
curl --request POST --url "$AUTHORITY/connect/revoke" \\
  --user "$CLIENT_ID:$CLIENT_SECRET" \\
  --data-urlencode "token=$REFRESH_TOKEN" \\
  --data-urlencode "token_type_hint=refresh_token"`;

export const zhRuntimeContractDocs: DocPage[] = [
  {
    slug: "dependency-registration", group: "插件", eyebrow: "DEPENDENCY INJECTION", title: "依赖注入与约定扫描", description: "准确使用显式 DI、Repository/Service 扫描与插件约定，避免重复描述符和未校验配置。", sections: [
      { id: "decision", title: "先选择唯一注册入口", bullets: ["插件程序集内普通 Repository + Service + 强类型 plugin.yaml：只调用一次 AddPluginConventions<TPlugin,TConfig>()", "非插件模块或必须扫描额外程序集：显式 AddRepositories(marker.Assembly) / AddServices(marker.Assembly)", "少量实现、特殊生命周期、工厂、keyed service、HostedService、开放泛型或需要精确接口暴露：使用显式 DI", "不要把 autoScanRepositories 当成 AddPluginConventions 的补充；它只在插件 ConfigureServices 后再扫 Repository", "宿主不会自动扫描所有 loaded assemblies，也不会根据目录或命名空间推断服务"] },
      { id: "scanner-predicates", title: "扫描器真正检查的条件很少", bullets: ["类型必须直接标记 [Repository] 或 [Service]；Attribute Inherited=false，基类标记不会传给派生类", "仅排除 abstract 与 interface；public、sealed、目录、命名空间、构造函数、仓储基类和生命周期都不是 predicate", "Assembly.GetTypes() 的顺序未排序；类型加载异常没有降级到可加载子集，会让该注册入口失败", "扫描器不验证 Controller → Service → Repository → Entity 分层、租户过滤、审计、乐观锁或 DTO/VO 映射", "不要把未验证的开放泛型、内部类型或多实现顺序当成约定能力；这些场景显式注册"] },
      { id: "plugin-conventions", title: "AddPluginConventions 的精确动作", paragraphs: ["它以 TPlugin.Assembly 为唯一扫描范围，先 AddRepositories，再 AddServices；随后从该程序集 DLL 目录读取固定文件名 plugin.yaml，并把返回的同一个 TConfig 实例注册为 Singleton。它不扫描引用程序集，不注册 Controller ApplicationPart，不同步数据库，也不调用 TConfig.Validate()。"], code: { language: "csharp", value: conventionCode } },
      { id: "config-boundary", title: "缺失配置与错误配置必须分开", paragraphs: ["plugin.yaml 不存在时返回 new TConfig()，这只表示采用类型默认值，不表示配置已通过业务校验。文件存在时由 YamlConfigLoader 解析；格式、转换或加载错误发生在服务配置阶段并可阻止宿主构建。插件应在 AddPluginConventions 返回后立即调用 config.Validate()，并测试缺失文件、空文件、拼错 key、非法枚举与秘密注入。", "配置路径基于插件程序集 Location，而不是 starter 当前目录。发布门禁必须证明 plugin.yaml 与插件 DLL 同目录；内存/单文件等没有可用 Location 的特殊加载模式不能从当前约定推断支持。"] },
      { id: "descriptor-identity", title: "Scoped 按 descriptor 缓存，不按实现类合并", paragraphs: ["每个实现类分别以自身类型和 GetInterfaces() 返回的全部接口追加 Scoped descriptor。容器会为每个 descriptor 使用 implementation type 创建实例；在同一 scope 内解析 OrderService、IOrderService 与另一个接口不保证对象相同。扫描还可能暴露框架/标记/继承接口。若需要一个实现实例共享给多个接口，先注册实现，再用 factory 从容器取同一实现；若只想暴露一个接口，也应显式注册。"] },
      { id: "multiple-implementations", title: "多实现没有稳定 winner 合同", paragraphs: ["扫描器不排序 Assembly.GetTypes()，也不检查一个接口是否已有实现。多个 [Service] 或 [Repository] 实现同一接口时会追加多个 descriptor；GetServices<T>() 返回全部，单个 GetRequiredService<T>() 通常取最后注册，但谁最后不能由源码类型顺序形成稳定业务合同。策略、多租户 provider 或 fallback 实现应使用显式工厂/keyed registration，并测试选择逻辑。"] },
      { id: "duplicate-paths", title: "重复入口会静默叠加", bullets: ["AddPluginConventions 已扫描 Repository 与 Service；再手写同程序集 AddRepositories/AddServices 会重复", "外部插件 autoScanRepositories 在插件 ConfigureServicesAsync 返回后执行，只重复 Repository，不扫描 Service、不加载配置", "扫描扩展使用 Add/AddScoped，不使用 TryAdd、TryAddEnumerable 或 descriptor 去重", "IEnumerable<T> 会暴露重复项；后台处理器、策略链或事件分发可能执行两次", "一个插件程序集只保留一个约定入口；跨程序集逐个列 marker，并用计数测试锁定预期"] },
      { id: "lifetimes", title: "默认全部 Scoped，不能替代生命周期设计", bullets: ["Repository 与 Service 的自身类型和接口 descriptor 全部是 Scoped", "HTTP 请求内适合 scoped；后台 Job、消息消费者或 HostedService 必须 CreateScope 后解析，不能从 singleton 直接持有 scoped 实例", "线程安全 SDK client、连接工厂、缓存协调器等不应因带 [Service] 就被迫 Scoped；按真实生命周期显式注册", "扫描不会验证 captive dependency，也没有在源码中显式开启 ValidateOnBuild/ValidateScopes；用测试和候选环境解析关键图"] },
      { id: "trim-aot", title: "反射发现需要发布形态验收", paragraphs: ["当前能力依赖 Assembly.GetTypes() 与 GetCustomAttribute/GetInterfaces。源码没有声明 trimming/AOT preservation contract，也没有生成式注册清单。若启用 PublishTrimmed、NativeAOT、单文件或自定义 AssemblyLoadContext，必须对实际发布物运行扫描与解析测试；未证明前不要宣称这些模式保留全部标记类型。关键模块可改用显式注册降低反射发现风险。"] },
      { id: "failure-diagnostics", title: "失败诊断", bullets: ["接口无法解析：确认 marker 指向实际实现程序集、特性直接标在具体类、注册入口确实执行", "出现两个实例：检查自身类型/接口分开 descriptor，或重复扫描路径；不要先怀疑 Scoped 失效", "IEnumerable 数量翻倍：检查 AddPluginConventions + autoScanRepositories/手动扫描重叠", "启动遇到 ReflectionTypeLoadException：检查扫描程序集缺失依赖并记录 LoaderExceptions；当前 scanner 不会部分继续", "配置使用默认值：确认 plugin.yaml 与 DLL 同目录、CopyToOutput/Publish 和文件名大小写", "后台解析 scoped 失败或泄漏：每个 Job/消息处理创建 scope，结束后释放"] },
      { id: "acceptance", title: "构建与真实解析验收", bullets: ["在测试中扫描精确程序集，断言 Repository/Service 实现集合和公开接口集合", "构建真实 starter，在一个 scope 中解析每个公开入口并执行轻量读操作", "断言 GetServices<T>() 数量；对要求共享实例的接口组合使用 ReferenceEquals 验证", "分别运行缺失/合法/非法 plugin.yaml，并证明 Validate 拒绝危险默认值和拼错字段", "发布产物（含 trimmed/single-file 候选）上重复解析，不只测试源码项目", "注入缺失依赖、重复实现与构造异常，确认启动失败信息可定位且不会接流量"], code: { language: "csharp", value: registrationAcceptance } },
      { id: "release-rollback", title: "升级与回滚", bullets: ["把公开 service contract、实现集合、lifetime 与配置默认值作为插件版本合同评审", "新增实现同一接口可能静默改变单服务解析 winner；发布前用 descriptor diff 阻断", "先 canary 真实 starter 的解析计数与关键功能，再扩大流量", "回滚必须恢复插件 DLL、依赖、plugin.yaml 与宿主版本；只回滚一个程序集可能让扫描或构造函数图不兼容", "回滚后再次运行解析计数、同 scope 身份与后台 scope 验收"] },
      { id: "ai-ready-sources", title: "AI Ready 与源码证据", paragraphs: ["Agent 维护本页先加载 asgard-repository-service-registration、asgard-plugin-development 与 asgard-plugin-lifecycle；改动仓储示例再加载 asgard-database/asgard-backend-guard。必须核对 Attribute、RepositoryScanner、ServiceScanner、AddRepositories、PluginConventions 与 PluginServiceConfigurator 主路径，不从目录命名、接口存在或 option 字段推断已注册能力。"] },
    ],
  },
  {
    slug: "static-files", group: "宿主运行时", eyebrow: "PUBLIC ASSETS", title: "静态文件托管", description: "用明确的 URL 前缀发布公共资产，并理解默认首页、目录解析和鉴权边界。", sections: [
      { id: "node-semantics", title: "省略节点仍会公开默认目录", paragraphs: ["HostConfig.StaticFiles 始终创建默认对象。完全省略 host.staticFiles 并不是关闭：enabled=true、webRootPath=wwwroot、requestPath 为空、enableDefaultFiles=false、defaultFiles=[index.html]。标准 Yggdrasil 管线仍会调用 UseAsgardStaticFiles，并在 ContentRootPath 下创建 wwwroot。", "要让纯 API 明确不提供文件，必须写 host.staticFiles.enabled=false。Validate 在 disabled 时立即返回，因此关闭节点中的其他残缺值不会阻止启动；重新启用前必须重新完整校验。"], code: { language: "yaml", value: staticAssetsYaml } },
      { id: "path-resolution", title: "物理根目录与 URL 前缀", bullets: ["相对 webRootPath 基于 ContentRootPath 转为绝对路径；绝对路径原样使用", "不存在的目录会被 Directory.CreateDirectory 创建；无权限或只读父目录可在启动时失败", "自动创建空目录会掩盖发布漏包：进程健康不代表资产存在", "requestPath 必须为空或以 / 开头，并会 TrimEnd('/')；配置 / 或 //// 会归一化为空字符串并映射站点根", "前缀不是访问控制。不要把操作系统宽目录、Secret 挂载点、用户上传目录或租户目录设为 webRootPath"] },
      { id: "publish", title: "发布不可变资产", paragraphs: ["把静态文件显式纳入 starter 的 publish 输出，并在镜像构建前核对文件清单和 SHA-256。生产使用内容哈希文件名；HTML/manifest 与其引用的 assets 必须属于同一 release ID。不要在运行容器内覆盖文件制造不可审计的半版本。"], code: { language: "xml", value: staticPublishItems }, note: "Directory.CreateDirectory 成功不是发布验收。至少对一个已知内容哈希文件做真实 GET。" },
      { id: "default-files", title: "默认首页不是 SPA fallback", paragraphs: ["enableDefaultFiles=false 是 5.1.3 默认值。打开后，UseDefaultFiles 按 defaultFiles 顺序只把目录根请求重写到实际存在的候选文件，再由 UseStaticFiles 返回。它不提供客户端路由 fallback；/orders/42 不会自动回到 index.html。"], code: { language: "yaml", value: staticIndexYaml } },
      { id: "pipeline-security", title: "public-before-security 是发布阻断项", paragraphs: ["UseAsgardStaticFiles 位于 Trace、Routing、CORS、全局限流、Authentication、Tenant 和 Authorization 之前。文件命中会短路，既没有身份/租户/权限检查，也没有 Asgard Trace、限流或 CORS 策略。文件未命中才继续后续动态管线，因此同一 URL 前缀的 hit/miss 可呈现不同日志、Header 和错误体。", "不得放入 app.yaml、plugin.yaml、appsettings、PFX、Source Map（若含源码/秘密）、Token、租户私有文件或需审计下载。受保护内容必须走授权 Controller 或有独立访问策略的对象存储。上线前应扫描发布树并从未认证浏览器验证敏感候选全部不可取。"] },
      { id: "route-collision", title: "根映射可能抢占动态路由", paragraphs: ["requestPath 为空时，真实文件可以在 Routing 之前抢占同形状的 /api、/swagger、/health 或插件端点。普通资产使用 /assets 等专用前缀，并在发布门禁中检查保留路径冲突。即使使用专用前缀，也不要把该前缀复用于受保护 Controller。"] },
      { id: "middleware-defaults", title: "默认中间件能力不能当作 Asgard 合同", paragraphs: ["Asgard 只给 PhysicalFileProvider、RequestPath 与默认文件名；没有显式配置 content-type provider、ServeUnknownFileTypes、OnPrepareResponse、缓存策略、压缩、目录浏览、symlink 策略或 path traversal 策略。unknown MIME、范围请求、条件请求、symlink 和路径规范化行为来自当前 ASP.NET Core StaticFileMiddleware/PhysicalFileProvider 默认实现。", "因此不要承诺任意扩展名一定可下载、symlink 一定允许或拒绝、Range/ETag/Last-Modified 的具体组合。对目标 .NET 10 构建与真实发布树逐项验收；安全设计不能依赖未由 Asgard 固定的默认行为。"] },
      { id: "cache-cdn", title: "缓存与 CDN 失效由部署负责", paragraphs: ["5.1.3 没有静态缓存 Header 配置面，也没有 CDN purge/version 协议。对内容哈希资产可由代理/CDN设置长缓存；可变 HTML、manifest 和服务工作线程采用更短、经过设计的策略。每次发布验证 HTML 只引用已上传对象，再切流量。", "回滚必须保留上一版本 HTML 和全部被引用的哈希资产；先删除旧对象会让浏览器/CDN 缓存的 HTML 永久引用 404。不要用清空整个 CDN 代替版本化。"] },
      { id: "failure-diagnostics", title: "失败诊断", bullets: ["进程健康但资产 404：检查 publish 清单、容器 WORKDIR/ContentRootPath、webRootPath 与大小写", "启动创建目录失败：检查只读根文件系统、父目录权限和错误的绝对路径", "根请求不返回 index：确认 enableDefaultFiles、候选顺序、文件真实存在与 requestPath", "API/health 返回意外文件：检查根映射和发布树中的保留路径冲突", "浏览器因 MIME 拒绝脚本：Asgard 没有自定义 provider，核对扩展名与实际 Content-Type", "有请求却无 Trace/429/CORS：若文件命中，这是 public-before-security 的预期；若不应公开则阻断发布", "新页面引用旧/缺失资产：检查 CDN 上传顺序、缓存键与 release manifest"] },
      { id: "rollback", title: "发布与回滚", bullets: ["先上传完整新哈希资产并验证，再发布引用它们的 HTML/manifest", "canary 同时检查直接源站与 CDN，确认状态、MIME、长度、缓存 Header 与浏览器控制台", "保留上一 release 的文件清单、digest 与 CDN 对象直到缓存窗口结束", "回滚 HTML/manifest 时同时保证其旧资产仍存在；无需覆盖新哈希对象", "关闭静态功能时验证 /assets 已不再命中，且没有同路径动态端点意外接管"] },
      { id: "acceptance", title: "真实 curl 与浏览器验收", bullets: ["未认证 GET 已知资产成功，且发布策略明确接受它是 public", "HEAD/Range/条件请求、Content-Type、Content-Length、ETag/Last-Modified/Cache-Control 按实际平台合同验收，不从 Asgard 推断", "missing、目录根、unknown extension、敏感候选、编码 traversal 尝试与 symlink 场景都按目标 OS/.NET 构建实测", "并发请求静态 hit 与动态 miss，证明 hit 绕过 Trace/CORS/limiter/auth，miss 进入后续管线", "真实浏览器加载 HTML、JS、CSS、字体与 Source Map 策略，检查控制台、网络缓存和跨源行为", "CDN 回源、缓存命中、版本切换与回滚后所有引用均无 404"], code: { language: "bash", value: staticAcceptance } },
      { id: "ai-ready-sources", title: "AI Ready 与源码证据", paragraphs: ["Agent 维护本页先加载 asgard-host-features、asgard-host-project 与 asgard-security。必须同时核对 StaticFileHostOptions、UseAsgardStaticFiles 主路径、Yggdrasil 中间件顺序和真实宿主测试；不能从 ASP.NET Core 当前默认值发明 Asgard 的 MIME、缓存、symlink、traversal 或授权保证。"] },
    ],
  },
  {
    slug: "swagger-openapi", group: "宿主运行时", eyebrow: "API CONTRACT", title: "Swagger 与 OpenAPI", description: "生成可验证的 API 契约，同时避开当前路由前缀与生产暴露边界。", sections: [
      { id: "node-semantics", title: "可空节点与关闭配置仍有校验", paragraphs: ["HostConfig.swagger 是可空节点：完全省略 host.swagger 时不注册生成器和中间件；节点存在但省略 enabled 时默认 true。宿主配置校验会对非空节点调用 Validate()，而 SwaggerOptions.Validate() 不先检查 Enabled，因此 enabled=false 仍要求 title、version、routePrefix 非空。不要把关闭节点当成可以容纳残缺占位值。"], code: { language: "yaml", value: swaggerYaml } },
      { id: "routes", title: "5.1.3 只可靠支持默认前缀", paragraphs: ["UseSwagger() 未配置 RouteTemplate，所以 JSON 固定使用 ASP.NET Core 默认 /swagger/{documentName}/swagger.json；UI 的 RoutePrefix 来自配置，并把 `/{routePrefix}/{version}/swagger.json` 写成绝对 endpoint。routePrefix=docs 时，UI 位于 /docs，却请求 /docs/v1/swagger.json，而真实 JSON 仍在 /swagger/v1/swagger.json。修复和端到端测试完成前保持 routePrefix=swagger。"], bullets: ["UI：/swagger 或 /swagger/index.html", "JSON：/swagger/v1/swagger.json", "自定义前缀不是生产支持能力；只改变 UI，不迁移 JSON"] },
      { id: "document-identity", title: "version 同时是 document name、URL 与展示版本", paragraphs: ["5.1.3 只调用一次 SwaggerDoc(version, OpenApiInfo)，所以只有一个 document。配置 version 同时决定生成器 document name、JSON 路径段与 OpenApiInfo.version。把 v1 改成 v2 会把 URL 改为 /swagger/v2/swagger.json，但不会自动做 API versioning、保留 v1、生成迁移层或判断兼容性。Title/Description 只是元数据。"] },
      { id: "discovery", title: "Controller 与插件发现发生在构建期", paragraphs: ["宿主先 AddControllers，再在 ConfigurePluginServices 中把成功解析的插件程序集加入 MVC ApplicationPart，之后才 AddSwaggerGen。因而入口程序集 Controller 与当次服务注册阶段已加入的插件 Controller 可进入同一文档。源码没有证明运行期新增/热重载插件会重建 MVC action descriptors 或 OpenAPI；发布后变更插件集合必须重启并重新抓取 spec 验收。"] },
      { id: "comments", title: "XML 注释只探测限定程序集", paragraphs: ["宿主探测入口程序集、Yggdrasil 宿主程序集和服务注册阶段的插件 descriptor 程序集，并从每个 DLL 所在目录查找同名 .xml。缺失、无 assembly.Location 或不在该集合中的共享程序集都会静默跳过。GenerateDocumentationFile 只是生成条件，还必须把 XML 随对应 DLL 发布并检查最终 spec；不要宣称会扫描所有 loaded assemblies。"] },
      { id: "auth-public", title: "Bearer scheme 不是保护策略", paragraphs: ["host.auth.enabled=true 只向 OpenAPI 添加 HTTP Bearer scheme 与全局 security requirement，供 Swagger UI Authorize 和客户端理解凭据；它不会给 UI、JSON 或 Controller 自动添加 RequireAuthorization。Swagger 中间件虽排在 UseAuthorization 后，但没有 endpoint policy，因此默认仍公开。反过来，外部认证配合 host.auth=false 时不会自动生成 Bearer 描述。必须同时审查真实 Controller 授权与文档公开边界。"] },
      { id: "proxy-pathbase", title: "反向代理与 PathBase 必须实测", paragraphs: ["UI 的 SwaggerEndpoint 以 `/` 开头，是站点根绝对路径，并不拼接 Request.PathBase。5.1.3 也没有 Swagger 专用 servers/base-path 配置。最稳妥的发布方式是让上游和外部都保留根路径 /swagger；若对外挂在 /platform/swagger，代理必须同时显式重写 UI、JSON 和绝对请求，并在真实浏览器 Network 中确认。Forwarded Headers、Issuer、TLS 和代理鉴权是独立宿主/代理职责。"], code: { language: "nginx", value: swaggerProxyExample } },
      { id: "compatibility", title: "Spec diff 是发布门禁，不是代码生成承诺", bullets: ["保存每次候选构建的原始 OpenAPI JSON、release ID 与 SHA-256", "使用语义 OpenAPI diff 识别删除 operation/schema、收紧 required、类型/格式/枚举和状态码变化", "对实际消费方生成器或 SDK 做编译与契约测试；Asgard 5.1.3 只产出 OpenAPI，不保证任意生成器兼容", "operationId、nullable、泛型 Response、分页和错误模型必须按实际 JSON 验收，不能从 C# 签名推断", "只改 title/description 通常不影响线路；改 version 会换 JSON URL，需同步消费者和代理"] },
      { id: "release-rollback", title: "发布、暴露与回滚", bullets: ["不需要生产文档时省略 host.swagger；enabled=false 节点仍保持合法字段", "需要时在反向代理、VPN、mTLS 或 IP allowlist 独立保护 UI 与 JSON，并验证未认证行为符合策略", "候选 spec 通过 diff、敏感端点/模型审查和消费者测试后再切流量", "保留上一镜像、app.yaml、代理规则与已接受 spec；回滚必须一起恢复，避免 UI、JSON URL 和消费者版本错配", "关闭或回滚后验证旧 UI/JSON 不再从源站、代理或 CDN 缓存意外可取"] },
      { id: "acceptance", title: "真实 curl 与浏览器验收", bullets: ["curl 抓取 /swagger/v1/swagger.json，验证状态、Content-Type、缓存/鉴权 Header，并解析为有效 OpenAPI", "真实浏览器打开 /swagger/index.html，确认无控制台错误且 Network 实际加载同一 JSON", "分别测试未认证、合法 Bearer、无效 Bearer；UI 的 Authorize 按钮不能替代 Controller 401/403 验收", "验证入口与插件 Controller、XML summary、统一 Response/error schema 均符合预期，且内部端点/敏感字段未泄露", "从真实外部代理 URL 测试根路径和子路径；若使用 PathBase，特别检查 UI 发出的绝对 /swagger 请求", "发布与回滚后重复抓取并与已接受 spec digest 对比"], code: { language: "bash", value: swaggerAcceptance } },
      { id: "ai-ready-sources", title: "AI Ready 与源码证据", paragraphs: ["Agent 维护本页先加载 asgard-host-features、asgard-host-project 与 asgard-api-development，并核对 SwaggerOptions、服务注册、插件 ApplicationPart、Swagger XML 选择和最终中间件管线。不要从配置类型、SwaggerGen 或某个客户端生成器的存在推断多文档、API versioning、PathBase 支持、动态热重载或消费者兼容性。"] },
    ],
  },
];

export const enRuntimeContractDocs: DocPage[] = [
  {
    slug: "dependency-registration", group: "Plugins", eyebrow: "DEPENDENCY INJECTION", title: "Dependency injection and convention scanning", description: "Use explicit DI, repository/service scanning, and plugin conventions without duplicate descriptors or unvalidated configuration.", sections: [
      { id: "decision", title: "Choose exactly one registration entry", bullets: ["Ordinary Repository + Service + typed plugin.yaml in one plugin assembly: call AddPluginConventions<TPlugin,TConfig>() once", "Non-plugin modules or deliberate extra assemblies: explicitly call AddRepositories(marker.Assembly) / AddServices(marker.Assembly)", "Small sets, special lifetimes, factories, keyed services, HostedService, open generics, or exact interface exposure: use explicit DI", "Do not treat autoScanRepositories as an AddPluginConventions supplement; it scans Repository again after plugin ConfigureServices", "The host does not scan all loaded assemblies or infer services from folders/namespaces"] },
      { id: "scanner-predicates", title: "Scanners test very few predicates", bullets: ["A concrete type must directly carry [Repository] or [Service]; Inherited=false means an attributed base class is insufficient", "Only abstract and interface are excluded; public, sealed, folders, namespace, constructor, repository base, and lifetime are not predicates", "Assembly.GetTypes() is unsorted; type-load failure has no fallback to loadable types and fails that registration entry", "Scanners do not validate Controller → Service → Repository → Entity layering, tenancy, audit, optimistic locking, or DTO/VO mapping", "Do not infer open-generic, internal-type, or multi-implementation ordering support; register those explicitly"] },
      { id: "plugin-conventions", title: "Exact AddPluginConventions actions", paragraphs: ["It uses TPlugin.Assembly as its only scan scope, calls AddRepositories and then AddServices, reads the fixed plugin.yaml filename beside that assembly DLL, and registers that TConfig instance as Singleton. It does not scan referenced assemblies, add Controller ApplicationParts, synchronize a database, or call TConfig.Validate()."], code: { language: "csharp", value: conventionCode } },
      { id: "config-boundary", title: "Separate missing configuration from invalid configuration", paragraphs: ["A missing plugin.yaml returns new TConfig(), meaning type defaults—not validated safety. An existing file goes through YamlConfigLoader; syntax, conversion, or load failure occurs during service configuration and can prevent host construction. Call config.Validate() immediately after AddPluginConventions and test missing, empty, misspelled key, invalid enum, and secret injection cases.", "The path is based on plugin assembly Location, not the starter working directory. Prove plugin.yaml ships beside the DLL. Current conventions do not establish support for special in-memory/single-file loading modes with no usable Location."] },
      { id: "descriptor-identity", title: "Scoped caches per descriptor, not per implementation", paragraphs: ["Every implementation is appended as itself and under every interface from GetInterfaces(). The container creates through each implementation-type descriptor; resolving OrderService, IOrderService, and another interface in one scope is not guaranteed to share an object. Scanning can expose framework, marker, or inherited interfaces. To share one object, register the implementation once and map interfaces through factories; to expose one interface only, register explicitly."] },
      { id: "multiple-implementations", title: "Multiple implementations have no stable winner contract", paragraphs: ["Scanners neither sort Assembly.GetTypes() nor reject an interface that already has an implementation. Multiple attributed implementations append descriptors. GetServices<T>() returns all; a single GetRequiredService<T>() normally selects the last registration, but source type order cannot define a stable business winner. Use an explicit factory/keyed registration and test selection for strategies, tenant providers, or fallbacks."] },
      { id: "duplicate-paths", title: "Overlapping entries silently accumulate", bullets: ["AddPluginConventions already scans Repository and Service; manual same-assembly AddRepositories/AddServices duplicates them", "External-plugin autoScanRepositories runs after ConfigureServicesAsync and repeats Repository only; it does not scan Service or load config", "Extensions use Add/AddScoped rather than TryAdd, TryAddEnumerable, or descriptor deduplication", "IEnumerable<T> exposes duplicates and can execute background handlers, policy chains, or dispatch twice", "Keep one convention entry per plugin assembly; list cross-assembly markers explicitly and lock expected counts in tests"] },
      { id: "lifetimes", title: "Everything defaults Scoped; that is not lifecycle design", bullets: ["Self and interface descriptors for Repository and Service are all Scoped", "HTTP requests fit scoped; a Job, message consumer, or HostedService must CreateScope before resolution and cannot retain scoped instances from a singleton", "Thread-safe SDK clients, connection factories, and cache coordinators should not become Scoped merely by carrying [Service]; register their real lifetime explicitly", "Scanning does not validate captive dependencies, and source does not explicitly enable ValidateOnBuild/ValidateScopes; resolve critical graphs in tests and candidate startup"] },
      { id: "trim-aot", title: "Reflection discovery requires publish-shape acceptance", paragraphs: ["The implementation depends on Assembly.GetTypes(), GetCustomAttribute, and GetInterfaces. Source declares no trimming/AOT preservation contract or generated registration manifest. If PublishTrimmed, NativeAOT, single-file, or a custom AssemblyLoadContext is enabled, run scan and resolution tests against the actual publish artifact. Until proven, do not claim every attributed type survives; use explicit registration for critical modules."] },
      { id: "failure-diagnostics", title: "Failure diagnostics", bullets: ["Interface does not resolve: confirm the marker identifies the implementation assembly, the concrete class directly owns the attribute, and the entry actually ran", "Two instances in one scope: inspect self/interface descriptor separation and duplicate scan paths before blaming Scoped", "IEnumerable count doubled: inspect AddPluginConventions plus autoScanRepositories/manual overlap", "ReflectionTypeLoadException at startup: inspect missing dependencies and LoaderExceptions; the scanner does not partially continue", "Configuration uses defaults: verify plugin.yaml is beside the DLL, copied to output/publish, and has the correct case", "Background scoped leak/failure: create and dispose one scope per job or message handling operation"] },
      { id: "acceptance", title: "Build and real-resolution acceptance", bullets: ["Scan the exact assembly in tests and assert the Repository/Service implementation and exposed-interface sets", "Build the real starter, resolve every public entry in one scope, and execute a lightweight read", "Assert GetServices<T>() counts and use ReferenceEquals for interfaces required to share one instance", "Run missing, valid, and invalid plugin.yaml cases and prove Validate rejects dangerous defaults and misspellings", "Repeat against the publish artifact, including trimmed/single-file candidates—not only source projects", "Inject missing dependencies, duplicate implementations, and constructor failure; require actionable startup failure before traffic"], code: { language: "csharp", value: registrationAcceptance } },
      { id: "release-rollback", title: "Upgrade and rollback", bullets: ["Review public service contracts, implementation sets, lifetimes, and configuration defaults as a plugin version contract", "Adding another implementation of one interface can silently change single-service resolution; block on a descriptor diff", "Canary the real starter's resolution counts and critical behavior before expanding traffic", "Rollback restores plugin DLL, dependencies, plugin.yaml, and host version together; rolling one assembly back can leave an incompatible scan/constructor graph", "After rollback repeat count, same-scope identity, and background-scope acceptance"] },
      { id: "ai-ready-sources", title: "AI Ready and source evidence", paragraphs: ["Agents maintaining this page must load asgard-repository-service-registration, asgard-plugin-development, and asgard-plugin-lifecycle; add asgard-database/asgard-backend-guard for repository examples. Inspect the attributes, RepositoryScanner, ServiceScanner, AddRepositories, PluginConventions, and PluginServiceConfigurator primary path. Never infer registration from folder naming, interface existence, or an option field."] },
    ],
  },
  {
    slug: "static-files", group: "Host Runtime", eyebrow: "PUBLIC ASSETS", title: "Static file hosting", description: "Publish public assets under an explicit URL prefix and understand default-file, path, and authorization boundaries.", sections: [
      { id: "node-semantics", title: "Omitting the node still publishes the default directory", paragraphs: ["HostConfig.StaticFiles always creates a default object. Omitting host.staticFiles does not disable the feature: enabled=true, webRootPath=wwwroot, requestPath is empty, enableDefaultFiles=false, and defaultFiles=[index.html]. The standard Yggdrasil pipeline still calls UseAsgardStaticFiles and creates wwwroot under ContentRootPath.", "A pure API must explicitly set host.staticFiles.enabled=false. Validate returns immediately when disabled, so invalid sibling fields in a disabled node do not stop startup; validate them fully before re-enabling."], code: { language: "yaml", value: staticAssetsYaml } },
      { id: "path-resolution", title: "Physical root and URL prefix", bullets: ["A relative webRootPath becomes absolute under ContentRootPath; an absolute path remains absolute", "Directory.CreateDirectory creates a missing root; permission or read-only-parent failures can surface during startup", "Automatic empty-directory creation hides a missing publish payload: process health does not prove assets exist", "requestPath must be empty or start with / and is TrimEnd('/'); / or //// normalizes to an empty string and maps the site root", "A prefix is not access control. Never point webRootPath at a broad OS directory, secret mount, user-upload directory, or tenant directory"] },
      { id: "publish", title: "Publish immutable assets", paragraphs: ["Include static files explicitly in the starter publish output and verify the file manifest and SHA-256 before image construction. Use content-hashed names in production; HTML/manifest and all referenced assets belong to one release ID. Never overwrite files inside a running container and create an unauditable half-version."], code: { language: "xml", value: staticPublishItems }, note: "Directory.CreateDirectory succeeding is not release acceptance. Perform a real GET for at least one known content-hashed file." },
      { id: "default-files", title: "A default index is not an SPA fallback", paragraphs: ["enableDefaultFiles=false is the 5.1.3 default. When enabled, UseDefaultFiles checks defaultFiles in order only for a directory-root request, rewrites to an existing candidate, and lets UseStaticFiles return it. It provides no client-route fallback: /orders/42 does not become index.html."], code: { language: "yaml", value: staticIndexYaml } },
      { id: "pipeline-security", title: "public-before-security is a release blocker", paragraphs: ["UseAsgardStaticFiles runs before Trace, Routing, CORS, global limiting, Authentication, Tenant, and Authorization. A hit short-circuits with no identity/tenant/permission check, Asgard Trace, limiter, or CORS policy. A miss continues through the dynamic pipeline, so hit and miss under one URL prefix can have different logs, headers, and error bodies.", "Never publish app.yaml, plugin.yaml, appsettings, PFX files, source maps containing source/secrets, tokens, tenant-private files, or audited downloads. Protected content belongs behind an authorized controller or object storage with its own access policy. Scan the release tree and verify every sensitive candidate is unavailable from an unauthenticated browser before go-live."] },
      { id: "route-collision", title: "A root mapping can preempt dynamic routes", paragraphs: ["With an empty requestPath, a physical file can preempt matching /api, /swagger, /health, or plugin endpoints before Routing. Use a dedicated prefix such as /assets and reject reserved-path collisions in the release gate. Do not reuse even a dedicated static prefix for an authorized controller."] },
      { id: "middleware-defaults", title: "Middleware defaults are not an Asgard contract", paragraphs: ["Asgard supplies only PhysicalFileProvider, RequestPath, and default-file names. It does not explicitly configure a content-type provider, ServeUnknownFileTypes, OnPrepareResponse, cache policy, compression, directory browsing, symlink policy, or path-traversal policy. Unknown MIME, range/conditional requests, symlinks, and path normalization therefore follow the current ASP.NET Core StaticFileMiddleware/PhysicalFileProvider defaults.", "Do not promise that arbitrary extensions are downloadable, symlinks are always accepted or rejected, or a particular Range/ETag/Last-Modified combination. Test the target .NET 10 build and real publish tree. Security design must not depend on defaults Asgard does not pin."] },
      { id: "cache-cdn", title: "Deployment owns cache and CDN invalidation", paragraphs: ["Version 5.1.3 exposes no static cache-header surface and no CDN purge/version protocol. A proxy/CDN can give content-hashed assets long caching while mutable HTML, manifests, and service workers use a shorter deliberate policy. Verify that HTML references only uploaded objects before switching traffic.", "Rollback requires the previous HTML and every hashed asset it references. Deleting old objects first leaves cached HTML permanently pointing to 404. Do not replace versioning with a whole-CDN flush."] },
      { id: "failure-diagnostics", title: "Failure diagnostics", bullets: ["Process healthy but asset 404: inspect publish manifest, container WORKDIR/ContentRootPath, webRootPath, and case", "Directory creation fails at startup: inspect read-only root, parent permissions, and an incorrect absolute path", "Root does not return index: inspect enableDefaultFiles, candidate order, physical existence, and requestPath", "API/health returns a file: inspect root mapping and reserved-path collisions in the publish tree", "Browser rejects a script for MIME: Asgard has no custom provider; inspect extension and actual Content-Type", "Request has no Trace/429/CORS: this is expected for a static hit; block release if it should not be public", "New HTML references old/missing assets: inspect CDN upload order, cache keys, and release manifest"] },
      { id: "rollback", title: "Release and rollback", bullets: ["Upload and verify all new hashed assets before publishing HTML/manifest that references them", "Canary both origin and CDN for status, MIME, length, cache headers, and browser console", "Retain the previous release manifest, digests, and CDN objects through the cache window", "When rolling HTML/manifest back, ensure all old referenced assets still exist; new hashed objects need not be overwritten", "When disabling static files, verify /assets no longer hits and no same-path dynamic endpoint unexpectedly takes over"] },
      { id: "acceptance", title: "Real curl and browser acceptance", bullets: ["An unauthenticated GET of a known asset succeeds only because the release explicitly accepts it as public", "Accept HEAD/range/conditional behavior, Content-Type, Content-Length, ETag/Last-Modified/Cache-Control against the actual platform contract—not an Asgard assumption", "Test missing, directory root, unknown extension, sensitive candidates, encoded traversal attempts, and symlink cases on the target OS/.NET build", "Request a static hit and dynamic miss concurrently to prove the hit bypasses Trace/CORS/limiter/auth while the miss enters the later pipeline", "Use a real browser for HTML, JS, CSS, fonts, source-map policy, console, network cache, and cross-origin behavior", "After CDN origin, cache hit, version switch, and rollback, every reference resolves without 404"], code: { language: "bash", value: staticAcceptance } },
      { id: "ai-ready-sources", title: "AI Ready and source evidence", paragraphs: ["Agents maintaining this page must load asgard-host-features, asgard-host-project, and asgard-security first. Check StaticFileHostOptions, the primary UseAsgardStaticFiles path, Yggdrasil middleware order, and real host tests together. Never invent an Asgard MIME, cache, symlink, traversal, or authorization guarantee from current ASP.NET Core defaults."] },
    ],
  },
  {
    slug: "swagger-openapi", group: "Host Runtime", eyebrow: "API CONTRACT", title: "Swagger and OpenAPI", description: "Generate a verifiable API contract while respecting the current route-prefix and production-exposure boundaries.", sections: [
      { id: "node-semantics", title: "A nullable node still validates when disabled", paragraphs: ["HostConfig.swagger is nullable: omitting host.swagger registers neither generator nor middleware; a present node with no enabled value defaults to true. Host validation calls Validate() for every present node, and SwaggerOptions.Validate() does not short-circuit on Enabled. Even enabled=false therefore requires non-empty title, version, and routePrefix. Do not use a disabled node as an invalid placeholder."], code: { language: "yaml", value: swaggerYaml } },
      { id: "routes", title: "Only the default prefix is reliable in 5.1.3", paragraphs: ["UseSwagger() has no RouteTemplate override, so JSON remains on the ASP.NET Core default /swagger/{documentName}/swagger.json. The UI RoutePrefix comes from configuration and receives an absolute `/{routePrefix}/{version}/swagger.json` endpoint. With routePrefix=docs the UI lives at /docs but requests /docs/v1/swagger.json while the real JSON stays at /swagger/v1/swagger.json. Keep routePrefix=swagger until source and end-to-end tests fix this."], bullets: ["UI: /swagger or /swagger/index.html", "JSON: /swagger/v1/swagger.json", "A custom prefix changes only UI; it does not relocate JSON"] },
      { id: "document-identity", title: "version is document name, URL, and display version", paragraphs: ["Version 5.1.3 calls SwaggerDoc(version, OpenApiInfo) once, producing one document. The configured version is simultaneously the generator document name, JSON path segment, and OpenApiInfo.version. Changing v1 to v2 moves the URL to /swagger/v2/swagger.json; it does not add API versioning, retain v1, create a migration layer, or decide compatibility. Title and Description are metadata only."] },
      { id: "discovery", title: "Controller and plugin discovery is build-time", paragraphs: ["The host calls AddControllers, adds successfully resolved plugin assemblies to MVC ApplicationPart during ConfigurePluginServices, and only then calls AddSwaggerGen. Entry controllers and plugin controllers present during that service-registration pass can therefore enter one document. Source does not prove that runtime plugin additions or hot reload rebuild MVC action descriptors or OpenAPI. Restart and recapture the spec whenever the deployed plugin set changes."] },
      { id: "comments", title: "XML comments probe a bounded assembly set", paragraphs: ["The host probes the entry assembly, Yggdrasil host assembly, and service-registration plugin descriptor assemblies, looking beside each DLL for a same-name .xml file. Missing files, assemblies without Location, and shared assemblies outside that set are silently skipped. GenerateDocumentationFile is only the generation prerequisite; ship XML beside every relevant DLL and inspect the final spec. Do not describe this as scanning all loaded assemblies."] },
      { id: "auth-public", title: "A Bearer scheme is not a protection policy", paragraphs: ["host.auth.enabled=true only adds an HTTP Bearer scheme and global security requirement for Swagger UI Authorize and client metadata. It does not add RequireAuthorization to UI, JSON, or controllers. Although Swagger middleware appears after UseAuthorization, it has no endpoint policy and remains public by default. Conversely, external authentication with host.auth=false does not automatically document Bearer. Review actual controller authorization separately from document exposure."] },
      { id: "proxy-pathbase", title: "Reverse proxy and PathBase require real tests", paragraphs: ["SwaggerEndpoint starts with `/`, making it site-root absolute instead of incorporating Request.PathBase. Version 5.1.3 also has no Swagger-specific servers/base-path option. The safest deployment preserves /swagger at both proxy and upstream. If the public URL is /platform/swagger, explicitly rewrite UI, JSON, and its absolute request, then inspect the real browser Network trace. Forwarded Headers, Issuer, TLS, and proxy authentication remain separate host/proxy responsibilities."], code: { language: "nginx", value: swaggerProxyExample } },
      { id: "compatibility", title: "Spec diff is a release gate, not a generator promise", bullets: ["Store raw candidate OpenAPI JSON with release ID and SHA-256", "Use a semantic OpenAPI diff for removed operations/schemas, newly required properties, type/format/enum, and status-code changes", "Compile and contract-test the generators or SDKs actually used by consumers; Asgard 5.1.3 emits OpenAPI but promises no arbitrary generator compatibility", "Accept operationId, nullable, generic Response, pagination, and error shapes from actual JSON rather than inferring them from C#", "A title/description edit is normally non-routing metadata; a version edit moves the JSON URL and requires coordinated consumer and proxy changes"] },
      { id: "release-rollback", title: "Release, exposure, and rollback", bullets: ["Omit host.swagger when production docs are unnecessary; keep fields valid even on enabled=false", "When required, independently protect UI and JSON with a reverse proxy, VPN, mTLS, or IP allowlist and verify unauthenticated behavior", "Promote only after spec diff, sensitive endpoint/model review, and consumer tests", "Retain the previous image, app.yaml, proxy rules, and accepted spec; roll them back together to avoid UI, JSON URL, and consumer skew", "After disable or rollback, prove old UI/JSON is not unexpectedly retrievable from origin, proxy, or CDN cache"] },
      { id: "acceptance", title: "Real curl and browser acceptance", bullets: ["Fetch /swagger/v1/swagger.json with curl; verify status, Content-Type, cache/auth headers, and valid OpenAPI parsing", "Open /swagger/index.html in a real browser; require no console errors and confirm Network loads the same JSON", "Test unauthenticated, valid Bearer, and invalid Bearer separately; an Authorize button cannot replace controller 401/403 tests", "Verify entry and plugin controllers, XML summaries, unified Response/error schemas, and absence of internal endpoints or sensitive fields", "Test the real external proxy URL at root and subpath; with PathBase, inspect the absolute /swagger request emitted by UI", "Repeat capture after promotion and rollback and compare its digest with the accepted spec"], code: { language: "bash", value: swaggerAcceptance } },
      { id: "ai-ready-sources", title: "AI Ready and source evidence", paragraphs: ["Agents maintaining this page must first load asgard-host-features, asgard-host-project, and asgard-api-development, then inspect SwaggerOptions, service registration, plugin ApplicationPart wiring, Swagger XML selection, and the final middleware pipeline. Never infer multi-document support, API versioning, PathBase support, dynamic hot reload, or consumer compatibility from an option type, SwaggerGen, or the existence of a client generator."] },
    ],
  },
];

export const zhHeimdallTokenDocs: DocPage[] = [
  {
    slug: "heimdall-token-lifecycle", group: "应用接入", eyebrow: "TOKEN OPERATIONS", title: "Token 生命周期、撤销与 Introspection", description: "从授权码、Access/Refresh Token 到在线检查与撤销，理解 Heimdall 的存储和传播边界。", sections: [
      { id: "routes", title: "端点与客户端边界", bullets: ["平台客户端使用 /connect/*；租户客户端必须使用 /{tenantId}/connect/* 且租户完全匹配", "/authorize 面向浏览器；public client 强制 PKCE S256", "/token 支持 public 的 client_id + none，以及 confidential 的 client_secret_basic/client_secret_post", "/introspect 与 /revoke 只允许 confidential client；SPA 不能直接调用"] },
      { id: "code", title: "Authorization Code 只能兑换一次", paragraphs: ["授权码是 48 字节随机值，数据库只存 SHA-256 hash；默认 5 分钟。兑换要求 client、redirect_uri 与 PKCE verifier 全部匹配，数据库通过条件更新原子地把 Active 改为 Redeemed，并发或重放只有一次成功。"], code: { language: "bash", value: tokenExchangeCode } },
      { id: "tokens", title: "响应、格式与寿命", bullets: ["响应 token_type 是 OAuth Bearer；Access Token 默认 1 小时，JWT 为默认格式，也可选择 opaque", "有 subject 且 scope 包含 openid 才签发 ID Token；ID Token 默认 5 分钟", "有 subject、offline_access 且 client 允许 refresh grant 才签发 Refresh Token；Client Credentials 永不签发", "Refresh Token 默认 30 天；授权码、Refresh 与 opaque 原值均不落库，只存 hash；JWT 只存 jti 与协议快照"] },
      { id: "refresh", title: "Refresh Token 轮换", paragraphs: ["refresh 请求仍需按 client 类型认证，显式 scope 只能保持或缩小原授权范围。RefreshTokenUsage=0 会原子核销旧 token 并签发 replacement，是推荐生产基线；当前 DTO 默认 1 会允许旧 token 重用，同时每次再签发新 token，形成多个并行有效 token。"], code: { language: "bash", value: refreshCode } },
      { id: "introspection", title: "Introspection 不是通用资源服务器模式", paragraphs: ["端点只检查 Access Token。未知、过期、撤销、租户不匹配或不属于认证 client 时返回 HTTP 200 {active:false}；active 响应包含 scope、client_id、sub、exp、iat、token_type=Bearer 与 tenant_id。当前还要求 token.client_id 等于调用方 client_id，因此只能自查本客户端 token，不能让通用资源服务器检查其他客户端签发的 token。"], code: { language: "bash", value: introspectCode } },
      { id: "revocation", title: "单 Token 撤销不级联", paragraphs: ["未知、跨 client 或跨 tenant token 返回空 200 以避免泄露存在性。撤销 Refresh Token 时当前实现必须显式传 token_type_hint=refresh_token；遗漏会按 Access Token 处理并静默 no-op。单 token 撤销不会撤销 sibling token、refresh family、底层 authorization 或整个 session。"], code: { language: "bash", value: revokeCode } },
      { id: "propagation", title: "JWT 撤销的传播边界", paragraphs: ["Heimdall 内部验证 JWT 时会检查数据库 record、黑名单和主体/会话撤销；外部 Asgard API 的普通 JwtBearer + JWKS 是离线验签，不会自动查询这些状态。因此登出或撤销不会即时传播给外部 API。使用短 Access Token TTL，并按架构选择 BFF、网关在线检查、可用的 introspection 适配、deny-list 或身份失效事件。opaque token 也不能由默认 JwtBearer 验证。"] },
      { id: "operations", title: "清理与 5.3.19 当前状态", bullets: ["OidcTokenCleanupJob 默认每 6 小时运行；过期后保留期默认 code 1 天、access record 7 天、refresh 30 天、device code 7 天、blacklist/revocation 7 天，authorization/consent 30 天", "平台与租户用户主体状态检查由 Heimdall 5.1.2 引入，并已在 clean 5.3.19 重新核对保留。平台用户必须仍存在，并至少保留一个启用且未删除的 Username、Email 或 Phone 登录凭据；租户用户必须存在且未删除、至少有一个启用凭据，并且 issuedAt 不早于 subject/session 撤销水位", "授权、同意、authorization code、refresh 与 device exchange 都会复查主体；失效主体的 code、refresh 与 device exchange 返回 invalid_grant，旧 Cookie 会退出并 Challenge 或返回 login_required。租户用户重新启用不会复活水位之前的 Cookie 或授权", "密码式交互登录只接受 Username、Email 或 Phone；显式提交其他 loginType 会失败，缺省类型按 Username → Email → Phone 的固定顺序查找。登录记录还必须关联存在且启用的业务用户，不能再退回 login-info id 充当 subject", "5.1.2 引入的租户主体失效事务在 clean 5.3.19 仍会级联 Token、Authorization、Code、Device Code、Consent 与活动会话，并持久化 identity.subject.invalidated Outbox；该异步事件不等于外部 API 已即时拒绝旧 JWT", "上线测试必须覆盖 code 重放、refresh scope 扩大、平台/租户主体停用与删除、introspection ownership、两种 token revoke、Webhook 消费幂等，以及外部 API 的撤销延迟"] },
    ],
  },
];

export const enHeimdallTokenDocs: DocPage[] = [
  {
    slug: "heimdall-token-lifecycle", group: "Application Integration", eyebrow: "TOKEN OPERATIONS", title: "Token lifecycle, revocation, and introspection", description: "Follow authorization codes and access/refresh tokens through online inspection and revocation, including storage and propagation boundaries.", sections: [
      { id: "routes", title: "Endpoint and client boundaries", bullets: ["Platform clients use /connect/*; tenant clients must use the exactly matching /{tenantId}/connect/* routes", "/authorize is browser-facing and public clients require PKCE S256", "/token accepts public client_id + none or confidential client_secret_basic/client_secret_post", "/introspect and /revoke require a confidential client; a SPA cannot call them directly"] },
      { id: "code", title: "An authorization code redeems once", paragraphs: ["The code is 48 random bytes and only its SHA-256 hash is stored; the default lifetime is five minutes. Redemption must match client, redirect_uri, and PKCE verifier. A conditional database update atomically moves Active to Redeemed, so only one concurrent or replayed exchange succeeds."], code: { language: "bash", value: tokenExchangeCode } },
      { id: "tokens", title: "Response, formats, and lifetimes", bullets: ["The OAuth response token_type is Bearer; Access Tokens default to one hour and JWT is the default, with opaque also available", "An ID Token is issued only for a subject with openid scope and defaults to five minutes", "A Refresh Token requires a subject, offline_access, and an allowed refresh grant; Client Credentials never receives one", "Refresh Tokens default to 30 days; code, refresh, and opaque plaintext are never stored, while JWT storage keeps jti and a protocol snapshot"] },
      { id: "refresh", title: "Refresh-token rotation", paragraphs: ["Refresh still authenticates according to client type, and an explicit scope can only preserve or narrow the original grant. RefreshTokenUsage=0 atomically redeems the old token and issues a replacement, making it the recommended production baseline. The current DTO default of 1 keeps the old token reusable while issuing a new one on every success, allowing parallel valid tokens."], code: { language: "bash", value: refreshCode } },
      { id: "introspection", title: "Introspection is not a general resource-server mode", paragraphs: ["Only Access Tokens are inspected. Unknown, expired, revoked, route-mismatched, or foreign-client tokens return HTTP 200 {active:false}. An active response contains scope, client_id, sub, exp, iat, token_type=Bearer, and tenant_id. Current ownership also requires token.client_id to equal the calling client_id, so a general resource server cannot inspect tokens issued to other clients."], code: { language: "bash", value: introspectCode } },
      { id: "revocation", title: "Single-token revocation does not cascade", paragraphs: ["Unknown, cross-client, and cross-tenant values return an empty 200 to avoid existence disclosure. For Refresh Tokens, the current implementation requires token_type_hint=refresh_token; omitting it tries Access Token validation and silently does nothing. One revoke does not revoke sibling tokens, a refresh family, the authorization, or the entire session."], code: { language: "bash", value: revokeCode } },
      { id: "propagation", title: "JWT revocation propagation boundary", paragraphs: ["Heimdall's own JWT validation checks the database record, blacklist, and subject/session revocation. A normal external Asgard JwtBearer + JWKS path validates offline and does not query those states, so logout or revocation does not immediately reach that API. Use short Access Token TTLs plus an architecture-appropriate BFF, gateway online check, usable introspection adapter, deny list, or identity-invalidation event. Default JwtBearer cannot accept opaque tokens either."] },
      { id: "operations", title: "Cleanup and current 5.3.19 state", bullets: ["OidcTokenCleanupJob defaults to every six hours; post-expiry retention defaults are code 1 day, access record 7 days, refresh 30 days, device code 7 days, blacklist/revocation 7 days, and authorization/consent 30 days", "Heimdall 5.1.2 introduced subject-state checks for platform and tenant users, and clean 5.3.19 re-verification confirms they remain present. A platform user must exist and retain an enabled, undeleted Username, Email, or Phone login credential. A tenant user must exist, remain undeleted, retain an enabled credential, and have issuedAt at or after the subject/session revocation watermark", "Authorization, consent, authorization-code, refresh, and device exchanges recheck the subject. An invalid subject receives invalid_grant at code, refresh, and device exchange; a stale cookie is signed out and challenged or receives login_required. Re-enabling a tenant user does not revive cookies or authorizations issued before the watermark", "Interactive password login accepts only Username, Email, or Phone. An explicit other loginType fails, while an omitted type searches Username → Email → Phone in fixed order. The login record must link to an existing enabled business user and no longer falls back to the login-info id as subject", "The tenant-subject invalidation transaction introduced in 5.1.2 still cascades Tokens, Authorization, Codes, Device Codes, Consent, and active sessions in clean 5.3.19 and persists an identity.subject.invalidated Outbox. That asynchronous event does not mean an external API has already rejected an old JWT", "Go-live tests should cover code replay, refresh scope expansion, platform and tenant subject disable/delete, introspection ownership, both token revocations, webhook-consumer idempotency, and external-API revocation delay"] },
    ],
  },
];
