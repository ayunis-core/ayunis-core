import { UUID } from 'crypto';

export class UnassignMcpIntegrationFromAgentCommand {
  constructor(
    public readonly agentId: UUID,
    public readonly integrationId: UUID,
  ) {}
}
