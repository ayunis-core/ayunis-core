import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { DeleteInviteByEmailCommand } from './delete-invite-by-email.command';
import { Injectable, Logger } from '@nestjs/common';
import { InviteNotFoundError } from 'src/iam/invites/application/invites.errors';

@Injectable()
export class DeleteInviteByEmailUseCase {
  private readonly logger = new Logger(DeleteInviteByEmailUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  async execute(command: DeleteInviteByEmailCommand): Promise<void> {
    this.logger.log(
      {
        email: command.email,
        requestingUserId: command.requestingUserId,
      },
      'execute',
    );

    const invite = await this.invitesRepository.findOneByEmail(command.email);
    if (!invite) {
      this.logger.error({ email: command.email }, 'Invite not found');
      throw new InviteNotFoundError(command.email);
    }
    await this.invitesRepository.delete(invite.id);

    this.logger.debug(
      {
        email: command.email,
        deletedBy: command.requestingUserId,
      },
      'Invite deleted successfully',
    );
  }
}
