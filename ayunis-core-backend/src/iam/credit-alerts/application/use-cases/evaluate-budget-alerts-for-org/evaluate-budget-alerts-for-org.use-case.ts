import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedCreditAlertError } from '../../credit-alerts.errors';
import { GetBudgetAlertTargetsForOrgUseCase } from '../get-budget-alert-targets-for-org/get-budget-alert-targets-for-org.use-case';
import { GetBudgetAlertTargetsForOrgQuery } from '../get-budget-alert-targets-for-org/get-budget-alert-targets-for-org.query';
import { ProcessBudgetAlertCrossingsUseCase } from '../process-budget-alert-crossings/process-budget-alert-crossings.use-case';
import { ProcessBudgetAlertCrossingsQuery } from '../process-budget-alert-crossings/process-budget-alert-crossings.query';
import { EvaluateBudgetAlertsForOrgQuery } from './evaluate-budget-alerts-for-org.query';

/**
 * Evaluates all budget scopes for one organization inside an organization
 * context, then delegates crossing processing and delivery.
 */
@Injectable()
export class EvaluateBudgetAlertsForOrgUseCase {
  private readonly logger = new Logger(EvaluateBudgetAlertsForOrgUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly getBudgetAlertTargetsForOrgUseCase: GetBudgetAlertTargetsForOrgUseCase,
    private readonly processBudgetAlertCrossingsUseCase: ProcessBudgetAlertCrossingsUseCase,
  ) {}

  async execute(query: EvaluateBudgetAlertsForOrgQuery): Promise<void> {
    this.logger.log('execute', { orgId: query.orgId });
    try {
      await this.contextService.run(() => this.evaluateOrg(query));
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to evaluate budget alerts for org', {
        orgId: query.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedCreditAlertError(error);
    }
  }

  private async evaluateOrg(
    query: EvaluateBudgetAlertsForOrgQuery,
  ): Promise<void> {
    this.contextService.set('orgId', query.orgId);

    const result = await this.getBudgetAlertTargetsForOrgUseCase.execute(
      new GetBudgetAlertTargetsForOrgQuery(query.orgId),
    );
    if (!result) {
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
