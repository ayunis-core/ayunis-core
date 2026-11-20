import { McpRuntimeConnectionError } from 'src/domain/mcp/application/mcp-runtime-connection.error';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { IntegrationWarning } from 'src/domain/runs/domain/run-integration-warning';

export function mcpIntegrationWarning(
  error: unknown,
  tool: Tool,
): IntegrationWarning | undefined {
  if (!(error instanceof McpRuntimeConnectionError)) return undefined;
  if (!(
    tool instanceof McpIntegrationTool || tool instanceof McpIntegrationResource
  ))
    return undefined;
  return {
    integrationId: tool.integrationId,
    integrationName: tool.integrationName,
  };
}
