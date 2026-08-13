import type { UUID } from 'crypto';

export class FindPendingInviteByEmailAndOrgQuery {
  constructor(
    public readonly email: string,
    public readonly orgId: UUID,
  ) {}
}
