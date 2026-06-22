import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ResolveCreditLimitsForUserUseCase } from 'src/iam/credit-limits/application/use-cases/resolve-credit-limits-for-user/resolve-credit-limits-for-user.use-case';
import { ResolveCreditLimitsForUserQuery } from 'src/iam/credit-limits/application/use-cases/resolve-credit-limits-for-user/resolve-credit-limits-for-user.query';
import {
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetMonthlyCreditUsageForUserUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForUserQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.query';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { GetMonthlyCreditUsageForTeamQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.query';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { IsUsageBasedSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.query';

/**
 * Most-restrictive-wins: blocks a run if the acting user's personal limit OR
 * any team they belong to is exhausted, over the current calendar month (UTC).
 */
@Injectable()
export class CreditLimitGuardService {
  private readonly logger = new Logger(CreditLimitGuardService.name);

  constructor(
    private readonly resolveCreditLimitsForUserUseCase: ResolveCreditLimitsForUserUseCase,
    private readonly getMonthlyCreditUsageForUserUseCase: GetMonthlyCreditUsageForUserUseCase,
    private readonly getMonthlyCreditUsageForTeamUseCase: GetMonthlyCreditUsageForTeamUseCase,
    private readonly isUsageBasedSubscriptionUseCase: IsUsageBasedSubscriptionUseCase,
  ) {}

  async ensureWithinLimits(orgId: UUID, userId: UUID): Promise<void> {
    const { personalCreditLimit, teamCreditLimits } =
      await this.resolveCreditLimitsForUserUseCase.execute(
        new ResolveCreditLimitsForUserQuery(orgId, userId),
      );

    const hasNoConfiguredLimits =
      personalCreditLimit === null && teamCreditLimits.length === 0;
    if (hasNoConfiguredLimits) {
      return;
    }

    const isUsageBased = await this.isUsageBasedSubscriptionUseCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );
    if (!isUsageBased) {
      return;
    }

    if (personalCreditLimit !== null) {
      await this.ensurePersonalLimitNotExceeded(userId, personalCreditLimit);
    }

    // Checked sequentially on purpose: the first exhausted team throws, so we
    // never issue usage queries for the remaining teams.
    for (const teamCreditLimit of teamCreditLimits) {
      await this.ensureTeamLimitNotExceeded(
        teamCreditLimit.teamId,
        teamCreditLimit.monthlyCredits,
      );
    }
  }

  private async ensurePersonalLimitNotExceeded(
    userId: UUID,
    monthlyCreditLimit: number,
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForUserUseCase.execute(
        new GetMonthlyCreditUsageForUserQuery(userId),
      );

    if (creditsUsed < monthlyCreditLimit) {
      return;
    }

    this.logger.warn('User credit limit exceeded', {
      userId,
      creditsUsed,
      monthlyCreditLimit,
    });
    throw new UserCreditLimitExceededError({
      userId,
      creditsUsed,
      limit: monthlyCreditLimit,
    });
  }

  private async ensureTeamLimitNotExceeded(
    teamId: UUID,
    monthlyCreditLimit: number,
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForTeamUseCase.execute(
        new GetMonthlyCreditUsageForTeamQuery(teamId),
      );

    if (creditsUsed < monthlyCreditLimit) {
      return;
    }

    this.logger.warn('Team credit limit exceeded', {
      teamId,
      creditsUsed,
      monthlyCreditLimit,
    });
    throw new TeamCreditLimitExceededError({
      teamId,
      creditsUsed,
      limit: monthlyCreditLimit,
    });
  }
}
