import type { UUID } from 'crypto';

export class DeleteInviteByEmailCommand {
  public readonly email: string;
  public readonly requestingUserId: UUID;

  constructor(params: { email: string; requestingUserId: UUID }) {
    this.email = params.email;
    this.requestingUserId = params.requestingUserId;
  }
}
