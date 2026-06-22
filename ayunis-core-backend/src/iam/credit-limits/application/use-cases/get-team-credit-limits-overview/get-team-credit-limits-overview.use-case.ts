import type { UUID } from 'crypto';
import type { TeamCreditLimitOverviewItem } from './team-credit-limit.view';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { GetMonthlyCreditUsageForTeamQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.query';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { selectTeamCreditLimits } from '../../utils/select-team-credit-limits';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';

@Injectable()
export class GetTeamCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(GetTeamCreditLimitsOverviewUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly getMonthlyCreditUsageForTeamUseCase: GetMonthlyCreditUsageForTeamUseCase,
  ) {}

  async execute(): Promise<TeamCreditLimitOverviewItem[]> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Listing team credit limits', { orgId });

    try {
      const limits = await this.creditLimitRepository.findTeamLimits(orgId);
      return await this.enrich(limits);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to list team credit limits', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }

  private async enrich(
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
