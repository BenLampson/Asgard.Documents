import type { DocPage } from "./content";

type Locale = "zh" | "en";

const productionYaml = `host:
  cors:
    enabled: true
    defaultPolicy:
      allowAnyOrigin: false
      allowedOrigins:
        - "https://app.example.com"
        - "https://admin.example.com"
      allowAnyMethod: true
      allowAnyHeader: true
      allowCredentials: false
      preflightMaxAgeSeconds: 600`;

const namedPolicyYaml = `host:
  cors:
    enabled: true
    defaultPolicy:
      allowAnyOrigin: false
      allowedOrigins:
        - "https://app.example.com"
      allowAnyMethod: true
      allowAnyHeader: true
      allowCredentials: false
      preflightMaxAgeSeconds: 600
    policies:
      partner-api:
        allowAnyOrigin: false
        allowedOrigins:
          - "https://partner.example.com"
        allowAnyMethod: true
        allowAnyHeader: true
        allowCredentials: false
        preflightMaxAgeSeconds: 300`;

const pluginContributorCode = `public sealed class MyPluginCorsContributor : IPluginCorsContributor
{
    public IEnumerable<string> GetAllowedOrigins()
        => ["https://plugin-ui.example.com"];
}

protected override Task OnConfigureServicesAsync(
    IPluginServiceConfigurationContext context,
    CancellationToken cancellationToken)
{
    _ = context.Services.AddSingleton<
        IPluginCorsContributor,
        MyPluginCorsContributor>();

    return Task.CompletedTask;
}`;

const smokeCommands = `$allowedOrigin = "https://app.example.com"
$deniedOrigin = "https://untrusted.example.com"
$api = "https://api.example.com/api/hello"

# Simple request: expect Access-Control-Allow-Origin for the allowed origin.
curl.exe -i $api -H "Origin: $allowedOrigin"

# Preflight: expect 2xx plus allow-origin/method/header and max-age headers.
curl.exe -i -X OPTIONS $api ` + "`" + `
  -H "Origin: $allowedOrigin" ` + "`" + `
  -H "Access-Control-Request-Method: GET" ` + "`" + `
  -H "Access-Control-Request-Headers: authorization,content-type"

# Denied origin: the response must not expose Access-Control-Allow-Origin.
curl.exe -i $api -H "Origin: $deniedOrigin"`;

const sourceFiles = `Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs
Common/Asgard.Abstractions.AspNetCore/Host/CorsOptions.cs
Common/Asgard.Abstractions.AspNetCore/Host/CorsPolicyOptions.cs
Common/Asgard.Abstractions/Plugin/IPluginCorsContributor.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Configurator.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.PluginIntegration.cs
Host/Asgard.Yggdrasil.AspNetCore/PluginCorsPostConfigureOptions.cs
Test/Asgard.AspNetCore.Core.Tests/SystemConfig/HostConfigLoaderTests.cs`;

function makeCorsOperationsPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "cors-operations",
    group: zh ? "宿主与 Web" : "Host and web",
    eyebrow: "ASGARD 5.1.3 · BROWSER SECURITY",
    title: zh ? "宿主 CORS 运行手册" : "Host CORS operations",
    description: zh
      ? "正确配置默认与命名策略，审查插件 Origin，并用真实浏览器验证预检、凭据和跨产品边界。"
      : "Configure default and named policies correctly, review plugin origins, and verify preflight, credentials, and cross-product boundaries in a real browser.",
    sections: [
      {
        id: "model",
        title: zh ? "先划清安全边界" : "Start with the security boundary",
        paragraphs: zh
          ? [
              "CORS 是浏览器对跨 Origin JavaScript 请求的响应读取规则。它不会认证调用者，不会执行 AsgardAuth，不会建立租户隔离，也不能替代 CSRF 防护。非浏览器客户端仍可直接发起 HTTP 请求，因此每个受保护 API 仍必须进行后端认证与授权。",
              "Origin 精确包含 scheme、host 和 port；路径不属于 Origin。生产 allowlist 应只列受控 HTTPS Origin，不要把带路径、尾斜杠或通配式猜测当成等价值。",
            ]
          : [
              "CORS controls whether browser JavaScript may read a cross-origin response. It does not authenticate callers, execute AsgardAuth, establish tenant isolation, or replace CSRF protection. Non-browser clients can still send HTTP requests directly, so every protected API must keep backend authentication and authorization.",
              "An Origin consists exactly of scheme, host, and port; it has no path. A production allowlist should contain only controlled HTTPS origins, without paths, trailing slashes, or guessed wildcard equivalents.",
            ],
      },
      {
        id: "presence",
        title: zh ? "省略节点与禁用不是同一件事" : "Omission and disabling are different",
        paragraphs: zh
          ? [
              "host.cors 是可选父节点。完全省略它时，宿主既不注册 CORS 服务也不接入 UseCors。只要节点存在，HostConfig.Validate 就会验证默认策略和所有命名策略，即使 enabled=false；因此 enabled:false 不能让无效或空的 defaultPolicy 绕过启动校验。",
              "需要关闭 stock CORS 时优先完全省略 host.cors。需要启用时则提供一份完整、可审计的策略，不要留下只有 enabled 的空节点。",
            ]
          : [
              "host.cors is an optional parent node. Omitting it registers neither CORS services nor UseCors. Once the node exists, HostConfig.Validate validates the default policy and every named policy even when enabled=false, so enabled:false cannot bypass an invalid or empty defaultPolicy.",
              "Prefer omitting host.cors entirely when stock CORS is unused. When enabling it, supply a complete auditable policy instead of an enabled-only empty node.",
            ],
      },
      {
        id: "default-policy",
        title: zh ? "配置生产默认策略" : "Configure the production default policy",
        paragraphs: zh
          ? [
              "Yggdrasil 仅在 host.cors.enabled=true 时注册 ASP.NET Core CORS。无参数 UseCors() 消费默认策略，所以默认策略是 stock Controller 管线的全局浏览器边界。allowedOrigins 原样传入 ASP.NET Core；Asgard 不 trim、不规范化、不验证 URI，也不为静态列表去重。",
              "默认值为 allowAnyOrigin=false、allowAnyMethod=true、allowAnyHeader=true、allowCredentials=false、preflightMaxAgeSeconds=600。allowAnyOrigin=true 与 allowCredentials=true 的组合会在启动校验时失败；生产环境通常使用精确 Origin 列表。",
            ]
          : [
              "Yggdrasil registers ASP.NET Core CORS only when host.cors.enabled=true. Parameterless UseCors() consumes the default policy, making it the global browser boundary for the stock controller pipeline. allowedOrigins pass through unchanged; Asgard does not trim, normalize, URI-validate, or de-duplicate the static list.",
              "Defaults are allowAnyOrigin=false, allowAnyMethod=true, allowAnyHeader=true, allowCredentials=false, and preflightMaxAgeSeconds=600. allowAnyOrigin=true together with allowCredentials=true fails startup validation; production normally uses an exact origin list.",
            ],
        code: { language: "yaml", value: productionYaml },
      },
      {
        id: "method-header-gap",
        title: zh ? "5.1.3 的方法与请求头限制" : "The 5.1.3 method and header limitation",
        paragraphs: zh
          ? [
              "CorsPolicyOptions 没有 allowedMethods 或 allowedHeaders 集合。allowAnyMethod=false 与 allowAnyHeader=false 只是不调用 AllowAnyMethod/AllowAnyHeader，并不会从 YAML 建立 GET、POST、Authorization 等 allowlist。不要把 false 解释成“只允许常见方法或请求头”。",
              "需要细分方法或请求头时，必须由应用显式注册自定义 ASP.NET Core CORS 策略并在端点选择，或先扩展 Asgard 的公开配置面和集成测试；当前 stock YAML 无法表达该需求。",
            ]
          : [
              "CorsPolicyOptions exposes no allowedMethods or allowedHeaders collection. Setting allowAnyMethod=false or allowAnyHeader=false merely skips AllowAnyMethod/AllowAnyHeader; it does not create a YAML allowlist for GET, POST, Authorization, or any alternatives. Never describe false as allowing only common methods or headers.",
              "To restrict methods or headers, the application must explicitly register a custom ASP.NET Core CORS policy and select it on endpoints, or first extend Asgard's public configuration surface and integration tests. Stock YAML cannot express that requirement today.",
            ],
      },
      {
        id: "named-policies",
        title: zh ? "命名策略需要端点显式选择" : "Named policies require explicit endpoint selection",
        paragraphs: zh
          ? [
              "host.cors.policies 会把命名策略注册到 ASP.NET Core，但 stock 管线只调用无参数 UseCors()，不会根据 URL 自动选择它们。只有端点 metadata、EnableCors 特性或插件自己的明确接线选择策略名时，命名策略才生效。",
              "因此配置成功不等于某条路由已经受命名策略保护。发布前应对每个选择该策略的端点做允许与拒绝 Origin 的 HTTP 验收。",
            ]
          : [
              "host.cors.policies registers named policies with ASP.NET Core, but the stock pipeline calls only parameterless UseCors() and never chooses them by URL. A named policy applies only when endpoint metadata, an EnableCors attribute, or explicit plugin wiring selects its name.",
              "Successful configuration therefore does not prove that a route uses the named policy. Release acceptance must exercise allowed and denied origins against every endpoint that selects it.",
            ],
        code: { language: "yaml", value: namedPolicyYaml },
      },
      {
        id: "pipeline",
        title: zh ? "预检、中间件与静态文件" : "Preflight, middleware, and static files",
        bullets: zh
          ? [
              "UseCors 位于 UseRouting 之后，且早于全局限流、认证、租户、插件中间件和授权；浏览器 OPTIONS 预检不应先被 Bearer 认证拦截",
              "静态文件与 request Trace 位于 CORS 之前；被静态文件中间件命中的资源不会自动获得 host.cors 的响应头",
              "静态资产需要单独配置源站或 CDN CORS；host.cors 不能被描述为 wwwroot 的访问策略",
              "反向代理必须恢复正确 scheme/host，否则应用生成的 URL、Cookie 与浏览器实际 Origin 可能不一致；CORS allowlist 仍应使用浏览器看到的公开 Origin",
            ]
          : [
              "UseCors runs after UseRouting and before global rate limiting, authentication, tenancy, plugin middleware, and authorization; browser OPTIONS preflight should not first be blocked by Bearer authentication",
              "Static files and request Trace run before CORS; a resource handled by static-file middleware does not automatically receive host.cors response headers",
              "Configure static-asset or CDN CORS separately; host.cors is not the access policy for wwwroot",
              "A reverse proxy must restore the correct scheme and host so generated URLs, cookies, and the browser-visible Origin agree; the CORS allowlist still uses the public Origin seen by the browser",
            ],
      },
      {
        id: "plugin-origins",
        title: zh ? "插件只能扩大默认 Origin" : "Plugins can broaden only the default origins",
        paragraphs: zh
          ? [
              "启用宿主 CORS 后，插件可在服务注册阶段注册 IPluginCorsContributor。运行时后置配置器把贡献值追加到默认策略；null 集合、null/空/空白项会忽略，完全相同且区分大小写的字符串会去重。其余值不会 trim、规范化或安全验证，命名策略不会被修改。",
              "插件贡献不会启用 CORS，也不会创建默认策略。它能扩大浏览器访问面，因此必须把贡献 Origin 作为受信任插件供应链与发布评审的一部分，而不是把接口当作自动安全审批。",
            ]
          : [
              "When host CORS is enabled, a plugin may register IPluginCorsContributor during service registration. Runtime post-configuration appends contributions to the default policy; a null collection and null, empty, or whitespace entries are ignored, while exact case-sensitive duplicate strings are skipped. Other values are neither trimmed, normalized, nor security-validated, and named policies are unchanged.",
              "A contribution neither enables CORS nor creates a default policy. Because it can broaden browser access, review contributed origins as part of the trusted-plugin supply chain and release boundary, not as an automatic security approval.",
            ],
        code: { language: "csharp", value: pluginContributorCode },
      },
      {
        id: "heimdall-boundary",
        title: zh ? "Asgard API 与 Heimdall 是两套 CORS" : "Asgard API and Heimdall have separate CORS boundaries",
        paragraphs: zh
          ? [
              "Heimdall OIDC Client 的 allowedCorsOrigins 控制浏览器访问 Heimdall 的协议端点；Asgard host.cors 控制同一浏览器访问你的资源 API。配置其中一个不会自动配置另一个。SPA 登录、回调、logout、UserInfo、Token 端点与 API Bearer 请求必须分别验收。",
              "浏览器应用仍使用 Authorization Code + PKCE，不保存 Client Secret，并只用 Access Token 调 API。CORS 成功只表示浏览器允许读取响应，不表示 Token 的 issuer、audience、tenant 或权限已经通过后端验证。",
            ]
          : [
              "A Heimdall OIDC client's allowedCorsOrigins controls browser access to Heimdall protocol endpoints; Asgard host.cors controls that browser's access to your resource API. Configuring either side does not configure the other. Validate SPA login, callback, logout, UserInfo and Token endpoints separately from API Bearer requests.",
              "Browser applications still use Authorization Code plus PKCE, keep no Client Secret, and call APIs with Access Tokens only. CORS success merely allows the browser to read a response; it does not prove backend validation of token issuer, audience, tenant, or permissions.",
            ],
      },
      {
        id: "diagnostics",
        title: zh ? "诊断顺序" : "Diagnostic order",
        bullets: zh
          ? [
              "启动失败：先检查 wildcard+credentials、非 wildcard 空 allowedOrigins、负 preflightMaxAgeSeconds，以及 enabled:false 仍会验证的父节点",
              "浏览器提示 CORS：在 Network 面板区分 OPTIONS 与实际请求，检查 Origin 的 scheme/host/port 是否精确匹配，并查看响应是否缺少 Access-Control-Allow-Origin",
              "预检失败：核对请求方法和 Access-Control-Request-Headers；5.1.3 的 false 布尔没有可替代的 YAML allowlist",
              "凭据场景：Cookie 需要 allowCredentials=true、精确 Origin 和正确 SameSite/Secure；Bearer Authorization 头主要触发 header 预检，不应因此误用 wildcard+credentials",
              "插件 Origin 不生效：确认 host.cors.enabled=true、贡献器在服务注册阶段进入最终容器，并验证它追加的是默认策略而非命名策略",
            ]
          : [
              "Startup failure: check wildcard plus credentials, an empty allowedOrigins list for non-wildcard mode, negative preflightMaxAgeSeconds, and the fact that an enabled:false parent node is still validated",
              "Browser CORS error: separate OPTIONS from the actual request in Network tools, verify the exact scheme/host/port Origin, and inspect whether Access-Control-Allow-Origin is absent",
              "Preflight failure: inspect the requested method and Access-Control-Request-Headers; a false boolean has no replacement YAML allowlist in 5.1.3",
              "Credential flow: cookies require allowCredentials=true, an exact Origin, and correct SameSite/Secure settings; a Bearer Authorization header mainly triggers header preflight and does not justify wildcard plus credentials",
              "Plugin origin missing: confirm host.cors.enabled=true, the contributor reaches the final container during service registration, and it targets the default rather than a named policy",
            ],
      },
      {
        id: "acceptance",
        title: zh ? "发布验收矩阵" : "Release acceptance matrix",
        paragraphs: zh
          ? [
              "源码已有配置加载单测，但没有证明完整 Yggdrasil HTTP 预检与插件后置配置的专项端到端测试。每个部署环境都应从真实不同 Origin 的浏览器验证允许、拒绝、Bearer 与 Cookie 场景，并把下面的 HTTP smoke 纳入发布检查。",
              "至少证明：允许 Origin 的简单请求与 OPTIONS 返回正确 allow-origin；拒绝 Origin 不暴露该头；预检返回预期 method/header/max-age；凭据策略只回显精确 Origin；命名策略仅在显式选择端点生效；插件只扩展默认策略；静态资产由 CDN/源站自己的策略验证。",
            ]
          : [
              "Source tests cover configuration loading, but there is no dedicated end-to-end proof for the complete Yggdrasil HTTP preflight and plugin post-configuration path. In every deployment, validate allowed, denied, Bearer, and cookie cases from a real browser on a genuinely different Origin, and include the following HTTP smoke in release checks.",
              "At minimum prove: an allowed simple request and OPTIONS return the correct allow-origin; a denied Origin exposes no such header; preflight returns expected method/header/max-age; a credential policy echoes only the exact Origin; a named policy applies only to an explicitly selected endpoint; a plugin extends only the default policy; and static assets pass their own CDN/origin policy checks.",
            ],
        code: { language: "powershell", value: smokeCommands },
      },
      {
        id: "agent-workflow",
        title: zh ? "AI Ready 工作流与源码证据" : "AI Ready workflow and source evidence",
        paragraphs: zh
          ? [
              "让 Agent 修改 host.cors 时加载 asgard-host-features；涉及 Heimdall、SPA、PKCE 或 Token 时同时加载 identity-integration。Agent 必须核对配置类型、服务注册、最终中间件顺序和真实浏览器结果，不能从 Options 字段推断命名策略或静态文件已经自动接线。",
              "维护本页时优先 diff 下列文件。字段、默认值、验证、策略选择、中间件位置或插件贡献行为变化时，中英文页面、docs-sources contract、相关身份指南和验收矩阵必须一起更新。",
            ]
          : [
              "Load asgard-host-features when an agent changes host.cors; add identity-integration for Heimdall, SPA, PKCE, or token work. Verify configuration types, service registration, final middleware order, and real-browser behavior together; an Options field does not prove automatic named-policy or static-file wiring.",
              "Diff the following files first when maintaining this page. Any field, default, validation, policy-selection, middleware-position, or plugin-contribution change must update both locales, the docs-sources contract, related identity guidance, and the acceptance matrix together.",
            ],
        code: { language: "text", value: sourceFiles },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "host-configuration-fields", label: zh ? "宿主配置字段" : "Host configuration fields" },
      { product: "asgard", docSlug: "middleware-pipeline", label: zh ? "精确中间件顺序" : "Exact middleware order" },
      { product: "heimdall", docSlug: "heimdall-integration", label: zh ? "Heimdall 与资源 API 集成" : "Heimdall and resource API integration" },
    ],
  };
}

export const zhAsgardCorsOperationsDocs: DocPage[] = [makeCorsOperationsPage("zh")];
export const enAsgardCorsOperationsDocs: DocPage[] = [makeCorsOperationsPage("en")];
