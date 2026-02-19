import type { UUID } from 'crypto';

/**
 * Command to delete an MCP integration.
 */
export class DeleteMcpIntegrationCommand {
  constructor(public readonly integrationId: UUID) {}
}
