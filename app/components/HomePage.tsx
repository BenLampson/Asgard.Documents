import { localeCopy, type Locale } from "../content";
import { SiteHeader } from "./SiteHeader";

const copy = {
  zh: {
    kicker: "ASGARD ECOSYSTEM · AI READY",
    title: "一个生态，两个产品，\n一套 AI Ready 工程层。",
    description: "Asgard 负责把 .NET 后端变成可组合、可治理的工程系统；Heimdall 负责标准 OIDC/OAuth 2.0、多租户身份与安全运营；Asgard Skills 把两者的工程知识交给 Agent。",
    asgard: "模块化 .NET 应用框架",
    asgardDesc: "统一宿主、插件、配置、数据库、缓存、消息、作业、身份、授权、追踪与工程约定。",
    heimdall: "标准 OIDC 身份平台",
    heimdallDesc: "登录、Token、多租户、Application 域 RBAC、Backend Directory、受治理 MCP、联合身份、MFA、SCIM 与 SIEM，当前基线为 5.3.19。",
    skills: "可加载的 AI 工程知识",
    skillsDesc: "29 个 Skills 覆盖架构路由、模块实现、Heimdall 应用 RBAC、MCP 与微服务身份集成、C# 规则、测试和后端复查，并随源码持续审计。",
    enter: "进入独立站点",
    architecture: "从应用框架到身份边界",
    architectureDesc: "产品各自独立演进，又通过标准协议、Claims 和 Asgard 运行时自然协作。",
    choose: "按你现在要完成的任务选择入口",
    chooseDesc: "Asgard、Heimdall 与 Skills 各自独立演进。先选目标，再进入对应产品的最短安全路径。",
    tasks: [
      { eyebrow: "BUILD · .NET APPLICATION", title: "我要搭建模块化 .NET 应用", description: "从 Asgard PluginSdk 或完整 Yggdrasil 宿主开始。", href: "/asgard/docs/packages-and-installation" },
      { eyebrow: "IDENTITY · COMPLETE IDP", title: "我要部署完整 OIDC 身份平台", description: "部署 Heimdall，并验证 Discovery、JWKS 与生产 Issuer。", href: "/heimdall/docs/heimdall-deployment" },
      { eyebrow: "IDENTITY · MINI ISSUER", title: "已有登录，只需要签发兼容 JWT", description: "使用轻量 JWT issuer，不必部署完整 Heimdall。", href: "/heimdall/docs/heimdall-jwt-signing" },
      { eyebrow: "AI · AGENT WORKFLOW", title: "我要让 Agent 正确开发 Asgard", description: "连接 Asgard Skills，并按任务加载最小技能组合。", href: "/skills/docs/skills-installation" },
    ],
    ai: "不只是 AI friendly，而是 AI Ready",
    aiDesc: "Asgard Skills 把模块语义、硬规则、模板和复查流程交给 Agent；Analyzers 在编译期守住边界，TsGen 让前后端共享契约。",
  },
  en: {
    kicker: "ASGARD ECOSYSTEM · AI READY",
    title: "One ecosystem, two products,\nand one AI Ready layer.",
    description: "Asgard turns .NET backends into composable systems. Heimdall delivers standards-based identity and security operations. Asgard Skills gives agents the engineering knowledge for both.",
    asgard: "Modular .NET application framework",
    asgardDesc: "One host, plugin model, configuration system, database, cache, messaging, jobs, identity, authorization, tracing, and engineering contract.",
    heimdall: "Standards-based OIDC platform",
    heimdallDesc: "Sign-in, tokens, multi-tenancy, application-domain RBAC, Backend Directory, governed MCP, federation, MFA, SCIM, and SIEM on the 5.3.19 baseline.",
    skills: "Loadable AI engineering knowledge",
    skillsDesc: "Twenty-nine Skills cover architecture routing, module implementation, Heimdall application RBAC, MCP and service identity integration, C# rules, testing, and backend review with ongoing source audits.",
    enter: "Enter dedicated site",
    architecture: "From application framework to identity boundary",
    architectureDesc: "Each product evolves independently while standard protocols, claims, and the Asgard runtime make them work naturally together.",
    choose: "Choose by the job you need to complete",
    chooseDesc: "Asgard, Heimdall, and Skills evolve independently. Pick the outcome first, then follow that product's shortest safe path.",
    tasks: [
      { eyebrow: "BUILD · .NET APPLICATION", title: "Build a modular .NET application", description: "Start with Asgard PluginSdk or the complete Yggdrasil host.", href: "/asgard/docs/packages-and-installation" },
      { eyebrow: "IDENTITY · COMPLETE IDP", title: "Deploy a complete OIDC identity platform", description: "Deploy Heimdall and verify Discovery, JWKS, and the production issuer.", href: "/heimdall/docs/heimdall-deployment" },
      { eyebrow: "IDENTITY · MINI ISSUER", title: "Keep existing login and issue compatible JWTs", description: "Use the lightweight JWT issuer without deploying the full Heimdall platform.", href: "/heimdall/docs/heimdall-jwt-signing" },
      { eyebrow: "AI · AGENT WORKFLOW", title: "Give agents the Asgard engineering contract", description: "Connect Asgard Skills and load the smallest task-specific set.", href: "/skills/docs/skills-installation" },
    ],
    ai: "Not merely AI friendly. AI Ready.",
    aiDesc: "Asgard Skills gives agents module semantics, hard rules, templates, and review workflows. Analyzers protect boundaries at compile time, while TsGen shares contracts with frontends.",
  },
} as const;

export function HomePage({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <div className="home-page">
      <SiteHeader locale={locale} />
      <main>
        <section className="hero-grid">
          <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
          <div className="hero-content">
            <p className="hero-kicker"><span />{c.kicker}</p>
            <h1>{c.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
            <p className="hero-description">{c.description}</p>
            <div className="hero-actions">
              <a className="button primary" href={`/${locale}/asgard`}>Asgard <span>→</span></a>
              <a className="button secondary" href={`/${locale}/heimdall`}>Heimdall <span>→</span></a>
              <a className="button secondary" href={`/${locale}/skills`}>Skills <span>→</span></a>
            </div>
          </div>
          <div className="hero-terminal" aria-label="Asgard ecosystem architecture">
            <div className="terminal-top"><span /><span /><span /><b>ecosystem.architecture</b></div>
            <pre><code>{`Apps / APIs / AI Agents\n        ↓ OIDC + Claims\nHeimdall Identity Platform\n        ↓ built on\nAsgard Host + Plugins + Infrastructure\n        ↓ governed by\nSkills + Analyzers + TsGen`}</code></pre>
            <div className="terminal-status"><span className="status-dot" />AI-ready ecosystem<b>.NET 10 · OIDC</b></div>
          </div>
        </section>

        <section className="home-section capabilities-section">
          <div className="section-heading"><p className="section-kicker">ECOSYSTEM SITES</p><h2>{c.architecture}</h2><p>{c.architectureDesc}</p></div>
          <div className="capability-grid ecosystem-product-grid">
            <a className="capability-card" href={`/${locale}/asgard`}><div className="card-top"><b>ASGARD</b><span>01</span></div><h3>{c.asgard}</h3><p>{c.asgardDesc}</p><b>{c.enter} <span>→</span></b><div className="card-pattern" /></a>
            <a className="capability-card" href={`/${locale}/heimdall`}><div className="card-top"><b>HEIMDALL</b><span>02</span></div><h3>{c.heimdall}</h3><p>{c.heimdallDesc}</p><b>{c.enter} <span>→</span></b><div className="card-pattern" /></a>
            <a className="capability-card" href={`/${locale}/skills`}><div className="card-top"><b>ASGARD SKILLS</b><span>03</span></div><h3>{c.skills}</h3><p>{c.skillsDesc}</p><b>{c.enter} <span>→</span></b><div className="card-pattern" /></a>
          </div>
        </section>

        <section className="home-section popular-section">
          <div className="section-heading compact"><p className="section-kicker">CHOOSE YOUR PATH</p><h2>{c.choose}</h2><p>{c.chooseDesc}</p></div>
          <div className="guide-list">
            {c.tasks.map((task, index) => (
              <a href={`/${locale}${task.href}`} key={task.href}>
                <span className="guide-number">0{index + 1}</span>
                <span><small>{task.eyebrow}</small><b>{task.title}</b><p>{task.description}</p></span>
                <i>→</i>
              </a>
            ))}
          </div>
        </section>

        <section className="home-section capabilities-section">
          <div className="section-heading"><p className="section-kicker">HUMANS + AGENTS</p><h2>{c.ai}</h2><p>{c.aiDesc}</p></div>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <a className="button primary" href={`/${locale}/skills`}>Asgard Skills <span>→</span></a>
            <a className="button secondary" href="/llms.txt">For agents · llms.txt <span>↗</span></a>
            <a className="button secondary" href="/search-index.json">Search index <span>↗</span></a>
            <a className="button secondary" href="/skills-manifest.json">Skills manifest <span>↗</span></a>
          </div>
        </section>
      </main>
      <footer><span>{localeCopy[locale].footer}</span><span>Asgard 5.1.3 · Heimdall 5.3.19</span></footer>
    </div>
  );
}
