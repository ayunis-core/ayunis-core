import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetMonthlyCreditUsageQuery } from './get-monthly-credit-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageUseCase {
  private readonly logger = new Logger(GetMonthlyCreditUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log('Getting monthly credit usage', {
      orgId: query.orgId,
      effectiveStart: effectiveStart.toISOString(),
    });

    const creditsUsed = await this.usageRepository.getMonthlyCreditUsage(
      query.orgId,
      effectiveStart,
    );

    return { creditsUsed };
  }
}
