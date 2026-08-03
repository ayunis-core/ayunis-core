import type {
  CreateCustomIntegrationFormData,
  CustomConfigFieldFormData,
} from '../model/types';
import type { CreateCustomIntegrationDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  parseOAuthScopes,
  type McpOAuthClientInput,
  type McpOAuthConfig,
} from '@/shared/lib/mcp-oauth';

type OAuthCreateCustomIntegrationDto = CreateCustomIntegrationDto & {
  configSchema: CreateCustomIntegrationDto['configSchema'] & {
    authType: 'CUSTOM' | 'OAUTH';
    oauth?: McpOAuthConfig;
  };
  oauthClient?: McpOAuthClientInput;
};

export function buildCustomIntegrationPayload(
  data: CreateCustomIntegrationFormData,
): OAuthCreateCustomIntegrationDto {
  const orgFields = data.fields
    .filter((field) => field.scope === 'organization')
    .map(toConfigField);
  const userFields = data.fields
    .filter((field) => field.scope === 'user')
    .map(toConfigField);
  const orgConfigValues = Object.fromEntries(
    data.fields
      .filter((field) => field.scope === 'organization')
      .map((field) => [field.key, field.value]),
  );

  const oauth = buildOAuthConfig(data);
  return {
    name: data.name.trim(),
    serverUrl: data.serverUrl.trim(),
    configSchema: {
      authType: data.authType,
      orgFields,
      userFields,
      ...(oauth ? { oauth } : {}),
    },
    ...buildOAuthClient(data),
    orgConfigValues,
  };
}

function buildOAuthConfig(
  data: CreateCustomIntegrationFormData,
): McpOAuthConfig | undefined {
  if (data.authType !== 'OAUTH') return undefined;
  const scopes = parseOAuthScopes(data.oauthScopes);
  return {
    clientRegistration: data.oauthClientRegistration,
    ...(scopes ? { scopes } : {}),
  };
}

function buildOAuthClient(
  data: CreateCustomIntegrationFormData,
): { oauthClient: McpOAuthClientInput } | Record<string, never> {
  if (data.authType !== 'OAUTH' || data.oauthClientRegistration !== 'static') {
    return {};
  }
  const clientSecret = data.oauthClientSecret.trim();
  return {
    oauthClient: {
      clientId: data.oauthClientId.trim(),
      ...(clientSecret ? { clientSecret } : {}),
    },
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
