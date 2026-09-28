import type { Invite } from 'src/iam/invites/domain/invite.entity';

export class InviteCreatedEvent {
  static readonly EVENT_NAME = 'user.invited';

  constructor(public readonly invite: Invite) {}
}
