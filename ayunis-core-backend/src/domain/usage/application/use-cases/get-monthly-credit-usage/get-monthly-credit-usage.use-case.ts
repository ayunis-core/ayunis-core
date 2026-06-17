import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditUsageQuery } from './get-monthly-credit-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetMonthlyCreditUsageUseCase {
  private readonly logger = new Logger(GetMonthlyCreditUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetMonthlyCreditUsageQuery,
  ): Promise<{ creditsUsed: number }> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const effectiveStart =
      query.since && query.since > monthStart ? query.since : monthStart;

    this.logger.log('Getting monthly credit usage', {
      orgId: query.orgId,
      monthStart: monthStart.toISOString(),
      effectiveStart: effectiveStart.toISOString(),
    });

    try {
      const creditsUsed = await this.usageRepository.getMonthlyCreditUsage(
        query.orgId,
        effectiveStart,
      );

      return { creditsUsed };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get monthly credit usage', error);
      throw new UnexpectedUsageError(error as Error, {
        orgId: query.orgId,
        monthStart: monthStart.toISOString(),
      });
    }
  }
}
