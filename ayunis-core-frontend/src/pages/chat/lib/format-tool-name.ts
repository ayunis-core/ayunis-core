/**
 * Formats a raw tool name into a human-readable label.
 *
 * - Strips the `mcp_<server>_` prefix (e.g. "mcp_obsidian-mcp-tools_fetch" → "fetch")
 * - Replaces underscores / hyphens with spaces
 * - Capitalizes each word
 */
export function formatToolName(toolName: string): string {
  let formatted = toolName.replace(/^mcp_[^_]+_/, '');
  formatted = formatted.replace(/[_-]/g, ' ');
  return formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
