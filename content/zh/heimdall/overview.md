---
title: Heimdall 概览
description: 提供 OIDC、应用授权、身份联合和管理 API 的多租户身份服务
order: 10
section: 开始使用
---

Heimdall 是 Asgard 生态中的身份与访问管理服务。应用把登录和令牌签发交给 Heimdall，再根据验证后的身份执行自己的资源授权。管理控制台集中提供平台、租户、客户端、签名密钥、会话与安全运营功能。

当前源码声明的版本为 **Heimdall 5.4.25**，目标运行时为 **.NET 10**，`global.json` 选择 SDK **10.0.401**。集中管理的 Asgard 包依赖为 **5.3.0**。这是 Heimdall 自身的依赖关系，Asgard 框架发布新版本不会自动改变它。

## 组成部分

| 组件 | 职责 |
| --- | --- |
| `be/Asgard.Heimdall.Starter` | 可执行宿主，加载身份插件和配置 |
| `be/Asgard.Heimdall` | OIDC 端点、管理 API、授权、持久化与后台任务 |
| `fe` | Umi Max / React 管理控制台，可通过 HTTP 和 OIDC 契约替换 |
| `be/Asgard.Heimdall.JwtSigning` | 独立的轻量 JWT 签发库 |
| `be/Asgard.Heimdall.JwtSigning.AspNetCore` | 轻量签发库的 ASP.NET Core 集成 |

完整服务的随库配置使用 PostgreSQL、Redis 和 RabbitMQ。生产数据库支持 PostgreSQL。独立签发包不是完整的 Heimdall 身份服务，也不替代用户、租户或授权管理。

## 可以实现什么

- 浏览器使用 Authorization Code + S256 PKCE 登录，并通过 Refresh Token 续期
- 后端使用 confidential client 和 `client_credentials` 获取服务身份
- 为已启用对应能力的客户端提供 Device Authorization 登录
- OIDC Discovery、JWKS、UserInfo、令牌内省、撤销和退出
- 平台与租户用户管理、应用域角色权限、客户端和 Scope 管理
- 通过已注册的身份模块接入外部 OIDC、LDAP/AD、SAML、TOTP、恢复码和 Passkey
- 租户目录集成、签名身份失效 Webhook、安全事件导出，以及经过认证的 MCP 管理

每项能力仍需要对应的客户端注册、权限、密钥和配置。模块已经注册，不代表某个外部身份源或部署环境已经配置完成。

## 区分四个概念

**平台**是系统管理身份边界。平台 OIDC Authority 使用配置的基础 Issuer，例如 `https://idp.example.com`。

**租户**是身份与数据边界。租户客户端使用 `https://idp.example.com/{tenantId}` 作为 Authority。Discovery、令牌兑换和 UserInfo 都必须保持这个边界；向平台 Authority 附加租户请求头不能切换身份。

**应用**拥有自己的授权域。Access Token 带有目标 `application_id` 及应用授权上下文。客户端必须映射到已启用的应用，令牌兑换才能成功。一个应用中的角色不会自动授予另一个应用的访问权限。

**客户端**是 OAuth/OIDC 接入注册。浏览器属于 public client，不能安全保存 Secret。后端可以使用 confidential client。客户端注册决定允许的流程、Scope、回调与令牌行为。

## 接入入口

普通业务登录从 OIDC Discovery 开始，不要分别硬编码所有协议端点。

| 接口面 | 入口 | 用途 |
| --- | --- | --- |
| 平台 Discovery | `/.well-known/openid-configuration` | 平台客户端元数据 |
| 租户 Discovery | `/{tenantId}/.well-known/openid-configuration` | 租户客户端元数据 |
| 管理 API | `/api/**` | 经过授权的平台、租户和账号操作 |
| Backend Directory | `/api/backend/directory/**` | 绑定租户的后端服务集成 |
| MCP | `/mcp` | 经过认证的管理工具、资源和提示词 |
| MCP OAuth 元数据 | `/.well-known/oauth-protected-resource/mcp` | 管理资源授权发现 |

Backend Directory 当前包含用户、权限、目录组和成员关系的读取接口。创建目录组、全量保存组成员、删除空组使用独立的 `heimdall.directory.write` 检查。只读消费者只授予 `heimdall.directory.read`，不能把整个 Controller 当成只读接口，也不要默认授予写 Scope。

MCP 使用有状态 Streamable HTTP，需要管理应用的 Access Token 或用户自己的 AK/SK 凭据。当前任务存储位于内存中；设计横向扩容前先阅读[运维指南](/zh/heimdall/docs/operations/)。

## 从这里开始

1. [本地启动 Heimdall](/zh/heimdall/docs/quick-start/)，验证完整登录链路
2. [配置服务](/zh/heimdall/docs/configuration/)，明确 Authority、回调和 Origin
3. [遵守安全契约](/zh/heimdall/docs/security/)，接入浏览器与后端服务
4. [准备生产运维](/zh/heimdall/docs/operations/)，覆盖数据库变更、密钥、恢复和验收

## 源码依据

以下链接固定到本次查阅的源码提交，访问仓库可能需要授权。

- [构建版本和运行时](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Directory.Build.props)
- [SDK 选择](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/global.json)
- [依赖版本](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Directory.Packages.props)
- [模块注册](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Extensions/HeimdallModuleRegistrationExtensions.cs)
- [Discovery 契约](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcMetadataService.cs)
- [令牌兑换和应用检查](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Token.cs)
- [Backend Directory 控制器](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Controllers/Tenants/BackendDirectoryController.cs)
- [MCP 契约](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/mcp-management.md)
