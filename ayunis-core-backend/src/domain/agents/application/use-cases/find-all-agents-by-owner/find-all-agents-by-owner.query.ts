import { UUID } from 'crypto';

export class FindAllAgentsByOwnerQuery {
  constructor(public readonly userId: UUID) {}
}
