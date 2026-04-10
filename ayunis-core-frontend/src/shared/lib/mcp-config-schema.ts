import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function getUserFields(integration: {
  configSchema?: unknown;
}): MarketplaceIntegrationConfigFieldDto[] {
  if (
    !integration.configSchema ||
    typeof integration.configSchema !== 'object'
  ) {
    return [];
  }

  const schema = integration.configSchema as {
    userFields?: MarketplaceIntegrationConfigFieldDto[];
  };
  return Array.isArray(schema.userFields) ? schema.userFields : [];
}
