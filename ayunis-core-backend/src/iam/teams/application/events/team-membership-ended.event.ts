import type { UUID } from 'crypto';

export class TeamMembershipEndedEvent {
  static readonly EVENT_NAME = 'team.membership-ended';

  constructor(
    public readonly orgId: UUID,
    public readonly teamId: UUID,
    public readonly userIds: UUID[],
  ) {}
}
