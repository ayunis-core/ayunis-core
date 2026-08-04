import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { isUserEditableField } from '@/shared/lib/config-field';
import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';

interface UserIntegrationCandidate {
  configSchema?: unknown;
}

interface UserIntegrationSchema {
  authType?: string;
  oauth?: { clientRegistration: 'automatic' | 'static'; scopes?: string[] };
  userFields?: MarketplaceIntegrationConfigFieldDto[];
}

export function isUserIntegrationVisible(
  integration: UserIntegrationCandidate,
): boolean {
  const schema = integration.configSchema as UserIntegrationSchema | undefined;
  if (hasOAuthConfiguration(schema)) return true;
  return hasUserEditableFields(integration);
}

export function hasUserEditableFields(
  integration: UserIntegrationCandidate,
): boolean {
  const schema = integration.configSchema as UserIntegrationSchema | undefined;
  return (schema?.userFields ?? []).some(isUserEditableField);
}
