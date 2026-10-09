---
title: "安全、身份与租户授权"
description: "让令牌验证、权限检查和数据隔离各自守住边界"
order: 60
section: "开发指南"
---

安全接入包含三个独立问题：请求是谁发出的、是否有权限执行动作、是否能访问这条数据。JWT 验证、AsgardAuth 与租户数据范围分别处理这些边界，不能相互替代。

## 配置 JWT 资源 API

```yaml
host:
  auth:
    enabled: true
    jwt:
      issuerTemplate: "https://id.example.com/{tenant}/"
      audience: "orders-api"
      requireHttpsMetadata: true
      discoveryCacheMinutes: 60
      jwksCacheMinutes: 15
```

此配置面向租户 issuer 的签名 JWT。模板中必须恰好包含一个 `{tenant}`。宿主先检查不可信 token 中的 issuer 是否匹配模板，命中后才请求该 issuer 的 Discovery 和 JWKS。

验证包括 issuer、audience、签名与有效期；audience 按大小写敏感的精确值匹配，时钟偏移容差设置为零。部署节点需要可靠时钟同步。`requireHttpsMetadata` 生产环境保持 `true`。

只向 API 发送 **Access Token**。ID Token 是客户端登录结果；opaque Access Token 也不能通过此本地 JWT 验证路径。平台根 issuer 或同时接受平台与租户 issuer，需要单独设计认证方案，不能塞入这个租户模板。

### Asgard 令牌必需声明

签名、Issuer、Audience 和有效期通过还不够。`OnTokenValidated` 还会调用 `AsgardTokenConventionValidator`；约定校验失败会让认证失败，并可在受保护端点产生 HTTP 401。

| 声明契约 | 当前校验行为 |
| --- | --- |
| 所有令牌 | `sub` 必须存在且非空白 |
| 解析结果为 `BackendService` | `client_id` 必须非空白，且 `user_id` 不能包含非空白值 |
| 原始 `token_type` 精确为 `UserLogin` | `user_id` 必须存在且非空白 |

类型解析优先对显式 `token_type` 做大小写不敏感的枚举解析。缺失、空白或无法解析时，如果 `client_id` 非空白且 `user_id` 缺失/空白，就推断为 `BackendService`；否则推断为 `UserLogin`。该校验器不会新增 `token_type` 声明，也不会从 `sub` 派生 `user_id`。

用户登录的额外校验比类型解析更窄：它把原始声明与大小写敏感的精确字符串 `UserLogin` 比较。因此，当前实现不会对推断出的用户登录令牌或其他大小写写法执行这项 `user_id` 必填检查。签发时应使用规范写法 `UserLogin` 或 `BackendService` 并提供相应必需声明，不要把这处兼容差异当作身份契约。

## 与 Heimdall 对接

浏览器应用使用 Authorization Code + PKCE，并作为不持有 Client Secret 的 public client。资源 API 使用自己的 audience，例如 `orders-api`。

在 Heimdall，为租户 Scope 配置目标 API 的 `Resources` 值，并让客户端被允许且实际请求这个 Scope。只注册客户端或只填写 Asgard audience 不会自动让令牌拥有该资源 audience。登录、令牌签发与 API 验证分别测试，详见[Heimdall 安全指南](/zh/heimdall/docs/security/)。

> [!WARNING]
> 本地 Discovery/JWKS 验证不会逐请求查询身份平台的撤销状态。退出登录或撤销会话，不等于外部 API 已立即拒绝尚未过期的 JWT；需要即时失效时，设计并验证额外机制。

## 权限检查

- `[Authorize]` 要求请求经过认证
- `[AsgardAuthAnyRole("admin")]` 要求角色命中
- `[AsgardAuthAnyPermission("order.read")]` 要求权限命中
- `[AsgardAuthMatch("role = 'admin' and metadata.department = 'platform'")]` 按表达式检查
- `[AllowAnonymous]` 会跳过 AsgardAuth 检查，必须审查公开端点的数据范围

前端隐藏按钮只能改善体验。真实授权必须在后端完成，权限允许读取“订单”仍不等于允许读取其他租户的订单。

## 租户范围

HTTP 链路由认证建立身份，`UseAsgardTenant()` 接入租户上下文。内建 JWT 路径在 token 通过验证后，可以从已匹配 issuer 补充缺失的 `tenant_id`。

后台作业和消费者没有可靠的 HTTP 上下文，应使用服务端已经授权的非空 `Guid`：

```csharp
using var scope = scopeFactory.CreateScope(authorizedTenantId);
// Perform tenant-scoped repository work inside this scope.
```

`scopeFactory` 为 `ITenantScopeFactory`。不要直接信任请求体或消息 header 的租户值。跨租户操作调用 `CreateCrossTenantScope()`，并由注册的 `ICrossTenantScopeAuthorizer` 验证当前主体；未注册授权器时默认拒绝。共享实体缓存命中同样需要范围检查。

## 保护静态资源与 CORS

静态文件中间件在认证、授权、Trace 和限流之前。不要将私密附件、配置、证书或密钥放入 `webRootPath`；受保护内容通过授权 API 提供。

业务 API 的 `host.cors` 与 Heimdall OIDC 客户端来源白名单是不同配置面。为各自浏览器调用设置明确来源，避免把生产 CORS 全局放开。反向代理必须在依赖其结果的认证、限流和重定向行为之前正确处理可信转发信息。

## 密码与加密

使用 `IPasswordHasher` 的 BCrypt Hash/Verify 保存和验证密码；密码不存明文、不做可逆加密，也不使用 MD5。`IEncryptionService` 处理需要可逆解密的业务数据；AES Key 与 IV 由安全配置注入并在启动时验证。

不要把当前加密帮助类视为带自动密钥轮换或完整密文生命周期管理的服务。持久化敏感字段前，明确密钥存储、旧数据解密、轮换、备份与访问控制。日志和 Trace 的脱敏不能替代避免记录秘密。

## 安全验收

测试过期 token、错误 audience/issuer、错误签名、缺失/空白 `sub`、缺少 `client_id` 或携带非空白 `user_id` 的后台服务令牌，以及精确声明为 `UserLogin` 却缺少 `user_id` 的令牌。同时测试类型推断、匿名访问、缺权限、跨租户数据、无范围后台任务与未授权跨租户访问。成功登录仅是测试之一。

## 源码依据

以下链接指向对应实现；访问源码需要仓库权限。

- [JWT validation and claim normalization](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Authentication.cs)
- [Asgard 令牌约定校验器](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.AspNetCore.Core/Identity/AsgardTokenConventionValidator.cs)
- [Issuer-template validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/Authentication/AsgardIssuerTemplateValidator.cs)
- [Authorization guide and attributes](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/23-AsgardAuth授权.md)
- [Tenant scope contract](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/ITenantScopeFactory.cs)
- [Cross-tenant authorization](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/ICrossTenantScopeAuthorizer.cs)
- [Password hashing](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Security/BcryptPasswordHasher.cs)
- [Security registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Security/SecurityServiceCollectionExtensions.cs)
