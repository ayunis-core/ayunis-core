import type {
  IntegrationConfigSchema,
  ConfigField,
  OAuthConfig,
} from '../../domain/value-objects/integration-config-schema';
import { McpInvalidConfigSchemaError } from '../mcp.errors';

const VALID_FIELD_TYPES = new Set(['text', 'url', 'secret']);
const VALID_OAUTH_LEVELS = new Set(['org', 'user']);

type TopLevelSchema = Record<string, unknown> & {
  authType: string;
  orgFields: unknown[];
  userFields: unknown[];
};

/**
 * Runtime validator for self-defined integration config schemas.
 * Validates the top-level shape, each field's structure, and the
 * optional OAuth block. Throws McpInvalidConfigSchemaError with a
 * JSON-pointer-style field path on any violation.
 */
export function validateConfigSchema(schema: unknown): IntegrationConfigSchema {
  const s = validateTopLevelShape(schema);

  const orgFields = s.orgFields.map((f: unknown, i: number) =>
    validateConfigField(f, `/orgFields/${i}`),
  );

  const userFields = s.userFields.map((f: unknown, i: number) =>
    validateConfigField(f, `/userFields/${i}`),
  );

  assertNoDuplicateKeys(orgFields, userFields);

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

export function validateTopLevelShape(schema: unknown): TopLevelSchema {
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

  return s as TopLevelSchema;
}

export function validateConfigField(field: unknown, path: string): ConfigField {
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    throw new McpInvalidConfigSchemaError(
      'Field must be a non-null object',
      path,
    );
  }

  const f = field as Record<string, unknown>;

  validateRequiredFieldProps(f, path);
  validateOptionalFieldProps(f, path);

  return {
    key: f.key as string,
    label: f.label as string,
    type: f.type as ConfigField['type'],
    headerName: f.headerName as string | undefined,
    prefix: f.prefix as string | undefined,
    required: f.required as boolean,
    help: f.help as string | undefined,
    value: f.value as string | undefined,
  };
}

export function validateRequiredFieldProps(
  f: Record<string, unknown>,
  path: string,
): void {
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

  if (typeof f.required !== 'boolean') {
    throw new McpInvalidConfigSchemaError(
      'required must be a boolean',
      `${path}/required`,
    );
  }
}

export function validateOptionalFieldProps(
  f: Record<string, unknown>,
  path: string,
): void {
  if (f.headerName !== undefined) {
    if (typeof f.headerName !== 'string' || f.headerName.length === 0) {
      throw new McpInvalidConfigSchemaError(
        'headerName must be a non-empty string if provided',
        `${path}/headerName`,
      );
    }
  }

  if (f.prefix !== undefined && typeof f.prefix !== 'string') {
    throw new McpInvalidConfigSchemaError(
      'prefix must be a string if provided',
      `${path}/prefix`,
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
}

export function assertNoDuplicateKeys(
  orgFields: ConfigField[],
  userFields: ConfigField[],
): void {
  const seen = new Set<string>();
  const allFields = [
    ...orgFields.map((f, i) => ({ key: f.key, path: `/orgFields/${i}` })),
    ...userFields.map((f, i) => ({ key: f.key, path: `/userFields/${i}` })),
  ];
  for (const { key, path } of allFields) {
    if (seen.has(key)) {
      throw new McpInvalidConfigSchemaError(
        `duplicate key "${key}"`,
        `${path}/key`,
      );
    }
    seen.add(key);
  }
}

export function validateOAuthConfig(oauth: unknown): OAuthConfig {
  if (!oauth || typeof oauth !== 'object' || Array.isArray(oauth)) {
    throw new McpInvalidConfigSchemaError(
      'oauth must be a non-null object',
      '/oauth',
    );
  }

  const o = oauth as Record<string, unknown>;

  validateOAuthUrls(o);
  validateOAuthScopesAndLevel(o);

  return {
    authorizationUrl: o.authorizationUrl as string,
    tokenUrl: o.tokenUrl as string,
    scopes: o.scopes as string[],
    level: o.level as 'org' | 'user',
  };
}

export function validateOAuthUrls(o: Record<string, unknown>): void {
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
}

export function validateOAuthScopesAndLevel(o: Record<string, unknown>): void {
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
}
