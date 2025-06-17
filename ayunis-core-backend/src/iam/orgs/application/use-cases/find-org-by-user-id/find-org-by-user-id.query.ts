import { UUID } from 'crypto';

export class FindOrgByUserIdQuery {
  constructor(public readonly userId: UUID) {}
}
