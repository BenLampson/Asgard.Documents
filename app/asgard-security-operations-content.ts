import type { DocPage } from "./content";

type Locale = "zh" | "en";

const secretBackedYaml = `Asgard:
  Encryption:
    Key: "\${env:ASGARD_ENCRYPTION_KEY}"
    Iv: "\${env:ASGARD_ENCRYPTION_IV}"`;

const encryptionUsage = `var encryption = asgardContext.Encryption
    ?? throw new InvalidOperationException("Encryption capability is unavailable.");

string cipherText = encryption.Encrypt(plainText)
    ?? throw new InvalidOperationException("Encryption failed.");

string restored = encryption.Decrypt(cipherText)
    ?? throw new InvalidOperationException("Decryption failed.");`;

const passwordUsage = `var passwordHasher = asgardContext.PasswordHasher
    ?? throw new InvalidOperationException("Password hashing capability is unavailable.");

// Registration: persist only the BCrypt result.
string storedHash = passwordHasher.Hash(password);

// Login: rehash only after successful verification.
if (!passwordHasher.Verify(password, storedHash, out bool needsRehash))
{
    return LoginResult.InvalidCredentials();
}

if (needsRehash)
{
    string replacement = passwordHasher.Hash(password);
    await repository.ReplacePasswordHashAsync(userId, replacement, cancellationToken);
}`;

const acceptanceCommands = `# Focused source tests currently prove registration, option snapshots,
# missing-section failure, invalid AES key length, and one round trip.
dotnet test Test/Asgard.Core.Tests/Asgard.Core.Tests.csproj \
  -c Release --filter "FullyQualifiedName~Security"

# Release acceptance must additionally exercise in the consuming application:
# - secret injection and startup failure with missing/invalid Key or Iv
# - known ciphertext compatibility and wrong/retired-key failure
# - BCrypt cost 4, 11, >11, malformed hashes, and login-time rehash
# - concurrent singleton use and 1/1024/1025-byte random-key boundaries
# - a rehearsed dual-read migration before changing the active AES key`;

const sourceFiles = `Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs
Common/Asgard.Abstractions/Security/IEncryptionService.cs
Common/Asgard.Abstractions/Security/IPasswordHasher.cs
Common/Asgard.Abstractions/Security/IKeyGenerator.cs
Common/Asgard.Core/Security/SecurityServiceCollectionExtensions.cs
Common/Asgard.Core/Security/AesEncryptionService.cs
Common/Asgard.Core/Security/BcryptPasswordHasher.cs
Common/Asgard.Core/Security/SecureKeyGenerator.cs
Common/Asgard.Core/AsgardContext.cs
Common/Asgard.Core/AsgardContextModule/AsgardContextServiceCollectionExtensions.cs
Common/Asgard.Core/SystemConfig/AsgardConfigurationRoot.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Services.cs
Test/Asgard.Core.Tests/Security/SecurityServiceCollectionExtensionsTests.cs`;

const sectionIds = [
  "contract",
  "registration",
  "configuration-secrets",
  "encryption-format",
  "encryption-boundaries",
  "password-hashing",
  "password-upgrade",
  "key-generation",
  "rotation",
  "failure-policy",
  "observability-audit",
  "testing-acceptance",
  "ai-ready",
  "source-evidence",
] as const;

function makeSecurityOperationsPage(locale: Locale): DocPage {
  const zh = locale === "zh";

  return {
    slug: "security-operations",
    group: zh ? "安全" : "Security",
    eyebrow: "ASGARD 5.1.3 · SECURITY OPERATIONS",
    title: zh ? "安全能力生产操作指南" : "Security capabilities in production",
    description: zh
      ? "以当前源码为合同，安全接入和运维 Asgard 的 AES 加密、BCrypt 密码哈希与加密随机密钥生成，并明确格式、轮换和失败边界。"
      : "Integrate and operate Asgard AES encryption, BCrypt password hashing, and cryptographic key generation against the current source contract, with explicit format, rotation, and failure boundaries.",
    sections: [
      {
        id: sectionIds[0],
        title: zh ? "先区分三种能力" : "Start by separating the three capabilities",
        paragraphs: zh
          ? [
              "Asgard 5.1.3 的安全模块提供三个独立接口：IEncryptionService 用启动期 AES Key/Iv 加解密字符串并提供 MD5 兼容摘要；IPasswordHasher 用 BCrypt 做不可逆密码哈希；IKeyGenerator 生成 Base64 编码的随机密钥。加密不是密码存储，密码哈希不能解密，密钥生成器也不会自动安装或轮换运行中的 AES 配置。",
              "当前实现没有 secret vault、密钥环、密文版本、自动轮换、AEAD、逐字段策略、审计事件或安全健康检查。接口和 helper 类型证明的是可调用原语，不证明密钥托管、轮换、迁移或完整的身份系统已经接通；这些必须由宿主和业务运行手册补齐。",
            ]
          : [
              "Asgard 5.1.3 exposes three separate interfaces. IEncryptionService encrypts/decrypts strings with startup-time AES Key/Iv and provides an MD5 compatibility digest. IPasswordHasher performs irreversible BCrypt password hashing. IKeyGenerator creates Base64-encoded random keys. Encryption is not password storage, password hashes are not decryptable, and the generator does not install or rotate the running AES configuration.",
              "The current implementation has no secret vault, key ring, ciphertext version, automatic rotation, AEAD, per-field policy, audit event, or security health check. Interfaces and helper types prove callable primitives—not that key custody, rotation, migration, or an identity system is wired end to end. The host and application runbook must supply those boundaries.",
            ],
      },
      {
        id: sectionIds[1],
        title: zh ? "标准宿主与自定义宿主的注册" : "Registration in standard and custom hosts",
        paragraphs: zh
          ? [
              "标准 Yggdrasil 宿主在服务注册阶段无条件加载 Asgard:Encryption，并调用 AddAsgardSecurityServices。它把经过校验的 AsgardEncryptionOptions、IEncryptionService/AesEncryptionService、IKeyGenerator/SecureKeyGenerator 与 IPasswordHasher/BcryptPasswordHasher 注册为 singleton；随后 scoped AsgardContext 通过可选构造参数暴露 Encryption、PasswordHasher 和 KeyGenerator。因此标准宿主配置正确时三者都非空，缺失或无效的 Key/Iv 会中止启动。",
              "自定义宿主只有显式调用 AddAsgardSecurityServices 或 AddAsgardEncryptionServices 才获得三种安全服务；后一个名称虽然写着 Encryption，当前同样注册 KeyGenerator 与 PasswordHasher。只调用 AddAsgardContext 不会补注册它们，Context 属性会为 null。完整 AddAsgardSecurityServices 还注册压缩与通配符工具，不能把它误描述为只影响密码学。",
            ]
          : [
              "The standard Yggdrasil host unconditionally loads Asgard:Encryption during service registration and calls AddAsgardSecurityServices. It registers the validated AsgardEncryptionOptions plus IEncryptionService/AesEncryptionService, IKeyGenerator/SecureKeyGenerator, and IPasswordHasher/BcryptPasswordHasher as singletons. The scoped AsgardContext then exposes Encryption, PasswordHasher, and KeyGenerator through optional constructor dependencies. All three are therefore non-null in a correctly configured standard host; a missing or invalid Key/Iv aborts startup.",
              "A custom host receives the three security services only after explicitly calling AddAsgardSecurityServices or AddAsgardEncryptionServices. Despite its narrower name, the latter currently also registers KeyGenerator and PasswordHasher. AddAsgardContext alone does not add them, so its context properties remain null. The full AddAsgardSecurityServices overload also adds compression and wildcard utilities; it is not a cryptography-only switch.",
            ],
      },
      {
        id: sectionIds[2],
        title: zh ? "配置、校验与 secret 托管" : "Configuration, validation, and secret custody",
        paragraphs: zh
          ? [
              "AsgardEncryptionOptions 的固定节路径是 Asgard:Encryption。Key 必须是 Base64 解码后 16、24 或 32 字节，Iv 必须是 Base64 解码后 16 字节；空白、非法 Base64 或长度错误都会在注册阶段抛 InvalidOperationException。校验后会创建规范化快照，服务持有解码后的字节数组，运行期间没有配置热重载。",
              "仓库 YAML 只放 ${env:...} 占位符；Asgard 配置根会解析环境变量，不存在时快速失败。生产值应来自平台 secret manager 注入进程环境或受控配置 provider，限制读取权限并避免进入镜像层、Git、命令历史、日志、Trace、崩溃转储或 Agent 提示。环境变量仍可被同权限进程读取，不等同于硬件密钥托管。",
            ]
          : [
              "AsgardEncryptionOptions uses the fixed Asgard:Encryption section. Key must decode from Base64 to 16, 24, or 32 bytes; Iv must decode to 16 bytes. Blank values, malformed Base64, or invalid lengths throw InvalidOperationException during registration. Validation creates a normalized snapshot, the service retains decoded byte arrays, and there is no runtime configuration reload.",
              "Keep only ${env:...} placeholders in repository YAML. The Asgard configuration root resolves environment variables and fails fast when one is absent. Inject production values from a platform secret manager through the process environment or a controlled provider, restrict read access, and keep them out of image layers, Git, shell history, logs, Trace, crash dumps, and agent prompts. Environment variables remain readable to same-privilege processes and are not hardware-backed custody.",
            ],
        code: { language: "yaml", value: secretBackedYaml },
        note: zh
          ? "KeyGenerator.CreateAesKeyAndIv 可生成候选值，但应用必须把它们安全写入 secret manager；框架不会自动更新配置。"
          : "KeyGenerator.CreateAesKeyAndIv can create candidate values, but the application must store them in a secret manager; the framework does not update configuration automatically.",
      },
      {
        id: sectionIds[3],
        title: zh ? "AES 密文格式与兼容合同" : "AES ciphertext format and compatibility contract",
        paragraphs: zh
          ? [
              "AesEncryptionService 每次操作创建 Aes 实例，设置同一份启动期 Key 与固定 Iv，使用平台默认 AES 模式/填充写入 UTF-8 文本；当前 .NET 路径产出大写、无分隔符的十六进制密文。密文没有算法、key id、版本或 Iv 头。Decrypt 只接受这种十六进制格式，并用当前单例中的同一 Key/Iv 读取。",
              "相同明文与同一 Key/Iv 会产生相同密文，固定 Iv 会泄露重复模式；密文也没有认证标签，不能证明未被篡改。因此这个原语适合需要维持现有格式的兼容字段，不应被宣传为现代 envelope encryption 或 AEAD。高价值、新设计数据应在应用层选用带随机 nonce 和认证标签的版本化方案，并保留明确迁移边界。",
            ]
          : [
              "AesEncryptionService creates an Aes instance per operation, sets the same startup Key and fixed Iv, and writes UTF-8 text with the platform-default AES mode/padding. The current .NET path returns uppercase hexadecimal ciphertext without separators. The ciphertext carries no algorithm, key id, version, or Iv header. Decrypt accepts that hexadecimal format and reads it with the same Key/Iv held by the singleton.",
              "Equal plaintext under the same Key/Iv produces equal ciphertext, so the fixed Iv leaks repetition; there is also no authentication tag to prove integrity. Treat this primitive as a compatibility format for fields that must retain it, not as modern envelope encryption or AEAD. For high-value or newly designed data, select an application-level versioned scheme with a random nonce and authentication tag, and define the migration boundary explicitly.",
            ],
        code: { language: "csharp", value: encryptionUsage },
      },
      {
        id: sectionIds[4],
        title: zh ? "加密与 MD5 的失败边界" : "Encryption and MD5 failure boundaries",
        bullets: zh
          ? [
              "Encrypt 对 null、空串或纯空白返回 null；它捕获所有加密异常并返回 null，不记录原因",
              "Decrypt 对空输入、非十六进制、错误 key/IV、损坏填充或其他异常统一返回 null；null 不能区分“没有值”“格式坏”“密钥错”或运行故障",
              "调用方必须 fail closed：持久化前确认非 null，读取失败不得继续当作空业务值，也不得把原始明文/密文写日志",
              "ComputeMd5Hash(null) 抛 ArgumentNullException，其他输入返回 32 位小写十六进制 MD5；它只用于既有兼容、非对抗性标识，不能用于密码、签名、令牌或篡改防护",
              "接口没有 CancellationToken、批处理、流式数据、最大明文大小或指标；大 payload、超时与容量限制由应用负责",
            ]
          : [
              "Encrypt returns null for null, empty, or whitespace input; it catches every encryption exception and returns null without recording the cause",
              "Decrypt maps empty input, non-hex text, wrong key/IV, broken padding, and any other exception to null; null cannot distinguish ‘absent’, malformed, wrong-key, or runtime failure",
              "Callers must fail closed: require a non-null result before persistence, never treat a read failure as an empty domain value, and never log raw plaintext or ciphertext",
              "ComputeMd5Hash(null) throws ArgumentNullException; other input returns a 32-character lower-case hexadecimal MD5. Use it only for existing non-adversarial compatibility identifiers, never passwords, signatures, tokens, or tamper protection",
              "The interface has no CancellationToken, batch/streaming path, maximum plaintext size, or metrics. The application owns payload, latency, and capacity limits",
            ],
      },
      {
        id: sectionIds[5],
        title: zh ? "BCrypt 密码存储合同" : "The BCrypt password-storage contract",
        paragraphs: zh
          ? [
              "BcryptPasswordHasher.Hash(password) 使用 BCrypt.Net 与固定默认 work factor 11；显式重载接受 4–31。BCrypt 自带随机盐，因此同一密码会生成不同的 60 字符哈希，只保存哈希，不保存明文、可逆密文或单独 salt。密码长度、复杂度、泄露密码检查、速率限制、锁定与 MFA 不在该 helper 内，必须由身份业务实现。",
              "实现只对 null 调用 ArgumentNullException.ThrowIfNull，空字符串并不会在 Asgard 层被拒绝；接口注释所说的“null 或空”不是当前运行行为。注册/改密入口必须先执行应用密码策略。Verify 对 null 参数抛异常，也没有捕获 BCrypt 库对畸形哈希可能产生的解析异常；登录边界先做受控格式/存储完整性处理，并对外统一返回无凭据枚举信息。",
            ]
          : [
              "BcryptPasswordHasher.Hash(password) uses BCrypt.Net with a fixed default work factor of 11; its explicit overload accepts 4–31. BCrypt includes a random salt, so equal passwords produce different 60-character hashes. Store only the hash—never plaintext, reversible ciphertext, or a separate salt. Password length/complexity, breached-password screening, rate limiting, lockout, and MFA are outside this helper and belong to the identity application.",
              "The implementation applies ArgumentNullException.ThrowIfNull only to null; Asgard does not reject an empty string despite the interface comment saying ‘null or empty’. Registration and password-change paths must enforce application policy first. Verify throws for null arguments and does not catch parsing failures the BCrypt library may raise for malformed stored hashes. Handle storage integrity at the login boundary and return one non-enumerating invalid-credentials result externally.",
            ],
        code: { language: "csharp", value: passwordUsage },
      },
      {
        id: sectionIds[6],
        title: zh ? "验证与渐进式哈希升级" : "Verification and progressive hash upgrades",
        paragraphs: zh
          ? [
              "Verify(password, hash, out needsRehash) 先验证密码；只有成功后才读取哈希位置 4 开始的 cost，并且仅在 cost 小于 11 时把 needsRehash 设为 true。它不会因为 $2a$/$2y$ 版本、高于 11 的 cost、应用自定义目标 cost 或未来算法策略而要求升级；解析不到 cost 时回退成 11，也不会提示升级。",
              "IsValidHashFormat 只检查长度正好 60 且前缀为 $2a$、$2b$ 或 $2y$，不是完整 BCrypt 语法验证。安全升级采用“成功登录后重新 Hash，再以乐观锁/条件更新替换旧哈希”；并发更新要幂等，写失败不影响本次已验证身份但必须可观测。若策略目标不是 11，应用需读取/记录自己的版本元数据，不能依赖当前 needsRehash。",
            ]
          : [
              "Verify(password, hash, out needsRehash) verifies first, then reads the cost starting at position 4. It sets needsRehash only when that cost is below 11. It does not request an upgrade for a $2a$/$2y$ version, a cost above 11, an application-specific target cost, or a future algorithm policy. If cost parsing fails it falls back to 11 and does not request rehash.",
              "IsValidHashFormat checks only an exact length of 60 and a $2a$, $2b$, or $2y$ prefix; it is not a complete BCrypt syntax validator. Upgrade after a successful login by hashing again and replacing the old hash with optimistic/conditional update semantics. Make concurrent updates idempotent; a write failure need not invalidate the already verified login but must be observable. If policy targets anything other than 11, keep application-owned version metadata rather than rely on current needsRehash.",
            ],
      },
      {
        id: sectionIds[7],
        title: zh ? "KeyGenerator 的精确输出" : "Exact KeyGenerator outputs",
        bullets: zh
          ? [
              "CreateAesKeyAndIv 使用 Aes.Create 生成新的 key/IV 并分别返回 Base64；当前运行时默认对应 32 字节 AES key 与 16 字节 IV",
              "CreateHmacSha256Key 创建 HMACSHA256 并返回其随机 key 的 Base64；这只是 key material，不包含 key id、用途、过期或存储",
              "CreateRandomKey(n) 使用 RandomNumberGenerator.GetBytes；n 必须为 1–1024 字节，0、负数或大于 1024 会抛 ArgumentOutOfRangeException",
              "所有输出是 Base64 传输文本，不是密码、JWT、证书或已注册凭据；必须给每个 key 定义单一用途、owner、版本、创建时间、权限和销毁策略",
              "生成后不要回显、记录或返回给不受信任客户端；使用临时内存并尽快写入受控 secret store",
            ]
          : [
              "CreateAesKeyAndIv uses Aes.Create and returns a fresh key and IV separately as Base64; current runtime defaults correspond to a 32-byte AES key and 16-byte IV",
              "CreateHmacSha256Key creates HMACSHA256 and returns its random key as Base64. This is key material only; it carries no key id, purpose, expiry, or storage",
              "CreateRandomKey(n) uses RandomNumberGenerator.GetBytes. n must be 1–1024 bytes; zero, negative, or above 1024 throws ArgumentOutOfRangeException",
              "Every output is Base64 transport text, not a password, JWT, certificate, or registered credential. Assign one purpose, owner, version, creation time, access policy, and destruction policy to each key",
              "Do not echo, log, or return generated material to an untrusted client. Keep it transient and write it promptly to a controlled secret store",
            ],
      },
      {
        id: sectionIds[8],
        title: zh ? "AES 轮换与兼容迁移" : "AES rotation and compatible migration",
        paragraphs: zh
          ? [
              "当前密文没有 key id，服务也只持有一个启动快照。直接替换 Key 或 Iv 并重启会让全部旧密文的 Decrypt 返回 null；KeyGenerator 不会改变这一点。因此不能做“原地换 secret 然后期待自动兼容”，也不能把新旧实例混跑却让它们写入无法互读的无版本密文。",
              "安全轮换要由应用建立带 version/keyId 的 envelope 或独立列：先部署可按版本读取新旧 key、只用新 key 写入的版本；以有界批次重加密旧数据并校验；监控旧版本剩余量；确认回滚窗口与备份；最后撤销旧 key。当前 IEncryptionService 不接受每次调用的 key，也不提供 key ring，因此这需要应用包装器或升级后的加密实现，并在真实数据副本上演练。",
            ]
          : [
              "Current ciphertext contains no key id and the service holds one startup snapshot. Replacing Key or Iv and restarting makes every old ciphertext return null from Decrypt; KeyGenerator does not change that. Never rotate in place and expect automatic compatibility, and never roll old/new instances together while both write unversioned ciphertext they cannot mutually read.",
              "Safe rotation needs an application envelope or separate version/keyId column. Deploy readers for old and new keys while writing only the new version; re-encrypt old rows in bounded verified batches; monitor remaining old versions; confirm backups and rollback window; then revoke the old key. IEncryptionService accepts no per-call key and provides no key ring, so this requires an application wrapper or upgraded encryption implementation and rehearsal on a realistic data copy.",
            ],
      },
      {
        id: sectionIds[9],
        title: zh ? "按数据类别定义失败策略" : "Define failure policy by data class",
        bullets: zh
          ? [
              "启动：缺少/非法 AES 配置应 fail fast；不要用默认、测试或上一次日志里的 key 启动生产",
              "写入：Encrypt 返回 null 时回滚/拒绝该业务写入，记录无 secret 的结构化故障事件；绝不能降级为明文",
              "读取：Decrypt 返回 null 时隔离记录并触发运维告警，不把它映射为空字符串、匿名权限或成功响应",
              "认证：PasswordHasher 缺失、Hash/Verify 异常或哈希损坏时 fail closed，并对客户端使用统一错误；不要自动创建新密码哈希",
              "生成：KeyGenerator 缺失或参数错误属于配置/操作失败；生成重试必须避免把多个无人托管的 key 留在日志或临时文件",
              "MD5：只允许显式登记的 legacy 调用；新安全用途直接拒绝，不做静默兼容",
            ]
          : [
              "Startup: fail fast on absent/invalid AES configuration. Never boot production with a default, test, or key recovered from logs",
              "Write: when Encrypt returns null, reject/roll back the domain write and emit a structured event without secret material. Never fall back to plaintext",
              "Read: quarantine a row and alert operations when Decrypt returns null. Do not map it to an empty string, anonymous privilege, or successful response",
              "Authentication: fail closed when PasswordHasher is absent, Hash/Verify fails, or a stored hash is damaged; use one external error and never create a replacement hash automatically",
              "Generation: an unavailable KeyGenerator or invalid size is an operational/configuration failure. Retrying generation must not leave unowned keys in logs or temporary files",
              "MD5: allow only explicitly inventoried legacy callers. Reject new security uses instead of silently preserving them",
            ],
      },
      {
        id: sectionIds[10],
        title: zh ? "可观测性、审计与最小暴露" : "Observability, audit, and minimum exposure",
        paragraphs: zh
          ? [
              "框架三个实现都没有内建 ILogger、metrics 或审计 sink。应用包装层应按 operation、result、key version、data class、tenant（允许时）记录计数与延迟；日志只能包含记录 ID/不可逆关联摘要、异常类别和受控原因码，不能包含密码、hash、Key、Iv、明文、完整密文或环境变量值。Decrypt 的 null 需要在包装层转换为可区分的内部原因。",
              "审计 key 生成、启用、轮换、导出、回滚和撤销的操作者、审批、时间、用途与版本，但审计载荷不保存 key material。限制生产 secret 的读写主体；把解密权限与普通数据库读取权限分开；定期清点仍使用 MD5/旧 key/低 BCrypt cost 的数据，并对异常失败率、突然批量解密和轮换逾期告警。",
            ]
          : [
              "None of the three framework implementations has a built-in ILogger, metric, or audit sink. An application wrapper should record counts and latency by operation, result, key version, data class, and tenant where allowed. Logs may contain a record id/irreversible correlation digest, exception class, and controlled reason code—never password, hash, Key, Iv, plaintext, full ciphertext, or environment value. Convert Decrypt's null into a distinguishable internal reason at the wrapper boundary.",
              "Audit the actor, approval, time, purpose, and version for key generation, activation, rotation, export, rollback, and revocation, but never key material itself. Minimize production-secret readers/writers, separate decrypt authority from ordinary database read access, inventory data still using MD5/old keys/low BCrypt cost, and alert on abnormal failure rates, sudden bulk decryption, and overdue rotation.",
            ],
      },
      {
        id: sectionIds[11],
        title: zh ? "测试矩阵与上线验收" : "Test matrix and release acceptance",
        paragraphs: zh
          ? [
              "源码现有 SecurityServiceCollectionExtensionsTests 证明配置委托注册、选项快照、一次 AES round trip、配置节缺失和非法 key 长度快速失败；它没有完整覆盖 AES 格式/篡改/错误 key、BCrypt、KeyGenerator、并发、轮换或 Yggdrasil 端到端 secret 注入。绿色单测不能替代这些生产验收。",
              "每次升级 .NET、BCrypt.Net、加密实现或配置加载器时保存不含真实 secret 的固定测试向量，验证上一版本密文仍可读、Hash/Verify/needsRehash 行为、边界异常和多线程 singleton 使用。轮换演练必须包含部分失败、重跑、旧新实例并存、回滚、备份恢复和旧 key 最终撤销证据。",
            ]
          : [
              "Existing SecurityServiceCollectionExtensionsTests prove configure-action registration, option snapshots, one AES round trip, missing-section failure, and invalid key-length failure. They do not comprehensively cover AES format/tamper/wrong-key behavior, BCrypt, KeyGenerator, concurrency, rotation, or end-to-end Yggdrasil secret injection. A green focused test does not replace production acceptance.",
              "Whenever .NET, BCrypt.Net, the encryption implementation, or configuration loader changes, keep non-secret fixed test vectors and prove preceding-version ciphertext remains readable, Hash/Verify/needsRehash behavior, boundary exceptions, and concurrent singleton use. A rotation rehearsal must cover partial failure, rerun, old/new instances together, rollback, backup restore, and evidence that the old key was finally revoked.",
            ],
        code: { language: "text", value: acceptanceCommands },
      },
      {
        id: sectionIds[12],
        title: zh ? "AI Ready 安全工作流" : "AI Ready security workflow",
        paragraphs: zh
          ? [
              "让 Agent 修改安全代码或文档时，先加载 asgard-security；任何 C# 示例再加载 asgard-dotnet-10-csharp-14；涉及 Context 获取时加载 asgard-context-usage，涉及身份密码流时再加载对应 identity/Heimdall Skill。Agent 必须从配置类型、DI 注册、具体实现、宿主调用和测试五层取证，不能把接口注释或 Skill 的理想描述当作运行事实。",
              "Agent 的输入、工具输出和补丁中禁止出现真实 Key、Iv、密码、hash 或密文。评审必须检查是否把 null 失败当空值、是否明文降级、是否误把固定 Iv AES 当 AEAD、是否承诺自动轮换、是否把 MD5 用于安全决策，以及是否为变更补齐双语文档、source contract 与迁移验收。",
            ]
          : [
              "Before an agent changes security code or documentation, load asgard-security; load asgard-dotnet-10-csharp-14 for every C# example; add asgard-context-usage for context access and the relevant identity/Heimdall Skill for password flows. Evidence must span configuration types, DI registration, concrete implementations, host wiring, and tests. Interface comments or an idealized Skill statement alone are not runtime proof.",
              "Never place a real Key, Iv, password, hash, or ciphertext in agent input, tool output, or patches. Review must catch null-as-empty handling, plaintext fallback, claims that fixed-IV AES is AEAD, promises of automatic rotation, MD5 in security decisions, and missing bilingual documentation, source contracts, or migration acceptance for a change.",
            ],
      },
      {
        id: sectionIds[13],
        title: zh ? "源码证据与刷新触发器" : "Source evidence and freshness triggers",
        paragraphs: zh
          ? [
              "本页基于 Asgard 5.1.3 clean commit d1002d1af5478e74669a3f0128ed9d4e43465dc2。维护时先 diff 下列文件；任何节路径、注册入口/生命周期、key/IV 校验、AES 格式/异常、BCrypt cost/升级、随机长度、Context 可空性或宿主装配变化，都要同步中英文、本页测试与 docs-sources module contract。",
              "特别把 XML 注释与实现分别复核：当前 Hash 不拒绝空串，Verify 不把所有无效哈希转换为 false，needsRehash 只比较低于 11，IsValidHashFormat 只是长度/前缀检查。只有代码、主运行路径和测试共同证明后，才能升级能力声明。",
            ]
          : [
              "This page is based on Asgard 5.1.3 clean commit d1002d1af5478e74669a3f0128ed9d4e43465dc2. Diff the files below first. Any change to section path, registration entry/lifetime, key/IV validation, AES format/errors, BCrypt cost/upgrade behavior, random-size bounds, context nullability, or host wiring must update both locales, page tests, and the docs-sources module contract.",
              "Review XML comments separately from implementation. Hash currently does not reject empty strings; Verify does not convert every malformed hash into false; needsRehash only compares below 11; and IsValidHashFormat checks length/prefix only. Upgrade a capability claim only when code, the primary runtime path, and tests prove it together.",
            ],
        code: { language: "text", value: sourceFiles },
      },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "security", label: zh ? "安全能力基础" : "Security capability basics" },
      { product: "asgard", docSlug: "configuration-fields", label: zh ? "配置字段参考" : "Configuration field reference" },
      { product: "asgard", docSlug: "infrastructure", label: zh ? "AsgardContext 与基础设施" : "AsgardContext and infrastructure" },
    ],
  };
}

export const zhAsgardSecurityOperationsDocs: DocPage[] = [makeSecurityOperationsPage("zh")];
export const enAsgardSecurityOperationsDocs: DocPage[] = [makeSecurityOperationsPage("en")];
