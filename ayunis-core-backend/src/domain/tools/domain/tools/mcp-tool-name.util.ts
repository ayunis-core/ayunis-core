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
