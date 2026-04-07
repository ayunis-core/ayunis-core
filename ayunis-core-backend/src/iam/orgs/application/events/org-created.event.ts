import type { UUID } from 'crypto';
import type { Org } from 'src/iam/orgs/domain/org.entity';

export class OrgCreatedEvent {
  static readonly EVENT_NAME = 'org.created';

  constructor(
    public readonly orgId: UUID,
    public readonly org: Org,
  ) {}
}
