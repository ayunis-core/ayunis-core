import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetMonthlyCreditUsageForTeamQuery } from './get-monthly-credit-usage-for-team.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindAllUserIdsByTeamIdQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.query';

// A team's consumption is the shared pool: the sum over its current members.
@Injectable()
export class GetMonthlyCreditUsageForTeamUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly findAllUserIdsByTeamIdUseCase: FindAllUserIdsByTeamIdUseCase,
    @InjectPinoLogger(GetMonthlyCreditUsageForTeamUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    query: GetMonthlyCreditUsageForTeamQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.info(
      {
        teamId: query.teamId,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for team',
    );

    try {
      const memberIds = await this.findAllUserIdsByTeamIdUseCase.execute(
        new FindAllUserIdsByTeamIdQuery(query.teamId),
      );

      const creditsUsed =
        await this.usageRepository.getTotalMonthlyCreditUsageForUsers(
          query.organizationId,
          memberIds,
          effectiveStart,
        );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get monthly credit usage for team',
      );
      throw new UnexpectedUsageError(error as Error, {
        teamId: query.teamId,
      });
    }
  }
}
