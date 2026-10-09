---
title: "Security, identity, and tenant authorization"
description: "Keep token validation, permission checks, and data isolation explicit"
order: 60
section: "Development"
---

A secure integration answers three separate questions: who made the request, whether that identity may perform the action, and whether it may access the specific data. JWT validation, AsgardAuth, and tenant data scopes protect different boundaries.

## Configure a JWT resource API

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

This path accepts signed JWTs from tenant issuers. The template must contain exactly one `{tenant}`. Before fetching Discovery or JWKS, the host checks whether the untrusted token issuer matches the configured template.

Validation covers issuer, audience, signature, and lifetime. Audience matching is exact and case-sensitive, and clock skew tolerance is zero. Keep deployment clocks synchronized. Production should retain `requireHttpsMetadata: true`.

Send an **access token** to the API. An ID token is the client's login result; an opaque access token also cannot pass this local JWT-validation path. A platform-root issuer or simultaneous platform and tenant issuers require a separately designed authentication scheme rather than this tenant template.

### Required Asgard token claims

A valid signature, issuer, audience, and lifetime are not sufficient. `OnTokenValidated` also calls `AsgardTokenConventionValidator`; a convention failure fails authentication and can produce HTTP 401 on a protected endpoint.

| Claim contract | Current validation |
| --- | --- |
| Every token | `sub` must be present and nonblank |
| Resolved `BackendService` | `client_id` must be nonblank, and `user_id` must not contain a nonblank value |
| Raw `token_type` exactly `UserLogin` | `user_id` must be present and nonblank |

Type resolution first parses explicit `token_type` with case-insensitive enum parsing. If it is absent, blank, or cannot be parsed, a nonblank `client_id` together with an absent/blank `user_id` infers `BackendService`; otherwise it infers `UserLogin`. This validator does not add a `token_type` claim or derive `user_id` from `sub`.

The additional user-login check is narrower than type resolution: it compares the original claim to the exact, case-sensitive string `UserLogin`. Inferred user-login tokens and differently cased spellings do not receive that required-`user_id` check in the current implementation. Issue the canonical `UserLogin` or `BackendService` spelling with its required claims; do not rely on this compatibility gap as an identity contract.

## Integrate with Heimdall

Browser applications use Authorization Code + PKCE as public clients without a client secret. The resource API defines its own audience, such as `orders-api`.

In Heimdall, configure a tenant Scope whose `Resources` contains the API audience. The client must be allowed to request that Scope and must actually request it. Registering a client or filling in the Asgard audience alone does not add that resource audience to a token. Test login, token issuance, and API validation separately; see [Heimdall security](/en/heimdall/docs/security/).

> [!WARNING]
> Local Discovery/JWKS validation does not query identity-provider revocation state on every request. Logging out or revoking a session does not prove an external API immediately rejects an otherwise valid JWT. Design and verify an additional mechanism when immediate invalidation is required.

## Permission checks

- `[Authorize]` requires an authenticated request
- `[AsgardAuthAnyRole("admin")]` checks a role
- `[AsgardAuthAnyPermission("order.read")]` checks a permission
- `[AsgardAuthMatch("role = 'admin' and metadata.department = 'platform'")]` evaluates an expression
- `[AllowAnonymous]` skips AsgardAuth checks, so review the data boundary of public endpoints

Frontend button visibility improves UX. Backend authorization remains the enforcement boundary. Permission to read orders does not automatically permit reading another tenant's orders.

## Tenant scope

In HTTP, authentication establishes identity and `UseAsgardTenant()` connects tenant context. After token validation, the built-in JWT path can populate a missing `tenant_id` from the matched issuer.

Jobs and consumers lack a reliable HTTP context. Use a nonempty `Guid` already authorized by the server:

```csharp
using var scope = scopeFactory.CreateScope(authorizedTenantId);
// Perform tenant-scoped repository work inside this scope.
```

`scopeFactory` is an `ITenantScopeFactory`. Do not trust a tenant value merely because it arrived in a request body or message header. Cross-tenant work uses `CreateCrossTenantScope()` and a registered `ICrossTenantScopeAuthorizer` that validates the current identity. Missing authorization fails closed. Shared-entity cache hits must also pass scope checks.

## Protect static content and configure CORS

Static-file middleware runs before authentication, authorization, Trace, and rate limiting. Never put private attachments, configuration, certificates, or secrets in `webRootPath`. Serve protected content through an authorized API.

The business API's `host.cors` and Heimdall's OIDC client-origin allowlist are separate configuration surfaces. Give each browser interaction explicit allowed origins instead of globally opening production CORS. A reverse proxy must correctly restore trusted forwarding information before authentication, limiting, or redirects depend on it.

## Passwords and encryption

Use the BCrypt Hash/Verify behavior in `IPasswordHasher` for passwords. Do not store plaintext passwords, reversibly encrypt them, or use MD5. `IEncryptionService` handles business data that requires reversible encryption. Inject AES key and IV values through secure configuration; startup validates them.

The encryption helper is not an automatic key-rotation or complete ciphertext-lifecycle service. Before persisting sensitive fields, define key storage, old-data decryption, rotation, backups, and access control. Log and Trace masking do not replace avoiding secrets in telemetry.

## Security acceptance

Test expired tokens, wrong audience, wrong issuer, invalid signatures, missing/blank `sub`, backend-service tokens without `client_id` or with a nonblank `user_id`, and exact `UserLogin` tokens without `user_id`. Also test type inference, anonymous requests, missing permissions, another tenant's data, background work without tenant scope, and unauthorized cross-tenant access. A successful login is only one test case.

## Source references

These links point to the implementation. Repository access is required to open the source.

- [JWT validation and claim normalization](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.Authentication.cs)
- [Asgard token convention validator](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.AspNetCore.Core/Identity/AsgardTokenConventionValidator.cs)
- [Issuer-template validation](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Host/Asgard.Yggdrasil.AspNetCore/Authentication/AsgardIssuerTemplateValidator.cs)
- [Authorization guide and attributes](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/doc/23-AsgardAuth授权.md)
- [Tenant scope contract](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/ITenantScopeFactory.cs)
- [Cross-tenant authorization](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Abstractions/Data/ICrossTenantScopeAuthorizer.cs)
- [Password hashing](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Security/BcryptPasswordHasher.cs)
- [Security registration](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Common/Asgard.Core/Security/SecurityServiceCollectionExtensions.cs)
