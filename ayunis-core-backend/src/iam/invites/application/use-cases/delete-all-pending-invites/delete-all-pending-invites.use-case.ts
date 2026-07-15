import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedInviteError } from 'src/iam/invites/application/invites.errors';
import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteAllPendingInvitesCommand } from './delete-all-pending-invites.command';

@Injectable()
export class DeleteAllPendingInvitesUseCase {
  private readonly logger = new Logger(DeleteAllPendingInvitesUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(
    command: DeleteAllPendingInvitesCommand,
  ): Promise<{ deletedCount: number }> {
    this.logger.log('execute', { orgId: command.orgId });

    const deletedCount = await this.invitesRepository.deleteAllPendingByOrg(
      command.orgId as UUID,
    );

    this.logger.debug('All pending invites deleted', {
      orgId: command.orgId,
      deletedCount,
    });

    return { deletedCount };
  }
}
