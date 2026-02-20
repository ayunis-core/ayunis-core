import type { UUID } from 'crypto';

export class ListAgentMcpIntegrationsQuery {
  constructor(public readonly agentId: UUID) {}
}
