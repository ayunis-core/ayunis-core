import type { UUID } from 'crypto';

/**
 * Command to validate an MCP integration by testing the connection.
 */
export class ValidateMcpIntegrationCommand {
  constructor(public readonly integrationId: UUID) {}
}
