import type { InstallMarketplaceIntegrationDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  hasOAuthConfiguration,
  type McpOAuthClientInput,
  type McpSchemaWithOAuth,
} from '@/shared/lib/mcp-oauth';

type OAuthInstallMarketplaceIntegrationDto =
  InstallMarketplaceIntegrationDto & {
    oauthClient?: McpOAuthClientInput;
  };

export function buildMarketplaceIntegrationPayload(
  identifier: string,
  orgConfigValues: Record<string, string>,
  schema: McpSchemaWithOAuth,
  client: McpOAuthClientInput,
): OAuthInstallMarketplaceIntegrationDto {
  const payload = { identifier, orgConfigValues };
  if (
    !hasOAuthConfiguration(schema) ||
    schema.oauth.clientRegistration !== 'static'
  ) {
    return payload;
  }
  const clientSecret = client.clientSecret?.trim();
  return {
    ...payload,
    oauthClient: {
      clientId: client.clientId.trim(),
      ...(clientSecret ? { clientSecret } : {}),
    },
  };
}
