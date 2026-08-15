import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteInviteByEmailCommand } from './delete-invite-by-email.command';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InviteNotFoundError } from '../../invites.errors';

@Injectable()
export class DeleteInviteByEmailUseCase {
  constructor(
    @InjectPinoLogger(DeleteInviteByEmailUseCase.name)
    private readonly logger: PinoLogger,
    private readonly invitesRepository: InvitesRepository,
  ) {}

  async execute(command: DeleteInviteByEmailCommand): Promise<void> {
    this.logger.info(
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
