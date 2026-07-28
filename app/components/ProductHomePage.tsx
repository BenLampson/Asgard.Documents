import type { CSSProperties } from "react";

import { docs, localeCopy, productForSlug, type Locale, type Product } from "../content";
import { SiteHeader } from "./SiteHeader";

export type DocumentationProduct = Product;

type ProductHomePageProps = {
  locale: Locale;
  product: DocumentationProduct;
  /** Override this when product documentation moves below a product-specific route. */
  docHref?: (slug: string) => string;
};

type ProductCopy = {
  accent: string;
  accentDark: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  secondarySlug: string;
  terminalLabel: string;
  terminalFile: string;
  terminalCode: string;
  terminalStatus: string;
  terminalMeta: string;
  capabilitiesTitle: string;
  capabilitiesDescription: string;
  capabilities: Array<{ title: string; description: string }>;
  quickTitle: string;
  quickDescription: string;
  quickSteps: Array<{ eyebrow: string; title: string; description: string; slug: string }>;
  relatedTitle: string;
  relatedDescription: string;
  relatedSlugs: string[];
};

const productCopy: Record<DocumentationProduct, Record<Locale, ProductCopy>> = {
  asgard: {
    zh: {
      accent: "#2859ee",
      accentDark: "#1743d4",
      eyebrow: "ASGARD · MODULAR APPLICATION FRAMEWORK",
      title: "把复杂后端，变成\n可组合的工程系统。",
      description: "Asgard 为 .NET 10 应用统一宿主、插件、配置、基础设施、身份和工程约定。业务模块保持清晰，人类与 AI Agent 使用同一套规则持续交付。",
      primaryAction: "安装并启动",
      secondaryAction: "理解框架",
      secondarySlug: "overview",
      terminalLabel: "Asgard NuGet 安装与最小启动",
      terminalFile: "Terminal · Program.cs",
      terminalCode: "dotnet add package Asgard.PluginSdk --version 5.1.3\n\nusing Asgard.PluginSdk;\n\nawait PluginWebAppDefaults\n  .RunAsync<MyPlugin>();",
      terminalStatus: "Asgard host ready",
      terminalMeta: ".NET 10 · C# 14",
      capabilitiesTitle: "一套框架，收住后端复杂度",
      capabilitiesDescription: "从启动到运行时能力都使用稳定入口，让模块化系统更容易开发、测试、部署和演进。",
      capabilities: [
        { title: "宿主与插件", description: "YggdrasilHost 编排启动过程，PluginBase 划分模块边界；既能快速启动，也能精确控制生命周期。" },
        { title: "统一基础设施", description: "通过 AbsAsgardContext 使用数据库、缓存、消息、作业、安全、身份和 Trace，并按配置安全降级。" },
        { title: "AI Ready 工程", description: "配套 Skills、Analyzers、TsGen 和后端守卫，把框架知识、代码约束与复查流程直接交给 Agent。" },
      ],
      quickTitle: "从 NuGet 到第一个业务模块",
      quickDescription: "先选择最短启动路径，再按业务复杂度深入宿主、插件和 API 约定。",
      quickSteps: [
        { eyebrow: "STEP 01 · INSTALL", title: "选择并安装 NuGet 包", description: "理解包层级，固定 5.1.3，再选择插件 SDK 或完整宿主入口。", slug: "packages-and-installation" },
        { eyebrow: "STEP 02 · COMPOSE", title: "定义插件与宿主", description: "使用快速路径启动单模块，或切换到 YggdrasilHost 掌控装配过程。", slug: "host-and-plugins" },
        { eyebrow: "STEP 03 · BUILD", title: "按 Asgard 约定开发 API", description: "沿 Controller → Service → Repository → Entity 边界实现可维护业务。", slug: "api-development" },
      ],
      relatedTitle: "深入 Asgard",
      relatedDescription: "从核心运行时进入基础设施、身份安全与 AI 协作专题。",
      relatedSlugs: ["infrastructure", "resource-api-authentication", "ai-ready"],
    },
    en: {
      accent: "#2859ee",
      accentDark: "#1743d4",
      eyebrow: "ASGARD · MODULAR APPLICATION FRAMEWORK",
      title: "Turn backend complexity into\na composable system.",
      description: "Asgard gives .NET 10 applications one host, plugin model, configuration system, infrastructure surface, identity contract, and set of engineering rules. Humans and AI agents ship against the same boundaries.",
      primaryAction: "Install and start",
      secondaryAction: "Understand Asgard",
      secondarySlug: "overview",
      terminalLabel: "Install Asgard from NuGet and run the minimal host",
      terminalFile: "Terminal · Program.cs",
      terminalCode: "dotnet add package Asgard.PluginSdk --version 5.1.3\n\nusing Asgard.PluginSdk;\n\nawait PluginWebAppDefaults\n  .RunAsync<MyPlugin>();",
      terminalStatus: "Asgard host ready",
      terminalMeta: ".NET 10 · C# 14",
      capabilitiesTitle: "One framework for backend complexity",
      capabilitiesDescription: "Stable entry points cover startup and runtime capabilities, keeping modular systems easier to build, test, deploy, and evolve.",
      capabilities: [
        { title: "Host and plugins", description: "YggdrasilHost orchestrates startup while PluginBase defines module boundaries, from the fast path to full lifecycle control." },
        { title: "Unified infrastructure", description: "Use database, cache, messaging, jobs, security, identity, and tracing through AbsAsgardContext with configuration-aware availability." },
        { title: "AI Ready engineering", description: "Skills, analyzers, TsGen, and backend guards give agents the same framework knowledge, hard rules, and review workflow as the team." },
      ],
      quickTitle: "From NuGet to your first module",
      quickDescription: "Start with the shortest safe path, then take control of the host, plugin model, and API conventions as the system grows.",
      quickSteps: [
        { eyebrow: "STEP 01 · INSTALL", title: "Choose and install a NuGet package", description: "Understand the package layers, pin 5.1.3, then choose the plugin SDK or full host entry.", slug: "packages-and-installation" },
        { eyebrow: "STEP 02 · COMPOSE", title: "Define the plugin and host", description: "Run one module through the fast path or use YggdrasilHost for complete composition control.", slug: "host-and-plugins" },
        { eyebrow: "STEP 03 · BUILD", title: "Build APIs the Asgard way", description: "Keep business code maintainable across Controller → Service → Repository → Entity boundaries.", slug: "api-development" },
      ],
      relatedTitle: "Go deeper with Asgard",
      relatedDescription: "Move from the core runtime into infrastructure, identity security, and agent collaboration.",
      relatedSlugs: ["infrastructure", "resource-api-authentication", "ai-ready"],
    },
  },
  heimdall: {
    zh: {
      accent: "#6847e8",
      accentDark: "#5132c4",
      eyebrow: "HEIMDALL · OIDC IDENTITY PLATFORM",
      title: "身份基础设施，\n不该从零再造。",
      description: "Heimdall 是基于 Asgard 构建的标准 OIDC/OAuth 2.0 身份平台。它把登录、Token、多租户、联合身份和安全运营放进一套可部署、可扩展的系统。",
      primaryAction: "开始部署",
      secondaryAction: "查看协议能力",
      secondarySlug: "heimdall",
      terminalLabel: "Heimdall 生产部署快速路径",
      terminalFile: "Terminal · deployment",
      terminalCode: "# 固定同一不可变版本的后端与 Web 镜像\n./deploy.sh 5.3.19\n\n# 验证标准 OIDC 元数据\ncurl -fsS https://id.example.com/\\\n.well-known/openid-configuration",
      terminalStatus: "Discovery and JWKS ready",
      terminalMeta: "OIDC · OAuth 2.0",
      capabilitiesTitle: "从身份协议到安全运营",
      capabilitiesDescription: "不仅颁发 Token，还覆盖租户身份模型、企业联合、凭据生命周期和可观测安全边界。",
      capabilities: [
        { title: "标准 OIDC / OAuth 2.0", description: "提供 Discovery、JWKS、Authorization Code + PKCE、Refresh Token、Client Credentials 与 Device Flow。" },
        { title: "多租户身份平台", description: "平台与租户 Authority 明确隔离，统一用户、客户端、Scope、RBAC、授权、同意和标准 Claims。" },
        { title: "企业安全与扩展", description: "覆盖密钥轮换、撤销、MFA、Passkey、SCIM、外部 OIDC、LDAP/AD、SAML、SIEM、Backend Directory、身份 Webhook 与 MCP。" },
      ],
      quickTitle: "安全上线的最短路径",
      quickDescription: "从基础设施和 Issuer 开始，先通过协议验收，再接入浏览器应用与后端 API。",
      quickSteps: [
        { eyebrow: "STEP 01 · DEPLOY", title: "准备 PostgreSQL 与运行配置", description: "生成 app.yaml 与 plugin.yaml，通过 Secret 注入数据库、签名和加密材料。", slug: "heimdall-deployment" },
        { eyebrow: "STEP 02 · VERIFY", title: "验证 Discovery、JWKS 与健康状态", description: "固定镜像版本上线，确认公开 Issuer 与反向代理行为一致。", slug: "heimdall-deployment" },
        { eyebrow: "STEP 03 · CONNECT", title: "使用 Code + PKCE 对接应用", description: "分别配置平台或租户 Authority、API JWT 验证，以及两个独立的 CORS 边界。", slug: "heimdall-integration" },
      ],
      relatedTitle: "深入 Heimdall",
      relatedDescription: "先在完整身份平台与轻量签发器之间选型，再进入应用接入与生产运行要求。",
      relatedSlugs: ["heimdall", "heimdall-jwt-signing", "heimdall-integration"],
    },
    en: {
      accent: "#6847e8",
      accentDark: "#5132c4",
      eyebrow: "HEIMDALL · OIDC IDENTITY PLATFORM",
      title: "Identity infrastructure,\nwithout rebuilding it all.",
      description: "Heimdall is a standards-based OIDC/OAuth 2.0 identity platform built on Asgard. It puts sign-in, tokens, multi-tenancy, federation, and security operations into one deployable, extensible system.",
      primaryAction: "Start deploying",
      secondaryAction: "Explore protocols",
      secondarySlug: "heimdall",
      terminalLabel: "Heimdall production deployment fast path",
      terminalFile: "Terminal · deployment",
      terminalCode: "# Pin matching immutable backend and Web images\n./deploy.sh 5.3.19\n\n# Verify standard OIDC metadata\ncurl -fsS https://id.example.com/\\\n.well-known/openid-configuration",
      terminalStatus: "Discovery and JWKS ready",
      terminalMeta: "OIDC · OAuth 2.0",
      capabilitiesTitle: "From identity protocols to security operations",
      capabilitiesDescription: "Heimdall goes beyond token issuance with tenant identity, enterprise federation, credential lifecycle, and observable security boundaries.",
      capabilities: [
        { title: "Standard OIDC / OAuth 2.0", description: "Discovery, JWKS, Authorization Code + PKCE, Refresh Token, Client Credentials, and Device Flow are first-class protocol surfaces." },
        { title: "Multi-tenant identity", description: "Platform and tenant authorities stay distinct across users, clients, scopes, RBAC, grants, consent, and standard claims." },
        { title: "Enterprise security", description: "Key rotation, revocation, MFA, Passkeys, SCIM, external OIDC, LDAP/AD, SAML, SIEM, Backend Directory, identity Webhooks, and MCP support deeper deployments." },
      ],
      quickTitle: "The shortest safe path to production",
      quickDescription: "Begin with infrastructure and the public issuer, pass protocol verification, then connect browser applications and backend APIs.",
      quickSteps: [
        { eyebrow: "STEP 01 · DEPLOY", title: "Prepare PostgreSQL and runtime configuration", description: "Generate app.yaml and plugin.yaml, injecting database, signing, and encryption material through secrets.", slug: "heimdall-deployment" },
        { eyebrow: "STEP 02 · VERIFY", title: "Verify Discovery, JWKS, and health", description: "Deploy an immutable image and confirm that the public issuer matches reverse-proxy behavior.", slug: "heimdall-deployment" },
        { eyebrow: "STEP 03 · CONNECT", title: "Connect apps with Code + PKCE", description: "Configure the platform or tenant authority, API JWT validation, and the two independent CORS boundaries.", slug: "heimdall-integration" },
      ],
      relatedTitle: "Go deeper with Heimdall",
      relatedDescription: "Choose between the full identity platform and the lightweight issuer, then integrate applications against the right boundary.",
      relatedSlugs: ["heimdall", "heimdall-jwt-signing", "heimdall-integration"],
    },
  },
  skills: {
    zh: {
      accent: "#0a8f75",
      accentDark: "#08705d",
      eyebrow: "ASGARD SKILLS · EXECUTABLE AI KNOWLEDGE",
      title: "让 Agent 真正懂 Asgard，\n不只会猜 API。",
      description: "Asgard Skills 把架构路由、模块契约、C# 硬规则、测试与复查流程变成可加载能力。它是 Asgard 与 Heimdall 共享的 AI Ready 工程层。",
      primaryAction: "开始使用 Skills",
      secondaryAction: "查看完整目录",
      secondarySlug: "skills-catalog",
      terminalLabel: "从固定版本安装 Asgard Skills",
      terminalFile: "Agent workflow",
      terminalCode: "Router: $asgard-framework-overview\nRules:  $asgard-dotnet-10-csharp-14\nTask:   $asgard-api-development\nTests:  $dotnet-unit-testing\nReview: $asgard-backend-guard",
      terminalStatus: "29 skills discovered",
      terminalMeta: "commit-pinned",
      capabilitiesTitle: "从架构路由到交付门禁",
      capabilitiesDescription: "Agent 在正确时间获得正确知识；实现、测试、复查和文档更新形成一条可重复的工程链路。",
      capabilities: [
        { title: "任务路由", description: "先通过框架总览判断宿主、插件、API、基础设施或身份边界，再加载最小专项集合。" },
        { title: "强制规则", description: "Asgard 专用 .NET 10 / C# 14 规则优先于通用建议，Analyzers 和测试继续在代码层验证。" },
        { title: "独立复查", description: "实现完成后由 backend guard 检查分层、统一响应、租户、审计字段与乐观锁等高风险边界。" },
      ],
      quickTitle: "把 Skills 接入开发闭环",
      quickDescription: "先理解 AI Ready 契约，再选择专项技能并固定审核过的仓库 commit。",
      quickSteps: [
        { eyebrow: "STEP 01 · CONNECT", title: "连接 Skills 仓库", description: "克隆独立仓库或从固定 ref 安装，把技能放进 Agent 的发现路径。", slug: "skills-installation" },
        { eyebrow: "STEP 02 · SELECT", title: "按任务选择最小组合", description: "使用 Router → Mandatory Rules → Specialist → Review 的组合顺序。", slug: "skills-catalog" },
        { eyebrow: "STEP 03 · VERIFY", title: "构建、测试并同步文档", description: "源码、Skill、双语指南与版本说明一起通过门禁。", slug: "ai-ready" },
      ],
      relatedTitle: "深入 AI Ready",
      relatedDescription: "从执行模型进入 29 个技能的职责、组合与冲突边界。",
      relatedSlugs: ["ai-ready", "skills-installation", "skills-catalog"],
    },
    en: {
      accent: "#0a8f75",
      accentDark: "#08705d",
      eyebrow: "ASGARD SKILLS · EXECUTABLE AI KNOWLEDGE",
      title: "Agents that understand the framework,\nnot agents that guess APIs.",
      description: "Asgard Skills turns architecture routing, module contracts, C# hard rules, testing, and review workflows into loadable capabilities shared by Asgard and Heimdall.",
      primaryAction: "Start using Skills",
      secondaryAction: "Browse the catalog",
      secondarySlug: "skills-catalog",
      terminalLabel: "Install a pinned Asgard Skills revision",
      terminalFile: "Agent workflow",
      terminalCode: "Router: $asgard-framework-overview\nRules:  $asgard-dotnet-10-csharp-14\nTask:   $asgard-api-development\nTests:  $dotnet-unit-testing\nReview: $asgard-backend-guard",
      terminalStatus: "29 skills discovered",
      terminalMeta: "commit-pinned",
      capabilitiesTitle: "From architecture routing to delivery gates",
      capabilitiesDescription: "Agents receive the right knowledge at the right time, with implementation, testing, review, and documentation in one repeatable engineering loop.",
      capabilities: [
        { title: "Task routing", description: "Use the framework overview to choose host, plugin, API, infrastructure, or identity boundaries before loading a minimal specialist set." },
        { title: "Mandatory rules", description: "Asgard-specific .NET 10 / C# 14 rules take precedence over generic advice while Analyzers and tests verify code-level behavior." },
        { title: "Independent review", description: "After implementation, backend guard checks layering, response envelopes, tenancy, audit fields, and optimistic-lock risks." },
      ],
      quickTitle: "Connect Skills to the development loop",
      quickDescription: "Understand the AI Ready contract, select specialists, and pin a reviewed repository commit.",
      quickSteps: [
        { eyebrow: "STEP 01 · CONNECT", title: "Connect the Skills repository", description: "Clone the repository or install from a pinned ref into the agent's discovery path.", slug: "skills-installation" },
        { eyebrow: "STEP 02 · SELECT", title: "Choose the smallest task set", description: "Compose Router → Mandatory Rules → Specialist → Review in that order.", slug: "skills-catalog" },
        { eyebrow: "STEP 03 · VERIFY", title: "Build, test, and synchronize docs", description: "Source, Skills, bilingual guides, and release notes pass the same maintenance gate.", slug: "ai-ready" },
      ],
      relatedTitle: "Go deeper into AI Ready",
      relatedDescription: "Move from the execution model into all 29 Skills, their compositions, and conflict boundaries.",
      relatedSlugs: ["ai-ready", "skills-installation", "skills-catalog"],
    },
  },
};

function CapabilityIcon({ index }: { index: number }) {
  return <span className={`capability-icon icon-${index}`} aria-hidden="true"><i /><i /><i /></span>;
}

export function ProductHomePage({ locale, product, docHref }: ProductHomePageProps) {
  const copy = productCopy[product][locale];
  const localizedDocs = docs[locale];
  const hrefFor = docHref ?? ((slug: string) => `/${locale}/${product}/docs/${slug}`);
  const related = copy.relatedSlugs
    .map((slug) => localizedDocs.find((doc) => doc.slug === slug))
    .filter((doc) => doc !== undefined);
  const productStyle = {
    "--blue": copy.accent,
    "--blue-dark": copy.accentDark,
  } as CSSProperties;

  return (
    <div className={`home-page product-home product-${product}`} style={productStyle}>
      <SiteHeader locale={locale} product={product} />
      <main>
        <section className="hero-grid">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-content">
            <p className="hero-kicker"><span />{copy.eyebrow}</p>
            <h1>{copy.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
            <p className="hero-description">{copy.description}</p>
            <div className="hero-actions">
              <a className="button primary" href={hrefFor(copy.quickSteps[0].slug)}>{copy.primaryAction}<span>→</span></a>
              <a className="button secondary" href={hrefFor(copy.secondarySlug)}>{copy.secondaryAction}<span>↗</span></a>
            </div>
          </div>
          <div className="hero-terminal" aria-label={copy.terminalLabel}>
            <div className="terminal-top"><span /><span /><span /><b>{copy.terminalFile}</b></div>
            <pre><code>{copy.terminalCode}</code></pre>
            <div className="terminal-status"><span className="status-dot" />{copy.terminalStatus}<b>{copy.terminalMeta}</b></div>
          </div>
        </section>

        <section className="home-section capabilities-section">
          <div className="section-heading">
            <p className="section-kicker">{product.toUpperCase()} CAPABILITIES</p>
            <h2>{copy.capabilitiesTitle}</h2>
            <p>{copy.capabilitiesDescription}</p>
          </div>
          <div className="capability-grid">
            {copy.capabilities.map((capability, index) => (
              <article className="capability-card" key={capability.title}>
                <div className="card-top"><CapabilityIcon index={index} /><span>0{index + 1}</span></div>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <div className="card-pattern" />
              </article>
            ))}
          </div>
        </section>

        <section className="home-section popular-section">
          <div className="section-heading compact">
            <p className="section-kicker">QUICK PATH</p>
            <h2>{copy.quickTitle}</h2>
            <p>{copy.quickDescription}</p>
          </div>
          <div className="guide-list">
            {copy.quickSteps.map((step, index) => (
              <a href={hrefFor(step.slug)} key={`${step.eyebrow}-${index}`}>
                <span className="guide-number">0{index + 1}</span>
                <span><small>{step.eyebrow}</small><b>{step.title}</b><p>{step.description}</p></span>
                <i>→</i>
              </a>
            ))}
          </div>
        </section>

        <section className="home-section capabilities-section">
          <div className="section-heading compact">
            <p className="section-kicker">DOCUMENTATION</p>
            <h2>{copy.relatedTitle}</h2>
            <p>{copy.relatedDescription}</p>
          </div>
          <div className="capability-grid">
            {related.map((doc, index) => (
              <a className="capability-card" href={`/${locale}/${productForSlug(doc.slug)}/docs/${doc.slug}`} key={doc.slug}>
                <div className="card-top"><CapabilityIcon index={index} /><span>0{index + 1}</span></div>
                <h3>{doc.title}</h3>
                <p>{doc.description}</p>
                <b>{locale === "zh" ? "阅读文档" : "Read docs"} <span>→</span></b>
                <div className="card-pattern" />
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer><span>{localeCopy[locale].footer}</span><span>{product === "asgard" ? "MIT · .NET 10 · C# 14" : product === "heimdall" ? "OIDC · OAuth 2.0 · Asgard" : "29 Skills · Humans + Agents"}</span></footer>
    </div>
  );
}
