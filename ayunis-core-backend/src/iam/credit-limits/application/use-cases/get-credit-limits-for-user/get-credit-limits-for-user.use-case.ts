import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { selectTeamCreditLimits } from '../../utils/select-team-credit-limits';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import { GetCreditLimitsForUserQuery } from './get-credit-limits-for-user.query';
import type { CreditLimitsForUser } from './get-credit-limits-for-user.result';

@Injectable()
export class GetCreditLimitsForUserUseCase {
  private readonly logger = new Logger(GetCreditLimitsForUserUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly findTeamsByUserIdUseCase: FindTeamsByUserIdUseCase,
  ) {}

  async execute(
    query: GetCreditLimitsForUserQuery,
  ): Promise<CreditLimitsForUser> {
    this.logger.log('Resolving credit limits for user', {
      orgId: query.orgId,
      userId: query.userId,
    });

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
      this.logger.error('Failed to resolve credit limits for user', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
