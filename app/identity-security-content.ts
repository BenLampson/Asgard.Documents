import type { DocPage } from "./content";

const userTokenCode = `{
  "sub": "user:42",
  "user_id": "42",
  "tenant_id": "7c80e227-ec0d-40bf-9909-e6f8e75ba6bf",
  "token_type": "UserLogin",
  "roles": "[\"admin\"]",
  "permissions": "[\"orders.read\",\"orders.write\"]",
  "scope": "[\"openid\",\"orders\"]"
}`;

const tenantScopeCode = `public async Task ExecuteAsync(Guid tenantId)
{
    using var scope = AsgardContext.TenantScopeFactory
        .CreateScope(tenantId);

    // FreeSql operations in this scope include the tenant filter.
    await orderService.RebuildProjectionAsync();
}`;

const authCode = `[AsgardAuthAnyPermission("orders.read", "orders.admin")]
[HttpGet("{id}")]
public async Task<Response<OrderVo>> GetAsync(string id)
{
    var dto = await orderService.GetAsync(id);

    // AsgardAuth qualifies the caller. The service must still
    // enforce tenant and resource ownership for this order.
    return Success(dto.ToVo());
}

[AsgardAuthMatch(
    "token_type == 'BackendService' && scope has 'orders.sync'")]
[HttpPost("sync")]
public Task<Response> SyncAsync() => service.SyncAsync();`;

const securityYamlCode = `Asgard:
  Encryption:
    Key: "\${env:ASGARD_AES_KEY}"
    Iv: "\${env:ASGARD_AES_IV}"`;

const securityCode = `var passwordHasher = AsgardContext.PasswordHasher
    ?? throw new InvalidOperationException("Password hashing is unavailable.");

string hash = passwordHasher.Hash(password);
bool valid = passwordHasher.Verify(password, hash, out bool needsRehash);

if (valid && needsRehash)
{
    hash = passwordHasher.Hash(password);
}

var encryption = AsgardContext.Encryption
    ?? throw new InvalidOperationException("Encryption is unavailable.");

string cipherText = encryption.Encrypt(plainText)
    ?? throw new InvalidOperationException("Encryption failed.");
string plain = encryption.Decrypt(cipherText)
    ?? throw new InvalidOperationException("Decryption failed.");`;

const securityFieldsCode = `Asgard:Encryption:Key    required Base64; decoded length 16, 24, or 32 bytes
Asgard:Encryption:Iv     required Base64; decoded length exactly 16 bytes

no enabled flag
no default key or IV
standard Yggdrasil host always loads and validates this section`;

const securityApiCode = `IEncryptionService
  Encrypt(string? plainText) -> string?
  Decrypt(string? cipherText) -> string?
  ComputeMd5Hash(string text) -> string

IPasswordHasher
  Hash(string password) -> string
  Hash(string password, int workFactor) -> string
  Verify(string password, string hash) -> bool
  Verify(string password, string hash, out bool needsRehash) -> bool
  IsValidHashFormat(string? hash) -> bool

IKeyGenerator
  CreateAesKeyAndIv() -> (Base64 Key, Base64 Iv)
  CreateHmacSha256Key() -> Base64 string
  CreateRandomKey(int keySizeInBytes) -> Base64 string`;

const keyGenerationCode = `var keyGenerator = AsgardContext.KeyGenerator
    ?? throw new InvalidOperationException("Key generation is unavailable.");

var (key, iv) = keyGenerator.CreateAesKeyAndIv();
string hmacKey = keyGenerator.CreateHmacSha256Key();
string randomKey = keyGenerator.CreateRandomKey(32);

// Send generated secrets directly to a secret manager.
// Never log or return them from a normal application endpoint.`;

const traceYamlCode = `Trace:
  Enabled: true
  CaptureAllRequest: false
  Provider: MySQL
  ConnectionString: "\${env:ASGARD_TRACE_DATABASE}"
  TableName: asgard_trace
  BatchSize: 100
  Period: 2
  RetentionDays: 7
  CleanupIntervalMinutes: 60
  MaxBodyBytes: 65536
  CaptureHeaders: true
  CaptureBody: true
  CaptureIdentity: true`;

const loggingYamlCode = `logging:
  minimumLevel: Information
  console:
    enabled: true
  file:
    enabled: true
    path: logs/asgard-.log
    rollingInterval: Day
    retainedFileCountLimit: 7
    fileSizeLimitBytes: 52428800
  database:
    enabled: false
    provider: MySQL
    connectionString: "\${env:ASGARD_LOG_DATABASE}"
    tableName: asgard_logs
    batchSize: 100
    period: 2
    retentionDays: 30
    cleanupIntervalMinutes: 60`;

const loggingDefaultsCode = `logging.minimumLevel                              Information
logging.console.enabled                         true
logging.console.useColors                       true (currently no effect)
logging.file.enabled                            true
logging.file.path                               logs/log-.txt
logging.file.rollingInterval                    Day
logging.file.retainedFileCountLimit             7
logging.file.fileSizeLimitBytes                 null
logging.database.enabled                        false
logging.database.provider                       MySQL
logging.database.connectionString               ""
logging.database.tableName                      asgard_logs
logging.database.batchSize                      100
logging.database.period                         2 seconds
logging.database.retentionDays                  30 days
logging.database.cleanupIntervalMinutes         60 minutes`;

const traceDefaultsCode = `Trace.Enabled                         false
Trace.CaptureAllRequest               false
Trace.Provider                        MySQL
Trace.ConnectionString                ""
Trace.TableName                       asgard_trace
Trace.BatchSize                       100
Trace.Period                          2 seconds
Trace.RetentionDays                   7 days
Trace.CleanupIntervalMinutes          60 minutes
Trace.MaxBodyBytes                    65536
Trace.CaptureHeaders                  true
Trace.CaptureBody                     true
Trace.CaptureIdentity                 true`;

const traceMatrixCode = `Enabled  CaptureAll  request       persisted  request snapshot
false    any          any           no         no
true     false        normal / 4xx  no         no
true     false        exception/5xx yes        by Capture* flags
true     true         normal / 4xx  yes        no
true     true         exception/5xx yes        by Capture* flags`;

const traceCode = `var trace = AsgardContext.Trace;
trace?.AddNote("Rebuilding the order projection");
trace?.AddTag("order_id", orderId);
trace?.AddBranch("retry", $"attempt={attempt}");`;

export const zhIdentitySecurityDocs: DocPage[] = [
  {
    slug: "identity-and-tenancy",
    group: "身份与安全",
    eyebrow: "IDENTITY + TENANCY",
    title: "身份与租户",
    description: "从标准 Claim 恢复统一身份快照，并在 HTTP 与后台场景中维持租户隔离。",
    sections: [
      { id: "model", title: "统一身份模型", paragraphs: ["Asgard 把令牌 Claim 映射为 AbsAsgardUserInfo，并通过 AbsAsgardContext.IdentityContext 暴露当前身份。业务代码应读取身份上下文，不要在每个服务里重复解析 ClaimsPrincipal。", "tenant_id 是有效 Guid 时身份属于租户用户；缺失或无效时属于平台用户。roles、permissions 与 scope 使用 JSON 数组字符串，userMetadatas 与 tenantMetadata 使用 JSON 对象字符串。"], code: { language: "json", value: userTokenCode } },
      { id: "profiles", title: "令牌 Profile", bullets: ["UserLogin：必需 sub、user_id；推荐 tenant_id、roles、permissions、scope、token_type", "BackendService：必需 sub、client_id、token_type；推荐 tenant_id、scope，并且禁止 user_id", "token_type 使用官方值 UserLogin 或 BackendService", "不要把 /userinfo 当成完整授权快照；API 授权以 Access Token Claim 为准"] },
      { id: "http", title: "HTTP 租户边界", paragraphs: ["宿主认证后由租户中间件建立 ITenantContext，FreeSql GlobalFilter 再把 tenant_id 条件应用到租户实体的查询、更新与删除。tenant_id 必须来自已验证身份，不能信任前端自报 Header。", "平台上下文没有租户时不会自动增加租户过滤；平台接口必须显式约束允许访问的数据范围。"] },
      { id: "background", title: "后台与消息场景", paragraphs: ["后台作业和消息消费者没有天然 HTTP 身份，必须为每个租户创建并释放作用域。作用域同时切换 ITenantContext 与 FreeSql 过滤器，并在释放后恢复原上下文。"], code: { language: "csharp", value: tenantScopeCode }, note: "CreateScope 的当前公开签名接收 Guid。不要把任意字符串直接当成租户标识。" },
    ],
  },
  {
    slug: "authorization",
    group: "身份与安全",
    eyebrow: "ASGARDAUTH",
    title: "授权与策略表达式",
    description: "用属性和 DSL 判断角色、权限、Scope、令牌类型与元数据，同时保留资源级校验。",
    sections: [
      { id: "boundary", title: "授权边界", paragraphs: ["AsgardAuth 判断调用方是否具备进入接口的资格；它不会自动判断某个订单、项目或文件是否属于当前用户或租户。资源归属与数据范围必须由 Service/Repository 继续校验。", "前端权限仅用于改善体验，后端授权才是安全边界。Yggdrasil 默认宿主负责 UseAuthorization；自定义管道必须保证认证、租户与授权顺序正确。"] },
      { id: "attributes", title: "内置属性", bullets: ["AsgardAuthAnyRole / AllRole", "AsgardAuthAnyPermission / AllPermission", "AsgardAuthAnyScope / AllScope", "AsgardAuthUserMetadataEquals / In", "AsgardAuthTenantMetadataEquals / In", "AsgardAuthNameLike 与 AsgardAuthMatch"] },
      { id: "dsl", title: "组合表达式", paragraphs: ["复杂条件使用 AsgardAuthMatch。DSL 可读取 role、permission、scope、token_type、name、metadata.xxx 与 tenant.xxx，并使用 &&、|| 等逻辑运算组合。"], code: { language: "csharp", value: authCode } },
      { id: "diagnose", title: "排查 401 与 403", bullets: ["401：先检查令牌签名、issuer、audience 与过期时间", "403：检查 Claim 的 JSON 形态、token_type 拼写、权限/Scope 与表达式字段", "确认中间件顺序以及接口是否命中预期 AsgardAuth 元数据", "不要通过放宽资源归属检查来解决授权配置错误"] },
    ],
  },
  {
    slug: "security",
    group: "身份与安全",
    eyebrow: "CRYPTOGRAPHY",
    title: "加密、密码与密钥",
    description: "通过上下文使用 AES、BCrypt 与安全随机密钥生成，并以失败关闭方式处理缺失能力。",
    sections: [
      { id: "entries", title: "运行时入口与宿主边界", paragraphs: ["当前 5.1.3 直接从 AbsAsgardContext.Encryption、PasswordHasher 与 KeyGenerator 访问安全能力，不存在 AsgardContext.Security。标准 Yggdrasil 在每次 Build 时无条件加载并注册这三个单例；配置缺失会使启动失败，因此成功运行的标准宿主中它们应当可用。", "AbsAsgardContext 的属性仍是 nullable，因为完全自定义的宿主可以不注册这些服务；库代码应失败关闭，不能退回明文或弱随机。"] },
      { id: "configure", title: "只有 Key 与 IV 两个配置字段", paragraphs: ["Asgard:Encryption 没有 enabled，也没有默认密钥。Key 与 Iv 都通过合并后的配置图读取，适合用环境变量占位符注入；空白、非法 Base64 或错误长度都会在服务注册阶段抛 InvalidOperationException。配置会被复制成启动期快照，不支持动态 reload、密钥版本或多密钥解密。"], code: { language: "yaml", value: securityYamlCode } },
      { id: "fields", title: "字段、默认值与校验", code: { language: "text", value: securityFieldsCode } },
      { id: "api", title: "公开接口", paragraphs: ["Encrypt/Decrypt 对空白输入或任意运行异常返回 null；调用方必须显式检查并停止写入。ComputeMd5Hash 返回 32 位小写十六进制，仅用于兼容性摘要。"], code: { language: "text", value: securityApiCode } },
      { id: "use", title: "密码哈希与加密", paragraphs: ["密码使用 BCrypt Hash/Verify，并在验证成功且 needsRehash=true 时升级哈希。默认工作因子是 11，可显式选择 4..31。可逆 AES 仅用于确实需要恢复的兼容数据，不能代替密码哈希。"], code: { language: "csharp", value: securityCode } },
      { id: "bcrypt-boundaries", title: "BCrypt 当前边界", bullets: ["Hash 和 Verify 只拒绝 null，空字符串仍可进入 BCrypt；业务层必须先实施密码长度与复杂度策略", "needsRehash 只判断存量 cost 是否小于 11，不检测算法版本或其他策略变化", "Verify 不先做格式校验且不捕获畸形 hash 异常；只对可信存储的 hash 调用，并在输入边界处理失败", "IsValidHashFormat 只检查 60 字符长度和 $2a$/$2b$/$2y$ 前缀，不是完整 BCrypt 语法验证"] },
      { id: "key-generation", title: "生成密钥", paragraphs: ["CreateAesKeyAndIv 使用平台 AES 生成 Key/IV；CreateRandomKey 接受 1..1024 字节并使用加密安全 RNG。HMAC key 长度由运行时 HMACSHA256 默认决定，框架没有额外固定为 32 字节。"], code: { language: "csharp", value: keyGenerationCode } },
      { id: "aes-boundaries", title: "AES 格式不是现代 AEAD", bullets: ["当前实现使用平台默认 AES-CBC/PKCS7、固定配置 IV、无随机 nonce、无认证 tag/MAC", "相同 Key/IV 下相同明文会得到相同密文，并且不能可靠检测密文篡改", "输出是大写十六进制；没有算法版本、Key ID 或轮换信封", "它适合读取现有兼容密文，不应作为高敏感新设计的默认格式；新设计优先使用带随机 nonce 的 AES-GCM 等 AEAD", "轮换前必须设计版本化密文信封、双读旧 Key 与批量迁移；不能直接替换配置后期待旧密文可解"] },
      { id: "rules", title: "安全规则", bullets: ["任何加解密 null 都视为失败并停止流程，绝不回退明文", "密钥、IV、口令、明文与生成结果不得写入日志或 Trace", "密钥只进入部署 Secret Manager，最小化读取权限并记录轮换审计", "MD5 仅用于非安全兼容摘要，不用于密码、签名或完整性安全", "注册服务不等于提供密钥生命周期管理；备份、轮换、吊销和灾难恢复由部署系统负责"] },
    ],
  },
  {
    slug: "observability",
    group: "身份与安全",
    eyebrow: "TRACE + LOGGING",
    title: "追踪与可观测性",
    description: "记录可信的请求步骤、业务线索和错误快照，为运维排障与 AI 回放提供上下文。",
    sections: [
      { id: "model", title: "轻量请求追踪", paragraphs: ["Asgard Trace 为每个请求建立可信链路：框架记录内部步骤，业务侧只能通过 IAsgardTraceContext 追加备注、标签和分支，不能修改框架步骤。它不是审计日志、完整调用栈或任意对象转储。"], code: { language: "csharp", value: traceCode } },
      { id: "logging", title: "Serilog 配置", paragraphs: ["LogConfig 没有 logging.enabled。默认即开启 Console 与 File，因此不写配置也会输出控制台并写入 logs/log-.txt；需要关闭时分别设置 sink 的 enabled。文件 path 应写明确文件模板，不要只写一个可能尚不存在的目录。"], code: { language: "yaml", value: loggingYamlCode } },
      { id: "logging-defaults", title: "Logging 字段与默认值", paragraphs: ["minimumLevel 支持 Verbose、Debug、Information、Warning、Error、Fatal。rollingInterval 支持 Infinite、Year、Month、Day、Hour、Minute。console.useColors 当前不改变输出；logging.database.outputTemplate 当前也没有传入数据库 Sink。"], code: { language: "text", value: loggingDefaultsCode } },
      { id: "persist", title: "Trace 独立持久化", paragraphs: ["Trace 使用独立 FreeSql 连接和 asgard_trace 表，不复用业务数据库、仓储或租户过滤。Trace.Enabled 只控制独立数据库持久化：即使为 false，宿主仍建立请求 Trace 上下文并为每个请求写 AsgardTrace 汇总日志。只有异常或 HTTP 5xx 算错误快照，4xx 不算。"], code: { language: "yaml", value: traceYamlCode } },
      { id: "trace-defaults", title: "Trace 字段与持久化矩阵", paragraphs: ["CaptureAllRequest 让正常请求也落库，但正常请求仍不保存 Header、Body 或身份快照；这些 Capture 开关只作用于异常/5xx。"], code: { language: "text", value: `${traceDefaultsCode}\n\n${traceMatrixCode}` } },
      { id: "query", title: "查询接口归插件所有", paragraphs: ["框架总是注册 ITraceQueryService 与 IDatabaseLogQueryService，但不自动暴露 Controller；对应持久化未启用时，首次查询会抛 InvalidOperationException。插件应自行定义路由、VO 字段、查询审计和授权，例如 observability.trace.read。详情对象包含异常栈、属性 JSON、快照与业务 Trace 内容，不能原样公开。"] },
      { id: "safe", title: "安全与 AI 回放", bullets: ["已知敏感 Header 名和成功解析的 JSON 属性会尽力替换为 ***", "QueryString 始终原样保存；非 JSON、截断或解析失败的 Body 会原样 Base64 保存；X-Api-Key 等名称仍可能漏过 Header 掩码", "异常、普通数据库日志、Trace tags、notes、branches 与 step payload 不自动脱敏，调用方不得写入令牌、密码、密钥或个人敏感信息", "用最少且稳定的非敏感标签支持 AI 检索；详情接口必须授权、裁剪 VO 并记录查询审计", "错误快照可辅助 AI 复现上下文，但源码、配置与真实运行证据仍是最终事实源"] },
      { id: "operations", title: "队列、清理与关机边界", bullets: ["数据库日志与 Trace 分别创建独立 FreeSql、同步表结构并使用无界 Channel 批量写入；不能把它们当成有背压的可靠审计队列", "保留期清理只在成功写入批次后触发；没有新记录时不会定时清理过期数据", "写入 worker 主循环故障后队列可能继续增长；必须监控 SelfLog、表增长和写入延迟", "当前宿主没有可靠证据保证 Trace store 在关机时一定释放并冲刷尾批；重要审计数据应进入专用可靠系统"] },
    ],
  },
];

export const enIdentitySecurityDocs: DocPage[] = [
  {
    slug: "identity-and-tenancy", group: "Identity & Security", eyebrow: "IDENTITY + TENANCY", title: "Identity and tenancy", description: "Restore a unified identity snapshot from standard claims and preserve tenant isolation in HTTP and background work.", sections: [
      { id: "model", title: "Unified identity model", paragraphs: ["Asgard maps token claims into AbsAsgardUserInfo and exposes the current identity through AbsAsgardContext.IdentityContext. Business services should consume that context instead of repeatedly parsing ClaimsPrincipal.", "A valid Guid tenant_id produces a tenant user; a missing or invalid value produces a platform user. roles, permissions, and scope are JSON array strings, while userMetadatas and tenantMetadata are JSON object strings."], code: { language: "json", value: userTokenCode } },
      { id: "profiles", title: "Token profiles", bullets: ["UserLogin requires sub and user_id; tenant_id, roles, permissions, scope, and token_type are recommended", "BackendService requires sub, client_id, and token_type; tenant_id and scope are recommended, and user_id is forbidden", "Official token_type values are UserLogin and BackendService", "Do not treat /userinfo as a complete authorization snapshot; APIs authorize from access-token claims"] },
      { id: "http", title: "HTTP tenant boundary", paragraphs: ["After authentication, tenant middleware establishes ITenantContext and FreeSql GlobalFilter applies tenant conditions to tenant-entity queries, updates, and deletes. tenant_id must come from validated identity, never a self-reported frontend header.", "Platform contexts do not receive an automatic tenant filter. Platform endpoints must explicitly constrain their permitted data range."] },
      { id: "background", title: "Background and message handlers", paragraphs: ["Jobs and message consumers have no implicit HTTP identity, so create and dispose one scope per tenant. The scope switches both ITenantContext and the FreeSql filter, then restores the previous context when disposed."], code: { language: "csharp", value: tenantScopeCode }, note: "The current CreateScope signature accepts a Guid. Never pass an arbitrary string as a tenant identifier." },
    ],
  },
  {
    slug: "authorization", group: "Identity & Security", eyebrow: "ASGARDAUTH", title: "Authorization and policy expressions", description: "Evaluate roles, permissions, scopes, token type, and metadata with attributes and DSL while retaining resource-level checks.", sections: [
      { id: "boundary", title: "Authorization boundary", paragraphs: ["AsgardAuth decides whether a caller qualifies to enter an endpoint. It does not decide whether a particular order, project, or file belongs to that user or tenant. Services and repositories must still enforce resource ownership and data scope.", "Frontend checks are UX only; backend authorization is the security boundary. Yggdrasil's default host wires UseAuthorization, while custom pipelines must preserve authentication, tenancy, and authorization order."] },
      { id: "attributes", title: "Built-in attributes", bullets: ["AsgardAuthAnyRole / AllRole", "AsgardAuthAnyPermission / AllPermission", "AsgardAuthAnyScope / AllScope", "AsgardAuthUserMetadataEquals / In", "AsgardAuthTenantMetadataEquals / In", "AsgardAuthNameLike and AsgardAuthMatch"] },
      { id: "dsl", title: "Combined expressions", paragraphs: ["Use AsgardAuthMatch for complex conditions. The DSL can read role, permission, scope, token_type, name, metadata.xxx, and tenant.xxx and combine them with logical operators such as && and ||."], code: { language: "csharp", value: authCode } },
      { id: "diagnose", title: "Diagnose 401 and 403", bullets: ["401: verify signature, issuer, audience, and expiration", "403: verify JSON claim shapes, token_type spelling, permissions/scopes, and expression fields", "Confirm middleware order and the AsgardAuth metadata selected for the endpoint", "Never fix policy configuration by weakening resource ownership checks"] },
    ],
  },
  {
    slug: "security", group: "Identity & Security", eyebrow: "CRYPTOGRAPHY", title: "Encryption, passwords, and keys", description: "Use AES, BCrypt, and secure key generation through the context while understanding the shipped format and lifecycle boundaries.", sections: [
      { id: "entries", title: "Runtime entry points and host boundary", paragraphs: ["Asgard 5.1.3 exposes AbsAsgardContext.Encryption, PasswordHasher, and KeyGenerator directly; there is no AsgardContext.Security layer. Standard Yggdrasil always loads and registers all three singletons during Build. Missing encryption configuration fails startup, so they should exist in a successfully running standard host.", "The AbsAsgardContext properties remain nullable because a fully custom host can omit registration. Library code should fail closed and never fall back to plaintext or weak randomness."] },
      { id: "configure", title: "Only Key and IV are configured", paragraphs: ["Asgard:Encryption has no enabled flag and no default key. Key and Iv load through the merged configuration graph and should be injected with environment placeholders. Blank values, invalid Base64, or wrong decoded lengths throw InvalidOperationException during service registration. The validated configuration is a startup snapshot with no dynamic reload, key version, or multi-key decryption."], code: { language: "yaml", value: securityYamlCode } },
      { id: "fields", title: "Fields, defaults, and validation", code: { language: "text", value: securityFieldsCode } },
      { id: "api", title: "Public API", paragraphs: ["Encrypt/Decrypt return null for blank input or any runtime failure. Callers must test the result and stop the write. ComputeMd5Hash returns 32 lowercase hexadecimal characters and is compatibility-only."], code: { language: "text", value: securityApiCode } },
      { id: "use", title: "Password hashing and encryption", paragraphs: ["Passwords use BCrypt Hash/Verify and are upgraded after a successful verification when needsRehash=true. The default work factor is 11; an explicit factor may be 4..31. Reversible AES is for compatible recoverable data and never replaces password hashing."], code: { language: "csharp", value: securityCode } },
      { id: "bcrypt-boundaries", title: "Current BCrypt boundaries", bullets: ["Hash and Verify reject null only; an empty password still reaches BCrypt, so the application must enforce password length and policy first", "needsRehash only detects a stored cost below 11, not algorithm-version or other policy changes", "Verify does not prevalidate or catch malformed-hash failures; call it only for trusted stored hashes and handle failure at the boundary", "IsValidHashFormat checks only length 60 and a $2a$/$2b$/$2y$ prefix; it is not full BCrypt syntax validation"] },
      { id: "key-generation", title: "Generate keys", paragraphs: ["CreateAesKeyAndIv uses the platform AES generator. CreateRandomKey accepts 1..1024 bytes and uses a cryptographically secure RNG. The HMAC key length follows the runtime HMACSHA256 default; Asgard does not separately pin it to 32 bytes."], code: { language: "csharp", value: keyGenerationCode } },
      { id: "aes-boundaries", title: "The AES format is not modern AEAD", bullets: ["The implementation uses platform-default AES-CBC/PKCS7 with one configured IV, no random nonce, and no authentication tag/MAC", "Equal plaintext under the same Key/IV produces equal ciphertext, and ciphertext tampering is not reliably detected", "Output is uppercase hexadecimal with no algorithm version, Key ID, or rotation envelope", "Treat it as a compatibility format, not the default for new high-sensitivity designs; prefer an AEAD such as AES-GCM with a random nonce", "Before rotation, design a versioned envelope, dual-read old keys, and a migration; replacing configuration alone makes old ciphertext unreadable"] },
      { id: "rules", title: "Security rules", bullets: ["Treat every encryption/decryption null as failure and stop; never fall back to plaintext", "Never write keys, IVs, passwords, plaintext, or generated secrets to logs or traces", "Send secrets to a deployment secret manager, minimize read access, and audit rotation", "MD5 is only for non-security compatibility digests, never passwords, signatures, or integrity protection", "Service registration is not key lifecycle management; deployment owns backup, rotation, revocation, and disaster recovery"] },
    ],
  },
  {
    slug: "observability", group: "Identity & Security", eyebrow: "TRACE + LOGGING", title: "Tracing and observability", description: "Capture trusted request steps, business clues, and error snapshots for operations and AI-assisted replay.", sections: [
      { id: "model", title: "Lightweight request tracing", paragraphs: ["Asgard Trace creates a trusted request chain: the framework records internal steps, while business code can only append notes, tags, and branches through IAsgardTraceContext. It cannot modify framework steps. Trace is not an audit log, complete call stack, or arbitrary object dump."], code: { language: "csharp", value: traceCode } },
      { id: "logging", title: "Serilog configuration", paragraphs: ["LogConfig has no logging.enabled field. Console and File are enabled by default, so an omitted configuration still writes to the console and logs/log-.txt. Disable sinks individually. Give file.path an explicit file template rather than an ambiguous directory that may not exist yet."], code: { language: "yaml", value: loggingYamlCode } },
      { id: "logging-defaults", title: "Logging fields and defaults", paragraphs: ["minimumLevel accepts Verbose, Debug, Information, Warning, Error, or Fatal. rollingInterval accepts Infinite, Year, Month, Day, Hour, or Minute. console.useColors currently changes no wiring, and logging.database.outputTemplate is not passed into the database sink."], code: { language: "text", value: loggingDefaultsCode } },
      { id: "persist", title: "Independent Trace persistence", paragraphs: ["Trace uses an independent FreeSql connection and asgard_trace table; it does not reuse business databases, repositories, or tenant filters. Trace.Enabled controls independent database persistence only. Even when false, the host creates request Trace context and writes one AsgardTrace summary log per request. Only exceptions and HTTP 5xx count as error snapshots; 4xx does not."], code: { language: "yaml", value: traceYamlCode } },
      { id: "trace-defaults", title: "Trace fields and persistence matrix", paragraphs: ["CaptureAllRequest persists normal requests but still omits headers, body, and identity snapshots for them. The Capture flags apply only to exception/5xx snapshots."], code: { language: "text", value: `${traceDefaultsCode}\n\n${traceMatrixCode}` } },
      { id: "query", title: "Query APIs belong to plugins", paragraphs: ["The framework always registers ITraceQueryService and IDatabaseLogQueryService but exposes no controller. The first query throws InvalidOperationException when its persistence feature is disabled. Plugins own routes, projected VO fields, query auditing, and authorization such as observability.trace.read. Detail objects include exception stacks, properties JSON, snapshots, and business Trace content and must not be exposed verbatim."] },
      { id: "safe", title: "Safety and AI replay", bullets: ["Known sensitive header names and successfully parsed JSON properties are best-effort replaced with ***", "QueryString is stored verbatim; non-JSON, truncated, or unparseable bodies are stored as raw Base64; names such as X-Api-Key can escape header masking", "Exceptions, ordinary database logs, Trace tags, notes, branches, and step payloads are not automatically masked; callers must omit tokens, passwords, keys, and personal secrets", "Use minimal stable non-sensitive tags for AI retrieval; authorize detail endpoints, project safe VOs, and audit queries", "Error snapshots can assist AI reconstruction, but source, configuration, and runtime evidence remain authoritative"] },
      { id: "operations", title: "Queue, cleanup, and shutdown boundaries", bullets: ["Database logging and Trace each create an independent FreeSql, sync their table, and batch through an unbounded Channel; neither is a backpressured reliable audit queue", "Retention cleanup runs only after a successful write batch; expired rows are not cleaned on an idle database", "A writer-loop failure can leave the queue growing; monitor SelfLog, table growth, and write lag", "The current host provides no reliable evidence that the Trace store is disposed and its tail batch flushed at shutdown; route critical audit events to a dedicated reliable system"] },
    ],
  },
];
