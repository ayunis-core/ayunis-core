import { UUID } from 'crypto';

export class FindUsersByOrgIdQuery {
  constructor(public readonly orgId: UUID) {}
}
