import type { UUID } from 'crypto';

export class AllowMcpToolCommand {
  constructor(
    public readonly integrationId: UUID,
    /** Upstream MCP tool name, not the canonical name exposed to the model. */
    public readonly toolName: string,
  ) {}
}
