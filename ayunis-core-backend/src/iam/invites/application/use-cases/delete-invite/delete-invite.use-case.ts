import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteInviteCommand } from './delete-invite.command';
import { InviteNotFoundError } from '../../invites.errors';

@Injectable()
export class DeleteInviteUseCase {
  constructor(
    @InjectPinoLogger(DeleteInviteUseCase.name)
    private readonly logger: PinoLogger,
    private readonly invitesRepository: InvitesRepository,
  ) {}

  async execute(command: DeleteInviteCommand): Promise<void> {
    this.logger.info(
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
