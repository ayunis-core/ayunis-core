import type {
  CustomMcpConfigFieldDto,
  CustomMcpConfigSchemaDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  CreateCustomIntegrationFormData,
  CustomConfigFieldFormData,
  McpIntegration,
  UpdateIntegrationFormData,
} from '@/pages/admin-settings/integrations-settings/model/types';
import { parseOAuthScopes } from '@/shared/lib/mcp-oauth';

type CustomIntegrationUpdatePayload = UpdateIntegrationFormData;

export function toEditCustomIntegrationFormData(
  integration: McpIntegration,
): CreateCustomIntegrationFormData {
  const schema =
    integration.configSchema as unknown as CustomMcpConfigSchemaDto;
  const orgValues = integration.orgConfigValues ?? {};

  return {
    name: integration.name,
    serverUrl: integration.serverUrl ?? '',
    authType: schema.authType,
    oauthClientRegistration: schema.oauth?.clientRegistration ?? 'automatic',
    oauthScopes: schema.oauth?.scopes?.join(' ') ?? '',
    oauthClientId: '',
    oauthClientSecret: '',
    fields: [
      ...schema.orgFields.map((field) =>
        toFormField(field, 'organization', orgValues[field.key]),
      ),
      ...schema.userFields.map((field) => toFormField(field, 'user')),
    ],
  };
}

export function buildCustomIntegrationUpdatePayload(
  data: CreateCustomIntegrationFormData,
  integration: McpIntegration,
): CustomIntegrationUpdatePayload {
  const schema =
    integration.configSchema as unknown as CustomMcpConfigSchemaDto;
  const targetSchema = buildTargetSchema(data, schema);
  const changedOrgConfigValues = collectChangedOrgConfigValues(
    data.fields,
    integration.orgConfigValues ?? {},
  );
  const payload: CustomIntegrationUpdatePayload = {
    ...buildOAuthClientUpdate(data),
  };

  const name = data.name.trim();
  if (name !== integration.name) payload.name = name;
  const serverUrl = data.serverUrl.trim();
  if (serverUrl !== integration.serverUrl) payload.serverUrl = serverUrl;
  if (JSON.stringify(targetSchema) !== JSON.stringify(schema)) {
    payload.configSchema = targetSchema;
  }
  if (Object.keys(changedOrgConfigValues).length > 0) {
    payload.orgConfigValues = changedOrgConfigValues;
  }
  return payload;
}

function buildTargetSchema(
  data: CreateCustomIntegrationFormData,
  current: CustomMcpConfigSchemaDto,
): CustomMcpConfigSchemaDto {
  const scopes = parseOAuthScopes(data.oauthScopes);
  return {
    authType: current.authType,
    orgFields: data.fields
      .filter((field) => field.scope === 'organization')
      .map(toConfigField),
    userFields: data.fields
      .filter((field) => field.scope === 'user')
      .map(toConfigField),
    ...(current.oauth
      ? {
          oauth: {
            clientRegistration: current.oauth.clientRegistration,
            scopes: scopes ?? [],
          },
        }
      : {}),
  };
}

function collectChangedOrgConfigValues(
  fields: CustomConfigFieldFormData[],
  currentValues: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    fields
      .filter((field) => {
        if (field.scope !== 'organization') return false;
        if (field.type === 'secret') return field.value.trim().length > 0;
        return field.value !== (currentValues[field.key] ?? '');
      })
      .map((field) => [field.key, field.value]),
  );
}

function toFormField(
  field: CustomMcpConfigFieldDto,
  scope: CustomConfigFieldFormData['scope'],
  currentValue?: unknown,
): CustomConfigFieldFormData {
  return {
    key: field.key,
    scope,
    label: field.label,
    type: field.type,
    headerName: field.headerName,
    prefix: field.prefix ?? '',
    required: field.required,
    help: field.help ?? '',
    value:
      scope === 'organization' &&
      field.type !== 'secret' &&
      typeof currentValue === 'string'
        ? currentValue
        : '',
  };
}

function toConfigField(field: CustomConfigFieldFormData) {
  return {
    key: field.key,
    label: field.label.trim(),
    type: field.type,
    headerName: field.headerName.trim(),
    required: field.required,
    ...(field.prefix.trim() ? { prefix: field.prefix } : {}),
    ...(field.help.trim() ? { help: field.help.trim() } : {}),
  };
}

function buildOAuthClientUpdate(
  data: CreateCustomIntegrationFormData,
): Pick<UpdateIntegrationFormData, 'oauthClient'> | Record<string, never> {
  const clientId = data.oauthClientId.trim();
  if (!clientId) return {};
  const clientSecret = data.oauthClientSecret.trim();
  return {
    oauthClient: {
      clientId,
      ...(clientSecret ? { clientSecret } : {}),
    },
  };
}
