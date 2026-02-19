import type { UUID } from 'crypto';

export class FindOrgByIdQuery {
  constructor(public readonly id: UUID) {}
}
