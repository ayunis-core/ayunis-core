import type { UUID } from 'crypto';
import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { User } from 'src/iam/users/domain/user.entity';

export class OrgCreatedEvent {
  static readonly EVENT_NAME = 'org.created';

  constructor(
    public readonly orgId: UUID,
    public readonly org: Org,
    public readonly user: User,
  ) {}
}
