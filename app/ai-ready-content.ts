import type { DocPage } from "./content";
import docsSources from "../docs-sources.json";

const compatibilityWarnings = docsSources.skillsContract.compatibilityWarnings;
const skillsAuditDelta = docsSources.skillsContract.auditDelta;
const zhCompatibilityBullets = [
  ...compatibilityWarnings.map((warning) => `[${warning.id}] ${warning.guidanceZh}`),
  "只要报告仍有 open 告警，当前快照就只是 audited-snapshot，不得宣传为 stable bundle。",
];
const enCompatibilityBullets = [
  ...compatibilityWarnings.map((warning) => `[${warning.id}] ${warning.guidanceEn}`),
  "While the report contains open warnings, this snapshot remains audited-snapshot and must not be advertised as a stable bundle.",
];

const cloneCode = [
  "git clone https://github.com/BenLampson/Asgard.Skills.git",
  "",
  "# Configure your agent or IDE to load:",
  "# <clone-directory>/Asgard.Skills/skills",
  "",
  "# Keep one checkout as the source of truth.",
  "git -C Asgard.Skills pull --ff-only",
].join("\n");

const codexInstallCode = [
  "python <CODEX_HOME>/skills/.system/skill-installer/scripts/install-skill-from-github.py \\",
  "  --repo BenLampson/Asgard.Skills \\",
  "  --ref 7b26856ae6a3266f9d33be44c8880ee8863888d3 \\",
  "  --path skills/asgard-framework-overview \\",
  "         skills/asgard-plugin-structure \\",
  "         skills/asgard-dotnet-10-csharp-14 \\",
  "         skills/asgard-api-development \\",
  "         skills/dotnet-unit-testing \\",
  "         skills/asgard-backend-guard",
].join("\n");

const upgradeCode = [
  "1. Install the candidate ref into a temporary --dest directory.",
  "2. Diff SKILL.md, references, templates, and agents metadata.",
  "3. Run routing, framework-version, path, and documentation contract checks.",
  "4. Preserve the installed ref as a lock and keep the previous directory for rollback.",
  "5. Replace the live skill directories only after review; verify them in the next agent turn.",
].join("\n");

const explicitWorkflowCode = [
  "1. Use $asgard-framework-overview to route this Asgard task.",
  "2. Use $asgard-plugin-structure and $asgard-api-development for the implementation.",
  "3. Apply $asgard-dotnet-10-csharp-14 while writing C#.",
  "4. Use $dotnet-unit-testing for tests.",
  "5. Finish with $asgard-backend-guard and report every remaining risk.",
].join("\n");

const collaborationLoopCode = [
  "Requirement",
  "  → framework overview routes the task",
  "  → specialist Skills supply current contracts and boundaries",
  "  → source confirms release-specific behavior",
  "  → build + focused tests prove the change",
  "  → backend guard reviews Asgard hard rules",
  "  → bilingual docs + release notes stay synchronized",
].join("\n");

const stagedUpgradeCode = [
  "$Origin = \"https://asgard.benlampson.cn\"",
  "$Stage = Join-Path $PWD \".asgard-skills-stage\"",
  "Invoke-WebRequest \"$Origin/asgard-skills.lock.json\" -OutFile \"asgard-skills.lock.json\"",
  "Invoke-WebRequest \"$Origin/verify-skills-installation.mjs\" -OutFile \"verify-skills-installation.mjs\"",
  "$Lock = Get-Content -Raw \"asgard-skills.lock.json\" | ConvertFrom-Json",
  "$Paths = @($Lock.skills | ForEach-Object { $_.path })",
  "python <CODEX_HOME>/skills/.system/skill-installer/scripts/install-skill-from-github.py `",
  "  --repo BenLampson/Asgard.Skills --ref $Lock.source.ref --dest $Stage --path $Paths",
  "node .\\verify-skills-installation.mjs --root $Stage --lock .\\asgard-skills.lock.json",
].join("\n");

const cutoverRollbackCode = [
  "Stop agent processes that may be reading the live Skills directory.",
  "Rename the live directory to a timestamped backup, then move staging into its place.",
  "Start a new agent turn and run the fixed routing/build/review acceptance task.",
  "Rollback: stop readers, move the failed directory aside, and restore the backup.",
].join("\n");

const changelogReviewCode = [
  "# Read-only against Asgard, Heimdall, and Asgard.Skills; writes only this docs repository.",
  "node scripts/update-changelog-review.mjs",
  "",
  "# Inspect the machine inbox before changing any release note or baseline.",
  "Get-Content -Raw data/changelog-review-report.json | ConvertFrom-Json",
].join("\n");

const changelogDecisionCode = [
  "1. Treat commit subjects as evidence pointers, never as shipped-feature claims.",
  "2. Inspect each requiresReview file and the real diff, runtime path, tests, package/version, and migration state.",
  "3. Keep dirty changes as Preview evidence with the exact fingerprint; do not advance the released commit.",
  "4. Update Chinese and English guides, source anchors, release notes, and compatibility warnings from verified behavior.",
  "5. Update docs-sources.json only after review, regenerate fingerprints and this inbox, then run the release gate.",
].join("\n");

const releaseDocumentationPlanCode = [
  "# Regenerate or verify the fail-closed plan from explicit reviewed decisions.",
  "node scripts/release-documentation-plan.mjs `",
  "  --changelog data/changelog-review-report.json `",
  "  --decisions data/release-documentation-decisions.json",
].join("\n");

const releaseHandoffCode = [
  "1. Inspect /release-readiness-report.json and every linked machine report.",
  "2. Run npm run verify yourself; the report deliberately says required-not-attested.",
  "3. Upload the contents of dist/static only after the operator gate is green.",
  "4. Configure directory indexes, cache/MIME metadata, and a reversible previous artifact.",
  "5. Run real HTTPS GET checks on the public origin; record results outside this generated report.",
].join("\n");

const postUploadCode = [
  "$Origin = \"https://asgard.benlampson.cn\"",
  "curl.exe -fsSI \"$Origin/zh\"",
  "curl.exe -fsSI \"$Origin/search-index.json\"",
  "curl.exe -fsSI \"$Origin/llms.txt\"",
  "curl.exe -fsSI \"$Origin/release-readiness-report.json\"",
  "curl.exe -fsS  \"$Origin/llms.txt\"",
].join("\n");

const artifactVerifyCode = [
  "# The verifier reads dist/static/artifact-manifest.json by default.",
  "node dist/static/verify-static-artifact.mjs --root dist/static",
  "",
  "# Preserve aggregateSha256 with the immutable deployment/release record.",
  "$Manifest = Get-Content -Raw dist/static/artifact-manifest.json | ConvertFrom-Json",
  "$Manifest.aggregateSha256",
].join("\n");

const artifactRollbackCode = [
  "# Both directories must retain their own artifact-manifest.json.",
  "node dist/static/plan-static-rollback.mjs `",
  "  --current-root .releases/current `",
  "  --target-root .releases/previous `",
  "  --output .release-evidence/rollback-plan.json",
  "",
  "# The output stays outside both immutable artifact directories.",
  "# Review both aggregate hashes and every add/remove/replace before cutover.",
].join("\n");

const aiDiscoveryCode = [
  "/llms.txt",
  "/search-index.json",
  "/skills-manifest.json",
  "/asgard-skills.lock.json",
  "/verify-skills-installation.mjs",
  "/agent-workflow-coverage.json",
  "/verify-agent-workflow-coverage.mjs",
  "/skills-compatibility-report.json",
  "/changelog-review-report.json",
  "/release-documentation-plan.json",
  "/verify-release-documentation-plan.mjs",
  "/release-readiness-report.json",
  "/artifact-manifest.json",
  "/verify-static-artifact.mjs",
  "/plan-static-rollback.mjs",
  "/{locale}/{product}/docs/{slug}/index.html.md",
  "/llms-full.txt",
].join("\n");

const workflowCoverageCode = [
  "node dist/static/verify-agent-workflow-coverage.mjs `",
  "  --search-index dist/static/search-index.json `",
  "  --skills-manifest dist/static/skills-manifest.json `",
  "  --mappings app/skill-references.ts",
].join("\n");

const hostSkills = [
  "asgard-framework-overview — route a cross-module or unclear Asgard task",
  "asgard-host-project — choose and compose the starter/host entry point",
  "asgard-host-features — static files, CORS, auth, Swagger, TsGen, rate limiting, health, and middleware order",
  "asgard-configuration — app.yaml, plugin.yaml, ConfigPath, precedence, placeholders, and typed configuration",
  "asgard-plugin-structure — scaffold the plugin project and separate it from its starter",
  "asgard-plugin-development — implement PluginBase and convention-driven plugin startup",
  "asgard-plugin-lifecycle — reason about registration, initialization, start, stop, reload, and state transitions",
];

const backendSkills = [
  "asgard-api-development — controllers, /api routes, response envelopes, paging, and DTO/VO boundaries",
  "asgard-base-types — BaseController, Response, PluginBase, contexts, user information, and configuration bases",
  "asgard-context-usage — AbsAsgardContext capabilities, lifetimes, null-safe access, Trace notes, and tags",
  "asgard-repository-service-registration — repository attributes, scanners, conventions, and explicit DI",
  "asgard-backend-guard — post-change review for layering, tenancy, audit fields, optimistic locking, and response rules",
];

const infrastructureSkills = [
  "asgard-database — database configuration, providers, repositories, and data-access structure",
  "asgard-cache — memory, Redis, multi-level behavior, keys, expiration, and degradation",
  "asgard-messaging — RabbitMQ publishing, handlers, tracing, retry, delay, and dead-letter boundaries",
  "asgard-job-scheduling — static and runtime jobs, cron/simple triggers, and scheduler operations",
  "asgard-security — encryption, password hashing, key generation, and sensitive-data handling",
  "asgard-tracing-observability — request Trace, database logs, query services, AI replay, notes, and tags",
];

const identitySkills = [
  "asgard-identity-userinfo — AbsAsgardUserInfo, claim mapping, identity snapshots, and test identities",
  "asgard-auth-authorization — AsgardAuth attributes and role, permission, scope, metadata, and token_type expressions",
  "identity-integration — SPA PKCE, IDP/OIDC, JWT Bearer, claims, UserInfo, gateways, and API cooperation",
  "heimdall-application-rbac — Application Manifest, Tenant binding, application-scoped grants, RBAC versions, and token boundaries",
  "heimdall-mcp-management — /mcp transport, OAuth or AK/SK credentials, tool governance, write confirmation, audit, and tenant boundaries",
  "heimdall-service-integration — tenant-bound BackendService clients, read-only directory APIs, identity invalidation Webhooks, revocation propagation, secret rotation, reconciliation, and delivery acceptance",
  "asgard-mini-jwt-issuer — issue Asgard-compatible JWTs without deploying the complete Heimdall platform",
];

const engineeringSkills = [
  "asgard-dotnet-10-csharp-14 — mandatory C# authority inside Asgard repositories",
  "dotnet-10-csharp-14 — generic .NET guidance outside Asgard repositories",
  "dotnet-unit-testing — xUnit v3 test projects, fixtures, assertions, mocks, and CI",
  "asgard-admin-frontend — Umi Max / Ant Design Pro management screens, TsGen clients, OIDC, and tenant workspaces",
];

export const zhAiReadyDocs: DocPage[] = [
  {
    slug: "ai-ready",
    group: "AI Ready",
    eyebrow: "HUMANS + AGENTS",
    title: "AI Ready 开发",
    description: "把框架知识、硬规则、源码证据和复查门禁交给 Agent，而不是只给它一份 README。",
    sections: [
      {
        id: "meaning",
        title: "AI Ready 是可执行契约，不是口号",
        paragraphs: [
          "Asgard Skills 把模块语义、使用时机、推荐入口、禁止事项和验证方式写成 Agent 可按任务加载的知识包。AGENTS.md 固化仓库级维护规则，Analyzers 在编译期守住机械约束，源码契约与测试则阻止文档和实现悄悄漂移。",
          "Skill 不替代源码。它负责把 Agent 路由到正确模块并说明稳定边界；涉及版本、公开 API 或安全语义时，仍以当前源码、包和测试结果为最终证据。",
        ],
      },
      {
        id: "layers",
        title: "四层 AI Ready 防线",
        bullets: [
          "Skills：让 Agent 在动手前获得与任务匹配的框架上下文",
          "AGENTS.md：规定双语、源码同步、目录边界、发布门禁和禁止事项",
          "Analyzers：在编译时执行 GlobalUsings、注释、文件大小和结果处理等规则",
          "构建、测试与源码契约：证明示例能运行，并在 Asgard、Heimdall 或 Skills 改变时主动失败",
        ],
      },
      {
        id: "connect",
        title: "把 Skills 接入你的 Agent",
        paragraphs: [
          "克隆独立的 Asgard.Skills 仓库，再把其中的 skills 目录加入所用 Agent 或 IDE 的技能来源。不同工具的技能目录配置方式不同；关键是保留一个可 git pull 的事实源，并确认 Agent 实际能列出技能名称。不要长期复制一份无法追踪版本的 SKILL.md 快照。",
        ],
        code: { language: "powershell", value: cloneCode },
        note: "仓库地址是公开来源。生产团队应固定审核过的 commit，并在升级 Asgard 时一起审核 Skills 变化。",
      },
      { id: "workflow-coverage", title: "每页 Agent workflow 的机器覆盖", paragraphs: ["agent-workflow-coverage.json 从 canonical search index、app/skill-references.ts 与审核过的 Skills manifest 交叉生成。它列出每个规范指南的中英文路径、映射 Skills、未映射清单、实际引用 Skill 集合和关键页强制规则。", "中英文同 slug 映射漂移、未知 Skill、孤立映射、重复 Skill、缺失双语页或关键页缺少必需 Skill 都 Fail Closed。报告明确不检查 csproj 或源码项目覆盖，避免把文档工作流覆盖伪装成代码库覆盖。"], code: { language: "powershell", value: workflowCoverageCode }, links: [{ label: "查看 Agent workflow 覆盖报告", href: "/agent-workflow-coverage.json" }, { label: "下载覆盖校验器", href: "/verify-agent-workflow-coverage.mjs" }] },
      {
        id: "select",
        title: "先路由，再组合",
        bullets: [
          "任务跨多个模块或入口不清楚：先用 asgard-framework-overview",
          "编写任何 Asgard C#：asgard-dotnet-10-csharp-14 是强制规则来源，不要用通用 dotnet skill 覆盖它",
          "一个任务可以组合多个专项 Skill，但只加载真正相关的最小集合",
          "代码生成或修改完成后，再用 asgard-backend-guard 做独立复查",
          "显式写出 $skill-name 可以消除自动路由歧义，也让评审者知道本次依据了哪些契约",
        ],
      },
      {
        id: "prompt",
        title: "可复制的 Agent 工作流",
        paragraphs: ["下面的任务约束会先确定架构入口，再实现、测试和复查。把功能目标与验收条件追加在它后面即可。"],
        code: { language: "text", value: explicitWorkflowCode },
      },
      {
        id: "loop",
        title: "推荐协作闭环",
        code: { language: "text", value: collaborationLoopCode },
      },
      {
        id: "discovery",
        title: "让 Agent 直接发现干净文档",
        paragraphs: [
          "CDN 产物从与网页相同的双语内容生成 llms.txt、结构化搜索索引、每篇文章的纯 Markdown 副本和完整上下文文件。Agent 可以先读取 llms.txt 选择最小相关主题，再获取对应 Markdown，避免抓取导航、样式和兼容路由。",
          "这些文件是发现入口，不会把文档提升为高于源码的事实源。页面标记的 Release/Preview 边界、版本和安全限制在 Markdown 中保持不变。",
        ],
        code: { language: "text", value: aiDiscoveryCode },
        links: [
          { label: "Skills 审核清单", href: "/skills-manifest.json" },
          { label: "Skills 安装锁", href: "/asgard-skills.lock.json" },
          { label: "Skills staging 校验器", href: "/verify-skills-installation.mjs" },
        ],
      },
      {
        id: "update",
        title: "版本与更新纪律",
        bullets: [
          "Asgard、Heimdall 与 Asgard.Skills 是三个独立事实源；分别记录 commit 和 dirty 状态",
          "公开行为改变时，同一批工作更新对应 Skill、双语文档、示例、来源锚点和版本说明",
          "Skill 新增、删除或改名必须更新技能目录；本站门禁会核对仓库目录集合与页面覆盖",
          "不要把 dirty-worktree 预览写成已发布能力；预览必须标注来源状态和运行边界",
        ],
      },
    ],
  },
  {
    slug: "skills-installation",
    group: "AI Ready",
    eyebrow: "PIN · INSTALL · VERIFY",
    title: "安装与更新 Asgard Skills",
    description: "区分维护者源码检出与消费者安装，固定审核版本，并用可回滚流程升级 Agent 知识。",
    sections: [
      {
        id: "choose",
        title: "先选择接入模式",
        bullets: [
          "维护者模式：克隆完整 Asgard.Skills 仓库，把 skills 目录配置为开发工具的来源，并通过 git 审查更新",
          "消费者模式：从 GitHub 的固定 ref 安装选定 Skill 到 Agent 的本地技能目录",
          "CI 模式：安装到临时目录做完整性与兼容性检查，不污染开发者真实技能目录",
          "不要把仓库放进某个项目就假设所有 Agent 会自动加载；必须确认所用工具的发现路径",
        ],
      },
      {
        id: "maintainer",
        title: "维护者检出",
        paragraphs: ["完整检出适合 Asgard 维护团队，因为 Skill、references、templates 与 agents metadata 可以在一次 Git diff 中共同审核。"],
        code: { language: "powershell", value: cloneCode },
      },
      {
        id: "codex",
        title: "Codex 消费者安装",
        paragraphs: ["Codex 的系统 skill-installer 可以从 GitHub repo/path 安装多个技能。它默认写入 $CODEX_HOME/skills/<skill-name>，公开仓库优先直接下载，必要时回退 sparse checkout。安装完成后在下一轮任务中确认技能可用。"],
        code: { language: "shell", value: codexInstallCode },
        note: "示例固定本站于 2026-07-28 审阅的 main 完整 commit SHA；它是可复现 snapshot，不是新的稳定 bundle。最新仓库 tag 仍是 v4.0.0，审核提交比该 tag 多 49 个提交，因此本站不把 main/HEAD 当作无条件推荐的全量稳定 bundle。",
      },
      {
        id: "existing",
        title: "已存在目录不会原地升级",
        paragraphs: ["skill-installer 在目标技能目录已经存在时会中止。多 path 安装也不是事务：它逐目录复制，后面的目标冲突时，前面的 Skill 可能已经安装。重复执行同一命令不是升级机制；先预检全部目标，在独立 staging --dest 完成整组验证，再有意识地切换并保留回滚副本。", "安装器只复制命令中显式列出的 --path，不解析 Skill 之间的传递依赖。目录页的 recipes 是任务组合建议，不是可自动安装的 dependency manifest；锁记录必须保存完整 SHA 与所选 paths。"],
        code: { language: "text", value: upgradeCode },
      },
      {
        id: "audit-delta",
        title: "2026-07-28 审核增量",
        bullets: [
          `${skillsAuditDelta.previousFullCommit.slice(0, 7)} → ${docsSources.skillsContract.fullCommit.slice(0, 7)}，共 4 个提交；审核目录从 ${skillsAuditDelta.previousSkillCount} 增至 ${skillsAuditDelta.currentSkillCount}`,
          `新增：${skillsAuditDelta.addedSkills.join("、")}；删除：无；改名：无`,
          `发生内容变化：${skillsAuditDelta.changedSkills.join("、")}，覆盖应用授权版本 claims、mini issuer claim 透传、Heimdall 服务身份集成与 MCP 路由`,
          "10 条兼容性告警仍为 open；没有告警获得可关闭的源码证据，也没有新增告警 ID。涉及 Asgard 版本语义的 5 条指导已重新对齐 5.1.3 审核基线",
        ],
        note: "新增 Skill 描述的是可路由的工程知识，不自动证明对应运行能力已发布；使用时仍须核对目标 Heimdall/Asgard 源码、版本和测试。",
      },
      {
        id: "machine-lock",
        title: "机器可读审核清单与安装锁",
        paragraphs: ["skills-manifest.json 固定当前审核快照的完整 commit、29 个 Skill 的安装路径与描述、递归文件 SHA-256、显式 Bundle 和兼容性告警 ID。asgard-skills.lock.json 从同一清单派生，固定 all-reviewed 集合，适合保存到消费者项目并用于 staging 校验与回滚。", "当前状态是 audited-snapshot，不是 stable。Bundle 只是审核过的显式集合，不解析或声称传递依赖；升级时先在隔离目录核对路径与散列，再切换实际安装，并保留上一份锁。"],
        links: [
          { label: "下载 skills-manifest.json", href: "/skills-manifest.json" },
          { label: "下载 asgard-skills.lock.json", href: "/asgard-skills.lock.json" },
        ],
      },
      {
        id: "staged-upgrade",
        title: "可验证的 staging、切换与回滚",
        paragraphs: ["把 lock 与校验器下载到消费者项目，按 lock 的完整 ref 和显式 paths 安装到一个全新的 staging 目录。校验器只接受目录集合恰好等于 lock：缺少 Skill、出现额外目录、路径不符、软链接或任何文件内容变化都会 Fail Closed。它只验证审核快照完整性，不解析依赖，也不证明某个 Skill 与未来框架版本兼容。", "校验通过后先停止正在读取 Skills 的 Agent，再把现有目录重命名为带时间戳的备份并切入 staging。新开一轮 Agent，执行固定的路由、编译和复查验收任务；失败时停止读取者并恢复备份。不要在活跃 Agent 正读取目录时逐文件覆盖。"],
        code: { language: "powershell", value: stagedUpgradeCode },
        links: [{ label: "下载跨平台 Node.js 校验器", href: "/verify-skills-installation.mjs" }],
        note: cutoverRollbackCode,
      },
      {
        id: "compatibility",
        title: "当前兼容性审计",
        bullets: zhCompatibilityBullets,
        links: [{ label: "查看机器可读兼容性报告", href: "/skills-compatibility-report.json" }],
      },
      {
        id: "verify",
        title: "安装后验收",
        bullets: [
          "下一轮任务能列出并显式加载已安装的 skill 名称",
          "asgard-dotnet-10-csharp-14 在 Asgard C# 任务中优先于通用 dotnet skill",
          "所有 SKILL.md frontmatter name 与目录名一致，description 非空",
          "Skill 引用的 references、templates 和 examples 路径存在",
          "记录完整安装 SHA 与显式 paths；升级失败时能删除部分 staging 结果、恢复上一组目录并再次执行相同路由任务",
        ],
      },
    ],
  },
  {
    slug: "skills-catalog",
    group: "AI Ready",
    eyebrow: "29 LOADABLE SKILLS",
    title: "Asgard Skills 目录",
    description: "按任务选择并组合 29 个当前技能，让 Agent 使用正确的框架入口、实现规则和复查流程。",
    sections: [
      { id: "anatomy", title: "一个 Skill 包含什么", bullets: ["SKILL.md：触发条件、权威规则、流程和禁止事项", "agents/openai.yaml：Agent 展示与调用元数据", "references：由 Skill 路由的架构说明或源码参考", "templates / examples：需要时复用的工程模板与落地示例"], note: "不是每个 Skill 都需要全部目录；SKILL.md 是必需入口。" },
      { id: "host", title: "架构、宿主与插件", bullets: hostSkills },
      { id: "backend", title: "API、上下文与后端边界", bullets: backendSkills },
      { id: "infrastructure", title: "基础设施与可观测性", bullets: infrastructureSkills },
      { id: "identity", title: "身份、授权与令牌", bullets: identitySkills },
      { id: "engineering", title: "工程规则、测试与前端", bullets: engineeringSkills },
      {
        id: "recipes",
        title: "常见组合",
        bullets: [
          "新插件 API：framework-overview + plugin-structure + api-development + dotnet rules + backend-guard",
          "多租户 CRUD：api-development + database + repository registration + identity-userinfo + backend-guard",
          "SPA 登录与资源 API：identity-integration + auth-authorization + identity-userinfo + host-features",
          "Heimdall 应用域 RBAC：heimdall-application-rbac + identity-userinfo + auth-authorization；覆盖 Manifest、Tenant 绑定、应用管理员 Grant、授权版本和单应用 Token 边界",
          "Heimdall MCP 管理：heimdall-mcp-management + identity-integration + auth-authorization + backend-guard；覆盖 /mcp、OAuth/AK-SK、动态工具发现、二阶段写确认、审计和租户隔离",
          "Heimdall 微服务身份闭环：heimdall-service-integration + identity-integration + auth-authorization；覆盖租户绑定 BackendService Token、只读目录、身份失效 Webhook、撤销水位、Secret 轮换与真实端到端验收",
          "小型项目自签 JWT：mini-jwt-issuer + host-features + auth-authorization",
          "Heimdall 管理页面：admin-frontend + identity-integration + api-development",
          "生产故障复盘：tracing-observability + context-usage，再按故障模块追加 database/cache/messaging/jobs",
        ],
      },
      {
        id: "boundaries",
        title: "避免错误路由",
        bullets: [
          "asgard-dotnet-10-csharp-14 管 Asgard 仓库；dotnet-10-csharp-14 只作为非 Asgard 项目的通用参考",
          "host-features 管宿主 JWT 接线；identity-integration 管浏览器 PKCE、IDP 和跨系统 Token 流",
          "heimdall-service-integration 管后端微服务与 Heimdall 的身份交付闭环；它不承接下游业务 Profile、路由、队列、工单或订阅模型",
          "plugin-development 管插件实现；plugin-lifecycle 管阶段、顺序、失败和停止边界",
          "database 管数据库使用；repository-service-registration 管扫描与 DI 注册",
          "backend-guard 是修改后的复查步骤，不替代实现阶段的专项 Skill",
        ],
      },
    ],
  },
  {
    slug: "skills-changelog-review",
    group: "AI Ready",
    eyebrow: "READ · CLASSIFY · VERIFY",
    title: "持续更新与 Changelog 审阅收件箱",
    description: "从已记录 commit 到当前源码枚举变更证据，先分类需要复查的公开表面，再由实现与测试决定文档事实。",
    sections: [
      { id: "contract", title: "它是审阅收件箱，不是自动 Changelog", paragraphs: ["只读采集器比较 docs-sources.json 中 Asgard、Heimdall、Skills 的 recorded commit 与各仓库当前 HEAD，列出 commit SHA、时间、subject、全部 changed files，并对可能影响包/runtime、API/协议、配置、公开合同、迁移运维、文档和 Agent 合同的文件标记 requiresReview。commit subject 始终是 evidenceOnly，不能单独证明功能已发布。", "当前发布报告是基线时刻的机器快照。它不修改三个源仓库，不生成迁移指南，也不会自动改版本说明；维护者审核后的文档 Git diff 才保留最终结论。"], links: [{ label: "查看 Changelog 审阅报告", href: "/changelog-review-report.json" }] },
      { id: "run", title: "生成收件箱", paragraphs: ["命令读取三个源仓库，只在文档仓库更新 data/changelog-review-report.json。可用 ASGARD_SOURCE_ROOT、HEIMDALL_SOURCE_ROOT 与 ASGARD_SKILLS_ROOT 覆盖本机路径。history-diverged 会直接要求人工处理，绝不猜测比较范围。"], code: { language: "powershell", value: changelogReviewCode } },
      { id: "classification", title: "公开表面分类只是复查触发器", bullets: ["package-runtime：项目、props/targets、runtime 基线与包边界", "api-protocol：Controller、Endpoint、Middleware、OIDC/JWKS/UserInfo/Token 等", "configuration：Config、Options、settings、app.yaml 与 plugin.yaml", "public-contract：Abstractions、DTO/VO、Claims、Permissions、Attributes", "operations-migration：Migration、schema、Docker、deploy、Nginx、Kestrel、proxy", "documentation / agent-contract：仓库文档和 Skills 内容"], note: "启发式未命中的文件仍保留在 changedFiles；requiresReview=false 不等于无需读 diff，只表示没有命中当前公开表面规则。" },
      { id: "dirty", title: "Dirty 工作树必须带精确指纹", paragraphs: ["报告复用 source-fingerprint.mjs：指纹覆盖 NUL 分隔的 Git status、相对 HEAD 的 binary diff，以及排序后的所有 untracked 文件路径和字节。任何 dirty 源都 requiresReview；fingerprint 只能标识该工作树证据，不能把它提升为 released commit。"] },
      { id: "decision", title: "从证据到双语发布事实", code: { language: "text", value: changelogDecisionCode } },
      { id: "release-plan", title: "每版本机器可读文档变更计划", paragraphs: ["release-documentation-decisions.json 必须为每个 requiresReview commit、dirty fingerprint 或 history-diverged 证据给出且只给出一个人工审阅决定。document 决定必须包含版本、自然表达且技术含义一致的中英文摘要、规范 product:slug，以及经过源码/运行验证的事实；no-documentation-change 也必须保留理由与验证事实。", "生成器绑定 Changelog 与 decisions 的规范 SHA-256。缺失、重复、过期决定、基线不一致、无双语事实或直接复制 commit subject 都 Fail Closed；输出不会携带 subject，也不自动修改版本说明。当前计划与校验器随静态制品发布并受 artifact manifest 覆盖。"], code: { language: "powershell", value: releaseDocumentationPlanCode }, links: [{ label: "查看发布版本文档变更计划", href: "/release-documentation-plan.json" }, { label: "下载 Fail Closed 计划校验器", href: "/verify-release-documentation-plan.mjs" }] },
      { id: "acceptance", title: "更新验收", bullets: ["逐个 requiresReview 文件检查真实公开入口、默认值、路由、Claim、安全和失败行为", "涉及 package/runtime/迁移时核对正式版本、制品与可执行迁移证据", "同步中英文、导航、搜索、Markdown、来源锚点和 Release/Preview 边界", "更新 recorded commit 后重新生成收件箱应回到 up-to-date；若仍 dirty，保留 fingerprint 与 Preview 标签", "npm run verify 仍是发布门禁；本报告只是让漏审更早失败"] },
    ],
  },
  {
    slug: "skills-release-handoff",
    group: "AI Ready",
    eyebrow: "EVIDENCE · GATES · HTTPS",
    title: "发布就绪报告与 CDN 交接",
    description: "把构建时证据、必须由维护者执行的门禁和上传后的真实网络检查分开，避免用本地绿色结果冒充线上可用。",
    sections: [
      { id: "report", title: "机器报告只声明它能证明的事实", paragraphs: ["release-readiness-report.json 在最终静态导出现场由 route manifest、typed content、docs-sources、Changelog 收件箱、Skills 审核快照与兼容性报告共同生成。它汇总 recorded source baselines、双语主题/规范路由/Markdown 数量和关键制品/MIME 清单。", "报告不写 generatedAt、lastmod、upload time 或 production check time。evidenceDate 只是已审核文档基线日期，不是构建或上线时间。"], links: [{ label: "查看发布就绪报告", href: "/release-readiness-report.json" }] },
      { id: "build-evidence", title: "Build-time evidence 的边界", bullets: ["路由和文档数量来自本次最终 route manifest 与 search/Markdown 数据", "源码基线来自 docs-sources recorded commits/versions/dirty fingerprints，不假称重新发布", "Changelog summary 只说明 recorded-to-current 收件箱状态，commit subject 仍是 evidenceOnly", "Skills 保持 audited-snapshot；有 open compatibility warnings 时 stableEligible=false", "artifactInventory 声明静态导出合同应包含的关键路径和 MIME，不证明 CDN 已正确提供它们"] },
      { id: "operator-gates", title: "维护者必须显式完成的门禁", paragraphs: ["生成报告不会运行或伪造 npm run verify 的成功状态。full-release-gate 固定为 required-not-attested；artifact-upload 是 not-performed；CDN cache、directory index 与 rollback 是 not-attested。"], code: { language: "text", value: releaseHandoffCode } },
      { id: "post-upload", title: "上传后必须做真实 HTTPS GET", paragraphs: ["在真实公开域名逐项检查状态码、Content-Type、页面语言/链接以及 llms.txt 广告的资源。HEAD 可辅助诊断，但发布验收使用真实 GET；local static check 永远不能证明 public hostname live。"], code: { language: "powershell", value: postUploadCode }, note: "postUploadChecks 在生成报告中始终是 not-performed。不要手改生成文件冒充验收；把真实上线证据记录在部署系统或人工发布记录中。" },
      { id: "artifact-integrity", title: "逐文件散列、上传前验真与回滚身份", paragraphs: ["artifact-manifest.json 在其它静态文件全部落盘后生成，只排除自身以避免自哈希循环。它按 POSIX 相对路径排序，为 HTML、Markdown、assets、AI JSON、_headers 和校验器记录 bytes、MIME 与文件 SHA-256，再对 path + NUL + decimal bytes + NUL + sha256 + LF 计算总 SHA-256。", "校验器递归重算精确集合；缺失、额外、修改、MIME 推断差异或任何 symlink/special entry 都 Fail Closed。Manifest 自身不受自己的 aggregate 认证，因此应通过源码审阅/可信下载取得，并把 aggregateSha256 与不可变部署记录绑定。回滚时选择已记录 aggregate 的上一制品目录，重新校验后再切换。"], code: { language: "powershell", value: artifactVerifyCode }, links: [{ label: "查看逐文件制品清单", href: "/artifact-manifest.json" }, { label: "下载静态制品校验器", href: "/verify-static-artifact.mjs" }] },
      { id: "rollback-plan", title: "双制品回滚计划与人工切换门禁", paragraphs: ["plan-static-rollback.mjs 会先对当前目录和目标旧版本目录分别执行完整 Fail Closed 校验，拒绝同一路径、被篡改的目录和相同 aggregate。随后按稳定路径顺序输出 addFromTarget、removeFromCurrent、replaceWithTarget 与 unchanged，绑定切换前后的 aggregateSha256。", "计划文件明确保留 trusted manifest、目标环境 smoke、流量切换和公网 HTTPS 验收为未证明门禁。工具只读制品，不复制、删除、上传、部署或切换流量；--output 也必须位于两个不可变制品目录之外。操作员审阅差异、验证目标环境并保留当前版本后，才可使用平台自己的原子指针或目录切换机制。"], code: { language: "powershell", value: artifactRollbackCode }, links: [{ label: "下载只读静态回滚计划器", href: "/plan-static-rollback.mjs" }] },
      { id: "decision", title: "交接判定", bullets: ["handoffStatus=operator-gates-required 表示制品已形成交接清单，不表示 production ready", "先处理 Changelog requiresReview、dirty source 与 Skills open warnings，再决定 Release/Preview 文案", "只有维护者亲自取得完整门禁、上传、HTTPS/MIME 与回滚证据后才能切换流量", "生产检查失败时回滚上一份不可变制品，不修改报告来隐藏失败"] },
    ],
  },
];

export const enAiReadyDocs: DocPage[] = [
  {
    slug: "ai-ready",
    group: "AI Ready",
    eyebrow: "HUMANS + AGENTS",
    title: "AI-ready development",
    description: "Give agents framework knowledge, hard rules, source evidence, and review gates—not merely a README.",
    sections: [
      {
        id: "meaning",
        title: "AI Ready is an executable contract",
        paragraphs: [
          "Asgard Skills packages module semantics, timing, recommended entry points, prohibited patterns, and verification steps as task-selectable agent knowledge. AGENTS.md fixes repository-wide maintenance rules, Analyzers enforce mechanical constraints at compile time, and source contracts plus tests stop implementation and documentation from drifting silently.",
          "A Skill does not replace source. It routes the agent to the right module and explains stable boundaries; current source, packages, and tests remain the final evidence for versioned APIs and security behavior.",
        ],
      },
      {
        id: "layers",
        title: "Four AI Ready guardrails",
        bullets: [
          "Skills give an agent task-specific framework context before it edits code",
          "AGENTS.md defines locale parity, source synchronization, repository boundaries, release gates, and prohibited actions",
          "Analyzers enforce GlobalUsings, comments, file size, ignored results, and other mechanical rules during compilation",
          "Builds, tests, and source contracts prove examples and deliberately fail when Asgard, Heimdall, or Skills changes",
        ],
      },
      {
        id: "connect",
        title: "Connect Skills to your agent",
        paragraphs: [
          "Clone the independent Asgard.Skills repository and configure your agent or IDE to load its skills directory. Configuration differs by tool; preserve one git-pullable source of truth and confirm that the agent can actually list the skill names. Avoid maintaining an unversioned copy of selected SKILL.md files.",
        ],
        code: { language: "powershell", value: cloneCode },
        note: "The repository is the public source. Production teams should pin a reviewed commit and review Skills together with each Asgard upgrade.",
      },
      { id: "workflow-coverage", title: "Machine coverage for every guide's Agent workflow", paragraphs: ["agent-workflow-coverage.json is cross-generated from the canonical search index, app/skill-references.ts, and the audited Skills manifest. It inventories each canonical guide's bilingual paths and mapped Skills, unmapped guides, the actually referenced Skill set, and mandatory rules for critical guides.", "Locale drift for the same slug, unknown Skills, orphan mappings, repeated Skills, a missing bilingual guide, or a critical guide missing a required Skill all fail closed. The report explicitly excludes csproj and source-project coverage so documentation workflow coverage cannot impersonate repository coverage."], code: { language: "powershell", value: workflowCoverageCode }, links: [{ label: "Open the Agent workflow coverage report", href: "/agent-workflow-coverage.json" }, { label: "Download the coverage verifier", href: "/verify-agent-workflow-coverage.mjs" }] },
      {
        id: "select",
        title: "Route first, then compose",
        bullets: [
          "Start with asgard-framework-overview when a task spans modules or the correct entry point is unclear",
          "asgard-dotnet-10-csharp-14 is mandatory for Asgard C# and takes precedence over the generic dotnet skill",
          "A task may compose specialist Skills, but load only the smallest relevant set",
          "Run asgard-backend-guard as a separate review after generation or modification",
          "Naming $skill-name explicitly removes routing ambiguity and records the contracts used for reviewers",
        ],
      },
      {
        id: "prompt",
        title: "Copyable agent workflow",
        paragraphs: ["This instruction routes the architecture before implementation, testing, and review. Append the feature goal and acceptance criteria."],
        code: { language: "text", value: explicitWorkflowCode },
      },
      { id: "loop", title: "Recommended collaboration loop", code: { language: "text", value: collaborationLoopCode } },
      {
        id: "discovery",
        title: "Give agents clean documentation discovery",
        paragraphs: [
          "The CDN artifact generates llms.txt, a structured search index, one plain-Markdown companion per guide, and a complete context file from the same bilingual content as the web pages. An agent can read llms.txt, choose the smallest relevant topics, and fetch their Markdown without scraping navigation, styling, or compatibility routes.",
          "These files are discovery surfaces, not a source above implementation. Release/Preview labels, versions, and security boundaries remain intact in the generated Markdown.",
        ],
        code: { language: "text", value: aiDiscoveryCode },
        links: [
          { label: "Audited Skills manifest", href: "/skills-manifest.json" },
          { label: "Skills installation lock", href: "/asgard-skills.lock.json" },
          { label: "Skills staging verifier", href: "/verify-skills-installation.mjs" },
        ],
      },
      {
        id: "update",
        title: "Version and update discipline",
        bullets: [
          "Asgard, Heimdall, and Asgard.Skills are independent sources of truth; record each commit and dirty state separately",
          "A public behavior change updates its Skill, bilingual guide, example, source anchors, and release notes in the same work",
          "Adding, deleting, or renaming a Skill updates the catalog; this site's gate compares repository directories with page coverage",
          "Never present dirty-worktree previews as released capabilities; label their source state and runtime boundaries",
        ],
      },
    ],
  },
  {
    slug: "skills-installation",
    group: "AI Ready",
    eyebrow: "PIN · INSTALL · VERIFY",
    title: "Install and update Asgard Skills",
    description: "Separate maintainer checkouts from consumer installs, pin reviewed revisions, and upgrade agent knowledge with rollback.",
    sections: [
      {
        id: "choose",
        title: "Choose an integration mode",
        bullets: [
          "Maintainer mode: clone the complete Asgard.Skills repository, configure skills as a development-tool source, and review updates through Git",
          "Consumer mode: install selected Skills from a fixed GitHub ref into the agent's local skill directory",
          "CI mode: install into a temporary destination for completeness and compatibility checks without touching a developer's real skills",
          "Do not assume that placing the repository under a project makes every agent load it; verify the tool's discovery root",
        ],
      },
      { id: "maintainer", title: "Maintainer checkout", paragraphs: ["A complete checkout suits the Asgard maintainers because Skill files, references, templates, and agent metadata can be reviewed in one Git diff."], code: { language: "powershell", value: cloneCode } },
      {
        id: "codex",
        title: "Install for a Codex consumer",
        paragraphs: ["Codex's system skill-installer can install multiple GitHub repo paths. It writes to $CODEX_HOME/skills/<skill-name> by default, prefers a direct download for public repositories, and falls back to sparse checkout. Confirm availability in the next task turn."],
        code: { language: "shell", value: codexInstallCode },
        note: "The example pins the full main commit SHA reviewed by this site on 2026-07-28. It is a reproducible snapshot, not a new stable bundle. The latest repository tag remains v4.0.0 and the reviewed commit is 49 commits ahead of it, so this site does not recommend main/HEAD as an unconditional stable bundle.",
      },
      { id: "existing", title: "Existing directories are not upgraded in place", paragraphs: ["skill-installer aborts when a destination skill directory already exists. A multi-path install is not transactional either: it copies one directory at a time, so earlier Skills may already be installed when a later destination conflicts. Preflight every target, validate the complete set under an isolated staging --dest, then switch deliberately and retain a rollback copy.", "The installer copies only explicitly listed --path values and resolves no transitive Skill dependencies. Catalog recipes are task-composition guidance, not an installable dependency manifest. A lock must record the full SHA and selected paths."], code: { language: "text", value: upgradeCode } },
      {
        id: "audit-delta",
        title: "2026-07-28 audit delta",
        bullets: [
          `${skillsAuditDelta.previousFullCommit.slice(0, 7)} → ${docsSources.skillsContract.fullCommit.slice(0, 7)} across four commits; the reviewed directory set grows from ${skillsAuditDelta.previousSkillCount} to ${skillsAuditDelta.currentSkillCount}`,
          `Added: ${skillsAuditDelta.addedSkills.join(", ")}; removed: none; renamed: none`,
          `Content changed in ${skillsAuditDelta.changedSkills.join(", ")}, covering application authorization-version claims, mini-issuer claim propagation, Heimdall service identity integration, and MCP routing`,
          "All ten compatibility warnings remain open: no warning has source evidence for closure and no warning ID was added. Guidance for five Asgard-version-sensitive warnings is retargeted to the reviewed 5.1.3 baseline",
        ],
        note: "A new Skill is routable engineering knowledge, not automatic proof that the described runtime capability shipped. Verify the target Heimdall/Asgard source, version, and tests before use.",
      },
      {
        id: "machine-lock",
        title: "Machine-readable audited manifest and installation lock",
        paragraphs: ["skills-manifest.json pins the reviewed snapshot's full commit, all 29 Skill install paths and descriptions, recursive file SHA-256 values, explicit bundles, and compatibility-warning IDs. asgard-skills.lock.json is derived from that same manifest and fixes the all-reviewed set for consumer repositories, staging verification, and rollback.", "Its status is audited-snapshot, not stable. A bundle is an explicitly reviewed set; it neither resolves nor claims transitive dependencies. Validate paths and hashes in an isolated destination before switching the live installation, and retain the previous lock."],
        links: [
          { label: "Download skills-manifest.json", href: "/skills-manifest.json" },
          { label: "Download asgard-skills.lock.json", href: "/asgard-skills.lock.json" },
        ],
      },
      {
        id: "staged-upgrade",
        title: "Verifiable staging, cutover, and rollback",
        paragraphs: ["Download the lock and verifier into the consumer repository, then install the lock's full ref and explicit paths into a new staging directory. The verifier accepts only a directory set exactly equal to the lock: a missing Skill, an extra directory, a path mismatch, a symbolic link, or any changed file fails closed. It verifies audited-snapshot integrity; it neither resolves dependencies nor proves compatibility with a future framework version.", "After verification, stop agents that may be reading Skills, rename the current directory to a timestamped backup, and move staging into place. Start a new agent turn and run a fixed routing, build, and review acceptance task. On failure, stop readers and restore the backup. Never overwrite files one by one while an active agent may be reading them."],
        code: { language: "powershell", value: stagedUpgradeCode },
        links: [{ label: "Download the cross-platform Node.js verifier", href: "/verify-skills-installation.mjs" }],
        note: cutoverRollbackCode,
      },
      {
        id: "compatibility",
        title: "Current compatibility audit",
        bullets: enCompatibilityBullets,
        links: [{ label: "Open the machine-readable compatibility report", href: "/skills-compatibility-report.json" }],
      },
      {
        id: "verify",
        title: "Post-install verification",
        bullets: [
          "The next task turn can list and explicitly load each installed skill name",
          "asgard-dotnet-10-csharp-14 takes precedence over the generic dotnet Skill in Asgard C# work",
          "Every SKILL.md frontmatter name matches its directory and has a non-empty description",
          "Every referenced references, templates, and examples path exists",
          "The full installed SHA and explicit paths are recorded; a failed upgrade can remove partial staging results, restore the previous directory set, and rerun the same routing task",
        ],
      },
    ],
  },
  {
    slug: "skills-catalog",
    group: "AI Ready",
    eyebrow: "29 LOADABLE SKILLS",
    title: "Asgard Skills catalog",
    description: "Select and compose the 29 current Skills so agents use the correct framework entry points, implementation rules, and review flow.",
    sections: [
      { id: "anatomy", title: "What a Skill contains", bullets: ["SKILL.md: triggers, authoritative rules, workflow, and prohibited patterns", "agents/openai.yaml: agent presentation and invocation metadata", "references: architecture or source references routed by the Skill", "templates / examples: reusable engineering templates and implementation examples where needed"], note: "Not every Skill needs every folder; SKILL.md is the required entry point." },
      { id: "host", title: "Architecture, hosts, and plugins", bullets: hostSkills },
      { id: "backend", title: "APIs, context, and backend boundaries", bullets: backendSkills },
      { id: "infrastructure", title: "Infrastructure and observability", bullets: infrastructureSkills },
      { id: "identity", title: "Identity, authorization, and tokens", bullets: identitySkills },
      { id: "engineering", title: "Engineering rules, tests, and frontend", bullets: engineeringSkills },
      {
        id: "recipes",
        title: "Common compositions",
        bullets: [
          "New plugin API: framework-overview + plugin-structure + api-development + dotnet rules + backend-guard",
          "Tenant CRUD: api-development + database + repository registration + identity-userinfo + backend-guard",
          "SPA login and resource API: identity-integration + auth-authorization + identity-userinfo + host-features",
          "Heimdall application RBAC: heimdall-application-rbac + identity-userinfo + auth-authorization for Manifests, Tenant bindings, application-admin grants, authorization versions, and one-application token boundaries",
          "Heimdall MCP management: heimdall-mcp-management + identity-integration + auth-authorization + backend-guard for /mcp, OAuth or AK/SK, dynamic discovery, two-phase write confirmation, audit, and tenant isolation",
          "Heimdall service identity loop: heimdall-service-integration + identity-integration + auth-authorization for tenant-bound BackendService tokens, read-only directory access, invalidation Webhooks, revocation watermarks, secret rotation, and real end-to-end acceptance",
          "Small-project JWT issuing: mini-jwt-issuer + host-features + auth-authorization",
          "Heimdall management screen: admin-frontend + identity-integration + api-development",
          "Production incident replay: tracing-observability + context-usage, then the affected database/cache/messaging/jobs Skill",
        ],
      },
      {
        id: "boundaries",
        title: "Avoid incorrect routing",
        bullets: [
          "asgard-dotnet-10-csharp-14 governs Asgard repositories; dotnet-10-csharp-14 is a generic reference for non-Asgard projects",
          "host-features covers host JWT wiring; identity-integration covers browser PKCE, the IDP, and cross-system token flow",
          "heimdall-service-integration covers the service-to-Heimdall identity delivery loop; downstream business profiles, routing, queues, tickets, and subscriptions remain outside its boundary",
          "plugin-development covers implementation; plugin-lifecycle covers stages, ordering, failure, and shutdown boundaries",
          "database covers database use; repository-service-registration covers scanning and DI registration",
          "backend-guard is a post-change review and does not replace implementation-time specialist Skills",
        ],
      },
    ],
  },
  {
    slug: "skills-changelog-review",
    group: "AI Ready",
    eyebrow: "READ · CLASSIFY · VERIFY",
    title: "Continuous updates and the changelog review inbox",
    description: "Enumerate evidence from recorded commits to current source, classify public surfaces for review, and let implementation plus tests determine documentation facts.",
    sections: [
      { id: "contract", title: "A review inbox, not an automatic changelog", paragraphs: ["The read-only collector compares the recorded Asgard, Heimdall, and Skills commits in docs-sources.json with each current HEAD. It lists commit SHA, time, subject, every changed file, and marks files that may affect packages/runtime, APIs/protocols, configuration, public contracts, operations/migrations, documentation, or agent contracts as requiresReview. Every commit subject remains evidenceOnly and cannot prove shipment by itself.", "The published report is a machine snapshot of the review baseline. It does not modify the three source repositories, manufacture migration guides, or rewrite release notes; the reviewed documentation Git diff preserves the eventual conclusion."], links: [{ label: "Open the changelog review report", href: "/changelog-review-report.json" }] },
      { id: "run", title: "Generate the inbox", paragraphs: ["The command reads all three source repositories and updates only data/changelog-review-report.json in this documentation repository. Override local locations with ASGARD_SOURCE_ROOT, HEIMDALL_SOURCE_ROOT, and ASGARD_SKILLS_ROOT. A history-diverged result requires human resolution and never guesses a comparison range."], code: { language: "powershell", value: changelogReviewCode } },
      { id: "classification", title: "Public-surface classification is a review trigger", bullets: ["package-runtime: projects, props/targets, runtime baselines, and package boundaries", "api-protocol: controllers, endpoints, middleware, OIDC/JWKS/UserInfo/Token surfaces", "configuration: Config, Options, settings, app.yaml, and plugin.yaml", "public-contract: Abstractions, DTO/VO, Claims, Permissions, and Attributes", "operations-migration: migrations, schemas, Docker, deploy, Nginx, Kestrel, and proxies", "documentation / agent-contract: repository documentation and Skills content"], note: "Unmatched files remain in changedFiles. requiresReview=false never means the diff is safe to ignore; it means only that no current public-surface rule matched." },
      { id: "dirty", title: "A dirty worktree carries an exact fingerprint", paragraphs: ["The report reuses source-fingerprint.mjs. Its digest covers NUL-delimited Git status, the binary diff from HEAD, plus every sorted untracked path and its bytes. Every dirty source requires review. A fingerprint identifies that worktree evidence and never promotes it to a released commit."] },
      { id: "decision", title: "Turn evidence into bilingual release facts", code: { language: "text", value: changelogDecisionCode } },
      { id: "release-plan", title: "Machine-readable documentation plan for every release", paragraphs: ["release-documentation-decisions.json must contain exactly one human-reviewed decision for every requiresReview commit, dirty fingerprint, or history-diverged item. A document decision requires a version, naturally written Chinese and English summaries with the same technical meaning, canonical product:slug targets, and source/runtime-verified facts. A no-documentation-change decision still retains its rationale and verified facts.", "The generator binds canonical SHA-256 values for both the changelog inbox and decisions. Missing, duplicate, stale, baseline-mismatched, non-bilingual, or commit-subject-copying decisions fail closed. Its output omits subjects and never edits release notes automatically. The current plan and verifier ship with the static artifact and are covered by its manifest."], code: { language: "powershell", value: releaseDocumentationPlanCode }, links: [{ label: "Open the per-release documentation plan", href: "/release-documentation-plan.json" }, { label: "Download the fail-closed plan verifier", href: "/verify-release-documentation-plan.mjs" }] },
      { id: "acceptance", title: "Update acceptance", bullets: ["Inspect the real public entry point, default, route, claim, security behavior, and failure path for every requiresReview file", "For package/runtime/migration changes, verify the formal version, artifact, and executable migration evidence", "Synchronize Chinese and English content, navigation, search, Markdown, source anchors, and Release/Preview boundaries", "After advancing a reviewed recorded commit, regenerate the inbox and expect up-to-date; retain the fingerprint and Preview label for any remaining dirty source", "npm run verify remains the publication gate; this report only makes missed review fail earlier"] },
    ],
  },
  {
    slug: "skills-release-handoff",
    group: "AI Ready",
    eyebrow: "EVIDENCE · GATES · HTTPS",
    title: "Release-readiness report and CDN handoff",
    description: "Separate build-time evidence, maintainer-operated gates, and real post-upload network checks so a local green result never impersonates production availability.",
    sections: [
      { id: "report", title: "The machine report claims only what it can prove", paragraphs: ["release-readiness-report.json is generated during the final static export from the route manifest, typed content, docs-sources, changelog inbox, audited Skills snapshot, and compatibility report. It summarizes recorded source baselines, bilingual topic/canonical route/Markdown counts, and the key artifact/MIME inventory.", "It stores no generatedAt, lastmod, upload time, or production-check time. evidenceDate is the reviewed documentation baseline date, not a build or deployment timestamp."], links: [{ label: "Open the release-readiness report", href: "/release-readiness-report.json" }] },
      { id: "build-evidence", title: "Boundary of build-time evidence", bullets: ["Route and document counts come from the final route manifest and search/Markdown data for this export", "Source baselines come from recorded commits, versions, and dirty fingerprints in docs-sources and do not claim republishing", "The changelog summary describes only the recorded-to-current inbox; commit subjects remain evidenceOnly", "Skills remains audited-snapshot, and stableEligible stays false while compatibility warnings are open", "artifactInventory declares key paths and MIME types required by the export contract; it does not prove the CDN serves them correctly"] },
      { id: "operator-gates", title: "Gates the maintainer must complete explicitly", paragraphs: ["Generating the report neither runs nor fabricates a successful npm run verify. full-release-gate remains required-not-attested, artifact-upload is not-performed, and CDN cache, directory-index, and rollback configuration are not-attested."], code: { language: "text", value: releaseHandoffCode } },
      { id: "post-upload", title: "Run real HTTPS GET checks after upload", paragraphs: ["On the real public hostname, verify status, Content-Type, page language/links, and every asset advertised by llms.txt. HEAD may help diagnosis, but release acceptance uses real GET requests. A local static check can never prove that the public hostname is live."], code: { language: "powershell", value: postUploadCode }, note: "postUploadChecks always remains not-performed in the generated report. Do not hand-edit generated output to impersonate acceptance; record real production evidence in the deployment system or operator release record." },
      { id: "artifact-integrity", title: "Per-file hashes, pre-upload verification, and rollback identity", paragraphs: ["artifact-manifest.json is generated after every other static file is written and excludes only itself to avoid a self-hash cycle. It sorts POSIX-relative paths, records bytes, MIME, and file SHA-256 for HTML, Markdown, assets, AI JSON, _headers, and verifiers, then hashes path + NUL + decimal bytes + NUL + sha256 + LF for the aggregate SHA-256.", "The verifier recursively recomputes the exact set. Missing, extra, modified, MIME-mismatched, symlinked, or special entries fail closed. The manifest cannot authenticate itself through its own aggregate, so obtain it through reviewed source or a trusted download and bind aggregateSha256 to the immutable deployment record. For rollback, select the previous directory by its recorded aggregate and verify it again before switching."], code: { language: "powershell", value: artifactVerifyCode }, links: [{ label: "Open the per-file artifact manifest", href: "/artifact-manifest.json" }, { label: "Download the static artifact verifier", href: "/verify-static-artifact.mjs" }] },
      { id: "rollback-plan", title: "Two-artifact rollback plan and human cutover gates", paragraphs: ["plan-static-rollback.mjs first performs complete fail-closed verification of both the current directory and the target previous-release directory. It rejects the same directory, tampered artifacts, and identical aggregates, then emits addFromTarget, removeFromCurrent, replaceWithTarget, and unchanged in stable path order while binding both aggregateSha256 values.", "The plan deliberately leaves trusted-manifest provenance, target-environment smoke, traffic switch, and public HTTPS acceptance unattested. The tool only reads artifacts: it never copies, deletes, uploads, deploys, or switches traffic, and --output must remain outside both immutable artifact directories. Only after reviewing the diff, validating the target environment, and retaining the current release should the operator use the platform's own atomic pointer or directory switch."], code: { language: "powershell", value: artifactRollbackCode }, links: [{ label: "Download the read-only static rollback planner", href: "/plan-static-rollback.mjs" }] },
      { id: "decision", title: "Handoff decision", bullets: ["handoffStatus=operator-gates-required means an artifact handoff inventory exists; it does not mean production ready", "Resolve changelog requiresReview, dirty-source evidence, and open Skills warnings before choosing Release/Preview wording", "Switch traffic only after the maintainer obtains full-gate, upload, HTTPS/MIME, and rollback evidence", "If production checks fail, restore the previous immutable artifact rather than editing the report to conceal failure"] },
    ],
  },
];
