import type {
  IntegrationConfigSchema,
  ConfigField,
  OAuthConfig,
} from '../../domain/value-objects/integration-config-schema';
import { McpInvalidConfigSchemaError } from '../mcp.errors';

const VALID_FIELD_TYPES = new Set(['text', 'url', 'secret']);
const VALID_OAUTH_LEVELS = new Set(['org', 'user']);

/**
 * Runtime validator for self-defined integration config schemas.
 * Validates the top-level shape, each field's structure, and the
 * optional OAuth block. Throws McpInvalidConfigSchemaError with a
 * JSON-pointer-style field path on any violation.
 */
export function validateConfigSchema(schema: unknown): IntegrationConfigSchema {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new McpInvalidConfigSchemaError('Schema must be a non-null object');
  }

  const s = schema as Record<string, unknown>;

  if (typeof s.authType !== 'string' || s.authType.length === 0) {
    throw new McpInvalidConfigSchemaError(
      'authType must be a non-empty string',
      '/authType',
    );
  }

  if (!Array.isArray(s.orgFields)) {
    throw new McpInvalidConfigSchemaError(
      'orgFields must be an array',
      '/orgFields',
    );
  }

  if (!Array.isArray(s.userFields)) {
    throw new McpInvalidConfigSchemaError(
      'userFields must be an array',
      '/userFields',
    );
  }

  const orgFields = s.orgFields.map((f: unknown, i: number) =>
    validateConfigField(f, `/orgFields/${i}`),
  );

  const userFields = s.userFields.map((f: unknown, i: number) =>
    validateConfigField(f, `/userFields/${i}`),
  );

  const result: IntegrationConfigSchema = {
    authType: s.authType,
    orgFields,
    userFields,
  };

  if (s.oauth !== undefined) {
    result.oauth = validateOAuthConfig(s.oauth);
  }

  return result;
}

function validateConfigField(field: unknown, path: string): ConfigField {
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    throw new McpInvalidConfigSchemaError(
      'Field must be a non-null object',
      path,
    );
  }

  const f = field as Record<string, unknown>;

  if (typeof f.key !== 'string' || f.key.length === 0) {
    throw new McpInvalidConfigSchemaError(
      'key must be a non-empty string',
      `${path}/key`,
    );
  }

  if (typeof f.label !== 'string' || f.label.length === 0) {
    throw new McpInvalidConfigSchemaError(
      'label must be a non-empty string',
      `${path}/label`,
    );
  }

  if (typeof f.type !== 'string' || !VALID_FIELD_TYPES.has(f.type)) {
    throw new McpInvalidConfigSchemaError(
      `type must be one of: ${[...VALID_FIELD_TYPES].join(', ')}`,
      `${path}/type`,
    );
  }

  if (f.headerName !== undefined && typeof f.headerName !== 'string') {
    throw new McpInvalidConfigSchemaError(
      'headerName must be a string if provided',
      `${path}/headerName`,
    );
  }

  if (f.prefix !== undefined && typeof f.prefix !== 'string') {
    throw new McpInvalidConfigSchemaError(
      'prefix must be a string if provided',
      `${path}/prefix`,
    );
  }

  if (typeof f.required !== 'boolean') {
    throw new McpInvalidConfigSchemaError(
      'required must be a boolean',
      `${path}/required`,
    );
  }

  if (f.help !== undefined && typeof f.help !== 'string') {
    throw new McpInvalidConfigSchemaError(
      'help must be a string if provided',
      `${path}/help`,
    );
  }

  if (f.value !== undefined && typeof f.value !== 'string') {
    throw new McpInvalidConfigSchemaError(
      'value must be a string if provided',
      `${path}/value`,
    );
  }

  return {
    key: f.key,
    label: f.label,
    type: f.type as ConfigField['type'],
    headerName: f.headerName,
    prefix: f.prefix,
    required: f.required,
    help: f.help,
    value: f.value,
  };
}

function validateOAuthConfig(oauth: unknown): OAuthConfig {
  if (!oauth || typeof oauth !== 'object' || Array.isArray(oauth)) {
    throw new McpInvalidConfigSchemaError(
      'oauth must be a non-null object',
      '/oauth',
    );
  }

  const o = oauth as Record<string, unknown>;

  if (
    typeof o.authorizationUrl !== 'string' ||
    o.authorizationUrl.length === 0
  ) {
    throw new McpInvalidConfigSchemaError(
      'authorizationUrl must be a non-empty string',
      '/oauth/authorizationUrl',
    );
  }

  if (typeof o.tokenUrl !== 'string' || o.tokenUrl.length === 0) {
    throw new McpInvalidConfigSchemaError(
      'tokenUrl must be a non-empty string',
      '/oauth/tokenUrl',
    );
  }

  if (
    !Array.isArray(o.scopes) ||
    !o.scopes.every((s: unknown) => typeof s === 'string')
  ) {
    throw new McpInvalidConfigSchemaError(
      'scopes must be an array of strings',
      '/oauth/scopes',
    );
  }

  if (typeof o.level !== 'string' || !VALID_OAUTH_LEVELS.has(o.level)) {
    throw new McpInvalidConfigSchemaError(
      'level must be "org" or "user"',
      '/oauth/level',
    );
  }

  return {
    authorizationUrl: o.authorizationUrl,
    tokenUrl: o.tokenUrl,
    scopes: o.scopes,
    level: o.level as 'org' | 'user',
  };
}
