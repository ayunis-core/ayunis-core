import { UUID } from 'crypto';

export class GetInvitesByOrgQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly requestingUserId: UUID, // To ensure user has access to the org
  ) {}
}
