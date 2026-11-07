import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { UnexpectedNotificationError } from 'src/domain/notifications/application/notifications.errors';
import type { Notification } from 'src/domain/notifications/domain/notification.entity';
import { FindMyNotificationsQuery } from './find-my-notifications.query';

@Injectable()
export class FindMyNotificationsUseCase {
  private readonly logger = new Logger(FindMyNotificationsUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(
    query: FindMyNotificationsQuery,
  ): Promise<Paginated<Notification>> {
    this.logger.log(
      { limit: query.limit, offset: query.offset },
      'Finding notifications',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    return this.notificationsRepository.findPageByUserId(userId, {
      limit: query.limit,
      offset: query.offset,
    });
  }
}
