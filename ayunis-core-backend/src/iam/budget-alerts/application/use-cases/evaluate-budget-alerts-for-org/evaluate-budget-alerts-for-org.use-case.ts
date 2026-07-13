import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedBudgetAlertError } from '../../budget-alerts.errors';
import { GetBudgetAlertTargetsForOrgUseCase } from '../get-budget-alert-targets-for-org/get-budget-alert-targets-for-org.use-case';
import { GetBudgetAlertTargetsForOrgQuery } from '../get-budget-alert-targets-for-org/get-budget-alert-targets-for-org.query';
import { ProcessBudgetAlertCrossingsUseCase } from '../process-budget-alert-crossings/process-budget-alert-crossings.use-case';
import { ProcessBudgetAlertCrossingsQuery } from '../process-budget-alert-crossings/process-budget-alert-crossings.query';
import { EvaluateBudgetAlertsForOrgQuery } from './evaluate-budget-alerts-for-org.query';

/**
 * Evaluates all budget scopes for one organization, then delegates crossing
 * processing and delivery. Callers outside a request must run this inside an
 * organization context (see BudgetAlertsListener) because downstream lookups
 * read the orgId from CLS.
 */
@Injectable()
export class EvaluateBudgetAlertsForOrgUseCase {
  private readonly logger = new Logger(EvaluateBudgetAlertsForOrgUseCase.name);

  constructor(
    private readonly getBudgetAlertTargetsForOrgUseCase: GetBudgetAlertTargetsForOrgUseCase,
    private readonly processBudgetAlertCrossingsUseCase: ProcessBudgetAlertCrossingsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedBudgetAlertError)
  async execute(query: EvaluateBudgetAlertsForOrgQuery): Promise<void> {
    this.logger.log('execute', { orgId: query.orgId });

    const result = await this.getBudgetAlertTargetsForOrgUseCase.execute(
      new GetBudgetAlertTargetsForOrgQuery(query.orgId),
    );
    // Null means the org has no usage-based subscription — no budgets exist
    // that could cross a threshold, so there is nothing to evaluate.
    if (!result) {
      this.logger.debug('Org has no usage-based subscription, skipping', {
        orgId: query.orgId,
      });
      return;
    }

    await this.processBudgetAlertCrossingsUseCase.execute(
      new ProcessBudgetAlertCrossingsQuery(
        query.orgId,
        result.periodStart,
        result.targets,
      ),
    );
  }
}
