import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditUsageForUserQuery } from './get-monthly-credit-usage-for-user.query';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageForUserUseCase {
  private readonly logger = new Logger(
    GetMonthlyCreditUsageForUserUseCase.name,
  );

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetMonthlyCreditUsageForUserQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log(
      {
        userId: query.userId,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for user',
    );

    try {
      const creditsUsed =
        await this.usageRepository.getTotalMonthlyCreditUsageForUser(
          query.organizationId,
          query.userId,
          effectiveStart,
        );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get monthly credit usage for user',
      );
      throw new UnexpectedUsageError(error as Error, {
        userId: query.userId,
      });
    }
  }
}
