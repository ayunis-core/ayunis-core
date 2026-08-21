import { Injectable } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteAlreadyAcceptedError } from 'src/iam/invites/application/invites.errors';
import { AcceptPendingInviteCommand } from 'src/iam/invites/application/use-cases/accept-pending-invite/accept-pending-invite.command';

@Injectable()
export class AcceptPendingInviteUseCase {
  constructor(private readonly invites: InvitesRepository) {}

  async execute(command: AcceptPendingInviteCommand): Promise<void> {
    if (!(await this.invites.accept(command.inviteId))) {
      throw new InviteAlreadyAcceptedError({ inviteId: command.inviteId });
    }
  }
}
