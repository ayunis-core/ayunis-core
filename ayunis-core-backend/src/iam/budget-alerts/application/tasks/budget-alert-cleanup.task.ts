import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupBudgetAlertNotificationsUseCase } from '../use-cases/cleanup-budget-alert-notifications/cleanup-budget-alert-notifications.use-case';

/**
 * Purges budget-alert notification markers older than the retention window.
 * Alert evaluation itself is event-driven (see BudgetAlertsListener); only
 * this time-based housekeeping remains on a schedule.
 */
@Injectable()
export class BudgetAlertCleanupTask {
  private readonly logger = new Logger(BudgetAlertCleanupTask.name);

  constructor(
    private readonly cleanupBudgetAlertNotificationsUseCase: CleanupBudgetAlertNotificationsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCleanup(): Promise<void> {
    this.logger.log('Purging expired budget alert notifications');
    try {
      await this.cleanupBudgetAlertNotificationsUseCase.execute();
    } catch (error) {
      this.logger.error('Budget alert notification cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
