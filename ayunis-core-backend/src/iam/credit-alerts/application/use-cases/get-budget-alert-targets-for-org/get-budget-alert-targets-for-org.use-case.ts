import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import type { UserCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/user-credit-limit.view';
import type { TeamCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/team-credit-limit.view';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.query';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';
import { GetUserCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { GetUserCreditLimitsOverviewQuery } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.query';
import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewQuery } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.query';
import { BudgetAlertScope } from '../../../domain/value-objects/budget-alert-scope.enum';
import type { BudgetTarget } from '../../utils/budget-alert-crossing';
import { UnexpectedCreditAlertError } from '../../credit-alerts.errors';
import { GetBudgetAlertTargetsForOrgQuery } from './get-budget-alert-targets-for-org.query';

function currentMonthStartUtc(): Date {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface BudgetAlertTargets {
  periodStart: Date;
  targets: BudgetTarget[];
}

@Injectable()
export class GetBudgetAlertTargetsForOrgUseCase {
  private readonly logger = new Logger(GetBudgetAlertTargetsForOrgUseCase.name);

  constructor(
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
    private readonly getMonthlyCreditUsageUseCase: GetMonthlyCreditUsageUseCase,
    private readonly getUserCreditLimitsOverviewUseCase: GetUserCreditLimitsOverviewUseCase,
    private readonly getTeamCreditLimitsOverviewUseCase: GetTeamCreditLimitsOverviewUseCase,
  ) {}

  async execute(
    query: GetBudgetAlertTargetsForOrgQuery,
  ): Promise<BudgetAlertTargets | null> {
    this.logger.log('execute', { orgId: query.orgId });
    try {
      return await this.collectTargets(query);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to collect budget alert targets', {
        orgId: query.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedCreditAlertError(error);
    }
  }

  private async collectTargets(
    query: GetBudgetAlertTargetsForOrgQuery,
  ): Promise<BudgetAlertTargets | null> {
    const { monthlyCredits, startsAt } =
      await this.getMonthlyCreditLimitUseCase.execute(
        new GetMonthlyCreditLimitQuery(query.orgId),
      );

    if (monthlyCredits === null) {
      return null;
    }

    const usageSince = startsAt ?? undefined;
    const [orgUsage, userItems, teamItems] = await Promise.all([
      this.getMonthlyCreditUsageUseCase.execute(
        new GetMonthlyCreditUsageQuery(query.orgId, usageSince),
      ),
      this.getUserCreditLimitsOverviewUseCase.execute(
        new GetUserCreditLimitsOverviewQuery(usageSince),
      ),
      this.getTeamCreditLimitsOverviewUseCase.execute(
        new GetTeamCreditLimitsOverviewQuery(usageSince),
      ),
    ]);

    return {
      periodStart: currentMonthStartUtc(),
      targets: this.buildTargets(
        {
          orgId: query.orgId,
          monthlyCredits,
          creditsUsed: orgUsage.creditsUsed,
        },
        userItems,
        teamItems,
      ),
    };
  }

  private buildTargets(
    org: { orgId: UUID; monthlyCredits: number; creditsUsed: number },
    userItems: UserCreditLimitOverviewItem[],
    teamItems: TeamCreditLimitOverviewItem[],
  ): BudgetTarget[] {
    return [
      {
        scope: BudgetAlertScope.ORG,
        targetId: org.orgId,
        name: '',
        monthlyCredits: org.monthlyCredits,
        creditsUsed: org.creditsUsed,
      },
      ...userItems.map((item) => ({
        scope: BudgetAlertScope.USER,
        targetId: item.userId,
        name: item.name,
        monthlyCredits: item.monthlyCredits,
        creditsUsed: item.creditsUsed,
      })),
      ...teamItems.map((item) => ({
        scope: BudgetAlertScope.TEAM,
        targetId: item.teamId,
        name: item.name,
        monthlyCredits: item.monthlyCredits,
        creditsUsed: item.creditsUsed,
      })),
    ];
  }
}
