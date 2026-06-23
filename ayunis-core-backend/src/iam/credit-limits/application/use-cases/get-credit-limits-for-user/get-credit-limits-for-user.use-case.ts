import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import { GetCreditLimitsForUserQuery } from './get-credit-limits-for-user.query';
import type { CreditLimitsForUser } from './get-credit-limits-for-user.result';

// Takes the principal explicitly (orgId + userId) rather than reading context:
// it runs inside the runs module's CreditLimitGuardService, not a request scope.
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
      // Only consider teams that belong to the queried organization.
      const teamIds = teams
        .filter((team) => team.orgId === query.orgId)
        .map((team) => team.id);
      const teamLimitEntities = await this.creditLimitRepository.findByTeamIds(
        query.orgId,
        teamIds,
      );

      return {
        userLimit: userLimitEntity ? userLimitEntity.monthlyCredits : null,
        teamLimits: teamLimitEntities.map((limit) => ({
          teamId: limit.targetTeamId as UUID,
          monthlyCredits: limit.monthlyCredits,
        })),
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
