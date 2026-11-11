import type { UUID } from 'crypto';

type McpCapabilityKind = 'tool' | 'resource';

// Eight hex characters keep `mcp__tool__<name>__<id>` within the 64-character
// provider limit for upstream names up to 43 characters, so most tools reach
// the model with their real name instead of a truncated, hashed one.
export const MCP_INTEGRATION_ID_PREFIX_LENGTH = 8;

export function buildMcpCanonicalName(
  kind: McpCapabilityKind,
  originalName: string,
  integrationId: UUID,
): string {
  const integrationPrefix = integrationId.slice(
    0,
    MCP_INTEGRATION_ID_PREFIX_LENGTH,
  );
  return `mcp__${kind}__${originalName}__${integrationPrefix}`;
}

/** The upstream name in a canonical name built for this integration, if any. */
export function parseMcpCanonicalName(
  kind: McpCapabilityKind,
  canonicalName: string,
  integrationId: string,
): string | null {
  const prefix = `mcp__${kind}__`;
  const suffix = `__${integrationId.slice(0, MCP_INTEGRATION_ID_PREFIX_LENGTH)}`;
  if (
    canonicalName.length <= prefix.length + suffix.length ||
    !canonicalName.startsWith(prefix) ||
    !canonicalName.endsWith(suffix)
  ) {
    return null;
  }
  return canonicalName.slice(prefix.length, -suffix.length);
}
