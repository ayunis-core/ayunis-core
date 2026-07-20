import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetMonthlyCreditUsageForUsersQuery } from './get-monthly-credit-usage-for-users.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageForUsersUseCase {
  private readonly logger = new Logger(
    GetMonthlyCreditUsageForUsersUseCase.name,
  );

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetMonthlyCreditUsageForUsersQuery,
  ): Promise<Map<UUID, number>> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log('Getting monthly credit usage for users', {
      userCount: query.userIds.length,
      effectiveStart: effectiveStart.toISOString(),
    });

    try {
      return await this.usageRepository.getMonthlyCreditUsagePerUser(
        query.organizationId,
        query.userIds,
        effectiveStart,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get monthly credit usage for users', error);
      throw new UnexpectedUsageError(error as Error, {
        userCount: query.userIds.length,
      });
    }
  }
}
