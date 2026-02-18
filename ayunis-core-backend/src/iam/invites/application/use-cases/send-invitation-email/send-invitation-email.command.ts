import type { Invite } from '../../../domain/invite.entity';

export class SendInvitationEmailCommand {
  constructor(
    public readonly invite: Invite,
    public readonly url: string,
  ) {}
}
