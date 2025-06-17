import { UUID } from 'crypto';

export class GetSourcesByThreadIdQuery {
  constructor(public readonly threadId: UUID) {}
}
