import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';

export type ToolResolution =
  | { tool: Tool; viaLegacyName: boolean }
  | { tool: null; modelFeedback: string };

/**
 * Threads older than the integration namespace carry MCP calls under the
 * plain upstream name, and models imitate what they see in history. A
 * plain name that exactly one attached integration provides is still
 * unambiguous, so it resolves; a contested one is handed back with the
 * qualified names the model should use instead.
 */
export function resolveToolForCall(
  tools: readonly Tool[],
  name: string,
): ToolResolution {
  const exact = tools.find((tool) => tool.name === name);
  if (exact) {
    return { tool: exact, viaLegacyName: false };
  }

  const upstreamMatches = tools.filter(
    (tool) =>
      (tool instanceof McpIntegrationTool ||
        tool instanceof McpIntegrationResource) &&
      tool.originalName === name,
  );
  if (upstreamMatches.length === 1) {
    return { tool: upstreamMatches[0], viaLegacyName: true };
  }
  if (upstreamMatches.length > 1) {
    const qualifiedNames = upstreamMatches
      .map((tool) => `"${tool.name}"`)
      .join(', ');
    return {
      tool: null,
      modelFeedback: `Several integrations provide a tool named ${name}. Call one of these instead: ${qualifiedNames}.`,
    };
  }
  return {
    tool: null,
    modelFeedback: `A tool with the name ${name} was not found. Only use tools that are available in your given list of tools.`,
  };
}
