import { createHash } from 'crypto';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import type { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import type { McpOAuthUserToken } from 'src/domain/mcp/domain/mcp-oauth-user-token.entity';

export function mcpConnectionRevision(
  integration: McpIntegration,
  config: McpIntegrationUserConfig | null,
  token: McpOAuthUserToken | null,
): string {
  const schema =
    integration instanceof SchemaConfiguredMcpIntegration
      ? [integration.configSchema, integration.orgConfigValues]
      : integration.auth;
  const usedConfig =
    integration instanceof SchemaConfiguredMcpIntegration &&
    integration.configSchema.userFields.length > 0
      ? config
      : null;
  return createHash('sha256')
    .update(
      JSON.stringify([
        integration.id,
        integration.serverUrl,
        integration.updatedAt,
        schema,
        usedConfig && [
          usedConfig.id,
          usedConfig.updatedAt,
          Object.entries(usedConfig.configValues).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ],
        token && [token.id, token.grantRevision, token.issuer],
      ]),
    )
    .digest('hex');
}
