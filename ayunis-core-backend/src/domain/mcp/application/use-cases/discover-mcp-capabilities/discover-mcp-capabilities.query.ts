import type { UUID } from 'crypto';

/**
 * Query for discovering capabilities from an MCP integration
 */
export class DiscoverMcpCapabilitiesQuery {
  constructor(public readonly integrationId: UUID) {}
}
