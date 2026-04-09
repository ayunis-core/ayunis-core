import type { UUID } from 'crypto';
import type { McpIntegrationResponseDto } from '../dto/mcp-integration-response.dto';
import type { McpIntegration } from '../../../domain/mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';

type OAuthStatusResolver = (
  integrationId: UUID,
) => Promise<{ authorized: boolean }>;

export async function enrichMcpIntegrationsWithOAuthStatus(args: {
  dtos: McpIntegrationResponseDto[];
  integrations: McpIntegration[];
  getOAuthStatus: OAuthStatusResolver;
}): Promise<void> {
  const { dtos, integrations, getOAuthStatus } = args;
  const oauthEnabled = integrations.filter(isOAuthEnabledIntegration);

  if (oauthEnabled.length === 0) {
    return;
  }

  const authorizedByIntegrationId = new Map<UUID, boolean>(
    await Promise.all(
      oauthEnabled.map(async (integration) => {
        const status = await getOAuthStatus(integration.id);
        return [integration.id, status.authorized] as const;
      }),
    ),
  );

  integrations.forEach((integration, index) => {
    const dto = dtos[index];
    if (!dto.oauth?.enabled) {
      return;
    }

    dto.oauth.authorized =
      authorizedByIntegrationId.get(integration.id) ?? false;
  });
}

function isOAuthEnabledIntegration(
  integration: McpIntegration,
): integration is MarketplaceMcpIntegration | SelfDefinedMcpIntegration {
  if (
    !(integration instanceof MarketplaceMcpIntegration) &&
    !(integration instanceof SelfDefinedMcpIntegration)
  ) {
    return false;
  }

  return !!integration.configSchema.oauth;
}
