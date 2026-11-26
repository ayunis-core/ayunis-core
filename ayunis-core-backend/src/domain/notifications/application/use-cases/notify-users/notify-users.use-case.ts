import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { UnexpectedNotificationError } from 'src/domain/notifications/application/notifications.errors';
import { validNotificationText } from 'src/domain/notifications/application/util/valid-notification-text';
import { Notification } from 'src/domain/notifications/domain/notification.entity';
import { NotifyUsersCommand } from './notify-users.command';

/**
 * Sends one notification to several users in a single insert, so the number
 * of recipients never multiplies the statements.
 */
@Injectable()
export class NotifyUsersUseCase {
  private readonly logger = new Logger(NotifyUsersUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(command: NotifyUsersCommand): Promise<void> {
    const userIds = [...new Set(command.userIds)];
    this.logger.log(
      {
        recipients: userIds.length,
        type: command.type,
        workspaceId: command.workspaceId,
      },
      'Notifying users',
    );
    const text = validNotificationText(command);
    if (userIds.length === 0) return;

    const createdAt = new Date();
    await this.notificationsRepository.createMany(
      userIds.map(
        (userId) =>
          new Notification({
            userId,
            orgId: command.orgId,
            type: command.type,
            ...text,
            workspaceId: command.workspaceId,
            createdAt,
          }),
      ),
    );
  }
}
