"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import {
  brands,
  products,
  productVersionLabel,
  productHomePath,
  productDocPath,
  type Locale,
  type Product,
} from "../lib/products";
import "./marketing.css";

type Localized = Record<Locale, string>;
type Guide = { slug: string; title: Localized; description: Localized };
type ProductCopy = {
  eyebrow: string;
  headline: Localized;
  introduction: Localized;
  start: Localized;
  introTitle: Localized;
  introDescription: Localized;
  domains: { label: string; description: Localized }[];
  guides: Guide[];
  workflow: Localized[];
  handoff: { product: Product; slug: string; label: Localized };
};

const docPath = productDocPath;
const homePath = productHomePath;
const productCopy: Record<Product, ProductCopy> = {
  asgard: {
    eyebrow: "ASGARD / 阿斯加德 · AI-FRIENDLY .NET",
    headline: {
      zh: "AI 友好的 .NET 框架。\n让 Agent 遵循工程秩序。",
      en: "An AI-friendly .NET framework.\nGive agents clear engineering rules.",
    },
    introduction: {
      zh: "固定分层、统一响应、模块边界与专项 Skills，让人与 Agent 使用同一套工程约定。",
      en: "Clear layers, unified responses, module boundaries and focused Skills give people and agents the same engineering contracts.",
    },
    start: { zh: "开始阅读", en: "Start reading" },
    introTitle: {
      zh: "AI 友好，\n来自清晰的工程秩序。",
      en: "AI-friendly starts\nwith clear engineering rules.",
    },
    introDescription: {
      zh: "明确的入口、职责与契约降低理解成本。\nSkills 把约定交给 Agent，源码和验证约束交付。",
      en: "Clear entry points, responsibilities and contracts make a system easier to understand. Skills carry those rules to agents; source and verification keep delivery grounded.",
    },
    domains: [
      {
        label: "STRUCTURED",
        description: {
          zh: "可理解的框架结构",
          en: "An understandable framework",
        },
      },
      {
        label: "AGENT-AWARE",
        description: {
          zh: "按任务加载工程 Skills",
          en: "Engineering Skills for each task",
        },
      },
      {
        label: "VERIFIABLE",
        description: {
          zh: "源码、Analyzers 与测试",
          en: "Source, Analyzers and tests",
        },
      },
    ],
    guides: [
      {
        slug: "quick-start",
        title: { zh: "快速开始", en: "Quick start" },
        description: {
          zh: "建立第一条可运行路径",
          en: "Build your first working path",
        },
      },
      {
        slug: "architecture",
        title: { zh: "核心概念", en: "Core concepts" },
        description: {
          zh: "理解宿主、插件与分层职责",
          en: "Understand hosts, plugins and responsibilities",
        },
      },
      {
        slug: "configuration",
        title: { zh: "配置参考", en: "Configuration reference" },
        description: {
          zh: "找到字段、默认值与运行时边界",
          en: "Find fields, defaults and runtime boundaries",
        },
      },
      {
        slug: "operations",
        title: { zh: "运维指南", en: "Operations" },
        description: {
          zh: "诊断、恢复与持续交付",
          en: "Diagnose, recover and deliver",
        },
      },
    ],
    workflow: [
      { zh: "阅读模块指南", en: "Read the module guide" },
      { zh: "加载对应 Asgard Skills", en: "Load the relevant Asgard Skills" },
      {
        zh: "对照源码与工程规则复查",
        en: "Review against source and engineering rules",
      },
    ],
    handoff: {
      product: "heimdall",
      slug: "quick-start",
      label: {
        zh: "继续了解 Heimdall 身份集成",
        en: "Continue to Heimdall identity integration",
      },
    },
  },
  heimdall: {
    eyebrow: "IDENTITY / SECURITY",
    headline: {
      zh: "身份清楚，\n系统才有边界。",
      en: "Clear identity.\nWell-defined boundaries.",
    },
    introduction: {
      zh: "从标准协议、应用接入，到租户身份与安全运营。",
      en: "From standard protocols and application integration to tenant identity and security operations.",
    },
    start: { zh: "开始阅读", en: "Start reading" },
    introTitle: {
      zh: "从一次登录，\n到完整的身份治理。",
      en: "From a single sign-in\nto identity governance.",
    },
    introDescription: {
      zh: "沿着应用、协议与资源的关系阅读。\n让每个身份责任都落在明确的边界里。",
      en: "Follow the relationship between applications, protocols and resources. Give every identity responsibility a clear boundary.",
    },
    domains: [
      {
        label: "PROTOCOL",
        description: { zh: "OIDC / OAuth 2.0", en: "OIDC / OAuth 2.0" },
      },
      {
        label: "BOUNDARIES",
        description: {
          zh: "应用、租户与资源",
          en: "Applications, tenants and resources",
        },
      },
      {
        label: "OPERATIONS",
        description: {
          zh: "凭据、会话与部署",
          en: "Credentials, sessions and deployment",
        },
      },
    ],
    guides: [
      {
        slug: "quick-start",
        title: { zh: "接入指南", en: "Integration guide" },
        description: {
          zh: "从应用注册与登录流程开始",
          en: "Start with application registration and sign-in",
        },
      },
      {
        slug: "configuration",
        title: { zh: "协议与令牌", en: "Protocols and tokens" },
        description: {
          zh: "理解令牌用途与校验边界",
          en: "Understand token purpose and validation",
        },
      },
      {
        slug: "security",
        title: { zh: "租户与权限", en: "Tenants and permissions" },
        description: {
          zh: "梳理身份、权限与资源归属",
          en: "Map identity, permissions and resource ownership",
        },
      },
      {
        slug: "operations",
        title: { zh: "安全运营", en: "Security operations" },
        description: {
          zh: "部署、会话与故障诊断",
          en: "Deployment, sessions and troubleshooting",
        },
      },
    ],
    workflow: [
      { zh: "阅读身份接入指南", en: "Read the identity integration guide" },
      { zh: "加载 identity-integration", en: "Load identity-integration" },
      {
        zh: "复查协议、claims 与资源边界",
        en: "Review protocols, claims and resource boundaries",
      },
    ],
    handoff: {
      product: "asgard",
      slug: "architecture",
      label: {
        zh: "继续了解 Asgard 资源 API",
        en: "Continue to Asgard resource APIs",
      },
    },
  },
  skills: {
    eyebrow: "AI READY / EXECUTABLE KNOWLEDGE",
    headline: {
      zh: "把工程经验，\n变成 Agent 的行动依据。",
      en: "Turn engineering knowledge\ninto informed agent action.",
    },
    introduction: {
      zh: "按任务选择知识，让 Agent 理解约定、边界与复查方式。",
      en: "Choose knowledge for the task so agents understand the contracts, boundaries and review process.",
    },
    start: { zh: "选择你的 Skills", en: "Choose your Skills" },
    introTitle: {
      zh: "从会读文档，\n到带着约束完成任务。",
      en: "Beyond reading docs.\nWork with clear constraints.",
    },
    introDescription: {
      zh: "知识不仅描述功能，也说明何时使用、如何检查。\n把协作放进可查阅、可复查的工程流程里。",
      en: "Knowledge explains not only what a feature does, but when to use it and how to check it. Bring collaboration into an inspectable engineering workflow.",
    },
    domains: [
      {
        label: "SELECT",
        description: { zh: "按任务选择", en: "Select for your task" },
      },
      {
        label: "LOAD",
        description: { zh: "加载工程约定", en: "Load engineering contracts" },
      },
      {
        label: "VERIFY",
        description: {
          zh: "验证结果与边界",
          en: "Verify results and boundaries",
        },
      },
    ],
    guides: [
      {
        slug: "overview",
        title: { zh: "认识 Skills", en: "Meet Skills" },
        description: {
          zh: "理解任务知识的作用与边界",
          en: "Understand task knowledge and its boundaries",
        },
      },
      {
        slug: "catalog",
        title: { zh: "Skills 目录", en: "Skills catalog" },
        description: {
          zh: "按模块与任务定位知识",
          en: "Find knowledge by module and task",
        },
      },
      {
        slug: "installation",
        title: { zh: "安装与兼容", en: "Installation and compatibility" },
        description: {
          zh: "核对来源、安装方式与目标版本",
          en: "Check source, installation and target compatibility",
        },
      },
      {
        slug: "workflow",
        title: { zh: "Agent 工作流", en: "Agent workflow" },
        description: {
          zh: "选择、加载、验证与复查",
          en: "Select, load, verify and review",
        },
      },
    ],
    workflow: [
      { zh: "定义当前任务", en: "Define the current task" },
      {
        zh: "选择并加载相应 Skills",
        en: "Choose and load the relevant Skills",
      },
      { zh: "核对源码与交付结果", en: "Check source and delivery results" },
    ],
    handoff: {
      product: "skills",
      slug: "catalog",
      label: {
        zh: "查看完整 Skills 目录",
        en: "Browse the complete Skills catalog",
      },
    },
  },
};

const workflowText: Localized = {
  zh: "# AI-friendly engineering\n\nRead      →  目标版本与模块边界\nLoad      →  对应 Skills 与 AGENTS.md\nBuild     →  遵循框架约定\nVerify    →  Analyzers · 构建 · 测试\nReview    →  对照源码独立复查",
  en: "# AI-friendly engineering\n\nRead      →  Version and module boundaries\nLoad      →  Skills and AGENTS.md\nBuild     →  Framework contracts\nVerify    →  Analyzers · builds · tests\nReview    →  Source-based review",
};

function CopyWorkflow({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<"ready" | "copied" | "error">("ready");
  useEffect(() => {
    if (status === "ready") return;
    const timeout = window.setTimeout(() => setStatus("ready"), 3000);
    return () => window.clearTimeout(timeout);
  }, [status]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(workflowText[locale]);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }
  const labels =
    locale === "zh"
      ? {
          ready: "复制任务约定",
          copied: "已复制",
          error: "复制失败，请选择下方文本",
        }
      : {
          ready: "Copy task contract",
          copied: "Copied",
          error: "Copy failed; select the text below",
        };
  return (
    <button className="mk-copy" type="button" onClick={copy} aria-live="polite">
      {status === "copied" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      <span>{labels[status]}</span>
    </button>
  );
}

function Arrow({ size = 20 }: { size?: number }) {
  return <ArrowUpRight size={size} aria-hidden="true" strokeWidth={1.65} />;
}

function ProductVersion({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  return (
    <span className="mk-version">{productVersionLabel(product, locale)}</span>
  );
}

export function Portal({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const principles = zh
    ? [
        ["清晰的框架", "固定分层、统一响应与配置边界"],
        ["AI 可理解", "Skills、Markdown 与任务知识"],
        ["工程可验证", "Analyzers、构建与测试验收"],
      ]
    : [
        [
          "Clear architecture",
          "Layers, responses and configuration boundaries",
        ],
        ["Agent-readable", "Skills, Markdown and task knowledge"],
        ["Verifiable engineering", "Analyzers, builds and tests"],
      ];
  const ecosystem = {
    asgard: {
      category: zh ? "应用工程" : "Application engineering",
      description: zh
        ? "宿主、插件与基础设施"
        : "Hosts, plugins and infrastructure",
    },
    heimdall: {
      category: zh ? "身份平台" : "Identity platform",
      description: zh
        ? "协议接入、租户与安全运营"
        : "Protocols, tenants and security operations",
    },
    skills: {
      category: zh ? "AI Ready 工程知识" : "AI Ready knowledge",
      description: zh
        ? "选择、安装、验证与复查"
        : "Select, install, verify and review",
    },
  };
  const evidence = zh
    ? [
        ["框架约定", "固定分层、统一响应与配置边界"],
        ["Skills / AGENTS.md", "任务知识与仓库规则"],
        ["Analyzers", "编译期的机械约束"],
        ["构建与测试", "对照源码验证结果"],
      ]
    : [
        [
          "Framework contracts",
          "Layers, responses and configuration boundaries",
        ],
        ["Skills / AGENTS.md", "Task knowledge and repository rules"],
        ["Analyzers", "Mechanical constraints at compile time"],
        ["Builds & tests", "Verify results against source"],
      ];
  const tasks: {
    product: Product;
    slug: string;
    title: string;
    description: string;
  }[] = [
    {
      product: "asgard",
      slug: "quick-start",
      title: zh ? "创建应用" : "Create an application",
      description: zh
        ? "从 Asgard 快速开始进入"
        : "Begin with the Asgard quick start",
    },
    {
      product: "heimdall",
      slug: "quick-start",
      title: zh ? "接入身份" : "Integrate identity",
      description: zh
        ? "梳理 Heimdall 与资源 API 边界"
        : "Map Heimdall and resource API boundaries",
    },
    {
      product: "skills",
      slug: "workflow",
      title: zh ? "与 Agent 协作" : "Work with an agent",
      description: zh
        ? "为任务选择合适的 Skills"
        : "Choose the right Skills for your task",
    },
  ];
  return (
    <main className="mk-page mk-portal" data-locale={locale}>
      <section className="mk-portal-hero" aria-labelledby="portal-title">
        <Image
          className="mk-artwork"
          src="/generated-2.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
        />
        <div className="mk-hero-statement">
          <p className="mk-eyebrow mk-hero-eyebrow">
            {zh
              ? "ASGARD / 阿斯加德 · AI-FRIENDLY ENGINEERING"
              : "ASGARD / A REALM FOR AI-FRIENDLY ENGINEERING"}
          </p>
          <h1 id="portal-title" className="mk-portal-title">
            <span>{zh ? "阿斯加德。" : "Asgard."}</span>
            <span>{zh ? "为人与 AI 而建。" : "Built for people & AI."}</span>
          </h1>
          <div className="mk-hero-introduction">
            <p>
              {zh
                ? "AI 友好的 .NET 工程生态。\n以清晰的框架约定连接开发者、Agent 与工程知识。"
                : "An AI-friendly .NET engineering ecosystem.\nClear framework contracts connect developers, agents and knowledge."}
            </p>
            <a
              className="mk-button"
              href={docPath(locale, "asgard", "overview")}
            >
              {zh ? "进入文档" : "Explore the docs"}
              <Arrow size={18} />
            </a>
          </div>
        </div>
        <div className="mk-principles">
          {principles.map(([title, description], index) => (
            <div className="mk-principle" key={title}>
              <div className="mk-principle-heading">
                <span className="mk-number">0{index + 1}</span>
                <h2>{title}</h2>
              </div>
              <p>{description}</p>
            </div>
          ))}
        </div>
        <p className="mk-hero-footnote">
          {zh
            ? "ASGARD · 阿斯加德 / A WORLD BUILT FOR HUMANS & AGENTS"
            : "ASGARD / A REALM BUILT FOR HUMANS & AGENTS"}
        </p>
      </section>

      <section className="mk-product-index" aria-labelledby="ecosystem-title">
        <div className="mk-index-intro">
          <p className="mk-eyebrow">THE ECOSYSTEM</p>
          <h2 id="ecosystem-title">
            {zh ? "一座有秩序的\n工程世界。" : "An ordered\nengineering realm."}
          </h2>
          <p className="mk-description">
            {zh
              ? "Asgard 构建应用的秩序。\nHeimdall 守护身份边界。\nSkills 连接开发者与 Agent。"
              : "Asgard structures applications.\nHeimdall guards identity boundaries.\nSkills connect developers and agents."}
          </p>
        </div>
        <div className="mk-product-rows">
          {products.map((product, index) => (
            <a
              className="mk-product-row"
              href={homePath(locale, product)}
              key={product}
            >
              <span className="mk-number">0{index + 1}</span>
              <div className="mk-product-row-copy">
                <div className="mk-product-name-row">
                  <h3>
                    {product === "skills" ? "Skills" : brands[product].name}
                  </h3>
                  <span>{ecosystem[product].category}</span>
                </div>
                <p>{ecosystem[product].description}</p>
              </div>
              <ProductVersion product={product} locale={locale} />
              <Arrow size={25} />
            </a>
          ))}
        </div>
      </section>

      <section className="mk-ai-section" aria-labelledby="ai-title">
        <div className="mk-section-heading">
          <div>
            <p className="mk-eyebrow">AI-FRIENDLY / READ · BUILD · VERIFY</p>
            <h2 id="ai-title">
              {zh
                ? "AI 友好，落在每一层工程约定。"
                : "AI-friendly at every engineering layer."}
            </h2>
          </div>
          <a className="mk-text-link" href={homePath(locale, "skills")}>
            {zh ? "进入 Skills 站点" : "Explore Skills"}
            <Arrow size={16} />
          </a>
        </div>
        <div className="mk-workbench">
          <div className="mk-evidence">
            <h3>{zh ? "AI 友好的四层依据" : "Four layers of AI readiness"}</h3>
            <ol>
              {evidence.map(([title, description], index) => (
                <li key={title}>
                  <span className="mk-number">0{index + 1}</span>
                  <div>
                    <h4>{title}</h4>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mk-workflow-preview">
            <div className="mk-preview-toolbar">
              <span>agent-workflow.md</span>
              <CopyWorkflow locale={locale} />
            </div>
            <pre>
              <code>{workflowText[locale]}</code>
            </pre>
          </div>
        </div>
        <div className="mk-discovery-links">
          <p>
            {zh
              ? "Markdown 与 AI 发现资产，让 Agent 直接读取工程知识。"
              : "Markdown and discovery assets make engineering knowledge readable to agents."}
          </p>
          <a href="/llms.txt">
            llms.txt
            <Arrow size={14} />
          </a>
          <a href="/search-index.json">
            search-index.json
            <Arrow size={14} />
          </a>
          <a href={`${docPath(locale, "skills", "overview")}index.html.md`}>
            {zh ? "Markdown 指南" : "Markdown guides"}
            <Arrow size={14} />
          </a>
        </div>
      </section>

      <section className="mk-task-section" aria-labelledby="tasks-title">
        <h2 id="tasks-title">
          {zh ? "从一个任务开始。" : "Start with a task."}
        </h2>
        <div className="mk-task-grid">
          {tasks.map((task) => (
            <a
              href={docPath(locale, task.product, task.slug)}
              className="mk-task"
              key={task.product}
            >
              <h3>
                {task.title}
                <Arrow size={18} />
              </h3>
              <p>{task.description}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ProductHome({
  locale,
  product,
}: {
  locale: Locale;
  product: Product;
}) {
  const zh = locale === "zh";
  const copy = productCopy[product];
  const metadata = brands[product];
  const startSlug = product === "skills" ? "catalog" : "quick-start";
  return (
    <main
      className={`mk-page mk-product-home mk-product-${product}`}
      data-locale={locale}
    >
      <nav
        className="mk-local-nav"
        aria-label={
          zh ? `${metadata.name} 导航` : `${metadata.name} navigation`
        }
      >
        <a className="mk-local-brand" href={homePath(locale, product)}>
          {product === "skills" ? "Skills" : metadata.name}
        </a>
        <a href={homePath(locale, product)} aria-current="page">
          {zh ? "概览" : "Overview"}
        </a>
        <a href={docPath(locale, product, "overview")}>
          {zh ? "文档" : "Documentation"}
        </a>
        <ProductVersion product={product} locale={locale} />
      </nav>
      <section className="mk-product-hero" aria-labelledby="product-title">
        <Image
          className="mk-artwork"
          src="/generated-2.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
        />
        <div className="mk-product-statement">
          <p className="mk-eyebrow">{copy.eyebrow}</p>
          <h1 id="product-title">{copy.headline[locale]}</h1>
          <p className="mk-product-intro">{copy.introduction[locale]}</p>
          <a className="mk-button" href={docPath(locale, product, startSlug)}>
            {copy.start[locale]}
            <Arrow size={17} />
          </a>
        </div>
        <div className="mk-domain-bands">
          {copy.domains.map((domain) => (
            <div key={domain.label}>
              <p className="mk-eyebrow">{domain.label}</p>
              <p>{domain.description[locale]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mk-guide-index" aria-labelledby="guides-title">
        <div className="mk-guide-intro">
          <p className="mk-eyebrow">START HERE</p>
          <h2 id="guides-title">{copy.introTitle[locale]}</h2>
          <p className="mk-description">{copy.introDescription[locale]}</p>
        </div>
        <div className="mk-guide-rows">
          {copy.guides.map((guide, index) => (
            <a
              className="mk-guide-row"
              key={guide.slug}
              href={docPath(locale, product, guide.slug)}
            >
              <span className="mk-number">0{index + 1}</span>
              <div>
                <h3>{guide.title[locale]}</h3>
                <p>{guide.description[locale]}</p>
              </div>
              <Arrow size={19} />
            </a>
          ))}
        </div>
      </section>
      <section className="mk-product-workflow" aria-labelledby="workflow-title">
        <div className="mk-workflow-title">
          <p className="mk-eyebrow">WITH YOUR AGENT</p>
          <h2 id="workflow-title">
            {zh ? "把知识带入任务。" : "Bring knowledge into the task."}
          </h2>
        </div>
        <ol>
          {copy.workflow.map((step, index) => (
            <li key={step.en}>
              <span className="mk-number">0{index + 1}</span>
              <p>{step[locale]}</p>
            </li>
          ))}
        </ol>
      </section>
      <div className="mk-product-handoff">
        <p className="mk-eyebrow">ONE ECOSYSTEM / CONNECTED KNOWLEDGE</p>
        <a
          className="mk-text-link"
          href={docPath(locale, copy.handoff.product, copy.handoff.slug)}
        >
          {copy.handoff.label[locale]}
          <Arrow size={17} />
        </a>
      </div>
    </main>
  );
}
