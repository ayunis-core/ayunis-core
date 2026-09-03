import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditUsageQuery } from './get-monthly-credit-usage.query';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageUseCase {
  private readonly logger = new Logger(GetMonthlyCreditUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetMonthlyCreditUsageQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log(
      {
        orgId: query.orgId,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage',
    );

    try {
      const creditsUsed = await this.usageRepository.getMonthlyCreditUsage(
        query.orgId,
        effectiveStart,
      );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get monthly credit usage',
      );
      throw new UnexpectedUsageError(error as Error, {
        orgId: query.orgId,
        effectiveStart: effectiveStart.toISOString(),
      });
    }
  }
}
