---
title: "Complete skill catalog"
description: "Find all 30 Asgard, Heimdall, and .NET skills by task and responsibility."
order: 30
section: "Guides"
---

These **30 skills** cover every `skills/<name>/SKILL.md` present in the repository. Each name links directly to its source entry point. Select the skills needed for the task, then follow their reference-reading instructions.

This catalog describes skill scope. It does not assert that every copied source snapshot matches the target application version. Verify APIs, defaults, and runtime behavior against the actual project source and tests.

## Framework entry points and project structure

| Skill | When to use it |
| --- | --- |
| [asgard-framework-overview](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md) | Route cross-module tasks and distinguish host, plugin, and infrastructure responsibilities. Go directly to the specialized skill when the module is already clear. |
| [asgard-dotnet-10-csharp-14](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-dotnet-10-csharp-14/SKILL.md) | The Asgard C# coding-convention authority: file rules, comments, DI, and update conventions. |
| [asgard-plugin-structure](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-plugin-structure/SKILL.md) | Plugin/starter layout, project dependencies, GlobalUsings, model placement, and mappers. |
| [asgard-host-project](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-host-project/SKILL.md) | Program.cs, YggdrasilHost startup, host hooks, and built-in plugin hosting. |
| [asgard-plugin-development](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-plugin-development/SKILL.md) | PluginBase, built-in plugin entry points, AddPluginConventions, and plugin.yaml wiring. |
| [asgard-plugin-lifecycle](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-plugin-lifecycle/SKILL.md) | Plugin phases, startup/shutdown order, states, and service availability. Verify behavior against the actual runtime path. |
| [asgard-base-types](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-base-types/SKILL.md) | Inheritance and fields for BaseController, Response, PluginBase, context, identity, and audited entities. |

## APIs, data, and configuration

| Skill | When to use it |
| --- | --- |
| [asgard-api-development](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-api-development/SKILL.md) | Business controllers, /api routes, VOs, response wrappers, and pagination. Use the authorization skill for access expressions. |
| [asgard-database](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-database/SKILL.md) | Database configuration, FreeSql entities/repositories, tenant filtering, auditing, soft deletion, and optimistic concurrency. |
| [asgard-repository-service-registration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-repository-service-registration/SKILL.md) | DI registration using RepositoryAttribute, assembly scanning, AddRepositories, and PluginConventions. |
| [asgard-configuration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-configuration/SKILL.md) | app.yaml, plugin.yaml, ConfigPath, typed configuration, placeholders, and load precedence. |
| [asgard-context-usage](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-context-usage/SKILL.md) | Access capabilities through AbsAsgardContext, including nullability, lifetime, tenant scopes, and Trace notes. |
| [asgard-host-features](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-host-features/SKILL.md) | host.* authentication wiring, middleware, CORS, Swagger, TsGen, rate limiting, and health checks. |

## Infrastructure and observability

| Skill | When to use it |
| --- | --- |
| [asgard-cache](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-cache/SKILL.md) | Redis business caching through IAsgardCache, TTLs, invalidation, and disabled behavior. Excludes internal OIDC/JWKS caches. |
| [asgard-distributed-lock](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-distributed-lock/SKILL.md) | Redis IDistributedLock registration, renewal, LockLostToken, and safe release. |
| [asgard-messaging](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-messaging/SKILL.md) | RabbitMQ, MQConfig, publishing/subscribing, and delivery guidance. Check advanced options against the actual implementation. |
| [asgard-job-scheduling](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-job-scheduling/SKILL.md) | JobConfig, cron/simple triggers, runtime registration, plugin job wiring, and Context calls. |
| [asgard-security](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-security/SKILL.md) | Encryption, password hashing, and key generation through Encryption, PasswordHasher, and KeyGenerator. |
| [asgard-tracing-observability](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-tracing-observability/SKILL.md) | Request traces, trace persistence, database logs, query services, and redacted failure snapshots. |

## Identity, authorization, and Heimdall

| Skill | When to use it |
| --- | --- |
| [identity-integration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/identity-integration/SKILL.md) | Web login, OIDC/PKCE, JWT validation, frontend/backend responsibilities, and /userinfo boundaries. |
| [asgard-identity-userinfo](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-identity-userinfo/SKILL.md) | AbsAsgardUserInfo, standard claims, identity snapshots, application/tenant fields, and test identities. |
| [asgard-auth-authorization](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-auth-authorization/SKILL.md) | AsgardAuth attributes, DSL, roles, permissions, scope, and token_type. Business code must still check resource ownership. |
| [asgard-mini-jwt-issuer](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-mini-jwt-issuer/SKILL.md) | Lightweight JWT issuance and discovery/JWKS after existing login checks. Not a replacement for full OIDC, PKCE, or session governance. |
| [heimdall-service-integration](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-service-integration/SKILL.md) | BackendService identity, client_credentials, read-only directories, identity-invalidation webhooks, and revocation reconciliation. |
| [heimdall-application-rbac](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-application-rbac/SKILL.md) | Application Manifest, TenantApplication, application administrator grants, application-scoped RBAC, and version claims. |
| [heimdall-mcp-management](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-mcp-management/SKILL.md) | /mcp, OAuth/AK-SK, tools/resources/tasks, two-stage write confirmation, credential policies, and tenant auditing. |

## Frontend, testing, and review

| Skill | When to use it |
| --- | --- |
| [asgard-admin-frontend](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-admin-frontend/SKILL.md) | Umi, Ant Design Pro, page routing, DVA, and shared API calls. Use identity-integration for login protocol design. |
| [dotnet-unit-testing](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/dotnet-unit-testing/SKILL.md) | .NET/C# unit tests, xUnit v3, fixtures, assertions, mocks, and test commands. |
| [asgard-backend-guard](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-backend-guard/SKILL.md) | Post-implementation review of layers, responses, tenancy, auditing, and concurrency. Does not replace module implementation skills. |

## General .NET reference

| Skill | When to use it |
| --- | --- |
| [dotnet-10-csharp-14](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/dotnet-10-csharp-14/SKILL.md) | General .NET 10/C# 14 applications, Minimal APIs, and infrastructure outside Asgard. |

## Combine skills by task

- **CRUD API:** coding conventions + API development + database; add repository/service registration when needed, then run the backend review
- **Plugin skeleton:** project structure + plugin development + host project; add lifecycle guidance for startup-phase details
- **SPA login:** identity integration + user information + host features; add the frontend skill for admin-page implementation
- **Service identity:** Heimdall service integration + user information + authorization; add application RBAC for application-scoped access
- **Testing and delivery:** relevant module + unit testing + backend review, followed by actual project checks

Some source instructions reference separately provided skills, such as `heimdall-production-release`. It is not one of these 30 directories and is not installed by this repository's installer.

See [installation](/en/skills/docs/installation/) for setup and the [development and review workflow](/en/skills/docs/workflow/) for execution steps.

## Source references

- [Complete skill tree](https://github.com/BenLampson/Asgard.Skills/tree/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills)
- [Module selection](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
- [Validation boundary for external skill references](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/validate_skills.py)
