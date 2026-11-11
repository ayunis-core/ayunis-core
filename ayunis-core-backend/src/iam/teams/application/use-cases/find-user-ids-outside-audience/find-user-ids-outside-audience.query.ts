import type { UUID } from 'crypto';
import type { CollectiveOwner } from 'src/iam/teams/application/models/collective-owner.model';

/** Who can reach a resource: one user, a team or the whole organization. */
export type ResourceAudience = { type: 'user'; userId: UUID } | CollectiveOwner;

export class FindUserIdsOutsideAudienceQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly audience: ResourceAudience,
  ) {}
}
