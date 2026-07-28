import type { DocPage } from "./content";
import {
  configRootContracts,
  configurationExtractionBoundaries,
  configurationPrecedence,
  configurationReferenceBaseline,
  excludedConfigurationRoots,
  sensitiveConfigurationPaths,
  type ConfigPresence,
} from "./config-reference-data";

const precedenceCode = `# Lowest to highest precedence
app.yaml
app.{Environment}.yaml
environment variables, for example host__auth__enabled=false
command line, for example --host:auth:enabled=false`;

const optionalHostCode = `host:
  # Omitting auth means the host does not wire its default JWT support.
  auth: {}
  # Once the node exists, AuthOptions.enabled defaults to true.

  # staticFiles is different: HostConfig always creates this object.
  staticFiles:
    enabled: true
    enableDefaultFiles: false`;

const secretCode = `database:
  connectionString: "\${env:ASGARD_DATABASE}"

Asgard:
  Encryption:
    Key: "\${env:ASGARD_AES_KEY}"
    Iv: "\${env:ASGARD_AES_IV}"`;

const presenceLabels: Record<ConfigPresence, { zh: string; en: string }> = {
  "always-created": { zh: "始终创建配置对象", en: "configuration object is always created" },
  "nullable-node": { zh: "nullable 可选节点", en: "nullable optional node" },
  "disabled-by-default": { zh: "始终加载模块配置对象", en: "module configuration object is always loaded" },
  "required-section": { zh: "标准宿主要求此配置节", en: "required by the standard host" },
  "plugin-manifest": { zh: "由插件清单按生命周期加载", en: "loaded from the plugin manifest during lifecycle" },
};

const activationLabels: Record<string, { zh: string; en: string }> = {
  "enabled=true; enableDefaultFiles=false": {
    zh: "enabled=true；enableDefaultFiles=false",
    en: "enabled=true; enableDefaultFiles=false",
  },
  "absent node: not wired; present node: enabled=true": {
    zh: "节点缺失时不接线；节点存在时 enabled=true",
    en: "absent node: not wired; present node: enabled=true",
  },
  "absent node: not wired; present node: enabled=false": {
    zh: "节点缺失时不接线；节点存在时 enabled=false",
    en: "absent node: not wired; present node: enabled=false",
  },
  "enabled=false": { zh: "enabled=false", en: "enabled=false" },
  "console.enabled=true; file.enabled=true; database.enabled=false": {
    zh: "console.enabled=true；file.enabled=true；database.enabled=false",
    en: "console.enabled=true; file.enabled=true; database.enabled=false",
  },
  "no enabled switch; Key and Iv are validated during service registration": {
    zh: "没有 enabled 开关；Key 与 Iv 在服务注册期校验",
    en: "no enabled switch; Key and Iv are validated during service registration",
  },
  "loaded during PluginBase.StartAsync when a job manager is available": {
    zh: "存在作业管理器时，在 PluginBase.StartAsync 期间加载",
    en: "loaded during PluginBase.StartAsync when a job manager is available",
  },
};

const rootBullets = (locale: "zh" | "en") =>
  configRootContracts.map((root) => {
    const presence = presenceLabels[root.presence][locale];
    const activation = root.activation
      ? `; ${activationLabels[root.activation]?.[locale] ?? root.activation}`
      : "";
    return `${root.document} · ${root.path} · ${root.sourceType}: ${presence}${activation}`;
  });

const excludedReasonsZh: Record<string, string> = {
  "autoConfig.*": "相关类型虽然存在，但 Asgard 5.1.3 Yggdrasil 宿主没有加载或消费这个根。",
  "PublishOptions / SubscribeOptions": "它们是运行时 API 选项，不是 app.yaml 根。",
  "plugin-owned TConfig": "每个产品插件自行维护其 schema 与发布合同。",
};

const excludedBullets = (locale: "zh" | "en") =>
  excludedConfigurationRoots.map((entry) =>
    locale === "zh"
      ? `${entry.path}：不纳入 5.1.3 公共根合同。${excludedReasonsZh[entry.path]}`
      : `${entry.path}: excluded from the 5.1.3 public root contract. ${entry.reason}`,
  );

const extractionBoundariesZh = [
  "ConfigPath 特性不会覆盖每个嵌套 POCO 属性、数组元素、字典值或 Encryption 配置节。",
  "DefaultValue 只描述所属对象存在后的属性回退值；它不会激活 nullable host 节点。",
  "即使 ConfigPath 没有 DefaultValue，CLR initializer 也可能提供有效默认值。",
  "Validate 包含条件和跨字段规则，不能用正则表达式安全转换。",
  "选项类型或属性存在，不代表主要运行时路径已经消费它。",
] as const;

const sourceCode = `Source baseline: Asgard ${configurationReferenceBaseline.frameworkVersion}
Commit: ${configurationReferenceBaseline.sourceCommit}
Inspected: ${configurationReferenceBaseline.inspectedOn}

Root loader:
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs

Binding:
Common/Asgard.Core/SystemConfig/YamlConfigBinder.cs
Common/Asgard.Core/SystemConfig/YamlValueConverter.cs
Common/Asgard.Core/SystemConfig/YamlPathResolver.cs`;

export const zhConfigurationReferenceDocs: DocPage[] = [
  {
    slug: "configuration-reference",
    group: "框架",
    eyebrow: "ASGARD 5.1.3",
    title: "配置根合同",
    description: "理解 Yggdrasil 实际加载的配置根、节点缺失语义、覆盖顺序和安全边界，再进入各模块字段参考。",
    sections: [
      {
        id: "baseline",
        title: "这是一份根合同，不是字段穷举",
        paragraphs: [
          "本页只承诺 Asgard 5.1.3 标准 Yggdrasil 宿主实际加载的配置根及其存在性语义。嵌套字段、条件校验和运行时接线仍以对应模块页面与源码为准。",
          "类型中出现 ConfigPath、属性或默认值，不等于当前宿主已经消费它；路线图和未接线选项不能写成已交付能力。",
        ],
      },
      {
        id: "precedence",
        title: "覆盖顺序与启动期边界",
        paragraphs: [
          "后加入的数据覆盖先加入的数据：app.yaml → app.{Environment}.yaml → 进程环境变量 → 命令行参数。环境变量和命令行路径支持 __、冒号与点号的规范化。",
          "但 YggdrasilHostBuilder 构造器会先直接读取基础 app.yaml 并校验 HostConfig 与 LogConfig，然后才建立合并图。因此基础文件必须先达到可启动的最小形态，不能完全依赖环境专用文件或环境变量补救构造期错误。",
        ],
        code: { language: "text", value: precedenceCode },
      },
      {
        id: "roots",
        title: "5.1.3 公开配置根",
        paragraphs: ["以下是首版根范围；列表刻意不展开所有嵌套字段。字典键与数组元素由各模块页面说明。"],
        bullets: rootBullets("zh"),
      },
      {
        id: "presence",
        title: "节点缺失与字段默认值是两件事",
        paragraphs: [
          "HostConfig 的 cors、auth、swagger、tsGen、rateLimiting、healthCheck 是 nullable 节点。节点完全缺失时，对应能力不接线；只有节点存在后，子对象的 enabled 默认值才有意义。",
          "staticFiles 是非 nullable 且始终创建的例外：节点缺失时仍默认 enabled=true，但默认文件解析 enableDefaultFiles=false。基础设施根则始终加载配置对象，但 caching、database、messaging、job、plugin 与 Trace 默认 enabled=false。",
        ],
        code: { language: "yaml", value: optionalHostCode },
      },
      {
        id: "sensitive",
        title: "敏感项与 Secret 注入",
        paragraphs: [
          "连接串、口令、证书口令与 AES 材料不得提交、写入文档示例或输出到日志。优先用 Secret 管理系统提供环境变量，再通过 ${env:NAME} 占位符引用。",
          "Asgard.Encryption 没有 enabled 开关。标准宿主会在服务注册时校验 Key 与 Iv；缺失、非 Base64 或解码长度错误都会阻止启动。",
        ],
        bullets: [...sensitiveConfigurationPaths],
        code: { language: "yaml", value: secretCode },
      },
      {
        id: "generation",
        title: "字段级生成边界",
        paragraphs: [
          "字段参考应从 Yggdrasil 根类型白名单递归生成，并同时记录 ConfigPath 默认值、CLR initializer、父节点存在性、枚举值和源码锚点。不能只用正则搜索 ConfigPath。",
          "Validate 是任意 C# 逻辑，可能包含启用态分支、范围、循环、私有 helper 和跨字段约束；敏感性与运行时是否真正消费字段也无法从属性类型可靠推断。这些内容必须由经源码验证的人工合同补充。",
        ],
        bullets: [...extractionBoundariesZh],
      },
      {
        id: "excluded",
        title: "明确排除的根",
        paragraphs: ["排除表示它不属于当前核心宿主公共配置合同，不表示相关类型永远不会在未来接线。"],
        bullets: excludedBullets("zh"),
      },
      {
        id: "verify",
        title: "发布前验证",
        bullets: [
          "对每个 nullable host 节点分别测试 absent、{}、enabled=false 与 enabled=true",
          "比较 ConfigPath.DefaultValue 与 CLR initializer，发现漂移时让生成失败",
          "为字典键和数组元素执行 YAML 绑定 round-trip",
          "为每条条件 Validate 规则测试启用/禁用和边界值",
          "字段只有在找到主要运行时 consumer 后才能标记为 wired",
          "中英文从同一技术数据生成，保持 slug、section id、路径和默认值一致",
        ],
        code: { language: "text", value: sourceCode },
      },
    ],
  },
];

export const enConfigurationReferenceDocs: DocPage[] = [
  {
    slug: "configuration-reference",
    group: "Framework",
    eyebrow: "ASGARD 5.1.3",
    title: "Configuration root contract",
    description: "Understand the roots Yggdrasil actually loads, absent-node semantics, precedence, and security boundaries before using module field references.",
    sections: [
      {
        id: "baseline",
        title: "A root contract, not an exhaustive field list",
        paragraphs: [
          "This page contracts only the configuration roots and presence semantics loaded by the standard Asgard 5.1.3 Yggdrasil host. Nested fields, conditional validation, and runtime wiring remain owned by their module pages and source.",
          "A ConfigPath, option property, or default value does not prove that the current host consumes it. Roadmap and unwired options must not be presented as shipped capabilities.",
        ],
      },
      {
        id: "precedence",
        title: "Precedence and bootstrap boundary",
        paragraphs: [
          `Later sources override earlier sources: ${configurationPrecedence.join(" → ")}. Environment and command-line paths normalize double underscores, colons, and dots.`,
          "YggdrasilHostBuilder first reads the base app.yaml directly and validates HostConfig and LogConfig before building the merged graph. The base file must therefore satisfy the minimum bootstrap contract; an environment-specific file or environment variable cannot repair an error that already fails constructor-time validation.",
        ],
        code: { language: "text", value: precedenceCode },
      },
      {
        id: "roots",
        title: "Public 5.1.3 configuration roots",
        paragraphs: ["This is the initial root scope and intentionally does not expand every nested field. Module pages own dictionary keys and array item schemas."],
        bullets: rootBullets("en"),
      },
      {
        id: "presence",
        title: "Node absence is different from a field default",
        paragraphs: [
          "HostConfig models cors, auth, swagger, tsGen, rateLimiting, and healthCheck as nullable nodes. When a node is absent, the host does not wire that feature. An enabled field default matters only after the child object exists.",
          "staticFiles is the non-null exception: it is created even when the node is absent and defaults to enabled=true, while enableDefaultFiles=false. Infrastructure root objects are loaded, but caching, database, messaging, job, plugin, and Trace default to enabled=false.",
        ],
        code: { language: "yaml", value: optionalHostCode },
      },
      {
        id: "sensitive",
        title: "Sensitive values and secret injection",
        paragraphs: [
          "Never commit connection strings, passwords, certificate passwords, or AES material, copy them into documentation examples, or write them to logs. Prefer a secret manager supplying environment variables referenced through ${env:NAME} placeholders.",
          "Asgard.Encryption has no enabled switch. The standard host validates Key and Iv during service registration; missing values, invalid Base64, or invalid decoded lengths stop startup.",
        ],
        bullets: [...sensitiveConfigurationPaths],
        code: { language: "yaml", value: secretCode },
      },
      {
        id: "generation",
        title: "Field-generation boundary",
        paragraphs: [
          "Generate field reference data by recursively walking an allowlist of Yggdrasil root types and recording ConfigPath defaults, CLR initializers, parent-node presence, enum values, and source anchors. A regular-expression ConfigPath scan is insufficient.",
          "Validate is arbitrary C# and can contain activation branches, ranges, loops, private helpers, and cross-field constraints. Sensitivity and actual runtime consumption also cannot be inferred safely from a property type. Add those facts through a source-reviewed manual contract layer.",
        ],
        bullets: [...configurationExtractionBoundaries],
      },
      {
        id: "excluded",
        title: "Explicitly excluded roots",
        paragraphs: ["Exclusion means a root is outside the current core-host public contract, not that its type can never be wired in a future release."],
        bullets: excludedBullets("en"),
      },
      {
        id: "verify",
        title: "Verify before publishing",
        bullets: [
          "Test absent, {}, enabled=false, and enabled=true for every nullable host node",
          "Compare ConfigPath.DefaultValue with CLR initializers and fail generation on drift",
          "Round-trip YAML binding for dictionary keys and array items",
          "Test activation branches and boundary values for every conditional Validate rule",
          "Mark a field wired only after locating its primary runtime consumer",
          "Generate both locales from the same technical data so slug, section IDs, paths, and defaults stay aligned",
        ],
        code: { language: "text", value: sourceCode },
      },
    ],
  },
];

export const zhConfigurationReferencePage = zhConfigurationReferenceDocs[0];
export const enConfigurationReferencePage = enConfigurationReferenceDocs[0];
