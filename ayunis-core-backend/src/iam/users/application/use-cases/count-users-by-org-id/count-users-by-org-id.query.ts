import type { UUID } from 'crypto';

export class CountUsersByOrgIdQuery {
  constructor(public readonly orgId: UUID) {}
}
