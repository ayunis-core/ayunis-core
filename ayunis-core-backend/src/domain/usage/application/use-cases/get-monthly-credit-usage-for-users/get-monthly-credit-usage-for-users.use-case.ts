import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { GetMonthlyCreditUsageForUsersQuery } from './get-monthly-credit-usage-for-users.query';
import { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getEffectiveMonthStart } from '../../util/get-effective-month-start';

@Injectable()
export class GetMonthlyCreditUsageForUsersUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetMonthlyCreditUsageForUsersUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    query: GetMonthlyCreditUsageForUsersQuery,
  ): Promise<Map<UUID, number>> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.info(
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
