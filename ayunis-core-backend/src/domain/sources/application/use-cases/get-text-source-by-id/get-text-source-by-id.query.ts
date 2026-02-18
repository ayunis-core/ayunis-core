import { UUID } from 'crypto';

export class GetTextSourceByIdQuery {
  constructor(public readonly id: UUID) {}
}
