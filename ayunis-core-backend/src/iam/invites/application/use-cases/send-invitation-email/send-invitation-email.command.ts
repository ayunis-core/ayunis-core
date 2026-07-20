import type { Invite } from 'src/iam/invites/domain/invite.entity';

export class SendInvitationEmailCommand {
  constructor(
    public readonly invite: Invite,
    public readonly url: string,
  ) {}
}
