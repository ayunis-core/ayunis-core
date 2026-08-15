import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { InvitesRepository } from '../../ports/invites.repository';
import { DeleteAllPendingInvitesCommand } from './delete-all-pending-invites.command';

@Injectable()
export class DeleteAllPendingInvitesUseCase {
  constructor(
    @InjectPinoLogger(DeleteAllPendingInvitesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly invitesRepository: InvitesRepository,
  ) {}

  async execute(
    command: DeleteAllPendingInvitesCommand,
  ): Promise<{ deletedCount: number }> {
    this.logger.info({ orgId: command.orgId }, 'execute');

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
