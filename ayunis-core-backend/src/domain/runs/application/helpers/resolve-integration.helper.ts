import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import type { ToolUseIntegration } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

/**
 * Resolves integration metadata for a tool call by matching the tool name
 * against the available tools. Returns undefined if the tool is not an
 * MCP integration tool.
 */
export function resolveIntegration(
  toolName: string,
  tools: Tool[],
): ToolUseIntegration | undefined {
  const matchedTool = tools.find((t) => t.name === toolName);
  if (matchedTool instanceof McpIntegrationTool) {
    return {
      id: matchedTool.integrationId,
      name: matchedTool.integrationName,
      logoUrl: matchedTool.integrationLogoUrl,
    };
  }
  return undefined;
}

type AssistantContent =
  | TextMessageContent
  | ToolUseMessageContent
  | ThinkingMessageContent;

/**
 * Enriches assistant message content blocks with integration metadata.
 * For each ToolUseMessageContent, resolves the matching integration and
 * attaches its metadata (id, name, logoUrl).
 */
export function enrichContentWithIntegration(
  content: AssistantContent[],
  tools: Tool[],
): AssistantContent[] {
  return content.map((item) => {
    if (!(item instanceof ToolUseMessageContent)) return item;
    const integration = resolveIntegration(item.name, tools);
    if (!integration) return item;
    return new ToolUseMessageContent(
      item.id,
      item.name,
      item.params,
      item.providerMetadata,
      integration,
    );
  });
}
