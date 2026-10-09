---
title: 身份与安全契约
description: 接入浏览器和服务客户端，明确 Authority、令牌类型、应用权限与资源 Audience 的边界
order: 40
section: 接入与安全
---

登录成功建立身份，API 访问还取决于正确的 Issuer、Audience、应用、租户、令牌类型和权限。这些边界必须在服务端校验。

## 浏览器客户端：Authorization Code + PKCE

浏览器注册为 public client，不配置 Client Secret。使用 Authorization Code + **S256 PKCE**，由持续维护的 OIDC 客户端库处理 Discovery、`state`、`nonce`、verifier 和回调验证。

Heimdall 对 public client 强制要求 PKCE，管理员配置不能降低这个要求。verifier 必须与授权请求匹配，不接受 `plain` PKCE。密码授权流程会被明确拒绝，不能用 password grant 替代托管登录。

回调 URL 必须精确登记。应用自己的回跳路径也必须验证为安全站内路径，拒绝 `//other.example` 等协议相对地址。前端权限判断可以隐藏控件，API 仍必须拒绝未授权请求。

## 平台与租户 Authority

| 边界 | Authority | Token 端点 |
| --- | --- | --- |
| 平台 | `https://idp.example.com` | `/connect/token` |
| 租户 | `https://idp.example.com/{tenantId}` | `/{tenantId}/connect/token` |

所有协议 URL 都从同一 Authority 下的 Discovery 文档获取。令牌兑换会检查路由租户与客户端实际所属租户一致，UserInfo 也会拒绝路由与令牌租户不匹配的请求。

例如，租户 confidential client 即使使用 `client_credentials`，也必须向 `/{tenantId}/connect/token` 兑换令牌，不能调用无前缀的平台端点。路由、查询参数或浏览器请求头不能授予其他租户身份。

## Access Token 与 ID Token 职责不同

- **ID Token** 向 OIDC 客户端说明认证结果，Audience 是 Client ID
- **Access Token** 用于访问资源，以 `Authorization: Bearer <access_token>` 发送
- **Refresh Token** 只发送到令牌端点续期，不能用于调用资源 API

Heimdall 支持 JWT 和 opaque Access Token。使用离线 JWT 验证的资源服务必须接收 JWT 格式。Opaque Token 需要合适的服务端验证或 Introspection 集成，不能通过 JWT 解码获得可信身份。

JWT 资源访问必须先验证签名、允许的算法、有效期、精确 Issuer 和目标资源 Audience，再解释身份声明。同时检查应用、租户、主体类型和操作所需权限。不要为了让登录令牌能调用 API 而放宽 Audience 校验。

## 为资源 API 配置独立 Audience

以租户 API `catalog-api` 为例：

1. 创建已启用的自定义租户 Scope，例如 `catalog.read`
2. 把该 Scope 的 `Resources` 设置为 `catalog-api`
3. 允许租户客户端请求 `catalog.read`
4. 在授权请求或服务令牌请求中显式请求 `catalog.read`
5. 资源 API 只接受该租户 Issuer 和精确 Audience `catalog-api`
6. 检查最终 Access Token 的 `aud`、已授予 Scope，以及应用和租户身份

Audience 来自有效 Scope 对应的 Resources。`openid`、`profile`、`email`、`phone` 等标准身份 Scope 不会生成自定义 API Audience。没有解析到资源时，签发逻辑回退到 Client ID。仅创建 API Scope 不会使所有令牌自动面向该 API。

多个 Scope 资源可以生成多个 Audience。应检查其中某一项精确匹配目标资源，不能使用子串或前缀匹配。Audience 正确也不代表拥有每一个操作的权限。

## 应用授权与声明

令牌兑换会检查客户端是否映射到已启用应用。用户角色和权限在应用与租户范围内解析。不能在浏览器中合并无关应用的权限，也不能仅根据某个角色名是否存在决定授权。

身份契约包含 `sub`、`user_id`、`tenant_id`、`client_id`、`token_type`、`application_id`、`roles`、`permissions`、`scope`、`userMetadatas` 和 `tenantMetadata`。应用授权还携带版本化快照声明；实现失效检查时应把版本值视为不透明的精确比较值。

`roles`、`permissions` 和身份中的 `scope` 使用 JSON 数组字符串，元数据使用 JSON 对象字符串。这与 OAuth Token 响应里空格分隔的 `scope` 字段不同。应使用理解契约的解析器，不能一律按逗号拆分。

UserInfo 返回 `sub`、授权范围内的标准姓名、邮箱、电话资料，以及存在时的租户上下文。Discovery 的 `claims_supported` 不承诺 UserInfo 返回完整声明。资源授权使用验证后的令牌声明，管理账号详情使用当前账号 API。

## Backend Directory 集成

使用绑定单一租户和已启用应用的 confidential client，允许 `client_credentials` 并仅授予所需 Scope。使用注册的 Token Endpoint 认证方法，Secret 保存在后端密钥管理系统中。

目录访问检查：

- 资源 Audience 为 `heimdall-directory-api`
- 身份声明为 `token_type=BackendService`
- 令牌具有可信 `tenant_id`
- 读取需要 `heimdall.directory.read`，受限组写操作需要 `heimdall.directory.write`

Token 响应的 `token_type` 仍然是 `Bearer`；`BackendService` 是 Access Token 身份中的另一项声明，二者不能混淆。

目录 Controller 从验证后的服务端上下文取得租户，路由不接受调用方指定租户。用户权限接口还要求可信 `application_id`，保证返回权限属于调用应用上下文。

当前组写接口为 `POST /api/backend/directory/groups`、`PUT /api/backend/directory/groups/{groupId}/members` 和 `DELETE /api/backend/directory/groups/{groupId}`。其中 `PUT` 是全量替换成员集合，不是追加成员。只有明确承担这些操作的服务才应获得 write Scope。

依赖当前用户状态或权限做决策时，权威检查失败必须 Fail Closed。网络错误不能当成“空权限查询成功”，过期的正向缓存也不应授权新的敏感操作。

## 续期、撤销与退出

Refresh 需要允许的刷新流程和有效 `offline_access`。令牌端点会检查主体当前状态与应用上下文，并拒绝扩大原始 Scope 的刷新请求。客户端应串行处理并发续期。

完整退出使用 Discovery 的 `end_session_endpoint` 和已注册的退出回调。仅清空浏览器存储会留下身份提供者会话。

Heimdall 自身的 Access Token 验证会检查持久化令牌状态、黑名单与主体、会话撤销。下游若仅离线验证 JWT 签名，不会自动继承这些数据库检查。必须明确可接受的撤销延迟，并结合短令牌生命周期以及适当的 Introspection 或身份失效集成。

## 验收清单

- 正确 public client 能完成 S256 PKCE，缺失 verifier 或错误回调被拒绝
- 租户客户端调用平台 Token 路由被拒绝
- API 接受正确 Access Token，拒绝 ID Token、错误 Audience、错误 Issuer 和过期令牌
- 即使前端控件可见，跨租户、跨应用访问仍被拒绝
- 宿主 API CORS 与协议 CORS 都只允许预期 Origin
- 退出、刷新失败、账号停用和下游撤销行为满足应用安全要求

## 源码依据

- [PKCE 强制校验](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/OidcPkceValidator.cs)
- [令牌兑换、路由匹配与续期](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Token.cs)
- [Scope 与资源映射](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcScopeService.cs)
- [Audience 回退与 Token 响应](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Helpers.cs)
- [Access Token、ID Token 签发与验证](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcTokenService.cs)
- [应用范围授权](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/AsgardIdentityClaimsBuilder.ApplicationAuthorization.cs)
- [声明定义](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/AsgardIdentityClaimTypes.cs)
- [UserInfo 边界](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/IdentityUserInfoApplicationService.cs)
- [Backend Directory 授权与方法](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Controllers/Tenants/BackendDirectoryController.cs)
- [目录 Audience 检查](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/BackendDirectoryAudienceAttribute.cs)
- [前端与退出集成](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/custom-frontend-integration.md)
- [身份 Scope 序列化](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Protocol/OidcProtocolExtensions.cs)
