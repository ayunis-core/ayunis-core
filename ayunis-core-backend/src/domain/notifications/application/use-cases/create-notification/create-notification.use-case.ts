import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import {
  NotificationInvalidError,
  NotificationLimitReachedError,
  UnexpectedNotificationError,
} from 'src/domain/notifications/application/notifications.errors';
import { Notification } from 'src/domain/notifications/domain/notification.entity';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';
import { notificationMediaViolation } from 'src/domain/notifications/domain/notification-media';
import { validNotificationText } from 'src/domain/notifications/application/util/valid-notification-text';
import { CreateNotificationCommand } from './create-notification.command';

@Injectable()
export class CreateNotificationUseCase {
  private readonly logger = new Logger(CreateNotificationUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(command: CreateNotificationCommand): Promise<Notification> {
    this.logger.log(
      {
        userId: command.userId,
        type: command.type,
        routineId: command.routineId,
        routineThreadId: command.routineThreadId,
      },
      'Creating notification',
    );
    const notification = new Notification({
      userId: command.userId,
      orgId: command.orgId,
      type: command.type,
      ...validNotificationText(command),
      media: command.media && validMedia(command.media),
      routineId: command.routineId,
      routineThreadId: command.routineThreadId,
    });
    if (command.limitPerRoutineThread === undefined) {
      return this.notificationsRepository.create(notification);
    }
    return this.createWithinLimit(
      notification,
      command.routineThreadId,
      command.limitPerRoutineThread,
    );
  }

  private async createWithinLimit(
    notification: Notification,
    routineThreadId: UUID | null,
    limit: number,
  ): Promise<Notification> {
    if (!routineThreadId) {
      throw new NotificationInvalidError(
        'a limit needs a routine thread to count against',
      );
    }
    const created =
      await this.notificationsRepository.createWithinRoutineThreadLimit(
        Object.assign(notification, { routineThreadId }),
        limit,
      );
    if (!created) {
      throw new NotificationLimitReachedError(limit, { routineThreadId });
    }
    return created;
  }
}

function validMedia(media: NotificationMedia): NotificationMedia {
  const violation = notificationMediaViolation(media);
  if (violation) {
    throw new NotificationInvalidError(violation);
  }
  return media;
}
