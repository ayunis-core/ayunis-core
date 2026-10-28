import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
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

    const [userLimit, defaultLimit, teams] = await Promise.all([
      this.creditLimitRepository.findByUserId(query.orgId, query.userId),
      this.creditLimitRepository.findDefaultUserLimit(query.orgId),
      this.findTeamsByUserIdUseCase.execute(
        new FindTeamsByUserIdQuery(query.userId),
      ),
    ]);
    const teamLimits = await this.creditLimitRepository.findByTeamIds(
      query.orgId,
      teams.map((team) => team.id),
    );

    return {
      personalCreditLimit: (userLimit ?? defaultLimit)?.monthlyCredits ?? null,
      teamCreditLimits: selectTeamCreditLimits(teamLimits),
    };
  }
}
