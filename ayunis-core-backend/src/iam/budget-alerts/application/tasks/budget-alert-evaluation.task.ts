import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';

import { ListUsageBasedSubscriptionOrgIdsUseCase } from 'src/iam/subscriptions/application/use-cases/list-usage-based-subscription-org-ids/list-usage-based-subscription-org-ids.use-case';

import { BudgetAlertEvaluator } from 'src/iam/budget-alerts/application/services/budget-alert-evaluator.service';

/**
 * Daily safety net behind the event-driven evaluation (BudgetAlertsListener).
 * Evaluation is normally triggered by token consumption, but an org whose
 * budget is fully exhausted stops producing usage events — so a crossing
 * that could not be delivered at the time (e.g. the org had no admins) or
 * that arose without activity (budget lowered mid-month) would otherwise
 * never be alerted. The sent-notification markers make re-evaluation
 * idempotent.
 */
@Injectable()
export class BudgetAlertEvaluationTask {
  private readonly logger = new Logger(BudgetAlertEvaluationTask.name);

  constructor(
    private readonly listUsageBasedSubscriptionOrgIdsUseCase: ListUsageBasedSubscriptionOrgIdsUseCase,
    private readonly budgetAlertEvaluator: BudgetAlertEvaluator,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleDailyEvaluation(): Promise<void> {
    this.logger.log('Running daily budget alert evaluation sweep');
    try {
      await checkIn.cron('budget_alert_evaluation', async () => {
        const orgIds =
          await this.listUsageBasedSubscriptionOrgIdsUseCase.execute();
        // Sequential on purpose: the sweep is not latency-sensitive, and one
        // org at a time keeps the load on the database and mail transport flat.
        for (const orgId of orgIds) {
          await this.budgetAlertEvaluator.evaluate(orgId);
        }
      });
    } catch (error) {
      // Only the org listing can throw — the evaluator never rejects.
      this.logger.error(
        { err: error as Error },
        'Daily budget alert evaluation sweep failed',
      );
    }
  }
}
