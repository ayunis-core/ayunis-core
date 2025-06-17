import { UUID } from 'crypto';

export class GetSourceByIdQuery {
  constructor(public readonly id: UUID) {}
}
