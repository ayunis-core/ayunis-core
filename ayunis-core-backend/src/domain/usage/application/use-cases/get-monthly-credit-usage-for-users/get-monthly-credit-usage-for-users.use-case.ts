import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetMonthlyCreditUsageForUsersQuery } from './get-monthly-credit-usage-for-users.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageForUsersUseCase {
  private readonly logger = new Logger(
    GetMonthlyCreditUsageForUsersUseCase.name,
  );

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageForUsersQuery,
  ): Promise<Map<UUID, number>> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log('Getting monthly credit usage for users', {
      userCount: query.userIds.length,
      effectiveStart: effectiveStart.toISOString(),
    });

    return await this.usageRepository.getMonthlyCreditUsagePerUser(
      query.organizationId,
      query.userIds,
      effectiveStart,
    );
  }
}
