import { UUID } from 'crypto';

export class DeleteInviteCommand {
  constructor(
    public readonly inviteId: UUID,
    public readonly requestingUserId: UUID, // To ensure only authorized users can delete
  ) {}
}
