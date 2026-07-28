import type { DocPage } from "./content";

type Locale = "zh" | "en";

const layout = `artifacts/release/
  MyApp.Starter.dll
  app.yaml
  plugins/
    billing/
      Billing.Plugin.dll
      Billing.Plugin.deps.json
      plugin.yaml
      <private dependencies>
  plugins-data/
    billing/                 # persistent data; mount separately`;

const explicitConfig = `plugin:
  enabled: true
  plugins:
    - id: billing-release-entry
      path: plugins/billing/Billing.Plugin.dll
      enabled: true
      dependencies: []
      autoScanRepositories: true
  scanDirectories: []
  enableHotReload: false
  loadTimeoutSeconds: 30
  enableIsolation: true
  dataDirectory: plugins-data`;

const manifest = `{
  "hostAsgardVersion": "5.1.3",
  "pluginId": "billing",
  "pluginVersion": "1.4.0",
  "entryPath": "plugins/billing/Billing.Plugin.dll",
  "sha256": "<sha256-of-entry-and-release-bundle>",
  "dependencies": [],
  "configSchema": "billing-config/v2",
  "dataSchema": "billing-data/v3"
}`;

const acceptance = `# Build the immutable directory, then record every file digest.
Get-ChildItem artifacts/release/plugins/billing -File -Recurse |
  Get-FileHash -Algorithm SHA256

# Start the exact release in isolation and inspect startup logs.
dotnet artifacts/release/MyApp.Starter.dll

# The release gate must compare the expected plugin IDs/versions with
# "Plugin system ready (N running)" and application-specific smoke routes.`;

const sourceFiles = `Common/Asgard.Abstractions/Plugin/PluginConfig.cs
Common/Asgard.Abstractions/Plugin/PluginEntry.cs
Common/Asgard.Abstractions/Plugin/PluginScanDirectory.cs
Common/Asgard.Core/Plugin/PluginServiceConfigurator.cs
Common/Asgard.Core/Plugin/PluginLoaderHelper.cs
Common/Asgard.Core/Plugin/PluginDependencyResolver.cs
Common/Asgard.Core/Plugin/PluginLoadContext.cs
Common/Asgard.Core/Plugin/PluginManager.cs
Common/Asgard.Core/Plugin/PluginManager.Lifecycle.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.PluginIntegration.cs
Test/Asgard.Core.Tests/Plugin/PluginDependencyResolverTests.cs
Test/Asgard.Core.Tests/Plugin/PluginManagerTests.cs`;

const ids = ["scope", "artifact-layout", "discovery", "manifest", "startup-gate", "failure-diagnostics", "data-migration", "rolling-upgrade", "rollback", "acceptance", "ai-ready-sources"] as const;

function makePage(locale: Locale): DocPage {
  const zh = locale === "zh";
  return {
    slug: "external-plugin-operations",
    group: zh ? "插件" : "Plugins",
    eyebrow: "ASGARD 5.1.3 · TRUSTED IN-PROCESS CODE",
    title: zh ? "外部插件生产交付、发现与升级" : "External plugin delivery, discovery, and upgrade",
    description: zh
      ? "把外部插件作为可审计的不可变发布物交付，验收发现与依赖图，并用整进程滚动替换完成安全升级和回滚。"
      : "Ship external plugins as auditable immutable artifacts, accept discovery and dependencies, and upgrade or roll back through whole-process rolling replacement.",
    sections: [
      { id: ids[0], title: zh ? "能力与信任边界" : "Capability and trust boundary", paragraphs: [zh ? "外部插件与宿主在同一进程运行，可访问 DI、配置、文件系统与进程权限。Asgard 5.1.3 加载器不验证签名、哈希、发布来源、框架兼容范围或配置/数据 schema；供应链验证和兼容性验收属于部署系统。" : "External plugins run in the host process with access to DI, configuration, the file system, and process privileges. The Asgard 5.1.3 loader verifies no signature, digest, release provenance, framework compatibility range, or configuration/data schema; deployment owns supply-chain and compatibility acceptance.", zh ? "生产发布单元必须是匹配的 host、插件集合、配置与迁移，而不是运行时替换一个 DLL。" : "The production release unit is the matched host, plugin set, configuration, and migrations—not one DLL replaced at runtime."] },
      { id: ids[1], title: zh ? "不可变发布目录" : "Immutable artifact layout", paragraphs: [zh ? "每个插件使用独立目录，入口程序集、私有依赖与 plugin.yaml 一起发布；固定进程 WORKDIR，使相对 path 和 dataDirectory 可重复解析。不要把多个插件的同名清单扁平复制到一个目录。" : "Give every plugin its own directory and ship its entry assembly, private dependencies, and plugin.yaml together. Fix the process WORKDIR so relative path and dataDirectory resolution is reproducible. Never flatten same-name manifests from several plugins into one directory."], code: { language: "text", value: layout } },
      { id: ids[2], title: zh ? "优先使用显式发现" : "Prefer explicit discovery", paragraphs: [zh ? "生产优先使用 plugin.plugins 并清空 scanDirectories。显式条目按完整 path 去重，但加载后 PluginInfo.Id 会被实际 plugin.Id 覆盖；发布清单和依赖必须以运行时 plugin.Id 为准。缺失依赖、循环或重复最终 ID 会在服务配置阶段阻止构建。" : "Prefer plugin.plugins in production and clear scanDirectories. Explicit entries deduplicate by full path, but loading replaces PluginInfo.Id with the actual plugin.Id; manifests and dependencies must use the runtime plugin.Id. Missing dependencies, cycles, or duplicate final IDs stop the build during service configuration.", zh ? "扫描模式只枚举扫描根的一级子目录；recursive 只改变每个子目录内部的查找深度。多个 entryPointPattern 命中项或一个程序集中的多个 IPlugin 实现都会选择未承诺顺序的第一个，因此每目录只保留一个入口程序集、每入口只保留一个插件实现。" : "Scanning enumerates only first-level children of the scan root; recursive changes search depth inside each child. Multiple entryPointPattern matches or multiple IPlugin implementations select an unspecified first item, so keep one entry assembly per directory and one plugin implementation per entry."], code: { language: "yaml", value: explicitConfig }, note: zh ? "autoScanRepositories 只存在于显式 PluginEntry，并且只扫描 Repository 特性，不扫描 Service。" : "autoScanRepositories exists only on explicit PluginEntry and scans Repository attributes, not Services." },
      { id: ids[3], title: zh ? "发布清单与兼容性" : "Release manifest and compatibility", paragraphs: [zh ? "为每次发布记录宿主 Asgard 版本、运行时 plugin.Id、插件版本、入口 path、完整 bundle 哈希、依赖 ID、配置 schema 与数据 schema。框架只读取程序集元数据和 IPlugin 属性，不会替你执行这些兼容性检查。" : "Record host Asgard version, runtime plugin.Id, plugin version, entry path, complete bundle digests, dependency IDs, configuration schema, and data schema for every release. The framework reads assembly metadata and IPlugin properties but does not enforce this compatibility contract."], code: { language: "json", value: manifest } },
      { id: ids[4], title: zh ? "启动必须失败关闭" : "Fail-closed startup gate", paragraphs: [zh ? "ConfigureServices、程序集加载、重复 ID 或依赖图失败会阻止宿主构建；但 Initialize/Start 失败只记录错误并跳过依赖插件，独立插件与宿主可能继续运行。日志中的 Plugin system ready (N running) 只是计数，不是预期插件集合或 readiness 门禁。" : "ConfigureServices, assembly loading, duplicate IDs, or dependency-graph failures stop the host build. Initialize/Start failures are only logged and dependent plugins are skipped, so independent plugins and the host can continue. Plugin system ready (N running) is a count, not validation of the expected plugin set or a readiness gate.", zh ? "部署必须把预期 ID、版本和数量与启动事实比对，并对每个关键插件执行专属 smoke；任一必需插件未进入 Running 时禁止接流量。" : "Deployment must compare expected IDs, versions, and count with startup facts and run a plugin-specific smoke for every critical plugin. Do not route traffic when any required plugin is not Running."] },
      { id: ids[5], title: zh ? "故障诊断矩阵" : "Failure diagnostics matrix", bullets: zh ? ["入口不存在：显式项只告警并跳过，最终可能得到零插件；门禁必须发现缺失", "入口无 IPlugin、无无参构造或依赖程序集缺失：加载/实例化失败，构建失败", "缺失依赖、依赖循环、重复运行时 ID：依赖解析或唯一性校验失败", "Initialize/Start 异常：定位首个失败插件及所有被跳过 dependents，并确认未授权端点没有因部分启动暴露", "OnStop 抛错可能阻止该插件继续 Dispose；检查资源、消息确认和后台循环"] : ["Missing explicit entry: the loader warns and skips it, potentially leaving zero plugins; the release gate must catch the absence", "No IPlugin, no parameterless constructor, or missing dependency assembly: load/activation fails and the build fails", "Missing dependency, cycle, or duplicate runtime ID: dependency resolution or uniqueness validation fails", "Initialize/Start exception: identify the first failed plugin and every skipped dependent, then verify partial startup did not expose unauthorized endpoints", "An OnStop exception can prevent subsequent Dispose for that plugin; inspect resources, message acknowledgements, and background loops"] },
      { id: ids[6], title: zh ? "配置与数据迁移" : "Configuration and data migration", paragraphs: [zh ? "PluginLoaderHelper 只创建 dataDirectory/plugin.Id；它不提供 schema、迁移账本、锁、备份、事务或回滚。插件必须拥有版本化、幂等、可审计的配置与数据迁移，并在启动门禁前完成或验证。" : "PluginLoaderHelper only creates dataDirectory/plugin.Id; it provides no schema, migration ledger, lock, backup, transaction, or rollback. The plugin must own versioned, idempotent, auditable configuration and data migrations and complete or verify them before the startup gate.", zh ? "滚动期间新旧进程可能同时访问同一外部数据库或共享数据卷；先证明双版本兼容。不要让两个实例并发执行无锁迁移，也不要把临时文件写进只读插件发布目录。" : "Old and new processes can access the same external database or shared data volume during a rollout; prove dual-version compatibility first. Never let two instances run an unlocked migration concurrently, and keep mutable data out of the read-only plugin artifact directory."] },
      { id: ids[7], title: zh ? "整进程滚动升级" : "Whole-process rolling upgrade", bullets: zh ? ["在隔离环境启动精确 host + plugin bundle，核对 manifest、Running 集合、路由、作业、仓储和配置", "先做向前兼容的数据/schema 变更，再发布同时兼容旧/新的插件", "启动一个 canary，readiness 与插件 smoke 全绿后再逐步扩流", "保持上一不可变 bundle 与配置可恢复；生产不调用 ReloadAsync 或覆盖正在使用的 DLL"] : ["Start the exact host plus plugin bundle in isolation and verify manifest, Running set, routes, jobs, repositories, and configuration", "Apply forward-compatible data/schema changes before a plugin that supports both old and new state", "Start one canary and expand traffic only after readiness and plugin smokes pass", "Retain the previous immutable bundle and matching configuration; never call ReloadAsync or overwrite live DLLs in production"] },
      { id: ids[8], title: zh ? "回滚边界" : "Rollback boundary", paragraphs: [zh ? "回滚恢复整个 host、插件集合与匹配配置。若数据迁移不向后兼容，换回旧 DLL 不能恢复服务；必须使用预先验证的 down/restore 或前滚修复。回滚后再次核对插件集合、依赖顺序、数据 schema 与业务 smoke。" : "Roll back the complete host, plugin set, and matching configuration. If data migration is not backward compatible, restoring an old DLL cannot restore service; use a pre-verified down/restore path or roll forward. Recheck plugin set, dependency order, data schema, and business smokes after rollback."], note: zh ? "enableHotReload 当前没有文件监听接线；loadTimeoutSeconds 只校验正数。ReloadAsync 不重跑 ConfigureServices、Start、plugin.yaml jobs、中间件、MVC ApplicationParts 或完整依赖图。" : "enableHotReload currently has no file-watcher wiring; loadTimeoutSeconds is only validated as positive. ReloadAsync does not rerun ConfigureServices, Start, plugin.yaml jobs, middleware, MVC ApplicationParts, or the complete dependency graph." },
      { id: ids[9], title: zh ? "生产验收" : "Production acceptance", bullets: zh ? ["正确 bundle 能启动，预期插件全部 Running，关键 Controller/endpoint、Repository、job 与 plugin.yaml 配置可用", "注入缺 DLL、缺依赖、循环、重复 plugin.Id、多入口 DLL、Initialize/Start/Stop 失败", "验证插件目录只读、dataDirectory 独立可写且备份/恢复有效", "双实例滚动期间验证旧/新数据兼容、消息幂等、无重复作业和安全授权", "回滚到上一完整 release ID，证明配置、数据与依赖仍兼容"] : ["A valid bundle starts with every expected plugin Running and critical controllers/endpoints, repositories, jobs, and plugin.yaml configuration available", "Inject missing DLL/dependency, cycle, duplicate plugin.Id, multiple entry DLLs, and Initialize/Start/Stop failure", "Verify the plugin directory is read-only, dataDirectory is independently writable, and backup/restore works", "During a two-instance rollout, verify old/new data compatibility, message idempotency, no duplicate jobs, and authorization", "Roll back to the previous complete release ID and prove configuration, data, and dependencies remain compatible"], code: { language: "powershell", value: acceptance } },
      { id: ids[10], title: zh ? "AI Ready 与源码证据" : "AI Ready and source evidence", paragraphs: [zh ? "Agent 维护插件交付时先加载 asgard-plugin-lifecycle、asgard-plugin-development 与 asgard-host-project；涉及业务迁移再加载对应数据库、消息、作业与 backend guard。Options 或公开 Reload API 不能作为端到端能力证明。" : "Agents maintaining plugin delivery must load asgard-plugin-lifecycle, asgard-plugin-development, and asgard-host-project first; add database, messaging, job, and backend-guard Skills for business migrations. An Options property or public Reload API is not proof of an end-to-end capability.", zh ? "维护本页时 diff 下列源码；发现顺序、最终 ID、依赖解析、ApplicationPart、生命周期失败、数据目录或 Reload 行为变化时，中英文与源码合同一起更新。" : "Diff these sources when maintaining this page. Update both locales and the source contract when discovery order, final IDs, dependency resolution, ApplicationParts, lifecycle failure, data directories, or Reload behavior changes."], code: { language: "text", value: sourceFiles } },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "host-and-plugins", label: zh ? "宿主与插件" : "Host and plugins" },
      { product: "asgard", docSlug: "plugin-lifecycle", label: zh ? "插件生命周期" : "Plugin lifecycle" },
      { product: "asgard", docSlug: "deployment", label: zh ? "生产部署" : "Production deployment" },
      { product: "asgard", docSlug: "dependency-registration", label: zh ? "依赖注入与扫描" : "Dependency injection and scanning" },
    ],
  };
}

export const zhAsgardExternalPluginOperationsDocs: DocPage[] = [makePage("zh")];
export const enAsgardExternalPluginOperationsDocs: DocPage[] = [makePage("en")];
