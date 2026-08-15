import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { BudgetAlertNotificationRepository } from '../../ports/budget-alert-notification.repository';
import { UnexpectedBudgetAlertError } from '../../budget-alerts.errors';

/**
 * Only the current period is ever read for dedup; older markers are kept
 * solely as an audit trail, so the window is generous.
 */
const RETENTION_MONTHS = 12;

@Injectable()
export class CleanupBudgetAlertNotificationsUseCase {
  constructor(
    @InjectPinoLogger(CleanupBudgetAlertNotificationsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly notificationRepository: BudgetAlertNotificationRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedBudgetAlertError)
  async execute(): Promise<number> {
    this.logger.info('execute');
    const now = new Date();
    const cutoff = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - RETENTION_MONTHS, 1),
    );
    const deleted = await this.notificationRepository.deleteBefore(cutoff);
    if (deleted > 0) {
      this.logger.info(
        {
          deleted,
        },
        'Purged expired budget alert notifications',
      );
    }
    return deleted;
  }
}
