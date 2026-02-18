import type { UUID } from 'crypto';

/**
 * Command to disable an MCP integration.
 */
export class DisableMcpIntegrationCommand {
  constructor(public readonly integrationId: UUID) {}
}
