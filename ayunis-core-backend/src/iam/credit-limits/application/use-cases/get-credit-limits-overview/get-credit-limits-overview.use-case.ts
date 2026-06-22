import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForUserUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForUserQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.query';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { GetMonthlyCreditUsageForTeamQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.query';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import type {
  TeamCreditLimitOverviewItem,
  CreditLimitsOverview,
  UserCreditLimitOverviewItem,
} from './credit-limits-overview.view';

// Admin read model: each configured limit joined with its target's name and
// current consumption (from the users/teams/usage modules).
@Injectable()
export class GetCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(GetCreditLimitsOverviewUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly getMonthlyCreditUsageForUserUseCase: GetMonthlyCreditUsageForUserUseCase,
    private readonly getMonthlyCreditUsageForTeamUseCase: GetMonthlyCreditUsageForTeamUseCase,
  ) {}

  async execute(): Promise<CreditLimitsOverview> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Building credit limits overview', { orgId });

    try {
      const limits = await this.creditLimitRepository.findByOrg(orgId);
      const userLimits = limits.filter(
        (limit) => limit.scope === CreditLimitScope.USER,
      );
      const teamLimits = limits.filter(
        (limit) => limit.scope === CreditLimitScope.TEAM,
      );

      const [users, teams] = await Promise.all([
        this.buildUserItems(userLimits),
        this.buildTeamItems(teamLimits),
      ]);

      return { users, teams };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to build credit limits overview', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }

  private async buildUserItems(
    userLimits: CreditLimit[],
  ): Promise<UserCreditLimitOverviewItem[]> {
    if (userLimits.length === 0) {
      return [];
    }

    const orgId = this.contextService.get('orgId');

    const userIds = userLimits.map((limit) => limit.targetUserId as UUID);
    const users = await this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery(userIds),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));

    return Promise.all(
      userLimits.map(async (limit) => {
        const userId = limit.targetUserId as UUID;
        const { creditsUsed } =
          await this.getMonthlyCreditUsageForUserUseCase.execute(
            new GetMonthlyCreditUsageForUserQuery(orgId as UUID, userId),
          );
        const user = usersById.get(userId);
        return {
          userId,
          name: user?.name ?? '',
          email: user?.email ?? '',
          monthlyCredits: limit.monthlyCredits,
          creditsUsed,
        };
      }),
    );
  }

  private async buildTeamItems(
    teamLimits: CreditLimit[],
  ): Promise<TeamCreditLimitOverviewItem[]> {
    if (teamLimits.length === 0) {
      return [];
    }

    const orgId = this.contextService.get('orgId');

    const teams = await this.listTeamsUseCase.execute();
    const nameByTeamId = new Map(
      teams.map((team) => [team.team.id, team.team.name]),
    );

    return Promise.all(
      teamLimits.map(async (limit) => {
        const teamId = limit.targetTeamId as UUID;
        const { creditsUsed } =
          await this.getMonthlyCreditUsageForTeamUseCase.execute(
            new GetMonthlyCreditUsageForTeamQuery(orgId as UUID, teamId),
          );
        return {
          teamId,
          name: nameByTeamId.get(teamId) ?? '',
          monthlyCredits: limit.monthlyCredits,
          creditsUsed,
        };
      }),
    );
  }
}
