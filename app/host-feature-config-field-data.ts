export type HostFeatureGroup =
  | "static-files"
  | "cors"
  | "auth"
  | "swagger"
  | "tsgen"
  | "rate-limiting"
  | "health-check"
  | "plugin-host";

export type HostFeatureRuntimeStatus =
  | "wired"
  | "partially-wired"
  | "registered-opt-in"
  | "development-only"
  | "validation-only"
  | "declared-unwired";

export type HostFeatureNote =
  | "always-public"
  | "default-files-drift"
  | "path-created"
  | "cors-node-trap"
  | "cors-opt-in-policy"
  | "cors-no-method-list"
  | "auth-gate-only"
  | "auth-request-time"
  | "issuer-two-stage"
  | "swagger-disabled-validates"
  | "swagger-prefix-gap"
  | "tsgen-dev-public"
  | "global-rate-key"
  | "policy-specific"
  | "disabled-validates"
  | "health-timeout-unwired"
  | "health-public"
  | "health-deduplicates"
  | "plugin-module-gate"
  | "plugin-hot-reload-unwired"
  | "plugin-timeout-unwired"
  | "plugin-isolation-boundary"
  | "plugin-path"
  | "plugin-explicit-only"
  | "plugin-exclude-boundary"
  | "plugin-id-overwritten"
  | "plugin-scan-shape";

export type HostFeatureConfigField = {
  group: HostFeatureGroup;
  path: string;
  type: string;
  defaultValue: string;
  presence: "always" | "parent-present" | "collection-item";
  validation: string;
  status: HostFeatureRuntimeStatus;
  sourceMember: string;
  sensitive?: boolean;
  note?: HostFeatureNote;
};

const field = (
  group: HostFeatureGroup,
  path: string,
  type: string,
  defaultValue: string,
  presence: HostFeatureConfigField["presence"],
  validation: string,
  status: HostFeatureRuntimeStatus,
  sourceMember: string,
  options: Pick<HostFeatureConfigField, "sensitive" | "note"> = {},
): HostFeatureConfigField => ({ group, path, type, defaultValue, presence, validation, status, sourceMember, ...options });

export const hostFeatureConfigBaseline = {
  frameworkVersion: "5.1.3",
  sourceCommit: "d1002d1af5478e74669a3f0128ed9d4e43465dc2",
  inspectedOn: "2026-07-28",
} as const;

export const hostFeatureConfigFields: HostFeatureConfigField[] = [
  field("static-files", "host.staticFiles.enabled", "bool", "true", "always", "false skips child validation", "wired", "StaticFileHostOptions.Enabled / UseAsgardStaticFiles", { note: "always-public" }),
  field("static-files", "host.staticFiles.webRootPath", "string", "wwwroot", "always", "nonblank when enabled", "wired", "StaticFileHostOptions.WebRootPath / ResolveWebRootPath", { note: "path-created" }),
  field("static-files", "host.staticFiles.requestPath", "string", '"" (site root)', "always", "empty or starts with /", "wired", "StaticFileHostOptions.RequestPath / NormalizeRequestPath"),
  field("static-files", "host.staticFiles.enableDefaultFiles", "bool", "false", "always", "—", "wired", "StaticFileHostOptions.EnableDefaultFiles / UseAsgardStaticFiles", { note: "default-files-drift" }),
  field("static-files", "host.staticFiles.defaultFiles", "string[]", "[index.html]", "always", "nonempty, nonblank items when default files enabled", "wired", "StaticFileHostOptions.DefaultFiles / DefaultFilesOptions"),

  field("cors", "host.cors.enabled", "bool", "true", "parent-present", "does not skip policy validation when false", "wired", "CorsOptions.Enabled / AddCors / UseCors", { note: "cors-node-trap" }),
  field("cors", "host.cors.defaultPolicy", "object", "new policy", "parent-present", "always required and validated", "wired", "CorsOptions.DefaultPolicy / AddDefaultPolicy", { note: "cors-node-trap" }),
  field("cors", "host.cors.policies.<name>", "dictionary item", "none", "collection-item", "every policy validated", "registered-opt-in", "CorsOptions.Policies / AddPolicy", { note: "cors-opt-in-policy" }),
  field("cors", "host.cors.{defaultPolicy|policies.<name>}.allowAnyOrigin", "bool", "false", "parent-present", "mutually exclusive with allowCredentials", "wired", "CorsPolicyOptions.AllowAnyOrigin / ConfigureCorsPolicy"),
  field("cors", "host.cors.{defaultPolicy|policies.<name>}.allowedOrigins", "string[]", "[]", "parent-present", "at least one when allowAnyOrigin=false; items not prevalidated", "wired", "CorsPolicyOptions.AllowedOrigins / WithOrigins"),
  field("cors", "host.cors.{defaultPolicy|policies.<name>}.allowAnyMethod", "bool", "true", "parent-present", "—", "wired", "CorsPolicyOptions.AllowAnyMethod / AllowAnyMethod", { note: "cors-no-method-list" }),
  field("cors", "host.cors.{defaultPolicy|policies.<name>}.allowAnyHeader", "bool", "true", "parent-present", "—", "wired", "CorsPolicyOptions.AllowAnyHeader / AllowAnyHeader", { note: "cors-no-method-list" }),
  field("cors", "host.cors.{defaultPolicy|policies.<name>}.allowCredentials", "bool", "false", "parent-present", "mutually exclusive with allowAnyOrigin", "wired", "CorsPolicyOptions.AllowCredentials / AllowCredentials"),
  field("cors", "host.cors.{defaultPolicy|policies.<name>}.preflightMaxAgeSeconds", "int s", "600", "parent-present", ">= 0", "wired", "CorsPolicyOptions.PreflightMaxAgeSeconds / SetPreflightMaxAge"),

  field("auth", "host.auth.enabled", "bool", "true", "parent-present", "false skips jwt validation", "wired", "AuthOptions.Enabled / RegisterAuthenticationServices", { note: "auth-gate-only" }),
  field("auth", "host.auth.jwt", "object", "new JwtOptions", "parent-present", "non-null when auth enabled", "wired", "AuthOptions.Jwt"),
  field("auth", "host.auth.jwt.issuerTemplate", "string", '""', "parent-present", "nonblank; absolute URI; HTTPS when required; exactly one {tenant} at service registration", "wired", "JwtOptions.IssuerTemplate / AsgardIssuerTemplateValidator", { note: "issuer-two-stage" }),
  field("auth", "host.auth.jwt.audience", "string", "Asgard.Users", "parent-present", "nonblank", "wired", "JwtOptions.Audience / AudienceValidator"),
  field("auth", "host.auth.jwt.requireHttpsMetadata", "bool", "true", "parent-present", "requires HTTPS issuer template", "wired", "JwtOptions.RequireHttpsMetadata / discovery and JWKS providers"),
  field("auth", "host.auth.jwt.discoveryCacheMinutes", "int min", "60", "parent-present", "> 0", "wired", "JwtOptions.DiscoveryCacheMinutes / AsgardOidcDiscoveryProvider", { note: "auth-request-time" }),
  field("auth", "host.auth.jwt.jwksCacheMinutes", "int min", "15", "parent-present", "> 0", "wired", "JwtOptions.JwksCacheMinutes / AsgardJwksProvider", { note: "auth-request-time" }),

  field("swagger", "host.swagger.enabled", "bool", "true", "parent-present", "does not skip other field validation", "wired", "SwaggerOptions.Enabled / AddSwaggerGen / UseSwagger", { note: "swagger-disabled-validates" }),
  field("swagger", "host.swagger.title", "string", "Asgard API", "parent-present", "nonblank even when disabled", "wired", "SwaggerOptions.Title / OpenApiInfo.Title"),
  field("swagger", "host.swagger.description", "string", '""', "parent-present", "—", "wired", "SwaggerOptions.Description / OpenApiInfo.Description"),
  field("swagger", "host.swagger.version", "string", "v1", "parent-present", "nonblank even when disabled", "wired", "SwaggerOptions.Version / SwaggerDoc"),
  field("swagger", "host.swagger.routePrefix", "string", "swagger", "parent-present", "nonblank; path shape not prevalidated", "partially-wired", "SwaggerOptions.RoutePrefix / UseSwaggerUI", { note: "swagger-prefix-gap" }),

  field("tsgen", "host.tsGen.enabled", "bool", "false", "parent-present", "Validate is empty", "development-only", "TsGenHostOptions.Enabled / MapTsGenerationEndpoint", { note: "tsgen-dev-public" }),

  field("rate-limiting", "host.rateLimiting.enabled", "bool", "true", "parent-present", "does not skip other field validation", "wired", "RateLimitingOptions.Enabled / RegisterRateLimiting", { note: "disabled-validates" }),
  field("rate-limiting", "host.rateLimiting.policy", "string", "FixedWindow", "parent-present", "exactly FixedWindow, SlidingWindow, or TokenBucket", "wired", "RateLimitingOptions.Policy / GlobalLimiter", { note: "global-rate-key" }),
  field("rate-limiting", "host.rateLimiting.permitLimit", "int", "100", "parent-present", "> 0 for every policy", "partially-wired", "RateLimitingOptions.PermitLimit / fixed and sliding limiters", { note: "policy-specific" }),
  field("rate-limiting", "host.rateLimiting.windowSeconds", "int s", "60", "parent-present", "> 0 for every policy", "partially-wired", "RateLimitingOptions.WindowSeconds / fixed and sliding limiters", { note: "policy-specific" }),
  field("rate-limiting", "host.rateLimiting.segmentsPerWindow", "int", "10", "parent-present", "> 0 for every policy", "partially-wired", "RateLimitingOptions.SegmentsPerWindow / sliding limiter", { note: "policy-specific" }),
  field("rate-limiting", "host.rateLimiting.tokenLimit", "int", "0", "parent-present", "> 0 for TokenBucket", "partially-wired", "RateLimitingOptions.TokenLimit / token bucket limiter", { note: "policy-specific" }),
  field("rate-limiting", "host.rateLimiting.tokensPerSecond", "int", "0", "parent-present", "> 0 for TokenBucket", "partially-wired", "RateLimitingOptions.TokensPerSecond / token bucket limiter", { note: "policy-specific" }),
  field("rate-limiting", "host.rateLimiting.queueLimit", "int", "0", "parent-present", ">= 0", "wired", "RateLimitingOptions.QueueLimit / all limiters"),

  field("health-check", "host.healthCheck.enabled", "bool", "true", "parent-present", "does not skip other field validation", "wired", "HealthCheckOptions.Enabled / RegisterHealthChecks / MapHealthChecks", { note: "disabled-validates" }),
  field("health-check", "host.healthCheck.path", "string", "/health", "parent-present", "nonblank; route shape not prevalidated", "wired", "HealthCheckOptions.Path / MapHealthChecks", { note: "health-public" }),
  field("health-check", "host.healthCheck.readyPath", "string", "/health/ready", "parent-present", "nonblank; route shape not prevalidated", "wired", "HealthCheckOptions.ReadyPath / ready tag predicate", { note: "health-deduplicates" }),
  field("health-check", "host.healthCheck.livePath", "string", "/health/live", "parent-present", "nonblank; route shape not prevalidated", "wired", "HealthCheckOptions.LivePath / live tag predicate", { note: "health-deduplicates" }),
  field("health-check", "host.healthCheck.timeoutSeconds", "int s", "30", "parent-present", "> 0", "validation-only", "HealthCheckOptions.TimeoutSeconds / Validate", { note: "health-timeout-unwired" }),

  field("plugin-host", "plugin.enabled", "bool", "false", "always", "—", "wired", "PluginConfig.Enabled / YggdrasilHostBuilder", { note: "plugin-module-gate" }),
  field("plugin-host", "plugin.plugins", "PluginEntry[]", "[]", "always", "non-null; every id/path nonblank", "wired", "PluginConfig.Plugins / PluginLoaderHelper"),
  field("plugin-host", "plugin.scanDirectories", "PluginScanDirectory[]", "[{ path: plugins }]", "always", "non-null; every path/pattern nonblank", "wired", "PluginConfig.ScanDirectories / PluginLoaderHelper", { note: "plugin-scan-shape" }),
  field("plugin-host", "plugin.enableHotReload", "bool", "true", "always", "—", "declared-unwired", "PluginConfig.EnableHotReload", { note: "plugin-hot-reload-unwired" }),
  field("plugin-host", "plugin.loadTimeoutSeconds", "int s", "30", "always", "> 0", "validation-only", "PluginConfig.LoadTimeoutSeconds / Validate", { note: "plugin-timeout-unwired" }),
  field("plugin-host", "plugin.enableIsolation", "bool", "true", "always", "—", "wired", "PluginConfig.EnableIsolation / PluginLoadContext", { note: "plugin-isolation-boundary" }),
  field("plugin-host", "plugin.dataDirectory", "string", "plugins-data", "always", "nonblank", "wired", "PluginConfig.DataDirectory / ConfigurePluginInstance", { note: "plugin-path" }),
  field("plugin-host", "plugin.excludePlugins", "string[]", "[]", "always", "non-null; items not prevalidated", "partially-wired", "PluginConfig.ExcludePlugins / discovery filters", { note: "plugin-exclude-boundary" }),
  field("plugin-host", "plugin.plugins[].id", "string", '""', "collection-item", "nonblank", "partially-wired", "PluginEntry.Id / LoadExplicitPluginAsync", { note: "plugin-id-overwritten" }),
  field("plugin-host", "plugin.plugins[].path", "string", '""', "collection-item", "nonblank; existence deferred", "wired", "PluginEntry.Path / LoadExplicitPluginAsync", { note: "plugin-path" }),
  field("plugin-host", "plugin.plugins[].enabled", "bool", "true", "collection-item", "—", "wired", "PluginEntry.Enabled / LoadExplicitPluginAsync"),
  field("plugin-host", "plugin.plugins[].dependencies", "string[]", "[]", "collection-item", "items not prevalidated", "wired", "PluginEntry.Dependencies / dependency graph", { note: "plugin-explicit-only" }),
  field("plugin-host", "plugin.plugins[].autoScanRepositories", "bool", "false", "collection-item", "—", "wired", "PluginEntry.AutoScanRepositories / PluginServiceConfigurator", { note: "plugin-explicit-only" }),
  field("plugin-host", "plugin.scanDirectories[].path", "string", '"" (default item: plugins)', "collection-item", "nonblank", "wired", "PluginScanDirectory.Path / ScanDirectoryAsync", { note: "plugin-scan-shape" }),
  field("plugin-host", "plugin.scanDirectories[].enabled", "bool", "true", "collection-item", "—", "wired", "PluginScanDirectory.Enabled / ScanDirectoryAsync"),
  field("plugin-host", "plugin.scanDirectories[].recursive", "bool", "false", "collection-item", "—", "wired", "PluginScanDirectory.Recursive / ScanPluginDirectoryAsync", { note: "plugin-scan-shape" }),
  field("plugin-host", "plugin.scanDirectories[].entryPointPattern", "string", "*.Plugin.dll", "collection-item", "nonblank", "wired", "PluginScanDirectory.EntryPointPattern / Directory.GetFiles", { note: "plugin-scan-shape" }),
];
