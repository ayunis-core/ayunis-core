import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FindAllOrgIdsUseCase } from 'src/iam/orgs/application/use-cases/find-all-org-ids/find-all-org-ids.use-case';
import { EvaluateBudgetAlertsForOrgUseCase } from '../../application/use-cases/evaluate-budget-alerts-for-org/evaluate-budget-alerts-for-org.use-case';
import { EvaluateBudgetAlertsForOrgQuery } from '../../application/use-cases/evaluate-budget-alerts-for-org/evaluate-budget-alerts-for-org.query';

/**
 * Runs daily in the early morning to warn org admins when a credit budget
 * (org-wide, per-user or per-team) crosses a usage threshold. Iterates every
 * org; orgs without a usage-based subscription are skipped inside the
 * evaluation use case. A per-org failure never aborts the sweep.
 */
@Injectable()
export class BudgetAlertsTask {
  private readonly logger = new Logger(BudgetAlertsTask.name);
  private isRunning = false;

  constructor(
    private readonly findAllOrgIdsUseCase: FindAllOrgIdsUseCase,
    private readonly evaluateBudgetAlertsForOrgUseCase: EvaluateBudgetAlertsForOrgUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleBudgetAlerts(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Budget alerts task already running, skipping');
      return;
    }
    this.isRunning = true;
    this.logger.log('Starting scheduled budget alerts sweep');

    try {
      const orgIds = await this.findAllOrgIdsUseCase.execute();
      for (const orgId of orgIds) {
        try {
          await this.evaluateBudgetAlertsForOrgUseCase.execute(
            new EvaluateBudgetAlertsForOrgQuery(orgId),
          );
        } catch (error) {
          this.logger.error('Budget alert evaluation failed for org', {
            orgId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      this.logger.log('Scheduled budget alerts sweep completed', {
        orgCount: orgIds.length,
      });
    } catch (error) {
      this.logger.error('Scheduled budget alerts sweep failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRunning = false;
    }
  }
}
