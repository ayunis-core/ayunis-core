import type { UUID } from 'crypto';
import type { TeamCreditLimitOverviewItem } from './team-credit-limit.view';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForTeamsUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-teams/get-monthly-credit-usage-for-teams.use-case';
import { GetMonthlyCreditUsageForTeamsQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-teams/get-monthly-credit-usage-for-teams.query';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import type { TeamCreditLimit } from 'src/iam/credit-limits/domain/team-credit-limit.entity';
import { selectTeamCreditLimits } from 'src/iam/credit-limits/application/utils/select-team-credit-limits';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetTeamCreditLimitsOverviewQuery } from './get-team-credit-limits-overview.query';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class GetTeamCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(GetTeamCreditLimitsOverviewUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly getMonthlyCreditUsageForTeamsUseCase: GetMonthlyCreditUsageForTeamsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    query: GetTeamCreditLimitsOverviewQuery = new GetTeamCreditLimitsOverviewQuery(),
  ): Promise<TeamCreditLimitOverviewItem[]> {
    const orgId = getRequiredOrgId(this.contextService);

    this.logger.log({ orgId }, 'Listing team credit limits');

    const limits = await this.creditLimitRepository.findTeamLimits(orgId);
    return this.enrich(orgId, limits, query.since);
  }

  private async enrich(
    orgId: UUID,
    limits: TeamCreditLimit[],
    since?: Date,
  ): Promise<TeamCreditLimitOverviewItem[]> {
    const teamLimits = selectTeamCreditLimits(limits);
    if (teamLimits.length === 0) {
      return [];
    }

    const teams = await this.listTeamsUseCase.execute();
    const teamNameById = new Map<UUID, string>(
      teams.map(({ team }) => [team.id, team.name]),
    );
    const existingTeamIds = teamLimits
      .map(({ teamId }) => teamId)
      .filter((teamId) => teamNameById.has(teamId));
    const usageByTeam =
      existingTeamIds.length === 0
        ? new Map<UUID, number>()
        : await this.getMonthlyCreditUsageForTeamsUseCase.execute(
            new GetMonthlyCreditUsageForTeamsQuery(
              orgId,
              existingTeamIds,
              since,
            ),
          );

    return teamLimits.map(({ teamId, monthlyCredits }) => ({
      teamId,
      name: teamNameById.get(teamId) ?? '',
      monthlyCredits,
      creditsUsed: teamNameById.has(teamId)
        ? (usageByTeam.get(teamId) ?? 0)
        : 0,
    }));
  }
}
