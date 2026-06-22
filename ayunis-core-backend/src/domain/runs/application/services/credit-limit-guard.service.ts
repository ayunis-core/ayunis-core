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
    const { personalCreditLimit, teamCreditLimits } =
      await this.getCreditLimitsForUserUseCase.execute(
        new GetCreditLimitsForUserQuery(orgId, userId),
      );

    const hasNoConfiguredLimits =
      personalCreditLimit === null && teamCreditLimits.length === 0;
    if (hasNoConfiguredLimits) {
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
