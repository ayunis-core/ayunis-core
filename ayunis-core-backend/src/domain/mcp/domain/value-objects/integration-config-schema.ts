/**
 * Defines a single configuration field for a marketplace MCP integration.
 * Each field with a `headerName` maps to an HTTP header sent on every MCP request.
 * Fields without `headerName` are internal config consumed by ayunis-core (e.g. OAuth credentials).
 */
export interface ConfigField {
  /** Unique identifier within the schema */
  key: string;
  /** Display label for the frontend form */
  label: string;
  /** Field type: text (plaintext), url (validated URL), secret (encrypted at rest) */
  type: 'text' | 'url' | 'secret';
  /** HTTP header name this field maps to; if absent, field is internal config */
  headerName?: string;
  /** Optional prefix prepended to the value before sending (e.g., "Bearer ") */
  prefix?: string;
  /** Whether the field must be provided */
  required: boolean;
  /** Optional help text for the frontend form */
  help?: string;
  /** Fixed value from marketplace; if set, field is not shown in forms */
  value?: string;
}

/**
 * OAuth configuration for future OAuth support.
 * Core rejects OAUTH authType at install in v1.
 */
export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Whether admin authorizes once (org) or each user authorizes separately (user) */
  level: 'org' | 'user';
}

/**
 * Configuration schema for a marketplace MCP integration.
 * Declares what fields are needed, at which level (org vs user),
 * their header mappings, and whether they're secret.
 */
export interface IntegrationConfigSchema {
  /** Auth type for documentation/UI purposes; does not drive transport behavior */
  authType: string;
  /** Fields configured by org admin at install time */
  orgFields: ConfigField[];
  /** Fields configured by individual users (optional, per-user overrides) */
  userFields: ConfigField[];
  /** Future OAuth configuration */
  oauth?: OAuthConfig;
}
