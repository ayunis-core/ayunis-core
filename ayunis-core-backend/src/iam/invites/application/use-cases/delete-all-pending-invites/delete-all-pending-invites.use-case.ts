import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { DeleteAllPendingInvitesCommand } from './delete-all-pending-invites.command';

@Injectable()
export class DeleteAllPendingInvitesUseCase {
  private readonly logger = new Logger(DeleteAllPendingInvitesUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  async execute(
    command: DeleteAllPendingInvitesCommand,
  ): Promise<{ deletedCount: number }> {
    this.logger.log({ orgId: command.orgId }, 'execute');

    const deletedCount = await this.invitesRepository.deleteAllPendingByOrg(
      command.orgId as UUID,
    );

    this.logger.debug(
      {
        orgId: command.orgId,
        deletedCount,
      },
      'All pending invites deleted',
    );

    return { deletedCount };
  }
}
