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

/**
 * Most-restrictive-wins: blocks a run if the acting user's personal limit OR
 * any team they belong to is exhausted, over the current calendar month (UTC).
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
  ) {}

  async ensureWithinLimits(orgId: UUID, userId: UUID): Promise<void> {
    const { userLimit, teamLimits } =
      await this.getCreditLimitsForUserUseCase.execute(
        new GetCreditLimitsForUserQuery(orgId, userId),
      );

    if (userLimit === null && teamLimits.length === 0) {
      return;
    }

    if (userLimit !== null) {
      await this.ensureUserWithinLimit(userId, userLimit);
    }

    for (const teamLimit of teamLimits) {
      await this.ensureTeamWithinLimit(
        teamLimit.teamId,
        teamLimit.monthlyCredits,
      );
    }
  }

  private async ensureUserWithinLimit(
    userId: UUID,
    limit: number,
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForUserUseCase.execute(
        new GetMonthlyCreditUsageForUserQuery(userId),
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
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForTeamUseCase.execute(
        new GetMonthlyCreditUsageForTeamQuery(teamId),
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
