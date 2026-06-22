import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { GetMonthlyCreditUsageForUsersQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.query';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { GetMonthlyCreditUsageForTeamQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.query';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { selectUserCreditLimits } from '../../utils/select-user-credit-limits';
import { selectTeamCreditLimits } from '../../utils/select-team-credit-limits';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import type {
  TeamCreditLimitOverviewItem,
  CreditLimitsOverview,
  UserCreditLimitOverviewItem,
} from './credit-limits-overview.view';

@Injectable()
export class GetCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(GetCreditLimitsOverviewUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly getMonthlyCreditUsageForUsersUseCase: GetMonthlyCreditUsageForUsersUseCase,
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

      const [users, teams] = await Promise.all([
        this.enrichUserLimits(limits),
        this.enrichTeamLimits(limits),
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

  private async enrichUserLimits(
    limits: CreditLimit[],
  ): Promise<UserCreditLimitOverviewItem[]> {
    const userLimits = selectUserCreditLimits(limits);
    if (userLimits.length === 0) {
      return [];
    }

    const userIds = userLimits.map((userLimit) => userLimit.userId);
    const [users, creditsUsedByUser] = await Promise.all([
      this.findUsersByIdsUseCase.execute(new FindUsersByIdsQuery(userIds)),
      this.getMonthlyCreditUsageForUsersUseCase.execute(
        new GetMonthlyCreditUsageForUsersQuery(userIds),
      ),
    ]);

    const userById = new Map<UUID, User>();
    for (const user of users) {
      userById.set(user.id, user);
    }

    return userLimits.map(({ userId, monthlyCredits }) => {
      const user = userById.get(userId);
      return {
        userId,
        name: user?.name ?? '',
        email: user?.email ?? '',
        monthlyCredits,
        creditsUsed: user ? (creditsUsedByUser.get(userId) ?? 0) : 0,
      };
    });
  }

  private async enrichTeamLimits(
    limits: CreditLimit[],
  ): Promise<TeamCreditLimitOverviewItem[]> {
    const teamLimits = selectTeamCreditLimits(limits);
    if (teamLimits.length === 0) {
      return [];
    }

    const teams = await this.listTeamsUseCase.execute();
    const teamNameById = new Map<UUID, string>();
    for (const { team } of teams) {
      teamNameById.set(team.id, team.name);
    }

    return Promise.all(
      teamLimits.map(async ({ teamId, monthlyCredits }) => {
        const name = teamNameById.get(teamId);
        if (name === undefined) {
          return { teamId, name: '', monthlyCredits, creditsUsed: 0 };
        }
        const { creditsUsed } =
          await this.getMonthlyCreditUsageForTeamUseCase.execute(
            new GetMonthlyCreditUsageForTeamQuery(teamId),
          );
        return { teamId, name, monthlyCredits, creditsUsed };
      }),
    );
  }
}
