import type { DocPage } from "./content";
import {
  configFieldContracts,
  configurationFieldReferenceBaseline,
  type ConfigFieldContract,
  type ConfigParentPresence,
  type ConfigRuntimeStatus,
  type ConfigValidationRule,
} from "./config-field-reference-data";

type Locale = "zh" | "en";

type FieldCopy = {
  zh: { summary: string };
  en: { summary: string };
};

const fieldCopy: Record<string, FieldCopy> = {
  "application-name": { zh: { summary: "应用显示名称；当前核心宿主只校验并公开该值。" }, en: { summary: "Application display name; the core host currently validates and exposes it." } },
  "application-version": { zh: { summary: "应用版本标签；不要把它与 host.swagger.version 混为一谈。" }, en: { summary: "Application version label; do not confuse it with host.swagger.version." } },
  "application-environment": { zh: { summary: "基础 app.yaml 的启动环境选择项，只接受三个精确大小写值。" }, en: { summary: "Bootstrap environment selector from base app.yaml; accepts three case-sensitive values." } },
  "application-detailed-errors": { zh: { summary: "公开的布尔选项；当前核心宿主没有找到直接 consumer。" }, en: { summary: "Exposed Boolean option; no direct consumer exists in the current core host." } },
  "kestrel-endpoints": { zh: { summary: "命名监听端点字典；省略节点与显式空字典的行为不同。" }, en: { summary: "Named listen-endpoint dictionary; omission differs from an explicit empty dictionary." } },
  "endpoint-url": { zh: { summary: "监听 URL；Asgard 只预检非空，绝对 URI 解析发生在运行期。" }, en: { summary: "Listen URL; Asgard prevalidates only nonblank text and parses the absolute URI at runtime." } },
  "endpoint-certificate": { zh: { summary: "端点证书子对象，仅 HTTPS 端点使用。" }, en: { summary: "Endpoint certificate child object, consumed only for HTTPS endpoints." } },
  "certificate-path": { zh: { summary: "HTTPS PFX 路径；运行期才验证文件存在性与格式。" }, en: { summary: "HTTPS PFX path; file existence and format are deferred to runtime." } },
  "certificate-password": { zh: { summary: "传给 UseHttps 的 PFX 密码；允许空值，但必须按凭据处理。" }, en: { summary: "PFX password passed to UseHttps; empty is allowed, but the value remains a credential." } },
  "kestrel-limits": { zh: { summary: "nullable limits 节点；缺失时不覆盖 ASP.NET/Kestrel 自身默认值。" }, en: { summary: "Nullable limits node; omission preserves ASP.NET/Kestrel defaults." } },
  "limit-request-body": { zh: { summary: "请求体大小上限，单位字节。" }, en: { summary: "Maximum request body size in bytes." } },
  "limit-connections": { zh: { summary: "并发连接上限；attribute 默认值会覆盖 CLR 的 0。" }, en: { summary: "Concurrent connection limit; the attribute default overrides the CLR value of 0." } },
  "limit-upgraded-connections": { zh: { summary: "升级连接上限；limits 节点存在时必须显式提供正数。" }, en: { summary: "Upgraded connection limit; a positive value is effectively required whenever limits exists." } },
  "limit-headers-timeout": { zh: { summary: "请求头超时秒数，运行期转换为 TimeSpan。" }, en: { summary: "Request-header timeout in seconds, converted to TimeSpan at runtime." } },
  "encryption-key": { zh: { summary: "AES Key 的 Base64 文本；标准宿主启动时必须提供。" }, en: { summary: "Base64 AES key material; required during standard-host startup." } },
  "encryption-iv": { zh: { summary: "AES IV 的 Base64 文本；解码后必须正好 16 字节。" }, en: { summary: "Base64 AES IV material; decoded length must be exactly 16 bytes." } },
};

const parentLabels: Record<ConfigParentPresence, Record<Locale, string>> = {
  "always-created": { zh: "父对象始终创建；YAML 节点可缺失", en: "parent object is always created; YAML node may be absent" },
  nullable: { zh: "父节点 nullable；字段只在父节点存在时生效", en: "nullable parent; field applies only when the parent node exists" },
  "dictionary-item": { zh: "每个命名字典项的字段", en: "field on each named dictionary item" },
  "required-section": { zh: "标准宿主要求配置节与有效字段", en: "standard host requires the section and valid fields" },
};

const statusLabels: Record<ConfigRuntimeStatus, Record<Locale, string>> = {
  wired: { zh: "wired：存在主要运行时 consumer", en: "wired: primary runtime consumer verified" },
  "bootstrap-only": { zh: "bootstrap-only：仅在合并配置前的启动阶段读取", en: "bootstrap-only: read before the merged configuration graph" },
  "validated-only": { zh: "validated-only：已校验但未找到主要 consumer", en: "validated-only: validated without a primary consumer" },
  "exposed-only": { zh: "exposed-only：公开在 HostConfig，未找到主要 consumer", en: "exposed-only: available through HostConfig without a primary consumer" },
};

const value = (input: unknown) => {
  if (input === null) return "null";
  if (input === "") return "\"\"";
  return typeof input === "string" ? input : String(input);
};

const validationText = (validation: ConfigValidationRule, locale: Locale) => {
  const values = validation.values?.join(", ") ?? "";
  const labels = {
    nonblank: { zh: "必须为非空白文本", en: "must be nonblank" },
    "one-of": { zh: `必须精确匹配：${values}`, en: `must exactly match one of: ${values}` },
    "greater-than": { zh: `必须大于 ${values}`, en: `must be greater than ${values}` },
    "base64-byte-length": { zh: `必须为有效 Base64，解码长度：${values} 字节`, en: `must be valid Base64 with decoded length: ${values} bytes` },
    "dictionary-items": { zh: "字典不可为 null，并逐项校验；不要求至少一个项", en: "dictionary must not be null and every item is validated; count may be zero" },
    "absolute-uri-at-runtime": { zh: "运行期按绝对 URI 解析；此条件未由 Validate 预检", en: "parsed as an absolute URI at runtime; Validate does not precheck it" },
  } as const;
  const conditions = {
    always: { zh: "始终", en: "always" },
    "https-endpoint": { zh: "仅 URL 为 HTTPS 时", en: "only for an HTTPS URL" },
    "standard-host": { zh: "标准 Yggdrasil 宿主启动时", en: "during standard Yggdrasil host startup" },
    runtime: { zh: "运行期", en: "at runtime" },
  } as const;
  return `${conditions[validation.when][locale]}：${labels[validation.rule][locale]}`;
};

const missingLabels: Record<ConfigFieldContract["missingBehavior"], Record<Locale, string>> = {
  "keep-initializer": { zh: "缺失时保留 initializer/binder 默认值", en: "omission preserves the initializer/binder default" },
  "keep-item-initializer": { zh: "字典项存在但字段缺失时保留项 initializer", en: "omission within an item preserves its initializer" },
  "empty-dictionary-is-valid": { zh: "缺失时保留默认 Http 项；显式 {} 合法且不会显式 Listen", en: "omission keeps the default Http item; explicit {} is valid and issues no explicit Listen" },
  "do-not-override-kestrel": { zh: "缺失时不覆盖框架自带 Kestrel limits", en: "omission does not override framework-owned Kestrel limits" },
  "startup-fails": { zh: "缺失或无效会使标准宿主启动失败", en: "missing or invalid data stops standard-host startup" },
};

const fieldBlock = (field: ConfigFieldContract, locale: Locale) => {
  const copy = fieldCopy[field.id]?.[locale].summary ?? field.path;
  const attribute = field.default.attributeSpecified ? value(field.default.attributeValue) : "—";
  const validation = field.validations.length > 0
    ? field.validations.map((item) => validationText(item, locale)).join("; ")
    : locale === "zh" ? "无额外 Validate 规则" : "no additional Validate rule";
  const binding = field.binding.kind === "config-path"
    ? `ConfigPath(${field.binding.declaredPath})`
    : `convention section(${field.binding.sectionPath})`;
  const labels = locale === "zh"
    ? { type: "类型", binding: "绑定", parent: "父节点", defaults: "默认值", missing: "缺失", validation: "校验", sensitive: "敏感", runtime: "运行期", source: "源码" }
    : { type: "Type", binding: "Binding", parent: "Parent", defaults: "Defaults", missing: "Missing", validation: "Validation", sensitive: "Sensitive", runtime: "Runtime", source: "Source" };
  return [
    field.path,
    `  ${copy}`,
    `  ${labels.type}: ${field.valueType}${field.nullable ? " (nullable)" : ""}`,
    `  ${labels.binding}: ${binding}`,
    `  ${labels.parent}: ${parentLabels[field.parentPresence][locale]}`,
    `  ${labels.defaults}: attribute=${attribute}; CLR=${value(field.default.clrValue)}; effective=${value(field.default.effectiveValue)} [${field.default.appliesWhen}]${field.default.mismatchDisposition ? `; ${field.default.mismatchDisposition}` : ""}`,
    `  ${labels.missing}: ${missingLabels[field.missingBehavior][locale]}`,
    `  ${labels.validation}: ${validation}`,
    `  ${labels.sensitive}: ${field.sensitive ? `${field.sensitive.kind}; redact=${field.sensitive.redact}` : "false"}`,
    `  ${labels.runtime}: ${statusLabels[field.runtime.status][locale]} [${field.runtime.behavior}]`,
    `  ${labels.source}: ${field.source.file} :: ${field.source.member}`,
  ].join("\n");
};

const groupCode = (group: ConfigFieldContract["group"], locale: Locale) =>
  configFieldContracts.filter((field) => field.group === group).map((field) => fieldBlock(field, locale)).join("\n\n");

const safeYaml = `host:
  application:
    name: MyApp
    version: 1.0.0
    environment: Production
    detailedErrors: false
  kestrel:
    endpoints:
      http:
        url: http://0.0.0.0:8080
      https:
        url: https://0.0.0.0:8443
        certificate:
          path: "\${env:ASGARD_TLS_PFX_PATH}"
          password: "\${env:ASGARD_TLS_PFX_PASSWORD}"
    limits:
      maxRequestBodySize: 104857600
      maxConcurrentConnections: 1000
      maxConcurrentUpgradedConnections: 100
      requestHeadersTimeoutSeconds: 30

Asgard:
  Encryption:
    Key: "\${env:ASGARD_AES_KEY}"
    Iv: "\${env:ASGARD_AES_IV}"`;

const sectionIds = ["scope", "defaults", "application", "endpoints", "limits", "encryption", "example", "verify"] as const;

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";
  return {
    slug: "configuration-fields",
    group: zh ? "框架" : "Framework",
    eyebrow: `ASGARD ${configurationFieldReferenceBaseline.frameworkVersion}`,
    title: zh ? "核心配置字段合同" : "Core configuration field contract",
    description: zh ? "首批源码核验的字段级参考：应用元数据、Kestrel 端点与限制、AES 加密材料。" : "The first source-verified field reference for application metadata, Kestrel endpoints and limits, and AES material.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "范围与证据" : "Scope and evidence",
        paragraphs: [
          zh ? "这是源码审阅后手工维护的合同数据，不是自动反射生成器。当前只覆盖 host.application、host.kestrel endpoints/limits 与 Asgard.Encryption。" : "This is a source-reviewed manual contract, not an automatic reflection generator. Its current scope is host.application, host.kestrel endpoints/limits, and Asgard.Encryption.",
          `${configurationFieldReferenceBaseline.inspectedOn} · ${configurationFieldReferenceBaseline.sourceCommit}`,
        ],
      },
      {
        id: sectionIds[1],
        title: zh ? "如何阅读三个默认值" : "How to read the three defaults",
        paragraphs: [
          zh ? "attribute default 来自 ConfigPath 元数据，CLR default 来自属性 initializer 或语言默认值，effective default 是给定父节点存在语义下绑定后的结果。三者不能互相替代。" : "The attribute default comes from ConfigPath metadata, the CLR default comes from the property initializer or language default, and the effective default is the post-binding result under the stated parent-presence condition. They are not interchangeable.",
          zh ? "parent、missing、validation、sensitive 与 runtime status 是独立维度。特别是公开选项不等于已经接入运行时。" : "Parent presence, missing behavior, validation, sensitivity, and runtime status are independent dimensions. In particular, an exposed option is not proof of runtime wiring.",
        ],
      },
      { id: sectionIds[2], title: "host.application", code: { language: "text", value: groupCode("application", locale) } },
      { id: sectionIds[3], title: "host.kestrel.endpoints", paragraphs: [zh ? "endpoint 字典缺失时自带 Http 项；显式 endpoints: {} 会通过当前 Asgard 校验，但不会发出显式 Listen。HTTPS 才使用 certificate。" : "An omitted endpoint dictionary keeps the built-in Http item. Explicit endpoints: {} passes current Asgard validation but issues no explicit Listen. certificate is consumed only by HTTPS."], code: { language: "text", value: groupCode("endpoints", locale) } },
      { id: sectionIds[4], title: "host.kestrel.limits", paragraphs: [zh ? "省略 limits 会保留 Kestrel 自身默认值。limits: {} 目前会因 maxConcurrentUpgradedConnections 的有效值为 0 而校验失败。" : "Omitting limits preserves Kestrel defaults. limits: {} currently fails validation because maxConcurrentUpgradedConnections has an effective value of 0."], code: { language: "text", value: groupCode("limits", locale) } },
      { id: sectionIds[5], title: "Asgard.Encryption", paragraphs: [zh ? "Key 与 Iv 没有 ConfigPath attribute；标准宿主按 Asgard:Encryption 节约定绑定，并在服务注册时校验、trim、解码及重新编码为规范 Base64。" : "Key and Iv have no ConfigPath attribute. The standard host convention-binds Asgard:Encryption, then validates, trims, decodes, and re-encodes canonical Base64 during service registration."], code: { language: "text", value: groupCode("encryption", locale) } },
      { id: sectionIds[6], title: zh ? "安全 YAML 示例" : "Safe YAML example", paragraphs: [zh ? "示例只引用环境变量占位符；不要把 PFX 密码、Key、Iv 或真实基础设施路径提交到仓库。" : "The example references environment placeholders only. Do not commit PFX passwords, Key, Iv, or real infrastructure paths."], code: { language: "yaml", value: safeYaml } },
      { id: sectionIds[7], title: zh ? "发布前陷阱检查" : "Pre-publish trap check", bullets: zh ? ["不要声称 detailedErrors 已启用框架详细错误；当前只找到公开配置面。", "host.application.environment 在合并配置前选择宿主环境；后续 host__application__environment 或命令行覆盖不会改变 builder.Environment。", "URL 的绝对 URI、scheme 与端口未被 Asgard Validate 完整预检；证书文件存在性也推迟到运行期。", "maxConcurrentConnections 的 attribute=1000、CLR=0 是预期 binder 覆盖；maxConcurrentUpgradedConnections 没有该 attribute 默认值。", "任何日志、诊断、搜索索引与示例都必须遮蔽 certificate.password、Key 与 Iv。"] : ["Do not claim detailedErrors enables framework detailed errors; it is currently only an exposed surface.", "host.application.environment selects the host environment before merged configuration; later host__application__environment or command-line overrides do not change builder.Environment.", "Asgard Validate does not fully precheck absolute URI, scheme, port, or certificate-file existence; those failures are deferred to runtime.", "attribute=1000 versus CLR=0 for maxConcurrentConnections is an expected binder override; maxConcurrentUpgradedConnections has no equivalent attribute default.", "Redact certificate.password, Key, and Iv from logs, diagnostics, search indexes, and examples."] },
    ],
  };
};

export const zhConfigurationFieldReferenceDocs: DocPage[] = [makePage("zh")];
export const enConfigurationFieldReferenceDocs: DocPage[] = [makePage("en")];
export const zhConfigurationFieldReferencePage = zhConfigurationFieldReferenceDocs[0];
export const enConfigurationFieldReferencePage = enConfigurationFieldReferenceDocs[0];
