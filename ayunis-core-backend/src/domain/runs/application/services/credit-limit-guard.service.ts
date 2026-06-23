import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetCreditLimitsForUserUseCase } from 'src/iam/credit-limits/application/use-cases/get-credit-limits-for-user/get-credit-limits-for-user.use-case';
import { GetCreditLimitsForUserQuery } from 'src/iam/credit-limits/application/use-cases/get-credit-limits-for-user/get-credit-limits-for-user.query';
import {
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetMonthlyCreditUsageForUserUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForUserQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.query';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { GetMonthlyCreditUsageForTeamQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.query';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.query';

/**
 * Most-restrictive-wins: blocks a run if the acting user's personal limit OR
 * any team they belong to is exhausted, over the current billing period
 * (anchored to the organization's subscription start date when available,
 * otherwise the current calendar month in UTC).
 *
 * Lives in the runs module because it spans three domains that must not depend
 * on each other — credit-limits config, usage measurement, and teams.
 */
@Injectable()
export class CreditLimitGuardService {
  private readonly logger = new Logger(CreditLimitGuardService.name);

  constructor(
    private readonly getCreditLimitsForUserUseCase: GetCreditLimitsForUserUseCase,
    private readonly getMonthlyCreditUsageForUserUseCase: GetMonthlyCreditUsageForUserUseCase,
    private readonly getMonthlyCreditUsageForTeamUseCase: GetMonthlyCreditUsageForTeamUseCase,
    private readonly getMonthlyCreditLimitUseCase: GetMonthlyCreditLimitUseCase,
  ) {}

  async ensureWithinLimits(orgId: UUID, userId: UUID): Promise<void> {
    // Align personal/team usage window with the organization's subscription window
    const { startsAt } = await this.getMonthlyCreditLimitUseCase.execute(
      new GetMonthlyCreditLimitQuery(orgId),
    );

    const { userLimit, teamLimits } =
      await this.getCreditLimitsForUserUseCase.execute(
        new GetCreditLimitsForUserQuery(orgId, userId),
      );

    if (userLimit === null && teamLimits.length === 0) {
      return;
    }

    if (userLimit !== null) {
      await this.ensureUserWithinLimit(
        userId,
        userLimit,
        startsAt ?? undefined,
      );
    }

    for (const teamLimit of teamLimits) {
      await this.ensureTeamWithinLimit(
        teamLimit.teamId,
        teamLimit.monthlyCredits,
        startsAt ?? undefined,
      );
    }
  }

  private async ensureUserWithinLimit(
    userId: UUID,
    limit: number,
    anchor?: Date,
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForUserUseCase.execute(
        new GetMonthlyCreditUsageForUserQuery(userId, anchor),
      );

    if (creditsUsed >= limit) {
      this.logger.warn('User credit limit exceeded', {
        userId,
        creditsUsed,
        limit,
      });
      throw new UserCreditLimitExceededError({ userId, creditsUsed, limit });
    }
  }

  private async ensureTeamWithinLimit(
    teamId: UUID,
    limit: number,
    anchor?: Date,
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForTeamUseCase.execute(
        new GetMonthlyCreditUsageForTeamQuery(teamId, anchor),
      );

    if (creditsUsed >= limit) {
      this.logger.warn('Team credit limit exceeded', {
        teamId,
        creditsUsed,
        limit,
      });
      throw new TeamCreditLimitExceededError({ teamId, creditsUsed, limit });
    }
  }
}
