import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetMonthlyCreditUsageForUsersQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.query';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { FindAllUserIdsByTeamIdsQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-ids/find-all-user-ids-by-team-ids.query';
import { FindAllUserIdsByTeamIdsUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-ids/find-all-user-ids-by-team-ids.use-case';
import { GetMonthlyCreditUsageForTeamsQuery } from './get-monthly-credit-usage-for-teams.query';

@Injectable()
export class GetMonthlyCreditUsageForTeamsUseCase {
  private readonly logger = new Logger(
    GetMonthlyCreditUsageForTeamsUseCase.name,
  );

  constructor(
    private readonly findAllUserIdsByTeamIdsUseCase: FindAllUserIdsByTeamIdsUseCase,
    private readonly getMonthlyCreditUsageForUsersUseCase: GetMonthlyCreditUsageForUsersUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageForTeamsQuery,
  ): Promise<Map<UUID, number>> {
    this.logger.log(
      { organizationId: query.organizationId, teamCount: query.teamIds.length },
      'Getting monthly credit usage for teams',
    );

    const userIdsByTeam = await this.findAllUserIdsByTeamIdsUseCase.execute(
      new FindAllUserIdsByTeamIdsQuery(query.organizationId, query.teamIds),
    );
    const userIds = this.getUniqueUserIds(userIdsByTeam);
    const usageByUser = await this.getMonthlyCreditUsageForUsersUseCase.execute(
      new GetMonthlyCreditUsageForUsersQuery(
        query.organizationId,
        userIds,
        query.since,
      ),
    );

    return new Map(
      query.teamIds.map((teamId) => [
        teamId,
        this.sumTeamUsage(userIdsByTeam.get(teamId) ?? [], usageByUser),
      ]),
    );
  }

  private getUniqueUserIds(userIdsByTeam: Map<UUID, UUID[]>): UUID[] {
    return [...new Set([...userIdsByTeam.values()].flat())];
  }

  private sumTeamUsage(
    userIds: UUID[],
    usageByUser: Map<UUID, number>,
  ): number {
    return userIds.reduce(
      (creditsUsed, userId) => creditsUsed + (usageByUser.get(userId) ?? 0),
      0,
    );
  }
}
