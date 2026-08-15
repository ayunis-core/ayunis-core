import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupBudgetAlertNotificationsUseCase } from '../use-cases/cleanup-budget-alert-notifications/cleanup-budget-alert-notifications.use-case';

/**
 * Purges budget-alert notification markers older than the retention window.
 * Alert evaluation itself is event-driven (see BudgetAlertsListener) with a
 * daily sweep as safety net (see BudgetAlertEvaluationTask).
 */
@Injectable()
export class BudgetAlertCleanupTask {
  constructor(
    @InjectPinoLogger(BudgetAlertCleanupTask.name)
    private readonly logger: PinoLogger,
    private readonly cleanupBudgetAlertNotificationsUseCase: CleanupBudgetAlertNotificationsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCleanup(): Promise<void> {
    this.logger.info('Purging expired budget alert notifications');
    try {
      await this.cleanupBudgetAlertNotificationsUseCase.execute();
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Budget alert notification cleanup failed',
      );
    }
  }
}
