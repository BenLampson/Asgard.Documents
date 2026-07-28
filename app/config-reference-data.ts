export type ConfigDocument = "app.yaml" | "plugin.yaml";

export type ConfigPresence =
  | "always-created"
  | "nullable-node"
  | "disabled-by-default"
  | "required-section"
  | "plugin-manifest";

export type ConfigRootContract = {
  path: string;
  document: ConfigDocument;
  sourceType: string;
  presence: ConfigPresence;
  activation?: string;
  source: string;
};

export const configurationReferenceBaseline = {
  frameworkVersion: "5.1.3",
  sourceCommit: "d1002d1af5478e74669a3f0128ed9d4e43465dc2",
  inspectedOn: "2026-07-28",
} as const;

export const configurationPrecedence = [
  "app.yaml",
  "app.{Environment}.yaml",
  "process environment variables",
  "command-line arguments",
] as const;

export const configRootContracts: ConfigRootContract[] = [
  {
    path: "host.application",
    document: "app.yaml",
    sourceType: "ApplicationOptions",
    presence: "always-created",
    source: "Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs",
  },
  {
    path: "host.kestrel",
    document: "app.yaml",
    sourceType: "KestrelOptions",
    presence: "always-created",
    source: "Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs",
  },
  {
    path: "host.staticFiles",
    document: "app.yaml",
    sourceType: "StaticFileHostOptions",
    presence: "always-created",
    activation: "enabled=true; enableDefaultFiles=false",
    source: "Common/Asgard.Abstractions.AspNetCore/Host/StaticFileHostOptions.cs",
  },
  ...[
    ["cors", "CorsOptions"],
    ["auth", "AuthOptions"],
    ["swagger", "SwaggerOptions"],
    ["tsGen", "TsGenHostOptions"],
    ["rateLimiting", "RateLimitingOptions"],
    ["healthCheck", "HealthCheckOptions"],
  ].map(
    ([node, sourceType]): ConfigRootContract => ({
      path: `host.${node}`,
      document: "app.yaml",
      sourceType,
      presence: "nullable-node",
      activation:
        node === "tsGen"
          ? "absent node: not wired; present node: enabled=false"
          : "absent node: not wired; present node: enabled=true",
      source: "Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs",
    }),
  ),
  ...[
    ["caching", "CacheConfig"],
    ["database", "DatabaseConfig"],
    ["messaging", "MQConfig"],
    ["job", "JobConfig"],
    ["plugin", "PluginConfig"],
    ["Trace", "TraceOptions"],
  ].map(
    ([path, sourceType]): ConfigRootContract => ({
      path,
      document: "app.yaml",
      sourceType,
      presence: "disabled-by-default",
      activation: "enabled=false",
      source: "Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs",
    }),
  ),
  {
    path: "logging",
    document: "app.yaml",
    sourceType: "LogConfig",
    presence: "always-created",
    activation: "console.enabled=true; file.enabled=true; database.enabled=false",
    source: "Common/Asgard.Abstractions/Logging/LogConfig.cs",
  },
  {
    path: "Asgard.Encryption",
    document: "app.yaml",
    sourceType: "AsgardEncryptionOptions",
    presence: "required-section",
    activation: "no enabled switch; Key and Iv are validated during service registration",
    source: "Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs",
  },
  {
    path: "jobs[]",
    document: "plugin.yaml",
    sourceType: "PluginJobConfig",
    presence: "plugin-manifest",
    activation: "loaded during PluginBase.StartAsync when a job manager is available",
    source: "Common/Asgard.Core/Plugin/PluginBase.cs",
  },
];

export const sensitiveConfigurationPaths = [
  "host.kestrel.endpoints.<name>.certificate.password",
  "database.connectionString",
  "caching.redis.connectionString",
  "caching.redis.password",
  "messaging.rabbitmq.password",
  "logging.database.connectionString",
  "Trace.ConnectionString",
  "job.scheduler.connectionString",
  "Asgard.Encryption.Key",
  "Asgard.Encryption.Iv",
] as const;

export const excludedConfigurationRoots = [
  {
    path: "autoConfig.*",
    reason: "The types exist, but the Asgard 5.1.3 Yggdrasil host does not load or consume this root.",
  },
  {
    path: "PublishOptions / SubscribeOptions",
    reason: "These are runtime API options rather than app.yaml roots.",
  },
  {
    path: "plugin-owned TConfig",
    reason: "Each product plugin owns its own schema and release contract.",
  },
] as const;

export const configurationExtractionBoundaries = [
  "ConfigPath attributes do not cover every nested POCO property, list item, dictionary value, or the encryption section.",
  "A DefaultValue describes a property fallback only after its owning object exists; it does not activate a nullable host node.",
  "CLR initializers may provide effective defaults even when ConfigPath has no DefaultValue.",
  "Validate methods contain conditional and cross-field rules that cannot be converted safely with regular expressions.",
  "An option type or property is not proof that the primary runtime path consumes it.",
] as const;
