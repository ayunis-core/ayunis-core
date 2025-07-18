import { Invite } from '../../../domain/invite.entity';

export class SendInvitationEmailCommand {
  constructor(
    public readonly invite: Invite,
    public readonly invitationToken: string,
  ) {}
}
