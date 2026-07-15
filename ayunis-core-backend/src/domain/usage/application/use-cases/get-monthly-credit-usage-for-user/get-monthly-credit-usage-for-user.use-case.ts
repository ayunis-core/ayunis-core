import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetMonthlyCreditUsageForUserQuery } from './get-monthly-credit-usage-for-user.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageForUserUseCase {
  private readonly logger = new Logger(
    GetMonthlyCreditUsageForUserUseCase.name,
  );

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageForUserQuery,
  ): Promise<{ creditsUsed: number }> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log('Getting monthly credit usage for user', {
      userId: query.userId,
      effectiveStart: effectiveStart.toISOString(),
    });

    const creditsUsed =
      await this.usageRepository.getTotalMonthlyCreditUsageForUser(
        query.organizationId,
        query.userId,
        effectiveStart,
      );

    return { creditsUsed };
  }
}
