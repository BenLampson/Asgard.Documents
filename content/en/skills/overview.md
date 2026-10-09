---
title: "Asgard.Skills overview"
description: "Give AI coding assistants Asgard conventions, source references, and review workflows."
order: 10
section: "Get started"
---

Asgard.Skills is an independently maintained repository of AI skills for the Asgard ecosystem. It packages framework conventions, task routing, source references, and templates for coding assistants working on Asgard backends, admin frontends, Heimdall identity integrations, and .NET tests.

The repository currently contains **30 skill directories**. Start with [installation](/en/skills/docs/installation/), then choose an entry point from the [complete catalog](/en/skills/docs/catalog/).

## What it helps with

- Place plugin code, starter projects, configuration, and business layers in the appropriate locations
- Apply `BaseController`, DTO-to-VO mapping, response wrappers, and authorization boundaries while implementing APIs
- Find module-specific configuration, interfaces, and usage constraints before integrating infrastructure
- Distinguish login protocols, standard claims, application permissions, service identity, and MCP management in Heimdall integrations
- Review backend changes for tenant boundaries, audit fields, and optimistic-concurrency mistakes

Skills provide development context and instructions. Installing them does not install Asgard NuGet packages, run a host, configure an identity provider, or verify your application code.

## Inside a skill

The entry point is `skills/<name>/SKILL.md`. Additional files depend on the skill; not every directory contains every kind of resource.

| File or directory | Purpose |
| --- | --- |
| `SKILL.md` | Name, concise description, task triggers, core constraints, and further reading |
| `agents/openai.yaml` | Display metadata and a default prompt, where supplied |
| `references/` | Detailed guidance, source copies, protocol contracts, or review checklists |
| `templates/` | Code or configuration templates to adapt to the task |
| `assets/`, `examples/`, or other files | Supplementary material supplied by individual skills |

Read the references relevant to the task rather than loading every skill at once. Check template names, versions, configuration, and dependencies against the target project. A source copy inside a skill is not the running library.

## Choose an entry point

| Task | Start with |
| --- | --- |
| The responsible module is unclear | `asgard-framework-overview` |
| Create a plugin and starter | `asgard-plugin-structure`, then the plugin or host skill |
| Write Asgard C# | `asgard-dotnet-10-csharp-14` plus the relevant module skill |
| Add or change a business API | `asgard-api-development` |
| Integrate login, OIDC, PKCE, or JWT validation | `identity-integration` |
| Issue lightweight JWTs after an existing login check | `asgard-mini-jwt-issuer` |
| Review backend changes | `asgard-backend-guard` |
| Write or change .NET unit tests | `dotnet-unit-testing` |

`dotnet-10-csharp-14` is general .NET guidance. The coding-convention entry point for Asgard is `asgard-dotnet-10-csharp-14`; they have different scopes.

## Stay aligned with the target project

Read the target project's package references, centrally managed versions, and build configuration first. **Current project source, configuration types, and tests take precedence over copied source snapshots inside a skill**. When they disagree, identify the specific API or behavior difference and follow the target implementation. Do not upgrade dependencies merely to fit a template.

For example, the cache skill uses `IAsgardCache` as its current entry point, while its directory also contains version-qualified reference material. Verify cache registration and disabled behavior in the actual project instead of copying interfaces from an older reference. Likewise, trace real registration and execution paths before asserting messaging retries, persistent jobs, plugin-state transitions, or middleware order.

Static validation checks file structure, links, and some API constraints. It does not prove that an assistant loaded the skill, that automatic invocation is reliable, or that generated application code works. See the [development and review workflow](/en/skills/docs/workflow/) for the complete process.

## Source references

- [Repository README](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/README.md)
- [Task routing and source precedence](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
- [Asgard coding conventions](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-dotnet-10-csharp-14/SKILL.md)
- [Current cache entry point](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-cache/SKILL.md)
- [Static validator](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/validate_skills.py)
