---
title: Run Heimdall locally
description: Start the identity service and console, then verify discovery, PKCE login, API access, refresh, and logout
order: 20
section: Getting started
---

This walkthrough uses an authorized checkout of `Asgard.Heimdall` and a disposable local environment. The backend runs at `http://localhost:5000`; the console runs at `http://localhost:3000`.

## 1. Prepare dependencies

- Install the .NET SDK selected by the repository's `global.json`: `10.0.401`, with `latestPatch` roll-forward
- Install Node.js and npm compatible with the console's package dependencies
- Prepare PostgreSQL, Redis, and RabbitMQ; the local guide uses ports `5432`, `6379`, and `5672`
- Use a dedicated local PostgreSQL database, not a production connection

The service expects its infrastructure to exist. The startup command below does not provision those dependencies.

## 2. Review local configuration

The plugin project contains `be/Asgard.Heimdall/app.yaml` and `be/Asgard.Heimdall/plugin.yaml`; the build copies them into the output. The Starter switches its working directory to that output directory. It uses the first argument as an explicit host configuration path, or `app.yaml` beside the executable when no path is supplied.

Before starting:

1. Set the database provider to `PostgreSQL` and provide your local connections, encryption material, and writable log paths
2. Set `oidc.issuer` to `http://localhost:5000`
3. Use public system client `asgard_default` with no client secret
4. Register `http://localhost:3000/callback` and `http://localhost:3000/logout-complete`
5. Allow `http://localhost:3000` in both host API CORS and the system client's OIDC CORS configuration
6. Enable `oidc.bootstrap.auto_sync_schema` only for this disposable local database

The checked-in development YAML enables schema synchronization and contains example signing/configuration material. Do not copy it into production. The configuration type's default for schema synchronization is `false`; the development file deliberately overrides it.

## 3. Bootstrap a local administrator

Default-admin creation runs in Development or when `Oidc:Bootstrap:SeedDefaultAdmin` is explicitly `true`. If the administrator does not exist and no password is supplied, creation is skipped. The default username is `asgard`.

In PowerShell, enter the initial password interactively and start the host:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Oidc__Bootstrap__SeedDefaultAdmin = 'true'
$password = Read-Host 'Local bootstrap password' -AsSecureString
$env:Oidc__Bootstrap__DefaultAdminPassword = [System.Net.NetworkCredential]::new('', $password).Password

dotnet run --project be/Asgard.Heimdall.Starter/Asgard.Heimdall.Starter.csproj
```

This puts the password in the backend process environment, so use a trusted local machine. After the first successful creation and stopping the host, clear the bootstrap variables before later launches:

```powershell
Remove-Item Env:Oidc__Bootstrap__DefaultAdminPassword
Remove-Item Env:Oidc__Bootstrap__SeedDefaultAdmin
Remove-Variable password
```

Bootstrap is not a password-reset mechanism. An existing administrator is not recreated with the supplied password.

## 4. Start the console

Open another terminal at the repository root:

```powershell
cd fe
npm install
npm run dev
```

Use `npm run dev`, which enforces port **3000** and fails when it is occupied. Do not silently move the preview to another port: the registered callbacks and environment settings must agree. Identify the owning process before stopping anything.

Open `http://localhost:3000/test-lab`.

## 5. Verify the entire identity path

1. Open `http://localhost:5000/.well-known/openid-configuration`. Confirm `issuer` is exactly the local authority and its endpoints target the backend
2. Open `http://localhost:5000/.well-known/jwks` and confirm public signing keys are available
3. In the test lab, check public endpoints and start login as the bootstrap administrator
4. Confirm Authorization Code + PKCE returns to `/callback` and completes token exchange
5. Check UserInfo, the Bearer current-account API, and active sessions
6. Test refresh. Request `offline_access` and configure the client for refresh-token use
7. Perform full logout and confirm the registered `/logout-complete` callback is reached

Swagger is available at `/swagger` with the supplied host settings. Use an **Access Token** for protected API requests. Do not paste tokens into issue reports, screenshots, or external decoding sites.

## Add your first application

For a tenant application, create or enable the application relationship and a public OIDC client inside the tenant. Register exact callback URLs and the frontend Origin. Configure your OIDC client library with the tenant authority, the registered client ID, `response_type: 'code'`, and the required scopes. Let the library perform Discovery, S256 PKCE, `state`, and callback validation.

Use `https://idp.example.com/{tenantId}` for a tenant client, rather than the platform authority. If the application calls a separate API, follow the [resource audience procedure](/en/heimdall/docs/security/) before treating login as successful API integration.

## When startup or login fails

- No administrator: check the bootstrap environment and password, then read the bootstrap log; a listening process does not prove the user was created
- Missing tables: check the selected database and local schema-sync setting
- Discovery reaches the console: check `UMI_APP_OIDC_AUTHORITY` / `UMI_APP_API_BASE_URL` and restart the frontend
- Token exchange blocked by CORS: check the client's protocol Origin list
- `/api/**` blocked by CORS: check the host API Origin list
- Immediate `401`: check Access Token usage, issuer, audience, expiration, and system clocks
- `403`: investigate permissions and application/tenant membership; repeated refresh is not a permission fix

Continue with [configuration](/en/heimdall/docs/configuration/) and [production operations](/en/heimdall/docs/operations/).

## Sources

- [Local startup and acceptance](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/docs/local-manual-testing.md)
- [Local port rules](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/AGENTS.md)
- [Starter configuration loading](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall.Starter/Program.cs)
- [Configuration copy rules](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Asgard.Heimdall.csproj)
- [Administrator bootstrap conditions](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Services/Services/Identity/Support/DefaultAdminBootstrapService.cs)
- [OIDC configuration defaults](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/be/Asgard.Heimdall/Config/PluginConfigs/OidcPluginConfig.cs)
- [Console OIDC settings](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/fe/src/services/oidcConfig.ts)
- [SDK selection](https://github.com/BenLampson/Asgard.Heimdall/blob/cb11218a50710c2c5aa74f58c928146513d93d25/global.json)
