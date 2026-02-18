import type { UUID } from 'crypto';

export class AddMcpIntegrationToThreadCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly mcpIntegrationId: UUID,
  ) {}
}
