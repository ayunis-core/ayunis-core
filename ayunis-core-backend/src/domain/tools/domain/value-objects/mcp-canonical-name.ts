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
