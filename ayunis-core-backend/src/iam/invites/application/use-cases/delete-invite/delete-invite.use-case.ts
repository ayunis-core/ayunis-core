import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteInviteCommand } from './delete-invite.command';
import {
  InviteNotFoundError,
  UnauthorizedInviteAccessError,
} from '../../invites.errors';

@Injectable()
export class DeleteInviteUseCase {
  private readonly logger = new Logger(DeleteInviteUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  async execute(command: DeleteInviteCommand): Promise<void> {
    this.logger.log('execute', {
      inviteId: command.inviteId,
      requestingUserId: command.requestingUserId,
    });

    // Find the invite to verify it exists and check permissions
    const invite = await this.invitesRepository.findOne(command.inviteId);
    if (!invite) {
      this.logger.error('Invite not found', { inviteId: command.inviteId });
      throw new InviteNotFoundError(command.inviteId);
    }

    // Check if the requesting user is the one who created the invite
    // Only the inviter should be able to delete the invite
    if (invite.inviterId !== command.requestingUserId) {
      this.logger.error('Unauthorized delete attempt', {
        inviteId: command.inviteId,
        inviterId: invite.inviterId,
        requestingUserId: command.requestingUserId,
      });
      throw new UnauthorizedInviteAccessError({
        inviteId: command.inviteId,
        inviterId: invite.inviterId,
        requestingUserId: command.requestingUserId,
      });
    }

    // Delete the invite
    await this.invitesRepository.delete(command.inviteId);

    this.logger.debug('Invite deleted successfully', {
      inviteId: command.inviteId,
      deletedBy: command.requestingUserId,
    });
  }
}
