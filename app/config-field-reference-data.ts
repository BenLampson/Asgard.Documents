export type ConfigFieldDocument = "app.yaml";

export type ConfigRuntimeStatus =
  | "wired"
  | "bootstrap-only"
  | "validated-only"
  | "exposed-only";

export type ConfigParentPresence =
  | "always-created"
  | "nullable"
  | "dictionary-item"
  | "required-section";

export type ConfigDefaultValue = string | number | boolean | null;

export type ConfigDefaultContract = {
  attributeSpecified: boolean;
  attributeValue?: ConfigDefaultValue;
  clrValue: ConfigDefaultValue;
  effectiveValue: ConfigDefaultValue;
  appliesWhen: "root-absent" | "parent-present" | "item-present" | "always";
  mismatchDisposition?: "expected-binder-override" | "must-review";
};

export type ConfigValidationRule = {
  rule:
    | "nonblank"
    | "one-of"
    | "greater-than"
    | "base64-byte-length"
    | "dictionary-items"
    | "absolute-uri-at-runtime";
  when: "always" | "https-endpoint" | "standard-host" | "runtime";
  values?: readonly (string | number)[];
};

export type ConfigBindingContract = {
  kind: "config-path" | "convention-section";
  declaredPath?: string;
  sectionPath?: string;
};

export type ConfigSourceAnchor = {
  file: string;
  member: string;
  runtimeFile?: string;
  runtimeMember?: string;
};

export type ConfigFieldContract = {
  id: string;
  group: "application" | "endpoints" | "limits" | "encryption";
  path: string;
  document: ConfigFieldDocument;
  declaringType: string;
  property: string;
  valueType: string;
  nullable: boolean;
  binding: ConfigBindingContract;
  parentPresence: ConfigParentPresence;
  missingBehavior:
    | "keep-initializer"
    | "keep-item-initializer"
    | "empty-dictionary-is-valid"
    | "do-not-override-kestrel"
    | "startup-fails";
  default: ConfigDefaultContract;
  sensitive: false | { kind: "credential" | "secret"; redact: true };
  validations: readonly ConfigValidationRule[];
  runtime: {
    status: ConfigRuntimeStatus;
    behavior:
      | "host-config-only"
      | "select-host-environment"
      | "listen-endpoints"
      | "configure-endpoint"
      | "configure-https"
      | "apply-kestrel-limits"
      | "register-aes-snapshot";
  };
  source: ConfigSourceAnchor;
  notes?: readonly (
    | "late-environment-override-does-not-change-host-environment"
    | "empty-endpoints-skips-explicit-listen"
    | "uri-validation-is-deferred"
    | "certificate-file-validation-is-deferred"
    | "password-may-be-empty"
    | "limits-empty-object-is-invalid"
    | "xml-nullability-comment-is-stale"
    | "base64-is-canonicalized"
  )[];
};

export const configurationFieldReferenceBaseline = {
  frameworkVersion: "5.1.3",
  sourceCommit: "d1002d1af5478e74669a3f0128ed9d4e43465dc2",
  inspectedOn: "2026-07-28",
  extraction: "source-reviewed-manual-contract",
} as const;

const hostConfigSource = "Common/Asgard.Abstractions.AspNetCore/Host/HostConfig.cs";
const applicationSource = "Common/Asgard.Abstractions.AspNetCore/Host/ApplicationOptions.cs";
const kestrelSource = "Common/Asgard.Abstractions.AspNetCore/Host/KestrelOptions.cs";
const hostRuntimeSource = "Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.HostConfiguration.cs";
const hostBuilderSource = "Host/Asgard.Yggdrasil.AspNetCore/YggdrasilHostBuilder.cs";
const encryptionSource = "Common/Asgard.Abstractions/Security/AsgardEncryptionOptions.cs";
const securityRegistrationSource = "Common/Asgard.Core/Security/SecurityServiceCollectionExtensions.cs";

export const configFieldContracts: readonly ConfigFieldContract[] = [
  {
    id: "application-name",
    group: "application",
    path: "host.application.name",
    document: "app.yaml",
    declaringType: "ApplicationOptions",
    property: "Name",
    valueType: "string",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "host.application.name" },
    parentPresence: "always-created",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: "Asgard.Yggdrasil", clrValue: "Asgard.Yggdrasil", effectiveValue: "Asgard.Yggdrasil", appliesWhen: "always" },
    sensitive: false,
    validations: [{ rule: "nonblank", when: "always" }],
    runtime: { status: "exposed-only", behavior: "host-config-only" },
    source: { file: applicationSource, member: "ApplicationOptions.Name / Validate", runtimeFile: hostConfigSource, runtimeMember: "HostConfig.Application / Validate" },
  },
  {
    id: "application-version",
    group: "application",
    path: "host.application.version",
    document: "app.yaml",
    declaringType: "ApplicationOptions",
    property: "Version",
    valueType: "string",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "host.application.version" },
    parentPresence: "always-created",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: "1.0.0", clrValue: "1.0.0", effectiveValue: "1.0.0", appliesWhen: "always" },
    sensitive: false,
    validations: [{ rule: "nonblank", when: "always" }],
    runtime: { status: "exposed-only", behavior: "host-config-only" },
    source: { file: applicationSource, member: "ApplicationOptions.Version / Validate", runtimeFile: hostConfigSource, runtimeMember: "HostConfig.Application / Validate" },
  },
  {
    id: "application-environment",
    group: "application",
    path: "host.application.environment",
    document: "app.yaml",
    declaringType: "ApplicationOptions",
    property: "Environment",
    valueType: "string",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "host.application.environment" },
    parentPresence: "always-created",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: "Development", clrValue: "Development", effectiveValue: "Development", appliesWhen: "always" },
    sensitive: false,
    validations: [{ rule: "one-of", when: "always", values: ["Development", "Staging", "Production"] }],
    runtime: { status: "bootstrap-only", behavior: "select-host-environment" },
    source: { file: applicationSource, member: "ApplicationOptions.Environment / Validate", runtimeFile: hostBuilderSource, runtimeMember: "YggdrasilHostBuilder.Build" },
    notes: ["late-environment-override-does-not-change-host-environment"],
  },
  {
    id: "application-detailed-errors",
    group: "application",
    path: "host.application.detailedErrors",
    document: "app.yaml",
    declaringType: "ApplicationOptions",
    property: "DetailedErrors",
    valueType: "bool",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "host.application.detailedErrors" },
    parentPresence: "always-created",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: false, clrValue: false, effectiveValue: false, appliesWhen: "always" },
    sensitive: false,
    validations: [],
    runtime: { status: "exposed-only", behavior: "host-config-only" },
    source: { file: applicationSource, member: "ApplicationOptions.DetailedErrors" },
  },
  {
    id: "kestrel-endpoints",
    group: "endpoints",
    path: "host.kestrel.endpoints",
    document: "app.yaml",
    declaringType: "KestrelOptions",
    property: "Endpoints",
    valueType: "Dictionary<string, EndpointOptions>",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "endpoints" },
    parentPresence: "always-created",
    missingBehavior: "empty-dictionary-is-valid",
    default: { attributeSpecified: false, clrValue: "{ Http: { url: http://localhost:5000 } }", effectiveValue: "{ Http: { url: http://localhost:5000 } }", appliesWhen: "root-absent" },
    sensitive: false,
    validations: [{ rule: "dictionary-items", when: "always" }],
    runtime: { status: "wired", behavior: "listen-endpoints" },
    source: { file: kestrelSource, member: "KestrelOptions.Endpoints / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureKestrel" },
    notes: ["empty-endpoints-skips-explicit-listen"],
  },
  {
    id: "endpoint-url",
    group: "endpoints",
    path: "host.kestrel.endpoints.<name>.url",
    document: "app.yaml",
    declaringType: "EndpointOptions",
    property: "Url",
    valueType: "string",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "url" },
    parentPresence: "dictionary-item",
    missingBehavior: "keep-item-initializer",
    default: { attributeSpecified: true, attributeValue: "http://localhost:5000", clrValue: "http://localhost:5000", effectiveValue: "http://localhost:5000", appliesWhen: "item-present" },
    sensitive: false,
    validations: [{ rule: "nonblank", when: "always" }, { rule: "absolute-uri-at-runtime", when: "runtime" }],
    runtime: { status: "wired", behavior: "configure-endpoint" },
    source: { file: kestrelSource, member: "EndpointOptions.Url / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureEndpoint" },
    notes: ["uri-validation-is-deferred"],
  },
  {
    id: "endpoint-certificate",
    group: "endpoints",
    path: "host.kestrel.endpoints.<name>.certificate",
    document: "app.yaml",
    declaringType: "EndpointOptions",
    property: "Certificate",
    valueType: "CertificateOptions",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "certificate" },
    parentPresence: "dictionary-item",
    missingBehavior: "keep-item-initializer",
    default: { attributeSpecified: false, clrValue: "{ path: \"\", password: \"\" }", effectiveValue: "{ path: \"\", password: \"\" }", appliesWhen: "item-present" },
    sensitive: false,
    validations: [],
    runtime: { status: "wired", behavior: "configure-https" },
    source: { file: kestrelSource, member: "EndpointOptions.Certificate / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureEndpoint" },
  },
  {
    id: "certificate-path",
    group: "endpoints",
    path: "host.kestrel.endpoints.<name>.certificate.path",
    document: "app.yaml",
    declaringType: "CertificateOptions",
    property: "Path",
    valueType: "string",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "certificate.path" },
    parentPresence: "dictionary-item",
    missingBehavior: "keep-item-initializer",
    default: { attributeSpecified: false, clrValue: "", effectiveValue: "", appliesWhen: "item-present" },
    sensitive: false,
    validations: [{ rule: "nonblank", when: "https-endpoint" }],
    runtime: { status: "wired", behavior: "configure-https" },
    source: { file: kestrelSource, member: "CertificateOptions.Path / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureEndpoint" },
    notes: ["certificate-file-validation-is-deferred"],
  },
  {
    id: "certificate-password",
    group: "endpoints",
    path: "host.kestrel.endpoints.<name>.certificate.password",
    document: "app.yaml",
    declaringType: "CertificateOptions",
    property: "Password",
    valueType: "string",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "certificate.password" },
    parentPresence: "dictionary-item",
    missingBehavior: "keep-item-initializer",
    default: { attributeSpecified: false, clrValue: "", effectiveValue: "", appliesWhen: "item-present" },
    sensitive: { kind: "credential", redact: true },
    validations: [],
    runtime: { status: "wired", behavior: "configure-https" },
    source: { file: kestrelSource, member: "CertificateOptions.Password", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureEndpoint" },
    notes: ["password-may-be-empty"],
  },
  {
    id: "kestrel-limits",
    group: "limits",
    path: "host.kestrel.limits",
    document: "app.yaml",
    declaringType: "KestrelOptions",
    property: "Limits",
    valueType: "KestrelLimitsOptions?",
    nullable: true,
    binding: { kind: "config-path", declaredPath: "limits" },
    parentPresence: "nullable",
    missingBehavior: "do-not-override-kestrel",
    default: { attributeSpecified: false, clrValue: null, effectiveValue: null, appliesWhen: "root-absent" },
    sensitive: false,
    validations: [],
    runtime: { status: "wired", behavior: "apply-kestrel-limits" },
    source: { file: kestrelSource, member: "KestrelOptions.Limits / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureKestrel" },
    notes: ["limits-empty-object-is-invalid"],
  },
  {
    id: "limit-request-body",
    group: "limits",
    path: "host.kestrel.limits.maxRequestBodySize",
    document: "app.yaml",
    declaringType: "KestrelLimitsOptions",
    property: "MaxRequestBodySize",
    valueType: "long",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "maxRequestBodySize" },
    parentPresence: "nullable",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: 104857600, clrValue: 104857600, effectiveValue: 104857600, appliesWhen: "parent-present" },
    sensitive: false,
    validations: [{ rule: "greater-than", when: "always", values: [0] }],
    runtime: { status: "wired", behavior: "apply-kestrel-limits" },
    source: { file: kestrelSource, member: "KestrelLimitsOptions.MaxRequestBodySize / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureKestrel" },
  },
  {
    id: "limit-connections",
    group: "limits",
    path: "host.kestrel.limits.maxConcurrentConnections",
    document: "app.yaml",
    declaringType: "KestrelLimitsOptions",
    property: "MaxConcurrentConnections",
    valueType: "int",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "maxConcurrentConnections" },
    parentPresence: "nullable",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: 1000, clrValue: 0, effectiveValue: 1000, appliesWhen: "parent-present", mismatchDisposition: "expected-binder-override" },
    sensitive: false,
    validations: [{ rule: "greater-than", when: "always", values: [0] }],
    runtime: { status: "wired", behavior: "apply-kestrel-limits" },
    source: { file: kestrelSource, member: "KestrelLimitsOptions.MaxConcurrentConnections / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureKestrel" },
  },
  {
    id: "limit-upgraded-connections",
    group: "limits",
    path: "host.kestrel.limits.maxConcurrentUpgradedConnections",
    document: "app.yaml",
    declaringType: "KestrelLimitsOptions",
    property: "MaxConcurrentUpgradedConnections",
    valueType: "int",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "maxConcurrentUpgradedConnections" },
    parentPresence: "nullable",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: false, clrValue: 0, effectiveValue: 0, appliesWhen: "parent-present" },
    sensitive: false,
    validations: [{ rule: "greater-than", when: "always", values: [0] }],
    runtime: { status: "wired", behavior: "apply-kestrel-limits" },
    source: { file: kestrelSource, member: "KestrelLimitsOptions.MaxConcurrentUpgradedConnections / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureKestrel" },
    notes: ["limits-empty-object-is-invalid", "xml-nullability-comment-is-stale"],
  },
  {
    id: "limit-headers-timeout",
    group: "limits",
    path: "host.kestrel.limits.requestHeadersTimeoutSeconds",
    document: "app.yaml",
    declaringType: "KestrelLimitsOptions",
    property: "RequestHeadersTimeoutSeconds",
    valueType: "int",
    nullable: false,
    binding: { kind: "config-path", declaredPath: "requestHeadersTimeoutSeconds" },
    parentPresence: "nullable",
    missingBehavior: "keep-initializer",
    default: { attributeSpecified: true, attributeValue: 30, clrValue: 30, effectiveValue: 30, appliesWhen: "parent-present" },
    sensitive: false,
    validations: [{ rule: "greater-than", when: "always", values: [0] }],
    runtime: { status: "wired", behavior: "apply-kestrel-limits" },
    source: { file: kestrelSource, member: "KestrelLimitsOptions.RequestHeadersTimeoutSeconds / Validate", runtimeFile: hostRuntimeSource, runtimeMember: "ConfigureKestrel" },
  },
  {
    id: "encryption-key",
    group: "encryption",
    path: "Asgard.Encryption.Key",
    document: "app.yaml",
    declaringType: "AsgardEncryptionOptions",
    property: "Key",
    valueType: "string?",
    nullable: true,
    binding: { kind: "convention-section", sectionPath: "Asgard:Encryption" },
    parentPresence: "required-section",
    missingBehavior: "startup-fails",
    default: { attributeSpecified: false, clrValue: null, effectiveValue: null, appliesWhen: "root-absent" },
    sensitive: { kind: "secret", redact: true },
    validations: [{ rule: "nonblank", when: "standard-host" }, { rule: "base64-byte-length", when: "standard-host", values: [16, 24, 32] }],
    runtime: { status: "wired", behavior: "register-aes-snapshot" },
    source: { file: encryptionSource, member: "AsgardEncryptionOptions.Key / CreateValidatedSnapshot", runtimeFile: securityRegistrationSource, runtimeMember: "AddAsgardSecurityServices(AsgardEncryptionOptions)" },
    notes: ["base64-is-canonicalized"],
  },
  {
    id: "encryption-iv",
    group: "encryption",
    path: "Asgard.Encryption.Iv",
    document: "app.yaml",
    declaringType: "AsgardEncryptionOptions",
    property: "Iv",
    valueType: "string?",
    nullable: true,
    binding: { kind: "convention-section", sectionPath: "Asgard:Encryption" },
    parentPresence: "required-section",
    missingBehavior: "startup-fails",
    default: { attributeSpecified: false, clrValue: null, effectiveValue: null, appliesWhen: "root-absent" },
    sensitive: { kind: "secret", redact: true },
    validations: [{ rule: "nonblank", when: "standard-host" }, { rule: "base64-byte-length", when: "standard-host", values: [16] }],
    runtime: { status: "wired", behavior: "register-aes-snapshot" },
    source: { file: encryptionSource, member: "AsgardEncryptionOptions.Iv / CreateValidatedSnapshot", runtimeFile: securityRegistrationSource, runtimeMember: "AddAsgardSecurityServices(AsgardEncryptionOptions)" },
    notes: ["base64-is-canonicalized"],
  },
] as const;
