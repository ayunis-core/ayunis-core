/**
 * Defines a single configuration field for a schema-configured MCP integration.
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

export interface OAuthConfig {
  clientRegistration: 'automatic' | 'static';
  scopes?: string[];
}

/**
 * Configuration schema for a marketplace or custom MCP integration.
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
  /** Per-user OAuth configuration */
  oauth?: OAuthConfig;
}

const OAUTH_AUTH_TYPE = 'OAUTH';

export function normalizeIntegrationConfigSchema(
  schema: IntegrationConfigSchema,
): IntegrationConfigSchema {
  validateOAuthPresence(schema);

  if (!schema.oauth) {
    return schema;
  }

  validateOAuthClientRegistration(schema.oauth);
  validateOAuthHeaderMappings(schema);

  return {
    ...cloneSchema(schema),
    oauth: {
      clientRegistration: schema.oauth.clientRegistration,
      scopes: normalizeScopes(schema.oauth.scopes),
    },
  };
}

function validateOAuthClientRegistration(oauth: OAuthConfig): void {
  if (!['automatic', 'static'].includes(oauth.clientRegistration)) {
    throw new Error('OAuth clientRegistration must be automatic or static');
  }
}

function validateOAuthPresence(schema: IntegrationConfigSchema): void {
  const hasOAuthAuthType = schema.authType === OAUTH_AUTH_TYPE;
  const hasOAuthConfig = schema.oauth !== undefined;

  if (hasOAuthAuthType !== hasOAuthConfig) {
    throw new Error(
      'OAuth configuration must be present if and only if authType is OAUTH',
    );
  }
}

function validateOAuthHeaderMappings(schema: IntegrationConfigSchema): void {
  const fields = [...schema.orgFields, ...schema.userFields];
  const mapsAuthorization = fields.some(
    (field) => field.headerName?.trim().toLowerCase() === 'authorization',
  );

  if (mapsAuthorization) {
    throw new Error('OAuth configuration fields cannot map to Authorization');
  }
}

function cloneSchema(schema: IntegrationConfigSchema): IntegrationConfigSchema {
  return {
    ...schema,
    orgFields: schema.orgFields.map((field) => ({ ...field })),
    userFields: schema.userFields.map((field) => ({ ...field })),
  };
}

export function normalizeScopes(scopes: string[] = []): string[] {
  return [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))];
}

/**
 * Single source of truth for `ConfigField` semantics. Every layer (domain
 * authorization, config validation, header building, DTO masking) MUST derive
 * its behavior from these predicates so the rules stay consistent — see the
 * frontend mirror in `@/shared/lib/config-field`.
 */

/**
 * Whether the field's value is fixed by the marketplace (system-controlled).
 * Such fields are never user-editable, never shown in forms, never persisted as
 * user/org config; their value is taken straight from the schema.
 */
export function isSystemFixedField(field: ConfigField): boolean {
  return typeof field.value === 'string' && field.value.length > 0;
}

/**
 * Whether a stored or provided config value counts as present. A value must be
 * a non-empty, non-whitespace string to satisfy a required field.
 */
export function isConfigValuePresent(
  value: string | undefined | null,
): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Whether the actor must personally supply this field: it is required and not
 * already satisfied by a system-fixed value.
 */
export function fieldRequiresInput(field: ConfigField): boolean {
  return field.required && !isSystemFixedField(field);
}

/**
 * Whether the actor can edit this field at all (i.e. it is not system-fixed).
 * Drives which fields appear in config forms and whether an integration is
 * worth surfacing for user self-configuration.
 */
export function isUserEditableField(field: ConfigField): boolean {
  return !isSystemFixedField(field);
}
