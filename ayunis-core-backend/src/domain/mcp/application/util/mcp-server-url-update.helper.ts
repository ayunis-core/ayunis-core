import {
  InvalidServerUrlError,
  McpIntegrationNotConfigurableError,
  McpValidationFailedError,
} from 'src/domain/mcp/application/mcp.errors';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { CustomMcpIntegration } from 'src/domain/mcp/domain/integrations/custom-mcp-integration.entity';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { isValidMcpServerUrl } from 'src/domain/mcp/domain/value-objects/mcp-server-url';

export function assertServerUrlConfigurable(
  integration: McpIntegration,
): asserts integration is CustomMcpIntegration | MarketplaceMcpIntegration {
  if (integration instanceof CustomMcpIntegration) return;
  if (integration instanceof MarketplaceMcpIntegration) {
    if (integration.customerProvidesServerUrl) return;
    throw new McpValidationFailedError(
      integration.id,
      integration.name,
      'The server URL is fixed by the marketplace.',
      'serverUrl',
    );
  }
  throw new McpIntegrationNotConfigurableError(integration.id);
}

/**
 * Returns whether the URL actually changes. OAuth clients and tokens are
 * bound to the old server, so a static client must be replaced in the same
 * request.
 */
export function validateServerUrlUpdate(
  integration: McpIntegration,
  serverUrl: string | undefined,
  replacesOAuthClient: boolean,
): boolean {
  if (serverUrl === undefined) return false;
  assertServerUrlConfigurable(integration);
  if (!isValidMcpServerUrl(serverUrl)) {
    throw new InvalidServerUrlError(serverUrl);
  }
  const changed = serverUrl !== integration.serverUrl;
  if (
    changed &&
    !replacesOAuthClient &&
    integration instanceof SchemaConfiguredMcpIntegration &&
    integration.configSchema.oauth?.clientRegistration === 'static'
  ) {
    throw new McpValidationFailedError(
      integration.id,
      integration.name,
      'Changing the server URL requires a new OAuth client registered on the new server.',
      'oauthClient',
    );
  }
  return changed;
}
