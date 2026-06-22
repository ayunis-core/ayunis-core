import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditUsageForUserQuery } from './get-monthly-credit-usage-for-user.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

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

    this.logger.log('Getting monthly credit usage for user', {
      userId: query.userId,
      effectiveStart: effectiveStart.toISOString(),
    });

    try {
      const creditsUsed =
        await this.usageRepository.getTotalMonthlyCreditUsageForUser(
          query.userId,
          effectiveStart,
        );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get monthly credit usage for user', error);
      throw new UnexpectedUsageError(error as Error, {
        userId: query.userId,
      });
    }
  }
}
