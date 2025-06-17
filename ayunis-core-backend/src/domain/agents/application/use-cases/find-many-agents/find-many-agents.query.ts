import { UUID } from 'crypto';

export class FindManyAgentsQuery {
  constructor(
    public readonly agentIds: UUID[],
    public readonly userId: UUID,
  ) {}
}
