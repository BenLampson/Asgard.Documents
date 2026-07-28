import type { DocPage, Locale } from "./content";
import {
  hostFeatureConfigBaseline,
  hostFeatureConfigFields,
  type HostFeatureConfigField,
  type HostFeatureGroup,
  type HostFeatureNote,
  type HostFeatureRuntimeStatus,
} from "./host-feature-config-field-data";

const statusLabels: Record<HostFeatureRuntimeStatus, Record<Locale, string>> = {
  wired: { zh: "wired：主宿主路径直接消费", en: "wired: consumed by the primary host path" },
  "partially-wired": { zh: "partially wired：只在部分策略/语义下消费", en: "partially wired: consumed only for part of the declared semantics" },
  "registered-opt-in": { zh: "registered/opt-in：已注册，但必须由端点或插件显式选择", en: "registered/opt-in: registered, but an endpoint or plugin must select it" },
  "development-only": { zh: "development only：服务可注册，端点仅 Development 映射", en: "development only: services can register, while the endpoint maps only in Development" },
  "validation-only": { zh: "validation only：会阻止非法配置，但没有运行时 consumer", en: "validation only: invalid values can stop startup, but no runtime consumer exists" },
  "declared-unwired": { zh: "declared/unwired：已声明，当前运行时未消费", en: "declared/unwired: declared but not consumed at runtime" },
};

const presenceLabels: Record<HostFeatureConfigField["presence"], Record<Locale, string>> = {
  always: { zh: "父配置始终存在；省略节点仍使用默认值", en: "parent always exists; omission still uses defaults" },
  "parent-present": { zh: "只有 nullable 父节点存在时生效；省略父节点即关闭", en: "applies only when the nullable parent exists; omitting the parent disables it" },
  "collection-item": { zh: "每个集合/字典项递归绑定", en: "recursively bound on each collection/dictionary item" },
};

const noteLabels: Record<HostFeatureNote, Record<Locale, string>> = {
  "always-public": { zh: "静态文件位于管道最前，命中后绕过 Trace、CORS、限流、认证、租户与授权；只能放公开内容。", en: "Static files run first and can bypass Trace, CORS, rate limiting, authentication, tenancy, and authorization. Store public content only." },
  "default-files-drift": { zh: "源码默认 false；当前 asgard-host-features Skill 仍写 true，维护时必须以源码为准。", en: "Source defaults to false; the current asgard-host-features Skill still says true, so source wins until the Skill is corrected." },
  "path-created": { zh: "相对路径基于 ContentRoot；不存在的目录会在启动时创建，路径也会写回 IWebHostEnvironment。", en: "Relative paths resolve from ContentRoot. Missing directories are created at startup and written back to IWebHostEnvironment." },
  "cors-node-trap": { zh: "cors: {} 与 enabled:false 都仍验证默认策略；默认 allowAnyOrigin=false + 空 origins 会失败。不使用时应省略整个节点。", en: "cors: {} and enabled:false still validate the default policy; false allowAnyOrigin plus empty origins fails. Omit the whole node when unused." },
  "cors-opt-in-policy": { zh: "命名策略通过 AddPolicy 注册，但 stock 管道只调用无参数 UseCors()；必须由端点/插件显式选用。", en: "Named policies register through AddPolicy, while the stock pipeline calls parameterless UseCors(); an endpoint/plugin must opt in." },
  "cors-no-method-list": { zh: "当前没有 allowedMethods/allowedHeaders 列表；设为 false 不会自动产生白名单。", en: "No allowedMethods/allowedHeaders list exists; false does not create a configurable allowlist." },
  "auth-gate-only": { zh: "只控制默认 JWT 与 UseAuthentication；UseAuthorization、AsgardAuth 和外部认证链路仍存在。", en: "Controls only default JWT and UseAuthentication; UseAuthorization, AsgardAuth, and external authentication paths remain." },
  "auth-request-time": { zh: "Discovery/JWKS 在首次相关 token 请求时加载；启动成功不证明网络、issuer 或密钥可用。", en: "Discovery/JWKS load on the first relevant token request; successful startup does not prove network, issuer, or key availability." },
  "issuer-two-stage": { zh: "JwtOptions 先做 URI/HTTPS 校验，服务注册再要求恰好一个 {tenant}；属于二阶段失败边界。", en: "JwtOptions checks URI/HTTPS first, then service registration requires exactly one {tenant}; this is a two-stage failure boundary." },
  "swagger-disabled-validates": { zh: "节点存在后即使 enabled=false，title/version/routePrefix 仍会 Validate。", en: "Once the node exists, title/version/routePrefix still validate even when enabled=false." },
  "swagger-prefix-gap": { zh: "自定义值只移动 UI 和 UI 请求地址；UseSwagger JSON 仍在 /swagger/{version}/swagger.json，非 swagger 前缀会让 UI 请求 404。", en: "A custom value moves the UI and its requested URL, while UseSwagger JSON stays at /swagger/{version}/swagger.json; non-swagger prefixes make the UI request 404." },
  "tsgen-dev-public": { zh: "GET /asgard-tsgen 固定、无授权 metadata，仅 Development 映射；plugin 未启用时首次请求可返回 500。", en: "GET /asgard-tsgen is fixed and has no authorization metadata. It maps only in Development and can return 500 on first request when plugins are disabled." },
  "global-rate-key": { zh: "partition key 固定为 global：每个进程一只全局桶，不按 IP、用户、租户、路由或 API key 分区。", en: "The partition key is fixed to global: one bucket per process, not per IP, user, tenant, route, or API key." },
  "policy-specific": { zh: "字段会无条件校验，但只由对应 policy 消费；多实例之间不共享计数。", en: "The field validates unconditionally but is consumed only by its matching policy; instances do not share counters." },
  "disabled-validates": { zh: "nullable 父节点省略才跳过；节点存在后 enabled=false 也不会跳过其他字段校验。", en: "Only omitting the nullable parent skips validation; enabled=false does not skip the remaining fields." },
  "health-timeout-unwired": { zh: "当前只参与 Validate；服务注册、检查执行与 endpoint options 都未读取它。", en: "Currently used only by Validate; registration, execution, and endpoint options do not read it." },
  "health-public": { zh: "端点没有授权 metadata；stock self check 永远 Healthy，不代表数据库、Redis、RabbitMQ 或 Quartz readiness。", en: "The endpoints carry no authorization metadata. The stock self check is always Healthy and does not prove database, Redis, RabbitMQ, or Quartz readiness." },
  "health-deduplicates": { zh: "重复路径按 path → ready → live 顺序不区分大小写静默去重；没有 YAML tags 字段。", en: "Duplicate paths are silently de-duplicated case-insensitively in path → ready → live order; no YAML tags field exists." },
  "plugin-module-gate": { zh: "内建插件注册会强制把 enabled 改为 true，默认 plugins 扫描目录随后也会参与外部发现。", en: "Registering a built-in plugin forces enabled=true, after which the default plugins scan directory also participates in external discovery." },
  "plugin-hot-reload-unwired": { zh: "全源码没有 watcher 或自动 reload consumer；不能承诺热重载。", en: "No watcher or automatic reload consumer exists in the source; do not promise hot reload." },
  "plugin-timeout-unwired": { zh: "加载、初始化、启动和 reload 都未读取该值；目前只是 validation-only。", en: "Load, initialize, start, and reload do not read this value; it is validation-only." },
  "plugin-isolation-boundary": { zh: "true 选择独立 PluginLoadContext，false 使用 Assembly.LoadFrom；DI/MVC 引用仍可能阻止物理卸载。", en: "true selects an isolated PluginLoadContext and false uses Assembly.LoadFrom; DI/MVC references can still prevent physical unload." },
  "plugin-path": { zh: "允许绝对路径；相对路径按进程工作目录解析，不锁定 app.yaml/ContentRoot。示例应避免泄露部署拓扑。", en: "Absolute paths are allowed; relative paths resolve from the process working directory, not app.yaml/ContentRoot. Examples should not leak deployment topology." },
  "plugin-explicit-only": { zh: "只可在显式 plugin.plugins[] 条目配置；扫描发现的插件没有等价入口。", en: "Configurable only on explicit plugin.plugins[] entries; scanned plugins have no equivalent setting." },
  "plugin-exclude-boundary": { zh: "匹配区分大小写，且先使用 provisional/config ID；加载后实例 Id 可能不同。", en: "Matching is case-sensitive and first uses a provisional/config ID; the instance Id can differ after load." },
  "plugin-id-overwritten": { zh: "用于前置排除与发现，但加载后描述符 Id 会被插件实例的 plugin.Id 覆盖。", en: "Used for pre-load exclusion/discovery, then overwritten by the plugin instance plugin.Id." },
  "plugin-scan-shape": { zh: "始终先枚举扫描根的一层子目录；recursive 只决定是否在每个插件子目录深处寻找入口 DLL。", en: "Discovery always enumerates one level of child plugin directories; recursive only controls how deeply each child is searched for an entry DLL." },
};

const groupTitles: Record<HostFeatureGroup, Record<Locale, string>> = {
  "static-files": { zh: "host.staticFiles · 公开静态文件", en: "host.staticFiles · public static files" },
  cors: { zh: "host.cors · 浏览器跨域策略", en: "host.cors · browser CORS policies" },
  auth: { zh: "host.auth · 默认 Bearer JWT", en: "host.auth · default Bearer JWT" },
  swagger: { zh: "host.swagger · OpenAPI 与 UI", en: "host.swagger · OpenAPI and UI" },
  tsgen: { zh: "host.tsGen · 开发期客户端导出", en: "host.tsGen · development client export" },
  "rate-limiting": { zh: "host.rateLimiting · 进程内全局限流", en: "host.rateLimiting · in-process global limiting" },
  "health-check": { zh: "host.healthCheck · 健康端点", en: "host.healthCheck · health endpoints" },
  "plugin-host": { zh: "plugin.* · 外部插件发现与加载", en: "plugin.* · external plugin discovery and loading" },
};

const fieldBlock = (item: HostFeatureConfigField, locale: Locale) => {
  const zh = locale === "zh";
  return [
    item.path,
    `  ${zh ? "类型/默认" : "type/default"}: ${item.type} / ${item.defaultValue}`,
    `  ${zh ? "存在语义" : "presence"}: ${presenceLabels[item.presence][locale]}`,
    `  ${zh ? "校验" : "validation"}: ${item.validation}`,
    `  ${zh ? "运行期" : "runtime"}: ${statusLabels[item.status][locale]}`,
    `  ${zh ? "敏感" : "sensitive"}: ${item.sensitive ? "true · REDACT" : "false"}`,
    `  ${zh ? "源码" : "source"}: ${item.sourceMember}`,
    item.note ? `  ${zh ? "边界" : "boundary"}: ${noteLabels[item.note][locale]}` : undefined,
  ].filter(Boolean).join("\n");
};

const groupCode = (group: HostFeatureGroup, locale: Locale) =>
  hostFeatureConfigFields.filter((item) => item.group === group).map((item) => fieldBlock(item, locale)).join("\n\n");

const safeYaml = `host:
  staticFiles:
    enabled: false

  cors:
    enabled: true
    defaultPolicy:
      allowAnyOrigin: false
      allowedOrigins:
        - https://app.example.com
      allowAnyMethod: true
      allowAnyHeader: true
      allowCredentials: true
      preflightMaxAgeSeconds: 600

  auth:
    enabled: true
    jwt:
      issuerTemplate: https://id.example.com/{tenant}
      audience: orders-api
      requireHttpsMetadata: true
      discoveryCacheMinutes: 60
      jwksCacheMinutes: 15

  swagger:
    enabled: true
    title: Orders API
    version: v1
    routePrefix: swagger

  tsGen:
    enabled: false

  rateLimiting:
    enabled: true
    policy: FixedWindow
    permitLimit: 100
    windowSeconds: 60
    segmentsPerWindow: 10
    queueLimit: 0

  healthCheck:
    enabled: true
    path: /health
    readyPath: /health/ready
    livePath: /health/live
    timeoutSeconds: 30

plugin:
  enabled: true
  plugins: []
  scanDirectories: []
  enableHotReload: false
  loadTimeoutSeconds: 30
  enableIsolation: true
  dataDirectory: plugins-data
  excludePlugins: []`;

const groups: HostFeatureGroup[] = ["static-files", "cors", "auth", "swagger", "tsgen", "rate-limiting", "health-check", "plugin-host"];

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";
  return {
    slug: "host-configuration-fields",
    group: zh ? "宿主运行时" : "Host Runtime",
    eyebrow: `ASGARD ${hostFeatureConfigBaseline.frameworkVersion} · HOST CONTRACT`,
    title: zh ? "宿主功能与插件配置字段合同" : "Host feature and plugin configuration field contract",
    description: zh
      ? "静态文件、CORS、JWT、Swagger、TsGen、限流、健康检查和外部插件的真实默认值、校验与接线状态。"
      : "Actual defaults, validation, and runtime wiring for static files, CORS, JWT, Swagger, TsGen, rate limiting, health checks, and external plugins.",
    sections: [
      {
        id: "scope",
        title: zh ? "先判断父节点是否存在" : "Start with parent-node presence",
        paragraphs: [
          zh
            ? "host.cors、host.auth、host.swagger、host.tsGen、host.rateLimiting 与 host.healthCheck 都是 nullable 父节点：完全省略就关闭功能；一旦节点存在，内部 enabled 往往默认 true。host.staticFiles 与 plugin 配置则始终创建，省略仍保留默认行为。"
            : "host.cors, host.auth, host.swagger, host.tsGen, host.rateLimiting, and host.healthCheck are nullable parents: omission disables them, while an existing node often defaults enabled to true. host.staticFiles and plugin configuration are always created and retain default behavior when omitted.",
          `${hostFeatureConfigBaseline.inspectedOn} · Asgard ${hostFeatureConfigBaseline.frameworkVersion} · ${hostFeatureConfigBaseline.sourceCommit}`,
          zh
            ? "本页分别核对 ConfigPath/CLR 默认、父节点 presence、Validate 与最终 consumer。Skill 示例用于工作流提示，不覆盖当前源码事实。"
            : "This page audits ConfigPath/CLR defaults, parent presence, Validate, and the final consumer separately. Skill examples guide workflow but do not override current source facts.",
        ],
      },
      ...groups.map((group) => ({
        id: group,
        title: groupTitles[group][locale],
        paragraphs: group === "static-files"
          ? [noteLabels["always-public"][locale]]
          : group === "auth"
            ? [zh ? "这是 tenant issuer JWT resource-server 路径，不支持 opaque introspection、平台根 issuer、多 issuer 或逐请求撤销检查。Discovery/JWKS/key rotation 故障主要在请求期暴露。" : "This is a tenant-issuer JWT resource-server path, not opaque introspection, a platform-root issuer, multiple issuers, or per-request revocation checking. Discovery/JWKS/key-rotation failures surface primarily at request time."]
            : group === "rate-limiting"
              ? [noteLabels["global-rate-key"][locale]]
              : group === "health-check"
                ? [noteLabels["health-public"][locale]]
                : group === "plugin-host"
                  ? [zh ? "所有集合、disabled 条目、扫描目录、超时和 dataDirectory 即使 plugin.enabled=false 仍会 Validate；内建插件还会强制开启插件系统。" : "Collections, disabled entries, scan directories, timeout, and dataDirectory still validate when plugin.enabled=false; registering a built-in plugin also forces the plugin system on."]
                  : undefined,
        code: { language: "text", value: groupCode(group, locale) },
      })),
      {
        id: "safe-example",
        title: zh ? "显式、安全的宿主示例" : "Explicit, safe host example",
        paragraphs: [zh ? "示例避免依赖静态文件、CORS、插件扫描和 Swagger 前缀的反直觉默认值。未使用的 nullable host 节点应整个省略；秘密与实际外部地址仍应由部署系统注入。" : "The example avoids relying on surprising static-file, CORS, plugin-scan, and Swagger-prefix defaults. Omit unused nullable host nodes entirely; inject secrets and real external addresses through deployment configuration."],
        code: { language: "yaml", value: safeYaml },
      },
      {
        id: "ai-ready",
        title: zh ? "AI Ready 维护规则" : "AI Ready maintenance rules",
        bullets: zh
          ? [
              "Agent 修改 host.* 或 plugin.* 时先加载 asgard-configuration 与 asgard-host-features；涉及插件加载再加载 asgard-plugin-development/lifecycle。",
              "每个字段必须同时回答：父节点缺失怎样、enabled=false 是否跳过 Validate、谁消费、在哪个阶段失败、是否公开或敏感。",
              "不要从 XML 注释或 Skill 示例推导能力：enableDefaultFiles、healthCheck.path、热重载、加载超时与自定义 Swagger 前缀都有已知漂移/缺口。",
              "认证验收必须真实请求 Discovery/JWKS 与轮换后的 kid；启动成功不是认证可用证据。",
              "任何 consumer 接线变化都同步本页、对应专题、docs-sources.json、版本说明和双语测试。",
            ]
          : [
              "For host.* or plugin.* changes, load asgard-configuration and asgard-host-features; add asgard-plugin-development/lifecycle for plugin loading.",
              "For every field, answer: what happens when the parent is absent, whether enabled=false skips Validate, who consumes it, when failure occurs, and whether it is public or sensitive.",
              "Do not infer capability from XML comments or Skill examples: enableDefaultFiles, healthCheck.path, hot reload, load timeout, and custom Swagger prefixes have known drift/gaps.",
              "Authentication acceptance must request real Discovery/JWKS and exercise a rotated kid; startup success is not evidence that authentication works.",
              "Any consumer-wiring change updates this page, the owning guide, docs-sources.json, release notes, and bilingual tests together.",
            ],
      },
      {
        id: "acceptance",
        title: zh ? "发布验收清单" : "Release acceptance checklist",
        bullets: zh
          ? [
              "确认公开目录不包含受保护文件，并验证静态文件命中不会经过 Trace/认证/授权。",
              "用真实浏览器验证默认 CORS、命名策略显式选择、凭据模式与预检缓存。",
              "固定 routePrefix=swagger，分别请求 UI 与 /swagger/v1/swagger.json。",
              "多实例系统不要把进程内 global limiter 当成分布式配额；为 readiness 注册真实依赖检查与 ready tag。",
              "插件目录使用受控发布链、权限与 hash allowlist；演练缺失 DLL、重复 ID、依赖失败和回滚，不依赖热重载或 loadTimeoutSeconds。",
            ]
          : [
              "Keep protected files out of public roots and verify that static-file hits bypass Trace/authentication/authorization.",
              "Use a real browser to verify default CORS, explicit named-policy selection, credential mode, and preflight caching.",
              "Keep routePrefix=swagger and request both the UI and /swagger/v1/swagger.json.",
              "Do not treat the per-process global limiter as a distributed quota; register real dependency checks with ready tags.",
              "Protect plugin directories with a controlled release chain, permissions, and a hash allowlist. Rehearse missing DLLs, duplicate IDs, dependency failure, and rollback without relying on hot reload or loadTimeoutSeconds.",
            ],
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "configuration-fields", label: zh ? "核心配置字段合同" : "Core configuration fields" },
      { product: "asgard", docSlug: "infrastructure-configuration-fields", label: zh ? "基础设施配置字段合同" : "Infrastructure configuration fields" },
      { product: "asgard", docSlug: "middleware-pipeline", label: zh ? "精确中间件顺序" : "Exact middleware order" },
      { product: "asgard", docSlug: "plugin-lifecycle", label: zh ? "插件生命周期" : "Plugin lifecycle" },
      { product: "asgard", docSlug: "resource-api-authentication", label: zh ? "验证 Heimdall Access Token" : "Validate Heimdall access tokens" },
    ],
  };
};

export const zhHostFeatureConfigFieldDocs: DocPage[] = [makePage("zh")];
export const enHostFeatureConfigFieldDocs: DocPage[] = [makePage("en")];
