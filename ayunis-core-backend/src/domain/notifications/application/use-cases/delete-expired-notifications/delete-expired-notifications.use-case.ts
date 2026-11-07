import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { UnexpectedNotificationError } from 'src/domain/notifications/application/notifications.errors';
import { DeleteExpiredNotificationsCommand } from './delete-expired-notifications.command';

/**
 * Deletes an org's notifications created before the retention cutoff, for
 * the retention policy's nightly enforcement. Returns how many were (or, in a
 * dry run, would be) deleted.
 */
@Injectable()
export class DeleteExpiredNotificationsUseCase {
  private readonly logger = new Logger(DeleteExpiredNotificationsUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(command: DeleteExpiredNotificationsCommand): Promise<number> {
    this.logger.log(
      {
        orgId: command.orgId,
        createdBefore: command.createdBefore,
        dryRun: command.dryRun,
      },
      'Deleting expired notifications',
    );
    if (command.dryRun) {
      return this.notificationsRepository.countByOrgCreatedBefore(
        command.orgId,
        command.createdBefore,
      );
    }
    return this.notificationsRepository.deleteByOrgCreatedBefore(
      command.orgId,
      command.createdBefore,
    );
  }
}
