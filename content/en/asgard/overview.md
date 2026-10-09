---
title: "Asgard overview"
description: "Compose .NET applications with a shared host and focused business plugins"
order: 10
section: "Getting started"
---

Asgard is a modular application framework built on ASP.NET Core. The Yggdrasil host owns configuration, dependency injection, the Web pipeline, and infrastructure lifetimes; plugins own business capabilities. The current source version is **6.0.2**, targeting **.NET 10 / C# 14**. Repository development uses SDK **10.0.401**.

## Start with your task

- Build your first API: follow the [quick start](/en/asgard/docs/quick-start/) without a database, Redis, or RabbitMQ
- Organize a production application: use [host and plugin architecture](/en/asgard/docs/architecture/) to separate business modules from the deployment entry point
- Add infrastructure: enable the modules in [configuration](/en/asgard/docs/configuration/), then read [data and background work](/en/asgard/docs/infrastructure/)
- Connect an identity provider: define the API issuer, audience, and tenant boundary before following [security and identity](/en/asgard/docs/security/)
- Work with an AI agent: install [Asgard Skills](/en/skills/docs/installation/) and select the skills relevant to the task

## What the framework provides

**Host composition.** `YggdrasilHost.CreateBuilder(...)` exposes configuration, service-registration, and middleware hooks. `PluginWebAppDefaults.RunAsync<TPlugin>()` provides a shorter path for a built-in plugin.

**Consistent APIs.** Controllers inherit `BaseController` and return `Response<T>`, `PageResponse<T>`, or `CursorResponse<T>`. Dependency injection connects services and repositories.

**Optional infrastructure.** FreeSql persistence, Redis business caching and distributed locks, RabbitMQ messaging, and Quartz jobs are configuration-driven. Enabling a module does not provision its external service or permissions.

**Identity and observability.** Built-in JWT resource-server authentication, tenant context, AsgardAuth checks, Serilog logging, and request Trace expose shared capabilities to application code.

## Projects and package responsibilities

- `Asgard.Abstractions`: interfaces, entities, configuration models, and shared contracts
- `Asgard.Abstractions.AspNetCore`: controllers, response models, host options, and authorization contracts
- `Asgard.Core`: configuration, plugins, persistence, and infrastructure implementations
- `Asgard.AspNetCore.Core`: Web identity, tenancy, Trace, and related implementations
- `Asgard.Yggdrasil.AspNetCore`: application host and startup orchestration
- `Asgard.PluginSdk`: plugin dependencies, conventions, and quick startup
- `Asgard.TsGen`: TypeScript client generation from backend contracts
- `Asgard.Analyzers`: build-time coding checks; the analyzer itself targets `netstandard2.0` for compiler-host compatibility

These identifiers come from the source projects. When choosing published packages, verify availability in your package feed rather than assuming every package has been published at the source version.

## How Heimdall and Skills fit

[Heimdall](/en/heimdall/docs/overview/) is an independently maintained identity service for tenants, clients, and OIDC/OAuth flows. An Asgard resource API can validate appropriate JWTs it issues. Dependency versions evolve separately; sharing a documentation site does not mean the products use the same framework version.

[Skills](/en/skills/docs/overview/) provide agents with coding constraints, task workflows, and source entry points. They support implementation; runtime source and project tests remain authoritative for API signatures and behavior.

## Source references

These links point to the implementation. Repository access is required to open the source.

- [Version and runtime](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Directory.Build.props)
- [SDK selection](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/global.json)
- [Framework entry points](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/README.md)
- [Plugin SDK dependencies](https://github.com/BenLampson/Asgard/blob/7fff18e7f2517aa03d416f70cb452cc616e6c386/src/Plugins/Asgard.PluginSdk/Asgard.PluginSdk.csproj)
