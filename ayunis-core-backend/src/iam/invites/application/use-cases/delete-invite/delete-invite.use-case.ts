import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { DeleteInviteCommand } from './delete-invite.command';
import { InviteNotFoundError } from 'src/iam/invites/application/invites.errors';

@Injectable()
export class DeleteInviteUseCase {
  private readonly logger = new Logger(DeleteInviteUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  async execute(command: DeleteInviteCommand): Promise<void> {
    this.logger.log(
      {
        inviteId: command.inviteId,
      },
      'execute',
    );

    // Find the invite to verify it exists and check permissions
    const invite = await this.invitesRepository.findOne(command.inviteId);
    if (!invite) {
      this.logger.error({ inviteId: command.inviteId }, 'Invite not found');
      throw new InviteNotFoundError(command.inviteId);
    }

    // Delete the invite
    await this.invitesRepository.delete(command.inviteId);

    this.logger.debug(
      {
        inviteId: command.inviteId,
      },
      'Invite deleted successfully',
    );
  }
}
