import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedInviteError } from 'src/iam/invites/application/invites.errors';
import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteInviteByEmailCommand } from './delete-invite-by-email.command';
import { Injectable, Logger } from '@nestjs/common';
import { InviteNotFoundError } from '../../invites.errors';

@Injectable()
export class DeleteInviteByEmailUseCase {
  private readonly logger = new Logger(DeleteInviteByEmailUseCase.name);
  constructor(private readonly invitesRepository: InvitesRepository) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(command: DeleteInviteByEmailCommand): Promise<void> {
    this.logger.log('execute', {
      email: command.email,
      requestingUserId: command.requestingUserId,
    });

    const invite = await this.invitesRepository.findOneByEmail(command.email);
    if (!invite) {
      this.logger.error('Invite not found', { email: command.email });
      throw new InviteNotFoundError(command.email);
    }
    await this.invitesRepository.delete(invite.id);

    this.logger.debug('Invite deleted successfully', {
      email: command.email,
      deletedBy: command.requestingUserId,
    });
  }
}
