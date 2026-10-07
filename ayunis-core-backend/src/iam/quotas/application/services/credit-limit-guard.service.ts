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
import { GetMonthlyCreditUsageForTeamsUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-teams/get-monthly-credit-usage-for-teams.use-case';
import { GetMonthlyCreditUsageForTeamsQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-teams/get-monthly-credit-usage-for-teams.query';

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
    private readonly getMonthlyCreditUsageForTeamsUseCase: GetMonthlyCreditUsageForTeamsUseCase,
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

    if (personalCreditLimit !== null) {
      await this.ensurePersonalLimitNotExceeded(
        orgId,
        userId,
        personalCreditLimit,
      );
    }

    if (teamCreditLimits.length === 0) {
      return;
    }

    const usageByTeam = await this.getMonthlyCreditUsageForTeamsUseCase.execute(
      new GetMonthlyCreditUsageForTeamsQuery(
        orgId,
        teamCreditLimits.map(({ teamId }) => teamId),
      ),
    );
    for (const teamCreditLimit of teamCreditLimits) {
      this.ensureTeamLimitNotExceeded(
        teamCreditLimit.teamId,
        teamCreditLimit.monthlyCredits,
        usageByTeam.get(teamCreditLimit.teamId) ?? 0,
      );
    }
  }

  private async ensurePersonalLimitNotExceeded(
    orgId: UUID,
    userId: UUID,
    monthlyCreditLimit: number,
  ): Promise<void> {
    const { creditsUsed } =
      await this.getMonthlyCreditUsageForUserUseCase.execute(
        new GetMonthlyCreditUsageForUserQuery(orgId, userId),
      );

    if (creditsUsed < monthlyCreditLimit) {
      return;
    }

    this.logger.warn(
      {
        userId,
        creditsUsed,
        monthlyCreditLimit,
      },
      'User credit limit exceeded',
    );
    throw new UserCreditLimitExceededError({
      userId,
      creditsUsed,
      limit: monthlyCreditLimit,
    });
  }

  private ensureTeamLimitNotExceeded(
    teamId: UUID,
    monthlyCreditLimit: number,
    creditsUsed: number,
  ): void {
    if (creditsUsed < monthlyCreditLimit) {
      return;
    }

    this.logger.warn(
      {
        teamId,
        creditsUsed,
        monthlyCreditLimit,
      },
      'Team credit limit exceeded',
    );
    throw new TeamCreditLimitExceededError({
      teamId,
      creditsUsed,
      limit: monthlyCreditLimit,
    });
  }
}
