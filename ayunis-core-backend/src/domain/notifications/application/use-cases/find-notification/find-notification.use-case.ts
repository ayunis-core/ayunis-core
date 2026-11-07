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
import { FindNotificationQuery } from './find-notification.query';

/** One of the current user's notifications; anyone else's is not found. */
@Injectable()
export class FindNotificationUseCase {
  private readonly logger = new Logger(FindNotificationUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(query: FindNotificationQuery): Promise<Notification> {
    this.logger.log({ notificationId: query.id }, 'Finding notification');
    const { userId } = getRequiredUserContext(this.contextService);
    const notification = await this.notificationsRepository.findById(
      userId,
      query.id,
    );
    if (!notification) throw new NotificationNotFoundError(query.id);
    return notification;
  }
}
