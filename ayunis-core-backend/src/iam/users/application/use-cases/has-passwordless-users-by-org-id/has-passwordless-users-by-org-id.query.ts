import type { UUID } from 'crypto';

export class HasPasswordlessUsersByOrgIdQuery {
  constructor(readonly orgId: UUID) {}
}
