---
title: Identity and security contract
description: Integrate browser and service clients without mixing authorities, token types, application permissions, or resource audiences
order: 40
section: Integration and security
---

A successful login establishes an identity. API access additionally depends on the intended issuer, audience, application, tenant, token type, and permissions. Validate those boundaries on the server.

## Browser clients: Authorization Code + PKCE

Register browsers as public clients with no Client Secret. Use Authorization Code with **S256 PKCE** and a maintained OIDC client library to manage Discovery, `state`, `nonce`, the verifier, and callback validation.

Heimdall requires PKCE for public clients regardless of whether an administrator attempts to relax the client setting. The verifier must match the authorization request. `plain` PKCE is not accepted. The password grant is explicitly rejected; do not replace the hosted sign-in flow with a password grant.

Keep callback URLs exact. Validate any application return path as a safe same-site path, rejecting protocol-relative paths such as `//other.example`. Frontend permission checks may hide controls, but the API must still reject unauthorized requests.

## Platform and tenant authorities

| Boundary | Authority | Token endpoint |
| --- | --- | --- |
| Platform | `https://idp.example.com` | `/connect/token` |
| Tenant | `https://idp.example.com/{tenantId}` | `/{tenantId}/connect/token` |

Use the Discovery document under that same authority for all protocol URLs. Token exchange checks that the route tenant equals the registered client's tenant. UserInfo also rejects a route/token tenant mismatch.

For example, a tenant confidential client must exchange at `/{tenantId}/connect/token`, including for `client_credentials`. It must not call the unprefixed platform endpoint. A route, query parameter, or browser header cannot grant a different tenant identity.

## Access Tokens and ID Tokens have different jobs

- An **ID Token** describes authentication to the OIDC client; its audience is the client ID
- An **Access Token** authorizes calls to a resource; send it as `Authorization: Bearer <access_token>`
- A **Refresh Token** is presented to the token endpoint for renewal, not to a resource API

Heimdall supports JWT and opaque access tokens. A resource server using offline JWT validation must receive the JWT format. An opaque token requires an appropriate server-side validation/introspection integration; decoding it as a JWT cannot authenticate it.

For JWT resource access, validate signature, allowed algorithm, lifetime, exact issuer, and the intended resource audience before interpreting identity claims. Also enforce application, tenant, subject type, and operation-specific permission requirements. Do not weaken audience validation to make a login token work.

## Give a resource API its own audience

For a tenant API named `catalog-api`:

1. Create an enabled custom tenant Scope, for example `catalog.read`
2. Set that Scope's `Resources` to `catalog-api`
3. Allow the tenant client to request `catalog.read`
4. Explicitly request `catalog.read` in the authorization or service-token request
5. Configure the resource API to accept that tenant issuer and exact audience `catalog-api`
6. Verify a resulting Access Token contains the expected `aud`, granted scope, and application/tenant identity

Audience resolution uses resources of the effective scopes. Standard identity scopes such as `openid`, `profile`, `email`, and `phone` do not create a custom API audience. If no resource is resolved, token issuance falls back to the client ID. Merely creating an API Scope does not make every token target that API.

Multiple scope resources can produce multiple audiences. Check that one audience exactly matches the intended resource; do not use substring or prefix matching. A token for the right audience can still lack the permission required for a particular operation.

## Application authorization and claims

Token exchange checks that the client maps to an enabled application. User roles and permissions are resolved within application and tenant scope. Do not merge permissions from unrelated applications in the browser or infer authorization from the presence of a role name alone.

The identity contract includes `sub`, `user_id`, `tenant_id`, `client_id`, `token_type`, `application_id`, `roles`, `permissions`, `scope`, `userMetadatas`, and `tenantMetadata`. Application authorization also carries versioned snapshot claims. Treat those version values as opaque equality tokens when implementing invalidation checks.

`roles`, `permissions`, and the identity `scope` claim use JSON-array-string encoding; metadata fields use JSON-object strings. This is distinct from the space-separated `scope` field in the OAuth token response. Use a contract-aware parser rather than splitting every claim on commas.

UserInfo returns `sub`, permitted standard profile/email/phone data, and tenant context when present. Discovery's `claims_supported` list does not promise that UserInfo returns the complete claim set. Use verified token claims for resource authorization and the current-account API for management account details.

## Backend Directory integration

Use a confidential client bound to one tenant and an enabled application. Allow `client_credentials` and only the required scopes. Authenticate using the registered token-endpoint authentication method; keep the secret in the backend's secret store.

Directory access checks:

- Resource audience `heimdall-directory-api`
- Identity claim `token_type=BackendService`
- Trusted token `tenant_id`
- `heimdall.directory.read` for reads or `heimdall.directory.write` for the scoped group mutations

The token response's `token_type` remains `Bearer`; `BackendService` is the separate identity claim inside the access-token identity.

The directory controller derives tenant identity from the validated server context. Its routes do not accept a caller-selected tenant. The user-permissions endpoint additionally requires trusted `application_id` so the returned permissions belong to the calling application's context.

Current group writes are `POST /api/backend/directory/groups`, `PUT /api/backend/directory/groups/{groupId}/members`, and `DELETE /api/backend/directory/groups/{groupId}`. The `PUT` replaces the membership set; it is not an incremental add. Grant write scope only to a service explicitly responsible for these operations.

For decisions that depend on current user state or permissions, fail closed when the authoritative check fails. A network error is not an empty successful permission set, and a stale positive cache entry should not authorize a new sensitive action.

## Renewal, revocation, and logout

Refresh requires an allowed refresh flow and effective `offline_access`. The token endpoint checks the subject's current state and application context. It rejects a refresh request that expands the original scope. Serialize concurrent refresh attempts in your client.

Full sign-out uses the Discovery `end_session_endpoint` and a registered post-logout callback. Clearing browser storage alone leaves the identity-provider session intact.

Heimdall's own Access Token validation checks stored token status, blacklist state, and subject/session revocation. A downstream server performing only offline JWT signature validation does not automatically inherit those database checks. Design the required revocation delay explicitly, using short token lifetime and the appropriate introspection or invalidation integration.

## Acceptance checklist

- Correct public client completes S256 PKCE; missing verifier and wrong callback are rejected
- A tenant client on the platform token route is rejected
- An API accepts the correct Access Token and rejects an ID Token, wrong audience, wrong issuer, and expired token
- Cross-tenant and cross-application access fails even when a user can see a frontend control
- Host API CORS and protocol CORS both permit only intended origins
- Logout, refresh failure, account disablement, and downstream revocation behavior match the application's security requirements

## Sources

- [PKCE enforcement](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/OidcPkceValidator.cs)
- [Token exchange, route matching, and refresh](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Token.cs)
- [Scope-to-resource mapping](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcScopeService.cs)
- [Audience fallback and token response](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/IdentityAuthorizationApplicationService.Helpers.cs)
- [Access and ID Token issuance and validation](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/OidcTokenService.cs)
- [Application-scoped authorization](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/AsgardIdentityClaimsBuilder.ApplicationAuthorization.cs)
- [Claim definitions](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/AsgardIdentityClaimTypes.cs)
- [UserInfo boundary](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/IdentityUserInfoApplicationService.cs)
- [Backend Directory authorization and methods](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Controllers/Tenants/BackendDirectoryController.cs)
- [Directory audience enforcement](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/BackendDirectoryAudienceAttribute.cs)
- [Frontend and logout integration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/custom-frontend-integration.md)
- [Identity scope serialization](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Protocol/OidcProtocolExtensions.cs)
