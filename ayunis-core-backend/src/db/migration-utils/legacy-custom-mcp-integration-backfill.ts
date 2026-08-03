import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';

export interface LegacyCustomAuth {
  authType: string;
  authToken: string | null;
  secret: string | null;
  headerName: string | null;
}

export interface SchemaConfiguredCustomAuth {
  configSchema: IntegrationConfigSchema;
  orgConfigValues: Record<string, string>;
}

const BEARER_TOKEN_KEY = 'bearerToken';
const HEADER_CREDENTIAL_KEY = 'headerCredential';

export function buildLegacyCustomConfig(
  legacyAuth: LegacyCustomAuth,
): SchemaConfiguredCustomAuth {
  switch (legacyAuth.authType) {
    case 'NO_AUTH':
      return buildNoAuthConfig();
    case 'BEARER_TOKEN':
      return buildBearerConfig(requiredValue(legacyAuth.authToken));
    case 'CUSTOM_HEADER':
      return buildCustomHeaderConfig(
        requiredValue(legacyAuth.secret),
        requiredValue(legacyAuth.headerName),
      );
    default:
      throw unsupportedLegacyAuth();
  }
}

export function restoreLegacyCustomAuth(
  configSchema: IntegrationConfigSchema,
  orgConfigValues: Record<string, string>,
): LegacyCustomAuth {
  if (isEmptyCustomSchema(configSchema)) {
    if (Object.keys(orgConfigValues).length > 0) throw unsupportedSchema();
    return emptyLegacyAuth('NO_AUTH');
  }

  const field = onlyOrgField(configSchema);
  if (isBearerField(field)) {
    return {
      ...emptyLegacyAuth('BEARER_TOKEN'),
      authToken: onlyRestoredValue(orgConfigValues, BEARER_TOKEN_KEY),
    };
  }
  if (isCustomHeaderField(field)) {
    return {
      ...emptyLegacyAuth('CUSTOM_HEADER'),
      secret: onlyRestoredValue(orgConfigValues, HEADER_CREDENTIAL_KEY),
      headerName: field.headerName ?? null,
    };
  }
  throw unsupportedSchema();
}

function buildNoAuthConfig(): SchemaConfiguredCustomAuth {
  return {
    configSchema: customSchema([]),
    orgConfigValues: {},
  };
}

function buildBearerConfig(authToken: string): SchemaConfiguredCustomAuth {
  return {
    configSchema: customSchema([
      {
        key: BEARER_TOKEN_KEY,
        label: 'Bearer token',
        type: 'secret',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: true,
      },
    ]),
    orgConfigValues: { [BEARER_TOKEN_KEY]: authToken },
  };
}

function buildCustomHeaderConfig(
  secret: string,
  headerName: string,
): SchemaConfiguredCustomAuth {
  return {
    configSchema: customSchema([
      {
        key: HEADER_CREDENTIAL_KEY,
        label: 'Header credential',
        type: 'secret',
        headerName,
        required: true,
      },
    ]),
    orgConfigValues: { [HEADER_CREDENTIAL_KEY]: secret },
  };
}

function customSchema(
  orgFields: IntegrationConfigSchema['orgFields'],
): IntegrationConfigSchema {
  return { authType: 'CUSTOM', orgFields, userFields: [] };
}

function requiredValue(value: string | null): string {
  if (!value?.trim()) throw unsupportedLegacyAuth();
  return value;
}

function onlyRestoredValue(
  values: Record<string, string>,
  expectedKey: string,
): string {
  if (Object.keys(values).length !== 1 || !(expectedKey in values)) {
    throw unsupportedSchema();
  }
  const value = values[expectedKey];
  if (!value.trim()) throw unsupportedSchema();
  return value;
}

function isEmptyCustomSchema(schema: IntegrationConfigSchema): boolean {
  return (
    schema.authType === 'CUSTOM' &&
    schema.orgFields.length === 0 &&
    schema.userFields.length === 0
  );
}

function onlyOrgField(
  schema: IntegrationConfigSchema,
): IntegrationConfigSchema['orgFields'][number] | undefined {
  if (
    schema.authType !== 'CUSTOM' ||
    schema.orgFields.length !== 1 ||
    schema.userFields.length !== 0
  ) {
    throw unsupportedSchema();
  }
  return schema.orgFields[0];
}

function isBearerField(
  field: IntegrationConfigSchema['orgFields'][number] | undefined,
): boolean {
  return (
    field?.key === BEARER_TOKEN_KEY &&
    field.type === 'secret' &&
    field.headerName === 'Authorization' &&
    field.prefix === 'Bearer ' &&
    field.required
  );
}

function isCustomHeaderField(
  field: IntegrationConfigSchema['orgFields'][number] | undefined,
): field is IntegrationConfigSchema['orgFields'][number] {
  return (
    field?.key === HEADER_CREDENTIAL_KEY &&
    field.type === 'secret' &&
    Boolean(field.headerName?.trim()) &&
    field.prefix === undefined &&
    field.required
  );
}

function emptyLegacyAuth(authType: string): LegacyCustomAuth {
  return {
    authType,
    authToken: null,
    secret: null,
    headerName: null,
  };
}

function unsupportedLegacyAuth(): Error {
  return new Error('Cannot backfill legacy custom MCP authentication');
}

function unsupportedSchema(): Error {
  return new Error(
    'Cannot restore schema-configured custom MCP integration to the legacy authentication model',
  );
}
