import type {
  McpIntegration,
  UpdateIntegrationFormData,
} from '@/pages/admin-settings/integrations-settings/model/types';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface ConfigSchema {
  orgFields: MarketplaceIntegrationConfigFieldDto[];
}

function getEditableOrgFields(
  integration: McpIntegration,
): MarketplaceIntegrationConfigFieldDto[] {
  const schema = integration.configSchema as ConfigSchema | undefined;
  if (!schema?.orgFields) return [];
  return schema.orgFields.filter(
    (field) => field.value === null || field.value === undefined,
  );
}

export function resolveEditableOrgFields(
  integration: McpIntegration | null,
  isSchemaConfigured: boolean,
): MarketplaceIntegrationConfigFieldDto[] {
  if (!integration || !isSchemaConfigured) return [];
  return getEditableOrgFields(integration);
}

function buildConfigPayload(
  payload: UpdateIntegrationFormData,
  editableFields: MarketplaceIntegrationConfigFieldDto[],
  configFormValues: Record<string, string>,
  currentOrgValues: Record<string, string>,
): void {
  const orgConfigValues: Record<string, string> = {};
  let hasConfigChanges = false;

  for (const field of editableFields) {
    const value = configFormValues[field.key] ?? '';
    if (field.type === 'secret') {
      if (value.trim()) {
        orgConfigValues[field.key] = value;
        hasConfigChanges = true;
      }
    } else {
      orgConfigValues[field.key] = value;
      if (value !== (currentOrgValues[field.key] ?? '')) {
        hasConfigChanges = true;
      }
    }
  }

  if (hasConfigChanges) {
    payload.orgConfigValues = orgConfigValues;
  }
}

function buildAuthPayload(
  payload: UpdateIntegrationFormData,
  data: UpdateIntegrationFormData,
  integration: McpIntegration,
): void {
  const trimmedCredentials = data.credentials?.trim();
  if (trimmedCredentials) {
    payload.credentials = trimmedCredentials;
  }

  if (integration.authMethod === 'CUSTOM_HEADER') {
    const trimmedHeaderName = data.authHeaderName?.trim();
    if (trimmedHeaderName && trimmedHeaderName !== integration.authHeaderName) {
      payload.authHeaderName = trimmedHeaderName;
    }
  }
}

function buildServerUrlPayload(
  payload: UpdateIntegrationFormData,
  data: UpdateIntegrationFormData,
  integration: McpIntegration,
): void {
  if (!integration.customerProvidesServerUrl) return;
  const serverUrl = data.serverUrl?.trim();
  if (serverUrl && serverUrl !== integration.serverUrl) {
    payload.serverUrl = serverUrl;
  }
}

export interface BuildUpdatePayloadInput {
  data: UpdateIntegrationFormData;
  integration: McpIntegration;
  isSchemaConfigured: boolean;
  editableFields: MarketplaceIntegrationConfigFieldDto[];
  configFormValues: Record<string, string>;
  currentOrgValues: Record<string, string>;
  hasStaticOAuthClient: boolean;
}

export function buildUpdatePayload({
  data,
  integration,
  isSchemaConfigured,
  editableFields,
  configFormValues,
  currentOrgValues,
  hasStaticOAuthClient,
}: BuildUpdatePayloadInput): UpdateIntegrationFormData {
  const payload: UpdateIntegrationFormData = {};
  if (data.name && data.name !== integration.name) payload.name = data.name;

  if (!isSchemaConfigured) {
    buildAuthPayload(payload, data, integration);
    return payload;
  }

  buildConfigPayload(
    payload,
    editableFields,
    configFormValues,
    currentOrgValues,
  );
  buildServerUrlPayload(payload, data, integration);
  const clientId = data.oauthClientId?.trim();
  if (hasStaticOAuthClient && clientId) {
    const clientSecret = data.oauthClientSecret?.trim();
    payload.oauthClient = {
      clientId,
      ...(clientSecret ? { clientSecret } : {}),
    };
  }
  return payload;
}
