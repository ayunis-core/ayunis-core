import { UUID } from 'crypto';

export class GetSourceByIdQuery {
  constructor(public readonly sourceId: UUID) {}
}
