import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetOrgAdminsUseCase } from 'src/iam/users/application/use-cases/get-org-admins/get-org-admins.use-case';
import { GetOrgAdminsQuery } from 'src/iam/users/application/use-cases/get-org-admins/get-org-admins.query';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.query';
import { GetUserCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { BudgetAlertScope } from '../../../domain/value-objects/budget-alert-scope.enum';
import { BudgetAlertNotification } from '../../../domain/budget-alert-notification.entity';
import { BudgetAlertNotificationRepository } from '../../ports/budget-alert-notification.repository';
import {
  collectCrossings,
  notificationKey,
  type BudgetCrossing,
  type BudgetTarget,
} from '../../budget-alert-crossing';
import { SendBudgetWarningEmailUseCase } from '../send-budget-warning-email/send-budget-warning-email.use-case';
import { SendBudgetWarningEmailCommand } from '../send-budget-warning-email/send-budget-warning-email.command';
import { EvaluateBudgetAlertsForOrgQuery } from './evaluate-budget-alerts-for-org.query';
import type { BudgetWarningScope } from 'src/common/email-templates/domain/email-template.entity';

const SCOPE_TO_WARNING: Record<BudgetAlertScope, BudgetWarningScope> = {
  [BudgetAlertScope.ORG]: 'org',
  [BudgetAlertScope.USER]: 'user',
  [BudgetAlertScope.TEAM]: 'team',
};

function currentMonthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Evaluates every budget scope of one org (org-wide, per-user, per-team) and
 * emails admins about newly-crossed usage thresholds, recording each so it is
 * not re-sent within the billing period. Runs inside a per-org CLS context so
 * the org-scoped overview use cases resolve the correct org.
 */
@Injectable()
export class EvaluateBudgetAlertsForOrgUseCase {
  private readonly logger = new Logger(EvaluateBudgetAlertsForOrgUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
    private readonly getUserCreditLimitsOverviewUseCase: GetUserCreditLimitsOverviewUseCase,
    private readonly getTeamCreditLimitsOverviewUseCase: GetTeamCreditLimitsOverviewUseCase,
    private readonly getOrgAdminsUseCase: GetOrgAdminsUseCase,
    private readonly sendBudgetWarningEmailUseCase: SendBudgetWarningEmailUseCase,
    private readonly notificationRepository: BudgetAlertNotificationRepository,
  ) {}

  async execute(query: EvaluateBudgetAlertsForOrgQuery): Promise<void> {
    await this.contextService.run(async () => {
      this.contextService.set('orgId', query.orgId);
      await this.evaluate(query.orgId);
    });
  }

  private async evaluate(orgId: UUID): Promise<void> {
    const { monthlyCredits, startsAt } =
      await this.getMonthlyCreditLimitUseCase.execute(
        new GetMonthlyCreditLimitQuery(orgId),
      );
    if (monthlyCredits === null) {
      return; // org is not on a usage-based subscription
    }

    const periodStart = currentMonthStartUtc();
    const targets = await this.buildTargets(orgId, monthlyCredits, startsAt);
    const sentKeys = await this.loadSentKeys(orgId, periodStart);
    const crossings = collectCrossings(targets, sentKeys);
    if (crossings.length === 0) {
      return;
    }

    const admins = await this.getOrgAdminsUseCase.execute(
      new GetOrgAdminsQuery(orgId),
    );
    for (const crossing of crossings) {
      await this.notify(orgId, periodStart, crossing, admins);
    }
  }

  private async buildTargets(
    orgId: UUID,
    orgMonthlyCredits: number,
    startsAt: Date | null,
  ): Promise<BudgetTarget[]> {
    const [orgUsage, userItems, teamItems] = await Promise.all([
      this.getMonthlyCreditUsageUseCase.execute(
        new GetMonthlyCreditUsageQuery(orgId, startsAt ?? undefined),
      ),
      this.getUserCreditLimitsOverviewUseCase.execute(),
      this.getTeamCreditLimitsOverviewUseCase.execute(),
    ]);

    const targets: BudgetTarget[] = [
      {
        scope: BudgetAlertScope.ORG,
        targetId: orgId,
        name: '',
        monthlyCredits: orgMonthlyCredits,
        creditsUsed: orgUsage.creditsUsed,
      },
    ];
    for (const item of userItems) {
      targets.push({
        scope: BudgetAlertScope.USER,
        targetId: item.userId,
        name: item.name,
        monthlyCredits: item.monthlyCredits,
        creditsUsed: item.creditsUsed,
      });
    }
    for (const item of teamItems) {
      targets.push({
        scope: BudgetAlertScope.TEAM,
        targetId: item.teamId,
        name: item.name,
        monthlyCredits: item.monthlyCredits,
        creditsUsed: item.creditsUsed,
      });
    }
    return targets;
  }

  private async loadSentKeys(
    orgId: UUID,
    periodStart: Date,
  ): Promise<Set<string>> {
    const sent = await this.notificationRepository.findByOrgAndPeriod(
      orgId,
      periodStart,
    );
    return new Set(
      sent.map((n) => notificationKey(n.scope, n.targetId, n.threshold)),
    );
  }

  private async notify(
    orgId: UUID,
    periodStart: Date,
    crossing: BudgetCrossing,
    admins: User[],
  ): Promise<void> {
    try {
      for (const admin of admins) {
        await this.sendBudgetWarningEmailUseCase.execute(
          this.toEmailCommand(crossing, admin),
        );
      }
      for (const threshold of crossing.recordThresholds) {
        await this.notificationRepository.record(
          new BudgetAlertNotification({
            orgId,
            scope: crossing.target.scope,
            targetId: crossing.target.targetId,
            threshold,
            periodStart,
          }),
        );
      }
    } catch (error) {
      // Leave the crossing unrecorded so the next run retries it.
      this.logger.error('Failed to notify admins of budget crossing', {
        orgId,
        scope: crossing.target.scope,
        targetId: crossing.target.targetId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private toEmailCommand(
    crossing: BudgetCrossing,
    admin: User,
  ): SendBudgetWarningEmailCommand {
    return new SendBudgetWarningEmailCommand({
      recipientName: admin.name,
      recipientEmail: admin.email,
      scope: SCOPE_TO_WARNING[crossing.target.scope],
      targetName: crossing.target.name,
      threshold: crossing.emailThreshold,
      percentUsed: crossing.percentUsed,
      creditsUsed: crossing.target.creditsUsed,
      monthlyCredits: crossing.target.monthlyCredits,
    });
  }
}
