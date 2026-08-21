import type { UUID } from 'crypto';

export class CountPendingInvitesByOrgIdQuery {
  constructor(public readonly orgId: UUID) {}
}
