---
title: Heimdall overview
description: A multi-tenant identity provider with OIDC, application authorization, federation, and management APIs
order: 10
section: Getting started
---

Heimdall is the identity and access management service in the Asgard ecosystem. Applications delegate sign-in and token issuance to Heimdall, then enforce their own resource authorization using the verified identity. The management console brings platform administration, tenant administration, clients, signing keys, sessions, and security operations together.

The current source declares **Heimdall 5.4.25**, targets **.NET 10**, and selects SDK **10.0.401** in `global.json`. Its centrally managed Asgard package references are **5.3.0**. These are the service's own dependencies; a newer Asgard framework version does not automatically change them.

## Components

| Component | Responsibility |
| --- | --- |
| `be/Asgard.Heimdall.Starter` | Executable host; loads the identity plugin and configuration |
| `be/Asgard.Heimdall` | OIDC endpoints, management APIs, authorization, persistence, and background operations |
| `fe` | Umi Max / React management console; replaceable through the HTTP and OIDC contracts |
| `be/Asgard.Heimdall.JwtSigning` | Separate lightweight JWT issuer library |
| `be/Asgard.Heimdall.JwtSigning.AspNetCore` | ASP.NET Core integration for that lightweight issuer |

The full service uses PostgreSQL, Redis, and RabbitMQ in its supplied configuration. PostgreSQL is the supported production database. The standalone signing packages are not the complete Heimdall identity service and do not replace its user, tenant, or authorization management.

## What you can build

- Browser sign-in through Authorization Code with S256 PKCE, plus refresh-token renewal
- Service identity through confidential clients and `client_credentials`
- Device sign-in through Device Authorization when enabled for the client
- OIDC Discovery, JWKS, UserInfo, token introspection, revocation, and logout
- Platform and tenant user administration, application-scoped roles and permissions, and client/scope management
- External OIDC, LDAP/AD, SAML, TOTP, recovery-code, and Passkey integrations through the registered identity modules
- Tenant directory integration, signed identity-invalidation webhooks, security-event export, and authenticated MCP management

Capabilities still require their own client registration, permissions, keys, and configuration. A registered module is not evidence that an external provider or a particular deployment has been configured.

## Four concepts to keep separate

**Platform** is the system administration identity boundary. Its OIDC authority is the configured base issuer, such as `https://idp.example.com`.

**Tenant** is an identity and data boundary. A tenant client uses `https://idp.example.com/{tenantId}` as its authority. Discovery, token exchange, and UserInfo remain inside that boundary; sending a tenant header to the platform authority does not switch identity.

**Application** owns an authorization domain. Access tokens carry the target `application_id` and application authorization context. A client must map to an enabled application for token exchange to succeed. Roles for one application do not automatically authorize another.

**Client** is an OAuth/OIDC integration registration. A browser is a public client and cannot safely hold a secret. A backend can be a confidential client. Client registration determines permitted flows, scopes, callbacks, and token behavior.

## Integration surfaces

For ordinary application login, start with OIDC Discovery. Do not independently hard-code every protocol endpoint.

| Surface | Entry point | Intended use |
| --- | --- | --- |
| Platform Discovery | `/.well-known/openid-configuration` | Platform client metadata |
| Tenant Discovery | `/{tenantId}/.well-known/openid-configuration` | Tenant client metadata |
| Management APIs | `/api/**` | Authorized platform, tenant, and account operations |
| Backend Directory | `/api/backend/directory/**` | Tenant-bound service integration |
| MCP | `/mcp` | Authenticated management tools, resources, and prompts |
| MCP OAuth metadata | `/.well-known/oauth-protected-resource/mcp` | Management-resource authorization discovery |

The Backend Directory currently includes read endpoints for users, permissions, groups, and memberships. Group creation, complete membership replacement, and empty-group deletion have separate `heimdall.directory.write` checks. Give a read-only consumer only `heimdall.directory.read`; do not treat the entire controller as read-only or grant write scope by default.

MCP uses stateful Streamable HTTP and requires either a management-application access token or a user-owned AK/SK credential. Its task store is currently in memory. See the [operations guide](/en/heimdall/docs/operations/) before designing horizontal scaling.

## Start here

1. [Run Heimdall locally](/en/heimdall/docs/quick-start/) and verify the complete login path
2. [Configure the service](/en/heimdall/docs/configuration/) with explicit authorities, callbacks, and origins
3. [Apply the security contract](/en/heimdall/docs/security/) to browser and backend integrations
4. [Prepare production operations](/en/heimdall/docs/operations/) for schema changes, keys, recovery, and verification

## Sources

These links point to the inspected source revision. Repository access may be required.

- [Build version and runtime](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Directory.Build.props)
- [SDK selection](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/global.json)
- [Dependency versions](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Directory.Packages.props)
- [Module registration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Extensions/HeimdallModuleRegistrationExtensions.cs)
- [Discovery contract](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcMetadataService.cs)
- [Token exchange and application checks](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Token.cs)
- [Backend Directory controller](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Controllers/Tenants/BackendDirectoryController.cs)
- [MCP contract](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/mcp-management.md)
