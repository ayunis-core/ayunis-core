import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';

import { OrgContextRunner } from 'src/common/context/services/org-context-runner.service';

import { EvaluateBudgetAlertsForOrgQuery } from '../use-cases/evaluate-budget-alerts-for-org/evaluate-budget-alerts-for-org.query';
import { EvaluateBudgetAlertsForOrgUseCase } from '../use-cases/evaluate-budget-alerts-for-org/evaluate-budget-alerts-for-org.use-case';

/**
 * Single entrypoint for running a budget-alert evaluation. Serializes runs
 * per org: two concurrent evaluations (a long run overlapping the listener's
 * trailing run, or the daily sweep overlapping event-driven activity) would
 * both load the sent markers before either records, and email the same
 * crossing twice. Never rejects — failures are logged.
 */
@Injectable()
export class BudgetAlertEvaluator {
  private readonly logger = new Logger(BudgetAlertEvaluator.name);
  private readonly inFlight = new Map<UUID, Promise<void>>();

  constructor(
    private readonly orgContextRunner: OrgContextRunner,
    private readonly evaluateBudgetAlertsForOrgUseCase: EvaluateBudgetAlertsForOrgUseCase,
  ) {}

  evaluate(orgId: UUID): Promise<void> {
    const previous = this.inFlight.get(orgId) ?? Promise.resolve();
    const run = previous.then(() => this.evaluateOrg(orgId));
    this.inFlight.set(orgId, run);
    void run.finally(() => {
      if (this.inFlight.get(orgId) === run) {
        this.inFlight.delete(orgId);
      }
    });

    return run;
  }

  private async evaluateOrg(orgId: UUID): Promise<void> {
    try {
      this.logger.debug('Evaluating budget alerts', { orgId });

      await this.orgContextRunner.runForOrg(orgId, () =>
        this.evaluateBudgetAlertsForOrgUseCase.execute(
          new EvaluateBudgetAlertsForOrgQuery(orgId),
        ),
      );
    } catch (error) {
      this.logger.error('Failed to evaluate budget alerts', {
        orgId,
        stack: error instanceof Error ? error.stack : String(error),
      });
    }
  }
}
