---
title: "Development and review workflow"
description: "Select skills, verify real APIs, implement within project boundaries, and validate with tests and backend review."
order: 40
section: "Guides"
---

Reliable AI-assisted development combines the right skills, actual project source, clear business boundaries, and executed checks. Installing skills is only the starting point.

## 1. Establish the task and project facts

Have the assistant identify the target repository, projects to change, existing layers, dependency versions, and relevant tests. Preserve an existing separation between the plugin implementation and its starter.

When the module is unclear, use `asgard-framework-overview` to select an entry point. When the task already concerns a specific module such as caching, databases, or identity, read that skill directly.

```text
Use $asgard-framework-overview to analyze this project.
Read package references and build configuration first. Identify the plugin,
starter, and module responsible for this task. List the skills and source entry
points to read. Do not upgrade dependencies just to fit a template.
```

Do not infer versions from directory names. If a copied source file in a skill disagrees with the target project, follow the actual project source and explain the affected API or behavior.

## 2. Load the smallest useful combination

Choose entry points from the [complete catalog](/en/skills/docs/catalog/), then read their required references. Use `asgard-dotnet-10-csharp-14` for Asgard C# conventions and `asgard-plugin-structure` for layout. Specialized skills own the implementation details of their modules.

| Task | Skill combination |
| --- | --- |
| Create a plugin and starter | Plugin structure, plugin development, host project, Asgard coding conventions |
| Change a CRUD API | API development, database, Asgard coding conventions; add repository/service registration when needed |
| Add an authorization condition | Authorization and user information; add identity integration for login-flow work |
| Use caching or locks | Cache or distributed lock, plus context; verify registration and availability in the target project |
| Integrate Heimdall service identity | Service integration, user information, authorization; add application RBAC when relevant |
| Change an admin page | Admin frontend; add identity integration for protocol design and API development for backend changes |

Some skills require reading full contracts first. For example, `heimdall-application-rbac` points to a domain contract and review checklist, while `heimdall-service-integration` points to an integration guide and scenario-specific references. Their short descriptions alone are not enough to implement those tasks.

## 3. Implement within real boundaries

Apply these backend review checks:

- Business controllers inherit `BaseController`, and business API routes start with `/api`
- Follow `Controller -> Service -> Repository -> Entity`; services produce DTOs, and controllers map to VOs and return response wrappers
- Query the current database entity before applying permitted update fields; do not rebuild an entity from a DTO and submit it directly for an optimistic-concurrency update
- Do not allow frontend input to overwrite tenant ownership, audit fields, or persisted version fields
- Model application and test identities using `AbsAsgardUserInfo` and the standard claims contract
- Do not treat authorization attributes as a substitute for business resource-ownership checks
- Check registration and disabled behavior before using optional infrastructure; do not assume every Context capability is always available

For example, a focused update task might use this prompt:

```text
Use $asgard-dotnet-10-csharp-14, $asgard-api-development, and $asgard-database
to implement an update endpoint for the current business entity, preserving
the existing layout and mapping approach. Load the current entity first, change
only permitted business fields, and preserve tenancy, auditing, and optimistic
concurrency. Then use $asgard-backend-guard and run the relevant tests.
```

This illustrates a working approach. The actual task still determines the entity, permissions, allowed fields, and test scope.

## 4. Verify identity and client boundaries separately

A parseable token is not a completed integration. Use the relevant skills to check issuer, audience, signature, expiry, `token_type`, scope, tenant, and business authorization. Test incorrect identities and unauthorized requests.

- Design browser OIDC login with Authorization Code + PKCE using `identity-integration`; never embed a Client Secret in the browser
- Authenticate API calls with Access Tokens, not ID Tokens
- Use `asgard-identity-userinfo` for standard claims and test identities
- Use `asgard-mini-jwt-issuer` for token issuance after existing login checks; it does not provide full OIDC, PKCE, refresh, or session revocation
- Follow the admin project's selected shared API-client strategy; use TsGen directories only when the project selects TsGen, and keep generated directories free of handwritten business code

Treat these as acceptance checks. Continue to verify exact configuration keys, endpoints, and runtime behavior against the current Asgard or Heimdall implementation.

## 5. Review the implementation and execute tests

Use `asgard-backend-guard` after adding or changing a `Controller / Service / Repository / Entity / DTO / VO`, or when changes involve `TenantId`, `Version`, deletion/restoration, or response wrappers.

The review should lead with bugs, risks, regressions, and missing tests, identifying files, methods, and triggering conditions. Data-integrity and authorization issues take priority over style suggestions. Even a review with no confirmed issues should state what remains unverified.

For test work, load `dotnet-unit-testing` and use the project's actual commands for builds, unit tests, and relevant integration checks. The skill requires xUnit v3 for new tests. When touching an existing test project, check its migration instructions against the task's scope first; do not hide a test-framework change in unrelated work.

Choose relevant validation scenarios:

- Valid and invalid inputs
- Cross-tenant access and insufficient permissions
- Concurrent updates, deletion, or restoration conflicts
- Disabled or unavailable dependencies
- Successful compilation after regenerating a selected API client

For skill-only changes, run `python -X utf8 scripts/validate_skills.py`. Application-code changes also require the application's own checks. Skill validation cannot replace compilation, tests, or actual protocol integration testing.

## 6. Deliver verifiable results

Ask the assistant to report:

1. What changed, including files and behavior
2. Which skills, APIs, and actual source references informed the work
3. Which commands passed, failed, or were not run
4. Configuration, external dependencies, and risks still requiring verification
5. Any disagreement between skill snapshots and implementation, including which behavior was followed and why

Completion depends on inspectable code and verification results, rather than a claim that every convention was followed. For setup problems, see [installation and verification](/en/skills/docs/installation/).

## Source references

- [Task and version selection](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
- [Coding and update conventions](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-dotnet-10-csharp-14/SKILL.md)
- [Backend review and reporting requirements](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-backend-guard/SKILL.md)
- [Identity integration boundaries](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/identity-integration/SKILL.md)
- [Mini issuer scope](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-mini-jwt-issuer/SKILL.md)
- [Frontend client strategy](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-admin-frontend/SKILL.md)
- [Testing conventions](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/dotnet-unit-testing/SKILL.md)
- [Heimdall service integration reading guide](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/heimdall-service-integration/SKILL.md)
