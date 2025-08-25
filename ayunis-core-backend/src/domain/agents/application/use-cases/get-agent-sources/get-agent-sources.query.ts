import { UUID } from 'crypto';

export class GetAgentSourcesQuery {
  constructor(public readonly agentId: UUID) {}
}