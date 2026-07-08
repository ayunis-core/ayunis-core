/**
 * LLM providers restrict tool names (Anthropic: `^[a-zA-Z0-9_-]{1,128}$`,
 * OpenAI: 64 chars max of the same charset) and reject the whole request
 * with a 400 otherwise. MCP tool and resource names are not bound by these
 * rules, so they are sanitized before being exposed to the model.
 */

const MAX_TOOL_NAME_LENGTH = 64;
const FALLBACK_TOOL_NAME = 'mcp_tool';

export function sanitizeMcpToolName(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, MAX_TOOL_NAME_LENGTH);
  return /[a-zA-Z0-9]/.test(sanitized) ? sanitized : FALLBACK_TOOL_NAME;
}

/**
 * Providers also reject requests containing two tools with the same name.
 * Keeps the first occurrence of each name; the rest are returned so callers
 * can log what was dropped. `reservedNames` marks names already taken by
 * other tools (e.g. built-ins) — entries carrying one count as duplicates.
 */
export function filterDuplicateToolNames<T extends { name: string }>(
  tools: T[],
  reservedNames: ReadonlySet<string> = new Set(),
): { unique: T[]; duplicates: T[] } {
  const seen = new Set<string>(reservedNames);
  const unique: T[] = [];
  const duplicates: T[] = [];
  for (const tool of tools) {
    if (seen.has(tool.name)) {
      duplicates.push(tool);
    } else {
      seen.add(tool.name);
      unique.push(tool);
    }
  }
  return { unique, duplicates };
}
