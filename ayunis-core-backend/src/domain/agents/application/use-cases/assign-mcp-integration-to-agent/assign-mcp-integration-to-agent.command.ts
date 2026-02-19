import type { UUID } from 'crypto';

/**
 * Command to assign an MCP integration to an agent
 */
export class AssignMcpIntegrationToAgentCommand {
  constructor(
    public readonly agentId: UUID,
    public readonly integrationId: UUID,
  ) {}
}
