import type { DocPage } from "./content";

const recoverySet = `Immutable release bundle
├─ Heimdall image digest + .NET/runtime baseline
├─ reviewed app.yaml + plugin.yaml templates
├─ secret-manager versions (never plaintext in the bundle)
├─ PostgreSQL backup + WAL/PITR position
├─ applied migration inventory and digests
├─ object-storage bucket/version references
└─ public issuer, proxy, DNS, and certificate contract`;

const recoveryOrder = `1. Freeze writes or record an exact recovery boundary
2. Restore PostgreSQL into an isolated network
3. Restore the matching encryption/signing/config secrets
4. Start the exact immutable Heimdall image without public traffic
5. Validate schema, decryptability, issuer, Discovery, and JWKS
6. Reconcile Redis, jobs, webhooks, and external dependencies
7. Run platform and tenant protocol acceptance
8. Cut over DNS/proxy traffic, then monitor and retain the old site`;

function makePage(locale: "zh" | "en"): DocPage {
  const zh = locale === "zh";
  return {
    slug: "heimdall-disaster-recovery",
    group: zh ? "部署与运维" : "Deployment & Operations",
    eyebrow: "HEIMDALL 5.3.19 · DISASTER RECOVERY",
    title: zh ? "备份、恢复与灾难恢复 Runbook" : "Backup, restore, and disaster-recovery runbook",
    description: zh
      ? "恢复的不只是数据库：把配置、加密材料、签名信任、迁移证据和公开 OIDC 边界作为一个可演练的恢复单元。"
      : "Restore more than a database: treat configuration, encryption material, signing trust, migration evidence, and the public OIDC boundary as one rehearsed recovery unit.",
    sections: [
      {
        id: "recovery-contract",
        title: zh ? "先定义恢复合同" : "Define the recovery contract first",
        paragraphs: zh
          ? ["Heimdall 的身份事实主要持久化在 PostgreSQL，但可用的身份系统还依赖匹配的 app.yaml/plugin.yaml、Asgard.Encryption Key/IV、system 与 tenant 签名材料、Client/Provider Secret、公开 oidc.issuer、代理/TLS、对象存储和精确应用镜像。只恢复表数据却换掉这些信任材料，可能让密文无法解开、旧 Token 无法验签或 Discovery 指向错误地址。", "为整套恢复集合定义业务认可的 RPO/RTO，并分别记录平台 Authority 和至少一个租户 Authority。备份成功不是恢复证据；只有隔离环境的定期还原和协议验收才能证明。"]
          : ["Heimdall persists its main identity facts in PostgreSQL, but a usable identity service also requires matching app.yaml/plugin.yaml, the Asgard.Encryption Key/IV, system and tenant signing material, client/provider secrets, the public oidc.issuer, proxy/TLS state, object storage, and the exact application image. Restoring rows while replacing trust material can make ciphertext unreadable, invalidate old tokens, or point Discovery at the wrong address.", "Set business-approved RPO and RTO for this complete recovery set and record both the platform Authority and at least one tenant Authority. A successful backup is not restore evidence; only periodic isolated restoration plus protocol acceptance proves recovery."],
        code: { language: "text", value: recoverySet },
      },
      {
        id: "postgresql-boundary",
        title: zh ? "PostgreSQL、迁移与时间点恢复" : "PostgreSQL, migrations, and point-in-time recovery",
        paragraphs: zh
          ? ["Heimdall 5.3.19 的业务主库是 PostgreSQL。用户、凭据哈希、Client、Scope、Consent、Authorization、Token、session、撤销水位、tenant key、Application 域、运行时设置、安全事件与 Webhook 状态的恢复一致性都依赖该数据库边界。备份、WAL/PITR、复制、校验和、加密和保留由数据库平台负责。", "5.3.19 增加了 20260720 Application-domain 四阶段迁移和 MCP credential-policy 增量，但仍没有完整空库 baseline、统一 migration ledger 或 down scripts。Application-domain 文件必须按 precheck → migrate → postcheck → cleanup 审核执行；整个 Database/Migrations 目录仍不能按文件名盲跑重建数据库。"]
          : ["Heimdall 5.3.19 uses PostgreSQL for application storage. Recovery consistency for users, credential hashes, clients, scopes, consents, authorizations, tokens, sessions, revocation watermarks, tenant keys, the Application domain, runtime settings, security events, and webhook state depends on that database boundary. Backup, WAL/PITR, replication, checksums, encryption, and retention remain database-platform responsibilities.", "Version 5.3.19 adds the four-stage 20260720 Application-domain migration and the MCP credential-policy increment, but still has no complete empty-database baseline, unified migration ledger, or down scripts. Run the Application-domain files only as reviewed precheck → migrate → postcheck → cleanup; the whole Database/Migrations directory is still not a filename-ordered rebuild plan."],
        bullets: zh
          ? ["用专用只读备份身份和加密存储，保护备份、WAL、manifest 与校验和", "同时演练整库恢复和目标时间点恢复，记录数据截止时间、时区、恢复点与丢失窗口", "不要从生产直接启动恢复库；先在隔离网络运行一致性、租户采样和敏感字段可解密检查", "Schema 不兼容时遵循 expand → compatible deploy → contract；恢复不是用 CodeFirst 猜测缺失结构"]
          : ["Use a dedicated least-privilege backup identity and encrypted storage for backups, WAL, manifests, and checksums", "Rehearse both full restore and target-time recovery, recording the data cutoff, time zone, recovery point, and loss window", "Never start a restored database directly on production traffic; first run consistency, tenant sampling, and sensitive-field decryptability checks in isolation", "For schema changes use expand → compatible deploy → contract; restoration never asks CodeFirst to guess missing structure"],
      },
      {
        id: "keys-secrets-and-trust",
        title: zh ? "密钥、Secret 与信任连续性" : "Keys, secrets, and continuity of trust",
        paragraphs: zh
          ? ["generate-config.ps1 会生成数据库口令、AES Key/IV、system client secret 和 RSA 私钥；tenant OIDC private keys 与部分 Provider/Webhook Secret 以加密形式进入 PostgreSQL，因此数据库备份必须与创建这些密文的 Asgard.Encryption Key/IV 同代恢复。丢失 Key/IV 不能通过生成新值修复旧密文。", "system signing key 来自 plugin.yaml/Secret 注入，tenant signing key 状态保存在数据库。恢复时保留 Active 与仍在 Retiring 窗口内的 key/kid，使事故前签发且尚未过期的 Token 仍可按既定策略验签。只有明确接受全量重新认证和旧 Token 失效时，才执行灾难密钥替换。"]
          : ["generate-config.ps1 produces database credentials, the AES Key/IV, a system-client secret, and an RSA private key. Tenant OIDC private keys and some provider/webhook secrets enter PostgreSQL as ciphertext, so restore the database with the same generation of Asgard.Encryption Key/IV. Generating new values cannot repair old ciphertext.", "The system signing key comes from plugin.yaml/secret injection, while tenant signing-key state is stored in the database. Restore Active keys and any key still inside its Retiring window so pre-incident, unexpired tokens follow the intended validation policy. Perform disaster key replacement only when the incident explicitly accepts global reauthentication and invalidation of old tokens."],
        bullets: zh
          ? ["Secret Manager 版本、访问策略与审计日志独立备份；文档、manifest 和工单只保存引用/指纹", "每次演练验证 system 与 tenant JWKS 的 kid、公钥和签名能力，不输出 privateKey", "若怀疑 Secret 泄露，恢复正确性与凭据轮换是两个阶段：先建立受控服务，再按 Client/Provider/key Runbook 轮换", "不得把数据库 dump、plugin.yaml 或 Secret 复制进 AI 提示词、聊天记录或普通制品库"]
          : ["Back up secret-manager versions, access policy, and audit separately; documents, manifests, and tickets keep references/fingerprints only", "Every drill verifies system and tenant JWKS kid/public key/signing ability without exporting privateKey", "If compromise is suspected, correct restoration and credential rotation are separate phases: establish controlled service, then rotate clients/providers/keys through their runbooks", "Never copy a database dump, plugin.yaml, or secrets into AI prompts, chat logs, or ordinary artifact storage"],
      },
      {
        id: "redis-and-ephemeral-state",
        title: zh ? "Redis 与短期协议状态" : "Redis and short-lived protocol state",
        paragraphs: zh
          ? ["Redis/IMultiLevelCache 保存缓存以及外部 OIDC state、MFA ticket、Passkey transaction 等短期单次消费状态，并参与 distributed lock。PostgreSQL 才是长期身份事实源；Redis 快照不能替代数据库备份，也不应在跨环境恢复时把旧短期登录事务当作长期会话恢复。", "灾难切换通常应清空或使用新 instanceName/namespace，让进行中的 authorize、MFA、Passkey 和缓存事务失败关闭并重新开始。若业务选择恢复 Redis，必须证明 TTL、序列化版本、单次消费和锁 lease 在新集群仍正确，且不会复活已消费状态。"]
          : ["Redis/IMultiLevelCache holds caches plus short-lived, single-consume state such as external OIDC state, MFA tickets, Passkey transactions, and distributed locks. PostgreSQL remains the durable identity source. A Redis snapshot is neither a database backup nor a reason to revive old login transactions across environments.", "A disaster cutover should normally flush or use a new instanceName/namespace so in-flight authorize, MFA, Passkey, and cache transactions fail closed and restart. If the business restores Redis, prove TTLs, serialization compatibility, single consumption, and lock leases on the new cluster without resurrecting consumed state."],
      },
      {
        id: "messaging-webhooks-and-jobs",
        title: zh ? "RabbitMQ、Webhook Outbox 与 Job" : "RabbitMQ, webhook outbox, and jobs",
        paragraphs: zh
          ? ["RabbitMQ 是 Asgard 可选消息基础设施，不是 Heimdall PostgreSQL 身份状态的备份。恢复其 vhost/定义、队列和持久消息时必须按实际部署做独立 inventory；当前源码不提供 RabbitMQ backup/restore 编排。identity.subject.invalidated Webhook 使用 PostgreSQL outbox/delivery 与 HTTP worker，恢复数据库可能重新暴露 pending/租约超时记录，接收端必须按 event_id 幂等。", "OidcTokenCleanupJob、长授权清理、tenant key rotation、Webhook worker 与安全事件生命周期作业在恢复后可能集中追赶。先保持公开流量关闭，检查 runtime settings、Quartz 配置、数据库时间和 leader/多实例策略，再逐项启用；不要让未验证的清理作业先于恢复检查删除证据。"]
          : ["RabbitMQ is optional Asgard messaging infrastructure, not a backup of Heimdall's PostgreSQL identity state. Its vhost definitions, queues, and durable messages need a deployment-specific inventory; source provides no RabbitMQ backup/restore orchestration. The identity.subject.invalidated webhook uses a PostgreSQL outbox/delivery store plus an HTTP worker. Restoring the database can expose pending or lease-expired deliveries again, so receivers deduplicate by event_id.", "OidcTokenCleanupJob, long-grant cleanup, tenant-key rotation, the webhook worker, and security-event lifecycle jobs may catch up together after restoration. Keep public traffic closed, inspect runtime settings, Quartz configuration, database time, and leader/multi-instance policy, then enable them deliberately. Never let an unverified cleanup job delete evidence before recovery inspection."],
      },
      {
        id: "object-storage-and-observability",
        title: zh ? "对象存储、日志与审计证据" : "Object storage, logs, and audit evidence",
        paragraphs: zh
          ? ["租户 Logo/登录背景等品牌数据可引用对象存储 object key；只恢复数据库而不恢复对应 bucket/object/version 会留下断链。对象存储设置、访问凭据、生命周期和跨区复制是独立恢复合同，不能由 PostgreSQL dump 证明。", "日志、Trace 和 SIEM 导出是诊断/合规证据，不是授权事实源。按法规与事故策略备份它们，同时保持与主库恢复点的时间关联；任何日志备份都不得包含 Token、Cookie、密码、private key、AES Key/IV 或完整敏感请求。"]
          : ["Tenant logos and login backgrounds can reference object-storage keys. Restoring only PostgreSQL without the matching bucket/object/version leaves broken assets. The object-storage settings, credentials, lifecycle, and cross-region replication are a separate recovery contract that a database dump cannot prove.", "Logs, traces, and SIEM exports are diagnostic/compliance evidence, not an authorization source of truth. Preserve them according to legal and incident policy while correlating their time boundary with the database recovery point. No log backup may contain tokens, cookies, passwords, private keys, AES Key/IV, or complete sensitive requests."],
      },
      {
        id: "isolated-restore-procedure",
        title: zh ? "隔离恢复顺序" : "Isolated restore sequence",
        paragraphs: zh
          ? ["恢复环境必须先与公网、生产 RabbitMQ/Webhook 接收端和生产对象写入隔离，避免旧 outbox 重放、错误 Issuer 暴露或恢复演练写入真实下游。恢复使用与备份 manifest 匹配的不可变镜像、配置模板和 Secret 版本，不用 latest。"]
          : ["Keep the restore environment isolated from public traffic, production RabbitMQ/webhook receivers, and production object writes. This prevents old outbox replay, exposure of a wrong issuer, or a drill mutating real downstream systems. Use the immutable image, configuration templates, and secret versions named by the backup manifest, never latest."],
        code: { language: "text", value: recoveryOrder },
      },
      {
        id: "protocol-acceptance",
        title: zh ? "恢复后的生产接受" : "Post-restore production acceptance",
        bullets: zh
          ? ["校验备份校验和、PostgreSQL recovery point、schema/migration digest、行数与至少两个租户的隔离采样", "确认加密的 Client/Provider/Webhook Secret 和 tenant private key 可由匹配 Key/IV 正常使用，但不导出明文", "根与租户 Discovery 的 issuer、authorization/token/userinfo/end_session 地址全部是公网 HTTPS；JWKS 同时包含预期 system/Active/Retiring kid", "完成平台与租户 Authorization Code + S256 PKCE、MFA、UserInfo、Refresh、End Session、Client Credentials 与资源 API 冒烟", "验证事故前未过期 Token 的预期策略、撤销水位/session、错误 issuer/audience/kid、过期 Token 和跨租户请求均失败关闭", "检查 Redis namespace、分布式锁、Webhook pending/failed、event_id 幂等、Job 追赶、对象资源、日志/Trace/SIEM 与告警", "真实浏览器检查 Asgard.Identity Cookie 的 Secure/HttpOnly/SameSite、代理 scheme、回跳与平台/租户路由；全部通过后才切流"]
          : ["Verify backup checksums, PostgreSQL recovery point, schema/migration digests, row counts, and isolation samples from at least two tenants", "Prove encrypted client/provider/webhook secrets and tenant private keys work with the matching Key/IV without exporting plaintext", "Root and tenant Discovery expose the public HTTPS issuer and correct authorization/token/userinfo/end_session URLs; JWKS contains the expected system, Active, and Retiring kids", "Complete platform and tenant Authorization Code + S256 PKCE, MFA, UserInfo, Refresh, End Session, Client Credentials, and resource-API smoke tests", "Verify the policy for pre-incident unexpired tokens plus revocation watermarks/sessions; wrong issuer/audience/kid, expired tokens, and cross-tenant requests fail closed", "Inspect the Redis namespace, distributed locks, webhook pending/failed state and event_id idempotency, job catch-up, object assets, logs/traces/SIEM, and alerts", "In a real browser verify Asgard.Identity Secure/HttpOnly/SameSite, proxy scheme, redirects, and platform/tenant routes before shifting traffic"],
      },
      {
        id: "drills-and-evidence",
        title: zh ? "演练、RPO/RTO 与证据" : "Drills, RPO/RTO, and evidence",
        bullets: zh
          ? ["按固定周期做全量隔离恢复，不只运行备份命令；记录开始、恢复点、协议就绪、切流就绪与清理时间", "注入数据库不可用、区域丢失、Secret 版本错误、Redis 丢失、JWKS kid 缺失、Webhook 重放和对象缺失，证明失败关闭与升级路径", "每次演练保存已脱敏 manifest、镜像 digest、schema/migration digest、Secret 版本引用、测试结果、RPO/RTO 偏差和整改责任人", "生产事故后保留旧站只读/隔离证据，不在确认恢复点前清理；回切同样执行完整协议接受"]
          : ["Perform a full isolated restore on a schedule, not merely a backup command; record start, recovery point, protocol-ready, cutover-ready, and cleanup times", "Inject database outage, region loss, wrong secret version, Redis loss, missing JWKS kid, webhook replay, and missing objects to prove fail-closed behavior and escalation", "Retain a redacted manifest, image and schema/migration digests, secret-version references, test results, RPO/RTO variance, and remediation owner for each drill", "After a real incident preserve the old site as isolated/read-only evidence until the recovery point is confirmed; failback runs the same complete protocol acceptance"],
      },
      {
        id: "release-boundaries",
        title: zh ? "5.3.19 Release 与未证明边界" : "5.3.19 release and unproven boundaries",
        paragraphs: zh
          ? ["Release：v5.3.19 / commit 0032070 证明 PostgreSQL 主路径、持久化 OIDC/租户 key/token/session/revocation/runtime-setting/Webhook/Application 状态、Redis 短期协议状态、签名 key 生命周期及协议端点。tag 与当前 commit 一致，没有 HEAD-only 恢复能力。", "未证明：Heimdall 自带的 backup/PITR/restore 编排、完整空库 baseline、统一 migration ledger、down scripts、跨区故障转移、RabbitMQ/Redis/Object Storage 备份、Secret Manager 集成或自动 DR 演练。本文是运维 Runbook，不是框架控制面。"]
          : ["Release: v5.3.19 / commit 0032070 proves the PostgreSQL primary path; persisted OIDC, tenant-key, token, session, revocation, runtime-setting, webhook, and Application-domain state; Redis short-lived protocol state; signing-key lifecycle; and protocol endpoints. Tag and current commit match, with no HEAD-only recovery capability.", "Unproven: built-in backup/PITR/restore orchestration, a complete empty-database baseline, unified migration ledger, down scripts, cross-region failover, RabbitMQ/Redis/object-storage backup, secret-manager integration, or automated DR drills. This is an operator runbook, not a framework control plane."],
      },
    ],
  };
}

export const zhHeimdallDisasterRecoveryDocs: DocPage[] = [makePage("zh")];
export const enHeimdallDisasterRecoveryDocs: DocPage[] = [makePage("en")];
