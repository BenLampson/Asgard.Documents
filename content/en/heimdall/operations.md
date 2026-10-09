---
title: Deploy and operate Heimdall
description: Prepare PostgreSQL, proxy and signing configuration, controlled startup, maintenance jobs, verification, and rollback
order: 50
section: Operations
---

A working deployment needs more than a listening container. Verify its public issuer, schema, signing material, management login, resource authorization, and recovery path together.

## Deployment layout

The repository defines two images:

- `registry.cn-hangzhou.aliyuncs.com/benlampson/asgard.heimdall`: backend OIDC, APIs, MCP, and SCIM
- `registry.cn-hangzhou.aliyuncs.com/benlampson/asgard.heimdall.web`: Nginx management SPA and its `/health` endpoint

Build the backend and Web image from the same source revision and deploy the same immutable version. Record both resolved image digests; a source version or Compose default alone does not verify registry availability or the version running in an environment.

The supplied Compose file publishes backend port `5000`, exposes Web port `8080` on the external `CoreServer` network, mounts backend `app.yaml` and `plugin.yaml` read-only, and mounts a writable log directory. It does not create PostgreSQL, Redis, RabbitMQ, or the external Docker network. The Web image does not proxy backend API calls.

Prepare those dependencies and route the public identity hostname to the backend and the console hostname to the Web service. Review firewall exposure of the backend's published port instead of assuming the reverse proxy is the only entry point.

The repository's `be/Docker/deploy.sh` pulls both images and runs Compose `up -d --remove-orphans`. Supply an explicit verified version: running the script without an argument can select `latest`, even though the Compose file has a versioned default.

### Build the Web image for your domains

Before building, update all seven entries in `fe/config/config.prod.ts` as shown in [frontend configuration](/en/heimdall/docs/configuration/): authority, API base URL, public origin, client ID, login callback, logout callback, and scope. Align them with the backend issuer, registered system client, callback allowlists, and both CORS boundaries. The checked-in production values use the repository author's domains and client ID.

The current `fe/Dockerfile` builds static `dist` assets and serves them with Nginx; it has no runtime substitution for these settings. Backend YAML changes or container `UMI_APP_*` environment overrides alone leave the old values in the bundle. Rebuild the Web image from the edited source, assign your release's immutable tag, and deploy that image. Pulling an unchanged upstream Web image does not incorporate your edits.

After deployment, use a fresh browser session and inspect Network requests: Discovery must go to the intended authority, management API requests to the intended API base, and the authorization request must contain the expected `client_id` and exact `redirect_uri`. Verify the logout callback and requested scopes too. Test platform and built-in tenant-console login separately; their authority/client values differ. If old hosts or client IDs remain, verify the deployed image digest and loaded bundle before changing backend authentication policy.

## PostgreSQL and startup boundaries

Use PostgreSQL for application data and for any database-log connection. They are separate configuration surfaces. Heimdall maps application `DateTime` and `DateTimeOffset` fields to `timestamp(6) without time zone` and treats their values as UTC; keep that convention in reporting and maintenance scripts.

For production, use controlled schema deployment and set `oidc.bootstrap.auto_sync_schema: false`. This disables the plugin's CodeFirst table synchronization. **It does not make startup read-only.** Startup still performs tenant CORS backfill, PostgreSQL conditional-index/data compatibility work, runtime-settings backfill, and built-in RBAC/bootstrap work.

Before rolling out a new executable:

1. Back up the database and verify the restore procedure
2. Compare the target entity/schema requirements with the database you actually have
3. Review relevant scripts under `be/Database/Migrations`; plan required DDL and data changes before startup
4. Prepare every required table and column when automatic synchronization is disabled
5. Verify that the deployment identity has the permissions required by the remaining startup work
6. Test startup against a restored copy and inspect migration/bootstrap logs

The migration directory contains targeted changes, not a promise that one script initializes every table in an empty production database. Automatic entity synchronization is also not a substitute for semantic data migrations, compatibility checks, or a rollback plan.

### Runtime settings migration

The runtime settings migration reads legacy `heimdall_system_settings`, writes missing system values to `heimdall_runtime_settings`, and records `heimdall_runtime_setting_history`. It uses a distributed lock and skips values already present in the new store.

Prepare the new tables before startup when synchronization is disabled. Follow the repository's expand/contract runbook: retain the legacy table during the compatibility window, verify effective values and history, and do not remove the rollback path until all nodes and data have been checked. A missing table is a deployment blocker, not a reason to enable schema synchronization indiscriminately on a live database.

### Administrator bootstrap

Default-admin seeding requires Development or explicit `Oidc:Bootstrap:SeedDefaultAdmin=true`. Creating the missing administrator also requires a supplied password. Existing-user bootstrap ensures its built-in administrator role; it does not reset the password.

Use an intentional, controlled initial provisioning step and remove the bootstrap secret afterward. The plugin catches and logs administrator-seeding errors, so successful process startup is not sufficient evidence that an administrator can log in.

## Reverse proxy, issuer, and cookies

Set `oidc.issuer` to the public HTTPS origin. Verify both platform and tenant Discovery from outside the container network; neither `issuer` nor any advertised endpoint should expose an internal hostname.

The authority service uses the configured issuer, or the request's scheme/host/path base when it is absent. Plugin code does not independently trust forwarded headers. Configure trusted proxy/header handling in the host when needed; do not trust arbitrary client-supplied forwarded headers.

The identity cookie is HttpOnly, uses SameSite `Lax`, and has `SecurePolicy=SameAsRequest`. Setting a public HTTPS issuer does not itself make the incoming ASP.NET request HTTPS. Verify the actual `Set-Cookie` Secure attribute through the deployed proxy, as well as login, consent, and logout redirects.

## Signing keys and maintenance jobs

System signing requires a private RSA key outside Development. Keep it persistent, backed up securely, and available to the intended instances. An ephemeral development key changes across restarts and is unsuitable for stable token validation.

Tenant key rotation is a separate mechanism. The rotation job reads runtime keys such as:

- `oidc.key_rotation.enabled`
- `oidc.key_rotation.retention_days`
- `oidc.key_rotation.interval_days`
- `oidc.key_rotation.rsa_key_size`

Rotation is disabled by default in the configuration type. The default retention is 30 days, interval fallback is 7 days, and generated RSA size is 2048 bits. The job uses elapsed time since activation for the interval check; the bootstrap property name `rotate_before_expire_days` should not be read as an expiry-only trigger.

Activation puts the previous tenant key into a retiring period before final retirement. Set retention to cover the tokens and validation caches that still need the old public key, and test JWKS refresh behavior before shortening it. This job does not rotate the system signing key.

Token cleanup and long-term authorization cleanup have separate jobs and enable flags. Use `oidc.cleanup.dry_run` to inspect cleanup counts before changing retention. Defaults include one day after authorization-code expiry, seven days after access-token expiry, and 30 days after refresh-token termination. Confirm the scheduler is enabled and job execution is actually visible in logs; a configuration class alone does not run a job.

## MCP operational limits

`/mcp` is an authenticated, stateful management endpoint. Bearer tokens must target the built-in management application; AK/SK credentials are user-owned and constrained by current account permissions and credential policy. AK/SK does not provide a general REST API bypass.

Mutating tools use a preview followed by a caller-, tool-, and payload-bound, single-use confirmation token. Credential secrets and newly generated client/webhook secrets must go directly to a secret store, not audit logs.

The current registration uses `InMemoryMcpTaskStore`, with a 24-hour default TTL, seven-day maximum TTL, 10,000-task global limit, and 500-task per-session limit. Do not assume tasks survive process restarts or are shared across replicas. Design a shared durable task store and the associated session/rate/concurrency behavior before treating horizontal scaling as supported by your deployment.

## Verify a deployment

From the deployment directory, inspect both containers:

```bash
docker compose ps
docker inspect asgard-heimdall-starter --format '{{.Config.Image}} {{.State.Status}} {{.RestartCount}}'
docker inspect asgard-heimdall-web --format '{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}} {{.RestartCount}}'
```

Then verify:

- Web `/health` and SPA assets. This Web health check does not prove backend/database readiness
- Public platform and tenant Discovery, exact issuer, and JWKS
- Full PKCE login, current-account API, refresh, and logout
- A protected API rejects a missing token; wrong audience, wrong application, and wrong tenant also fail
- Expected cleanup/rotation policy, job logs, signing-key availability, and runtime-settings values
- A real downstream service can obtain and use its tenant-bound token

Repository validation commands include:

```powershell
dotnet test --project be/Test/Asgard.Heimdall.Tests/Asgard.Heimdall.Tests.csproj -c Release
cd fe
npm run typecheck
npm run lint
npm run build
```

PostgreSQL compatibility tests require a dedicated disposable database through `HEIMDALL_TEST_POSTGRES`. Never point that test setting at production.

## Rollback

Record the prior backend and Web image digests, configuration, proxy configuration, and database state before rollout. Roll back both application images together, then repeat the public protocol and login checks.

Application rollback does not undo database migrations. Confirm the old executable can read the new schema and data before switching it back. If a contract migration removed compatibility data, restore or reconcile that data through a reviewed recovery plan rather than assuming an old image is sufficient.

## Sources

- [Production frontend configuration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/config/config.prod.ts)
- [Static Web image build](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/Dockerfile)
- [Console authority and client resolution](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/src/services/oidcConfig.ts)
- [Compose topology](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Docker/docker-compose.yaml)
- [Deployment script](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Docker/deploy.sh)
- [Container deployment and rollback](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Docker/README.md)
- [Startup sequence and schema-sync scope](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/OidcPlugin.cs)
- [PostgreSQL time mapping](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Support/PostgreSqlEntityMapping.cs)
- [Runtime-settings migration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Platform/RuntimeSettingsMigrationService.cs)
- [Runtime-settings rollout runbook](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Database/Migrations/README.runtime-settings.md)
- [Administrator bootstrap](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/DefaultAdminBootstrapService.cs)
- [Identity cookie configuration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Identity/Infrastructure/OidcServerConfig.cs)
- [Tenant key-rotation job](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Jobs/RotateTenantOidcKeysJob.cs)
- [Cleanup job](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Jobs/OidcTokenCleanupJob.cs)
- [MCP task-store registration](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Extensions/HeimdallModuleRegistrationExtensions.cs)
- [MCP authentication and confirmation](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/mcp-management.md)
- [Build and test commands](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/README.md)
