import type { DocPage, Locale } from "./content";

const controllerCode = `using Asgard.Abstractions;
using Asgard.Abstractions.AspNetCore.Controller;
using Microsoft.AspNetCore.Mvc;

[Route("api/orders")]
public sealed class OrdersController(AbsAsgardContext asgardContext)
    : BaseController(asgardContext)
{
    [HttpGet("identity")]
    public IActionResult GetIdentity()
    {
        var userInfo = AsgardContext.IdentityContext?.UserInfo;
        return userInfo is null
            ? Unauthorized()
            : Ok(new { userInfo.UserId, userInfo.TenantId });
    }
}`;

const serviceCode = `using Asgard.Abstractions;

public sealed class ProductQueryService(
    AbsAsgardContext asgardContext,
    IProductRepository repository)
{
    public async Task<ProductDto?> GetAsync(Guid id)
    {
        var cacheKey = $"products:{id:N}";
        var cache = asgardContext.Cache;
        if (cache is not null)
        {
            var cached = await cache.GetAsync<ProductDto>(cacheKey);
            if (cached is not null)
            {
                return cached;
            }
        }

        var product = await repository.GetAsync(id);
        if (product is not null && cache is not null)
        {
            await cache.SetAsync(cacheKey, product);
        }

        return product;
    }
}`;

const requiredCapabilityCode = `var messageQueue = asgardContext.MessageQueue
    ?? throw new InvalidOperationException(
        "Messaging is required for OrderService. Enable messaging and verify startup.");

await messageQueue.PublishAsync("orders.created", message);`;

const pluginCode = `public sealed class OrdersPlugin : PluginBase
{
    protected override Task OnInitializeAsync(CancellationToken cancellationToken)
    {
        var context = GetAsgardContext();
        context.Trace?.AddNote("OrdersPlugin initialized.");
        return Task.CompletedTask;
    }
}`;

const registrationCode = `services.AddMultiLevelCache(configuration);
services.AddMessageQueue(configuration);
services.AddAsgardContext();`;

const capabilityRows = `Cache                 IMultiLevelCache?          cache; Yggdrasil supplies an injectable no-op when disabled
Compression           ICompressionService?       optional registration
TenantScopeFactory    ITenantScopeFactory?       non-HTTP tenant scopes
IdentityContext       IAsgardIdentityContext?    current identity snapshot
JobScheduler          IJobScheduler?             enabled scheduler manager
MessageQueue          IMessageQueue?             enabled messaging manager
DistributedLock       IDistributedLock?          explicit registration over Redis
Encryption            IEncryptionService?        standard Yggdrasil security registration
PasswordHasher        IPasswordHasher?           standard Yggdrasil security registration
KeyGenerator          IKeyGenerator?             standard Yggdrasil security registration
SystemConfig           ISystemConfig?              optional registration
WildcardMatcher       IWildcardMatcher?          optional registration
Trace                 IAsgardTraceContext?       current HTTP trace context`;

function createContextUsagePage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "context-usage",
    group: zh ? "框架" : "Framework",
    eyebrow: "ASGARD CONTEXT",
    title: zh ? "统一上下文与能力消费" : "Unified context and capability consumption",
    description: zh
      ? "在 Controller、Service 与插件中安全使用 AbsAsgardContext，并准确处理生命周期、可空能力与标准宿主特例。"
      : "Use AbsAsgardContext safely from controllers, services, and plugins while respecting lifetimes, nullable capabilities, and standard-host exceptions.",
    sections: [
      {
        id: "contract",
        title: zh ? "一个聚合入口，不是服务定位器替身" : "One aggregate entry point, not a service-locator substitute",
        paragraphs: zh
          ? [
              "AbsAsgardContext 是 Asgard 公共能力的强类型聚合入口。它把缓存、消息、作业、安全、身份、租户作用域和 Trace 等跨模块能力集中到一个 Scoped 对象，业务层不需要自行解析容器或维护一组可选依赖。",
              "它不替代 Repository、领域 Service 或任意第三方依赖。业务调用方向仍是 Controller → Service → Repository → Entity；只有共享框架能力从 Context 获取。需要实现级选项、连接健康状态或底层控制时，应直接注入对应专用接口。",
            ]
          : [
              "AbsAsgardContext is the strongly typed aggregate for shared Asgard capabilities. It exposes cache, messaging, jobs, security, identity, tenant scopes, and Trace through one scoped object so application code does not parse the container or carry a collection of optional dependencies.",
              "It does not replace repositories, domain services, or arbitrary third-party dependencies. The application direction remains Controller → Service → Repository → Entity; only shared framework capabilities belong behind the Context. Inject a dedicated interface when implementation-level options, connection health, or lower-level control are required.",
            ],
      },
      {
        id: "capabilities",
        title: zh ? "当前能力矩阵" : "Current capability matrix",
        paragraphs: zh
          ? ["抽象合同中的属性类型都可空；实际是否有值取决于宿主和 DI 注册。不要仅凭属性存在就宣称对应模块已启用或运行健康。"]
          : ["Every property is nullable in the abstract contract. Runtime availability depends on the host and DI registrations; a property declaration does not prove that its module is enabled or healthy."],
        code: { language: "text", value: capabilityRows },
      },
      {
        id: "controller",
        title: zh ? "Controller 继承 BaseController" : "Controllers inherit BaseController",
        paragraphs: zh
          ? ["BaseController 构造函数接收 AbsAsgardContext，并通过受保护的 AsgardContext 字段提供给派生 Controller。不要在 Controller 中重新从 RequestServices 定位同一对象；身份缺失时按接口安全合同返回 401/403，而不是伪造匿名业务身份。"]
          : ["BaseController receives AbsAsgardContext in its constructor and exposes it to derived controllers through the protected AsgardContext field. Do not resolve the same object again from RequestServices. When identity is absent, follow the API security contract with 401/403 instead of inventing an anonymous business identity."],
        code: { language: "csharp", value: controllerCode },
      },
      {
        id: "service",
        title: zh ? "Service 使用构造注入并显式选择降级" : "Services use constructor injection and explicit degradation",
        paragraphs: zh
          ? [
              "业务 Service 构造注入 AbsAsgardContext。对于缓存这类可选加速层，可以在能力缺失、未命中或标准宿主 no-op 时回到 Repository；缓存键仍须包含正确的租户或资源边界。",
              "不要用 null-forgiving 运算符掩盖能力边界，也不要在判空后再次读取属性。先保存局部引用可以让判空与本次操作使用同一个实例；真正必需的能力应在业务操作前显式检查并 fail closed。",
            ]
          : [
              "Application services receive AbsAsgardContext through constructor injection. An optional accelerator such as cache may fall back to the repository when unavailable, missed, or backed by the standard host's no-op implementation; the cache key still needs the correct tenant or resource boundary.",
              "Do not hide a capability boundary with the null-forgiving operator or reread a property after checking it. A local reference keeps the null check and this operation on the same instance. A capability required by the business operation must be checked explicitly and fail closed.",
            ],
        code: { language: "csharp", value: serviceCode },
      },
      {
        id: "required",
        title: zh ? "可选模块不等于可选业务语义" : "An optional module does not imply optional business semantics",
        paragraphs: zh
          ? ["消息发布、加密、租户身份或分布式互斥如果是正确性的必要条件，能力缺失时不得静默继续。启动验收应证明模块已注册且外部依赖健康，运行时检查则提供明确、可诊断的失败。"]
          : ["If message publication, encryption, tenant identity, or distributed exclusion is required for correctness, absence must not silently continue the operation. Startup acceptance should prove registration and external dependency health, while the runtime check provides an explicit, diagnosable failure."],
        code: { language: "csharp", value: requiredCapabilityCode },
      },
      {
        id: "cache-exception",
        title: zh ? "标准 Yggdrasil 的禁用缓存特例" : "The disabled-cache exception in standard Yggdrasil",
        paragraphs: zh
          ? [
              "AbsAsgardContext.Cache 的抽象类型是 IMultiLevelCache?，自定义容器未注册缓存时可以为 null。但 Asgard 5.1.3 的标准 Yggdrasil 宿主在 caching.enabled=false 时会注册 new MultiLevelCache(null, null, cacheConfig)，因此 Cache 仍可注入且表现为 no-op。",
              "所以不能用 Cache is null 判断缓存是否启用，也不能把 Context 的统一“可空”说明误写成标准宿主的真实运行状态。需要确认启用状态时读取受审查的 CacheConfig；需要验证 Redis/Memory 是否健康时使用对应管理或健康入口，而不是从属性非空推断。",
            ]
          : [
              "AbsAsgardContext.Cache is declared as IMultiLevelCache?, so it may be null in a custom container with no cache registration. Asgard 5.1.3's standard Yggdrasil host instead registers new MultiLevelCache(null, null, cacheConfig) when caching.enabled=false, leaving Cache injectable as a no-op.",
              "Therefore Cache is null is not an enabled-state check, and the Context's general nullable contract must not be presented as the standard host's exact runtime state. Read the reviewed CacheConfig to determine enablement; use the corresponding manager or health surface to prove Redis/Memory health rather than inferring it from a non-null property.",
            ],
      },
      {
        id: "lifetime",
        title: zh ? "Scoped 生命周期与并发边界" : "Scoped lifetime and concurrency boundaries",
        paragraphs: zh
          ? [
              "AddAsgardContext 把 AbsAsgardContext 和 IAsgardRepositoryContext 注册为 Scoped。HTTP 请求内的 Controller 与 scoped Service 共享请求作用域；不要把 Context 捕获到 singleton、静态字段、跨请求缓存或脱离作用域运行的后台委托。",
              "非 HTTP 多租户工作必须为每个租户创建独立服务作用域，并在其中建立 TenantScopeFactory 作用域；完整并行、身份恢复与 Guid.Empty 失败边界由“非 HTTP 租户隔离”专题负责。",
            ]
          : [
              "AddAsgardContext registers both AbsAsgardContext and IAsgardRepositoryContext as scoped. Controllers and scoped services share the request scope; never capture the Context in a singleton, static field, cross-request cache, or background delegate that outlives its scope.",
              "Non-HTTP multi-tenant work needs a separate service scope per tenant and a TenantScopeFactory scope inside it. The background-tenancy guide owns the complete parallelism, identity restoration, and Guid.Empty failure boundaries.",
            ],
      },
      {
        id: "plugin",
        title: zh ? "插件只能在生命周期允许后获取" : "Plugins resolve the Context only after the lifecycle allows it",
        paragraphs: zh
          ? ["PluginBase.GetAsgardContext() 会先检查阶段；InitializeAsync 之前调用会抛 InvalidOperationException。OnInitializeAsync 及之后可以获取，但插件不应把由宿主 ServiceProvider 解析出的 Context 当成某个 HTTP 请求的身份快照，也不应长期缓存它供并发请求复用。请求业务仍应在请求自己的 scoped Service 中执行。"]
          : ["PluginBase.GetAsgardContext() checks the phase first and throws InvalidOperationException before InitializeAsync. It is available from OnInitializeAsync onward, but a plugin must not treat a Context resolved from the host ServiceProvider as the identity snapshot of an HTTP request or cache it for concurrent requests. Request work still belongs in that request's scoped services."],
        code: { language: "csharp", value: pluginCode },
      },
      {
        id: "registration",
        title: zh ? "自定义宿主注册；标准宿主无需重复接线" : "Custom-host registration; no duplicate wiring in the standard host",
        paragraphs: zh
          ? [
              "YggdrasilHostBuilder 已调用 AddAsgardContext；使用标准宿主时不要重复注册。完全自定义的容器可以显式调用该扩展方法。源码注释建议先注册其他模块再注册 Context，这有助于阅读装配顺序，但构造参数在解析 scoped 实例时按最终容器选择，因此不要把调用顺序宣传成运行正确性的硬性条件。",
              "AddAsgardContext 只注册 Context 与 RepositoryContext，不会自动启用缓存、消息、作业、分布式锁或身份模块。每项能力仍需自己的配置、注册和启动验收。",
            ]
          : [
              "YggdrasilHostBuilder already calls AddAsgardContext; do not register it again when using the standard host. A fully custom container may call the extension explicitly. Source comments recommend registering other modules first, which makes composition easier to read, but constructor parameters are selected from the final container when the scoped instance is resolved. Do not present call order as a hard runtime-correctness requirement.",
              "AddAsgardContext registers only the Context and RepositoryContext. It does not enable cache, messaging, jobs, distributed locks, or identity automatically; every capability still needs its own configuration, registration, and startup acceptance.",
            ],
        code: { language: "csharp", value: registrationCode },
      },
      {
        id: "trace",
        title: zh ? "Identity、TenantScope 与 Trace 的交接边界" : "Handoffs for Identity, TenantScope, and Trace",
        bullets: zh
          ? [
              "IdentityContext 暴露框架恢复的身份快照；不要在业务层重新解析 ClaimsPrincipal。",
              "TenantScopeFactory 用于非 HTTP 租户作用域，但不能替代每租户独立 IServiceScope。",
              "Trace 只追加最小化的 Note、Tag 与 Branch；不得写 Token、密码、密钥、个人数据或完整对象图。",
              "Context 属性非空不证明外部依赖健康、消息已确认、锁仍持有或 Trace 已持久化。",
            ]
          : [
              "IdentityContext exposes the framework-restored identity snapshot; application code should not parse ClaimsPrincipal again.",
              "TenantScopeFactory establishes non-HTTP tenant state but does not replace one IServiceScope per tenant.",
              "Trace accepts minimal Notes, Tags, and Branches only; never add tokens, passwords, keys, personal data, or complete object graphs.",
              "A non-null Context property does not prove that an external dependency is healthy, a message was confirmed, a lock remains held, or Trace was persisted.",
            ],
      },
      {
        id: "agent-workflow",
        title: zh ? "AI Ready：先判能力合同，再生成代码" : "AI Ready: establish the capability contract before generating code",
        bullets: zh
          ? [
              "先加载 asgard-context-usage；再按所用属性加载 cache、messaging、job、security、identity 或 tracing 专项 Skill。",
              "从实际宿主与注册路径判断能力可用性，不从 nullable 注解或 Options 类型猜测已接线能力。",
              "代码审查搜索 Context 的 singleton 捕获、强制 !、静默跳过必要副作用、无租户缓存键和敏感 Trace 内容。",
              "测试至少覆盖能力存在、能力缺失、自定义 DI 与标准 Yggdrasil no-op 特例；外部依赖还要做真实故障验收。",
            ]
          : [
              "Load asgard-context-usage first, then load the cache, messaging, job, security, identity, or tracing Skill for every property the change consumes.",
              "Determine availability from the actual host and registration path, never from nullable annotations or an Options type alone.",
              "Review for singleton capture, forced ! access, silently skipped required side effects, tenant-free cache keys, and sensitive Trace content.",
              "Test capability-present, capability-absent, custom-DI, and standard-Yggdrasil no-op paths; external dependencies also require real failure acceptance.",
            ],
      },
      {
        id: "source-anchors",
        title: zh ? "源码核验入口" : "Source verification anchors",
        bullets: [
          "Common/Asgard.Abstractions/AbsAsgardContext.cs",
          "Common/Asgard.Core/AsgardContext.cs",
          "Common/Asgard.Core/AsgardContextModule/AsgardContextServiceCollectionExtensions.cs",
          "Common/Asgard.Abstractions.AspNetCore/Controller/BaseController.cs",
          "Common/Asgard.Core/Plugin/PluginBase.cs",
          "Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs",
        ],
      },
    ],
    relatedDocs: [
      {
        product: "asgard",
        docSlug: "tenant-background-work",
        label: zh ? "非 HTTP 租户隔离" : "Non-HTTP tenant isolation",
      },
      {
        product: "asgard",
        docSlug: "observability-operations",
        label: zh ? "Trace 与数据库日志运维" : "Trace and database-log operations",
      },
      {
        product: "asgard",
        docSlug: "cache-operations",
        label: zh ? "缓存生产操作" : "Cache production operations",
      },
    ],
  };
}

export const zhAsgardContextUsageDocs = [createContextUsagePage("zh")];
export const enAsgardContextUsageDocs = [createContextUsagePage("en")];
