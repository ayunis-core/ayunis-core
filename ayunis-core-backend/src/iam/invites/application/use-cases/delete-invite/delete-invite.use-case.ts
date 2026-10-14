import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { DeleteInviteCommand } from './delete-invite.command';
import {
  InviteNotFoundError,
  UnexpectedInviteError,
} from 'src/iam/invites/application/invites.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class DeleteInviteUseCase {
  private readonly logger = new Logger(DeleteInviteUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(command: DeleteInviteCommand): Promise<void> {
    this.logger.log(
      { inviteId: command.inviteId, orgId: command.orgId },
      'execute',
    );

    const invite = await this.invitesRepository.findOne(command.inviteId);
    // Another organization's invite is reported as missing so its existence isn't leaked.
    if (invite?.orgId !== command.orgId) {
      throw new InviteNotFoundError(command.inviteId);
    }

    await this.invitesRepository.delete(command.inviteId);
  }
}
