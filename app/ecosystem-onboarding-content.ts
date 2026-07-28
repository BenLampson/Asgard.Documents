import type { DocPage } from "./content";

const onboardingChecklist = [
  "1. Add the repository to AGENTS.md and docs-sources.json; record commit, version, dirty state, and fingerprint.",
  "2. Add product metadata in app/product-registry.ts and product routing in scripts/documentation-product.mjs.",
  "3. Add /{locale}/{product}, /{locale}/{product}/docs/{slug}, and one release/status page.",
  "4. Add bilingual typed content, navigation, search, related documents, and Agent workflow Skills.",
  "5. Run npm run verify, then browser-test both locales and a narrow viewport.",
].join("\n");

export const zhEcosystemOnboardingDocs: DocPage[] = [{
  slug: "skills-ecosystem-onboarding",
  group: "维护",
  eyebrow: "FUTURE LIBRARIES",
  title: "新增生态库与独立文档站",
  description: "把未来的 Asgard 生态库接入同一套双语、AI Ready、可发布且可持续更新的文档合同。",
  sections: [
    {
      id: "definition-of-integrated",
      title: "什么才算完成接入",
      paragraphs: [
        "新仓库出现在门户卡片里还不算接入完成。它必须拥有独立产品首页、产品范围内的侧栏/搜索/版本状态、中英文等价路由、规范 URL 与 Markdown companion，并进入 sitemap、llms.txt 和静态发布门禁。",
        "第一版至少说明定位、依赖、安装、Quick Start、主要能力、配置、集成边界、运维、AI Ready 与版本状态。计划能力必须标记 Roadmap，不能混入已发布能力。",
      ],
    },
    {
      id: "source-registration",
      title: "先登记事实源",
      bullets: [
        "在 AGENTS.md 的 authoritative source repositories 表中加入本地仓库和公开仓库地址。",
        "在 docs-sources.json 记录独立版本、commit、dirty 状态、检查日期和生成的 dirty fingerprint。",
        "在 data/source-project-coverage.json 分类该仓库的每个 .csproj 和项目级 package.json，并把后端/前端项目关联到至少一篇规范指南；新增未分类项目会使门禁失败。",
        "先确定版本来源文件、运行时基线、发布 tag 与 HEAD 的边界；没有正式版本时只声明 commit/检查日期。",
        "为关键功能建立源码锚点合同；类型或 Options 的存在不能单独证明端到端能力。",
      ],
    },
    {
      id: "registry-contract",
      title: "两个注册表缺一不可",
      paragraphs: [
        "app/product-registry.ts 管理品牌、仓库、版本标签、首页和发布页；scripts/documentation-product.mjs 管理产品 ID 与 slug 到产品站点的归属。页头、落地页、运行时链接、静态导出和测试必须消费这些注册表，不能重新添加 startsWith 分支。",
        "新增 Product 类型、产品元数据和 slug 规则后，先证明两个 locale 的产品首页与发布页都存在，再添加正文。slug 在两种语言中保持一致。",
      ],
      code: { language: "text", value: onboardingChecklist },
    },
    {
      id: "content-minimum",
      title: "首发内容最低合同",
      bullets: [
        "Overview：定位、成熟度、依赖和运行时基线。",
        "Installation + Quick Start：从空项目到真实可验收结果。",
        "Capabilities / Concepts / Configuration：说明已接线能力和边界。",
        "Integration：协议、认证、claims、路由、CORS、失败行为与上下游责任。",
        "Operations：部署、健康、可观测、迁移、恢复和排障。",
        "AI Ready：对应 Skills、选择规则、硬约束、验证与复查工作流。",
        "Release notes：发布、Preview、弃用和迁移边界。",
      ],
    },
    {
      id: "ai-ready-contract",
      title: "AI Ready 不是营销标签",
      paragraphs: [
        "每个关键指南都应在 app/skill-references.ts 映射真实存在的 Skill；代理先加载路由 Skill，再加载专业 Skill，并最终回到源码和测试确认当前版本行为。",
        "如果新库还没有 Skill，应先记录缺口并限制 Agent workflow，不得借用名称相近但合同不同的 Skill。新增 Skill 后同时更新目录集合、兼容性报告、审计锁和中英文页面。",
      ],
    },
    {
      id: "discovery-and-legacy",
      title: "搜索、发现与兼容路由",
      bullets: [
        "规范主题必须由 documentation-routes 清单进入 search-index.json、sitemap.xml、llms.txt、llms-full.txt 与 index.html.md。",
        "语言切换指向同 slug；跨产品相关文档使用真实双向链接。",
        "需要旧链接兼容时保留可渲染 shim，但设置 indexable: false，并从 sitemap、搜索和 AI corpus 排除。",
        "新增产品不能只在 React 页面可见；静态 object-CDN 构建必须无需 Worker 运行时。",
      ],
    },
    {
      id: "release-gate",
      title: "发布与验收",
      paragraphs: [
        "npm run verify 是最低发布门禁。它必须覆盖源码新鲜度、双语 parity、构建、测试、链接、静态产物、搜索和 AI discovery。任何更窄的检查都不能代替它。",
        "有意义的路由或界面变更还要用真实浏览器打开门户、新产品首页、两种语言的文章和窄屏；上传后再以真实 HTTPS GET 核对状态、MIME 和站内 advertised links。",
      ],
    },
    {
      id: "future-update-loop",
      title: "后续每个版本怎么更新",
      bullets: [
        "读取版本文件、tag/commit 和工作树状态，生成来源指纹。",
        "按公开路由、配置、claims、包、默认值、安全行为和运行时接线分类变更。",
        "先更新事实与源码合同，再同步中英文正文、导航、搜索、Skills 和 release notes。",
        "不确定的行为标记未证明或 Preview；不要从 commit subject 自动生成发布声明。",
        "完整门禁通过后生成不可变静态制品、完整性清单与可回滚发布证据。",
      ],
    },
  ],
}];

export const enEcosystemOnboardingDocs: DocPage[] = [{
  slug: "skills-ecosystem-onboarding",
  group: "Maintenance",
  eyebrow: "FUTURE LIBRARIES",
  title: "Onboard an ecosystem library and product site",
  description: "Integrate future Asgard libraries into the same bilingual, AI Ready, publishable, continuously maintained documentation contract.",
  sections: [
    {
      id: "definition-of-integrated",
      title: "What integrated means",
      paragraphs: [
        "A portal card alone is not an integration. The repository needs its own product home, product-scoped navigation/search/version status, equivalent Chinese and English routes, canonical URLs and Markdown companions, plus sitemap, llms.txt, and static-release coverage.",
        "Its first release must cover purpose, dependencies, installation, Quick Start, capabilities, configuration, integrations, operations, AI Ready, and release status. Planned work stays explicitly labeled Roadmap.",
      ],
    },
    {
      id: "source-registration",
      title: "Register the source of truth first",
      bullets: [
        "Add the local and public repository locations to AGENTS.md's authoritative-source table.",
        "Record its independent version, commit, dirty state, inspected date, and generated dirty fingerprint in docs-sources.json.",
        "Classify every .csproj and project-level package.json in data/source-project-coverage.json, assign each backend/frontend project at least one canonical guide, and fail the gate on a newly unclassified project.",
        "Identify version files, runtime baseline, release tag, and HEAD boundary; use only commit/date when no formal version exists.",
        "Create source-anchor contracts for important capabilities; a type or Options declaration alone does not prove a runtime path.",
      ],
    },
    {
      id: "registry-contract",
      title: "Both registries are mandatory",
      paragraphs: [
        "app/product-registry.ts owns brand, repository, version label, home, and release paths. scripts/documentation-product.mjs owns product IDs and slug ownership. Headers, landing pages, runtime links, static export, and tests consume those registries without new startsWith branches.",
        "After adding the Product type, metadata, and slug rule, prove both localized product homes and release pages exist before adding the rest of the corpus. Keep each slug identical across locales.",
      ],
      code: { language: "text", value: onboardingChecklist },
    },
    {
      id: "content-minimum",
      title: "Minimum first-release content",
      bullets: [
        "Overview: purpose, maturity, dependencies, and runtime baseline.",
        "Installation + Quick Start: an empty project through a real accepted result.",
        "Capabilities / Concepts / Configuration: wired behavior and boundaries.",
        "Integration: protocols, auth, claims, routes, CORS, failures, and ownership.",
        "Operations: deployment, health, observability, migrations, recovery, and troubleshooting.",
        "AI Ready: Skills, routing rules, hard constraints, verification, and review workflow.",
        "Release notes: Release, Preview, deprecation, and migration boundaries.",
      ],
    },
    {
      id: "ai-ready-contract",
      title: "AI Ready is an executable contract",
      paragraphs: [
        "Map each important guide to existing Skills in app/skill-references.ts. Agents load a routing Skill, then specialist Skills, and finally verify release-specific behavior against source and tests.",
        "If the new library has no Skill, record the gap and constrain the Agent workflow instead of borrowing a similarly named but incompatible contract. When a Skill is added, update the catalog set, compatibility report, audit lock, and both locales together.",
      ],
    },
    {
      id: "discovery-and-legacy",
      title: "Discovery and compatibility routes",
      bullets: [
        "Canonical topics derive from documentation-routes into search-index.json, sitemap.xml, llms.txt, llms-full.txt, and index.html.md.",
        "Language switching targets the same slug; cross-product related documents use real reciprocal links.",
        "A legacy shim may remain renderable, but stays indexable: false and outside sitemap, search, and the AI corpus.",
        "A product is not integrated only because React can render it; the object-CDN export must work without the Worker runtime.",
      ],
    },
    {
      id: "release-gate",
      title: "Release and acceptance",
      paragraphs: [
        "npm run verify is the minimum release gate and covers source freshness, bilingual parity, build, tests, links, static output, search, and AI discovery. A narrower green command cannot replace it.",
        "Meaningful routing or shell changes also require real-browser checks of the portal, product home, both locales, and a narrow viewport. After upload, use real HTTPS GETs to verify status, MIME, and advertised links.",
      ],
    },
    {
      id: "future-update-loop",
      title: "Update loop for every release",
      bullets: [
        "Read version files, tag/commit, and worktree state; generate the source fingerprint.",
        "Classify public-route, configuration, claim, package, default, security, and runtime-wiring changes.",
        "Update facts and source contracts first, then both locales, navigation, search, Skills, and release notes.",
        "Label uncertainty as unproven or Preview; never promote commit subjects into release claims automatically.",
        "After the full gate, produce an immutable static artifact, integrity manifest, and rollback evidence.",
      ],
    },
  ],
}];
