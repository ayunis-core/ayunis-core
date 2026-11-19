const CANONICAL_MCP_NAME = /^mcp__(?:tool|resource)__(.+)__[0-9a-f]{8}$/i;

/**
 * Formats a raw tool name into a human-readable label.
 *
 * - Strips canonical and legacy MCP namespaces
 * - Replaces underscores / hyphens with spaces
 * - Capitalizes each word
 */
export function formatToolName(toolName: string): string {
  const canonicalMcpName = CANONICAL_MCP_NAME.exec(toolName)?.[1];
  let formatted = canonicalMcpName ?? toolName.replace(/^mcp_[^_]+_/, '');
  formatted = formatted.replace(/[_-]/g, ' ');
  return formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
