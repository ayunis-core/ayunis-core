import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { selectTeamCreditLimits } from 'src/iam/credit-limits/application/utils/select-team-credit-limits';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { ResolveCreditLimitsForUserQuery } from './resolve-credit-limits-for-user.query';
import type { CreditLimitsForUser } from './resolve-credit-limits-for-user.result';

@Injectable()
export class ResolveCreditLimitsForUserUseCase {
  private readonly logger = new Logger(ResolveCreditLimitsForUserUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly findTeamsByUserIdUseCase: FindTeamsByUserIdUseCase,
  ) {}

  async execute(
    query: ResolveCreditLimitsForUserQuery,
  ): Promise<CreditLimitsForUser> {
    this.logger.log(
      {
        orgId: query.orgId,
        userId: query.userId,
      },
      'Resolving credit limits for user',
    );

    try {
      const userLimitEntity = await this.creditLimitRepository.findByUserId(
        query.orgId,
        query.userId,
      );

      const teams = await this.findTeamsByUserIdUseCase.execute(
        new FindTeamsByUserIdQuery(query.userId),
      );
      const teamLimits = await this.creditLimitRepository.findByTeamIds(
        query.orgId,
        teams.map((team) => team.id),
      );

      return {
        personalCreditLimit: userLimitEntity?.monthlyCredits ?? null,
        teamCreditLimits: selectTeamCreditLimits(teamLimits),
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to resolve credit limits for user',
      );
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
