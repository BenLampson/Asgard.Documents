import type { DocPage } from "./content";

type Locale = "zh" | "en";

const directTlsYaml = `host:
  kestrel:
    endpoints:
      https:
        url: https://0.0.0.0:8443
        certificate:
          path: /run/secrets/asgard-api.pfx
          password: "\${env:ASGARD_PFX_PASSWORD}"
    limits:
      maxRequestBodySize: 104857600
      maxConcurrentConnections: 1000
      maxConcurrentUpgradedConnections: 100
      requestHeadersTimeoutSeconds: 30`;

const proxyYaml = `host:
  kestrel:
    endpoints:
      http:
        url: http://0.0.0.0:8080
    # Omit limits to retain Kestrel defaults, or configure every intended value.`;

const socketChecks = `# On the host/container namespace: prove the actual listening sockets.
ss -ltnp | grep -E ':(8080|8443)\\b'

# Direct TLS: verify handshake, certificate chain, hostname, and expiry.
openssl s_client -connect 127.0.0.1:8443 -servername api.example.com -verify_return_error </dev/null
curl --fail --resolve api.example.com:8443:127.0.0.1 https://api.example.com:8443/health/live

# Proxy termination: backend stays HTTP and is unreachable from the public network.
curl --fail http://127.0.0.1:8080/health/live
curl --fail https://api.example.com/health/live`;

const sourceFiles = `Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs
Common/Asgard.Abstractions.AspNetCore/Host/KestrelOptions.cs
Common/Asgard.Abstractions.AspNetCore/Host/KestrelLimitsOptions.cs
Common/Asgard.Abstractions.AspNetCore/Host/EndpointOptions.cs
Common/Asgard.Abstractions.AspNetCore/Host/CertificateOptions.cs
Common/Asgard.Core/SystemConfig/YamlConfigBinder.cs
Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.HostConfiguration.cs
Test/Asgard.AspNetCore.Core.Tests/SystemConfig/HostConfigLoaderTests.cs
Test/Asgard.Yggdrasil.AspNetCore.Tests/YggdrasilHostBuilderTests.cs`;

const ids = ["contract", "absent-present", "endpoints", "direct-tls", "proxy-tls", "limits", "failure-diagnostics", "rotation", "acceptance", "ai-ready-sources"] as const;

function makePage(locale: Locale): DocPage {
  const zh = locale === "zh";
  return {
    slug: "kestrel-tls-operations",
    group: zh ? "宿主运行时" : "Host Runtime",
    eyebrow: "ASGARD 5.1.3 · NETWORK EDGE",
    title: zh ? "Kestrel 监听、TLS 与容量边界" : "Kestrel listeners, TLS, and capacity boundaries",
    description: zh
      ? "从实际 socket 而不是配置意图验收 Asgard 监听地址、PFX TLS、代理隔离与连接限制。"
      : "Accept Asgard listener addresses, PFX TLS, proxy isolation, and connection limits from real sockets rather than configuration intent.",
    sections: [
      { id: ids[0], title: zh ? "运行时合同" : "Runtime contract", paragraphs: [zh ? "Asgard 5.1.3 只从 host.kestrel.endpoints.*.url 创建监听器；不存在 host.port。每个 endpoint 名称只是字典键，不参与 socket 或 Host header 绑定。实现从绝对 URI 读取 scheme、host 与 port，但忽略 URI path、query 和 fragment。" : "Asgard 5.1.3 creates listeners only from host.kestrel.endpoints.*.url; host.port does not exist. An endpoint name is only a dictionary key and does not bind a socket or Host header. The implementation reads scheme, host, and port from an absolute URI but ignores its path, query, and fragment.", zh ? "只有 scheme 精确为 https 时调用 UseHttps(PFX path, password)；其他 scheme 都进入明文监听分支。发布配置只应使用 http 或 https，并由真实连接验证。" : "Only an exact https scheme calls UseHttps(PFX path, password); every other scheme enters the plaintext listener branch. Published configuration should use only http or https and must be verified through a real connection."] },
      { id: ids[1], title: zh ? "节点缺失与节点存在不是一回事" : "Absent and present nodes differ", paragraphs: [zh ? "host.kestrel 本身由 HostConfig 始终创建；endpoints 默认含 http://localhost:5000。完全省略 limits 时，KestrelLimitsOptions 为 null，Asgard 不写入任何 limits，运行时使用 ASP.NET Core/Kestrel 自身默认值。" : "HostConfig always creates host.kestrel, and endpoints defaults to http://localhost:5000. When limits is absent, KestrelLimitsOptions remains null and Asgard writes no limits, leaving ASP.NET Core/Kestrel runtime defaults in effect.", zh ? "一旦创建 limits 节点，绑定器为 maxRequestBodySize、maxConcurrentConnections 与 requestHeadersTimeoutSeconds 应用属性默认值 104857600、1000 与 30；maxConcurrentUpgradedConnections 没有属性默认值，保持 CLR 0，而 Validate 要求它大于 0。因此只写 limits: {} 或只改请求体大小会在启动配置校验失败。生产应显式写出四个正值，避免隐式差异。" : "Once limits exists, the binder applies attribute defaults 104857600, 1000, and 30 to maxRequestBodySize, maxConcurrentConnections, and requestHeadersTimeoutSeconds. maxConcurrentUpgradedConnections has no attribute default, remains CLR 0, and Validate requires it to be positive. Therefore limits: {} or a node changing only body size fails configuration validation. Publish all four positive values explicitly to avoid implicit differences."], code: { language: "yaml", value: directTlsYaml } },
      { id: ids[2], title: zh ? "监听地址与 hostname 陷阱" : "Listener addresses and the hostname trap", bullets: zh ? ["host=localhost 调用 ListenLocalhost；它不是公网监听声明", "host=* 或 + 调用 ListenAnyIP", "可解析 IP 调用 Listen(address, port)", "任何其他 hostname，包括 api.internal.example，都会静默退化为 ListenAnyIP；它不会解析 DNS，也不会绑定 Host header", "多个 endpoint 若竞争同一地址/端口会在 Kestrel 启动期暴露绑定失败；配置 Validate 不做冲突检查", "容器内 0.0.0.0 仍需结合端口发布、Security Group、主机防火墙与代理网络判断公网暴露"] : ["host=localhost calls ListenLocalhost; it is not a public-listener declaration", "host=* or + calls ListenAnyIP", "A parseable IP calls Listen(address, port)", "Any other hostname, including api.internal.example, silently falls back to ListenAnyIP; it neither resolves DNS nor binds a Host header", "Endpoints competing for one address/port fail during Kestrel startup; configuration Validate performs no collision check", "0.0.0.0 inside a container must be evaluated together with published ports, security groups, host firewall, and proxy network exposure"] },
      { id: ids[3], title: zh ? "Kestrel 直接终止 TLS" : "Terminate TLS directly in Kestrel", paragraphs: [zh ? "HTTPS endpoint 只在配置校验时检查 certificate.path 非空。文件是否存在、PFX 是否有效、password 是否正确、私钥是否可用、证书是否过期或匹配域名，都要到 UseHttps/Kestrel 启动或真实握手才暴露。Password 可以为空且不会被 Validate 拒绝。" : "HTTPS validation checks only that certificate.path is non-empty. File existence, PFX validity, password correctness, private-key availability, expiry, and hostname match surface only during UseHttps/Kestrel startup or a real handshake. Password may be empty and is not rejected by Validate.", zh ? "PFX 以只读 Secret 挂载，密码通过部署 Secret 注入；不要写入 app.yaml、日志、Trace 或镜像层。证书文件和密码必须作为同一版本化变更切换。" : "Mount the PFX as a read-only secret and inject its password from deployment secret management. Never place either in app.yaml, logs, Trace, or image layers. Rotate certificate file and password as one versioned change."], code: { language: "yaml", value: directTlsYaml } },
      { id: ids[4], title: zh ? "代理终止 TLS" : "Terminate TLS at a proxy", paragraphs: [zh ? "常见生产拓扑是在唯一可信代理终止 HTTPS，Kestrel 只在隔离网络监听 HTTP。Asgard 5.1.3 stock host 没有已验证的 UseForwardedHeaders、KnownProxies 或 KnownNetworks 接线，因此代理发送 X-Forwarded-* 不证明应用安全消费了它。" : "A common production topology terminates HTTPS at one trusted proxy and keeps Kestrel HTTP-only on an isolated network. The Asgard 5.1.3 stock host has no verified UseForwardedHeaders, KnownProxies, or KnownNetworks wiring, so a proxy sending X-Forwarded-* does not prove safe application consumption.", zh ? "Cookie Secure、重定向或绝对 URL 若依赖恢复后的 Scheme/Host，需要定制更早的宿主边界或经过验证的托管平台。无论如何，公网必须无法绕过代理直达 Kestrel。" : "Cookies, redirects, or absolute URLs that depend on restored Scheme/Host require a customized earlier host boundary or a verified managed-platform equivalent. In every design, the public network must be unable to bypass the proxy and reach Kestrel."], code: { language: "yaml", value: proxyYaml } },
      { id: ids[5], title: zh ? "容量限制的真实含义" : "What the capacity limits actually control", bullets: zh ? ["maxRequestBodySize 写入 Kestrel 全局请求体上限；业务上传、代理 body limit 与 Controller 限制还要单独对齐", "maxConcurrentConnections 是每个进程的连接上限，不是请求 QPS、租户配额或集群总量", "maxConcurrentUpgradedConnections 限制 WebSocket 等升级连接，并且 present limits 节点必须显式给正值", "requestHeadersTimeoutSeconds 只限制收完请求头的时间，不是整个请求、响应、数据库或下游超时", "所有限制都是单实例；代理、负载均衡和多副本会形成额外边界"] : ["maxRequestBodySize sets Kestrel's global request-body limit; align business uploads, proxy body limits, and controller-specific limits separately", "maxConcurrentConnections is a per-process connection limit, not request QPS, tenant quota, or cluster capacity", "maxConcurrentUpgradedConnections covers upgraded connections such as WebSockets and must be explicitly positive when limits exists", "requestHeadersTimeoutSeconds limits time to receive request headers, not whole-request, response, database, or downstream time", "Every limit is per instance; proxies, load balancers, and replicas add independent boundaries"] },
      { id: ids[6], title: zh ? "启动与运行故障诊断" : "Startup and runtime diagnostics", bullets: zh ? ["配置加载失败：先区分 limits present 的 0 值验证、空 endpoint URL 和空 HTTPS certificate.path", "UriFormatException：url 不是绝对 URI；配置校验只检查非空，URI 解析发生在宿主配置阶段", "Address already in use / permission denied：核对同进程重复 endpoint、旧进程、保留端口与容器端口映射", "PFX/密码/私钥错误：将其视为发布失败，不要降级为明文 endpoint", "请求体 413、连接拒绝、请求头超时和代理 502 要分别定位是代理、Kestrel 还是应用层边界", "日志显示 Listening on 不能代替从目标网络命名空间实际连接"] : ["Configuration failure: distinguish present-limits zero validation, empty endpoint URL, and empty HTTPS certificate.path", "UriFormatException: url is not absolute; Validate checks only non-empty and URI parsing occurs during host configuration", "Address already in use / permission denied: inspect duplicate endpoints, old processes, privileged ports, and container publishing", "PFX/password/private-key error: fail the release; never degrade to a plaintext endpoint", "Diagnose 413, connection refusal, header timeout, and proxy 502 separately across proxy, Kestrel, and application boundaries", "A Listening on log line does not replace a real connection from the target network namespace"] },
      { id: ids[7], title: zh ? "证书轮换与回滚" : "Certificate rotation and rollback", paragraphs: [zh ? "当前配置没有证书热重载或轮换管理器的已验证接线。构建新不可变 release/Secret 版本，在 canary 上完成握手与域名验证，再滚动替换进程。保留旧 PFX、密码 Secret 版本与匹配配置，直到新证书稳定。" : "The current configuration has no verified certificate hot-reload or rotation-manager wiring. Build a new immutable release/secret version, complete handshake and hostname checks on a canary, then roll processes. Retain the old PFX, password-secret version, and matching configuration until the new certificate is stable.", zh ? "证书回滚恢复文件和密码的匹配组合；仅回滚其中一个会导致启动失败。代理终止 TLS 时，代理证书生命周期不由 Asgard 管理。" : "Certificate rollback restores the matching file/password pair; reverting only one can prevent startup. When a proxy terminates TLS, its certificate lifecycle is outside Asgard." ] },
      { id: ids[8], title: zh ? "真实上线验收" : "Real go-live acceptance", bullets: zh ? ["从宿主/容器内部列出监听 socket，证明地址族、端口和进程", "从代理网络连接 Kestrel；从公网证明后端端口不可达", "直接 TLS 时验证完整链、SNI 域名、有效期、私钥与真实 HTTPS health", "代理 TLS 时同时验证公网 HTTPS 与后端 HTTP，确认不能绕过代理", "发送刚低于/高于 body limit 的请求，并压测普通连接与升级连接边界", "发送慢请求头验证 timeout；多副本分别观察单实例限制", "SIGTERM、证书错误、端口占用与旧 Secret 回滚都必须演练"] : ["List listening sockets inside the host/container namespace and prove address family, port, and process", "Connect to Kestrel from the proxy network and prove the backend port is unreachable publicly", "For direct TLS, verify chain, SNI hostname, expiry, private key, and a real HTTPS health request", "For proxy TLS, verify public HTTPS and backend HTTP together and prove the proxy cannot be bypassed", "Send requests just below/above the body limit and load-test normal and upgraded connection boundaries", "Send slow headers to verify timeout and observe per-instance limits across replicas", "Rehearse SIGTERM, certificate failure, port collision, and rollback to the old secret"], code: { language: "bash", value: socketChecks } },
      { id: ids[9], title: zh ? "AI Ready 与源码证据" : "AI Ready and source evidence", paragraphs: [zh ? "Agent 修改宿主监听时先加载 asgard-host-features、asgard-host-project、asgard-configuration 与 asgard-security。必须同时核对配置类型、绑定器、Validate 和 ConfigureKestrel 主运行路径，不能从字段注释推断 DNS、Host header、热重载或代理支持。" : "Agents changing host listeners must load asgard-host-features, asgard-host-project, asgard-configuration, and asgard-security. Check configuration types, binder, Validate, and the primary ConfigureKestrel path together; field comments do not prove DNS, Host-header binding, hot reload, or proxy support.", zh ? "维护本页时 diff 下列文件；默认值、验证、hostname 分支、UseHttps、限制接线或测试变化时，中英文、源码合同与验收矩阵一起更新。" : "Diff these files when maintaining this page. Update both locales, source contract, and acceptance matrix when defaults, validation, hostname branches, UseHttps, limit wiring, or tests change."], code: { language: "text", value: sourceFiles } },
    ],
    relatedDocs: [
      { product: "asgard", docSlug: "deployment", label: zh ? "生产部署" : "Production deployment" },
      { product: "asgard", docSlug: "health-and-rate-limiting", label: zh ? "健康与限流" : "Health and rate limiting" },
      { product: "asgard", docSlug: "configuration-reference", label: zh ? "配置根合同" : "Configuration root contract" },
    ],
  };
}

export const zhAsgardKestrelTlsOperationsDocs: DocPage[] = [makePage("zh")];
export const enAsgardKestrelTlsOperationsDocs: DocPage[] = [makePage("en")];
