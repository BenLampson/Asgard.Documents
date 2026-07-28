import docsSources from "../docs-sources.json";
import type { DocPage } from "./content";

type Locale = "zh" | "en";

const contract = docsSources.skillsContract;
const skillCount = contract.expectedSkills.length;
const bundleCount = contract.bundles.length;
const openWarningCount = contract.compatibilityWarnings.length;
const stableEligible =
  contract.releaseStatus === "stable" && openWarningCount === 0;
const shortRef = contract.fullCommit.slice(0, 7);
const worktreeState = docsSources.skills.worktreeDirty ? "dirty" : "clean";

const bundleBullets = (locale: Locale) =>
  contract.bundles.map((bundle) => {
    const purpose = locale === "zh" ? bundle.purposeZh : bundle.purposeEn;
    const skills =
      locale === "zh"
        ? `${bundle.skills.length} 个 Skill`
        : `${bundle.skills.length} Skills`;
    return `${bundle.id} — ${purpose} (${skills}: ${bundle.skills.join(", ")})`;
  });

const warningBullets = (locale: Locale) =>
  contract.compatibilityWarnings.map((warning) => {
    const guidance = locale === "zh" ? warning.guidanceZh : warning.guidanceEn;
    const sources = warning.sourceFiles.join(", ");
    return `[${warning.id}] ${guidance} (${locale === "zh" ? "来源" : "source"}: ${sources})`;
  });

const snapshotCode = [
  `repository: ${contract.repository}`,
  `tagAtReview: ${contract.tagAtReview}`,
  `auditedRef: ${contract.fullCommit}`,
  `reviewedAt: ${contract.reviewedAt}`,
  `worktree: ${worktreeState}`,
  `releaseStatus: ${contract.releaseStatus}`,
  `skills: ${skillCount}`,
  `explicitBundles: ${bundleCount}`,
  `openWarnings: ${openWarningCount}`,
  `stableEligible: ${stableEligible}`,
].join("\n");

const installCode = [
  '$Origin = "https://asgard.benlampson.cn"',
  '$Stage = Join-Path $PWD ".asgard-skills-stage"',
  'Invoke-WebRequest "$Origin/asgard-skills.lock.json" -OutFile "asgard-skills.lock.json"',
  'Invoke-WebRequest "$Origin/verify-skills-installation.mjs" -OutFile "verify-skills-installation.mjs"',
  '$Lock = Get-Content -Raw "asgard-skills.lock.json" | ConvertFrom-Json',
  '$Paths = @($Lock.skills | ForEach-Object { $_.path })',
  "python <CODEX_HOME>/skills/.system/skill-installer/scripts/install-skill-from-github.py `",
  `  --repo BenLampson/Asgard.Skills --ref ${contract.fullCommit} --dest $Stage --path $Paths`,
  'node .\\verify-skills-installation.mjs --root $Stage --lock .\\asgard-skills.lock.json',
].join("\n");

const makePage = (locale: Locale): DocPage => {
  const zh = locale === "zh";

  return {
    slug: "skills-release-notes",
    group: zh ? "版本与兼容性" : "Release & compatibility",
    eyebrow: "AUDITED SNAPSHOT · COMPATIBILITY",
    title: zh
      ? "Asgard Skills 版本与兼容性状态"
      : "Asgard Skills release and compatibility status",
    description: zh
      ? "从机器合同生成当前审核快照、显式 Bundle、开放告警，以及可回滚的安装与升级边界。"
      : "A machine-contract-backed view of the reviewed snapshot, explicit bundles, open warnings, and rollback-safe installation boundaries.",
    sections: [
      {
        id: "status",
        title: zh ? "当前版本判定" : "Current version decision",
        paragraphs: zh
          ? [
              `仓库在 ${contract.reviewedAt} 的正式 tag 仍是 ${contract.tagAtReview}；本站审核的是 ${worktreeState} commit ${contract.fullCommit}（${shortRef}）。这条“${contract.tagAtReview} → audited ref”记录表示可复现的源码快照，不表示发布了一个新版本。`,
              `机器合同把该 ref 标为 ${contract.releaseStatus}。当前 ${openWarningCount} 条兼容性告警仍开放，因此 stableEligible=${stableEligible}；在告警按同一合同关闭前，不得把 main、HEAD、该 commit 或 all-reviewed 宣传为 stable bundle。`,
            ]
          : [
              `The latest formal tag recorded at the ${contract.reviewedAt} review remains ${contract.tagAtReview}; this site audited ${worktreeState} commit ${contract.fullCommit} (${shortRef}). This “${contract.tagAtReview} → audited ref” record identifies a reproducible source snapshot, not a newly published version.`,
              `The machine contract labels this ref ${contract.releaseStatus}. With ${openWarningCount} compatibility warnings still open, stableEligible=${stableEligible}; main, HEAD, this commit, and all-reviewed must not be advertised as a stable bundle until those warnings close through the same contract.`,
            ],
        code: { language: "yaml", value: snapshotCode },
        links: [
          {
            label: zh
              ? "机器可读兼容性报告"
              : "Machine-readable compatibility report",
            href: "/skills-compatibility-report.json",
          },
          {
            label: zh ? "审核快照清单" : "Audited snapshot manifest",
            href: "/skills-manifest.json",
          },
        ],
      },
      {
        id: "inventory",
        title: zh ? "审核范围" : "Reviewed inventory",
        paragraphs: zh
          ? [
              `当前合同覆盖 ${skillCount} 个 Skill。目录集合来自 expectedSkills，制品中的文件路径与散列由审核快照清单提供；本页不维护第二份名称或散列列表。`,
              `相对上一次完整审核，新增 ${contract.auditDelta.addedSkills.length} 个、删除 ${contract.auditDelta.removedSkills.length} 个、改名 ${contract.auditDelta.renamedSkills.length} 个；变化集合均直接来自 auditDelta。`,
            ]
          : [
              `The current contract covers ${skillCount} Skills. The directory set comes from expectedSkills, while artifact paths and hashes come from the audited snapshot manifest; this page maintains no second list of names or hashes.`,
              `Against the previous full audit, the contract records ${contract.auditDelta.addedSkills.length} added, ${contract.auditDelta.removedSkills.length} removed, and ${contract.auditDelta.renamedSkills.length} renamed Skills; every delta is read directly from auditDelta.`,
            ],
        bullets: contract.auditDelta.addedSkills.map((skill) =>
          zh ? `新增：${skill}` : `Added: ${skill}`,
        ),
        note: zh
          ? "Skill 可被 Agent 路由，不等于其中描述的运行能力已经发布；仍须核对目标 Asgard/Heimdall 版本、源码主路径和测试。"
          : "A routable Skill is not proof that its described runtime capability shipped; verify the target Asgard/Heimdall version, primary source path, and tests.",
      },
      {
        id: "bundles",
        title: zh
          ? `${bundleCount} 个显式 Bundle`
          : `${bundleCount} explicit bundles`,
        paragraphs: zh
          ? [
              "Bundle 是机器合同中人工审核过的显式集合，只表达一次任务建议安装哪些 Skill。它不解析传递依赖，也不保证未来 ref 上仍具有相同含义。",
            ]
          : [
              "A bundle is an explicitly reviewed set in the machine contract. It only says which Skills are recommended together for a task; it neither resolves transitive dependencies nor guarantees identical meaning at a future ref.",
            ],
        bullets: bundleBullets(locale),
        links: [
          {
            label: zh ? "下载安装锁" : "Download installation lock",
            href: "/asgard-skills.lock.json",
          },
        ],
      },
      {
        id: "install",
        title: zh ? "固定 ref，在 staging 安装" : "Pin the ref and install into staging",
        paragraphs: zh
          ? [
              "消费者应先读取同一审核清单派生的 lock，把完整 ref 和显式 paths 安装到全新的 staging 目录，再用配套校验器核对目录集合与文件散列。不要用分支名或漂移的 HEAD 代替 lock。",
              "Codex installer 在目标目录已经存在时中止；多 path 安装逐项复制，也不是事务。先预检目标并使用隔离的 --dest，避免把半套更新写入正在被 Agent 读取的目录。",
            ]
          : [
              "Consumers should read the lock derived from the same audited manifest, install its full ref and explicit paths into a new staging directory, and verify the directory set and file hashes with the companion verifier. Do not replace the lock with a branch name or moving HEAD.",
              "The Codex installer aborts when a destination directory already exists, and a multi-path install copies entries sequentially rather than transactionally. Preflight targets and use an isolated --dest so a partial update cannot enter a directory being read by an agent.",
            ],
        code: { language: "powershell", value: installCode },
        links: [
          {
            label: zh ? "下载 staging 校验器" : "Download staging verifier",
            href: "/verify-skills-installation.mjs",
          },
        ],
      },
      {
        id: "upgrade",
        title: zh ? "升级、切换与回滚边界" : "Upgrade, cutover, and rollback boundaries",
        bullets: zh
          ? [
              "升级前保存当前 lock、完整 ref 和实际安装目录；候选版本只能进入新的 staging 目录",
              "在 staging 中校验精确目录集合和文件散列，并运行固定的路由、实现、测试与复查验收任务",
              "停止可能读取 live Skills 的 Agent，再以目录级原子切换替换整套安装；不要逐文件覆盖",
              "保留带时间戳的上一目录与其 lock；验收失败时停止读者、移走失败目录并恢复上一目录",
              "切换后必须开启新一轮 Agent，确认发现根、Skill 名称和规则确实来自新 ref",
            ]
          : [
              "Preserve the current lock, full ref, and installed directory before upgrading; install a candidate only into a new staging directory",
              "Verify the exact directory set and hashes in staging, then run a fixed routing, implementation, test, and review acceptance task",
              "Stop agents that may read the live Skills and switch the complete directory as one unit; never overwrite files individually",
              "Keep the previous timestamped directory with its lock; on failed acceptance, stop readers, move the failed directory aside, and restore the previous one",
              "Start a fresh agent turn after cutover and prove the discovery root, Skill names, and rules come from the new ref",
            ],
        note: zh
          ? "lock 与散列证明“安装内容等于审核快照”，不证明它与未来 Asgard/Heimdall 版本兼容。"
          : "The lock and hashes prove that installed content equals the audited snapshot; they do not prove compatibility with a future Asgard/Heimdall version.",
      },
      {
        id: "warnings",
        title: zh
          ? `${openWarningCount} 条开放兼容性告警`
          : `${openWarningCount} open compatibility warnings`,
        paragraphs: zh
          ? [
              "以下内容逐项从 skillsContract.compatibilityWarnings 生成。页面不另存 warning 数量、ID、来源路径或修复指导。",
            ]
          : [
              "Every entry below is generated from skillsContract.compatibilityWarnings. The page stores no separate warning count, ID list, source path, or remediation guidance.",
            ],
        bullets: warningBullets(locale),
      },
      {
        id: "warning-acceptance",
        title: zh ? "解除告警的验收门槛" : "Acceptance gate for closing a warning",
        bullets: zh
          ? [
              "在告警列出的 sourceFiles 中修正冲突内容，并核对当前 Asgard/Heimdall 公开源码、版本与主运行路径",
              "为行为断言取得可执行测试或等价的源码证据；不能仅因文案删除、样例能编译或 helper 存在就判定已兼容",
              "在同一次审核中从 compatibilityWarnings 与审核清单 warning IDs 移除该 ID，并重新生成 manifest、lock 与 compatibility report",
              "同步中英文目录、安装指导、相关产品指南和 release notes，确保不再搜索到旧的冲突建议",
              "运行完整文档门禁；只有 open warning 为 0 且 releaseStatus 已通过正式发布审核时，stableEligible 才能变为 true",
            ]
          : [
              "Correct the conflicting content in every listed sourceFiles entry and verify the current public Asgard/Heimdall source, version, and primary runtime path",
              "Obtain executable tests or equivalent source evidence for behavioral claims; deleted prose, a compiling sample, or the existence of a helper is not compatibility proof",
              "In the same review, remove the ID from compatibilityWarnings and the audited manifest warning IDs, then regenerate the manifest, lock, and compatibility report",
              "Synchronize both locales, installation guidance, related product guides, and release notes so the obsolete conflicting advice is no longer discoverable",
              "Run the complete documentation gate; stableEligible may become true only when no warning remains open and releaseStatus has passed a formal stable-release review",
            ],
      },
      {
        id: "maintainer-checklist",
        title: zh ? "下一次发布审核" : "Next release review",
        bullets: zh
          ? [
              "读取 tag、clean/dirty 状态和完整 commit；不得从记忆填写版本",
              "重新枚举 skills 目录并与 expectedSkills 比较，核对新增、删除和改名",
              "重新生成每个 Skill 的递归散列、显式 bundles、lock 与兼容性报告",
              "逐条处理开放告警，保留不能证明已解决的 ID",
              "更新本页依赖的机器合同后，让数量、ref、bundle 与告警自动随构建变化",
            ]
          : [
              "Read the tag, clean/dirty state, and full commit; never fill a version from memory",
              "Re-enumerate the skills directories against expectedSkills and review additions, removals, and renames",
              "Regenerate recursive Skill hashes, explicit bundles, the lock, and the compatibility report",
              "Review every open warning and retain any ID whose resolution cannot be proved",
              "Update the machine contract consumed by this page so counts, ref, bundles, and warnings change through the build",
            ],
        links: [
          {
            label: zh ? "查看完整 Skills 目录" : "Open the full Skills catalog",
            href: `/${locale}/skills/docs/skills-catalog`,
          },
          {
            label: zh ? "安装与更新指南" : "Installation and update guide",
            href: `/${locale}/skills/docs/skills-installation`,
          },
        ],
      },
    ],
  };
};

export const zhSkillsReleaseDocs: DocPage[] = [makePage("zh")];
export const enSkillsReleaseDocs: DocPage[] = [makePage("en")];
