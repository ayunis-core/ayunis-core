import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import {
  NotificationNotFoundError,
  UnexpectedNotificationError,
} from 'src/domain/notifications/application/notifications.errors';
import type { Notification } from 'src/domain/notifications/domain/notification.entity';
import { MarkNotificationUnreadCommand } from './mark-notification-unread.command';

@Injectable()
export class MarkNotificationUnreadUseCase {
  private readonly logger = new Logger(MarkNotificationUnreadUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(command: MarkNotificationUnreadCommand): Promise<Notification> {
    this.logger.log(
      { notificationId: command.id },
      'Marking notification unread',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const notification = await this.notificationsRepository.markUnread(
      userId,
      command.id,
    );
    if (!notification) throw new NotificationNotFoundError(command.id);
    return notification;
  }
}
