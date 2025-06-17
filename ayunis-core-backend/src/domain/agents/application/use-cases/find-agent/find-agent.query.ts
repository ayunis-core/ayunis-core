import { UUID } from 'crypto';

export class FindAgentQuery {
  constructor(
    public readonly id: UUID,
    public readonly userId: UUID,
  ) {}
}
