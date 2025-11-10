import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteInviteCommand } from './delete-invite.command';
import { InviteNotFoundError } from '../../invites.errors';

@Injectable()
export class DeleteInviteUseCase {
  private readonly logger = new Logger(DeleteInviteUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  async execute(command: DeleteInviteCommand): Promise<void> {
    this.logger.log('execute', {
      inviteId: command.inviteId,
    });

    // Find the invite to verify it exists and check permissions
    const invite = await this.invitesRepository.findOne(command.inviteId);
    if (!invite) {
      this.logger.error('Invite not found', { inviteId: command.inviteId });
      throw new InviteNotFoundError(command.inviteId);
    }

    // Delete the invite
    await this.invitesRepository.delete(command.inviteId);

    this.logger.debug('Invite deleted successfully', {
      inviteId: command.inviteId,
    });
  }
}
