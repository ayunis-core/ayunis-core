import { Injectable, Logger } from '@nestjs/common';
import { GetMonthlyCreditUsageQuery } from './get-monthly-credit-usage.query';
import { UsageRepository } from '../../ports/usage.repository';

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

    this.logger.log('Getting monthly credit usage', {
      orgId: query.orgId,
      monthStart: monthStart.toISOString(),
    });

    const creditsUsed = await this.usageRepository.getMonthlyCreditUsage(
      query.orgId,
      monthStart,
    );

    return { creditsUsed };
  }
}
