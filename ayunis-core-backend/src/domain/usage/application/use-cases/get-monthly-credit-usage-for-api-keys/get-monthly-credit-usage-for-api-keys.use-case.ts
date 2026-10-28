import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';
import { GetMonthlyCreditUsageForApiKeysQuery } from './get-monthly-credit-usage-for-api-keys.query';

@Injectable()
export class GetMonthlyCreditUsageForApiKeysUseCase {
  private readonly logger = new Logger(
    GetMonthlyCreditUsageForApiKeysUseCase.name,
  );

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetMonthlyCreditUsageForApiKeysQuery,
  ): Promise<Map<UUID, number>> {
    const effectiveStart = getEffectiveMonthStart(query.since);

    this.logger.log(
      {
        apiKeyCount: query.apiKeyIds.length,
        effectiveStart: effectiveStart.toISOString(),
      },
      'Getting monthly credit usage for API keys',
    );

    return await this.usageRepository.getMonthlyCreditUsagePerApiKey(
      query.organizationId,
      query.apiKeyIds,
      effectiveStart,
    );
  }
}
