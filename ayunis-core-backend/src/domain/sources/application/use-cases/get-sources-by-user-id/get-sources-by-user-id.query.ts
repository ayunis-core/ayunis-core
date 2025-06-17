import { UUID } from 'crypto';

export class GetSourcesByUserIdQuery {
  constructor(public readonly userId: UUID) {}
}
