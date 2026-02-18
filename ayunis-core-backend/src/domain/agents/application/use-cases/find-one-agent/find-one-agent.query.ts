import { UUID } from 'crypto';

export class FindOneAgentQuery {
  constructor(public readonly id: UUID) {}
}
