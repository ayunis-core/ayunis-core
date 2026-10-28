import type { ToolUseIntegration } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';

export class RuntimeToolIntegrationRegistry {
  private readonly integrations = new Map<string, ToolUseIntegration>();

  constructor(tools: readonly Tool[]) {
    this.replaceTools(tools);
  }

  replaceTools(tools: readonly Tool[]): void {
    this.integrations.clear();
    for (const tool of tools) {
      if (
        tool instanceof McpIntegrationTool ||
        tool instanceof McpIntegrationResource
      ) {
        this.integrations.set(tool.name, {
          id: tool.integrationId,
          name: tool.integrationName,
          logoUrl: tool.integrationLogoUrl,
        });
      }
    }
  }

  get(toolName: string): ToolUseIntegration | undefined {
    return this.integrations.get(toolName);
  }
}
