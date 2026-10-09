---
title: 配置 Heimdall
description: 配置启动基础设施、OIDC 客户端、CORS、前端 Authority 和运行时安全策略
order: 30
section: 接入与安全
---

Heimdall 区分**启动基础设施**与**运行时策略**。数据库连接、加密和签名材料、公开 Issuer 由部署配置提供；白名单内的运营策略通过运行时配置 API 管理。

## 配置归属

| 位置 | 管理内容 |
| --- | --- |
| `app.yaml` | 宿主与 PostgreSQL、缓存、消息、日志、作业等基础设施 |
| `plugin.yaml` | OIDC 引导、客户端配置与插件作业声明 |
| 环境变量 / 命令行配置 | 部署环境覆盖值和安全注入的数据 |
| 运行时配置数据库 | 已注册的安全、清理、密钥轮换等运营策略 |
| 租户 / 客户端记录 | 租户应用、客户端、回调、Scope、资源 Audience 与密钥 |

仓库定义的启动配置优先级为 **YAML < 环境变量 < 命令行参数**。运行时配置采用独立优先级：**租户覆盖 > 系统值 > 注册默认值**，且只有允许租户覆盖的定义才能在租户层修改。

修改 YAML 不能替代数据库策略更新；运行时配置也不能提供用于打开自身数据库的连接。

## 公开 Issuer 与系统客户端

下面是面向生产环境的**配置片段**，不是完整部署文件。基础设施和签名材料需要由部署的密钥管理机制另外提供。

```yaml
oidc:
  issuer: "https://idp.example.com"
  bootstrap:
    auto_sync_schema: false
  system_client:
    client_id: "asgard_default"
    redirect_uris:
      - "https://console.example.com/callback"
    post_logout_redirect_uris:
      - "https://console.example.com/logout-complete"
    allowed_cors_origins:
      - "https://console.example.com"
    scopes:
      - openid
      - profile
      - email
      - phone
      - offline_access
    grant_types:
      - authorization_code
      - refresh_token
    response_types:
      - code
    response_modes:
      - query
      - form_post
    access_token_format: jwt
```

public 浏览器客户端在所有配置源中都不能设置 `oidc.system_client.client_secret`。即使 YAML 未填写，环境变量注入 Secret 仍会改变客户端类型。

`oidc.issuer` 是公开的基础 Authority。Authority 服务会去掉尾部斜线，并为租户追加 `/{tenantId}`。未配置时，会从请求的 scheme、host 和 path base 推导。生产环境应显式设置外部 HTTPS Issuer。

非 Development 环境必须提供 `oidc.signing.rsa_private_key`。`oidc.signing.rsa_public_key` 可选，未设置时从私钥导出公钥。不要把开发签名密钥或加密密钥当成生产默认值分发。

## 默认值与示例覆盖值

下表描述配置类型及运行时回退值，不代表部署文件已经覆盖后的实际值。

| 配置项 | 默认值或回退值 |
| --- | --- |
| `oidc.system_client.client_id` | `asgard_default` |
| `oidc.system_client.client_secret` | 未设置，使用 public client |
| `oidc.system_client.scopes` | `openid`、`profile`、`email`、`phone`、`offline_access` |
| `oidc.system_client.grant_types` | `authorization_code`、`refresh_token` |
| `oidc.system_client.access_token_format` | `jwt` |
| `oidc.system_client.access_token_ttl` | 未设置，令牌服务回退到 3,600 秒 |
| `oidc.system_client.refresh_token_ttl` | 未设置，令牌服务回退到 30 天 |
| `oidc.system_client.id_token_lifetime` | 未设置，令牌服务回退到 300 秒 |
| `oidc.system_client.authorization_code_lifetime` | 未设置，授权服务回退到 300 秒 |
| `oidc.bootstrap.auto_sync_schema` | 类型默认 `false`；随库开发 YAML 设置为 `true` |

开发 YAML 显式把 Access Token TTL 设为 `7200`，Refresh Token TTL 设为 `604800`。它们是示例覆盖值，不是令牌服务默认值。

配置类型的 response modes 包含 `fragment`，但 `SystemClientProvider` 会把系统客户端的有效模式过滤为 `query` 和 `form_post`，并固定 response type 为 `code`。应以 Discovery 和运行时契约为准，不能假设每个原始配置项都能开启一种流程。

## 分别配置两类 CORS

管理 API 使用宿主 CORS：

```yaml
host:
  cors:
    enabled: true
    defaultPolicy:
      allowAnyOrigin: false
      allowAnyMethod: true
      allowAnyHeader: true
      allowCredentials: false
      allowedOrigins:
        - "https://console.example.com"
```

该配置控制 `/api/**`。OIDC 浏览器端点采用独立动态策略：

- 平台路由使用 `oidc.system_client.allowed_cors_origins`；没有有效显式 Origin 时，回退到从登录、退出回调中提取 Origin
- 租户路由只加载本租户启用的客户端。租户客户端 Origin 列表为 `null` 时兼容地从回调提取；显式空列表不会为该客户端增加 Origin
- 为支持内置租户控制台，租户策略还包含受信任的系统控制台 Origin。不会汇总其他租户业务客户端的 Origin
- 此提供器不给 Introspection 和 SCIM 返回浏览器 CORS 策略；Authorize、Login、Logout 属于导航流程

Origin 格式为 `scheme://host[:port]`，不能包含回调路径。CORS 不替代令牌、应用、Scope 或租户授权。

## 运行时配置

通过控制台或以下经过授权的 API 操作：

- `GET /api/SystemSettings/runtime`
- `GET /api/SystemSettings/runtime?tenantId={tenantId}`
- `PUT /api/SystemSettings/runtime/system`
- `PUT /api/SystemSettings/runtime/tenants/{tenantId}`
- `DELETE /api/SystemSettings/runtime/tenants/{tenantId}/{key}`
- `GET /api/SystemSettings/runtime/history`

提交时遵循当前 API 模型，包括乐观并发版本字段。未知配置键与无效值会被拒绝。

| 运行时配置键 | 注册默认值 | 租户覆盖 |
| --- | --- | --- |
| `security.login_failure_lockout.enabled` | `true` | 允许 |
| `security.login_failure_lockout.threshold` | `5`，范围 1–20 | 允许 |
| `security.login_failure_lockout.window_minutes` | `15`，范围 1–1440 | 允许 |
| `security.login_failure_lockout.lockout_minutes` | `15`，范围 1–1440 | 允许 |
| `security.sensitive_operation_confirmation.enabled` | `true` | 不允许 |

注册表还提供 `oidc.cleanup.*` 和 `oidc.key_rotation.*`。初始默认值来自对应配置对象。调度任务在运行时读取有效策略；仅登记密钥轮换作业不等于启用轮换策略。

## 前端配置

生产控制台采用**构建时配置**。`fe/config/config.prod.ts` 通过 Umi 的 `define` 对象硬编码全部七项 `UMI_APP_*` 值。随库值指向 `idp.mudou.tech`、`heimdall.mudou.tech` 和客户端 `asgard_heimdall`，不会自动跟随后端 YAML 或部署域名变化。

为其他域名构建前，替换 `fe/config/config.prod.ts` 中全部七项配置。以下示例与前面的公开 Issuer、系统客户端及回调一致；Scope 列表也要按实际有效的客户端注册核对：

```typescript
import { defineConfig } from '@umijs/max';

export default defineConfig({
  define: {
    'process.env.UMI_APP_OIDC_AUTHORITY': 'https://idp.example.com',
    'process.env.UMI_APP_OIDC_CLIENT_ID': 'asgard_default',
    'process.env.UMI_APP_PUBLIC_ORIGIN': 'https://console.example.com',
    'process.env.UMI_APP_OIDC_REDIRECT_URI': 'https://console.example.com/callback',
    'process.env.UMI_APP_OIDC_POST_LOGOUT_REDIRECT_URI': 'https://console.example.com/logout-complete',
    'process.env.UMI_APP_OIDC_SCOPE': 'openid profile email phone offline_access',
    'process.env.UMI_APP_API_BASE_URL': 'https://idp.example.com',
  },
});
```

当前 `fe/Dockerfile` 执行 `npm run build`，再把 `dist` 复制到 Nginx 镜像，没有运行时配置替换步骤。向已运行容器设置 `UMI_APP_*`，或修改后端环境变量/YAML，都不能重写已有 JavaScript bundle。修改这些值后必须重新构建并部署 Web 镜像，详见[部署验收](/zh/heimdall/docs/operations/)。

前端代码中的 Authority 优先使用显式 OIDC Authority，其次为 API Base URL，最后回退到应用 Origin。生产构建已提供显式值，不能期待回退逻辑覆盖它们。内置租户控制台会给 Authority 追加租户路径，并派生专用租户控制台 Client ID。自定义业务应用应使用自己注册的客户端，不能自行拼接这种内部 Client ID 格式。

这些前端值是公开的 bundle 内容，绝不能包含 Client Secret、签名私钥或后端连接字符串。

## 源码依据

- [生产构建时配置](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/config/config.prod.ts)
- [Web 镜像构建](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/Dockerfile)
- [配置模型](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/README.md)
- [OIDC 配置字段](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Config/PluginConfigs/OidcPluginConfig.cs)
- [系统客户端有效配置](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Infrastructure/OpenIddict/SystemClientProvider.cs)
- [签名材料要求](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Infrastructure/OpenIddict/SystemSecurityMaterial.cs)
- [Authority 解析](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcAuthorityService.cs)
- [CORS 边界](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Extensions/Plugin/MultiTenantCorsPolicyProvider.cs)
- [运行时配置注册表](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Platform/RuntimeSettingRegistry.cs)
- [令牌生命周期回退值](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcTokenService.cs)
- [授权码生命周期](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Helpers.cs)
- [控制台配置](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/src/services/oidcConfig.ts)
- [开发配置覆盖值](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/plugin.yaml)
