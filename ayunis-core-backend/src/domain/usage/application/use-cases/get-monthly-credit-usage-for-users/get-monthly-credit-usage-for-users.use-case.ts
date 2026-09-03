import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetMonthlyCreditUsageForUsersQuery } from './get-monthly-credit-usage-for-users.query';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';

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

    this.logger.log(
      {
        userCount: query.userIds.length,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for users',
    );

    try {
      return await this.usageRepository.getMonthlyCreditUsagePerUser(
        query.organizationId,
        query.userIds,
        effectiveStart,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get monthly credit usage for users',
      );
      throw new UnexpectedUsageError(error as Error, {
        userCount: query.userIds.length,
      });
    }
  }
}
