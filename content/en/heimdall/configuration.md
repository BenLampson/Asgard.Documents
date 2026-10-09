---
title: Configure Heimdall
description: Configure boot-time infrastructure, OIDC clients, CORS, frontend authorities, and runtime security policy
order: 30
section: Integration and security
---

Heimdall separates **boot-time infrastructure** from **runtime policy**. Keep database connections, encryption and signing material, and the public issuer in deployment configuration. Use the runtime settings APIs for allowlisted operational policy.

## Configuration ownership

| Location | What belongs there |
| --- | --- |
| `app.yaml` | Host settings and infrastructure such as PostgreSQL, cache, messaging, logging, and jobs |
| `plugin.yaml` | OIDC bootstrap/client configuration and plugin job declarations |
| Environment / command-line configuration | Deployment-specific overrides and securely supplied values |
| Runtime settings database | Registered security, cleanup, key-rotation, and other operational policies |
| Tenant/client records | Tenant applications, clients, callbacks, scopes, resource audiences, and keys |

The repository documents boot-time precedence as **YAML < environment variables < command-line arguments**. Runtime settings have their own precedence: **tenant override > system value > registered default**, and only definitions that allow tenant overrides can be changed at that level.

Changing a YAML file is not a substitute for editing a database-backed policy. Conversely, runtime settings cannot supply the connection needed to open their own database.

## Public issuer and system client

This is a production-oriented **fragment**, not a complete deployment file. Supply infrastructure and signing material separately through your deployment's secret handling.

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

For a public browser client, leave `oidc.system_client.client_secret` unset in every configuration source. A secret injected through an environment override would change the client type even if it is absent from YAML.

`oidc.issuer` is the public base authority. The authority service trims trailing slashes and appends `/{tenantId}` for tenants. If it is absent, the service derives an authority from the request scheme, host, and path base. Production deployments should set an explicit external HTTPS issuer.

Outside Development, `oidc.signing.rsa_private_key` is required. `oidc.signing.rsa_public_key` is optional: when absent, the public key is derived from the private key. Never distribute a development signing key or an encryption key as a production default.

## Defaults versus supplied examples

The following values describe the configuration types and runtime fallback, not values already overridden by a deployment file.

| Setting | Default or fallback |
| --- | --- |
| `oidc.system_client.client_id` | `asgard_default` |
| `oidc.system_client.client_secret` | Absent; public client |
| `oidc.system_client.scopes` | `openid`, `profile`, `email`, `phone`, `offline_access` |
| `oidc.system_client.grant_types` | `authorization_code`, `refresh_token` |
| `oidc.system_client.access_token_format` | `jwt` |
| `oidc.system_client.access_token_ttl` | Unset; token service falls back to 3,600 seconds |
| `oidc.system_client.refresh_token_ttl` | Unset; token service falls back to 30 days |
| `oidc.system_client.id_token_lifetime` | Unset; token service falls back to 300 seconds |
| `oidc.system_client.authorization_code_lifetime` | Unset; authorization service falls back to 300 seconds |
| `oidc.bootstrap.auto_sync_schema` | `false` in the type; the checked-in development YAML sets `true` |

The development YAML explicitly sets access-token TTL to `7200` and refresh-token TTL to `604800`. Those are example overrides, not the token-service defaults.

The configuration type lists `fragment` among response modes, but `SystemClientProvider` filters the effective system-client modes to `query` and `form_post`, and forces response type `code`. Use the effective Discovery/runtime contract rather than assuming every raw option enables a flow.

## Configure both CORS boundaries

The management API has host-level CORS:

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

This controls `/api/**`. OIDC browser endpoints use a separate dynamic policy:

- Platform routes use `oidc.system_client.allowed_cors_origins`; if no valid explicit origins exist, they fall back to origins extracted from login/logout callbacks
- Tenant routes load enabled clients from that tenant. A `null` tenant-client Origin list permits the compatibility fallback from callbacks; an explicit empty list adds no origins for that client
- The tenant policy also includes the trusted system-console origins to support the built-in tenant console. Origins from other tenants' business clients are not pooled
- Introspection and SCIM do not receive a browser CORS policy from this provider. Authorize/login/logout are navigation flows

An Origin is `scheme://host[:port]`, without a callback path. CORS does not replace token, application, scope, or tenant authorization.

## Runtime settings

Use the console or these authorized API routes:

- `GET /api/SystemSettings/runtime`
- `GET /api/SystemSettings/runtime?tenantId={tenantId}`
- `PUT /api/SystemSettings/runtime/system`
- `PUT /api/SystemSettings/runtime/tenants/{tenantId}`
- `DELETE /api/SystemSettings/runtime/tenants/{tenantId}/{key}`
- `GET /api/SystemSettings/runtime/history`

Use the current API model, including optimistic-concurrency versions, when submitting changes. Unknown keys and invalid values are rejected.

| Runtime key | Registered default | Tenant override |
| --- | --- | --- |
| `security.login_failure_lockout.enabled` | `true` | Yes |
| `security.login_failure_lockout.threshold` | `5` (range 1–20) | Yes |
| `security.login_failure_lockout.window_minutes` | `15` (range 1–1440) | Yes |
| `security.login_failure_lockout.lockout_minutes` | `15` (range 1–1440) | Yes |
| `security.sensitive_operation_confirmation.enabled` | `true` | No |

The registry also exposes `oidc.cleanup.*` and `oidc.key_rotation.*`. Their initial defaults come from the corresponding configuration objects. The scheduled jobs read effective runtime values when they run; merely scheduling key rotation does not enable rotation policy.

## Frontend configuration

The production console has **build-time configuration**. `fe/config/config.prod.ts` hardcodes all seven `UMI_APP_*` values through Umi's `define` object. The checked-in values target `idp.mudou.tech`, `heimdall.mudou.tech`, and client `asgard_heimdall`; they do not automatically follow the backend YAML or your deployment hostname.

Before building for another domain, replace all seven entries in `fe/config/config.prod.ts`. This example matches the public issuer, system client, and callbacks above; review the scope list against the effective client registration too:

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

The current `fe/Dockerfile` runs `npm run build`, then copies `dist` into an Nginx image. It provides no runtime configuration-substitution step. Setting `UMI_APP_*` on the running container, or changing backend environment variables/YAML, cannot rewrite the existing JavaScript bundle. Rebuild and redeploy the Web image after changing these values; see [deployment verification](/en/heimdall/docs/operations/).

Authority resolution in the frontend code is explicit OIDC authority, then API base URL, then app origin. The production build supplies explicit values, so do not expect the fallbacks to replace them. The built-in tenant console appends the tenant to the authority and derives its special tenant-console client ID. A custom business application should use its own registered client, not invent that internal client-ID format.

These frontend values are public bundle contents. They must never contain a client secret, private signing key, or backend connection string.

## Sources

- [Production build-time values](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/config/config.prod.ts)
- [Web image build](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/Dockerfile)
- [Configuration model](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/README.md)
- [OIDC configuration fields](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Config/PluginConfigs/OidcPluginConfig.cs)
- [Effective system-client settings](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Infrastructure/OpenIddict/SystemClientProvider.cs)
- [Signing-material requirements](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Infrastructure/OpenIddict/SystemSecurityMaterial.cs)
- [Authority resolution](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcAuthorityService.cs)
- [CORS boundaries](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Extensions/Plugin/MultiTenantCorsPolicyProvider.cs)
- [Runtime setting registry](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Platform/RuntimeSettingRegistry.cs)
- [Token lifetime fallbacks](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcTokenService.cs)
- [Authorization-code lifetime](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Helpers.cs)
- [Console configuration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/src/services/oidcConfig.ts)
- [Development overrides](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/plugin.yaml)
