import type { UUID } from 'crypto';

export class RemoveMcpIntegrationFromThreadCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly mcpIntegrationId: UUID,
  ) {}
}
