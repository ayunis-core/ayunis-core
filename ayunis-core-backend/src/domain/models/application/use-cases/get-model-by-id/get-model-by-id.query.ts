import { UUID } from 'crypto';

export class GetModelByIdQuery {
  constructor(public readonly id: UUID) {}
}
