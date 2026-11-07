import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { UnexpectedNotificationError } from 'src/domain/notifications/application/notifications.errors';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  private readonly logger = new Logger(MarkAllNotificationsReadUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(): Promise<void> {
    this.logger.log('Marking all notifications read');
    const { userId } = getRequiredUserContext(this.contextService);
    await this.notificationsRepository.markAllRead(userId, new Date());
  }
}
